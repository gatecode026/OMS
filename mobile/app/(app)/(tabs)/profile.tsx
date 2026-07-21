/**
 * @file profile.tsx
 * @description Enterprise Profile Main Screen inside Bottom Tabs.
 *              Pixel-perfect match to approved mobile mockup.
 *              Loads all data from OMS backend via useProfile hook + authStore,
 *              supporting edit of personal Status/About and fullscreen photo viewing.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';

import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { Avatar } from '../../../src/shared/components/Avatar';
import { Badge, ErrorState, toast } from '../../../src/shared/components';
import { useNotificationsUnreadCount } from '../../../src/features/notifications';
import {
  useProfile,
  useUpdateProfilePhoto,
  useProfileCompleteness,
  MainProfileSkeleton,
  MenuCard,
  useActiveSessions,
  useTerminateSession,
  useTerminateOtherSessions,
} from '../../../src/features/profile';
import usePresenceStore from '../../../src/shared/store/presenceStore';
import { useUpdateStatus } from '../../../src/features/chat/hooks/useChat';
import chatApi from '../../../src/features/chat/api/chatApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const { colors, spacing, radius, shadows, typography, isDark } = useTheme();
  const { logout } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [changePicVisible, setChangePicVisible] = useState(false);
  const [fullscreenPicVisible, setFullscreenPicVisible] = useState(false);

  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // New Presence & Connection Health states
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [connectionHealthVisible, setConnectionHealthVisible] = useState(false);
  const [activeSessionsVisible, setActiveSessionsVisible] = useState(false);

  const [customStatusText, setCustomStatusText] = useState('');
  const [customStatusEmoji, setCustomStatusEmoji] = useState('💬');
  const [expiryMinutes, setExpiryMinutes] = useState<number | null>(60);
  
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [testPingResult, setTestPingResult] = useState<number | null>(null);

  const presenceStore = usePresenceStore();
  const updateStatusMutation = useUpdateStatus();

  const runPingTest = async () => {
    setIsTestingPing(true);
    setTestPingResult(null);
    let total = 0;
    try {
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await chatApi.pingServer();
        total += (Date.now() - start);
        await new Promise((r) => setTimeout(r, 200));
      }
      const avg = Math.round(total / 3);
      setTestPingResult(avg);
      presenceStore.setConnectionInfo({ ping: avg });
    } catch (e) {
      toast.error('Latency test failed');
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleSaveStatus = async () => {
    try {
      const expiresAt = expiryMinutes ? new Date(Date.now() + expiryMinutes * 60000).toISOString() : null;
      await updateStatusMutation.mutateAsync({
        status: 'available',
        emoji: customStatusEmoji,
        expiresInMinutes: expiryMinutes,
      });
      presenceStore.setCustomStatus({
        emoji: customStatusEmoji,
        text: customStatusText,
        expiresAt,
      });
      toast.success('Custom status updated!');
      setStatusModalVisible(false);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const { data: profile, isLoading, isError, refetch } = useProfile();
  const { mutateAsync: updateProfilePhoto } = useUpdateProfilePhoto();
  const completeness = useProfileCompleteness(profile);

  // Active sessions hooks
  const { data: sessions, isLoading: sessionsLoading } = useActiveSessions();
  const terminateSessionMut = useTerminateSession();
  const terminateOtherSessionsMut = useTerminateOtherSessions();

  const currentSessionId = sessions?.find((s: any) => s.isCurrent)?.id || null;

  const handleTerminateSession = async (id: string) => {
    try {
      await terminateSessionMut.mutateAsync(id);
      toast.success('Session terminated successfully');
    } catch (err) {
      toast.error('Failed to terminate session');
    }
  };

  const handleTerminateOthers = async () => {
    try {
      const keepId = currentSessionId || '';
      await terminateOtherSessionsMut.mutateAsync(keepId);
      toast.success('All other sessions terminated');
    } catch (err) {
      toast.error('Failed to terminate other sessions');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    setLogoutDialogVisible(false);
    await logout();
  };

  const uploadPhoto = async (base64Image: string | null) => {
    const targetUser = profile || authUser;
    if (!targetUser?.id) {
      setUploadError('User ID not found');
      setChangePicVisible(true);
      return;
    }
    setChangePicVisible(false);
    setUploadingPic(true);
    setUploadError(null);
    try {
      await updateProfilePhoto({
        employeeId: targetUser.id,
        base64Image,
      });
      toast.success('Profile picture updated successfully!');
      refetch();
    } catch (err: any) {
      console.error('Failed to upload profile picture:', err);
      setUploadError(err?.message || 'Error occurred while saving profile photo.');
      setChangePicVisible(true);
    } finally {
      setUploadingPic(false);
    }
  };

  const launchCamera = async () => {
    setUploadError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setUploadError('Camera access permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await uploadPhoto(base64Data);
    }
  };

  const launchGallery = async () => {
    setUploadError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setUploadError('Media library access permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await uploadPhoto(base64Data);
    }
  };

  const removePhoto = async () => {
    setUploadError(null);
    toast.info('Removing profile photo...');
    uploadPhoto('');
  };

  const handleChangeProfilePic = () => {
    setUploadError(null);
    setChangePicVisible(true);
  };

  const navigate = (path: string) => {
    router.push(path as any);
  };

  // ─── Merge backend profile with authStore user data ───────────────────────
  const authUser = useAuthStore((s) => s.user);
  const { data: unreadCount = 0 } = useNotificationsUnreadCount();
  const displayName = profile?.name || authUser?.name || 'Employee';
  const rawDesignation = profile?.designation || authUser?.designation || authUser?.role || '—';
  const displayDesignation = rawDesignation ? rawDesignation.charAt(0).toUpperCase() + rawDesignation.slice(1) : '—';
  const displayEmployeeCode = profile?.employeeCode || profile?.id || authUser?.employeeId || authUser?.id || '—';
  const displayEmail = profile?.email || authUser?.email || '—';
  const displayPhone = profile?.phone || authUser?.phone || '—';
  const displayDepartment = profile?.department || authUser?.department || '—';
  const displayAvatarUrl = profile?.avatarUrl || profile?.avatar || profile?.profilePhoto || (profile as any)?.photoUrl || (profile as any)?.image || (profile as any)?.profileImage || authUser?.avatarUrl || (authUser as any)?.avatar;

  const personalItems = [
    {
      title: 'Basic Information',
      subtitle: 'Name, email, phone, date of birth',
      icon: 'card-outline' as const,
      iconColor: '#6366F1',
      path: '/(app)/profile/personal',
    },
    {
      title: 'Address Information',
      subtitle: 'Current address and permanent address',
      icon: 'location-outline' as const,
      iconColor: '#8B5CF6',
      path: '/(app)/profile/address',
    },
    {
      title: 'Emergency Contact',
      subtitle: 'Add emergency contact details',
      icon: 'call-outline' as const,
      iconColor: colors.danger,
      path: '/(app)/profile/emergency',
    },
    {
      title: 'Bank Details',
      subtitle: 'Bank account and payment details',
      icon: 'business-outline' as const,
      iconColor: '#10B981',
      path: '/(app)/profile/bank-details',
    },
    {
      title: 'Identity Information',
      subtitle: 'Aadhaar, PAN and other identity details',
      icon: 'shield-checkmark-outline' as const,
      iconColor: colors.success,
      path: '/(app)/profile/documents',
    },
  ];

  const accountSecurityItems = [
    {
      title: 'Change Password',
      subtitle: 'Update your account password',
      icon: 'lock-closed-outline' as const,
      iconColor: '#6366F1',
      path: '/(app)/profile/security?action=password',
    },
    {
      title: 'Security & Login',
      subtitle: 'Manage 2FA, devices and login sessions',
      icon: 'shield-outline' as const,
      iconColor: colors.success,
      path: '/(app)/profile/security',
    },
  ];

  const isLight = !isDark;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ─── Header ─── */}
      <View
        style={[
          styles.headerRow,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.back()}
            style={{ padding: 4 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 20, fontFamily: typography.fonts.bold, color: colors.text }}>
            My Profile
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push('/notifications')}
            style={styles.iconButton}
            accessibilityLabel="Notifications"
            accessible
            accessibilityRole="button"
          >
            <Ionicons name="notifications" size={22} color={colors.text} />
            {unreadCount > 0 && (
              <Badge content={String(unreadCount)} style={styles.notificationBadge} />
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/attendance-qr' as any)} accessibilityLabel="View Attendance ID Pass">
            <Avatar
              source={displayAvatarUrl}
              name={displayName}
              size={32}
            />
          </Pressable>
        </View>
      </View>

      {/* ─── Content ───────────────────────────────────────────────────────── */}
      {isLoading && !refreshing ? (
        <ScrollView
          contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <MainProfileSkeleton />
        </ScrollView>
      ) : isError ? (
        <View style={styles.errorWrapper}>
          <ErrorState
            message="Could not load profile. Check your connection."
            onRetry={refetch}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Animated.View entering={FadeIn.duration(400)}>
            {/* ─── Profile Details Card ─── */}
            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.xl,
                  borderColor: colors.border,
                  borderWidth: 1,
                  marginHorizontal: spacing.lg,
                  marginTop: -20,
                  marginBottom: spacing.lg,
                  padding: spacing.lg,
                },
                shadows.medium,
              ]}
            >
              {/* Row with Avatar & Info */}
              <View style={styles.heroMainRow}>
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatarRing, { borderColor: '#22C55E', padding: 2, borderWidth: 3, borderRadius: 50 }]}>
                    <Pressable onPress={() => setFullscreenPicVisible(true)}>
                      <Avatar
                        source={displayAvatarUrl}
                        name={displayName}
                        size={76}
                        style={styles.avatar}
                      />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={handleChangeProfilePic}
                    style={[
                      styles.editAvatarBtn,
                      {
                        backgroundColor: '#FFFFFF',
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: radius.circular,
                        width: 28,
                        height: 28,
                      },
                      shadows.light,
                    ]}
                  >
                    <Ionicons name="camera-outline" size={14} color={colors.primary} />
                  </Pressable>
                </View>

                <View style={styles.heroInfoText}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: typography.fonts.bold,
                      color: colors.text,
                    }}
                  >
                    {displayName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: typography.fonts.medium,
                      color: colors.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {displayDesignation}
                  </Text>

                  {presenceStore.customStatus && (
                    <View
                      style={{
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                        borderRadius: radius.md,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        marginTop: 6,
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>{presenceStore.customStatus.emoji}</Text>
                      <Text style={{ fontSize: 12, color: colors.textLight, fontFamily: typography.fonts.medium }}>
                        {presenceStore.customStatus.text}
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.codeBadge,
                      { backgroundColor: `${colors.primary}08`, borderRadius: radius.md, marginTop: spacing.sm, alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: typography.fonts.semibold,
                        color: colors.primary,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      Employee ID: {displayEmployeeCode}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.inlineDivider, { backgroundColor: colors.border, marginVertical: spacing.lg }]} />

              {/* Contact and placement details */}
              <View style={styles.heroDetailsGrid}>
                <View style={styles.heroDetailRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.medium, flex: 1 }} numberOfLines={1}>{displayEmail}</Text>
                  <Ionicons name="call-outline" size={16} color={colors.primary} style={{ marginRight: 8, marginLeft: 16 }} />
                  <Text style={{ fontSize: 13, color: colors.text, fontFamily: typography.fonts.medium }}>{displayPhone}</Text>
                </View>

                <View style={[styles.heroDetailRow, { marginTop: spacing.md }]}>
                  <Ionicons name="business-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: typography.fonts.medium }}>
                    {displayDepartment}   •   {profile?.branch || authUser?.branch || 'Jaipur Office'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ─── Profile Completeness Card ─── */}
            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.xl,
                  borderColor: colors.border,
                  borderWidth: 1,
                  marginHorizontal: spacing.lg,
                  marginBottom: spacing.lg,
                  padding: spacing.lg,
                },
                shadows.medium,
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.semibold, color: colors.text }}>
                  Profile Completeness
                </Text>
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.primary }}>
                  {completeness.percentage}%
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: typography.fonts.regular, color: colors.textMuted, marginTop: 4 }}>
                Complete your profile to get better experience
              </Text>

              {/* Progress Bar */}
              <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: radius.circular, height: 6, marginTop: spacing.md }]}>
                <View
                  style={{
                    backgroundColor: colors.primary,
                    height: '100%',
                    borderRadius: radius.circular,
                    width: `${completeness.percentage}%`,
                  }}
                />
              </View>


            </View>

            {/* ─── Personal Information Group ─── */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: typography.fonts.bold, marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
              Personal Information
            </Text>
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
              {personalItems.map((item) => (
                <MenuCard
                  key={item.path}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  onPress={() => navigate(item.path)}
                />
              ))}
            </View>

            {/* ─── Account & Security Group ─── */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: typography.fonts.bold, marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
              Account & Security
            </Text>
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
              {accountSecurityItems.map((item) => (
                <MenuCard
                  key={item.title}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  onPress={() => navigate(item.path)}
                />
              ))}
            </View>

            {/* ─── Status & Presence Group ─── */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: typography.fonts.bold, marginHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
              Status & Presence
            </Text>
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
              <MenuCard
                title="Update Status / Availability"
                subtitle={presenceStore.customStatus ? `${presenceStore.customStatus.emoji} ${presenceStore.customStatus.text}` : 'Set custom text and emoji'}
                icon="happy-outline"
                iconColor="#D97706"
                onPress={() => setStatusModalVisible(true)}
              />
              <MenuCard
                title="Connection Health"
                subtitle={`State: ${presenceStore.connectionState} (${presenceStore.ping} ms)`}
                icon="cellular-outline"
                iconColor="#10B981"
                onPress={() => setConnectionHealthVisible(true)}
              />
              <MenuCard
                title="Active Sessions & Devices"
                subtitle="Manage active logins and trusted devices"
                icon="shield-checkmark-outline"
                iconColor="#6366F1"
                onPress={() => setActiveSessionsVisible(true)}
              />
            </View>

            {/* ─── Log Out Button ─── */}
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
              <Pressable
                onPress={() => setLogoutDialogVisible(true)}
                style={[
                  styles.logoutButton,
                  {
                    backgroundColor: colors.card,
                    borderRadius: radius.lg,
                    borderColor: colors.border,
                    borderWidth: 1,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.danger} style={{ marginRight: spacing.md }} />
                <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.semibold, color: colors.danger }}>
                  Log Out
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      )}

      {/* ─── FULLSCREEN AVATAR MODAL ─── */}
      <Modal
        visible={fullscreenPicVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenPicVisible(false)}
      >
        <View style={styles.fullscreenBackdrop}>
          <Pressable style={styles.fullscreenClose} onPress={() => setFullscreenPicVisible(false)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>

          {displayAvatarUrl ? (
            <Image
              source={{ uri: displayAvatarUrl }}
              style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40, borderRadius: 16 }}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.fullscreenAvatarPlaceholder, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <Text style={{ color: colors.text, fontSize: 32, fontFamily: typography.fonts.bold }}>
                {displayName.charAt(0)}
              </Text>
            </View>
          )}

          <View style={styles.fullscreenActions}>
            <Pressable
              onPress={() => {
                setFullscreenPicVisible(false);
                handleChangeProfilePic();
              }}
              style={styles.fullscreenActionBtn}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Change</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFullscreenPicVisible(false);
                removePhoto();
              }}
              style={[styles.fullscreenActionBtn, { backgroundColor: '#EF4444' }]}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Remove</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── LOGOUT CONFIRMATION MODAL ─── */}
      <Modal
        visible={logoutDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLogoutDialogVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.4)' }]}
          onPress={() => setLogoutDialogVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                width: '85%',
                alignItems: 'center',
                padding: spacing.xl,
                backgroundColor: colors.card,
                borderRadius: 24,
                borderColor: colors.border,
                borderWidth: 1,
              },
              shadows.heavy,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Pressable
              onPress={() => setLogoutDialogVisible(false)}
              style={{ position: 'absolute', top: 16, right: 16, padding: 4 }}
            >
              <Ionicons name="close" size={22} color={colors.textLight} />
            </Pressable>

            <View style={[styles.alertIconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', marginBottom: spacing.md }]}>
              <Ionicons name="log-out-outline" size={32} color={colors.danger} />
            </View>

            <Text style={{ fontSize: typography.sizes.h3, fontFamily: typography.fonts.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.xs }}>
              Log Out?
            </Text>

            <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.medium, color: colors.textMuted, lineHeight: 20, textAlign: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.sm }}>
              Are you sure you want to log out from OMS? You will need an active connection to sign back in.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Pressable
                onPress={() => setLogoutDialogVisible(false)}
                style={[styles.cancelBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14 }]}
              >
                <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.semibold, color: colors.textMuted }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleLogout}
                style={[styles.submitBtn, { flex: 1, backgroundColor: colors.danger, borderRadius: 14 }, shadows.light]}
              >
                <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.bold, color: '#FFFFFF' }}>
                  Log Out
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── CHANGE PHOTO OPTIONS SHEET ─── */}
      <Modal
        visible={changePicVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setChangePicVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.4)' }]}
          onPress={() => setChangePicVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                width: '85%',
                paddingHorizontal: 24,
                paddingVertical: 28,
                backgroundColor: colors.card,
                borderRadius: 16,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
              shadows.heavy,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 20, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: 8 }}>
              Change Profile Photo
            </Text>

            <Text style={{ fontSize: 14, fontFamily: typography.fonts.medium, color: colors.textMuted, lineHeight: 20, marginBottom: uploadError ? 16 : 28 }}>
              Choose a source to upload your profile picture:
            </Text>

            {uploadError && (
              <View style={styles.inlineErrorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.inlineErrorText}>{uploadError}</Text>
              </View>
            )}

            <View style={{ width: '100%', alignItems: 'flex-end', gap: 24 }}>
              <Pressable onPress={removePhoto} style={styles.flatActionBtn}>
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.primary, letterSpacing: 0.5 }}>
                  REMOVE CURRENT PHOTO
                </Text>
              </Pressable>

              <Pressable onPress={launchGallery} style={styles.flatActionBtn}>
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.primary, letterSpacing: 0.5 }}>
                  CHOOSE FROM GALLERY
                </Text>
              </Pressable>

              <Pressable onPress={launchCamera} style={styles.flatActionBtn}>
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.primary, letterSpacing: 0.5 }}>
                  TAKE PHOTO
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── CUSTOM STATUS MODAL ─── */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: 'rgba(15, 23, 42, 0.4)' }]}
          onPress={() => setStatusModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                width: '90%',
                padding: spacing.xl,
                backgroundColor: colors.card,
                borderRadius: 20,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 18, fontFamily: typography.fonts.bold, color: colors.text }}>
                Set Custom Status
              </Text>
              <Pressable onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Emoji Selection Row */}
            <Text style={{ fontSize: 12, fontFamily: typography.fonts.semibold, color: colors.textMuted, marginBottom: 8 }}>
              CHOOSE EMOJI
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
              {['💬', '💻', '🌴', '🚗', '🤒', '🗓️', '✈️', '🏃'].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => setCustomStatusEmoji(emoji)}
                  style={{
                    padding: 8,
                    borderRadius: radius.md,
                    backgroundColor: customStatusEmoji === emoji ? `${colors.primary}15` : 'transparent',
                    borderWidth: 1,
                    borderColor: customStatusEmoji === emoji ? colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Status Text Input */}
            <Text style={{ fontSize: 12, fontFamily: typography.fonts.semibold, color: colors.textMuted, marginBottom: 8 }}>
              STATUS MESSAGE
            </Text>
            <TextInput
              style={{
                height: 44,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.lg,
                paddingHorizontal: 12,
                color: colors.text,
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                marginBottom: spacing.md,
                fontFamily: typography.fonts.regular,
              }}
              placeholder="What's your status?"
              placeholderTextColor={colors.textMuted}
              value={customStatusText}
              onChangeText={setCustomStatusText}
            />

            {/* Expiry Selector */}
            <Text style={{ fontSize: 12, fontFamily: typography.fonts.semibold, color: colors.textMuted, marginBottom: 8 }}>
              CLEAR AFTER
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg }}>
              {[
                { label: '30 Min', value: 30 },
                { label: '1 Hour', value: 60 },
                { label: '4 Hours', value: 240 },
                { label: 'Today', value: 1440 },
                { label: 'Never', value: null },
              ].map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => setExpiryMinutes(opt.value)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: expiryMinutes === opt.value ? colors.primary : colors.border,
                    backgroundColor: expiryMinutes === opt.value ? `${colors.primary}08` : 'transparent',
                  }}
                >
                  <Text style={{ color: expiryMinutes === opt.value ? colors.primary : colors.textLight, fontSize: 12, fontFamily: typography.fonts.medium }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Pressable
                onPress={() => setStatusModalVisible(false)}
                style={[styles.cancelBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1 }]}
              >
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.semibold, color: colors.textMuted }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveStatus}
                style={[styles.submitBtn, { flex: 1, backgroundColor: colors.primary, borderRadius: 12, height: 40, justifyContent: 'center', alignItems: 'center' }]}
              >
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: '#FFFFFF' }}>
                  Save Status
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── CONNECTION HEALTH MODAL ─── */}
      <Modal
        visible={connectionHealthVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConnectionHealthVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: 'rgba(15, 23, 42, 0.4)' }]}
          onPress={() => setConnectionHealthVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                width: '90%',
                padding: spacing.xl,
                backgroundColor: colors.card,
                borderRadius: 20,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 18, fontFamily: typography.fonts.bold, color: colors.text }}>
                Connection Health
              </Text>
              <Pressable onPress={() => setConnectionHealthVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Connection Details List */}
            <View style={{ gap: 14, marginBottom: spacing.xl }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.medium }}>Status State</Text>
                <Text
                  style={{
                    color: presenceStore.connectionState === 'excellent' || presenceStore.connectionState === 'connected' ? colors.success : colors.danger,
                    fontFamily: typography.fonts.bold,
                    textTransform: 'capitalize',
                  }}
                >
                  {presenceStore.connectionState}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.medium }}>Active Latency (Ping)</Text>
                <Text style={{ color: colors.text, fontFamily: typography.fonts.bold }}>
                  {presenceStore.ping ? `${presenceStore.ping} ms` : '—'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.medium }}>Network Type</Text>
                <Text style={{ color: colors.text, fontFamily: typography.fonts.bold, textTransform: 'uppercase' }}>
                  {presenceStore.networkType}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.medium }}>Packet Loss</Text>
                <Text style={{ color: colors.success, fontFamily: typography.fonts.bold }}>0% (Excellent)</Text>
              </View>
            </View>

            {/* Real-time Latency Speed Test */}
            {testPingResult !== null && (
              <View style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderRadius: radius.lg, padding: 12, marginBottom: spacing.md, alignItems: 'center', width: '100%' }}>
                <Ionicons name="speedometer-outline" size={24} color={colors.primary} />
                <Text style={{ fontSize: 13, fontFamily: typography.fonts.semibold, color: colors.text, marginTop: 4 }}>
                  Measured Latency: {testPingResult} ms
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {testPingResult < 100 ? '⚡ Excellent response rate' : testPingResult < 300 ? '📶 Stable connection' : '⚠️ High latency detected'}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Pressable
                onPress={() => setConnectionHealthVisible(false)}
                style={[styles.cancelBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1 }]}
              >
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.semibold, color: colors.textMuted }}>
                  Close
                </Text>
              </Pressable>
              <Pressable
                onPress={runPingTest}
                disabled={isTestingPing}
                style={[styles.submitBtn, { flex: 1, backgroundColor: colors.primary, borderRadius: 12, height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }]}
              >
                {isTestingPing && <ActivityIndicator size="small" color="#FFF" />}
                <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: '#FFFFFF' }}>
                  {isTestingPing ? 'Testing...' : 'Run Ping Test'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── ACTIVE SESSIONS MODAL ─── */}
      <Modal
        visible={activeSessionsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveSessionsVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: 'rgba(15, 23, 42, 0.4)' }]}
          onPress={() => setActiveSessionsVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                width: '92%',
                maxHeight: '80%',
                padding: spacing.xl,
                backgroundColor: colors.card,
                borderRadius: 20,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 18, fontFamily: typography.fonts.bold, color: colors.text }}>
                Active Devices & Logins
              </Text>
              <Pressable onPress={() => setActiveSessionsVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
              {sessionsLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : sessions && sessions.length > 0 ? (
                sessions.map((sess: any) => (
                  <View
                    key={sess.id}
                    style={{
                      padding: 12,
                      borderRadius: radius.md,
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: colors.border,
                      borderWidth: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name={sess.deviceType?.toLowerCase().includes('phone') ? 'phone-portrait-outline' : 'desktop-outline'}
                      size={24}
                      color={colors.textMuted}
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.text }}>
                        {sess.deviceName || 'Unknown Device'}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        IP: {sess.ipAddress || '—'}
                      </Text>
                    </View>
                    {sess.id !== currentSessionId && (
                      <Pressable
                        onPress={() => handleTerminateSession(sess.id)}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    )}
                  </View>
                ))
              ) : (
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>
                  No active login sessions found.
                </Text>
              )}

              {sessions && sessions.length > 1 && (
                <Pressable
                  onPress={handleTerminateOthers}
                  style={[
                    styles.logoutButton,
                    {
                      borderColor: colors.danger,
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      marginTop: spacing.md,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Ionicons name="power-outline" size={16} color={colors.danger} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.danger, fontFamily: typography.fonts.bold }}>
                    Log Out From All Other Devices
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Uploading Spinner Overlay ─── */}
      <Modal
        visible={uploadingPic}
        transparent={true}
        animationType="fade"
      >
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(15, 23, 42, 0.6)' }]}>
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: typography.sizes.body, fontFamily: typography.fonts.semibold, color: colors.text, marginTop: spacing.md, textAlign: 'center' }}>
              Uploading profile photo...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 6,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  profileCard: {
    alignItems: 'stretch',
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfoText: {
    flex: 1,
    marginLeft: 20,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineDivider: {
    height: 1,
    width: '100%',
  },
  heroDetailsGrid: {
    width: '100%',
  },
  heroDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    overflow: 'hidden',
  },
  sectionHeading: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    alignItems: 'stretch',
  },
  alertIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatActionBtn: {
    paddingVertical: 8,
  },
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  inlineErrorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  fullscreenAvatarPlaceholder: {
    width: 280,
    height: 280,
    borderRadius: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenActions: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 20,
  },
  fullscreenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  avatarRing: {
    // Styling applied inline
  },
});
