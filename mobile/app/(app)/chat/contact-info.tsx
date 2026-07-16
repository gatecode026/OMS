/**
 * @file contact-info.tsx
 * @description Unified Contact & Group Info Hub.
 *              Displays extended profile/group details, Settings, Member management,
 *              and Shared Media, Documents, and Links grouped by Month.
 */

import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import apiClient from '../../../src/shared/services/apiClient';
import {
  useConversations,
  useChatMessages,
  useClearChat,
  useBlockUser,
  useUnblockUser,
  useBlockedUsers,
  useUpdateGroupDetails,
  useAddGroupMembers,
  useRemoveGroupMember,
  useSearchEmployees,
} from '../../../src/features/chat';
import { Avatar } from '../../../src/shared/components/Avatar';
import { toast } from '../../../src/shared/components/Toast';
import { useChatSettingsStore } from '../../../src/shared/store/chatSettingsStore';
import { usePresenceStore } from '../../../src/shared/store/presenceStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type InfoTabType = 'details' | 'media' | 'docs' | 'links';

const SOLID_WALLPAPERS = [
  '#090D16', '#1E1E2C', '#2C3E50', '#16A085', '#2980B9', '#8E44AD', 
  '#E74C3C', '#27AE60', '#D35400', '#F39C12', '#BDC3C7', '#E0F2FE'
];

export default function ContactInfoScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadows, isDark } = useTheme();
  const authUser = useAuthStore((s) => s.user);

  // Zustand Wallpaper Setting
  const { setWallpaper, getWallpaper } = useChatSettingsStore();
  const currentWallpaper = getWallpaper(conversationId || '');

  // Tab State
  const [activeTab, setActiveTab] = useState<InfoTabType>('details');
  const [mediaSubTab, setMediaSubTab] = useState<'all' | 'images' | 'videos' | 'audio'>('all');

  // Edit Modals State
  const [isEditGroupModalVisible, setIsEditGroupModalVisible] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [groupAvatarInput, setGroupAvatarInput] = useState('');
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Starred messages visibility
  const [isStarredListVisible, setIsStarredListVisible] = useState(false);

  // Hook queries
  const { data: conversations = [], refetch: refetchConversations } = useConversations();
  const { data: dbMessages = [], isLoading: isMessagesLoading } = useChatMessages(conversationId || '');
  const { data: blockedList = [], refetch: refetchBlocked } = useBlockedUsers();
  
  // Member Search Query
  const { data: searchEmployeeResults = [] } = useSearchEmployees(memberSearchQuery);

  // Mutations
  const { mutate: clearChat } = useClearChat();
  const { mutate: blockUser } = useBlockUser();
  const { mutate: unblockUser } = useUnblockUser();
  const { mutateAsync: updateGroupDetails } = useUpdateGroupDetails();
  const { mutateAsync: addGroupMembers } = useAddGroupMembers();
  const { mutateAsync: removeGroupMember } = useRemoveGroupMember();

  // Find target conversation
  const conversation = useMemo(() => {
    return conversations.find((c) => c.id === conversationId);
  }, [conversations, conversationId]);

  // Determine other participant
  const targetEmployeeId = useMemo(() => {
    if (!conversation) return null;
    if (conversation.type === 'direct') {
      return conversation.participants.find((p) => p.employeeId !== authUser?.id)?.employeeId || null;
    }
    return null;
  }, [conversation, authUser]);

  // Fetch full employee details from backend endpoint `/api/v1/employees/:id`
  const { data: employee, isLoading: isEmployeeLoading } = useQuery({
    queryKey: ['chat', 'contact', targetEmployeeId],
    queryFn: async () => {
      if (!targetEmployeeId) return null;
      const res = await apiClient.get(`/api/v1/employees/${targetEmployeeId}`);
      return res.data?.data || res.data || null;
    },
    enabled: !!targetEmployeeId,
  });

  // Calculate Common Groups
  const commonGroups = useMemo(() => {
    if (conversation?.type !== 'direct') return [];
    return conversations.filter((c) => 
      c.type === 'group' && 
      c.participants.some((p) => p.employeeId === targetEmployeeId) &&
      c.participants.some((p) => p.employeeId === authUser?.id)
    );
  }, [conversations, targetEmployeeId, authUser, conversation]);

  const isBlocked = useMemo(() => {
    if (!targetEmployeeId) return false;
    return blockedList.some((b) => b.id === targetEmployeeId);
  }, [blockedList, targetEmployeeId]);

  // Extract shared Media (images, videos, voice notes) based on media subtab
  const sharedMedia = useMemo(() => {
    return dbMessages.filter((m) => {
      if (m.isDeleted) return false;
      const isImg = m.type === 'image';
      const isAud = m.type === 'audio';
      const isVid = (m.type as string) === 'video' || (m.type === 'file' && m.media?.mimeType?.startsWith('video/'));

      if (!isImg && !isAud && !isVid) return false;

      if (mediaSubTab === 'images') return isImg;
      if (mediaSubTab === 'videos') return isVid;
      if (mediaSubTab === 'audio') return isAud;
      return true;
    });
  }, [dbMessages, mediaSubTab]);

  // Group media by Month
  const mediaGroupedByMonth = useMemo(() => {
    const grouped: Record<string, typeof sharedMedia> = {};
    sharedMedia.forEach((m) => {
      const month = dayjs(m.createdAt).format('MMMM YYYY');
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(m);
    });
    return grouped;
  }, [sharedMedia]);

  // Extract shared Documents & Corporate cards
  const sharedDocs = useMemo(() => {
    return dbMessages.filter(
      (m) =>
        !m.isDeleted &&
        (m.type === 'file' ||
          m.type === 'task' ||
          m.type === 'attendance' ||
          m.type === 'leave' ||
          m.type === 'payslip' ||
          m.type === 'project') &&
        !m.media?.mimeType?.startsWith('video/')
    );
  }, [dbMessages]);

  // Extract shared Links
  const sharedLinks = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return dbMessages.filter((m) => !m.isDeleted && m.type === 'text' && urlRegex.test(m.content));
  }, [dbMessages]);

  // Extract Starred Messages
  const starredMessages = useMemo(() => {
    return dbMessages.filter((m) => !m.isDeleted && m.starredBy?.includes(authUser?.id || ''));
  }, [dbMessages, authUser]);

  const handleCallPhone = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      toast.error('Could not initiate phone call');
    });
  };

  const handleSendEmail = (email?: string) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      toast.error('Could not compose email');
    });
  };

  const handleClearHistory = () => {
    if (conversationId) {
      clearChat(conversationId);
      toast.success('Chat history cleared successfully');
      router.back();
    }
  };

  const handleBlockToggle = () => {
    if (!targetEmployeeId) return;
    if (isBlocked) {
      unblockUser(targetEmployeeId, {
        onSuccess: () => {
          refetchBlocked();
          toast.success('User unblocked');
        }
      });
    } else {
      blockUser(targetEmployeeId, {
        onSuccess: () => {
          refetchBlocked();
          toast.success('User blocked');
        }
      });
    }
  };

  const handleUpdateGroup = async () => {
    if (!conversationId) return;
    try {
      await updateGroupDetails({
        conversationId,
        data: {
          name: groupNameInput.trim(),
          description: groupDescInput.trim(),
          avatar: groupAvatarInput.trim() || undefined,
        }
      });
      setIsEditGroupModalVisible(false);
      refetchConversations();
      toast.success('Group updated');
    } catch (e) {
      toast.error('Failed to update group');
    }
  };

  const handleAddMember = async (employeeId: string) => {
    if (!conversationId) return;
    try {
      await addGroupMembers({ conversationId, memberIds: [employeeId] });
      setIsAddMemberVisible(false);
      refetchConversations();
      toast.success('Member added successfully');
    } catch (e) {
      toast.error('Could not add member');
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    if (!conversationId) return;
    try {
      await removeGroupMember({ conversationId, memberId: employeeId });
      refetchConversations();
      toast.success('Member removed');
    } catch (e) {
      toast.error('Could not remove member');
    }
  };

  const handlePromoteAdmin = async (employeeId: string) => {
    if (!conversationId) return;
    try {
      await updateGroupDetails({
        conversationId,
        data: { promoteEmployeeId: employeeId }
      });
      refetchConversations();
      toast.success('Member promoted to Admin');
    } catch (e) {
      toast.error('Failed to promote member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!conversationId || !authUser?.id) return;
    try {
      await removeGroupMember({ conversationId, memberId: authUser.id });
      toast.success('You left the group');
      router.dismiss(2);
    } catch (e) {
      toast.error('Could not leave group');
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (isEmployeeLoading && conversation?.type === 'direct') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const statuses = usePresenceStore((s) => s.statuses);
  const chatscreenUsers = usePresenceStore((s) => s.chatscreenUsers);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'away': return '#F59E0B';
      case 'dnd': return '#EF4444';
      case 'offline':
      default: return colors.textLight;
    }
  };

  const isOnline = targetEmployeeId ? onlineUserIds.has(targetEmployeeId) : false;
  const currentPresenceStatus = isOnline ? (statuses[targetEmployeeId || '']?.status || 'available') : 'offline';
  const currentPresenceEmoji = isOnline ? (statuses[targetEmployeeId || '']?.emoji || null) : null;
  const otherIsOnChatScreen = targetEmployeeId ? !!chatscreenUsers[targetEmployeeId] : false;

  const name = conversation?.type === 'group' ? conversation.name || 'Group Chat' : employee?.name || 'Contact Name';
  const avatar = conversation?.type === 'group' ? conversation.avatar : employee?.avatarUrl || null;
  const isAdmin = conversation?.type === 'group' && conversation.participants.find(p => p.employeeId === authUser?.id)?.isAdmin;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── HEADER ─── */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
          {conversation?.type === 'group' ? 'Group Details' : 'Contact Info'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* ─── TAB NAVIGATION ─── */}
      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        {([
          { key: 'details', label: 'Details', icon: 'information-circle' },
          { key: 'media', label: 'Media', icon: 'image' },
          { key: 'docs', label: 'Docs', icon: 'document' },
          { key: 'links', label: 'Links', icon: 'link' },
        ] as const).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabBtn, isActive && { borderBottomColor: colors.primary }]}
            >
              <Ionicons name={tab.icon as any} size={18} color={isActive ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.textMuted, fontFamily: typography.fonts.bold }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }} showsVerticalScrollIndicator={false}>
        {activeTab === 'details' && (
          <View>
            {/* ─── TOP PROFILE INFO CARD ─── */}
            <View style={styles.profileSection}>
              <View style={styles.avatarWrapper}>
                <Avatar name={name} size={90} source={avatar || undefined} />
                {conversation?.type === 'direct' && (
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentPresenceStatus), borderColor: colors.card }]} />
                )}
              </View>
              <Text style={[styles.profileName, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                {name}{currentPresenceEmoji ? ` ${currentPresenceEmoji}` : ''}
              </Text>
              <Text style={[styles.profileStatusText, { color: isOnline ? getStatusColor(currentPresenceStatus) : colors.textMuted, fontFamily: typography.fonts.medium }]}>
                {conversation?.type === 'group'
                  ? 'Group Chat'
                  : currentPresenceStatus === 'offline' || !isOnline
                    ? 'Offline'
                    : currentPresenceStatus === 'available'
                      ? otherIsOnChatScreen
                        ? 'Online'
                        : 'Available'
                      : currentPresenceStatus === 'dnd'
                        ? 'Do Not Disturb'
                        : currentPresenceStatus.charAt(0).toUpperCase() + currentPresenceStatus.slice(1)}
              </Text>

              {/* Quick Actions Row */}
              <View style={styles.actionsRow}>
                {conversation?.type === 'direct' ? (
                  <>
                    <Pressable style={styles.actionBtnCol} onPress={() => handleCallPhone(employee?.phone)}>
                      <View style={[styles.iconCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="call-outline" size={20} color={colors.text} />
                      </View>
                      <Text style={[styles.actionLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Call</Text>
                    </Pressable>
                    <Pressable style={styles.actionBtnCol} onPress={handleBlockToggle}>
                      <View style={[styles.iconCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="ban" size={20} color={isBlocked ? colors.primary : colors.danger} />
                      </View>
                      <Text style={[styles.actionLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                        {isBlocked ? 'Unblock' : 'Block'}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  isAdmin && (
                    <Pressable
                      style={styles.actionBtnCol}
                      onPress={() => {
                        setGroupNameInput(conversation.name || '');
                        setGroupDescInput(conversation.description || '');
                        setGroupAvatarInput(conversation.avatar || '');
                        setIsEditGroupModalVisible(true);
                      }}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Ionicons name="create-outline" size={20} color={colors.text} />
                      </View>
                      <Text style={[styles.actionLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Edit Info</Text>
                    </Pressable>
                  )
                )}
                <Pressable style={styles.actionBtnCol} onPress={() => setIsStarredListVisible(true)}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="star" size={20} color={colors.warning} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>Starred</Text>
                </Pressable>
              </View>
            </View>

            {/* ─── GROUP MEMBERS SECTION (FOR GROUPS) ─── */}
            {conversation?.type === 'group' && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                    Group Members ({conversation.participants.length})
                  </Text>
                  {isAdmin && (
                    <Pressable onPress={() => setIsAddMemberVisible(true)}>
                      <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
                {conversation.participants.map((p) => {
                  const isCurrentMe = p.employeeId === authUser?.id;
                  return (
                    <View key={p.employeeId} style={styles.memberRow}>
                      <Avatar name={p.name} size={36} source={p.avatar || undefined} />
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text style={[styles.memberName, { color: colors.text, fontFamily: typography.fonts.semibold }]}>
                          {p.name} {isCurrentMe && '(You)'}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>{p.role}</Text>
                      </View>
                      {p.isAdmin && (
                        <View style={[styles.adminBadge, { backgroundColor: `${colors.primary}15` }]}>
                          <Text style={{ fontSize: 9, color: colors.primary, fontFamily: typography.fonts.bold }}>Admin</Text>
                        </View>
                      )}
                      {isAdmin && !isCurrentMe && (
                        <View style={{ flexDirection: 'row', marginLeft: spacing.xs }}>
                          {!p.isAdmin && (
                            <Pressable style={{ padding: 4, marginRight: 6 }} onPress={() => handlePromoteAdmin(p.employeeId)}>
                              <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
                            </Pressable>
                          )}
                          <Pressable style={{ padding: 4 }} onPress={() => handleRemoveMember(p.employeeId)}>
                            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ─── WALLPAPER & PERSONAL SETTINGS ─── */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.md }]}>
                Chat Settings
              </Text>
              
              {/* Wallpaper Picker */}
              <Text style={{ fontSize: 12, color: colors.text, fontFamily: typography.fonts.semibold, marginBottom: spacing.sm }}>
                Conversation Wallpaper
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <Pressable
                  onPress={() => setWallpaper(conversationId || '', { type: 'default', value: '' })}
                  style={[styles.wallpaperOption, { backgroundColor: colors.background, borderWidth: currentWallpaper.type === 'default' ? 2 : 1, borderColor: currentWallpaper.type === 'default' ? colors.primary : colors.border }]}
                >
                  <Text style={{ fontSize: 9, color: colors.text, fontFamily: typography.fonts.bold }}>Default</Text>
                </Pressable>
                {SOLID_WALLPAPERS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setWallpaper(conversationId || '', { type: 'solid', value: color })}
                    style={[styles.wallpaperOption, { backgroundColor: color, borderWidth: currentWallpaper.type === 'solid' && currentWallpaper.value === color ? 3 : 0, borderColor: colors.primary }]}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ─── DETAILS CARD (FOR DIRECT CHATS) ─── */}
            {conversation?.type === 'direct' && employee && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.md }]}>
                  Contact Details
                </Text>
                <Pressable style={styles.detailItem} onPress={() => handleSendEmail(employee.email)}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailVal, { color: colors.text, fontFamily: typography.fonts.semibold }]}>{employee.email || '—'}</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>Work Email</Text>
                  </View>
                </Pressable>
                <Pressable style={styles.detailItem} onPress={() => handleCallPhone(employee.phone)}>
                  <Ionicons name="call-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailVal, { color: colors.text, fontFamily: typography.fonts.semibold }]}>{employee.phone || '—'}</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>Mobile Number</Text>
                  </View>
                </Pressable>
                <View style={styles.detailItem}>
                  <Ionicons name="business-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailVal, { color: colors.text, fontFamily: typography.fonts.semibold }]}>{employee.department || '—'}</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>Department</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailVal, { color: colors.text, fontFamily: typography.fonts.semibold }]}>{employee.designation || '—'}</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>Role</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailVal, { color: colors.text, fontFamily: typography.fonts.semibold }]}>{employee.branch || 'Jaipur, India'}</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>Location</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ─── COMMON GROUPS (FOR DIRECT CHATS) ─── */}
            {conversation?.type === 'direct' && commonGroups.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.md }]}>
                  Groups in Common ({commonGroups.length})
                </Text>
                {commonGroups.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => router.push(`/chat/${g.id}`)}
                    style={styles.commonGroupRow}
                  >
                    <Avatar name={g.name || 'Group'} size={36} source={g.avatar || undefined} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={[styles.memberName, { color: colors.text, fontFamily: typography.fonts.semibold }]}>{g.name}</Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>{g.participants.length} members</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* ─── DANGER ZONE ─── */}
            <View style={styles.dangerZone}>
              <Pressable
                onPress={handleClearHistory}
                style={({ pressed }) => [styles.dangerBtn, { borderColor: colors.danger, borderRadius: radius.md }, pressed && { backgroundColor: `${colors.danger}10` }]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
                <Text style={[styles.dangerBtnText, { color: colors.danger, fontFamily: typography.fonts.bold }]}>Clear Chat History</Text>
              </Pressable>
              
              {conversation?.type === 'group' && (
                <Pressable
                  onPress={handleLeaveGroup}
                  style={({ pressed }) => [styles.dangerBtn, { borderColor: colors.danger, borderRadius: radius.md, marginTop: spacing.md }, pressed && { backgroundColor: `${colors.danger}10` }]}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
                  <Text style={[styles.dangerBtnText, { color: colors.danger, fontFamily: typography.fonts.bold }]}>Leave Group</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ─── TAB: MEDIA GALLERY ─── */}
        {activeTab === 'media' && (
          <View style={styles.mediaTabContainer}>
            {/* Sub-tabs Row */}
            <View style={styles.subTabsRow}>
              {([
                { key: 'all', label: 'All' },
                { key: 'images', label: 'Images' },
                { key: 'videos', label: 'Videos' },
                { key: 'audio', label: 'Audio' },
              ] as const).map((sub) => {
                const isActive = mediaSubTab === sub.key;
                return (
                  <Pressable
                    key={sub.key}
                    onPress={() => setMediaSubTab(sub.key)}
                    style={[
                      styles.subTabBtn,
                      { backgroundColor: isActive ? colors.primary : colors.neutralLight }
                    ]}
                  >
                    <Text
                      style={[
                        styles.subTabBtnText,
                        {
                          color: isActive ? '#FFFFFF' : colors.textMuted,
                          fontFamily: typography.fonts.semibold
                        }
                      ]}
                    >
                      {sub.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {sharedMedia.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="image-outline" size={48} color={colors.textLight} />
                <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 13, fontFamily: typography.fonts.semibold }}>No shared media</Text>
              </View>
            ) : (
              Object.keys(mediaGroupedByMonth).map((month) => (
                <View key={month} style={{ marginBottom: spacing.lg }}>
                  <Text style={[styles.monthHeader, { color: colors.text, fontFamily: typography.fonts.bold }]}>{month}</Text>
                  <View style={styles.mediaGrid}>
                    {mediaGroupedByMonth[month].map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          const typeParam = item.type === 'image' ? 'image' : item.type === 'audio' ? 'file' : 'video';
                          router.push(
                            `/chat/preview?url=${encodeURIComponent(item.media?.url || '')}&type=${typeParam}&name=${encodeURIComponent(item.media?.fileName || '')}&conversationId=${conversationId}&activeMessageId=${item.id}` as any
                          );
                        }}
                        style={styles.gridMediaItem}
                      >
                        {item.type === 'image' ? (
                          <Image source={{ uri: item.media?.url || '' }} style={styles.gridImage} resizeMode="cover" />
                        ) : item.type === 'audio' ? (
                          <View style={[styles.gridAudioPlaceholder, { backgroundColor: colors.neutralLight }]}>
                            <Ionicons name="mic-circle" size={32} color={colors.primary} />
                            <Text style={[styles.gridAudioText, { color: colors.textMuted, fontFamily: typography.fonts.medium }]}>
                              {item.media?.duration ? `${Math.floor(item.media.duration)}s` : 'Voice'}
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.gridVideoPlaceholder, { backgroundColor: '#000000' }]}>
                            <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── TAB: DOCUMENTS ─── */}
        {activeTab === 'docs' && (
          <View style={styles.tabContainer}>
            {sharedDocs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color={colors.textLight} />
                <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 13, fontFamily: typography.fonts.semibold }}>No shared documents</Text>
              </View>
            ) : (
              sharedDocs.map((item) => {
                const isFile = item.type === 'file';
                let iconName = 'document-attach-outline';
                let iconColor = colors.primary;
                let displayName = item.media?.fileName || 'Attachment';
                let subtitle = `${formatBytes(item.media?.fileSize ?? undefined)} • By ${item.senderName}`;

                if (!isFile) {
                  if (item.type === 'task') {
                    iconName = 'checkbox-outline';
                    iconColor = '#4F46E5';
                    try {
                      const data = JSON.parse(item.content);
                      displayName = `Task: ${data.title}`;
                      subtitle = `Priority: ${data.priority} • By ${item.senderName}`;
                    } catch {
                      displayName = 'Linked Task';
                    }
                  } else if (item.type === 'leave') {
                    iconName = 'calendar-outline';
                    iconColor = '#E53E3E';
                    try {
                      const data = JSON.parse(item.content);
                      displayName = `Leave Request: ${data.leaveType}`;
                      subtitle = `Status: ${data.status} • By ${item.senderName}`;
                    } catch {
                      displayName = 'Leave Application';
                    }
                  } else if (item.type === 'attendance') {
                    iconName = 'time-outline';
                    iconColor = '#059669';
                    try {
                      const data = JSON.parse(item.content);
                      displayName = `Attendance Shift: ${data.date}`;
                      subtitle = `Status: ${data.status} • By ${item.senderName}`;
                    } catch {
                      displayName = 'Attendance Record';
                    }
                  } else if (item.type === 'payslip') {
                    iconName = 'card-outline';
                    iconColor = '#DB2777';
                    try {
                      const data = JSON.parse(item.content);
                      displayName = `Payslip: ${data.month}`;
                      subtitle = `Net Pay: ${data.salary} • By ${item.senderName}`;
                    } catch {
                      displayName = 'Salary Slip';
                    }
                  } else if (item.type === 'project') {
                    iconName = 'grid-outline';
                    iconColor = '#047857';
                    try {
                      const data = JSON.parse(item.content);
                      displayName = `Project: ${data.title}`;
                      subtitle = `Status: ${data.status} • By ${item.senderName}`;
                    } catch {
                      displayName = 'Linked Project';
                    }
                  }
                }

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (item.type === 'file') {
                        router.push(
                          `/chat/preview?url=${encodeURIComponent(item.media?.url || '')}&type=file&name=${encodeURIComponent(item.media?.fileName || '')}` as any
                        );
                      } else if (item.type === 'task') {
                        try {
                          const data = JSON.parse(item.content);
                          router.push(`/task-details?id=${data.id}` as any);
                        } catch {
                          router.push('/tasks' as any);
                        }
                      } else if (item.type === 'leave') {
                        router.push('/apply-leave' as any);
                      } else if (item.type === 'attendance') {
                        router.push('/attendance-history' as any);
                      } else if (item.type === 'payslip') {
                        try {
                          const data = JSON.parse(item.content);
                          router.push(`/payroll-details?id=${data.id}` as any);
                        } catch {
                          router.push('/payroll' as any);
                        }
                      } else if (item.type === 'project') {
                        try {
                          const data = JSON.parse(item.content);
                          router.push(`/project-details?id=${data.id}` as any);
                        } catch {
                          router.push('/projects' as any);
                        }
                      }
                    }}
                    style={[styles.docItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Ionicons name={iconName as any} size={24} color={iconColor} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={[styles.docName, { color: colors.text, fontFamily: typography.fonts.semibold }]} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>
                        {subtitle}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ─── TAB: LINKS ─── */}
        {activeTab === 'links' && (
          <View style={styles.tabContainer}>
            {sharedLinks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="link-outline" size={48} color={colors.textLight} />
                <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 13, fontFamily: typography.fonts.semibold }}>No shared links</Text>
              </View>
            ) : (
              sharedLinks.map((item) => {
                const url = item.content.match(/(https?:\/\/[^\s]+)/g)?.[0] || '';
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => Linking.openURL(url).catch(() => toast.error('Could not open link'))}
                    style={[styles.linkItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Ionicons name="globe-outline" size={24} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={[styles.linkUrlText, { color: colors.primary, fontFamily: typography.fonts.semibold }]} numberOfLines={1}>
                        {url}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }}>
                        Sent by {item.senderName} on {dayjs(item.createdAt).format('MMM DD, YYYY')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── MODAL: EDIT GROUP DETAILS ─── */}
      <Modal
        visible={isEditGroupModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditGroupModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(9,13,22,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, borderColor: colors.border, borderWidth: 1 }}>
            <Text style={{ fontSize: 16, color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.md }}>
              Edit Group Details
            </Text>
            
            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Group Name</Text>
            <TextInput
              value={groupNameInput}
              onChangeText={setGroupNameInput}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 8, color: colors.text, marginBottom: spacing.md }}
            />
            
            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Description</Text>
            <TextInput
              value={groupDescInput}
              onChangeText={setGroupDescInput}
              multiline
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 8, color: colors.text, height: 60, marginBottom: spacing.md }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md }}>
              <Pressable onPress={() => setIsEditGroupModalVisible(false)} style={{ padding: 10, marginRight: 10 }}>
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.bold }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleUpdateGroup} style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: ADD MEMBERS ─── */}
      <Modal
        visible={isAddMemberVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddMemberVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(9,13,22,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', height: '70%', backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, borderColor: colors.border, borderWidth: 1 }}>
            <Text style={{ fontSize: 16, color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.md }}>
              Add Members
            </Text>
            <TextInput
              placeholder="Search employees..."
              placeholderTextColor={colors.textLight}
              value={memberSearchQuery}
              onChangeText={setMemberSearchQuery}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 8, color: colors.text, marginBottom: spacing.md }}
            />
            <ScrollView style={{ flex: 1 }}>
              {searchEmployeeResults.map((emp: any) => (
                <Pressable
                  key={emp.id}
                  onPress={() => handleAddMember(emp.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Avatar name={emp.name} size={36} source={emp.avatarUrl || undefined} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontFamily: typography.fonts.semibold }}>{emp.name}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>{emp.designation}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setIsAddMemberVisible(false)} style={{ alignSelf: 'flex-end', marginTop: 10, padding: 8 }}>
              <Text style={{ color: colors.primary, fontFamily: typography.fonts.bold }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: STARRED MESSAGES LIST ─── */}
      <Modal
        visible={isStarredListVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsStarredListVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(9,13,22,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', height: '80%', backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, borderColor: colors.border, borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: 16, color: colors.text, fontFamily: typography.fonts.bold }}>
                Starred Messages ({starredMessages.length})
              </Text>
              <Pressable onPress={() => setIsStarredListVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {starredMessages.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 40 }}>No starred messages yet</Text>
              ) : (
                starredMessages.map((item) => (
                  <View key={item.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.primary, fontFamily: typography.fonts.bold }}>{item.senderName}</Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 8 }}>{dayjs(item.createdAt).format('hh:mm A')}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.text }}>{item.content}</Text>
                  </View>
                ))
              )}
            </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    textAlign: 'center',
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: 10,
  },
  tabText: {
    fontSize: 12,
    marginLeft: 6,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2.5,
  },
  profileName: {
    fontSize: 18,
    textAlign: 'center',
  },
  profileStatusText: {
    fontSize: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  actionBtnCol: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberName: {
    fontSize: 13,
  },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wallpaperOption: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailVal: {
    fontSize: 13,
  },
  commonGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dangerZone: {
    padding: 16,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    height: 46,
  },
  dangerBtnText: {
    fontSize: 14,
  },
  tabContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  mediaTabContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  monthHeader: {
    fontSize: 13,
    marginBottom: 10,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridMediaItem: {
    width: (SCREEN_WIDTH - 48) / 3 - 6,
    height: (SCREEN_WIDTH - 48) / 3 - 6,
    margin: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridVideoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subTabBtnText: {
    fontSize: 11,
  },
  gridAudioPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  gridAudioText: {
    fontSize: 9,
    marginTop: 2,
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  docName: {
    fontSize: 13,
  },
  linkItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  linkUrlText: {
    fontSize: 13,
  },
});
