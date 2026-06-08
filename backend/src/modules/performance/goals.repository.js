/**
 * @file src/modules/performance/goals.repository.js
 * @description Repository layer for OKR Goals.
 */

import Goal from './goal.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('GoalsRepository::find querying goals from database...');
  return Goal.find(query);
};

export const findOne = async (id) => {
  logger.info(`GoalsRepository::findOne querying goal with ID: ${id}`);
  return Goal.findOne({ id });
};

export const save = async (data) => {
  logger.info(`GoalsRepository::save creating goal: ${data.title}`);
  return Goal.create(data);
};

export const update = async (id, data) => {
  logger.info(`GoalsRepository::update updating goal with ID: ${id}`);
  return Goal.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const remove = async (id) => {
  logger.info(`GoalsRepository::remove deleting goal with ID: ${id}`);
  return Goal.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
