import { create } from 'zustand';

interface DraftState {
  drafts: Record<string, string>; // conversationId -> draft text
  setDraft: (conversationId: string, text: string) => void;
  getDraft: (conversationId: string) => string;
  clearDraft: (conversationId: string) => void;
}

export const useDraftStore = create<DraftState>((set, get) => ({
  drafts: {},
  setDraft: (conversationId, text) => set((state) => {
    if (!text.trim()) {
      const nextDrafts = { ...state.drafts };
      delete nextDrafts[conversationId];
      return { drafts: nextDrafts };
    }
    return {
      drafts: {
        ...state.drafts,
        [conversationId]: text,
      },
    };
  }),
  getDraft: (conversationId) => get().drafts[conversationId] || '',
  clearDraft: (conversationId) => set((state) => {
    const nextDrafts = { ...state.drafts };
    delete nextDrafts[conversationId];
    return { drafts: nextDrafts };
  }),
}));

export default useDraftStore;
