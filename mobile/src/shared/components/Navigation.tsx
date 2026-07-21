/**
 * @file Navigation.tsx
 * @description Design system navigation headers and tab segments (Header, Tabs).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import useTheme from '../hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightElement,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: insets.top || spacing.md,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.lg,
        },
        style,
      ]}
    >
      <View style={styles.headerLeft}>
        {showBack && onBack && (
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        )}
        <Text
          style={[
            styles.titleText,
            {
              color: colors.text,
              fontSize: typography.sizes.h2,
              fontFamily: typography.fonts.bold,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {rightElement && <View style={styles.headerRight}>{rightElement}</View>}
    </View>
  );
};

interface TabOption {
  label: string;
  value: string;
}

interface TabsProps {
  options: TabOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}

export const Tabs: React.FC<TabsProps> = ({
  options,
  selectedValue,
  onChange,
  style,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View
      style={[
        styles.tabsContainer,
        {
          backgroundColor: colors.neutralLight,
          borderRadius: radius.md,
          padding: spacing.xs,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessible
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.tabItem,
              {
                borderRadius: radius.sm + 2,
                backgroundColor: isSelected ? colors.surface : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                fontSize: typography.sizes.subtitle,
                fontFamily: isSelected ? typography.fonts.semibold : typography.fonts.medium,
                color: isSelected ? colors.primary : colors.textMuted,
                textAlign: 'center',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
  },
  titleText: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
