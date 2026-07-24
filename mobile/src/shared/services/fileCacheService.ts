/**
 * @file fileCacheService.ts
 * @description Local file-system cache service using expo-file-system.
 *              Allows automatic React Query cache persistence without Android's 2KB SecureStore limits.
 */

import { File, Directory, Paths } from 'expo-file-system';
import { QueryClient } from '@tanstack/react-query';

const CACHE_DIR = new Directory(Paths.document, 'react_query_cache');

export const fileCacheService = {
  /**
   * Initialize cache directory
   */
  async init(): Promise<void> {
    try {
      if (!CACHE_DIR.exists) {
        CACHE_DIR.create({ intermediates: true, idempotent: true });
      }
    } catch (e: any) {
      console.error(`[FileCacheService]
Operation: init
Directory: ${CACHE_DIR.uri}
Error: ${e.message || e}
Stack: ${e.stack}
Recovery Action: Fallback to in-memory cache.`);
    }
  },

  /**
   * Save a query key and its data to disk
   */
  async save(key: any, data: any): Promise<void> {
    const filename = encodeURIComponent(JSON.stringify(key)) + '.json';
    try {
      await this.init();
      const file = new File(CACHE_DIR, filename);
      file.write(JSON.stringify(data));
    } catch (e: any) {
      console.error(`[FileCacheService]
Operation: save
Directory: ${CACHE_DIR.uri}
File: ${filename}
Error: ${e.message || e}
Stack: ${e.stack}
Recovery Action: Cache write failed. Proceeding without file cache.`);
    }
  },

  /**
   * Retrieve cached data for a specific query key
   */
  async get(key: any): Promise<any | null> {
    const filename = encodeURIComponent(JSON.stringify(key)) + '.json';
    try {
      const file = new File(CACHE_DIR, filename);
      if (file.exists) {
        const content = await file.text();
        return JSON.parse(content);
      }
    } catch (e: any) {
      console.error(`[FileCacheService]
Operation: get
Directory: ${CACHE_DIR.uri}
File: ${filename}
Error: ${e.message || e}
Stack: ${e.stack}
Recovery Action: Cache read failed. Returning null (cache miss).`);
    }
    return null;
  },

  /**
   * Clear all persisted caches
   */
  async clearAll(): Promise<void> {
    try {
      if (CACHE_DIR.exists) {
        CACHE_DIR.delete();
      }
    } catch (e: any) {
      console.error(`[FileCacheService]
Operation: clearAll
Directory: ${CACHE_DIR.uri}
Error: ${e.message || e}
Stack: ${e.stack}
Recovery Action: Clear cache directory failed.`);
    }
  },

  /**
   * Load all saved query JSON files into TanStack memory cache
   */
  async loadAllIntoCache(client: QueryClient): Promise<void> {
    try {
      await this.init();
      const files = CACHE_DIR.list();
      let count = 0;
      for (const item of files) {
        if (item instanceof File && item.name.endsWith('.json')) {
          const content = await item.text();
          const data = JSON.parse(content);

          const keyString = decodeURIComponent(item.name.slice(0, -5));
          const key = JSON.parse(keyString);

          client.setQueryData(key, data);
          count++;
        }
      }
      console.log(`[FileCacheService] Pre-populated ${count} queries into query cache.`);
    } catch (e: any) {
      console.error(`[FileCacheService]
Operation: loadAllIntoCache
Directory: ${CACHE_DIR.uri}
Error: ${e.message || e}
Stack: ${e.stack}
Recovery Action: Skip pre-populating TanStack query cache from file-system.`);
    }
  }
};

export default fileCacheService;
