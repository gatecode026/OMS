/**
 * @file drawerStore.ts
 * @description Zustand store for managing the Sidebar Navigation Drawer visibility and active menu state.
 */

import { create } from 'zustand';

export interface DrawerState {
  isOpen: boolean;
  selectedMenu: string;
  openDrawer: () => void;
  closeDrawer: () => void;
  setSelectedMenu: (menu: string) => void;
}

export const useDrawerStore = create<DrawerState>((set) => ({
  isOpen: false,
  selectedMenu: 'Dashboard',

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  setSelectedMenu: (menu) => set({ selectedMenu: menu }),
}));

export default useDrawerStore;
