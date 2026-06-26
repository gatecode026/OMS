/**
 * @file src/modules/chat/services/typing.service.js
 * @description Service to manage distributed user typing state in Redis.
 */
import redis from "../../../config/redis.js";
import logger from "../../../config/logger.js";
/**
 * Handle a typing start event from a user tab/device
 * @param {string} userId - Employee/User ID
 * @param {string} companyId - Tenant/Company ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<boolean>} True if this is the user's first active typing tab in this conversation.
 */
export const handleTypingStart = async (userId, companyId, conversationId) => {
  if (!redis.isAvailable) return false;
  try {
    const activeTypersKey = `typing:conversation:${conversationId}`;
    const userSessionKey = `typing:user:${userId}:conv:${conversationId}`;

    // 1. Add user to conversation's active typers Set
    await redis.sAdd(activeTypersKey, userId);
    await redis.expire(activeTypersKey, 5); // Entire set expires in 5s if not refreshed

    // 2. Increment user tab session counter for this conversation
    const count = await redis.incr(userSessionKey);
    await redis.expire(userSessionKey, 5); // Counter expires in 5s if not refreshed

    logger.debug(`[Typing] User ${userId} started typing in ${conversationId}. Active sessions: ${count}`);
    return count === 1;
  } catch (err) {
    logger.error(`[Typing] Error in handleTypingStart for user ${userId} in ${conversationId}: ${err.message}`);
    return false;
  }
};

/**
 * Handle a typing stop event from a user tab/device
 * @param {string} userId - Employee/User ID
 * @param {string} companyId - Tenant/Company ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<boolean>} True if the user is now fully stopped typing (no active typing tabs left).
 */
export const handleTypingStop = async (userId, companyId, conversationId) => {
  if (!redis.isAvailable) return false;

  try {
    const activeTypersKey = `typing:conversation:${conversationId}`;
    const userSessionKey = `typing:user:${userId}:conv:${conversationId}`;

    // 1. Decrement user tab session counter
    let count = await redis.decr(userSessionKey);

    // If key expired or count is non-positive, clean up
    if (count <= 0) {
      await redis.sRem(activeTypersKey, userId);
      await redis.del(userSessionKey);
      logger.debug(`[Typing] User ${userId} fully stopped typing in ${conversationId}.`);
      return true;
    }

    logger.debug(`[Typing] User ${userId} stopped typing on one tab in ${conversationId}. Remaining: ${count}`);
    return false;
  } catch (err) {
    logger.error(`[Typing] Error in handleTypingStop for user ${userId} in ${conversationId}: ${err.message}`);
    return false;
  }
};

/**
 * Refresh the TTL of typing keys in Redis
 * @param {string} userId - Employee/User ID
 * @param {string} conversationId - Conversation ID
 */
export const refreshTyping = async (userId, conversationId) => {
  if (!redis.isAvailable) return;
  try {
    const activeTypersKey = `typing:conversation:${conversationId}`;
    const userSessionKey = `typing:user:${userId}:conv:${conversationId}`;

    await redis.expire(activeTypersKey, 5);
    await redis.expire(userSessionKey, 5);
  } catch (err) {
    logger.error(`[Typing] Error in refreshTyping for user ${userId} in ${conversationId}: ${err.message}`);
  }
};

export default {
  handleTypingStart,
  handleTypingStop,
  refreshTyping
};
