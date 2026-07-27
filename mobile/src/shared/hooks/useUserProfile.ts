/**
 * @file useUserProfile.ts
 * @description React hook that subscribes to the UserProfileStore for a given userId.
 *              This is the ONLY hook components should use to display user avatar and name.
 *
 *              Usage:
 *                const { name, avatarUri, designation } = useUserProfile(userId, fallbackRawUrl);
 */

import { useMemo } from 'react';
import { useProfileStore } from '../store/profileStore';
import AvatarCacheManager from '../services/AvatarCacheManager';

export interface UserProfileInfo {
  name: string;
  avatarUri: string | undefined;
  designation: string | undefined;
  department: string | undefined;
  employeeCode: string | undefined;
}

/**
 * @param userId          - The target user's ID
 * @param fallbackName    - Display name to use when profile not yet loaded
 * @param fallbackRawUrl  - Raw avatar URL from message payload or conversation member (used as fallback only)
 */
export function useUserProfile(
  userId: string | null | undefined,
  fallbackName = '',
  fallbackRawUrl?: string | null
): UserProfileInfo {
  // Subscribe to the directory slice — re-renders only when this userId's entry changes
  const entry = useProfileStore(
    (s) => (userId ? s.userDirectory[userId] : undefined)
  );

  return useMemo(() => {
    if (!userId) {
      return {
        name:         fallbackName,
        avatarUri:    AvatarCacheManager.resolve('__fallback__', fallbackRawUrl ?? undefined),
        designation:  undefined,
        department:   undefined,
        employeeCode: undefined,
      };
    }

    const name = entry?.name || fallbackName;

    // Resolve avatar: store entry takes priority over raw fallback prop
    const rawUrl = entry?.avatarUrl || entry?.profilePhoto || fallbackRawUrl;
    const avatarUri = AvatarCacheManager.resolve(userId, rawUrl ?? undefined);

    return {
      name,
      avatarUri,
      designation:  entry?.designation,
      department:   entry?.department,
      employeeCode: entry?.employeeCode,
    };
  }, [userId, entry, fallbackName, fallbackRawUrl]);
}

export default useUserProfile;
