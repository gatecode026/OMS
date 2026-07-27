/**
 * @file SyncManager.ts
 * @description Incremental & Full Synchronization Engine for refreshing missed
 *              conversation updates, messages, and read receipts upon reconnect.
 */

import { QueryClient } from '@tanstack/react-query';

export class SyncManagerClass {
  private lastSyncTimestamp: number = Date.now();

  /**
   * Perform incremental sync on network recovery
   */
  async performIncrementalSync(queryClient: QueryClient): Promise<void> {
    try {
      console.log(`[SyncManager] Performing incremental sync since ${new Date(this.lastSyncTimestamp).toISOString()}`);
      
      // Invalidate active chat queries to pull fresh updates from backend
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] }),
      ]);

      this.lastSyncTimestamp = Date.now();
    } catch (err) {
      console.warn('[SyncManager] Incremental sync error:', err);
    }
  }
}

export const SyncManager = new SyncManagerClass();
export default SyncManager;
