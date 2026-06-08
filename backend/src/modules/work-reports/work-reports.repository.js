/**
 * @file src/modules/work-reports/work-reports.repository.js
 * @description Data Access layer for WorkReports module using MongoDB.
 */

import WorkReport from './work-reports.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.debug('Executing WorkReportsRepository::find', query);
  const filter = {};
  
  if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }
  if (query.department) {
    filter.department = query.department;
  }
  if (query.status && query.status !== 'All') {
    filter.status = query.status;
  }
  if (query.project && query.project !== 'All') {
    filter.project = query.project;
  }
  if (query.date) {
    filter.date = query.date;
  }
  
  return WorkReport.find(filter).sort({ submittedTime: -1 });
};

export const findOne = async (id) => {
  logger.debug('Executing WorkReportsRepository::findOne for: ' + id);
  return WorkReport.findOne({ id });
};

export const save = async (data) => {
  logger.debug('Executing WorkReportsRepository::save', data);
  if (!data.id) {
    const count = await WorkReport.countDocuments();
    data.id = `REP-${String(count + 1).padStart(3, '0')}`;
  }
  return WorkReport.create(data);
};

export const update = async (id, data) => {
  logger.debug('Executing WorkReportsRepository::update for: ' + id, data);
  return WorkReport.findOneAndUpdate({ id }, data, { new: true });
};

export const remove = async (id) => {
  logger.debug('Executing WorkReportsRepository::remove for: ' + id);
  return WorkReport.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
