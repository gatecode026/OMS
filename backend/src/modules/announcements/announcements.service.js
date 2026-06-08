/**
 * @file src/modules/announcements/announcements.service.js
 * @description Service business logic layer for Announcements module.
 */

import repository from './announcements.repository.js';
import Employee from '../employees/employees.model.js';
import logger from '../../config/logger.js';

export const findAll = async (query) => {
  logger.info('Executing AnnouncementsService::findAll');
  return repository.find(query);
};

export const createRecord = async (data, currentUser) => {
  logger.info(`Executing AnnouncementsService::createRecord by user: ${currentUser?.name}`);
  const id = `ANN-${Date.now().toString().slice(-4)}`;
  const record = await repository.save({
    ...data,
    id,
    publishedBy: currentUser?.name || 'System',
    publishedByRole: currentUser?.role === 'super_admin' ? 'Super Admin' : 'Admin',
    views: 0,
    acknowledgements: 0,
    acknowledgedUsers: [],
    likedBy: [],
    likes: 0,
    pinned: false,
    comments: [],
    status: data.publishDate ? 'Scheduled' : 'Published',
    publishDate: data.publishDate || new Date().toISOString().split('T')[0]
  });

  // Log audit trail
  await repository.saveAuditLog({
    user: currentUser?.name || 'System',
    action: `Created Announcement - ${record.title}`,
    prevVal: 'None',
    newVal: record.id,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
  });

  // Initialize tracking logs for all active employees
  try {
    const employees = await Employee.find({ status: 'Active' });
    for (const emp of employees) {
      await repository.saveTrackingLog({
        announcementId: record.id,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department || 'Operations',
        readStatus: 'Not Viewed',
        ackStatus: 'Pending',
        viewTime: '—',
        device: '—'
      });
    }
  } catch (err) {
    logger.error('Failed to initialize tracking logs for new announcement:', err);
  }

  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info(`Executing AnnouncementsService::updateRecord for ID: ${id} by user: ${currentUser?.name}`);
  const oldVal = await repository.findById(id);
  if (!oldVal) throw new Error('Announcement not found');
  
  const updated = await repository.save({ ...oldVal.toObject(), ...data, id });

  // Log pin toggle or other updates in audit logs
  if (data.pinned !== undefined && data.pinned !== oldVal.pinned) {
    await repository.saveAuditLog({
      user: currentUser?.name || 'System',
      action: `Toggled Pin for Announcement ${id}`,
      prevVal: oldVal.pinned ? 'Pinned' : 'Unpinned',
      newVal: data.pinned ? 'Pinned' : 'Unpinned',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
  }

  return updated;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info(`Executing AnnouncementsService::deleteRecord for ID: ${id} by user: ${currentUser?.name}`);
  const deleted = await repository.remove(id);

  if (deleted) {
    await repository.saveAuditLog({
      user: currentUser?.name || 'System',
      action: `Deleted Announcement - ${deleted.title}`,
      prevVal: 'Published',
      newVal: 'Deleted',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
  }

  return deleted;
};

export const acknowledgeNotice = async (id, employeeId, currentUser) => {
  logger.info(`Executing AnnouncementsService::acknowledgeNotice for ID: ${id} by employee: ${employeeId}`);
  const announcement = await repository.findById(id);
  if (!announcement) throw new Error('Announcement not found');

  if (!announcement.acknowledgedUsers.includes(employeeId)) {
    announcement.acknowledgedUsers.push(employeeId);
    announcement.acknowledgements = announcement.acknowledgedUsers.length;
    await announcement.save();
  }

  let department = 'Operations';
  const emp = await Employee.findOne({ id: employeeId });
  if (emp && emp.department) {
    department = emp.department;
  }

  // Update/Save tracking log
  await repository.saveTrackingLog({
    announcementId: id,
    employeeId: employeeId,
    employeeName: currentUser?.name || 'Employee',
    department,
    readStatus: 'Viewed',
    ackStatus: 'Acknowledged',
    viewTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
    device: 'Web App / Chrome'
  });

  return announcement;
};

export const likeNotice = async (id, employeeId) => {
  logger.info(`Executing AnnouncementsService::likeNotice for ID: ${id} by employee: ${employeeId}`);
  const announcement = await repository.findById(id);
  if (!announcement) throw new Error('Announcement not found');

  const idx = announcement.likedBy.indexOf(employeeId);
  if (idx > -1) {
    announcement.likedBy.splice(idx, 1);
  } else {
    announcement.likedBy.push(employeeId);
  }
  announcement.likes = announcement.likedBy.length;
  return announcement.save();
};

export const addComment = async (id, commentData, currentUser) => {
  logger.info(`Executing AnnouncementsService::addComment for ID: ${id}`);
  const announcement = await repository.findById(id);
  if (!announcement) throw new Error('Announcement not found');

  const newComment = {
    id: `COMM-${Date.now()}`,
    user: currentUser?.name || 'Anonymous',
    role: currentUser?.role === 'super_admin' ? 'Super Admin' : 'Team Member',
    avatar: '',
    text: commentData.text,
    timestamp: 'Just now'
  };

  announcement.comments.push(newComment);
  return announcement.save();
};

export const deleteComment = async (id, commentId, currentUser) => {
  logger.info(`Executing AnnouncementsService::deleteComment for ID: ${id}, Comment: ${commentId}`);
  const announcement = await repository.findById(id);
  if (!announcement) throw new Error('Announcement not found');

  announcement.comments = announcement.comments.filter(c => c.id !== commentId);
  return announcement.save();
};

export const getEmergencyAlert = async () => {
  return repository.getEmergency();
};

export const updateEmergencyAlert = async (data, currentUser) => {
  logger.info(`Executing AnnouncementsService::updateEmergencyAlert by user: ${currentUser?.name}`);
  const alert = await repository.saveEmergency(data);

  if (data.isActive) {
    await repository.saveAuditLog({
      user: currentUser?.name || 'System',
      action: `Triggered Emergency Alert - ${data.title}`,
      prevVal: 'Inactive',
      newVal: 'Active Banner',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
  }

  return alert;
};

export const getTrackingLogs = async () => {
  return repository.findTrackingLogs();
};

export const getAuditLogs = async () => {
  return repository.findAuditLogs();
};

export const logNoticeView = async (id, employeeId, currentUser) => {
  logger.info(`Executing AnnouncementsService::logNoticeView for ID: ${id} by employee: ${employeeId}`);
  const announcement = await repository.findById(id);
  if (!announcement) throw new Error('Announcement not found');

  // Increment views
  announcement.views = (announcement.views || 0) + 1;
  await announcement.save();

  let department = 'Operations';
  const emp = await Employee.findOne({ id: employeeId });
  if (emp && emp.department) {
    department = emp.department;
  }

  // Create tracking log as "Viewed" (if they haven't already acknowledged)
  const existing = await repository.findTrackingLogs({ announcementId: id, employeeId });
  const ackStatus = existing.length > 0 ? existing[0].ackStatus : 'Pending';

  await repository.saveTrackingLog({
    announcementId: id,
    employeeId,
    employeeName: currentUser?.name || 'Employee',
    department,
    readStatus: 'Viewed',
    ackStatus,
    viewTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
    device: 'Web App / Chrome'
  });

  return announcement;
};

export default {
  findAll,
  createRecord,
  updateRecord,
  deleteRecord,
  acknowledgeNotice,
  likeNotice,
  addComment,
  deleteComment,
  getEmergencyAlert,
  updateEmergencyAlert,
  getTrackingLogs,
  getAuditLogs,
  logNoticeView
};
