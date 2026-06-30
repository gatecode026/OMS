/**
 * @file src/modules/tasks/tasks.repository.js
 * @description Data Access layer for Tasks module, secured by the Enterprise Authorization Framework.
 */

import logger from '../../config/logger.js';
import Task from './tasks.model.js';
import Employee from '../employees/employees.model.js';

// Security and Query Builder Imports
import { resolveSecurityContext } from '../../security/scopeEngine.js';
import { 
  validateRepositoryAccess, 
  sanitizeQueryOperators, 
  getQueryLogging 
} from '../../security/repositoryContract.js';
import { TasksQueryBuilder } from './tasks.queryBuilder.js';

/**
 * Assign virtual matching branch and department properties to Task record.
 */
const injectTaskSecurityProperties = async (task, context) => {
  if (task && context && task.assigneeId) {
    const assignee = await Employee.findOne({ id: task.assigneeId }).select('branch department').lean();
    if (assignee) {
      task.branch = assignee.branch || '';
      task.department = assignee.department || '';
    }
  }
  return task;
};

export const find = async (query = {}) => {
  const context = resolveSecurityContext();
  const builder = new TasksQueryBuilder(context);

  sanitizeQueryOperators(query);

  const scopedFilters = await builder.buildReadQuery(query);

  if (getQueryLogging()) {
    logger.info(`[DEBUGLOG] TasksRepository::find:
    - Query: ${JSON.stringify(query)}
    - Scope: ${JSON.stringify(scopedFilters)}`);
  }

  return Task.find(scopedFilters);
};

export const findOne = async (id) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id });

  const task = await Task.findOne({ id });

  if (task && context) {
    await injectTaskSecurityProperties(task, context);
    await validateRepositoryAccess('read', task, {
      ownerIdFields: ['assigneeId'],
      moduleName: 'Tasks'
    });
  }

  return task;
};

export const save = async (data) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(data);

  if (context) {
    await validateRepositoryAccess('create', data, {
      ownerIdFields: [],
      moduleName: 'Tasks'
    });
  }

  logger.debug('Executing TasksRepository::save', data);
  const task = new Task(data);
  return task.save();
};

export const update = async (id, data) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators(data);

  const task = await Task.findOne({ id });
  if (!task) return null;

  if (context) {
    await injectTaskSecurityProperties(task, context);
    await validateRepositoryAccess('update', task, {
      ownerIdFields: ['assigneeId'],
      updatePayload: data,
      moduleName: 'Tasks'
    });
  }

  logger.debug('Executing TasksRepository::update for: ' + id, data);
  return Task.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  const context = resolveSecurityContext();
  sanitizeQueryOperators({ id });

  const task = await Task.findOne({ id });
  if (!task) return null;

  if (context) {
    await injectTaskSecurityProperties(task, context);
    await validateRepositoryAccess('delete', task, {
      ownerIdFields: ['assigneeId'],
      moduleName: 'Tasks'
    });
  }

  logger.debug('Executing TasksRepository::remove for: ' + id);
  return Task.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
