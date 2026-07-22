/**
 * @file useWebRTC.ts
 * @description Hook managing WebRTC peer connection, signaling, and media streams in React Native.
 *              Includes safety fallbacks to prevent crashes on runtimes lacking native WebRTC (e.g. Expo Go).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { toast } from '../../../shared/components/Toast';

let RTCPeerConnection: any = null;
let RTCIceCandidate: any = null;
let RTCSessionDescription: any = null;
let mediaDevices: any = null;
let hasNativeWebRTC = false;

try {
  // Try loading react-native-webrtc native package dynamically
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  mediaDevices = webrtc.mediaDevices;
  hasNativeWebRTC = !!RTCPeerConnection;
} catch (e) {
  console.log('[WebRTC] Native module not found. Running in simulation mode (Expo Go).');
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:turn.gatexpay.co.in:3478',
      username: 'oms_user',
      credential: 'oms_secure_password_2026',
    },
    {
      urls: 'turns:turn.gatexpay.co.in:5349',
      username: 'oms_user',
      credential: 'oms_secure_password_2026',
    },
  ],
};

export const useWebRTC = (socket: Socket | null, currentUserId: string | null) => {
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStream, setRemoteStream] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'failed' | 'ended'>('idle');
  const [networkQuality, setNetworkQuality] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Excellent');

  const pcRef = useRef<any | null>(null);
  const localStreamRef = useRef<any | null>(null);
  const callIdRef = useRef<string | null>(null);
  const targetUserIdRef = useRef<string | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up WebRTC session
  const cleanUp = useCallback(() => {
    console.log('[WebRTC] Cleaning up connection...');
    setConnectionState('ended');
    
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsFrontCamera(true);
    setCallDuration(0);
    setNetworkQuality('Excellent');
  }, []);

  // Initialize Media Stream
  const getMediaStream = useCallback(async (isVideo: boolean) => {
    if (!hasNativeWebRTC) {
      console.log('[WebRTC] Simulated media stream initialized.');
      // Return a dummy object so code doesn't break
      const mockStream = {
        getTracks: () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        toURL: () => '',
      };
      setLocalStream(mockStream);
      localStreamRef.current = mockStream;
      return mockStream;
    }

    try {
      const sourceInfo = (await mediaDevices.enumerateDevices()) as any[];
      let videoSourceId: string | null = null;

      const videoDevice = sourceInfo.find(
        (device: any) => device.kind === 'videoinput' && device.facing === 'front'
      );
      if (videoDevice) videoSourceId = videoDevice.deviceId;

      const constraints = {
        audio: true,
        video: isVideo
          ? {
              mandatory: {
                minWidth: 640,
                minHeight: 360,
                minFrameRate: 30,
              },
              facingMode: 'user',
              optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
            }
          : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error('[WebRTC] Error acquiring media stream:', err);
      throw new Error('Failed to acquire camera/microphone: ' + err.message);
    }
  }, []);

  // Create PeerConnection
  const createPeerConnection = useCallback((
    isInitiator: boolean,
    stream: any,
    callId: string,
    targetUserId: string
  ) => {
    console.log(`[WebRTC] Creating Peer Connection. Initiator: ${isInitiator}, CallId: ${callId}`);
    callIdRef.current = callId;
    targetUserIdRef.current = targetUserId;
    setConnectionState('connecting');

    if (!hasNativeWebRTC) {
      console.log('[WebRTC] Simulating connection establishment...');
      // Instantly transition to connected after 1.5s
      setTimeout(() => {
        setConnectionState('connected');
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      }, 1500);
      return null;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (stream) {
      try {
        stream.getTracks().forEach((track: any) => {
          pc.addTrack(track, stream);
        });
      } catch (e) {}
    }

    pc.onicecandidate = (event: any) => {
      if (event.candidate && socket?.connected) {
        socket.emit('call:signal:ice', {
          callId,
          candidate: event.candidate,
          targetUserId,
        });
      }
    };

    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnectionState('connected');
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      } else if (state === 'failed' || state === 'disconnected') {
        setConnectionState('failed');
      }
    };

    pcRef.current = pc;
    return pc;
  }, [socket]);

  // Handle Remote Signalling
  const handleRemoteSignal = useCallback(async (type: 'offer' | 'answer' | 'ice', signalData: any) => {
    if (!hasNativeWebRTC) return;
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket?.emit('call:signal:answer', {
          callId: callIdRef.current,
          signal: answer,
          targetUserId: targetUserIdRef.current,
        });
      } else if (type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
      } else if (type === 'ice') {
        await pc.addIceCandidate(new RTCIceCandidate(signalData));
      }
    } catch (err) {
      console.error('[WebRTC] Error handling remote signal:', err);
    }
  }, [socket]);

  // Initiate call
  const startCall = useCallback(async (callId: string, targetUserId: string, isVideo: boolean) => {
    if (!hasNativeWebRTC) {
      toast.info('Calling simulated (native WebRTC not available on Expo Go)');
    }
    try {
      const stream = await getMediaStream(isVideo);
      const pc = createPeerConnection(true, stream, callId, targetUserId);

      if (hasNativeWebRTC && pc) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket?.emit('call:signal:offer', {
          callId,
          signal: offer,
          targetUserId,
        });
      }
    } catch (err) {
      console.error('[WebRTC] Start call error:', err);
      cleanUp();
      throw err;
    }
  }, [getMediaStream, createPeerConnection, socket, cleanUp]);

  // Accept call
  const acceptCall = useCallback(async (callId: string, targetUserId: string, isVideo: boolean) => {
    try {
      const stream = await getMediaStream(isVideo);
      createPeerConnection(false, stream, callId, targetUserId);
    } catch (err) {
      console.error('[WebRTC] Accept call error:', err);
      cleanUp();
      throw err;
    }
  }, [getMediaStream, createPeerConnection, cleanUp]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    try {
      localStreamRef.current.getAudioTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
    } catch (e) {}
    setIsMuted((prev) => !prev);
  }, []);

  // Toggle Video
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    try {
      localStreamRef.current.getVideoTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
    } catch (e) {}
    setIsVideoOff((prev) => !prev);
  }, []);

  // ICE Restart for network recovery
  const restartIce = useCallback(async () => {
    if (!hasNativeWebRTC || !pcRef.current) return;
    try {
      console.log('[WebRTC] Initiating ICE restart...');
      setConnectionState('reconnecting' as any);
      setNetworkQuality('Reconnecting');
      const offer = await pcRef.current.createOffer({ iceRestart: true });
      await pcRef.current.setLocalDescription(offer);
      socket?.emit('call:signal:offer', {
        callId: callIdRef.current,
        signal: offer,
        targetUserId: targetUserIdRef.current,
      });
    } catch (err) {
      console.error('[WebRTC] ICE restart failed:', err);
    }
  }, [socket]);

  // Toggle Call Hold
  const toggleHold = useCallback((isOnHold: boolean) => {
    if (!localStreamRef.current) return;
    try {
      localStreamRef.current.getAudioTracks().forEach((track: any) => {
        track.enabled = !isOnHold;
      });
      localStreamRef.current.getVideoTracks().forEach((track: any) => {
        track.enabled = !isOnHold;
      });
    } catch (e) {}
  }, []);

  // Flip Camera
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

  useEffect(() => {
    return () => {
      cleanUp();
    };
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
