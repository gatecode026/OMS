/**
 * @file useWebRTC.ts
 * @description Hook managing WebRTC peer connection, signaling, and media streams.
 *
 * CRITICAL FIX LOG:
 *  ✓ FIX-WEBRTC-001: socket was captured as null at hook init time.
 *                    All socket.emit() calls now use socketRef (live ref) not the stale closure.
 *  ✓ FIX-WEBRTC-002: ICE candidates arriving before setRemoteDescription are now queued
 *                    and flushed once remoteDescription is set (prevents silent ICE failures).
 *  ✓ FIX-WEBRTC-003: connectionState resets to 'idle' after cleanUp (not stuck at 'ended').
 *  ✓ FIX-WEBRTC-004: Comprehensive [CALL] debug logs for every critical stage.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from '../../../shared/components/Toast';

let RTCPeerConnection: any = null;
let RTCIceCandidate: any   = null;
let RTCSessionDescription: any = null;
let mediaDevices: any      = null;
let hasNativeWebRTC        = false;

try {
  const webrtc         = require('react-native-webrtc');
  RTCPeerConnection    = webrtc.RTCPeerConnection;
  RTCIceCandidate      = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  mediaDevices         = webrtc.mediaDevices;
  hasNativeWebRTC      = !!RTCPeerConnection;
  console.log('[CALL] WebRTC native module loaded successfully.');
} catch (e) {
  console.log('[CALL] WebRTC native module not found — simulation mode (Expo Go).');
}

const logTimestamp = (phase: string, details?: string) => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  console.log(`[CALL][${h}:${m}:${s}.${ms}] ${phase}${details ? ` — ${details}` : ''}`);
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls:       'turn:turn.gatexpay.co.in:3478',
      username:   'oms_user',
      credential: 'oms_secure_password_2026',
    },
    {
      urls:       'turns:turn.gatexpay.co.in:5349',
      username:   'oms_user',
      credential: 'oms_secure_password_2026',
    },
  ],
};

export const useWebRTC = (socket: Socket | null, currentUserId: string | null) => {
  const [localStream,      setLocalStream]      = useState<any | null>(null);
  const [remoteStream,     setRemoteStream]      = useState<any | null>(null);
  const [isMuted,          setIsMuted]           = useState(false);
  const [isVideoOff,       setIsVideoOff]        = useState(false);
  const [isFrontCamera,    setIsFrontCamera]     = useState(true);
  const [callDuration,     setCallDuration]      = useState(0);
  const [connectionState,  setConnectionState]   = useState<
    'idle' | 'connecting' | 'connected' | 'failed' | 'ended' | 'reconnecting'
  >('idle');
  const [networkQuality,   setNetworkQuality]    = useState<
    'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Reconnecting'
  >('Excellent');

  const pcRef            = useRef<any | null>(null);
  const localStreamRef   = useRef<any | null>(null);
  const callIdRef        = useRef<string | null>(null);
  const targetUserIdRef  = useRef<string | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef     = useRef(true);
  const iceCandidateQueue = useRef<any[]>([]); // FIX-WEBRTC-002: buffer early ICE candidates
  const hasRemoteDesc    = useRef(false);       // FIX-WEBRTC-002: track remoteDescription state

  // FIX-WEBRTC-001: socketRef gives live socket access inside all callbacks
  // without being trapped in stale closures. This is the #1 cause of silent failures.
  const socketRef = useRef<Socket | null>(socket);
  useEffect(() => {
    socketRef.current = socket;
    console.log(`[CALL] socketRef updated — connected: ${socket?.connected}`);
  }, [socket]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── cleanUp ────────────────────────────────────────────────────────────────
  const cleanUp = useCallback(() => {
    console.log('[CALL] Cleanup Started');

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (pcRef.current) {
      try {
        // Remove all event handlers before closing to prevent ghost events
        pcRef.current.onicecandidate     = null;
        pcRef.current.ontrack            = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((t: any) => {
          t.stop();
          console.log(`[CALL] Track stopped: ${t.kind}`);
        });
      } catch (e) {}
      localStreamRef.current = null;
    }

    // Clear ICE queue and remote description tracker
    iceCandidateQueue.current = [];
    hasRemoteDesc.current     = false;
    callIdRef.current         = null;
    targetUserIdRef.current   = null;

    if (isMountedRef.current) {
      // FIX-WEBRTC-003: reset to 'idle' not 'ended' — 'ended' triggers re-renders that
      // can cause the socket effect to re-register and process buffered ghost events
      setConnectionState('idle');
      setLocalStream(null);
      setRemoteStream(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsFrontCamera(true);
      setCallDuration(0);
      setNetworkQuality('Excellent');
    }

    console.log('[CALL] Cleanup Completed');
  }, []);

  // ─── getMediaStream ──────────────────────────────────────────────────────────
  const getMediaStream = useCallback(async (isVideo: boolean) => {
    console.log(`[CALL] Media Created — requesting (audio=true, video=${isVideo})`);

    if (!hasNativeWebRTC) {
      console.log('[CALL] Simulation mode — mock stream returned');
      const mockStream = {
        getTracks:      () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        toURL:          () => '',
      };
      setLocalStream(mockStream);
      localStreamRef.current = mockStream;
      return mockStream;
    }

    try {
      const sourceInfo    = (await mediaDevices.enumerateDevices()) as any[];
      let videoSourceId: string | null = null;
      const videoDevice   = sourceInfo.find(
        (d: any) => d.kind === 'videoinput' && d.facing === 'front'
      );
      if (videoDevice) videoSourceId = videoDevice.deviceId;

      const constraints = {
        audio: true,
        video: isVideo
          ? {
              mandatory: { minWidth: 640, minHeight: 360, minFrameRate: 30 },
              facingMode: 'user',
              optional:   videoSourceId ? [{ sourceId: videoSourceId }] : [],
            }
          : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      console.log(`[CALL] Media Created — audioTracks:${audioTracks.length} videoTracks:${videoTracks.length}`);
      return stream;
    } catch (err: any) {
      console.error('[CALL] getUserMedia failed:', err.message);
      throw new Error('Failed to acquire camera/microphone: ' + err.message);
    }
  }, []);

  // ─── createPeerConnection ────────────────────────────────────────────────────
  const createPeerConnection = useCallback((
    isInitiator: boolean,
    stream: any,
    callId: string,
    targetUserId: string
  ) => {
    console.log(`[CALL] PeerConnection Creating — initiator:${isInitiator} callId:${callId}`);
    callIdRef.current        = callId;
    targetUserIdRef.current  = targetUserId;
    iceCandidateQueue.current = [];
    hasRemoteDesc.current    = false;
    setConnectionState('connecting');

    if (!hasNativeWebRTC) {
      console.log('[CALL] Simulation — faking connected in 1.5s');
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setConnectionState('connected');
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            if (isMountedRef.current) setCallDuration((p) => p + 1);
          }, 1000);
        }
      }, 1500);
      return null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (stream) {
      try {
        stream.getTracks().forEach((track: any) => {
          pc.addTrack(track, stream);
          console.log(`[CALL] Track added to PC: ${track.kind}`);
        });
      } catch (e) {
        console.error('[CALL] addTrack error:', e);
      }
    }

    // FIX-WEBRTC-001: use socketRef.current — NOT the stale socket from closure
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        const liveSocket = socketRef.current;
        if (liveSocket?.connected) {
          console.log('[CALL] ICE Sent');
          liveSocket.emit('call:signal:ice', {
            callId,
            candidate: event.candidate,
            targetUserId,
          });
        } else {
          console.warn('[CALL] ICE candidate ready but socket not connected — dropped');
        }
      }
    };

    pc.ontrack = (event: any) => {
      logTimestamp('T11', `Remote stream active — track:${event.track?.kind}`);
      if (event.streams && event.streams[0]) {
        if (isMountedRef.current) setRemoteStream(event.streams[0]);
        console.log('[CALL] RTCView Mounted — remoteStream set');
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      logTimestamp('T10', `Peer Connection state: ${state}`);
      if (state === 'connected') {
        if (isMountedRef.current) setConnectionState('connected');
        if (!durationTimerRef.current) {
          logTimestamp('T13', 'Timer started');
          durationTimerRef.current = setInterval(() => {
            if (isMountedRef.current) setCallDuration((p) => p + 1);
          }, 1000);
        }
        console.log('[CALL] Peer Connected');
      } else if (state === 'disconnected' || state === 'failed') {
        if (isMountedRef.current) setConnectionState('failed');
        console.warn('[CALL] Peer connection failed/disconnected');
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[CALL] ICE gathering state: ${pc.iceGatheringState}`);
    };

    pc.onsignalingstatechange = () => {
      console.log(`[CALL] Signaling state: ${pc.signalingState}`);
    };

    pcRef.current = pc;
    console.log('[CALL] PeerConnection Created');
    return pc;
  }, []); // FIX-WEBRTC-001: NO socket in deps — use socketRef.current inside handler

  // ─── handleRemoteSignal ──────────────────────────────────────────────────────
  // FIX-WEBRTC-002: ICE candidates are queued if they arrive before setRemoteDescription
  const handleRemoteSignal = useCallback(async (
    type: 'offer' | 'answer' | 'ice',
    signalData: any
  ) => {
    if (!hasNativeWebRTC) return;

    const pc = pcRef.current;
    if (!pc) {
      console.warn(`[CALL] handleRemoteSignal('${type}') — no PeerConnection yet, ignoring`);
      return;
    }

    console.log(`[CALL] Signal received: ${type}`);

    try {
      if (type === 'offer') {
        logTimestamp('T7', 'Offer received — setting remote description');
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        hasRemoteDesc.current = true;

        // Flush any queued ICE candidates
        if (iceCandidateQueue.current.length > 0) {
          console.log(`[CALL] Flushing ${iceCandidateQueue.current.length} queued ICE candidates`);
          for (const candidate of iceCandidateQueue.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log('[CALL] Queued ICE Received (flushed)');
            } catch (e) {
              console.warn('[CALL] Failed to add queued ICE candidate:', e);
            }
          }
          iceCandidateQueue.current = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        logTimestamp('T8', 'Answer created & sent');

        // FIX-WEBRTC-001: use socketRef.current
        socketRef.current?.emit('call:signal:answer', {
          callId:       callIdRef.current,
          signal:       answer,
          targetUserId: targetUserIdRef.current,
        });

      } else if (type === 'answer') {
        logTimestamp('T9', 'Answer received — setting remote description');
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        hasRemoteDesc.current = true;

        // Flush queued ICE candidates
        if (iceCandidateQueue.current.length > 0) {
          console.log(`[CALL] Flushing ${iceCandidateQueue.current.length} queued ICE candidates`);
          for (const candidate of iceCandidateQueue.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log('[CALL] Queued ICE Received (flushed)');
            } catch (e) {
              console.warn('[CALL] Failed to add queued ICE candidate:', e);
            }
          }
          iceCandidateQueue.current = [];
        }

      } else if (type === 'ice') {
        if (!hasRemoteDesc.current) {
          // Queue the candidate — remote description not set yet
          iceCandidateQueue.current.push(signalData);
          console.log(`[CALL] ICE queued (remoteDesc not set yet) — queue size: ${iceCandidateQueue.current.length}`);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(signalData));
          console.log('[CALL] ICE Received (applied)');
        }
      }
    } catch (err) {
      console.error(`[CALL] handleRemoteSignal(${type}) error:`, err);
    }
  }, []); // FIX-WEBRTC-001: NO socket in deps — use socketRef.current inside handler

  // ─── startCall (Caller) ──────────────────────────────────────────────────────
  const startCall = useCallback(async (callId: string, targetUserId: string, isVideo: boolean) => {
    console.log(`[CALL] Call Created — caller, callId:${callId} isVideo:${isVideo}`);
    if (!hasNativeWebRTC) {
      toast.info('Running in simulation mode (Expo Go — no real WebRTC)');
    }
    try {
      const stream = await getMediaStream(isVideo);
      const pc     = createPeerConnection(true, stream, callId, targetUserId);

      if (hasNativeWebRTC && pc) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        logTimestamp('T6', 'Offer created & sent');

        // FIX-WEBRTC-001: use socketRef.current
        socketRef.current?.emit('call:signal:offer', {
          callId,
          signal:       offer,
          targetUserId,
        });
      }
    } catch (err) {
      console.error('[CALL] startCall error:', err);
      cleanUp();
      throw err;
    }
  }, [getMediaStream, createPeerConnection, cleanUp]);

  // ─── acceptCall (Receiver) ───────────────────────────────────────────────────
  const acceptCall = useCallback(async (callId: string, targetUserId: string, isVideo: boolean) => {
    console.log(`[CALL] Accept Pressed — callId:${callId} isVideo:${isVideo}`);
    try {
      const stream = await getMediaStream(isVideo);
      createPeerConnection(false, stream, callId, targetUserId);
      // Peer connection is now waiting for the offer from the caller
    } catch (err) {
      console.error('[CALL] acceptCall error:', err);
      cleanUp();
      throw err;
    }
  }, [getMediaStream, createPeerConnection, cleanUp]);

  // ─── Media controls ──────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    try {
      localStreamRef.current.getAudioTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
    } catch (e) {}
    setIsMuted((prev) => !prev);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    try {
      localStreamRef.current.getVideoTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
    } catch (e) {}
    setIsVideoOff((prev) => !prev);
  }, []);

  const flipCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    try {
      localStreamRef.current.getVideoTracks().forEach((track: any) => {
        if (typeof track._switchCamera === 'function') {
          track._switchCamera();
          setIsFrontCamera((prev) => !prev);
        }
      });
    } catch (e) {}
  }, []);

  const toggleHold = useCallback((isOnHold: boolean) => {
    if (!localStreamRef.current) return;
    try {
      localStreamRef.current.getAudioTracks().forEach((t: any) => { t.enabled = !isOnHold; });
      localStreamRef.current.getVideoTracks().forEach((t: any) => { t.enabled = !isOnHold; });
    } catch (e) {}
  }, []);

  const restartIce = useCallback(async () => {
    if (!hasNativeWebRTC || !pcRef.current) return;
    try {
      console.log('[CALL] ICE Restart initiated');
      setConnectionState('reconnecting');
      setNetworkQuality('Reconnecting');
      const offer = await pcRef.current.createOffer({ iceRestart: true });
      await pcRef.current.setLocalDescription(offer);
      socketRef.current?.emit('call:signal:offer', {
        callId:       callIdRef.current,
        signal:       offer,
        targetUserId: targetUserIdRef.current,
      });
    } catch (err) {
      console.error('[CALL] ICE restart failed:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanUp(); };
  }, [cleanUp]);

  return {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isFrontCamera,
    callDuration,
    connectionState,
    networkQuality,
    startCall,
    acceptCall,
    handleRemoteSignal,
    toggleMute,
    toggleVideo,
    flipCamera,
    restartIce,
    toggleHold,
    cleanUp,
  };
};

export default useWebRTC;
