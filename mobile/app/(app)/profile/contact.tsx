/**
 * @file contact.tsx
 * @description Contact Information inner page for the Enterprise Profile Module.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { useProfile, InfoCard, InfoRow, InnerPageSkeleton } from '../../../src/features/profile';

export default function ContactInformationScreen() {
  const { colors, spacing, typography, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const p = profile || authUser;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>Contact Information</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InnerPageSkeleton />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InfoCard title="Official Contact" icon="mail-outline" iconColor={colors.info}>
            <InfoRow label="Official Email" value={p?.email} />
            <InfoRow label="Primary Mobile" value={p?.phone} />
            <InfoRow label="Office Extension" value={p?.officeExtension} />
            <InfoRow label="Office Phone" value={p?.officePhone} />
          </InfoCard>

          <InfoCard title="Personal Contact" icon="person-outline" iconColor={colors.primary}>
            <InfoRow label="Personal Email" value={p?.personalEmail} />
            <InfoRow label="Alternate Mobile" value={p?.alternatePhone} />
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
