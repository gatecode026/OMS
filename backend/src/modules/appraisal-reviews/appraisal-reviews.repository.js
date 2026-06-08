/**
 * @file src/modules/appraisal-reviews/appraisal-reviews.repository.js
 * @description Data Access layer for Appraisal Reviews module using MongoDB.
 */

import AppraisalReview from './appraisal-reviews.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.debug('Executing AppraisalReviewRepository::find', query);
  const filter = {};

  if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }
  if (query.employeeName) {
    filter.employeeName = query.employeeName;
  }
  if (query.rating) {
    filter.rating = query.rating;
  }

  return AppraisalReview.find(filter).sort({ date: -1 });
};

export const findOne = async (id) => {
  logger.debug('Executing AppraisalReviewRepository::findOne for: ' + id);
  return AppraisalReview.findOne({ id });
};

export const save = async (data) => {
  logger.debug('Executing AppraisalReviewRepository::save', data);
  if (!data.id) {
    const count = await AppraisalReview.countDocuments();
    data.id = `REV-${String(count + 1).padStart(3, '0')}`;
  }
  return AppraisalReview.create(data);
};

export const remove = async (id) => {
  logger.debug('Executing AppraisalReviewRepository::remove for: ' + id);
  return AppraisalReview.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  remove
};
