/**
 * @file src/modules/notifications/notifications.service.js
 * @description Proxy service for the Notifications module.
 *   Wraps notification.service.js for controller compatibility and
 *   exposes all functions with consistent naming.
 */

import notificationService from './notification.service.js';
import repository from './notifications.repository.js';
import logger from '../../config/logger.js';

// ── CRUD Compatibility Layer ───────────────────────────────────────────────────

export const findAll = async (query) => {
  logger.info('Executing NotificationsService::findAll');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing NotificationsService::findById: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing NotificationsService::createRecord by user: ' + currentUser?.id);
  return notificationService.createNotification(
    data.userId || currentUser?.id,
    currentUser?.companyId,
    {
      type: data.type || 'system',
      title: data.title,
      message: data.message,
      data: data.data || {},
    }
  );
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing NotificationsService::updateRecord for: ' + id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing NotificationsService::deleteRecord for: ' + id);
  return repository.remove(id);
};

// ── Re-export all core service functions ──────────────────────────────────────
export const createNotification = notificationService.createNotification;
export const createMentionNotification = notificationService.createMentionNotification;
export const createGroupMentionNotification = notificationService.createGroupMentionNotification;
export const createMessageNotification = notificationService.createMessageNotification;
export const createReactionNotification = notificationService.createReactionNotification;
export const createGroupNotification = notificationService.createGroupNotification;
export const createTaskNotification = notificationService.createTaskNotification;
export const createSystemNotification = notificationService.createSystemNotification;
export const getUnreadCount = notificationService.getUnreadCount;
export const resetUnreadCount = notificationService.resetUnreadCount;
export const getNotifications = notificationService.getNotifications;
export const syncOfflineNotifications = notificationService.syncOfflineNotifications;
export const markAsRead = notificationService.markAsRead;
export const markAllAsRead = notificationService.markAllAsRead;
export const deleteNotification = notificationService.deleteNotification;
export const broadcastAnnouncement = notificationService.broadcastAnnouncement;
export const getUserPreferences = notificationService.getUserPreferences;
export const saveUserPreferences = notificationService.saveUserPreferences;

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
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
