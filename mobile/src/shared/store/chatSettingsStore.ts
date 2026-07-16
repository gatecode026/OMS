/**
 * @file chatSettingsStore.ts
 * @description Zustand memory store to manage client-side chat settings (e.g. muted status, wallpapers, downloads).
 */

import { create } from 'zustand';

export interface WallpaperConfig {
  type: 'default' | 'solid' | 'gradient' | 'image';
  value: string;
}

export interface FileProgress {
  id: string; // File URL or message ID
  fileName: string;
  progress: number;
  status: 'pending' | 'downloading' | 'uploading' | 'completed' | 'failed' | 'paused';
  fileSize?: number;
}

interface ChatSettingsState {
  mutedConversationIds: string[];
  wallpapers: Record<string, WallpaperConfig>;
  mediaAutoDownload: 'never' | 'wifi' | 'always';
  saveToGallery: boolean;
  
  // Download Manager Queue
  transferQueue: Record<string, FileProgress>;
  
  toggleMuteConversation: (id: string) => void;
  isMuted: (id: string) => boolean;
  
  setWallpaper: (conversationId: string, config: WallpaperConfig) => void;
  getWallpaper: (conversationId: string) => WallpaperConfig;
  
  setMediaAutoDownload: (config: 'never' | 'wifi' | 'always') => void;
  setSaveToGallery: (enabled: boolean) => void;
  
  // Queue operations
  updateTransferProgress: (id: string, progress: number, status: FileProgress['status'], fileName?: string, fileSize?: number) => void;
  removeTransfer: (id: string) => void;
}

export const useChatSettingsStore = create<ChatSettingsState>((set, get) => ({
  mutedConversationIds: [],
  wallpapers: {},
  mediaAutoDownload: 'wifi',
  saveToGallery: true,
  transferQueue: {},
  
  toggleMuteConversation: (id) => set((state) => {
    const exists = state.mutedConversationIds.includes(id);
    const updated = exists
      ? state.mutedConversationIds.filter((cid) => cid !== id)
      : [...state.mutedConversationIds, id];
    return { mutedConversationIds: updated };
  }),
  isMuted: (id) => get().mutedConversationIds.includes(id),
  
  setWallpaper: (conversationId, config) => set((state) => ({
    wallpapers: { ...state.wallpapers, [conversationId]: config }
  })),
  getWallpaper: (conversationId) => get().wallpapers[conversationId] || { type: 'default', value: '' },
  
  setMediaAutoDownload: (mediaAutoDownload) => set({ mediaAutoDownload }),
  setSaveToGallery: (saveToGallery) => set({ saveToGallery }),
  
  updateTransferProgress: (id, progress, status, fileName = 'File', fileSize) => set((state) => {
    const existing = state.transferQueue[id];
    return {
      transferQueue: {
        ...state.transferQueue,
        [id]: {
          id,
          fileName: existing?.fileName || fileName,
          progress,
          status,
          fileSize: fileSize ?? existing?.fileSize,
        }
      }
    };
  }),
  removeTransfer: (id) => set((state) => {
    const updated = { ...state.transferQueue };
    delete updated[id];
    return { transferQueue: updated };
  }),
}));

export default useChatSettingsStore;
