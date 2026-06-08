/**
 * @file src/modules/security/security.repository.js
 * @description Repository Data Access Layer for Security & SOC operations.
 */

import { IpWhitelist, IpBlocklist, UserDevice, UserSession, SecurityAlert } from './security.model.js';
import logger from '../../config/logger.js';

// --- IP Whitelist ---
export const getWhitelist = async (query = {}) => {
  logger.info('SecurityRepository::getWhitelist');
  return IpWhitelist.find(query);
};
export const saveWhitelist = async (data) => {
  logger.info(`SecurityRepository::saveWhitelist for ${data.ip}`);
  return IpWhitelist.create(data);
};
export const updateWhitelist = async (id, data) => {
  logger.info(`SecurityRepository::updateWhitelist for ${id}`);
  return IpWhitelist.findOneAndUpdate({ id }, data, { new: true });
};
export const removeWhitelist = async (id) => {
  logger.info(`SecurityRepository::removeWhitelist for ${id}`);
  return IpWhitelist.findOneAndDelete({ id });
};

// --- IP Blocklist ---
export const getBlocklist = async (query = {}) => {
  logger.info('SecurityRepository::getBlocklist');
  return IpBlocklist.find(query);
};
export const saveBlocklist = async (data) => {
  logger.info(`SecurityRepository::saveBlocklist for ${data.ipAddress}`);
  return IpBlocklist.create(data);
};
export const removeBlocklist = async (id) => {
  logger.info(`SecurityRepository::removeBlocklist for ${id}`);
  return IpBlocklist.findOneAndDelete({ id });
};

// --- Devices ---
export const getDevices = async (query = {}) => {
  logger.info('SecurityRepository::getDevices');
  return UserDevice.find(query);
};
export const saveDevice = async (data) => {
  logger.info(`SecurityRepository::saveDevice for ${data.name}`);
  return UserDevice.create(data);
};
export const updateDevice = async (id, data) => {
  logger.info(`SecurityRepository::updateDevice for ${id}`);
  return UserDevice.findOneAndUpdate({ id }, data, { new: true });
};
export const removeDevice = async (id) => {
  logger.info(`SecurityRepository::removeDevice for ${id}`);
  return UserDevice.findOneAndDelete({ id });
};

// --- Sessions ---
export const getSessions = async (query = {}) => {
  logger.info('SecurityRepository::getSessions');
  return UserSession.find(query);
};
export const saveSession = async (data) => {
  logger.info(`SecurityRepository::saveSession for ${data.employeeName}`);
  return UserSession.create(data);
};
export const removeSession = async (id) => {
  logger.info(`SecurityRepository::removeSession for ${id}`);
  return UserSession.findOneAndDelete({ id });
};
export const removeAllSessionsExcept = async (keepId) => {
  logger.info(`SecurityRepository::removeAllSessionsExcept keeping session ${keepId}`);
  return UserSession.deleteMany({ id: { $ne: keepId } });
};

// --- Security Alerts ---
export const getAlerts = async (query = {}) => {
  logger.info('SecurityRepository::getAlerts');
  return SecurityAlert.find(query);
};
export const updateAlert = async (id, data) => {
  logger.info(`SecurityRepository::updateAlert for ${id}`);
  return SecurityAlert.findOneAndUpdate({ id }, data, { new: true });
};
export const removeAlerts = async () => {
  logger.info('SecurityRepository::removeAlerts (all resolved)');
  return SecurityAlert.deleteMany({});
};

export default {
  getWhitelist,
  saveWhitelist,
  updateWhitelist,
  removeWhitelist,
  getBlocklist,
  saveBlocklist,
  removeBlocklist,
  getDevices,
  saveDevice,
  updateDevice,
  removeDevice,
  getSessions,
  saveSession,
  removeSession,
  removeAllSessionsExcept,
  getAlerts,
  updateAlert,
  removeAlerts
};
