/**
 * @file useChatSocket.ts
 * @description Centralized global hook for managing all Socket.io chat event listeners
 *              and updating the React Query cache and Zustand presence store in real time.
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import ENV from '../../../config/env';
import usePresenceStore from '../../../shared/store/presenceStore';
import secureStore from '../../../shared/services/secureStore';
import useAuthStore from '../../../shared/store/authStore';
import apiClient from '../../../shared/services/apiClient';
import { ChatMessage, ChatConversation } from '../types';
import { useThemeStore } from '../../../shared/store/themeStore';

export const useChatSocket = (socket: Socket | null) => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id || null;

  // Use refs to avoid stale closures in socket event handlers
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const activeConvId = usePresenceStore((s) => s.activeConversationId);
  const activeConvIdRef = useRef(activeConvId);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  const presenceStore = usePresenceStore();
  const presenceStoreRef = useRef(presenceStore);
  useEffect(() => {
    presenceStoreRef.current = presenceStore;
  }, [presenceStore]);

  useEffect(() => {
    if (!socket) return;

    // Helper to persist sync timestamp
    const updateSyncTimestamp = async () => {
      try {
        const now = new Date().toISOString();
        await secureStore.setItem('last_sync_time', now);
        if (currentUserIdRef.current) {
          await secureStore.setItem('chat_last_sync_' + currentUserIdRef.current, now);
        }
      } catch (err) {
        console.error('[ChatSocket] Failed to save sync timestamp:', err);
      }
    };

    // Helper to mark incoming message as delivered
    const markAsDelivered = (messageId: string, conversationId: string) => {
      if (socket.connected) {
        socket.emit('message:delivered', { messageId, conversationId });
      }
    };

    // Helper to update unread count & preview in conversation list
    const updateConversationPreview = (msg: ChatMessage, incrementUnread: boolean) => {
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        if (!Array.isArray(oldConvs)) return oldConvs;

        let conversationFound = false;

        const updated = oldConvs.map((conv: ChatConversation) => {
          if (conv.id === msg.conversationId) {
            conversationFound = true;
            return {
              ...conv,
              lastMessage: {
                messageId: msg.id,
                content: msg.content || (msg.media ? `📎 Attachment` : ''),
                type: msg.type,
                senderId: msg.senderId,
                senderName: msg.senderName,
                sentAt: msg.createdAt,
                isDeleted: msg.isDeleted,
              },
              lastActivityAt: msg.createdAt,
              unreadCount: incrementUnread ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
            };
          }
          return conv;
        });

        // Reorder conversations: move active one to the top
        const reordered = updated.sort((a: ChatConversation, b: ChatConversation) => {
          const pinA = (a.pinned || a.pinnedBy?.some((p) => p.employeeId === currentUserIdRef.current)) ? 1 : 0;
          const pinB = (b.pinned || b.pinnedBy?.some((p) => p.employeeId === currentUserIdRef.current)) ? 1 : 0;

          if (pinA !== pinB) return pinB - pinA;
          return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
        });

        if (!conversationFound) {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
          }, 100);
        }

        return reordered;
      });
    };

    // Helper to append/update message in room cache
    const updateMessagesCache = (msg: ChatMessage) => {
      queryClient.setQueryData(['chat', 'messages', msg.conversationId], (oldData: any) => {
        const list = Array.isArray(oldData) ? oldData : [];
        
        // Remove any message with the same ID first to prevent duplicate entries
        const filteredList = list.filter((m: any) => m.id !== msg.id);
        
        let newList = [];
        // Handle optimistic replacement by tempId or id
        if (filteredList.some((m: any) => msg.tempId && m.tempId === msg.tempId)) {
          newList = filteredList.map((m: any) => 
            (msg.tempId && m.tempId === msg.tempId)
              ? { ...m, ...msg, status: m.status === 'failed' ? 'failed' : msg.status || 'sent' }
              : m
          );
        } else {
          newList = [...filteredList, { ...msg, status: msg.status || 'sent' }];
        }

        // Sort strictly by server-generated timestamp
        return newList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
    };

    // ── SOCKET.IO EVENT LISTENERS ──

    // Heartbeat & Latency monitor interval
    let heartbeatInterval: any = null;
    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          const startTime = Date.now();
          socket.emit('heartbeat', { clientTime: startTime }, (ack: any) => {
            const rtt = Date.now() - startTime;
            let state: 'excellent' | 'poor' | 'connected' = 'excellent';
            if (rtt > 300) state = 'poor';
            usePresenceStore.getState().setConnectionInfo({
              ping: rtt,
              connectionState: state,
            });
          });
        }
      }, 15000);
    };

    // Reconnection and automatic retry resend
    const handleConnect = () => {
      console.log('[ChatSocket] Connected to backend websocket.');
      usePresenceStore.getState().setConnectionInfo({ connectionState: 'connected' });
      socket.emit('get_online_users');
      startHeartbeat();
      
      // Auto-resend failed messages from cache
      if (activeConvIdRef.current) {
        const oldMessages: any = queryClient.getQueryData(['chat', 'messages', activeConvIdRef.current]);
        const failed = oldMessages?.filter((m: any) => m.status === 'failed') || [];
        if (failed.length > 0) {
          console.log(`[ChatSocket] Auto-retrying ${failed.length} failed messages...`);
          failed.forEach((msg: any) => {
            const payload = {
              conversationId: msg.conversationId,
              content: msg.content,
              type: msg.type,
              tempId: msg.id,
              media: msg.media,
              replyTo: msg.replyTo,
            };
            
            // Mark as retrying
            queryClient.setQueryData(['chat', 'messages', msg.conversationId], (oldData: any) => {
              if (!Array.isArray(oldData)) return [];
              return oldData.map((m: any) => m.id === msg.id ? { ...m, status: 'retrying' } : m);
            });

            socket.emit('send_message', payload, (ack: any) => {
              if (ack && ack.success) {
                console.log('[ChatSocket] Auto-retry acknowledged by server:', ack.messageId);
                queryClient.setQueryData(['chat', 'messages', msg.conversationId], (oldData: any) => {
                  if (!Array.isArray(oldData)) return [];
                  return oldData.map((m: any) => m.id === msg.id ? { ...m, id: ack.messageId, status: 'sent' } : m);
                });
              } else {
                console.log('[ChatSocket] Auto-retry failed:', ack?.reason);
                queryClient.setQueryData(['chat', 'messages', msg.conversationId], (oldData: any) => {
                  if (!Array.isArray(oldData)) return [];
                  return oldData.map((m: any) => m.id === msg.id ? { ...m, status: 'failed', failureReason: 'timeout' } : m);
                });
              }
            });
          });
        }
      }
    };

    const handleDisconnect = (reason: string) => {
      console.log('[ChatSocket] Disconnected from websocket:', reason);
      usePresenceStore.getState().setConnectionInfo({ connectionState: 'disconnected', ping: 0 });
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };

    const handleConnectError = (error: any) => {
      console.log('[ChatSocket] Connection error:', error);
      usePresenceStore.getState().setConnectionInfo({ connectionState: 'connecting' });
    };

    const handleReconnectAttempt = (attempt: number) => {
      console.log('[ChatSocket] Reconnect attempt #:', attempt);
      usePresenceStore.getState().setConnectionInfo({ connectionState: 'reconnecting' });
    };

    const handleUserViewingChat = ({ userId, conversationId, isViewing }: any) => {
      if (userId) {
        presenceStoreRef.current.setChatscreenStatus(userId, isViewing);
      }
    };

    const handleUserViewingProfile = ({ viewerId, viewerName, isViewing }: any) => {
      if (isViewing && viewerId !== currentUserIdRef.current) {
        // Safe check to prevent spamming toasts
        console.log(`[ChatSocket] ${viewerName} is viewing your profile.`);
      }
    };

    // Missed offline events synchronization
    const handleMissedEvents = async ({ messages = [], readReceipts = [], presenceChanges = [] }: any) => {
      console.log(`[ChatSocket] Syncing ${messages.length} missed messages, ${readReceipts.length} read receipts, and ${presenceChanges.length} presence changes.`);
      
      // Process presence changes
      if (presenceChanges.length > 0) {
        const ids = new Set<string>(presenceStoreRef.current.onlineUserIds);
        presenceChanges.forEach((u: any) => {
          const id = u.userId || u.employeeId || u.id;
          if (id) {
            ids.add(id);
            const status = u.chatStatus || u.status || 'available';
            const emoji = u.statusEmoji || u.emoji || null;
            presenceStoreRef.current.setUserStatus(id, status, emoji, u.lastSeen);
            presenceStoreRef.current.setChatscreenStatus(id, u.isOnChatScreen || false);
          }
        });
        presenceStoreRef.current.setOnlineUsers(ids);
      }

      // Process missed messages
      for (const msg of messages) {
        const formattedMsg = {
          ...msg,
          content: msg.content || msg.preview || '',
        };

        if (formattedMsg.senderId !== currentUserIdRef.current) {
          markAsDelivered(formattedMsg.id, formattedMsg.conversationId);
          if (activeConvIdRef.current === formattedMsg.conversationId) {
            socket.emit('mark_read', { conversationId: formattedMsg.conversationId });
          }
        }

        updateMessagesCache(formattedMsg);
        const shouldIncrementUnread = formattedMsg.senderId !== currentUserIdRef.current && activeConvIdRef.current !== formattedMsg.conversationId;
        updateConversationPreview(formattedMsg, shouldIncrementUnread);
      }

      // Process missed read receipts
      for (const receipt of readReceipts) {
        const { messageId, conversationId, readBy } = receipt;
        queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
          if (!Array.isArray(oldData)) return [];
          return oldData.map((m: any) => {
            if (m.id === messageId) {
              const nextReadBy = [...(m.readBy || [])];
              readBy.forEach((r: any) => {
                if (!nextReadBy.some(existing => existing.employeeId === r.employeeId)) {
                  nextReadBy.push(r);
                }
              });
              return { ...m, readBy: nextReadBy };
            }
            return m;
          });
        });
      }

      await updateSyncTimestamp();
    };

    // New Incoming Message
    const handleNewMessage = async (msg: any) => {
      console.log('[ChatSocket] New message received:', msg.id);

      const isCurrentActive = activeConvIdRef.current === msg.conversationId;
      let fullMsg = msg;

      if (msg._isOptimized) {
        // Use the socket payload directly — the HTTP fetch caused a race condition:
        // the backend emits the socket BEFORE the DB write commits, so
        // GET /messages/:id returns 500 ("Message not found").
        // The optimized payload already contains all fields needed for display.
        const formattedOptMsg: ChatMessage = {
          ...msg,
          content: msg.content || msg.preview || '',
          status: msg.senderId === currentUserIdRef.current ? 'sent' : 'delivered',
        };

        if (!isCurrentActive) {
          // Non-active conversation: just update the preview/unread badge
          if (formattedOptMsg.senderId !== currentUserIdRef.current) {
            markAsDelivered(formattedOptMsg.id, formattedOptMsg.conversationId);
          }
          updateConversationPreview(formattedOptMsg, formattedOptMsg.senderId !== currentUserIdRef.current);

          if (formattedOptMsg.senderId !== currentUserIdRef.current && AppState.currentState !== 'active') {
            try {
              const companyName = useThemeStore.getState().tenantBranding?.companyName || 'Gatecode Technologies';
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: formattedOptMsg.senderName || 'New Message',
                  subtitle: companyName,
                  body: formattedOptMsg.content || (formattedOptMsg.media ? '📎 Attachment' : ''),
                  data: { conversationId: formattedOptMsg.conversationId },
                  categoryIdentifier: 'chatReply',
                },
                trigger: null,
              });
            } catch (error) {
              console.error('[ChatSocket] Failed to schedule local notification:', error);
            }
          }
          await updateSyncTimestamp();
          return;
        }

        // Active chat: add to cache and let React Query refetch for full data
        fullMsg = formattedOptMsg;
      }

      const formattedMsg: ChatMessage = {
        ...fullMsg,
        content: fullMsg.content || fullMsg.preview || '',
        status: fullMsg.senderId === currentUserIdRef.current ? 'sent' : 'delivered',
      };

      // Mark delivered if from someone else
      if (formattedMsg.senderId !== currentUserIdRef.current) {
        markAsDelivered(formattedMsg.id, formattedMsg.conversationId);
        
        // If actively viewing this chat, read immediately
        if (isCurrentActive) {
          socket.emit('mark_read', { conversationId: formattedMsg.conversationId });
        }
      }

      updateMessagesCache(formattedMsg);
      
      // Increment unread count in sidebar if not actively viewing
      const shouldIncrementUnread = formattedMsg.senderId !== currentUserIdRef.current && !isCurrentActive;
      updateConversationPreview(formattedMsg, shouldIncrementUnread);

      // Local notifications for background/non-active chat
      if (formattedMsg.senderId !== currentUserIdRef.current) {
        const isBackgrounded = AppState.currentState !== 'active';
        const isNotActiveChat = !isCurrentActive;
        
        if (isBackgrounded || isNotActiveChat) {
          try {
            const companyName = useThemeStore.getState().tenantBranding?.companyName || 'Gatecode Technologies';
            await Notifications.scheduleNotificationAsync({
              content: {
                title: formattedMsg.senderName || 'New Message',
                subtitle: companyName,
                body: formattedMsg.content || (formattedMsg.media ? '📎 Attachment' : ''),
                data: { conversationId: formattedMsg.conversationId },
                categoryIdentifier: 'chatReply',
              },
              trigger: null,
            });
          } catch (error) {
            console.error('[ChatSocket] Failed to schedule local notification:', error);
          }
        }
      }

      await updateSyncTimestamp();
    };

    const handleNewMessageNotification = async (notification: any) => {
      console.log('[ChatSocket] New message notification received:', notification.messageId);
      const isBackgrounded = AppState.currentState !== 'active';
      const isNotActiveChat = activeConvIdRef.current !== notification.conversationId;

      if (isBackgrounded || isNotActiveChat) {
        try {
          const companyName = useThemeStore.getState().tenantBranding?.companyName || 'Gatecode Technologies';
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.senderName || 'New Message',
              subtitle: companyName,
              body: notification.preview || '',
              data: { conversationId: notification.conversationId },
              categoryIdentifier: 'chatReply',
            },
            trigger: null,
          });
        } catch (error) {
          console.error('[ChatSocket] Failed to schedule local notification for alert:', error);
        }
      }
    };

    // Server acknowledgement back to sender (message sent successfully)
    const handleMessageDelivered = async ({ messageId, conversationId, tempId }: any) => {
      console.log('[ChatSocket] Message acknowledged by server:', messageId);
      
      // Update cache: replace tempId with DB messageId and update status to sent (single tick)
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
        if (!Array.isArray(oldData)) return [];
        return oldData.map((m: any) => 
          (m.id === tempId || m.tempId === tempId)
            ? { ...m, id: messageId, status: 'sent' }
            : m
        );
      });

      // Update conversation preview messageId
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        if (!Array.isArray(oldConvs)) return [];
        return oldConvs.map((c: ChatConversation) => {
          if (c.id === conversationId && c.lastMessage?.messageId === tempId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                messageId,
              },
            };
          }
          return c;
        });
      });

      await updateSyncTimestamp();
    };

    // Receiver device delivered receipt (gray double tick)
    const handleDeliveryUpdate = async ({ messageId, conversationId, userId, deliveredAt }: any) => {
      console.log('[ChatSocket] Message delivered update receipt:', messageId);

      const updateFn = (prev: ChatMessage[]) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((m) => {
          if (m.id === messageId) {
            const alreadyDelivered = m.deliveredTo?.some((d) => d.employeeId === userId);
            if (!alreadyDelivered) {
              return {
                ...m,
                status: 'delivered' as const,
                deliveredTo: [...(m.deliveredTo || []), { employeeId: userId, deliveredAt }],
              };
            }
            return { ...m, status: 'delivered' as const };
          }
          return m;
        });
      };

      queryClient.setQueryData(['chat', 'messages', conversationId], updateFn);
      await updateSyncTimestamp();
    };

    // Receiver read receipt (blue double tick)
    const handleReadUpdate = async ({ conversationId, userId, lastReadMessageId, readAt }: any) => {
      console.log('[ChatSocket] Conversation read update:', conversationId);

      const isMe = userId === currentUserIdRef.current;

      // 1. Update message ticks
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldMsgs: any) => {
        if (!Array.isArray(oldMsgs)) return [];
        return oldMsgs.map((m: ChatMessage) => {
          // If we are the sender, mark it as read (blue tick)
          if (!isMe && m.senderId === currentUserIdRef.current) {
            const alreadyRead = m.readBy?.some((r) => r.employeeId === userId);
            if (!alreadyRead) {
              return {
                ...m,
                status: 'read' as const,
                readBy: [...(m.readBy || []), { employeeId: userId, name: '', readAt: readAt.toString() }],
              };
            }
            return { ...m, status: 'read' as const };
          }
          return m;
        });
      });

      // 2. Clear unread counts for us in conversation list
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        if (!Array.isArray(oldConvs)) return [];
        return oldConvs.map((c: ChatConversation) => {
          if (c.id === conversationId) {
            if (isMe) {
              return { ...c, unreadCount: 0 };
            } else {
              // Update participants lastReadAt
              return {
                ...c,
                participants: c.participants.map((p) => 
                  p.employeeId === userId ? { ...p, lastReadAt: readAt.toString(), lastReadMessageId } : p
                ),
              };
            }
          }
          return c;
        });
      });

      await updateSyncTimestamp();
    };

    const handleMessagesReadLegacy = async ({ conversationId, readBy }: any) => {
      const reader = readBy?.[0];
      if (!reader || reader.employeeId === currentUserIdRef.current) return;

      queryClient.setQueryData(['chat', 'messages', conversationId], (oldMsgs: any) => {
        if (!Array.isArray(oldMsgs)) return [];
        return oldMsgs.map((m: ChatMessage) => {
          if (m.senderId === currentUserIdRef.current) {
            const alreadyRead = m.readBy?.some((r) => r.employeeId === reader.employeeId);
            if (!alreadyRead) {
              return {
                ...m,
                status: 'read' as const,
                readBy: [...(m.readBy || []), { employeeId: reader.employeeId, name: reader.name, readAt: reader.readAt }],
              };
            }
            return { ...m, status: 'read' as const };
          }
          return m;
        });
      });
    };

    // Message Edited
    const handleMessageEdited = async ({ messageId, conversationId, newContent, editedAt }: any) => {
      console.log('[ChatSocket] Message edited:', messageId);

      const updateFn = (prev: ChatMessage[]) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              content: newContent,
              isEdited: true,
              editedAt,
            };
          }
          // Update reply previews referencing it
          if (m.replyTo?.messageId === messageId) {
            return {
              ...m,
              replyTo: {
                ...m.replyTo,
                content: newContent,
              },
            };
          }
          return m;
        });
      };

      queryClient.setQueryData(['chat', 'messages', conversationId], updateFn);

      // Update conversation preview text
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        if (!Array.isArray(oldConvs)) return [];
        return oldConvs.map((c: ChatConversation) => {
          if (c.id === conversationId && c.lastMessage?.messageId === messageId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                content: newContent,
              },
              lastActivityAt: editedAt,
            };
          }
          return c;
        });
      });

      await updateSyncTimestamp();
    };

    // Message Deleted
    const handleMessageDeleted = async ({ messageId, conversationId, deleteForEveryone }: any) => {
      console.log('[ChatSocket] Message deleted:', messageId);
      if (!deleteForEveryone) {
        queryClient.setQueryData(['chat', 'messages', conversationId], (prev: any) => {
          if (!Array.isArray(prev)) return [];
          return prev.filter((m: any) => m.id !== messageId);
        });
        return;
      }

      const updateFn = (prev: ChatMessage[]) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((m) => {
          if (m.id === messageId) {
            return {
              ...m,
              isDeleted: true,
              content: 'This message was deleted',
              media: null,
            };
          }
          // Update reply preview
          if (m.replyTo?.messageId === messageId) {
            return {
              ...m,
              replyTo: {
                ...m.replyTo,
                content: 'This message was deleted',
                isDeleted: true,
              } as any,
            };
          }
          return m;
        });
      };

      queryClient.setQueryData(['chat', 'messages', conversationId], updateFn);

      // Update last message preview in conversation list
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        if (!Array.isArray(oldConvs)) return [];
        return oldConvs.map((c: ChatConversation) => {
          if (c.id === conversationId && c.lastMessage?.messageId === messageId) {
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                content: 'This message was deleted',
                isDeleted: true,
              },
            };
          }
          return c;
        });
      });

      await updateSyncTimestamp();
    };

    // Emoji reaction added / updated
    const handleReactionUpdated = async ({ messageId, conversationId, employeeId, name, emoji }: any) => {
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
        if (!Array.isArray(oldData)) return [];
        return oldData.map((m: ChatMessage) => {
          if (m.id === messageId) {
            const nextReactions = (m.reactions || []).filter((r) => r.employeeId !== employeeId);
            nextReactions.push({ employeeId, name, reaction: emoji });
            return { ...m, reactions: nextReactions };
          }
          return m;
        });
      });
      await updateSyncTimestamp();
    };

    // Silent Token Refresh on expiration warning
    const handleTokenExpiring = async () => {
      console.log('[ChatSocket] Token expiring warning received.');
      try {
        const currentToken = useAuthStore.getState().token;
        if (!currentToken) return;

        const refreshResponse = await axios.post(
          `${ENV.API_URL}/api/v1/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        const newToken = refreshResponse.data?.data?.token;
        if (newToken) {
          console.log('[ChatSocket] Silent refresh succeeded. Updating store and emitting reauthenticate.');
          const user = useAuthStore.getState().user;
          const rememberMe = useAuthStore.getState().rememberMe;
          if (user) {
            await useAuthStore.getState().login(newToken, user, rememberMe);
          }
          socket.emit('reauthenticate', { token: newToken });
        } else {
          console.warn('[ChatSocket] Silent refresh response did not contain token');
        }
      } catch (err) {
        console.error('[ChatSocket] Silent refresh failed during token_expiring:', err);
      }
    };

    const handleReauthenticated = () => {
      console.log('[ChatSocket] Socket successfully re-authenticated.');
    };

    // Typing Indicators
    const handleUserTyping = ({ userId, name, conversationId, isRecording }: any) => {
      if (userId && userId !== currentUserIdRef.current) {
        presenceStoreRef.current.setTyping(conversationId, userId, name, isRecording);
      }
    };

    const handleUserStoppedTyping = ({ userId, conversationId }: any) => {
      if (userId && userId !== currentUserIdRef.current) {
        presenceStoreRef.current.stopTyping(conversationId, userId);
      }
    };

    // User online status presence
    const handleOnlineUsersList = (users: any[]) => {
      console.log('[ChatSocket] Received online users list:', users.map(u => ({ id: u.userId || u.employeeId || u.id, name: u.name })));
      const ids = new Set<string>();
      users.forEach((u) => {
        const id = u.userId || u.employeeId || u.id;
        if (id) {
          ids.add(id);
          const status = u.chatStatus || u.status || 'available';
          const emoji = u.statusEmoji || u.emoji || null;
          presenceStoreRef.current.setUserStatus(id, status, emoji, u.lastSeen);
          presenceStoreRef.current.setChatscreenStatus(id, u.isOnChatScreen || false);
        }
      });
      presenceStoreRef.current.setOnlineUsers(ids);
    };

    const handleUserOnline = (data: any) => {
      const { userId, chatStatus, statusEmoji, isOnChatScreen } = data;
      console.log('[ChatSocket] User online broadcast received:', data);
      if (userId) {
        presenceStoreRef.current.addUserOnline(userId);
        const status = chatStatus || data.status || 'available';
        const emoji = statusEmoji || data.emoji || null;
        presenceStoreRef.current.setUserStatus(userId, status, emoji, data.lastSeen);
        presenceStoreRef.current.setChatscreenStatus(userId, isOnChatScreen || false);
      }
    };

    const handleUserOffline = ({ userId, lastSeen }: any) => {
      console.log('[ChatSocket] User offline broadcast received for userId:', userId);
      if (userId) {
        presenceStoreRef.current.addUserOffline(userId);
        presenceStoreRef.current.setChatscreenStatus(userId, false);
        presenceStoreRef.current.setUserStatus(userId, 'offline', null, lastSeen);
      }
    };

    const handleChatscreenChanged = ({ employeeId, isOnChatScreen }: any) => {
      presenceStoreRef.current.setChatscreenStatus(employeeId, isOnChatScreen);
    };

    const handleUserStatusChanged = ({ employeeId, status, emoji }: any) => {
      console.log(`[ChatSocket] User status changed: ${employeeId} -> ${status} (${emoji})`);
      if (employeeId) {
        presenceStoreRef.current.setUserStatus(employeeId, status, emoji);
      }
    };

    const handleNewConversation = (conversation: any) => {
      console.log('[ChatSocket] New conversation received:', conversation.id);
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        const list = Array.isArray(oldConvs) ? oldConvs : [];
        if (list.some((c: any) => c.id === conversation.id)) {
          return list;
        }
        return [conversation, ...list];
      });
    };

    const handleGroupUpdated = (conversation: any) => {
      console.log('[ChatSocket] Group updated received:', conversation.id);
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        if (!Array.isArray(oldConvs)) return oldConvs;
        return oldConvs.map((c: any) => c.id === conversation.id ? { ...c, ...conversation } : c);
      });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    };

    const handleMemberAdded = ({ conversationId, participants }: any) => {
      console.log('[ChatSocket] Member added to conversation:', conversationId);
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        if (!Array.isArray(oldConvs)) return oldConvs;
        return oldConvs.map((c: any) => {
          if (c.id === conversationId) {
            return { ...c, participants };
          }
          return c;
        });
      });
    };

    const handleMemberRemovedOrLeft = ({ conversationId, employeeId, participants }: any) => {
      console.log(`[ChatSocket] Member left/removed: ${employeeId} from ${conversationId}`);
      if (employeeId === currentUserIdRef.current) {
        queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
          if (!Array.isArray(oldConvs)) return oldConvs;
          return oldConvs.filter((c: any) => c.id !== conversationId);
        });
      } else {
        queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
          if (!Array.isArray(oldConvs)) return oldConvs;
          return oldConvs.map((c: any) => {
            if (c.id === conversationId) {
              return { ...c, participants };
            }
            return c;
          });
        });
      }
    };

    const handleConversationRemoved = ({ conversationId }: any) => {
      console.log('[ChatSocket] Conversation removed:', conversationId);
      queryClient.setQueryData(['chat', 'conversations'], (oldConvs: any) => {
        if (!Array.isArray(oldConvs)) return oldConvs;
        return oldConvs.filter((c: any) => c.id !== conversationId);
      });
    };

    const handleMessagePinned = ({ messageId, conversationId }: any) => {
      console.log('[ChatSocket] Message pinned:', messageId);
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldMsgs: any) => {
        if (!Array.isArray(oldMsgs)) return oldMsgs;
        return oldMsgs.map((m: any) => m.id === messageId ? { ...m, isPinned: true } : m);
      });
      queryClient.invalidateQueries({ queryKey: ['chat', 'pinned', conversationId] });
    };

    const handleMessageUnpinned = ({ messageId, conversationId }: any) => {
      console.log('[ChatSocket] Message unpinned:', messageId);
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldMsgs: any) => {
        if (!Array.isArray(oldMsgs)) return oldMsgs;
        return oldMsgs.map((m: any) => m.id === messageId ? { ...m, isPinned: false } : m);
      });
      queryClient.invalidateQueries({ queryKey: ['chat', 'pinned', conversationId] });
    };

    const handleMessageStarred = ({ messageId, conversationId, starredBy }: any) => {
      console.log('[ChatSocket] Message starred:', messageId, 'by', starredBy);
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldMsgs: any) => {
        if (!Array.isArray(oldMsgs)) return oldMsgs;
        return oldMsgs.map((m: any) => {
          if (m.id === messageId) {
            const starredList = Array.isArray(m.starredBy) ? m.starredBy : [];
            if (!starredList.includes(starredBy)) {
              return { ...m, starredBy: [...starredList, starredBy] };
            }
          }
          return m;
        });
      });
    };

    const handleMessageUnstarred = ({ messageId, conversationId, unstarredBy }: any) => {
      console.log('[ChatSocket] Message unstarred:', messageId, 'by', unstarredBy);
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldMsgs: any) => {
        if (!Array.isArray(oldMsgs)) return oldMsgs;
        return oldMsgs.map((m: any) => {
          if (m.id === messageId) {
            const starredList = Array.isArray(m.starredBy) ? m.starredBy : [];
            return { ...m, starredBy: starredList.filter((uid: string) => uid !== unstarredBy) };
          }
          return m;
        });
      });
    };

    const handleUserBlockedOrUnblocked = ({ userId }: any) => {
      console.log('[ChatSocket] User block status updated:', userId);
      queryClient.invalidateQueries({ queryKey: ['chat', 'users', 'blocked'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'blocked'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    };

    const handlePollUpdated = (poll: any) => {
      console.log('[ChatSocket] Poll updated:', poll.id);
      queryClient.invalidateQueries({ queryKey: ['chat', 'polls'] });
      if (poll.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', poll.conversationId] });
      }
    };

    const handlePollDeleted = ({ pollId, conversationId }: any) => {
      console.log('[ChatSocket] Poll deleted:', pollId);
      queryClient.invalidateQueries({ queryKey: ['chat', 'polls'] });
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
      } else if (activeConvIdRef.current) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', activeConvIdRef.current] });
      }
    };

    const handleConversationSync = () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    };

    const handleThreadSync = () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] });
    };

    // Register listeners
    socket.on('connect', handleConnect);
    socket.on('missed_events', handleMissedEvents);
    socket.on('new_message', handleNewMessage);
    socket.on('new_message_notification', handleNewMessageNotification);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message:delivery_update', handleDeliveryUpdate);
    socket.on('conversation:read_update', handleReadUpdate);
    socket.on('messages_read', handleMessagesReadLegacy);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_added', handleReactionUpdated);
    socket.on('reaction:updated', handleReactionUpdated);
    
    // Token/Auth expiration signaling
    socket.on('token_expiring', handleTokenExpiring);
    socket.on('reauthenticated', handleReauthenticated);

    // Typing indicators
    socket.on('user:typing', handleUserTyping);
    socket.on('user:stopped_typing', handleUserStoppedTyping);
    
    // Presence Indicators
    socket.on('online_users_list', handleOnlineUsersList);
    socket.on('user_online', handleUserOnline);
    socket.on('user:online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('user:offline', handleUserOffline);
    socket.on('user_chatscreen_changed', handleChatscreenChanged);
    socket.on('user_status_changed', handleUserStatusChanged);

    // Conversation sync listeners
    socket.on('new_conversation', handleNewConversation);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('member_added', handleMemberAdded);
    socket.on('member_removed', handleMemberRemovedOrLeft);
    socket.on('member_left', handleMemberRemovedOrLeft);
    socket.on('conversation_removed', handleConversationRemoved);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('message_unpinned', handleMessageUnpinned);
    socket.on('message_starred', handleMessageStarred);
    socket.on('message_unstarred', handleMessageUnstarred);
    socket.on('user:blocked', handleUserBlockedOrUnblocked);
    socket.on('user:unblocked', handleUserBlockedOrUnblocked);
    socket.on('poll:created', handlePollUpdated);
    socket.on('poll:voted', handlePollUpdated);
    socket.on('poll:closed', handlePollUpdated);
    socket.on('poll:reopened', handlePollUpdated);
    socket.on('poll:updated', handlePollUpdated);
    socket.on('poll:deleted', handlePollDeleted);
    
    socket.on('conversation:deleted_for_me', handleConversationSync);
    socket.on('conversation:cleared', handleConversationSync);
    socket.on('conversation:hidden', handleConversationSync);
    socket.on('conversation:unhidden', handleConversationSync);
    socket.on('conversation:archived', handleConversationSync);
    socket.on('conversation:unarchived', handleConversationSync);
    socket.on('conversation_pinned', handleConversationSync);
    socket.on('conversation_unpinned', handleConversationSync);
    socket.on('thread:updated', handleThreadSync);

    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('user_viewing_chat', handleUserViewingChat);
    socket.on('user_viewing_profile', handleUserViewingProfile);

    // Initial fetch of online users
    if (socket.connected) {
      socket.emit('get_online_users');
      startHeartbeat();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('missed_events', handleMissedEvents);
      socket.off('new_message', handleNewMessage);
      socket.off('new_message_notification', handleNewMessageNotification);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('message:delivery_update', handleDeliveryUpdate);
      socket.off('conversation:read_update', handleReadUpdate);
      socket.off('messages_read', handleMessagesReadLegacy);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_added', handleReactionUpdated);
      socket.off('reaction:updated', handleReactionUpdated);
      
      socket.off('token_expiring', handleTokenExpiring);
      socket.off('reauthenticated', handleReauthenticated);

      socket.off('user:typing', handleUserTyping);
      socket.off('user:stopped_typing', handleUserStoppedTyping);
      
      socket.off('online_users_list', handleOnlineUsersList);
      socket.off('user_online', handleUserOnline);
      socket.off('user:online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('user:offline', handleUserOffline);
      socket.off('user_chatscreen_changed', handleChatscreenChanged);
      socket.off('user_status_changed', handleUserStatusChanged);

      socket.off('new_conversation', handleNewConversation);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('member_added', handleMemberAdded);
      socket.off('member_removed', handleMemberRemovedOrLeft);
      socket.off('member_left', handleMemberRemovedOrLeft);
      socket.off('conversation_removed', handleConversationRemoved);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('message_unpinned', handleMessageUnpinned);
      socket.off('message_starred', handleMessageStarred);
      socket.off('message_unstarred', handleMessageUnstarred);
      socket.off('user:blocked', handleUserBlockedOrUnblocked);
      socket.off('user:unblocked', handleUserBlockedOrUnblocked);
      socket.off('poll:created', handlePollUpdated);
      socket.off('poll:voted', handlePollUpdated);
      socket.off('poll:closed', handlePollUpdated);
      socket.off('poll:reopened', handlePollUpdated);
      socket.off('poll:updated', handlePollUpdated);
      socket.off('poll:deleted', handlePollDeleted);

      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('user_viewing_chat', handleUserViewingChat);
      socket.off('user_viewing_profile', handleUserViewingProfile);

      socket.off('conversation:deleted_for_me', handleConversationSync);
      socket.off('conversation:cleared', handleConversationSync);
      socket.off('conversation:hidden', handleConversationSync);
      socket.off('conversation:unhidden', handleConversationSync);
      socket.off('conversation:archived', handleConversationSync);
      socket.off('conversation:unarchived', handleConversationSync);
      socket.off('conversation_pinned', handleConversationSync);
      socket.off('conversation_unpinned', handleConversationSync);
      socket.off('thread:updated', handleThreadSync);

      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [socket, queryClient]);
};

export default useChatSocket;
