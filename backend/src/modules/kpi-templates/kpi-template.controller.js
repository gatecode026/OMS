/**
 * @file src/modules/kpi-templates/kpi-template.controller.js
 * @description Controllers for KPI Templates.
 */

import service from './kpi-template.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getTemplates = asyncHandler(async (req, res) => {
  const data = await service.findAllTemplates(req.query);
  return successResponse(res, data, 'KPI Templates fetched successfully');
});

export const getTemplateById = asyncHandler(async (req, res) => {
  const data = await service.findTemplateById(req.params.id);
  if (!data) {
    return res.status(404).json({ status: 'fail', message: 'KPI Template not found' });
  }
  return successResponse(res, data, 'KPI Template fetched successfully');
});

export const postTemplate = asyncHandler(async (req, res) => {
  const data = await service.createTemplate(req.body, req.user);
  return successResponse(res, data, 'KPI Template created successfully', 201);
});

export const putTemplate = asyncHandler(async (req, res) => {
  const data = await service.updateTemplate(req.params.id, req.body, req.user);
  return successResponse(res, data, 'KPI Template updated successfully');
});

export const postPublish = asyncHandler(async (req, res) => {
  const data = await service.publishTemplate(req.params.id, req.user);
  return successResponse(res, data, 'KPI Template published successfully');
});

export const postNewVersion = asyncHandler(async (req, res) => {
  const data = await service.createNewVersion(req.params.id, req.user);
  return successResponse(res, data, 'New KPI Template version created successfully', 201);
});

export const postArchive = asyncHandler(async (req, res) => {
  const data = await service.archiveTemplate(req.params.id, req.user);
  return successResponse(res, data, 'KPI Template archived successfully');
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  await service.deleteTemplate(req.params.id, req.user);
  return successResponse(res, null, 'KPI Template deleted successfully');
});

export default {
  getTemplates,
  getTemplateById,
  postTemplate,
  putTemplate,
  postPublish,
  postNewVersion,
  postArchive,
  deleteTemplate
};
