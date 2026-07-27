/**
 * @file core/query/queryKeys.js
 * @description Single source of truth for React Query cache keys (Core layer).
 *   Centralized keys let socket listeners and mutations target the exact cache
 *   entries a query populated. Mirrors the mobile key scheme
 *   (['chat','conversations'], ['chat','messages',convId]).
 */

const root = ['chat'];

export const chatKeys = {
  all: root,

  // Conversations
  conversations: () => [...root, 'conversations'],
  archivedConversations: () => [...root, 'conversations', 'archived'],
  hiddenConversations: () => [...root, 'conversations', 'hidden'],

  // Messages (per conversation) — reserved for the Message Engine slice
  messages: (conversationId) => [...root, 'messages', conversationId],

  // Other domains — reserved, declared now so future slices don't re-invent keys
  pinned: (conversationId) => [...root, 'pinned', conversationId],
  starred: () => [...root, 'starred'],
  thread: (threadId) => [...root, 'thread', threadId],
  poll: (pollId) => [...root, 'poll', pollId],
  employees: (query) => [...root, 'employees', query ?? ''],
};

export default chatKeys;
