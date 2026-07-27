/**
 * @file MessageActionManager.ts
 * @description Centralized execution engine for chat message interactions.
 *              Evaluates permissions (RBAC, ownership, edit/delete windows),
 *              routes clipboard/share/download OS bridges, emits socket events,
 *              and manages React Query cache mutations.
 */

import { Clipboard } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { QueryClient } from '@tanstack/react-query';
import { ChatMessage } from '../types';
import { toast } from '../../../shared/components/Toast';
import socketManager from '../../../shared/services/socketManager';

export const EDIT_WINDOW_MINUTES = 15;
export const DELETE_EVERYONE_WINDOW_HOURS = 24;

export class MessageActionManagerClass {
  /**
   * Evaluates whether current user can edit the message (Sender only, Text type only, within 15 min window)
   */
  canEdit(message: ChatMessage | null, currentUserId: string): boolean {
    if (!message || message.isDeleted) return false;
    if (message.senderId !== currentUserId) return false;
    if (message.type !== 'text') return false;

    if (message.createdAt) {
      const elapsedMinutes = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60);
      return elapsedMinutes <= EDIT_WINDOW_MINUTES;
    }
    return true;
  }

  /**
   * Evaluates whether user can Delete for Everyone (Sender or Admin/Manager, within 24 hr window)
   */
  canDeleteForEveryone(message: ChatMessage | null, currentUserId: string, userRole?: string): boolean {
    if (!message || message.isDeleted) return false;
    const isSender = message.senderId === currentUserId;
    const isAdminOrManager = userRole === 'Super Admin' || userRole === 'Company Admin' || userRole === 'Manager';

    if (!isSender && !isAdminOrManager) return false;

    if (message.createdAt) {
      const elapsedHours = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60 * 60);
      return elapsedHours <= DELETE_EVERYONE_WINDOW_HOURS;
    }
    return true;
  }

  /**
   * Copy message content or media URL to system clipboard
   */
  async copyContent(message: ChatMessage): Promise<void> {
    const textToCopy = message.content || message.media?.url || message.media?.fileName || '';
    if (textToCopy) {
      Clipboard.setString(textToCopy);
      toast.success('Copied to clipboard');
    } else {
      toast.error('Nothing to copy');
    }
  }

  /**
   * Trigger native OS Share Sheet (iOS / Android) for media attachments
   */
  async shareMedia(message: ChatMessage): Promise<void> {
    try {
      const mediaUrl = message.media?.url || (message.type === 'image' || message.type === 'video' ? message.content : null);
      if (!mediaUrl) {
        if (message.content) {
          Clipboard.setString(message.content);
          toast.success('Message copied for sharing');
        }
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        toast.info('Sharing is not available on this device');
        return;
      }

      // Download file locally first if remote URL
      if (mediaUrl.startsWith('http')) {
        const ext = message.media?.fileName?.split('.').pop() || (message.type === 'image' ? 'jpg' : 'mp4');
        const localPath = `${FileSystem.cacheDirectory}share_${Date.now()}.${ext}`;
        const downloadResult = await FileSystem.downloadAsync(mediaUrl, localPath);
        if (downloadResult.status === 200) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          toast.error('Failed to download media for sharing');
        }
      } else {
        await Sharing.shareAsync(mediaUrl);
      }
    } catch (err: any) {
      toast.error('Sharing failed: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Toggle Reaction on a message (Add / Remove) with Socket emission & Cache mutation
   */
  async toggleReaction(
    message: ChatMessage,
    emoji: string,
    conversationId: string,
    currentUserId: string,
    queryClient: QueryClient
  ): Promise<void> {
    try {
      const existingReactions = message.reactions || [];
      const userReaction = existingReactions.find((r) => r.employeeId === currentUserId && r.reaction === emoji);

      let updatedReactions = [...existingReactions];
      if (userReaction) {
        // Remove reaction
        updatedReactions = updatedReactions.filter((r) => !(r.employeeId === currentUserId && r.reaction === emoji));
      } else {
        // Add new reaction (replace previous emoji by same user if desired)
        updatedReactions = updatedReactions.filter((r) => r.employeeId !== currentUserId);
        updatedReactions.push({ reaction: emoji, employeeId: currentUserId, name: '' });
      }

      // 1. Optimistic Query Cache update
      queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', conversationId], (old) => {
        if (!old) return [];
        return old.map((m) => (m.id === message.id ? { ...m, reactions: updatedReactions } : m));
      });

      // 2. Emit Socket Event to room
      const socket = socketManager.getSocket();
      if (socket && socket.connected) {
        if (userReaction) {
          socket.emit('remove_reaction', {
            messageId: message.id,
            conversationId,
            emoji,
          });
        } else {
          socket.emit('add_reaction', {
            messageId: message.id,
            conversationId,
            emoji,
          });
        }
      }
    } catch (err) {
      console.warn('[MessageActionManager] Error toggling reaction:', err);
    }
  }

  /**
   * Soft Delete for Everyone (Replaces content with "This message was deleted.")
   */
  async deleteForEveryone(
    message: ChatMessage,
    conversationId: string,
    queryClient: QueryClient
  ): Promise<void> {
    try {
      // 1. Optimistic Cache Update
      queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', conversationId], (old) => {
        if (!old) return [];
        return old.map((m) =>
          m.id === message.id
            ? { ...m, isDeleted: true, content: 'This message was deleted.', media: undefined }
            : m
        );
      });

      // 2. Socket emission
      const socket = socketManager.getSocket();
      if (socket && socket.connected) {
        socket.emit('delete_message', {
          messageId: message.id,
          conversationId,
          deleteForEveryone: true,
        });
      }

      toast.success('Message deleted for everyone');
    } catch (err: any) {
      toast.error('Failed to delete message: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Delete for Me (Removes message locally from current user's cache)
   */
  async deleteForMe(
    message: ChatMessage,
    conversationId: string,
    queryClient: QueryClient
  ): Promise<void> {
    try {
      queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', conversationId], (old) => {
        if (!old) return [];
        return old.filter((m) => m.id !== message.id);
      });
      toast.success('Message deleted for you');
    } catch (err) {
      toast.error('Failed to delete message locally');
    }
  }

  /**
   * Toggle Pin Status
   */
  async togglePin(
    message: ChatMessage,
    conversationId: string,
    queryClient: QueryClient
  ): Promise<void> {
    try {
      const nextPinned = !message.isPinned;
      queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', conversationId], (old) => {
        if (!old) return [];
        return old.map((m) => (m.id === message.id ? { ...m, isPinned: nextPinned } : m));
      });

      const socket = socketManager.getSocket();
      if (socket && socket.connected) {
        socket.emit(nextPinned ? 'pin_message' : 'unpin_message', {
          messageId: message.id,
          conversationId,
        });
      }

      toast.success(nextPinned ? 'Message pinned' : 'Message unpinned');
    } catch (err) {
      toast.error('Failed to update pin status');
    }
  }

  /**
   * Toggle Starred Status (Bookmark message locally)
   */
  async toggleStar(
    message: ChatMessage,
    conversationId: string,
    currentUserId: string,
    queryClient: QueryClient
  ): Promise<void> {
    try {
      const isStarred = message.starredBy?.includes(currentUserId) || false;
      const nextStarred = !isStarred;
      queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', conversationId], (old) => {
        if (!old) return [];
        return old.map((m) => {
          if (m.id === message.id) {
            const starredList = Array.isArray(m.starredBy) ? m.starredBy : [];
            const nextStarredList = nextStarred
              ? [...starredList, currentUserId]
              : starredList.filter((uid) => uid !== currentUserId);
            return { ...m, starredBy: nextStarredList };
          }
          return m;
        });
      });

      const socket = socketManager.getSocket();
      if (socket && socket.connected) {
        socket.emit(nextStarred ? 'star_message' : 'unstar_message', {
          messageId: message.id,
          conversationId,
        });
      }

      toast.success(nextStarred ? 'Message starred' : 'Message unstarred');
    } catch (err) {
      toast.error('Failed to update star status');
    }
  }
}

export const MessageActionManager = new MessageActionManagerClass();
export default MessageActionManager;
