/**
 * @file src/modules/kpi-employee-evaluations/kpi-employee-evaluation.repository.js
 * @description Data Access layer for KPI Employee Evaluations.
 */

import KpiEmployeeEvaluation from './kpi-employee-evaluation.model.js';
import logger from '../../config/logger.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import { getTenantId } from '../../utils/tenantContext.js';

export const find = async (query = {}) => {
  logger.info('KpiEmployeeEvaluationRepository::find querying employee evaluations...');
  return KpiEmployeeEvaluation.find(query).sort({ createdAt: -1 });
};

export const findOne = async (id) => {
  logger.info(`KpiEmployeeEvaluationRepository::findOne querying evaluation with ID: ${id}`);
  return KpiEmployeeEvaluation.findOne({ id });
};

export const save = async (data) => {
  logger.info('KpiEmployeeEvaluationRepository::save creating evaluation...');
  if (!data.id) {
    const tenantId = getTenantId() || 'COMP-DEFAULT';
    data.id = await generateCompanyUniqueId(tenantId, 'kpiemployeeevaluations');
  }
  return KpiEmployeeEvaluation.create(data);
};

export const update = async (id, data) => {
  logger.info(`KpiEmployeeEvaluationRepository::update updating evaluation with ID: ${id}`);
  return KpiEmployeeEvaluation.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const remove = async (id) => {
  logger.info(`KpiEmployeeEvaluationRepository::remove deleting evaluation with ID: ${id}`);
  return KpiEmployeeEvaluation.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
