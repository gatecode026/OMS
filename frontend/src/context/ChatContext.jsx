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
import { io } from 'socket.io-client';
import { useApp } from './AppContext';
import { useDesktopNotifications } from '../hooks/useDesktopNotifications';
import NotificationPermissionBanner from '../components/chat/NotificationPermissionBanner';

const ChatContext = createContext(null);

// Use window.API_URL and window.SOCKET_URL set by main.jsx, fallback to localhost
const API_URL = window.API_URL || 'http://localhost:5000';
const SOCKET_URL = window.SOCKET_URL || 'http://localhost:5001';

// ─── Provider ────────────────────────────────────────────────────────────────

export const ChatProvider = ({ children }) => {
  const { token, setToken, currentUser, addToast } = useApp();

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
  const [isConnected, setIsConnected]       = useState(false);
  const [conversations, setConversations]   = useState([]);
  const [activeConvId, setActiveConvId]     = useState(null);
  const [messages, setMessages]             = useState({});
  // { convId: Message[] }
  const [onlineUsers, setOnlineUsers]       = useState(new Map());
  // Map<userId, { name, avatar, onlineAt }>
  const [currentUserStatus, setCurrentUserStatus] = useState({ status: 'available', emoji: null });
  const [presenceMap, setPresenceMap]       = useState(new Map());
  const [typingUsers, setTypingUsers]       = useState({});
  // { convId: [{ userId, name }] }
  const [unreadCounts, setUnreadCounts]     = useState({});
  // { convId: number }
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs]   = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState({});
  // { convId: boolean }
  const [messageCursors, setMessageCursors]   = useState({});
  // { convId: string }
  const [showMobileList, setShowMobileList] = useState(true);
  const showMobileListRef = useRef(true);
  useEffect(() => { showMobileListRef.current = showMobileList; }, [showMobileList]);

  // Stable ref for activeConvId (avoids stale closures in socket handlers)
  const activeConvIdRef = useRef(null);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  // Stable ref for conversations list (avoids stale closures in socket handlers)
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const isRefreshingRef = useRef(false);
  const [socketToken, setSocketToken] = useState(token);

  useEffect(() => {
    if (isRefreshingRef.current) {
      isRefreshingRef.current = false;
    } else {
      setSocketToken(token);
    }
  }, [token]);

  // Typing debounce timers
  const typingTimerRef = useRef({});
  // Timeout references for in-flight messages
  const sendingTimeoutsRef = useRef({});

  // Desktop notification hook
  const { permission, requestPermission, sendNotification } = useDesktopNotifications(activeConvId, currentUserStatus?.status);

  // ── API Helper ────────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (path, options = {}) => {
    if (!token) return { status: 'error', message: 'Not authenticated' };
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    return res.json();
  }, [token]);

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
  // Helper to fetch failed messages from localStorage for a conversation
  const getFailedMessagesForConv = useCallback((convId) => {
    if (!currentUser?.id) return [];
    const failed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`chat_failed_msg_${currentUser.id}_`)) {
        try {
          const msg = JSON.parse(localStorage.getItem(key));
          if (msg && msg.convId === convId) {
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
          if (!cursor) return { ...prev, [convId]: [...msgs, ...failedMsgs] };
          // Older messages prepend (scroll-up = load older)
          const existing = prev[convId] || [];
          const filteredNew = msgs.filter(newM => !existing.some(m => m.id === newM.id));
          const nonFailedExisting = existing.filter(m => m._deliveryStatus !== 'failed');
          return { ...prev, [convId]: [...filteredNew, ...nonFailedExisting, ...failedMsgs] };
        });
        setHasMoreMessages(prev => ({
          ...prev, [convId]: pagination.hasMore
        }));
        setMessageCursors(prev => ({ ...prev, [convId]: pagination.cursor }));
      }
    } catch (err) {
      console.error('[Chat] fetchMessages error:', err);
    } finally {
      setIsLoadingMsgs(false);
    }
  }, [apiFetch, getFailedMessagesForConv]);

  // ── LOAD MORE (scroll up) ─────────────────────────────────────────────────
  const loadMoreMessages = useCallback(async (convId) => {
    if (!hasMoreMessages[convId] || isLoadingMsgs) return;
    const currentCursor = messageCursors[convId];
    if (!currentCursor) return;
    await fetchMessages(convId, currentCursor);
  }, [hasMoreMessages, isLoadingMsgs, messageCursors, fetchMessages]);

  // ── OPEN CONVERSATION ─────────────────────────────────────────────────────
  const openConversation = useCallback(async (convId) => {
    setUnreadCounts(prev => ({ ...prev, [convId]: 0 }));
    setActiveConvId(convId);
    socketRef.current?.emit('join_conversation', convId);

    // Only fetch if not already loaded
    if (!messages[convId]) {
      await fetchMessages(convId, null);
    }

    // Mark as read via REST + socket
    await apiFetch(`/chat/conversations/${convId}/read`, { method: 'PATCH' });
    socketRef.current?.emit('mark_read', { conversationId: convId });
  }, [messages, fetchMessages, apiFetch]);

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
    const key = `chat_failed_msg_${currentUser.id}_${tempId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return;

    try {
      const msg = JSON.parse(stored);
      // Remove from localStorage first
      localStorage.removeItem(key);
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
  const handleTypingStart = useCallback((convId) => {
    socketRef.current?.emit('typing_start', { conversationId: convId });
    // Auto-stop after 3 seconds of no keystrokes
    if (typingTimerRef.current[convId]) {
      clearTimeout(typingTimerRef.current[convId]);
    }
    typingTimerRef.current[convId] = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { conversationId: convId });
    }, 3000);
  }, []);

  const handleTypingStop = useCallback((convId) => {
    if (typingTimerRef.current[convId]) {
      clearTimeout(typingTimerRef.current[convId]);
    }
    socketRef.current?.emit('typing_stop', { conversationId: convId });
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
    socketRef.current?.emit('pin_message', { messageId, conversationId: convId });
  }, []);

  const unpinMessage = useCallback((messageId, convId) => {
    socketRef.current?.emit('unpin_message', { messageId, conversationId: convId });
  }, []);

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

  // ── SOCKET SETUP (reactive on socketToken change) ─────────────────────────────────────────────
  useEffect(() => {
    if (!socketToken) {
      setIsConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: (cb) => {
        cb({
          token: socketToken,
          lastSyncTime: localStorage.getItem('chat_last_sync_' + currentUser?.id) || new Date().toISOString()
        });
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    // ── Connection lifecycle ───────────────────────────────────────────────
    socket.on('connect', () => {
      console.log('[Chat] Socket connected:', socket.id);
      setIsConnected(true);
      fetchConversations(); // refresh on reconnect
      if (currentUser?.id) {
        localStorage.setItem('chat_last_sync_' + currentUser.id, new Date().toISOString());
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected:', reason);
      setIsConnected(false);
      if (currentUser?.id) {
        localStorage.setItem('chat_last_sync_' + currentUser.id, new Date().toISOString());
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
        const response = await apiFetch('/auth/refresh', { method: 'POST' });
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
      const me = currentUser;
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

        // Update unread counts
        missedMessages.forEach(msg => {
          const convId = msg.conversationId;
          if (msg.senderId !== me?.id) {
            const isChatPage = window.location.pathname.startsWith('/chat');
            const isTabVisible = document.visibilityState === 'visible';
            const isMobile = window.innerWidth <= 480;
            const isLookingAtChat = !isMobile || !showMobileListRef.current;

            if (isChatPage && isTabVisible && isLookingAtChat && activeConvIdRef.current === convId) {
              socket.emit('mark_read', { conversationId: convId });
              apiFetch(`/chat/conversations/${convId}/read`, { method: 'PATCH' }).catch(err => {
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
            emoji: u.statusEmoji || null
          });
        });
        return next;
      });
    });

    socket.on('user_online', ({ userId, name, avatar, onlineAt, chatStatus, statusEmoji }) => {
      setOnlineUsers(prev => {
        const next = new Map(prev);
        next.set(userId, { name, avatar, onlineAt, chatStatus, statusEmoji });
        return next;
      });
      setPresenceMap(prev => {
        const next = new Map(prev);
        next.set(userId, {
          status: chatStatus || 'available',
          emoji: statusEmoji || null
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
        next.set(userId, { status: 'offline', emoji: null });
        return next;
      });
    });

    socket.on('user_status_changed', ({ employeeId, status, emoji, expiresAt }) => {
      setPresenceMap(prev => {
        const next = new Map(prev);
        next.set(employeeId, { status, emoji });
        return next;
      });
      if (employeeId === currentUser?.id) {
        setCurrentUserStatus({ status, emoji });
      }
    });

    // ── New Message ───────────────────────────────────────────────────────
    socket.on('new_message', async (message) => {
      const convId = message.conversationId;
      const me = currentUser;

      // Clear timeout and remove from localStorage if this is our own message
      if (message.tempId && message.senderId === me?.id) {
        if (sendingTimeoutsRef.current[message.tempId]) {
          clearTimeout(sendingTimeoutsRef.current[message.tempId]);
          delete sendingTimeoutsRef.current[message.tempId];
        }
        localStorage.removeItem(`chat_failed_msg_${me.id}_${message.tempId}`);
      }

      let fullMessage = message;
      const isChatPage = window.location.pathname.startsWith('/chat');
      const isTabVisible = document.visibilityState === 'visible';
      const isMobile = window.innerWidth <= 480;
      const isLookingAtChat = !isMobile || !showMobileListRef.current;
      const isCurrentActive = isChatPage && isLookingAtChat && activeConvIdRef.current === convId;

      if (message._isOptimized) {
        if (isCurrentActive) {
          // Hydrate full message details for the active conversation
          try {
            const data = await apiFetch(`/chat/messages/${message.id}`);
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
          // If not active, mapping preview to content is sufficient for offline history / caching
          fullMessage = {
            ...message,
            content: message.preview
          };
        }
      }

      // Append to messages state
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

        // Trigger desktop push notification if the current conversation is active but the tab/window is inactive/unfocused
        const isTabInactive = !isTabVisible || !document.hasFocus();
        const isMuted = mutedConversationsRef.current.has(convId);
        if (isCurrentActive && isTabInactive && !isMuted) {
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

          sendNotification(title, {
            body,
            icon: fullMessage.senderAvatar || '/favicon.ico',
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
          apiFetch(`/chat/conversations/${convId}/read`, { method: 'PATCH' }).catch(err => {
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
      setConversations(prev => prev.map(conv => {
        if (conv.id !== notification.conversationId) return conv;
        return {
          ...conv,
          lastMessage: {
            content: notification.preview,
            senderId: notification.senderId,
            senderName: notification.senderName,
            sentAt: notification.sentAt
          }
        };
      }));

      // In-app toast banner currently shows for any new_message_notification.
      // Suppress toast entirely on client if the conversation is muted.
      if (addToast && !mutedConversationsRef.current.has(notification.conversationId)) {
        addToast('info', `New message from ${notification.senderName}: "${notification.preview}"`);
      }

      // Desktop notification
      const isCurrentConv = activeConvIdRef.current === notification.conversationId;
      const isMuted = mutedConversationsRef.current.has(notification.conversationId);
      
      if (!isCurrentConv && !isMuted) {
        const title = notification.conversationType === 'group'
          ? notification.conversationName
          : notification.senderName;

        const body = notification.conversationType === 'group'
          ? `${notification.senderName}: ${notification.preview}`
          : notification.preview;

        sendNotification(title, {
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
    socket.on('user_typing', ({ userId, name, conversationId }) => {
      setTypingUsers(prev => {
        const convTyping = prev[conversationId] || [];
        if (convTyping.find(u => u.userId === userId)) return prev;
        return {
          ...prev,
          [conversationId]: [...convTyping, { userId, name }]
        };
      });
    });

    socket.on('user_stopped_typing', ({ userId, conversationId }) => {
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || [])
          .filter(u => u.userId !== userId)
      }));
    });

    // ── Read Receipts (blue tick) ─────────────────────────────────────────
    socket.on('messages_read', ({ conversationId, readBy, readAt, readByName }) => {
      const me = currentUser;
      let readByArray = [];
      if (Array.isArray(readBy)) {
        readByArray = readBy;
      } else if (typeof readBy === 'string') {
        readByArray = [{ employeeId: readBy, name: readByName || 'Someone', readAt: readAt || new Date().toISOString() }];
      }

      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMsgs.map(msg => {
            if (msg.senderId === me?.id) {
              const existing = msg.readBy || [];
              const merged = [...existing];
              readByArray.forEach(r => {
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
        localStorage.removeItem(`chat_failed_msg_${currentUser?.id}_${tempId}`);
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
            localStorage.setItem(`chat_failed_msg_${currentUser?.id}_${tempId}`, JSON.stringify(failedMsg));
            
            return { ...prev, [activeConvIdRef.current]: updated };
          }
          return prev;
        });
      }
    };

    socket.on('message_error', handleSendError);
    socket.on('message_upload_error', handleSendError);

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
      if (employeeId === currentUser?.id) {
        setConversations(prev => {
          const conv = prev.find(c => c.id === conversationId);
          if (conv && conv.type === 'group' && addToast) {
            addToast('info', `You were removed from ${conv.name || 'group'}`);
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
        if (conv && conv.type === 'group' && addToast) {
          addToast('info', `You were removed from ${conv.name || 'group'}`);
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
    socket.on('message_pinned', ({ messageId, conversationId, pinnedBy, pinnedAt }) => {
      setMessages(prev => {
        const convMsgs = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: convMsgs.map(msg => 
            msg.id === messageId 
              ? { ...msg, isPinned: true, pinnedBy, pinnedAt } 
              : msg
          )
        };
      });
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

    // Initial load
    fetchConversations();

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [socketToken, fetchConversations, currentUser]);

  // ── AUTO-MARK READ ON VISIBILITY / FOCUS CHANGE ───────────────────────────
  useEffect(() => {
    const handleVisibilityChange = (e) => {
      const isChatPage = window.location.pathname.startsWith('/chat');
      const isTabVisible = document.visibilityState === 'visible';
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
        socketRef.current?.emit('mark_read', { conversationId: convId });
        apiFetch(`/chat/conversations/${convId}/read`, { method: 'PATCH' }).catch(err => {
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
  }, [apiFetch]);


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
    showMobileList,
    setShowMobileList,
    currentUserStatus,
    presenceMap,

    // Loading states
    isLoadingConvs,
    isLoadingMsgs,
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
    editMessage,
    addReaction,
    loadMoreMessages,
    searchEmployees,
    handleTypingStart,
    handleTypingStop,
    setUserStatus,
    pinConversation,
    unpinConversation,
    pinMessage,
    unpinMessage,
    starMessage,
    unstarMessage,

    // Helpers
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
    requestPermission,
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
