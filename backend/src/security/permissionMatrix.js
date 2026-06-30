import { ResourceClassifications } from './securityConstants.js';

const matrix = {
  Employee: {
    resource: 'Employee',
    classification: ResourceClassifications.INTERNAL,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    permissions: {
      read: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      create: ['branch_admin', 'company_admin', 'super_admin'],
      update: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      delete: ['super_admin'],
      approve: [],
      export: ['company_admin', 'super_admin', 'branch_admin'],
      import: ['company_admin', 'super_admin']
    },
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
    resource: 'Attendance',
    classification: ResourceClassifications.INTERNAL,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    permissions: {
      read: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      create: ['employee', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      update: ['employee', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      delete: ['branch_admin', 'company_admin', 'super_admin'],
      approve: ['manager', 'branch_admin', 'company_admin', 'super_admin'],
      export: ['branch_admin', 'company_admin', 'super_admin'],
      import: ['company_admin', 'super_admin']
    },
    allowedFields: {
      employee: ['notes', 'breaks', 'breakTime', 'punchOut', 'punchIn', 'overtime']
    },
    restrictedFields: {
      employee: ['employeeId', 'branch', 'department', 'manager', 'status']
    }
  },
  Leave: {
    resource: 'Leave',
    classification: ResourceClassifications.INTERNAL,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    permissions: {
      read: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      create: ['employee', 'company_admin', 'super_admin'],
      update: ['employee', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      delete: ['employee', 'branch_admin', 'company_admin', 'super_admin'],
      approve: ['team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      export: ['branch_admin', 'company_admin', 'super_admin'],
      import: ['company_admin', 'super_admin']
    },
    allowedFields: {
      employee: ['type', 'fromDate', 'toDate', 'days', 'reason', 'documentType', 'fileName', 'fileFormat']
    },
    restrictedFields: {
      employee: ['status', 'approver', 'approvedBy', 'approvalDate', 'approverNotes']
    }
  },
  Projects: {
    resource: 'Projects',
    classification: ResourceClassifications.CONFIDENTIAL,
    scopeRequirement: 'department',
    ownershipRequirement: false,
    permissions: {
      read: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      create: ['manager', 'branch_admin', 'company_admin', 'super_admin'],
      update: ['manager', 'branch_admin', 'company_admin', 'super_admin'],
      delete: ['company_admin', 'super_admin'],
      approve: [],
      export: ['company_admin', 'super_admin'],
      import: ['company_admin', 'super_admin']
    },
    allowedFields: {},
    restrictedFields: {
      employee: ['budget', 'manager', 'leader', 'members', 'approvalStatus'],
      team_leader: ['budget', 'manager', 'leader', 'members', 'approvalStatus']
    }
  },
  Tasks: {
    resource: 'Tasks',
    classification: ResourceClassifications.CONFIDENTIAL,
    scopeRequirement: 'department',
    ownershipRequirement: true,
    permissions: {
      read: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      create: ['team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      update: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      delete: ['team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      approve: [],
      export: ['company_admin', 'super_admin'],
      import: ['company_admin', 'super_admin']
    },
    allowedFields: {},
    restrictedFields: {
      employee: ['assigneeId', 'assigneeName', 'priority', 'dueDate', 'creatorId', 'projectId', 'branch', 'department', 'approvalStatus', 'createdBy', 'updatedBy']
    }
  },
  Documents: {
    resource: 'Documents',
    classification: ResourceClassifications.PRIVATE,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    permissions: {
      read: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      create: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      update: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      delete: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      approve: [],
      export: ['company_admin', 'super_admin'],
      import: ['company_admin', 'super_admin']
    },
    allowedFields: {},
    restrictedFields: {
      employee: ['branch', 'uploadedBy', 'fileUrl', 'visibility', 'owner'],
      team_leader: ['branch', 'uploadedBy', 'fileUrl', 'visibility', 'owner']
    }
  },
  Chat: {
    resource: 'Chat',
    classification: ResourceClassifications.PRIVATE,
    scopeRequirement: 'none',
    ownershipRequirement: true,
    permissions: {
      read: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      create: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      update: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      delete: ['employee', 'team_leader', 'manager', 'branch_admin', 'company_admin', 'super_admin'],
      approve: [],
      export: [],
      import: []
    },
    allowedFields: {},
    restrictedFields: {}
  },
  Payroll: {
    resource: 'Payroll',
    classification: ResourceClassifications.HIGHLY_CONFIDENTIAL,
    scopeRequirement: 'branch',
    ownershipRequirement: true,
    permissions: {
      read: ['employee', 'manager', 'branch_admin', 'company_admin', 'super_admin', 'hr_manager', 'finance_manager'],
      create: ['branch_admin', 'company_admin', 'super_admin', 'hr_manager'],
      update: ['branch_admin', 'company_admin', 'super_admin', 'hr_manager', 'finance_manager'],
      delete: ['super_admin'],
      approve: ['company_admin', 'super_admin', 'hr_manager', 'finance_manager'],
      export: ['company_admin', 'super_admin', 'hr_manager', 'finance_manager'],
      import: ['company_admin', 'super_admin']
    },
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

/**
 * Checks if a specific role is allowed to perform an action on a module.
 */
export const checkActionPermission = (moduleName, role, action) => {
  const mod = matrix[moduleName];
  if (!mod) return true; // Default allowed if module is not registered

  const allowedRoles = mod.permissions[action];
  if (!allowedRoles) return true;

  return allowedRoles.includes(role);
};

/**
 * Validates that an update payload contains only allowed fields or no restricted fields for the role.
 */
export const getRestrictedFields = (moduleName, role) => {
  const mod = matrix[moduleName];
  if (!mod) return [];

  // If the role is an admin role, do not fallback to 'employee'
  if (role === 'super_admin' || role === 'company_admin' || role === 'branch_admin') {
    return mod.restrictedFields[role] || [];
  }

  // Get restricted fields for the role (or fallback to employee defaults)
  return mod.restrictedFields[role] || mod.restrictedFields['employee'] || [];
};

/**
 * Registers a new module's permission definitions dynamically.
 */
export const registerModulePermissions = (moduleName, config) => {
  matrix[moduleName] = config;
};

export const getModuleConfig = (moduleName) => {
  return matrix[moduleName] || null;
};

export default {
  checkActionPermission,
  getRestrictedFields,
  registerModulePermissions,
  getModuleConfig
};
