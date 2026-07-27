/**
 * @file RealtimeManager.ts
 * @description Master Facade for Real-Time Communications.
 *              Coordinates Socket.IO lifecycle, presence updates, typing indicators,
 *              read receipts, unread badge sync, React Query cache mutation,
 *              and offline queue flushing.
 */

import { QueryClient } from '@tanstack/react-query';
import socketManager from '../../../shared/services/socketManager';
import { useRealtimeStore } from '../stores/useRealtimeStore';
import RealtimeQueue from './RealtimeQueue';
import NotificationManager from './NotificationManager';
import { ChatMessage } from '../types';

export class RealtimeManagerClass {
  private queryClient: QueryClient | null = null;
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize RealtimeManager with QueryClient instance
   */
  initialize(queryClient: QueryClient): () => void {
    this.queryClient = queryClient;
    const socket = socketManager.getSocket();

    if (!socket) return () => {};

    // 1. Connection Event Listeners
    const handleConnect = () => {
      useRealtimeStore.getState().setIsConnected(true);
      RealtimeQueue.flushQueue();
    };

    const handleDisconnect = () => {
      useRealtimeStore.getState().setIsConnected(false);
    };

    // 2. Presence Updates
    const handlePresenceUpdate = (data: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      useRealtimeStore.getState().setUserPresence(data);
    };

    // 3. Typing Indicators
    const handleTypingStart = (data: { conversationId: string; userId: string; userName: string; isRecording?: boolean }) => {
      const key = `${data.conversationId}_${data.userId}`;
      useRealtimeStore.getState().setTypingIndicator({
        conversationId: data.conversationId,
        userId: data.userId,
        userName: data.userName,
        isRecording: !!data.isRecording,
      });

      // Auto-clear typing indicator after 3 seconds of inactivity
      if (this.typingTimers.has(key)) {
        clearTimeout(this.typingTimers.get(key));
      }
      const timer = setTimeout(() => {
        useRealtimeStore.getState().removeTypingIndicator(data.conversationId, data.userId);
        this.typingTimers.delete(key);
      }, 3000);
      this.typingTimers.set(key, timer);
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      const key = `${data.conversationId}_${data.userId}`;
      if (this.typingTimers.has(key)) {
        clearTimeout(this.typingTimers.get(key));
        this.typingTimers.delete(key);
      }
      useRealtimeStore.getState().removeTypingIndicator(data.conversationId, data.userId);
    };

    // 4. Message Delivery & Read Receipts
    const handleMessageRead = (data: { conversationId: string; messageId: string; readBy: string; readAt: string }) => {
      if (this.queryClient) {
        this.queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', data.conversationId], (old) => {
          if (!old) return [];
          return old.map((m) =>
            m.id === data.messageId ? { ...m, status: 'read', isRead: true } : m
          );
        });
      }
    };

    // 5. Incoming Realtime Message
    const handleNewMessage = (msg: ChatMessage) => {
      if (this.queryClient && msg.conversationId) {
        this.queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', msg.conversationId], (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) return old;
          return [...old, msg];
        });
      }

      NotificationManager.showInAppBanner(
        NotificationManager.createMessageNotification(
          msg.senderName || 'New Message',
          msg.content,
          msg.conversationId
        )
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:read', handleMessageRead);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:read', handleMessageRead);
      socket.off('new_message', handleNewMessage);
    };
  }

  /**
   * Emit Typing Start signal
   */
  sendTypingStart(conversationId: string, userName: string, isRecording: boolean = false) {
    const socket = socketManager.getSocket();
    if (socket && socket.connected) {
      socket.emit('typing:start', { conversationId, userName, isRecording });
    }
  }

  /**
   * Emit Typing Stop signal
   */
  sendTypingStop(conversationId: string) {
    const socket = socketManager.getSocket();
    if (socket && socket.connected) {
      socket.emit('typing:stop', { conversationId });
    }
  }
}

export const RealtimeManager = new RealtimeManagerClass();
export default RealtimeManager;
