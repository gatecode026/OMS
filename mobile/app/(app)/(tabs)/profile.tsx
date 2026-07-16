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
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';

import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import useBranding from '../../../src/shared/hooks/useBranding';
import { Avatar } from '../../../src/shared/components/Avatar';
import { ErrorState, toast } from '../../../src/shared/components';
import apiClient from '../../../src/shared/services/apiClient';
import { getSocket } from '../../../src/shared/services/socketManager';
import {
  useProfile,
  useUpdateProfilePhoto,
  useProfileCompleteness,
  MainProfileSkeleton,
  MenuCard,
} from '../../../src/features/profile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRESET_STATUSES = [
  { label: 'Available', value: 'available', emoji: '🟢' },
  { label: 'Busy', value: 'dnd', emoji: '🔴' },
  { label: 'In Meeting', value: 'dnd', emoji: '🗓️' },
  { label: 'Working Remotely', value: 'away', emoji: '🏠' },
  { label: 'Out of Office', value: 'away', emoji: '✈️' },
  { label: 'Offline', value: 'offline', emoji: '⚪' },
];

export default function ProfileScreen() {
  const { colors, spacing, radius, shadows, typography, isDark } = useTheme();
  const { logout, updateUser } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [changePicVisible, setChangePicVisible] = useState(false);
  const [fullscreenPicVisible, setFullscreenPicVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Status & About states
  const [currentStatus, setCurrentStatus] = useState('available');
  const [currentEmoji, setCurrentEmoji] = useState('🟢');
  const [customStatusText, setCustomStatusText] = useState('');
  const [aboutText, setAboutText] = useState('Available');

  const { data: profile, isLoading, isError, refetch } = useProfile();
  const { mutateAsync: updateProfilePhoto } = useUpdateProfilePhoto();
  const completeness = useProfileCompleteness(profile);

  // Load custom bio/about from SecureStore & sync statuses
  useEffect(() => {
    if (profile?.id) {
      SecureStore.getItemAsync(`oms_about_${profile.id}`).then((val: string | null) => {
        if (val) setAboutText(val);
        else if (profile.experience) setAboutText(profile.experience);
      });
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile) {
      setCurrentStatus(profile.chatStatus || 'available');
      setCurrentEmoji(profile.statusEmoji || '🟢');
    }
  }, [profile]);

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
      const updated = await updateProfilePhoto({
        employeeId: targetUser.id,
        base64Image,
      });
      const newAvatarUrl = updated?.avatar || updated?.photoUrl || null;
      updateUser({ avatarUrl: newAvatarUrl });
      toast.success('Profile picture updated successfully!');
      
      // Emit socket update for realtime updates
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('profile_photo_updated', { avatarUrl: newAvatarUrl });
      }
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

  const handleUpdateStatus = async (newStatus: string, emoji: string) => {
    const targetId = profile?.id || authUser?.id;
    if (!targetId) return;

    try {
      // 1. Persist in MongoDB
      await apiClient.put(`/api/v1/employees/${targetId}`, {
        chatStatus: newStatus,
        statusEmoji: emoji,
      });

      // 2. Emit Socket.IO event for instant sync
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('set_status', { status: newStatus, emoji, expiresInMinutes: 0 });
      }

      setCurrentStatus(newStatus);
      setCurrentEmoji(emoji);
      setStatusModalVisible(false);
      toast.success('Status updated successfully');
      refetch();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveAbout = async () => {
    const targetId = profile?.id || authUser?.id;
    if (!targetId) return;

    try {
      // Save locally in SecureStore
      await SecureStore.setItemAsync(`oms_about_${targetId}`, aboutText);

      // Persist in Mongoose 'experience' field (fallback field for About/Bio text)
      await apiClient.put(`/api/v1/employees/${targetId}`, {
        experience: aboutText,
      });

      // Emit socket notification
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('set_about', { about: aboutText });
      }

      setAboutModalVisible(false);
      toast.success('About info updated');
      refetch();
    } catch (e) {
      toast.error('Failed to save about text');
    }
  };

  const navigate = (path: string) => {
    router.push(path as any);
  };

  // ─── Merge backend profile with authStore user data ───────────────────────
  const authUser = useAuthStore((s) => s.user);
  const displayName = profile?.name || authUser?.name || 'Employee';
  const rawDesignation = profile?.designation || authUser?.designation || authUser?.role || '—';
  const displayDesignation = rawDesignation ? rawDesignation.charAt(0).toUpperCase() + rawDesignation.slice(1) : '—';
  const displayEmployeeCode = profile?.employeeCode || profile?.id || authUser?.employeeId || authUser?.id || '—';
  const displayEmail = profile?.email || authUser?.email || '—';
  const displayPhone = profile?.phone || authUser?.phone || '—';
  const displayDepartment = profile?.department || authUser?.department || '—';
  const displayManager = profile?.reportingManagerName || profile?.reportingManager || '—';
  const displayAvatarUrl = profile?.avatarUrl || profile?.profilePhoto || authUser?.avatarUrl;

  // ─── Menu Items Sections ──────────────────────────────────────────────────
  const personalItems = [
    {
      title: 'Personal Information',
      icon: 'person-outline' as const,
      iconColor: colors.primary,
      path: '/(app)/profile/personal',
    },
    {
      title: 'Professional Information',
      icon: 'briefcase-outline' as const,
      iconColor: '#6366F1',
      path: '/(app)/profile/professional',
    },
    {
      title: 'Contact Information',
      icon: 'call-outline' as const,
      iconColor: colors.info,
      path: '/(app)/profile/contact',
    },
    {
      title: 'Address',
      icon: 'location-outline' as const,
      iconColor: '#8B5CF6',
      path: '/(app)/profile/address',
    },
    {
      title: 'Documents',
      icon: 'document-text-outline' as const,
      iconColor: '#EC4899',
      path: '/(app)/profile/documents',
    },
    {
      title: 'Emergency Contacts',
      icon: 'people-outline' as const,
      iconColor: colors.danger,
      path: '/(app)/profile/emergency',
    },
    {
      title: 'Bank Details',
      icon: 'card-outline' as const,
      iconColor: '#10B981',
      path: '/(app)/profile/bank-details',
    },
  ];

  const appSettingsItems = [
    {
      title: 'Security',
      icon: 'shield-checkmark-outline' as const,
      iconColor: colors.success,
      path: '/(app)/profile/security',
    },
    {
      title: 'Appearance',
      icon: 'color-palette-outline' as const,
      iconColor: '#EC4899',
      path: '/(app)/profile/security', // Redirect to same container for layout options
    },
    {
      title: 'Help & Support',
      icon: 'help-circle-outline' as const,
      iconColor: '#F97316',
      path: '/(app)/profile/help',
    },
  ];

  const isLight = !isDark;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* ─── Custom Header ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.headerSide}
          accessibilityLabel="Go back"
          accessible
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <Text
          style={{
            fontSize: typography.sizes.h2,
            fontFamily: typography.fonts.bold,
            color: colors.text,
            flex: 1,
            textAlign: 'center',
          }}
        >
          Profile Settings
        </Text>

        <Pressable
          onPress={() => navigate('/(app)/profile/security')}
          style={styles.headerSide}
          accessibilityLabel="Settings"
          accessible
          accessibilityRole="button"
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
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
                  marginHorizontal: spacing.lg,
                  marginBottom: spacing.lg,
                },
                shadows.medium,
              ]}
            >
              {/* Large Profile Picture */}
              <View style={styles.avatarWrapper}>
                <Pressable onPress={() => setFullscreenPicVisible(true)}>
                  <Avatar
                    source={displayAvatarUrl}
                    name={displayName}
                    size={110}
                    style={styles.avatar}
                  />
                </Pressable>
                
                {/* Online indicator dot */}
                <View
                  style={[
                    styles.onlineDot,
                    {
                      backgroundColor: currentStatus === 'available' ? colors.success : colors.textLight,
                      borderColor: colors.card,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                    },
                  ]}
                />

                {/* Edit avatar floating plus badge */}
                <Pressable
                  onPress={handleChangeProfilePic}
                  style={[
                    styles.editAvatarBtn,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.card,
                      borderRadius: radius.circular,
                      width: 32,
                      height: 32,
                    },
                    shadows.medium,
                  ]}
                >
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                </Pressable>
              </View>

              <Text
                style={{
                  fontSize: 20,
                  fontFamily: typography.fonts.bold,
                  color: colors.text,
                  textAlign: 'center',
                  marginTop: spacing.md,
                }}
              >
                {displayName}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: typography.fonts.medium,
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {displayDesignation} · {displayDepartment}
              </Text>

              {/* Employee ID Badge */}
              <View
                style={[
                  styles.codeBadge,
                  { backgroundColor: `${colors.primary}18`, borderRadius: radius.circular, marginTop: spacing.md },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: typography.fonts.semibold,
                    color: colors.primary,
                  }}
                >
                  ID: {displayEmployeeCode}
                </Text>
              </View>
            </View>

            {/* ─── WHATSAPP STYLE STATUS & ABOUT SECTIONS ─── */}
            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: radius.xl,
                  borderColor: colors.border,
                  marginHorizontal: spacing.lg,
                  marginBottom: spacing.lg,
                  alignItems: 'stretch',
                  paddingVertical: 16,
                },
                shadows.medium,
              ]}
            >
              {/* 1. Status Section */}
              <Pressable
                onPress={() => setStatusModalVisible(true)}
                style={({ pressed }) => [
                  styles.sectionItemPress,
                  pressed && { backgroundColor: isLight ? '#F1F5F9' : '#1E293B' },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.statusIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Text style={{ fontSize: 18 }}>{currentEmoji}</Text>
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fonts.semibold, textTransform: 'uppercase' }}>
                      Status
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.text, fontFamily: typography.fonts.bold, marginTop: 2 }}>
                      {PRESET_STATUSES.find((s) => s.value === currentStatus)?.label || 'Available'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </Pressable>

              <View style={[styles.inlineDivider, { backgroundColor: colors.border }]} />

              {/* 2. About Section */}
              <Pressable
                onPress={() => setAboutModalVisible(true)}
                style={({ pressed }) => [
                  styles.sectionItemPress,
                  pressed && { backgroundColor: isLight ? '#F1F5F9' : '#1E293B' },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.statusIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fonts.semibold, textTransform: 'uppercase' }}>
                      About / Bio
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.text, fontFamily: typography.fonts.medium, marginTop: 2 }} numberOfLines={1}>
                      {aboutText}
                    </Text>
                  </View>
                </View>
                <Ionicons name="pencil" size={14} color={colors.primary} />
              </Pressable>
            </View>

            {/* ─── Personal & Professional Info Grid ─── */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
              PERSONAL & PROFESSIONAL
            </Text>
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
              {personalItems.map((item) => (
                <MenuCard
                  key={item.path}
                  title={item.title}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  onPress={() => navigate(item.path)}
                />
              ))}
            </View>

            {/* ─── App Settings Section ─── */}
            <Text style={[styles.sectionHeading, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
              APP SETTINGS
            </Text>
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
              {appSettingsItems.map((item) => (
                <MenuCard
                  key={item.title}
                  title={item.title}
                  icon={item.icon}
                  iconColor={item.iconColor}
                  onPress={() => navigate(item.path)}
                />
              ))}
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

      {/* ─── STATUS SELECTOR MODAL ─── */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setStatusModalVisible(false)}>
          <Pressable
            style={[styles.bottomSheetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 18, color: colors.text, fontFamily: typography.fonts.bold, marginBottom: 16, textAlign: 'center' }}>
              Set Your Status
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {PRESET_STATUSES.map((statusItem) => {
                const isSelected = currentStatus === statusItem.value;
                return (
                  <Pressable
                    key={statusItem.value}
                    onPress={() => handleUpdateStatus(statusItem.value, statusItem.emoji)}
                    style={[
                      styles.statusSelectRow,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: `${colors.primary}10` },
                    ]}
                  >
                    <Text style={{ fontSize: 20, marginRight: 12 }}>{statusItem.emoji}</Text>
                    <Text style={{ flex: 1, fontSize: 15, color: colors.text, fontFamily: isSelected ? typography.fonts.bold : typography.fonts.medium }}>
                      {statusItem.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── ABOUT / BIO EDIT MODAL ─── */}
      <Modal
        visible={aboutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAboutModalVisible(false)}>
          <Pressable
            style={[styles.editAboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 16, color: colors.text, fontFamily: typography.fonts.bold, marginBottom: 12 }}>
              Edit About / Bio
            </Text>

            <TextInput
              multiline
              maxLength={150}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textLight}
              value={aboutText}
              onChangeText={setAboutText}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                color: colors.text,
                fontFamily: typography.fonts.regular,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable onPress={() => setAboutModalVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.bold }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveAbout}
                style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 20 }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerSide: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    borderWidth: 2.5,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sectionItemPress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 24,
    marginBottom: 10,
    marginTop: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  bottomSheetCard: {
    width: '90%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  editAboutCard: {
    width: '85%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  statusSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  fullscreenAvatarPlaceholder: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SCREEN_WIDTH - 40,
    marginTop: 30,
    gap: 16,
  },
  fullscreenActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalCard: {
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  alertIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  submitBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    width: '100%',
  },
  inlineErrorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
});
