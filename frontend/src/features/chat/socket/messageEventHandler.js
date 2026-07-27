/**
 * @file features/chat/socket/messageEventHandler.js
 * @description Message Event Handlers for Phase C (Message Engine).
 *   Applies O(1) cache mutations to the normalized message cache upon receiving socket events.
 */

import {
  confirmMessageDelivered,
  markMessageFailed,
  patchMessageById,
  removeMessageById,
  upsertMessages,
} from '../cache/messagesCache.js';

export const messageEventHandlers = {
  /** 1. message_sent / confirmation ACK */
  message_sent: (queryClient, payload) => {
    if (!payload) return;
    const { conversationId, tempId, message } = payload;
    if (conversationId && tempId && message) {
      confirmMessageDelivered(queryClient, conversationId, tempId, message);
    }
  },

  /** 2. message_received (new_message) */
  message_received: (queryClient, payload) => {
    if (!payload) return;
    const msg = payload.message || payload;
    const convId = msg.conversationId || payload.conversationId;
    if (!convId) return;

    if (msg.tempId) {
      confirmMessageDelivered(queryClient, convId, msg.tempId, msg);
    } else {
      upsertMessages(queryClient, convId, [msg]);
    }
  },

  /** 3. message_updated (message_edited) */
  message_updated: (queryClient, payload) => {
    if (!payload) return;
    const { messageId, conversationId, content, isEdited, editedAt } = payload;
    if (conversationId && messageId) {
      patchMessageById(queryClient, conversationId, messageId, {
        content,
        isEdited: isEdited ?? true,
        editedAt: editedAt || new Date().toISOString(),
      });
    }
  },

  /** 4. message_deleted / message_recalled */
  message_deleted: (queryClient, payload) => {
    if (!payload) return;
    const messageId = typeof payload === 'string' ? payload : payload.messageId;
    const conversationId = payload.conversationId;
    if (conversationId && messageId) {
      removeMessageById(queryClient, conversationId, messageId);
    }
  },

  /** 5. message_reaction */
  message_reaction: (queryClient, payload) => {
    if (!payload) return;
    const { messageId, conversationId, employeeId, name, emoji, reactedAt } = payload;
    if (conversationId && messageId) {
      queryClient.setQueryData(['chat', 'messages', 'conversation', conversationId], (prev) => {
        if (!prev || !prev.entities[messageId]) return prev;
        const msg = prev.entities[messageId];
        const reactions = (msg.reactions || []).filter((r) => r.employeeId !== employeeId);
        if (emoji) {
          reactions.push({ employeeId, name, emoji, reactedAt: reactedAt || new Date().toISOString() });
        }
        return {
          ...prev,
          entities: {
            ...prev.entities,
            [messageId]: { ...msg, reactions },
          },
        };
      });
    }
  },

  /** 6. message_read */
  message_read: (queryClient, payload) => {
    if (!payload) return;
    const { conversationId, readBy } = payload;
    if (conversationId && readBy) {
      queryClient.setQueryData(['chat', 'messages', 'conversation', conversationId], (prev) => {
        if (!prev) return prev;
        const entities = { ...prev.entities };
        Object.keys(entities).forEach((id) => {
          entities[id] = { ...entities[id], _deliveryStatus: 'seen' };
        });
        return { ...prev, entities };
      });
    }
  },

  /** 7. message_delivered */
  message_delivered: (queryClient, payload) => {
    if (!payload) return;
    const { messageId, conversationId, tempId } = payload;
    if (conversationId && tempId) {
      confirmMessageDelivered(queryClient, conversationId, tempId, { id: messageId || tempId });
    }
  },

  /** 8. message_failed */
  message_failed: (queryClient, payload) => {
    if (!payload) return;
    const { conversationId, tempId } = payload;
    if (conversationId && tempId) {
      markMessageFailed(queryClient, conversationId, tempId);
    }
  },

  /** 9. typing_started */
  typing_started: (_queryClient, payload, callbacks) => {
    if (callbacks?.onTypingStart) callbacks.onTypingStart(payload);
  },

  /** 10. typing_stopped */
  typing_stopped: (_queryClient, payload, callbacks) => {
    if (callbacks?.onTypingStop) callbacks.onTypingStop(payload);
  },
};

export default messageEventHandlers;
