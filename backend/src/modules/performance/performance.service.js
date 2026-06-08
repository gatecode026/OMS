/**
 * @file src/modules/performance/performance.service.js
 * @description Service business logic for Goals and PIPs.
 */

import goalsRepository from './goals.repository.js';
import pipsRepository from './pips.repository.js';
import logger from '../../config/logger.js';

// --- GOALS SERVICES ---
export const findAllGoals = async (query) => {
  logger.info('Executing PerformanceService::findAllGoals');
  return goalsRepository.find(query);
};

export const createGoal = async (data) => {
  logger.info('Executing PerformanceService::createGoal');
  return goalsRepository.save(data);
};

export const updateGoal = async (id, data) => {
  logger.info(`Executing PerformanceService::updateGoal for ${id}`);
  return goalsRepository.update(id, data);
};

export const deleteGoal = async (id) => {
  logger.info(`Executing PerformanceService::deleteGoal for ${id}`);
  return goalsRepository.remove(id);
};

// --- PIP SERVICES ---
export const findAllPips = async (query) => {
  logger.info('Executing PerformanceService::findAllPips');
  return pipsRepository.find(query);
};

export const createPip = async (data) => {
  logger.info('Executing PerformanceService::createPip');
  return pipsRepository.save(data);
};

export const updatePip = async (id, data) => {
  logger.info(`Executing PerformanceService::updatePip for ${id}`);
  return pipsRepository.update(id, data);
};

export const deletePip = async (id) => {
  logger.info(`Executing PerformanceService::deletePip for ${id}`);
  return pipsRepository.remove(id);
};

export default {
  findAllGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  findAllPips,
  createPip,
  updatePip,
  deletePip
};
