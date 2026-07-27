/**
 * @file OfflineEngine.ts
 * @description Master Facade for Enterprise Offline Engine, Synchronization,
 *              and Conflict Resolution Framework.
 */

import { QueryClient } from '@tanstack/react-query';
import OfflineQueueManager from './OfflineQueueManager';
import SyncManager from './SyncManager';
import NetworkManager from './NetworkManager';

export class OfflineEngineClass {
  /**
   * Initialize Offline Engine, load persistent queue from SecureStore,
   * and bind network reconnection listeners.
   */
  async initialize(queryClient: QueryClient): Promise<() => void> {
    // 1. Initialize persistent secure queue
    await OfflineQueueManager.initialize();

    // 2. Bind network recovery listener
    const unsubscribe = NetworkManager.subscribe(async (isOnline) => {
      if (isOnline) {
        console.log('[OfflineEngine] Network reconnected! Triggering sync & queue flush...');
        await OfflineQueueManager.flushQueue();
        await SyncManager.performIncrementalSync(queryClient);
      }
    });

    return unsubscribe;
  }
}

export const OfflineEngine = new OfflineEngineClass();
export default OfflineEngine;
