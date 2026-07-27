/**
 * @file RealtimeQueue.ts
 * @description Offline Event Queue Engine for queuing pending real-time events
 *              (messages, read receipts, reactions, deletes) when offline,
 *              and auto-replaying them to backend on network reconnection.
 */

import socketManager from '../../../shared/services/socketManager';
import { toast } from '../../../shared/components/Toast';

export interface QueuedRealtimeEvent {
  id: string;
  eventName: string;
  payload: any;
  createdAt: number;
}

export class RealtimeQueueClass {
  private pendingQueue: QueuedRealtimeEvent[] = [];

  /**
   * Enqueue a pending event when offline
   */
  enqueue(eventName: string, payload: any): void {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.pendingQueue.push({
      id,
      eventName,
      payload,
      createdAt: Date.now(),
    });
    toast.info('Offline. Action queued for auto-sync.');
  }

  /**
   * Flush and replay all queued events on network reconnection
   */
  flushQueue(): void {
    if (this.pendingQueue.length === 0) return;

    const socket = socketManager.getSocket();
    if (!socket || !socket.connected) return;

    console.log(`[RealtimeQueue] Reconnected! Flushing ${this.pendingQueue.length} queued events...`);
    const queueToProcess = [...this.pendingQueue];
    this.pendingQueue = [];

    for (const item of queueToProcess) {
      try {
        socket.emit(item.eventName, item.payload);
      } catch (err) {
        console.warn(`[RealtimeQueue] Failed to replay event ${item.eventName}:`, err);
      }
    }

    toast.success('Online! Queued actions synchronized.');
  }

  /**
   * Get queue size
   */
  getQueueLength(): number {
    return this.pendingQueue.length;
  }
}

export const RealtimeQueue = new RealtimeQueueClass();
export default RealtimeQueue;
