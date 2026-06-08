/**
 * @file src/modules/roles/overrides.repository.js
 * @description Data Access Repository layer for User Access Overrides.
 */

import UserOverride from './overrides.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('OverridesRepository::find querying overrides from database...');
  return UserOverride.find(query).sort({ createdAt: -1 });
};

export const findOne = async (id) => {
  logger.info(`OverridesRepository::findOne querying override with ID: ${id}`);
  return UserOverride.findOne({ id });
};

export const save = async (data) => {
  logger.info(`OverridesRepository::save creating override for user: ${data.userName}`);
  if (!data.id) {
    data.id = 'OVR-' + Math.floor(100 + Math.random() * 900);
  }
  return UserOverride.create(data);
};

export const remove = async (id) => {
  logger.info(`OverridesRepository::remove deleting override with ID: ${id}`);
  return UserOverride.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  remove
};
