/**
 * @file address.tsx
 * @description Address inner page for the Enterprise Profile Module.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { useProfile, InfoCard, InfoRow, InnerPageSkeleton } from '../../../src/features/profile';
import { Address } from '../../../src/features/profile/types';

const formatAddress = (addr?: Address) => {
  if (!addr) return undefined;
  return [addr.line1, addr.line2, addr.city, addr.district, addr.state, addr.country, addr.postalCode || addr.pinCode]
    .filter(Boolean)
    .join(', ');
};

export default function AddressScreen() {
  const { colors, spacing, typography, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useProfile();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>Address</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InnerPageSkeleton />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InfoCard title="Current Address" icon="home-outline" iconColor="#8B5CF6">
            <InfoRow label="Address Line 1" value={profile?.currentAddress?.line1} />
            <InfoRow label="Address Line 2" value={profile?.currentAddress?.line2} />
            <InfoRow label="City" value={profile?.currentAddress?.city} />
            <InfoRow label="District" value={profile?.currentAddress?.district} />
            <InfoRow label="State" value={profile?.currentAddress?.state} />
            <InfoRow label="Country" value={profile?.currentAddress?.country} />
            <InfoRow label="Postal Code" value={profile?.currentAddress?.postalCode || profile?.currentAddress?.pinCode} />
          </InfoCard>

          <InfoCard title="Permanent Address" icon="location-outline" iconColor={colors.primary}>
            <InfoRow label="Address Line 1" value={profile?.permanentAddress?.line1} />
            <InfoRow label="Address Line 2" value={profile?.permanentAddress?.line2} />
            <InfoRow label="City" value={profile?.permanentAddress?.city} />
            <InfoRow label="District" value={profile?.permanentAddress?.district} />
            <InfoRow label="State" value={profile?.permanentAddress?.state} />
            <InfoRow label="Country" value={profile?.permanentAddress?.country} />
            <InfoRow label="Postal Code" value={profile?.permanentAddress?.postalCode || profile?.permanentAddress?.pinCode} />
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
