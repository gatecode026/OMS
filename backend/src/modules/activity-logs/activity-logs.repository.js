/**
 * @file src/modules/activity-logs/activity-logs.repository.js
 * @description Data Access layer for ActivityLogs module using MongoDB.
 */

import ActivityLog from './activity-log.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('ActivityLogsRepository::find querying logs from database...');
  return ActivityLog.find(query).sort({ createdAt: -1 }).limit(200);
};

export const findOne = async (id) => {
  logger.info(`ActivityLogsRepository::findOne querying log with ID: ${id}`);
  return ActivityLog.findOne({ id });
};

export const save = async (data) => {
  logger.info(`ActivityLogsRepository::save creating activity log: ${data.actionType}`);
  return ActivityLog.create(data);
};

export const update = async (id, data) => {
  logger.info(`ActivityLogsRepository::update updating log with ID: ${id}`);
  return ActivityLog.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.info(`ActivityLogsRepository::remove deleting log with ID: ${id}`);
  return ActivityLog.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
