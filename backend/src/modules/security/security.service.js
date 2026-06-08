/**
 * @file src/modules/security/security.service.js
 * @description Service business logic for Security & SOC operations.
 */

import repository from './security.repository.js';
import logger from '../../config/logger.js';

// --- IP Whitelist ---
export const fetchWhitelist = async () => repository.getWhitelist();
export const addWhitelist = async (data) => repository.saveWhitelist(data);
export const editWhitelist = async (id, data) => repository.updateWhitelist(id, data);
export const deleteWhitelist = async (id) => repository.removeWhitelist(id);

// --- IP Blocklist ---
export const fetchBlocklist = async () => repository.getBlocklist();
export const addBlocklist = async (data) => repository.saveBlocklist(data);
export const deleteBlocklist = async (id) => repository.removeBlocklist(id);

// --- Devices ---
export const fetchDevices = async () => repository.getDevices();
export const addDevice = async (data) => repository.saveDevice(data);
export const editDevice = async (id, data) => repository.updateDevice(id, data);
export const deleteDevice = async (id) => repository.removeDevice(id);

// --- Sessions ---
export const fetchSessions = async () => repository.getSessions();
export const addSession = async (data) => repository.saveSession(data);
export const deleteSession = async (id) => repository.removeSession(id);
export const terminateAllSessionsExcept = async (keepId) => repository.removeAllSessionsExcept(keepId);

// --- Alerts ---
export const fetchAlerts = async () => repository.getAlerts();
export const editAlert = async (id, data) => repository.updateAlert(id, data);
export const clearAlerts = async () => repository.removeAlerts();

export default {
  fetchWhitelist,
  addWhitelist,
  editWhitelist,
  deleteWhitelist,
  fetchBlocklist,
  addBlocklist,
  deleteBlocklist,
  fetchDevices,
  addDevice,
  editDevice,
  deleteDevice,
  fetchSessions,
  addSession,
  deleteSession,
  terminateAllSessionsExcept,
  fetchAlerts,
  editAlert,
  clearAlerts
};
