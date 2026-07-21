/**
 * @file quickActionsStore.ts
 * @description Zustand store for managing the global Quick Actions Bottom Sheet visibility.
 */

import { create } from 'zustand';

export interface QuickActionsState {
  isOpen: boolean;
  openActions: () => void;
  closeActions: () => void;
}

export const useQuickActionsStore = create<QuickActionsState>((set) => ({
  isOpen: false,
  openActions: () => set({ isOpen: true }),
  closeActions: () => set({ isOpen: false }),
}));

export default useQuickActionsStore;
