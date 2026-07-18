/**
 * @file chat-profile.tsx
 * @description Enterprise Chat Profile Screen (PRD 02).
 *              Premium WhatsApp/Teams-style profile for direct conversations.
 *              100% realtime via Socket.IO presence store — no dummy data.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Modal,
  Switch,
  Image,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import apiClient from '../../../src/shared/services/apiClient';
import { Avatar } from '../../../src/shared/components/Avatar';
import { toast } from '../../../src/shared/components/Toast';
import { usePresenceStore } from '../../../src/shared/store/presenceStore';
import { useChatSettingsStore } from '../../../src/shared/store/chatSettingsStore';
import { useCall } from '../../../src/shared/providers/CallProvider';
import {
  useConversations,
  useChatMessages,
  useBlockUser,
  useUnblockUser,
  useBlockedUsers,
  useClearChat,
} from '../../../src/features/chat';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Status Color Map ────────────────────────────────────────────────────────
const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return '#10B981';
    case 'away': return '#F59E0B';
    case 'dnd': return '#EF4444';
    case 'busy': return '#F97316';
    case 'in_meeting': return '#8B5CF6';
    case 'on_call': return '#3B82F6';
    default: return '#94A3B8';
  }
};

const getStatusLabel = (status: string, isOnline: boolean, isOnChatScreen: boolean) => {
  if (!isOnline) return 'Offline';
  switch (status) {
    case 'available': return isOnChatScreen ? 'Online' : 'Available';
    case 'away': return 'Away';
    case 'dnd': return 'Do Not Disturb';
    case 'busy': return 'Busy';
    case 'in_meeting': return 'In Meeting';
    case 'on_call': return 'On Call';
    default: return 'Online';
  }
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const SkeletonRow = ({ width, height = 14, style }: { width: number; height?: number; style?: any }) => {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        { width, height, borderRadius: 7, backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
        style,
      ]}
    />
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title }: { title: string }) => {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      style={{
        fontSize: 12,
        fontFamily: typography.fonts.bold,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
      }}
    >
      {title}
    </Text>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({
  icon,
  iconColor,
  label,
  value,
  onPress,
  rightElement,
  danger,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) => {
  const { colors, spacing, typography, radius, isDark } = useTheme();
  const textColor = danger ? colors.danger : colors.text;
  const iconClr = danger ? colors.danger : (iconColor || colors.primary);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      style={({ pressed }) => [
        styles.infoRow,
        {
          backgroundColor: pressed ? (isDark ? '#1E293B' : '#F8FAFC') : 'transparent',
          paddingHorizontal: spacing.lg,
          paddingVertical: 14,
        },
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <View style={[styles.infoIconCircle, { backgroundColor: `${iconClr}15` }]}>
        <Ionicons name={icon as any} size={18} color={iconClr} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: typography.fonts.medium }}>
          {label}
        </Text>
        {value !== undefined && (
          <Text style={{ fontSize: 14, color: textColor, fontFamily: typography.fonts.semibold, marginTop: 1 }} numberOfLines={2}>
            {value}
          </Text>
        )}
      </View>
      {rightElement
        ? rightElement
        : onPress
          ? <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          : null}
    </Pressable>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────
const Divider = () => {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 20 }} />;
};

// ─── Card Wrapper ─────────────────────────────────────────────────────────────
const Card = ({ children }: { children: React.ReactNode }) => {
  const { colors, spacing, radius, shadows } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
        },
        shadows.light,
      ]}
    >
      {children}
    </View>
  );
};

// ─── Quick Action Button ───────────────────────────────────────────────────────
const QuickAction = ({
  icon,
  label,
  onPress,
  color,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}) => {
  const { colors, typography, radius, isDark } = useTheme();
  const clr = color || colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickActionBtn,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.quickActionCircle, { backgroundColor: `${clr}15` }]}>
        <Ionicons name={icon as any} size={22} color={clr} />
      </View>
      <Text style={{ fontSize: 11, color: clr, fontFamily: typography.fonts.semibold, marginTop: 6, textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════
export default function ChatProfileScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, shadows, typography, isDark } = useTheme();
  const authUser = useAuthStore((s) => s.user);

  const { initiateCall } = useCall();

  // ── Zustand Stores ──────────────────────────────────────────────────────────
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const statuses = usePresenceStore((s) => s.statuses);
  const chatscreenUsers = usePresenceStore((s) => s.chatscreenUsers);

  const { isMuted, toggleMuteConversation, getWallpaper, saveToGallery, setSaveToGallery } =
    useChatSettingsStore();

  // ── UI State ────────────────────────────────────────────────────────────────
  const [fullscreenPhoto, setFullscreenPhoto] = useState(false);
  const [blockSheetVisible, setBlockSheetVisible] = useState(false);
  const [clearSheetVisible, setClearSheetVisible] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: conversations = [] } = useConversations();
  const { data: dbMessages = [] } = useChatMessages(conversationId || '');
  const { data: blockedData, refetch: refetchBlocked } = useBlockedUsers();
  const blockedList = blockedData?.blockedUsers || [];

  const { mutate: blockUser, isPending: isBlocking } = useBlockUser();
  const { mutate: unblockUser, isPending: isUnblocking } = useUnblockUser();
  const { mutate: clearChat, isPending: isClearing } = useClearChat();

  // ── Derived Conversation Data ────────────────────────────────────────────────
  const conversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId]
  );

  const targetParticipant = useMemo(() => {
    if (!conversation || conversation.type !== 'direct') return null;
    return conversation.participants.find((p) => p.employeeId !== authUser?.id) || null;
  }, [conversation, authUser]);

  const targetEmployeeId = targetParticipant?.employeeId || null;

  // ── Employee Profile ─────────────────────────────────────────────────────────
  const { data: employee, isLoading: isEmployeeLoading } = useQuery({
    queryKey: ['chat', 'profile', targetEmployeeId],
    queryFn: async () => {
      if (!targetEmployeeId) return null;
      const res = await apiClient.get(`/api/v1/employees/${targetEmployeeId}`);
      return res.data?.data || res.data || null;
    },
    enabled: !!targetEmployeeId,
    staleTime: 1000 * 60 * 5,
  });

  // ── Presence ─────────────────────────────────────────────────────────────────
  const isOnline = targetEmployeeId ? onlineUserIds.has(targetEmployeeId) : false;
  const presence = targetEmployeeId ? statuses[targetEmployeeId] : null;
  const currentStatus = isOnline ? (presence?.status || 'available') : 'offline';
  const statusEmoji = isOnline ? (presence?.emoji || null) : null;
  const isOnChatScreen = targetEmployeeId ? !!chatscreenUsers[targetEmployeeId] : false;

  const statusLabel = getStatusLabel(currentStatus, isOnline, isOnChatScreen);
  const dotColor = getStatusColor(currentStatus);

  // ── Display Values ────────────────────────────────────────────────────────────
  const displayName = employee?.name || targetParticipant?.name || 'Contact';
  const displayAvatar = employee?.avatarUrl || employee?.profilePhoto || (targetParticipant as any)?.avatar || null;
  const displayAbout = employee?.about || employee?.bio || '—';
  const displayDesignation = employee?.designation || '—';
  const displayDepartment = employee?.department || employee?.departmentName || '—';
  const displayCompany = employee?.companyName || employee?.company || '—';
  const displayBranch = employee?.branch || '—';
  const displayEmployeeCode = employee?.employeeCode || employee?.id || '—';
  const displayUsername = employee?.username || employee?.email?.split('@')[0] || '—';
  const displayJoinedDate = employee?.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  const displayManager = employee?.reportingManager?.name || employee?.managerId || '—';

  // ── Media & Starred Counts ────────────────────────────────────────────────────
  const mediaTotalCount = useMemo(() => {
    return dbMessages.filter(
      (m) => !m.isDeleted && (m.type === 'image' || m.type === 'file' || m.type === 'audio')
    ).length;
  }, [dbMessages]);

  const starredCount = useMemo(() => {
    return dbMessages.filter(
      (m) => !m.isDeleted && m.starredBy?.includes(authUser?.id || '')
    ).length;
  }, [dbMessages, authUser]);

  // ── Block Status ──────────────────────────────────────────────────────────────
  const isBlocked = useMemo(
    () => (targetEmployeeId ? blockedList.some((b) => b.id === targetEmployeeId) : false),
    [blockedList, targetEmployeeId]
  );

  const conversationMuted = conversationId ? isMuted(conversationId) : false;

  // ── Actions ────────────────────────────────────────────────────────────────────
  const handleVoiceCall = useCallback(() => {
    if (!targetEmployeeId || !targetParticipant) {
      toast.error('Cannot initiate call: User not found.');
      return;
    }
    initiateCall(targetEmployeeId, 'audio', conversationId || '');
    router.push('/(app)/call' as any);
  }, [targetEmployeeId, targetParticipant, displayName, displayAvatar, initiateCall, router]);

  const handleVideoCall = useCallback(() => {
    if (!targetEmployeeId || !targetParticipant) {
      toast.error('Cannot initiate video call: User not found.');
      return;
    }
    initiateCall(targetEmployeeId, 'video', conversationId || '');
    router.push('/(app)/call' as any);
  }, [targetEmployeeId, targetParticipant, displayName, displayAvatar, initiateCall, router]);

  const handleMessage = useCallback(() => {
    router.back();
  }, [router]);

  const handleSearch = useCallback(() => {
    router.back();
    // Navigate with search param — let the chat screen handle it
    router.push(`/(app)/chat/${conversationId}?search=true` as any);
  }, [router, conversationId]);

  const handleBlockConfirm = useCallback(() => {
    if (!targetEmployeeId) return;
    setBlockSheetVisible(false);
    if (isBlocked) {
      unblockUser(targetEmployeeId, {
        onSuccess: () => { refetchBlocked(); toast.success('User unblocked successfully.'); },
        onError: () => toast.error('Failed to unblock user.'),
      });
    } else {
      blockUser(targetEmployeeId, {
        onSuccess: () => { refetchBlocked(); toast.success('User blocked.'); },
        onError: () => toast.error('Failed to block user.'),
      });
    }
  }, [targetEmployeeId, isBlocked, blockUser, unblockUser, refetchBlocked]);

  const handleClearChatConfirm = useCallback(() => {
    if (!conversationId) return;
    setClearSheetVisible(false);
    clearChat(conversationId, {
      onSuccess: () => toast.success('Chat history cleared.'),
      onError: () => toast.error('Failed to clear chat.'),
    });
  }, [conversationId, clearChat]);

  const handleShareContact = useCallback(async () => {
    try {
      await Share.share({
        title: `${displayName} – OMS Contact`,
        message: `${displayName}\n${displayDesignation} @ ${displayCompany}\nEmployee Code: ${displayEmployeeCode}`,
      });
    } catch {
      toast.error('Could not share contact.');
    }
  }, [displayName, displayDesignation, displayCompany, displayEmployeeCode]);

  // ─── Loading State ────────────────────────────────────────────────────────────
  if (isEmployeeLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {/* Header skeleton */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: 17, fontFamily: typography.fonts.bold, color: colors.text }}>Chat Profile</Text>
          <View style={styles.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={{ paddingTop: 32, alignItems: 'center', paddingHorizontal: 20 }}>
          <SkeletonRow width={96} height={96} style={{ borderRadius: 48, marginBottom: 16 }} />
          <SkeletonRow width={160} height={20} style={{ marginBottom: 10 }} />
          <SkeletonRow width={100} height={14} style={{ marginBottom: 32 }} />
          <SkeletonRow width={SCREEN_WIDTH - 40} height={100} style={{ borderRadius: 16, marginBottom: 16 }} />
          <SkeletonRow width={SCREEN_WIDTH - 40} height={80} style={{ borderRadius: 16, marginBottom: 16 }} />
          <SkeletonRow width={SCREEN_WIDTH - 40} height={120} style={{ borderRadius: 16 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ fontSize: 17, fontFamily: typography.fonts.bold, color: colors.text }}>
          Chat Profile
        </Text>
        <Pressable onPress={handleShareContact} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Share contact">
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      >
        {/* ─── HERO AVATAR SECTION ──────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroSection}>
          {/* Avatar */}
          <Pressable onPress={() => setFullscreenPhoto(true)} style={styles.avatarContainer}>
            <Avatar name={displayName} size={96} source={displayAvatar || undefined} style={styles.avatar} />
            {/* Animated presence ring */}
            <View
              style={[
                styles.presenceRing,
                { borderColor: dotColor, backgroundColor: dotColor },
              ]}
            />
          </Pressable>

          {/* Name + Star Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
            <Text style={{ fontSize: 22, fontFamily: typography.fonts.bold, color: colors.text }}>
              {displayName}
            </Text>
            {employee?.isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </View>

          {/* Status text with emoji */}
          <Text style={{ fontSize: 14, fontFamily: typography.fonts.semibold, color: dotColor, marginTop: 4 }}>
            {statusEmoji ? `${statusEmoji} ` : ''}{statusLabel}
          </Text>

          {/* Designation */}
          {displayDesignation !== '—' && (
            <Text style={{ fontSize: 13, fontFamily: typography.fonts.medium, color: colors.textMuted, marginTop: 2 }}>
              {displayDesignation} {displayCompany !== '—' ? `at ${displayCompany}` : ''}
            </Text>
          )}
        </Animated.View>

        {/* ─── QUICK ACTIONS ───────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350).delay(100)}>
          <Card>
            <View style={styles.quickActionsRow}>
              <QuickAction icon="chatbubble-outline" label="Message" onPress={handleMessage} color={colors.primary} />
              <QuickAction icon="call-outline" label="Voice Call" onPress={handleVoiceCall} color="#10B981" />
              <QuickAction icon="videocam-outline" label="Video Call" onPress={handleVideoCall} color="#6366F1" />
              <QuickAction icon="search-outline" label="Search" onPress={handleSearch} color="#F59E0B" />
            </View>
          </Card>
        </Animated.View>

        {/* ─── CHAT INFO ───────────────────────────────────────────────────── */}
        <SectionHeader title="Chat Info" />
        <Animated.View entering={FadeInDown.duration(350).delay(150)}>
          <Card>
            <InfoRow
              icon="at-outline"
              iconColor="#6366F1"
              label="Username"
              value={displayUsername}
              rightElement={
                <Pressable
                  onPress={() => {
                    // copy to clipboard would need expo-clipboard
                    toast.info(`Username: ${displayUsername}`);
                  }}
                >
                  <Ionicons name="copy-outline" size={16} color={colors.textLight} />
                </Pressable>
              }
            />
            <Divider />
            <InfoRow
              icon="chatbubble-ellipses-outline"
              iconColor="#8B5CF6"
              label="About"
              value={displayAbout}
              onPress={() => {}}
            />
            <Divider />
            <InfoRow
              icon="briefcase-outline"
              iconColor="#F59E0B"
              label="Department"
              value={displayDepartment}
              onPress={() => {}}
            />
            <Divider />
            <InfoRow
              icon="ellipse-outline"
              iconColor={dotColor}
              label="Status"
              value={statusLabel}
              onPress={() => {}}
            />
          </Card>
        </Animated.View>

        {/* ─── MEDIA, LINKS & DOCS ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350).delay(200)}>
          <Card>
            <Pressable
              onPress={() => router.push(`/chat/shared-media?id=${conversationId}` as any)}
              style={({ pressed }) => [
                styles.summaryRow,
                { opacity: pressed ? 0.7 : 1, paddingHorizontal: spacing.lg, paddingVertical: 14 },
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: '#6366F115' }]}>
                <Ionicons name="images-outline" size={18} color="#6366F1" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.text, marginLeft: 12 }}>
                Media, Links & Docs
              </Text>
              <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: colors.primary, marginRight: 8 }}>
                {mediaTotalCount}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
            <Divider />
            <Pressable
              onPress={() => router.push(`/chat/contact-info?id=${conversationId}` as any)}
              style={({ pressed }) => [
                styles.summaryRow,
                { opacity: pressed ? 0.7 : 1, paddingHorizontal: spacing.lg, paddingVertical: 14 },
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: '#F59E0B15' }]}>
                <Ionicons name="star-outline" size={18} color="#F59E0B" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.text, marginLeft: 12 }}>
                Starred Messages
              </Text>
              <Text style={{ fontSize: 14, fontFamily: typography.fonts.bold, color: '#F59E0B', marginRight: 8 }}>
                {starredCount}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          </Card>
        </Animated.View>

        {/* ─── ABOUT SECTION (extended) ────────────────────────────────────── */}
        {(displayCompany !== '—' || displayBranch !== '—' || displayManager !== '—') && (
          <>
            <SectionHeader title="Organisation" />
            <Animated.View entering={FadeInDown.duration(350).delay(220)}>
              <Card>
                {displayCompany !== '—' && (
                  <>
                    <InfoRow icon="business-outline" iconColor="#10B981" label="Company" value={displayCompany} />
                    <Divider />
                  </>
                )}
                {displayBranch !== '—' && (
                  <>
                    <InfoRow icon="location-outline" iconColor="#3B82F6" label="Branch" value={displayBranch} />
                    <Divider />
                  </>
                )}
                {displayManager !== '—' && (
                  <>
                    <InfoRow icon="person-outline" iconColor="#8B5CF6" label="Reporting Manager" value={displayManager} />
                    <Divider />
                  </>
                )}
                {displayEmployeeCode !== '—' && (
                  <>
                    <InfoRow icon="card-outline" iconColor="#6366F1" label="Employee ID" value={displayEmployeeCode} />
                    <Divider />
                  </>
                )}
                {displayJoinedDate !== '—' && (
                  <InfoRow icon="calendar-outline" iconColor="#F59E0B" label="Joined Date" value={displayJoinedDate} />
                )}
              </Card>
            </Animated.View>
          </>
        )}

        {/* ─── CHAT SETTINGS ───────────────────────────────────────────────── */}
        <SectionHeader title="Chat Settings" />
        <Animated.View entering={FadeInDown.duration(350).delay(250)}>
          <Card>
            {/* Mute Notifications */}
            <View style={[styles.summaryRow, { paddingHorizontal: spacing.lg, paddingVertical: 14 }]}>
              <View style={[styles.infoIconCircle, { backgroundColor: '#6366F115' }]}>
                <Ionicons name="notifications-outline" size={18} color="#6366F1" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.text, marginLeft: 12 }}>
                Mute Notifications
              </Text>
              <Switch
                value={conversationMuted}
                onValueChange={() => {
                  if (conversationId) {
                    toggleMuteConversation(conversationId);
                    toast.success(conversationMuted ? 'Notifications unmuted.' : 'Notifications muted.');
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Divider />

            {/* Disappearing Messages */}
            <Pressable
              onPress={() => router.push(`/chat/settings?id=${conversationId}` as any)}
              style={({ pressed }) => [
                styles.summaryRow,
                { opacity: pressed ? 0.7 : 1, paddingHorizontal: spacing.lg, paddingVertical: 14 },
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: '#10B98115' }]}>
                <Ionicons name="time-outline" size={18} color="#10B981" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.text, marginLeft: 12 }}>
                Disappearing Messages
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, fontFamily: typography.fonts.medium, marginRight: 6 }}>
                Off
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
            <Divider />

            {/* Chat Wallpaper */}
            <Pressable
              onPress={() => router.push(`/chat/settings?id=${conversationId}` as any)}
              style={({ pressed }) => [
                styles.summaryRow,
                { opacity: pressed ? 0.7 : 1, paddingHorizontal: spacing.lg, paddingVertical: 14 },
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: '#8B5CF615' }]}>
                <Ionicons name="image-outline" size={18} color="#8B5CF6" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.text, marginLeft: 12 }}>
                Chat Wallpaper
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
            <Divider />

            {/* Save to Camera Roll */}
            <View style={[styles.summaryRow, { paddingHorizontal: spacing.lg, paddingVertical: 14 }]}>
              <View style={[styles.infoIconCircle, { backgroundColor: '#3B82F615' }]}>
                <Ionicons name="download-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.text, marginLeft: 12 }}>
                Save to Camera Roll
              </Text>
              <Switch
                value={saveToGallery}
                onValueChange={(v) => {
                  setSaveToGallery(v);
                  toast.success(v ? 'Media will auto-save to gallery.' : 'Auto-save disabled.');
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>
        </Animated.View>

        {/* ─── DANGER ZONE ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350).delay(300)}>
          <Card>
            <Pressable
              onPress={() => setClearSheetVisible(true)}
              style={({ pressed }) => [
                styles.summaryRow,
                { opacity: pressed ? 0.7 : 1, paddingHorizontal: spacing.lg, paddingVertical: 14 },
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.danger, marginLeft: 12 }}>
                Clear Chat
              </Text>
            </Pressable>
            <Divider />
            <Pressable
              onPress={() => setBlockSheetVisible(true)}
              style={({ pressed }) => [
                styles.summaryRow,
                { opacity: pressed ? 0.7 : 1, paddingHorizontal: spacing.lg, paddingVertical: 14 },
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="ban-outline" size={18} color={colors.danger} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.danger, marginLeft: 12 }}>
                {isBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </Pressable>
            <Divider />
            <Pressable
              onPress={() => setReportSheetVisible(true)}
              style={({ pressed }) => [
                styles.summaryRow,
                { opacity: pressed ? 0.7 : 1, paddingHorizontal: spacing.lg, paddingVertical: 14 },
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="flag-outline" size={18} color={colors.danger} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontFamily: typography.fonts.semibold, color: colors.danger, marginLeft: 12 }}>
                Report User
              </Text>
            </Pressable>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* ─── FULLSCREEN PHOTO MODAL ───────────────────────────────────────── */}
      <Modal visible={fullscreenPhoto} transparent animationType="fade" onRequestClose={() => setFullscreenPhoto(false)}>
        <View style={styles.fullscreenBackdrop}>
          <Pressable style={styles.fullscreenClose} onPress={() => setFullscreenPhoto(false)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          {displayAvatar ? (
            <Image
              source={{ uri: displayAvatar }}
              style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40, borderRadius: 16 }}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.fullscreenAvatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={{ fontSize: 48, color: '#FFFFFF', fontFamily: typography.fonts.bold }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Pressable
            onPress={handleShareContact}
            style={[styles.fullscreenActionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Ionicons name="share-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold, fontSize: 14 }}>Share Contact</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ─── BLOCK CONFIRMATION SHEET ─────────────────────────────────────── */}
      <Modal visible={blockSheetVisible} transparent animationType="slide" onRequestClose={() => setBlockSheetVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setBlockSheetVisible(false)}>
          <Pressable
            style={[styles.bottomSheet, { backgroundColor: colors.card, borderRadius: radius.xl }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={{ fontSize: 18, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: 8 }}>
              {isBlocked ? `Unblock ${displayName}?` : `Block ${displayName}?`}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontFamily: typography.fonts.medium, marginBottom: 24 }}>
              {isBlocked
                ? 'They will be able to send you messages again.'
                : 'They will no longer be able to send you messages.'}
            </Text>
            <Pressable
              onPress={handleBlockConfirm}
              disabled={isBlocking || isUnblocking}
              style={[styles.sheetPrimaryBtn, { backgroundColor: colors.danger }]}
            >
              {(isBlocking || isUnblocking) ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold, fontSize: 15 }}>
                  {isBlocked ? 'Unblock' : 'Block'}
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setBlockSheetVisible(false)} style={styles.sheetCancelBtn}>
              <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.semibold, fontSize: 15 }}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── CLEAR CHAT CONFIRMATION SHEET ───────────────────────────────── */}
      <Modal visible={clearSheetVisible} transparent animationType="slide" onRequestClose={() => setClearSheetVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setClearSheetVisible(false)}>
          <Pressable
            style={[styles.bottomSheet, { backgroundColor: colors.card, borderRadius: radius.xl }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={{ fontSize: 18, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: 8 }}>
              Clear Chat?
            </Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontFamily: typography.fonts.medium, marginBottom: 24 }}>
              All messages in this conversation will be deleted for you only. This cannot be undone.
            </Text>
            <Pressable
              onPress={handleClearChatConfirm}
              disabled={isClearing}
              style={[styles.sheetPrimaryBtn, { backgroundColor: colors.danger }]}
            >
              {isClearing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold, fontSize: 15 }}>
                  Clear Chat
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setClearSheetVisible(false)} style={styles.sheetCancelBtn}>
              <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.semibold, fontSize: 15 }}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── REPORT USER SHEET ───────────────────────────────────────────── */}
      <Modal visible={reportSheetVisible} transparent animationType="slide" onRequestClose={() => setReportSheetVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setReportSheetVisible(false)}>
          <Pressable
            style={[styles.bottomSheet, { backgroundColor: colors.card, borderRadius: radius.xl }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={{ fontSize: 18, fontFamily: typography.fonts.bold, color: colors.text, marginBottom: 8 }}>
              Report {displayName}?
            </Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, fontFamily: typography.fonts.medium, marginBottom: 24 }}>
              Your report will be reviewed by the admin team. {displayName} will not be notified.
            </Text>
            {['Spam or scam', 'Inappropriate content', 'Harassment', 'Other'].map((reason) => (
              <Pressable
                key={reason}
                onPress={() => {
                  setReportSheetVisible(false);
                  toast.success(`Report submitted: "${reason}". Admin will review shortly.`);
                }}
                style={({ pressed }) => [
                  styles.reportOption,
                  { backgroundColor: pressed ? (isDark ? '#1E293B' : '#F8FAFC') : 'transparent', borderColor: colors.border },
                ]}
              >
                <Text style={{ fontSize: 15, fontFamily: typography.fonts.medium, color: colors.text }}>
                  {reason}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
              </Pressable>
            ))}
            <Pressable onPress={() => setReportSheetVisible(false)} style={[styles.sheetCancelBtn, { marginTop: 8 }]}>
              <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.semibold, fontSize: 15 }}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  presenceRing: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  quickActionBtn: {
    alignItems: 'center',
    minWidth: 64,
  },
  quickActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    padding: 8,
  },
  fullscreenAvatarPlaceholder: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 24,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetPrimaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sheetCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
});
