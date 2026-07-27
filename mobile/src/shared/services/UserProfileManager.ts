/**
 * @file UserProfileManager.ts
 * @description Single Source of Truth manager for all user profile data.
 *
 *              Responsibilities:
 *              - Fetch and cache profiles from the backend API
 *              - Listen to 'profile.updated' socket events for real-time sync
 *              - Coordinate invalidation of React Query cache, Zustand store,
 *                and AvatarCacheManager when a profile changes
 *              - Provide a unified getAvatarUri(userId) resolver
 *
 *              Usage:
 *                // In app root (once, after login):
 *                UserProfileManager.initialize(socket, queryClient);
 *
 *                // When navigating to a conversation:
 *                await UserProfileManager.fetchAndCache(userId);
 *
 *                // In any component:
 *                const uri = UserProfileManager.getAvatarUri(userId, rawFallback);
 */

import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

import { useProfileStore, UserProfileEntry } from '../store/profileStore';
import AvatarCacheManager from './AvatarCacheManager';
import useAuthStore from '../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileUpdatedPayload {
  userId: string;
  name?: string;
  avatarUrl?: string | null;
  profilePhoto?: string | null;
  designation?: string;
  department?: string;
}

// ─── Manager ─────────────────────────────────────────────────────────────────

class UserProfileManagerClass {
  private initialized = false;
  private queryClient: QueryClient | null = null;

  /**
   * Initialize the manager — call ONCE after login, in app root or socket setup.
   * Registers the 'profile.updated' socket listener.
   */
  initialize(socket: Socket, queryClient: QueryClient): void {
    if (this.initialized) return;
    this.initialized = true;
    this.queryClient = queryClient;

    // Listen for real-time profile updates broadcast by the backend
    socket.on('profile.updated', this.onProfileUpdated);
    socket.on('user.updated', this.onProfileUpdated);
    console.log('[UserProfileManager] Initialized — listening for profile.updated & user.updated');
  }

  /**
   * Detach listeners and reset state (call on logout)
   */
  teardown(socket: Socket): void {
    socket.off('profile.updated', this.onProfileUpdated);
    socket.off('user.updated', this.onProfileUpdated);
    AvatarCacheManager.clear();
    useProfileStore.getState().clearDirectory();
    this.initialized = false;
    this.queryClient = null;
    console.log('[UserProfileManager] Torn down');
  }

  /**
   * Write a profile entry directly into the store and avatar cache under all ID aliases.
   * Called from API responses so the store stays fresh.
   */
  cacheProfile(entry: Omit<UserProfileEntry, 'lastUpdatedAt'> & { employeeId?: string; id?: string; _id?: string }): void {
    const ids = new Set<string>();
    if (entry.userId) ids.add(String(entry.userId));
    if (entry.employeeId) ids.add(String(entry.employeeId));
    if (entry.id) ids.add(String(entry.id));
    if (entry._id) ids.add(String(entry._id));

    const rawUrl = entry.avatarUrl || entry.profilePhoto;

    ids.forEach((id) => {
      if (id) {
        const existing = useProfileStore.getState().getUserProfile(id);
        // Do not overwrite an existing avatar with undefined/null unless explicitly provided
        const finalAvatar = rawUrl || existing?.avatarUrl || existing?.profilePhoto || null;
        useProfileStore.getState().setUserProfile(id, {
          ...existing,
          ...entry,
          userId: id,
          avatarUrl: finalAvatar,
          profilePhoto: finalAvatar,
        });

        if (finalAvatar) {
          AvatarCacheManager.set(id, finalAvatar);
        } else {
          AvatarCacheManager.invalidate(id);
        }
      }
    });
  }

  /**
   * Batch-cache multiple profiles atomically to prevent rendering freezes
   */
  cacheProfilesBatch(entries: Array<Omit<UserProfileEntry, 'lastUpdatedAt'> & { employeeId?: string; id?: string; _id?: string }>): void {
    const store = useProfileStore.getState();
    const currentUserDirectory = { ...store.userDirectory };
    
    entries.forEach((entry) => {
      const ids = new Set<string>();
      if (entry.userId) ids.add(String(entry.userId));
      if (entry.employeeId) ids.add(String(entry.employeeId));
      if (entry.id) ids.add(String(entry.id));
      if (entry._id) ids.add(String(entry._id));

      const rawUrl = entry.avatarUrl || entry.profilePhoto;
      
      ids.forEach((id) => {
        if (id) {
          const existing = currentUserDirectory[id];
          const finalAvatar = rawUrl || existing?.avatarUrl || existing?.profilePhoto || null;
          currentUserDirectory[id] = {
            ...existing,
            ...entry,
            userId: id,
            avatarUrl: finalAvatar,
            profilePhoto: finalAvatar,
            lastUpdatedAt: Date.now(),
          } as UserProfileEntry;

          if (finalAvatar) {
            AvatarCacheManager.set(id, finalAvatar);
          } else {
            AvatarCacheManager.invalidate(id);
          }
        }
      });
    });

    useProfileStore.setState({ userDirectory: currentUserDirectory });
  }

  /**
   * Invalidate all caches for a given user — call after profile photo upload.
   */
  invalidate(userId: string): void {
    useProfileStore.getState().invalidateUser(userId);
    AvatarCacheManager.invalidate(userId);

    // Invalidate React Query cache so profile screen and hooks refetch
    this.queryClient?.invalidateQueries({ queryKey: ['profile'] });
    this.queryClient?.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    this.queryClient?.invalidateQueries({ queryKey: ['chat'] });

    console.log(`[UserProfileManager] Invalidated cache for userId: ${userId}`);
  }

  /**
   * Resolve and return the latest avatar URI for a given user.
   * Falls back to rawFallback if no store entry exists.
   */
  getAvatarUri(userId: string, rawFallback?: string | null): string | undefined {
    if (!userId) return AvatarCacheManager.resolve('', rawFallback ?? undefined);

    // 1. Try Zustand store entry (authoritative single source of truth)
    const entry = useProfileStore.getState().getUserProfile(userId);
    const storeUrl = entry?.avatarUrl || entry?.profilePhoto;
    if (storeUrl) {
      return AvatarCacheManager.resolve(userId, storeUrl);
    }

    // 2. Try rawFallback
    return AvatarCacheManager.resolve(userId, rawFallback ?? undefined);
  }

  /**
   * Socket event handler for real-time profile updates.
   * Called when any user in the tenant updates their profile.
   */
  private onProfileUpdated = (payload: ProfileUpdatedPayload & { id?: string; employeeId?: string }): void => {
    const targetUserId = String(payload?.userId || payload?.employeeId || payload?.id || '');
    if (!targetUserId) return;

    console.log(`[UserProfileManager] profile.updated received for userId: ${targetUserId}`);

    // Update Zustand store
    const existing = useProfileStore.getState().getUserProfile(targetUserId);
    const newAvatar = payload.avatarUrl ?? payload.profilePhoto ?? existing?.avatarUrl ?? existing?.profilePhoto ?? null;

    useProfileStore.getState().setUserProfile(targetUserId, {
      userId:        targetUserId,
      name:          payload.name          ?? existing?.name          ?? '',
      avatarUrl:     newAvatar,
      profilePhoto:  newAvatar,
      designation:   payload.designation   ?? existing?.designation,
      department:    payload.department    ?? existing?.department,
    });

    // Invalidate avatar cache so next render re-resolves
    AvatarCacheManager.invalidate(targetUserId);
    if (newAvatar) {
      AvatarCacheManager.set(targetUserId, newAvatar);
    }

    // If it's the current user, also update authStore
    const currentUserId = String(useAuthStore.getState().user?.id || (useAuthStore.getState().user as any)?.employeeId || '');
    if (targetUserId === currentUserId) {
      useAuthStore.getState().updateUser({
        name:       payload.name ?? useAuthStore.getState().user?.name,
        avatar:     newAvatar ?? undefined,
        avatarUrl:  newAvatar ?? undefined,
        photoUrl:   newAvatar ?? undefined,
      });
    }

    // Invalidate React Query caches for all affected query keys
    this.queryClient?.invalidateQueries({ queryKey: ['profile'] });
    this.queryClient?.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    this.queryClient?.invalidateQueries({ queryKey: ['chat'] });
  };
}

export const UserProfileManager = new UserProfileManagerClass();
export default UserProfileManager;
