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

export interface NotificationConfig {
  muteDuration?: '8 hours' | '1 week' | 'always' | null;
  sound?: string;
  vibration?: 'default' | 'short' | 'long' | 'none';
  showPreview?: boolean;
  priority?: boolean;
}

const DEFAULT_WALLPAPER: WallpaperConfig = { type: 'default', value: '' };

const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  muteDuration: null,
  sound: 'Default',
  vibration: 'default',
  showPreview: true,
  priority: true,
};

interface ChatSettingsState {
  mutedConversationIds: string[];
  wallpapers: Record<string, WallpaperConfig>;
  mediaAutoDownload: 'never' | 'wifi' | 'always';
  saveToGallery: boolean;
  
  // PRD 04 extensions
  disappearingDurations: Record<string, string>; // conversationId -> duration ('off', '24h', '7d', '30d', '90d')
  notificationConfigs: Record<string, NotificationConfig>; // conversationId -> config
  
  // Download Manager Queue
  transferQueue: Record<string, FileProgress>;
  
  toggleMuteConversation: (id: string) => void;
  isMuted: (id: string) => boolean;
  
  setWallpaper: (conversationId: string, config: WallpaperConfig) => void;
  getWallpaper: (conversationId: string) => WallpaperConfig;
  
  setMediaAutoDownload: (config: 'never' | 'wifi' | 'always') => void;
  setSaveToGallery: (enabled: boolean) => void;
  
  // PRD 04 setters
  setDisappearingDuration: (conversationId: string, duration: string) => void;
  getDisappearingDuration: (conversationId: string) => string;
  
  setNotificationConfig: (conversationId: string, config: Partial<NotificationConfig>) => void;
  getNotificationConfig: (conversationId: string) => NotificationConfig;
  
  // Queue operations
  updateTransferProgress: (id: string, progress: number, status: FileProgress['status'], fileName?: string, fileSize?: number) => void;
  removeTransfer: (id: string) => void;
}

export const useChatSettingsStore = create<ChatSettingsState>((set, get) => ({
  mutedConversationIds: [],
  wallpapers: {},
  mediaAutoDownload: 'wifi',
  saveToGallery: true,
  disappearingDurations: {},
  notificationConfigs: {},
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
  getWallpaper: (conversationId) => get().wallpapers[conversationId] || DEFAULT_WALLPAPER,
  
  setMediaAutoDownload: (mediaAutoDownload) => set({ mediaAutoDownload }),
  setSaveToGallery: (saveToGallery) => set({ saveToGallery }),
  
  setDisappearingDuration: (conversationId, duration) => set((state) => ({
    disappearingDurations: { ...state.disappearingDurations, [conversationId]: duration }
  })),
  getDisappearingDuration: (conversationId) => get().disappearingDurations[conversationId] || 'off',
  
  setNotificationConfig: (conversationId, config) => set((state) => ({
    notificationConfigs: {
      ...state.notificationConfigs,
      [conversationId]: {
        ...(state.notificationConfigs[conversationId] || {
          muteDuration: null,
          sound: 'Default',
          vibration: 'default',
          showPreview: true,
          priority: true,
        }),
        ...config,
      },
    }
  })),
  getNotificationConfig: (conversationId) => get().notificationConfigs[conversationId] || DEFAULT_NOTIFICATION_CONFIG,
  
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

