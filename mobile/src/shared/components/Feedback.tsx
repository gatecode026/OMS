/**
 * @file Feedback.tsx
 * @description Theme-aware, animated user feedback and loading state components (LoadingState, EmptyState, ErrorState, Skeleton, ProgressIndicator).
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import useTheme from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface LoadingStateProps {
  message?: string;
  fullscreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  fullscreen = false,
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.loadingContainer,
        fullscreen && styles.fullscreen,
        { backgroundColor: fullscreen ? colors.background : 'transparent' },
      ]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text
          style={[
            styles.loadingText,
            {
              color: colors.textMuted,
              marginTop: spacing.md,
              fontSize: typography.sizes.body,
              fontFamily: typography.fonts.medium,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

interface EmptyStateProps {
  title?: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  description,
  icon = 'folder-open-outline',
  actionLabel,
  onAction,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.centerContainer, style]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.neutralLight, marginBottom: spacing.md },
        ]}
      >
        <Ionicons name={icon} size={36} color={colors.textLight} />
      </View>
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: typography.sizes.h3,
            fontFamily: typography.fonts.semibold,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.textMuted,
            fontSize: typography.sizes.body,
            fontFamily: typography.fonts.regular,
            marginBottom: actionLabel && onAction ? spacing.xl : 0,
          },
        ]}
      >
        {description}
      </Text>

      {actionLabel && onAction && (
        <Button
          onPress={onAction}
          title={actionLabel}
          variant="outlined"
          intent="primary"
          size="sm"
        />
      )}
    </View>
  );
};

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something Went Wrong',
  message,
  onRetry,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.centerContainer, style]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${colors.danger}15`, marginBottom: spacing.md },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
      </View>
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: typography.sizes.h3,
            fontFamily: typography.fonts.semibold,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.textMuted,
            fontSize: typography.sizes.body,
            fontFamily: typography.fonts.regular,
            marginBottom: onRetry ? spacing.xl : 0,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <Button
          onPress={onRetry}
          title="Retry Connection"
          leftIcon="refresh"
          intent="danger"
          size="sm"
        />
      )}
    </View>
  );
};

interface SkeletonProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height,
  borderRadius,
  style,
}) => {
  const { colors, radius } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: borderRadius ?? radius.sm,
          backgroundColor: colors.neutralLight,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

interface ProgressIndicatorProps {
  progress: number; // Decimal value between 0 and 1
  height?: number;
  color?: string;
  style?: ViewStyle;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  height = 6,
  color,
  style,
}) => {
  const { colors, radius } = useTheme();
  const activeColor = color || colors.primary;
  
  // Constrain progress between 0 and 1
  const constrainedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={[
        styles.progressTrack,
        {
          height,
          borderRadius: radius.circular,
          backgroundColor: colors.neutralLight,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.progressFill,
          {
            width: `${constrainedProgress * 100}%`,
            height: '100%',
            borderRadius: radius.circular,
            backgroundColor: activeColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
  },
  loadingText: {
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    textAlign: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  progressTrack: {
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {},
});
