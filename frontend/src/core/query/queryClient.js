/**
 * @file core/query/queryClient.js
 * @description The app's TanStack QueryClient (Core layer). Primary server-state
 *   layer, shared across features. Defaults mirror the mobile client
 *   (mobile/src/shared/api/queryClient.ts) with refetchOnWindowFocus OFF — the
 *   legacy web chat never refetched on focus, and enabling it would clobber the
 *   optimistic socket cache patches during the strangler-fig migration.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.statusCode ?? error?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        const status = error?.statusCode ?? error?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

export default queryClient;
