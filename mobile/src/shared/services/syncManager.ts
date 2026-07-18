/**
 * @file syncManager.ts
 * @description Sync manager that sequentially processes and executes queued offline mutations when connectivity returns.
 */

import { useOfflineStore } from '../store/offlineStore';
import apiClient from './apiClient';
import { queryClient } from '../api/queryClient';

let isSyncing = false;

export const syncManager = {
  /**
   * Synchronize all queued requests sequentially
   */
  async sync(): Promise<void> {
    const store = useOfflineStore.getState();
    
    // Guard against double sync execution or syncing when offline
    if (isSyncing || !store.isConnected || store.queue.length === 0) {
      return;
    }

    isSyncing = true;
    console.log(`[SyncManager]: Starting synchronization of ${store.queue.length} pending items...`);

    const queueToProcess = [...store.queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const request of queueToProcess) {
      try {
        console.log(`[SyncManager]: Syncing request ${request.id} (${request.method} ${request.url})`);
        
        await apiClient({
          url: request.url,
          method: request.method,
          data: request.data,
          headers: request.headers,
        });

        // Invalidate corresponding cache queries on successful sync
        if (request.url.includes('/status')) {
          queryClient.invalidateQueries({ queryKey: ['chat', 'presence'] });
        } else if (request.url.includes('/mute') || request.url.includes('/wallpaper')) {
          queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        } else if (request.url.includes('/profile')) {
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        } else if (request.url.includes('/messages') || request.url.includes('/conversations')) {
          queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
          queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        }

        // Success -> remove from queue
        await store.removeFromQueue(request.id);
        console.log(`[SyncManager]: Successfully synced request ${request.id}`);
      } catch (error: any) {
        console.error(`[SyncManager]: Failed to sync request ${request.id}`, error);

        // If it is a client-side parameter error (e.g., 400, 422, 404), there is no use retrying.
        // Remove it from the queue to prevent blocking subsequent actions.
        if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 401 && error.statusCode !== 429) {
          console.warn(`[SyncManager]: Removing permanently failing request ${request.id} due to status code ${error.statusCode}`);
          await store.removeFromQueue(request.id);
        } else {
          // If it is a server error (500) or network error, stop processing queue to retry later.
          console.log('[SyncManager]: Halting sync queue execution due to retryable error.');
          break;
        }
      }
    }

    isSyncing = false;
    console.log('[SyncManager]: Synchronization process completed.');
  },
};

export default syncManager;
