/**
 * @file inbox.tsx
 * @description Premium Conversation List screen matching the approved UI reference (WhatsApp Inspired).
 *              Displays horizontal Active Now list, always-visible search bar, category chips,
 *              dropdown more menu, and swipeable cards for Pin/Read/Mute/Hide/Archive/Delete.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';

dayjs.extend(relativeTime);

import useTheme from '../../../src/shared/hooks/useTheme';
import useAuthStore from '../../../src/shared/store/authStore';
import { useChatSettingsStore } from '../../../src/shared/store/chatSettingsStore';
import {
  useConversations,
  useArchivedConversations,
  useCallHistory,
  useStartDirectChat,
  useCreateGroupChat,
  useArchiveConversation,
  useUnarchiveConversation,
  useHideConversation,
  useUnhideConversation,
  useDeleteConversationForMe,
  useGlobalSearch,
  useUpdateGroupDetails,
  useSearchEmployees,
  useThreadActivity,
  useMarkThreadRead,
} from '../../../src/features/chat';
import { Avatar } from '../../../src/shared/components/Avatar';
import { EmptyState, toast, Skeleton } from '../../../src/shared/components';
import { usePresenceStore } from '../../../src/shared/store/presenceStore';
import { getSocket } from '../../../src/shared/services/socketManager';
import { ChatConversation } from '../../../src/features/chat/types';
import { useCall } from '../../../src/shared/providers/CallProvider';
import ConversationCard from '../../../src/features/chat/components/ConversationCard';
import ENV from '../../../src/config/env';

type FilterType = 'All' | 'Unread' | 'Groups' | 'Pinned' | 'Archived' | 'Hidden' | 'Muted' | 'Mentions' | 'Calls' | 'Files';

export default function InboxScreen() {
  const { colors, spacing, radius, shadows, typography, isDark } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authUser = useAuthStore((s) => s.user);
  const { initiateCall } = useCall();
  const searchInputRef = useRef<TextInput>(null);

  // Muting Store
  const { toggleMuteConversation, isMuted: isChatMuted } = useChatSettingsStore();

  // Screen UI State
  const [activeTab, setActiveTab] = useState<'chats' | 'calls'>('chats');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [menuDropdownVisible, setMenuDropdownVisible] = useState(false);

  // Quick Profile / Long Press overlays state
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState<any>(null);
  const [longPressedChat, setLongPressedChat] = useState<ChatConversation | null>(null);
  const [quickReplyChat, setQuickReplyChat] = useState<ChatConversation | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');

  // Hidden Chats PIN Security
  const [pinUnlockVisible, setPinUnlockVisible] = useState(false);
  const [pinValue, setPinValue] = useState('');

  const handleSelectFilter = (filter: FilterType) => {
    if (filter === 'Hidden') {
      setPinValue('');
      setPinUnlockVisible(true);
    } else {
      setSelectedFilter(filter);
    }
  };

  const handleVerifyPin = async () => {
    const storedPin = await SecureStore.getItemAsync('chat_hidden_pin') || '1234';
    if (pinValue === storedPin) {
      setPinUnlockVisible(false);
      setSelectedFilter('Hidden');
      toast.success('Access Granted');
    } else {
      toast.error('Incorrect PIN');
      setPinValue('');
    }
  };

  // API query bindings
  const { data: conversations = [], isLoading: isConversationsLoading, refetch: refetchConversations } = useConversations();
  const { data: archivedConversations = [], isLoading: isArchivedLoading, refetch: refetchArchived } = useArchivedConversations();
  const { data: callHistory = [], isLoading: isCallsLoading, refetch: refetchCalls } = useCallHistory();
  const { data: threadActivity = [], isLoading: isThreadsLoading } = useThreadActivity();

  // Load directories for suggested list (Active Now)
  const { data: employees = [] } = useSearchEmployees('');

  // Search Results hook
  const { data: globalSearchResults = { conversations: [], messages: [], files: [], contacts: [] } } = useGlobalSearch(searchQuery);

  // Mutations
  const { mutateAsync: startDirectChat } = useStartDirectChat();
  const { mutateAsync: createGroup } = useCreateGroupChat();
  const { mutateAsync: updateGroupSettings } = useUpdateGroupDetails();
  const { mutate: archiveChat } = useArchiveConversation();
  const { mutate: unarchiveChat } = useUnarchiveConversation();
  const { mutate: hideChat } = useHideConversation();
  const { mutate: unhideChat } = useUnhideConversation();
  const { mutate: deleteChat } = useDeleteConversationForMe();

  // Socket states
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const statuses = usePresenceStore((s) => s.statuses);
  const typingUsers = usePresenceStore((s) => s.typingUsers);

  useEffect(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('get_online_users');
    }
  }, []);

  // Refresh active list
  const handleRefresh = async () => {
    if (activeTab === 'chats') {
      await refetchConversations();
      await refetchArchived();
    } else if (activeTab === 'calls') {
      await refetchCalls();
    }
  };

  // Launch direct conversation
  const handleSelectEmployee = async (employeeId: string) => {
    try {
      const result = await startDirectChat(employeeId);
      // startDirectChat returns the conversation object directly (chatApi normalizes it)
      const convId = result?.id || (result as any)?._id;
      if (!convId) {
        toast.error('Failed to start chat conversation');
        return;
      }
      router.push(`/chat/${convId}`);
    } catch {
      toast.error('Failed to start chat conversation');
    }
  };

  const getConvPinMuteStatus = (conv: ChatConversation) => {
    const isPinned = conv.pinned || conv.pinnedBy?.some((p) => p.employeeId === authUser?.id) || false;
    const isMuted = conv.muted || isChatMuted(conv.id) || false;
    const isHidden = conv.isHidden || conv.hiddenBy?.some((h) => h.userId === authUser?.id) || false;
    const isArchived = conv.isArchived || conv.archivedBy?.some((a) => a.userId === authUser?.id) || false;
    return { isPinned, isMuted, isHidden, isArchived };
  };

  // Pin / Unpin Conversation triggers
  const handleTogglePin = (conv: ChatConversation) => {
    const { isPinned } = getConvPinMuteStatus(conv);
    const socket = getSocket();
    if (isPinned) {
      socket.emit('unpin_conversation', { conversationId: conv.id });
      toast.success('Conversation unpinned');
    } else {
      socket.emit('pin_conversation', { conversationId: conv.id });
      toast.success('Conversation pinned');
    }

    // Atomic cache update
    queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
      if (!Array.isArray(oldConvs)) return [];
      const updated = oldConvs.map((c) => {
        if (c.id === conv.id) {
          const pinVal = c.pinned || c.pinnedBy?.some((p: any) => p.employeeId === authUser?.id);
          const nextPinnedBy = pinVal
            ? (c.pinnedBy || []).filter((p: any) => p.employeeId !== authUser?.id)
            : [...(c.pinnedBy || []), { employeeId: authUser?.id || '' }];
          return {
            ...c,
            pinned: !pinVal,
            pinnedBy: nextPinnedBy,
          };
        }
        return c;
      });
      return updated.sort((a, b) => {
        const pinA = (a.pinned || a.pinnedBy?.some((p: any) => p.employeeId === authUser?.id)) ? 1 : 0;
        const pinB = (b.pinned || b.pinnedBy?.some((p: any) => p.employeeId === authUser?.id)) ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
      });
    });
  };

  const handleToggleMute = (convId: string) => {
    toggleMuteConversation(convId);
    const isMutedNow = isChatMuted(convId);
    toast.success(isMutedNow ? 'Conversation unmuted' : 'Conversation muted');

    // Atomic cache update
    queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
      if (!Array.isArray(oldConvs)) return [];
      return oldConvs.map((c) => c.id === convId ? { ...c, muted: !isMutedNow } : c);
    });
  };

  // Archive / Unarchive triggers
  const handleToggleArchive = (conv: ChatConversation) => {
    const { isArchived } = getConvPinMuteStatus(conv);
    if (isArchived) {
      unarchiveChat(conv.id);
      toast.success('Conversation unarchived');
    } else {
      archiveChat(conv.id);
      toast.success('Conversation archived');
    }

    // Atomic cache update
    queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
      if (!Array.isArray(oldConvs)) return [];
      return oldConvs.map((c) => {
        if (c.id === conv.id) {
          const archVal = c.isArchived || c.archivedBy?.some((a: any) => a.userId === authUser?.id);
          const nextArchivedBy = archVal
            ? (c.archivedBy || []).filter((a: any) => a.userId !== authUser?.id)
            : [...(c.archivedBy || []), { userId: authUser?.id || '' }];
          return {
            ...c,
            isArchived: !archVal,
            archivedBy: nextArchivedBy,
          };
        }
        return c;
      });
    });
  };

  // Hide / Unhide triggers
  const handleToggleHide = (conv: ChatConversation) => {
    const { isHidden } = getConvPinMuteStatus(conv);
    if (isHidden) {
      unhideChat(conv.id);
      toast.success('Conversation unhidden');
    } else {
      hideChat(conv.id);
      toast.success('Conversation hidden');
    }

    // Atomic cache update
    queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
      if (!Array.isArray(oldConvs)) return [];
      return oldConvs.map((c) => {
        if (c.id === conv.id) {
          const hidVal = c.isHidden || c.hiddenBy?.some((h: any) => h.userId === authUser?.id);
          const nextHiddenBy = hidVal
            ? (c.hiddenBy || []).filter((h: any) => h.userId !== authUser?.id)
            : [...(c.hiddenBy || []), { userId: authUser?.id || '' }];
          return {
            ...c,
            isHidden: !hidVal,
            hiddenBy: nextHiddenBy,
          };
        }
        return c;
      });
    });
  };

  // Delete trigger
  const handleDeleteConversation = (convId: string) => {
    deleteChat(convId);
    toast.success('Conversation deleted');

    // Atomic cache update
    queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
      if (!Array.isArray(oldConvs)) return [];
      return oldConvs.filter((c) => c.id !== convId);
    });
  };

  const handleMarkRead = (conv: ChatConversation) => {
    const socket = getSocket();
    socket.emit('mark_read', { conversationId: conv.id });
    toast.success('Marked as read');

    // Atomic cache update
    queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
      if (!Array.isArray(oldConvs)) return [];
      return oldConvs.map((c) => c.id === conv.id ? { ...c, unreadCount: 0 } : c);
    });
  };

  // Quick Reply Send Handler
  const handleSendQuickReply = () => {
    if (!quickReplyText.trim() || !quickReplyChat) return;
    const socket = getSocket();
    const tempId = `temp_${Date.now()}`;
    const payload = {
      conversationId: quickReplyChat.id,
      content: quickReplyText.trim(),
      type: 'text',
      tempId,
    };
    socket.emit('send_message', payload);
    setQuickReplyChat(null);
    setQuickReplyText('');
    toast.success('Reply sent');

    // Atomic cache update: move to top
    queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
      if (!Array.isArray(oldConvs)) return [];
      const updated = oldConvs.map((c) => {
        if (c.id === quickReplyChat.id) {
          return {
            ...c,
            lastMessage: {
              messageId: tempId,
              content: payload.content,
              type: 'text',
              senderId: authUser?.id || '',
              senderName: authUser?.name || 'Me',
              sentAt: new Date().toISOString(),
              isDeleted: false,
            },
            lastActivityAt: new Date().toISOString(),
          };
        }
        return c;
      });
      return updated.sort((a, b) => {
        const pinA = (a.pinned || a.pinnedBy?.some((p: any) => p.employeeId === authUser?.id)) ? 1 : 0;
        const pinB = (b.pinned || b.pinnedBy?.some((p: any) => p.employeeId === authUser?.id)) ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
        return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
      });
    });
  };

  // Delivery status receipts check helper
  const renderDeliveryStatus = (conv: ChatConversation) => {
    const lastMsg = conv.lastMessage;
    if (!lastMsg || lastMsg.senderId !== authUser?.id) return null;
    const partner = conv.participants.find((p) => p.employeeId !== authUser?.id);
    const isRead = lastMsg.isDeleted ? false : (partner?.lastReadAt ? new Date(partner.lastReadAt).getTime() >= new Date(lastMsg.sentAt || 0).getTime() : false);
    
    const oldMessages = queryClient.getQueryData(['chat', 'messages', conv.id]) as any[] | undefined;
    const cachedMsg = oldMessages?.find((m) => m.id === lastMsg.messageId);
    const status = cachedMsg?.status || (isRead ? 'read' : 'sent');

    if (status === 'read' || isRead) {
      return (
        <Ionicons
          name="checkmark-done"
          size={16}
          color="#38BDF8"
          style={{ marginRight: 4 }}
        />
      );
    }

    if (status === 'delivered') {
      return (
        <Ionicons
          name="checkmark-done"
          size={16}
          color={colors.textLight}
          style={{ marginRight: 4 }}
        />
      );
    }

    return (
      <Ionicons
        name="checkmark"
        size={16}
        color={colors.textLight}
        style={{ marginRight: 4 }}
      />
    );
  };

  const getTypingPreview = (tState: Record<string, { name: string; isRecording: boolean }> | undefined) => {
    if (!tState || Object.keys(tState).length === 0) return null;
    const users = Object.values(tState);
    const isRecording = users.some(u => u.isRecording);
    const names = users.map(u => u.name.split(' ')[0]);
    
    let text = '';
    if (names.length === 1) {
      text = isRecording ? `${names[0]} is recording...` : `${names[0]} is typing...`;
    } else if (names.length === 2) {
      text = isRecording ? `${names[0]} & ${names[1]} are recording...` : `${names[0]} & ${names[1]} are typing...`;
    } else {
      text = isRecording ? `Several people are recording...` : `Several people are typing...`;
    }
    return { text, isRecording };
  };

  // Dynamic message preview helper for different types of attachments
  const getMessagePreview = (conv: ChatConversation) => {
    const lastMsg = conv.lastMessage;
    const typingPreview = getTypingPreview(typingUsers[conv.id]);
    if (typingPreview) return { text: typingPreview.text, icon: 'chatbubbles-outline' as const };
    if (!lastMsg) return { text: 'No messages yet', icon: null };
    if (lastMsg.isDeleted) return { text: 'This message was deleted', icon: 'trash-outline' as const };

    let icon: keyof typeof Ionicons.glyphMap | null = null;
    let text = lastMsg.content || '';

    switch (lastMsg.type) {
      case 'image':
        icon = 'image-outline';
        text = 'Photo';
        break;
      case 'file':
        if (lastMsg.content?.endsWith('.pdf')) {
          icon = 'document-text-outline';
          text = 'PDF Document';
        } else if (lastMsg.content?.endsWith('.zip') || lastMsg.content?.endsWith('.rar')) {
          icon = 'archive-outline';
          text = 'ZIP Archive';
        } else if (lastMsg.content?.match(/\.(doc|docx)$/)) {
          icon = 'document-text-outline';
          text = 'Word Document';
        } else if (lastMsg.content?.match(/\.(xls|xlsx)$/)) {
          icon = 'bar-chart-outline';
          text = 'Excel Spreadsheet';
        } else if (lastMsg.content?.match(/\.(ppt|pptx)$/)) {
          icon = 'easel-outline';
          text = 'PowerPoint Presentation';
        } else {
          icon = 'document-attach-outline';
          text = lastMsg.content || 'File';
        }
        break;
      case 'audio':
        icon = 'mic-outline';
        text = 'Voice Note';
        break;
      case 'call':
        icon = 'call-outline';
        text = lastMsg.content || 'Call Log';
        break;
      case 'poll':
        icon = 'stats-chart-outline';
        text = 'Poll created';
        break;
      default:
        if (text.includes('[Task]')) {
          icon = 'checkbox-outline';
        } else if (text.includes('[Leave]')) {
          icon = 'time-outline';
        } else if (text.includes('[Attendance]')) {
          icon = 'calendar-outline';
        } else if (text.includes('[Payslip]')) {
          icon = 'cash-outline';
        } else if (text.includes('[Project]')) {
          icon = 'grid-outline';
        } else if (text.includes('[Event]') || text.includes('[Meeting]')) {
          icon = 'today-outline';
        }
        break;
    }

    return { text, icon };
  };

  // Filter conversations list dynamically
  const getFilteredConversations = (list: ChatConversation[]) => {
    return list.filter((conv) => {
      const { isPinned, isMuted, isHidden, isArchived } = getConvPinMuteStatus(conv);

      if (selectedFilter === 'Unread' && !(conv.unreadCount && conv.unreadCount > 0)) return false;
      if (selectedFilter === 'Groups' && conv.type !== 'group') return false;
      if (selectedFilter === 'Pinned' && !isPinned) return false;
      if (selectedFilter === 'Archived' && !isArchived) return false;
      if (selectedFilter === 'Muted' && !isMuted) return false;
      if (selectedFilter === 'Hidden' && !isHidden) return false;
      if (selectedFilter === 'Mentions' && !(conv.lastMessage?.content?.includes(`@${authUser?.name}`))) return false;
      if (selectedFilter === 'Files' && !(conv.lastMessage?.type === 'file' || conv.lastMessage?.type === 'image')) return false;
      if (selectedFilter === 'Calls' && !(conv.lastMessage?.type === 'call')) return false;

      if (selectedFilter !== 'Archived' && isArchived) return false;
      if (selectedFilter !== 'Hidden' && isHidden) return false;

      // Apply Local Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const chatPartner = conv.type === 'direct' ? conv.participants.find((p) => p.employeeId !== authUser?.id) : null;
        const title = conv.type === 'direct' ? chatPartner?.name || 'Chat Partner' : conv.name || 'Group Chat';
        const snippet = conv.lastMessage?.content || '';
        const role = chatPartner?.role || '';

        return (
          title.toLowerCase().includes(q) ||
          snippet.toLowerCase().includes(q) ||
          role.toLowerCase().includes(q)
        );
      }

      return true;
    });
  };

  // Resolve chat list display sorting (pinned always first)
  const displayChats = useMemo(() => {
    const list = getFilteredConversations(conversations);
    
    return list.sort((a, b) => {
      const pinA = getConvPinMuteStatus(a).isPinned ? 1 : 0;
      const pinB = getConvPinMuteStatus(b).isPinned ? 1 : 0;
      
      if (pinA !== pinB) return pinB - pinA;
      return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
    });
  }, [conversations, selectedFilter, searchQuery, authUser, useChatSettingsStore.getState().mutedConversationIds]);

  const getUserTypingStatusInAnyChat = (userId: string) => {
    for (const convId of Object.keys(typingUsers)) {
      const usersInConv = typingUsers[convId] || {};
      if (usersInConv[userId]) {
        return usersInConv[userId];
      }
    }
    return null;
  };

  // Active Now list: online employees from directory
  const activeNowList = useMemo(() => {
    return [...employees]
      .filter((emp) => emp.id !== authUser?.id)
      .sort((a, b) => {
        const aOnline = onlineUserIds.has(a.id) ? 1 : 0;
        const bOnline = onlineUserIds.has(b.id) ? 1 : 0;
        return bOnline - aOnline;
      });
  }, [employees, onlineUserIds, authUser]);

  // Resolve direct chat item metadata
  const getChatMetadata = (conv: ChatConversation) => {
    if (conv.type === 'direct') {
      const otherUser = conv.participants.find((p) => p.employeeId !== authUser?.id);
      const otherId = otherUser?.employeeId || '';
      const isOnline = otherId ? onlineUserIds.has(otherId) : false;
      const presence = otherId ? statuses[otherId] : null;
      const userStatus = isOnline ? (presence?.status || 'available') : 'offline';
      const statusEmoji = isOnline ? (presence?.emoji || null) : null;
      return {
        title: otherUser?.name || 'Chat Partner',
        avatar: otherUser?.avatar || null,
        designation: otherUser?.role || 'Staff',
        isOnline,
        userStatus,
        statusEmoji,
      };
    }
    return {
      title: conv.name || 'Group Chat',
      avatar: conv.avatar || null,
      designation: 'Group Chat',
      isOnline: false,
      userStatus: 'offline',
      statusEmoji: null,
    };
  };

  // Helper to format active contact's name
  const formatActiveName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return parts[0];
  };

  // Helper to format message time WhatsApp style
  const formatMessageTime = (dateStr: string | Date) => {
    const date = dayjs(dateStr);
    const now = dayjs();
    if (date.isSame(now, 'day')) {
      return date.format('hh:mm A');
    }
    if (date.isSame(now.subtract(1, 'day'), 'day')) {
      return 'Yesterday';
    }
    if (now.diff(date, 'day') < 7) {
      return date.format('dddd');
    }
    return date.format('DD/MM/YYYY');
  };

  const AnyFlashList = FlashList as any;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      {/* ─── HEADER ─── */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingTop: Math.max(insets.top, spacing.md) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 8, padding: 4 }}>
            <Ionicons name="arrow-back-outline" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
            Chats
          </Text>
        </View>
        <View style={[styles.headerRightRow, { alignItems: 'center' }]}>
          <Pressable style={styles.headerBtn} onPress={() => router.push('/chat/create-group' as any)} accessibilityLabel="Create Group">
            <Ionicons name="people-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable style={{ marginLeft: 12, marginRight: 4 }} onPress={() => router.push('/(tabs)/profile' as any)} accessibilityLabel="View Profile">
            <Avatar name={authUser?.name || 'Me'} size={32} source={authUser?.avatarUrl || undefined} />
          </Pressable>
          <Pressable style={[styles.headerBtn, { marginLeft: 4 }]} onPress={() => setMenuDropdownVisible(!menuDropdownVisible)} accessibilityLabel="More Options">
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* More Options Dropdown menu overlay */}
      {menuDropdownVisible && (
        <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.medium]}>
          <Pressable
            style={styles.dropdownOption}
            onPress={() => {
              setMenuDropdownVisible(false);
              handleSelectFilter('Pinned');
            }}
          >
            <Ionicons name="pin-outline" size={16} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.dropdownOptionText, { color: colors.text, fontFamily: typography.fonts.medium }]}>Pinned Chats</Text>
          </Pressable>
          <Pressable
            style={styles.dropdownOption}
            onPress={() => {
              setMenuDropdownVisible(false);
              toast.info('Settings and Block lists are managed inside profile tabs.');
            }}
          >
            <Ionicons name="settings-outline" size={16} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.dropdownOptionText, { color: colors.text, fontFamily: typography.fonts.medium }]}>Chat Settings</Text>
          </Pressable>
        </View>
      )}

      {/* ─── SEGMENTED TABS (Chats vs Calls) ─── */}
      <View style={[styles.tabsWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('chats')}
          style={[styles.tabSelectBtn, activeTab === 'chats' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabSelectText, { color: activeTab === 'chats' ? colors.primary : colors.textMuted, fontFamily: typography.fonts.bold }]}>
            Chats
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('calls')}
          style={[styles.tabSelectBtn, activeTab === 'calls' && { borderBottomColor: colors.primary }]}
        >
          <Text style={[styles.tabSelectText, { color: activeTab === 'calls' ? colors.primary : colors.textMuted, fontFamily: typography.fonts.bold }]}>
            Calls
          </Text>
        </Pressable>
      </View>

      {activeTab === 'chats' ? (
        // ─── CHATS TAB MODE ───
        <View style={{ flex: 1 }}>
          {/* ─── SEARCH INPUT (ALWAYS VISIBLE) ─── */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? colors.background : '#F1F5F9', borderColor: colors.border, borderRadius: radius.circular }]}>
              <Ionicons name="search" size={18} color={colors.textLight} style={{ marginRight: spacing.sm }} />
              <TextInput
                ref={searchInputRef}
                placeholder="Search messages or contacts..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.regular }]}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textLight} />
                </Pressable>
              )}
            </View>
          </View>

          {/* ─── FILTER CHIPS ─── */}
          {!searchQuery && (
            <View style={styles.chipsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {(['All', 'Unread', 'Groups', 'Pinned'] as FilterType[]).map((filter) => {
                  const isSel = selectedFilter === filter;
                  return (
                    <Pressable
                      key={filter}
                      onPress={() => handleSelectFilter(filter)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: isSel ? `${colors.primary}15` : isDark ? colors.surface : '#F1F5F9',
                          borderColor: isSel ? `${colors.primary}25` : colors.border,
                          borderRadius: radius.circular,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: isSel ? colors.primary : colors.textMuted, fontFamily: typography.fonts.bold }]}>
                        {filter}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ─── MAIN LIST CONTENT ─── */}
          {isConversationsLoading ? (
            <View style={{ flex: 1 }}>
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={{ alignItems: 'center', marginRight: 16 }}>
                      <Skeleton width={50} height={50} borderRadius={25} />
                      <Skeleton width={40} height={10} style={{ marginTop: 6 }} />
                    </View>
                  ))}
                </View>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Skeleton width={48} height={48} borderRadius={24} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Skeleton width="60%" height={14} />
                      <Skeleton width="80%" height={10} style={{ marginTop: 6 }} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Skeleton width={30} height={10} />
                      <Skeleton width={16} height={16} borderRadius={8} style={{ marginTop: 6 }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : searchQuery.trim() ? (
            // RENDER SEARCH RESULTS MODE
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              {/* Section A: Contacts */}
              <Text style={[styles.searchHeadingText, { color: colors.textMuted, fontFamily: typography.fonts.bold }]}>
                CONTACTS ({globalSearchResults.contacts?.length || 0})
              </Text>
              {(!globalSearchResults.contacts || globalSearchResults.contacts.length === 0) ? (
                <Text style={[styles.noResultsText, { color: colors.textLight, fontFamily: typography.fonts.medium }]}>No matching contacts</Text>
              ) : (
                globalSearchResults.contacts.map((emp: any) => (
                  <Pressable
                    key={emp.id}
                    onPress={() => handleSelectEmployee(emp.id)}
                    style={[styles.chatCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                  >
                    <Avatar name={emp.name} size={42} source={emp.avatarUrl || undefined} />
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                        {emp.name}
                      </Text>
                      <Text style={[styles.cardSnippetText, { color: colors.textMuted }]} numberOfLines={1}>
                        {emp.designation} • {emp.department || 'Employee'}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}

              {/* Section B: Conversations */}
              <Text style={[styles.searchHeadingText, { color: colors.textMuted, fontFamily: typography.fonts.bold, marginTop: 20 }]}>
                CONVERSATIONS ({globalSearchResults.conversations?.length || 0})
              </Text>
              {(!globalSearchResults.conversations || globalSearchResults.conversations.length === 0) ? (
                <Text style={[styles.noResultsText, { color: colors.textLight, fontFamily: typography.fonts.medium }]}>No matching conversations</Text>
              ) : (
                globalSearchResults.conversations.map((conv: any) => {
                  const title = conv.name || (conv.type === 'direct' ? conv.participants.find((p: any) => p.employeeId !== authUser?.id)?.name : 'Group Chat') || 'Chat';
                  const avatar = conv.avatar || (conv.type === 'direct' ? conv.participants.find((p: any) => p.employeeId !== authUser?.id)?.avatar : null) || null;
                  return (
                    <Pressable
                      key={conv.id}
                      onPress={() => {
                        setSearchQuery('');
                        router.push(`/chat/${conv.id}`);
                      }}
                      style={[styles.chatCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                    >
                      <Avatar name={title} size={42} source={avatar || undefined} />
                      <View style={styles.cardBody}>
                        <Text style={[styles.cardTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          {title}
                        </Text>
                        <Text style={[styles.cardSnippetText, { color: colors.textMuted }]} numberOfLines={1}>
                          {conv.description || 'Active conversation'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}

              {/* Section C: Messages */}
              <Text style={[styles.searchHeadingText, { color: colors.textMuted, fontFamily: typography.fonts.bold, marginTop: 20 }]}>
                MESSAGES ({globalSearchResults.messages?.length || 0})
              </Text>
              {(!globalSearchResults.messages || globalSearchResults.messages.length === 0) ? (
                <Text style={[styles.noResultsText, { color: colors.textLight, fontFamily: typography.fonts.medium }]}>No matching messages</Text>
              ) : (
                globalSearchResults.messages.map((msg: any) => (
                  <Pressable
                    key={msg.id}
                    onPress={() => {
                      setSearchQuery('');
                      router.push(`/chat/${msg.conversationId}`);
                    }}
                    style={[styles.chatCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                  >
                    <Avatar name={msg.senderName} size={36} source={msg.senderAvatar || undefined} />
                    <View style={styles.cardBody}>
                      <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                          {msg.senderName}
                        </Text>
                        <Text style={[styles.cardTimeText, { color: colors.textLight }]}>
                          {dayjs(msg.createdAt).format('hh:mm A')}
                        </Text>
                      </View>
                      <Text style={[styles.cardSnippetText, { color: colors.textMuted }]} numberOfLines={1}>
                        {msg.matchedSnippet || msg.content}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}

              {/* Section D: Files */}
              <Text style={[styles.searchHeadingText, { color: colors.textMuted, fontFamily: typography.fonts.bold, marginTop: 20 }]}>
                FILES ({globalSearchResults.files?.length || 0})
              </Text>
              {(!globalSearchResults.files || globalSearchResults.files.length === 0) ? (
                <Text style={[styles.noResultsText, { color: colors.textLight, fontFamily: typography.fonts.medium }]}>No matching files</Text>
              ) : (
                globalSearchResults.files.map((file: any) => (
                  <Pressable
                    key={file.id}
                    onPress={() => {
                      setSearchQuery('');
                      router.push(`/chat/preview?url=${encodeURIComponent(file.media?.url || '')}&type=${file.type === 'image' ? 'image' : 'file'}&name=${encodeURIComponent(file.media?.fileName || '')}` as any);
                    }}
                    style={[styles.chatCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                  >
                    <View style={{ marginRight: 12, justifyContent: 'center' }}>
                      <Ionicons name="document-attach" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitleText, { color: colors.text, fontFamily: typography.fonts.bold }]} numberOfLines={1}>
                          {file.media?.fileName || 'File'}
                        </Text>
                        <Text style={[styles.cardTimeText, { color: colors.textLight }]}>
                          {dayjs(file.createdAt).format('hh:mm A')}
                        </Text>
                      </View>
                      <Text style={[styles.cardSnippetText, { color: colors.textMuted }]} numberOfLines={1}>
                        {file.conversationName} • By {file.senderName}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          ) : (
            // STANDARD LIST MODE
            <View style={{ flex: 1 }}>
              {/* Active Now horizontal row */}
              {activeNowList.length > 0 && (
                <View style={[styles.activeNowWrapper, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                    Active Now
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {activeNowList.map((emp) => {
                      const isOnline = onlineUserIds.has(emp.id);
                      const typingInfo = getUserTypingStatusInAnyChat(emp.id);
                      const presence = statuses[emp.id];
                      const currentStatus = isOnline ? (presence?.status || 'available') : 'offline';
                      const statusEmoji = isOnline ? (presence?.emoji || null) : null;

                      let statusColor = (() => {
                        switch (currentStatus) {
                          case 'available': return '#10B981';
                          case 'away': return '#F59E0B';
                          case 'dnd': return '#EF4444';
                          case 'offline':
                          default: return colors.textLight;
                        }
                      })();

                      let statusText = currentStatus === 'available'
                        ? 'Online'
                        : currentStatus === 'dnd'
                          ? 'DND'
                          : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
                      
                      if (typingInfo) {
                        statusColor = '#10B981';
                        statusText = typingInfo.isRecording ? 'Recording...' : 'Typing...';
                      }

                      return (
                        <Pressable
                          key={emp.id}
                          onPress={() => handleSelectEmployee(emp.id)}
                          style={styles.activeUserItem}
                        >
                          <View style={styles.activeAvatarWrapper}>
                            <Avatar name={emp.name} size={48} source={emp.avatarUrl || undefined} />
                            <View style={[styles.activePresenceDot, { backgroundColor: statusColor, borderColor: colors.card }]} />
                          </View>
                          <Text style={[styles.activeUserName, { color: colors.text, fontFamily: typography.fonts.medium }]} numberOfLines={1}>
                            {formatActiveName(emp.name)}{statusEmoji ? ` ${statusEmoji}` : ''}
                          </Text>
                          <Text style={[styles.activeUserStatus, { color: typingInfo ? '#10B981' : colors.textMuted }]} numberOfLines={1}>
                            {statusText}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <AnyFlashList
                data={displayChats}
                keyExtractor={(item: ChatConversation) => item.id}
                estimatedItemSize={72}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
                refreshControl={
                  <RefreshControl
                    refreshing={isConversationsLoading || isArchivedLoading}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                  />
                }
                ListEmptyComponent={() => (
                  <View style={styles.emptyView}>
                    <EmptyState title="No Conversations" description="Tap the button below to start a direct or group conversation." icon="chatbubble-ellipses-outline" />
                  </View>
                )}
                renderItem={({ item: conv }: { item: ChatConversation }) => {
                  const { isOnline, userStatus, statusEmoji } = getChatMetadata(conv);
                  const { isPinned, isMuted } = getConvPinMuteStatus(conv);
                  const typingState = typingUsers[conv.id];

                  return (
                    <ConversationCard
                      conv={conv}
                      colors={colors}
                      spacing={spacing}
                      radius={radius}
                      typography={typography}
                      currentUserId={authUser?.id || ''}
                      isOnline={isOnline}
                      userStatus={userStatus}
                      statusEmoji={statusEmoji}
                      typingState={typingState}
                      isPinned={isPinned}
                      isMuted={isMuted}
                      onPress={(c) => router.push(`/chat/${c.id}`)}
                      onLongPress={(c) => setLongPressedChat(c)}
                      onTogglePin={handleTogglePin}
                      onToggleMute={(c) => handleToggleMute(c.id)}
                      onMarkRead={handleMarkRead}
                      onQuickReply={(c) => {
                        setQuickReplyChat(c);
                        setQuickReplyText('');
                      }}
                      renderDeliveryStatus={renderDeliveryStatus}
                      getMessagePreview={getMessagePreview}
                      getTypingPreview={getTypingPreview}
                      formatMessageTime={formatMessageTime}
                    />
                  );
                }}
              />
            </View>
          )}
        </View>
      ) : activeTab === 'calls' ? (
        // ─── CALLS TAB MODE ───
        <AnyFlashList
          data={callHistory}
          keyExtractor={(item: any) => item.id}
          estimatedItemSize={72}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          refreshControl={
            <RefreshControl
              refreshing={isCallsLoading}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyView}>
              <EmptyState title="No Call Logs" description="Your incoming, outgoing and missed calls will appear here." icon="call-outline" />
            </View>
          )}
          renderItem={({ item }: { item: any }) => {
            const isCallerMe = item.callerId === authUser?.id;
            const otherPersonId = isCallerMe ? item.calleeId : item.callerId;
            const otherPersonName = isCallerMe ? item.calleeName : item.callerName;
            const otherPersonAvatar = isCallerMe ? item.calleeAvatar : item.callerAvatar;
            
            // 'call-received' style: incoming = arrow coming in, outgoing = arrow going out
            let statusIcon = 'arrow-down-outline';   // incoming call (received)
            let statusColor = colors.success;
            if (item.status === 'missed') {
              statusIcon = 'arrow-down-outline';      // missed incoming
              statusColor = colors.danger;
            } else if (item.status === 'rejected') {
              statusIcon = 'close-circle-outline';
              statusColor = colors.textLight;
            } else if (isCallerMe) {
              statusIcon = 'arrow-up-outline';        // outgoing call
              statusColor = colors.info;
            }

            const isVideo = item.callType === 'video';
            const callTypeParam = item.callType === 'voice' ? 'audio' : (item.callType as 'audio' | 'video');

            const formatDuration = (d: number | undefined) => {
              if (!d) return '';
              const m = Math.floor(d / 60);
              const s = d % 60;
              return m + 'm ' + s + 's';
            };

            return (
              <Pressable
                key={item.id}
                style={[styles.chatCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                onPress={() => {
                  initiateCall(otherPersonId, callTypeParam, item.conversationId || '');
                }}
              >
                <Avatar name={otherPersonName} size={48} source={otherPersonAvatar || undefined} />
                
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitleText, { color: colors.text, fontFamily: typography.fonts.semibold }]} numberOfLines={1}>
                      {otherPersonName}
                    </Text>
                    <Text style={[styles.cardTimeText, { color: colors.textLight, fontFamily: typography.fonts.medium }]}>
                      {dayjs(item.createdAt || item.startedAt).format('hh:mm A')}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={statusIcon as any} size={15} color={statusColor} style={{ marginRight: 6 }} />
                      <Text style={[styles.cardSnippetText, { color: colors.textMuted, fontFamily: typography.fonts.regular }]}>
                        {item.status === 'missed' ? 'Missed' : isCallerMe ? 'Outgoing' : 'Incoming'} Call
                        {item.duration ? ' • ' + formatDuration(item.duration) : ''}
                      </Text>
                    </View>

                    <Pressable
                      style={{ padding: 6 }}
                      onPress={() => initiateCall(otherPersonId, callTypeParam, item.conversationId || '')}
                    >
                      <Ionicons name={isVideo ? 'videocam-outline' : 'call-outline'} size={20} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      ) : null}

      {/* ─── FLOATING ACTION BUTTON (+) ─── */}
      {activeTab === 'chats' && (
        <Pressable
          onPress={() => router.push('/chat/new-chat')}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            pressed && { opacity: 0.8 },
            shadows.heavy,
          ]}
        >
          <Ionicons name="create-outline" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {/* ─── PIN PASSCODE UNLOCK MODAL ─── */}
      <Modal
        visible={pinUnlockVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPinUnlockVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(9,13,22,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setPinUnlockVisible(false)}
        >
          <Pressable
            style={{ width: '80%', backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, borderColor: colors.border, borderWidth: 1, alignItems: 'center' }}
            onPress={(e) => e.stopPropagation()}
          >
            <Ionicons name="lock-closed-outline" size={42} color={colors.primary} />
            <Text style={{ fontSize: 16, color: colors.text, fontFamily: typography.fonts.bold, marginTop: spacing.md }}>
              Enter Hidden Chats PIN
            </Text>
            <TextInput
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              value={pinValue}
              onChangeText={setPinValue}
              style={{ width: '60%', borderBottomWidth: 2, borderBottomColor: colors.primary, fontSize: 24, textAlign: 'center', marginVertical: spacing.lg, color: colors.text }}
            />
            <View style={{ flexDirection: 'row', width: '100%' }}>
              <Pressable
                onPress={() => setPinUnlockVisible(false)}
                style={{ flex: 1, height: 40, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.bold }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleVerifyPin}
                style={{ flex: 1, height: 40, backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Unlock</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── QUICK PROFILE DETAIL MODAL ─── */}
      <Modal
        visible={!!selectedEmployeeProfile}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedEmployeeProfile(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(9,13,22,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setSelectedEmployeeProfile(null)}
        >
          <Pressable
            style={{ width: '80%', backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderColor: colors.border, borderWidth: 1 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Avatar name={selectedEmployeeProfile?.name || 'User'} size={80} source={selectedEmployeeProfile?.avatarUrl || undefined} />
            
            <Text style={{ fontSize: 16, color: colors.text, fontFamily: typography.fonts.bold, marginTop: spacing.md }} numberOfLines={1}>
              {selectedEmployeeProfile?.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.primary, fontFamily: typography.fonts.semibold }}>
              {selectedEmployeeProfile?.designation || 'Staff'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: typography.fonts.medium }}>
              {selectedEmployeeProfile?.department || 'Office'}
            </Text>

            <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.lg, paddingTop: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                <Ionicons name="mail-outline" size={16} color={colors.textLight} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: colors.text, fontFamily: typography.fonts.regular }} numberOfLines={1}>
                  {selectedEmployeeProfile?.email || 'No email registered'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                <Ionicons name="call-outline" size={16} color={colors.textLight} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: colors.text, fontFamily: typography.fonts.regular }}>
                  {selectedEmployeeProfile?.phone || 'No phone registered'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', width: '100%', marginTop: spacing.lg }}>
              <Pressable
                onPress={() => setSelectedEmployeeProfile(null)}
                style={{ flex: 1, height: 40, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm }}
              >
                <Text style={{ color: colors.text, fontFamily: typography.fonts.semibold }}>Close</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const empId = selectedEmployeeProfile.id;
                  setSelectedEmployeeProfile(null);
                  handleSelectEmployee(empId);
                }}
                style={{ flex: 1, height: 40, backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.semibold }}>Start Chat</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── LONG PRESS BOTTOM SHEET MODAL ─── */}
      <Modal
        visible={!!longPressedChat}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLongPressedChat(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(9,13,22,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setLongPressedChat(null)}
        >
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md }} />
            
            {longPressedChat && (() => {
              const { isPinned, isMuted } = getConvPinMuteStatus(longPressedChat);
              const partner = longPressedChat.participants.find((p) => p.employeeId !== authUser?.id);
              const title = longPressedChat.type === 'direct' ? partner?.name || 'Direct Chat' : longPressedChat.name || 'Group Chat';
              
              return (
                <View>
                  <Text style={{ fontSize: 15, color: colors.text, fontFamily: typography.fonts.bold, textAlign: 'center', marginBottom: spacing.lg }}>
                    {title}
                  </Text>
                  
                  {[
                    {
                      label: isPinned ? 'Unpin Conversation' : 'Pin Conversation',
                      icon: 'pin-outline',
                      color: colors.text,
                      onPress: () => {
                        handleTogglePin(longPressedChat);
                        setLongPressedChat(null);
                      }
                    },
                    {
                      label: isMuted ? 'Unmute Conversation' : 'Mute Conversation',
                      icon: isMuted ? 'volume-high-outline' : 'volume-mute-outline',
                      color: colors.text,
                      onPress: () => {
                        handleToggleMute(longPressedChat.id);
                        setLongPressedChat(null);
                      }
                    },
                    {
                      label: 'Mark as Read',
                      icon: 'mail-open-outline',
                      color: colors.text,
                      onPress: () => {
                        handleMarkRead(longPressedChat);
                        setLongPressedChat(null);
                      }
                    },
                    {
                      label: 'Delete Conversation',
                      icon: 'trash-outline',
                      color: colors.danger,
                      onPress: () => {
                        handleDeleteConversation(longPressedChat.id);
                        setLongPressedChat(null);
                      }
                    },
                    {
                      label: 'View Contact Details',
                      icon: 'information-circle-outline',
                      color: colors.primary,
                      onPress: () => {
                        setLongPressedChat(null);
                        router.push(`/chat/contact-info?id=${longPressedChat.id}`);
                      }
                    }
                  ].map((option, idx) => (
                    <Pressable
                      key={idx}
                      onPress={option.onPress}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx < 4 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }}
                    >
                      <Ionicons name={option.icon as any} size={20} color={option.color} style={{ marginRight: 12 }} />
                      <Text style={{ fontSize: 13, color: option.color, fontFamily: typography.fonts.semibold }}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })()}
          </View>
        </Pressable>
      </Modal>

      {/* ─── QUICK REPLY INPUT DIALOG ─── */}
      <Modal
        visible={!!quickReplyChat}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQuickReplyChat(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(9,13,22,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setQuickReplyChat(null)}
        >
          <Pressable
            style={{ width: '85%', backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, borderColor: colors.border, borderWidth: 1 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 15, color: colors.text, fontFamily: typography.fonts.bold, marginBottom: spacing.sm }}>
              Quick Reply
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: spacing.md }}>
              Replying to: {quickReplyChat?.name || 'Direct Chat'}
            </Text>
            
            <TextInput
              placeholder="Type your message..."
              placeholderTextColor={colors.textLight}
              value={quickReplyText}
              onChangeText={setQuickReplyText}
              autoFocus
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontFamily: typography.fonts.regular, minHeight: 60, textAlignVertical: 'top', marginBottom: spacing.md }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable
                onPress={() => setQuickReplyChat(null)}
                style={{ paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 }}
              >
                <Text style={{ color: colors.textMuted, fontFamily: typography.fonts.bold }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSendQuickReply}
                style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: typography.fonts.bold }}>Send</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
  },
  headerRightRow: {
    flexDirection: 'row',
  },
  headerBtn: {
    padding: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 90,
    right: 16,
    width: 160,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    zIndex: 999,
    elevation: 3,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownOptionText: {
    fontSize: 12,
  },
  tabsWrapper: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabSelectBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelectText: {
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  chipsWrapper: {
    paddingVertical: 8,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
  },
  activeNowWrapper: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    marginLeft: 16,
    marginBottom: 8,
  },
  activeUserItem: {
    alignItems: 'center',
    width: 68,
    marginRight: 10,
  },
  activeAvatarWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  activePresenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  activeUserName: {
    fontSize: 10,
    textAlign: 'center',
    width: '100%',
  },
  activeUserStatus: {
    fontSize: 8,
    textAlign: 'center',
    width: '100%',
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  presenceDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitleText: {
    fontSize: 14,
  },
  cardTimeText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSnippetText: {
    fontSize: 12,
  },
  searchHeadingText: {
    fontSize: 11,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 12,
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  emptyView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
});
