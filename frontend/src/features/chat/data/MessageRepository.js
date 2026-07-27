/**
 * @file features/chat/data/MessageRepository.js
 * @description Message Repository Layer (OPRD-WEB-CHAT-003).
 *   Encapsulates all message domain operations (get, send, edit, delete, react, reply, forward, star, pin, read).
 *   Contains pure business logic and validates payloads with Zod schemas.
 */

import { chatApiFetch, unwrap } from '../../../core/network/httpClient.js';
import { parseMessageList } from '../schemas/message.schema.js';
import { messageKeys } from '../query/messageKeys.js';
import { trackApiLatency } from '../../../core/devtools/messagePerf.js';

/**
 * Fetch messages for a conversation with cursor pagination.
 * @param {string} convId
 * @param {string|null} [cursor=null]
 * @param {number} [limit=20]
 * @param {string} [token]
 */
export async function getMessages(convId, cursor = null, limit = 20, token) {
  if (!convId) return { messages: [], pagination: { hasMore: false, cursor: null } };
  const start = Date.now();
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.append('cursor', String(cursor));

  const url = `/chat/conversations/${convId}/messages?${query.toString()}`;
  const env = await chatApiFetch(url, { token });
  trackApiLatency(url, Date.now() - start);

  const rawData = unwrap(env, (e) => e.data || { messages: [], pagination: {} });
  return parseMessageList(rawData);
}

/**
 * Load older messages for pagination.
 */
export async function loadOlderMessages(convId, cursor, limit = 20, token) {
  return getMessages(convId, cursor, limit, token);
}

/**
 * Send a message via socket or REST fallback.
 */
export async function sendMessage({ conversationId, content, type = 'text', replyTo = null, media = null, tempId }, token, socket) {
  if (socket && socket.connected) {
    socket.emit('send_message', {
      conversationId,
      content,
      type,
      replyTo,
      media,
      tempId,
    });
    return { status: 'success', tempId };
  }

  const env = await chatApiFetch(`/chat/conversations/${conversationId}/messages`, {
    token,
    method: 'POST',
    body: JSON.stringify({ content, type, replyTo, media, tempId }),
  });
  return unwrap(env, (e) => e.data);
}

/**
 * Edit a message.
 */
export async function editMessage({ messageId, conversationId, content }, token, socket) {
  if (socket && socket.connected) {
    socket.emit('edit_message', { messageId, conversationId, content });
  }

  const env = await chatApiFetch(`/chat/messages/${messageId}`, {
    token,
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  return unwrap(env, (e) => e.data);
}

/**
 * Delete a message.
 */
export async function deleteMessage(messageId, conversationId, token, socket) {
  if (socket && socket.connected) {
    socket.emit('delete_message', { messageId, conversationId });
  }

  const env = await chatApiFetch(`/chat/messages/${messageId}`, {
    token,
    method: 'DELETE',
  });
  return unwrap(env, (e) => e.data);
}

/**
 * Recall a message.
 */
export async function recallMessage(messageId, conversationId, token, socket) {
  return deleteMessage(messageId, conversationId, token, socket);
}

/**
 * React to a message.
 */
export async function reactToMessage(messageId, conversationId, emoji, token, socket) {
  if (socket && socket.connected) {
    socket.emit('add_reaction', { messageId, conversationId, emoji });
  }

  const env = await chatApiFetch(`/chat/messages/${messageId}/react`, {
    token,
    method: 'POST',
    body: JSON.stringify({ emoji }),
  });
  return unwrap(env, (e) => e.data);
}

/**
 * Reply to a message.
 */
export async function replyMessage(conversationId, replyToMessageId, content, token, socket) {
  return sendMessage({ conversationId, content, replyTo: replyToMessageId }, token, socket);
}

/**
 * Forward a message.
 */
export async function forwardMessage(messageId, targetConversationId, token, socket) {
  const env = await chatApiFetch(`/chat/messages/${messageId}/forward`, {
    token,
    method: 'POST',
    body: JSON.stringify({ targetConversationId }),
  });
  return unwrap(env, (e) => e.data);
}

/**
 * Star / Unstar a message.
 */
export async function starMessage(messageId, conversationId, isStarred = true, token, socket) {
  const event = isStarred ? 'star_message' : 'unstar_message';
  if (socket && socket.connected) {
    socket.emit(event, { messageId, conversationId });
  }

  const env = await chatApiFetch(`/chat/messages/${messageId}/star`, {
    token,
    method: isStarred ? 'POST' : 'DELETE',
  });
  return unwrap(env, (e) => e.data);
}

/**
 * Pin / Unpin a message.
 */
export async function pinMessage(messageId, conversationId, isPinned = true, token, socket) {
  const event = isPinned ? 'pin_message' : 'unpin_message';
  if (socket && socket.connected) {
    socket.emit(event, { messageId, conversationId });
  }

  const env = await chatApiFetch(`/chat/messages/${messageId}/pin`, {
    token,
    method: isPinned ? 'POST' : 'DELETE',
  });
  return unwrap(env, (e) => e.data);
}

/**
 * Mark messages as read for a conversation.
 */
export async function markRead(conversationId, token, socket) {
  if (socket && socket.connected) {
    socket.emit('mark_read', { conversationId });
  }

  const env = await chatApiFetch(`/chat/conversations/${conversationId}/read`, {
    token,
    method: 'PATCH',
  });
  return unwrap(env, (e) => e.data);
}

/**
 * Prefetch messages for a conversation into the React Query cache.
 */
export async function prefetchMessages(queryClient, convId, token) {
  if (!queryClient || !convId) return;
  return queryClient.prefetchQuery({
    queryKey: messageKeys.conversation(convId),
    queryFn: () => getMessages(convId, null, 20, token),
  });
}

/**
 * Refresh messages in cache.
 */
export async function refreshMessages(queryClient, convId) {
  if (!queryClient || !convId) return;
  return queryClient.invalidateQueries({ queryKey: messageKeys.conversation(convId) });
}

export const MessageRepository = {
  getMessages,
  loadOlderMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  recallMessage,
  reactToMessage,
  replyMessage,
  forwardMessage,
  starMessage,
  pinMessage,
  markRead,
  prefetchMessages,
  refreshMessages,
};

export default MessageRepository;
