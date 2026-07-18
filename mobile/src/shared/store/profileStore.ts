/**
 * @file profileStore.ts
 * @description Zustand store for tracking employee profile data, active sessions, and trusted devices.
 */

import { create } from 'zustand';

interface ProfileState {
  profile: any | null;
  sessions: any[];
  devices: any[];
  setProfile: (profile: any | null) => void;
  setSessions: (sessions: any[]) => void;
  setDevices: (devices: any[]) => void;
  clearProfileData: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  sessions: [],
  devices: [],

  setProfile: (profile) => set({ profile }),
  setSessions: (sessions) => set({ sessions }),
  setDevices: (devices) => set({ devices }),
  clearProfileData: () => set({ profile: null, sessions: [], devices: [] }),
}));

export default useProfileStore;
