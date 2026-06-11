/**
 * @file src/modules/roles/roles.repository.js
 * @description Repository layer for Roles and Permission Modules.
 */

import Role from './roles.model.js';
import PermissionModule from './permission-modules.model.js';
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

// --- Permission Modules ---

export const findModules = async (query = {}) => {
  logger.info('RolesRepository::findModules querying permission modules from database...');
  return PermissionModule.find(query);
};

export const saveModule = async (data) => {
  logger.info(`RolesRepository::saveModule creating permission module: ${data.name || data.label}`);
  const key = data.key || (data.name || data.label).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const label = data.label || data.name;
  
  // Create permission module document
  const pm = await PermissionModule.create({ key, label });

  // Add this module key to the permissions map of all existing roles with false properties
  await Role.updateMany({}, {
    $set: {
      [`permissions.${key}`]: { create: false, read: false, update: false, delete: false, approve: false, export: false }
    }
  });

  return pm;
};

export const deleteModule = async (key) => {
  logger.info(`RolesRepository::deleteModule deleting permission module with key: ${key}`);
  
  // Delete permission module document
  const pm = await PermissionModule.findOneAndDelete({ key });

  // Remove this module key from the permissions map of all existing roles
  await Role.updateMany({}, {
    $unset: {
      [`permissions.${key}`]: ""
    }
  });

  return pm;
};

export default {
  find,
  findOne,
  save,
  update,
  remove,
  findModules,
  saveModule,
  deleteModule
};
