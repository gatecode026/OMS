/**
 * @file CallSignalingManager.ts
 * @description Centralized Socket.IO Signaling Manager for Voice and Video Calling.
 *              Implements callId deduplication tracking (`processedCallIds`) to prevent
 *              ghost calls, double ringing, or redundant listeners.
 */

import socketManager from '../../../shared/services/socketManager';

export interface CallSignalCallbacks {
  onCallIncoming?: (data: any) => void;
  onCallOffer?: (data: any) => void;
  onCallAnswer?: (data: any) => void;
  onCallIceCandidate?: (data: any) => void;
  onCallAccepted?: (data: any) => void;
  onCallRejected?: (data: any) => void;
  onCallEnded?: (data: any) => void;
  onCallBusy?: (data: any) => void;
}

export class CallSignalingManagerClass {
  private processedCallIds: Set<string> = new Set();

  /**
   * Mark a call ID as processed to block duplicate socket events
   */
  markCallProcessed(callId: string) {
    this.processedCallIds.add(callId);
  }

  /**
   * Check if call ID was already handled
   */
  isCallProcessed(callId: string): boolean {
    return this.processedCallIds.has(callId);
  }

  /**
   * Send Socket.IO signaling event safely
   */
  emitSignal(event: string, payload: any) {
    const socket = socketManager.getSocket();
    if (socket && socket.connected) {
      socket.emit(event, payload);
    }
  }

  /**
   * Bind Socket.IO call event listeners
   */
  bindCallListeners(callbacks: CallSignalCallbacks): () => void {
    const socket = socketManager.getSocket();
    if (!socket) return () => {};

    const handleIncoming = (data: any) => {
      if (data?.callId && this.isCallProcessed(data.callId)) {
        return;
      }
      callbacks.onCallIncoming?.(data);
    };

    const handleOffer = (data: any) => callbacks.onCallOffer?.(data);
    const handleAnswer = (data: any) => callbacks.onCallAnswer?.(data);
    const handleIce = (data: any) => callbacks.onCallIceCandidate?.(data);
    const handleAccepted = (data: any) => callbacks.onCallAccepted?.(data);
    const handleRejected = (data: any) => {
      if (data?.callId) this.markCallProcessed(data.callId);
      callbacks.onCallRejected?.(data);
    };
    const handleEnded = (data: any) => {
      if (data?.callId) this.markCallProcessed(data.callId);
      callbacks.onCallEnded?.(data);
    };
    const handleBusy = (data: any) => callbacks.onCallBusy?.(data);

    socket.on('call:incoming', handleIncoming);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIce);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:ended', handleEnded);
    socket.on('call:busy', handleBusy);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIce);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:ended', handleEnded);
      socket.off('call:busy', handleBusy);
    };
  }
}

export const CallSignalingManager = new CallSignalingManagerClass();
export default CallSignalingManager;
