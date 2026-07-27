/**
 * @file features/chat/hooks/useMessagesQuery.js
 * @description React Query hooks for fetching and paginating conversation messages.
 *   Provides `useInfiniteMessagesQuery` for cursor-based infinite scrolling, memory windowing, and stable ordering.
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { messageKeys } from '../query/messageKeys.js';
import { getMessages } from '../data/MessageRepository.js';
import { upsertMessages } from '../cache/messagesCache.js';
import { queryClient } from '../../../core/query/queryClient.js';

/**
 * Single-query hook for loading conversation messages.
 */
export function useMessagesQuery({ convId, token, enabled = true }) {
  return useQuery({
    queryKey: messageKeys.conversation(convId),
    queryFn: async () => {
      const data = await getMessages(convId, null, 20, token);
      if (data.messages) {
        upsertMessages(queryClient, convId, data.messages);
      }
      return data;
    },
    enabled: Boolean(convId) && Boolean(token) && enabled,
  });
}

/**
 * Infinite query hook for cursor-based message pagination (scroll up = load older).
 */
export function useInfiniteMessagesQuery({ convId, token, limit = 20, enabled = true }) {
  return useInfiniteQuery({
    queryKey: messageKeys.infiniteConversation(convId),
    queryFn: async ({ pageParam = null }) => {
      const data = await getMessages(convId, pageParam, limit, token);
      if (data.messages) {
        upsertMessages(queryClient, convId, data.messages);
      }
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.cursor || undefined,
    enabled: Boolean(convId) && Boolean(token) && enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export default useMessagesQuery;
