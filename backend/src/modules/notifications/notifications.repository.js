/**
 * @file src/modules/notifications/notifications.repository.js
 * @description Repository layer for Notifications module using Mongoose.
 */

import Notification from './notification.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('NotificationsRepository::find querying notifications from database...');
  return Notification.find(query).sort({ createdAt: -1 });
};

export const findOne = async (id) => {
  logger.info(`NotificationsRepository::findOne querying notification with ID: ${id}`);
  return Notification.findOne({ id });
};

export const save = async (data) => {
  logger.info(`NotificationsRepository::save creating notification: ${data.title}`);
  if (!data.id) {
    data.id = 'NTF-' + Math.floor(100 + Math.random() * 900);
  }
  if (!data.time) {
    data.time = 'Just now';
  }
  return Notification.create(data);
};

export const update = async (id, data) => {
  logger.info(`NotificationsRepository::update updating notification with ID: ${id}`);
  return Notification.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.info(`NotificationsRepository::remove deleting notification with ID: ${id}`);
  return Notification.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
