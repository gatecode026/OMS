/**
 * @file queryClient.ts
 * @description Central TanStack QueryClient setup with default caching and network-aware retry rules.
 */

import { QueryClient } from '@tanstack/react-query';
import { AppError } from '../services/apiClient';

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

export default queryClient;
