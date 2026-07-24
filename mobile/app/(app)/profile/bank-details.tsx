/**
 * @file bank-details.tsx
 * @description Bank Details Screen with inline toggled edit mode, IFSC validation, account masking, and backend integrations.
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

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function BankDetailsScreen() {
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading, refetch } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const updateProfileMutation = useUpdateProfile();

  const p = profile || authUser;

  const [isEditing, setIsEditing] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankUpiId, setBankUpiId] = useState('');

  useEffect(() => {
    if (p) {
      setBankName(p.bankName || '');
      setBankAccountNumber(p.bankAccountNumber || '');
      setBankIfscCode(p.bankIfscCode || '');
      setBankUpiId(p.bankUpiId || '');
    }
  }, [p, isEditing]);

  const maskAccount = (num?: string) => {
    if (!num) return '—';
    const cleanNum = num.trim();
    if (cleanNum.length < 4) return cleanNum;
    return '•••• •••• ' + cleanNum.slice(-4);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!bankName.trim()) {
      toast.error('Bank Name is required.');
      return;
    }
    if (!bankAccountNumber.trim()) {
      toast.error('Account Number is required.');
      return;
    }
    if (bankAccountNumber.trim().length < 9 || bankAccountNumber.trim().length > 18) {
      toast.error('Account Number must be between 9 and 18 digits.');
      return;
    }
    if (!bankIfscCode.trim()) {
      toast.error('IFSC Code is required.');
      return;
    }
    if (!IFSC_REGEX.test(bankIfscCode.toUpperCase().trim())) {
      toast.error('Please enter a valid 11-digit IFSC code (e.g. SBIN0001234).');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        employeeId: p?.id ?? authUser?.id ?? '',
        data: {
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankIfscCode: bankIfscCode.toUpperCase().trim(),
          bankUpiId: bankUpiId.trim(),
        },
      });
      toast.success('Bank details updated successfully!');
      setIsEditing(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update bank details.');
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
          Bank Details
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
          <Pressable onPress={() => setIsEditing(true)} style={styles.editBtn} accessibilityLabel="Edit bank details">
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
              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Bank Name (Required)</Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank Name"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Account Number (Required)</Text>
              <TextInput
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                keyboardType="numeric"
                placeholder="Account Number"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>IFSC Code (Required)</Text>
              <TextInput
                value={bankIfscCode}
                onChangeText={setBankIfscCode}
                autoCapitalize="characters"
                placeholder="IFSC Code (e.g. SBIN0001234)"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>UPI ID</Text>
              <TextInput
                value={bankUpiId}
                onChangeText={setBankUpiId}
                autoCapitalize="none"
                placeholder="UPI ID (e.g. name@upi)"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />
            </View>
          ) : (
            <InfoCard title="Salary Account Details" icon="card-outline" iconColor={colors.primary}>
              <InfoRow label="Bank Name" value={p?.bankName} />
              <InfoRow label="Account Number" value={maskAccount(p?.bankAccountNumber)} />
              <InfoRow label="IFSC Code" value={p?.bankIfscCode} />
              <InfoRow label="UPI ID" value={p?.bankUpiId} />
            </InfoCard>
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
