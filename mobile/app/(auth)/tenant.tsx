/**
 * @file tenant.tsx
 * @description Screen for tenant/organization resolution. Checks subdomain/code and applies custom branding colors.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useTheme from '../../src/shared/hooks/useTheme';
import { Button, TextField } from '../../src/shared/components';
import { useThemeStore } from '../../src/shared/store/themeStore';
import authApi from '../../src/features/auth/api/authApi';
import useAuthStore from '../../src/shared/store/authStore';

export default function TenantScreen() {
  const { colors, spacing, typography, isDark } = useTheme();
  const setTenantBranding = useThemeStore((state) => state.setTenantBranding);
  const rememberedCompanyCode = useAuthStore((state) => state.rememberedCompanyCode);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill company code if remembered
  useEffect(() => {
    if (rememberedCompanyCode) {
      setCompanyCode(rememberedCompanyCode);
    }
  }, [rememberedCompanyCode]);

  const handleResolveTenant = async () => {
    if (!companyCode.trim()) {
      setError('Please enter your Company Code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Try resolving by ID first
      const branding = await authApi.fetchBranding(companyCode.trim());
      
      if (branding && branding.id) {
        // Apply tenant-specific branding
        setTenantBranding({
          primary: branding.settings?.primaryColor,
          secondary: branding.settings?.secondaryColor,
          companyName: branding.name,
          logoUrl: branding.settings?.logoUrl,
        });

        // Navigate to login with company parameters
        router.push({
          pathname: '/(auth)/login',
          params: { companyCode: branding.id, companyName: branding.name },
        });
      } else {
        setError('Invalid Company Code. Please check and try again.');
      }
    } catch (err: any) {
      console.error('Resolve tenant error', err);
      // Fallback: try resolving as subdomain
      try {
        const brandingSub = await authApi.fetchBrandingBySubdomain(companyCode.trim().toLowerCase());
        if (brandingSub && brandingSub.id) {
          setTenantBranding({
            primary: brandingSub.settings?.primaryColor,
            secondary: brandingSub.settings?.secondaryColor,
            companyName: brandingSub.name,
            logoUrl: brandingSub.settings?.logoUrl,
          });

          router.push({
            pathname: '/(auth)/login',
            params: { companyCode: brandingSub.id, companyName: brandingSub.name },
          });
          return;
        }
      } catch (subErr) {
        console.error('Resolve subdomain fallback error', subErr);
      }
      
      setError(err?.message || 'Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: insets.bottom + spacing.xxl,
            paddingHorizontal: spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <Text
            style={[
              styles.logoText,
              { color: colors.primary, fontFamily: typography.fonts.bold, fontSize: 32 },
            ]}
          >
            OMS Mobile
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.textMuted, fontFamily: typography.fonts.medium, marginTop: spacing.xs },
            ]}
          >
            Enterprise Workforce Workspace
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text, fontFamily: typography.fonts.semibold, fontSize: typography.sizes.h3 },
            ]}
          >
            Enter Organization Code
          </Text>
          <Text
            style={[
              styles.cardDescription,
              { color: colors.textMuted, fontFamily: typography.fonts.regular, marginBottom: spacing.lg },
            ]}
          >
            Please input your unique workspace subdomain name or company registration code to proceed.
          </Text>

          <TextField
            placeholder="e.g. COMP-DEFAULT or acme"
            value={companyCode}
            onChangeText={(text) => {
              setCompanyCode(text);
              setError('');
            }}
            error={error}
            autoCapitalize="none"
            autoCorrect={false}
            disabled={loading}
          />

          <Button
            title="Continue to Login"
            onPress={handleResolveTenant}
            loading={loading}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    letterSpacing: -1,
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
