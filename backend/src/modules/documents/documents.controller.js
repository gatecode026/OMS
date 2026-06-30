/**
 * @file src/modules/documents/documents.controller.js
 * @description Controllers for Documents module.
 */

import service from './documents.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import { runWithTenant } from '../../utils/tenantContext.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query, req.user);
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

export const incrementDownloads = asyncHandler(async (req, res) => {
  const data = await service.incrementDownloads(req.params.id);
  return successResponse(res, data, 'Downloads count incremented successfully');
});

export const serveFile = asyncHandler(async (req, res) => {
  // Accept token from query param (for img/iframe src) OR Authorization header (for fetch)
  let token = req.query.token;
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ status: 'fail', message: 'Authentication required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(401).json({ status: 'fail', message: 'Invalid or expired token.' });
  }

  const companyId = decoded.companyId || 'COMP-DEFAULT';
  const docId = req.params.id;
  const isDownload = req.query.download === 'true';

  // Wrap DB calls in tenant context (since this route runs outside authenticate middleware)
  const document = await runWithTenant(companyId, () => service.findById(docId));

  if (!document || !document.fileUrl) {
    return res.status(404).json({ status: 'fail', message: 'File not found' });
  }

  let response;
  try {
    response = await fetch(document.fileUrl);
  } catch (err) {
    return res.status(502).json({ status: 'fail', message: 'Failed to reach file storage provider' });
  }

  if (!response.ok) {
    return res.status(502).json({ status: 'fail', message: 'File storage provider returned an error' });
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);

  if (isDownload) {
    const fileExt = document.type ? document.type.toLowerCase() : 'bin';
    const filename = document.name.endsWith(`.${fileExt}`) ? document.name : `${document.name}.${fileExt}`;
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    // Increment download count
    await runWithTenant(companyId, () => service.incrementDownloads(docId));
  } else {
    res.setHeader('Content-Disposition', 'inline');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return res.send(buffer);
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getPublicData,
  incrementDownloads,
  serveFile
};
