/**
 * @file security.tsx
 * @description Security inner page for the Enterprise Profile Module.
 *              Integrates the Theme Selection and Biometric Switch options.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { useThemeStore, ThemeMode } from '../../../src/shared/store/themeStore';
import useAuthStore from '../../../src/shared/store/authStore';
import { InfoCard, InfoRow } from '../../../src/features/profile';
import { Card, Divider, Dropdown } from '../../../src/shared/components';

export default function SecurityScreen() {
  const { colors, spacing, typography, isDark, radius } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const themeOptions = [
    { label: 'Follow System', value: 'system' },
    { label: 'Light Mode', value: 'light' },
    { label: 'Dark Mode', value: 'dark' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>Security & Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
        <InfoCard title="Application Preferences" icon="settings-outline" iconColor={colors.primary}>
          <Dropdown
            label="Visual Appearance Theme"
            options={themeOptions}
            selectedValue={themeMode}
            onSelect={(val) => setThemeMode(val as ThemeMode)}
          />
          
          <Divider style={{ marginVertical: spacing.md }} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextContainer}>
              <Text
                style={{
                  fontSize: typography.sizes.body,
                  fontFamily: typography.fonts.semibold,
                  color: colors.text,
                }}
              >
                Enable Biometric Lock
              </Text>
              <Text
                style={{
                  fontSize: typography.sizes.caption,
                  fontFamily: typography.fonts.regular,
                  color: colors.textMuted,
                  marginTop: 2,
                }}
              >
                Use FaceID or Fingerprint to unlock app session
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </InfoCard>

        <InfoCard title="Security Status" icon="shield-checkmark-outline" iconColor={colors.success}>
          <InfoRow label="Login Sessions" value="Active (This Device Only)" />
          <InfoRow label="Biometric Status" value={biometricsEnabled ? 'Configured & Enabled' : 'Not Configured'} valueColor={biometricsEnabled ? colors.success : colors.warning} />
          <InfoRow label="Password Status" value="Secure (Last updated 3 months ago)" />
          <InfoRow label="Account Security Level" value="Protected" valueColor={colors.success} />
        </InfoCard>

        <InfoCard title="Session Activity" icon="time-outline" iconColor={colors.secondary}>
          <InfoRow label="Registered Device" value="OMS Mobile Application" />
          <InfoRow label="Last Authentication" value={new Date().toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })} />
        </InfoCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
});
