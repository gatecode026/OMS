/**
 * @file src/context/ChatContext.jsx
 * @description Global React context for real-time chat.
 *   Manages Socket.io connection, conversations, messages,
 *   online presence, typing indicators, and all chat actions.
 *
 *   Auth reads directly from localStorage (saas_token / saas_user)
 *   to avoid circular dependency with AppContext.
 */

import React, {
  createContext, useContext, useEffect,
  useRef, useState, useCallback
} from 'react';
import { getSocket } from '../lib/socketManager';
import { ImageKitUploadService } from '../services/imagekitUploadService';
import { useApp } from './AppContext';
import { useDesktopNotifications } from '../hooks/useDesktopNotifications';
import NotificationPermissionBanner from '../components/chat/NotificationPermissionBanner';
import { usePushNotifications } from '../hooks/pushNotificationHook';
import { notificationService } from '../utils/notificationService';
import { callSounds } from '../utils/callSounds';

const ChatContext = createContext(null);

// Use window.API_URL set by main.jsx dynamically to avoid ES module hoisting issues
const getApiUrl = () => window.API_URL || window.location.origin;

// ─── Provider ────────────────────────────────────────────────────────────────
export const ChatProvider = ({ children }) => {
  const { token, setToken, currentUser: simulatedUser, addToast } = useApp();

  const currentUser = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('saas_user');
      return saved ? JSON.parse(saved) : simulatedUser;
    } catch (e) {
      return simulatedUser;
    }
  }, [simulatedUser]);

  // ── Muted Conversations State ──────────────────────────────────────────────
  const [mutedConversations, setMutedConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(`chat_muted_conversations_${currentUser?.id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const mutedConversationsRef = useRef(mutedConversations);
  useEffect(() => {
    mutedConversationsRef.current = mutedConversations;
  }, [mutedConversations]);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        const saved = localStorage.getItem(`chat_muted_conversations_${currentUser.id}`);
        setMutedConversations(saved ? new Set(JSON.parse(saved)) : new Set());
      } catch (e) {
        setMutedConversations(new Set());
      }
    } else {
      setMutedConversations(new Set());
    }
  }, [currentUser?.id]);

  const muteConversation = useCallback((conversationId) => {
    if (!currentUser?.id) return;
    setMutedConversations(prev => {
      const next = new Set(prev);
      next.add(conversationId);
      localStorage.setItem(`chat_muted_conversations_${currentUser.id}`, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [currentUser?.id]);

  const unmuteConversation = useCallback((conversationId) => {
    if (!currentUser?.id) return;
    setMutedConversations(prev => {
      const next = new Set(prev);
      next.delete(conversationId);
      localStorage.setItem(`chat_muted_conversations_${currentUser.id}`, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [currentUser?.id]);


  // ── Socket ref ────────────────────────────────────────────────────────────
  const socketRef = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [hiddenConversations, setHiddenConversations] = useState([]);
  const [isLoadingHidden, setIsLoadingHidden] = useState(false);
  const [messages, setMessages] = useState({});
  // { convId: Message[] }
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  // Map<userId, { name, avatar, onlineAt }>
  const [currentUserStatus, setCurrentUserStatus] = useState({ status: 'available', emoji: null });
  const [presenceMap, setPresenceMap] = useState(new Map());
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedByUsers, setBlockedByUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  // { convId: [{ userId, name }] }
  const [unreadCounts, setUnreadCounts] = useState({});
  // { convId: number }
  const [unreadCountOnOpen, setUnreadCountOnOpen] = useState({});
  // { convId: number }
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [totalPinned, setTotalPinned] = useState(0);
  const [pinnedPagination, setPinnedPagination] = useState({});
  const [isLoadingPinned, setIsLoadingPinned] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState({});
  // { convId: boolean }
  const [messageCursors, setMessageCursors] = useState({});
  // { convId: string }
  const [showMobileList, setShowMobileList] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const showMobileListRef = useRef(true);
  useEffect(() => { showMobileListRef.current = showMobileList; }, [showMobileList]);

  // ── Threading States ──────────────────────────────────────────────────────
  const [activeThread, setActiveThread] = useState(null);
  const [activeThreadReplies, setActiveThreadReplies] = useState([]);
  const [isLoadingThreadReplies, setIsLoadingThreadReplies] = useState(false);
  const [threadActivityList, setThreadActivityList] = useState([]);
  const [isLoadingThreadActivity, setIsLoadingThreadActivity] = useState(false);
  const [threadUnreadCounts, setThreadUnreadCounts] = useState({});

  const activeThreadRef = useRef(null);
  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  // Stable ref for activeConvId (avoids stale closures in socket handlers)
  const activeConvIdRef = useRef(null);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  // Stable ref for conversations list (avoids stale closures in socket handlers)
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const isRefreshingRef = useRef(false);

  // ── Stable refs for socket callback dependencies (prevents stale closures) ──
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const apiFetchRef = useRef(null);

  const addToastRef = useRef(addToast);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  // These refs are assigned after their useCallback definitions below.
  // Declared here so they exist at the time the socket useEffect runs.
  const fetchConversationsRef = useRef(null);
  const fetchMessagesRef = useRef(null);
  const fetchThreadActivityRef = useRef(null);
  const playNotificationChimeRef = useRef(null);
  const sendNotificationRef = useRef(null);
  const loadPinnedMessagesRef = useRef(null);

  // Typing debounce timers
  const typingTimerRef = useRef({});
  // Client-side auto-clear safety timeouts for typing indicators
  const clientTypingTimeoutsRef = useRef({});
  // Timeout references for in-flight messages
  const sendingTimeoutsRef = useRef({});
  // Track which conversations have had initial history fetched from backend
  const fetchedConvIdsRef = useRef(new Set());

  // Desktop notification hook
  const { permission, requestPermission, sendNotification } = useDesktopNotifications(activeConvId, currentUserStatus?.status);

  // Synthesized angenehmer chime (WhatsApp message tone)
  const playNotificationChime = useCallback(() => {
    try {
      const settingsStr = localStorage.getItem('oms_notification_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : { desktop: true, sound: true, preview: true };
      if (settings.sound === false) return;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, startTime, duration, vol = 0.15) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(1046.50, ctx.currentTime, 0.15); // C6
      playTone(1318.51, ctx.currentTime + 0.08, 0.2); // E6
    } catch (err) {
      console.warn('[ChatContext] Failed to play chime:', err);
    }
  }, []);
  useEffect(() => { playNotificationChimeRef.current = playNotificationChime; }, [playNotificationChime]);
  useEffect(() => { sendNotificationRef.current = sendNotification; }, [sendNotification]);

  // Web Push Notifications Hook
  const push = usePushNotifications(currentUser);
  const hasAttemptedSubscribeRef = useRef(false);

  // Sync token to Cache Storage and auto-subscribe if permission is granted
  useEffect(() => {
    if (token && currentUser?.id) {
      notificationService.syncAuthToken(token);
      if (push.permission === 'granted' && !push.isSubscribed && !push.loading && !hasAttemptedSubscribeRef.current) {
        hasAttemptedSubscribeRef.current = true;
        push.subscribe().catch(err => console.error('[ChatContext] Auto-subscribe failed:', err));
      }
    } else {
      notificationService.clearAuthToken();
      hasAttemptedSubscribeRef.current = false;
    }
  }, [token, currentUser?.id, push.permission, push.isSubscribed, push.loading, push.subscribe]);

  // Listen for background service worker postMessage events
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'PLAY_SOUND') {
        console.log('[ChatContext] Sound trigger from Service Worker:', event.data);
        if (event.data.notificationType !== 'incoming_call') {
          playNotificationChime();
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, [playNotificationChime]);

  // Wrap permission request to also subscribe to Web Push
  const wrappedRequestPermission = useCallback(async () => {
    try {
      const result = await requestPermission();
      if (result === 'granted') {
        await push.subscribe();
      }
      return result;
    } catch (err) {
      console.error('[ChatContext] wrappedRequestPermission error:', err);
      return Notification.permission;
    }
  }, [requestPermission, push]);

  // ── API Helper ────────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (path, options = {}) => {
    if (!token) return { status: 'error', message: 'Not authenticated' };
    const res = await fetch(`${getApiUrl()}/api/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    return res.json();
  }, [token]);

  useEffect(() => { apiFetchRef.current = apiFetch; }, [apiFetch]);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/chat/users/blocked');
      if (res.status === 'success') {
        setBlockedUsers(res.data.blockedUsers || []);
        setBlockedByUsers(res.data.blockedByUsers || []);
      }
    } catch (err) {
      console.error('[Chat] fetchBlockedUsers error:', err);
    }
  }, [apiFetch]);

  // ── FETCH CONVERSATIONS ───────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setIsLoadingConvs(true);
    try {
      const data = await apiFetch('/chat/conversations');
      if (data.status === 'success') {
        setConversations(data.data || []);
        // Populate unread counts from server response
        const counts = {};
        (data.data || []).forEach(conv => {
          counts[conv.id] = conv.unreadCount || 0;
        });
        setUnreadCounts(counts);
      }
    } catch (err) {
      console.error('[Chat] fetchConversations error:', err);
    } finally {
      setIsLoadingConvs(false);
    }
  }, [apiFetch]);
  useEffect(() => { fetchConversationsRef.current = fetchConversations; }, [fetchConversations]);

  const fetchArchivedConversations = useCallback(async () => {
    setIsLoadingArchived(true);
    try {
      const data = await apiFetch('/chat/conversations/archived');
      if (data.status === 'success') {
        setArchivedConversations(data.data || []);
      }
    } catch (err) {
      console.error('[Chat] fetchArchivedConversations error:', err);
    } finally {
      setIsLoadingArchived(false);
    }
  }, [apiFetch]);

  const fetchHiddenConversations = useCallback(async () => {
    setIsLoadingHidden(true);
    try {
      const data = await apiFetch('/chat/conversations/hidden');
      if (data.status === 'success') {
        setHiddenConversations(data.data || []);
      }
    } catch (err) {
      console.error('[Chat] fetchHiddenConversations error:', err);
    } finally {
      setIsLoadingHidden(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (token) {
      fetchBlockedUsers();
    } else {
      setBlockedUsers([]);
      setBlockedByUsers([]);
      fetchedConvIdsRef.current.clear();
    }
  }, [token, fetchBlockedUsers]);

  const blockUser = useCallback(async (targetUserId) => {
    try {
      const res = await apiFetch(`/chat/users/${targetUserId}/block`, {
        method: 'POST'
      });
      if (res.status === 'success') {
        setBlockedUsers(prev => [...new Set([...prev, targetUserId])]);
        return true;
      }
    } catch (err) {
      console.error('[Chat] blockUser error:', err);
    }
    return false;
  }, [apiFetch]);

  const unblockUser = useCallback(async (targetUserId) => {
    try {
      const res = await apiFetch(`/chat/users/${targetUserId}/unblock`, {
        method: 'POST'
      });
      if (res.status === 'success') {
        setBlockedUsers(prev => prev.filter(id => id !== targetUserId));
        return true;
      }
    } catch (err) {
      console.error('[Chat] unblockUser error:', err);
    }
    return false;
  }, [apiFetch]);

  const archiveConversation = useCallback(async (convId) => {
    try {
      const res = await apiFetch(`/chat/conversations/${convId}/archive`, {
        method: 'POST'
      });
      if (res.status === 'success') {
        setConversations(prev => {
          const convToArchive = prev.find(c => c.id === convId);
          if (convToArchive) {
            const updated = { ...convToArchive, isArchived: true };
            setArchivedConversations(prevArchived => [updated, ...prevArchived]);
          }
          return prev.filter(c => c.id !== convId);
        });
        setHiddenConversations(prev => prev.filter(c => c.id !== convId));
        if (activeConvIdRef.current === convId) {
          setActiveConvId(null);
        }
        return true;
      }
    } catch (err) {
      console.error('[Chat] archiveConversation error:', err);
    }
    return false;
  }, [apiFetch]);

  const unarchiveConversation = useCallback(async (convId) => {
    try {
      const res = await apiFetch(`/chat/conversations/${convId}/unarchive`, {
        method: 'POST'
      });
      if (res.status === 'success') {
        setArchivedConversations(prev => {
          const convToRestore = prev.find(c => c.id === convId);
          if (convToRestore) {
            const updated = { ...convToRestore, isArchived: false };
            setConversations(prevList => [updated, ...prevList]);
          }
          return prev.filter(c => c.id !== convId);
        });
        return true;
      }
    } catch (err) {
      console.error('[Chat] unarchiveConversation error:', err);
    }
    return false;
  }, [apiFetch]);

  const hideConversation = useCallback(async (convId) => {
    try {
      const res = await apiFetch(`/chat/conversations/${convId}/hide`, {
        method: 'POST'
      });
      if (res.status === 'success') {
        setConversations(prev => {
          const convToHide = prev.find(c => c.id === convId);
          if (convToHide) {
            setHiddenConversations(prevHidden => [convToHide, ...prevHidden]);
          }
          return prev.filter(c => c.id !== convId);
        });
        if (activeConvIdRef.current === convId) {
          setActiveConvId(null);
        }
        return true;
      }
    } catch (err) {
      console.error('[Chat] hideConversation error:', err);
    }
    return false;
  }, [apiFetch]);

  const unhideConversation = useCallback(async (convId) => {
    try {
      const res = await apiFetch(`/chat/conversations/${convId}/unhide`, {
        method: 'POST'
      });
      if (res.status === 'success') {
        setHiddenConversations(prev => {
          const convToRestore = prev.find(c => c.id === convId);
          if (convToRestore) {
            setConversations(prevList => [convToRestore, ...prevList]);
          } else {
            fetchConversations();
          }
          return prev.filter(c => c.id !== convId);
        });
        return true;
      }
    } catch (err) {
      console.error('[Chat] unhideConversation error:', err);
    }
    return false;
  }, [apiFetch, fetchConversations]);

  const markConversationAsRead = useCallback(async (convId) => {
    try {
      const res = await apiFetch(`/chat/conversations/${convId}/read`, {
        method: 'PATCH'
      });
      if (res.status === 'success') {
        setUnreadCounts(prev => ({ ...prev, [convId]: 0 }));
        socketRef.current?.emit('mark_read', { conversationId: convId });
        return true;
      }
    } catch (err) {
      console.error('[Chat] markConversationAsRead error:', err);
    }
    return false;
  }, [apiFetch]);

  const markConversationAsUnread = useCallback(async (convId) => {
    try {
      const res = await apiFetch(`/chat/conversations/${convId}/unread`, {
        method: 'PATCH'
      });
      if (res.status === 'success') {
        setUnreadCounts(prev => ({ ...prev, [convId]: (prev[convId] || 0) + 1 }));
        return true;
      }
    } catch (err) {
      console.error('[Chat] markConversationAsUnread error:', err);
    }
    return false;
  }, [apiFetch]);

  const deleteConversationForMe = useCallback(async (convId) => {
    try {
      const res = await apiFetch(`/chat/conversations/${convId}/me`, {
        method: 'DELETE'
      });
      if (res.status === 'success') {
        setConversations(prev => prev.filter(c => c.id !== convId));
        if (activeConvIdRef.current === convId) {
          setActiveConvId(null);
        }
        return true;
      }
    } catch (err) {
      console.error('[Chat] deleteConversationForMe error:', err);
    }
    return false;
  }, [apiFetch]);

  const deleteGroup = useCallback(async (convId) => {
    try {
      const res = await apiFetch(`/chat/conversations/${convId}`, {
        method: 'DELETE'
      });
      if (res.status === 'success') {
        setConversations(prev => prev.filter(c => c.id !== convId));
        if (activeConvIdRef.current === convId) {
          setActiveConvId(null);
        }
        return true;
      }
    } catch (err) {
      console.error('[Chat] deleteGroup error:', err);
    }
    return false;
  }, [apiFetch]);
  // Helper to fetch failed messages from localStorage for a conversation
  const getFailedMessagesForConv = useCallback((convId) => {
    if (!currentUser?.id) return [];
    const failed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chat_failed_msg_')) {
        try {
          const isOldFormatForMe = key.startsWith(`chat_failed_msg_${currentUser.id}_`);
          const isNewFormat = key.startsWith('chat_failed_msg_temp_');

          if (isOldFormatForMe || isNewFormat) {
            const msg = JSON.parse(localStorage.getItem(key));
            if (msg && msg.convId === convId) {
              if (!failed.some(f => f.tempId === msg.tempId)) {
                failed.push({
                  id: msg.tempId,
                  tempId: msg.tempId,
                  conversationId: msg.convId,
                  senderId: currentUser.id,
                  senderName: currentUser.name,
                  senderAvatar: currentUser.avatar,
                  content: msg.content,
                  type: msg.type,
                  replyTo: msg.replyTo,
                  media: msg.media,
                  createdAt: msg.createdAt || new Date().toISOString(),
                  _deliveryStatus: 'failed'
                });
              }
            }
          }
        } catch (e) {
          console.error('[Chat] Failed to parse cached failed message:', e);
        }
      }
    }
    // Sort by createdAt ascending
    return failed.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [currentUser]);

  // ── FETCH MESSAGES (with pagination) ─────────────────────────────────────
  const fetchMessages = useCallback(async (convId, cursor = null) => {
    setIsLoadingMsgs(true);
    try {
      const url = cursor
        ? `/chat/conversations/${convId}/messages?cursor=${cursor}&limit=20`
        : `/chat/conversations/${convId}/messages?limit=20`;
      const data = await apiFetch(url);
      if (data.status === 'success') {
        const { messages: msgs, pagination } = data.data;
        const failedMsgs = getFailedMessagesForConv(convId);
        setMessages(prev => {
          if (!cursor) {
            // Merge server messages with any optimistic/socket messages already in state.
            // This prevents duplicates when new_message socket fires during the API fetch.
            const existing = prev[convId] || [];
            const existingIds = new Set(msgs.map(m => m.id));
            const existingTempIds = new Set(msgs.map(m => m.tempId).filter(Boolean));

            // Keep optimistic messages (tempId set, not yet confirmed) not yet in server response
            const pendingOptimistic = existing.filter(m =>
              m.tempId && !existingIds.has(m.id) && m._deliveryStatus === 'sending'
            );

            // Filter out failed messages that have already been saved on the server
            const filteredFailedMsgs = failedMsgs.filter(m => {
              const alreadyDelivered = existingIds.has(m.tempId) ||
                existingTempIds.has(m.tempId) ||
                msgs.some(serverMsg => {
                  const senderMatch = serverMsg.senderId === m.senderId;
                  const typeMatch = serverMsg.type === m.type;
                  const contentMatch = (serverMsg.content || '').trim().replace(/\r\n/g, '\n') ===
                    (m.content || '').trim().replace(/\r\n/g, '\n');

                  const serverDate = new Date(serverMsg.createdAt);
                  const localDate = m.createdAt ? new Date(m.createdAt) : new Date();
                  const timeMatch = isNaN(serverDate.getTime()) || isNaN(localDate.getTime()) ||
                    Math.abs(serverDate - localDate) < 86400000; // 24 hours threshold

                  return senderMatch && typeMatch && contentMatch && timeMatch;
                });
              if (alreadyDelivered) {
                // Clean up from localStorage
                localStorage.removeItem(`chat_failed_msg_${m.tempId}`);
                if (currentUser?.id) {
                  localStorage.removeItem(`chat_failed_msg_${currentUser.id}_${m.tempId}`);
                }
                return false;
              }
              return true;
            });

            const merged = [...msgs, ...pendingOptimistic, ...filteredFailedMsgs];
            // Always sort chronologically: oldest first, newest last
            merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            return { ...prev, [convId]: merged };
          }

          // Older messages prepend (scroll-up = load older)
          const existingMsgs = prev[convId] || [];
          const existingIds = new Set(existingMsgs.map(m => m.id));
          const existingTempIds = new Set(existingMsgs.map(m => m.tempId).filter(Boolean));
          const filteredNew = msgs.filter(newM => !existingMsgs.some(m => m.id === newM.id));
          const nonFailedExisting = existingMsgs.filter(m => m._deliveryStatus !== 'failed');

          const filteredFailedMsgs = failedMsgs.filter(m => {
            const alreadyDelivered = existingIds.has(m.tempId) ||
              existingTempIds.has(m.tempId) ||
              existingMsgs.some(serverMsg => {
                const senderMatch = serverMsg.senderId === m.senderId;
                const typeMatch = serverMsg.type === m.type;
                const contentMatch = (serverMsg.content || '').trim().replace(/\r\n/g, '\n') ===
                  (m.content || '').trim().replace(/\r\n/g, '\n');

                const serverDate = new Date(serverMsg.createdAt);
                const localDate = m.createdAt ? new Date(m.createdAt) : new Date();
                const timeMatch = isNaN(serverDate.getTime()) || isNaN(localDate.getTime()) ||
                  Math.abs(serverDate - localDate) < 86400000; // 24 hours threshold

                return senderMatch && typeMatch && contentMatch && timeMatch;
              });
            if (alreadyDelivered) {
              localStorage.removeItem(`chat_failed_msg_${m.tempId}`);
              if (currentUser?.id) {
                localStorage.removeItem(`chat_failed_msg_${currentUser.id}_${m.tempId}`);
              }
              return false;
            }
            return true;
          });

          const paginatedMerge = [...filteredNew, ...nonFailedExisting, ...filteredFailedMsgs];
          // Always sort chronologically: oldest first, newest last
          paginatedMerge.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          return { ...prev, [convId]: paginatedMerge };
        });
        setHasMoreMessages(prev => ({
          ...prev, [convId]: pagination.hasMore
        }));
        setMessageCursors(prev => ({ ...prev, [convId]: pagination.cursor }));
        if (!cursor) {
          fetchedConvIdsRef.current.add(convId);
        }
      }
    } catch (err) {
      console.error('[Chat] fetchMessages error:', err);
    } finally {
      setIsLoadingMsgs(false);
    }
  }, [apiFetch, getFailedMessagesForConv, currentUser]);
  useEffect(() => { fetchMessagesRef.current = fetchMessages; }, [fetchMessages]);
  // ── LOAD MORE (scroll up) ─────────────────────────────────────────────────
  const loadMoreMessages = useCallback(async (convId) => {
    if (!hasMoreMessages[convId] || isLoadingMsgs) return;
    const currentCursor = messageCursors[convId];
    if (!currentCursor) return;
    await fetchMessages(convId, currentCursor);
  }, [hasMoreMessages, isLoadingMsgs, messageCursors, fetchMessages]);

  // ── OPEN CONVERSATION ─────────────────────────────────────────────────────
  const openConversation = useCallback(async (convId) => {
    // Capture unread count before we clear it
    const currentUnread = unreadCounts[convId] || 0;
    setUnreadCountOnOpen(prev => ({ ...prev, [convId]: currentUnread }));

    setUnreadCounts(prev => ({ ...prev, [convId]: 0 }));
    setActiveConvId(convId);
    socketRef.current?.emit('join_conversation', convId);

    // Only fetch if not already loaded
    if (!fetchedConvIdsRef.current.has(convId)) {
      await fetchMessages(convId, null);
    }

    // Always mark as read when opening a conversation to ensure any unread messages are updated in DB
    apiFetch(`/chat/conversations/${convId}/read`, { method: 'PATCH' }).catch(err => {
      console.error('[Chat] Error marking conversation as read:', err);
    });

    // Find last message ID from conversation preview
    const conv = conversationsRef.current.find(c => c.id === convId);
    const lastReadMessageId = conv?.lastMessage?.messageId;

    socketRef.current?.emit('mark_read', { conversationId: convId });
    if (lastReadMessageId) {
      socketRef.current?.emit('conversation:read', { conversationId: convId, lastReadMessageId });
    }
  }, [fetchMessages, apiFetch, unreadCounts]);


  // ── SEND MESSAGE ──────────────────────────────────────────────────────────
  const sendMessage = useCallback((convId, content,
    type = 'text', replyTo = null, media = null, existingTempId = null) => {
    if (!socketRef.current?.connected) {
      console.error('[Chat] Socket not connected');
      return false;
    }

    const tempId = existingTempId || `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Create optimistic temporary message
    const tempMsg = {
      id: tempId,
      tempId,
      conversationId: convId,
      senderId: currentUser?.id,
      senderName: currentUser?.name,
      senderAvatar: currentUser?.avatar,
      content,
      type,
      replyTo,
      media,
      createdAt: new Date().toISOString(),
      _deliveryStatus: 'sending'
    };

    // Append to messages state
    setMessages(prev => {
      const list = prev[convId] || [];
      const exists = list.some(m => m.id === tempId);
      if (exists) {
        return {
          ...prev,
          [convId]: list.map(m => m.id === tempId ? { ...m, _deliveryStatus: 'sending', createdAt: tempMsg.createdAt } : m)
        };
      }
      return {
        ...prev,
        [convId]: [...list, tempMsg]
      };
    });

    // Start 10-second timeout
    if (sendingTimeoutsRef.current[tempId]) {
      clearTimeout(sendingTimeoutsRef.current[tempId]);
    }

    sendingTimeoutsRef.current[tempId] = setTimeout(() => {
      setMessages(prev => {
        const list = prev[convId] || [];
        const msgIndex = list.findIndex(m => m.id === tempId);
        if (msgIndex > -1 && list[msgIndex]._deliveryStatus === 'sending') {
          const updated = [...list];
          updated[msgIndex] = { ...updated[msgIndex], _deliveryStatus: 'failed' };

          // Store in localStorage
          const failedMsg = { convId, content, type, replyTo, media, tempId, createdAt: tempMsg.createdAt };
          localStorage.setItem(`chat_failed_msg_${currentUser?.id}_${tempId}`, JSON.stringify(failedMsg));

          return { ...prev, [convId]: updated };
        }
        return prev;
      });
      delete sendingTimeoutsRef.current[tempId];
    }, 10000);

    socketRef.current.emit('send_message', {
      conversationId: convId,
      content,
      type,
      replyTo,
      media,
      tempId
    });
    return true;
  }, [currentUser]);

  // ── RETRY MESSAGE ──────────────────────────────────────────────────────────
  const retryMessage = useCallback((tempId) => {
    if (!currentUser?.id) return;
    const key = `chat_failed_msg_${tempId}`;
    const oldKey = `chat_failed_msg_${currentUser.id}_${tempId}`;
    const stored = localStorage.getItem(key) || localStorage.getItem(oldKey);
    if (!stored) return;

    try {
      const msg = JSON.parse(stored);
      // Remove from localStorage first
      localStorage.removeItem(key);
      localStorage.removeItem(oldKey);
      // Retry sending
      sendMessage(msg.convId, msg.content, msg.type, msg.replyTo, msg.media, tempId);
    } catch (e) {
      console.error('[Chat] Failed to retry message:', e);
    }
  }, [currentUser, sendMessage]);

  // ── USER STATUS ───────────────────────────────────────────────────────────
  const setUserStatus = useCallback((status, emoji, expiresInMinutes) => {
    if (!socketRef.current?.connected) return;
    setCurrentUserStatus({ status, emoji });
    socketRef.current.emit('set_status', { status, emoji, expiresInMinutes });
  }, []);

  // ── TYPING INDICATORS ─────────────────────────────────────────────────────
  const handleTypingStart = useCallback((convId, isRecording = false) => {
    socketRef.current?.emit('typing:start', { conversationId: convId, isRecording });
  }, []);

  const handleTypingStop = useCallback((convId) => {
    socketRef.current?.emit('typing:stop', { conversationId: convId });
  }, []);

  // ── START DIRECT CHAT ─────────────────────────────────────────────────────
  const startDirectChat = useCallback(async (targetEmployeeId) => {
    const data = await apiFetch('/chat/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ targetEmployeeId })
    });
    if (data.status === 'success') {
      const conv = data.data.conversation;
      setConversations(prev => {
        const exists = prev.find(c => c.id === conv.id);
        if (exists) return prev;
        return [conv, ...prev];
      });
      await openConversation(conv.id);
      return conv;
    }
    throw new Error(data.message || 'Failed to start chat');
  }, [apiFetch, openConversation]);

  // ── CREATE GROUP ──────────────────────────────────────────────────────────
  const createGroup = useCallback(async (name, description, participantIds, avatarBase64) => {
    const data = await apiFetch('/chat/conversations/group', {
      method: 'POST',
      body: JSON.stringify({ name, description, participantIds, avatar: avatarBase64 })
    });
    if (data.status === 'success') {
      setConversations(prev => {
        const exists = prev.some(c => c.id === data.data.id);
        if (exists) return prev;
        return [data.data, ...prev];
      });
      await openConversation(data.data.id);
      return data.data;
    }
    throw new Error(data.message || 'Failed to create group');
  }, [apiFetch, openConversation]);

  // ── UPDATE GROUP ──────────────────────────────────────────────────────────
  const updateGroup = useCallback(async (conversationId, groupData) => {
    const data = await apiFetch(`/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(groupData)
    });
    if (data.status === 'success') {
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
          return { ...c, ...data.data };
        }
        return c;
      }));
      return data.data;
    }
    throw new Error(data.message || 'Failed to update group details');
  }, [apiFetch]);

  // ── ADD MEMBERS TO GROUP ──────────────────────────────────────────────────
  const addMembersToGroup = useCallback(async (conversationId, memberIds) => {
    const data = await apiFetch(`/chat/conversations/${conversationId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds })
    });
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message || 'Failed to add members');
  }, [apiFetch]);

  // ── REMOVE MEMBER FROM GROUP ──────────────────────────────────────────────
  const removeMemberFromGroup = useCallback(async (conversationId, memberId) => {
    const data = await apiFetch(`/chat/conversations/${conversationId}/members/${memberId}`, {
      method: 'DELETE'
    });
    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message || 'Failed to remove member');
  }, [apiFetch]);

  // ── LEAVE GROUP ───────────────────────────────────────────────────────────
  const leaveGroup = useCallback((conversationId) => {
    socketRef.current?.emit('leave_group', { conversationId });
  }, []);

  // ── DELETE MESSAGE ────────────────────────────────────────────────────────
  const deleteMessage = useCallback((messageId, convId,
    deleteForEveryone = false) => {
    socketRef.current?.emit('delete_message', {
      messageId,
      conversationId: convId,
      deleteForEveryone
    });
  }, []);

  // ── CLEAR CHAT ────────────────────────────────────────────────────────────
  const clearChat = useCallback(async (convId) => {
    try {
      const data = await apiFetch(`/chat/conversations/${convId}/clear`, {
        method: 'POST'
      });
      if (data.status === 'success') {
        setMessages(prev => ({
          ...prev,
          [convId]: []
        }));
        setHasMoreMessages(prev => ({ ...prev, [convId]: false }));
        setMessageCursors(prev => ({ ...prev, [convId]: null }));
        fetchedConvIdsRef.current.add(convId);
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return {
              ...c,
              lastMessage: null
            };
          }
          return c;
        }));
        if (activeConvIdRef.current === convId) {
          setPinnedMessages([]);
          setTotalPinned(0);
          setPinnedPagination({});
        }
        return true;
      }
    } catch (err) {
      console.error('[Chat] clearChat error:', err);
    }
    return false;
  }, [apiFetch]);

  // ── DELETE MESSAGES BULK ───────────────────────────────────────────────────
  const deleteMessagesBulk = useCallback(async (messageIds, convId) => {
    try {
      const data = await apiFetch('/chat/messages/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ messageIds })
      });
      if (data.status === 'success') {
        setMessages(prev => {
          const list = prev[convId] || [];
          const filtered = list.filter(m => !messageIds.includes(m.id));
          return {
            ...prev,
            [convId]: filtered
          };
        });
        setConversations(prev => prev.map(c => {
          if (c.id === convId && messageIds.includes(c.lastMessage?.messageId)) {
            return {
              ...c,
              lastMessage: {
                messageId: null,
                content: 'Messages deleted',
                type: 'text',
                senderId: null,
                senderName: null,
                sentAt: null
              }
            };
          }
          return c;
        }));
        return true;
      }
    } catch (err) {
      console.error('[Chat] deleteMessagesBulk error:', err);
    }
    return false;
  }, [apiFetch]);

  // ── EDIT MESSAGE ──────────────────────────────────────────────────────────
  const editMessage = useCallback((messageId, convId, newContent) => {
    socketRef.current?.emit('edit_message', {
      messageId,
      conversationId: convId,
      content: newContent
    });
  }, []);

  // ── ADD REACTION ──────────────────────────────────────────────────────────
  const addReaction = useCallback((messageId, convId, emoji) => {
    socketRef.current?.emit('add_reaction', {
      messageId,
      conversationId: convId,
      emoji
    });
  }, []);


  // ── PIN / UNPIN CONVERSATION ──────────────────────────────────────────────
  const pinConversation = useCallback((convId) => {
    socketRef.current?.emit('pin_conversation', { conversationId: convId });
  }, []);

  const unpinConversation = useCallback((convId) => {
    socketRef.current?.emit('unpin_conversation', { conversationId: convId });
  }, []);

  // ── PIN / UNPIN MESSAGE ───────────────────────────────────────────────────
  const pinMessage = useCallback((messageId, convId) => {
    if (!messageId || !convId) return;

    let newlyPinnedCard = null;

    setMessages(prev => {
      const convMsgs = prev[convId] || [];
      const updatedMsgs = convMsgs.map(msg => {
        if (msg.id === messageId) {
          const updated = {
            ...msg,
            isPinned: true,
            pinnedBy: currentUserRef.current?.id,
            pinnedByName: currentUserRef.current?.name || 'You',
            pinnedAt: new Date().toISOString()
          };
          newlyPinnedCard = {
            messageId: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderAvatar: msg.senderAvatar,
            messageType: msg.type,
            text: msg.content,
            attachment: msg.media || null,
            originalTimestamp: msg.createdAt,
            pinnedBy: currentUserRef.current?.id,
            pinnedByName: currentUserRef.current?.name || 'You',
            pinnedTimestamp: new Date().toISOString(),
            isPinned: true
          };
          return updated;
        }
        return msg;
      });
      return { ...prev, [convId]: updatedMsgs };
    });

    if (newlyPinnedCard) {
      setPinnedMessages(prev => {
        const exists = prev.some(m => m.messageId === messageId);
        if (exists) return prev;
        return [newlyPinnedCard, ...prev];
      });
      setTotalPinned(prev => prev + 1);
    }

    socketRef.current?.emit('pin_message', { messageId, conversationId: convId });
  }, []);

  const unpinMessage = useCallback((messageId, convId) => {
    if (!messageId || !convId) return;

    setMessages(prev => {
      const convMsgs = prev[convId] || [];
      return {
        ...prev,
        [convId]: convMsgs.map(msg =>
          msg.id === messageId
            ? { ...msg, isPinned: false, pinnedBy: null, pinnedByName: null, pinnedAt: null }
            : msg
        )
      };
    });

    setPinnedMessages(prev => prev.filter(m => m.messageId !== messageId));
    setTotalPinned(prev => Math.max(0, prev - 1));

    socketRef.current?.emit('unpin_message', { messageId, conversationId: convId });
  }, []);

  const loadPinnedMessages = useCallback(async (convId, params = {}) => {
    if (!convId) return;
    setIsLoadingPinned(true);
    try {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page);
      if (params.limit) query.append('limit', params.limit);
      if (params.search) query.append('search', params.search);
      if (params.filter) query.append('filter', params.filter);
      if (params.sortBy) query.append('sortBy', params.sortBy);

      const data = await apiFetch(`/chat/conversations/${convId}/pinned?${query.toString()}`);
      if (data.status === 'success') {
        if (params.page && params.page > 1) {
          setPinnedMessages(prev => {
            const existingIds = new Set(prev.map(m => m.messageId));
            const newMsgs = data.data.messages.filter(m => !existingIds.has(m.messageId));
            return [...prev, ...newMsgs];
          });
        } else {
          setPinnedMessages(data.data.messages);
        }
        setTotalPinned(data.data.totalPinned);
        setPinnedPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('[ChatContext] Error loading pinned messages:', err);
    } finally {
      setIsLoadingPinned(false);
    }
  }, [apiFetch]);
  useEffect(() => { loadPinnedMessagesRef.current = loadPinnedMessages; }, [loadPinnedMessages]);
  useEffect(() => {
    if (activeConvId) {
      loadPinnedMessages(activeConvId, { page: 1, limit: 10 });
    } else {
      setPinnedMessages([]);
      setTotalPinned(0);
      setPinnedPagination({});
    }
  }, [activeConvId, loadPinnedMessages]);

  // ── STAR / UNSTAR MESSAGE (HIGHLIGHT) ─────────────────────────────────────
  const starMessage = useCallback((messageId, convId) => {
    socketRef.current?.emit('star_message', { messageId, conversationId: convId });
  }, []);

  const unstarMessage = useCallback((messageId, convId) => {
    socketRef.current?.emit('unstar_message', { messageId, conversationId: convId });
  }, []);

  // ── SEARCH EMPLOYEES ──────────────────────────────────────────────────────
  const searchEmployees = useCallback(async (query = '') => {
    const data = await apiFetch(
      `/chat/employees?q=${encodeURIComponent(query)}`
    );
    return data.status === 'success' ? data.data : [];
  }, [apiFetch]);
  // ── FORWARD MESSAGE ────────────────────────────────────────────────────────
  const forwardMessage = useCallback(async (messageId, targetConversationIds) => {
    try {
      const data = await apiFetch(`/chat/messages/${messageId}/forward`, {
        method: 'POST',
        body: JSON.stringify({ targetConversationIds })
      });
      if (data.status === 'success') {
        addToast?.('success', 'Message forwarded successfully');
        return true;
      }
      addToast?.('error', data.message || 'Failed to forward message');
      return false;
    } catch (err) {
      console.error('[Chat] forwardMessage error:', err);
      addToast?.('error', 'Failed to forward message');
      return false;
    }
  }, [apiFetch, addToast]);

  // ── THREADING OPERATIONS ───────────────────────────────────────────────────
  const fetchThreadReplies = useCallback(async (threadId, cursor = null) => {
    setIsLoadingThreadReplies(true);
    try {
      const url = cursor
        ? `/chat/threads/${threadId}/messages?cursor=${cursor}&limit=30`
        : `/chat/threads/${threadId}/messages?limit=30`;
      const data = await apiFetch(url);
      if (data.status === 'success') {
        const { replies } = data.data;
        setActiveThreadReplies(prev => {
          if (!cursor) return replies;
          const existingIds = new Set(prev.map(r => r.id));
          const filteredNew = replies.filter(r => !existingIds.has(r.id));
          return [...prev, ...filteredNew];
        });
      }
    } catch (err) {
      console.error('[Chat] fetchThreadReplies error:', err);
    } finally {
      setIsLoadingThreadReplies(false);
    }
  }, [apiFetch]);

  const openThread = useCallback(async (rootMessageId) => {
    try {
      const data = await apiFetch('/chat/threads', {
        method: 'POST',
        body: JSON.stringify({ rootMessageId })
      });
      if (data.status === 'success') {
        const thread = data.data;
        setActiveThread(thread);
        setThreadUnreadCounts(prev => ({ ...prev, [thread._id]: 0 }));

        // Join socket room
        socketRef.current?.emit('join_thread', { threadId: thread._id });

        // Mark read
        apiFetch(`/chat/threads/${thread._id}/read`, { method: 'POST' }).catch(() => { });

        // Load replies
        await fetchThreadReplies(thread._id, null);
      }
    } catch (err) {
      console.error('[Chat] openThread error:', err);
    }
  }, [apiFetch, fetchThreadReplies]);

  const closeThread = useCallback(() => {
    if (activeThreadRef.current) {
      socketRef.current?.emit('leave_thread', { threadId: activeThreadRef.current._id });
    }
    setActiveThread(null);
    setActiveThreadReplies([]);
  }, []);

  const sendThreadReply = useCallback(async (content, type = 'text', media = null) => {
    const thread = activeThreadRef.current;
    if (!thread) return false;

    const tempId = `temp_reply_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tempReply = {
      id: tempId,
      tempId,
      conversationId: thread.conversationId,
      senderId: currentUser?.id,
      senderName: currentUser?.name,
      senderAvatar: currentUser?.avatar || null,
      senderRole: currentUser?.role || 'employee',
      content,
      type,
      media,
      threadId: thread._id,
      isThreadReply: true,
      createdAt: new Date().toISOString(),
      _deliveryStatus: 'sending'
    };

    setActiveThreadReplies(prev => [...prev, tempReply]);

    try {
      const data = await apiFetch(`/chat/threads/${thread._id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content, type, media, tempId })
      });

      if (data.status === 'success') {
        const savedReply = data.data;
        setActiveThreadReplies(prev =>
          prev.map(r => r.id === tempId ? { ...savedReply, _deliveryStatus: 'delivered' } : r)
        );

        // Optimistically increment reply count
        setActiveThread(prev => prev ? { ...prev, replyCount: prev.replyCount + 1 } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Chat] sendThreadReply error:', err);
      setActiveThreadReplies(prev =>
        prev.map(r => r.id === tempId ? { ...r, _deliveryStatus: 'failed' } : r)
      );
      return false;
    }
  }, [apiFetch, currentUser]);

  const followThread = useCallback(async (threadId) => {
    try {
      const data = await apiFetch(`/chat/threads/${threadId}/follow`, { method: 'POST' });
      if (data.status === 'success') {
        if (activeThreadRef.current?._id === threadId) {
          setActiveThread(data.data);
        }
        addToast?.('success', 'Following thread');
      }
    } catch (err) {
      console.error('[Chat] followThread error:', err);
    }
  }, [apiFetch, addToast]);

  const unfollowThread = useCallback(async (threadId) => {
    try {
      const data = await apiFetch(`/chat/threads/${threadId}/unfollow`, { method: 'POST' });
      if (data.status === 'success') {
        if (activeThreadRef.current?._id === threadId) {
          setActiveThread(data.data);
        }
        addToast?.('info', 'Unfollowed thread');
      }
    } catch (err) {
      console.error('[Chat] unfollowThread error:', err);
    }
  }, [apiFetch, addToast]);

  const updateThreadStatus = useCallback(async (threadId, status) => {
    try {
      const data = await apiFetch(`/chat/threads/${threadId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (data.status === 'success') {
        if (activeThreadRef.current?._id === threadId) {
          setActiveThread(data.data);
        }
        addToast?.('success', `Thread marked as ${status}`);
      }
    } catch (err) {
      console.error('[Chat] updateThreadStatus error:', err);
      addToast?.('error', err.message || 'Failed to update thread status');
    }
  }, [apiFetch, addToast]);

  const fetchThreadActivity = useCallback(async () => {
    setIsLoadingThreadActivity(true);
    try {
      const data = await apiFetch('/chat/threads/activity');
      if (data.status === 'success') {
        setThreadActivityList(data.data || []);

        // Calculate unread counts dictionary
        const counts = {};
        (data.data || []).forEach(t => {
          counts[t.threadId] = t.unreadCount || 0;
        });
        setThreadUnreadCounts(counts);
      }
    } catch (err) {
      console.error('[Chat] fetchThreadActivity error:', err);
    } finally {
      setIsLoadingThreadActivity(false);
    }
  }, [apiFetch]);
  useEffect(() => { fetchThreadActivityRef.current = fetchThreadActivity; }, [fetchThreadActivity]);
  const markThreadAsRead = useCallback(async (threadId) => {
    try {
      const data = await apiFetch(`/chat/threads/${threadId}/read`, { method: 'POST' });
      if (data.status === 'success') {
        setThreadUnreadCounts(prev => ({ ...prev, [threadId]: 0 }));

        // Update local activity list count
        setThreadActivityList(prev => prev.map(t => t.threadId === threadId ? { ...t, unreadCount: 0 } : t));
      }
    } catch (err) {
      console.error('[Chat] markThreadAsRead error:', err);
    }
  }, [apiFetch]);

  // ── FILE UPLOADS GLOBAL STATE ────────────────────────────────────────────────
  const [uploadQueue, setUploadQueue] = useState([]);
  const uploadQueueRef = useRef([]);
  useEffect(() => {
    uploadQueueRef.current = uploadQueue;
  }, [uploadQueue]);

  const updateUploadItem = useCallback((id, updates) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const removeUploadItem = useCallback((id) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const uploadProcess = useCallback(async (item) => {
    const { id, file } = item;
    const controller = new AbortController();

    updateUploadItem(id, { controller, status: 'uploading', error: null, progress: 0 });

    try {
      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });

      // Call our backend proxy route which uploads via basic auth (private key only)
      const response = await fetch(`${window.API_URL || window.location.origin}/api/v1/chat/imagekit/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed (Status ${response.status})`);
      }

      const resultData = await response.json();
      if (resultData.status !== 'success' || !resultData.data) {
        throw new Error(resultData.message || 'Upload failed');
      }

      const result = resultData.data;

      // Record successful response
      updateUploadItem(id, {
        status: 'success',
        progress: 100,
        result: {
          url: result.url,
          thumbnailUrl: result.url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileType: file.type,
          imageKitFileId: result.fileId,
          imageKitFilePath: result.filePath
        }
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[ChatContext] Upload aborted for:', file.name);
        return;
      }
      console.error('[ChatContext] Upload failed:', err);
      updateUploadItem(id, {
        status: 'failed',
        error: err.message || 'Upload failed'
      });
      if (addToastRef.current) {
        addToastRef.current('error', `Upload failed: ${err.message || 'Server connection error'}`);
      }
    }
  }, [token, updateUploadItem]);

  const startFileUpload = useCallback((file, convId) => {
    if (!file) return;

    // Check for duplicate file in the active queue for this conversation
    const currentQueue = uploadQueueRef.current;
    const isDuplicate = currentQueue.some(
      item => item.convId === convId && item.name === file.name && item.size === file.size && item.status !== 'failed'
    );

    if (isDuplicate) {
      addToast?.('warning', `File "${file.name}" is already uploading or uploaded.`);
      return;
    }

    const id = `${file.name}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newItem = {
      id,
      convId,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'uploading',
      error: null,
      result: null,
      controller: null
    };

    setUploadQueue(prev => [...prev, newItem]);

    setTimeout(() => {
      uploadProcess(newItem);
    }, 0);
  }, [addToast, uploadProcess]);

  const cancelFileUpload = useCallback((id) => {
    const item = uploadQueueRef.current.find(i => i.id === id);
    if (item) {
      if (item.controller) {
        item.controller.abort();
      }
      removeUploadItem(id);
    }
  }, [removeUploadItem]);

  const retryFileUpload = useCallback((id) => {
    const item = uploadQueueRef.current.find(i => i.id === id);
    if (item && item.status === 'failed') {
      updateUploadItem(id, {
        status: 'uploading',
        progress: 0,
        speed: 0,
        eta: 0,
        error: null
      });
      uploadProcess(item);
    }
  }, [updateUploadItem, uploadProcess]);

  const clearFileUploads = useCallback((convId) => {
    uploadQueueRef.current.forEach(item => {
      if (item.convId === convId) {
        if (item.controller) {
          item.controller.abort();
        }
      }
    });
    setUploadQueue(prev => prev.filter(item => item.convId !== convId));
  }, []);

  // ── SOCKET SETUP — runs ONCE, never re-registers ───────────────────────────
  // The socket singleton is managed by socketManager.js.
  // AppContext calls connectSocket() on login and disconnectSocket() on logout.
  // ChatContext only attaches/removes listeners — it NEVER creates or destroys the socket.
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // If already connected (e.g. AppContext connected before ChatContext mounted),
    // set state immediately.
    if (socket.connected) {
      setIsConnected(true);
      fetchConversationsRef.current?.();
      fetchThreadActivityRef.current?.();
      if (activeConvIdRef.current) {
        socket.emit('join_conversation', activeConvIdRef.current);
      }
    }

    // ── Connection lifecycle ───────────────────────────────────────────────
    socket.on('connect', () => {
      console.log('[Chat] Socket connected:', socket.id);
      setIsConnected(true);
      fetchConversationsRef.current?.(); // refresh on reconnect
      if (activeConvIdRef.current) {
        socket.emit('join_conversation', activeConvIdRef.current);
      }
      const me = currentUserRef.current;
      if (me?.id) {
        localStorage.setItem('chat_last_sync_' + me.id, new Date().toISOString());
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected:', reason);
      setIsConnected(false);
      const me = currentUserRef.current;
      if (me?.id) {
        localStorage.setItem('chat_last_sync_' + me.id, new Date().toISOString());
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[Chat] Connection error:', err.message);
      setIsConnected(false);
    });

    socket.on('token_expiring', async () => {
      console.log('[Chat] Socket token expiring in 60s. Initiating silent refresh...');
      try {
        isRefreshingRef.current = true;
        const response = await apiFetchRef.current('/auth/refresh', { method: 'POST' });
        if (response.status === 'success' && response.data?.token) {
          const newToken = response.data.token;
          localStorage.setItem('saas_token', newToken);
          sessionStorage.setItem('saas_token', newToken);

          // Emit reauthenticate with new token
          socket.emit('reauthenticate', { token: newToken });
          setToken(newToken);
          console.log('[Chat] Silent refresh token updated and reauthenticate emitted.');
        } else {
          isRefreshingRef.current = false;
        }
      } catch (err) {
        isRefreshingRef.current = false;
        console.error('[Chat] Silent refresh error:', err);
      }
    });

    socket.on('reauthenticated', () => {
      console.log('[Chat] Socket successfully re-authenticated with new token.');
    });

    // ── Reconnection State Recovery ─────────────────────────────────────────
    socket.on('missed_events', ({ messages: missedMessages = [], readReceipts = [], presenceChanges = [] }) => {
      const me = currentUserRef.current;
      console.log('[Chat] Received missed_events:', {
        messagesCount: missedMessages.length,
        readReceiptsCount: readReceipts.length,
        presenceChangesCount: presenceChanges.length
      });

      // 1. Recover/merge messages
      if (missedMessages.length > 0) {
        setMessages(prev => {
          const next = { ...prev };
          missedMessages.forEach(msg => {
            const convId = msg.conversationId;
            const existing = next[convId] || [];
            if (!existing.some(m => m.id === msg.id)) {
              const merged = [...existing, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              next[convId] = merged;
            }
          });
          return next;
        });

        // Update conversation previews for any new messages
        setConversations(prev => {
          let updated = [...prev];
          missedMessages.forEach(msg => {
            const convId = msg.conversationId;
            updated = updated.map(conv => {
              if (conv.id !== convId) return conv;
              const currentLastMsgTime = conv.lastMessage?.sentAt ? new Date(conv.lastMessage.sentAt).getTime() : 0;
              const msgTime = new Date(msg.createdAt).getTime();
              if (msgTime > currentLastMsgTime) {
                return {
                  ...conv,
                  lastMessage: {
                    messageId: msg.id,
                    content: msg.content,
                    type: msg.type,
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    sentAt: msg.createdAt
                  },
                  lastActivityAt: msg.createdAt
                };
              }
              return conv;
            });
          });
          return updated.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
        });

        missedMessages.forEach(msg => {
          const convId = msg.conversationId;
          if (msg.senderId !== me?.id) {
            socket.emit('message:delivered', { messageId: msg.id, conversationId: convId });
            const isChatPage = window.location.pathname.startsWith('/chat');
            const isTabVisible = document.visibilityState === 'visible' && document.hasFocus();
            const isMobile = window.innerWidth <= 480;
            const isLookingAtChat = !isMobile || !showMobileListRef.current;

            if (isChatPage && isTabVisible && isLookingAtChat && activeConvIdRef.current === convId) {
              socket.emit('mark_read', { conversationId: convId });
              socket.emit('conversation:read', { conversationId: convId, lastReadMessageId: msg.id });
              apiFetchRef.current(`/chat/conversations/${convId}/read`, { method: 'PATCH' }).catch(err => {
                console.error('[Chat] Auto-mark read error in missed_events:', err);
              });
              setUnreadCounts(prev => ({ ...prev, [convId]: 0 }));
            } else {
              setUnreadCounts(prev => ({
                ...prev,
                [convId]: (prev[convId] || 0) + 1
              }));
            }
          }
        });
      }

      // 2. Recover read receipts
      if (readReceipts.length > 0) {
        setMessages(prev => {
          const next = { ...prev };
          readReceipts.forEach(receipt => {
            const { messageId, conversationId, readBy } = receipt;
            const convMsgs = next[conversationId] || [];
            next[conversationId] = convMsgs.map(msg => {
              if (msg.id === messageId) {
                const existingReadBy = msg.readBy || [];
                const mergedReadBy = [...existingReadBy];
                readBy.forEach(r => {
                  if (!mergedReadBy.some(er => er.employeeId === r.employeeId)) {
                    mergedReadBy.push(r);
                  }
                });
                return {
                  ...msg,
                  readBy: mergedReadBy
                };
              }
              return msg;
            });
          });
          return next;
        });
      }

      // 3. Sync presence changes
      if (presenceChanges.length > 0) {
        setOnlineUsers(prev => {
          const next = new Map(prev);
          presenceChanges.forEach(u => next.set(u.userId, u));
          return next;
        });
        setPresenceMap(prev => {
          const next = new Map(prev);
          presenceChanges.forEach(u => {
            next.set(u.userId, {
              status: u.chatStatus || 'available',
              emoji: u.statusEmoji || null
            });
          });
          return next;
        });
      }

      // 4. Update sync time
      if (me?.id) {
        localStorage.setItem('chat_last_sync_' + me.id, new Date().toISOString());
      }
    });

    // ── Presence ──────────────────────────────────────────────────────────
    socket.on('online_users_list', (users) => {
      const map = new Map();
      users.forEach(u => map.set(u.userId, u));
      setOnlineUsers(map);

      setPresenceMap(prev => {
        const next = new Map(prev);
        users.forEach(u => {
          next.set(u.userId, {
            status: u.chatStatus || 'available',
            emoji: u.statusEmoji || null,
            isOnChatScreen: u.isOnChatScreen || false
          });
        });
        return next;
      });
    });

    socket.on('user_online', ({ userId, name, avatar, onlineAt, chatStatus, statusEmoji, isOnChatScreen }) => {
      setOnlineUsers(prev => {
        const next = new Map(prev);
        next.set(userId, { name, avatar, onlineAt, chatStatus, statusEmoji, isOnChatScreen });
        return next;
      });
      setPresenceMap(prev => {
        const next = new Map(prev);
        next.set(userId, {
          status: chatStatus || 'available',
          emoji: statusEmoji || null,
          isOnChatScreen: isOnChatScreen || false
        });
        return next;
      });
    });

    socket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      setPresenceMap(prev => {
        const next = new Map(prev);
        next.set(userId, { status: 'offline', emoji: null, isOnChatScreen: false });
        return next;
      });
    });

    socket.on('user_status_changed', ({ employeeId, status, emoji, expiresAt }) => {
      setPresenceMap(prev => {
        const next = new Map(prev);
        const existing = next.get(employeeId);
        next.set(employeeId, {
          status,
          emoji,
          isOnChatScreen: existing?.isOnChatScreen || false
        });
        return next;
      });
      if (employeeId === currentUser?.id) {
        setCurrentUserStatus({ status, emoji });
      }
    });

    socket.on('user_chatscreen_changed', ({ employeeId, isOnChatScreen }) => {
      setOnlineUsers(prev => {
        const next = new Map(prev);
        const existing = next.get(employeeId);
        if (existing) {
          next.set(employeeId, { ...existing, isOnChatScreen });
        }
        return next;
      });
      setPresenceMap(prev => {
        const next = new Map(prev);
        const existing = next.get(employeeId);
        if (existing) {
          next.set(employeeId, { ...existing, isOnChatScreen });
        } else {
          next.set(employeeId, { status: 'available', emoji: null, isOnChatScreen });
        }
        return next;
      });
    });

    // ── New Message ───────────────────────────────────────────────────────
    socket.on('new_message', async (message) => {
      const convId = message.conversationId;
      const me = currentUserRef.current;

      if (message.senderId !== me?.id) {
        socket.emit('message:delivered', { messageId: message.id, conversationId: convId });
      }

      // Clear timeout and remove from localStorage if this is our own message
      if (message.tempId && message.senderId === me?.id) {
        if (sendingTimeoutsRef.current[message.tempId]) {
          clearTimeout(sendingTimeoutsRef.current[message.tempId]);
          delete sendingTimeoutsRef.current[message.tempId];
        }
        localStorage.removeItem(`chat_failed_msg_${message.tempId}`);
        if (me?.id) {
          localStorage.removeItem(`chat_failed_msg_${me.id}_${message.tempId}`);
        }
      }

      let fullMessage = message;
      const isChatPage = window.location.pathname.startsWith('/chat');
      const isTabVisible = document.visibilityState === 'visible' && document.hasFocus();
      const isMobile = window.innerWidth <= 480;
      const isLookingAtChat = !isMobile || !showMobileListRef.current;
      const isCurrentActive = isChatPage && isLookingAtChat && activeConvIdRef.current === convId;

      if (message._isOptimized) {
        if (isCurrentActive) {
          // Hydrate full message details for the active conversation
          try {
            const data = await apiFetchRef.current(`/chat/messages/${message.id}`);
            if (data.status === 'success') {
              fullMessage = data.data;
            } else {
              fullMessage = {
                ...message,
                content: message.preview
              };
            }
          } catch (e) {
            console.error('[Chat] Failed to fetch full message:', e);
            fullMessage = {
              ...message,
              content: message.preview
            };
          }
        } else {
          // ── NON-ACTIVE CONVERSATION: Don't cache incomplete optimized messages ──
          // The _isOptimized payload only has preview/type — not full content, media,
          // reactions, etc. Storing it here would cause stale/broken rendering when
          // the user opens the conversation later.
          //
          // Exception: if this is OUR OWN optimistic message waiting for delivery
          // confirmation (tempId matches), we still update its delivery status.
          const isOwnOptimisticMsg = message.tempId && message.senderId === me?.id;
          if (isOwnOptimisticMsg) {
            // Just confirm delivery on our own optimistic message
            setMessages(prev => {
              const list = prev[convId] || [];
              const existingIndex = list.findIndex(m => m.tempId === message.tempId || m.id === message.id);
              if (existingIndex > -1) {
                const newList = [...list];
                newList[existingIndex] = {
                  ...newList[existingIndex],
                  id: message.id,
                  _deliveryStatus: 'delivered'
                };
                return { ...prev, [convId]: newList };
              }
              return prev;
            });
          } else {
            // Mark this conversation's message cache as stale so the next
            // openConversation() call fetches fresh data from the server.
            fetchedConvIdsRef.current.delete(convId);
          }

          // Still update conversation preview and unread count below, then return early
          setConversations(prev => {
            const updated = prev.map(conv => {
              if (conv.id !== convId) return conv;
              return {
                ...conv,
                lastMessage: {
                  messageId: message.id,
                  content: message.preview,
                  type: message.type,
                  senderId: message.senderId,
                  senderName: message.senderName || (message.senderId === me?.id ? me?.name : 'Someone'),
                  sentAt: message.createdAt
                },
                lastActivityAt: message.createdAt || new Date().toISOString()
              };
            });
            return updated.sort((a, b) =>
              new Date(b.lastActivityAt) - new Date(a.lastActivityAt)
            );
          });

          if (message.senderId !== me?.id) {
            const isMuted = mutedConversationsRef.current.has(convId);
            if (!isMuted) {
              setUnreadCounts(prev => ({
                ...prev,
                [convId]: (prev[convId] || 0) + 1
              }));
              // Play a notification chime for incoming group messages
              playNotificationChimeRef.current?.();
              // Desktop notification
              const conv = conversationsRef.current.find(c => c.id === convId);
              const title = conv?.type === 'group'
                ? (conv?.name || 'Group Chat')
                : (message.senderName || 'New Message');
              const messageBody = message.type === 'text'
                ? (message.preview || 'Sent a message')
                : `📎 ${message.type || 'Attachment'}`;
              const body = conv?.type === 'group'
                ? `${message.senderName || 'Someone'}: ${messageBody}`
                : messageBody;
              sendNotificationRef.current?.(title, {
                body,
                icon: message.senderAvatar || conv?.avatar || '/favicon.ico',
                tag: convId,
                conversationId: convId,
                onClickCallback: (targetConvId) => {
                  setActiveConvId(targetConvId);
                  window.location.href = `/chat?conversation=${targetConvId}`;
                  window.focus();
                }
              });
            }
          }
          if (me?.id) {
            localStorage.setItem('chat_last_sync_' + me.id, new Date().toISOString());
          }
          return; // ← early return: rest of handler is for active conv only
        }
      }

      // Append to messages state (only for active conversations or non-optimized messages)
      setMessages(prev => {
        const list = prev[convId] || [];
        const existingIndex = list.findIndex(m =>
          (message.tempId && m.tempId === message.tempId) || m.id === message.id
        );

        let newList;
        if (existingIndex > -1) {
          newList = [...list];
          newList[existingIndex] = {
            ...newList[existingIndex],
            ...fullMessage,
            _deliveryStatus: 'delivered'
          };
        } else {
          newList = [...list, fullMessage];
        }
        return { ...prev, [convId]: newList };
      });

      // Update conversation preview + bubble to top
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id !== convId) return conv;
          return {
            ...conv,
            lastMessage: {
              messageId: fullMessage.id,
              content: fullMessage.content,
              type: fullMessage.type,
              senderId: fullMessage.senderId,
              senderName: fullMessage.senderName || (fullMessage.senderId === me?.id ? me?.name : 'User'),
              sentAt: fullMessage.createdAt
            },
            lastActivityAt: fullMessage.createdAt || new Date().toISOString()
          };
        });
        return updated.sort((a, b) =>
          new Date(b.lastActivityAt) - new Date(a.lastActivityAt)
        );
      });

      // Increment unread only for messages from others, not in active conv
      if (fullMessage.senderId !== me?.id) {
        console.log('[Chat] new_message received from other:', {
          messageId: fullMessage.id,
          senderName: fullMessage.senderName,
          convId,
          activeConvId: activeConvIdRef.current,
          isChatPage,
          isTabVisible,
          isLookingAtChat,
          pathname: window.location.pathname
        });

        // Trigger desktop push notification for any unread message from others
        // Fires when:
        //  1. Tab is not focused / not visible (user switched away), OR
        //  2. User is on a different conversation / page (isCurrentActive is false)
        const isTabInactive = !isTabVisible || !document.hasFocus();
        const isMuted = mutedConversationsRef.current.has(convId);
        const shouldNotify = !isMuted && (!isCurrentActive || isTabInactive);

        if (shouldNotify) {
          const conv = conversationsRef.current.find(c => c.id === convId);
          const title = conv?.type === 'group'
            ? (conv?.name || 'Group Chat')
            : (fullMessage.senderName || 'New Message');

          const messageBody = fullMessage.type === 'text'
            ? (fullMessage.content || 'Sent a message')
            : `📎 ${fullMessage.media?.fileName || fullMessage.type || 'Attachment'}`;

          const body = conv?.type === 'group'
            ? `${fullMessage.senderName || 'Someone'}: ${messageBody}`
            : messageBody;

          sendNotificationRef.current?.(title, {
            body,
            icon: fullMessage.senderAvatar || conv?.avatar || '/favicon.ico',
            tag: convId,
            conversationId: convId,
            onClickCallback: (targetConvId) => {
              setActiveConvId(targetConvId);
              window.location.href = `/chat?conversation=${targetConvId}`;
              window.focus();
            }
          });
        }

        if (isCurrentActive && isTabVisible) {
          console.log('[Chat] Auto-marking message as read inside new_message');
          // Auto-mark as read if the conversation is currently active and user is looking at it
          socket.emit('mark_read', { conversationId: convId });
          socket.emit('conversation:read', { conversationId: convId, lastReadMessageId: fullMessage.id });
          apiFetchRef.current(`/chat/conversations/${convId}/read`, { method: 'PATCH' }).catch(err => {
            console.error('[Chat] Auto-mark read error:', err);
          });
          setUnreadCounts(prev => ({ ...prev, [convId]: 0 }));
        } else {
          setUnreadCounts(prev => ({
            ...prev,
            [convId]: (prev[convId] || 0) + 1
          }));
        }

      }
      if (me?.id) {
        localStorage.setItem('chat_last_sync_' + me.id, new Date().toISOString());
      }
    });

    // ── Notification for conversations not open ───────────────────────────
    socket.on('new_message_notification', (notification) => {
      // Update conversation preview in sidebar list
      setConversations(prev => prev.map(conv => {
        if (conv.id !== notification.conversationId) return conv;
        return {
          ...conv,
          lastMessage: {
            messageId: notification.messageId || `notification-${Date.now()}`,
            content: notification.preview,
            senderId: notification.senderId,
            senderName: notification.senderName,
            sentAt: notification.sentAt
          },
          lastActivityAt: notification.sentAt || new Date().toISOString()
        };
      }));

      // Increment unread count for this conversation only if not active and visible
      const isMuted = mutedConversationsRef.current.has(notification.conversationId);
      const isChatPage = window.location.pathname.startsWith('/chat');
      const isTabVisible = document.visibilityState === 'visible' && document.hasFocus();
      const isMobile = window.innerWidth <= 480;
      const isLookingAtChat = !isMobile || !showMobileListRef.current;
      const isCurrentActive = isChatPage && isLookingAtChat && activeConvIdRef.current === notification.conversationId;

      if (!isMuted) {
        if (isCurrentActive && isTabVisible) {
          setUnreadCounts(prev => ({
            ...prev,
            [notification.conversationId]: 0
          }));
          socket.emit('mark_read', { conversationId: notification.conversationId });
          if (notification.messageId) {
            socket.emit('conversation:read', { conversationId: notification.conversationId, lastReadMessageId: notification.messageId });
          }
          apiFetchRef.current(`/chat/conversations/${notification.conversationId}/read`, { method: 'PATCH' }).catch(err => {
            console.error('[Chat] Auto-mark read error in notification:', err);
          });
          // Refresh messages for the active chat window to display the new message
          fetchMessagesRef.current?.(notification.conversationId, null);
        } else {
          setUnreadCounts(prev => ({
            ...prev,
            [notification.conversationId]: (prev[notification.conversationId] || 0) + 1
          }));
        }
      }

      // Desktop notification (only fires when Notification.permission === 'granted' and app is not focused)
      const isCurrentConv = activeConvIdRef.current === notification.conversationId;

      if (!isCurrentConv && !isMuted) {
        const title = notification.conversationType === 'group'
          ? notification.conversationName
          : notification.senderName;

        const body = notification.conversationType === 'group'
          ? `${notification.senderName}: ${notification.preview}`
          : notification.preview;

        sendNotificationRef.current?.(title, {
          body,
          icon: notification.senderAvatar || '/favicon.ico',
          tag: notification.conversationId,
          conversationId: notification.conversationId,
          onClickCallback: (convId) => {
            setActiveConvId(convId);
            window.location.href = `/chat?conversation=${convId}`;
            window.focus();
          }
        });
      }
    });
    // ── Typing ────────────────────────────────────────────────────────────
    socket.on('user:typing', ({ userId, name, conversationId, isRecording }) => {
      setTypingUsers(prev => {
        const convTyping = prev[conversationId] || [];
        const existing = convTyping.find(u => u.userId === userId);
        if (existing) {
          if (existing.isRecording === isRecording) return prev;
          return {
            ...prev,
            [conversationId]: convTyping.map(u => u.userId === userId ? { ...u, isRecording } : u)
          };
        }
        return {
          ...prev,
          [conversationId]: [...convTyping, { userId, name, isRecording }]
        };
      });

      // Reset client-side safety timeout to auto-clear in 6 seconds
      const timeoutKey = `${conversationId}:${userId}`;
      if (clientTypingTimeoutsRef.current[timeoutKey]) {
        clearTimeout(clientTypingTimeoutsRef.current[timeoutKey]);
      }
      clientTypingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
        setTypingUsers(prev => {
          const list = prev[conversationId] || [];
          if (!list.some(u => u.userId === userId)) return prev;
          return {
            ...prev,
            [conversationId]: list.filter(u => u.userId !== userId)
          };
        });
        delete clientTypingTimeoutsRef.current[timeoutKey];
      }, 6000);
    });

    socket.on('user:stopped_typing', ({ userId, conversationId }) => {
      const timeoutKey = `${conversationId}:${userId}`;
      if (clientTypingTimeoutsRef.current[timeoutKey]) {
        clearTimeout(clientTypingTimeoutsRef.current[timeoutKey]);
        delete clientTypingTimeoutsRef.current[timeoutKey];
      }

      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || [])
          .filter(u => u.userId !== userId)
      }));
    });

    // ── Read Receipts (blue tick) ─────────────────────────────────────────
    socket.on('messages_read', ({ conversationId, readBy, readAt, readByName }) => {
      const me = currentUserRef.current;
      let readByArray = [];
      if (Array.isArray(readBy)) {
        readByArray = readBy;
      } else if (typeof readBy === 'string') {
        readByArray = [{ employeeId: readBy, name: readByName || 'Someone', readAt: readAt || new Date().toISOString() }];
      }

      // If we are the ones who read the messages, clear the unread count locally
      if (readByArray.some(r => r.employeeId === me?.id)) {
        setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }));
      }

      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMsgs.map(msg => {
            // Only update seen status for messages read by someone other than the sender
            const validReaders = readByArray.filter(r => r.employeeId !== msg.senderId);
            if (validReaders.length === 0) return msg;

            if (msg.senderId === me?.id) {
              const existing = msg.readBy || [];
              const merged = [...existing];
              validReaders.forEach(r => {
                if (!merged.some(er => er.employeeId === r.employeeId)) {
                  merged.push(r);
                }
              });
              return {
                ...msg,
                _deliveryStatus: 'seen',
                readBy: merged
              };
            }
            return msg;
          })
        };
      });
    });

    // ── Delivery Confirmed ────────────────────────────────────────────────
    socket.on('message_delivered', ({ messageId, conversationId, tempId }) => {
      if (tempId) {
        if (sendingTimeoutsRef.current[tempId]) {
          clearTimeout(sendingTimeoutsRef.current[tempId]);
          delete sendingTimeoutsRef.current[tempId];
        }
        localStorage.removeItem(`chat_failed_msg_${tempId}`);
        if (currentUserRef.current?.id) {
          localStorage.removeItem(`chat_failed_msg_${currentUserRef.current.id}_${tempId}`);
        }
      }

      setMessages(prev => {
        const list = prev[conversationId] || [];
        const updated = list.map(msg => {
          if (msg.id === tempId || msg.id === messageId) {
            return { ...msg, id: messageId, _deliveryStatus: 'delivered' };
          }
          return msg;
        });
        return { ...prev, [conversationId]: updated };
      });
    });

    // ── Real-time Delivery Receipts (Phase 5) ──────────────────────────────
    socket.on('message:delivery_update', ({ messageId, conversationId, userId, deliveredAt }) => {
      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMsgs.map(msg => {
            if (msg.id === messageId) {
              const existingDeliveredTo = msg.deliveredTo || [];
              const alreadyDelivered = existingDeliveredTo.some(d => d.employeeId === userId);
              const mergedDeliveredTo = alreadyDelivered
                ? existingDeliveredTo
                : [...existingDeliveredTo, { employeeId: userId, deliveredAt }];

              const currentStatus = msg._deliveryStatus;
              const newStatus = (currentStatus === 'seen') ? 'seen' : 'delivered';

              return {
                ...msg,
                _deliveryStatus: newStatus,
                deliveredTo: mergedDeliveredTo
              };
            }
            return msg;
          })
        };
      });
    });

    // ── Real-time Read Receipts (Phase 5) ──────────────────────────────────
    socket.on('conversation:read_update', ({ conversationId, userId, lastReadMessageId, readAt }) => {
      const me = currentUserRef.current;

      // Multi-tab synchronization: clear unread count for the reading user
      if (userId === me?.id) {
        setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }));
      }

      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        const lastReadIdx = convMsgs.findIndex(m => m.id === lastReadMessageId);

        return {
          ...prev,
          [conversationId]: convMsgs.map((msg, idx) => {
            const isBeforeOrEqual = lastReadIdx !== -1
              ? idx <= lastReadIdx
              : (msg.id === lastReadMessageId);

            if (isBeforeOrEqual && msg.senderId !== userId) {
              const existingReadBy = msg.readBy || [];
              const alreadyRead = existingReadBy.some(r => r.employeeId === userId);
              const mergedReadBy = alreadyRead
                ? existingReadBy
                : [...existingReadBy, { employeeId: userId, userId, readAt }];

              const isSentByMe = (msg.senderId === me?.id);
              const newDeliveryStatus = isSentByMe ? 'seen' : msg._deliveryStatus;

              return {
                ...msg,
                _deliveryStatus: newDeliveryStatus,
                readBy: mergedReadBy
              };
            }
            return msg;
          })
        };
      });
    });

    // ── Message Errors ───────────────────────────────────────────────────
    const handleSendError = ({ tempId, reason }) => {
      console.error('[Chat] Message error received:', reason, tempId);
      if (tempId) {
        if (sendingTimeoutsRef.current[tempId]) {
          clearTimeout(sendingTimeoutsRef.current[tempId]);
          delete sendingTimeoutsRef.current[tempId];
        }

        setMessages(prev => {
          const list = prev[activeConvIdRef.current] || [];
          const msgIndex = list.findIndex(m => m.id === tempId);
          if (msgIndex > -1) {
            const updated = [...list];
            updated[msgIndex] = { ...updated[msgIndex], _deliveryStatus: 'failed' };

            // Store failed message in localStorage
            const failedMsg = {
              convId: updated[msgIndex].conversationId,
              content: updated[msgIndex].content,
              type: updated[msgIndex].type,
              replyTo: updated[msgIndex].replyTo,
              media: updated[msgIndex].media,
              tempId,
              createdAt: updated[msgIndex].createdAt
            };
            localStorage.setItem(`chat_failed_msg_${tempId}`, JSON.stringify(failedMsg));
            if (currentUserRef.current?.id) {
              localStorage.setItem(`chat_failed_msg_${currentUserRef.current.id}_${tempId}`, JSON.stringify(failedMsg));
            }

            return { ...prev, [activeConvIdRef.current]: updated };
          }
          return prev;
        });
      }
    };

    socket.on('message_error', handleSendError);
    socket.on('message_upload_error', handleSendError);
    socket.on('error', (err) => {
      console.error('[Chat Socket] Global error event received:', err);
    });

    // ── Conversation Cleared ──────────────────────────────────────────────
    socket.on('conversation:cleared', ({ conversationId }) => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: []
      }));
      setHasMoreMessages(prev => ({ ...prev, [conversationId]: false }));
      setMessageCursors(prev => ({ ...prev, [conversationId]: null }));
      fetchedConvIdsRef.current.add(conversationId);
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessage: null
          };
        }
        return c;
      }));
      if (activeConvIdRef.current === conversationId) {
        setPinnedMessages([]);
        setTotalPinned(0);
        setPinnedPagination({});
      }
    });

    // ── Message Deleted ───────────────────────────────────────────────────
    socket.on('message_deleted', ({ messageId, conversationId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        setMessages(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map(msg =>
            msg.id === messageId
              ? { ...msg, isDeleted: true, content: '' }
              : msg
          )
        }));
      } else {
        setMessages(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || [])
            .filter(msg => msg.id !== messageId)
        }));
      }
    });

    // ── Message Edited ────────────────────────────────────────────────────
    socket.on('message_edited', ({ messageId, conversationId, newContent, editedAt }) => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg =>
          msg.id === messageId
            ? { ...msg, content: newContent, isEdited: true, editedAt }
            : msg
        )
      }));
    });

    // ── Reaction Added ────────────────────────────────────────────────────
    socket.on('reaction_added', ({ messageId, conversationId,
      employeeId, name, emoji, reactedAt }) => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg => {
          if (msg.id !== messageId) return msg;
          // Remove previous reaction from same user, then add new
          const reactions = (msg.reactions || [])
            .filter(r => r.employeeId !== employeeId);
          return {
            ...msg,
            reactions: [...reactions, { employeeId, name, emoji, reactedAt }]
          };
        })
      }));
    });

    // ── Group Socket Events ───────────────────────────────────────────────
    socket.on('new_conversation', (conversation) => {
      setConversations(prev => {
        const exists = prev.some(c => c.id === conversation.id);
        if (exists) return prev;
        return [conversation, ...prev].sort((a, b) => new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt));
      });
    });

    socket.on('group_updated', (updatedConv) => {
      setConversations(prev => prev.map(c => {
        if (c.id === updatedConv.id) {
          return { ...c, ...updatedConv };
        }
        return c;
      }));
    });

    socket.on('member_added', ({ conversationId, participants }) => {
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
          return { ...c, participants };
        }
        return c;
      }));
    });

    socket.on('member_removed', ({ conversationId, employeeId, participants }) => {
      if (employeeId === currentUserRef.current?.id) {
        setConversations(prev => {
          const conv = prev.find(c => c.id === conversationId);
          if (conv && conv.type === 'group' && addToastRef.current) {
            addToastRef.current('info', `You were removed from ${conv.name || 'group'}`);
          }
          if (activeConvIdRef.current === conversationId) {
            setActiveConvId(null);
          }
          return prev.filter(c => c.id !== conversationId);
        });
      } else {
        setConversations(prev => prev.map(c => {
          if (c.id === conversationId) {
            return { ...c, participants };
          }
          return c;
        }));
      }
    });

    socket.on('conversation_removed', ({ conversationId }) => {
      setConversations(prev => {
        const conv = prev.find(c => c.id === conversationId);
        if (conv && conv.type === 'group' && addToastRef.current) {
          addToastRef.current('info', `You were removed from ${conv.name || 'group'}`);
        }
        if (activeConvIdRef.current === conversationId) {
          setActiveConvId(null);
        }
        return prev.filter(c => c.id !== conversationId);
      });
    });

    socket.on('member_left', ({ conversationId, employeeId, participants }) => {
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
          return { ...c, participants };
        }
        return c;
      }));
    });

    // ── Pin / Unpin Conversation ──────────────────────────────────────────
    socket.on('conversation_pinned', ({ conversationId, pinnedBy, pinnedAt }) => {
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
          const pinnedList = c.pinnedBy || [];
          const exists = pinnedList.some(p => p.employeeId === pinnedBy);
          const nextPinned = exists
            ? pinnedList.map(p => p.employeeId === pinnedBy ? { ...p, pinnedAt } : p)
            : [...pinnedList, { employeeId: pinnedBy, pinnedAt }];
          return { ...c, pinnedBy: nextPinned };
        }
        return c;
      }));
    });

    socket.on('conversation_unpinned', ({ conversationId, pinnedBy }) => {
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId) {
          const pinnedList = c.pinnedBy || [];
          return { ...c, pinnedBy: pinnedList.filter(p => p.employeeId !== pinnedBy) };
        }
        return c;
      }));
    });

    // ── Pin / Unpin Message ────────────────────────────────────────────────
    socket.on('message_pinned', ({ messageId, conversationId, pinnedBy, pinnedByName, pinnedAt }) => {
      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMsgs.map(msg =>
            msg.id === messageId
              ? { ...msg, isPinned: true, pinnedBy, pinnedByName, pinnedAt }
              : msg
          )
        };
      });

      if (conversationId === activeConvIdRef.current) {
        loadPinnedMessagesRef.current?.(conversationId, { page: 1, limit: 10 });
      }
    });

    socket.on('message_unpinned', ({ messageId, conversationId }) => {
      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMsgs.map(msg =>
            msg.id === messageId
              ? { ...msg, isPinned: false, pinnedBy: null, pinnedAt: null }
              : msg
          )
        };
      });

      if (conversationId === activeConvIdRef.current) {
        setPinnedMessages(prev => prev.filter(m => m.messageId !== messageId));
        setTotalPinned(prev => Math.max(0, prev - 1));
      }
    });

    // ── Star / Highlight Message ───────────────────────────────────────────
    socket.on('message_starred', ({ messageId, conversationId, starredBy }) => {
      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMsgs.map(msg =>
            msg.id === messageId
              ? { ...msg, starredBy: [...(msg.starredBy || []), starredBy] }
              : msg
          )
        };
      });
    });

    socket.on('message_unstarred', ({ messageId, conversationId, unstarredBy }) => {
      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMsgs.map(msg =>
            msg.id === messageId
              ? { ...msg, starredBy: (msg.starredBy || []).filter(u => u !== unstarredBy) }
              : msg
          )
        };
      });
    });

    // ── Thread Socket Events ────────────────────────────────────────────────
    socket.on('thread:reply:new', ({ threadId, reply, tempId }) => {
      const me = currentUserRef.current;

      // 1. If it's our own optimistic message, replace/update it
      if (tempId && reply.senderId === me?.id) {
        setActiveThreadReplies(prev => {
          const index = prev.findIndex(m => m.id === tempId || m.id === reply.id);
          if (index > -1) {
            const next = [...prev];
            next[index] = { ...reply, _deliveryStatus: 'delivered' };
            return next;
          }
          return [...prev, reply];
        });
        return;
      }

      // 2. If activeThread is this thread, append and mark read
      if (activeThreadRef.current && activeThreadRef.current._id === threadId) {
        setActiveThreadReplies(prev => {
          if (prev.some(m => m.id === reply.id)) return prev;
          return [...prev, reply];
        });

        if (document.visibilityState === 'visible' && document.hasFocus()) {
          apiFetchRef.current(`/chat/threads/${threadId}/read`, { method: 'POST' }).catch(() => { });
          socket.emit('mark_read_thread', { threadId });
        }
      } else {
        // Play chime and increment unread badge count
        playNotificationChimeRef.current?.();
        setThreadUnreadCounts(prev => ({
          ...prev,
          [threadId]: (prev[threadId] || 0) + 1
        }));
      }

      // 3. Dynamically update the root message's thread footer count in messages list
      setMessages(prev => {
        const convId = reply.conversationId;
        const convMsgs = prev[convId] || [];
        const next = convMsgs.map(msg => {
          if (msg.threadId === threadId || msg.id === activeThreadRef.current?.rootMessageId) {
            return {
              ...msg,
              threadId: threadId,
              threadDetails: {
                replyCount: (msg.threadDetails?.replyCount || 0) + 1,
                lastReplyAt: reply.createdAt,
                participants: Array.from(new Set([...(msg.threadDetails?.participants || []), reply.senderId]))
              }
            };
          }
          return msg;
        });
        return { ...prev, [convId]: next };
      });

      // 4. Refresh My Threads list
      fetchThreadActivityRef.current?.();
    });

    socket.on('thread:updated', (updatedThread) => {
      if (activeThreadRef.current && activeThreadRef.current._id === updatedThread.threadId) {
        setActiveThread(prev => prev ? { ...prev, ...updatedThread } : null);
      }

      // Update root message details in messages list
      setMessages(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(convId => {
          next[convId] = (next[convId] || []).map(msg => {
            if (msg.threadId === updatedThread.threadId || msg.id === updatedThread.rootMessageId) {
              return {
                ...msg,
                threadId: updatedThread.threadId,
                threadDetails: {
                  replyCount: updatedThread.replyCount,
                  lastReplyAt: updatedThread.lastReplyAt,
                  status: updatedThread.status,
                  participants: updatedThread.participants
                }
              };
            }
            return msg;
          });
        });
        return next;
      });
    });

    socket.on('thread:read', ({ threadId }) => {
      setThreadUnreadCounts(prev => ({
        ...prev,
        [threadId]: 0
      }));
      setThreadActivityList(prev => prev.map(t => t.threadId === threadId ? { ...t, unreadCount: 0 } : t));
    });

    socket.on('thread:mention', ({ threadId, senderName, preview }) => {
      if (addToastRef.current) {
        addToastRef.current('info', `@${senderName} mentioned you in a thread: "${preview}"`);
      }
    });

    // ── Poll Socket Events ───────────────────────────────────────────────
    socket.on('poll:updated', (updatedPoll) => {
      const convId = updatedPoll.conversationId;
      const pollIdStr = updatedPoll._id?.toString();
      if (!pollIdStr) return;

      setMessages(prev => {
        const list = prev[convId] || [];
        return {
          ...prev,
          [convId]: list.map(m => {
            if (m.type === 'poll' && m.pollId) {
              const mPollId = typeof m.pollId === 'object' ? m.pollId._id : m.pollId;
              if (mPollId?.toString() === pollIdStr) {
                return { ...m, pollId: updatedPoll };
              }
            }
            return m;
          })
        };
      });

      setActiveThreadReplies(prev =>
        prev.map(r => {
          if (r.type === 'poll' && r.pollId) {
            const rPollId = typeof r.pollId === 'object' ? r.pollId._id : r.pollId;
            if (rPollId?.toString() === pollIdStr) {
              return { ...r, pollId: updatedPoll };
            }
          }
          return r;
        })
      );
    });

    socket.on('poll:deleted', ({ pollId }) => {
      const pollIdStr = pollId?.toString();
      if (!pollIdStr) return;

      setMessages(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(convId => {
          next[convId] = (next[convId] || []).filter(m => {
            if (m.type === 'poll' && m.pollId) {
              const mPollId = typeof m.pollId === 'object' ? m.pollId._id : m.pollId;
              return mPollId?.toString() !== pollIdStr;
            }
            return true;
          });
        });
        return next;
      });

      setActiveThreadReplies(prev =>
        prev.filter(r => {
          if (r.type === 'poll' && r.pollId) {
            const rPollId = typeof r.pollId === 'object' ? r.pollId._id : r.pollId;
            return rPollId?.toString() !== pollIdStr;
          }
          return true;
        })
      );
    });

    socket.on('user:blocked', ({ userId, blockedByMe }) => {
      if (blockedByMe) {
        setBlockedUsers(prev => [...new Set([...prev, userId])]);
      } else {
        setBlockedByUsers(prev => [...new Set([...prev, userId])]);
      }
    });

    socket.on('user:unblocked', ({ userId, blockedByMe }) => {
      if (blockedByMe) {
        setBlockedUsers(prev => prev.filter(id => id !== userId));
      } else {
        setBlockedByUsers(prev => prev.filter(id => id !== userId));
      }
    });

    // Initial load (use refs so they always call the latest version)
    fetchConversationsRef.current?.();
    fetchThreadActivityRef.current?.();

    // Cleanup: remove listeners only — NEVER disconnect.
    // The socket connection lifecycle is managed exclusively by AppContext
    // (connectSocket on login, disconnectSocket on logout).
    return () => {
      socket.removeAllListeners();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── AUTO-MARK READ ON VISIBILITY / FOCUS CHANGE ───────────────────────────
  useEffect(() => {
    const handleVisibilityChange = (e) => {
      const isChatPage = window.location.pathname.startsWith('/chat');
      const isTabVisible = document.visibilityState === 'visible' && document.hasFocus();
      const isMobile = window.innerWidth <= 480;
      const isLookingAtChat = !isMobile || !showMobileListRef.current;

      console.log(`[Chat] Event "${e?.type}" triggered visibility handler:`, {
        visibilityState: document.visibilityState,
        pathname: window.location.pathname,
        activeConvId: activeConvIdRef.current,
        isChatPage,
        isTabVisible,
        isLookingAtChat
      });

      if (isTabVisible && isChatPage && isLookingAtChat && activeConvIdRef.current) {
        const convId = activeConvIdRef.current;
        console.log('[Chat] Visibility handler marking active conversation as read:', convId);

        // Find the last message in the active conversation
        const convMsgs = messagesRef.current[convId] || [];
        const lastMsg = convMsgs.length > 0 ? convMsgs[convMsgs.length - 1] : null;
        const lastReadMessageId = lastMsg?.id;

        socketRef.current?.emit('mark_read', { conversationId: convId });
        if (lastReadMessageId) {
          socketRef.current?.emit('conversation:read', { conversationId: convId, lastReadMessageId });
        }
        apiFetchRef.current(`/chat/conversations/${convId}/read`, { method: 'PATCH' }).catch(err => {
          console.error('[Chat] Visibility mark read error:', err);
        });
        setUnreadCounts(prev => ({ ...prev, [convId]: 0 }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterChatScreen = useCallback(() => {
    socketRef.current?.emit('user_chatscreen_status', { isOnChatScreen: true });
  }, []);

  const leaveChatScreen = useCallback(() => {
    socketRef.current?.emit('user_chatscreen_status', { isOnChatScreen: false });
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    // Connection
    isConnected,
    socket: socketRef.current,

    // Data
    conversations,
    activeConvId,
    messages,
    onlineUsers,
    typingUsers,
    unreadCounts,
    unreadCountOnOpen,
    showMobileList,
    setShowMobileList,
    currentUserStatus,
    presenceMap,
    blockedUsers,
    blockedByUsers,
    highlightedMessageId,
    setHighlightedMessageId,
    pinnedMessages,
    totalPinned,
    pinnedPagination,

    // Loading states
    isLoadingConvs,
    isLoadingMsgs,
    isLoadingPinned,
    hasMoreMessages,

    // Actions
    fetchConversations,
    openConversation,
    sendMessage,
    retryMessage,
    startDirectChat,
    createGroup,
    updateGroup,
    addMembersToGroup,
    removeMemberFromGroup,
    leaveGroup,
    deleteMessage,
    forwardMessage,
    clearChat,
    deleteMessagesBulk,
    editMessage,
    addReaction,
    loadMoreMessages,
    searchEmployees,
    handleTypingStart,
    handleTypingStop,
    setUserStatus,
    enterChatScreen,
    leaveChatScreen,
    pinConversation,
    unpinConversation,
    pinMessage,
    unpinMessage,
    loadPinnedMessages,
    starMessage,
    unstarMessage,
    blockUser,
    unblockUser,
    archiveConversation,
    unarchiveConversation,
    hideConversation,
    unhideConversation,
    markConversationAsRead,
    markConversationAsUnread,
    deleteConversationForMe,
    deleteGroup,
    archivedConversations,
    isLoadingArchived,
    fetchArchivedConversations,
    hiddenConversations,
    isLoadingHidden,
    fetchHiddenConversations,

    // Threading
    activeThread,
    activeThreadReplies,
    isLoadingThreadReplies,
    threadActivityList,
    isLoadingThreadActivity,
    threadUnreadCounts,
    openThread,
    closeThread,
    fetchThreadReplies,
    sendThreadReply,
    followThread,
    unfollowThread,
    updateThreadStatus,
    fetchThreadActivity,
    markThreadAsRead,

    // File Uploads
    uploadQueue,
    startFileUpload,
    cancelFileUpload,
    retryFileUpload,
    removeUploadItem,
    clearFileUploads,

    // Helpers
    apiFetch,
    isUserOnline: (userId) => onlineUsers.has(userId),
    getOnlineUser: (userId) => onlineUsers.get(userId),
    getTotalUnread: () =>
      Object.values(unreadCounts).reduce((a, b) => a + b, 0),

    // Muting
    mutedConversations,
    muteConversation,
    unmuteConversation,

    // Notifications
    permission,
    requestPermission: wrappedRequestPermission,
    sendNotification
  };

  return (
    <ChatContext.Provider value={value}>
      <NotificationPermissionBanner />
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

export default ChatContext;
