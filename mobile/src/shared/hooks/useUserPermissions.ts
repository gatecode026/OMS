/**
 * @file useUserPermissions.ts
 * @description Hook to fetch user roles, permissions, and overrides,
 *              providing dynamic verification matching the Web Portal's rules.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import useAuthStore from '../store/authStore';
import useOfflineStore from '../store/offlineStore';

export interface PermissionObj {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export interface RoleObj {
  id: string;
  name: string;
  permissions: Record<string, PermissionObj>;
}

export interface OverrideObj {
  id: string;
  userId: string;
  module: string;
  type: string;
  scope: string;
  expiry?: string | null;
}

const MODULE_MAPPING: Record<string, string> = {
  dashboard: 'dashboard',
  company_overview: 'company_overview',
  employee_management: 'employees',
  attendance_management: 'attendance',
  leave_management: 'leaves',
  payroll_management: 'payroll',
  department_management: 'departments',
  agency_branch_management: 'branches',
  project_management: 'projects',
  task_monitoring: 'tasks',
  team_management: 'teams',
  system_settings: 'settings',
  document_management: 'documents',
  notifications: 'notifications',
  announcements: 'announcements',
  meetings_calendar: 'meetings_calendar',
  work_reports: 'work_reports',
  performance_analytics: 'performance_analytics',
  role_permission: 'role_permission',
  security_audit_logs: 'security_audit_logs',
  profile_settings: 'profile_settings',
};

const HIERARCHICAL_MODULES = [
  'attendance_management',
  'attendance',
  'leave_management',
  'leaves',
  'project_management',
  'projects',
  'task_monitoring',
  'tasks',
  'payroll_management',
  'payroll',
  'work_reports',
  'meetings_calendar',
  'announcements',
];

export const useUserPermissions = () => {
  const isConnected = useOfflineStore((s) => s.isConnected);
  const currentUser = useAuthStore((s) => s.user);

  // Query all roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<RoleObj[]>({
    queryKey: ['roles', 'list'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/roles');
      return res.data?.data || res.data || [];
    },
    enabled: isConnected && !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Query all overrides
  const { data: overrides = [], isLoading: isLoadingOverrides } = useQuery<OverrideObj[]>({
    queryKey: ['roles', 'overrides'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/roles/overrides');
      return res.data?.data || res.data || [];
    },
    enabled: isConnected && !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Helper to check access for a given module and action (e.g. 'read', 'create')
   */
  const hasPermission = (
    moduleName: string,
    action: keyof PermissionObj = 'read',
    perspective: 'self' | 'company' | null = null
  ): boolean => {
    if (!currentUser) return false;

    const userRole = (currentUser.roleId || currentUser.role || '').toLowerCase();

    // 1. Super Admin and Company Admin bypass all checks
    if (
      userRole === 'super_admin' ||
      userRole === 'company_admin' ||
      userRole.endsWith('_company_admin') ||
      userRole.endsWith('_super_admin')
    ) {
      return true;
    }

    // 2. Check User-specific Overrides first
    if (overrides && overrides.length > 0) {
      const userOvs = overrides.filter((ov) => {
        if (ov.userId !== currentUser.id) return false;

        const ovModule = (ov.module || '').toLowerCase();
        const targetModule = (moduleName || '').toLowerCase();

        // Match base module names
        const matchPayroll = ovModule.includes('payroll') && targetModule.includes('payroll');
        const matchLeave = ovModule.includes('leave') && targetModule.includes('leave');
        const matchEmployee = ovModule.includes('employee') && targetModule.includes('employee');
        const matchTask =
          (ovModule.includes('project') || ovModule.includes('task')) &&
          (targetModule.includes('task') || targetModule.includes('project'));
        const matchPermission =
          (ovModule.includes('permission') || ovModule.includes('role')) &&
          targetModule.includes('permission');
        const matchSetting = ovModule.includes('setting') && targetModule.includes('setting');
        const matchAttendance = ovModule.includes('attendance') && targetModule.includes('attendance');
        const matchDashboard = ovModule.includes('dashboard') && targetModule.includes('dashboard');

        return (
          matchPayroll ||
          matchLeave ||
          matchEmployee ||
          matchTask ||
          matchPermission ||
          matchSetting ||
          matchAttendance ||
          matchDashboard ||
          ovModule === targetModule
        );
      });

      for (const ov of userOvs) {
        // Verify expiry
        let isExpired = false;
        if (ov.expiry && ov.expiry !== 'Permanent') {
          const expDate = new Date(ov.expiry);
          if (!isNaN(expDate.getTime()) && expDate < new Date()) {
            isExpired = true;
          }
        }

        if (!isExpired) {
          const scope = (ov.scope || '').toLowerCase();
          const type = (ov.type || '').toLowerCase();

          // Explicit Denial or None scope denies everything
          if (
            type.includes('deny') ||
            type.includes('denial') ||
            scope.includes('none') ||
            scope.includes('restricted')
          ) {
            return false;
          }

          // Temporary Grant overrides default role settings
          if (
            type.includes('grant') ||
            type.includes('allow') ||
            scope.includes('read') ||
            scope.includes('write') ||
            scope.includes('full')
          ) {
            if (scope.includes('read only')) {
              return action === 'read';
            }
            if (scope.includes('read & write') || scope.includes('write')) {
              return ['read', 'create', 'update', 'delete'].includes(action);
            }
            if (scope.includes('full')) {
              return true;
            }
          }
        }
      }
    }

    // 3. Check role-based database permissions
    const baseKey = MODULE_MAPPING[moduleName] || moduleName;
    const isHierarchical =
      HIERARCHICAL_MODULES.includes(baseKey) || HIERARCHICAL_MODULES.includes(moduleName);
    
    // Default perspective for employees is self, others default to company
    const activePerspective = perspective || (userRole === 'employee' ? 'self' : 'company');

    const roleObj =
      roles.find((r) => r.id === currentUser.roleId) ||
      roles.find((r) => r.id === currentUser.role) ||
      roles.find((r) => r.id.toLowerCase() === userRole);

    const permissions = roleObj?.permissions;

    if (permissions) {
      let dbPermission;
      if (isHierarchical && activePerspective === 'self') {
        const selfModKey = `${moduleName}_self`;
        const selfBaseKey = `${baseKey}_self`;
        dbPermission =
          permissions[selfModKey] !== undefined
            ? permissions[selfModKey]
            : permissions[selfBaseKey] !== undefined
            ? permissions[selfBaseKey]
            : permissions[moduleName] !== undefined
            ? permissions[moduleName]
            : permissions[baseKey];
      } else {
        dbPermission =
          permissions[moduleName] !== undefined ? permissions[moduleName] : permissions[baseKey];
      }

      if (dbPermission !== undefined) {
        return !!dbPermission[action];
      }
    }

    // Default Fallbacks if role check is offline or not found in DB
    // Match basic role settings
    if (moduleName === 'employee_management' || moduleName === 'department_management' || moduleName === 'agency_branch_management') {
      return ['super_admin', 'company_admin', 'branch_admin', 'hr'].includes(userRole);
    }
    if (moduleName === 'payroll_management') {
      return ['super_admin', 'company_admin', 'branch_admin', 'hr', 'employee'].includes(userRole);
    }
    if (moduleName === 'role_permission' || moduleName === 'system_settings' || moduleName === 'security_audit_logs' || moduleName === 'work_reports' || moduleName === 'performance_analytics') {
      return ['super_admin', 'company_admin'].includes(userRole);
    }

    // Strict whitelist fallback for general employees to prevent security bypasses when offline
    const EMPLOYEE_ALLOWED_MODULES = [
      'dashboard',
      'attendance_management',
      'leave_management',
      'document_management',
      'notifications',
      'task_monitoring',
      'profile_settings',
      'meetings_calendar',
      'announcements'
    ];

    if (userRole === 'employee') {
      return EMPLOYEE_ALLOWED_MODULES.includes(moduleName) || EMPLOYEE_ALLOWED_MODULES.includes(baseKey);
    }

    // Default general access fallback for admins/hr roles
    return ['super_admin', 'company_admin', 'branch_admin', 'hr'].includes(userRole);
  };

  return {
    roles,
    overrides,
    isLoading: isLoadingRoles || isLoadingOverrides,
    hasPermission,
  };
};

export default useUserPermissions;
