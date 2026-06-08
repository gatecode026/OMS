/**
 * @file src/modules/announcements/announcements.repository.js
 * @description Data Access Repository layer for Announcements module.
 */

import { Announcement, EmergencyAlert, AnnouncementTrackingLog, AnnouncementAuditLog } from './announcement.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.debug('Executing AnnouncementsRepository::find', query);
  const filters = {};
  if (query.category) filters.category = query.category;
  if (query.priority) filters.priority = query.priority;
  if (query.status) filters.status = query.status;

  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filters.$or = [
      { title: regex },
      { description: regex },
      { publishedBy: regex }
    ];
  }

  return Announcement.find(filters).sort({ pinned: -1, publishDate: -1 });
};

export const findById = async (id) => {
  logger.debug('Executing AnnouncementsRepository::findById for ID: ' + id);
  return Announcement.findOne({ id });
};

export const save = async (data) => {
  logger.debug('Executing AnnouncementsRepository::save', data);
  const id = data.id || `ANN-${Date.now().toString().slice(-4)}`;
  const existing = await Announcement.findOne({ id });
  if (existing) {
    return Announcement.findOneAndUpdate({ id }, data, { new: true });
  }
  return Announcement.create({ ...data, id });
};

export const remove = async (id) => {
  logger.debug('Executing AnnouncementsRepository::remove for ID: ' + id);
  return Announcement.findOneAndDelete({ id });
};

// Emergency Alert operations
export const getEmergency = async () => {
  logger.debug('Executing AnnouncementsRepository::getEmergency');
  let alert = await EmergencyAlert.findOne({ id: 'EMERGENCY_ALERT' });
  if (!alert) {
    alert = await EmergencyAlert.create({
      id: 'EMERGENCY_ALERT',
      isActive: false,
      title: '',
      description: '',
      date: ''
    });
  }
  return alert;
};

export const saveEmergency = async (data) => {
  logger.debug('Executing AnnouncementsRepository::saveEmergency', data);
  return EmergencyAlert.findOneAndUpdate(
    { id: 'EMERGENCY_ALERT' },
    { ...data, id: 'EMERGENCY_ALERT' },
    { new: true, upsert: true }
  );
};

// Tracking Logs operations
export const findTrackingLogs = async (query = {}) => {
  logger.debug('Executing AnnouncementsRepository::findTrackingLogs', query);
  const filters = {};
  if (query.announcementId) filters.announcementId = query.announcementId;
  if (query.employeeId) filters.employeeId = query.employeeId;
  return AnnouncementTrackingLog.find(filters).sort({ updatedAt: -1 });
};

export const saveTrackingLog = async (data) => {
  logger.debug('Executing AnnouncementsRepository::saveTrackingLog', data);
  const id = data.id || `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const existing = await AnnouncementTrackingLog.findOne({ announcementId: data.announcementId, employeeId: data.employeeId });
  if (existing) {
    return AnnouncementTrackingLog.findOneAndUpdate(
      { announcementId: data.announcementId, employeeId: data.employeeId },
      data,
      { new: true }
    );
  }
  return AnnouncementTrackingLog.create({ ...data, id });
};

// Audit Logs operations
export const findAuditLogs = async () => {
  logger.debug('Executing AnnouncementsRepository::findAuditLogs');
  return AnnouncementAuditLog.find({}).sort({ createdAt: -1 });
};

export const saveAuditLog = async (data) => {
  logger.debug('Executing AnnouncementsRepository::saveAuditLog', data);
  const id = data.id || `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return AnnouncementAuditLog.create({ ...data, id });
};

export default {
  find,
  findById,
  save,
  remove,
  getEmergency,
  saveEmergency,
  findTrackingLogs,
  saveTrackingLog,
  findAuditLogs,
  saveAuditLog
};
