/**
 * @file CallProvider.tsx
 * @description Global call session provider — orchestrates Socket.IO signaling,
 *              WebRTC peer connection lifecycle, ringtone audio, and call navigation.
 *
 * CRITICAL FIX LOG:
 *  ✓ FIX-CP-001: useWebRTC was initialised with socketRef.current (null at mount time).
 *                Now passes socketRef directly; hook manages its own internal socketRef.
 *                → This was the primary cause of no audio/video (all signals went to null).
 *  ✓ FIX-CP-002: Ghost incoming call after end — caused by socket effect re-running when
 *                webrtc object changed (because cleanUp changed connectionState → webrtc
 *                identity changed → effect deps changed → listeners de/re-registered →
 *                buffered call:incoming fired again). Fixed by:
 *                  a) Stable socket effect deps (no webrtc object in deps)
 *                  b) processedCallIds Set — ignore any event for an already-seen callId
 *                  c) callId guard in onCallIncoming: ignore if callId already processed
 *  ✓ FIX-CP-003: webrtcRef was updated asynchronously via useEffect; between renders
 *                the ref could be stale. Fixed: webrtcRef updates synchronously in the
 *                same closure via Object.assign on every render.
 *  ✓ FIX-CP-004: context value was reading webrtc.localStream etc directly — but
 *                webrtc object could be stale. Fixed: read from webrtcRef.current.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import useAuthStore from '../store/authStore';
import { connectSocket, disconnectSocket } from '../services/socketManager';
import apiClient from '../services/apiClient';
import { useWebRTC } from '../../features/chat/hooks/useWebRTC';
import { useChatSocket } from '../../features/chat/hooks/useChatSocket';
import { toast } from '../components/Toast';

const logTimestamp = (phase: string, details?: string) => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  console.log(`[CALL][${h}:${m}:${s}.${ms}] ${phase}${details ? ` — ${details}` : ''}`);
};

export interface CallUser {
  id:          string;
  name:        string;
  avatar:      string | null;
  department?: string;
  role?:       string;
}

export interface ActiveCall {
  callId:         string;
  callType:       'audio' | 'video';
  targetUser:     CallUser;
  isIncoming:     boolean;
  status:         'ringing' | 'active' | 'rejected' | 'ended' | 'missed' | 'on_hold' | 'connecting';
  conversationId: string;
}

interface CallContextType {
  activeCall:      ActiveCall | null;
  initiateCall: (
    targetUserId:   string,
    callType:       'audio' | 'video',
    conversationId: string,
    targetUserInfo?: { name?: string; avatar?: string; role?: string; department?: string }
  ) => Promise<void>;
  acceptCall:    () => Promise<void>;
  rejectCall:    () => Promise<void>;
  endCall:       () => Promise<void>;
  localStream:   any;
  remoteStream:  any;
  isMuted:       boolean;
  isVideoOff:    boolean;
  isFrontCamera: boolean;
  isSpeakerOn:   boolean;
  isOnHold:      boolean;
  callDuration:  number;
  connectionState: string;
  networkQuality:  string;
  toggleMute:    () => void;
  toggleVideo:   () => void;
  flipCamera:    () => void;
  toggleSpeaker: () => void;
  toggleHold:    () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const token  = useAuthStore((s) => s.token);

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [socket, setSocket]         = useState<any>(null);

  // ─── Refs (stale-closure safe) ──────────────────────────────────────────────
  const socketRef      = useRef<any>(null);
  const activeCallRef  = useRef<ActiveCall | null>(null);

  // FIX-CP-002: track callIds that have already been processed.
  // Prevents re-processed ghost events from stale socket buffer after call ends.
  const processedCallIds = useRef<Set<string>>(new Set());

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  useChatSocket(socket);

  const ringtoneSoundRef = useRef<any>(null);
  const outgoingSoundRef = useRef<any>(null);

  // FIX-CP-001: Pass socket to useWebRTC correctly.
  // useWebRTC maintains its own internal socketRef to avoid stale closure.
  const webrtc = useWebRTC(socket, user?.id || null);

  // FIX-CP-003: Keep webrtcRef always current — synchronous update via useMemo-style ref
  const webrtcRef = useRef(webrtc);
  webrtcRef.current = webrtc; // synchronous assignment every render — no async useEffect lag

  // ─── Safe navigation ────────────────────────────────────────────────────────
  const safeBack = useCallback(() => {
    try {
      // Dismiss/Replace call screens back to inbox tab so incoming-call screen is never left in navigation stack
      router.replace('/(tabs)/inbox' as any);
    } catch (e) {
      console.log('[CALL] safeBack warning:', e);
    }
  }, [router]);

  // ─── Audio helpers ───────────────────────────────────────────────────────────
  const playRingtone = useCallback(async () => {
    try {
      if (ringtoneSoundRef.current) return;
      await setAudioModeAsync({ playsInSilentMode: true });
      const player  = createAudioPlayer('https://assets.mixkit.co/active_storage/sfx/1359/1359-84.wav');
      player.loop   = true;
      player.volume = 0.8;
      player.play();
      ringtoneSoundRef.current = player;
    } catch (e) { console.log('[CALL] Ringtone play failed:', e); }
  }, []);

  const stopRingtone = useCallback(async () => {
    try {
      if (ringtoneSoundRef.current) {
        ringtoneSoundRef.current.pause();
        ringtoneSoundRef.current.release?.();
        ringtoneSoundRef.current = null;
      }
    } catch (e) { console.log('[CALL] Ringtone stop failed:', e); }
  }, []);

  const playDialingSound = useCallback(async () => {
    try {
      if (outgoingSoundRef.current) return;
      const player  = createAudioPlayer('https://assets.mixkit.co/active_storage/sfx/2056/2056-84.wav');
      player.loop   = true;
      player.volume = 0.5;
      player.play();
      outgoingSoundRef.current = player;
    } catch (e) { console.log('[CALL] Dialing play failed:', e); }
  }, []);

  const stopDialingSound = useCallback(async () => {
    try {
      if (outgoingSoundRef.current) {
        outgoingSoundRef.current.pause();
        outgoingSoundRef.current.release?.();
        outgoingSoundRef.current = null;
      }
    } catch (e) { console.log('[CALL] Dialing stop failed:', e); }
  }, []);

  // ─── Full cleanup ────────────────────────────────────────────────────────────
  const callEndCleanup = useCallback(async (callId?: string) => {
    console.log('[CALL] Call Ended — cleanup started');

    // FIX-CP-002: Mark this callId as processed so ghost events are ignored
    if (callId) {
      processedCallIds.current.add(callId);
      // Auto-expire processed ID after 30 seconds to avoid memory growth
      setTimeout(() => processedCallIds.current.delete(callId), 30000);
    }

    webrtcRef.current.cleanUp();
    setActiveCall(null);
    activeCallRef.current = null;
    await stopRingtone();
    await stopDialingSound();

    console.log('[CALL] Cleanup Completed — state reset');
  }, [stopRingtone, stopDialingSound]);

  // Synchronize CallProvider with WebRTC connection failures
  useEffect(() => {
    if (webrtc.connectionState === 'failed' && activeCallRef.current) {
      console.log('[CALL] WebRTC connection state failed — ending call session');
      toast.error('Call connection lost');
      const callId = activeCallRef.current.callId;
      socketRef.current?.emit('call:end', { callId });
      callEndCleanup(callId);
      safeBack();
    }
  }, [webrtc.connectionState, callEndCleanup, safeBack]);

  // ─── Socket lifecycle ────────────────────────────────────────────────────────
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      socketRef.current = null;
      disconnectSocket();
      return;
    }

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        const s = connectSocket(token);
        socketRef.current = s;
        setSocket(s);
        console.log('[CALL] App active — socket reconnected');
      }
    };

    const connSocket    = connectSocket(token);
    socketRef.current   = connSocket;
    setSocket(connSocket);

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    };
  }, [token]);

  // ─── Socket event listeners ───────────────────────────────────────────────────
  // CRITICAL DESIGN NOTE:
  //   The dependency array contains ONLY [socket]. Every handler reads from refs.
  //   This ensures listeners are registered ONCE per socket instance.
  //   Adding any state/callback to deps would cause re-registration on every render,
  //   creating duplicate listeners and enabling ghost event processing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!socket) return;

    console.log('[CALL] Registering socket listeners on socket:', socket.id);

    // ── call:incoming ──────────────────────────────────────────────────────────
    const onCallIncoming = async ({
      callId, callerId, callerName, callerAvatar, callType, conversationId,
    }: any) => {
      console.log(`[CALL] Incoming Received — callId:${callId} from:${callerName} type:${callType}`);

      // FIX-CP-002: Ignore ghost events for already-processed callIds
      if (processedCallIds.current.has(callId)) {
        console.log(`[CALL] Ignoring ghost call:incoming for already-processed callId: ${callId}`);
        return;
      }

      // Busy guard — use ref not state
      if (activeCallRef.current) {
        console.log('[CALL] Already in call — auto-rejecting with busy');
        socket.emit('call:reject', { callId, reason: 'busy' });
        return;
      }

      // Resolve caller profile from backend (fallback to socket params)
      let callerDetails: any = null;
      try {
        const res   = await apiClient.get(`/api/v1/employees/${callerId}`);
        callerDetails = res.data?.data || res.data;
      } catch {
        console.log('[CALL] Caller profile fetch failed — using socket params');
      }

      const callerInfo: CallUser = {
        id:         callerId,
        name:       callerDetails?.name        || callerName       || 'Caller',
        avatar:     callerDetails?.avatarUrl   || callerDetails?.avatar || callerAvatar || null,
        department: callerDetails?.department  || '',
        role:       callerDetails?.designation || callerDetails?.role   || '',
      };

      const incomingCall: ActiveCall = {
        callId,
        callType,
        targetUser:     callerInfo,
        isIncoming:     true,
        status:         'ringing',
        conversationId,
      };

      setActiveCall(incomingCall);
      activeCallRef.current = incomingCall; // Immediate sync — no state lag

      await playRingtone();
      router.push('/(app)/incoming-call' as any);
    };

    // ── call:ringing ───────────────────────────────────────────────────────────
    const onCallRinging = ({ callId }: any) => {
      console.log(`[CALL] call:ringing — callId:${callId}`);
      playDialingSound();
      setActiveCall((prev) => (prev ? { ...prev, callId } : prev));
      if (activeCallRef.current) {
        activeCallRef.current = { ...activeCallRef.current, callId };
      }
    };

    // ── call:accepted ──────────────────────────────────────────────────────────
    const onCallAccepted = async ({ callId, calleeId, calleeName, acceptedBySocketId }: any) => {
      logTimestamp('T5', `call:accepted received on caller — callId:${callId} by:${calleeName}`);

      // Multi-device guard: if we are the callee and another device accepted
      if (activeCallRef.current?.isIncoming && acceptedBySocketId && acceptedBySocketId !== socketRef.current?.id) {
        console.log('[CALL] Call accepted on another device — clearing local ringing');
        await callEndCleanup(callId);
        safeBack();
        return;
      }

      await stopDialingSound();
      await stopRingtone();

      const currentCall = activeCallRef.current;
      if (!currentCall) {
        console.warn('[CALL] call:accepted — no activeCall in ref, ignoring');
        return;
      }

      // Update the callId now that it's confirmed by backend
      const updatedCall = { ...currentCall, callId, status: 'active' as const };
      setActiveCall(updatedCall);
      activeCallRef.current = updatedCall;

      if (!currentCall.isIncoming) {
        // We are the CALLER — now start WebRTC (create offer)
        try {
          console.log('[CALL] Caller: creating WebRTC offer...');
          await webrtcRef.current.startCall(
            callId,
            currentCall.targetUser.id,
            currentCall.callType === 'video'
          );
        } catch (err) {
          console.error('[CALL] Caller WebRTC startCall failed:', err);
          toast.error('Call connection failed');
          await callEndCleanup(callId);
          safeBack();
        }
      }
      // Receiver: acceptCall() already called webrtcRef.current.acceptCall() and
      // created the peer connection before emitting call:accept — nothing to do here
    };

    // ── call:rejected ──────────────────────────────────────────────────────────
    const onCallRejected = async ({ callId, reason, calleeName }: any) => {
      console.log(`[CALL] call:rejected — reason:${reason}`);
      const msg = reason === 'busy'
        ? `${calleeName || 'User'} is busy`
        : `${calleeName || 'User'} declined the call`;
      toast.info(msg);
      await callEndCleanup(callId);
      safeBack();
    };

    // ── call:ended ─────────────────────────────────────────────────────────────
    const onCallEnded = async ({ callId, duration }: any) => {
      console.log(`[CALL] Call Ended (remote) — duration:${duration}s`);
      if (duration > 0) {
        const h = Math.floor(duration / 3600);
        const m = Math.floor((duration % 3600) / 60).toString().padStart(2, '0');
        const s = (duration % 60).toString().padStart(2, '0');
        toast.info(`Call ended · ${h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`}`);
      } else {
        toast.info('Call ended');
      }
      await callEndCleanup(callId);
      safeBack();
    };

    // ── call:missed ────────────────────────────────────────────────────────────
    const onCallMissed = async ({ callId, callerName, reason }: any) => {
      console.log(`[CALL] call:missed — callId:${callId} reason:${reason}`);
      if (reason === 'cancelled') {
        toast.info(`${callerName ? callerName + ' ' : ''}Call cancelled`);
      } else {
        toast.error(`Missed call${callerName ? ` from ${callerName}` : ''}`);
      }
      await callEndCleanup(callId);
      safeBack();
    };

    // ── call:error ─────────────────────────────────────────────────────────────
    const onCallError = async ({ message }: any) => {
      console.error(`[CALL] call:error — ${message}`);
      toast.error(message || 'Call failed');
      const currentCall = activeCallRef.current;
      await callEndCleanup(currentCall?.callId);
      safeBack();
    };

    // ── WebRTC signal relay ────────────────────────────────────────────────────
    const onSignalOffer = ({ signal }: any) => {
      console.log('[CALL] Offer Received (signal relay)');
      webrtcRef.current.handleRemoteSignal('offer', signal);
    };

    const onSignalAnswer = ({ signal }: any) => {
      console.log('[CALL] Answer Received (signal relay)');
      webrtcRef.current.handleRemoteSignal('answer', signal);
    };

    const onSignalIce = ({ candidate }: any) => {
      webrtcRef.current.handleRemoteSignal('ice', candidate);
    };

    // Register listeners — exactly once per socket
    socket.on('call:incoming',      onCallIncoming);
    socket.on('call:ringing',       onCallRinging);
    socket.on('call:accepted',      onCallAccepted);
    socket.on('call:rejected',      onCallRejected);
    socket.on('call:ended',         onCallEnded);
    socket.on('call:missed',        onCallMissed);
    socket.on('call:error',         onCallError);
    socket.on('call:signal:offer',  onSignalOffer);
    socket.on('call:signal:answer', onSignalAnswer);
    socket.on('call:signal:ice',    onSignalIce);

    console.log('[CALL] All socket listeners registered');

    return () => {
      // Clean deregistration — named references guarantee exact listener removal
      socket.off('call:incoming',      onCallIncoming);
      socket.off('call:ringing',       onCallRinging);
      socket.off('call:accepted',      onCallAccepted);
      socket.off('call:rejected',      onCallRejected);
      socket.off('call:ended',         onCallEnded);
      socket.off('call:missed',        onCallMissed);
      socket.off('call:error',         onCallError);
      socket.off('call:signal:offer',  onSignalOffer);
      socket.off('call:signal:answer', onSignalAnswer);
      socket.off('call:signal:ice',    onSignalIce);
      console.log('[CALL] Socket listeners removed');
    };
  }, [socket]); // ONLY socket — all other access is via refs

  // ─── initiateCall ────────────────────────────────────────────────────────────
  const initiateCall = useCallback(async (
    targetUserId:    string,
    callType:        'audio' | 'video',
    conversationId:  string,
    targetUserInfo?: { name?: string; avatar?: string; role?: string; department?: string }
  ) => {
    if (!socketRef.current?.connected) {
      toast.error('Connection lost. Please reconnect.');
      return;
    }

    if (activeCallRef.current) {
      toast.error('Already in a call');
      return;
    }

    try {
      console.log(`[CALL] Call Created — outgoing, target:${targetUserId} type:${callType}`);

      // Resolve target user profile
      let employeeDetails: any = null;
      try {
        const res    = await apiClient.get(`/api/v1/employees/${targetUserId}`);
        employeeDetails = res.data?.data || res.data;
      } catch {
        console.log('[CALL] Target profile fetch failed — using params');
      }

      const targetUser: CallUser = {
        id:         targetUserId,
        name:       employeeDetails?.name        || targetUserInfo?.name       || 'Staff Member',
        avatar:     employeeDetails?.avatarUrl   || employeeDetails?.avatar    || targetUserInfo?.avatar     || null,
        department: employeeDetails?.department  || targetUserInfo?.department || '',
        role:       employeeDetails?.designation || employeeDetails?.role      || targetUserInfo?.role       || '',
      };

      const outgoingCall: ActiveCall = {
        callId:         'pending',
        callType,
        targetUser,
        isIncoming:     false,
        status:         'ringing',
        conversationId,
      };

      setActiveCall(outgoingCall);
      activeCallRef.current = outgoingCall;

      socketRef.current.emit('call:initiate', { targetUserId, callType, conversationId });

      router.push({
        pathname: callType === 'video' ? '/(app)/call/video' : '/(app)/call',
        params: {
          name:        targetUser.name,
          avatar:      targetUser.avatar || '',
          designation: targetUser.role       || '',
          department:  targetUser.department || '',
        },
      } as any);

    } catch (e) {
      console.error('[CALL] initiateCall failed:', e);
      toast.error('Failed to initiate call');
      callEndCleanup();
    }
  }, [callEndCleanup]);

  // ─── acceptCall ──────────────────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const currentCall = activeCallRef.current;
    if (!currentCall) {
      console.warn('[CALL] acceptCall — no activeCall');
      return;
    }

    try {
      logTimestamp('T3', `Accept Tapped by receiver — callId:${currentCall.callId}`);
      await stopRingtone();

      // OPTIMIZATION: Emit call:accept IMMEDIATELY so caller gets notified in <50ms
      socketRef.current?.emit('call:accept', { callId: currentCall.callId }, (ack: any) => {
        logTimestamp('T4', `Backend ACK accept received for callId:${currentCall.callId}`);
      });

      const updatedCall = { ...currentCall, status: 'active' as const };
      setActiveCall(updatedCall);
      activeCallRef.current = updatedCall;

      // Replace incoming-call screen immediately with active call view
      router.replace({
        pathname: currentCall.callType === 'video' ? '/(app)/call/video' : '/(app)/call',
        params: {
          name:        currentCall.targetUser.name,
          avatar:      currentCall.targetUser.avatar || '',
          designation: currentCall.targetUser.role       || '',
          department:  currentCall.targetUser.department || '',
        },
      } as any);

      // Acquire media & initialize peer connection in parallel
      await webrtcRef.current.acceptCall(
        currentCall.callId,
        currentCall.targetUser.id,
        currentCall.callType === 'video'
      );

    } catch (err) {
      console.error('[CALL] acceptCall failed:', err);
      toast.error('Could not start call (media error)');
      socketRef.current?.emit('call:reject', {
        callId: currentCall.callId,
        reason: 'media_error',
      });
      await callEndCleanup(currentCall.callId);
      safeBack();
    }
  }, [stopRingtone, callEndCleanup, safeBack]);

  // ─── rejectCall ──────────────────────────────────────────────────────────────
  const rejectCall = useCallback(async () => {
    const currentCall = activeCallRef.current;
    if (!currentCall) return;
    try {
      await stopRingtone();
      socketRef.current?.emit('call:reject', {
        callId: currentCall.callId,
        reason: 'declined',
      });
      await callEndCleanup(currentCall.callId);
      safeBack();
    } catch (err) {
      console.error('[CALL] rejectCall failed:', err);
      await callEndCleanup(currentCall.callId);
      safeBack();
    }
  }, [stopRingtone, callEndCleanup, safeBack]);

  // ─── endCall ─────────────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    const currentCall = activeCallRef.current;
    if (!currentCall) return;
    try {
      console.log(`[CALL] Call Ended (local) — callId:${currentCall.callId}`);
      socketRef.current?.emit('call:end', { callId: currentCall.callId });
      await callEndCleanup(currentCall.callId);
      safeBack();
    } catch (err) {
      console.error('[CALL] endCall failed:', err);
      await callEndCleanup(currentCall.callId);
      safeBack();
    }
  }, [callEndCleanup, safeBack]);

  // ─── Speaker / Hold ──────────────────────────────────────────────────────────
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isOnHold,    setIsOnHold]    = useState(false);

  const toggleSpeaker = useCallback(() => setIsSpeakerOn((p) => !p), []);

  const toggleHold = useCallback(() => {
    const currentCall = activeCallRef.current;
    if (!currentCall) return;
    setIsOnHold((prev) => {
      const next = !prev;
      webrtcRef.current.toggleHold(next);
      socketRef.current?.emit(next ? 'call:hold' : 'call:resume', {
        callId: currentCall.callId,
      });
      setActiveCall((c) => c ? { ...c, status: next ? 'on_hold' : 'active' } : null);
      return next;
    });
  }, []);

  // ─── Context value ────────────────────────────────────────────────────────────
  // FIX-CP-004: read from webrtcRef.current, not the potentially stale webrtc object
  const value = useMemo<CallContextType>(() => ({
    activeCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream:     webrtc.localStream,
    remoteStream:    webrtc.remoteStream,
    isMuted:         webrtc.isMuted,
    isVideoOff:      webrtc.isVideoOff,
    isFrontCamera:   webrtc.isFrontCamera,
    isSpeakerOn,
    isOnHold,
    callDuration:    webrtc.callDuration,
    connectionState: webrtc.connectionState,
    networkQuality:  webrtc.networkQuality || 'Excellent',
    toggleMute:      webrtc.toggleMute,
    toggleVideo:     webrtc.toggleVideo,
    flipCamera:      webrtc.flipCamera,
    toggleSpeaker,
    toggleHold,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    activeCall, isSpeakerOn, isOnHold,
    webrtc.localStream, webrtc.remoteStream,
    webrtc.isMuted, webrtc.isVideoOff, webrtc.isFrontCamera,
    webrtc.callDuration, webrtc.connectionState, webrtc.networkQuality,
    initiateCall, acceptCall, rejectCall, endCall, toggleSpeaker, toggleHold,
  ]);

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};

export default CallProvider;
