/**
 * @file PerformanceCacheManager.ts
 * @description Bounded LRU (Least Recently Used) in-memory cache with per-entry TTL expiration.
 *              Provides O(1) get/set via Map-based LRU. Automatically evicts stale and
 *              least-recently-used entries to prevent OOM on long-running sessions.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms, 0 = no expiry
  lastAccessedAt: number;
}

export class PerformanceCacheManagerClass {
  private store = new Map<string, CacheEntry<any>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(maxEntries = 500, defaultTtlMs = 5 * 60 * 1000 /* 5 min */) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Store a value in the LRU cache
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict expired entries first
    this.evictExpired();

    // If at capacity, remove LRU entry
    if (this.store.size >= this.maxEntries) {
      this.evictLRU();
    }

    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: ttl > 0 ? Date.now() + ttl : 0,
      lastAccessedAt: Date.now(),
    });
  }

  /**
   * Retrieve a value from cache (returns null if expired or missing)
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh access time (LRU update)
    entry.lastAccessedAt = Date.now();
    return entry.value;
  }

  /**
   * Remove a specific entry
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns current number of cached entries
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Evict all expired entries
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt > 0 && now > entry.expiresAt) {
        this.store.delete(key);
        evicted++;
      }
    }
    return evicted;
  }

  /**
   * Evict the single least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.store.delete(lruKey);
    }
  }
}

export const PerformanceCacheManager = new PerformanceCacheManagerClass();
export default PerformanceCacheManager;
