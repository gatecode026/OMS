/**
 * @file offlineStore.ts
 * @description Zustand store for connectivity tracking and offline action queuing.
 */

import { create } from 'zustand';
import secureStore from '../services/secureStore';

export interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any;
  headers?: Record<string, string>;
  timestamp: number;
  description?: string; // User-facing description for sync indicators (e.g., "Clocking In")
}

interface OfflineState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  queue: QueuedRequest[];
  setConnectionStatus: (isConnected: boolean, isInternetReachable: boolean | null) => void;
  addToQueue: (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  loadQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isConnected: true,
  isInternetReachable: true,
  queue: [],

  setConnectionStatus: (isConnected, isInternetReachable) => {
    set({ isConnected, isInternetReachable });
  },

  addToQueue: async (request) => {
    const newRequest: QueuedRequest = {
      ...request,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };

    const updatedQueue = [...get().queue, newRequest];
    set({ queue: updatedQueue });
    await secureStore.setJson('offline_sync_queue', updatedQueue);
  },

  removeFromQueue: async (id) => {
    const updatedQueue = get().queue.filter((req) => req.id !== id);
    set({ queue: updatedQueue });
    await secureStore.setJson('offline_sync_queue', updatedQueue);
  },

  clearQueue: async () => {
    set({ queue: [] });
    await secureStore.deleteItem('offline_sync_queue');
  },

  loadQueue: async () => {
    const savedQueue = await secureStore.getJson<QueuedRequest[]>('offline_sync_queue');
    set({ queue: savedQueue || [] });
  },
}));
export default useOfflineStore;
