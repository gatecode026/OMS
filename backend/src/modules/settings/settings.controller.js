/**
 * @file src/modules/settings/settings.controller.js
 * @description Controllers for Settings module.
 */

import service from './settings.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query);
  return successResponse(res, data, 'Records fetched successfully');
});

export const getById = asyncHandler(async (req, res) => {
  const data = await service.findById(req.params.id);
  return successResponse(res, data, 'Record fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  // Always upsert the single global settings document
  const data = await service.updateRecord('global', req.body, req.user);
  return successResponse(res, data, 'Settings saved successfully');
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
  const settings = await service.findById('global');
  if (settings && settings.companyProfile?.companyName && settings.generalSettings?.companyName !== settings.companyProfile.companyName) {
    if (typeof settings.set === 'function') {
      settings.set('generalSettings.companyName', settings.companyProfile.companyName);
      await settings.save();
    }
  }
  return successResponse(res, {
    companyName: settings?.companyProfile?.companyName || settings?.generalSettings?.companyName || 'Gatecode OMS',
    websiteUrl: settings?.companyProfile?.websiteUrl || 'https://office-management.com',
    officialEmail: settings?.companyProfile?.officialEmail || 'admin@saas.com',
    officialPhone: settings?.companyProfile?.officialPhone || '+91 11 4050 6070'
  }, 'Public settings fetched successfully');
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getPublicData
};
