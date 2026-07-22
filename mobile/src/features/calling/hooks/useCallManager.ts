/**
 * @file useCallManager.ts
 * @description Centralized Call Manager hook acting as the single source of truth
 *              for active calling sessions, WebRTC engine binding, signaling,
 *              audio routing, and call state transitions.
 */

import { useCallback } from 'react';
import { useCall } from '../../../shared/providers/CallProvider';
import useCallStore from '../store/useCallStore';
import audioManager from '../services/audioManager';
import callAnalytics from '../services/callAnalytics';

export const useCallManager = () => {
  const callProvider = useCall();
  const store = useCallStore();

  const initiateCallSession = useCallback(
    async (targetUserId: string, callType: 'audio' | 'video', conversationId: string) => {
      callAnalytics.logCallStart('pending', callType);
      await audioManager.configureAudioMode(callType === 'video');
      await callProvider.initiateCall(targetUserId, callType, conversationId);
    },
    [callProvider]
  );

  const acceptCallSession = useCallback(async () => {
    await audioManager.stopRingtone();
    await callProvider.acceptCall();
  }, [callProvider]);

  const rejectCallSession = useCallback(async () => {
    await audioManager.stopRingtone();
    await callProvider.rejectCall();
  }, [callProvider]);

  const endCallSession = useCallback(async () => {
    await audioManager.stopAllSounds();
    await callProvider.endCall();
  }, [callProvider]);

  return {
    ...callProvider,
    ...store,
    initiateCallSession,
    acceptCallSession,
    rejectCallSession,
    endCallSession,
  };
};

export default useCallManager;
