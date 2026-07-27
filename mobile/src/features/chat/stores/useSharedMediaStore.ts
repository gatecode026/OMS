/**
 * @file useSharedMediaStore.ts
 * @description Zustand store for managing shared content state:
 *              Active tab, search query, media filters, and modal visibility.
 */

import { create } from 'zustand';

export type SharedMediaTab = 'media' | 'documents' | 'links' | 'favorites';

interface SharedMediaState {
  isModalOpen: boolean;
  activeTab: SharedMediaTab;
  searchQuery: string;
  filterMediaType: string | null;

  // Actions
  setIsModalOpen: (open: boolean) => void;
  setActiveTab: (tab: SharedMediaTab) => void;
  setSearchQuery: (query: string) => void;
  setFilterMediaType: (type: string | null) => void;
  reset: () => void;
}

export const useSharedMediaStore = create<SharedMediaState>((set) => ({
  isModalOpen: false,
  activeTab: 'media',
  searchQuery: '',
  filterMediaType: null,

  setIsModalOpen: (open) => set({ isModalOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterMediaType: (type) => set({ filterMediaType: type }),
  reset: () => set({ isModalOpen: false, activeTab: 'media', searchQuery: '', filterMediaType: null }),
}));

export default useSharedMediaStore;
