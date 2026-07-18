/**
 * @file src/modules/roles/roles.repository.js
 * @description Repository layer for Roles and Permission Modules.
 */

import Role from './roles.model.js';
import PermissionModule from './permission-modules.model.js';
import logger from '../../config/logger.js';

export const find = async (query = {}) => {
  logger.info('RolesRepository::find querying roles from database...');
  return Role.find(query);
};

export const findOne = async (id) => {
  logger.info(`RolesRepository::findOne querying role with ID: ${id}`);
  return Role.findOne({ id });
};

export const save = async (data) => {
  logger.info(`RolesRepository::save creating role: ${data.name}`);
  return Role.create(data);
};

export const update = async (id, data) => {
  logger.info(`RolesRepository::update updating role with ID: ${id}`);
  const role = await Role.findOne({ id });
  if (!role) return null;

  if (data.permissions) {
    for (const [key, val] of Object.entries(data.permissions)) {
      role.permissions.set(key, val);
    }
    role.markModified('permissions');
  }

  if (data.name) role.name = data.name;
  if (data.description) role.description = data.description;
  if (data.accentColor) role.accentColor = data.accentColor;
  if (data.accessLevel) role.accessLevel = data.accessLevel;
  if (data.status) role.status = data.status;

  return role.save();
};

export const remove = async (id) => {
  logger.info(`RolesRepository::remove deleting role with ID: ${id}`);
  return Role.findOneAndDelete({ id });
};

// --- Permission Modules ---

export const healPermissionMatrix = async (companyId) => {
  try {
    const expectedModules = [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'company_overview', label: 'Branch Overview' },
      { key: 'employee_management', label: 'Employee Management' },
      { key: 'agency_branch_management', label: 'Agency Branch Management' },
      { key: 'department_management', label: 'Department Management' },
      { key: 'team_management', label: 'Team Management' },
      { key: 'attendance_management', label: 'Attendance Management' },
      { key: 'leave_management', label: 'Leave Management' },
      { key: 'project_management', label: 'Project Management' },
      { key: 'task_monitoring', label: 'Task Monitoring' },
      { key: 'work_reports', label: 'Work Reports' },
      { key: 'performance_analytics', label: 'KPI Management' },
      { key: 'payroll_management', label: 'Payroll Management' },
      { key: 'announcements', label: 'Announcements' },
      { key: 'meetings_calendar', label: 'Meetings & Calendar' },
      { key: 'notifications', label: 'Notifications' },
      { key: 'document_management', label: 'Document Management' },
      { key: 'role_permission', label: 'Role & Permission' },
      { key: 'system_settings', label: 'System Settings' },
      { key: 'security_audit_logs', label: 'Security & Audit Logs' },
      { key: 'profile_settings', label: 'Profile Settings' }
    ];

    logger.info(`[Self-Healing] Resolving permission modules in DB for company ${companyId}`);
    
    // 1. Clear existing modules and bulk write
    await PermissionModule.deleteMany({});
    await PermissionModule.insertMany(expectedModules.map(m => ({ ...m, companyId })));

    // 2. Refresh role-specific permission maps
    const rolesList = await Role.find({});
    
    const getPerms = (create, read, update, del, approve, exp) => ({
      create, read, update, delete: del, approve, export: exp
    });

    const hierarchicalKeys = [
      'attendance_management',
      'leave_management',
      'project_management',
      'task_monitoring',
      'work_reports',
      'performance_analytics',
      'payroll_management',
      'announcements',
      'meetings_calendar'
    ];

    for (const r of rolesList) {
      const isFull = ['super_admin', 'company_admin'].includes(r.id) || 
                     ['super_admin', 'company_admin'].includes((r.name || '').toLowerCase().replace(/\s+/g, '_'));
      
      const newPerms = new Map();

      expectedModules.forEach(mod => {
        const isHierarchical = hierarchicalKeys.includes(mod.key);
        
        if (isHierarchical) {
          if (isFull) {
            newPerms.set(`${mod.key}_self`, getPerms(true, true, true, true, true, true));
            newPerms.set(mod.key, getPerms(true, true, true, true, true, true));
          } else if (r.id === 'hr') {
            const isHR = ['employee_management', 'attendance_management', 'leave_management', 'payroll_management'].includes(mod.key);
            newPerms.set(`${mod.key}_self`, getPerms(true, true, true, true, true, true));
            newPerms.set(mod.key, getPerms(isHR, true, isHR, isHR, isHR, isHR));
          } else if (r.id === 'manager') {
            const isMgr = ['attendance_management', 'leave_management', 'task_monitoring', 'project_management', 'team_management'].includes(mod.key);
            newPerms.set(`${mod.key}_self`, getPerms(true, true, true, true, true, true));
            newPerms.set(mod.key, getPerms(isMgr, true, isMgr, false, isMgr, isMgr));
          } else if (r.id === 'team_leader') {
            const isTL = ['attendance_management', 'task_monitoring', 'project_management'].includes(mod.key);
            newPerms.set(`${mod.key}_self`, getPerms(true, true, true, true, true, true));
            newPerms.set(mod.key, getPerms(isTL, true, isTL, false, false, false));
          } else {
            newPerms.set(`${mod.key}_self`, getPerms(false, true, false, false, false, false));
            newPerms.set(mod.key, getPerms(false, false, false, false, false, false));
          }
        } else {
          if (isFull) {
            newPerms.set(mod.key, getPerms(true, true, true, true, true, true));
          } else if (r.id === 'hr') {
            const isHR = ['employee_management', 'department_management', 'agency_branch_management', 'team_management'].includes(mod.key);
            newPerms.set(mod.key, getPerms(isHR, true, isHR, isHR, isHR, isHR));
          } else if (r.id === 'manager') {
            const isMgr = ['department_management', 'team_management'].includes(mod.key);
            newPerms.set(mod.key, getPerms(isMgr, true, isMgr, false, isMgr, isMgr));
          } else if (r.id === 'team_leader') {
            const isTL = ['team_management'].includes(mod.key);
            newPerms.set(mod.key, getPerms(isTL, true, isTL, false, false, false));
          } else {
            const isEmpAllowed = ['dashboard', 'notifications', 'document_management', 'profile_settings'].includes(mod.key);
            newPerms.set(mod.key, getPerms(false, isEmpAllowed, false, false, false, false));
          }
        }
      });

      r.permissions = newPerms;
      r.markModified('permissions');
      await r.save();
    }
    logger.info(`[Self-Healing] Successfully restored permission modules and role matrices in DB.`);
  } catch (err) {
    logger.error('Failed healing permissions: ' + err.message);
  }
};

export const findModules = async (query = {}) => {
  logger.info('RolesRepository::findModules querying permission modules from database...');
  const count = await PermissionModule.countDocuments({});
  const adminRole = await Role.findOne({ id: 'company_admin' });
  const needsHealing = !adminRole || !adminRole.permissions || !adminRole.permissions.has('performance_analytics_self');
  const oldLabelExists = await PermissionModule.findOne({ label: 'Performance Analytics' });
  
  if (count < 21 || needsHealing || oldLabelExists) {
    logger.info(`[Self-Healing] Count is ${count}/21 or matrix needs hierarchical/label healing. Restoring default matrix...`);
    const companyId = query.companyId || 'COMP-DEFAULT';
    await healPermissionMatrix(companyId);
  }
  return PermissionModule.find(query);
};

export const saveModule = async (data) => {
  logger.info(`RolesRepository::saveModule creating permission module: ${data.name || data.label}`);
  const key = data.key || (data.name || data.label).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const label = data.label || data.name;
  
  // Create permission module document
  const pm = await PermissionModule.create({ key, label });

  // Add this module key to the permissions map of all existing roles with false properties
  await Role.updateMany({}, {
    $set: {
      [`permissions.${key}`]: { create: false, read: false, update: false, delete: false, approve: false, export: false }
    }
  });

  return pm;
};

export const deleteModule = async (key) => {
  logger.info(`RolesRepository::deleteModule deleting permission module with key: ${key}`);
  
  // Delete permission module document
  const pm = await PermissionModule.findOneAndDelete({ key });

  // Remove this module key from the permissions map of all existing roles
  await Role.updateMany({}, {
    $unset: {
      [`permissions.${key}`]: ""
    }
  });

  return pm;
};

export default {
  find,
  findOne,
  save,
  update,
  remove,
  findModules,
  saveModule,
  deleteModule
};
