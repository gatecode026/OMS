/**
 * @file features/chat/hooks/useMediaQuery.js
 * @description React Query hook for conversation media galleries & upload status.
 */

import { useQuery } from '@tanstack/react-query';
import { mediaKeys } from '../query/mediaKeys.js';
import { chatApiFetch, unwrap } from '../../../core/network/httpClient.js';
import { upsertMedia } from '../cache/mediaCache.js';
import { queryClient } from '../../../core/query/queryClient.js';

export function useMediaQuery({ convId, token, enabled = true }) {
  return useQuery({
    queryKey: mediaKeys.conversation(convId),
    queryFn: async () => {
      const env = await chatApiFetch(`/chat/conversations/${convId}/media`, { token });
      const list = unwrap(env, (e) => e.data || []);
      list.forEach((item) => upsertMedia(queryClient, convId, item));
      return list;
    },
    enabled: Boolean(convId) && Boolean(token) && enabled,
  });
}

export default useMediaQuery;
