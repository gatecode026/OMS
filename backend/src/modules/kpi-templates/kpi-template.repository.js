/**
 * @file src/modules/kpi-templates/kpi-template.repository.js
 * @description Data Access layer for KPI Templates.
 */

import KpiTemplate from './kpi-template.model.js';
import logger from '../../config/logger.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import { getTenantId } from '../../utils/tenantContext.js';

export const find = async (query = {}) => {
  logger.info('KpiTemplateRepository::find querying templates...');
  return KpiTemplate.find(query).sort({ createdAt: -1 });
};

export const findOne = async (id) => {
  logger.info(`KpiTemplateRepository::findOne querying template with ID: ${id}`);
  return KpiTemplate.findOne({ id });
};

export const save = async (data) => {
  logger.info('KpiTemplateRepository::save creating template...');
  if (!data.id) {
    const tenantId = getTenantId() || 'COMP-DEFAULT';
    data.id = await generateCompanyUniqueId(tenantId, 'kpitemplates');
  }
  return KpiTemplate.create(data);
};

export const update = async (id, data) => {
  logger.info(`KpiTemplateRepository::update updating template with ID: ${id}`);
  return KpiTemplate.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const remove = async (id) => {
  logger.info(`KpiTemplateRepository::remove deleting template with ID: ${id}`);
  return KpiTemplate.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
