/**
 * @file emergency.tsx
 * @description Emergency Contacts inner page for the Enterprise Profile Module.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { useEmergencyContacts, InfoCard, InfoRow, InnerPageSkeleton } from '../../../src/features/profile';
import { EmptyState } from '../../../src/shared/components';

export default function EmergencyContactsScreen() {
  const { colors, spacing, typography, isDark, radius } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: contacts, isLoading } = useEmergencyContacts();

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch((err) => console.error("Couldn't make call", err));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessible accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: typography.sizes.h2, fontFamily: typography.fonts.bold, color: colors.text }}>Emergency Contacts</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          <InnerPageSkeleton />
        </ScrollView>
      ) : !contacts || contacts.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Emergency Contacts"
          description="You haven't designated any emergency contacts yet. Please contact HR to update."
          style={{ flex: 1 }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
          {contacts.map((contact, idx) => (
            <InfoCard
              key={contact.id || idx}
              title={contact.relationship ? `${contact.name} (${contact.relationship})` : contact.name}
              icon="call-outline"
              iconColor={colors.danger}
            >
              <InfoRow label="Contact Name" value={contact.name} />
              <InfoRow label="Relationship" value={contact.relationship} />
              <InfoRow
                label="Primary Phone"
                value={contact.primaryPhone}
                valueColor={colors.primary}
              />
              <InfoRow label="Alternate Phone" value={contact.alternatePhone} />
              <InfoRow label="Address" value={contact.address} />

              {contact.primaryPhone && (
                <Pressable
                  onPress={() => handleCall(contact.primaryPhone)}
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
                  <Ionicons name="call-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.semibold, color: colors.primary }}>
                    Call Contact
                  </Text>
                </Pressable>
              )}
            </InfoCard>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
