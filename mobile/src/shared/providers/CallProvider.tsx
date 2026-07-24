/**
 * @file CallProvider.tsx
 * @description Global call session provider that orchestrates Socket.io signaling,
 *              WebRTC session states, ringtone audio playback, and visual calling overlays.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import useAuthStore from '../store/authStore';
import { connectSocket, getSocket, disconnectSocket } from '../services/socketManager';
import apiClient from '../services/apiClient';
import { useWebRTC } from '../../features/chat/hooks/useWebRTC';
import { useChatSocket } from '../../features/chat/hooks/useChatSocket';
import { toast } from '../components/Toast';

export interface CallUser {
  id: string;
  name: string;
  avatar: string | null;
  department?: string;
  role?: string;
}

export interface ActiveCall {
  callId: string;
  callType: 'audio' | 'video';
  targetUser: CallUser;
  isIncoming: boolean;
  status: 'ringing' | 'active' | 'rejected' | 'ended' | 'missed';
  conversationId: string;
}

interface CallContextType {
  activeCall: ActiveCall | null;
  initiateCall: (targetUserId: string, callType: 'audio' | 'video', conversationId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  localStream: any;
  remoteStream: any;
  isMuted: boolean;
  isVideoOff: boolean;
  isFrontCamera: boolean;
  callDuration: number;
  connectionState: string;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const socketRef = useRef<any>(null);
  
  useChatSocket(socket);
  
  const ringtoneSoundRef = useRef<any>(null);
  const outgoingSoundRef = useRef<any>(null);

  // Safe navigation back helper
  const safeBack = useCallback(() => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/inbox' as any);
      }
    } catch (e) {
      console.log('[CallProvider] safeBack warning:', e);
    }
  }, [router]);

  // Bind WebRTC hook
  const webrtc = useWebRTC(socketRef.current, user?.id || null);

  // Play Ringtone Sound (Incoming call)
  const playRingtone = useCallback(async () => {
    try {
      if (ringtoneSoundRef.current) return;
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
      // Load standard ringtone (using asset fallback)
      const player = createAudioPlayer('https://assets.mixkit.co/active_storage/sfx/1359/1359-84.wav');
      player.loop = true;
      player.volume = 0.8;
      player.play();
      ringtoneSoundRef.current = player;
    } catch (e) {
      console.log('[Ringtone] Failed to play ringtone sound:', e);
    }
  }, []);

  // Stop Ringtone Sound
  const stopRingtone = useCallback(async () => {
    try {
      if (ringtoneSoundRef.current) {
        ringtoneSoundRef.current.pause();
        ringtoneSoundRef.current.release();
        ringtoneSoundRef.current = null;
      }
    } catch (e) {
      console.log('[Ringtone] Failed to stop ringtone:', e);
    }
  }, []);

  // Play Dialing Sound (Outgoing call)
  const playDialingSound = useCallback(async () => {
    try {
      if (outgoingSoundRef.current) return;
      const player = createAudioPlayer('https://assets.mixkit.co/active_storage/sfx/2056/2056-84.wav');
      player.loop = true;
      player.volume = 0.5;
      player.play();
      outgoingSoundRef.current = player;
    } catch (e) {
      console.log('[Dialing] Failed to play dialing sound:', e);
    }
  }, []);

  // Stop Dialing Sound
  const stopDialingSound = useCallback(async () => {
    try {
      if (outgoingSoundRef.current) {
        outgoingSoundRef.current.pause();
        outgoingSoundRef.current.release();
        outgoingSoundRef.current = null;
      }
    } catch (e) {
      console.log('[Dialing] Failed to stop dialing sound:', e);
    }
  }, []);

  // Call End Cleanup
  const callEndCleanup = useCallback(async () => {
    webrtc.cleanUp();
    setActiveCall(null);
    await stopRingtone();
    await stopDialingSound();
  }, [webrtc, stopRingtone, stopDialingSound]);

  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Socket Lifecycle — WhatsApp style ────────────────────────────────────
  // The socket stays alive as long as the user is logged in.
  // We never disconnect on background. If the OS drops the connection,
  // Socket.IO's built-in reconnection will restore it automatically.
  // The only time we disconnect is when the token disappears (logout).
  useEffect(() => {
    if (!token) {
      // User logged out — tear down the socket
      setSocket(null);
      socketRef.current = null;
      disconnectSocket();
      return;
    }

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App returned to foreground — ensure socket is connected
        // (OS may have killed the TCP connection while backgrounded)
        const connSocket = connectSocket(token);
        socketRef.current = connSocket;
        setSocket(connSocket);
        console.log('[CallProvider] App active — socket ensured.');
      }
      // Background/inactive: do nothing — let socket stay open like WhatsApp
    };

    // Initial connect on mount / token change
    const connSocket = connectSocket(token);
    socketRef.current = connSocket;
    setSocket(connSocket);

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Clear any lingering timer refs but DO NOT disconnect the socket.
      // The socket must outlive this component's unmount cycle.
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    };
  }, [token]);

  // Socket Signaling Event Listeners
  useEffect(() => {
    if (!socket) return;

    // Handle INCOMING WebRTC Call
    socket.on('call:incoming', async ({ callId, callerId, callerName, callerAvatar, callType, conversationId }: any) => {
      console.log(`[Socket] Incoming Call: ${callId} from ${callerName}`);
      
      // If already in an active call, automatically reject with BUSY status
      if (activeCall) {
        socket.emit('call:reject', { callId, reason: 'busy' });
        return;
      }

      // Try to fetch full profile details for incoming caller
      let callerDetails: any = null;
      try {
        const res = await apiClient.get(`/api/v1/employees/${callerId}`);
        callerDetails = res.data?.data || res.data;
      } catch (err) {
        console.log('[CallProvider] Failed to fetch caller details:', err);
      }

      const calleeInfo: CallUser = {
        id: callerId,
        name: callerDetails?.name || callerName,
        avatar: callerDetails?.avatarUrl || callerDetails?.avatar || callerAvatar || null,
        department: callerDetails?.department || 'Operations',
        role: callerDetails?.designation || callerDetails?.role || 'Staff',
      };

      setActiveCall({
        callId,
        callType,
        targetUser: calleeInfo,
        isIncoming: true,
        status: 'ringing',
        conversationId,
      });

      await playRingtone();

      // Route to the calling screen
      router.push('/call' as any);
    });

    // Handle CALL RINGING (for caller)
    socket.on('call:ringing', ({ callId, callType }: any) => {
      console.log(`[Socket] Call ringing... ${callId}`);
      playDialingSound();
    });

    // Handle CALL ACCEPTED (Establish WebRTC)
    socket.on('call:accepted', async ({ callId, calleeId, calleeName }: any) => {
      console.log(`[Socket] Call accepted by ${calleeName}`);
      await stopDialingSound();
      await stopRingtone();

      setActiveCall((prev) => {
        if (!prev) return null;
        return { ...prev, status: 'active' };
      });

      // Initialize WebRTC Offer/Answer handshake
      if (activeCall && !activeCall.isIncoming) {
        // If we initiated, create WebRTC offer
        webrtc.startCall(callId, activeCall.targetUser.id, activeCall.callType === 'video');
      } else if (activeCall && activeCall.isIncoming) {
        // If we accepted, create WebRTC receiver peer connection
        webrtc.acceptCall(callId, activeCall.targetUser.id, activeCall.callType === 'video');
      }
    });

    // Handle CALL REJECTED
    socket.on('call:rejected', async ({ callId, reason }: any) => {
      console.log(`[Socket] Call rejected. Reason: ${reason}`);
      toast.info(reason === 'busy' ? 'User is busy' : 'Call declined');
      await callEndCleanup();
      safeBack();
    });

    // Handle CALL ENDED
    socket.on('call:ended', async ({ callId, duration }: any) => {
      console.log(`[Socket] Call ended. Duration: ${duration}s`);
      toast.info('Call ended');
      await callEndCleanup();
      safeBack();
    });

    // Handle CALL MISSED
    socket.on('call:missed', async ({ callId, reason }: any) => {
      console.log(`[Socket] Call missed. Reason: ${reason}`);
      toast.error('Call missed');
      await callEndCleanup();
      safeBack();
    });

    // Handle WebRTC signal payloads
    socket.on('call:signal:offer', ({ signal }: any) => {
      webrtc.handleRemoteSignal('offer', signal);
    });

    socket.on('call:signal:answer', ({ signal }: any) => {
      webrtc.handleRemoteSignal('answer', signal);
    });

    socket.on('call:signal:ice', ({ candidate }: any) => {
      webrtc.handleRemoteSignal('ice', candidate);
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:ringing');
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('call:missed');
      socket.off('call:signal:offer');
      socket.off('call:signal:answer');
      socket.off('call:signal:ice');
    };
  }, [socket, activeCall, playRingtone, playDialingSound, stopDialingSound, stopRingtone, callEndCleanup]);

  // Initiate Outgoing Call
  const initiateCall = useCallback(async (targetUserId: string, callType: 'audio' | 'video', conversationId: string) => {
    try {
      if (!socketRef.current?.connected) {
        toast.error('Connection lost. Please reconnect.');
        return;
      }

      // Fetch user profile from company list
      const socket = socketRef.current;
      
      // Try to fetch full profile details for target user
      let employeeDetails: any = null;
      try {
        const res = await apiClient.get(`/api/v1/employees/${targetUserId}`);
        employeeDetails = res.data?.data || res.data;
      } catch (err) {
        console.log('[CallProvider] Failed to fetch target details:', err);
      }

      const targetUser: CallUser = {
        id: targetUserId,
        name: employeeDetails?.name || 'Connecting...',
        avatar: employeeDetails?.avatarUrl || employeeDetails?.avatar || null,
        department: employeeDetails?.department || 'Operations',
        role: employeeDetails?.designation || employeeDetails?.role || 'Staff',
      };

      setActiveCall({
        callId: 'pending',
        callType,
        targetUser,
        isIncoming: false,
        status: 'ringing',
        conversationId,
      });

      // Emit calling event to socket
      socket.emit('call:initiate', { targetUserId, callType, conversationId });

      // Navigate to call overlay
      router.push('/call' as any);
      
      // Update target callee details dynamically once ringing starts
      socket.once('call:ringing', ({ callId }: any) => {
        setActiveCall((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            callId,
            status: 'ringing',
          };
        });
      });
      
      // Handle call initiate errors
      socket.once('call:error', ({ message }: any) => {
        toast.error(message || 'Failed to start call');
        callEndCleanup();
        safeBack();
      });

    } catch (e) {
      console.error('[CallProvider] Initiate call failed:', e);
      toast.error('Failed to initiate call');
      callEndCleanup();
    }
  }, [callEndCleanup]);

  // Accept Incoming Call
  const acceptCall = useCallback(async () => {
    if (!activeCall) return;
    try {
      await stopRingtone();
      socketRef.current?.emit('call:accept', { callId: activeCall.callId });
      
      // Set to active state and prepare media
      setActiveCall((prev) => {
        if (!prev) return null;
        return { ...prev, status: 'active' };
      });

      await webrtc.acceptCall(activeCall.callId, activeCall.targetUser.id, activeCall.callType === 'video');
    } catch (err) {
      console.error('[CallProvider] Accept call failed:', err);
      callEndCleanup();
      safeBack();
    }
  }, [activeCall, stopRingtone, webrtc, callEndCleanup]);

  // Reject Incoming Call
  const rejectCall = useCallback(async () => {
    if (!activeCall) return;
    try {
      await stopRingtone();
      socketRef.current?.emit('call:reject', { callId: activeCall.callId, reason: 'declined' });
      await callEndCleanup();
      safeBack();
    } catch (err) {
      console.error('[CallProvider] Reject call failed:', err);
      callEndCleanup();
      safeBack();
    }
  }, [activeCall, stopRingtone, callEndCleanup]);

  // End active call
  const endCall = useCallback(async () => {
    if (!activeCall) return;
    try {
      socketRef.current?.emit('call:end', { callId: activeCall.callId });
      await callEndCleanup();
      safeBack();
    } catch (err) {
      console.error('[CallProvider] End call failed:', err);
      callEndCleanup();
      safeBack();
    }
  }, [activeCall, callEndCleanup, safeBack]);

  const value: CallContextType = {
    activeCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream: webrtc.localStream,
    remoteStream: webrtc.remoteStream,
    isMuted: webrtc.isMuted,
    isVideoOff: webrtc.isVideoOff,
    isFrontCamera: webrtc.isFrontCamera,
    callDuration: webrtc.callDuration,
    connectionState: webrtc.connectionState,
    toggleMute: webrtc.toggleMute,
    toggleVideo: webrtc.toggleVideo,
    flipCamera: webrtc.flipCamera,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
export default CallProvider;
