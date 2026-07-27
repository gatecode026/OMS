/**
 * @file features/chat/socket/conversationEventHandler.js
 * @description Single-responsibility conversation event handlers for Phase B.
 *   Each handler receives the validated socket payload and applies O(1) cache
 *   mutations to the normalized React Query cache or delegates to state callbacks.
 */

import {
  upsertConversation,
  patchConversationById,
  removeConversationById,
  moveConversationToTop,
} from '../cache/conversationsCache.js';

/**
 * Event handlers registry mapping socket event keys to handler functions.
 */
export const conversationEventHandlers = {
  /** 1. new_conversation */
  new_conversation: (queryClient, payload) => {
    if (!payload) return;
    const conv = payload.conversation || payload;
    if (!conv.id && conv._id) conv.id = conv._id;
    upsertConversation(queryClient, conv);
    if (conv.id) moveConversationToTop(queryClient, conv.id);
  },

  /** 2. conversation_updated / group_updated */
  conversation_updated: (queryClient, payload) => {
    if (!payload) return;
    const id = payload.conversationId || payload.id || payload._id;
    if (!id) return;
    patchConversationById(queryClient, id, payload.changes || payload);
  },

  /** 3. conversation_deleted / conversation_removed */
  conversation_deleted: (queryClient, payload) => {
    if (!payload) return;
    const id = typeof payload === 'string' ? payload : payload.conversationId || payload.id;
    if (id) removeConversationById(queryClient, id);
  },

  /** 4. conversation_archived */
  conversation_archived: (queryClient, payload) => {
    if (!payload) return;
    const id = typeof payload === 'string' ? payload : payload.conversationId || payload.id;
    if (id) patchConversationById(queryClient, id, { isArchived: true });
  },

  /** 5. conversation_unarchived */
  conversation_unarchived: (queryClient, payload) => {
    if (!payload) return;
    const id = typeof payload === 'string' ? payload : payload.conversationId || payload.id;
    if (id) patchConversationById(queryClient, id, { isArchived: false });
  },

  /** 6. conversation_hidden */
  conversation_hidden: (queryClient, payload) => {
    if (!payload) return;
    const id = typeof payload === 'string' ? payload : payload.conversationId || payload.id;
    if (id) patchConversationById(queryClient, id, { isHidden: true });
  },

  /** 7. conversation_unhidden */
  conversation_unhidden: (queryClient, payload) => {
    if (!payload) return;
    const id = typeof payload === 'string' ? payload : payload.conversationId || payload.id;
    if (id) patchConversationById(queryClient, id, { isHidden: false });
  },

  /** 8. conversation_pinned */
  conversation_pinned: (queryClient, payload) => {
    if (!payload) return;
    const id = typeof payload === 'string' ? payload : payload.conversationId || payload.id;
    if (id) {
      patchConversationById(queryClient, id, { isPinned: true });
      moveConversationToTop(queryClient, id);
    }
  },

  /** 9. conversation_unpinned */
  conversation_unpinned: (queryClient, payload) => {
    if (!payload) return;
    const id = typeof payload === 'string' ? payload : payload.conversationId || payload.id;
    if (id) patchConversationById(queryClient, id, { isPinned: false });
  },

  /** 10. conversation_read */
  conversation_read: (queryClient, payload) => {
    if (!payload) return;
    const id = typeof payload === 'string' ? payload : payload.conversationId || payload.id;
    if (id) patchConversationById(queryClient, id, { unreadCount: 0 });
  },

  /** 11. conversation_unread */
  conversation_unread: (queryClient, payload) => {
    if (!payload) return;
    const id = payload.conversationId || payload.id;
    const count = typeof payload.unreadCount === 'number' ? payload.unreadCount : undefined;
    if (id) {
      if (count !== undefined) {
        patchConversationById(queryClient, id, { unreadCount: count });
      }
    }
  },

  /** 12. participant_added */
  participant_added: (queryClient, payload) => {
    if (!payload || !payload.conversationId || !payload.participant) return;
    const { conversationId, participant } = payload;
    queryClient.setQueryData(['chat', 'conversations'], (prev) => {
      if (!prev || !prev.entities[conversationId]) return prev;
      const existing = prev.entities[conversationId];
      const participants = [...(existing.participants || [])];
      if (!participants.some((p) => p.employeeId === participant.employeeId)) {
        participants.push(participant);
      }
      return {
        ...prev,
        entities: {
          ...prev.entities,
          [conversationId]: { ...existing, participants },
        },
      };
    });
  },

  /** 13. participant_removed */
  participant_removed: (queryClient, payload) => {
    if (!payload || !payload.conversationId) return;
    const { conversationId, participantId, employeeId } = payload;
    const targetId = employeeId || participantId;
    if (!targetId) return;
    queryClient.setQueryData(['chat', 'conversations'], (prev) => {
      if (!prev || !prev.entities[conversationId]) return prev;
      const existing = prev.entities[conversationId];
      const participants = (existing.participants || []).filter((p) => p.employeeId !== targetId && p.id !== targetId);
      return {
        ...prev,
        entities: {
          ...prev.entities,
          [conversationId]: { ...existing, participants },
        },
      };
    });
  },

  /** 14. avatar_updated */
  avatar_updated: (queryClient, payload) => {
    if (!payload) return;
    const { conversationId, avatar } = payload;
    if (conversationId && avatar) {
      patchConversationById(queryClient, conversationId, { avatar });
    }
  },

  /** 15. last_message_updated */
  last_message_updated: (queryClient, payload) => {
    if (!payload) return;
    const msg = payload.message || payload;
    const convId = msg.conversationId || payload.conversationId;
    if (!convId) return;

    patchConversationById(queryClient, convId, {
      lastMessage: {
        messageId: msg.id || msg._id,
        content: msg.content,
        type: msg.type || 'text',
        senderId: msg.senderId,
        senderName: msg.senderName,
        sentAt: msg.createdAt || new Date().toISOString(),
      },
      lastActivityAt: msg.createdAt || new Date().toISOString(),
    });
    moveConversationToTop(queryClient, convId);
  },

  /** 16. typing_started */
  typing_started: (_queryClient, _payload, stateCallbacks) => {
    if (stateCallbacks?.onTypingStart) {
      stateCallbacks.onTypingStart(_payload);
    }
  },

  /** 17. typing_stopped */
  typing_stopped: (_queryClient, _payload, stateCallbacks) => {
    if (stateCallbacks?.onTypingStop) {
      stateCallbacks.onTypingStop(_payload);
    }
  },

  /** 18. presence_changed */
  presence_changed: (_queryClient, _payload, stateCallbacks) => {
    if (stateCallbacks?.onPresenceChange) {
      stateCallbacks.onPresenceChange(_payload);
    }
  },
};

export default conversationEventHandlers;
