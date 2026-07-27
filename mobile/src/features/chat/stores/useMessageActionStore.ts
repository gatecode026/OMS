/**
 * @file useMessageActionStore.ts
 * @description Centralized Zustand store managing chat message interaction state:
 *              Action sheet visibility, replying to message, editing message,
 *              message info modal, forwarding target selection, and multi-select mode.
 */

import { create } from 'zustand';
import { ChatMessage } from '../types';

interface MessageActionState {
  // Currently targeted message for the enterprise action sheet
  activeSheetMessage: ChatMessage | null;
  
  // Currently active message being replied to (shown in MessageComposer reply banner)
  replyingToMessage: ChatMessage | null;
  
  // Currently active message being edited (shown in MessageComposer edit bar)
  editingMessage: ChatMessage | null;
  
  // Target message for the MessageInfoModal details screen
  infoMessage: ChatMessage | null;
  
  // Array of messages selected for forwarding
  forwardingMessages: ChatMessage[];
  isForwardModalOpen: boolean;
  
  // Multi-selection mode IDs for batch actions
  selectedMessageIds: string[];
  isSelectionModeActive: boolean;

  // Actions
  setActiveSheetMessage: (message: ChatMessage | null) => void;
  setReplyingToMessage: (message: ChatMessage | null) => void;
  setEditingMessage: (message: ChatMessage | null) => void;
  setInfoMessage: (message: ChatMessage | null) => void;
  setForwardingMessages: (messages: ChatMessage[]) => void;
  setIsForwardModalOpen: (open: boolean) => void;
  toggleMessageSelection: (messageId: string) => void;
  clearSelection: () => void;
  resetAll: () => void;
}

export const useMessageActionStore = create<MessageActionState>((set) => ({
  activeSheetMessage: null,
  replyingToMessage: null,
  editingMessage: null,
  infoMessage: null,
  forwardingMessages: [],
  isForwardModalOpen: false,
  selectedMessageIds: [],
  isSelectionModeActive: false,

  setActiveSheetMessage: (message) => set({ activeSheetMessage: message }),
  setReplyingToMessage: (message) => set({ replyingToMessage: message }),
  setEditingMessage: (message) => set({ editingMessage: message }),
  setInfoMessage: (message) => set({ infoMessage: message }),
  setForwardingMessages: (messages) => set({ forwardingMessages: messages, isForwardModalOpen: messages.length > 0 }),
  setIsForwardModalOpen: (open) => set({ isForwardModalOpen: open }),

  toggleMessageSelection: (messageId) =>
    set((state) => {
      const exists = state.selectedMessageIds.includes(messageId);
      const updated = exists
        ? state.selectedMessageIds.filter((id) => id !== messageId)
        : [...state.selectedMessageIds, messageId];
      return {
        selectedMessageIds: updated,
        isSelectionModeActive: updated.length > 0,
      };
    }),

  clearSelection: () => set({ selectedMessageIds: [], isSelectionModeActive: false }),
  resetAll: () =>
    set({
      activeSheetMessage: null,
      replyingToMessage: null,
      editingMessage: null,
      infoMessage: null,
      forwardingMessages: [],
      isForwardModalOpen: false,
      selectedMessageIds: [],
      isSelectionModeActive: false,
    }),
}));

export default useMessageActionStore;
