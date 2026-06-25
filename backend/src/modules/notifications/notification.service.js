/**
 * @file src/modules/notifications/notification.service.js
 * @description Core service logic for the Enterprise Notification Engine using Redis (hot path) and MongoDB (persistence).
 */

import Notification from './notification.model.js';
import redis from '../../config/redis.js';
import logger from '../../config/logger.js';
import { getIO } from '../../config/socket.js';
import { runWithTenant } from '../../utils/tenantContext.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';

// Cache TTL: 30 days for offline recovery queues
const QUEUE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const MAX_QUEUE_LIMIT = 1000;

/**
 * Creates a notification, stores it in MongoDB and Redis queue, increments unread counter, and emits Socket event.
 */
export const createNotification = async (userId, companyId, { type, title, message, data = {} }) => {
  return runWithTenant(companyId, async () => {
    try {
      const conn = await getTenantConnection(companyId);
      const NotificationModel = conn.models['Notification'] || conn.model('Notification', Notification.schema);

      // 1. Persist to MongoDB
      const notifDoc = await NotificationModel.create({
        userId,
        companyId,
        type,
        title,
        message,
        data,
        isRead: false,
        read: false
      });

      const payload = {
        id: notifDoc._id.toString(),
        type,
        title,
        message,
        data,
        isRead: false,
        createdAt: notifDoc.createdAt
      };

      // 2. Write to Redis List Queue for offline recovery
      if (redis.isAvailable) {
        const queueKey = `notifications:user:${userId}`;
        const countKey = `notification_count:${userId}`;

        // Add to Redis list (LPUSH)
        await redis.lPush(queueKey, JSON.stringify(payload));
        // Trim list to maximum of 1000 items (LTRIM)
        await redis.lTrim(queueKey, 0, MAX_QUEUE_LIMIT - 1);
        // Set TTL on queue to prevent memory leak
        await redis.expire(queueKey, QUEUE_TTL);

        // Increment unread count (INCR)
        await redis.incr(countKey);
      }

      // 3. Emit real-time Socket event to user's room
      try {
        const io = getIO();
        io.to(`user:${userId}`).emit('notification:new', payload);
      } catch (ioErr) {
        logger.debug(`[Notification Service] Socket.io not initialized or unavailable: ${ioErr.message}`);
      }

      return notifDoc;
    } catch (err) {
      logger.error(`[Notification Service] Failed to create notification for user ${userId}:`, err);
      throw err;
    }
  });
};

/**
 * Retrieves unread notification counter for a user (Redis hot path with MongoDB fallback).
 */
export const getUnreadCount = async (userId, companyId) => {
  if (redis.isAvailable) {
    const countKey = `notification_count:${userId}`;
    const cached = await redis.get(countKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }
  }

  // Fallback to MongoDB
  return runWithTenant(companyId, async () => {
    const conn = await getTenantConnection(companyId);
    const NotificationModel = conn.models['Notification'] || conn.model('Notification', Notification.schema);
    const count = await NotificationModel.countDocuments({ userId, isRead: false });
    
    // Seed Redis cache
    if (redis.isAvailable) {
      const countKey = `notification_count:${userId}`;
      await redis.set(countKey, count.toString(), { EX: 86400 }); // 24 hours
    }
    return count;
  });
};

/**
 * Resets unread counter for a user.
 */
export const resetUnreadCount = async (userId) => {
  if (redis.isAvailable) {
    const countKey = `notification_count:${userId}`;
    await redis.set(countKey, '0');
  }
};

/**
 * Fetches notifications for a user from MongoDB (paginated).
 */
export const getNotifications = async (userId, companyId, page = 1, limit = 20, typeFilter = null) => {
  return runWithTenant(companyId, async () => {
    const conn = await getTenantConnection(companyId);
    const NotificationModel = conn.models['Notification'] || conn.model('Notification', Notification.schema);

    const query = { userId };
    if (typeFilter && typeFilter !== 'all') {
      // Map categories to model type
      query.type = typeFilter;
    }

    const skip = (page - 1) * limit;
    const items = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await NotificationModel.countDocuments(query);

    return {
      notifications: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  });
};

/**
 * Sync offline notifications missed during disconnection.
 */
export const syncOfflineNotifications = async (userId) => {
  if (redis.isAvailable) {
    const queueKey = `notifications:user:${userId}`;
    const items = await redis.lRange(queueKey, 0, -1);
    return items.map(item => JSON.parse(item));
  }
  return [];
};

/**
 * Marks a specific notification as read.
 */
export const markAsRead = async (id, userId, companyId) => {
  return runWithTenant(companyId, async () => {
    const conn = await getTenantConnection(companyId);
    const NotificationModel = conn.models['Notification'] || conn.model('Notification', Notification.schema);

    const doc = await NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true, read: true } },
      { new: true }
    );

    // Update unread count in Redis
    if (doc) {
      if (redis.isAvailable) {
        const countKey = `notification_count:${userId}`;
        const count = await redis.get(countKey);
        if (count && parseInt(count, 10) > 0) {
          await redis.decr(countKey);
        }
      }
    }
    return doc;
  });
};

/**
 * Marks all notifications as read for a user.
 */
export const markAllAsRead = async (userId, companyId) => {
  return runWithTenant(companyId, async () => {
    const conn = await getTenantConnection(companyId);
    const NotificationModel = conn.models['Notification'] || conn.model('Notification', Notification.schema);

    await NotificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, read: true } }
    );

    // Reset Redis unread counter
    await resetUnreadCount(userId);
    return { success: true };
  });
};

/**
 * Broadcasts an announcement to all company users (scalable via pipeline/batching).
 */
export const broadcastAnnouncement = async (companyId, senderId, title, message, data = {}) => {
  return runWithTenant(companyId, async () => {
    try {
      const conn = await getTenantConnection(companyId);
      const NotificationModel = conn.models['Notification'] || conn.model('Notification', Notification.schema);
      
      // 1. Fetch all company employees
      const employees = await conn.collection('employees').find({ workStatus: { $ne: 'Terminated' } }).toArray();
      const employeeIds = employees.map(emp => emp.id);

      // 2. Batch insert notifications to MongoDB
      const notificationDocs = employeeIds.map(empId => ({
        userId: empId,
        companyId,
        type: 'announcement',
        title,
        message,
        data: { ...data, senderId },
        isRead: false,
        read: false
      }));

      await NotificationModel.insertMany(notificationDocs);

      // 3. Write to Redis List and increment counter in batches using Redis pipeline if available
      if (redis.isAvailable) {
        const multi = redis.multi();
        employeeIds.forEach(empId => {
          const queueKey = `notifications:user:${empId}`;
          const countKey = `notification_count:${empId}`;
          const payload = {
            type: 'announcement',
            title,
            message,
            data: { ...data, senderId },
            isRead: false,
            createdAt: new Date().toISOString()
          };

          multi.lPush(queueKey, JSON.stringify(payload));
          multi.lTrim(queueKey, 0, MAX_QUEUE_LIMIT - 1);
          multi.expire(queueKey, QUEUE_TTL);
          multi.incr(countKey);
        });
        await multi.exec();
      }

      // 4. Broadcast via Socket.IO to the whole company room
      try {
        const io = getIO();
        io.to(`company:${companyId}`).emit('notification:new', {
          type: 'announcement',
          title,
          message,
          data: { ...data, senderId },
          isRead: false,
          createdAt: new Date()
        });
      } catch (ioErr) {
        logger.debug(`[Notification Service] Socket.io not initialized: ${ioErr.message}`);
      }

      return { success: true, count: employeeIds.length };
    } catch (err) {
      logger.error('[Notification Service] Broadcast announcement failed:', err);
      throw err;
    }
  });
};

export default {
  createNotification,
  getUnreadCount,
  resetUnreadCount,
  getNotifications,
  syncOfflineNotifications,
  markAsRead,
  markAllAsRead,
  broadcastAnnouncement
};
