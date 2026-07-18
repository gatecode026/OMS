/**
 * @file presenceStore.ts
 * @description Zustand store for tracking online user presence and typing indicators globally.
 */

import { create } from 'zustand';

interface PresenceState {
  onlineUserIds: Set<string>;
  typingUsers: Record<string, Record<string, { name: string; isRecording: boolean }>>;
  chatscreenUsers: Record<string, boolean>;
  activeConversationId: string | null;
  statuses: Record<string, { status: string; emoji: string | null; lastSeen?: string | Date | null }>;
  setOnlineUsers: (ids: Set<string>) => void;
  addUserOnline: (userId: string) => void;
  addUserOffline: (userId: string) => void;
  setTyping: (conversationId: string, userId: string, name: string, isRecording: boolean) => void;
  stopTyping: (conversationId: string, userId: string) => void;
  setChatscreenStatus: (employeeId: string, isOnChatScreen: boolean) => void;
  setActiveConversationId: (id: string | null) => void;
  setUserStatus: (employeeId: string, status: string, emoji: string | null, lastSeen?: string | Date | null) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUserIds: new Set<string>(),
  typingUsers: {},
  chatscreenUsers: {},
  activeConversationId: null,
  statuses: {},

  setOnlineUsers: (ids) => set({ onlineUserIds: ids }),

  addUserOnline: (userId) => set((state) => {
    const next = new Set(state.onlineUserIds);
    next.add(userId);
    return { onlineUserIds: next };
  }),

  addUserOffline: (userId) => set((state) => {
    const next = new Set(state.onlineUserIds);
    next.delete(userId);
    return { onlineUserIds: next };
  }),

  setTyping: (conversationId, userId, name, isRecording) => set((state) => {
    const roomTyping = state.typingUsers[conversationId] || {};
    return {
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: {
          ...roomTyping,
          [userId]: { name, isRecording },
        },
      },
    };
  }),

  stopTyping: (conversationId, userId) => set((state) => {
    const roomTyping = { ...(state.typingUsers[conversationId] || {}) };
    delete roomTyping[userId];
    const typingUsers = { ...state.typingUsers };
    if (Object.keys(roomTyping).length === 0) {
      delete typingUsers[conversationId];
    } else {
      typingUsers[conversationId] = roomTyping;
    }
    return { typingUsers };
  }),

  setChatscreenStatus: (employeeId, isOnChatScreen) => set((state) => ({
    chatscreenUsers: {
      ...state.chatscreenUsers,
      [employeeId]: isOnChatScreen,
    },
  })),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setUserStatus: (employeeId, status, emoji, lastSeen) => set((state) => ({
    statuses: {
      ...state.statuses,
      [employeeId]: {
        status,
        emoji,
        lastSeen: lastSeen !== undefined ? lastSeen : state.statuses[employeeId]?.lastSeen,
      },
    },
  })),
}));

export default usePresenceStore;
