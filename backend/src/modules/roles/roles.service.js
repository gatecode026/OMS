/**
 * @file src/modules/roles/roles.service.js
 * @description Service business logic for Roles and Permission Modules.
 */

import repository from './roles.repository.js';
import overridesRepository from './overrides.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing RolesService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing RolesService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing RolesService::createRecord by user: ' + currentUser?.id);
  return repository.save(data);
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing RolesService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.update(id, data);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing RolesService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export const findAllOverrides = async (query) => {
  logger.info('Executing RolesService::findAllOverrides query');
  return overridesRepository.find(query);
};

export const createOverrideRecord = async (data, currentUser) => {
  logger.info('Executing RolesService::createOverrideRecord by user: ' + currentUser?.id);
  return overridesRepository.save(data);
};

export const deleteOverrideRecord = async (id, currentUser) => {
  logger.info('Executing RolesService::deleteOverrideRecord for: ' + id + ' by user: ' + currentUser?.id);
  return overridesRepository.remove(id);
};

// --- Permission Modules ---

export const findAllPermissionModules = async (query) => {
  logger.info('Executing RolesService::findAllPermissionModules query');
  return repository.findModules(query);
};

export const createPermissionModule = async (data, currentUser) => {
  logger.info('Executing RolesService::createPermissionModule by user: ' + currentUser?.id);
  return repository.saveModule(data);
};

export const deletePermissionModule = async (key, currentUser) => {
  logger.info('Executing RolesService::deletePermissionModule for key: ' + key + ' by user: ' + currentUser?.id);
  return repository.deleteModule(key);
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
  findAllOverrides,
  createOverrideRecord,
  deleteOverrideRecord,
  findAllPermissionModules,
  createPermissionModule,
  deletePermissionModule
};
