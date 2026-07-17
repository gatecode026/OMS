/**
 * @file src/modules/security/security.controller.js
 * @description Controllers for Security & SOC configurations and entries.
 */

import service from './security.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getIO } from '../../config/socket.js';
import { UserSession, EmployeeLockout } from './security.model.js';
import { blacklistToken } from '../../services/security.service.js';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';

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
  // 1. Look up the session to get the employeeId before deleting it
  const session = await UserSession.findOne({ id: req.params.id });

  // 2. Read optional lock duration from query parameter (in minutes)
  const durationMin = parseInt(req.query.duration, 10);
  let lockedUntil = null;
  let durationLabel = '';

  if (session && !isNaN(durationMin) && durationMin > 0) {
    lockedUntil = new Date(Date.now() + durationMin * 60 * 1000);
    if (durationMin < 60) {
      durationLabel = `${durationMin} Minutes`;
    } else if (durationMin === 60) {
      durationLabel = '1 Hour';
    } else if (durationMin === 1440) {
      durationLabel = '24 Hours';
    } else {
      durationLabel = `${Math.round(durationMin / 60)} Hours`;
    }

    // Create a lockout entry
    await EmployeeLockout.create({
      employeeId: session.employeeId,
      employeeName: session.employeeName,
      companyId: session.companyId,
      lockedUntil,
      durationLabel,
      reason: req.query.reason || 'Force logout by administrator',
      lockedBy: req.user?.name || 'Admin'
    });
  }

  // 3. Delete the session record from DB
  const data = await service.deleteSession(req.params.id);

  if (session) {
    // 4. Emit force_logout to the target user's socket room
    try {
      const io = getIO();
      const logoutReason = lockedUntil 
        ? `Your session was terminated by an administrator. You have been locked out from logging in for ${durationLabel}.`
        : 'Your session was terminated by an administrator.';
      
      io.to(`user:${session.employeeId}`).emit('force_logout', {
        reason: logoutReason,
        by: req.user?.name || 'Admin',
        lockedUntil
      });
    } catch (socketErr) {
      // Non-critical if socket is not available
    }
  }

  return successResponse(res, data, 'Session terminated successfully');
});
export const deleteSessionsExcept = asyncHandler(async (req, res) => {
  const { keepId } = req.body;

  // Get all sessions that will be terminated (everyone except current user)
  const toTerminate = await UserSession.find({ employeeId: { $ne: keepId } });

  // Delete them from DB
  const data = await service.terminateAllSessionsExcept(keepId);

  // Emit force_logout to each terminated user's socket room
  try {
    const io = getIO();
    toTerminate.forEach(sess => {
      io.to(`user:${sess.employeeId}`).emit('force_logout', {
        reason: 'All sessions were terminated by an administrator.',
        by: req.user?.name || 'Admin'
      });
    });
  } catch (socketErr) {
    // Non-critical
  }

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
