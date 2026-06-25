/**
 * @file backend/tests/cacheOptimization.test.js
 * @description Automated test suite for Enterprise Redis Caching & Invalidation layer.
 */

import assert from 'assert';
import redis from '../src/config/redis.js';
import {
  CacheKeys,
  TTL,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  cacheGetOrSet,
  cacheStats
} from '../src/services/cache.service.js';

const testCacheFlows = async () => {
  console.log('--- Starting Enterprise Caching Optimization Tests ---');

  // Ensure Redis client is connected
  if (!redis.isOpen) {
    console.log('[Redis] Connecting...');
    await redis.connect();
  }

  // Set up temporary key
  const companyId = 'COMP-TEST';
  const userId = 'EMP-TEST-001';
  const cacheKey = CacheKeys.user(companyId, userId);

  console.log(`[Test] Key generated: ${cacheKey}`);

  // Test 1: Clean start (Delete key)
  await cacheDel(cacheKey);
  const initialGet = await cacheGet(cacheKey);
  assert.strictEqual(initialGet, null, 'Cache get on non-existent key should return null');
  console.log('✅ Test 1 passed: Cache empty on start.');

  // Test 2: Cache aside logic (cacheGetOrSet)
  let fetchCount = 0;
  const dummyFetch = async () => {
    fetchCount++;
    return { name: 'Alice Test', role: 'Engineer' };
  };

  // First call (Cache Miss)
  const val1 = await cacheGetOrSet(cacheKey, dummyFetch, 10);
  assert.strictEqual(fetchCount, 1, 'Fetch function should be called on cache miss');
  assert.strictEqual(val1.name, 'Alice Test');
  console.log('✅ Test 2a passed: Cache Miss resolved and cached.');

  // Second call (Cache Hit)
  const val2 = await cacheGetOrSet(cacheKey, dummyFetch, 10);
  assert.strictEqual(fetchCount, 1, 'Fetch function should NOT be called on cache hit');
  assert.strictEqual(val2.name, 'Alice Test');
  console.log('✅ Test 2b passed: Cache Hit fetched directly.');

  // Test 3: Key invalidation (cacheDel)
  await cacheDel(cacheKey);
  const val3 = await cacheGetOrSet(cacheKey, dummyFetch, 10);
  assert.strictEqual(fetchCount, 2, 'Fetch function should be called again after deletion');
  assert.strictEqual(val3.name, 'Alice Test');
  console.log('✅ Test 3 passed: Key invalidation successfully cleared the value.');

  // Test 4: Pattern invalidation (cacheDelPattern)
  const prefixKey1 = `test_pattern:${companyId}:user1`;
  const prefixKey2 = `test_pattern:${companyId}:user2`;
  await cacheSet(prefixKey1, 'user1_data', 60);
  await cacheSet(prefixKey2, 'user2_data', 60);

  const testGet1 = await cacheGet(prefixKey1);
  const testGet2 = await cacheGet(prefixKey2);
  assert.strictEqual(testGet1, 'user1_data');
  assert.strictEqual(testGet2, 'user2_data');

  // Invalidate using wildcard pattern
  const deletedPatternCount = await cacheDelPattern(`test_pattern:${companyId}:*`);
  assert.ok(deletedPatternCount >= 2, 'Pattern delete should delete at least the 2 test keys');

  const afterGet1 = await cacheGet(prefixKey1);
  const afterGet2 = await cacheGet(prefixKey2);
  assert.strictEqual(afterGet1, null);
  assert.strictEqual(afterGet2, null);
  console.log('✅ Test 4 passed: Pattern invalidation matches and clears keys.');

  // Test 5: Cache Statistics Endpoint
  const stats = await cacheStats();
  console.log('Cache stats returned:', stats);
  assert.strictEqual(stats.redis, 'connected');
  assert.ok(stats.totalRequests > 0, 'Requests should have registered in stats');
  assert.ok(stats.hits >= 0);
  assert.ok(stats.misses >= 0);
  console.log('✅ Test 5 passed: Cache statistics populated.');

  // Test 6: Safe fail-safe fallback when Redis is disconnected
  console.log('[Test] Simulating Redis disconnection...');
  redis.isAvailable = false; // Mock availability flag as false

  let fallbackCalled = 0;
  const resultFallback = await cacheGetOrSet('some_random_key', async () => {
    fallbackCalled++;
    return 'fallback_value';
  }, 10);

  assert.strictEqual(resultFallback, 'fallback_value', 'Should return fallback value even when Redis is down');
  assert.strictEqual(fallbackCalled, 1, 'Should call database fetch function on Redis failure');

  const getFallback = await cacheGet('some_random_key');
  assert.strictEqual(getFallback, null, 'Cache get should safely return null on Redis failure');
  console.log('✅ Test 6 passed: Cache service safely handles Redis offline and falls back to database.');

  // Clean up
  redis.isAvailable = true; // Restore connection flag
  await cacheDel(cacheKey);
  await redis.disconnect();
  console.log('--- All Caching Optimization Tests Completed Successfully ---');
};

testCacheFlows().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
