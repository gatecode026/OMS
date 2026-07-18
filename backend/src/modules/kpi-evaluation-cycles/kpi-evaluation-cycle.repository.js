/**
 * @file src/modules/kpi-evaluation-cycles/kpi-evaluation-cycle.repository.js
 * @description Data Access layer for KPI Evaluation Cycles.
 */

import KpiEvaluationCycle from './kpi-evaluation-cycle.model.js';
import logger from '../../config/logger.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import { getTenantId } from '../../utils/tenantContext.js';

export const find = async (query = {}) => {
  logger.info('KpiEvaluationCycleRepository::find querying cycles...');
  return KpiEvaluationCycle.find(query).sort({ createdAt: -1 });
};

export const findOne = async (id) => {
  logger.info(`KpiEvaluationCycleRepository::findOne querying cycle with ID: ${id}`);
  return KpiEvaluationCycle.findOne({ id });
};

export const save = async (data) => {
  logger.info('KpiEvaluationCycleRepository::save creating cycle...');
  if (!data.id) {
    const tenantId = getTenantId() || 'COMP-DEFAULT';
    data.id = await generateCompanyUniqueId(tenantId, 'kpievaluationcycles');
  }
  return KpiEvaluationCycle.create(data);
};

export const update = async (id, data) => {
  logger.info(`KpiEvaluationCycleRepository::update updating cycle with ID: ${id}`);
  return KpiEvaluationCycle.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const remove = async (id) => {
  logger.info(`KpiEvaluationCycleRepository::remove deleting cycle with ID: ${id}`);
  return KpiEvaluationCycle.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
