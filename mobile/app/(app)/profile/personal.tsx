/**
 * @file personal.tsx
 * @description Personal Information Screen with inline toggled edit mode, inputs, select pickers, and API update integrations.
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
  Modal,
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

export default function PersonalInformationScreen() {
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading, refetch } = useProfile();
  const authUser = useAuthStore((s) => s.user);
  const updateProfileMutation = useUpdateProfile();

  const p = profile || authUser;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [nationality, setNationality] = useState('');
  const [religion, setReligion] = useState('');

  // Dropdown bottom sheet states
  const [activePicker, setActivePicker] = useState<'gender' | 'marital' | 'blood' | null>(null);

  useEffect(() => {
    if (p) {
      setName(p.name || '');
      setGender(p.gender || '');
      setDateOfBirth(p.dateOfBirth || p.dob || '');
      setMaritalStatus(p.maritalStatus || '');
      setBloodGroup(p.bloodGroup || '');
      setNationality(p.nationality || '');
      setReligion(p.religion || '');
    }
  }, [p, isEditing]);

  const formatDate = (d?: string) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Full Name is required.');
      return;
    }
    if (!p?.id) {
      toast.error('Employee ID not found.');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        employeeId: p.id,
        data: {
          name: name.trim(),
          gender,
          dateOfBirth: dateOfBirth.trim(),
          maritalStatus,
          bloodGroup,
          nationality: nationality.trim(),
          religion: religion.trim(),
        },
      });
      toast.success('Basic details updated successfully!');
      setIsEditing(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update personal details.');
    }
  };

  const renderPickerBottomSheet = () => {
    let options: string[] = [];
    let title = '';
    let selectedValue = '';
    let onSelect = (val: string) => {};

    if (activePicker === 'gender') {
      title = 'Select Gender';
      options = ['Male', 'Female', 'Other'];
      selectedValue = gender;
      onSelect = setGender;
    } else if (activePicker === 'marital') {
      title = 'Select Marital Status';
      options = ['Single', 'Married', 'Divorced', 'Widowed'];
      selectedValue = maritalStatus;
      onSelect = setMaritalStatus;
    } else if (activePicker === 'blood') {
      title = 'Select Blood Group';
      options = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      selectedValue = bloodGroup;
      onSelect = setBloodGroup;
    }

    return (
      <Modal
        visible={activePicker !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActivePicker(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActivePicker(null)}>
          <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>{title}</Text>
              <Pressable onPress={() => setActivePicker(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textLight} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const isSelected = selectedValue === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      onSelect(opt);
                      setActivePicker(null);
                    }}
                    style={[styles.pickerItemRow, { borderBottomColor: colors.border }, isSelected && { backgroundColor: `${colors.primary}08` }]}
                  >
                    <Text style={{ fontSize: 16, color: colors.text, fontFamily: isSelected ? typography.fonts.bold : typography.fonts.medium }}>
                      {opt}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    );
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
          Personal Info
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
          <Pressable onPress={() => setIsEditing(true)} style={styles.editBtn} accessibilityLabel="Edit info">
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
              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Gender</Text>
              <Pressable
                onPress={() => setActivePicker('gender')}
                style={[styles.selectTrigger, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              >
                <Text style={{ color: gender ? colors.text : colors.textLight, fontFamily: typography.fonts.medium }}>
                  {gender || 'Select Gender'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textLight} />
              </Pressable>

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Marital Status</Text>
              <Pressable
                onPress={() => setActivePicker('marital')}
                style={[styles.selectTrigger, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              >
                <Text style={{ color: maritalStatus ? colors.text : colors.textLight, fontFamily: typography.fonts.medium }}>
                  {maritalStatus || 'Select Marital Status'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textLight} />
              </Pressable>

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Blood Group</Text>
              <Pressable
                onPress={() => setActivePicker('blood')}
                style={[styles.selectTrigger, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              >
                <Text style={{ color: bloodGroup ? colors.text : colors.textLight, fontFamily: typography.fonts.medium }}>
                  {bloodGroup || 'Select Blood Group'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textLight} />
              </Pressable>

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Nationality</Text>
              <TextInput
                value={nationality}
                onChangeText={setNationality}
                placeholder="Nationality"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Religion</Text>
              <TextInput
                value={religion}
                onChangeText={setReligion}
                placeholder="Religion"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />
            </View>
          ) : (
            <>
              <InfoCard title="Identity & Demographics" icon="person-outline" iconColor={colors.primary}>
                <InfoRow label="Full Name" value={p?.name} />
                <InfoRow label="Employee ID" value={p?.employeeId || p?.employeeCode || p?.id} />
                <InfoRow label="Gender" value={p?.gender} />
                <InfoRow label="Date of Birth" value={formatDate(p?.dateOfBirth || p?.dob)} />
                <InfoRow label="Blood Group" value={p?.bloodGroup} valueColor={colors.danger} />
                <InfoRow label="Nationality" value={p?.nationality} />
                <InfoRow label="Marital Status" value={p?.maritalStatus} />
                <InfoRow label="Religion" value={p?.religion} />
              </InfoCard>

              <InfoCard title="Account Information" icon="id-card-outline" iconColor={colors.secondary}>
                <InfoRow label="Account Status" value={p?.status} />
                <InfoRow label="Member Since" value={formatDate(p?.createdAt)} />
              </InfoCard>
            </>
          )}
        </ScrollView>
      )}

      {renderPickerBottomSheet()}
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
  selectTrigger: {
    height: 48,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    paddingVertical: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
});
