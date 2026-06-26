/**
 * @file src/modules/chat/services/notification.socket.js
 * @description Enterprise Notification Engine — Dedicated Socket Handler Module.
 *
 *   Handles all Socket.IO events related to the notification system.
 *   Designed to be called from chat.socket.js WITHOUT modifying message/presence logic.
 *
 *   Events handled (Server-side):
 *     socket.on('notification:sync')           → emit queued offline notifications
 *     socket.on('notification:opened')         → reset unread counter
 *     socket.on('notification:preferences:get')  → get user preferences
 *     socket.on('notification:preferences:save') → save user preferences
 *
 *   Events emitted (Server → Client):
 *     socket.emit('notification:new', payload)       → new real-time notification
 *     socket.emit('notification:sync', [...])         → missed offline notifications
 *     socket.emit('notification:unread_count', {count}) → current unread badge count
 *     socket.emit('notification:unread_reset')        → badge reset to 0
 *     socket.emit('notification:preferences', prefs)  → current preferences
 *
 *   Offline Recovery Flow:
 *     User offline → notifications pushed to Redis list notifications:user:{userId}
 *     User reconnects → server auto-emits notification:sync with Redis queue
 *     Client merges + deduplicates by notification id
 */

import logger from '../../../config/logger.js';

/**
 * Registers all notification socket event handlers for a connected socket.
 * Must be called once per connection inside the 'connection' handler.
 *
 * @param {import('socket.io').Socket} socket - The connected socket
 * @param {string} userId - Employee/user ID
 * @param {string} companyId - Tenant company ID
 * @param {string} name - Display name (for logging)
 */
export const registerNotificationSocketHandlers = async (socket, userId, companyId, name) => {

  // ── 1. AUTO-SEND UNREAD COUNT ON CONNECT ─────────────────────────────────
  // Always send the current unread count immediately on connect/reconnect
  // so the badge renders correctly without requiring a client-side fetch.
  try {
    const { getUnreadCount } = await import('../../notifications/notifications.service.js');
    const count = await getUnreadCount(userId, companyId);
    socket.emit('notification:unread_count', { count });
    logger.debug(`[Notification Socket] Sent unread count (${count}) to user ${name} (${userId})`);
  } catch (err) {
    logger.error(`[Notification Socket] Failed to send initial unread count to ${userId}:`, err);
  }

  // ── 2. AUTO-SYNC OFFLINE NOTIFICATIONS ON CONNECT ────────────────────────
  // Proactively push missed notifications from Redis queue on reconnect.
  // The client merges by id to prevent duplicates.
  try {
    const { syncOfflineNotifications } = await import('../../notifications/notifications.service.js');
    const missed = await syncOfflineNotifications(userId);
    if (missed.length > 0) {
      socket.emit('notification:sync', missed);
      logger.info(`[Notification Socket] Auto-synced ${missed.length} offline notifications to user ${name} (${userId})`);
    }
  } catch (err) {
    logger.error(`[Notification Socket] Auto-sync error for user ${userId}:`, err);
  }

  // ── 3. ON-DEMAND SYNC (Client-triggered) ─────────────────────────────────
  // Client can also request sync explicitly (e.g., after tab focus).
  socket.on('notification:sync', async () => {
    try {
      const { syncOfflineNotifications } = await import('../../notifications/notifications.service.js');
      const missed = await syncOfflineNotifications(userId);
      socket.emit('notification:sync', missed);
      logger.debug(`[Notification Socket] On-demand sync: ${missed.length} notifications for user ${name} (${userId})`);
    } catch (err) {
      logger.error(`[Notification Socket] notification:sync error for ${userId}:`, err);
      socket.emit('error', { event: 'notification:sync', message: 'Sync failed' });
    }
  });

  // ── 4. NOTIFICATION CENTER OPENED ─────────────────────────────────────────
  // Reset unread counter when user opens the Notification Center.
  socket.on('notification:opened', async () => {
    try {
      const { resetUnreadCount } = await import('../../notifications/notifications.service.js');
      await resetUnreadCount(userId);
      socket.emit('notification:unread_reset');
      logger.debug(`[Notification Socket] Reset unread count for user ${name} (${userId})`);
    } catch (err) {
      logger.error(`[Notification Socket] notification:opened error for ${userId}:`, err);
    }
  });

  // ── 5. GET PREFERENCES ────────────────────────────────────────────────────
  socket.on('notification:preferences:get', async () => {
    try {
      const { getUserPreferences } = await import('../../notifications/notifications.service.js');
      const prefs = await getUserPreferences(userId);
      socket.emit('notification:preferences', prefs);
    } catch (err) {
      logger.error(`[Notification Socket] preferences:get error for ${userId}:`, err);
    }
  });

  // ── 6. SAVE PREFERENCES ───────────────────────────────────────────────────
  socket.on('notification:preferences:save', async (prefs) => {
    try {
      if (!prefs || typeof prefs !== 'object') {
        socket.emit('error', { event: 'notification:preferences:save', message: 'Invalid preferences payload' });
        return;
      }
      const { saveUserPreferences } = await import('../../notifications/notifications.service.js');
      const updated = await saveUserPreferences(userId, prefs);
      socket.emit('notification:preferences', updated);
      logger.info(`[Notification Socket] Saved preferences for user ${name} (${userId})`);
    } catch (err) {
      logger.error(`[Notification Socket] preferences:save error for ${userId}:`, err);
    }
  });
};

export default { registerNotificationSocketHandlers };
