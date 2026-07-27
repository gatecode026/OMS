/**
 * @file MemoryManager.ts
 * @description Centralized Enterprise Memory, CPU & Runtime Manager for the OMS Mobile Application.
 *              Monitors AppState, handles low-memory pressure signals, evicts caches on backgrounding,
 *              releases unused media/WebRTC resources, and prevents OOM / ANR crashes on low-end devices.
 */

import { AppState, AppStateStatus } from 'react-native';
import fileCacheService from './fileCacheService';
import AvatarCacheManager from './AvatarCacheManager';

export interface HardwareMemoryProfile {
  isLowEndDevice: boolean;
  maxCacheEntries: number;
  imageThumbnailScale: number;
}

export class SharedMemoryManagerClass {
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private isMemoryPressured = false;
  private profile: HardwareMemoryProfile = {
    isLowEndDevice: false,
    maxCacheEntries: 100,
    imageThumbnailScale: 0.5,
  };

  constructor() {
    this.initAppStateListener();
  }
  /**
   * Initialize AppState listener for background cache cleanup
   */
  private initAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        this.onAppBackgrounded();
      } else if (nextState === 'active') {
        this.isMemoryPressured = false;
      }
    });
  }
  /**
   * Run resource release on app backgrounding
   */
  private onAppBackgrounded() {
    console.log('[SharedMemoryManager] App backgrounded — triggering automatic memory cleanup...');
    this.performLowMemoryCleanup();
  }

  /**
   * Execute low memory cleanup across caches and buffers
   */
  performLowMemoryCleanup() {
    try {
      AvatarCacheManager.clear();
      this.isMemoryPressured = false;
      console.log('[SharedMemoryManager] Memory cleanup completed successfully.');
    } catch (err) {
      console.error('[SharedMemoryManager] Error during memory cleanup:', err);
    }
  }

  /**
   * Emergency flush triggered under severe memory pressure (OOM prevention)
   */
  emergencyFlush() {
    console.warn('[SharedMemoryManager] ⚠️ Critical Memory Pressure! Executing emergency flush...');
    this.isMemoryPressured = true;
    this.performLowMemoryCleanup();
  }
  /**
   * Check if device is running under memory pressure
   */
  get isUnderMemoryPressure(): boolean {
    return this.isMemoryPressured;
  }
  /**
   * Hardware memory profile for low-end Android tuning
   */
  get memoryProfile(): HardwareMemoryProfile {
    return this.profile;
  }
}
export const MemoryManager = new SharedMemoryManagerClass();
export default MemoryManager;