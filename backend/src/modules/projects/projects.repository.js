/**
 * @file src/modules/projects/projects.repository.js
 * @description Data Access layer for Projects module.
 */

import Project from './projects.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.debug('Executing ProjectsRepository::find', query);
  const filter = {};
  if (query.department) {
    filter.department = query.department;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.priority) {
    filter.priority = query.priority;
  }
  return Project.find(filter).sort({ id: 1 });
};

export const findOne = async (id) => {
  logger.debug('Executing ProjectsRepository::findOne for: ' + id);
  return Project.findOne({ id });
};

export const save = async (data) => {
  logger.debug('Executing ProjectsRepository::save', data);
  if (!data.id) {
    const count = await Project.countDocuments();
    data.id = `PRJ-${String(count + 1).padStart(3, '0')}`;
  }
  return Project.create(data);
};

export const update = async (id, data) => {
  logger.debug('Executing ProjectsRepository::update for: ' + id, data);
  return Project.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.debug('Executing ProjectsRepository::remove for: ' + id);
  return Project.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
