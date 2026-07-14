/**
 * @file src/modules/payroll-queries/payroll-query.repository.js
 * @description Data access layer for Payroll Queries.
 */

import PayrollQuery from './payroll-query.model.js';
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { PayrollQueryBuilder } from './payroll-query.queryBuilder.js';
import logger from '../../config/logger.js';

export const create = async (queryData) => {
  logger.info('Executing PayrollQueryRepository::create');
  const record = new PayrollQuery(queryData);
  return await record.save();
};

export const find = async (query = {}) => {
  logger.info('Executing PayrollQueryRepository::find');
  const context = resolveSecurityContext();
  const builder = new PayrollQueryBuilder(context);
  
  const queryFilters = await builder.buildQuery(query);
  return await PayrollQuery.find(queryFilters).sort({ createdAt: -1 }).lean();
};

export const findById = async (id) => {
  logger.info(`Executing PayrollQueryRepository::findById for id: ${id}`);
  const context = resolveSecurityContext();
  const builder = new PayrollQueryBuilder(context);

  const queryFilters = await builder.buildQuery({ id });
  return await PayrollQuery.findOne(queryFilters);
};

export const update = async (id, updateData) => {
  logger.info(`Executing PayrollQueryRepository::update for id: ${id}`);
  const context = resolveSecurityContext();
  const builder = new PayrollQueryBuilder(context);

  const queryFilters = await builder.buildQuery({ id });
  return await PayrollQuery.findOneAndUpdate(queryFilters, updateData, { new: true });
};

export const addMessage = async (id, messageObj) => {
  logger.info(`Executing PayrollQueryRepository::addMessage for id: ${id}`);
  const context = resolveSecurityContext();
  const builder = new PayrollQueryBuilder(context);

  const queryFilters = await builder.buildQuery({ id });
  return await PayrollQuery.findOneAndUpdate(
    queryFilters,
    { $push: { messages: messageObj } },
    { new: true }
  );
};

export const addInternalNote = async (id, noteObj) => {
  logger.info(`Executing PayrollQueryRepository::addInternalNote for id: ${id}`);
  const context = resolveSecurityContext();
  const builder = new PayrollQueryBuilder(context);

  const queryFilters = await builder.buildQuery({ id });
  return await PayrollQuery.findOneAndUpdate(
    queryFilters,
    { $push: { internalNotes: noteObj } },
    { new: true }
  );
};

export const addAuditTrail = async (id, auditObj) => {
  logger.info(`Executing PayrollQueryRepository::addAuditTrail for id: ${id}`);
  const context = resolveSecurityContext();
  const builder = new PayrollQueryBuilder(context);

  const queryFilters = await builder.buildQuery({ id });
  return await PayrollQuery.findOneAndUpdate(
    queryFilters,
    { $push: { auditTrail: auditObj } },
    { new: true }
  );
};
