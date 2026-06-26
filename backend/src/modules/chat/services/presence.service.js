/**
 * @file src/modules/chat/services/presence.service.js
 * @description Service to manage distributed user presence and online status in Redis.
 */

import redis from "../../../config/redis.js";
import logger from "../../../config/logger.js";

/**
 * Handle a new connection from a user device/tab
 * @param {string} userId - Employee/User ID
 * @param {string} companyId - Tenant/Company ID
 * @param {string} name - Employee Name
 * @param {string} avatar - Employee Avatar URL
 * @param {string} chatStatus - Employee chatStatus (e.g. available, busy)
 * @param {string} statusEmoji - Employee statusEmoji
 */
export const handleConnect = async (userId, companyId, name, avatar, chatStatus, statusEmoji) => {
  if (!redis.isAvailable) return;

  try {
    const connKey = `connections:user:${userId}`;
    const presenceKey = `presence:user:${userId}`;
    const companyKey = `presence:company:${companyId}`;

    // 1. Increment connection counter
    const count = await redis.incr(connKey);
    // Set 120s TTL on connection key to prevent leaks on crashed nodes
    await redis.expire(connKey, 120);

    // 2. Set user presence details (Online with 120s TTL)
    const data = {
      userId,
      companyId,
      name,
      avatar,
      status: "online",
      chatStatus: chatStatus || "available",
      statusEmoji: statusEmoji || null,
      lastSeen: Date.now(),
      isOnChatScreen: false
    };
    await redis.set(presenceKey, JSON.stringify(data), { EX: 120 });

    // 3. Add user to company online users Set
    await redis.sAdd(companyKey, userId);

    logger.debug(`[Presence] User ${userId} connected. Incremented connection count to ${count}.`);
    return count;
  } catch (err) {
    logger.error(`[Presence] Error in handleConnect for user ${userId}: ${err.message}`);
    return 1; // Fallback to treat as first connection/online
  }
};

/**
 * Refresh TTL for an online user's presence key (Heartbeat)
 * @param {string} userId - Employee/User ID
 */
export const handleHeartbeat = async (userId, companyId = null, name = null, avatar = null, chatStatus = null, statusEmoji = null) => {
  if (!redis.isAvailable) return;

  try {
    const presenceKey = `presence:user:${userId}`;
    const connKey = `connections:user:${userId}`;

    // Refresh TTL on connections key
    await redis.expire(connKey, 120);

    // Read the current data to preserve attributes
    const cached = await redis.get(presenceKey);
    if (cached) {
      const data = JSON.parse(cached);
      data.lastSeen = Date.now();
      data.status = "online";
      await redis.set(presenceKey, JSON.stringify(data), { EX: 120 });
    } else if (companyId) {
      // Recreate presence key if it expired or was evicted, but socket is still active
      const data = {
        userId,
        companyId,
        name,
        avatar,
        status: "online",
        chatStatus: chatStatus || "available",
        statusEmoji: statusEmoji || null,
        lastSeen: Date.now(),
        isOnChatScreen: false
      };
      await redis.set(presenceKey, JSON.stringify(data), { EX: 120 });

      const companyKey = `presence:company:${companyId}`;
      await redis.sAdd(companyKey, userId);

      logger.info(`[Presence] Recreated expired presence key during heartbeat for user ${userId}`);
    } else {
      // Fallback: set expiry on the key
      await redis.expire(presenceKey, 120);
    }
    logger.debug(`[Heartbeat] Refreshed presence TTL for user ${userId}`);
  } catch (err) {
    logger.error(`[Presence] Error in handleHeartbeat for user ${userId}: ${err.message}`);
  }
};

/**
 * Handle a disconnection from a user device/tab
 * @param {string} userId - Employee/User ID
 * @param {string} companyId - Tenant/Company ID
 * @returns {Promise<boolean>} True if the user is now fully offline, false if other connections exist.
 */
export const handleDisconnect = async (userId, companyId) => {
  if (!redis.isAvailable) return false;

  try {
    const connKey = `connections:user:${userId}`;
    const presenceKey = `presence:user:${userId}`;
    const companyKey = `presence:company:${companyId}`;

    // 1. Decrement connection counter
    let count = await redis.decr(connKey);

    // If key got lost or count is negative/zero, clean up
    if (count <= 0) {
      // 2. Update user presence to offline (Persistent - NO TTL)
      const lastSeen = Date.now();
      const cached = await redis.get(presenceKey);
      let offlineData = {
        userId,
        companyId,
        status: "offline",
        lastSeen
      };
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          offlineData = {
            ...parsed,
            status: "offline",
            lastSeen
          };
        } catch (e) {
          // ignore parsing error
        }
      }
      
      await redis.set(presenceKey, JSON.stringify(offlineData));

      // 3. Remove from company online users Set
      await redis.sRem(companyKey, userId);

      // 4. Delete connection count key to clean up
      await redis.del(connKey);

      logger.debug(`[Presence] User ${userId} is now fully offline.`);
      return true;
    }

    // Refresh remaining connection count TTL to prevent leaks
    await redis.expire(connKey, 120);

    logger.debug(`[Presence] User ${userId} disconnected from one connection. Remaining: ${count}`);
    return false;
  } catch (err) {
    logger.error(`[Presence] Error in handleDisconnect for user ${userId}: ${err.message}`);
    return false;
  }
};

/**
 * Retrieve current presence and lastSeen for a user
 * @param {string} userId - Employee/User ID
 * @returns {Promise<object>} Presence status object
 */
export const getUserPresence = async (userId) => {
  if (!redis.isAvailable) {
    return { userId, status: "offline", lastSeen: null };
  }

  try {
    const presenceKey = `presence:user:${userId}`;
    const data = await redis.get(presenceKey);
    if (data) {
      return JSON.parse(data);
    }
    return { userId, status: "offline", lastSeen: null };
  } catch (err) {
    logger.error(`[Presence] Error fetching getUserPresence for user ${userId}: ${err.message}`);
    return { userId, status: "offline", lastSeen: null };
  }
};

/**
 * Retrieve all online users and count for a company
 * @param {string} companyId - Tenant/Company ID
 * @returns {Promise<object>} Count and list of online presence objects
 */
export const getCompanyOnlineUsers = async (companyId) => {
  if (!redis.isAvailable) {
    return { onlineUsers: 0, users: [] };
  }

  try {
    const companyKey = `presence:company:${companyId}`;
    const userIds = await redis.sMembers(companyKey);

    if (!userIds || userIds.length === 0) {
      return { onlineUsers: 0, users: [] };
    }

    // Fetch user details in parallel using MGET
    const keys = userIds.map(id => `presence:user:${id}`);
    const values = await redis.mGet(keys);

    const users = [];
    values.forEach((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed.status === "online") {
            users.push(parsed);
          }
        } catch (e) {
          logger.warn(`[Presence] Failed to parse presence data for company list: ${e.message}`);
        }
      }
    });

    return {
      onlineUsers: users.length,
      users
    };
  } catch (err) {
    logger.error(`[Presence] Error in getCompanyOnlineUsers for company ${companyId}: ${err.message}`);
    return { onlineUsers: 0, users: [] };
  }
};

export default {
  handleConnect,
  handleHeartbeat,
  handleDisconnect,
  getUserPresence,
  getCompanyOnlineUsers
};
