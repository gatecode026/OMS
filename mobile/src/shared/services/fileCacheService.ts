/**
 * @file fileCacheService.ts
 * @description Local file-system cache service using expo-file-system.
 *              Allows automatic React Query cache persistence without Android's 2KB SecureStore limits.
 */

import * as FileSystem from 'expo-file-system';
import { QueryClient } from '@tanstack/react-query';

const CACHE_DIR = `${FileSystem.documentDirectory}react_query_cache/`;

export const fileCacheService = {
  /**
   * Initialize cache directory
   */
  async init(): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
    } catch (e) {
      console.error('[FileCacheService] Initialization error:', e);
    }
  },

  /**
   * Save a query key and its data to disk
   */
  async save(key: any, data: any): Promise<void> {
    try {
      await this.init();
      // Safe filename generation by stringifying and encoding the query key
      const filename = encodeURIComponent(JSON.stringify(key)) + '.json';
      const fileUri = `${CACHE_DIR}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data));
    } catch (e) {
      console.error('[FileCacheService] Error saving cache for key:', key, e);
    }
  },

  /**
   * Retrieve cached data for a specific query key
   */
  async get(key: any): Promise<any | null> {
    try {
      const filename = encodeURIComponent(JSON.stringify(key)) + '.json';
      const fileUri = `${CACHE_DIR}${filename}`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(fileUri);
        return JSON.parse(content);
      }
    } catch (e) {
      // Return null quietly if not found
    }
    return null;
  },

  /**
   * Clear all persisted caches
   */
  async clearAll(): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (info.exists) {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      }
    } catch (e) {
      console.error('[FileCacheService] Error clearing all cache files:', e);
    }
  },

  /**
   * Load all saved query JSON files into TanStack memory cache
   */
  async loadAllIntoCache(client: QueryClient): Promise<void> {
    try {
      await this.init();
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
      let count = 0;
      for (const file of files) {
        if (file.endsWith('.json')) {
          const fileUri = `${CACHE_DIR}${file}`;
          const content = await FileSystem.readAsStringAsync(fileUri);
          const data = JSON.parse(content);

          const keyString = decodeURIComponent(file.slice(0, -5));
          const key = JSON.parse(keyString);

          client.setQueryData(key, data);
          count++;
        }
      }
      console.log(`[FileCacheService] Pre-populated ${count} queries into query cache.`);
    } catch (e) {
      console.error('[FileCacheService] Error pre-populating query cache:', e);
    }
  }
};

export default fileCacheService;
