/**
 * @file src/modules/roles/roles.repository.js
 * @description Repository layer for Roles module.
 */

import Role from './roles.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('RolesRepository::find querying roles from database...');
  return Role.find(query);
};

export const findOne = async (id) => {
  logger.info(`RolesRepository::findOne querying role with ID: ${id}`);
  return Role.findOne({ id });
};

export const save = async (data) => {
  logger.info(`RolesRepository::save creating role: ${data.name}`);
  return Role.create(data);
};

export const update = async (id, data) => {
  logger.info(`RolesRepository::update updating role with ID: ${id}`);
  return Role.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.info(`RolesRepository::remove deleting role with ID: ${id}`);
  return Role.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
