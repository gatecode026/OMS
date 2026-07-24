/**
 * @file Button.tsx
 * @description Theme-aware, highly-accessible, animated button components (Button, IconButton, FloatingButton).
 */

import React from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Pressable,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import useTheme from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'solid' | 'outlined' | 'text';
  size?: 'sm' | 'md' | 'lg';
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'solid',
  size = 'md',
  intent = 'primary',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  fullWidth = false,
  accessibilityLabel,
}) => {
  const { colors, spacing, radius, typography } = useTheme();
  
  // Animation scale shared value
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  // Color mapping based on intent
  const intentColor = colors[intent];

  // Background and border styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderColor: intentColor,
          borderWidth: 1,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'solid':
      default:
        return {
          backgroundColor: intentColor,
          borderColor: 'transparent',
          borderWidth: 0,
        };
    }
  };

  // Text color based on variant
  const getTextColor = () => {
    if (disabled) return colors.textLight;
    if (variant === 'solid') {
      return '#FFFFFF';
    }
    return intentColor;
  };

  // Size mapping
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.sm,
        };
      case 'lg':
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xxl,
          borderRadius: radius.lg,
        };
      case 'md':
      default:
        return {
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
        };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return typography.sizes.caption;
      case 'lg':
        return typography.sizes.title;
      case 'md':
      default:
        return typography.sizes.subtitle;
    }
  };

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled, busy: loading }}
      style={[
        styles.baseButton,
        getVariantStyles(),
        getSizeStyles(),
        fullWidth && styles.fullWidth,
        disabled && { backgroundColor: variant === 'solid' ? colors.neutralLight : 'transparent', borderColor: variant === 'outlined' ? colors.border : 'transparent' },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={size === 'sm' ? 14 : 18}
              color={getTextColor()}
              style={{ marginRight: spacing.xs }}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                fontFamily: typography.fonts.semibold,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={size === 'sm' ? 14 : 18}
              color={getTextColor()}
              style={{ marginLeft: spacing.xs }}
            />
          )}
        </>
      )}
    </AnimatedPressable>
  );
};

export interface IconButtonProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  onPress,
  icon,
  size = 24,
  color,
  backgroundColor = 'transparent',
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const { colors, radius } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.9, { damping: 10, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const activeColor = color || colors.text;

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.iconButton,
        {
          backgroundColor,
          borderRadius: radius.circular,
          padding: size * 0.3,
        },
        disabled && { opacity: 0.5 },
        animatedStyle,
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={activeColor} />
    </AnimatedPressable>
  );
};

export interface FloatingButtonProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onPress,
  icon,
  intent = 'primary',
  style,
  accessibilityLabel,
}) => {
  const { colors, shadows, radius } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const intentColor = colors[intent];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.fab,
        {
          backgroundColor: intentColor,
          borderRadius: radius.circular,
        },
        shadows.fab,
        animatedStyle,
        style,
      ]}
    >
      <Ionicons name={icon} size={24} color="#FFFFFF" />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  buttonText: {
    textAlign: 'center',
  },
  iconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
