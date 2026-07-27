/**
 * @file features/chat/data/MessageSearchRepository.js
 * @description Message Search Foundation Layer (Part 10).
 *   Abstracts local cache search, server search, and indexed search compatibility.
 */

import { chatApiFetch, unwrap } from '../../../core/network/httpClient.js';
import { readConversationMessages } from '../cache/messagesCache.js';

/**
 * Search locally cached messages for a query string.
 */
export function searchLocalMessages(queryClient, convId, searchTerm) {
  if (!queryClient || !convId || !searchTerm) return [];
  const term = searchTerm.toLowerCase().trim();
  const allMessages = readConversationMessages(queryClient, convId);

  return allMessages.filter((msg) => {
    const content = (msg.content || '').toLowerCase();
    const sender = (msg.senderName || '').toLowerCase();
    return content.includes(term) || sender.includes(term);
  });
}

/**
 * Search server database for messages matching search parameters.
 */
export async function searchServerMessages({ query, convId, limit = 20 }, token) {
  if (!query) return [];
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (convId) params.append('conversationId', convId);

  const env = await chatApiFetch(`/chat/messages/search?${params.toString()}`, { token });
  return unwrap(env, (e) => e.data || []);
}

/**
 * Search indexed store (future-compatible abstraction).
 */
export async function searchIndexedMessages(query, convId) {
  return [];
}

export const MessageSearchRepository = {
  searchLocalMessages,
  searchServerMessages,
  searchIndexedMessages,
};

export default MessageSearchRepository;
