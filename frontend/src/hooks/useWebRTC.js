import { useRef, useState, useCallback, useEffect } from 'react';
import SimplePeer from 'simple-peer/simplepeer.min.js';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Production TURN configurations (loaded with auth fallbacks)
    {
      urls: 'turn:turn.gatexpay.co.in:3478',
      username: 'oms_user',
      credential: 'oms_secure_password_2026'
    },
    {
      urls: 'turns:turn.gatexpay.co.in:5349',
      username: 'oms_user',
      credential: 'oms_secure_password_2026'
    }
  ]
};

export const useWebRTC = (socket, currentUser) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState('idle'); // idle | connecting | connected | failed | reconnecting

  // Network Quality and Device states
  const [networkQuality, setNetworkQuality] = useState('Excellent');
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [speakerDevices, setSpeakerDevices] = useState([]);
  const [activeCamera, setActiveCamera] = useState('');
  const [activeMic, setActiveMic] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState('');
  const [micVolume, setMicVolume] = useState(0);
  const [activeProfile, setActiveProfile] = useState('fullhd'); // fullhd | hd | standard | saver

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const durationTimerRef = useRef(null);
  const statsTimerRef = useRef(null);
  
  const callIdRef = useRef(null);
  const targetUserIdRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const isScreenSharingRef = useRef(false);
  const isFrontCameraRef = useRef(true);
  const isInitiatorRef = useRef(false);

  // Mic test refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const volumeAnimationFrameRef = useRef(null);

  // Refs to avoid Temporal Dead Zone in circular callbacks
  const createPeerRef = useRef(null);
  const initiateIceRestartRef = useRef(null);
  const recreatePeerConnectionRef = useRef(null);

  // Keep screen sharing ref in sync
  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  // ── Enumerate Media Devices ───────────────────
  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audios = devices.filter(d => d.kind === 'audioinput');
      const videos = devices.filter(d => d.kind === 'videoinput');
      const speakers = devices.filter(d => d.kind === 'audiooutput');
      
      setAudioDevices(audios);
      setVideoDevices(videos);
      setSpeakerDevices(speakers);
      
      // Auto-select defaults if not set
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (audioTrack && !activeMic) {
          const match = audios.find(d => d.label === audioTrack.label);
          setActiveMic(match ? match.deviceId : 'default');
        }
        if (videoTrack && !activeCamera) {
          const match = videos.find(d => d.label === videoTrack.label);
          setActiveCamera(match ? match.deviceId : 'default');
        }
      }
      if (speakers.length > 0 && !activeSpeaker) {
        setActiveSpeaker('default');
      }
    } catch (err) {
      console.warn('[WebRTC] Device enumeration failed:', err);
    }
  }, [activeMic, activeCamera, activeSpeaker]);

  // ── Mic Volume Meter ──────────────────────────
  const startMicVolumeMeter = useCallback((stream) => {
    try {
      if (!stream || stream.getAudioTracks().length === 0) return;
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const mappedVolume = Math.min(Math.round((avg / 128) * 100), 100);
        setMicVolume(mappedVolume);
        volumeAnimationFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (err) {
      console.warn('[WebRTC] Could not start mic volume meter:', err);
    }
  }, []);

  const stopMicVolumeMeter = useCallback(() => {
    if (volumeAnimationFrameRef.current) {
      cancelAnimationFrame(volumeAnimationFrameRef.current);
      volumeAnimationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicVolume(0);
  }, []);

  useEffect(() => {
    if (localStream) {
      startMicVolumeMeter(localStream);
      enumerateDevices();
    } else {
      stopMicVolumeMeter();
    }
    return () => stopMicVolumeMeter();
  }, [localStream, startMicVolumeMeter, stopMicVolumeMeter, enumerateDevices]);

  // ── WebRTC Audio Diagnostics Logging ──────────
  const logAudioDiagnostics = useCallback(() => {
    console.log('=== WebRTC Audio Pipeline Diagnostics ===');
    
    // 1. Local stream check
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      console.log(`[Local Stream] Has ${audioTracks.length} audio tracks.`);
      audioTracks.forEach((track, i) => {
        console.log(`  Track ${i}: id=${track.id}, label="${track.label}", enabled=${track.enabled}, readyState="${track.readyState}", muted=${track.muted}`);
      });
    } else {
      console.log('[Local Stream] Missing local stream reference.');
    }

    // 2. Remote stream check
    if (remoteStream) {
      const audioTracks = remoteStream.getAudioTracks();
      console.log(`[Remote Stream] Has ${audioTracks.length} audio tracks.`);
      audioTracks.forEach((track, i) => {
        console.log(`  Track ${i}: id=${track.id}, label="${track.label}", enabled=${track.enabled}, readyState="${track.readyState}", muted=${track.muted}`);
      });
    } else {
      console.log('[Remote Stream] Missing remote stream reference.');
    }

    // 3. RTCPeerConnection check
    const peer = peerRef.current;
    if (peer && !peer.destroyed && peer._pc) {
      const pc = peer._pc;
      console.log(`[Peer Connection] state="${pc.connectionState}", signalingState="${pc.signalingState}", iceConnectionState="${pc.iceConnectionState}"`);
      
      const senders = pc.getSenders();
      console.log(`[Peer Connection] Senders (Outgoing): ${senders.length}`);
      senders.forEach((s, i) => {
        console.log(`  Sender ${i}: track=${s.track ? `${s.track.kind}:${s.track.id}:${s.track.enabled}` : 'null'}`);
      });

      const receivers = pc.getReceivers();
      console.log(`[Peer Connection] Receivers (Incoming): ${receivers.length}`);
      receivers.forEach((r, i) => {
        console.log(`  Receiver ${i}: track=${r.track ? `${r.track.kind}:${r.track.id}:${r.track.enabled}` : 'null'}`);
      });
      
      pc.getStats().then(stats => {
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            console.log(`[Stats Inbound Audio] bytesReceived=${report.bytesReceived}, packetsReceived=${report.packetsReceived}, jitter=${report.jitter}`);
          }
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            console.log(`[Stats Outbound Audio] bytesSent=${report.bytesSent}, packetsSent=${report.packetsSent}`);
          }
        });
      }).catch(() => {});
    } else {
      console.log('[Peer Connection] No active RTCPeerConnection.');
    }
    console.log('==========================================');
  }, [remoteStream]);

  // ── Stats Monitoring Loop (getStats) ──────────
  const startStatsMonitoring = useCallback(() => {
    clearInterval(statsTimerRef.current);
    statsTimerRef.current = setInterval(async () => {
      // Execute diagnostics logging
      logAudioDiagnostics();

      const peer = peerRef.current;
      if (!peer || peer.destroyed || !peer._pc) return;
      
      try {
        const stats = await peer._pc.getStats();
        let rtt = 0;
        let jitter = 0;
        let packetsLost = 0;
        let packetsReceived = 0;
        let lossRate = 0;
        
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime !== undefined) {
              rtt = report.currentRoundTripTime * 1000;
            }
          }
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            jitter = (report.jitter || 0) * 1000;
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
            const total = packetsLost + packetsReceived;
            if (total > 0) {
              lossRate = (packetsLost / total) * 100;
            }
          }
        });
        
        if (rtt === 0) {
          stats.forEach(report => {
            if (report.type === 'remote-inbound-rtp') {
              rtt = (report.roundTripTime || 0) * 1000;
            }
          });
        }
        
        let quality = 'Excellent';
        if (rtt >= 400 || lossRate >= 10) {
          quality = 'Poor';
        } else if (rtt >= 200 || lossRate >= 5) {
          quality = 'Fair';
        } else if (rtt >= 100 || lossRate >= 2) {
          quality = 'Good';
        }
        
        setNetworkQuality(quality);
        
        // Auto Resolution Downscale / Upscale disabled (manual control added)
      } catch (err) {
        console.warn('[WebRTCStats] Error reading statistics:', err);
      }
    }, 2000);
  }, [connectionState, logAudioDiagnostics]);

  const stopStatsMonitoring = useCallback(() => {
    clearInterval(statsTimerRef.current);
    statsTimerRef.current = null;
    setNetworkQuality('Excellent');
  }, []);

  const adjustQualityProfile = useCallback(async (profile) => {
    if (!localStreamRef.current || isScreenSharingRef.current) return;
    if (activeProfile === profile) return;
    
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    
    let width, height, fps;
    switch (profile) {
      case 'fullhd':
        width = 1920; height = 1080; fps = 30;
        break;
      case 'hd':
        width = 1280; height = 720; fps = 30;
        break;
      case 'standard':
        width = 854; height = 480; fps = 24;
        break;
      case 'saver':
      default:
        width = 640; height = 360; fps = 15;
        break;
    }
    
    try {
      console.log(`[WebRTCQuality] Switching constraints to ${profile} (${width}x${height})`);
      await videoTrack.applyConstraints({
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: fps }
      });
      setActiveProfile(profile);
    } catch (err) {
      console.warn('[WebRTCQuality] applyConstraints failed:', err);
    }
  }, [activeProfile]);

  // ── Switch Hardware Devices ───────────────────
  const switchMicrophone = useCallback(async (deviceId) => {
    if (!localStreamRef.current) return;
    try {
      const constraints = {
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = stream.getAudioTracks()[0];
      const oldTrack = localStreamRef.current.getAudioTracks()[0];
      
      if (oldTrack && newTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
        localStreamRef.current.addTrack(newTrack);
        
        if (peerRef.current && !peerRef.current.destroyed) {
          await peerRef.current.replaceTrack(oldTrack, newTrack, localStreamRef.current);
        }
        
        newTrack.enabled = !isMuted;
        setActiveMic(deviceId);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch (err) {
      console.error('[WebRTC] Microphone switch error:', err);
    }
  }, [isMuted]);

  const switchCamera = useCallback(async (deviceId) => {
    if (!localStreamRef.current || isScreenSharingRef.current) return;
    try {
      const constraints = {
        audio: false,
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = stream.getVideoTracks()[0];
      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      
      if (oldTrack && newTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
        localStreamRef.current.addTrack(newTrack);
        
        if (peerRef.current && !peerRef.current.destroyed) {
          await peerRef.current.replaceTrack(oldTrack, newTrack, localStreamRef.current);
        }
        
        newTrack.enabled = !isVideoOff;
        setActiveCamera(deviceId);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch (err) {
      console.error('[WebRTC] Camera switch error:', err);
    }
  }, [isVideoOff]);

  const switchSpeaker = useCallback(async (deviceId) => {
    try {
      const audioElements = document.querySelectorAll('video, audio');
      for (const el of audioElements) {
        if (el.setSinkId && typeof el.setSinkId === 'function') {
          await el.setSinkId(deviceId);
        }
      }
      setActiveSpeaker(deviceId);
    } catch (err) {
      console.error('[WebRTC] Speaker switch error:', err);
    }
  }, []);

  // ── Connection Recovery & ICE Restart ─────────
  const initiateIceRestart = useCallback(() => {
    const peer = peerRef.current;
    if (peer && !peer.destroyed && peer._pc) {
      try {
        console.log('[WebRTC] Initiating ICE Restart...');
        setConnectionState('reconnecting');
        setNetworkQuality('Reconnecting');
        
        peer._pc.createOffer({ iceRestart: true }).then(offer => {
          return peer._pc.setLocalDescription(offer).then(() => {
            socket.emit('call:signal:offer', {
              callId: callIdRef.current,
              signal: offer,
              targetUserId: targetUserIdRef.current
            });
          });
        }).catch(err => {
          console.warn('[WebRTC] ICE Restart offer creation failed, recreating peer connection...', err);
          recreatePeerConnectionRef.current?.();
        });
      } catch (err) {
        console.error('[WebRTC] ICE Restart error:', err);
      }
    }
  }, [socket]);
  initiateIceRestartRef.current = initiateIceRestart;

  const recreatePeerConnection = useCallback(() => {
    console.log('[WebRTC] Recreating connection completely...');
    if (!localStreamRef.current || !callIdRef.current || !targetUserIdRef.current) return;
    
    if (peerRef.current && !peerRef.current.destroyed) {
      try {
        peerRef.current.destroy();
      } catch (e) {}
    }
    
    createPeerRef.current?.(isInitiatorRef.current, localStreamRef.current, callIdRef.current, targetUserIdRef.current);
  }, []);
  recreatePeerConnectionRef.current = recreatePeerConnection;

  // Listen to network status online/offline and tab visibility (browser wake-up)
  useEffect(() => {
    const handleOnline = () => {
      console.log('[WebRTC] Browser online. Restoring WebRTC connection...');
      initiateIceRestart();
    };
    
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const peer = peerRef.current;
        if (peer && peer._pc && (peer._pc.connectionState === 'failed' || peer._pc.connectionState === 'disconnected')) {
          console.log('[WebRTC] Visibility visible, connection lost. Triggering ICE restart...');
          initiateIceRestart();
        }
      }
    };
    
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [initiateIceRestart]);

  // ── Get Media Stream ──────────────────────────
  const getMedia = useCallback(async (callType) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'WebRTC requires a secure context (HTTPS or localhost). If you are testing over a local network IP, please open chrome://flags/#unsafely-treat-insecure-origin-as-secure in Chrome, add your site URL, and enable it.';
      console.error('[WebRTC] Secure context error:', errorMsg);
      throw new Error(errorMsg);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: callType === 'video' 
          ? { 
              width: { ideal: 1920 }, 
              height: { ideal: 1080 },
              facingMode: 'user',
              frameRate: { ideal: 30, max: 60 }
            } 
          : false
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      if (callType === 'video') {
        console.warn('[WebRTC] Video stream access failed, trying audio-only fallback...', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            },
            video: false
          });
          localStreamRef.current = fallbackStream;
          setLocalStream(fallbackStream);
          return fallbackStream;
        } catch (fallbackErr) {
          if (fallbackErr.name === 'NotAllowedError') {
            throw new Error('Microphone permission denied');
          }
          throw new Error('Could not access microphone: ' + fallbackErr.message);
        }
      }
      if (err.name === 'NotAllowedError') {
        throw new Error(
          `${callType === 'video' ? 'Camera/Microphone' : 'Microphone'} permission denied`
        );
      }
      throw new Error('Could not access media devices: ' + err.message);
    }
  }, []);

  // ── Create SimplePeer Instance ────────────────
  const createPeer = useCallback((initiator, stream, callId, targetUserId) => {
    callIdRef.current = callId;
    targetUserIdRef.current = targetUserId;
    isInitiatorRef.current = initiator;
    setConnectionState('connecting');

    console.log(`[WebRTC] Creating Peer Connection. Initiator: ${initiator}, CallID: ${callId}, TargetUserId: ${targetUserId}`);
    if (stream) {
      console.log('[WebRTC] Local stream tracks passed to peer:', stream.getTracks().map(t => `${t.kind}:${t.id}:${t.enabled}:${t.readyState}`));
    } else {
      console.warn('[WebRTC] Creating peer connection WITHOUT local stream!');
    }

    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: true,
      config: ICE_SERVERS
    });

    peer.on('signal', (signal) => {
      console.log(`[WebRTC] Local signaling event (${signal.type || 'candidate'}):`, signal);
      if (!socket?.connected) return;
      if (signal.type === 'offer' || signal.type === 'renegotiate' || signal.type === 'transceiverRequest') {
        socket.emit('call:signal:offer', {
          callId,
          signal,
          targetUserId
        });
      } else if (signal.type === 'answer') {
        socket.emit('call:signal:answer', {
          callId,
          signal,
          targetUserId
        });
      } else if (signal.candidate) {
        socket.emit('call:signal:ice', {
          callId,
          candidate: signal,
          targetUserId
        });
      } else {
        socket.emit('call:signal:offer', {
          callId,
          signal,
          targetUserId
        });
      }
    });

    peer.on('stream', (stream) => {
      console.log('[WebRTC] Stream event received, tracks:', stream.getTracks().map(t => `${t.kind}:${t.id}:${t.enabled}:${t.readyState}`));
      // Ensure all remote audio tracks are explicitly enabled
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      setRemoteStream(stream);

      const handleTrackChange = () => {
        console.log('[WebRTC] Remote stream tracks changed:', stream.getTracks().map(t => `${t.kind}:${t.id}:${t.enabled}:${t.readyState}`));
        stream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
        setRemoteStream(stream);
      };

      stream.onaddtrack = handleTrackChange;
      stream.onremovetrack = handleTrackChange;

      setConnectionState('connected');
      
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    });

    peer.on('track', (track, stream) => {
      console.log('[WebRTC] Peer track event received:', track.kind, track.id, `enabled=${track.enabled}, readyState="${track.readyState}"`);
      track.enabled = true; // Explicitly enable received track
      stream.getAudioTracks().forEach(t => {
        t.enabled = true;
      });
      setRemoteStream(stream);
    });

    peer.on('connect', () => {
      console.log('[WebRTC] Peer connection connected! Starting stats monitoring.');
      setConnectionState('connected');
      startStatsMonitoring();
    });

    peer.on('error', (err) => {
      console.error('[WebRTC] Peer connection error:', err);
      setConnectionState('failed');
      initiateIceRestartRef.current?.();
    });

    peer.on('close', () => {
      console.log('[WebRTC] Peer connection closed.');
      setConnectionState('idle');
      clearInterval(durationTimerRef.current);
      stopStatsMonitoring();
    });

    // Native state monitoring
    if (peer._pc) {
      peer._pc.addEventListener('connectionstatechange', () => {
        const state = peer._pc.connectionState;
        console.log('[WebRTC] Native ConnectionState change:', state);
        if (state === 'failed' || state === 'disconnected') {
          initiateIceRestartRef.current?.();
        } else if (state === 'connected') {
          setConnectionState('connected');
        }
      });
    }

    peerRef.current = peer;
    return peer;
  }, [socket, stopStatsMonitoring, startStatsMonitoring]);
  createPeerRef.current = createPeer;

  // ── Handle Incoming Signal ────────────────────
  const handleSignal = useCallback((signal) => {
    if (peerRef.current && !peerRef.current.destroyed) {
      try {
        console.log('[WebRTC] Applying remote signal:', signal.type || 'candidate');
        peerRef.current.signal(signal);
      } catch (err) {
        console.error('[WebRTC] Error setting peer signal:', err);
      }
    }
  }, []);

  // ── Toggle Mute ───────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMuted(prev => !prev);
  }, []);

  // ── Toggle Video ──────────────────────────────
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(prev => !prev);
  }, []);

  // ── Screen Share ──────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      
      const screenTrack = localStreamRef.current?.getVideoTracks().find(
        t => t.label === screenStreamRef.current?.getVideoTracks()[0]?.label || t.id === screenStreamRef.current?.getVideoTracks()[0]?.id
      );

      const hasCamera = cameraTrackRef.current !== null;

      if (hasCamera) {
        if (screenTrack) {
          localStreamRef.current.removeTrack(screenTrack);
        }
        if (cameraTrackRef.current) {
          localStreamRef.current.addTrack(cameraTrackRef.current);
          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              await peerRef.current.replaceTrack(screenTrack, cameraTrackRef.current, localStreamRef.current);
            } catch (e) {
              console.error('[WebRTC] Error replacing camera track:', e);
            }
          }
        }
      } else {
        if (peerRef.current && !peerRef.current.destroyed && screenTrack) {
          try {
            peerRef.current.removeTrack(screenTrack, localStreamRef.current);
          } catch (e) {
            console.error('[WebRTC] Error removing screen track from peer:', e);
          }
        }
        if (screenTrack) {
          localStreamRef.current.removeTrack(screenTrack);
        }
      }

      cameraTrackRef.current = null;
      if (localStreamRef.current) {
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true // Suppport screen share audio
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          const existingVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (existingVideoTrack) {
            cameraTrackRef.current = existingVideoTrack;
            localStreamRef.current.removeTrack(existingVideoTrack);
            localStreamRef.current.addTrack(screenTrack);

            if (peerRef.current && !peerRef.current.destroyed) {
              try {
                await peerRef.current.replaceTrack(existingVideoTrack, screenTrack, localStreamRef.current);
              } catch (e) {
                console.error('[WebRTC] Error replacing camera track with screen track:', e);
              }
            }
          } else {
            localStreamRef.current.addTrack(screenTrack);
            if (peerRef.current && !peerRef.current.destroyed) {
              try {
                peerRef.current.addTrack(screenTrack, localStreamRef.current);
              } catch (e) {
                console.error('[WebRTC] Error adding screen track to peer:', e);
              }
            }
          }
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }

        screenTrack.onended = () => {
          if (isScreenSharingRef.current) {
            toggleScreenShare();
          }
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('[WebRTC] Screen share error:', err);
      }
    }
  }, []);

  // ── Flip Camera (Front/Rear) ──────────────────
  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current || isScreenSharingRef.current) return;
    const newFacing = !isFrontCameraRef.current;
    isFrontCameraRef.current = newFacing;
    setIsFrontCamera(newFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: newFacing ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (oldVideoTrack && newVideoTrack) {
        if (peerRef.current && !peerRef.current.destroyed) {
          try {
            await peerRef.current.replaceTrack(oldVideoTrack, newVideoTrack, localStreamRef.current);
          } catch (e) {
            console.error('[WebRTC] Error replacing camera track on flip:', e);
          }
        }
        localStreamRef.current.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
        localStreamRef.current.addTrack(newVideoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch (err) {
      console.error('[WebRTC] Camera flip error:', err);
      isFrontCameraRef.current = !newFacing;
      setIsFrontCamera(!newFacing);
    }
  }, []);

  // ── Toggle Speaker (Legacy Switch helper) ─────
  const toggleSpeaker = useCallback(() => {
    const newSpeakerOn = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerOn);
    switchSpeaker(newSpeakerOn ? 'default' : 'communications').catch(() => {});
  }, [isSpeakerOn, switchSpeaker]);

  // ── Cleanup ───────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(durationTimerRef.current);
    stopStatsMonitoring();
    stopMicVolumeMeter();
    
    if (peerRef.current && !peerRef.current.destroyed) {
      try {
        peerRef.current.destroy();
      } catch (e) {}
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    
    peerRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    cameraTrackRef.current = null;
    isScreenSharingRef.current = false;
    
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setIsFrontCamera(true);
    setIsSpeakerOn(false);
    isFrontCameraRef.current = true;
    isInitiatorRef.current = false;
    setCallDuration(0);
    setConnectionState('idle');
    callIdRef.current = null;
    targetUserIdRef.current = null;
    setActiveProfile('fullhd');
  }, [stopStatsMonitoring, stopMicVolumeMeter]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isFrontCamera,
    isSpeakerOn,
    callDuration,
    connectionState,
    
    // Quality & Device Switching API
    networkQuality,
    audioDevices,
    videoDevices,
    speakerDevices,
    activeCamera,
    activeMic,
    activeSpeaker,
    micVolume,
    activeProfile,
    switchCamera,
    switchMicrophone,
    switchSpeaker,
    adjustQualityProfile,
    
    getMedia,
    createPeer,
    handleSignal,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    flipCamera,
    toggleSpeaker,
    cleanup,
    peer: peerRef.current
  };
};

export default useWebRTC;
