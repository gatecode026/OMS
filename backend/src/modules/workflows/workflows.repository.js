/**
 * @file src/modules/workflows/workflows.repository.js
 * @description Data Access layer for Workflows module using Mongoose model.
 */

import logger from '../../config/logger.js';
import Workflow from './workflows.model.js';

export const find = async (query) => {
  logger.debug('Executing WorkflowsRepository::find');
  return Workflow.find(query || {});
};

export const findOne = async (id) => {
  logger.debug('Executing WorkflowsRepository::findOne for: ' + id);
  return Workflow.findOne({ id });
};

export const save = async (data) => {
  logger.debug('Executing WorkflowsRepository::save', data);
  const workflow = new Workflow(data);
  return workflow.save();
};

export const update = async (id, data) => {
  logger.debug('Executing WorkflowsRepository::update for: ' + id, data);
  return Workflow.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.debug('Executing WorkflowsRepository::remove for: ' + id);
  return Workflow.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
