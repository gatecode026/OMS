/**
 * @file src/modules/settings/settings.repository.js
 * @description Data Access layer for Settings module.
 */

import logger from '../../config/logger.js';
import SystemSettings from './settings.model.js';

export const find = async (query) => {
  logger.debug('Executing SettingsRepository::find (fetching global settings)');
  let settings = await SystemSettings.findOne({ key: 'global' });
  if (!settings) {
    settings = await SystemSettings.create({ key: 'global' });
  }
  return settings;
};

export const findOne = async (id) => {
  logger.debug('Executing SettingsRepository::findOne for global settings');
  let settings = await SystemSettings.findOne({ key: 'global' });
  if (!settings) {
    settings = await SystemSettings.create({ key: 'global' });
  }
  return settings;
};

export const save = async (data) => {
  logger.debug('Executing SettingsRepository::save', data);
  const cleanData = { ...data };
  delete cleanData._id;
  delete cleanData.__v;
  delete cleanData.key;

  return SystemSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: cleanData },
    { new: true, upsert: true }
  );
};

export const update = async (id, data) => {
  logger.debug('Executing SettingsRepository::update for: ' + id, data);
  const cleanData = { ...data };
  delete cleanData._id;
  delete cleanData.__v;
  delete cleanData.key;

  return SystemSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: cleanData },
    { new: true, upsert: true }
  );
};

export const remove = async (id) => {
  logger.debug('Executing SettingsRepository::remove for: ' + id);
  return SystemSettings.findOneAndDelete({ key: 'global' });
};

export default {
  find,
  findOne,
  save,
  update,
  remove
};
