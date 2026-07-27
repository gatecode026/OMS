/**
 * @file CallManager.ts
 * @description Master Facade for Voice & Video Calling.
 *              Orchestrates call session lifecycle, permissions, audio mode settings,
 *              duration timers, ringtone playback, WebRTC tracks, and signaling.
 */

import { useCallStore, ActiveCallData } from '../stores/useCallStore';
import CallSignalingManager from './CallSignalingManager';
import WebRTCManager from './WebRTCManager';
import { toast } from '../../../shared/components/Toast';

export class CallManagerClass {
  private durationTimer: NodeJS.Timeout | null = null;

  /**
   * Start duration timer for active call
   */
  startDurationTimer() {
    this.stopDurationTimer();
    useCallStore.getState().setCallDuration(0);
    this.durationTimer = setInterval(() => {
      useCallStore.getState().setCallDuration((prev) => prev + 1);
    }, 1000);
  }

  /**
   * Stop duration timer
   */
  stopDurationTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  /**
   * Initiate Outgoing Call
   */
  async initiateCall(
    targetUserId: string,
    callType: 'audio' | 'video',
    conversationId: string,
    targetUserInfo?: { name?: string; avatar?: string; role?: string; department?: string }
  ): Promise<string> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const callData: ActiveCallData = {
      callId,
      callType,
      targetUser: {
        id: targetUserId,
        name: targetUserInfo?.name || 'Contact',
        avatar: targetUserInfo?.avatar || null,
        role: targetUserInfo?.role,
        department: targetUserInfo?.department,
      },
      isIncoming: false,
      conversationId,
      status: 'calling',
    };

    useCallStore.getState().setActiveCall(callData);

    // Emit initiation signal over Socket.IO
    CallSignalingManager.emitSignal('call:initiate', {
      callId,
      targetUserId,
      callType,
      conversationId,
    });

    return callId;
  }

  /**
   * End active call session
   */
  endCall(callId?: string) {
    this.stopDurationTimer();
    const active = useCallStore.getState().activeCall;
    const targetCallId = callId || active?.callId;

    if (targetCallId) {
      CallSignalingManager.emitSignal('call:end', { callId: targetCallId });
    }

    WebRTCManager.cleanup();
    useCallStore.getState().resetCallStore();
    toast.info('Call ended');
  }
}

export const CallManager = new CallManagerClass();
export default CallManager;
