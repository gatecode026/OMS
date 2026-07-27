/**
 * @file src/config/redis.js
 * @description Redis client configuration using official Redis v4 client with TLS and ioredis compatibility wrapper.
 */

import { createClient } from "redis";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;
const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true';

// Convert redis:// to rediss:// to satisfy TLS/SSL requirements of Upstash Redis v4
const finalUrl = REDIS_URL && REDIS_URL.startsWith("redis://")
  ? REDIS_URL.replace(/^redis:/, "rediss:")
  : REDIS_URL;

let client;

if (DISABLE_REDIS || !finalUrl) {
  logger.warn('[Redis] Disabled or REDIS_URL not configured. Running in fallback mode.');
  client = {
    isAvailable: false,
    on: () => {},
    off: () => {},
    once: () => {},
    connect: async () => {},
    disconnect: async () => {},
    quit: async () => {},
    ping: async () => 'PONG',
    get: async () => null,
    set: async () => null,
    del: async () => null,
    incr: async () => null,
    decr: async () => null,
    expire: async () => null,
    pexpire: async () => null,
    mget: async () => [],
    sAdd: async () => null,
    sRem: async () => null,
    sMembers: async () => [],
    sIsMember: async () => false,
    safeExec: async (fn) => null,
    duplicate: function() { return this; },
  };
} else {
  client = createClient({
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

  // ── Multi Wrapper ───────────────────────────────────────────────────────────
  const originalMulti = client.multi.bind(client);
  client.multi = function (...args) {
    const multi = originalMulti(...args);
    const originalExec = multi.exec.bind(multi);
    multi.exec = function (...execArgs) {
      return originalExec(...execArgs).catch((err) => {
        const errMsg = err.message || "";
        if (errMsg.includes("max requests limit exceeded") || errMsg.includes("limit exceeded") || errMsg.includes("Quota Exceeded")) {
          client.isAvailable = false;
          logger.error(`[Redis Multi] Request limit exceeded. Disabling Redis client dynamically. Error: ${errMsg}`);
        }
        throw err;
      });
    };
    return multi;
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

    const originalDupMulti = dup.multi.bind(dup);
    dup.multi = function (...args) {
      const multi = originalDupMulti(...args);
      const originalExec = multi.exec.bind(multi);
      multi.exec = function (...execArgs) {
        return originalExec(...execArgs).catch((err) => {
          const errMsg = err.message || "";
          if (errMsg.includes("max requests limit exceeded") || errMsg.includes("limit exceeded") || errMsg.includes("Quota Exceeded")) {
            dup.isAvailable = false;
            client.isAvailable = false;
            logger.error(`[Redis Duplicate Multi] Request limit exceeded. Disabling Redis client dynamically. Error: ${errMsg}`);
          }
          throw err;
        });
      };
      return multi;
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

    return wrapClient(dup);
  };
}

// ── Proxy Wrapper to dynamically disable Redis on billing/limit errors ──────────
const wrapClient = (clientInstance) => {
  return new Proxy(clientInstance, {
    get(target, prop, receiver) {
      if (prop === "isAvailable") {
        return target.isAvailable;
      }
      
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "function") {
        return function (...args) {
          // If the client is disabled, bypass commands gracefully
          if (!target.isAvailable && prop !== "connect" && prop !== "on" && prop !== "duplicate" && prop !== "quit" && prop !== "disconnect") {
            if (prop === "mget" || prop === "mGet") return Promise.resolve([]);
            return Promise.resolve(null);
          }
          
          try {
            const result = value.apply(target, args);
            if (result instanceof Promise) {
              return result.catch((err) => {
                const errMsg = err.message || "";
                if (errMsg.includes("max requests limit exceeded") || errMsg.includes("limit exceeded") || errMsg.includes("Quota Exceeded")) {
                  target.isAvailable = false;
                  client.isAvailable = false; // Disable main client too
                  logger.error(`[Redis] Request limit exceeded. Disabling Redis client dynamically. Error: ${errMsg}`);
                  if (prop === "mget" || prop === "mGet") return [];
                  return null;
                }
                throw err;
              });
            }
            return result;
          } catch (err) {
            const errMsg = err.message || "";
            if (errMsg.includes("max requests limit exceeded") || errMsg.includes("limit exceeded") || errMsg.includes("Quota Exceeded")) {
              target.isAvailable = false;
              client.isAvailable = false;
              logger.error(`[Redis] Request limit exceeded. Disabling Redis client dynamically. Error: ${errMsg}`);
              if (prop === "mget" || prop === "mGet") return [];
              return null;
            }
            throw err;
          }
        };
      }
      return value;
    }
  });
};

const wrappedClient = wrapClient(client);
export default wrappedClient;
