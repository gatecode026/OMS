/**
 * @file about.tsx
 * @description About Screen inner page.
 */

import React from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { InfoCard, InfoRow } from '../../../src/features/profile';
import useBranding from '../../../src/shared/hooks/useBranding';

export default function AboutScreen() {
  const { colors, spacing, typography, isDark } = useTheme();
  const { companyName } = useBranding();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't open link", err));
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>About</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
        <InfoCard title="Application Details" icon="information-circle-outline" iconColor={colors.primary}>
          <InfoRow label="Application Name" value="Gatecode OMS Mobile" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Build Number" value="100" />
          <InfoRow label="Release Type" value="Enterprise Production" />
        </InfoCard>

        <InfoCard title="Tenant Branding" icon="business-outline" iconColor={colors.secondary}>
          <InfoRow label="Company Partner" value={companyName} />
          <InfoRow label="Domain Domain" value="gatecodeoms.com" />
        </InfoCard>

        <InfoCard title="Legal Documents" icon="document-text-outline" iconColor={colors.success}>
          <Pressable onPress={() => handleOpenUrl('https://gatecodeoms.com/privacy')} style={styles.linkRow}>
            <Text style={[styles.linkText, { color: colors.primary, fontSize: typography.sizes.body, fontFamily: typography.fonts.medium }]}>
              Privacy Policy
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </Pressable>
          
          <Pressable onPress={() => handleOpenUrl('https://gatecodeoms.com/terms')} style={[styles.linkRow, { marginTop: spacing.md }]}>
            <Text style={[styles.linkText, { color: colors.primary, fontSize: typography.sizes.body, fontFamily: typography.fonts.medium }]}>
              Terms and Conditions
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </Pressable>
        </InfoCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  linkText: {
    marginRight: 8,
  },
});
