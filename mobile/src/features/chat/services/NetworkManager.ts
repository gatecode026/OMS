/**
 * @file NetworkManager.ts
 * @description Connectivity & Network State Detector for the chat subsystem.
 */

import { useOfflineStore } from '../../../shared/store/offlineStore';

export class NetworkManagerClass {
  /**
   * Check if device is currently online
   */
  isOnline(): boolean {
    return useOfflineStore.getState().isConnected;
  }

  /**
   * Subscribe to network connectivity changes
   */
  subscribe(listener: (isOnline: boolean) => void): () => void {
    return useOfflineStore.subscribe((state) => {
      listener(state.isConnected);
    });
  }
}

export const NetworkManager = new NetworkManagerClass();
export default NetworkManager;
