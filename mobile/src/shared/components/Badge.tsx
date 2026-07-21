/**
 * @file Badge.tsx
 * @description Design system indicator and label components (Badge, Chip, Tag, StatusBadge).
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import useTheme from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

interface BadgeProps {
  content?: string | number;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ content, style }) => {
  const { colors, radius, typography } = useTheme();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.danger,
          borderRadius: radius.circular,
          minWidth: 18,
          height: 18,
          paddingHorizontal: 4,
        },
        style,
      ]}
    >
      {content !== undefined && (
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: typography.sizes.label,
            fontFamily: typography.fonts.bold,
            lineHeight: 14,
          }}
        >
          {content}
        </Text>
      )}
    </View>
  );
};

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  style,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        {
          borderRadius: radius.circular,
          backgroundColor: selected ? colors.primary : colors.neutralLight,
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? '#FFFFFF' : colors.text}
          style={{ marginRight: spacing.xs }}
        />
      )}
      <Text
        style={{
          fontSize: typography.sizes.caption,
          fontFamily: selected ? typography.fonts.semibold : typography.fonts.regular,
          color: selected ? '#FFFFFF' : colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

interface TagProps {
  label: string;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  variant?: 'solid' | 'subtle';
  style?: ViewStyle;
}

export const Tag: React.FC<TagProps> = ({
  label,
  intent = 'neutral',
  variant = 'subtle',
  style,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  const intentColor = colors[intent];

  const bg = variant === 'solid' ? intentColor : `${intentColor}15`;
  const text = variant === 'solid' ? '#FFFFFF' : intentColor;

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: bg,
          borderRadius: radius.sm,
          paddingVertical: 2,
          paddingHorizontal: spacing.sm,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: typography.sizes.label,
          fontFamily: typography.fonts.semibold,
          color: text,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

interface StatusBadgeProps {
  status: 'Active' | 'Suspended' | 'Pending' | 'On Leave' | 'Completed' | 'In Progress' | 'Cancelled';
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const getTagProps = (): { label: string; intent: TagProps['intent'] } => {
    switch (status) {
      case 'Active':
      case 'Completed':
        return { label: status, intent: 'success' };
      case 'Suspended':
      case 'Cancelled':
        return { label: status, intent: 'danger' };
      case 'On Leave':
      case 'In Progress':
        return { label: status, intent: 'warning' };
      case 'Pending':
      default:
        return { label: status, intent: 'info' };
    }
  };

  const { label, intent } = getTagProps();

  return <Tag label={label} intent={intent} style={style} />;
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -2,
    right: -2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  tag: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
