/**
 * @file useRealtimeStore.ts
 * @description Centralized Zustand store for managing real-time WebSocket state:
 *              Socket connection status, online users map, active typing indicators,
 *              and global unread message badge counters.
 */

import { create } from 'zustand';

export interface UserPresenceData {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface TypingIndicatorData {
  conversationId: string;
  userId: string;
  userName: string;
  isRecording: boolean;
}

interface RealtimeStoreState {
  isConnected: boolean;
  onlineUsers: Map<string, UserPresenceData>;
  activeTyping: Map<string, TypingIndicatorData>;
  globalUnreadCount: number;

  // Actions
  setIsConnected: (connected: boolean) => void;
  setUserPresence: (presence: UserPresenceData) => void;
  setTypingIndicator: (typing: TypingIndicatorData) => void;
  removeTypingIndicator: (conversationId: string, userId: string) => void;
  setGlobalUnreadCount: (count: number) => void;
  incrementUnreadCount: (amount?: number) => void;
  decrementUnreadCount: (amount?: number) => void;
  resetRealtimeStore: () => void;
}

export const useRealtimeStore = create<RealtimeStoreState>((set) => ({
  isConnected: false,
  onlineUsers: new Map(),
  activeTyping: new Map(),
  globalUnreadCount: 0,

  setIsConnected: (isConnected) => set({ isConnected }),

  setUserPresence: (presence) =>
    set((state) => {
      const updated = new Map(state.onlineUsers);
      updated.set(presence.userId, presence);
      return { onlineUsers: updated };
    }),

  setTypingIndicator: (typing) =>
    set((state) => {
      const updated = new Map(state.activeTyping);
      const key = `${typing.conversationId}_${typing.userId}`;
      updated.set(key, typing);
      return { activeTyping: updated };
    }),

  removeTypingIndicator: (conversationId, userId) =>
    set((state) => {
      const updated = new Map(state.activeTyping);
      const key = `${conversationId}_${userId}`;
      updated.delete(key);
      return { activeTyping: updated };
    }),

  setGlobalUnreadCount: (globalUnreadCount) => set({ globalUnreadCount }),

  incrementUnreadCount: (amount = 1) =>
    set((state) => ({ globalUnreadCount: Math.max(0, state.globalUnreadCount + amount) })),

  decrementUnreadCount: (amount = 1) =>
    set((state) => ({ globalUnreadCount: Math.max(0, state.globalUnreadCount - amount) })),

  resetRealtimeStore: () =>
    set({
      isConnected: false,
      onlineUsers: new Map(),
      activeTyping: new Map(),
      globalUnreadCount: 0,
    }),
}));

export default useRealtimeStore;
