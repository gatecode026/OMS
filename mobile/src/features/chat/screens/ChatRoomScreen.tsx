import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  AppState,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import useTheme from '../../../shared/hooks/useTheme';
import useAuthStore from '../../../shared/store/authStore';
import { useChatSettingsStore } from '../../../shared/store/chatSettingsStore';
import { toast } from '../../../shared/components/Toast';
import { connectSocket, getSocket } from '../../../shared/services/socketManager';
import { usePresenceStore } from '../../../shared/store/presenceStore';
import { useCall } from '../../../shared/providers/CallProvider';
import { useDraftStore } from '../../../shared/store/draftStore';
import EmojiPicker from '../components/EmojiPicker';
import { ChatMessage } from '../types';
import * as ImagePicker from 'expo-image-picker';

import {
  useConversations,
  useChatMessages,
  useMarkChatRead,
  usePinnedMessages,
  useBlockedUsers,
  useUnblockUser,
} from '../hooks/useChat';

import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageComposer from '../components/MessageComposer';
import AttachmentMenu from '../components/AttachmentMenu';
import MessageActionSheet from '../components/MessageActionSheet';
import MessageInfoModal from '../components/MessageInfoModal';
import ForwardMessageModal from '../components/ForwardMessageModal';
import SharedMediaModal from '../components/SharedMediaModal';
import AttachmentPreviewModal, { PreviewItem } from '../components/AttachmentPreviewModal';

import MessageActionManager from '../services/MessageActionManager';
import useMessageActionStore from '../stores/useMessageActionStore';
import useSharedMediaStore from '../stores/useSharedMediaStore';

// Advanced Providers
import { ChatThemeProvider } from '../components/ChatThemeProvider';
import { BottomSheetManagerProvider, useBottomSheetManager } from '../components/BottomSheetManager';
import { AttachmentProvider, AttachmentPlugin } from '../components/AttachmentProvider';
import { ChatErrorBoundary } from '../components/ChatErrorBoundary';

// Hooks
import useMessageSending from '../hooks/useMessageSending';
import useUploadQueue from '../hooks/useUploadQueue';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import useAttachmentPicker from '../hooks/useAttachmentPicker';
import useTyping from '../hooks/useTyping';
import useReply from '../hooks/useReply';
import useMessageReactions from '../hooks/useMessageReactions';

// Enterprise Config & Analytics
import { useChatFeatureFlags } from '../services/chatFeatureConfig';
import { useChatAnalytics } from '../hooks/useChatAnalytics';

const ChatRoomScreenInner: React.FC = () => {
  const queryClient = useQueryClient();
  const { id: conversationId, msgId } = useLocalSearchParams<{ id: string; msgId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const authUser = useAuthStore((s) => s.user);

  const { activeCall, initiateCall } = useCall();
  const { activeSheet, sheetData, openSheet, closeSheet } = useBottomSheetManager();

  const {
    infoMessage,
    setInfoMessage,
    forwardingMessages,
    setForwardingMessages,
    isForwardModalOpen,
    setIsForwardModalOpen,
  } = useMessageActionStore();

  const { isModalOpen: isSharedMediaOpen, setIsModalOpen: setIsSharedMediaOpen } = useSharedMediaStore();

  const wallpaperConfig = useChatSettingsStore(
    useCallback((s) => s.getWallpaper(conversationId || ''), [conversationId])
  );

  const resolvedWallpaper = useMemo(() => {
    if (wallpaperConfig && wallpaperConfig.type !== 'default') {
      return wallpaperConfig;
    }
    return { type: 'solid', value: colors.background };
  }, [wallpaperConfig, colors.background]);

  const flags = useChatFeatureFlags();
  const analytics = useChatAnalytics();

  const [messageText, setMessageText] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>(undefined);
  
  const flatListRef = useRef<any>(null);
  const sendingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Scroll to targeted search result message
  useEffect(() => {
    if (msgId && localMessages.length > 0) {
      setHighlightedMessageId(msgId);
      const index = localMessages.findIndex((m) => m.id === msgId);
      if (index !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5,
          });
        }, 400);
      }
      const timer = setTimeout(() => {
        setHighlightedMessageId(undefined);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [msgId, localMessages.length]);

  // API query bindings
  const { data: conversations = [] } = useConversations();
  const { data: dbMessages, isLoading } = useChatMessages(conversationId || '');
  const { mutate: markRead } = useMarkChatRead();
  const { data: pinnedMessages = [] } = usePinnedMessages(conversationId || '');
  const { data: blockedData, refetch: refetchBlocked } = useBlockedUsers();
  const { mutate: unblockUserMutate } = useUnblockUser();

  const blockedList = useMemo(() => blockedData?.blockedUsers || [], [blockedData]);
  const blockedByList = useMemo(() => blockedData?.blockedByUsers || [], [blockedData]);

  // Find conversation metadata
  const conversation = useMemo(() => {
    return conversations.find((c) => c.id === conversationId);
  }, [conversations, conversationId]);

  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const statuses = usePresenceStore((s) => s.statuses);
  const chatscreenUsers = usePresenceStore((s) => s.chatscreenUsers);

  const chatMeta = useMemo(() => {
    if (!conversation) {
      return {
        title: 'Chat',
        avatar: null,
        otherUser: null,
        isOnline: false,
        userStatus: 'offline',
        statusEmoji: null,
        otherUserIsOnChatScreen: false,
        isBlocked: false,
        isBlockedByMe: false,
        isBlockedByThem: false,
      };
    }
    if (conversation.type === 'direct') {
      const myId = String(authUser?.id || (authUser as any)?.employeeId || (authUser as any)?._id || '');
      const otherUser = conversation.participants.find((p) => {
        const pId = String(p.employeeId || (p as any).id || (p as any)._id || (p as any).userId || '');
        return pId && pId !== myId;
      });
      const otherId = otherUser ? String(otherUser.employeeId || (otherUser as any).id || (otherUser as any)._id || (otherUser as any).userId || '') : '';
      const isBlockedByMe = blockedList.some((b) => b.id === otherId);
      const isBlockedByThem = blockedByList.includes(otherId);
      const isBlocked = isBlockedByMe || isBlockedByThem;

      const isOnline = isBlocked ? false : (otherId ? onlineUserIds.has(otherId) : false);
      const presence = isBlocked ? null : (otherId ? statuses[otherId] : null);
      const inCall = !!(activeCall && activeCall.targetUser?.id === otherId && (activeCall.status === 'active' || activeCall.status === 'ringing'));
      const otherAvatar = otherUser?.avatar || (otherUser as any)?.avatarUrl || (otherUser as any)?.profilePhoto || (otherUser as any)?.photoUrl || null;
      return {
        title: otherUser?.name || 'User',
        avatar: otherAvatar,
        otherUser,
        isOnline,
        userStatus: isOnline ? (presence?.status || 'available') : 'offline',
        statusEmoji: isOnline ? (presence?.emoji || null) : null,
        otherUserIsOnChatScreen: otherId ? !!chatscreenUsers[otherId] : false,
        lastSeen: isBlocked ? null : (presence?.lastSeen || (otherUser as any)?.lastSeen || null),
        inCall,
        isBlocked,
        isBlockedByMe,
        isBlockedByThem,
      };
    }
    return {
      title: conversation.name || 'Group Chat',
      avatar: conversation.avatar || null,
      otherUser: null,
      isOnline: false,
      userStatus: 'offline',
      statusEmoji: null,
      otherUserIsOnChatScreen: false,
      inCall: false,
      isBlocked: false,
      isBlockedByMe: false,
      isBlockedByThem: false,
    };
  }, [conversation, authUser, onlineUserIds, statuses, chatscreenUsers, activeCall, blockedList, blockedByList]);

  // Sync DB messages with real-time updates (preserving pending optimistic uploads/sends)
  useEffect(() => {
    if (dbMessages) {
      setLocalMessages((prevLocal) => {
        if (!prevLocal || prevLocal.length === 0) return dbMessages;
        const pendingOptimistic = prevLocal.filter(
          (m) =>
            (m.id.startsWith('temp_') || m.tempId) &&
            !dbMessages.some((dbM) => dbM.id === m.id || (m.tempId && dbM.tempId === m.tempId))
        );
        if (pendingOptimistic.length === 0) return dbMessages;
        const merged = [...dbMessages, ...pendingOptimistic];
        return merged.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    }
  }, [dbMessages]);

  // Mark conversation as read whenever entering chat room or receiving new messages
  useEffect(() => {
    if (conversationId) {
      markRead(conversationId);
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('mark_read', { conversationId });
      }
    }
  }, [conversationId, dbMessages?.length]);

  // Load draft text on conversation change
  useEffect(() => {
    if (conversationId) {
      const draft = useDraftStore.getState().getDraft(conversationId);
      setMessageText(draft || '');
    }
  }, [conversationId]);

  const [isScreenFocused, setIsScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, [])
  );

  const typingUsers = usePresenceStore((s) => s.typingUsers);
  const typingState = typingUsers[conversationId || ''];

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

  const {
    replyTo,
    setReplyTo,
    isEditingMode,
    setIsEditingMode,
    clearReply,
    startReply,
  } = useReply();

  const { addReaction } = useMessageReactions();

  // Send / Edit Message hooks
  const {
    handleSend,
    handleRetrySend,
    handleDeleteMessage,
    handlePinMessage,
    handleStarMessage,
  } = useMessageSending({
    conversationId: conversationId || '',
    authUser,
    setLocalMessages,
  });

  const {
    uploadsProgress,
    uploadStates,
    uploadFileDirect,
    cancelUpload,
  } = useUploadQueue({
    conversationId: conversationId || '',
    authUser,
    setLocalMessages,
  });

  const uploadErrors = useMemo(() => {
    const errors: Record<string, boolean> = {};
    Object.keys(uploadStates).forEach((key) => {
      if (uploadStates[key] === 'failed') {
        errors[key] = true;
      }
    });
    return errors;
  }, [uploadStates]);

  const {
    isRecording,
    recordingDuration,
    recordingLocked,
    startRecording,
    stopAndSendRecording,
    cancelRecording,
    lockRecording,
  } = useVoiceRecorder(conversationId || '', (uri, name, duration) => {
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      tempId,
      conversationId: conversationId || '',
      senderId: authUser?.id || '',
      senderName: authUser?.name || 'Me',
      senderAvatar: authUser?.avatar || authUser?.avatarUrl || null,
      senderRole: authUser?.role || 'employee',
      content: '',
      type: 'audio',
      contentType: 'plain',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isEdited: false,
      media: {
        url: uri,
        fileName: name,
        fileSize: 0,
        mimeType: 'audio/m4a',
        duration,
      },
    };
    setLocalMessages((prev) => [...prev, optimisticMsg]);
    queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
      const list = Array.isArray(oldData) ? oldData : [];
      return [...list, optimisticMsg];
    });
    uploadFileDirect(uri, name, 'audio/m4a', tempId, 'audio');
  });

  const handleSendCustomizedItems = (customized: any[]) => {
    setPreviewVisible(false);
    customized.forEach((item) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        tempId,
        conversationId: conversationId || '',
        senderId: authUser?.id || '',
        senderName: authUser?.name || 'Me',
        senderAvatar: authUser?.avatar || authUser?.avatarUrl || null,
        senderRole: authUser?.role || 'employee',
        content: '',
        type: item.type,
        contentType: 'plain',
        createdAt: new Date().toISOString(),
        isDeleted: false,
        isEdited: false,
        media: {
          url: item.uri,
          fileName: item.name,
          fileSize: 0,
          mimeType: item.mimeType,
        } as any,
      };
      setLocalMessages((prev) => [...prev, optimisticMsg]);
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
        const list = Array.isArray(oldData) ? oldData : [];
        return [...list, optimisticMsg];
      });
      uploadFileDirect(item.uri, item.name, item.mimeType, tempId, item.type);
    });
  };

  const {
    handleAttachImage,
    handleCameraCapture,
    handleDocumentPicker,
    handleMockAttachment,
  } = useAttachmentPicker({
    conversationId: conversationId || '',
    onPickedFiles: (items) => {
      setPreviewItems(items);
      setPreviewVisible(true);
    },
    onSendMock: (label, desc) => {
      const tempId = `temp_${Date.now()}`;
      const type = label.toLowerCase() as any;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        tempId,
        conversationId: conversationId || '',
        senderId: authUser?.id || '',
        senderName: authUser?.name || 'Me',
        senderAvatar: authUser?.avatar || authUser?.avatarUrl || null,
        senderRole: authUser?.role || 'employee',
        content: desc,
        type,
        contentType: 'plain',
        createdAt: new Date().toISOString(),
        isDeleted: false,
        isEdited: false,
      };
      setLocalMessages((prev) => [...prev, optimisticMsg]);
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
        const list = Array.isArray(oldData) ? oldData : [];
        return [...list, optimisticMsg];
      });
      getSocket().emit('send_message', {
        conversationId,
        content: desc,
        type,
        tempId,
      });
      toast.success(`${label} linked successfully!`);
    },
  });

  const { updateTypingStatus, forceStopTyping } = useTyping(conversationId || '');

  // Monitor retrying messages for auto-resend timeouts
  useEffect(() => {
    if (!dbMessages) return;
    dbMessages.forEach((msg) => {
      if (msg.status === 'retrying' && !sendingTimeoutsRef.current[msg.id]) {
        const tempId = msg.id;
        sendingTimeoutsRef.current[tempId] = setTimeout(() => {
          const markFailed = (prev: ChatMessage[]) => {
            if (!prev) return [];
            return prev.map(m => m.id === tempId ? { ...m, status: 'failed' as const, failureReason: 'timeout' as const } : m);
          };
          setLocalMessages(markFailed);
          queryClient.setQueryData(['chat', 'messages', conversationId], markFailed);
          delete sendingTimeoutsRef.current[tempId];
        }, 10000);
      }
    });
  }, [dbMessages, conversationId]);

  // Connect socket room listeners with AppState and Focus guards
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      const socket = getSocket();
      if (nextAppState === 'active' && isScreenFocused && conversationId) {
        usePresenceStore.getState().setActiveConversationId(conversationId);
        if (socket.connected) {
          socket.emit('mark_read', { conversationId });
          socket.emit('user_chatscreen_status', { isOnChatScreen: true });
          socket.emit('viewing_chat', { conversationId, isViewing: true });
          markRead(conversationId);
        }
      } else {
        usePresenceStore.getState().setActiveConversationId(null);
        if (socket.connected) {
          socket.emit('user_chatscreen_status', { isOnChatScreen: false });
          socket.emit('viewing_chat', { conversationId, isViewing: false });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (isScreenFocused && conversationId && AppState.currentState === 'active') {
      usePresenceStore.getState().setActiveConversationId(conversationId);
      const socket = connectSocket();

      const handleConnect = () => {
        console.log('[ChatRoomScreen] Socket connected, joining room and marking read...');
        socket.emit('join_conversation', conversationId);
        socket.emit('mark_read', { conversationId });
        socket.emit('user_chatscreen_status', { isOnChatScreen: true });
        socket.emit('viewing_chat', { conversationId, isViewing: true });
        socket.emit('get_online_users');
      };

      if (socket.connected) {
        handleConnect();
      }

      socket.on('connect', handleConnect);
      markRead(conversationId);

      const handleMsgDelivered = ({ tempId }: any) => {
        if (tempId && sendingTimeoutsRef.current[tempId]) {
          clearTimeout(sendingTimeoutsRef.current[tempId]);
          delete sendingTimeoutsRef.current[tempId];
        }
      };

      socket.on('message_delivered', handleMsgDelivered);

      return () => {
        subscription.remove();
        socket.off('connect', handleConnect);
        socket.off('message_delivered', handleMsgDelivered);
        socket.emit('user_chatscreen_status', { isOnChatScreen: false });
        socket.emit('viewing_chat', { conversationId, isViewing: false });
        usePresenceStore.getState().setActiveConversationId(null);
      };
    } else {
      usePresenceStore.getState().setActiveConversationId(null);
      return () => {
        subscription.remove();
      };
    }
  }, [conversationId, isScreenFocused]);

  const handleStartEdit = () => {
    if (sheetData) {
      setIsEditingMode(true);
      setMessageText(sheetData.content);
    }
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);
    updateTypingStatus(text);
    if (conversationId) {
      useDraftStore.getState().setDraft(conversationId, text);
    }
  };

  const handleSendTrigger = () => {
    analytics.trackMessageSent(isEditingMode ? 'edit' : 'text');
    handleSend(messageText, isEditingMode, sheetData, replyTo, () => {
      setMessageText('');
      setIsEditingMode(false);
      closeSheet();
      setReplyTo(null);
      forceStopTyping();
      if (conversationId) {
        useDraftStore.getState().clearDraft(conversationId);
      }
    });
  };

  const handleSelectEmoji = (emoji: string) => {
    setMessageText((prev) => {
      const nextText = prev + emoji;
      if (conversationId) {
        useDraftStore.getState().setDraft(conversationId, nextText);
      }
      return nextText;
    });
  };

  const handleSelectReaction = (emoji: string) => {
    const activeMsg = sheetData;
    if (activeMsg) {
      addReaction(activeMsg.id, emoji);
    }
  };

  // Call initiators
  const handleVoiceCallInit = () => {
    if (conversation?.type === 'direct' && chatMeta.otherUser) {
      analytics.trackCallStarted('audio', conversationId || '');
      initiateCall(chatMeta.otherUser.employeeId, 'audio', conversationId, {
        name: chatMeta.otherUser.name,
        avatar: chatMeta.otherUser.avatar || undefined,
        role: (chatMeta.otherUser as any).designation || chatMeta.otherUser.role,
        department: (chatMeta.otherUser as any).department,
      });
    } else {
      toast.error('Calls are only available in Direct Chats');
    }
  };

  const handleVideoCallInit = () => {
    if (conversation?.type === 'direct' && chatMeta.otherUser) {
      analytics.trackCallStarted('video', conversationId || '');
      initiateCall(chatMeta.otherUser.employeeId, 'video', conversationId, {
        name: chatMeta.otherUser.name,
        avatar: chatMeta.otherUser.avatar || undefined,
        role: (chatMeta.otherUser as any).designation || chatMeta.otherUser.role,
        department: (chatMeta.otherUser as any).department,
      });
    } else {
      toast.error('Calls are only available in Direct Chats');
    }
  };

  const attachmentPlugins: AttachmentPlugin[] = [
    {
      id: 'camera',
      label: 'Camera',
      icon: 'camera',
      backgroundColor: '#E0F2FE',
      iconColor: '#0284C7',
      action: () => { handleCameraCapture(); },
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: 'image',
      backgroundColor: '#F0FDF4',
      iconColor: '#16A34A',
      action: () => { handleAttachImage(); },
    },
    {
      id: 'document',
      label: 'Document',
      icon: 'document-text',
      backgroundColor: '#FEF3C7',
      iconColor: '#D97706',
      action: () => { handleDocumentPicker(); },
    },
    {
      id: 'pdf',
      label: 'PDF',
      icon: 'document',
      backgroundColor: '#FEF2F2',
      iconColor: '#EF4444',
      action: () => { handleDocumentPicker(['application/pdf']); },
    },
    {
      id: 'excel',
      label: 'Excel',
      icon: 'grid',
      backgroundColor: '#ECFDF5',
      iconColor: '#10B981',
      action: () => {
        handleDocumentPicker([
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
        ]);
      },
    },
    {
      id: 'zip',
      label: 'Archive',
      icon: 'archive',
      backgroundColor: '#F1F5F9',
      iconColor: '#475569',
      action: () => {
        handleDocumentPicker([
          'application/zip',
          'application/x-tar',
          'application/x-rar-compressed',
        ]);
      },
    },
    flags.attendance && {
      id: 'attendance',
      label: 'Attendance',
      icon: 'time',
      backgroundColor: '#ECFDF5',
      iconColor: '#059669',
      action: () => {
        const payload = JSON.stringify({
          id: 'ATT-302',
          date: new Date().toISOString().split('T')[0],
          checkIn: '09:00 AM',
          checkOut: '06:00 PM',
          status: 'Present',
        });
        handleMockAttachment('Attendance', payload);
      },
    },
    flags.leave && {
      id: 'leave',
      label: 'Leave',
      icon: 'calendar',
      backgroundColor: '#FFF5F5',
      iconColor: '#E53E3E',
      action: () => {
        const payload = JSON.stringify({
          id: 'LEAVE-089',
          leaveType: 'Casual Leave Request',
          startDate: '2026-07-20',
          endDate: '2026-07-24',
          status: 'Pending',
        });
        handleMockAttachment('Leave', payload);
      },
    },
    flags.payslips && {
      id: 'payslip',
      label: 'Payslip',
      icon: 'card',
      backgroundColor: '#FDF2F8',
      iconColor: '#DB2777',
      action: () => {
        const payload = JSON.stringify({
          id: 'PAY-112',
          month: 'June 2026',
          salary: 'Confidential',
          status: 'Paid',
        });
        handleMockAttachment('Payslip', payload);
      },
    },
  ].filter(Boolean) as AttachmentPlugin[];

  // Pluggable Action buttons inside composer input bar
  const attachmentPluginButton = (
    <Pressable
      onPress={() => {
        if (activeSheet === 'attachments') {
          closeSheet();
        } else {
          openSheet('attachments');
        }
      }}
      style={styles.inputActionBtn}
    >
      <Ionicons
        name={activeSheet === 'attachments' ? 'close-circle' : 'add-circle-outline'}
        size={26}
        color={colors.textLight}
      />
    </Pressable>
  );

  const handleUnblockUser = () => {
    if (chatMeta.otherUser?.employeeId) {
      unblockUserMutate(chatMeta.otherUser.employeeId, {
        onSuccess: () => {
          refetchBlocked();
          toast.success('User unblocked successfully');
        },
        onError: (err: any) => {
          toast.error('Failed to unblock: ' + err.message);
        }
      });
    }
  };

  const emojiPluginButton = (
    <Pressable
      onPress={() => {
        if (activeSheet === 'emoji') {
          closeSheet();
        } else {
          openSheet('emoji');
        }
      }}
      style={styles.inputActionBtn}
    >
      <Ionicons
        name={activeSheet === 'emoji' ? 'close-circle' : 'happy-outline'}
        size={26}
        color={colors.textLight}
      />
    </Pressable>
  );

  return (
    <AttachmentProvider plugins={attachmentPlugins}>
      {/* ─── HEADER Boundary ─── */}
      <ChatErrorBoundary fallbackTitle="Chat Header crashed.">
        <ChatHeader
          conversationId={conversationId || ''}
          conversation={conversation}
          chatMeta={chatMeta}
          typingState={typingState}
          getTypingPreview={getTypingPreview}
          pinnedMessages={pinnedMessages}
          onScrollToMessage={(msgId) => {
            const idx = localMessages.findIndex(m => m.id === msgId);
            if (idx !== -1 && flatListRef.current) {
              flatListRef.current.scrollToIndex({ index: idx, animated: true });
            } else {
              toast.info('Message is older in chat history');
            }
          }}
          onVoiceCallInit={handleVoiceCallInit}
          onVideoCallInit={handleVideoCallInit}
          onOpenSharedMedia={() => setIsSharedMediaOpen(true)}
          insets={insets}
        />
      </ChatErrorBoundary>

      {/* ─── MESSAGES LIST Boundary ─── */}
      <ChatErrorBoundary fallbackTitle="Chat List crashed.">
        <MessageList
          flatListRef={flatListRef}
          localMessages={localMessages}
          isLoading={isLoading}
          currentUserId={authUser?.id || ''}
          isGroup={conversation?.type === 'group'}
          onLongPressMessage={(msg) => {
            openSheet('actions', msg);
          }}
          onSwipeReply={startReply}
          onRetryUpload={async (msg) => {
            uploadFileDirect(
              msg.media?.url || '',
              msg.media?.fileName || '',
              msg.media?.mimeType || '',
              msg.id,
              msg.type as any
            );
          }}
          onCancelUpload={cancelUpload}
          onRetrySend={handleRetrySend}
          uploadsProgress={uploadsProgress}
          uploadErrors={uploadErrors}
          uploadStates={uploadStates}
          wallpaper={resolvedWallpaper}
          highlightedMessageId={highlightedMessageId}
        />
      </ChatErrorBoundary>

      {/* ─── ATTACHMENT TRAY Boundary ─── */}
      <ChatErrorBoundary fallbackTitle="Attachment tray crashed.">
        <AttachmentMenu
          visible={activeSheet === 'attachments'}
          onClose={closeSheet}
        />
      </ChatErrorBoundary>

      {/* ─── MESSAGE INPUT FOOTER Boundary ─── */}
      <ChatErrorBoundary fallbackTitle="Composer crashed.">
        <MessageComposer
          messageText={messageText}
          onTextChange={handleTextChange}
          onSend={handleSendTrigger}
          replyTo={replyTo}
          onClearReply={clearReply}
          isEditingMode={isEditingMode}
          onClearEdit={() => {
            setIsEditingMode(false);
            setMessageText('');
          }}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          recordingLocked={recordingLocked}
          onCancelRecording={cancelRecording}
          onStartRecording={startRecording}
          onStopAndSendRecording={stopAndSendRecording}
          onLockRecording={lockRecording}
          insets={insets}
          leftPlugins={[attachmentPluginButton]}
          rightPlugins={[emojiPluginButton]}
          isBlockedByMe={chatMeta.isBlockedByMe}
          isBlockedByThem={chatMeta.isBlockedByThem}
          onUnblock={handleUnblockUser}
        />
      </ChatErrorBoundary>

      {/* Custom Emoji Picker keyboard block */}
      {activeSheet === 'emoji' && (
        <EmojiPicker
          onSelectEmoji={handleSelectEmoji}
          onSelectReaction={handleSelectReaction}
          showReactions={!!sheetData}
        />
      )}

      {/* Long Press Actions Overlay */}
      <MessageActionSheet
        visible={activeSheet === 'actions'}
        message={sheetData}
        currentUserId={authUser?.id || ''}
        userRole={authUser?.role}
        onClose={closeSheet}
        onReact={(emoji) => {
          if (sheetData) {
            MessageActionManager.toggleReaction(sheetData, emoji, conversationId || '', authUser?.id || '', queryClient);
          }
        }}
        onReply={() => {
          if (sheetData) {
            startReply(sheetData);
          }
        }}
        onForward={() => {
          if (sheetData) {
            setForwardingMessages([sheetData]);
          }
        }}
        onEdit={handleStartEdit}
        onPin={() => {
          if (sheetData) {
            MessageActionManager.togglePin(sheetData, conversationId || '', queryClient);
          }
        }}
        onStar={() => {
          if (sheetData) {
            MessageActionManager.toggleStar(sheetData, conversationId || '', authUser?.id || '', queryClient);
          }
        }}
        onCopy={() => {
          if (sheetData) {
            MessageActionManager.copyContent(sheetData);
          }
        }}
        onShare={() => {
          if (sheetData) {
            MessageActionManager.shareMedia(sheetData);
          }
        }}
        onInfo={() => {
          if (sheetData) {
            setInfoMessage(sheetData);
          }
        }}
        onDeleteForMe={() => {
          if (sheetData) {
            MessageActionManager.deleteForMe(sheetData, conversationId || '', queryClient);
          }
        }}
        onDeleteForEveryone={() => {
          if (sheetData) {
            MessageActionManager.deleteForEveryone(sheetData, conversationId || '', queryClient);
          }
        }}
      />

      {/* Message Delivery & Info Modal */}
      <MessageInfoModal
        visible={!!infoMessage}
        message={infoMessage}
        onClose={() => setInfoMessage(null)}
      />

      {/* Multi-Target Forwarding Modal */}
      <ForwardMessageModal
        visible={isForwardModalOpen}
        messages={forwardingMessages}
        onClose={() => {
          setIsForwardModalOpen(false);
          setForwardingMessages([]);
        }}
      />

      {/* Enterprise Shared Media, Files, Links & Starred Hub */}
      <SharedMediaModal
        visible={isSharedMediaOpen}
        messages={localMessages}
        onClose={() => setIsSharedMediaOpen(false)}
      />

      <AttachmentPreviewModal
        visible={previewVisible}
        items={previewItems}
        conversationName={chatMeta.title}
        onCancel={() => setPreviewVisible(false)}
        onRetry={() => {
          setPreviewVisible(false);
          handleAttachImage();
        }}
        onSend={handleSendCustomizedItems}
      />
    </AttachmentProvider>
  );
};

export const ChatRoomScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ChatThemeProvider>
        <BottomSheetManagerProvider>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ChatRoomScreenInner />
          </KeyboardAvoidingView>
        </BottomSheetManagerProvider>
      </ChatThemeProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputActionBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatRoomScreen;
