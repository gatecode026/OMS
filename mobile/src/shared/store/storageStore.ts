/**
 * @file storageStore.ts
 * @description Zustand store for tracking cache size, media storage, download space, and quota usage.
 */

import { create } from 'zustand';

interface StorageState {
  cacheSize: number;
  downloadsSize: number;
  mediaSize: number;
  quotaUsage: Record<string, number>; // conversationId -> storageBytes
  setSizes: (sizes: Partial<{ cacheSize: number; downloadsSize: number; mediaSize: number }>) => void;
  updateQuotaUsage: (conversationId: string, sizeBytes: number) => void;
  clearStorageData: () => void;
}

export const useStorageStore = create<StorageState>((set) => ({
  cacheSize: 0,
  downloadsSize: 0,
  mediaSize: 0,
  quotaUsage: {},

  setSizes: (sizes) => set((state) => ({ ...state, ...sizes })),
  updateQuotaUsage: (conversationId, sizeBytes) => set((state) => ({
    quotaUsage: {
      ...state.quotaUsage,
      [conversationId]: sizeBytes,
    },
  })),
  clearStorageData: () => set({ cacheSize: 0, downloadsSize: 0, mediaSize: 0, quotaUsage: {} }),
}));

export default useStorageStore;
