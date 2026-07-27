/**
 * @file features/chat/hooks/useConversationsQuery.js
 * @description React Query hook that owns fetching + caching of the
 *   conversation list. This replaces the manual, in-memory
 *   `fetchConversations` + `useState` that used to live in ChatContext.
 *
 *   During the strangler-fig migration the ChatContext still keeps a local
 *   working copy of `conversations` (fed from this query) so the 27 existing
 *   optimistic socket patches keep working untouched. This hook is the single
 *   place the server list is fetched.
 */

import { useQuery } from '@tanstack/react-query';
import { chatKeys } from '../../../core/query/queryKeys.js';
import { getConversations } from '../data/ConversationRepository.js';
import { normalize } from '../cache/conversationsCache.js';

/**
 * @param {object} params
 * @param {string|null} params.token   auth token; query is disabled without it
 * @param {boolean} [params.enabled=true]
 */
export function useConversationsQuery({ token, enabled = true }) {
  return useQuery({
    queryKey: chatKeys.conversations(),
    // Store the normalized shape ({entities, ids}) in the cache (addendum §6).
    queryFn: async () => normalize(await getConversations(token)),
    enabled: Boolean(token) && enabled,
  });
}

export default useConversationsQuery;
