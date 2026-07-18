/**
 * @file src/modules/documents/documents.service.js
 * @description Enhanced Service layer for Document Management System.
 */

import repository from './documents.repository.js';
import logger from '../../config/logger.js';
import mongoose from 'mongoose';
import { emitEntitySync } from '../../services/sync.service.js';
import { createNotification } from '../notifications/notification.service.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import activityLogRepository from '../activity-logs/activity-logs.repository.js';
import Employee from '../employees/employees.model.js';

// Core Sub-services
import { checkDocumentAccess } from './permission.service.js';
import { uploadNewVersion, replaceExisting } from './version.service.js';
import { getFolderStructure } from './folder.service.js';
import { searchDocuments } from './search.service.js';

// Helpers
const logDocActivity = async (actionType, fieldChanged, oldValue, newValue, currentUser, companyId) => {
  try {
    const logId = await generateCompanyUniqueId(companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      actor: currentUser?.name || 'System',
      actionType,
      fieldChanged,
      oldValue: oldValue || '',
      newValue: newValue || '',
      ipAddress: '',
      userAgent: '',
      companyId
    });
  } catch (err) {
    logger.warn('Failed to write document activity log: ' + err.message);
  }
};

const notifyDocAction = async (action, doc, companyId, currentUser) => {
  try {
    const title = `Document ${action}`;
    const message = `Document "${doc.name}" has been ${action.toLowerCase()} by ${currentUser?.name || 'System'}`;
    const notificationData = { id: doc.id, entityId: doc.id, action, scope: doc.documentScope };

    const recipients = new Set();

    if (doc.documentScope === 'PROJECT' && doc.projectId) {
      const Project = mongoose.model('Project');
      const proj = await Project.findOne({ id: doc.projectId }).lean();
      if (proj) {
        // Resolve project roles/members
        // We match by name mapping to employee ids
        const EmployeeModel = mongoose.model('Employee');
        if (proj.manager) {
          const mgr = await EmployeeModel.findOne({ name: proj.manager }).lean();
          if (mgr) recipients.add(mgr.id);
        }
        if (proj.leader) {
          const lead = await EmployeeModel.findOne({ name: proj.leader }).lean();
          if (lead) recipients.add(lead.id);
        }
        if (proj.members && proj.members.length > 0) {
          const mems = await EmployeeModel.find({ name: { $in: proj.members } }).select('id').lean();
          mems.forEach(m => recipients.add(m.id));
        }
      }
    } else if (doc.documentScope === 'GENERAL') {
      if (doc.visibility === 'Department Only' && doc.departmentName) {
        const deptEmployees = await Employee.find({ department: doc.departmentName, status: 'Active' }).select('id').lean();
        deptEmployees.forEach(emp => recipients.add(emp.id));
      } else if (doc.visibility === 'Selected Employees') {
        doc.visibilityDetails?.userIds?.forEach(uid => recipients.add(uid));
      } else if (doc.visibility === 'Company Wide') {
        const allEmployees = await Employee.find({ status: 'Active' }).select('id').lean();
        allEmployees.forEach(emp => recipients.add(emp.id));
      }
    }

    // Always include uploader
    if (doc.uploadedBy) {
      const owner = await Employee.findOne({ name: doc.uploadedBy }).lean();
      if (owner) recipients.add(owner.id);
    }

    // Exclude current operator from getting their own notify alert
    if (currentUser?.id) {
      recipients.delete(currentUser.id);
    }

    for (const userId of recipients) {
      await createNotification(userId, companyId, {
        type: 'file',
        title,
        message,
        data: notificationData
      });
    }
  } catch (err) {
    logger.warn('Failed to dispatch document notifications: ' + err.message);
  }
};

// core service exports
export const findAll = async (query, currentUser) => {
  return searchDocuments(query, currentUser);
};

export const findById = async (id, currentUser) => {
  const doc = await repository.findOne(id);
  if (!doc) return null;
  
  const hasAccess = await checkDocumentAccess(doc, currentUser, 'read');
  if (!hasAccess) {
    const error = new Error('You do not have permission to view this document.');
    error.statusCode = 403;
    throw error;
  }

  // Update lastViewedAt timestamp
  doc.lastViewedAt = new Date();
  await doc.save();

  // Log viewed activity
  const companyId = currentUser?.companyId || 'COMP-DEFAULT';
  await logDocActivity('View', 'Document', '', doc.name, currentUser, companyId);

  return doc;
};

export const createRecord = async (data, currentUser) => {
  logger.info('Executing DocumentsService::createRecord by user: ' + currentUser?.id);
  const companyId = currentUser?.companyId || 'COMP-DEFAULT';

  // Format extension
  let fileExt = '';
  if (data.name && data.name.includes('.')) {
    fileExt = data.name.split('.').pop().toLowerCase();
  } else {
    fileExt = data.type ? data.type.toLowerCase() : 'bin';
  }
  data.extension = `.${fileExt}`;

  // Stamp attributes
  data.uploadedBy = currentUser?.name || 'Unknown';
  data.uploadDate = new Date().toISOString().split('T')[0];
  data.status = data.status || 'Active';
  if (currentUser?.branch) {
    data.branch = currentUser.branch;
  }

  const record = await repository.save(data);

  // Sync logs, notify, and socket
  await logDocActivity('Upload', 'Document', '', record.name, currentUser, companyId);
  await notifyDocAction('Uploaded', record, companyId, currentUser);
  emitEntitySync(companyId, { module: 'documents', action: 'create', data: record });

  return record;
};

export const updateRecord = async (id, data, currentUser) => {
  logger.info('Executing DocumentsService::updateRecord for: ' + id + ' by user: ' + currentUser?.id);
  const companyId = currentUser?.companyId || 'COMP-DEFAULT';

  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  const hasAccess = await checkDocumentAccess(doc, currentUser, 'update');
  if (!hasAccess) {
    const error = new Error('You do not have permission to edit this document.');
    error.statusCode = 403;
    throw error;
  }

  // Track modification metadata
  data.lastModifiedBy = currentUser?.name || 'Unknown';
  data.lastModifiedDate = new Date().toISOString().split('T')[0];

  const oldName = doc.name;
  const updated = await repository.update(id, data);

  // Sync logs, notify, and socket
  await logDocActivity('Edit', 'Document', oldName, updated.name, currentUser, companyId);
  await notifyDocAction('Updated', updated, companyId, currentUser);
  emitEntitySync(companyId, { module: 'documents', action: 'update', data: updated });

  return updated;
};

export const deleteRecord = async (id, currentUser) => {
  logger.info('Executing DocumentsService::deleteRecord for: ' + id + ' by user: ' + currentUser?.id);
  const companyId = currentUser?.companyId || 'COMP-DEFAULT';

  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  const hasAccess = await checkDocumentAccess(doc, currentUser, 'delete');
  if (!hasAccess) {
    const error = new Error('You do not have permission to delete this document.');
    error.statusCode = 403;
    throw error;
  }

  const wasDeleted = doc.status === 'Deleted';
  const result = await repository.remove(id);

  if (wasDeleted) {
    // Permanently deleted
    await logDocActivity('Permanent Delete', 'Document', doc.name, '', currentUser, companyId);
    emitEntitySync(companyId, { module: 'documents', action: 'delete', data: id });
  } else {
    // Soft deleted (moved to recycle bin)
    await logDocActivity('Delete', 'Document', doc.name, 'Recycle Bin', currentUser, companyId);
    await notifyDocAction('Deleted', doc, companyId, currentUser);
    emitEntitySync(companyId, { module: 'documents', action: 'update', data: result });
  }

  return result;
};

export const restoreRecord = async (id, currentUser) => {
  logger.info('Executing DocumentsService::restoreRecord for: ' + id);
  const companyId = currentUser?.companyId || 'COMP-DEFAULT';

  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  const hasAccess = await checkDocumentAccess(doc, currentUser, 'update');
  if (!hasAccess) {
    const error = new Error('You do not have permission to restore this document.');
    error.statusCode = 403;
    throw error;
  }

  doc.status = 'Active';
  doc.lastModifiedBy = currentUser?.name || 'Unknown';
  doc.lastModifiedDate = new Date().toISOString().split('T')[0];
  const restored = await doc.save();

  // Sync logs, notify, and socket
  await logDocActivity('Restore', 'Document', 'Recycle Bin', restored.name, currentUser, companyId);
  await notifyDocAction('Restored', restored, companyId, currentUser);
  emitEntitySync(companyId, { module: 'documents', action: 'update', data: restored });

  return restored;
};

export const archiveRecord = async (id, currentUser) => {
  logger.info('Executing DocumentsService::archiveRecord for: ' + id);
  const companyId = currentUser?.companyId || 'COMP-DEFAULT';

  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  const hasAccess = await checkDocumentAccess(doc, currentUser, 'update');
  if (!hasAccess) {
    const error = new Error('You do not have permission to archive this document.');
    error.statusCode = 403;
    throw error;
  }

  doc.status = 'Archived';
  doc.lastModifiedBy = currentUser?.name || 'Unknown';
  doc.lastModifiedDate = new Date().toISOString().split('T')[0];
  const archived = await doc.save();

  // Sync logs, notify, and socket
  await logDocActivity('Archive', 'Document', archived.name, 'Archive Folder', currentUser, companyId);
  await notifyDocAction('Archived', archived, companyId, currentUser);
  emitEntitySync(companyId, { module: 'documents', action: 'update', data: archived });

  return archived;
};

export const uploadVersion = async (id, versionData, currentUser) => {
  logger.info('Executing DocumentsService::uploadVersion for: ' + id);
  const companyId = currentUser?.companyId || 'COMP-DEFAULT';

  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  const hasAccess = await checkDocumentAccess(doc, currentUser, 'create');
  if (!hasAccess) {
    const error = new Error('You do not have permission to upload versions for this document.');
    error.statusCode = 403;
    throw error;
  }

  const updated = await uploadNewVersion(doc, {
    name: doc.name,
    fileUrl: versionData.fileUrl,
    type: doc.type,
    size: versionData.size,
    comment: versionData.comment,
    uploadedBy: currentUser?.name || 'Unknown',
    majorUpdate: versionData.majorUpdate
  });

  // Sync logs, notify, and socket
  await logDocActivity('New Version', 'Document', doc.version, updated.version, currentUser, companyId);
  await notifyDocAction('Version Uploaded', updated, companyId, currentUser);
  emitEntitySync(companyId, { module: 'documents', action: 'update', data: updated });

  return updated;
};

export const moveRecord = async (id, { scope, projectId, projectName, departmentId, departmentName }, currentUser) => {
  logger.info(`Executing DocumentsService::moveRecord for: ${id} to ${scope}`);
  const companyId = currentUser?.companyId || 'COMP-DEFAULT';

  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  const hasAccess = await checkDocumentAccess(doc, currentUser, 'update');
  if (!hasAccess) {
    const error = new Error('You do not have permission to move this document.');
    error.statusCode = 403;
    throw error;
  }

  const oldPath = doc.documentScope === 'PROJECT' ? `Project: ${doc.projectName || doc.projectId}` : `General`;
  
  // Set new scope details
  doc.documentScope = scope.toUpperCase();
  if (doc.documentScope === 'PROJECT') {
    doc.projectId = projectId;
    doc.projectName = projectName;
    doc.departmentId = null;
    doc.departmentName = null;
  } else {
    doc.projectId = null;
    doc.projectName = null;
    doc.departmentId = departmentId;
    doc.departmentName = departmentName;
  }

  doc.lastModifiedBy = currentUser?.name || 'Unknown';
  doc.lastModifiedDate = new Date().toISOString().split('T')[0];
  const moved = await doc.save();

  const newPath = moved.documentScope === 'PROJECT' ? `Project: ${moved.projectName || moved.projectId}` : `General`;

  // Sync logs, notify, and socket
  await logDocActivity('Move', 'Document', oldPath, newPath, currentUser, companyId);
  await notifyDocAction('Moved', moved, companyId, currentUser);
  emitEntitySync(companyId, { module: 'documents', action: 'update', data: moved });

  return moved;
};

export const getFolders = async (currentUser) => {
  return getFolderStructure(currentUser);
};

export const getAnalytics = async (currentUser) => {
  // Query all documents user has access to
  const allDocs = await searchDocuments({}, currentUser);

  const totalDocuments = allDocs.length;
  const projectDocs = allDocs.filter(d => d.documentScope === 'PROJECT').length;
  const generalDocs = allDocs.filter(d => d.documentScope === 'GENERAL').length;
  const archivedDocs = allDocs.filter(d => d.status === 'Archived').length;

  // Compute total size used
  let sizeBytes = 0;
  allDocs.forEach(d => {
    const num = parseFloat(d.size || '0');
    if (d.size?.toUpperCase().includes('MB')) {
      sizeBytes += num * 1024 * 1024;
    } else if (d.size?.toUpperCase().includes('KB')) {
      sizeBytes += num * 1024;
    }
  });

  const storageUsed = sizeBytes < 1024 * 1024
    ? `${(sizeBytes / 1024).toFixed(1)} KB`
    : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;

  // Sort and slice categories
  const recentUploads = allDocs.slice(0, 5);
  const mostDownloaded = [...allDocs].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 5);

  // Storage by Project
  const projectStorageMap = {};
  allDocs.forEach(d => {
    if (d.documentScope === 'PROJECT' && d.projectName) {
      const num = parseFloat(d.size || '0');
      const mb = d.size?.toUpperCase().includes('MB') ? num : num / 1024;
      projectStorageMap[d.projectName] = (projectStorageMap[d.projectName] || 0) + mb;
    }
  });
  const storageByProject = Object.entries(projectStorageMap).map(([name, val]) => ({ name, value: Math.round(val * 10) / 10 }));

  // Storage by Department
  const deptStorageMap = {};
  allDocs.forEach(d => {
    if (d.documentScope === 'GENERAL' && d.departmentName) {
      const num = parseFloat(d.size || '0');
      const mb = d.size?.toUpperCase().includes('MB') ? num : num / 1024;
      deptStorageMap[d.departmentName] = (deptStorageMap[d.departmentName] || 0) + mb;
    }
  });
  const storageByDepartment = Object.entries(deptStorageMap).map(([name, val]) => ({ name, value: Math.round(val * 10) / 10 }));

  return {
    totalDocuments,
    projectDocuments: projectDocs,
    generalDocuments: generalDocs,
    storageUsed,
    recentUploads,
    mostDownloaded,
    pendingReviews: 0, // placeholder
    archivedDocuments: archivedDocs,
    storageByProject,
    storageByDepartment
  };
};

export const incrementDownloads = async (id) => {
  logger.info('Executing DocumentsService::incrementDownloads for: ' + id);
  const doc = await repository.findOne(id);
  if (!doc) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }
  doc.downloads = (doc.downloads || 0) + 1;
  doc.lastDownloadedAt = new Date();
  
  const saved = await doc.save();
  
  // Sync live counters
  const store = mongoose.connection; // context tenant connection
  emitEntitySync(doc.companyId, { module: 'documents', action: 'update', data: saved });

  return saved;
};

export default {
  findAll,
  findById,
  createRecord,
  updateRecord,
  deleteRecord,
  restoreRecord,
  archiveRecord,
  uploadVersion,
  moveRecord,
  getFolders,
  getAnalytics,
  incrementDownloads
};
