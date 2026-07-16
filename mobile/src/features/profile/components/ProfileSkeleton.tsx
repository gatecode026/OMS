/**
 * @file ProfileSkeleton.tsx
 * @description Animated skeleton loading state components for Profile screens.
 *              Reuses the Skeleton component from the existing Feedback design system.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import useTheme from '../../../shared/hooks/useTheme';
import { Skeleton } from '../../../shared/components';

// ─── Main Profile Screen Skeleton ─────────────────────────────────────────────

export const MainProfileSkeleton: React.FC = () => {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      {/* Profile Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderColor: colors.border,
            borderWidth: 1,
            padding: spacing.xl,
            alignItems: 'center',
            marginBottom: spacing.lg,
          },
        ]}
      >
        <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: spacing.md }} />
        <Skeleton width={140} height={20} borderRadius={4} style={{ marginBottom: spacing.sm }} />
        <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: spacing.md }} />
        <Skeleton width={90} height={26} borderRadius={13} style={{ marginBottom: spacing.lg }} />
        {/* Contact rows */}
        <View style={styles.skeletonRow}>
          <Skeleton width={32} height={32} borderRadius={8} style={{ marginRight: spacing.md }} />
          <View>
            <Skeleton width={60} height={10} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton width={160} height={16} borderRadius={4} />
          </View>
        </View>
        <View style={[styles.skeletonRow, { marginTop: spacing.md }]}>
          <Skeleton width={32} height={32} borderRadius={8} style={{ marginRight: spacing.md }} />
          <View>
            <Skeleton width={60} height={10} borderRadius={4} style={{ marginBottom: 4 }} />
            <Skeleton width={130} height={16} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Org Section */}
      <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: spacing.md }} />
      <View style={[styles.twoCol, { marginBottom: spacing.lg }]}>
        <View
          style={[
            styles.orgCard,
            {
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderColor: colors.border,
              borderWidth: 1,
              flex: 1,
              marginRight: spacing.sm,
              padding: spacing.md,
            },
          ]}
        >
          <Skeleton width={70} height={10} borderRadius={4} style={{ marginBottom: spacing.sm }} />
          <Skeleton width={90} height={16} borderRadius={4} />
        </View>
        <View
          style={[
            styles.orgCard,
            {
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderColor: colors.border,
              borderWidth: 1,
              flex: 1,
              padding: spacing.md,
            },
          ]}
        >
          <Skeleton width={70} height={10} borderRadius={4} style={{ marginBottom: spacing.sm }} />
          <Skeleton width={80} height={16} borderRadius={4} />
        </View>
      </View>

      {/* Menu Items */}
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.menuSkeleton,
            {
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderColor: colors.border,
              borderWidth: 1,
              padding: spacing.lg,
              marginBottom: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
            },
          ]}
        >
          <Skeleton width={38} height={38} borderRadius={10} style={{ marginRight: spacing.md }} />
          <Skeleton width={150} height={16} borderRadius={4} />
        </View>
      ))}
    </View>
  );
};

// ─── Inner Page Skeleton ───────────────────────────────────────────────────────

export const InnerPageSkeleton: React.FC = () => {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      {[1, 2].map((cardIdx) => (
        <View
          key={cardIdx}
          style={[
            {
              backgroundColor: colors.card,
              borderRadius: radius.lg,
              borderColor: colors.border,
              borderWidth: 1,
              padding: spacing.lg,
              marginBottom: spacing.lg,
            },
          ]}
        >
          {/* Card title */}
          <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: spacing.md }} />
          {/* Rows */}
          {[1, 2, 3].map((rowIdx) => (
            <View key={rowIdx} style={{ marginBottom: spacing.md }}>
              <Skeleton width={80} height={10} borderRadius={4} style={{ marginBottom: 5 }} />
              <Skeleton width={200} height={16} borderRadius={4} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {},
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  twoCol: {
    flexDirection: 'row',
  },
  orgCard: {},
  menuSkeleton: {},
});
