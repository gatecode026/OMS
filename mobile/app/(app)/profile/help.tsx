/**
 * @file help.tsx
 * @description Help & Support inner page.
 */

import React from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { InfoCard, InfoRow } from '../../../src/features/profile';
import useBranding from '../../../src/shared/hooks/useBranding';
import { Button } from '../../../src/shared/components';

export default function HelpScreen() {
  const { colors, spacing, typography, isDark } = useTheme();
  const { companyName } = useBranding();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const companyEmail = 'support@gatecodeoms.com';
  const companyPhone = '+91 98765 43210';

  const handleEmailSupport = () => {
    Linking.openURL(`mailto:${companyEmail}?subject=OMS%20Mobile%20Support`).catch((err) =>
      console.error("Couldn't open mail client", err)
    );
  };

  const handleCallSupport = () => {
    Linking.openURL(`tel:${companyPhone}`).catch((err) =>
      console.error("Couldn't open telephone dialer", err)
    );
  };

  const handleOpenFaq = () => {
    Linking.openURL('https://gatecodeoms.com/faq').catch((err) =>
      console.error("Couldn't open FAQ website", err)
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>Help & Support</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
        <InfoCard title="Contact Channels" icon="call-outline" iconColor={colors.primary}>
          <InfoRow label="Support Email Address" value={companyEmail} />
          <InfoRow label="Support Hotline Number" value={companyPhone} />
        </InfoCard>

        <InfoCard title="Support Tickets" icon="ticket-outline" iconColor={colors.secondary}>
          <InfoRow label="Open Support Tickets" value="0 Active Issues" />
          <InfoRow label="Assigned HR Lead" value={companyName} />
        </InfoCard>

        <View style={{ marginTop: spacing.md }}>
          <Button
            title="Email HR / Support"
            variant="solid"
            intent="primary"
            leftIcon="mail-outline"
            onPress={handleEmailSupport}
            style={{ marginBottom: spacing.md }}
            fullWidth
          />

          <Button
            title="Call Support Hotline"
            variant="outlined"
            intent="success"
            leftIcon="call-outline"
            onPress={handleCallSupport}
            style={{ marginBottom: spacing.md }}
            fullWidth
          />

          <Button
            title="View FAQ Knowledgebase"
            variant="outlined"
            intent="info"
            leftIcon="open-outline"
            onPress={handleOpenFaq}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
});
