/**
 * @file src/modules/appraisal-reviews/appraisal-reviews.service.js
 * @description Service business logic for Appraisal Reviews module.
 */

import repository from './appraisal-reviews.repository.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing AppraisalReviewService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing AppraisalReviewService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing AppraisalReviewService::createRecord by user: ' + currentUser?.id);
  const record = {
    ...data,
    reviewer: currentUser?.name || 'Super Admin',
    date: new Date().toISOString().split('T')[0]
  };
  return repository.save(record);
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing AppraisalReviewService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  return repository.remove(id);
};

export default {
  findAll,
  findById,
  createRecord,
  deleteRecord
};
