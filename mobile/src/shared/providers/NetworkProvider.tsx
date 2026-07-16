/**
 * @file NetworkProvider.tsx
 * @description Listens to network connectivity changes and coordinates offline state queue synchronization.
 */

import React, { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '../store/offlineStore';
import syncManager from '../services/syncManager';

interface NetworkProviderProps {
  children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const setConnectionStatus = useOfflineStore((state) => state.setConnectionStatus);
  const loadQueue = useOfflineStore((state) => state.loadQueue);
  const wasOffline = useRef(false);

  useEffect(() => {
    // 1. Load persisted queue on mount
    loadQueue();

    // 2. Subscribe to network status changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = __DEV__ ? true : !!state.isConnected;
      const isInternetReachable = __DEV__ ? true : state.isInternetReachable;

      setConnectionStatus(isConnected, isInternetReachable);

      // Trigger synchronization when transition is offline -> online
      if (isConnected && wasOffline.current) {
        console.log('[NetworkProvider]: Network restored, initiating sync...');
        syncManager.sync();
      }

      wasOffline.current = !isConnected;
    });

    return () => {
      unsubscribe();
    };
  }, [setConnectionStatus, loadQueue]);

  return <>{children}</>;
};

export default NetworkProvider;
