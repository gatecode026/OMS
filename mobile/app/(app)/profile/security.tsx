/**
 * @file security.tsx
 * @description Security Settings Screen. Integrates theme mode selection, biometrics switch,
 *              active login sessions, trusted devices, and a secure password change modal.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../../src/shared/hooks/useTheme';
import { useThemeStore, ThemeMode } from '../../../src/shared/store/themeStore';
import useAuthStore from '../../../src/shared/store/authStore';
import { toast } from '../../../src/shared/components';
import apiClient from '../../../src/shared/services/apiClient';
import {
  useProfile,
  useActiveSessions,
  useActiveDevices,
  useTerminateSession,
  useTerminateOtherSessions,
  useUpdateProfile,
  InfoCard,
  InfoRow,
} from '../../../src/features/profile';
import { Divider, Dropdown } from '../../../src/shared/components';

export default function SecurityScreen() {
  const { colors, spacing, typography, radius, shadows, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Password Modal states
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);

  const { data: profile } = useProfile();
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useActiveSessions();
  const { data: devices, isLoading: devicesLoading, refetch: refetchDevices } = useActiveDevices();

  const terminateSessionMutation = useTerminateSession();
  const terminateOtherSessionsMutation = useTerminateOtherSessions();
  const updateProfileMutation = useUpdateProfile();

  useEffect(() => {
    if (params.action === 'password') {
      setPasswordModalVisible(true);
    }
  }, [params.action]);

  const themeOptions = [
    { label: 'Follow System', value: 'system' },
    { label: 'Light Mode', value: 'light' },
    { label: 'Dark Mode', value: 'dark' },
  ];

  // Helper to find our current session (most recently active or matching IP/device)
  const userSessions = sessions ? sessions.filter((s) => s.employeeId === user?.id) : [];
  // Sort user sessions by lastActivity so the latest one is at index 0
  const sortedSessions = [...userSessions].sort((a, b) => {
    return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
  });
  const currentSessionId = sortedSessions[0]?.id;

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await terminateSessionMutation.mutateAsync(sessionId);
      toast.success('Session terminated successfully.');
      refetchSessions();
    } catch (err: any) {
      toast.error('Failed to terminate session.');
    }
  };

  const handleTerminateOthers = async () => {
    if (!currentSessionId) {
      toast.error('Current session ID not found.');
      return;
    }
    try {
      await terminateOtherSessionsMutation.mutateAsync(currentSessionId);
      toast.success('All other sessions terminated successfully.');
      refetchSessions();
    } catch (err: any) {
      toast.error('Failed to terminate other sessions.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password cannot be the same as your current password.');
      return;
    }

    setPasswordChanging(true);
    try {
      // 1. Silently verify current password by attempting mock login
      const companyCode = user?.companyCode || profile?.companyCode || 'GATECODE';
      try {
        await apiClient.post('/api/v1/auth/login', {
          email: user?.email,
          password: currentPassword,
          companyCode,
        });
      } catch (loginErr: any) {
        toast.error('Current password is incorrect.');
        setPasswordChanging(false);
        return;
      }

      // 2. Password is correct, call PUT /employees/:id to update it
      const targetUserId = profile?.id || user?.id;
      if (!targetUserId) {
        toast.error('User ID not found.');
        setPasswordChanging(false);
        return;
      }

      await updateProfileMutation.mutateAsync({
        employeeId: targetUserId,
        data: {
          password: newPassword,
        },
      });

      toast.success('Password updated successfully! Please login again with your new password.');
      setPasswordModalVisible(false);
      
      // Auto-logout for security reasons after password change
      setTimeout(async () => {
        await logout();
      }, 1500);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password.');
    } finally {
      setPasswordChanging(false);
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
          Security & Settings
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
        {/* Application Preferences Card */}
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
              <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.semibold, color: colors.text }}>
                Enable Biometric Lock
              </Text>
              <Text style={{ fontSize: typography.sizes.caption, fontFamily: typography.fonts.regular, color: colors.textMuted, marginTop: 2 }}>
                Use FaceID or Fingerprint to unlock app session
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </InfoCard>

        {/* Change Password Card */}
        <InfoCard title="Password & Authentication" icon="lock-closed-outline" iconColor="#6366F1">
          <Text style={{ fontSize: 13, fontFamily: typography.fonts.medium, color: colors.textMuted, marginBottom: 12 }}>
            We recommend changing your password regularly to keep your enterprise account secure.
          </Text>
          <Pressable
            onPress={() => setPasswordModalVisible(true)}
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
          >
            <Ionicons name="key-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>
              Change Password
            </Text>
          </Pressable>
        </InfoCard>

        {/* Active Login Sessions */}
        <InfoCard title="Active Login Sessions" icon="phone-portrait-outline" iconColor="#10B981">
          {sessionsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : userSessions.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>No active sessions found.</Text>
          ) : (
            <View style={{ gap: spacing.md }}>
              {sortedSessions.map((session, idx) => {
                const isCurrent = session.id === currentSessionId;
                return (
                  <View key={session.id || idx} style={[styles.sessionItem, { borderBottomColor: colors.border, borderBottomWidth: idx < sortedSessions.length - 1 ? 1 : 0, paddingBottom: idx < sortedSessions.length - 1 ? spacing.md : 0 }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                          name={session.deviceType === 'Mobile' ? 'phone-portrait-outline' : 'desktop-outline'}
                          size={18}
                          color={isCurrent ? colors.success : colors.text}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.text }}>
                          {session.os || 'Unknown OS'} • {session.browser || 'Browser'}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentTag, { backgroundColor: `${colors.success}15`, borderRadius: radius.sm }]}>
                            <Text style={{ fontSize: 9, fontFamily: typography.fonts.bold, color: colors.success }}>This Device</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: typography.fonts.medium, color: colors.textMuted, marginTop: 4 }}>
                        IP Address: {session.ipAddress || '—'} • {session.location || 'Unknown Location'}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: typography.fonts.regular, color: colors.textLight, marginTop: 2 }}>
                        Last Active: {new Date(session.lastActivity).toLocaleString('en-IN')}
                      </Text>
                    </View>

                    {!isCurrent && (
                      <Pressable
                        onPress={() => handleTerminateSession(session.id)}
                        style={[styles.terminateBtn, { borderColor: colors.danger, borderRadius: radius.sm }]}
                      >
                        <Text style={{ color: colors.danger, fontSize: 11, fontFamily: typography.fonts.bold }}>
                          Terminate
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}

              {sortedSessions.length > 1 && (
                <Pressable
                  onPress={handleTerminateOthers}
                  style={[styles.terminateOthersBtn, { backgroundColor: `${colors.danger}12`, borderRadius: radius.md }]}
                >
                  <Ionicons name="log-out-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.danger, fontFamily: typography.fonts.bold, fontSize: 13 }}>
                    Logout Other Devices
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </InfoCard>
      </ScrollView>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: radius.lg, borderColor: colors.border, borderWidth: 1, padding: spacing.lg }]}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 18, fontFamily: typography.fonts.bold, color: colors.text }}>
                Change Password
              </Text>
              <Pressable onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: spacing.md }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Current Password</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />

              <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>Confirm New Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
                placeholderTextColor={colors.textLight}
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, backgroundColor: isDark ? colors.background : '#F8FAFC' }]}
              />
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: spacing.md }}>
              <Pressable
                onPress={() => setPasswordModalVisible(false)}
                style={{ paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.bold }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleChangePassword}
                disabled={passwordChanging}
                style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}
              >
                {passwordChanging && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />}
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  terminateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  terminateOthersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
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
