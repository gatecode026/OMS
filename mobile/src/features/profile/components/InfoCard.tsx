/**
 * @file InfoCard.tsx
 * @description Grouped info section card for profile inner pages.
 *              Wraps an optional section title + InfoRow children in the OMS card style.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../shared/hooks/useTheme';

interface InfoCardProps {
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Split children into 2 columns */
  twoColumn?: boolean;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  icon,
  iconColor,
  children,
  style,
  twoColumn = false,
}) => {
  const { colors, spacing, radius, shadows, typography } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderColor: colors.border,
          borderWidth: 1,
          marginBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        shadows.light,
        style,
      ]}
    >
      {title && (
        <View style={[styles.titleRow, { marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          {icon && (
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: `${iconColor || colors.primary}18` },
              ]}
            >
              <Ionicons
                name={icon}
                size={16}
                color={iconColor || colors.primary}
              />
            </View>
          )}
          <Text
            style={{
              fontSize: typography.sizes.subtitle,
              fontFamily: typography.fonts.semibold,
              color: colors.text,
            }}
          >
            {title}
          </Text>
        </View>
      )}
      {twoColumn ? (
        <View style={styles.twoColumnGrid}>{children}</View>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default InfoCard;
