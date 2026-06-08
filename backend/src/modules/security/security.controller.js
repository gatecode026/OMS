/**
 * @file src/modules/security/security.controller.js
 * @description Controllers for Security & SOC configurations and entries.
 */

import service from './security.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// --- IP Whitelist ---
export const getWhitelist = asyncHandler(async (req, res) => {
  const data = await service.fetchWhitelist();
  return successResponse(res, data, 'IP Whitelist entries fetched');
});
export const postWhitelist = asyncHandler(async (req, res) => {
  const data = await service.addWhitelist(req.body);
  return successResponse(res, data, 'IP Whitelisted successfully', 201);
});
export const putWhitelist = asyncHandler(async (req, res) => {
  const data = await service.editWhitelist(req.params.id, req.body);
  return successResponse(res, data, 'IP Whitelist entry updated');
});
export const deleteWhitelist = asyncHandler(async (req, res) => {
  const data = await service.deleteWhitelist(req.params.id);
  return successResponse(res, data, 'IP Whitelist entry deleted');
});

// --- IP Blocklist ---
export const getBlocklist = asyncHandler(async (req, res) => {
  const data = await service.fetchBlocklist();
  return successResponse(res, data, 'Blocked IPs fetched');
});
export const postBlocklist = asyncHandler(async (req, res) => {
  const data = await service.addBlocklist(req.body);
  return successResponse(res, data, 'IP Blocked successfully', 201);
});
export const deleteBlocklist = asyncHandler(async (req, res) => {
  const data = await service.deleteBlocklist(req.params.id);
  return successResponse(res, data, 'IP unblocked successfully');
});

// --- Devices ---
export const getDevices = asyncHandler(async (req, res) => {
  const data = await service.fetchDevices();
  return successResponse(res, data, 'Authorized devices fetched');
});
export const postDevice = asyncHandler(async (req, res) => {
  const data = await service.addDevice(req.body);
  return successResponse(res, data, 'Device registered successfully', 201);
});
export const putDevice = asyncHandler(async (req, res) => {
  const data = await service.editDevice(req.params.id, req.body);
  return successResponse(res, data, 'Device registry updated');
});
export const deleteDevice = asyncHandler(async (req, res) => {
  const data = await service.deleteDevice(req.params.id);
  return successResponse(res, data, 'Device registry deleted');
});

// --- Sessions ---
export const getSessions = asyncHandler(async (req, res) => {
  const data = await service.fetchSessions();
  return successResponse(res, data, 'Active login sessions fetched');
});
export const postSession = asyncHandler(async (req, res) => {
  const data = await service.addSession(req.body);
  return successResponse(res, data, 'Session logged successfully', 201);
});
export const deleteSession = asyncHandler(async (req, res) => {
  const data = await service.deleteSession(req.params.id);
  return successResponse(res, data, 'Session terminated successfully');
});
export const deleteSessionsExcept = asyncHandler(async (req, res) => {
  const { keepId } = req.body;
  const data = await service.terminateAllSessionsExcept(keepId);
  return successResponse(res, data, 'All other sessions terminated successfully');
});

// --- Alerts ---
export const getAlerts = asyncHandler(async (req, res) => {
  const data = await service.fetchAlerts();
  return successResponse(res, data, 'Security alerts fetched');
});
export const putAlert = asyncHandler(async (req, res) => {
  const data = await service.editAlert(req.params.id, req.body);
  return successResponse(res, data, 'Security alert updated');
});
export const deleteAlerts = asyncHandler(async (req, res) => {
  const data = await service.clearAlerts();
  return successResponse(res, data, 'All alerts cleared successfully');
});

export default {
  getWhitelist,
  postWhitelist,
  putWhitelist,
  deleteWhitelist,
  getBlocklist,
  postBlocklist,
  deleteBlocklist,
  getDevices,
  postDevice,
  putDevice,
  deleteDevice,
  getSessions,
  postSession,
  deleteSession,
  deleteSessionsExcept,
  getAlerts,
  putAlert,
  deleteAlerts
};
