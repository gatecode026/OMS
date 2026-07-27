/**
 * @file profileStore.ts
 * @description Zustand store — Single Source of Truth for user profile data.
 *              Maintains a directory of all resolved user profiles keyed by userId.
 *              Updated by UserProfileManager on fetch and socket events.
 */

import { create } from 'zustand';

export interface UserProfileEntry {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  profilePhoto?: string | null;
  email?: string;
  designation?: string;
  department?: string;
  employeeCode?: string;
  lastUpdatedAt: number; // epoch ms
}

interface ProfileState {
  /** The current logged-in user's full profile (from profileApi) */
  profile: any | null;
  setProfile: (profile: any | null) => void;

  /** Sessions and devices (existing usage preserved) */
  sessions: any[];
  devices: any[];
  setSessions: (sessions: any[]) => void;
  setDevices: (devices: any[]) => void;
  clearProfileData: () => void;

  /** User directory — keyed by userId, holds latest resolved profile entries */
  userDirectory: Record<string, UserProfileEntry>;
  setUserProfile: (userId: string, entry: Omit<UserProfileEntry, 'lastUpdatedAt'>) => void;
  getUserProfile: (userId: string) => UserProfileEntry | undefined;
  invalidateUser: (userId: string) => void;
  clearDirectory: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  sessions: [],
  devices: [],
  userDirectory: {},

  setProfile: (profile) => set({ profile }),
  setSessions: (sessions) => set({ sessions }),
  setDevices: (devices) => set({ devices }),

  clearProfileData: () =>
    set({ profile: null, sessions: [], devices: [], userDirectory: {} }),

  setUserProfile: (userId, entry) =>
    set((state) => ({
      userDirectory: {
        ...state.userDirectory,
        [userId]: { ...entry, userId, lastUpdatedAt: Date.now() },
      },
    })),

  getUserProfile: (userId) => get().userDirectory[userId],

  invalidateUser: (userId) =>
    set((state) => {
      const next = { ...state.userDirectory };
      delete next[userId];
      return { userDirectory: next };
    }),

  clearDirectory: () => set({ userDirectory: {} }),
}));

export default useProfileStore;
