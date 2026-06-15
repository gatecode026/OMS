/**
 * @file src/modules/tasks/tasks.repository.js
 * @description Data Access layer for Tasks module using Mongoose model.
 */

import logger from '../../config/logger.js';
import Task from './tasks.model.js';

export const find = async (query) => {
  logger.debug('Executing TasksRepository::find');
  return Task.find(query || {});
};

export const findOne = async (id) => {
  logger.debug('Executing TasksRepository::findOne for: ' + id);
  return Task.findOne({ id });
};

export const save = async (data) => {
  logger.debug('Executing TasksRepository::save', data);
  const task = new Task(data);
  return task.save();
};

export const update = async (id, data) => {
  logger.debug('Executing TasksRepository::update for: ' + id, data);
  return Task.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.debug('Executing TasksRepository::remove for: ' + id);
  return Task.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
