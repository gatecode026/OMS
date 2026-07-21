/**
 * @file Logo.tsx
 * @description Official Gatecode branding logo system.
 *              Loads theme-specific transparent logo assets (light vs. dark) dynamically.
 *              Supports multiple size variants, animated pulse/spin, and optional text label.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image, ImageStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import useTheme from '../hooks/useTheme';

const GATECODE_LOGO_LIGHT = require('../../../assets/gatecode-logo-light.png');
const GATECODE_LOGO_DARK = require('../../../assets/gatecode-logo-dark.png');

export type LogoVariant = 'primary' | 'monochrome' | 'dark' | 'light' | 'splash' | 'toolbar' | 'small';

interface LogoProps {
  variant?: LogoVariant;
  size?: number;
  animated?: boolean;
  loading?: boolean;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'primary',
  size = 40,
  animated = false,
  loading = false,
  showText = false,
}) => {
  const { colors, typography, isDark } = useTheme();
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Resolve size by variant
  let resolvedSize = size;
  if (variant === 'splash') resolvedSize = 80;
  else if (variant === 'toolbar') resolvedSize = 28;
  else if (variant === 'small') resolvedSize = 20;

  // Resolve correct logo source by theme mode
  const logoSource = isDark ? GATECODE_LOGO_DARK : GATECODE_LOGO_LIGHT;

  // Spinning animation (used when loading=true)
  useEffect(() => {
    if (loading) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = withTiming(0, { duration: 300 });
    }
  }, [loading, rotation]);

  // Gentle pulse animation
  useEffect(() => {
    if (animated && !loading) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 900, easing: Easing.ease }),
          withTiming(0.94, { duration: 900, easing: Easing.ease })
        ),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [animated, loading, pulse]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: pulse.value },
    ],
  }));

  // Opacity & colors by variant
  let opacity = 1;
  if (variant === 'monochrome') opacity = 0.7;
  else if (variant === 'light') opacity = 0.9;

  const textColor =
    variant === 'light' ? '#FFFFFF'
    : variant === 'dark' ? '#0F172A'
    : colors.text;

  const showLabel = showText && variant !== 'small';

  return (
    <View style={styles.container}>
      <Animated.View style={[animStyle, { width: resolvedSize, height: resolvedSize, opacity }]}>
        <Image
          source={logoSource}
          style={
            {
              width: resolvedSize,
              height: resolvedSize,
            } as ImageStyle
          }
          resizeMode="contain"
          accessibilityLabel="Gatecode Technologies logo"
        />
      </Animated.View>

      {showLabel && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.brandText,
              {
                color: textColor,
                fontSize: resolvedSize * 0.4,
                lineHeight: resolvedSize * 0.5,
                fontFamily: typography.fonts.bold,
              },
            ]}
          >
            GATECODE
          </Text>
          {variant === 'splash' && (
            <Text
              style={[
                styles.subText,
                {
                  color: colors.textMuted,
                  fontSize: resolvedSize * 0.15,
                  fontFamily: typography.fonts.medium,
                },
              ]}
            >
              Pvt Technologies
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: 10,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  brandText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subText: {
    marginTop: 2,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

export default Logo;
