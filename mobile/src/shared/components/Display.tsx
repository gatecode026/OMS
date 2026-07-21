/**
 * @file Display.tsx
 * @description Design system layout and display components (Card, ActionCard, StatCard, ProfileCard, ListItem, SectionHeader, Timeline, Divider).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
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
import { Avatar } from './Avatar';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { colors, radius, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderColor: colors.border,
          borderWidth: 1,
        },
        shadows.light,
        style,
      ]}
    >
      {children}
    </View>
  );
};

interface ActionCardProps extends CardProps {
  onPress: () => void;
  accessibilityLabel: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  children,
  style,
  onPress,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[animatedStyle, style]}
    >
      <Card style={{ margin: 0 }}>{children}</Card>
    </AnimatedPressable>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  icon?: keyof typeof Ionicons.glyphMap;
  intent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  trend,
  icon,
  intent = 'primary',
  style,
}) => {
  const { colors, spacing, typography } = useTheme();
  
  const getTrendColor = () => {
    if (!trend) return colors.textMuted;
    if (trend.type === 'positive') return colors.success;
    if (trend.type === 'negative') return colors.danger;
    return colors.textMuted;
  };

  const getTrendIcon = () => {
    if (!trend) return undefined;
    if (trend.type === 'positive') return 'arrow-up';
    if (trend.type === 'negative') return 'arrow-down';
    return 'trending-up';
  };

  return (
    <Card style={[styles.statCard, style]}>
      <View style={styles.statHeader}>
        <Text
          style={[
            styles.statTitle,
            { color: colors.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fonts.medium },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {icon && (
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${colors[intent]}15` },
            ]}
          >
            <Ionicons name={icon} size={18} color={colors[intent]} />
          </View>
        )}
      </View>

      <Text
        style={[
          styles.statValue,
          { color: colors.text, fontSize: typography.sizes.display, fontFamily: typography.fonts.bold, marginTop: spacing.xs },
        ]}
      >
        {value}
      </Text>

      {(subValue || trend) && (
        <View style={[styles.statFooter, { marginTop: spacing.xs }]}>
          {trend && (
            <View style={styles.trendRow}>
              <Ionicons
                name={getTrendIcon() as any}
                size={14}
                color={getTrendColor()}
                style={{ marginRight: 2 }}
              />
              <Text
                style={{
                  color: getTrendColor(),
                  fontSize: typography.sizes.caption,
                  fontFamily: typography.fonts.semibold,
                  marginRight: spacing.xs,
                }}
              >
                {trend.value}
              </Text>
            </View>
          )}
          {subValue && (
            <Text
              style={{
                color: colors.textLight,
                fontSize: typography.sizes.caption,
                fontFamily: typography.fonts.regular,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {subValue}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
};

interface ProfileCardProps {
  name: string;
  role: string;
  department?: string;
  avatarUrl?: string;
  avatarPlaceholder?: string;
  style?: StyleProp<ViewStyle>;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  role,
  department,
  avatarUrl,
  avatarPlaceholder: _avatarPlaceholder,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <Card style={[styles.profileCard, style]}>
      <View style={styles.profileRow}>
        <Avatar
          source={avatarUrl}
          name={name}
          size={50}
          style={{ marginRight: spacing.md }}
        />
        <View style={styles.profileInfo}>
          <Text
            style={[
              styles.profileName,
              { color: colors.text, fontSize: typography.sizes.title, fontFamily: typography.fonts.semibold },
            ]}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.profileRole,
              { color: colors.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fonts.regular },
            ]}
          >
            {role}
          </Text>
          {department && (
            <Text
              style={[
                styles.profileDepartment,
                { color: colors.textLight, fontSize: typography.sizes.caption, fontFamily: typography.fonts.regular },
              ]}
            >
              {department}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
};

interface ListItemProps {
  title: string;
  description?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftAvatar?: { source?: string; name: string };
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  description,
  leftIcon,
  leftAvatar,
  rightElement,
  showChevron = true,
  onPress,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();

  const renderContent = () => (
    <View style={[styles.listItemContent, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}>
      {leftIcon && (
        <Ionicons
          name={leftIcon}
          size={22}
          color={colors.textMuted}
          style={{ marginRight: spacing.md }}
        />
      )}
      {leftAvatar && (
        <Avatar
          source={leftAvatar.source}
          name={leftAvatar.name}
          size={36}
          style={{ marginRight: spacing.md }}
        />
      )}

      <View style={styles.textColumn}>
        <Text
          style={{
            fontSize: typography.sizes.body,
            fontFamily: typography.fonts.medium,
            color: colors.text,
          }}
        >
          {title}
        </Text>
        {description && (
          <Text
            style={{
              fontSize: typography.sizes.caption,
              fontFamily: typography.fonts.regular,
              color: colors.textMuted,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        )}
      </View>

      {rightElement}

      {showChevron && onPress && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textLight}
          style={{ marginLeft: spacing.xs }}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.listItem,
          { borderBottomColor: colors.border },
          pressed && { backgroundColor: colors.neutralLight },
          style,
        ]}
      >
        {renderContent()}
      </Pressable>
    );
  }

  return (
    <View style={[styles.listItem, { borderBottomColor: colors.border }, style]}>
      {renderContent()}
    </View>
  );
};

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onAction,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.sectionHeader, { marginBottom: spacing.md }, style]}>
      <Text
        style={{
          fontSize: typography.sizes.h3,
          fontFamily: typography.fonts.semibold,
          color: colors.text,
        }}
      >
        {title}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction}>
          <Text
            style={{
              fontSize: typography.sizes.subtitle,
              fontFamily: typography.fonts.semibold,
              color: colors.primary,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

interface TimelineItem {
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

interface TimelineProps {
  items: TimelineItem[];
  style?: StyleProp<ViewStyle>;
}

export const Timeline: React.FC<TimelineProps> = ({ items, style }) => {
  const { colors, spacing, radius, typography } = useTheme();

  const getStatusColor = (status: TimelineItem['status']) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      case 'info':
        return colors.info;
      case 'neutral':
      default:
        return colors.neutral;
    }
  };

  return (
    <View style={[styles.timelineContainer, style]}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const color = getStatusColor(item.status);

        return (
          <View key={index} style={styles.timelineRow}>
            <View style={styles.timelineGraphic}>
              <View
                style={[
                  styles.timelineNode,
                  {
                    backgroundColor: colors.surface,
                    borderColor: color,
                    borderWidth: 3,
                    borderRadius: radius.circular,
                  },
                ]}
              />
              {!isLast && (
                <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              )}
            </View>

            <View style={[styles.timelineBody, { paddingBottom: isLast ? 0 : spacing.lg }]}>
              <View style={styles.timelineHeader}>
                <Text
                  style={{
                    fontSize: typography.sizes.body,
                    fontFamily: typography.fonts.semibold,
                    color: colors.text,
                    flex: 1,
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    fontSize: typography.sizes.caption,
                    fontFamily: typography.fonts.regular,
                    color: colors.textLight,
                  }}
                >
                  {item.time}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: typography.sizes.subtitle,
                  fontFamily: typography.fonts.regular,
                  color: colors.textMuted,
                  marginTop: 2,
                }}
              >
                {item.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

interface DividerProps {
  style?: StyleProp<ViewStyle>;
}

export const Divider: React.FC<DividerProps> = ({ style }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
  },
  statCard: {
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTitle: {
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {},
  statFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCard: {
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {},
  profileRole: {},
  profileDepartment: {
    marginTop: 2,
  },
  listItem: {
    borderBottomWidth: 1,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineContainer: {
    width: '100%',
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineGraphic: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineNode: {
    width: 14,
    height: 14,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineBody: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
