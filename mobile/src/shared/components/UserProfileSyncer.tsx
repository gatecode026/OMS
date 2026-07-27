/**
 * @file UserProfileSyncer.tsx
 * @description Invisible component that initializes UserProfileManager with the
 *              active socket and queryClient after the user logs in.
 *              Registers the 'profile.updated' socket listener for real-time sync.
 *              Tears down on logout to prevent stale listener leaks.
 *
 *              Mount this once inside RootProvider (after QueryClientProvider).
 */

import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import { getSocket } from '../services/socketManager';
import UserProfileManager from '../services/UserProfileManager';
import profileApi from '../../features/profile/api/profileApi';

export const UserProfileSyncer: React.FC = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const user = useAuthStore((s) => s.user);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      // Logged out — seed current user into store if socket available
      if (initializedRef.current) {
        const socket = getSocket();
        if (socket) {
          UserProfileManager.teardown(socket);
        }
        initializedRef.current = false;
      }
      return;
    }

    // Logged in — initialize UserProfileManager with socket + queryClient
    const socket = getSocket();
    if (socket && !initializedRef.current) {
      UserProfileManager.initialize(socket, queryClient);
      initializedRef.current = true;
    }

    // Seed the current logged-in user into the profile store immediately
    // so their own avatar is always available without an extra API call
    if (user) {
      UserProfileManager.cacheProfile({
        userId:       user.id,
        name:         user.name || '',
        avatarUrl:    user.avatarUrl || user.avatar || user.photoUrl || null,
        profilePhoto: user.photoUrl || null,
        designation:  user.designation,
        department:   user.department,
        employeeCode: user.employeeCode,
      });
    }

    // Fetch fresh profile from backend to sync avatar and user data
    profileApi.fetchProfile().catch((err) => {
      console.warn('[UserProfileSyncer] Background profile fetch error:', err);
    });
  }, [isAuthenticated, userId, user, queryClient]);

  return null;
};

export default UserProfileSyncer;
