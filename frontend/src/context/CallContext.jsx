import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useChat } from './ChatContext';
import { useApp } from './AppContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { callSounds } from '../utils/callSounds';

const CallContext = createContext(null);

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export const CallProvider = ({ children }) => {
  const { socket, isConnected } = useChat();
  const { currentUser, addToast } = useApp();

  // ── Call State ────────────────────────────────
  const [callState, setCallState] = useState('idle'); // idle | outgoing | incoming | active | ended
  const [callInfo, setCallInfo] = useState(null);
  // { callId, callerId, callerName, callerAvatar,
  //   calleeId, calleeName, callType, 
  //   conversationId }
  const [callError, setCallError] = useState(null);

  const {
    localStream, remoteStream,
    isMuted, isVideoOff, isScreenSharing,
    isFrontCamera, isSpeakerOn,
    callDuration, connectionState,
    getMedia, createPeer, handleSignal,
    toggleMute, toggleVideo, toggleScreenShare,
    flipCamera, toggleSpeaker,
    cleanup,
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
    adjustQualityProfile
  } = useWebRTC(socket, currentUser);

  // ── Initiate Call ─────────────────────────────
  const initiateCall = useCallback(async (targetUser, callType, conversationId) => {
    console.log('[CallContext] initiateCall entered:', { targetUser, callType, conversationId, socketConnected: socket?.connected, callState });
    if (!socket?.connected) {
      console.log('[CallContext] initiateCall aborted: socket not connected');
      addToast?.('error', 'Not connected to server');
      return;
    }
    if (callState !== 'idle') {
      console.log('[CallContext] initiateCall aborted: callState is not idle:', callState);
      addToast?.('error', 'Already in a call');
      return;
    }

    try {
      setCallError(null);
      console.log('[CallContext] Calling getMedia...');
      const stream = await getMedia(callType);
      if (callType === 'video' && stream && stream.getVideoTracks().length === 0) {
        addToast?.('warning', 'No camera detected. Starting as voice-only call.');
      }

      setCallInfo({
        callType,
        conversationId,
        callerId: currentUser.id,
        calleeId: targetUser.id,
        calleeName: targetUser.name,
        calleeAvatar: targetUser.avatar
      });
      setCallState('outgoing');

      console.log('[CallContext] Emitting call:initiate event via socket');
      socket.emit('call:initiate', {
        targetUserId: targetUser.id,
        callType,
        conversationId
      });

    } catch (err) {
      console.log('[CallContext] initiateCall error in getMedia:', err);
      setCallError(err.message);
      setCallState('idle');
      cleanup();
      addToast?.('error', err.message);
    }
  }, [socket, callState, getMedia, cleanup, addToast]);

  // ── Reject Call ───────────────────────────────
  const rejectCall = useCallback((reason = 'declined') => {
    // callInfoRef.current use karo — stale closure se bachne ke liye
    const currentCallInfo = callInfoRef.current;
    const finalReason = typeof reason === 'string' ? reason : 'declined';
    
    if (currentCallInfo?.callId) {
      socket?.emit('call:reject', {
        callId: currentCallInfo.callId,
        reason: finalReason
      });
      console.log('[Call] Rejecting call:', currentCallInfo.callId, 'reason:', finalReason);
    } else {
      console.warn('[Call] rejectCall called but no callId found in callInfoRef:', currentCallInfo);
    }
    cleanupRef.current();
    setCallState('idle');
    setCallInfo(null);
  }, [socket]);

  // ── Accept Call ───────────────────────────────
  const acceptCall = useCallback(async () => {
    const currentCallInfo = callInfoRef.current;
    if (!currentCallInfo?.callId) {
      console.warn('[Call] acceptCall: no callId');
      return;
    }

    try {
      setCallError(null);
      const stream = await getMedia(currentCallInfo.callType);
      if (currentCallInfo.callType === 'video' && stream && stream.getVideoTracks().length === 0) {
        addToast?.('warning', 'No camera detected. Accepting as voice-only call.');
      }

      socket.emit('call:accept', { callId: currentCallInfo.callId });

      // Callee creates peer (NOT initiator)
      createPeer(false, stream, currentCallInfo.callId, currentCallInfo.callerId);

      setCallState('active');

    } catch (err) {
      setCallError(err.message);
      // rejectCall also uses ref now — safe
      rejectCall('media_error');
      addToast?.('error', err.message);
    }
  }, [socket, getMedia, createPeer, rejectCall, addToast]);

  // ── End Call ──────────────────────────────────
  const endCall = useCallback(() => {
    const currentCallInfo = callInfoRef.current;
    if (currentCallInfo?.callId) {
      socket?.emit('call:end', {
        callId: currentCallInfo.callId
      });
      console.log('[Call] Ending call:', currentCallInfo.callId);
    }
    cleanupRef.current();
    setCallState('idle');
    setCallInfo(null);
  }, [socket]);

  // Refs to avoid stale closures in socket listeners
  const callStateRef = useRef(callState);
  const callInfoRef = useRef(callInfo);
  const localStreamRef = useRef(localStream);
  const createPeerRef = useRef(createPeer);
  const handleSignalRef = useRef(handleSignal);
  const cleanupRef = useRef(cleanup);
  const addToastRef = useRef(addToast);

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { callInfoRef.current = callInfo; }, [callInfo]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { createPeerRef.current = createPeer; }, [createPeer]);
  useEffect(() => { handleSignalRef.current = handleSignal; }, [handleSignal]);
  useEffect(() => { cleanupRef.current = cleanup; }, [cleanup]);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  // ── Call Sound Effects (Web Audio API Synthesizer) ──
  const prevCallStateRef = useRef(callState);
  const prevConnectionStateRef = useRef(connectionState);

  useEffect(() => {
    if (connectionState === 'connected' && prevConnectionStateRef.current !== 'connected') {
      callSounds.stopAll();
      callSounds.playConnectSound();
    }
    prevConnectionStateRef.current = connectionState;
  }, [connectionState]);

  useEffect(() => {
    if (callState === 'outgoing') {
      callSounds.startOutgoingRing();
    } else if (callState === 'incoming') {
      callSounds.startIncomingRing();
    } else {
      callSounds.stopAll();
      if (callState === 'idle' && prevCallStateRef.current === 'active') {
        callSounds.playDisconnectSound();
      }
    }
    prevCallStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    return () => {
      callSounds.stopAll();
    };
  }, []);

  // ── URL Query Param Auto-Accept Call ──────────
  useEffect(() => {
    if (!socket?.connected) return;

    const params = new URLSearchParams(window.location.search);
    const callId = params.get('callId');
    const action = params.get('action');

    if (callId && action === 'accept' && callStateRef.current === 'idle') {
      const callerId = params.get('callerId');
      const callerName = params.get('callerName');
      const callerAvatar = params.get('callerAvatar');
      const callType = params.get('callType') || 'audio';
      const conversationId = params.get('conversationId');

      console.log('[CallContext] Auto-accepting call from URL parameters:', callId);

      const incomingCallInfo = {
        callId,
        callerId,
        callerName: callerName ? decodeURIComponent(callerName) : 'Caller',
        callerAvatar: callerAvatar ? decodeURIComponent(callerAvatar) : null,
        callType,
        conversationId,
        calleeId: currentUser?.id,
        calleeName: currentUser?.name
      };

      // Set call info & state
      setCallInfo(incomingCallInfo);
      callInfoRef.current = incomingCallInfo; // Direct ref assign to bypass state lag
      setCallState('incoming');
      callStateRef.current = 'incoming';

      // Clear the URL parameters to prevent re-triggering on reload
      const cleanUrl = window.location.pathname + (conversationId ? `?conversation=${conversationId}` : '');
      window.history.replaceState({}, document.title, cleanUrl);

      // Trigger acceptance flow after state commits
      setTimeout(() => {
        acceptCall();
      }, 150);
    }
  }, [socket, isConnected, acceptCall, currentUser]);

  // Listen for background service worker postMessage events specifically for calls
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'STOP_SOUND') {
        console.log('[CallContext] STOP_SOUND event received from Service Worker:', event.data);
        const currentCallInfo = callInfoRef.current;
        if (!event.data.callId || currentCallInfo?.callId === event.data.callId) {
          cleanupRef.current();
          setCallState('idle');
          setCallInfo(null);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // ── Socket Event Listeners ────────────────────
  useEffect(() => {
    if (!socket) return;

    // Call is ringing (outgoing confirmation)
    const onCallRinging = ({ callId, callType }) => {
      setCallInfo(prev => ({ ...prev, callId }));
    };

    // Incoming call
    const onCallIncoming = (data) => {
      console.log('[Call] Incoming call data:', data);
      // data mein callId hona chahiye
      if (!data.callId) {
        console.error('[Call] Incoming call missing callId!', data);
        return;
      }
      if (callStateRef.current !== 'idle') {
        socket.emit('call:reject', {
          callId: data.callId,
          reason: 'busy'
        });
        return;
      }
      setCallInfo(data);
      setCallState('incoming');
    };

    // Call accepted (outgoing — other party accepted)
    const onCallAccepted = ({ callId, calleeId, calleeName, calleeAvatar, acceptedBySocketId }) => {
      // Check if we are the callee and this was accepted on another tab/device
      if (calleeId === currentUser?.id) {
        if (acceptedBySocketId && acceptedBySocketId !== socket?.id) {
          console.log('[CallContext] Call accepted on another tab/device. Cleaning up local ringing state.');
          cleanupRef.current();
          setCallState('idle');
          setCallInfo(null);
        }
        return; // Caller is the one who initiates the peer connection
      }

      setCallInfo(prev => ({ 
        ...prev, callId,
        calleeId, calleeName, calleeAvatar
      }));
      setCallState('active');

      // Caller creates peer (IS initiator)
      if (localStreamRef.current) {
        createPeerRef.current(true, localStreamRef.current, callId, calleeId);
      } else {
        console.warn('[CallContext] No local stream found on call accepted!');
      }
    };

    // Call rejected
    const onCallRejected = ({ callId, reason, calleeName, calleeId, callerId }) => {
      cleanupRef.current();
      setCallState('idle');
      setCallInfo(null);

      const currentCallInfo = callInfoRef.current;
      const isCaller = currentUser?.id === currentCallInfo?.callerId || currentUser?.id === callerId;
      const isCallee = currentUser?.id === currentCallInfo?.calleeId || currentUser?.id === calleeId;

      // Only show toast to the caller (who initiated the call and had it declined)
      if (isCaller && !isCallee) {
        const msg = reason === 'busy' 
          ? `${calleeName} is busy` 
          : `${calleeName} declined the call`;
        addToastRef.current?.('info', msg);
      }
    };

    // Call ended by other party
    const onCallEnded = ({ callId, duration, endedBy }) => {
      cleanupRef.current();
      setCallState('idle');
      setCallInfo(null);
      if (duration > 0) {
        addToastRef.current?.('info', `Call ended · ${formatDuration(duration)}`);
      }
    };

    // Call missed
    const onCallMissed = ({ callId, callerName, reason }) => {
      cleanupRef.current();
      setCallState('idle');
      setCallInfo(null);
      addToastRef.current?.('info', 'Missed call');
    };

    // Call error
    const onCallError = ({ code, message }) => {
      setCallError(message);
      cleanupRef.current();
      setCallState('idle');
      setCallInfo(null);
      addToastRef.current?.('error', message);
    };

    // WebRTC Signaling
    const onSignalOffer = ({ signal }) => {
      handleSignalRef.current(signal);
    };
    const onSignalAnswer = ({ signal }) => {
      handleSignalRef.current(signal);
    };
    const onSignalIce = ({ candidate }) => {
      handleSignalRef.current(candidate);
    };

    socket.on('call:ringing', onCallRinging);
    socket.on('call:incoming', onCallIncoming);
    socket.on('call:accepted', onCallAccepted);
    socket.on('call:rejected', onCallRejected);
    socket.on('call:ended', onCallEnded);
    socket.on('call:missed', onCallMissed);
    socket.on('call:error', onCallError);
    socket.on('call:signal:offer', onSignalOffer);
    socket.on('call:signal:answer', onSignalAnswer);
    socket.on('call:signal:ice', onSignalIce);

    return () => {
      socket.off('call:ringing', onCallRinging);
      socket.off('call:incoming', onCallIncoming);
      socket.off('call:accepted', onCallAccepted);
      socket.off('call:rejected', onCallRejected);
      socket.off('call:ended', onCallEnded);
      socket.off('call:missed', onCallMissed);
      socket.off('call:error', onCallError);
      socket.off('call:signal:offer', onSignalOffer);
      socket.off('call:signal:answer', onSignalAnswer);
      socket.off('call:signal:ice', onSignalIce);
    };
  }, [socket]);

  const value = {
    callState,
    callInfo,
    callError,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isFrontCamera,
    isSpeakerOn,
    callDuration,
    connectionState,
    formatDuration,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    flipCamera,
    toggleSpeaker,
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
    adjustQualityProfile
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};

export default CallContext;
