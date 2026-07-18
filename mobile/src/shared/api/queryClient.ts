/**
 * @file queryClient.ts
 * @description Central TanStack QueryClient setup with default caching and network-aware retry rules.
 */

import { QueryClient } from '@tanstack/react-query';
import { AppError } from '../services/apiClient';
import fileCacheService from '../services/fileCacheService';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Skip retry for client error response codes (4xx)
        const appError = error as AppError;
        if (appError?.statusCode && appError.statusCode >= 400 && appError.statusCode < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes stale time
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        const appError = error as AppError;
        if (appError?.statusCode && appError.statusCode >= 400 && appError.statusCode < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

// Subscribe to automatically persist query cache updates to local disk
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.action.type === 'success') {
    const key = event.query.queryKey;
    const data = event.action.data;

    const cacheableKeys = ['profile', 'chat', 'conversations', 'messages', 'starred', 'pinned', 'shared-content', 'settings', 'wallpaper'];
    const isCacheable = key.some(
      (part: any) => typeof part === 'string' && cacheableKeys.some((k) => part.includes(k))
    );

    if (isCacheable && data) {
      fileCacheService.save(key, data);
    }
  }
});

export default queryClient;
