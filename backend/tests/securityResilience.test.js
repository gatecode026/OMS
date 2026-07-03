/**
 * @file backend/tests/securityResilience.test.js
 * @description Automated test suite for Enterprise Security, Rate Limiting, Sanitization, and Health Metrics.
 */

import assert from "assert";
import redis from "../src/config/redis.js";
import {
  sanitizeNoSql,
  sanitizeXss,
  validateFileUpload,
  blacklistToken,
  isTokenBlacklisted,
} from "../src/services/security.service.js";
import { checkRateLimit } from "../src/services/rateLimiter.service.js";
import {
  gatherSystemMetrics,
  getPrometheusMetrics,
} from "../src/services/monitoring.service.js";
import { checkAllHealth } from "../src/services/health.service.js";
import {
  handleConnect,
  handleHeartbeat,
  handleDisconnect,
  getUserPresence,
} from "../src/modules/chat/services/presence.service.js";

const testSecurityFlows = async () => {
  console.log(
    "--- Starting Enterprise Security Resilience & Production Hardening Tests ---",
  );

  // Ensure Redis client is connected
  if (!redis.isOpen) {
    console.log("[Redis] Connecting...");
    await redis.connect();
  }

  // --- Test 1: NoSQL Query Injection Sanitization ---
  console.log("[Test 1] NoSQL Query Injection Sanitization...");
  const unsafeNoSql = {
    username: "alice",
    password: { $gt: "" },
    nested: {
      $ne: "malicious",
      safeField: "hello",
    },
    arrayField: [{ $lt: 5 }, { safe: true }],
  };
  const sanitizedNoSql = sanitizeNoSql(unsafeNoSql);

  assert.strictEqual(
    sanitizedNoSql.password.$gt,
    undefined,
    "NoSQL operator $gt should be stripped",
  );
  assert.strictEqual(
    sanitizedNoSql.nested.$ne,
    undefined,
    "NoSQL operator $ne should be stripped",
  );
  assert.strictEqual(
    sanitizedNoSql.nested.safeField,
    "hello",
    "Safe nested fields should be preserved",
  );
  assert.strictEqual(
    sanitizedNoSql.arrayField[0].$lt,
    undefined,
    "NoSQL operator $lt in array should be stripped",
  );
  assert.strictEqual(
    sanitizedNoSql.arrayField[1].safe,
    true,
    "Safe array item field should be preserved",
  );
  console.log(
    "✅ Test 1 passed: NoSQL Query Injection Sanitization works correctly.",
  );

  // --- Test 2: XSS Escape Sanitization ---
  console.log("[Test 2] XSS Escape Sanitization...");
  const unsafeXss = {
    script: '<script>alert("XSS")</script>',
    attributes: "javascript:void(0)",
    nested: {
      content: "Hello <world> / \"quote\" & 'apos'",
    },
    arrayField: ["<div>"],
  };
  const sanitizedXss = sanitizeXss(unsafeXss);

  assert.strictEqual(
    sanitizedXss.script,
    "&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;",
    "Tags should be escaped",
  );
  assert.strictEqual(
    sanitizedXss.nested.content,
    "Hello &lt;world&gt; &#x2F; &quot;quote&quot; &amp; &#x27;apos&#x27;",
    "Nested special characters should be escaped",
  );
  assert.strictEqual(
    sanitizedXss.arrayField[0],
    "&lt;div&gt;",
    "Array elements should be escaped",
  );
  console.log("✅ Test 2 passed: XSS Escape Sanitization works correctly.");

  // --- Test 3: File Upload Validation ---
  console.log("[Test 3] File Upload Validation...");
  const exeFile = {
    name: "virus.exe",
    size: 1024,
    mimetype: "application/octet-stream",
  };
  const exeResult = validateFileUpload(exeFile);
  assert.strictEqual(
    exeResult.isValid,
    false,
    "Executable extensions must be blocked",
  );
  assert.match(
    exeResult.reason,
    /blacklisted/,
    "Executable block reason must be set",
  );

  const largeFile = {
    name: "movie.mp4",
    size: 60 * 1024 * 1024,
    mimetype: "video/mp4",
  };
  const largeResult = validateFileUpload(largeFile);
  assert.strictEqual(
    largeResult.isValid,
    false,
    "Files larger than 50MB must be blocked",
  );
  assert.match(
    largeResult.reason,
    /size exceeds/,
    "Large size block reason must be set",
  );

  const cleanFile = {
    name: "report.pdf",
    size: 5 * 1024 * 1024,
    mimetype: "application/pdf",
    buffer: Buffer.from("Safe pdf contents"),
  };
  const cleanResult = validateFileUpload(cleanFile);
  assert.strictEqual(
    cleanResult.isValid,
    true,
    "Standard safe files should pass",
  );

  const eicarFile = {
    name: "test-eicar.txt",
    size: 68,
    mimetype: "text/plain",
    buffer: Buffer.from(
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
    ),
  };
  const eicarResult = validateFileUpload(eicarFile);
  assert.strictEqual(
    eicarResult.isValid,
    false,
    "Mock malware (EICAR) signatures must be blocked",
  );
  assert.match(
    eicarResult.reason,
    /malware/,
    "Malware detection block reason must be set",
  );
  console.log(
    "✅ Test 3 passed: File Upload Validation (types, sizes, malware scanner) works correctly.",
  );

  // --- Test 4: Token Revocation & Blacklisting ---
  console.log("[Test 4] Token Revocation & Blacklisting...");
  const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.testToken";

  // Verify it starts as not blacklisted
  const initBlacklisted = await isTokenBlacklisted(testToken);
  assert.strictEqual(
    initBlacklisted,
    false,
    "Token should not be blacklisted initially",
  );

  // Blacklist token
  const blacklistedSuccess = await blacklistToken(testToken, 60);
  assert.strictEqual(
    blacklistedSuccess,
    true,
    "Blacklist token call should succeed",
  );

  // Verify it is blacklisted
  const finalBlacklisted = await isTokenBlacklisted(testToken);
  assert.strictEqual(finalBlacklisted, true, "Token should now be blacklisted");
  console.log(
    "✅ Test 4 passed: Token revocation and blacklisting works correctly.",
  );

  // --- Test 5: Redis Rate Limiting ---
  console.log("[Test 5] Redis Rate Limiting (Sliding Window)...");
  const rateKey = `test_rate:test-ip-${Date.now()}`;
  const limit = 3;

  // First 3 hits should be allowed
  const r1 = await checkRateLimit(rateKey, limit, 60);
  assert.strictEqual(r1.allowed, true);
  assert.strictEqual(r1.current, 1);

  const r2 = await checkRateLimit(rateKey, limit, 60);
  assert.strictEqual(r2.allowed, true);
  assert.strictEqual(r2.current, 2);

  const r3 = await checkRateLimit(rateKey, limit, 60);
  assert.strictEqual(r3.allowed, true);
  assert.strictEqual(r3.current, 3);

  // 4th hit should be blocked
  const r4 = await checkRateLimit(rateKey, limit, 60);
  assert.strictEqual(
    r4.allowed,
    false,
    "Rate limit should block requests exceeding limit",
  );
  assert.strictEqual(r4.current, 4);
  assert.ok(r4.ttl > 0, "TTL should be returned");

  // Test rate limiter fallback when Redis is unavailable
  console.log("[Test 5b] Rate Limiting Offline Fail-safe...");
  redis.isAvailable = false;
  const offlineCheck = await checkRateLimit(rateKey, limit, 60);
  assert.strictEqual(
    offlineCheck.allowed,
    true,
    "Should fail-open/allow when Redis is offline",
  );
  redis.isAvailable = true; // Restore Redis status
  console.log(
    "✅ Test 5 passed: Redis Rate Limiting and fail-safes work correctly.",
  );

  // --- Test 6: Health & Monitoring Metrics ---
  console.log("[Test 6] Health & Monitoring Metrics...");

  const healthStats = await checkAllHealth();
  console.log("Health stats returned:", healthStats);
  assert.ok(healthStats.status, "Health status should be returned");
  assert.ok(healthStats.mongo, "Mongo health should be included");
  assert.ok(healthStats.redis, "Redis health should be included");

  const prometheusMetrics = await getPrometheusMetrics();
  assert.match(
    prometheusMetrics,
    /# HELP node_uptime/,
    "Prometheus output should contain HELP comments",
  );
  assert.match(
    prometheusMetrics,
    /node_memory_rss/,
    "Prometheus output should contain memory stats",
  );
  assert.match(
    prometheusMetrics,
    /redis_connected/,
    "Prometheus output should contain redis connection state",
  );
  console.log(
    "✅ Test 6 passed: Health & Monitoring Metrics generate correctly.",
  );

  // --- Test 7: Presence Key Expiry & Heartbeat Self-Healing ---
  console.log("[Test 7] Presence Key Expiry & Heartbeat Self-Healing...");
  const testUserId = "EMP-PRESENCE-TEST";
  const testCompanyId = "COMP-PRESENCE-TEST";

  // 1. Initial connec
  await handleConnect(
    testUserId,
    testCompanyId,
    "Presence Tester",
    "avatar_url",
    "available",
    "🚀",
  );
  let presenceData = await getUserPresence(testUserId);
  assert.strictEqual(
    presenceData.status,
    "online",
    "Status should be online after connecting",
  );
  assert.strictEqual(presenceData.name, "Presence Tester");

  // 2. Simulate key expiration in Redis
  await redis.del(`presence:user:${testUserId}`);
  presenceData = await getUserPresence(testUserId);
  assert.strictEqual(
    presenceData.status,
    "offline",
    "Status should report offline after key expires",
  );

  // 3. Send heartbeat with parameters (thawed session) -> should self-heal and recreate presence key
  await handleHeartbeat(
    testUserId,
    testCompanyId,
    "Presence Tester",
    "avatar_url",
    "available",
    "🚀",
  );
  presenceData = await getUserPresence(testUserId);
  assert.strictEqual(
    presenceData.status,
    "online",
    "Status should self-heal back to online after heartbeat",
  );
  assert.strictEqual(
    presenceData.name,
    "Presence Tester",
    "Recreated key should contain user details",
  );

  // 4. Verify connection count TTL set
  const connTTL = await redis.ttl(`connections:user:${testUserId}`);
  assert.ok(
    connTTL > 0 && connTTL <= 120,
    "Connection key should have a valid auto-cleanup TTL",
  );
  // 5. Clean up presence
  await handleDisconnect(testUserId, testCompanyId);
  presenceData = await getUserPresence(testUserId);
  assert.strictEqual(
    presenceData.status,
    "offline",
    "Status should be offline after disconnect",
  );

  const connKeyExists = await redis.exists(`connections:user:${testUserId}`);
  assert.strictEqual(
    connKeyExists,
    0,
    "Connection count key should be fully cleaned up",
  );
  console.log(
    "✅ Test 7 passed: Presence self-healing and TTL bounds verified successfully.",
  );

  // --- Clean Up ---
  await redis.del(`blacklist:${testToken}`);
  await redis.del(rateKey);
  await redis.disconnect();
  console.log("--- All Security Resilience Tests Passed Successfully ---");
};

testSecurityFlows().catch((err) => {
  console.error("❌ Test failed with error:", err);
  process.exit(1);
});
