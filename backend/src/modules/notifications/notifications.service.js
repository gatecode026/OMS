/**
 * @file src/modules/notifications/notifications.service.js
 * @description Plural service proxy for the Notifications module.
 *   Provides compatibility wrapper around core notification.service.js functions.
 */

import notificationService from './notification.service.js';
import repository from './notifications.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing NotificationsService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing NotificationsService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing NotificationsService::createRecord by user: ' + currentUser?.id);
  // Route through the new enterprise creation engine
  return notificationService.createNotification(data.userId || currentUser?.id, currentUser?.companyId, {
    type: data.type || 'system',
    title: data.title,
    message: data.message,
    data: data.data || {}
  });
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing NotificationsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing NotificationsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

// Re-export all functions from singular notificationService for complete coverage
export const createNotification = notificationService.createNotification;
export const getUnreadCount = notificationService.getUnreadCount;
export const resetUnreadCount = notificationService.resetUnreadCount;
export const getNotifications = notificationService.getNotifications;
export const syncOfflineNotifications = notificationService.syncOfflineNotifications;
export const markAsRead = notificationService.markAsRead;
export const markAllAsRead = notificationService.markAllAsRead;
export const broadcastAnnouncement = notificationService.broadcastAnnouncement;

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
  createNotification,
  getUnreadCount,
  resetUnreadCount,
  getNotifications,
  syncOfflineNotifications,
  markAsRead,
  markAllAsRead,
  broadcastAnnouncement
};
