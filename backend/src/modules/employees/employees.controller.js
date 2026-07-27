/**
 * @file src/modules/employees/employees.controller.js
 * @description Controllers for Employees module.
 */

import service from './employees.service.js';
import * as exitService from './exit.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getIO } from '../../config/socket.js';
import { CacheKeys, cacheDel, cacheDelPattern } from '../../services/cache.service.js';
import logger from '../../config/logger.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query);
  return successResponse(res, data, 'Records fetched successfully');
});

export const getById = asyncHandler(async (req, res) => {
  const data = await service.findById(req.params.id);
  return successResponse(res, data, 'Record fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.createRecord(req.body, req.user);
  return successResponse(res, data, 'Record created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.updateRecord(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Record updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const data = await service.deleteRecord(req.params.id, req.user);
  return successResponse(res, data, 'Record deleted successfully');
});

export const getPublicData = asyncHandler(async (req, res) => {
  return successResponse(res, { status: 'mock_public_data' }, 'Public record fetched');
});

export const getOpenWork = asyncHandler(async (req, res) => {
  const data = await exitService.getOpenWork(req.params.id);
  return successResponse(res, data, 'Pending work checked successfully');
});

export const deactivate = asyncHandler(async (req, res) => {
  const data = await exitService.deactivate(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Employee deactivated and work reassigned successfully');
});

export const restore = asyncHandler(async (req, res) => {
  const data = await exitService.restore(req.params.id, req.user);
  return successResponse(res, data, 'Employee restored successfully');
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const { avatar, photoUrl } = req.body;
  if (!avatar && !photoUrl) {
    return res.status(400).json({ status: 'fail', message: 'No avatar URL provided.' });
  }
  // Self-ownership check: any authenticated employee can only update their own avatar
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ status: 'fail', message: 'Access denied: You can only update your own profile photo.' });
  }
  const data = await service.updateAvatarRecord(req.params.id, { avatar, photoUrl }, req.user);

  // Single Source of Truth Cache & Socket Sync
  const companyId = req.user.companyId;
  const userId = req.params.id;
  const newAvatar = data.avatar || data.photoUrl || avatar || photoUrl;

  try {
    if (companyId) {
      await cacheDel(CacheKeys.user(companyId, userId)).catch(() => {});
      await cacheDel(CacheKeys.sidebar(companyId, userId)).catch(() => {});
      await cacheDelPattern(CacheKeys.sidebar(companyId, '*')).catch(() => {});
    }

    const io = getIO();
    if (io) {
      const payload = {
        userId,
        employeeId: userId,
        name: data.name || req.user.name,
        avatarUrl: newAvatar,
        profilePhoto: newAvatar,
        avatar: newAvatar,
        photoUrl: newAvatar,
        designation: data.designation,
        department: data.department,
      };

      if (companyId) {
        io.to(`company:${companyId}`).emit('profile.updated', payload);
        io.to(`company:${companyId}`).emit('user.updated', payload);
      }
      io.to(`user:${userId}`).emit('profile.updated', payload);
      io.to(`user:${userId}`).emit('user.updated', payload);
      logger.info(`[updateAvatar] Broadcasted profile.updated for user ${userId}`);
    }
  } catch (syncErr) {
    logger.error('[updateAvatar] Socket/Cache sync error:', syncErr);
  }

  return successResponse(res, data, 'Profile photo updated successfully');
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getPublicData,
  getOpenWork,
  deactivate,
  restore,
  updateAvatar
};
