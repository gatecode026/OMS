/**
 * @file src/modules/chat/chat.socket.js
 * @description Socket.io event handlers for real-time chat.
 *   Handles: connection, rooms, messaging, typing, read-receipts,
 *   reactions, edit/delete, online presence tracking.
 *
 *   Room naming conventions:
 *   - company:<companyId>     → all users of a company (presence broadcasts)
 *   - user:<employeeId>       → personal room (direct notifications)
 *   - conv:<conversationId>   → conversation-level room (messages)
 */

import { runWithTenant } from '../../utils/tenantContext.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import * as chatService from './chat.service.js';
import logger from '../../config/logger.js';
import { verifySocketToken } from '../../middlewares/socketAuth.middleware.js';
import redis from '../../config/redis.js';
import Conversation from './conversation.model.js';
import Message from './message.model.js';
import { UserDevice } from '../security/security.model.js';
import { uploadToImageKit } from '../../utils/imagekit.js';
import Call from './call.model.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import * as pushNotificationService from '../notifications/pushNotificationService.js';

// ─── IN-MEMORY ONLINE USERS STORE ────────────────────────────────────────────
// Structure: Map<companyId, Map<employeeId, { socketId, name, avatar, onlineAt }>>
const onlineUsers = new Map();

// Structure: Map<employeeId, NodeJS.Timeout>
const offlineDebounceTimers = new Map();

// Map<employeeId, { timer, conversationIds: Set<conversationId> }>
const pendingPushNotifications = new Map();

// Map<socketId, { callId, targetUserId, companyId, role }>
const socketActiveCalls = new Map();

// ─── ACTIVE WRITES TRACKING (For Graceful Shutdown) ─────────────────────────
let activeWrites = 0;
export const getActiveWrites = () => activeWrites;

const runTrackedWrite = async (fn) => {
  activeWrites++;
  try {
    return await fn();
  } finally {
    activeWrites--;
  }
};

export const triggerPushNotificationJob = async (userId, companyId) => {
  await runWithTenant(companyId, async () => {
    try {
      const conn = await getTenantConnection(companyId);
      const employee = await conn.collection('employees').findOne({ id: userId });
      if (employee && employee.chatStatus === 'dnd') {
        logger.info(`[Push Notification] Suppressed push notifications for user ${userId} due to DND status`);
        return;
      }

      const conversations = await Conversation.find({
        'participants.employeeId': userId,
        isActive: true
      }).lean();

      if (conversations.length === 0) return;

      const devices = await UserDevice.find({
        registeredBy: userId,
        status: 'Active'
      }).lean();

      for (const conv of conversations) {
        const participant = conv.participants.find(p => p.employeeId === userId);
        const lastReadAt = participant?.lastReadAt || new Date(0);

        const unreadMessages = await Message.find({
          conversationId: conv.id,
          senderId: { $ne: userId },
          isDeleted: false,
          createdAt: { $gt: new Date(lastReadAt) }
        }).sort({ createdAt: 1 }).lean();

        if (unreadMessages.length === 0) continue;

        const unreadCount = unreadMessages.length;
        const lastMsg = unreadMessages[unreadMessages.length - 1];

        // Format sender preview
        const otherParticipant = conv.type === 'direct'
          ? conv.participants.find(p => p.employeeId !== userId)
          : null;

        let title = '';
        if (conv.type === 'group') {
          title = unreadCount === 1
            ? `New message in ${conv.name}`
            : `${unreadCount} new messages in ${conv.name}`;
        } else {
          const senderName = otherParticipant?.name || 'Someone';
          title = unreadCount === 1
            ? `New message from ${senderName}`
            : `${unreadCount} new messages from ${senderName}`;
        }

        const body = lastMsg.type === 'text'
          ? lastMsg.content
          : `📎 ${lastMsg.type}`;

        const webPushPayload = {
          title,
          body,
          tag: conv.id,
          type: 'new_message',
          data: {
            conversationId: conv.id,
            type: 'new_message'
          }
        };

        await pushNotificationService.sendNotificationToUser(userId, webPushPayload);
      }
    } catch (err) {
      logger.error(`[Push Notification] Job execution failed for user ${userId}:`, err);
    }
  });
};

export const queuePushNotification = (userId, conversationId, companyId) => {
  if (!userId) return;

  const isProd = process.env.NODE_ENV === 'production';
  const debounceDuration = isProd ? 10 * 60 * 1000 : 10000; // 10 minutes in prod, 10 seconds in dev

  if (pendingPushNotifications.has(userId)) {
    const pending = pendingPushNotifications.get(userId);
    if (conversationId) {
      pending.conversationIds.add(conversationId);
    }
  } else {
    const conversationIds = new Set();
    if (conversationId) {
      conversationIds.add(conversationId);
    }

    const timer = setTimeout(async () => {
      pendingPushNotifications.delete(userId);
      try {
        await triggerPushNotificationJob(userId, companyId);
      } catch (err) {
        logger.error(`[Push Notification] Error running job for user ${userId}:`, err);
      }
    }, debounceDuration);

    pendingPushNotifications.set(userId, { timer, conversationIds });
    logger.info(`[Push Notification] Queued push job for user ${userId} to run in ${debounceDuration}ms`);
  }
};

const getCompanyOnlineUsers = (companyId) => {
  if (!onlineUsers.has(companyId)) {
    onlineUsers.set(companyId, new Map());
  }
  return onlineUsers.get(companyId);
};

const updateUserChatScreenPresence = async (userId, companyId, io) => {
  try {
    const userSockets = await io.in(`user:${userId}`).fetchSockets();
    const isOnChatScreen = userSockets.some(s => s.isOnChatScreen === true);

    const companyUsers = getCompanyOnlineUsers(companyId);
    const userCache = companyUsers.get(userId);
    if (userCache) {
      userCache.isOnChatScreen = isOnChatScreen;
      companyUsers.set(userId, userCache);
    }

    if (redis.isAvailable) {
      const ttlMs = io.opts?.pingTimeout + 10000 || 50000;
      const cached = await redis.get(`presence::${userId}`).catch(() => null);
      if (cached) {
        const data = JSON.parse(cached);
        data.isOnChatScreen = isOnChatScreen;
        await redis.set(`presence::${userId}`, JSON.stringify(data), 'PX', ttlMs).catch(() => {});
      }
    }

    io.to(`company:${companyId}`).emit('user_chatscreen_changed', {
      employeeId: userId,
      isOnChatScreen
    });
  } catch (err) {
    logger.error(`[Chat] Error in updateUserChatScreenPresence for user ${userId}:`, err);
  }
};

const createCallHistoryMessage = async (callRecord, companyId, io) => {
  try {
    const isVideo = callRecord.callType === 'video';
    const callerId = callRecord.callerId;
    
    let statusText = '';
    if (callRecord.status === 'ended') {
      const minutes = Math.floor(callRecord.duration / 60);
      const seconds = callRecord.duration % 60;
      const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      statusText = `${isVideo ? 'Video' : 'Voice'} Call · Ended (${durationStr})`;
    } else if (callRecord.status === 'rejected') {
      statusText = `${isVideo ? 'Video' : 'Voice'} Call · Declined`;
    } else if (callRecord.status === 'missed') {
      statusText = `Missed ${isVideo ? 'Video' : 'Voice'} Call`;
    } else {
      return;
    }

    const savedMessage = await chatService.saveMessage({
      conversationId: callRecord.conversationId,
      senderId: callerId,
      senderName: callRecord.callerName,
      senderAvatar: callRecord.callerAvatar || null,
      senderRole: 'employee',
      content: statusText,
      type: 'call'
    }, companyId);

    io.to(`conv:${callRecord.conversationId}`).emit('new_message', {
      id: savedMessage.id,
      conversationId: callRecord.conversationId,
      senderId: callerId,
      senderName: callRecord.callerName,
      senderAvatar: callRecord.callerAvatar || null,
      preview: statusText,
      type: 'call',
      content: statusText,
      createdAt: savedMessage.createdAt
    });

  } catch (err) {
    logger.error('[Chat] Failed to create call history message:', err);
  }
};

// ─── MAIN HANDLER REGISTRATION ───────────────────────────────────────────────

export const registerChatSocketHandlers = (io) => {

  io.on('connection', async (socket) => {
    const { id: userId, companyId, name, avatar, role, chatStatus, statusEmoji } = socket.user;

    logger.info(
      `[Chat] Connected: ${name} (${userId}) — Company: ${companyId} — Socket: ${socket.id}`
    );

    // ── JWT EXPIRY WARNING & REAUTHENTICATION ──────────────────────────
    let expiryTimeout = null;

    const scheduleExpiryWarning = (tokenExp) => {
      if (expiryTimeout) {
        clearTimeout(expiryTimeout);
        expiryTimeout = null;
      }
      if (!tokenExp) return;

      const timeToExpiryMs = (tokenExp * 1000) - Date.now();
      const warningTimeMs = timeToExpiryMs - 60000; // 60s before expiry

      if (warningTimeMs > 0) {
        expiryTimeout = setTimeout(() => {
          logger.info(`[Socket.io] Token expiring in 60s for user ${name} (${userId}). Emitting token_expiring.`);
          socket.emit('token_expiring');
        }, warningTimeMs);
      } else if (timeToExpiryMs > 0) {
        socket.emit('token_expiring');
      }
    };

    if (socket.tokenExp) {
      scheduleExpiryWarning(socket.tokenExp);
    }

    socket.on('reauthenticate', async ({ token }) => {
      try {
        if (!token) {
          logger.warn(`[Socket.io] Reauthenticate failed: No token provided on socket ${socket.id}`);
          socket.emit('error', { event: 'reauthenticate', message: 'No token provided' });
          return;
        }

        const { user, companyId: newCompanyId, tokenExp: newTokenExp } = await verifySocketToken(token);

        if (user.id !== userId) {
          logger.warn(`[Socket.io] Reauthenticate rejected: Identity mismatch. Expected ${userId}, got ${user.id}`);
          socket.emit('error', { event: 'reauthenticate', message: 'Identity mismatch' });
          return;
        }

        socket.user = user;
        socket.companyId = newCompanyId;
        socket.tokenExp = newTokenExp;

        logger.info(`[Socket.io] Socket re-authenticated successfully for ${user.name} (${user.id})`);
        socket.emit('reauthenticated');
        scheduleExpiryWarning(newTokenExp);
      } catch (err) {
        logger.error(`[Socket.io] Reauthenticate failed: ${err.message}`);
        socket.emit('error', { event: 'reauthenticate', message: err.message || 'Authentication failed' });
      }
    });

    // ── STEP 1: JOIN ROOMS ──────────────────────────────────────────────────
    // Company-wide room (presence broadcasts)
    socket.join(`company:${companyId}`);
    // Personal room (direct notifications — missed messages, alerts)
    socket.join(`user:${userId}`);

    // ── STEP 2: MARK USER ONLINE ────────────────────────────────────────────
    try {
      // Cancel any pending offline transitions for this user
      if (offlineDebounceTimers.has(userId)) {
        clearTimeout(offlineDebounceTimers.get(userId));
        offlineDebounceTimers.delete(userId);
        logger.info(`[Chat] Cancelled pending offline transition for user ${name} (${userId}) due to reconnection`);
      }

      // Cancel any pending push notifications for this user upon reconnection
      if (pendingPushNotifications.has(userId)) {
        const pending = pendingPushNotifications.get(userId);
        clearTimeout(pending.timer);
        pendingPushNotifications.delete(userId);
        logger.info(`[Push Notification] Cancelled pending push notification job for user ${userId} due to reconnection`);
      }

      socket.isOnChatScreen = false;

      const companyUsers = getCompanyOnlineUsers(companyId);
      companyUsers.set(userId, {
        socketId: socket.id,
        name,
        avatar,
        onlineAt: new Date(),
        chatStatus: chatStatus || 'available',
        statusEmoji: statusEmoji || null,
        isOnChatScreen: false
      });

      // Update employee workStatus in DB
      await runTrackedWrite(() =>
        runWithTenant(companyId, async () => {
          const conn = await getTenantConnection(companyId);
          await conn.collection('employees').updateOne(
            { id: userId },
            { $set: { workStatus: 'Online', lastSeen: new Date() } }
          );
        })
      );

      // Store presence in Redis with TTL (pingTimeout + 10s)
      const ttlMs = socket.server.opts.pingTimeout + 10000;
      const presenceData = {
        userId,
        companyId,
        name,
        avatar,
        onlineAt: new Date(),
        socketId: socket.id,
        chatStatus: chatStatus || 'available',
        statusEmoji: statusEmoji || null,
        isOnChatScreen: false
      };
      if (redis.isAvailable) {
        await redis.set(`presence::${userId}`, JSON.stringify(presenceData), 'PX', ttlMs).catch(err => {
          logger.warn('[Redis] Failed to set presence on connect:', err.message);
        });
      }

      // Status Expiry Helper
      const checkStatusExpiry = async () => {
        try {
          await runWithTenant(companyId, async () => {
            const conn = await getTenantConnection(companyId);
            const employee = await conn.collection('employees').findOne({ id: userId });
            if (employee && employee.statusExpiry) {
              const expiryDate = new Date(employee.statusExpiry);
              if (expiryDate <= new Date()) {
                await conn.collection('employees').updateOne(
                  { id: userId },
                  { $set: { chatStatus: 'available', statusEmoji: null, statusExpiry: null } }
                );

                const userCache = companyUsers.get(userId);
                if (userCache) {
                  userCache.chatStatus = 'available';
                  userCache.statusEmoji = null;
                  companyUsers.set(userId, userCache);
                }

                if (redis.isAvailable) {
                  const cached = await redis.get(`presence::${userId}`).catch(() => null);
                  if (cached) {
                    const data = JSON.parse(cached);
                    data.chatStatus = 'available';
                    data.statusEmoji = null;
                    await redis.set(`presence::${userId}`, JSON.stringify(data), 'PX', ttlMs).catch(() => {});
                  }
                }

                io.to(`company:${companyId}`).emit('user_status_changed', {
                  employeeId: userId,
                  status: 'available',
                  emoji: null,
                  expiresAt: null
                });

                logger.info(`[Chat] Status auto-expired for user ${name} (${userId}). Reset to available.`);
              }
            }
          });
        } catch (err) {
          logger.error(`[Chat] Error checking status expiry for user ${userId}:`, err);
        }
      };

      // Run status expiry check on connect
      await checkStatusExpiry();

      // Reset TTL on Engine.io ping heartbeat
      socket.conn.on('ping', async () => {
        try {
          if (redis.isAvailable) {
            await redis.pexpire(`presence::${userId}`, ttlMs).catch(() => {});
          }
          await checkStatusExpiry();
        } catch (err) {
          logger.warn(`[Redis] Failed to reset TTL on heartbeat for user ${userId}:`, err.message);
        }
      });

      // Broadcast to the rest of the company — this user is online
      socket.to(`company:${companyId}`).emit('user_online', {
        userId,
        name,
        avatar,
        onlineAt: new Date(),
        chatStatus: chatStatus || 'available',
        statusEmoji: statusEmoji || null,
        isOnChatScreen: false
      });

      // Retrieve online users list — prefer Redis (multi-instance safe), fall back to in-memory Map
      const keys = redis.isAvailable ? await redis.keys('presence::*').catch(() => []) : [];
      const onlineList = [];
      if (keys.length > 0) {
        const values = await redis.mget(keys).catch(() => []);
        values.forEach(val => {
          if (val) {
            try {
              const data = JSON.parse(val);
              if (data.companyId === companyId) {
                onlineList.push(data);
              }
            } catch (e) {
              logger.warn('[Redis] Failed to parse presence data:', e.message);
            }
          }
        });
      } else {
        // Fallback to local in-memory cache (single-server mode or Redis unavailable)
        onlineList.push(...Array.from(companyUsers.entries()).map(([id, data]) => ({ userId: id, ...data })));
      }

      socket.emit('online_users_list', onlineList);

      // Reconnection state recovery: Missed messages and receipts sync
      const lastSyncTime = socket.handshake.auth?.lastSyncTime;
      if (lastSyncTime) {
        await runWithTenant(companyId, async () => {
          const conn = await getTenantConnection(companyId);
          const conversations = await conn
            .collection('conversations')
            .find({ 'participants.employeeId': userId, isActive: true }, { projection: { id: 1 } })
            .toArray();
          const convIds = conversations.map(c => c.id);

          const lastSyncDate = new Date(lastSyncTime);

          const missedMessages = await conn
            .collection('messages')
            .find({
              conversationId: { $in: convIds },
              createdAt: { $gt: lastSyncDate },
              senderId: { $ne: userId }
            })
            .toArray();

          const missedReadReceipts = await conn
            .collection('messages')
            .find({
              conversationId: { $in: convIds },
              senderId: userId,
              'readBy.readAt': { $gt: lastSyncDate }
            })
            .toArray();

          const formattedReceipts = missedReadReceipts.map(msg => ({
            messageId: msg.id,
            conversationId: msg.conversationId,
            readBy: msg.readBy.filter(r => r.readAt > lastSyncDate)
          }));

          socket.emit('missed_events', {
            messages: missedMessages,
            readReceipts: formattedReceipts,
            presenceChanges: onlineList
          });

          logger.info(`[Chat] Emitted missed_events for user ${name} since ${lastSyncTime}: ${missedMessages.length} messages, ${formattedReceipts.length} read receipts.`);
        });
      }

    } catch (err) {
      logger.error('[Chat] Error marking user online:', err);
    }

    // ── STEP 3: JOIN EXISTING CONVERSATION ROOMS ────────────────────────────
    try {
      await runWithTenant(companyId, async () => {
        const conn = await getTenantConnection(companyId);
        const conversations = await conn
          .collection('conversations')
          .find(
            { 'participants.employeeId': userId, isActive: true },
            { projection: { id: 1 } }
          )
          .toArray();

        conversations.forEach(conv => {
          socket.join(`conv:${conv.id}`);
        });

        logger.info(
          `[Chat] ${name} auto-joined ${conversations.length} conversation rooms`
        );
      });
    } catch (err) {
      logger.error('[Chat] Error joining conversation rooms:', err);
    }

    // ── EVENT: JOIN SPECIFIC CONVERSATION ──────────────────────────────────
    socket.on('join_conversation', async (conversationId) => {
      try {
        await runWithTenant(companyId, async () => {
          const conn = await getTenantConnection(companyId);
          const conv = await conn.collection('conversations').findOne({
            id: conversationId,
            'participants.employeeId': userId,
            isActive: true
          });

          if (!conv) {
            socket.emit('error', {
              event: 'join_conversation',
              message: 'Conversation not found or access denied'
            });
            return;
          }

          socket.join(`conv:${conversationId}`);
          socket.emit('joined_conversation', { conversationId });
          logger.info(`[Chat] ${name} joined conv: ${conversationId}`);
        });
      } catch (err) {
        logger.error('[Chat] join_conversation error:', err);
        socket.emit('error', {
          event: 'join_conversation',
          message: 'Failed to join conversation'
        });
      }
    });

    // ── EVENT: SET STATUS ────────────────────────────────────────────────────
    socket.on('set_status', async ({ status, emoji, expiresInMinutes }) => {
      try {
        const validStatuses = ['available', 'away', 'dnd', 'offline'];
        if (!status || !validStatuses.includes(status)) {
          socket.emit('error', { event: 'set_status', message: 'Invalid status' });
          return;
        }

        const expiresAt = expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60000) : null;

        await runTrackedWrite(() =>
          runWithTenant(companyId, async () => {
            const conn = await getTenantConnection(companyId);
            await conn.collection('employees').updateOne(
              { id: userId },
              { $set: { chatStatus: status, statusEmoji: emoji || null, statusExpiry: expiresAt } }
            );
          })
        );

        // Update local memory cache
        const companyUsers = getCompanyOnlineUsers(companyId);
        const userCache = companyUsers.get(userId);
        if (userCache) {
          userCache.chatStatus = status;
          userCache.statusEmoji = emoji || null;
          companyUsers.set(userId, userCache);
        }

        // Update Redis presence with new status
        if (redis.isAvailable) {
          const ttlMs = socket.server.opts.pingTimeout + 10000;
          const cached = await redis.get(`presence::${userId}`).catch(() => null);
          if (cached) {
            const data = JSON.parse(cached);
            data.chatStatus = status;
            data.statusEmoji = emoji || null;
            await redis.set(`presence::${userId}`, JSON.stringify(data), 'PX', ttlMs).catch(() => {});
          }
        }


        // Broadcast to company room
        io.to(`company:${companyId}`).emit('user_status_changed', {
          employeeId: userId,
          status,
          emoji: emoji || null,
          expiresAt
        });

        logger.info(`[Chat] User ${name} (${userId}) updated status to ${status}`);
        socket.emit('status_updated', { status, emoji, expiresAt });

      } catch (err) {
        logger.error('[Chat] set_status error:', err);
        socket.emit('error', { event: 'set_status', message: 'Failed to set status' });
      }
    });

    socket.on('user_chatscreen_status', async ({ isOnChatScreen }) => {
      try {
        socket.isOnChatScreen = !!isOnChatScreen;
        await updateUserChatScreenPresence(userId, companyId, io);
      } catch (err) {
        logger.error('[Chat] user_chatscreen_status error:', err);
      }
    });

    // ── EVENT: SEND MESSAGE ─────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      const { tempId } = data;
      await runTrackedWrite(async () => {
        try {
          const {
            conversationId,
            content,
            type = 'text',
            replyTo = null,
            media = null
          } = data;

          if (!conversationId) {
            socket.emit('error', {
              event: 'send_message',
              message: 'conversationId is required'
            });
            return;
          }

          // Room authorization check: Ensure user is a participant of this conversation
          const isParticipant = await runWithTenant(companyId, async () => {
            const conn = await getTenantConnection(companyId);
            const conv = await conn.collection('conversations').findOne({
              id: conversationId,
              'participants.employeeId': userId
            });
            return !!conv;
          });

          if (!isParticipant) {
            logger.warn(`[Socket.io] Room authorization bypass blocked: User ${userId} tried to send message to conv ${conversationId} they do not belong to`);
            socket.emit('error', {
              event: 'send_message',
              message: 'Access denied: You are not a participant in this conversation'
            });
            return;
          }

          if (type === 'text' && !content?.trim()) {
            socket.emit('error', {
              event: 'send_message',
              message: 'Content cannot be empty'
            });
            return;
          }

          // Handle ImageKit upload if media is a base64 string
          let uploadedMedia = media;
          if (media && media.url && media.url.startsWith('data:') && media.url.includes(';base64,')) {
            try {
              const resultUrl = await uploadToImageKit(media.url, media.fileName);
              const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
              const isConfigured = privateKey && !privateKey.includes('***');
              if (isConfigured && resultUrl.startsWith('data:')) {
                throw new Error('ImageKit upload failed and fell back to base64');
              }
              uploadedMedia = {
                ...media,
                url: resultUrl
              };
            } catch (uploadErr) {
              logger.error('[Chat] ImageKit upload error:', uploadErr);
              socket.emit('message_upload_error', { tempId, reason: 'Image upload failed. Try again.' });
              return;
            }
          }

          // Save to DB (also updates conversation.lastMessage)
          const savedMessage = await chatService.saveMessage({
            conversationId,
            senderId: userId,
            senderName: name,
            senderAvatar: avatar || null,
            senderRole: role || 'employee',
            content: content?.trim() || '',
            type,
            media: uploadedMedia || null,
            replyTo: replyTo || null,
            companyId
          }, companyId);

          // Message fanout optimization: broadcast only messageId, conversationId, senderId, preview, and tempId
          const previewText = savedMessage.type === 'text'
            ? savedMessage.content
            : `📎 ${savedMessage.media?.fileName || savedMessage.type}`;

          io.to(`conv:${conversationId}`).emit('new_message', {
            id: savedMessage.id,
            conversationId,
            senderId: userId,
            senderName: name,
            senderAvatar: avatar,
            preview: previewText,
            type: savedMessage.type,
            createdAt: savedMessage.createdAt,
            _isOptimized: true,
            tempId, // Include tempId in the broadcasted event
            replyTo: savedMessage.replyTo
          });

          // Handle delivery receipts + notifications for offline participants
          await runWithTenant(companyId, async () => {
            const conn = await getTenantConnection(companyId);
            const conv = await conn.collection('conversations').findOne(
              { id: conversationId },
              { projection: { participants: 1, type: 1, name: 1 } }
            );

            if (!conv) return;

            const otherParticipants = conv.participants.filter(
              p => p.employeeId !== userId
            );

            const otherParticipantIds = otherParticipants.map(p => p.employeeId);
            const employeesInfo = await conn.collection('employees').find(
              { id: { $in: otherParticipantIds } },
              { projection: { id: 1, chatStatus: 1 } }
            ).toArray();

            const employeeStatusMap = new Map(employeesInfo.map(e => [e.id, e.chatStatus]));

            // Fetch all socket IDs currently in the conversation room
            const roomSockets = await io
              .in(`conv:${conversationId}`)
              .fetchSockets();
            const usersInRoom = new Set(
              roomSockets.map(s => s.user?.id).filter(Boolean)
            );

            for (const participant of otherParticipants) {
              // Mark as delivered in DB
              await conn.collection('messages').updateOne(
                { id: savedMessage.id },
                {
                  $push: {
                    deliveredTo: {
                      employeeId: participant.employeeId,
                      deliveredAt: new Date()
                    }
                  }
                }
              );

              // If not in room — send personal notification
              if (!usersInRoom.has(participant.employeeId)) {
                const targetSockets = await io.in(`user:${participant.employeeId}`).fetchSockets();
                if (targetSockets.length === 0) {
                  const chatStatus = employeeStatusMap.get(participant.employeeId) || 'available';
                  if (chatStatus !== 'dnd') {
                    queuePushNotification(participant.employeeId, conversationId, companyId);
                  } else {
                    logger.info(`[Chat] Suppressed push notification for user ${participant.employeeId} due to DND status`);
                  }
                } else {
                  io.to(`user:${participant.employeeId}`).emit(
                    'new_message_notification',
                    {
                      conversationId,
                      conversationName: conv.type === 'direct' ? name : conv.name,
                      conversationType: conv.type,
                      senderId: userId,
                      senderName: name,
                      senderAvatar: avatar,
                      preview: type === 'text'
                        ? content?.substring(0, 100)
                        : `📎 ${type}`,
                      sentAt: new Date()
                    }
                  );
                }
              }
            }
          });

          // Confirm delivery back to sender
          socket.emit('message_delivered', {
            messageId: savedMessage.id,
            conversationId,
            tempId
          });

        } catch (err) {
          logger.error('[Chat] send_message error:', err);
          socket.emit('error', {
            event: 'send_message',
            message: 'Failed to send message'
          });
          socket.emit('message_error', { tempId, reason: 'Server error. Try again.' });
        }
      });
    });

    // ── EVENT: TYPING INDICATORS ────────────────────────────────────────────
    socket.on('typing_start', ({ conversationId }) => {
      if (!conversationId) return;

      const now = Date.now();
      if (socket.lastTypingAt && (now - socket.lastTypingAt < 1000)) {
        return; // Suppress indicator spam
      }
      socket.lastTypingAt = now;

      socket.to(`conv:${conversationId}`).emit('user_typing', {
        userId,
        name,
        avatar,
        conversationId
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('user_stopped_typing', {
        userId,
        conversationId
      });
    });

    // ── EVENT: MARK MESSAGES AS READ (WhatsApp blue tick) ──────────────────
    socket.on('mark_read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        await runTrackedWrite(() =>
          chatService.markAsRead(
            conversationId, userId, name, companyId
          )
        );

        // Notify all in room that this user has read messages
        io.to(`conv:${conversationId}`).emit('messages_read', {
          conversationId,
          readBy: [{ employeeId: userId, name: name, readAt: new Date() }]
        });

      } catch (err) {
        logger.error('[Chat] mark_read error:', err);
      }
    });

    // ── EVENT: EMOJI REACTION ───────────────────────────────────────────────
    socket.on('add_reaction', async ({ messageId, emoji, conversationId }) => {
      try {
        if (!messageId || !emoji || !conversationId) {
          socket.emit('error', {
            event: 'add_reaction',
            message: 'messageId, emoji, and conversationId are required'
          });
          return;
        }

        await runTrackedWrite(() =>
          chatService.addReaction(
            messageId, userId, name, emoji, companyId
          )
        );

        io.to(`conv:${conversationId}`).emit('reaction_added', {
          messageId,
          conversationId,
          employeeId: userId,
          name,
          emoji,
          reactedAt: new Date()
        });

      } catch (err) {
        logger.error('[Chat] add_reaction error:', err);
        socket.emit('error', { event: 'add_reaction', message: err.message });
      }
    });

    // ── EVENT: LEAVE GROUP ───────────────────────────────────────────────────
    socket.on('leave_group', async ({ conversationId }) => {
      try {
        if (!conversationId) {
          socket.emit('error', {
            event: 'leave_group',
            message: 'conversationId is required'
          });
          return;
        }

        const result = await runTrackedWrite(() =>
          chatService.removeGroupMember(
            conversationId, userId, userId, companyId
          )
        );

        if (result.conversation) {
          io.to(`conv:${conversationId}`).emit('member_left', {
            conversationId,
            employeeId: userId,
            participants: result.conversation.participants
          });
        }

        socket.emit('conversation_removed', { conversationId });
        socket.leave(`conv:${conversationId}`);

      } catch (err) {
        logger.error('[Chat] leave_group error:', err);
        socket.emit('error', { event: 'leave_group', message: err.message });
      }
    });

    // ── EVENT: DELETE MESSAGE ───────────────────────────────────────────────
    socket.on('delete_message', async ({ messageId, conversationId, deleteForEveryone }) => {
      try {
        if (!messageId || !conversationId) {
          socket.emit('error', {
            event: 'delete_message',
            message: 'messageId and conversationId are required'
          });
          return;
        }

        await runTrackedWrite(() =>
          chatService.deleteMessage(
            messageId, userId, deleteForEveryone, companyId
          )
        );

        if (deleteForEveryone) {
          // Notify everyone in the conversation room
          io.to(`conv:${conversationId}`).emit('message_deleted', {
            messageId,
            conversationId,
            deletedBy: userId,
            deleteForEveryone: true
          });
        } else {
          // Only confirm to sender
          socket.emit('message_deleted', {
            messageId,
            conversationId,
            deleteForEveryone: false
          });
        }

      } catch (err) {
        logger.error('[Chat] delete_message error:', err);
        socket.emit('error', { event: 'delete_message', message: err.message });
      }
    });

    // ── EVENT: EDIT MESSAGE ─────────────────────────────────────────────────
    socket.on('edit_message', async ({ messageId, conversationId, content }) => {
      try {
        if (!messageId || !conversationId || !content?.trim()) {
          socket.emit('error', {
            event: 'edit_message',
            message: 'messageId, conversationId, and content are required'
          });
          return;
        }

        await runTrackedWrite(() =>
          chatService.editMessage(
            messageId, userId, content.trim(), companyId
          )
        );

        io.to(`conv:${conversationId}`).emit('message_edited', {
          messageId,
          conversationId,
          newContent: content.trim(),
          editedBy: userId,
          editedAt: new Date()
        });

      } catch (err) {
        logger.error('[Chat] edit_message error:', err);
        socket.emit('error', { event: 'edit_message', message: err.message });
      }
    });

    // ── EVENT: PIN CONVERSATION ─────────────────────────────────────────────
    socket.on('pin_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await runTrackedWrite(() =>
          chatService.pinConversation(conversationId, userId, companyId)
        );
        socket.emit('conversation_pinned', { conversationId, pinnedBy: userId, pinnedAt: new Date() });
      } catch (err) {
        logger.error('[Chat] pin_conversation error:', err);
        socket.emit('error', { event: 'pin_conversation', message: err.message });
      }
    });

    // ── EVENT: UNPIN CONVERSATION ───────────────────────────────────────────
    socket.on('unpin_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await runTrackedWrite(() =>
          chatService.unpinConversation(conversationId, userId, companyId)
        );
        socket.emit('conversation_unpinned', { conversationId, pinnedBy: userId });
      } catch (err) {
        logger.error('[Chat] unpin_conversation error:', err);
        socket.emit('error', { event: 'unpin_conversation', message: err.message });
      }
    });

    // ── EVENT: PIN MESSAGE ──────────────────────────────────────────────────
    socket.on('pin_message', async ({ messageId, conversationId }) => {
      try {
        if (!messageId || !conversationId) return;
        await runTrackedWrite(() =>
          chatService.pinMessage(messageId, userId, companyId)
        );
        io.to(`conv:${conversationId}`).emit('message_pinned', {
          messageId,
          conversationId,
          pinnedBy: userId,
          pinnedAt: new Date()
        });
      } catch (err) {
        logger.error('[Chat] pin_message error:', err);
        socket.emit('error', { event: 'pin_message', message: err.message });
      }
    });

    // ── EVENT: UNPIN MESSAGE ────────────────────────────────────────────────
    socket.on('unpin_message', async ({ messageId, conversationId }) => {
      try {
        if (!messageId || !conversationId) return;
        await runTrackedWrite(() =>
          chatService.unpinMessage(messageId, companyId)
        );
        io.to(`conv:${conversationId}`).emit('message_unpinned', {
          messageId,
          conversationId,
          unpinnedBy: userId
        });
      } catch (err) {
        logger.error('[Chat] unpin_message error:', err);
        socket.emit('error', { event: 'unpin_message', message: err.message });
      }
    });

    // ── EVENT: STAR MESSAGE (HIGHLIGHT) ─────────────────────────────────────
    socket.on('star_message', async ({ messageId, conversationId }) => {
      try {
        if (!messageId || !conversationId) return;
        await runTrackedWrite(() =>
          chatService.starMessage(messageId, userId, companyId)
        );
        socket.emit('message_starred', { messageId, conversationId, starredBy: userId });
      } catch (err) {
        logger.error('[Chat] star_message error:', err);
        socket.emit('error', { event: 'star_message', message: err.message });
      }
    });

    // ── EVENT: UNSTAR MESSAGE ────────────────────────────────────────────────
    socket.on('unstar_message', async ({ messageId, conversationId }) => {
      try {
        if (!messageId || !conversationId) return;
        await runTrackedWrite(() =>
          chatService.unstarMessage(messageId, userId, companyId)
        );
        socket.emit('message_unstarred', { messageId, conversationId, unstarredBy: userId });
      } catch (err) {
        logger.error('[Chat] unstar_message error:', err);
        socket.emit('error', { event: 'unstar_message', message: err.message });
      }
    });

    // ── EVENT: GET ONLINE USERS (on-demand) ─────────────────────────────────
    socket.on('get_online_users', () => {
      const onlineList = Array.from(
        getCompanyOnlineUsers(companyId).entries()
      ).map(([id, data]) => ({ userId: id, ...data }));
      socket.emit('online_users_list', onlineList);
    });
    // ── EVENT: WebRTC CALLING ────────────────────────────────────────────────
    socket.on('call:initiate', async ({ targetUserId, callType, conversationId }) => {
      try {
        if (!targetUserId || !callType || !conversationId) {
          socket.emit('call:error', { message: 'Missing call parameters' });
          return;
        }

        const companyUsers = getCompanyOnlineUsers(companyId);
        const targetOnlineUser = companyUsers.get(targetUserId);

        let targetInfo;
        if (targetOnlineUser) {
          targetInfo = {
            name: targetOnlineUser.name,
            avatar: targetOnlineUser.avatar
          };
        } else {
          // Fetch callee details from database to allow offline calling
          const conn = await getTenantConnection(companyId);
          const employee = await conn.collection('employees').findOne(
            { id: targetUserId },
            { projection: { id: 1, name: 1, avatar: 1 } }
          );
          if (!employee) {
            socket.emit('call:error', { message: 'User not found' });
            return;
          }
          targetInfo = {
            name: employee.name,
            avatar: employee.avatar || null
          };
        }

        const callId = await generateCompanyUniqueId(companyId, 'calls');

        await runTrackedWrite(() =>
          runWithTenant(companyId, async () => {
            await Call.create({
              id: callId,
              companyId,
              conversationId,
              callerId: userId,
              callerName: name,
              callerAvatar: avatar || null,
              calleeId: targetUserId,
              calleeName: targetInfo.name,
              calleeAvatar: targetInfo.avatar || null,
              callType,
              status: 'ringing'
            });
          })
        );

        socketActiveCalls.set(socket.id, { callId, targetUserId, companyId, role: 'caller' });
        socket.emit('call:ringing', { callId, callType });

        if (targetOnlineUser) {
          io.to(`user:${targetUserId}`).emit('call:incoming', {
            callId,
            callerId: userId,
            callerName: name,
            callerAvatar: avatar || null,
            callType,
            conversationId
          });
        }

        // Always dispatch Web Push Call Notification immediately (to wake up background/offline devices)
        const pushPayload = {
          title: `📞 Incoming Call`,
          body: `${name} is calling you...`,
          type: 'incoming_call',
          tag: `call-${callId}`,
          data: {
            callId,
            callerId: userId,
            callerName: name,
            callerAvatar: avatar || null,
            callType,
            conversationId,
            companyId,
            type: 'incoming_call'
          }
        };
        pushNotificationService.sendNotificationToUser(targetUserId, pushPayload);

        const ringingTimeout = setTimeout(async () => {
          try {
            await runWithTenant(companyId, async () => {
              const currentCall = await Call.findOne({ id: callId, status: 'ringing' });
              if (currentCall) {
                currentCall.status = 'missed';
                await currentCall.save();
                io.to(`user:${userId}`).emit('call:missed', { callId, callerName: name, reason: 'no_answer' });
                io.to(`user:${targetUserId}`).emit('call:missed', { callId, callerName: name, reason: 'no_answer' });
                socketActiveCalls.delete(socket.id);
                await createCallHistoryMessage(currentCall, companyId, io);

                // Dispatch missed call Web Push notification
                const missedPushPayload = {
                  title: `📞 Missed Call`,
                  body: `You missed a call from ${name}`,
                  type: 'missed_call',
                  tag: `call-${callId}`,
                  data: {
                    callId,
                    callerName: name,
                    type: 'missed_call'
                  }
                };
                pushNotificationService.sendNotificationToUser(targetUserId, missedPushPayload);
              }
            });
          } catch (err) {
            logger.error('[Chat] Call ringing timeout error:', err);
          }
        }, 45000);

        socket.ringingTimeout = ringingTimeout;

      } catch (err) {
        logger.error('[Chat] call:initiate error:', err);
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call:accept', async ({ callId }) => {
      try {
        if (socket.ringingTimeout) clearTimeout(socket.ringingTimeout);

        await runTrackedWrite(() =>
          runWithTenant(companyId, async () => {
            const callRecord = await Call.findOneAndUpdate(
              { id: callId, status: 'ringing' },
              { status: 'active', startedAt: new Date() },
              { new: true }
            );

            if (!callRecord) return;

            socketActiveCalls.set(socket.id, { callId, targetUserId: callRecord.callerId, companyId, role: 'callee' });

            const acceptPayload = {
              callId,
              calleeId: userId,
              calleeName: name,
              calleeAvatar: avatar || null,
              acceptedBySocketId: socket.id
            };

            io.to(`user:${callRecord.callerId}`).emit('call:accepted', acceptPayload);
            io.to(`user:${callRecord.calleeId}`).emit('call:accepted', acceptPayload);
          })
        );
      } catch (err) {
        logger.error('[Chat] call:accept error:', err);
        socket.emit('call:error', { message: 'Failed to accept call' });
      }
    });

    socket.on('call:reject', async ({ callId, reason }) => {
      try {
        if (socket.ringingTimeout) clearTimeout(socket.ringingTimeout);

        await runTrackedWrite(() =>
          runWithTenant(companyId, async () => {
            const callRecord = await Call.findOneAndUpdate(
              { id: callId, status: 'ringing' },
              { status: 'rejected', endedAt: new Date() },
              { new: true }
            );

            if (!callRecord) return;

            const rejectPayload = {
              callId,
              reason,
              calleeName: name,
              calleeId: callRecord.calleeId,
              callerId: callRecord.callerId,
              rejectedBySocketId: socket.id
            };

            io.to(`user:${callRecord.callerId}`).emit('call:rejected', rejectPayload);
            io.to(`user:${callRecord.calleeId}`).emit('call:rejected', rejectPayload);

            // Clean up socketActiveCalls entries for this callId
            for (const [sid, callData] of socketActiveCalls.entries()) {
              if (callData.callId === callId) {
                socketActiveCalls.delete(sid);
              }
            }

            await createCallHistoryMessage(callRecord, companyId, io);
          })
        );
      } catch (err) {
        logger.error('[Chat] call:reject error:', err);
      }
    });

    socket.on('call:end', async ({ callId }) => {
      try {
        if (socket.ringingTimeout) clearTimeout(socket.ringingTimeout);

        await runTrackedWrite(() =>
          runWithTenant(companyId, async () => {
            const callRecord = await Call.findOne({ id: callId });
            if (!callRecord) return;

            const otherPartyId = callRecord.callerId === userId ? callRecord.calleeId : callRecord.callerId;

            if (callRecord.status === 'ringing') {
              // Call cancelled by caller before it was accepted
              const updatedCall = await Call.findOneAndUpdate(
                { id: callId },
                { status: 'missed', endedAt: new Date() },
                { new: true }
              );

              io.to(`user:${otherPartyId}`).emit('call:missed', {
                callId,
                callerName: callRecord.callerName,
                reason: 'cancelled'
              });

              // Dispatch cancelled call Push notification to dismiss incoming call alert
              const cancelPushPayload = {
                title: `Call Cancelled`,
                body: `Call cancelled by caller`,
                type: 'call_cancelled',
                tag: `call-${callId}`,
                data: {
                  callId,
                  type: 'call_cancelled'
                }
              };
              pushNotificationService.sendNotificationToUser(otherPartyId, cancelPushPayload);

              // Clean up socketActiveCalls entries for this callId
              for (const [sid, callData] of socketActiveCalls.entries()) {
                if (callData.callId === callId) {
                  socketActiveCalls.delete(sid);
                }
              }

              await createCallHistoryMessage(updatedCall, companyId, io);
            } else if (callRecord.status === 'active') {
              const endedAt = new Date();
              const startedAt = callRecord.startedAt || callRecord.createdAt;
              const duration = Math.round((endedAt - startedAt) / 1000);

              const updatedCall = await Call.findOneAndUpdate(
                { id: callId },
                { status: 'ended', endedAt, duration },
                { new: true }
              );

              io.to(`user:${otherPartyId}`).emit('call:ended', {
                callId,
                duration,
                endedBy: userId
              });

              // Clean up socketActiveCalls entries for this callId
              for (const [sid, callData] of socketActiveCalls.entries()) {
                if (callData.callId === callId) {
                  socketActiveCalls.delete(sid);
                }
              }

              await createCallHistoryMessage(updatedCall, companyId, io);
            }
          })
        );
      } catch (err) {
        logger.error('[Chat] call:end error:', err);
      }
    });

    socket.on('call:signal:offer', ({ callId, signal, targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call:signal:offer', { callId, signal, senderId: userId });
    });

    socket.on('call:signal:answer', ({ callId, signal, targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call:signal:answer', { callId, signal, senderId: userId });
    });

    socket.on('call:signal:ice', ({ callId, candidate, targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call:signal:ice', { callId, candidate, senderId: userId });
    });

    // ── EVENT: DISCONNECT ───────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      logger.info(
        `[Chat] Disconnected: ${name} (${userId}) — Reason: ${reason}`
      );

      // Clean up chatscreen status on disconnect
      try {
        await updateUserChatScreenPresence(userId, companyId, io);
      } catch (err) {
        logger.error('[Chat] Disconnect chatscreen cleanup error:', err);
      }

      // Clean up call if in progress on disconnect
      const activeCall = socketActiveCalls.get(socket.id);
      if (activeCall) {
        const { callId, targetUserId, companyId: activeCompanyId } = activeCall;
        if (socket.ringingTimeout) clearTimeout(socket.ringingTimeout);
        
        runTrackedWrite(() =>
          runWithTenant(activeCompanyId, async () => {
            const callRecord = await Call.findOne({ id: callId });
            if (callRecord && (callRecord.status === 'ringing' || callRecord.status === 'active')) {
              const endedAt = new Date();
              const status = callRecord.status === 'ringing' ? 'missed' : 'ended';
              const startedAt = callRecord.startedAt || callRecord.createdAt;
              const duration = status === 'ended' ? Math.round((endedAt - startedAt) / 1000) : 0;

              const updatedCall = await Call.findOneAndUpdate(
                { id: callId },
                { status, endedAt, duration },
                { new: true }
              );

              io.to(`user:${targetUserId}`).emit(status === 'ended' ? 'call:ended' : 'call:missed', {
                callId,
                duration,
                endedBy: userId
              });

              if (updatedCall) {
                await createCallHistoryMessage(updatedCall, activeCompanyId, io);
              }
            }
          })
        ).catch(err => logger.error('[Chat] Disconnect call cleanup error:', err));
        socketActiveCalls.delete(socket.id);
      }

      if (expiryTimeout) {
        clearTimeout(expiryTimeout);
        expiryTimeout = null;
      }

      try {
        // Check if user has any other active connections
        const remainingSockets = await io
          .in(`user:${userId}`)
          .fetchSockets();

        // Only mark offline if truly no remaining connections
        if (remainingSockets.length === 0) {
          // Dispatch background job to check and send push notifications for missed/unread events
          queuePushNotification(userId, null, companyId);

          const lastSeen = new Date();

          // Set 3-second debounce before setting Offline status
          const timer = setTimeout(async () => {
            try {
              offlineDebounceTimers.delete(userId);

              // Double check that they didn't reconnect
              const currentSockets = await io.in(`user:${userId}`).fetchSockets();
              if (currentSockets.length === 0) {
                // Remove from local in-memory store
                const companyUsers = getCompanyOnlineUsers(companyId);
                companyUsers.delete(userId);

                // Update DB status to Offline
                await runTrackedWrite(() =>
                  runWithTenant(companyId, async () => {
                    const conn = await getTenantConnection(companyId);
                    await conn.collection('employees').updateOne(
                      { id: userId },
                      { $set: { workStatus: 'Offline', lastSeen } }
                    );
                  })
                );

                // Delete presence key from Redis (no-op if Redis is unavailable)
                if (redis.isAvailable) {
                  await redis.del(`presence::${userId}`).catch(err => {
                    logger.warn('[Redis] Failed to delete presence on disconnect:', err.message);
                  });
                }

                // Notify rest of the company (using io.to to ensure delivery)
                io.to(`company:${companyId}`).emit('user_offline', {
                  userId,
                  name,
                  lastSeen
                });

                logger.info(`[Chat] User ${name} (${userId}) marked offline after 3s debounce`);
              }
            } catch (err) {
              logger.error('[Chat] Debounce offline transition error:', err);
            }
          }, 3000);

          offlineDebounceTimers.set(userId, timer);
        }

      } catch (err) {
        logger.error('[Chat] Disconnect handler error:', err);
      }
    });

  }); // end io.on('connection')

};

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

/**
 * Returns the current online user count for a company.
 * Useful for admin dashboards / overview panels.
 */
export const getOnlineUsersCount = (companyId) => {
  return getCompanyOnlineUsers(companyId).size;
};

/**
 * Returns the full online users map for a company.
 */
export const getOnlineUsersList = (companyId) => {
  return Array.from(getCompanyOnlineUsers(companyId).entries())
    .map(([id, data]) => ({ userId: id, ...data }));
};

export default registerChatSocketHandlers;
