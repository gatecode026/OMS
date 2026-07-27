/**
 * @file src/modules/kpi/kpi-templates/kpi-template.service.js
 * @description Service business logic for KPI Templates.
 */

import repository from './kpi-template.repository.js';
import logger from '../../../config/logger.js';
import { emitEntitySync } from '../../../services/sync.service.js';
import activityLogRepository from '../../activity-logs/activity-logs.repository.js';
import { generateCompanyUniqueId } from '../../../utils/idGenerator.js';
import { createNotification } from '../../notifications/notifications.service.js';
import Employee from '../../employees/employees.model.js';

import mongoose from 'mongoose';

// Calculate total weight of attributes
const calculateTotalWeight = (attributes) => {
  if (!attributes || !Array.isArray(attributes)) return 0;
  return attributes.reduce((sum, attr) => sum + (Number(attr.weight) || 0), 0);
};

export const seedPerformancePermissions = async (companyId) => {
  try {
    const PermissionModule = mongoose.model('PermissionModule');
    const Role = mongoose.model('Role');

    // 1. Check if permission module exists
    const exists = await PermissionModule.findOne({ key: 'performance_analytics' });
    if (!exists) {
      logger.info(`[Self-Healing] Seeding performance_analytics permission module for company: ${companyId}`);
      await PermissionModule.create({
        key: 'performance_analytics',
        label: 'Performance Analytics',
        companyId
      });

      // 2. Add permissions map entry for all existing roles
      const roles = await Role.find({});
      for (const role of roles) {
        const hasFullAccess = ['company_admin', 'hr', 'manager'].includes(role.id);
        const perms = {
          create: hasFullAccess,
          read: true,
          update: hasFullAccess,
          delete: hasFullAccess,
          approve: hasFullAccess,
          export: hasFullAccess
        };
        role.permissions.set('performance_analytics', perms);
        role.markModified('permissions');
        await role.save();
      }
      logger.info(`[Self-Healing] Performance Analytics permissions successfully seeded.`);
    }
  } catch (err) {
    logger.error('Failed self-healing seed of Performance Analytics permissions: ' + err.message);
  }
};

export const findAllTemplates = async (query) => {
  logger.info('Executing KpiTemplateService::findAllTemplates');
  const companyId = query.companyId || 'COMP-DEFAULT';
  await seedPerformancePermissions(companyId);
  return repository.find(query);
};

export const findTemplateById = async (id) => {
  logger.info(`Executing KpiTemplateService::findTemplateById: ${id}`);
  return repository.findOne(id);
};

export const createTemplate = async (data, currentUser) => {
  logger.info('Executing KpiTemplateService::createTemplate');
  
  if (!data.name || !data.departmentId || !data.departmentName) {
    throw new Error('Template name, department ID, and department name are required.');
  }

  // Set initial status to Draft
  data.status = 'Draft';
  data.version = 1;
  data.createdBy = currentUser.id;

  const template = await repository.save(data);

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Template Created',
      fieldChanged: 'Status',
      oldValue: '—',
      newValue: 'Draft',
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for template creation: ' + err.message);
  }

  if (template && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_templates',
      action: 'create',
      data: template
    });
  }

  return template;
};

export const updateTemplate = async (id, data, currentUser) => {
  logger.info(`Executing KpiTemplateService::updateTemplate: ${id}`);

  const template = await repository.findOne(id);
  if (!template) {
    throw new Error('Template not found.');
  }

  if (template.status !== 'Draft') {
    throw new Error('Only Draft templates can be modified directly. Create a new version instead.');
  }

  data.updatedBy = currentUser.id;
  const updated = await repository.update(id, data);

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Template Updated',
      fieldChanged: 'Multiple fields',
      oldValue: 'Draft',
      newValue: 'Draft',
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for template update: ' + err.message);
  }

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_templates',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const publishTemplate = async (id, currentUser) => {
  logger.info(`Executing KpiTemplateService::publishTemplate: ${id}`);

  const template = await repository.findOne(id);
  if (!template) {
    throw new Error('Template not found.');
  }

  if (template.status === 'Published') {
    return template; // Already published
  }

  if (template.status === 'Archived') {
    throw new Error('Archived templates cannot be published.');
  }

  // Weight validation
  const totalWeight = calculateTotalWeight(template.attributes);
  if (totalWeight !== 100) {
    throw new Error(`Template total weight must equal exactly 100%. Currently it is ${totalWeight}%.`);
  }

  const published = await repository.update(id, {
    status: 'Published',
    publishedBy: currentUser.id,
    publishedAt: new Date()
  });

  // Notify HR and Managers of new KPI Template
  try {
    const recipientIds = await Employee.find({
      roleId: { $in: ['hr', 'manager', 'company_admin'] },
      status: 'Active'
    }).select('id').lean();

    for (const r of recipientIds) {
      await createNotification(r.id, currentUser.companyId, {
        type: 'task',
        title: 'KPI Template Published',
        message: `KPI Template "${template.name}" has been published for ${template.departmentName}.`,
        data: { templateId: template.id }
      });
    }
  } catch (err) {
    logger.error('Failed to trigger notification for template publish: ' + err.message);
  }

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Template Published',
      fieldChanged: 'Status',
      oldValue: 'Draft',
      newValue: 'Published',
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for template publish: ' + err.message);
  }

  if (published && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_templates',
      action: 'update',
      data: published
    });
  }

  return published;
};

export const createNewVersion = async (id, currentUser) => {
  logger.info(`Executing KpiTemplateService::createNewVersion: ${id}`);

  const template = await repository.findOne(id);
  if (!template) {
    throw new Error('Template not found.');
  }

  if (template.status !== 'Published') {
    throw new Error('New versions can only be created from Published templates.');
  }

  const newId = await generateCompanyUniqueId(currentUser.companyId, 'kpitemplates');
  const plainObj = template.toObject();

  // Strip unique fields
  delete plainObj._id;
  delete plainObj.createdAt;
  delete plainObj.updatedAt;

  const versionedTemplate = {
    ...plainObj,
    id: newId,
    status: 'Draft',
    version: template.version + 1,
    parentTemplateId: template.id,
    createdBy: currentUser.id,
    publishedBy: null,
    publishedAt: null,
    updatedBy: null
  };

  const newVersion = await repository.save(versionedTemplate);

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Template Version Created',
      fieldChanged: 'Version',
      oldValue: String(template.version),
      newValue: String(newVersion.version),
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for template version: ' + err.message);
  }

  if (newVersion && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_templates',
      action: 'create',
      data: newVersion
    });
  }

  return newVersion;
};

export const archiveTemplate = async (id, currentUser) => {
  logger.info(`Executing KpiTemplateService::archiveTemplate: ${id}`);

  const template = await repository.findOne(id);
  if (!template) {
    throw new Error('Template not found.');
  }

  const archived = await repository.update(id, {
    status: 'Archived',
    archivedBy: currentUser.id,
    archivedAt: new Date()
  });

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Template Archived',
      fieldChanged: 'Status',
      oldValue: template.status,
      newValue: 'Archived',
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for template archive: ' + err.message);
  }

  if (archived && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_templates',
      action: 'update',
      data: archived
    });
  }

  return archived;
};

export const deleteTemplate = async (id, currentUser) => {
  logger.info(`Executing KpiTemplateService::deleteTemplate: ${id}`);

  const template = await repository.findOne(id);
  if (!template) {
    throw new Error('Template not found.');
  }

  if (template.status !== 'Draft') {
    throw new Error('Only Draft templates can be deleted. Published or Archived templates must be archived or remain in history.');
  }

  const removed = await repository.remove(id);

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Template Deleted',
      fieldChanged: 'id',
      oldValue: template.id,
      newValue: '—',
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for template deletion: ' + err.message);
  }

  if (removed && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_templates',
      action: 'delete',
      data: id
    });
  }

  return removed;
};

export default {
  findAllTemplates,
  findTemplateById,
  createTemplate,
  updateTemplate,
  publishTemplate,
  createNewVersion,
  archiveTemplate,
  deleteTemplate
};
