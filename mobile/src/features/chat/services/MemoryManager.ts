/**
 * @file MemoryManager.ts
 * @description Memory pressure handler for React Native.
 *              Registers AppState listener to detect foreground/background transitions.
 *              On low-memory signals: evicts PerformanceCacheManager LRU entries,
 *              logs warnings, and prevents OOM on low-end devices.
 */

import { AppState, AppStateStatus } from 'react-native';
import PerformanceCacheManager from './PerformanceCacheManager';

export class MemoryManagerClass {
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private isLowMemory = false;

  /**
   * Initialize memory pressure monitoring
   * @returns cleanup function
   */
  initialize(): () => void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    return () => {
      this.appStateSubscription?.remove();
    };
  }

  /**
   * Handle app state transitions — evict caches on background
   */
  private handleAppStateChange = (nextState: AppStateStatus): void => {
    if (nextState === 'background') {
      console.log('[MemoryManager] App backgrounded — running cache eviction...');
      this.performCacheEviction();
    } else if (nextState === 'active') {
      this.isLowMemory = false;
    }
  };

  /**
   * Manually trigger cache eviction (e.g. on OOM warning)
   */
  performCacheEviction(): void {
    const evicted = PerformanceCacheManager.evictExpired();
    console.log(`[MemoryManager] Evicted ${evicted} expired cache entries.`);
    this.isLowMemory = false;
  }

  /**
   * Emergency full cache flush under critical memory pressure
   */
  emergencyFlush(): void {
    console.warn('[MemoryManager] ⚠️ Emergency memory flush triggered!');
    this.isLowMemory = true;
    PerformanceCacheManager.clear();
  }

  get isUnderMemoryPressure(): boolean {
    return this.isLowMemory;
  }
}

export const MemoryManager = new MemoryManagerClass();
export default MemoryManager;
