/**
 * @file emergency.tsx
 * @description Emergency Contact Screen with inline toggled edit mode, inputs, validations, and backend sync.
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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { toast } from '../../../src/shared/components';
import {
  useProfile,
  useEmergencyContacts,
  useUpdateProfile,
  InfoCard,
  InfoRow,
  InnerPageSkeleton,
} from '../../../src/features/profile';

export default function EmergencyContactsScreen() {
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading: isProfileLoading, refetch } = useProfile();
  const { data: apiContacts, isLoading: isContactsLoading } = useEmergencyContacts();
  const authUser = useAuthStore((s) => s.user);
  const updateProfileMutation = useUpdateProfile();

  const p = profile || authUser;

  // Normalized contact representation
  const [contacts, setContacts] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Form states for primary contact
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneAlt, setPhoneAlt] = useState('');

  const isLoading = isProfileLoading || isContactsLoading;

  useEffect(() => {
    // 1. Gather contacts from API or profile fallback
    const resolved: any[] = [];
    if (apiContacts && apiContacts.length > 0) {
      resolved.push(...apiContacts);
    } else if (p?.emergencyContactName) {
      resolved.push({
        name: p.emergencyContactName,
        relationship: p.emergencyContactRelation || '',
        primaryPhone: p.emergencyContactPhone || '',
        alternatePhone: p.emergencyContactPhoneAlt || '',
      });
    }
    setContacts(resolved);

    // 2. Pre-fill form fields
    if (resolved.length > 0) {
      setName(resolved[0].name || '');
      setRelationship(resolved[0].relationship || '');
      setPhone(resolved[0].primaryPhone || '');
      setPhoneAlt(resolved[0].alternatePhone || '');
    } else {
      setName('');
      setRelationship('');
      setPhone('');
      setPhoneAlt('');
    }
  }, [apiContacts, p, isEditing]);

  const handleCall = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch((err) => console.error("Couldn't make call", err));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Contact Name is required.');
      return;
    }
    if (!relationship.trim()) {
      toast.error('Relationship is required.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Primary Phone is required.');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        employeeId: p?.id ?? authUser?.id ?? '',
        data: {
          emergencyContactName: name.trim(),
          emergencyContactRelation: relationship.trim(),
          emergencyContactPhone: phone.trim(),
          emergencyContactPhoneAlt: phoneAlt.trim(),
        },
      });
      toast.success('Emergency contact updated successfully!');
      setIsEditing(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update emergency contact.');
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
          Emergency Contact
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
          <Pressable onPress={() => setIsEditing(true)} style={styles.editBtn} accessibilityLabel="Edit emergency contact">
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
              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Contact Name (Required)</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Relationship (Required)</Text>
              <TextInput
                value={relationship}
                onChangeText={setRelationship}
                placeholder="e.g. Spouse, Father, Mother"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Primary Phone (Required)</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Mobile number"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Alternate Phone</Text>
              <TextInput
                value={phoneAlt}
                onChangeText={setPhoneAlt}
                keyboardType="phone-pad"
                placeholder="Alternate phone number"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />
            </View>
          ) : contacts.length === 0 ? (
            <Pressable onPress={() => setIsEditing(true)} style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }, shadows.light]}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontSize: 16, fontFamily: typography.fonts.bold, color: colors.text, marginTop: spacing.md }}>
                No Emergency Contact Set
              </Text>
              <Text style={{ fontSize: 13, fontFamily: typography.fonts.medium, color: colors.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: spacing.xl }}>
                Tap here to add emergency contact details like name, phone, and relationship.
              </Text>
            </Pressable>
          ) : (
            contacts.map((contact, idx) => (
              <InfoCard
                key={contact.id || idx}
                title={contact.relationship ? `${contact.name} (${contact.relationship})` : contact.name}
                icon="call-outline"
                iconColor={colors.danger}
              >
                <InfoRow label="Contact Name" value={contact.name} />
                <InfoRow label="Relationship" value={contact.relationship} />
                <InfoRow label="Primary Phone" value={contact.primaryPhone || contact.phone} valueColor={colors.primary} />
                <InfoRow label="Alternate Phone" value={contact.alternatePhone} />

                {(contact.primaryPhone || contact.phone) && (
                  <Pressable
                    onPress={() => handleCall(contact.primaryPhone || contact.phone)}
                    style={[
                      styles.callBtn,
                      {
                        backgroundColor: `${colors.primary}12`,
                        borderRadius: radius.md,
                        marginTop: spacing.md,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    <Ionicons name="call" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.semibold, color: colors.primary }}>
                      Call Contact
                    </Text>
                  </Pressable>
                )}
              </InfoCard>
            ))
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
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
