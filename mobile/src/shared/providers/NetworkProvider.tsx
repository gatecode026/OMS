/**
 * @file NetworkProvider.tsx
 * @description Listens to network connectivity changes and coordinates offline state queue synchronization.
 */

import React, { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineStore } from '../store/offlineStore';
import syncManager from '../services/syncManager';
import fileCacheService from '../services/fileCacheService';

interface NetworkProviderProps {
  children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const setConnectionStatus = useOfflineStore((state) => state.setConnectionStatus);
  const loadQueue = useOfflineStore((state) => state.loadQueue);
  const wasOffline = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Seed query client memory cache with local offline file-system cache
    fileCacheService.loadAllIntoCache(queryClient);

    // 2. Load persisted queue on mount
    loadQueue();

    // 3. Subscribe to network status changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Allow proper offline testing even in development/debug mode
      const isConnected = state.isConnected !== false;
      const isInternetReachable = state.isInternetReachable !== false;

      setConnectionStatus(isConnected, isInternetReachable);

      // Trigger synchronization when transition is offline -> online
      if (isConnected && wasOffline.current) {
        console.log('[NetworkProvider]: Network restored, initiating sync...');
        syncManager.sync();
        queryClient.invalidateQueries();
      }

      wasOffline.current = !isConnected;
    });

    return () => {
      unsubscribe();
    };
  }, [setConnectionStatus, loadQueue, queryClient]);

  return <>{children}</>;
};

export default NetworkProvider;
