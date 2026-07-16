/**
 * @file personal.tsx
 * @description Personal Information inner page for the Enterprise Profile Module.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { EmptyState } from '../../../src/shared/components';
import {
  useProfile,
  InfoCard,
  InfoRow,
  InnerPageSkeleton,
} from '../../../src/features/profile';

export default function PersonalInformationScreen() {
  const { colors, spacing, typography, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const authUser = useAuthStore((s) => s.user);

  const p = profile || authUser;

  const formatDate = (d?: string) => {
    if (!d) return undefined;
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>
          Personal Information
        </Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InnerPageSkeleton />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          <InfoCard title="Identity & Demographics" icon="person-outline" iconColor={colors.primary}>
            <InfoRow label="Full Name" value={p?.name} />
            <InfoRow label="Employee ID" value={p?.employeeId || p?.employeeCode} />
            <InfoRow label="Gender" value={p?.gender} />
            <InfoRow label="Date of Birth" value={formatDate(p?.dateOfBirth)} />
            <InfoRow label="Blood Group" value={p?.bloodGroup} valueColor={colors.danger} />
            <InfoRow label="Nationality" value={p?.nationality} />
            <InfoRow label="Marital Status" value={p?.maritalStatus} />
            <InfoRow label="Religion" value={p?.religion} />
          </InfoCard>

          <InfoCard title="Account Information" icon="id-card-outline" iconColor={colors.secondary}>
            <InfoRow label="Account Status" value={p?.status} />
            <InfoRow label="Member Since" value={formatDate(p?.createdAt)} />
          </InfoCard>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
});
