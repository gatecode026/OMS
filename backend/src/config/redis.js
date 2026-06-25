/**
 * @file src/config/redis.js
 * @description Redis client configuration using official Redis v4 client with TLS and ioredis compatibility wrapper.
 */

import { createClient } from "redis";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

// Convert redis:// to rediss:// to satisfy TLS/SSL requirements of Upstash Redis v4
const finalUrl = REDIS_URL && REDIS_URL.startsWith("redis://")
  ? REDIS_URL.replace(/^redis:/, "rediss:")
  : REDIS_URL;

const client = createClient({
  url: finalUrl,
  socket: {
    tls: true,
    rejectUnauthorized: false
  }
});

// Flag to track client availability across the application
client.isAvailable = false;

// ── Event Handlers ───────────────────────────────────────────────────────────
client.on("connect", () => {
  client.isAvailable = true;
  logger.info(`[Redis] Connected successfully at ${REDIS_URL ? REDIS_URL.replace(/\/\/.*@/, '//') : ''}`);
});

client.on("ready", () => {
  client.isAvailable = true;
  logger.info("[Redis] Client is ready to accept commands");
});

client.on("error", (err) => {
  client.isAvailable = false;
  logger.error(`[Redis] Error: ${err.message || err}`);
});

client.on("reconnecting", () => {
  logger.info("[Redis] Reconnecting...");
});

client.on("end", () => {
  client.isAvailable = false;
  logger.warn("[Redis] Connection closed");
});

// ── Safe Exec Helper ──────────────────────────────────────────────────────────
client.safeExec = async (fn) => {
  if (!client.isAvailable) return null;
  try {
    return await fn(client);
  } catch (err) {
    logger.warn(`[Redis] Safe exec failed: ${err.message}`);
    return null;
  }
};

// ── ioredis Signature Compatibility Layer ─────────────────────────────────────
const originalSet = client.set.bind(client);
client.set = function (key, value, ...args) {
  if (args.length === 2 && args[0] === "PX") {
    return originalSet(key, value, { PX: args[1] });
  }
  if (args.length === 2 && args[0] === "EX") {
    return originalSet(key, value, { EX: args[1] });
  }
  return originalSet(key, value, ...args);
};

client.pexpire = function (key, milliseconds) {
  return client.pExpire(key, milliseconds);
};

client.mget = function (keys) {
  return client.mGet(keys);
};

// ── Duplicate Factory ─────────────────────────────────────────────────────────
const originalDuplicate = client.duplicate.bind(client);
client.duplicate = function (...args) {
  const dup = originalDuplicate(...args);
  dup.isAvailable = client.isAvailable;

  const dupOriginalSet = dup.set.bind(dup);
  dup.set = function (key, value, ...args) {
    if (args.length === 2 && args[0] === "PX") {
      return dupOriginalSet(key, value, { PX: args[1] });
    }
    if (args.length === 2 && args[0] === "EX") {
      return dupOriginalSet(key, value, { EX: args[1] });
    }
    return dupOriginalSet(key, value, ...args);
  };

  dup.pexpire = function (key, milliseconds) {
    return dup.pExpire(key, milliseconds);
  };

  dup.mget = function (keys) {
    return dup.mGet(keys);
  };

  dup.on("connect", () => { dup.isAvailable = true; });
  dup.on("ready", () => { dup.isAvailable = true; });
  dup.on("error", (err) => {
    dup.isAvailable = false;
    logger.error(`[Redis Duplicate] Error: ${err.message || err}`);
  });
  dup.on("end", () => { dup.isAvailable = false; });

  // Asynchronously connect the duplicate client to mirror auto-connect behavior of ioredis
  dup.connect().catch((err) => {
    logger.error(`[Redis] Failed to connect duplicate client: ${err.message}`);
  });

  return dup;
};

export default client;
