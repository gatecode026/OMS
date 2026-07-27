/**
 * @file features/chat/data/ConversationRepository.js
 * @description Conversation Repository Layer (Phase B Architecture).
 *   Sits between React Query / ChatContext and HTTP/Socket transport.
 *   Contains pure business logic and validates payloads with Zod schemas.
 *   Does not expose raw HTTP status or implementation details to UI or callers.
 */

import { chatApiFetch, unwrap } from '../../../core/network/httpClient.js';
import { parseConversations } from '../schemas/conversation.schema.js';
import { chatKeys } from '../../../core/query/queryKeys.js';
import { trackApiLatency } from '../../../core/devtools/perf.js';

/**
 * Fetch active conversations.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getConversations(token) {
  const start = Date.now();
  const env = await chatApiFetch('/chat/conversations', { token });
  trackApiLatency('/chat/conversations', Date.now() - start);
  return parseConversations(unwrap(env, (e) => e.data || []));
}

/**
 * Fetch archived conversations.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getArchived(token) {
  const start = Date.now();
  const env = await chatApiFetch('/chat/conversations/archived', { token });
  trackApiLatency('/chat/conversations/archived', Date.now() - start);
  return parseConversations(unwrap(env, (e) => e.data || []));
}

/**
 * Fetch hidden conversations.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getHidden(token) {
  const start = Date.now();
  const env = await chatApiFetch('/chat/conversations/hidden', { token });
  trackApiLatency('/chat/conversations/hidden', Date.now() - start);
  return parseConversations(unwrap(env, (e) => e.data || []));
}

/**
 * Archive a conversation by ID.
 * @param {string} id
 * @param {string} token
 */
export async function archive(id, token) {
  const env = await chatApiFetch(`/chat/conversations/${id}/archive`, { token, method: 'POST' });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Unarchive a conversation by ID.
 * @param {string} id
 * @param {string} token
 */
export async function unarchive(id, token) {
  const env = await chatApiFetch(`/chat/conversations/${id}/unarchive`, { token, method: 'POST' });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Hide a conversation by ID.
 * @param {string} id
 * @param {string} token
 */
export async function hide(id, token) {
  const env = await chatApiFetch(`/chat/conversations/${id}/hide`, { token, method: 'POST' });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Unhide a conversation by ID.
 * @param {string} id
 * @param {string} token
 */
export async function unhide(id, token) {
  const env = await chatApiFetch(`/chat/conversations/${id}/unhide`, { token, method: 'POST' });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Pin a conversation.
 * @param {string} id
 * @param {string} [token]
 * @param {object} [socket]
 */
export async function pin(id, token, socket) {
  if (socket && socket.connected) {
    socket.emit('pin_conversation', { conversationId: id });
    return true;
  }
  const env = await chatApiFetch(`/chat/conversations/${id}/pin`, { token, method: 'POST' });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Unpin a conversation.
 * @param {string} id
 * @param {string} [token]
 * @param {object} [socket]
 */
export async function unpin(id, token, socket) {
  if (socket && socket.connected) {
    socket.emit('unpin_conversation', { conversationId: id });
    return true;
  }
  const env = await chatApiFetch(`/chat/conversations/${id}/unpin`, { token, method: 'POST' });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Mark a conversation as read.
 * @param {string} id
 * @param {string} token
 */
export async function markRead(id, token) {
  const env = await chatApiFetch(`/chat/conversations/${id}/read`, { token, method: 'PATCH' });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Mark a conversation as unread.
 * @param {string} id
 * @param {string} token
 */
export async function markUnread(id, token) {
  const env = await chatApiFetch(`/chat/conversations/${id}/unread`, { token, method: 'PATCH' });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Update metadata for a conversation.
 * @param {string} id
 * @param {object} patch
 * @param {string} token
 */
export async function updateMetadata(id, patch, token) {
  const env = await chatApiFetch(`/chat/conversations/${id}`, {
    token,
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return unwrap(env, (e) => e.data || true);
}

/**
 * Rename a group conversation.
 * @param {string} id
 * @param {string} newName
 * @param {string} token
 */
export async function renameGroup(id, newName, token) {
  return updateMetadata(id, { name: newName }, token);
}

/**
 * Refresh a conversation in the React Query cache.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {string} [id]
 */
export async function refreshConversation(queryClient, id) {
  if (id) {
    return queryClient.invalidateQueries({ queryKey: chatKeys.conversation(id) });
  }
  return queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
}

/**
 * Prefetch a conversation into the React Query cache.
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {string} id
 * @param {string} token
 */
export async function prefetchConversation(queryClient, id, token) {
  if (!queryClient || !id || !token) return;
  return queryClient.prefetchQuery({
    queryKey: chatKeys.conversation(id),
    queryFn: async () => {
      const env = await chatApiFetch(`/chat/conversations/${id}`, { token });
      return unwrap(env, (e) => e.data);
    },
  });
}

const ConversationRepository = {
  getConversations,
  getArchived,
  getHidden,
  archive,
  unarchive,
  hide,
  unhide,
  pin,
  unpin,
  markRead,
  markUnread,
  updateMetadata,
  renameGroup,
  refreshConversation,
  prefetchConversation,
};

export default ConversationRepository;
