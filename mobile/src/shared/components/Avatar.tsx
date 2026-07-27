/**
 * @file Avatar.tsx
 * @description Theme-aware avatar component with UserProfileManager integration.
 *              When `userId` is provided, resolves the avatar from the centralized
 *              UserProfileStore (single source of truth) — never from stale payload.
 *              Falls back to the raw `source` prop for backwards compatibility,
 *              and shows text initials only when no avatar exists in the database.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import useTheme from '../hooks/useTheme';
import { useUserProfile } from '../hooks/useUserProfile';
import AvatarCacheManager from '../services/AvatarCacheManager';

export interface AvatarProps {
  /** Optional: when provided, avatar is resolved from UserProfileStore (preferred) */
  userId?: string | null;
  /** Raw URL fallback — used when userId has no store entry yet */
  source?: string | null;
  /** Display name — used to generate initials if no avatar is available */
  name: string;
  size?: number;
  rounded?: boolean;
  style?: StyleProp<any>;
}

const AvatarInner: React.FC<AvatarProps & { resolvedUri: string | undefined }> = ({
  resolvedUri,
  name,
  size = 40,
  rounded = true,
  style,
}) => {
  const { colors, radius, typography } = useTheme();
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever resolvedUri changes (e.g. from empty to valid URL)
  React.useEffect(() => {
    setHasError(false);
  }, [resolvedUri]);

  const getInitials = (text: string): string => {
    if (!text) return '';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);
  const borderRadius = rounded ? radius.circular : radius.md;

  if (resolvedUri && !hasError) {
    return (
      <Image
        source={{ uri: resolvedUri }}
        onError={() => setHasError(true)}
        style={[
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: colors.neutralLight,
          },
          style as any,
        ]}
        transition={200}
        cachePolicy="memory-disk"
      />
    );
  }

  // Initials fallback — shown ONLY when no avatar exists in the database
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: colors.primary,
        },
        style as any,
      ]}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: size * 0.4,
          fontFamily: typography.fonts.semibold,
        }}
      >
        {initials}
      </Text>
    </View>
  );
};

/**
 * Smart Avatar — resolves from UserProfileStore when userId is provided.
 * Falls back to raw `source` prop for backwards-compatible usage.
 * Raw source paths are always normalized through AvatarCacheManager (relative → full URI).
 */
export const Avatar: React.FC<AvatarProps> = (props) => {
  const { userId, source, name, ...rest } = props;

  // Always resolve from centralized store when userId is provided
  const profile = useUserProfile(userId, name, source);
  const storeUri = userId ? profile.avatarUri : undefined;

  // Normalize the raw source prop as fallback (handles relative backend paths)
  const rawFallbackUri = source
    ? AvatarCacheManager.resolve(userId ?? '__raw__', source)
    : undefined;

  const finalUri = storeUri ?? rawFallbackUri;

  return <AvatarInner resolvedUri={finalUri} name={profile.name || name} {...rest} />;
};

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Avatar;
