/**
 * @file professional.tsx
 * @description Professional Information inner page for the Enterprise Profile Module.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { useProfile, InfoCard, InfoRow, InnerPageSkeleton } from '../../../src/features/profile';

export default function ProfessionalInformationScreen() {
  const { colors, spacing, typography, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const p = profile || authUser;

  const formatDate = (d?: string) => {
    if (!d) return undefined;
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return d; }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>Professional Information</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InnerPageSkeleton />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InfoCard title="Position & Role" icon="briefcase-outline" iconColor="#6366F1">
            <InfoRow label="Designation" value={p?.designation} />
            <InfoRow label="Grade" value={p?.grade} />
            <InfoRow label="Role" value={p?.role} />
            <InfoRow label="Employment Type" value={p?.employmentType} />
          </InfoCard>

          <InfoCard title="Department & Team" icon="people-outline" iconColor={colors.info}>
            <InfoRow label="Department" value={p?.department} />
            <InfoRow label="Team Name" value={p?.teamName} />
            <InfoRow label="Business Unit" value={p?.businessUnit} />
            <InfoRow label="Division" value={p?.division} />
          </InfoCard>

          <InfoCard title="Reporting Structure" icon="git-branch-outline" iconColor={colors.success}>
            <InfoRow label="Reporting Manager" value={p?.reportingManagerName || p?.reportingManager} />
          </InfoCard>

          <InfoCard title="Work Location & Schedule" icon="location-outline" iconColor="#8B5CF6">
            <InfoRow label="Branch" value={p?.branch} />
            <InfoRow label="Office Location" value={p?.officeLocation} />
            <InfoRow label="Shift" value={p?.shift} />
            <InfoRow label="Shift Timing" value={p?.shiftTiming} />
            <InfoRow label="Current Project" value={p?.currentProject} />
          </InfoCard>

          <InfoCard title="Employment Timeline" icon="calendar-outline" iconColor={colors.warning}>
            <InfoRow label="Joining Date" value={formatDate(p?.joiningDate)} />
            <InfoRow label="Confirmation Date" value={formatDate(p?.confirmationDate)} />
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
