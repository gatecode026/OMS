/**
 * @file address.tsx
 * @description Address Details Screen with inline toggled edit mode, current/permanent address fields, "copy address" switch, and backend integration.
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
  Switch,
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
import { Address } from '../../../src/features/profile/types';

export default function AddressScreen() {
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading, refetch } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const updateProfileMutation = useUpdateProfile();

  const p = profile || authUser;

  const [isEditing, setIsEditing] = useState(false);

  // Current Address states
  const [currLine1, setCurrLine1] = useState('');
  const [currCity, setCurrCity] = useState('');
  const [currState, setCurrState] = useState('');
  const [currCountry, setCurrCountry] = useState('India');
  const [currPin, setCurrPin] = useState('');

  // Permanent Address states
  const [permLine1, setPermLine1] = useState('');
  const [permCity, setPermCity] = useState('');
  const [permState, setPermState] = useState('');
  const [permCountry, setPermCountry] = useState('India');
  const [permPin, setPermPin] = useState('');

  // Same Address Toggle
  const [isSameAddress, setIsSameAddress] = useState(false);

  useEffect(() => {
    if (p) {
      const curr = p.currentAddress || {};
      const perm = p.permanentAddress || {};

      setCurrLine1(curr.line1 || '');
      setCurrCity(curr.city || '');
      setCurrState(curr.state || '');
      setCurrCountry(curr.country || 'India');
      setCurrPin(curr.postalCode || curr.pinCode || curr.pincode || '');

      setPermLine1(perm.line1 || '');
      setPermCity(perm.city || '');
      setPermState(perm.state || '');
      setPermCountry(perm.country || 'India');
      setPermPin(perm.postalCode || perm.pinCode || perm.pincode || '');

      // Check if both addresses are exactly same
      const same =
        curr.line1 === perm.line1 &&
        curr.city === perm.city &&
        curr.state === perm.state &&
        curr.country === perm.country &&
        (curr.postalCode || curr.pinCode || curr.pincode) === (perm.postalCode || perm.pinCode || perm.pincode);
      setIsSameAddress(!!same && !!curr.line1);
    }
  }, [p, isEditing]);

  // Sync current address to permanent address if toggle is active
  useEffect(() => {
    if (isSameAddress) {
      setPermLine1(currLine1);
      setPermCity(currCity);
      setPermState(currState);
      setPermCountry(currCountry);
      setPermPin(currPin);
    }
  }, [isSameAddress, currLine1, currCity, currState, currCountry, currPin]);

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!currLine1.trim() || !currCity.trim() || !currState.trim() || !currPin.trim()) {
      toast.error('Please fill all required current address fields.');
      return;
    }

    if (!isSameAddress && (!permLine1.trim() || !permCity.trim() || !permState.trim() || !permPin.trim())) {
      toast.error('Please fill all permanent address fields or enable "Same as Current Address".');
      return;
    }

    const currentAddressObj: Address = {
      line1: currLine1.trim(),
      city: currCity.trim(),
      state: currState.trim(),
      country: currCountry.trim(),
      postalCode: currPin.trim(),
    };

    const permanentAddressObj: Address = isSameAddress
      ? currentAddressObj
      : {
          line1: permLine1.trim(),
          city: permCity.trim(),
          state: permState.trim(),
          country: permCountry.trim(),
          postalCode: permPin.trim(),
        };

    try {
      await updateProfileMutation.mutateAsync({
        employeeId: p?.id ?? authUser?.id ?? '',
        data: {
          currentAddress: currentAddressObj,
          permanentAddress: permanentAddressObj,
        },
      });
      toast.success('Address details updated successfully!');
      setIsEditing(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update address.');
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
          Address details
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
          <Pressable onPress={() => setIsEditing(true)} style={styles.editBtn} accessibilityLabel="Edit address info">
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
            <View style={{ gap: spacing.lg }}>
              {/* CURRENT ADDRESS EDIT CARD */}
              <View style={[styles.formContainer, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, padding: spacing.lg }, shadows.light]}>
                <Text style={{ fontSize: 16, fontFamily: typography.fonts.bold, color: colors.primary, marginBottom: 8 }}>
                  Current Address
                </Text>

                <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Address Line 1</Text>
                <TextInput
                  value={currLine1}
                  onChangeText={setCurrLine1}
                  placeholder="Street, house/apartment number"
                  placeholderTextColor={colors.textLight}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                />

                <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>City</Text>
                <TextInput
                  value={currCity}
                  onChangeText={setCurrCity}
                  placeholder="City"
                  placeholderTextColor={colors.textLight}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                />

                <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>State</Text>
                <TextInput
                  value={currState}
                  onChangeText={setCurrState}
                  placeholder="State"
                  placeholderTextColor={colors.textLight}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                />

                <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Country</Text>
                <TextInput
                  value={currCountry}
                  onChangeText={setCurrCountry}
                  placeholder="Country"
                  placeholderTextColor={colors.textLight}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                />

                <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Postal Code / PIN Code</Text>
                <TextInput
                  value={currPin}
                  onChangeText={setCurrPin}
                  keyboardType="numeric"
                  placeholder="Postal Code"
                  placeholderTextColor={colors.textLight}
                  style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                />
              </View>

              {/* COPY TO PERMANENT SWITCH */}
              <View style={[styles.toggleContainer, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, padding: spacing.md }, shadows.light]}>
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.text, flex: 1 }}>
                  Permanent Address same as Current Address
                </Text>
                <Switch
                  value={isSameAddress}
                  onValueChange={setIsSameAddress}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* PERMANENT ADDRESS EDIT CARD */}
              {!isSameAddress && (
                <View style={[styles.formContainer, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, padding: spacing.lg }, shadows.light]}>
                  <Text style={{ fontSize: 16, fontFamily: typography.fonts.bold, color: colors.primary, marginBottom: 8 }}>
                    Permanent Address
                  </Text>

                  <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Address Line 1</Text>
                  <TextInput
                    value={permLine1}
                    onChangeText={setPermLine1}
                    placeholder="Street, house/apartment number"
                    placeholderTextColor={colors.textLight}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                  />

                  <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>City</Text>
                  <TextInput
                    value={permCity}
                    onChangeText={setPermCity}
                    placeholder="City"
                    placeholderTextColor={colors.textLight}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                  />

                  <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>State</Text>
                  <TextInput
                    value={permState}
                    onChangeText={setPermState}
                    placeholder="State"
                    placeholderTextColor={colors.textLight}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                  />

                  <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Country</Text>
                  <TextInput
                    value={permCountry}
                    onChangeText={setPermCountry}
                    placeholder="Country"
                    placeholderTextColor={colors.textLight}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                  />

                  <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Postal Code / PIN Code</Text>
                  <TextInput
                    value={permPin}
                    onChangeText={setPermPin}
                    keyboardType="numeric"
                    placeholder="Postal Code"
                    placeholderTextColor={colors.textLight}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
                  />
                </View>
              )}
            </View>
          ) : (
            <>
              <InfoCard title="Current Address" icon="home-outline" iconColor="#8B5CF6">
                <InfoRow label="Address Line 1" value={p?.currentAddress?.line1} />
                <InfoRow label="City" value={p?.currentAddress?.city} />
                <InfoRow label="State" value={p?.currentAddress?.state} />
                <InfoRow label="Country" value={p?.currentAddress?.country} />
                <InfoRow label="Postal Code" value={p?.currentAddress?.postalCode || p?.currentAddress?.pinCode} />
              </InfoCard>

              <InfoCard title="Permanent Address" icon="location-outline" iconColor={colors.primary}>
                <InfoRow label="Address Line 1" value={p?.permanentAddress?.line1} />
                <InfoRow label="City" value={p?.permanentAddress?.city} />
                <InfoRow label="State" value={p?.permanentAddress?.state} />
                <InfoRow label="Country" value={p?.permanentAddress?.country} />
                <InfoRow label="Postal Code" value={p?.permanentAddress?.postalCode || p?.permanentAddress?.pinCode} />
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
