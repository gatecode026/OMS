/**
 * @file features/chat/cache/messagesCache.js
 * @description Normalized cache for the Message Engine.
 *   Stores messages as O(1) entity lookups: `{ entities, conversationMessageIds, pendingMessages, failedMessages, optimisticMessages }`.
 *   Eliminates duplicate rows and provides stable array output for UI components.
 */

import { messageKeys } from '../query/messageKeys.js';

const EMPTY_NORM_MESSAGES = {
  entities: {},
  conversationMessageIds: {},
  pendingMessages: {},
  failedMessages: {},
  optimisticMessages: {},
};

const getKey = (convId) => messageKeys.conversation(convId);

/** Build initial normalized message structure for a conversation */
export function normalizeMessages(messages = []) {
  const entities = {};
  const ids = [];
  for (const m of messages) {
    const id = m.id || m._id || m.tempId;
    if (id && !entities[id]) {
      entities[id] = m;
      ids.push(id);
    }
  }
  return { entities, ids };
}

/** Denormalize conversation messages into a sorted chronological array (oldest first) */
export function denormalizeMessages(cacheState, convId) {
  if (!cacheState || !convId) return [];
  const convIds = cacheState.conversationMessageIds?.[convId] || [];
  const entities = cacheState.entities || {};

  const msgs = convIds.map((id) => entities[id]).filter(Boolean);

  // Include any optimistic or failed messages for this conversation
  const pendingMap = cacheState.optimisticMessages || {};
  Object.values(pendingMap).forEach((m) => {
    if (m.conversationId === convId && !msgs.some((existing) => existing.id === m.id || existing.id === m.tempId)) {
      msgs.push(m);
    }
  });

  const failedMap = cacheState.failedMessages || {};
  Object.values(failedMap).forEach((m) => {
    if (m.conversationId === convId && !msgs.some((existing) => existing.id === m.id || existing.id === m.tempId)) {
      msgs.push(m);
    }
  });

  // Sort chronologically (oldest first)
  return msgs.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

/** Read messages for a conversation as a plain array */
export function readConversationMessages(queryClient, convId) {
  if (!queryClient || !convId) return [];
  const cacheData = queryClient.getQueryData(getKey(convId));
  return denormalizeMessages(cacheData, convId);
}

/** Upsert a list of server messages for a conversation */
export function upsertMessages(queryClient, convId, messageList = []) {
  if (!queryClient || !convId) return;
  queryClient.setQueryData(getKey(convId), (prev) => {
    const current = prev || EMPTY_NORM_MESSAGES;
    const nextEntities = { ...current.entities };
    const currentIds = current.conversationMessageIds[convId] ? [...current.conversationMessageIds[convId]] : [];

    messageList.forEach((m) => {
      const id = m.id || m._id || m.tempId;
      if (id) {
        nextEntities[id] = { ...nextEntities[id], ...m };
        if (!currentIds.includes(id)) {
          currentIds.push(id);
        }
      }
    });

    return {
      ...current,
      entities: nextEntities,
      conversationMessageIds: {
        ...current.conversationMessageIds,
        [convId]: currentIds,
      },
    };
  });
}

/** Append an optimistic message to the cache */
export function appendOptimisticMessage(queryClient, convId, message) {
  if (!queryClient || !convId || !message) return;
  const tempId = message.tempId || message.id;
  queryClient.setQueryData(getKey(convId), (prev) => {
    const current = prev || EMPTY_NORM_MESSAGES;
    return {
      ...current,
      entities: { ...current.entities, [tempId]: message },
      optimisticMessages: { ...current.optimisticMessages, [tempId]: message },
      conversationMessageIds: {
        ...current.conversationMessageIds,
        [convId]: [...(current.conversationMessageIds[convId] || []), tempId],
      },
    };
  });
}

/** Confirm an optimistic message delivery */
export function confirmMessageDelivered(queryClient, convId, tempId, confirmedMsg) {
  if (!queryClient || !convId || !tempId) return;
  queryClient.setQueryData(getKey(convId), (prev) => {
    if (!prev) return EMPTY_NORM_MESSAGES;
    const realId = confirmedMsg.id || confirmedMsg._id || tempId;
    const nextEntities = { ...prev.entities };
    delete nextEntities[tempId];
    nextEntities[realId] = { ...confirmedMsg, _deliveryStatus: 'delivered' };

    const nextOptimistic = { ...prev.optimisticMessages };
    delete nextOptimistic[tempId];

    const currentIds = prev.conversationMessageIds[convId] || [];
    const nextIds = currentIds.map((id) => (id === tempId ? realId : id));

    return {
      ...prev,
      entities: nextEntities,
      optimisticMessages: nextOptimistic,
      conversationMessageIds: {
        ...prev.conversationMessageIds,
        [convId]: nextIds,
      },
    };
  });
}

/** Mark an optimistic message as failed */
export function markMessageFailed(queryClient, convId, tempId) {
  if (!queryClient || !convId || !tempId) return;
  queryClient.setQueryData(getKey(convId), (prev) => {
    if (!prev || !prev.entities[tempId]) return prev;
    const failedMsg = { ...prev.entities[tempId], _deliveryStatus: 'failed' };
    const nextOptimistic = { ...prev.optimisticMessages };
    delete nextOptimistic[tempId];

    return {
      ...prev,
      entities: { ...prev.entities, [tempId]: failedMsg },
      optimisticMessages: nextOptimistic,
      failedMessages: { ...prev.failedMessages, [tempId]: failedMsg },
    };
  });
}

/** Patch a message by ID O(1) */
export function patchMessageById(queryClient, convId, messageId, patch) {
  if (!queryClient || !convId || !messageId) return;
  queryClient.setQueryData(getKey(convId), (prev) => {
    if (!prev || !prev.entities[messageId]) return prev;
    return {
      ...prev,
      entities: {
        ...prev.entities,
        [messageId]: { ...prev.entities[messageId], ...patch },
      },
    };
  });
}

/** Remove a message by ID O(1) */
export function removeMessageById(queryClient, convId, messageId) {
  if (!queryClient || !convId || !messageId) return;
  queryClient.setQueryData(getKey(convId), (prev) => {
    if (!prev || !prev.entities[messageId]) return prev;
    const nextEntities = { ...prev.entities };
    delete nextEntities[messageId];

    const nextFailed = { ...prev.failedMessages };
    delete nextFailed[messageId];

    const nextOptimistic = { ...prev.optimisticMessages };
    delete nextOptimistic[messageId];

    return {
      ...prev,
      entities: nextEntities,
      failedMessages: nextFailed,
      optimisticMessages: nextOptimistic,
      conversationMessageIds: {
        ...prev.conversationMessageIds,
        [convId]: (prev.conversationMessageIds[convId] || []).filter((id) => id !== messageId),
      },
    };
  });
}

export default {
  normalizeMessages,
  denormalizeMessages,
  readConversationMessages,
  upsertMessages,
  appendOptimisticMessage,
  confirmMessageDelivered,
  markMessageFailed,
  patchMessageById,
  removeMessageById,
};
