/**
 * @file CallStoreSyncer.tsx
 * @description Phase 8 — State Machine Synchronization Bridge.
 *
 * Keeps the legacy Zustand useCallStore in sync with CallProvider.
 * This allows any screen that reads from useCallStore (e.g. older components)
 * to see correct state without migrating all consumers to useCall() at once.
 *
 * Architecture:
 *   CallProvider (authoritative) → CallStoreSyncer → useCallStore (mirror)
 *
 * This is a zero-UI, zero-render-cost bridge — it renders null.
 */

import { useEffect } from 'react';
import { useCall } from '../providers/CallProvider';
import { useCallStore } from '../../features/calling/store/useCallStore';
import type { ActiveCallSession } from '../../features/calling/types/calling.types';

export function CallStoreSyncer(): null {
  const {
    activeCall,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    isFrontCamera,
    isOnHold,
    networkQuality,
    callDuration,
    connectionState,
  } = useCall();

  const setActiveSession  = useCallStore((s) => s.setActiveSession);
  const setCallState      = useCallStore((s) => s.setCallState);
  const setIsMuted        = useCallStore((s) => s.setIsMuted);
  const setIsVideoOff     = useCallStore((s) => s.setIsVideoOff);
  const setIsSpeakerOn    = useCallStore((s) => s.setIsSpeakerOn);
  const setIsOnHold       = useCallStore((s) => s.setIsOnHold);
  const setIsFrontCamera  = useCallStore((s) => s.setIsFrontCamera);
  const setNetworkQuality = useCallStore((s) => s.setNetworkQuality);
  const setCallDuration   = useCallStore((s) => s.setCallDuration);
  const resetCall         = useCallStore((s) => s.resetCall);

  // Sync activeCall → activeSession in Zustand
  useEffect(() => {
    if (!activeCall) {
      resetCall();
      return;
    }

    // Map CallProvider status → calling.types.ts CallState union
    const statusMap: Record<string, ActiveCallSession['status']> = {
      ringing:    'ringing',
      active:     'connected',
      rejected:   'rejected',
      ended:      'ended',
      missed:     'missed',
      on_hold:    'on_hold',
      connecting: 'connecting',
    };

    const session: ActiveCallSession = {
      callId:         activeCall.callId,
      callType:       activeCall.callType,
      targetUser: {
        id:         activeCall.targetUser.id,
        name:       activeCall.targetUser.name,
        avatar:     activeCall.targetUser.avatar,
        department: activeCall.targetUser.department,
        role:       activeCall.targetUser.role,
      },
      isIncoming:     activeCall.isIncoming,
      status:         statusMap[activeCall.status] ?? 'connecting',
      conversationId: activeCall.conversationId,
      startedAt:      activeCall.status === 'active' ? Date.now() : undefined,
    };

    setActiveSession(session);
  }, [activeCall, setActiveSession, resetCall]);

  // Sync media / control state
  useEffect(() => { setIsMuted(isMuted); },         [isMuted,       setIsMuted]);
  useEffect(() => { setIsVideoOff(isVideoOff); },   [isVideoOff,    setIsVideoOff]);
  useEffect(() => { setIsSpeakerOn(isSpeakerOn); }, [isSpeakerOn,   setIsSpeakerOn]);
  useEffect(() => { setIsOnHold(isOnHold); },       [isOnHold,      setIsOnHold]);
  useEffect(() => { setIsFrontCamera(isFrontCamera); }, [isFrontCamera, setIsFrontCamera]);
  useEffect(() => { setCallDuration(callDuration); },   [callDuration,  setCallDuration]);

  // Sync network quality (only valid quality values)
  useEffect(() => {
    const validQualities = ['Excellent', 'Good', 'Fair', 'Weak', 'Poor', 'Reconnecting'] as const;
    if (validQualities.includes(networkQuality as any)) {
      setNetworkQuality(networkQuality as any);
    }
  }, [networkQuality, setNetworkQuality]);

  // Sync connection state → callState
  useEffect(() => {
    const stateMap: Record<string, any> = {
      idle:         'idle',
      connecting:   'connecting',
      connected:    'connected',
      reconnecting: 'reconnecting',
      failed:       'failed',
      ended:        'ended',
    };
    if (stateMap[connectionState]) {
      setCallState(stateMap[connectionState]);
    }
  }, [connectionState, setCallState]);

  return null;
}

export default CallStoreSyncer;
