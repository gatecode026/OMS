/**
 * @file src/modules/documents/permission.service.js
 * @description Permission checking service for Document Management System.
 */

import logger from '../../config/logger.js';
import Employee from '../employees/employees.model.js';
import Project from '../projects/projects.model.js';

/**
 * Checks if the current user has access to a document.
 * @param {object} doc - The Document document.
 * @param {object} currentUser - The logged-in user.
 * @param {string} action - 'read' | 'create' | 'update' | 'delete' | 'export'
 * @returns {Promise<boolean>} True if user is authorized.
 */
export const checkDocumentAccess = async (doc, currentUser, action = 'read') => {
  if (!currentUser) return false;

  const role = currentUser.role?.toLowerCase();
  // Super admin & Company admin have unrestricted access
  if (['super_admin', 'company_admin', 'superadmin', 'companyadmin'].includes(role)) {
    return true;
  }

  // Soft-deleted documents can only be accessed/managed by administrators or the uploader (if read/restore)
  if (doc.status === 'Deleted') {
    const isOwner = doc.uploadedBy === currentUser.name || doc.userId === currentUser.id;
    const isManagerOrAdmin = ['branch_admin', 'manager', 'project_manager'].includes(role);
    return isOwner || isManagerOrAdmin;
  }

  // ── 1. PROJECT SCOPE PERMISSIONS ──
  if (doc.documentScope === 'PROJECT') {
    const projectId = doc.projectId;
    if (!projectId) return false;

    // Retrieve project to check membership
    const project = await Project.findOne({ id: projectId }).lean();
    if (!project) {
      logger.warn(`Project not found: ${projectId} for document: ${doc.id}`);
      return false;
    }

    const userName = currentUser.name?.toLowerCase();
    const isProjectManager = project.manager?.toLowerCase() === userName;
    const isProjectLeader = project.leader?.toLowerCase() === userName;
    const isProjectMember = project.members?.some(m => m.toLowerCase() === userName);

    const hasProjectAccess = isProjectManager || isProjectLeader || isProjectMember;

    // Apply visibility rules inside project
    const vis = doc.visibility || 'Project Members';

    if (vis === 'Project Members') {
      return hasProjectAccess;
    }

    if (vis === 'Project Managers') {
      return isProjectManager || isProjectLeader;
    }

    if (vis === 'Specific Roles') {
      const allowedRoles = doc.visibilityDetails?.roles || [];
      const userRoleCode = currentUser.roleId || currentUser.role;
      return hasProjectAccess && allowedRoles.includes(userRoleCode);
    }

    if (vis === 'Custom Users') {
      const allowedUsers = doc.visibilityDetails?.userIds || [];
      return hasProjectAccess && allowedUsers.includes(currentUser.id);
    }

    return hasProjectAccess;
  }

  // ── 2. GENERAL SCOPE PERMISSIONS ──
  const vis = doc.visibility || 'Company Wide';

  if (vis === 'Company Wide') {
    return true;
  }

  if (vis === 'Department Only') {
    const userDept = currentUser.department;
    if (!userDept || !doc.departmentName) return false;
    return userDept.toLowerCase() === doc.departmentName.toLowerCase();
  }

  if (vis === 'Selected Employees') {
    const allowedUsers = doc.visibilityDetails?.userIds || [];
    return allowedUsers.includes(currentUser.id) || doc.uploadedBy === currentUser.name;
  }

  if (vis === 'Private') {
    // Only the owner can see
    return doc.uploadedBy === currentUser.name || doc.userId === currentUser.id;
  }

  return false;
};

export default {
  checkDocumentAccess
};
