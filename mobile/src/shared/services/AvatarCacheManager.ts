/**
 * @file AvatarCacheManager.ts
 * @description In-memory URI cache for user avatars.
 *              Normalizes relative API paths to full HTTP URLs.
 *              Invalidated when a user updates their profile photo.
 *              Cleared entirely on logout.
 */

import ENV from '../../config/env';

class AvatarCacheManagerClass {
  /** userId → resolved full URI */
  private cache = new Map<string, string>();

  /**
   * Resolve a raw avatar URL to a full HTTP URI, using the in-memory cache.
   * @param userId   - The user's unique ID (used as cache key)
   * @param rawUrl   - The raw avatar string from profile or message payload
   * @returns        - Full HTTP/data URI, or undefined if no avatar exists
   */
  resolve(userId: string, rawUrl?: string | null): string | undefined {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return undefined;

    const resolved = this.toFullUri(rawUrl);
    if (resolved && userId) {
      this.cache.set(userId, resolved);
    }
    return resolved;
  }

  /**
   * Force-overwrite the cached URI for a user (e.g. after profile photo upload)
   */
  set(userId: string, rawUrl: string): void {
    const resolved = this.toFullUri(rawUrl);
    if (resolved) {
      this.cache.set(userId, resolved);
    }
  }

  /**
   * Remove a user's cached avatar URI so the next render re-resolves
   * (called after profile photo update)
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear the entire avatar cache (called on logout)
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Internal: Normalize raw paths to full HTTP URLs
   */
  private toFullUri(url: string): string | undefined {
    const clean = url.trim();
    if (!clean) return undefined;
    if (
      clean.startsWith('http://') ||
      clean.startsWith('https://') ||
      clean.startsWith('data:image/') ||
      clean.startsWith('file://') ||
      clean.startsWith('content://')
    ) {
      return clean;
    }
    // Handle raw base64 strings without data prefix
    if (clean.startsWith('iVBORw0KG') || clean.startsWith('/9j/') || clean.startsWith('R0lGOD')) {
      return `data:image/jpeg;base64,${clean}`;
    }
    // Relative path — prefix with API base URL
    const baseUrl = ENV.API_URL.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
    const cleanPath = clean.startsWith('/') ? clean : `/${clean}`;
    return `${baseUrl}${cleanPath}`;
  }
}

export const AvatarCacheManager = new AvatarCacheManagerClass();
export default AvatarCacheManager;
