/**
 * @file src/security/permissionMatrix.js
 * @description Dynamic permission matrix that reads action-level permissions
 * from the database (rbac_roles collection) while keeping field-level security
 * policies (restrictedFields, allowedFields) hardcoded for safety.
 *
 * The frontend Roles & Permissions UI toggles now directly control backend
 * enforcement in real-time.
 */

import mongoose from 'mongoose';
import '../modules/roles/roles.model.js';
import { ResourceClassifications } from './securityConstants.js';
import { resolveSecurityContext } from './scopeEngine.js';
import logger from '../config/logger.js';

const FRONTEND_TO_BACKEND_KEYS = {
  employee_management: ['Employee', 'Employees'],
  attendance_management: ['Attendance'],
  leave_management: ['Leave', 'Leaves'],
  project_management: ['Project', 'Projects'],
  task_monitoring: ['Task', 'Tasks'],
  document_management: ['Document', 'Documents'],
  chat: ['Chat', 'Conversation', 'Message', 'Call'],
  payroll_management: ['Payroll', 'PayrollGrade', 'PayrollReimbursement', 'PayrollLoanAdvance', 'PayrollBonus', 'PayrollPayment', 'PayrollConfig'],
  department_management: ['Department', 'Departments'],
  agency_branch_management: ['Branch', 'Branches'],
  team_management: ['Team', 'Teams'],
  notifications: ['Notification', 'Notifications'],
  announcements: ['Announcement', 'Announcements', 'AnnouncementTrackingLog', 'AnnouncementAuditLog'],
  system_settings: ['SystemSettings', 'Settings'],
  role_permission: ['Role', 'PermissionModule', 'UserOverride', 'Workflow', 'Workflows'],
  security_audit_logs: ['SecurityAlert', 'Security', 'ActivityLog']
};

// Reverse mapping: backend key → frontend key (for DB lookups)
const BACKEND_TO_FRONTEND_KEY = {};
for (const [feKey, beKeys] of Object.entries(FRONTEND_TO_BACKEND_KEYS)) {
  for (const beKey of beKeys) {
    BACKEND_TO_FRONTEND_KEY[beKey] = feKey;
    BACKEND_TO_FRONTEND_KEY[beKey.toLowerCase()] = feKey;
  }
}

// ─── FIELD-LEVEL SECURITY POLICIES (HARDCODED — NOT UI-CONFIGURABLE) ────────
// These protect sensitive fields from being modified by unauthorized roles.
// They remain static and cannot be toggled from the Roles & Permissions UI.
const fieldPolicies = {
  Employee: {
    classification: ResourceClassifications.INTERNAL,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    allowedFields: {
      employee: ['phone', 'address', 'profilePhoto', 'password'],
      team_leader: ['phone', 'address', 'profilePhoto', 'password'],
      manager: ['phone', 'address', 'profilePhoto', 'password']
    },
    restrictedFields: {
      employee: ['salary', 'roleId', 'role', 'companyId', 'branch', 'department', 'team', 'teamLeader', 'projectManager'],
      team_leader: ['salary', 'roleId', 'role', 'companyId', 'branch', 'department', 'team', 'teamLeader', 'projectManager']
    }
  },
  Attendance: {
    classification: ResourceClassifications.INTERNAL,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    allowedFields: {
      employee: ['notes', 'breaks', 'breakTime', 'punchOut', 'punchIn', 'overtime']
    },
    restrictedFields: {
      employee: ['employeeId', 'branch', 'department', 'manager', 'status']
    }
  },
  Leave: {
    classification: ResourceClassifications.INTERNAL,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    allowedFields: {
      employee: ['type', 'fromDate', 'toDate', 'days', 'reason', 'documentType', 'fileName', 'fileFormat']
    },
    restrictedFields: {
      employee: ['status', 'approver', 'approvedBy', 'approvalDate', 'approverNotes'],
      team_leader: [],
      manager: []
    }
  },
  Projects: {
    classification: ResourceClassifications.CONFIDENTIAL,
    scopeRequirement: 'department',
    ownershipRequirement: false,
    allowedFields: {},
    restrictedFields: {
      employee: ['name', 'description', 'department', 'branch', 'client', 'manager', 'leader', 'members', 'priority', 'startDate', 'deadline', 'budget', 'workflowStage', 'approvalStatus'],
      team_leader: ['name', 'description', 'department', 'branch', 'client', 'manager', 'leader', 'members', 'priority', 'startDate', 'deadline', 'budget', 'workflowStage', 'approvalStatus']
    }
  },
  Tasks: {
    classification: ResourceClassifications.CONFIDENTIAL,
    scopeRequirement: 'department',
    ownershipRequirement: true,
    allowedFields: {},
    restrictedFields: {
      employee: ['assigneeId', 'assigneeName', 'priority', 'dueDate', 'creatorId', 'projectId', 'branch', 'department', 'approvalStatus', 'createdBy', 'updatedBy']
    }
  },
  Documents: {
    classification: ResourceClassifications.PRIVATE,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    allowedFields: {},
    restrictedFields: {
      employee: ['branch', 'uploadedBy', 'fileUrl', 'visibility', 'owner'],
      team_leader: ['branch', 'uploadedBy', 'fileUrl', 'visibility', 'owner']
    }
  },
  Chat: {
    classification: ResourceClassifications.PRIVATE,
    scopeRequirement: 'none',
    ownershipRequirement: true,
    allowedFields: {},
    restrictedFields: {}
  },
  Payroll: {
    classification: ResourceClassifications.HIGHLY_CONFIDENTIAL,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    allowedFields: {},
    restrictedFields: {
      employee: ['basicSalary', 'grossSalary', 'netSalary', 'bankAccount', 'IFSC', 'PAN', 'tax', 'totalDeductions', 'pf', 'esi', 'salaryGrade', 'paymentStatus', 'approvalStatus', 'status'],
      hr_manager: [],
      finance_manager: [],
      branch_manager: [],
      manager: []
    }
  }
};

// ─── IN-MEMORY CACHE ─────────────────────────────────────────────────────────
// Caches role permission lookups for 30 seconds to avoid hitting the DB on
// every single API call. Cache is keyed by `companyId:roleId`.
const permissionCache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Retrieves the role document from the database (with caching).
 * @param {string} companyId - The tenant company ID
 * @param {string} roleId - The role identifier (e.g. 'employee', 'manager')
 * @returns {Object|null} The role's permissions map, or null if not found
 */
const getRolePermissionsFromDB = async (companyId, roleId) => {
  const cacheKey = `${companyId}:${roleId}`;

  // Check cache first
  const cached = permissionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.permissions;
  }

  try {
    // Use mongoose directly to query the Role collection in the tenant's database
    const RoleModel = mongoose.model('Role');
    const roleDoc = await RoleModel.findOne({ id: roleId });

    if (!roleDoc || !roleDoc.permissions) {
      // Cache the miss so we don't re-query immediately
      permissionCache.set(cacheKey, { permissions: null, timestamp: Date.now() });
      return null;
    }

    // Convert Mongoose Map to plain object
    const permissions = roleDoc.permissions instanceof Map
      ? Object.fromEntries(roleDoc.permissions)
      : roleDoc.permissions;

    permissionCache.set(cacheKey, { permissions, timestamp: Date.now() });
    return permissions;
  } catch (err) {
    logger.warn(`PermissionMatrix::getRolePermissionsFromDB - Failed to fetch role "${roleId}" for company "${companyId}": ${err.message}`);
    return null;
  }
};

/**
 * Clears the permission cache. Call this when permissions are updated via the UI
 * to ensure changes take effect immediately.
 */
export const clearPermissionCache = () => {
  permissionCache.clear();
};

// ─── ACTION-LEVEL PERMISSION CHECK (DYNAMIC — DB-DRIVEN) ───────────────────

/**
 * Checks if a specific role is allowed to perform an action on a module.
 * Reads from the database (rbac_roles collection) instead of hardcoded arrays.
 *
 * @param {string} moduleName - Backend module name (e.g. 'Leave', 'Projects')
 * @param {string} role - The user's role (e.g. 'employee', 'manager')
 * @param {string} action - The action to check (e.g. 'read', 'create', 'update', 'delete', 'approve', 'export')
 * @returns {Promise<boolean>} Whether the role is allowed to perform the action
 */
export const checkActionPermission = async (moduleName, role, action) => {
  // Super admin always has full access — non-negotiable safety net
  if (role === 'super_admin') return true;

  // Chat bypass: Any authenticated role can perform actions on Chat, Conversation, Message, and Call.
  // The repository layer enforces strict participant-scoped access validations.
  if (['Chat', 'Conversation', 'Message', 'Call'].includes(moduleName)) {
    return true;
  }

  // Self-service bypass: Employees and Team Leaders can always create/read/update their own attendance and leave records.
  // The repository layer will enforce strict ownership mapping to ensure they only touch their own records.
  if (['Attendance', 'Leave'].includes(moduleName) && ['create', 'read', 'update'].includes(action)) {
    if (role === 'employee' || role === 'team_leader') return true;
  }

  // Resolve the security context to get the company ID for tenant-scoped DB query
  const context = resolveSecurityContext();
  const companyId = context?.companyId;

  if (!companyId) {
    // No company context — fail closed for safety, but allow company_admin as fallback
    logger.warn(`PermissionMatrix::checkActionPermission - No companyId in context for role "${role}", module "${moduleName}"`);
    return role === 'company_admin';
  }

  // Get the role's permissions from the database
  const permissions = await getRolePermissionsFromDB(companyId, role);

  if (!permissions) {
    // No DB permissions found for role
    logger.warn(`PermissionMatrix::checkActionPermission - No DB permissions found for role "${role}", denying action "${action}" on "${moduleName}"`);
    return role === 'company_admin';
  }

  // Map the backend module name to the frontend key used in the DB
  const frontendKey = BACKEND_TO_FRONTEND_KEY[moduleName] || BACKEND_TO_FRONTEND_KEY[moduleName?.toLowerCase()];

  if (!frontendKey) {
    // Module not mapped — deny by default for safety
    logger.warn(`PermissionMatrix::checkActionPermission - Module "${moduleName}" is not mapped to any permission key, denying action "${action}"`);
    return role === 'company_admin';
  }

  // Look up the module permissions in the role's permission map
  const modulePerms = permissions[frontendKey];

  if (!modulePerms) {
    // Module not found in the role's permissions — deny by default for safety
    return role === 'company_admin';
  }

  // Check the specific action
  const isAllowed = !!modulePerms[action];
  return isAllowed;
};

// ─── FIELD-LEVEL RESTRICTION CHECK (HARDCODED — STAYS STATIC) ───────────────

/**
 * Helper to resolve the canonical field security policy dynamically.
 */
const getCanonicalPolicy = (moduleName) => {
  if (!moduleName) return null;
  let policy = fieldPolicies[moduleName];
  if (!policy) {
    const feKey = BACKEND_TO_FRONTEND_KEY[moduleName] || BACKEND_TO_FRONTEND_KEY[moduleName.toLowerCase()];
    if (feKey) {
      const canonicalKey = Object.keys(fieldPolicies).find(key => {
        const mappedFe = BACKEND_TO_FRONTEND_KEY[key] || BACKEND_TO_FRONTEND_KEY[key.toLowerCase()];
        return mappedFe === feKey;
      });
      if (canonicalKey) {
        policy = fieldPolicies[canonicalKey];
      }
    }
  }
  return policy;
};

/**
 * Returns restricted fields for a role on a module.
 * This is NOT dynamic — field-level security policies are hardcoded for safety.
 */
export const getRestrictedFields = (moduleName, role) => {
  const policy = getCanonicalPolicy(moduleName);
  if (!policy) return [];

  // If the role is an admin role, do not fallback to 'employee'
  if (role === 'super_admin' || role === 'company_admin' || role === 'branch_admin') {
    return policy.restrictedFields[role] || [];
  }

  // Get restricted fields for the role (or fallback to employee defaults)
  return policy.restrictedFields[role] || policy.restrictedFields['employee'] || [];
};

// ─── MODULE CONFIG (FOR SCOPE/OWNERSHIP REQUIREMENTS) ───────────────────────

/**
 * Registers a new module's field-level security policies dynamically.
 */
export const registerModulePermissions = (moduleName, config) => {
  fieldPolicies[moduleName] = config;
};

/**
 * Gets the module's security configuration (classification, scope, ownership).
 */
export const getModuleConfig = (moduleName) => {
  return getCanonicalPolicy(moduleName) || null;
};

export default {
  checkActionPermission,
  getRestrictedFields,
  registerModulePermissions,
  getModuleConfig,
  clearPermissionCache
};
