/**
 * @file src/modules/teams/teams.repository.js
 * @description Data Access layer for Teams module using MongoDB.
 */

import Team from './teams.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('TeamsRepository::find querying teams from database...');
  return Team.find(query);
};

export const findOne = async (id) => {
  logger.info(`TeamsRepository::findOne querying team with ID: ${id}`);
  return Team.findOne({ id });
};

export const save = async (data) => {
  logger.info(`TeamsRepository::save creating team: ${data.name}`);
  return Team.create(data);
};

export const update = async (id, data) => {
  logger.info(`TeamsRepository::update updating team with ID: ${id}`);
  return Team.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const remove = async (id) => {
  logger.info(`TeamsRepository::remove deleting team with ID: ${id}`);
  return Team.findOneAndDelete({ id });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
