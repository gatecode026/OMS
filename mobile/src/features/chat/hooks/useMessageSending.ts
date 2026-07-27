import { useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../../../shared/services/socketManager';
import { toast } from '../../../shared/components/Toast';
import { ChatMessage } from '../types';
import { useEditMessage, useDeleteMessage } from './useChat';

interface MessageSendingOptions {
  conversationId: string;
  authUser: any;
  setLocalMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const useMessageSending = ({ conversationId, authUser, setLocalMessages }: MessageSendingOptions) => {
  const queryClient = useQueryClient();
  const { mutate: editMsg } = useEditMessage();
  const deleteMutation = useDeleteMessage();
  const sendingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const handleSend = (
    text: string,
    isEditingMode: boolean,
    selectedMessage: ChatMessage | null,
    replyTo: ChatMessage | null,
    onSuccess: () => void
  ) => {
    if (!text.trim()) return;

    if (isEditingMode && selectedMessage) {
      editMsg({ messageId: selectedMessage.id, content: text.trim() });
      onSuccess();
      toast.success('Message updated');
      return;
    }

    const socket = getSocket();
    const tempId = `temp_${Date.now()}`;
    const payload = {
      conversationId,
      content: text.trim(),
      type: 'text',
      tempId,
      replyTo: replyTo
        ? {
            messageId: replyTo.id,
            content: replyTo.content,
            senderId: replyTo.senderId,
            senderName: replyTo.senderName,
            type: replyTo.type,
          }
        : null,
    };

    const optimisticMsg: ChatMessage = {
      id: tempId,
      tempId,
      conversationId,
      senderId: authUser?.id || '',
      senderName: authUser?.name || 'Me',
      senderAvatar: authUser?.avatar || authUser?.avatarUrl || null,
      senderRole: authUser?.role || 'employee',
      content: text.trim(),
      type: 'text',
      contentType: 'plain',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isEdited: false,
      replyTo: replyTo
        ? {
            messageId: replyTo.id,
            content: replyTo.content,
            senderId: replyTo.senderId,
            senderName: replyTo.senderName,
            type: replyTo.type,
          }
        : null,
    };

    if (!socket?.connected) {
      const offlineMsg: ChatMessage = {
        ...optimisticMsg,
        status: 'pending' as const,
        failureReason: 'disconnected' as const,
      };
      setLocalMessages((prev) => [...prev, offlineMsg]);
      queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
        const list = Array.isArray(oldData) ? oldData : [];
        return [...list, offlineMsg];
      });
      import('../services/OfflineQueueManager').then(({ OfflineQueueManager }) => {
        OfflineQueueManager.enqueueAction('message', conversationId, payload).catch(() => {});
      });
      onSuccess();
      return;
    }

    setLocalMessages((prev) => [...prev, optimisticMsg]);
    queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
      const list = Array.isArray(oldData) ? oldData : [];
      return [...list, optimisticMsg];
    });

    const timer = setTimeout(() => {
      const markFailed = (prev: ChatMessage[]) => {
        if (!prev) return [];
        return prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, status: 'failed' as const, failureReason: 'timeout' as const } : m);
      };
      setLocalMessages(markFailed);
      queryClient.setQueryData(['chat', 'messages', conversationId], markFailed);
      delete sendingTimeoutsRef.current[tempId];
    }, 10000);
    sendingTimeoutsRef.current[tempId] = timer;

    socket.emit('send_message', payload, (ack: any) => {
      if (ack && ack.success) {
        if (sendingTimeoutsRef.current[tempId]) {
          clearTimeout(sendingTimeoutsRef.current[tempId]);
          delete sendingTimeoutsRef.current[tempId];
        }
        const markSent = (prev: ChatMessage[]) => {
          if (!prev) return [];
          return prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, id: ack.messageId, status: 'sent' as const } : m);
        };
        setLocalMessages(markSent);
        queryClient.setQueryData(['chat', 'messages', conversationId], markSent);
      } else {
        if (sendingTimeoutsRef.current[tempId]) {
          clearTimeout(sendingTimeoutsRef.current[tempId]);
          delete sendingTimeoutsRef.current[tempId];
        }
        const markFailed = (prev: ChatMessage[]) => {
          if (!prev) return [];
          return prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, status: 'failed' as const, failureReason: 'timeout' as const } : m);
        };
        setLocalMessages(markFailed);
        queryClient.setQueryData(['chat', 'messages', conversationId], markFailed);
      }
    });

    onSuccess();
  };

  const handleRetrySend = (msg: ChatMessage) => {
    const socket = getSocket();
    const tempId = msg.tempId || msg.id;
    const isTarget = (m: ChatMessage) => m.id === tempId || m.tempId === tempId || m.id === msg.id;

    if (!socket?.connected) {
      toast.error('No connection available. Auto-retry pending.');
      
      const markRetrying = (prev: ChatMessage[]) => {
        if (!prev) return [];
        return prev.map(m => isTarget(m) ? { ...m, status: 'retrying' as const, failureReason: 'disconnected' as const } : m);
      };
      setLocalMessages(markRetrying);
      queryClient.setQueryData(['chat', 'messages', conversationId], markRetrying);
      return;
    }

    const markRetrying = (prev: ChatMessage[]) => {
      if (!prev) return [];
      return prev.map(m => isTarget(m) ? { ...m, status: 'retrying' as const, failureReason: undefined } : m);
    };
    setLocalMessages(markRetrying);
    queryClient.setQueryData(['chat', 'messages', conversationId], markRetrying);

    const payload = {
      conversationId,
      content: msg.content,
      type: msg.type,
      tempId,
      replyTo: msg.replyTo,
      media: msg.media,
    };

    if (sendingTimeoutsRef.current[tempId]) {
      clearTimeout(sendingTimeoutsRef.current[tempId]);
    }

    const timer = setTimeout(() => {
      const markFailed = (prev: ChatMessage[]) => {
        if (!prev) return [];
        return prev.map(m => isTarget(m) ? { ...m, status: 'failed' as const, failureReason: 'timeout' as const } : m);
      };
      setLocalMessages(markFailed);
      queryClient.setQueryData(['chat', 'messages', conversationId], markFailed);
      delete sendingTimeoutsRef.current[tempId];
    }, 10000);
    sendingTimeoutsRef.current[tempId] = timer;

    socket.emit('send_message', payload, (ack: any) => {
      if (ack && ack.success) {
        if (sendingTimeoutsRef.current[tempId]) {
          clearTimeout(sendingTimeoutsRef.current[tempId]);
          delete sendingTimeoutsRef.current[tempId];
        }
        const markSent = (prev: ChatMessage[]) => {
          if (!prev) return [];
          return prev.map(m => isTarget(m) ? { ...m, id: ack.messageId, status: 'sent' as const } : m);
        };
        setLocalMessages(markSent);
        queryClient.setQueryData(['chat', 'messages', conversationId], markSent);
      } else {
        if (sendingTimeoutsRef.current[tempId]) {
          clearTimeout(sendingTimeoutsRef.current[tempId]);
          delete sendingTimeoutsRef.current[tempId];
        }
        const markFailed = (prev: ChatMessage[]) => {
          if (!prev) return [];
          return prev.map(m => isTarget(m) ? { ...m, status: 'failed' as const, failureReason: 'timeout' as const } : m);
        };
        setLocalMessages(markFailed);
        queryClient.setQueryData(['chat', 'messages', conversationId], markFailed);
      }
    });
  };

  const handleDeleteMessage = (msg: ChatMessage, deleteForEveryone: boolean = false) => {
    deleteMutation.mutate({ messageId: msg.id, deleteForEveryone });
    toast.success(deleteForEveryone ? 'Message deleted for everyone' : 'Message deleted for me');
  };

  const handlePinMessage = (msg: ChatMessage) => {
    const socket = getSocket();
    if (!socket?.connected) return;
    if (msg.isPinned) {
      socket.emit('unpin_message', { messageId: msg.id, conversationId });
    } else {
      socket.emit('pin_message', { messageId: msg.id, conversationId });
    }
  };

  const handleStarMessage = (msg: ChatMessage) => {
    const socket = getSocket();
    if (!socket?.connected) return;
    const isStarred = msg.starredBy?.includes(authUser?.id || '') || false;
    if (isStarred) {
      socket.emit('unstar_message', { messageId: msg.id, conversationId });
    } else {
      socket.emit('star_message', { messageId: msg.id, conversationId });
    }
  };

  useEffect(() => {
    return () => {
      Object.values(sendingTimeoutsRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
    handleSend,
    handleRetrySend,
    handleDeleteMessage,
    handlePinMessage,
    handleStarMessage,
    sendingTimeoutsRef,
  };
};

export default useMessageSending;
