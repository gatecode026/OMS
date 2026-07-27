/**
 * @file OfflineQueueManager.ts
 * @description Persistent Encrypted Offline Queue Manager for chat actions:
 *              Messages, replies, reactions, deletes, pins, and stars.
 *              Persists queue to secureStore (`offline_chat_queue`) so pending actions
 *              survive app restarts and OS kills.
 */

import { secureStore } from '../../../shared/services/secureStore';
import socketManager from '../../../shared/services/socketManager';
import { toast } from '../../../shared/components/Toast';

export interface PersistentChatAction {
  id: string;
  type: 'message' | 'reply' | 'reaction' | 'delete' | 'pin' | 'star';
  conversationId: string;
  payload: any;
  timestamp: number;
}

export class OfflineQueueManagerClass {
  private queueKey = 'offline_chat_queue';
  private inMemoryQueue: PersistentChatAction[] = [];

  /**
   * Initialize and load persisted queue from secureStore
   */
  async initialize(): Promise<void> {
    try {
      const stored = await secureStore.getJson<PersistentChatAction[]>(this.queueKey);
      if (Array.isArray(stored)) {
        this.inMemoryQueue = stored;
      }
    } catch {
      this.inMemoryQueue = [];
    }
  }

  /**
   * Enqueue a new chat action and persist to secureStore
   */
  async enqueueAction(
    type: 'message' | 'reply' | 'reaction' | 'delete' | 'pin' | 'star',
    conversationId: string,
    payload: any
  ): Promise<string> {
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const actionItem: PersistentChatAction = {
      id,
      type,
      conversationId,
      payload,
      timestamp: Date.now(),
    };

    this.inMemoryQueue.push(actionItem);
    await secureStore.setJson(this.queueKey, this.inMemoryQueue);

    toast.info('Saved offline. Will sync when connection is restored.');
    return id;
  }

  /**
   * Flush and replay all queued actions sequentially on network recovery
   */
  async flushQueue(): Promise<void> {
    if (this.inMemoryQueue.length === 0) return;

    const socket = socketManager.getSocket();
    if (!socket || !socket.connected) return;

    console.log(`[OfflineQueueManager] Reconnected! Flushing ${this.inMemoryQueue.length} persistent actions...`);
    const queueToProcess = [...this.inMemoryQueue];

    for (const item of queueToProcess) {
      try {
        switch (item.type) {
          case 'message':
          case 'reply':
            socket.emit('send_message', item.payload);
            break;
          case 'reaction':
            socket.emit('add_reaction', item.payload);
            break;
          case 'delete':
            socket.emit('delete_message', item.payload);
            break;
          case 'pin':
            socket.emit('pin_message', item.payload);
            break;
          case 'star':
            socket.emit('star_message', item.payload);
            break;
        }

        // Remove from persistent queue upon emission
        this.inMemoryQueue = this.inMemoryQueue.filter((q) => q.id !== item.id);
        await secureStore.setJson(this.queueKey, this.inMemoryQueue);
      } catch (err) {
        console.warn(`[OfflineQueueManager] Failed to replay action ${item.id}:`, err);
      }
    }

    toast.success('Offline queue synchronized successfully');
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.inMemoryQueue.length;
  }
}

export const OfflineQueueManager = new OfflineQueueManagerClass();
export default OfflineQueueManager;
