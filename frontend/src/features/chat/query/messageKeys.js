/**
 * @file features/chat/query/messageKeys.js
 * @description Centralized query keys for the Message Engine.
 *   Provides predictable cache invalidation and query targeted operations.
 */

export const messageKeys = {
  all: ['chat', 'messages'],
  conversations: () => [...messageKeys.all, 'conversations'],
  conversation: (convId) => [...messageKeys.all, 'conversation', convId],
  infiniteConversation: (convId) => [...messageKeys.all, 'infinite', convId],
  unread: (convId) => [...messageKeys.all, 'unread', convId],
  starred: (convId) => [...messageKeys.all, 'starred', convId],
  pinned: (convId) => [...messageKeys.all, 'pinned', convId],
  replies: (threadId) => [...messageKeys.all, 'replies', threadId],
  search: (query) => [...messageKeys.all, 'search', query],
  drafts: (convId) => [...messageKeys.all, 'drafts', convId],
};

export default messageKeys;
