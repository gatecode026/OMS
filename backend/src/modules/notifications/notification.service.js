/**
 * @file src/modules/notifications/notification.service.js
 * @description Enterprise Notification Engine — Core Service Layer.
 *
 *   Architecture:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │  Event (message / mention / task / reaction / group / etc.)      │
 *   │         │                                                         │
 *   │         ▼                                                         │
 *   │  createNotification(userId, companyId, payload)                  │
 *   │         │                                                         │
 *   │  ┌──────┴──────────────────────────────────────┐                 │
 *   │  │  MongoDB INSERT          Redis LPUSH+INCR    │                 │
 *   │  │  (persistent history)    (hot path queue)    │                 │
 *   │  └──────────────────────────────┬───────────────┘                 │
 *   │                                 │                                  │
 *   │                         Socket.IO emit                             │
 *   │                    'notification:new' → user:{userId}             │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 *   Offline Recovery:
 *     Redis Key: notifications:user:{userId}  (FIFO list, max 1000)
 *     On reconnect: server auto-emits 'notification:sync' with queue
 *
 *   Unread Counter:
 *     Redis Key: notification_count:{userId}  (INCR/DECR/SET)
 *
 *   Preferences:
 *     Redis Key: notif_prefs:{userId}  (JSON, 30-day TTL)
 *
 *   Broadcast:
 *     Redis Pipeline batches LPUSH + INCR for thousands of users
 */

import mongoose from 'mongoose';
import Employee from '../employees/employees.model.js';
import Notification, { deriveCategory } from './notification.model.js';
import redis from '../../config/redis.js';
import logger from '../../config/logger.js';
import { getIO } from '../../config/socket.js';
import { runWithTenant } from '../../utils/tenantContext.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

/** 30 days: offline queue TTL prevents unbounded Redis memory growth */
const QUEUE_TTL = 30 * 24 * 60 * 60;

/** Maximum notifications stored per user in Redis queue */
const MAX_QUEUE_LIMIT = 1000;

/** 30 days: preference TTL */
const PREFS_TTL = 30 * 24 * 60 * 60;

/**
 * Notification types with high priority.
 * These increment unread count and appear first in the notification center.
 */
const HIGH_PRIORITY_TYPES = new Set(['mention', 'group_mention', 'announcement', 'broadcast']);

/**
 * Default notification preferences for a user.
 * All enabled by default — users opt-out, not opt-in.
 */
const DEFAULT_PREFERENCES = {
  messages: true,
  mentions: true,
  announcements: true,
  broadcasts: true,
  tasks: true,
  meetings: true,
  files: true,
  reactions: true,
  group: true,
  system: true,
  emailNotifications: false, // future
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

/**
 * Get or create tenant-scoped Notification model.
 * @param {string} companyId
 * @returns {Promise<Model>}
 */
const getNotificationModel = async (companyId) => {
  const conn = await getTenantConnection(companyId);
  return conn.models['Notification'] || conn.model('Notification', Notification.schema);
};

/**
 * Determine if a notification type is allowed by user's preferences.
 * @param {object} prefs - User preferences object
 * @param {string} type - Notification type
 */
const isAllowedByPrefs = (prefs, type) => {
  if (!prefs) return true; // No preferences stored → allow all
  const t = type.toLowerCase();
  if (t.includes('message') || t === 'chat_invitation') return prefs.messages !== false;
  if (t.includes('mention')) return prefs.mentions !== false;
  if (t === 'announcement') return prefs.announcements !== false;
  if (t === 'broadcast') return prefs.broadcasts !== false;
  if (t.includes('task')) return prefs.tasks !== false;
  if (t === 'meeting') return prefs.meetings !== false;
  if (t === 'file') return prefs.files !== false;
  if (t === 'reaction') return prefs.reactions !== false;
  if (t.includes('group') || t.includes('user_added') || t.includes('user_removed')) return prefs.group !== false;
  if (t === 'system') return prefs.system !== false;
  return true;
};

// ── CORE: CREATE NOTIFICATION ─────────────────────────────────────────────────

/**
 * Creates a notification with guaranteed delivery:
 *  1. Persist to MongoDB (history / pagination source)
 *  2. Push to Redis List (offline queue recovery)
 *  3. Increment Redis unread counter
 *  4. Emit real-time Socket.IO event if user is online
 *
 * @param {string} userId        - Target user's employee ID
 * @param {string} companyId     - Tenant company ID
 * @param {object} payload
 * @param {string} payload.type  - Notification type (see VALID_TYPES in model)
 * @param {string} payload.title - Short title shown in bell dropdown
 * @param {string} payload.message - Full message body
 * @param {object} [payload.data]  - Arbitrary context data
 * @param {string} [payload.priority] - 'normal' | 'high' (auto-derived if omitted)
 * @returns {Promise<Document>} The created MongoDB notification document
 */
export const createNotification = async (userId, companyId, { type, title, message, data = {}, priority }) => {
  return runWithTenant(companyId, async () => {
    try {
      const NotificationModel = await getNotificationModel(companyId);

      // Check user preferences (Redis-cached)
      const prefs = await getUserPreferences(userId);
      if (!isAllowedByPrefs(prefs, type)) {
        logger.debug(`[Notification] Suppressed ${type} notification for user ${userId} (preference disabled)`);
        return null;
      }

      const effectivePriority = priority || (HIGH_PRIORITY_TYPES.has(type) ? 'high' : 'normal');
      const category = deriveCategory(type);

      // ── DUPLICATE PREVENTION ───────────────────────────────────────────────
      // Uniquely identify by: Recipient User (userId) + Type (type) + Entity ID + Action
      const entityId = data.taskId || data.meetingId || data.leaveId || data.conversationId || data.entityId || data.id || '';
      const action = data.action || type || '';

      if (entityId) {
        const query = {
          userId,
          companyId,
          type,
          $or: [
            { 'data.taskId': entityId },
            { 'data.meetingId': entityId },
            { 'data.leaveId': entityId },
            { 'data.conversationId': entityId },
            { 'data.entityId': entityId }
          ]
        };
        if (action) {
          query['data.action'] = action;
        }

        const existing = await NotificationModel.findOne(query).lean();
        if (existing) {
          logger.info(`[Notification Engine] Suppressed duplicate notification for user ${userId}, entity ${entityId}, action ${action}`);
          return existing;
        }
      }

      // Short 5-second debounce check on Title + Message + Recipient to prevent fast retries
      const sameRecent = await NotificationModel.findOne({
        userId,
        companyId,
        type,
        title,
        message,
        createdAt: { $gte: new Date(Date.now() - 5000) }
      }).lean();
      if (sameRecent) {
        logger.info(`[Notification Engine] Suppressed identical notification within 5s window for user ${userId}`);
        return sameRecent;
      }

      // 1. Persist to MongoDB
      const notifDoc = await NotificationModel.create({
        userId,
        companyId,
        type,
        category,
        title,
        message,
        data,
        priority: effectivePriority,
        isRead: false,
        read: false,
      });

      const payload = {
        id: notifDoc._id.toString(),
        type,
        category,
        title,
        message,
        data,
        priority: effectivePriority,
        isRead: false,
        createdAt: notifDoc.createdAt,
      };

      // 2. Redis hot path: queue + counter
      if (redis.isAvailable) {
        const queueKey = `notifications:user:${userId}`;
        const countKey = `notification_count:${userId}`;

        try {
          const multi = redis.multi();
          multi.lPush(queueKey, JSON.stringify(payload));
          multi.lTrim(queueKey, 0, MAX_QUEUE_LIMIT - 1);
          multi.expire(queueKey, QUEUE_TTL);
          multi.incr(countKey);
          await multi.exec();
        } catch (redisErr) {
          logger.warn(`[Notification] Redis write failed for user ${userId}: ${redisErr.message}`);
        }
      }

      // 3. Real-time Socket.IO delivery
      try {
        const io = getIO();
        io.to(`user:${userId}`).emit('notification:new', payload);

        // Push updated unread count to sync counts immediately
        const newCount = await getUnreadCount(userId, companyId);
        io.to(`user:${userId}`).emit('notification:unread_count', { count: newCount });
      } catch (ioErr) {
        logger.debug(`[Notification] Socket.IO unread count emit failed: ${ioErr.message}`);
      }

      logger.debug(`[Notification] Created ${type} notification for user ${userId}`);
      return notifDoc;
    } catch (err) {
      logger.error(`[Notification] Failed to create notification for user ${userId}:`, err);
      throw err;
    }
  });
};

// ── TYPE-SPECIFIC CONVENIENCE WRAPPERS ─────────────────────────────────────────

/**
 * Create a mention notification (high priority).
 */
export const createMentionNotification = (userId, companyId, { senderName, conversationName, conversationId, messageId, content }) => {
  return createNotification(userId, companyId, {
    type: 'mention',
    title: `@Mentioned by ${senderName}`,
    message: content ? content.substring(0, 150) : `${senderName} mentioned you`,
    data: { conversationId, messageId, senderName },
    priority: 'high',
  });
};

/**
 * Create a group mention notification (@all / @everyone).
 */
export const createGroupMentionNotification = (userId, companyId, { senderName, groupName, conversationId, messageId }) => {
  return createNotification(userId, companyId, {
    type: 'group_mention',
    title: `@everyone in ${groupName}`,
    message: `${senderName} mentioned everyone in ${groupName}`,
    data: { conversationId, messageId, senderName },
    priority: 'high',
  });
};

/**
 * Create a message notification.
 */
export const createMessageNotification = (userId, companyId, { senderName, conversationName, conversationId, messageId, preview }) => {
  return createNotification(userId, companyId, {
    type: 'message',
    title: conversationName ? `New message in ${conversationName}` : `New message from ${senderName}`,
    message: preview || `${senderName} sent a message`,
    data: { conversationId, messageId, senderName },
    priority: 'normal',
  });
};

/**
 * Create a reaction notification.
 */
export const createReactionNotification = (userId, companyId, { reactorName, emoji, messageId, conversationId }) => {
  return createNotification(userId, companyId, {
    type: 'reaction',
    title: `${reactorName} reacted to your message`,
    message: `${reactorName} reacted with ${emoji || '👍'}`,
    data: { conversationId, messageId, reactorName, emoji },
    priority: 'normal',
  });
};

/**
 * Create a group membership notification.
 */
export const createGroupNotification = (userId, companyId, { action, groupName, actorName, conversationId }) => {
  const isAdded = action === 'added';
  return createNotification(userId, companyId, {
    type: isAdded ? 'user_added' : 'user_removed',
    title: isAdded ? `Added to ${groupName}` : `Removed from ${groupName}`,
    message: isAdded
      ? `${actorName} added you to ${groupName}`
      : `${actorName} removed you from ${groupName}`,
    data: { conversationId, groupName, actorName },
    priority: 'normal',
  });
};

/**
 * Create a task assigned notification.
 */
export const createTaskNotification = (userId, companyId, { action, taskTitle, assignerName, taskId }) => {
  const isAssigned = action === 'assigned';
  return createNotification(userId, companyId, {
    type: isAssigned ? 'task_assigned' : 'task_updated',
    title: isAssigned ? `Task Assigned: ${taskTitle}` : `Task Updated: ${taskTitle}`,
    message: isAssigned
      ? `${assignerName} assigned you a task`
      : `${assignerName} updated the task`,
    data: { taskId, taskTitle, assignerName },
    priority: 'normal',
  });
};

/**
 * Create a system notification.
 */
export const createSystemNotification = (userId, companyId, { title, message, data }) => {
  return createNotification(userId, companyId, {
    type: 'system',
    title,
    message,
    data: data || {},
    priority: 'normal',
  });
};

// ── UNREAD COUNTER ────────────────────────────────────────────────────────────

/**
 * Retrieves unread notification counter.
 * Redis hot path → MongoDB fallback.
 */
export const getUnreadCount = async (userId, companyId) => {
  if (redis.isAvailable) {
    try {
      const countKey = `notification_count:${userId}`;
      const cached = await redis.get(countKey);
      if (cached !== null) return parseInt(cached, 10);
    } catch (err) {
      logger.warn(`[Notification] Redis getUnreadCount error: ${err.message}`);
    }
  }

  // MongoDB fallback + seed Redis
  return runWithTenant(companyId, async () => {
    const NotificationModel = await getNotificationModel(companyId);
    const count = await NotificationModel.countDocuments({
      $and: [
        {
          $or: [
            { userId },
            { recipientId: userId },
            { forUserId: userId },
            { targetUserId: userId },
            { 
              $and: [
                { userId: { $in: [null, ""] } },
                { recipientId: { $in: [null, ""] } },
                { forUserId: { $in: [null, ""] } }
              ]
            }
          ]
        },
        {
          $or: [
            { isRead: false },
            { read: false }
          ]
        }
      ]
    });

    if (redis.isAvailable) {
      try {
        const countKey = `notification_count:${userId}`;
        await redis.set(countKey, count.toString(), { EX: 86400 }); // 24h cache
      } catch (err) {
        logger.warn(`[Notification] Failed to seed Redis unread count: ${err.message}`);
      }
    }
    return count;
  });
};

/**
 * Resets unread counter to 0 (called when user opens Notification Center).
 */
export const resetUnreadCount = async (userId) => {
  if (redis.isAvailable) {
    try {
      const countKey = `notification_count:${userId}`;
      await redis.set(countKey, '0');
    } catch (err) {
      logger.warn(`[Notification] Redis resetUnreadCount error: ${err.message}`);
    }
  }
};

// ── OFFLINE QUEUE SYNC ────────────────────────────────────────────────────────

/**
 * Fetches all queued notifications from Redis for a user.
 * Called on socket reconnect to deliver missed notifications.
 *
 * NOTE: Queue is NOT cleared after sync — it acts as a rolling window.
 *       The frontend handles deduplication by notification `id`.
 *       Max 1000 items; entries expire after 30 days via TTL.
 *
 * @param {string} userId
 * @returns {Promise<object[]>} Array of notification payloads
 */
export const syncOfflineNotifications = async (userId) => {
  if (!redis.isAvailable) return [];
  try {
    const queueKey = `notifications:user:${userId}`;
    const items = await redis.lRange(queueKey, 0, 99); // Return latest 100 for reconnect sync
    return items.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    logger.error(`[Notification] syncOfflineNotifications error for user ${userId}:`, err);
    return [];
  }
};

// ── PAGINATED FETCH ───────────────────────────────────────────────────────────

/**
 * Fetches notifications from MongoDB (paginated).
 * Supports category-based filtering for the full Notification Center.
 *
 * @param {string} userId
 * @param {string} companyId
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @param {string|null} [categoryFilter] - 'all' or a category value
 * @returns {Promise<{notifications, pagination}>}
 */
export const getNotifications = async (userId, companyId, page = 1, limit = 20, categoryFilter = null) => {
  return runWithTenant(companyId, async () => {
    const NotificationModel = await getNotificationModel(companyId);

    const query = {
      $and: [
        {
          $or: [
            { userId },
            { recipientId: userId },
            { forUserId: userId },
            { targetUserId: userId },
            { 
              $and: [
                { userId: { $in: [null, ""] } },
                { recipientId: { $in: [null, ""] } },
                { forUserId: { $in: [null, ""] } }
              ]
            }
          ]
        }
      ]
    };

    if (categoryFilter && categoryFilter !== 'all') {
      // Support both category field and type field for backwards compatibility
      query.$and.push({
        $or: [
          { category: categoryFilter },
          { type: categoryFilter },
        ]
      });
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(query),
    ]);

    return {
      notifications: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    };
  });
};

// ── MARK READ ─────────────────────────────────────────────────────────────────

/**
 * Marks a single notification as read.
 * Decrements Redis unread counter (never goes below 0).
 */
export const markAsRead = async (id, userId, companyId) => {
  return runWithTenant(companyId, async () => {
    const NotificationModel = await getNotificationModel(companyId);

    const doc = await NotificationModel.findOneAndUpdate(
      { 
        _id: id,
        $or: [
          { userId },
          { recipientId: userId },
          { forUserId: userId },
          { targetUserId: userId },
          { 
            $and: [
              { userId: { $in: [null, ""] } },
              { recipientId: { $in: [null, ""] } },
              { forUserId: { $in: [null, ""] } }
            ]
          }
        ]
      },
      { $set: { isRead: true, read: true } },
      { new: true }
    );

    if (doc && redis.isAvailable) {
      try {
        const countKey = `notification_count:${userId}`;
        const count = await redis.get(countKey);
        if (count && parseInt(count, 10) > 0) {
          await redis.decr(countKey);
        }
      } catch (err) {
        logger.warn(`[Notification] Redis decr error on markAsRead: ${err.message}`);
      }
    }
    return doc;
  });
};

/**
 * Marks all notifications as read for a user.
 * Resets Redis unread counter.
 */
export const markAllAsRead = async (userId, companyId) => {
  return runWithTenant(companyId, async () => {
    const NotificationModel = await getNotificationModel(companyId);

    const query = {
      $and: [
        {
          $or: [
            { userId },
            { recipientId: userId },
            { forUserId: userId },
            { targetUserId: userId },
            { 
              $and: [
                { userId: { $in: [null, ""] } },
                { recipientId: { $in: [null, ""] } },
                { forUserId: { $in: [null, ""] } }
              ]
            }
          ]
        },
        {
          $or: [
            { isRead: false },
            { read: false }
          ]
        }
      ]
    };

    await NotificationModel.updateMany(
      query,
      { $set: { isRead: true, read: true } }
    );

    await resetUnreadCount(userId);
    return { success: true };
  });
};

/**
 * Deletes a notification (user-scoped — can only delete own notifications).
 */
export const deleteNotification = async (id, userId, companyId) => {
  return runWithTenant(companyId, async () => {
    const NotificationModel = await getNotificationModel(companyId);
    const doc = await NotificationModel.findOneAndDelete({ _id: id, userId });
    return doc;
  });
};

// ── BROADCAST ─────────────────────────────────────────────────────────────────

/**
 * Broadcasts an announcement notification to ALL active company employees.
 * Uses Redis pipeline for efficient batching (handles 10,000+ users).
 *
 * Flow:
 *  1. Fetch all active employee IDs
 *  2. Batch-insert to MongoDB (insertMany)
 *  3. Redis pipeline: LPUSH + LTRIM + EXPIRE + INCR for each user
 *  4. Socket.IO broadcast to company room
 *
 * @param {string} companyId
 * @param {string} senderId
 * @param {string} title
 * @param {string} message
 * @param {object} [data]
 */
export const broadcastAnnouncement = async (companyId, senderId, title, message, data = {}) => {
  return runWithTenant(companyId, async () => {
    try {
      const conn = await getTenantConnection(companyId);
      const NotificationModel = await getNotificationModel(companyId);

      // 1. Fetch all active employees using Mongoose Model
      let EmployeeModel;
      try {
        EmployeeModel = conn.model('Employee');
      } catch (err) {
        EmployeeModel = conn.model('Employee', Employee.schema);
      }
      const employees = await EmployeeModel.find({ workStatus: { $ne: 'Terminated' } }).select('id').lean();

      const employeeIds = employees.map((emp) => emp.id).filter(Boolean);

      if (employeeIds.length === 0) {
        logger.warn(`[Notification] broadcastAnnouncement: No active employees found for company ${companyId}`);
        return { success: true, count: 0 };
      }

      const now = new Date();
      const category = deriveCategory('announcement');

      // 2. MongoDB batch insert
      const notifDocs = employeeIds.map((empId) => {
        const uniqueId = 'NTF-' + Math.floor(100 + Math.random() * 900) + Date.now().toString().slice(-3);
        return {
          id: uniqueId,
          userId: empId,
          companyId,
          type: 'announcement',
          category,
          title,
          message,
          data: { ...data, senderId },
          priority: 'high',
          isRead: false,
          read: false,
          createdAt: now,
          updatedAt: now,
        };
      });

      const inserted = await NotificationModel.insertMany(notifDocs, { ordered: false });

      // 3. Redis pipeline — batch per user
      if (redis.isAvailable) {
        const BATCH_SIZE = 500; // Process 500 users per pipeline to avoid memory pressure
        for (let i = 0; i < employeeIds.length; i += BATCH_SIZE) {
          const batch = employeeIds.slice(i, i + BATCH_SIZE);
          const multi = redis.multi();
          batch.forEach((empId, batchIdx) => {
            const insertedDoc = inserted[i + batchIdx];
            const queueKey = `notifications:user:${empId}`;
            const countKey = `notification_count:${empId}`;
            const payload = JSON.stringify({
              id: insertedDoc?._id?.toString() || `ann_${Date.now()}_${empId}`,
              type: 'announcement',
              category,
              title,
              message,
              data: { ...data, senderId },
              priority: 'high',
              isRead: false,
              createdAt: now.toISOString(),
            });
            multi.lPush(queueKey, payload);
            multi.lTrim(queueKey, 0, MAX_QUEUE_LIMIT - 1);
            multi.expire(queueKey, QUEUE_TTL);
            multi.incr(countKey);
          });
          await multi.exec();
        }
      }

      // 4. Socket.IO company-wide broadcast
      try {
        const io = getIO();
        io.to(`company:${companyId}`).emit('notification:new', {
          type: 'announcement',
          category,
          title,
          message,
          data: { ...data, senderId },
          priority: 'high',
          isRead: false,
          createdAt: now.toISOString(),
        });
      } catch (ioErr) {
        logger.debug(`[Notification] Socket.IO broadcast error: ${ioErr.message}`);
      }

      logger.info(`[Notification] Broadcast announcement sent to ${employeeIds.length} users in company ${companyId}`);
      return { success: true, count: employeeIds.length };
    } catch (err) {
      logger.error('[Notification] broadcastAnnouncement failed:', err);
      throw err;
    }
  });
};

// ── USER PREFERENCES ─────────────────────────────────────────────────────────

/**
 * Retrieves user notification preferences (Redis-cached, 30-day TTL).
 * Falls back to DEFAULT_PREFERENCES if not set.
 *
 * @param {string} userId
 * @returns {Promise<object>} User preferences
 */
export const getUserPreferences = async (userId) => {
  if (redis.isAvailable) {
    try {
      const prefsKey = `notif_prefs:${userId}`;
      const cached = await redis.get(prefsKey);
      if (cached) return { ...DEFAULT_PREFERENCES, ...JSON.parse(cached) };
    } catch (err) {
      logger.warn(`[Notification] Redis getUserPreferences error: ${err.message}`);
    }
  }
  return { ...DEFAULT_PREFERENCES };
};

/**
 * Saves user notification preferences to Redis (30-day TTL).
 *
 * @param {string} userId
 * @param {object} prefs - Partial preferences to merge
 * @returns {Promise<object>} Updated full preferences
 */
export const saveUserPreferences = async (userId, prefs) => {
  const current = await getUserPreferences(userId);
  const updated = { ...current, ...prefs };

  if (redis.isAvailable) {
    try {
      const prefsKey = `notif_prefs:${userId}`;
      await redis.set(prefsKey, JSON.stringify(updated), { EX: PREFS_TTL });
    } catch (err) {
      logger.warn(`[Notification] Redis saveUserPreferences error: ${err.message}`);
    }
  }
  return updated;
};

// ── DEFAULT EXPORT ────────────────────────────────────────────────────────────

export default {
  createNotification,
  createMentionNotification,
  createGroupMentionNotification,
  createMessageNotification,
  createReactionNotification,
  createGroupNotification,
  createTaskNotification,
  createSystemNotification,
  getUnreadCount,
  resetUnreadCount,
  getNotifications,
  syncOfflineNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  broadcastAnnouncement,
  getUserPreferences,
  saveUserPreferences,
};
