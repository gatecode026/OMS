/**
 * @file src/modules/chat/services/readReceipt.service.js
 * @description Service to manage message delivery and read receipts via Redis (hot cache) and MongoDB (asynchronous persistence).
 */

import redis from "../../../config/redis.js";
import logger from "../../../config/logger.js";
import Message from "../message.model.js";
import Conversation from "../conversation.model.js";
import { runWithTenant } from "../../../utils/tenantContext.js";
import { getIO } from "../../../config/socket.js";

/**
 * Marks a message as delivered to a user
 * @param {string} messageId - Message ID
 * @param {string} userId - Employee/User ID (who received the message)
 * @param {string} companyId - Tenant/Company ID
 */
export const markMessageDelivered = async (messageId, userId, companyId) => {
  try {
    // 1. Check/Store in Redis Cache
    if (redis.isAvailable) {
      const deliveryKey = `delivery:${messageId}`;
      const isAlreadyDelivered = await redis.sIsMember(deliveryKey, userId);
      if (isAlreadyDelivered) {
        return; // Already marked as delivered, ignore to prevent duplicate updates
      }
      await redis.sAdd(deliveryKey, userId);
      await redis.expire(deliveryKey, 86400); // 24-hour TTL
    }

    // 2. Perform MongoDB updates asynchronously
    await runWithTenant(companyId, async () => {
      const msg = await Message.findOne({ id: messageId });
      if (!msg) {
        logger.warn(`[ReadReceipt] Message ${messageId} not found in DB`);
        return;
      }

      // Check if user has already received it
      const alreadyDelivered = msg.deliveredTo?.some(d => d.employeeId === userId);
      if (!alreadyDelivered) {
        const deliveredAt = new Date();
        
        await Message.updateOne(
          { id: messageId },
          {
            $push: {
              deliveredTo: {
                employeeId: userId,
                deliveredAt
              }
            },
            $set: {
              'deliveryStatus.deliveredAt': msg.deliveryStatus?.deliveredAt || deliveredAt
            }
          }
        );

        // Notify the sender
        const io = getIO();
        if (io) {
          const senderRoom = `user:${msg.senderId}`;
          const deliveryUpdatePayload = {
            messageId,
            conversationId: msg.conversationId,
            userId,
            deliveredAt
          };

          const senderSockets = await io.in(senderRoom).fetchSockets();
          if (senderSockets.length > 0) {
            io.to(senderRoom).emit('message:delivery_update', deliveryUpdatePayload);
            logger.debug(`[ReadReceipt] Emitted message:delivery_update for ${messageId} to sender ${msg.senderId}`);
          } else {
            // Sender is offline, queue the delivery receipt
            if (redis.isAvailable) {
              const pendingKey = `pending_delivery:${msg.senderId}`;
              const receipt = {
                type: 'delivery_update',
                payload: deliveryUpdatePayload
              };
              await redis.rPush(pendingKey, JSON.stringify(receipt));
              logger.debug(`[ReadReceipt] Queued pending delivery update for offline sender ${msg.senderId}`);
            }
          }
        }
      }
    });
  } catch (err) {
    logger.error(`[ReadReceipt] Error in markMessageDelivered for message ${messageId} to user ${userId}: ${err.message}`);
  }
};

/**
 * Marks a conversation as read by a user
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - Employee/User ID (who read the messages)
 * @param {string} userName - Employee Name
 * @param {string} lastReadMessageId - ID of the last message read
 * @param {string} companyId - Tenant/Company ID
 */
export const markConversationRead = async (conversationId, userId, userName, lastReadMessageId, companyId) => {
  try {
    const now = new Date();

    // 1. Store in Redis Cache
    if (redis.isAvailable) {
      const readKey = `read:${conversationId}:${userId}`;
      await redis.set(readKey, lastReadMessageId, { EX: 2592000 }); // 30-day TTL

      // 2. Clear unread counts in Redis
      const unreadKey = `unread:${userId}:${conversationId}`;
      await redis.del(unreadKey);
    }

    // 3. Asynchronously update MongoDB
    await runWithTenant(companyId, async () => {
      // Add readBy to all unread messages in this conversation
      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: userId },
          isDeleted: false,
          'readBy.employeeId': { $ne: userId }
        },
        {
          $push: {
            readBy: {
              userId,
              employeeId: userId,
              name: userName,
              readAt: now
            }
          }
        }
      );

      // Update participant's lastReadAt in Conversation
      await Conversation.findOneAndUpdate(
        {
          id: conversationId,
          'participants.employeeId': userId
        },
        {
          $set: {
            'participants.$.lastReadAt': now
          }
        }
      );

      // Broadcast update to the conversation room and personal room (for multi-device sync)
      const io = getIO();
      if (io) {
        const readUpdatePayload = {
          conversationId,
          userId,
          lastReadMessageId,
          readAt: now
        };

        // Broadcast to the conversation room
        io.to(`conv:${conversationId}`).emit('conversation:read_update', readUpdatePayload);

        // Emit to the reading user's personal room for other active devices
        io.to(`user:${userId}`).emit('conversation:read_update', readUpdatePayload);

        // Also, for backwards compatibility with the existing UI client which expects 'messages_read'
        io.to(`conv:${conversationId}`).emit('messages_read', {
          conversationId,
          readBy: [{ employeeId: userId, name: userName, readAt: now }]
        });

        logger.debug(`[ReadReceipt] Emitted conversation:read_update for conv ${conversationId} by user ${userId}`);
      }
    });
  } catch (err) {
    logger.error(`[ReadReceipt] Error in markConversationRead for conv ${conversationId} by user ${userId}: ${err.message}`);
  }
};

/**
 * Increments unread count for all other participants of a conversation in Redis
 * @param {string} conversationId - Conversation ID
 * @param {string} senderId - Sender Employee ID
 * @param {string} companyId - Tenant/Company ID
 */
export const incrementUnreadCounts = async (conversationId, senderId, companyId) => {
  if (!redis.isAvailable) return;
  try {
    await runWithTenant(companyId, async () => {
      const conv = await Conversation.findOne(
        { id: conversationId },
        { projection: { participants: 1 } }
      );
      if (!conv) return;

      for (const participant of conv.participants) {
        if (participant.employeeId !== senderId) {
          const unreadKey = `unread:${participant.employeeId}:${conversationId}`;
          await redis.incr(unreadKey);
        }
      }
    });
  } catch (err) {
    logger.error(`[ReadReceipt] Error in incrementUnreadCounts for conv ${conversationId}: ${err.message}`);
  }
};

/**
 * Retrieves unread count for a user in a conversation (Redis first, fallback to MongoDB)
 * @param {string} userId - Employee/User ID
 * @param {string} conversationId - Conversation ID
 * @param {Date} unreadAfterDate - Date threshold for unread messages
 * @param {string} companyId - Tenant/Company ID
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async (userId, conversationId, unreadAfterDate, companyId) => {
  try {
    if (redis.isAvailable) {
      const unreadKey = `unread:${userId}:${conversationId}`;
      const cached = await redis.get(unreadKey);
      if (cached !== null && cached !== undefined) {
        return parseInt(cached, 10);
      }
    }

    // Fallback to MongoDB count
    return await runWithTenant(companyId, async () => {
      const count = await Message.countDocuments({
        conversationId,
        senderId: { $ne: userId },
        isDeleted: false,
        createdAt: { $gt: unreadAfterDate }
      });

      if (redis.isAvailable) {
        const unreadKey = `unread:${userId}:${conversationId}`;
        await redis.set(unreadKey, count);
      }

      return count;
    });
  } catch (err) {
    logger.error(`[ReadReceipt] Error fetching getUnreadCount for user ${userId} in conv ${conversationId}: ${err.message}`);
    return 0;
  }
};

/**
 * Flushes all pending delivery receipts for a newly reconnected user
 * @param {string} userId - Employee/User ID
 * @param {object} socket - Socket instance
 */
export const flushPendingDeliveries = async (userId, socket) => {
  if (!redis.isAvailable) return;
  try {
    const pendingKey = `pending_delivery:${userId}`;
    const items = await redis.lRange(pendingKey, 0, -1);
    if (items && items.length > 0) {
      logger.info(`[ReadReceipt] Flushing ${items.length} pending delivery receipts for user ${userId}`);
      for (const item of items) {
        try {
          const receipt = JSON.parse(item);
          if (receipt.type === 'delivery_update') {
            socket.emit('message:delivery_update', receipt.payload);
          }
        } catch (parseErr) {
          logger.warn(`[ReadReceipt] Failed to parse pending receipt: ${parseErr.message}`);
        }
      }
      await redis.del(pendingKey);
    }
  } catch (err) {
    logger.error(`[ReadReceipt] Error flushing pending deliveries for user ${userId}: ${err.message}`);
  }
};

export default {
  markMessageDelivered,
  markConversationRead,
  incrementUnreadCounts,
  getUnreadCount,
  flushPendingDeliveries
};
