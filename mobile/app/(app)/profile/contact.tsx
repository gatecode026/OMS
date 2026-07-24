/**
 * @file contact.tsx
 * @description Contact Information Screen with inline toggled edit mode, input fields, validations, and backend sync.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { toast } from '../../../src/shared/components';
import {
  useProfile,
  useUpdateProfile,
  InfoCard,
  InfoRow,
  InnerPageSkeleton,
} from '../../../src/features/profile';

export default function ContactInformationScreen() {
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading, refetch } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const updateProfileMutation = useUpdateProfile();

  const p = profile || authUser;

  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [officePhone, setOfficePhone] = useState('');

  useEffect(() => {
    if (p) {
      setPhone(p.phone || '');
      setPersonalEmail(p.personalEmail || '');
      setAlternatePhone(p.alternatePhone || '');
      setOfficePhone(p.officePhone || '');
    }
  }, [p, isEditing]);

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!phone.trim()) {
      toast.error('Primary Mobile number is required.');
      return;
    }

    // Basic email format check
    if (personalEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) {
      toast.error('Please enter a valid personal email address.');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        employeeId: p?.id ?? authUser?.id ?? '',
        data: {
          phone: phone.trim(),
          personalEmail: personalEmail.trim(),
          alternatePhone: alternatePhone.trim(),
          officePhone: officePhone.trim(),
        },
      });
      toast.success('Contact information updated successfully!');
      setIsEditing(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update contact information.');
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
          Contact Info
        </Text>
        {isEditing ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={handleCancel} style={styles.textActionBtn}>
              <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.bold }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={updateProfileMutation.isPending} style={[styles.textActionBtn, { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 6 }]}>
              {updateProfileMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Save</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setIsEditing(true)} style={styles.editBtn} accessibilityLabel="Edit contact details">
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </Pressable>
        )}
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
          {isEditing ? (
            <View style={[styles.formContainer, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, padding: spacing.lg }, shadows.light]}>
              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Primary Mobile (Required)</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Primary Mobile"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Alternate Mobile</Text>
              <TextInput
                value={alternatePhone}
                onChangeText={setAlternatePhone}
                keyboardType="phone-pad"
                placeholder="Alternate Mobile"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Personal Email</Text>
              <TextInput
                value={personalEmail}
                onChangeText={setPersonalEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Personal Email"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Office Phone</Text>
              <TextInput
                value={officePhone}
                onChangeText={setOfficePhone}
                keyboardType="phone-pad"
                placeholder="Office Phone"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />
            </View>
          ) : (
            <>
              <InfoCard title="Official Contact" icon="mail-outline" iconColor={colors.info}>
                <InfoRow label="Official Email" value={p?.email} />
                <InfoRow label="Primary Mobile" value={p?.phone} />
                <InfoRow label="Office Phone" value={p?.officePhone} />
              </InfoCard>

              <InfoCard title="Personal Contact" icon="person-outline" iconColor={colors.primary}>
                <InfoRow label="Personal Email" value={p?.personalEmail} />
                <InfoRow label="Alternate Mobile" value={p?.alternatePhone} />
              </InfoCard>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  editBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  textActionBtn: { justifyContent: 'center', alignItems: 'center' },
  formContainer: {
    gap: 12,
  },
  formLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
});
