/**
 * @file src/modules/performance/pips.repository.js
 * @description Repository layer for PIP plans.
 */

import Pip from './pip.model.js';
import logger from '../../config/logger.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import { getTenantId } from '../../utils/tenantContext.js';

export const find = async (query = {}) => {
  logger.info('PipsRepository::find querying PIPs from database...');
  return Pip.find(query);
};

export const findOne = async (id) => {
  logger.info(`PipsRepository::findOne querying PIP with ID: ${id}`);
  return Pip.findOne({ id });
};

export const save = async (data) => {
  logger.info(`PipsRepository::save creating PIP for: ${data.employeeName}`);
  if (!data.id) {
    const tenantId = getTenantId() || 'COMP-DEFAULT';
    data.id = await generateCompanyUniqueId(tenantId, 'pip');
  }
  return Pip.create(data);
};

export const update = async (id, data) => {
  logger.info(`PipsRepository::update updating PIP with ID: ${id}`);
  return Pip.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const remove = async (id) => {
  logger.info(`PipsRepository::remove deleting PIP with ID: ${id}`);
  return Pip.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
