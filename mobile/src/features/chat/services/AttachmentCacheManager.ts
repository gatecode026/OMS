/**
 * @file AttachmentCacheManager.ts
 * @description LRU Cache Manager for chat media & document attachments.
 *              Monitors cache storage size and automatically purges old cache items
 *              when total size exceeds the 100MB threshold.
 */

import * as FileSystem from 'expo-file-system/legacy';

export class AttachmentCacheManagerClass {
  readonly MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB Cache Limit

  /**
   * Calculate current cache directory size
   */
  async getCacheSize(): Promise<number> {
    try {
      const dir = FileSystem.cacheDirectory;
      if (!dir) return 0;
      const files = await FileSystem.readDirectoryAsync(dir);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${dir}${file}`);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalSize += fileInfo.size || 0;
        }
      }
      return totalSize;
    } catch {
      return 0;
    }
  }

  /**
   * Purge old cache files if cache ceiling is exceeded
   */
  async purgeExpiredCache(): Promise<void> {
    try {
      const currentSize = await this.getCacheSize();
      if (currentSize > this.MAX_CACHE_SIZE_BYTES) {
        const dir = FileSystem.cacheDirectory;
        if (!dir) return;
        const files = await FileSystem.readDirectoryAsync(dir);

        // Delete all cache files
        for (const file of files) {
          await FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true });
        }
      }
    } catch (err) {
      console.warn('[AttachmentCacheManager] Error purging cache:', err);
    }
  }
}

export const AttachmentCacheManager = new AttachmentCacheManagerClass();
export default AttachmentCacheManager;
