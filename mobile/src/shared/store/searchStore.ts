/**
 * @file searchStore.ts
 * @description Zustand store for global and in-conversation search state management.
 */

import { create } from 'zustand';
import secureStore from '../services/secureStore';

interface SearchState {
  history: string[];
  searchQuery: string;
  activeFilter: 'all' | 'messages' | 'media' | 'documents' | 'links';
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: 'all' | 'messages' | 'media' | 'documents' | 'links') => void;
  loadHistory: () => Promise<void>;
  addHistory: (query: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  history: [],
  searchQuery: '',
  activeFilter: 'all',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),

  loadHistory: async () => {
    try {
      const list = await secureStore.getJson<string[]>('recent_chat_searches');
      set({ history: list || [] });
    } catch (e) {
      console.error('[SearchStore] Error loading search history:', e);
    }
  },

  addHistory: async (query) => {
    if (!query.trim()) return;
    try {
      const cleanQuery = query.trim();
      const updated = [cleanQuery, ...get().history.filter((q) => q !== cleanQuery)].slice(0, 10);
      set({ history: updated });
      await secureStore.setJson('recent_chat_searches', updated);
    } catch (e) {
      console.error('[SearchStore] Error adding to search history:', e);
    }
  },

  clearHistory: async () => {
    try {
      set({ history: [] });
      await secureStore.deleteItem('recent_chat_searches');
    } catch (e) {
      console.error('[SearchStore] Error clearing search history:', e);
    }
  },
}));

export default useSearchStore;
