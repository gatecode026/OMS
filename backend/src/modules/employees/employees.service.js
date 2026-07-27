/**
 * @file src/modules/employees/employees.service.js
 * @description Service business logic for Employees module.
 */

import repository from './employees.repository.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';
import { uploadToImageKit } from '../../utils/imagekit.js';

/** True for an inline base64 image data URI. */
const isBase64Image = (v) =>
  typeof v === 'string' && v.startsWith('data:image') && v.includes(';base64,');

/**
 * Upload any inline base64 avatar/photo to ImageKit and replace it with the CDN
 * URL, so employee records (and the chat payloads that embed them) never carry
 * multi-MB data URIs. Forward-only + safe: on any failure the original value is
 * kept (uploadToImageKit itself returns the base64 back if keys are missing).
 * Mutates and returns `data`.
 */
const resolveAvatarFields = async (data) => {
  if (!data) return data;
  for (const field of ['avatar', 'photoUrl']) {
    if (isBase64Image(data[field])) {
      try {
        const url = await uploadToImageKit(data[field], `employee_${field}_${Date.now()}.jpg`);
        if (url && !url.startsWith('data:')) data[field] = url;
      } catch (err) {
        logger.warn(`[Employees] avatar upload failed, keeping inline base64: ${err.message}`);
      }
    }
  }
  return data;
};

export const findAll = async (query) => {
  logger.info('Executing EmployeesService::findAll query');
  return repository.find(query);
};

export const findById = async (id) => {
  logger.info('Executing EmployeesService::findById query: ' + id);
  return repository.findOne(id);
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing EmployeesService::createRecord by user: ' + currentUser?.id);
  
  // Enforce country default
  data.country = 'India';

  // Always strip the frontend-supplied id – the backend generates a company-scoped one
  delete data.id;

  // Convert any inline base64 avatar to an ImageKit URL before persisting.
  await resolveAvatarFields(data);

  // Check username uniqueness
  if (data.username) {
    const existing = await repository.find({ username: { $regex: new RegExp(`^${data.username.trim()}$`, 'i') } });
    if (existing && existing.length > 0) {
      const err = new Error('Username already exists');
      err.statusCode = 400;
      throw err;
    }
  }

  const record = await repository.save(data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'employees',
      action: 'create',
      data: record
    });
  }
  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing EmployeesService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);

  // Enforce country default
  if (data.country !== undefined) {
    data.country = 'India';
  }

  // Convert any inline base64 avatar to an ImageKit URL before persisting.
  await resolveAvatarFields(data);

  // Check username uniqueness
  if (data.username) {
    const existing = await repository.find({
      username: { $regex: new RegExp(`^${data.username.trim()}$`, 'i') },
      id: { $ne: id }
    });
    if (existing && existing.length > 0) {
      const err = new Error('Username already exists');
      err.statusCode = 400;
      throw err;
    }
  }

  const record = await repository.update(id, data);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'employees',
      action: 'update',
      data: record
    });
  }
  return record;
};

export const updateAvatarRecord = async (id, data, currentUser) => {
  logger.info('Executing EmployeesService::updateAvatarRecord for: ' + id);
  // Only allow the two avatar fields — everything else is stripped for safety
  const safePayload = {};
  if (data.avatar) safePayload.avatar = data.avatar;
  if (data.photoUrl) safePayload.photoUrl = data.photoUrl;
  // Convert any inline base64 avatar to an ImageKit URL before persisting.
  await resolveAvatarFields(safePayload);
  const record = await repository.updateAvatarDirect(id, safePayload);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'employees',
      action: 'update',
      data: record
    });
  }
  return record;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing EmployeesService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const record = await repository.remove(id);
  if (record && currentUser?.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'employees',
      action: 'delete',
      data: id
    });
  }
  return record;
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  updateAvatarRecord,
  deleteRecord
};
