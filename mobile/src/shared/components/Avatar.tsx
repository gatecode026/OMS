/**
 * @file Avatar.tsx
 * @description Theme-aware avatar component leveraging expo-image with automatic fallback to text initials.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import useTheme from '../hooks/useTheme';

export interface AvatarProps {
  source?: string;
  name: string;
  size?: number;
  rounded?: boolean;
  style?: StyleProp<any>;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 40,
  rounded = true,
  style,
}) => {
  const { colors, radius, typography } = useTheme();
  const [hasError, setHasError] = useState(false);

  // Generate initials (e.g. "John Doe" -> "JD")
  const getInitials = (text: string) => {
    if (!text) return '';
    const parts = text.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);
  const borderRadius = rounded ? radius.circular : radius.md;

  if (source && !hasError) {
    return (
      <Image
        source={{ uri: source }}
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
      />
    );
  }

  // Fallback to initial text
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

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default Avatar;
