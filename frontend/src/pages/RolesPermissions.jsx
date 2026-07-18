import React, { useState, useMemo, useEffect } from 'react';
import './RolesPermissions.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Shield, Key, Users, Lock, ShieldAlert, Award, FileText, CheckCircle,
  XCircle, Clock, Plus, Edit, Trash2, Sliders, Database,
  Settings, HelpCircle, Download, Eye, Check, X, FileDown, Search, Filter, RefreshCw,
  MoreVertical, AlertTriangle, AlertCircle, Info, ChevronRight, ChevronDown, RefreshCcw, Building, ShieldCheck,
  UserCheck, UserX, Printer, Activity, LogIn, LogOut, Copy, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

const defaultIcons = {
  super_admin: '👑',
  branch_admin: '🏢',
  project_manager: '💼',
  team_leader: '👥',
  employee: '👤'
};

const defaultLevels = {
  super_admin: 'Full Access',
  branch_admin: 'Administrative',
  project_manager: 'Managerial',
  team_leader: 'Lead Access',
  employee: 'Standard'
};

const defaultColors = {
  super_admin: '#8b5cf6',
  branch_admin: '#3b82f6',
  project_manager: '#ec4899',
  team_leader: '#10b981',
  employee: '#64748b'
};

const hexToRgba = (hex, alpha = 0.15) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(99, 102, 241, ${alpha})`;
  let c = hex.substring(1);
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const r = parseInt(c.substring(0, 2), 16) || 99;
  const g = parseInt(c.substring(2, 4), 16) || 102;
  const b = parseInt(c.substring(4, 6), 16) || 241;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getRoleRank = (role) => {
  if (role.id === 'super_admin') return 1;
  if (role.id === 'branch_admin') return 2;
  if (role.id === 'manager' || role.id === 'project_manager' || role.id === 'dept_admin') return 3;
  if (role.id === 'team_leader') return 4;
  if (role.id === 'employee') return 5;
  
  const level = (role.accessLevel || '').toLowerCase();
  if (level.includes('full')) return 1;
  if (level.includes('admin')) return 2;
  if (level.includes('manager') || level.includes('manage')) return 3;
  if (level.includes('lead')) return 4;
  return 5;
};

const renderHierarchyTree = (rolesList, index = 0) => {
  if (!rolesList || index >= rolesList.length) return null;
  
  const role = rolesList[index];
  const color = role.color || '#6366f1';
  const bgStyle = hexToRgba(color, 0.15);

  if (index === 0) {
    return (
      <div className="hierarchy-root pt-3">
        <div className="hierarchy-node">
          <div className="hierarchy-node-icon" style={{ background: bgStyle, color: color }}>
            {role.icon || '⚙️'}
          </div>
          <span>{role.name} (Level {index + 1})</span>
        </div>
        {renderHierarchyTree(rolesList, index + 1)}
      </div>
    );
  }

  return (
    <div className="hierarchy-children">
      <div className="hierarchy-child-row">
        <div className="hierarchy-connector"></div>
        <div className="hierarchy-node">
          <div className="hierarchy-node-icon" style={{ background: bgStyle, color: color }}>
            {role.icon || '⚙️'}
          </div>
          <span>{role.name} (Level {index + 1})</span>
        </div>
      </div>
      {renderHierarchyTree(rolesList, index + 1)}
    </div>
  );
};

const RolesPermissions = () => {
  const isLoading = usePageLoading(600);
  const { 
    roles: contextRoles, 
    updatePermissions, 
    employees, 
    showConfirm, 
    currentUserRole, 
    setCurrentUserRole,
    addRole,
    updateRole,
    deleteRole,
    userOverrides: contextUserOverrides,
    addUserOverride,
    deleteUserOverride,
    updateEmployee,
    activityLogs,
    permissionModules,
    addPermissionModule,
    deletePermissionModule,
    addToast
  } = useApp();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('dashboard');



  // Local state for extended Roles list
  const [localRoles, setLocalRoles] = useState([]);

  // Initialize and Sync localRoles from AppContext roles
  useEffect(() => {
    if (contextRoles) {
      setLocalRoles(prev => {
        return contextRoles.map(r => {
          const existing = prev.find(p => p.id === r.id);
          const userCount = (employees || []).filter(emp => {
            const rId = emp.roleId || (emp.role ? emp.role.toLowerCase().replace(/\s+/g, '_') : 'employee');
            return rId === r.id;
          }).length;

          return {
            ...r,
            icon: r.icon || defaultIcons[r.id] || '⚙️',
            accessLevel: r.accessLevel || defaultLevels[r.id] || 'Custom Access',
            createdDate: existing?.createdDate || '01-Jan-2024',
            lastModified: existing?.lastModified || '05-Jun-2026',
            status: existing?.status || 'Active',
            color: r.accentColor || defaultColors[r.id] || '#6366f1',
            description: r.description || 'Granular permissions managed at module level.',
            userCount
          };
        });
      });
    }
  }, [contextRoles, employees]);

  // Selected role for the manual operations matrix
  const [selectedRoleId, setSelectedRoleId] = useState('branch_admin');
  const [localPermissions, setLocalPermissions] = useState({});

  // Expandable modules list tracking
  const [expandedModules, setExpandedModules] = useState({
    attendance_management: true,
    leave_management: true,
    project_management: true,
    task_monitoring: true,
    payroll_management: true,
    work_reports: true,
    meetings_calendar: true,
    announcements: true
  });

  const HIERARCHICAL_MODULES = [
    'attendance_management',
    'leave_management',
    'project_management',
    'task_monitoring',
    'payroll_management',
    'work_reports',
    'performance_analytics',
    'meetings_calendar',
    'announcements'
  ];

  // Dynamic modules list state
  const [modulesList, setModulesList] = useState([
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'company_overview', label: 'Company Overview' },
    { key: 'employee_management', label: 'Employee Management' },
    { key: 'agency_branch_management', label: 'Agency Branch Management' },
    { key: 'department_management', label: 'Department Management' },
    { key: 'team_management', label: 'Team Management' },
    { key: 'attendance_management', label: 'Attendance Management' },
    { key: 'leave_management', label: 'Leave Management' },
    { key: 'project_management', label: 'Project Management' },
    { key: 'task_monitoring', label: 'Task Monitoring' },
    { key: 'work_reports', label: 'Work Reports' },
    { key: 'performance_analytics', label: 'Performance Analytics' },
    { key: 'payroll_management', label: 'Payroll Management' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'meetings_calendar', label: 'Meetings & Calendar' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'document_management', label: 'Document Management' },
    { key: 'role_permission', label: 'Role & Permission' },
    { key: 'system_settings', label: 'System Settings' },
    { key: 'security_audit_logs', label: 'Security & Audit Logs' },
    { key: 'profile_settings', label: 'Profile Settings' }
  ]);

  // Sync modulesList with context permissionModules and enforce sidebar order
  useEffect(() => {
    if (permissionModules && permissionModules.length > 0) {
      const sidebarOrder = [
        'dashboard',
        'company_overview',
        'employee_management',
        'agency_branch_management',
        'department_management',
        'team_management',
        'attendance_management',
        'leave_management',
        'project_management',
        'task_monitoring',
        'work_reports',
        'performance_analytics',
        'payroll_management',
        'announcements',
        'meetings_calendar',
        'notifications',
        'document_management',
        'role_permission',
        'system_settings',
        'security_audit_logs',
        'profile_settings'
      ];

      const sorted = [...permissionModules].sort((a, b) => {
        const indexA = sidebarOrder.indexOf(a.key);
        const indexB = sidebarOrder.indexOf(b.key);

        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      setModulesList(sorted);
    }
  }, [permissionModules]);

  const operations = [
    { key: 'read', label: 'VIEW' },
    { key: 'create', label: 'CREATE' },
    { key: 'update', label: 'EDIT' },
    { key: 'delete', label: 'DELETE' },
    { key: 'approve', label: 'APPROVE' },
    { key: 'export', label: 'EXPORT' }
  ];

  // Sync localPermissions when selectedRoleId or localRoles changes
  useEffect(() => {
    const roleObj = localRoles.find(r => r.id === selectedRoleId);
    if (roleObj && roleObj.permissions) {
      setLocalPermissions(JSON.parse(JSON.stringify(roleObj.permissions)));
    }
  }, [selectedRoleId, localRoles]);

  // Working permission matrix state
  const [matrixData, setMatrixData] = useState({
    dashboard: { super_admin: 'Full', branch_admin: 'Limited', project_manager: 'View', team_leader: 'View', employee: 'View' },
    employees: { super_admin: 'Full', branch_admin: 'Full', project_manager: 'Limited', team_leader: 'Limited', employee: 'No' },
    attendance: { super_admin: 'Full', branch_admin: 'Full', project_manager: 'Limited', team_leader: 'Limited', employee: 'Limited' },
    leaves: { super_admin: 'Full', branch_admin: 'Full', project_manager: 'Full', team_leader: 'Full', employee: 'Limited' },
    projects: { super_admin: 'Full', branch_admin: 'Full', project_manager: 'Full', team_leader: 'Full', employee: 'Limited' },
    tasks: { super_admin: 'Full', branch_admin: 'Full', project_manager: 'Full', team_leader: 'Full', employee: 'Limited' },
    payroll: { super_admin: 'Full', branch_admin: 'Limited', project_manager: 'No', team_leader: 'No', employee: 'View' },
    permissions: { super_admin: 'Full', branch_admin: 'No', project_manager: 'No', team_leader: 'No', employee: 'No' },
    settings: { super_admin: 'Full', branch_admin: 'Limited', project_manager: 'No', team_leader: 'No', employee: 'No' },
    security: { super_admin: 'Full', branch_admin: 'No', project_manager: 'No', team_leader: 'No', employee: 'No' },
    audit_logs: { super_admin: 'Full', branch_admin: 'No', project_manager: 'No', team_leader: 'No', employee: 'No' },
    reports: { super_admin: 'Full', branch_admin: 'Limited', project_manager: 'Limited', team_leader: 'No', employee: 'No' }
  });

  // Add Permission Module Modal states
  const [showAddPermModal, setShowAddPermModal] = useState(false);
  const [newPermForm, setNewPermForm] = useState({
    name: '', defaultLevel: 'No'
  });

  const handleAddPermissionModule = async (e) => {
    e.preventDefault();
    if (!newPermForm.name.trim()) return;

    const moduleKey = newPermForm.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const exists = modulesList.some(m => m.key === moduleKey);
    if (exists) {
      addToast('danger', `Module "${newPermForm.name}" already exists in the matrix.`);
      return;
    }

    try {
      await addPermissionModule(newPermForm.name);
      setLocalPermissions(prev => ({
        ...prev,
        [moduleKey]: { read: false, create: false, update: false, delete: false, approve: false, export: false }
      }));
      setNewPermForm({ name: '', defaultLevel: 'No' });
      setShowAddPermModal(false);
    } catch (err) {
      addToast('danger', 'Failed to add permission module to database.');
    }
  };

  const handleDeletePermissionModule = (moduleKey, label) => {
    showConfirm(
      'Delete Permission Module',
      `Are you sure you want to permanently delete the permission module "${label}"? This will delete it from all roles in the system.`,
      async () => {
        try {
          await deletePermissionModule(moduleKey);
          setLocalPermissions(prev => {
            const updated = { ...prev };
            delete updated[moduleKey];
            return updated;
          });
        } catch (err) {
          addToast('danger', 'Failed to delete permission module.');
        }
      },
      'danger'
    );
  };

  const handleCheckboxToggle = async (moduleKey, opKey) => {
    console.log("CHECKBOX TOGGLE CLICKED:", moduleKey, opKey);
    if (selectedRoleId === 'super_admin') {
      addToast('warning', 'Super Admin permissions are permanently locked and cannot be modified.');
      return;
    }

    const modulePerms = localPermissions[moduleKey] || { read: false, create: false, update: false, delete: false, approve: false, export: false };
    const updatedPermissions = {
      ...localPermissions,
      [moduleKey]: {
        ...modulePerms,
        [opKey]: !modulePerms[opKey]
      }
    };

    // Update local states immediately for responsive UI
    setLocalPermissions(updatedPermissions);
    setLocalRoles(prev => prev.map(r => r.id === selectedRoleId ? { ...r, permissions: updatedPermissions } : r));

    try {
      // Auto-save changes dynamically in real-time
      await updatePermissions(selectedRoleId, updatedPermissions);
      // No extra addToast here; context triggers generic toast
    } catch (err) {
      console.error('Real-time permission save failed:', err);
      addToast('danger', 'Failed to save changes automatically.');
    }
  };

  const isRowKeyAllChecked = (rowKey) => {
    const perms = localPermissions[rowKey] || {};
    return operations.every(op => !!perms[op.key]);
  };

  const isColumnAllChecked = (opKey) => {
    return modulesList.every(mod => {
      if (HIERARCHICAL_MODULES.includes(mod.key)) {
        const selfPerms = localPermissions[`${mod.key}_self`] || {};
        const compPerms = localPermissions[mod.key] || {};
        return !!selfPerms[opKey] && !!compPerms[opKey];
      }
      const perms = localPermissions[mod.key] || {};
      return !!perms[opKey];
    });
  };

  const handleRowKeyToggle = async (rowKey) => {
    if (selectedRoleId === 'super_admin') {
      addToast('warning', 'Super Admin permissions are permanently locked.');
      return;
    }

    const modulePerms = localPermissions[rowKey] || { read: false, create: false, update: false, delete: false, approve: false, export: false };
    const allChecked = operations.every(op => !!modulePerms[op.key]);
    const nextVal = !allChecked;

    const updatedPermissions = {
      ...localPermissions,
      [rowKey]: operations.reduce((acc, op) => {
        acc[op.key] = nextVal;
        return acc;
      }, {})
    };

    setLocalPermissions(updatedPermissions);
    setLocalRoles(prev => prev.map(r => r.id === selectedRoleId ? { ...r, permissions: updatedPermissions } : r));

    try {
      await updatePermissions(selectedRoleId, updatedPermissions);
    } catch (err) {
      console.error('Failed to save row permissions:', err);
      addToast('danger', 'Failed to save changes.');
    }
  };

  const handleColumnToggle = async (opKey) => {
    if (selectedRoleId === 'super_admin') {
      addToast('warning', 'Super Admin permissions are permanently locked.');
      return;
    }

    const allChecked = isColumnAllChecked(opKey);
    const nextVal = !allChecked;

    const updatedPermissions = { ...localPermissions };
    modulesList.forEach(mod => {
      if (HIERARCHICAL_MODULES.includes(mod.key)) {
        const selfKey = `${mod.key}_self`;
        const selfPerms = updatedPermissions[selfKey] || { read: false, create: false, update: false, delete: false, approve: false, export: false };
        updatedPermissions[selfKey] = { ...selfPerms, [opKey]: nextVal };

        const compPerms = updatedPermissions[mod.key] || { read: false, create: false, update: false, delete: false, approve: false, export: false };
        updatedPermissions[mod.key] = { ...compPerms, [opKey]: nextVal };
      } else {
        const perms = updatedPermissions[mod.key] || { read: false, create: false, update: false, delete: false, approve: false, export: false };
        updatedPermissions[mod.key] = { ...perms, [opKey]: nextVal };
      }
    });

    setLocalPermissions(updatedPermissions);
    setLocalRoles(prev => prev.map(r => r.id === selectedRoleId ? { ...r, permissions: updatedPermissions } : r));

    try {
      await updatePermissions(selectedRoleId, updatedPermissions);
    } catch (err) {
      console.error('Failed to save column permissions:', err);
      addToast('danger', 'Failed to save changes.');
    }
  };

  const handleSaveRolePermissions = () => {
    if (selectedRoleId === 'super_admin') {
      addToast('warning', 'Super Admin permissions are permanent and cannot be modified.');
      return;
    }
    updatePermissions(selectedRoleId, localPermissions);
    
    // Sync into localRoles state so it shows updated count or info
    setLocalRoles(prev => prev.map(r => r.id === selectedRoleId ? { ...r, permissions: localPermissions } : r));
    // No extra addToast here; context triggers generic toast
  };

  // Cycle permissions chips (compatibility with other references)
  const permOptions = ['Full', 'Limited', 'View', 'No'];
  const handleMatrixCellClick = (moduleKey, roleId) => {
    console.log("MATRIX CELL CLICKED:", moduleKey, roleId);
    if (roleId === 'super_admin') {
      addToast('warning', 'Super Admin permissions are permanently locked.');
      return;
    }
    setMatrixData(prev => {
      const current = prev[moduleKey]?.[roleId] || 'No';
      const currentIndex = permOptions.indexOf(current);
      const nextIndex = (currentIndex + 1) % permOptions.length;
      const nextVal = permOptions[nextIndex];
      return {
        ...prev,
        [moduleKey]: {
          ...prev[moduleKey],
          [roleId]: nextVal
        }
      };
    });
    addToast('info', 'Permission updated.');
  };



  const userOverrides = contextUserOverrides || [];

  const auditLogs = useMemo(() => {
    return (activityLogs || []).map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      user: log.newValue || '—',
      changedBy: log.actor || 'System User',
      module: log.fieldChanged || 'Permissions',
      action: log.actionType || 'Update',
      oldVal: log.oldValue || '—',
      newVal: log.newValue || '—'
    }));
  }, [activityLogs]);

  // Seed security features list
  const [securityFeatures, setSecurityFeatures] = useState([
    { id: 'SEC-1', title: 'Two-Factor Authentication', desc: 'Enforces one-time passcodes via authenticator app.', status: 'Active (Enforced)', icon: Lock, variant: 'success' },
    { id: 'SEC-2', title: 'Idle Session Timeout', desc: 'Logs out inactive users after 15 minutes of inactivity.', status: '15 Minutes', icon: Clock, variant: 'warning' },
    { id: 'SEC-3', title: 'IP Address Whitelisting', desc: 'Allows Super Admin access only from certified office gateways.', status: 'Configured (3 IPs)', icon: Shield, variant: 'info' },
    { id: 'SEC-4', title: 'Audit Log Retention', desc: 'Defines archiving duration for system actions logs.', status: '90 Days Retention', icon: Database, variant: 'primary' }
  ]);

  // Modal Control States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRestrictModal, setShowRestrictModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Form states for modals
  const [createForm, setCreateForm] = useState({
    name: '', description: '', parentRole: 'employee', accessLevel: 'Standard', status: 'Active', color: '#3b82f6', icon: '👤'
  });
  const [cloneForm, setCloneForm] = useState({
    sourceRoleId: 'employee', targetName: '', inheritAll: true
  });
  const [assignForm, setAssignForm] = useState({
    userId: 'EMP-2026-006', roleId: 'employee', type: 'Permanent', expiry: '', reason: ''
  });
  const [restrictForm, setRestrictForm] = useState({
    userId: 'EMP-2026-006', module: 'Payroll Management', scope: 'None (Restricted)', type: 'Explicit Denial', expiry: 'Permanent'
  });
  const [exportForm, setExportForm] = useState({
    reportType: 'user_permissions', format: 'PDF', includeAudit: true
  });

  // Filters
  const [roleSearch, setRoleSearch] = useState('');
  const [roleStatusFilter, setRoleStatusFilter] = useState('');
  const [roleAccessFilter, setRoleAccessFilter] = useState('');

  const [userAccessSearch, setUserAccessSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('');

  // Dynamic system and custom roles counts
  const systemRolesCount = useMemo(() => {
    const systemIds = ['super_admin', 'branch_admin', 'dept_admin', 'project_manager', 'team_leader', 'employee'];
    return localRoles.filter(r => systemIds.includes(r.id)).length;
  }, [localRoles]);

  const customRolesCount = useMemo(() => {
    const systemIds = ['super_admin', 'branch_admin', 'dept_admin', 'project_manager', 'team_leader', 'employee'];
    return localRoles.filter(r => !systemIds.includes(r.id)).length;
  }, [localRoles]);

  // Dynamic MFA Adoption Rate
  const mfaAdoptionRate = useMemo(() => {
    if (!employees || employees.length === 0) return '0.0';
    const mfaAdoptedCount = employees.filter(e => {
      const mfa = e.securityInfo?.mfaStatus || 'Disabled';
      return mfa === 'Enabled' || mfa === 'Enforced';
    }).length;
    return ((mfaAdoptedCount / employees.length) * 100).toFixed(1);
  }, [employees]);

  // Dynamic Security Score
  const securityScore = useMemo(() => {
    const rate = parseFloat(mfaAdoptionRate);
    if (rate >= 90) return 'A+';
    if (rate >= 80) return 'A';
    if (rate >= 70) return 'B';
    if (rate >= 60) return 'C';
    return 'D';
  }, [mfaAdoptionRate]);

  // Dynamic Dept Administrators Count
  const deptAdminsCount = useMemo(() => {
    if (!employees || employees.length === 0) return 0;
    return employees.filter(e => e.roleId === 'dept_admin' || e.roleId === 'project_manager' || e.roleId === 'manager').length;
  }, [employees]);

  // Unique Departments Count
  const uniqueDepartmentsCount = useMemo(() => {
    if (!employees || employees.length === 0) return 0;
    const depts = employees.map(e => e.department).filter(Boolean);
    return new Set(depts).size || 0;
  }, [employees]);

  // Dynamic Branch Administrators Count
  const branchAdminsCount = useMemo(() => {
    if (!employees || employees.length === 0) return 0;
    return employees.filter(e => e.roleId === 'branch_admin').length;
  }, [employees]);

  // Unique Branches Count
  const uniqueBranchesCount = useMemo(() => {
    if (!employees || employees.length === 0) return 0;
    const branches = employees.map(e => e.branch).filter(Boolean);
    return new Set(branches).size || 0;
  }, [employees]);

  // Dynamic total employees count (for distribution percentages)
  const totalEmployeesCount = useMemo(() => {
    return employees?.length || 0;
  }, [employees]);

  // Recharts Dynamic Data derived from database
  const activityData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = days.reduce((acc, day) => {
      acc[day] = { name: day, Logins: 0, Changes: 0, Failures: 0 };
      return acc;
    }, {});

    let hasData = false;
    (activityLogs || []).forEach(log => {
      if (!log.timestamp) return;
      const date = new Date(log.timestamp);
      const dayIndex = date.getDay();
      if (isNaN(dayIndex)) return;
      const dayName = days[dayIndex];
      hasData = true;

      const actType = (log.actionType || '').toLowerCase();
      if (actType === 'login') {
        counts[dayName].Logins += 1;
      } else if (actType === 'failed login' || actType.includes('fail')) {
        counts[dayName].Failures += 1;
      } else {
        counts[dayName].Changes += 1;
      }
    });

    if (!hasData) {
      return [
        { name: 'Mon', Logins: 145, Changes: 12, Failures: 1 },
        { name: 'Tue', Logins: 188, Changes: 8, Failures: 0 },
        { name: 'Wed', Logins: 210, Changes: 15, Failures: 2 },
        { name: 'Thu', Logins: 195, Changes: 22, Failures: 4 },
        { name: 'Fri', Logins: 160, Changes: 10, Failures: 0 },
        { name: 'Sat', Logins: 45, Changes: 3, Failures: 0 },
        { name: 'Sun', Logins: 32, Changes: 1, Failures: 1 }
      ];
    }

    const displayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return displayOrder.map(day => counts[day]);
  }, [activityLogs]);

  const deptData = useMemo(() => {
    const counts = {};
    (activityLogs || []).forEach(log => {
      const emp = (employees || []).find(e => e.name === log.actor);
      if (emp && emp.department) {
        counts[emp.department] = (counts[emp.department] || 0) + 1;
      }
    });

    const hasData = Object.keys(counts).length > 0;
    if (!hasData) {
      return [
        { department: 'Engineering', changes: 45 },
        { department: 'Sales', changes: 28 },
        { department: 'Operations', changes: 52 },
        { department: 'HR', changes: 18 },
        { department: 'Marketing', changes: 14 }
      ];
    }

    return Object.entries(counts).map(([department, changes]) => ({
      department,
      changes
    }));
  }, [activityLogs, employees]);

  const roleDistributionData = useMemo(() => {
    const counts = {};
    (employees || []).forEach(emp => {
      const rId = emp.roleId || 'employee';
      counts[rId] = (counts[rId] || 0) + 1;
    });

    const totalCount = employees?.length || 0;
    if (totalCount === 0) {
      return [
        { name: 'Super Admin', value: 2, color: '#8b5cf6' },
        { name: 'Branch Admin', value: 4, color: '#3b82f6' },
        { name: 'Project Manager', value: 3, color: '#ec4899' },
        { name: 'Team Leader', value: 8, color: '#10b981' },
        { name: 'Employee', value: 48, color: '#64748b' }
      ];
    }

    return localRoles.map(role => {
      return {
        name: role.name,
        value: counts[role.id] || 0,
        color: role.color || role.accentColor || '#6366f1'
      };
    }).filter(d => d.value > 0);
  }, [localRoles, employees]);

  // Handler functions for role actions
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    try {
      if (editingRole) {
        // Edit mode
        const success = await updateRole(editingRole.id, {
          name: createForm.name.trim(),
          description: createForm.description,
          accentColor: createForm.color,
          accessLevel: createForm.accessLevel,
          status: createForm.status
        });
        if (success) {
          setEditingRole(null);
          setCreateForm({ name: '', description: '', parentRole: 'employee', accessLevel: 'Standard', status: 'Active', color: '#3b82f6', icon: '👤' });
          setShowCreateModal(false);
        }
      } else {
        // Create mode
        const systemRoleIds = {
          'super admin': 'super_admin',
          'super_admin': 'super_admin',
          'branch admin': 'branch_admin',
          'branch_admin': 'branch_admin',
          'department admin': 'dept_admin',
          'dept admin': 'dept_admin',
          'dept_admin': 'dept_admin',
          'manager': 'manager',
          'project manager': 'manager',
          'team leader': 'team_leader',
          'team_leader': 'team_leader',
          'employee': 'employee'
        };
        const trimmedName = createForm.name.trim().toLowerCase();
        const systemId = systemRoleIds[trimmedName];
        const newId = systemId || `role_${trimmedName.replace(/\s+/g, '_')}`;

        const newRole = {
          id: newId,
          name: createForm.name.trim(),
          description: createForm.description,
          userCount: 0,
          accentColor: createForm.color,
          accessLevel: createForm.accessLevel,
          status: createForm.status,
          permissions: modulesList.reduce((acc, m) => {
            acc[m.key] = {
              create: false,
              read: ['dashboard', 'company_overview', 'profile_settings'].includes(m.key),
              update: false,
              delete: false,
              approve: false,
              export: false
            };
            return acc;
          }, {})
        };
        const success = await addRole(newRole);
        if (success) {
          setCreateForm({ name: '', description: '', parentRole: 'employee', accessLevel: 'Standard', status: 'Active', color: '#3b82f6', icon: '👤' });
          setShowCreateModal(false);
        }
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error saving role.');
    }
  };

  const handleEditRoleClick = (role) => {
    setEditingRole(role);
    setCreateForm({
      name: role.name,
      description: role.description,
      parentRole: 'employee',
      accessLevel: role.accessLevel,
      status: role.status,
      color: role.color || role.accentColor || '#3b82f6',
      icon: role.icon || '👤'
    });
    setShowCreateModal(true);
  };

  const handleDeleteRoleClick = (role) => {
    if (role.id === 'super_admin' || role.id === 'employee') {
      addToast('danger', `Default role "${role.name}" cannot be deleted.`);
      return;
    }
    showConfirm(
      'Delete Role Access',
      `Are you sure you want to permanently delete the role "${role.name}"? This action will migrate all active users to the default Employee role.`,
      async () => {
        try {
          await deleteRole(role.id);
        } catch (err) {
          console.error(err);
          addToast('danger', 'Error deleting role.');
        }
      },
      'danger'
    );
  };

  const handleCloneRole = async (e) => {
    e.preventDefault();
    if (!cloneForm.targetName.trim()) return;

    const source = localRoles.find(r => r.id === cloneForm.sourceRoleId);
    if (!source) return;

    const systemRoleIds = {
      'super admin': 'super_admin',
      'super_admin': 'super_admin',
      'branch admin': 'branch_admin',
      'branch_admin': 'branch_admin',
      'department admin': 'dept_admin',
      'dept admin': 'dept_admin',
      'dept_admin': 'dept_admin',
      'manager': 'manager',
      'project manager': 'manager',
      'team leader': 'team_leader',
      'team_leader': 'team_leader',
      'employee': 'employee'
    };
    const trimmedTargetName = cloneForm.targetName.trim().toLowerCase();
    const systemId = systemRoleIds[trimmedTargetName];
    const newId = systemId || `role_clone_${trimmedTargetName.replace(/\s+/g, '_')}`;

    const cloned = {
      id: newId,
      name: cloneForm.targetName.trim(),
      description: `Cloned from ${source.name}. ${source.description}`,
      userCount: 0,
      accentColor: source.accentColor || source.color || '#3b82f6',
      accessLevel: source.accessLevel || 'Standard',
      status: source.status || 'Active',
      permissions: JSON.parse(JSON.stringify(source.permissions || {}))
    };

    try {
      await addRole(cloned);
      setCloneForm({ sourceRoleId: 'employee', targetName: '', inheritAll: true });
      setShowCloneModal(false);
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error cloning role.');
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === assignForm.userId);
    const roleObj = localRoles.find(r => r.id === assignForm.roleId);
    if (!emp || !roleObj) return;

    try {
      await updateEmployee(assignForm.userId, { roleId: assignForm.roleId, role: roleObj.name });
      addToast('success', `Assigned "${roleObj.name}" role to ${emp.name}.`);
      setShowAssignModal(false);
    } catch (err) {
      console.error(err);
      addToast('danger', 'Failed to assign role.');
    }
  };

  const handleRestrictAccess = async (e) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === restrictForm.userId);
    if (!emp) return;

    const newOverride = {
      userId: restrictForm.userId,
      userName: emp.name,
      module: restrictForm.module,
      scope: restrictForm.scope,
      type: restrictForm.type,
      expiry: restrictForm.expiry || 'Permanent'
    };

    try {
      await addUserOverride(newOverride);
      setShowRestrictModal(false);
    } catch (err) {
      console.error(err);
      addToast('danger', 'Failed to add override.');
    }
  };

  const handleRemoveOverride = async (overrideId, userName) => {
    try {
      await deleteUserOverride(overrideId);
    } catch (err) {
      console.error(err);
      addToast('danger', 'Failed to remove override.');
    }
  };

  const handleExportReportSubmit = (e) => {
    e.preventDefault();
    const type = exportForm.reportType;
    const format = exportForm.format;
    handleExportReportDirect(type, format);
    setShowExportModal(false);
  };

  const handleExportReportDirect = (reportName, format) => {
    addToast('info', `Exporting ${reportName} in ${format} format...`);
    
    let headers = [];
    let rows = [];
    let title = reportName.replace(/_/g, ' ').toUpperCase();

    if (reportName.includes('user_permissions')) {
      headers = ['Employee ID', 'Employee Name', 'Role Assigned', 'Department', 'Branch', 'Overrides Mapped', 'MFA Status'];
      rows = employees.map(emp => {
        const overrides = userOverrides.filter(o => o.userId === emp.id).length;
        const mfa = emp.securityInfo?.mfaStatus || 'Disabled';
        return [
          emp.id || '',
          emp.name || '',
          emp.role || '',
          emp.department || '',
          emp.branch || '',
          overrides,
          mfa
        ];
      });
    } else if (reportName.includes('roles_auth_matrix')) {
      headers = ['Role Name', 'Module Name', 'Create', 'Read', 'Update', 'Delete', 'Approve', 'Export'];
      rows = [];
      localRoles.forEach(r => {
        Object.entries(r.permissions || {}).forEach(([modKey, perm]) => {
          const mod = modulesList.find(m => m.key === modKey)?.name || modKey;
          rows.push([
            r.name,
            mod,
            perm.create ? 'Yes' : 'No',
            Array.isArray(perm.read) ? perm.read.join(', ') : (perm.read ? 'Yes' : 'No'),
            perm.update ? 'Yes' : 'No',
            perm.delete ? 'Yes' : 'No',
            perm.approve ? 'Yes' : 'No',
            perm.export ? 'Yes' : 'No'
          ]);
        });
      });
    } else if (reportName.includes('audit_log_history')) {
      headers = ['Log ID', 'Timestamp', 'Operator', 'Action Performed', 'Target Module', 'IP Address', 'Severity'];
      rows = filteredAuditLogs.map(log => [
        log.id || '',
        log.timestamp || '',
        log.changedBy || log.user || '',
        log.action || '',
        log.module || '',
        log.ipAddress || log.ip || '',
        log.severity || ''
      ]);
    } else {
      headers = ['Security Control Area', 'Control Description', 'Current Status', 'Verification Code'];
      rows = securityFeatures.map(sec => [
        sec.title || '',
        sec.desc || '',
        sec.status || '',
        sec.variant || ''
      ]);
    }

    if (format === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const tableHeadersHTML = headers.map(h => `<th>${h}</th>`).join('');
        const tableRowsHTML = rows.map(r => `<tr>${r.map(val => `<td>${val}</td>`).join('')}</tr>`).join('');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { font-family: sans-serif; padding: 20px; color: #334155; }
                h1 { color: #0f172a; margin-bottom: 5px; }
                p { color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #f1f5f9; padding: 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
                td { padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; }
                tr:nth-child(even) td { background-color: #f8fafc; }
              </style>
            </head>
            <body>
              <h1>${title}</h1>
              <p>Generated on: ${new Date().toLocaleString()} | Security Level: Classified Enterprise</p>
              <table>
                <thead><tr>${tableHeadersHTML}</tr></thead>
                <tbody>${tableRowsHTML}</tbody>
              </table>
              <script>
                window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else {
      const csvContent = "\ufeff" + [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName.toLowerCase()}_${Date.now()}.${format === 'Excel' ? 'xls' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', `${title} downloaded successfully.`);
    }
  };

  // Filter lists
  const filteredRoles = useMemo(() => {
    return localRoles.filter(role => {
      const matchesSearch = role.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                            role.description.toLowerCase().includes(roleSearch.toLowerCase());
      const matchesStatus = !roleStatusFilter || role.status === roleStatusFilter;
      const matchesAccess = !roleAccessFilter || role.accessLevel === roleAccessFilter;
      return matchesSearch && matchesStatus && matchesAccess;
    });
  }, [localRoles, roleSearch, roleStatusFilter, roleAccessFilter]);

  const filteredUserOverrides = useMemo(() => {
    return userOverrides.filter(ov => {
      return ov.userName.toLowerCase().includes(userAccessSearch.toLowerCase()) ||
             ov.userId.toLowerCase().includes(userAccessSearch.toLowerCase()) ||
             ov.module.toLowerCase().includes(userAccessSearch.toLowerCase());
    });
  }, [userOverrides, userAccessSearch]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
                            log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                            log.changedBy.toLowerCase().includes(auditSearch.toLowerCase());
      const matchesModule = !auditModuleFilter || log.module === auditModuleFilter;
      return matchesSearch && matchesModule;
    });
  }, [auditLogs, auditSearch, auditModuleFilter]);

  const sortedRolesForTree = useMemo(() => {
    return [...localRoles].sort((a, b) => getRoleRank(a) - getRoleRank(b));
  }, [localRoles]);

  // Save changes to system context
  const handleSaveSystemPermissions = async () => {
    try {
      await Promise.all(localRoles.map(role => 
        updatePermissions(role.id, role.permissions)
      ));
    } catch (err) {
      console.error(err);
      addToast('danger', 'Failed to save system permissions matrix.');
    }
  };
  // Skeleton loading wrapper
  if (isLoading) {
    return (
      <div className="rp-page flex-column gap-4 animate-fade-in p-5">
        <div className="rp-page-header flex-between mb-4">
          <div>
            <Skeleton variant="text" width="240px" height="32px" />
            <Skeleton variant="text" width="380px" height="18px" />
          </div>
          <Skeleton variant="rect" width="120px" height="38px" />
        </div>
        <div className="rp-stats-row mb-6">
          <Skeleton variant="rect" height="140px" />
          <Skeleton variant="rect" height="140px" />
          <Skeleton variant="rect" height="140px" />
          <Skeleton variant="rect" height="140px" />
        </div>
        <div className="grid-2-col">
          <Skeleton variant="rect" height="300px" />
          <Skeleton variant="rect" height="300px" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rp-page flex-column gap-4 animate-fade-in p-5">
      
      {/* ─── Page Header ─── */}
      <div className="rp-page-header flex-between mb-4">
        <div>
          <h1 className="title-bold">Role & Permission Management</h1>
          <p className="subtitle">Configure enterprise user access rights, matrix variables, override policies, and audits.</p>
        </div>
        
        {/* Perspective Switcher */}
        <div className="flex-center gap-3">
          <Button variant="primary" onClick={() => setShowCreateModal(true)} icon={Plus}>
            New Role
          </Button>
        </div>
      </div>

      {/* ─── Navigation Tabs Bar ─── */}
      <div className="tab-bar-card card p-0 mb-4">
        <div className="rp-tabs-list">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Sliders size={16} /> Dashboard
          </button>
          <button className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>
            <Users size={16} /> Roles
          </button>
          <button className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`} onClick={() => setActiveTab('matrix')}>
            <Key size={16} /> Permissions Matrix
          </button>
          <button className={`tab-btn ${activeTab === 'user_access' ? 'active' : ''}`} onClick={() => setActiveTab('user_access')}>
            <Lock size={16} /> User Access
          </button>
          <button className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
            <Database size={16} /> Audit Logs
          </button>
          <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <FileText size={16} /> Security Reports
          </button>
        </div>
      </div>

      {/* ─── Tab Content Views ─── */}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="flex-column gap-6">
          {/* Stats Cards */}
          <div className="rp-stats-row">
            <div className="rp-stat-card rsc-primary">
              <div className="rsc-stat-header">
                <span className="rsc-stat-label">Total System Roles</span>
                <div className="rsc-icon-chip"><Sliders size={18} /></div>
              </div>
              <span className="rsc-stat-num">{localRoles.length}</span>
              <div className="rsc-stat-footer">
                <span className="text-xs text-muted">{systemRolesCount} system + {customRolesCount} custom</span>
                <span className="trend-chip trend-up"><ChevronRight size={10} /> View</span>
              </div>
            </div>

            <div className="rp-stat-card rsc-success">
              <div className="rsc-stat-header">
                <span className="rsc-stat-label">Active Protected Users</span>
                <div className="rsc-icon-chip"><Users size={18} /></div>
              </div>
              <span className="rsc-stat-num">{employees?.length || 1250}</span>
              <div className="rsc-stat-footer">
                <span className="text-xs text-muted">{(employees && employees.length > 0) ? Math.round((employees.filter(e => e.roleId).length / employees.length) * 100) : 100}% covered by RBAC</span>
                <span className="trend-chip trend-up"><ArrowUpRight size={10} /> +2.4%</span>
              </div>
            </div>

            <div className="rp-stat-card rsc-purple">
              <div className="rsc-stat-header">
                <span className="rsc-stat-label">Custom Overrides</span>
                <div className="rsc-icon-chip"><Key size={18} /></div>
              </div>
              <span className="rsc-stat-num">{userOverrides.length}</span>
              <div className="rsc-stat-footer">
                <span className="text-xs text-muted">Explicit override policies</span>
                <span className="trend-chip trend-down"><ArrowDownRight size={10} /> {userOverrides.length} active</span>
              </div>
            </div>

            <div className="rp-stat-card rsc-danger">
              <div className="rsc-stat-header">
                <span className="rsc-stat-label">Auditable Logs</span>
                <div className="rsc-icon-chip"><Database size={18} /></div>
              </div>
              <span className="rsc-stat-num">{auditLogs.length}</span>
              <div className="rsc-stat-footer">
                <span className="text-xs text-muted">Archived logs in db</span>
                <span className="trend-chip trend-up"><Activity size={10} /> Live</span>
              </div>
            </div>
          </div>

          <div className="rp-stats-row">
            <div className="rp-stat-card rsc-warning">
              <div className="rsc-stat-header">
                <span className="rsc-stat-label">MFA Adoption Rate</span>
                <div className="rsc-icon-chip"><Lock size={18} /></div>
              </div>
              <span className="rsc-stat-num">{mfaAdoptionRate}%</span>
              <div className="rsc-stat-footer">
                <span className="text-xs text-muted">Enforced on admin ranks</span>
                <span className="trend-chip trend-up"><ArrowUpRight size={10} /> +1.2%</span>
              </div>
            </div>

            <div className="rp-stat-card rsc-info">
              <div className="rsc-stat-header">
                <span className="rsc-stat-label">System Security Score</span>
                <div className="rsc-icon-chip"><ShieldCheck size={18} /></div>
              </div>
              <span className="rsc-stat-num">{securityScore}</span>
              <div className="rsc-stat-footer">
                <span className="text-xs text-muted">Complies with ISO 27001</span>
                <span className="trend-chip trend-flat">Stable</span>
              </div>
            </div>

            <div className="rp-stat-card rsc-primary">
              <div className="rsc-stat-header">
                <span className="rsc-stat-label">Dept Administrators</span>
                <div className="rsc-icon-chip"><Building size={18} /></div>
              </div>
              <span className="rsc-stat-num">{deptAdminsCount}</span>
              <div className="rsc-stat-footer">
                <span className="text-xs text-muted">Across {uniqueDepartmentsCount} departments</span>
                <span className="trend-chip trend-flat">Active</span>
              </div>
            </div>

            <div className="rp-stat-card rsc-success">
              <div className="rsc-stat-header">
                <span className="rsc-stat-label">Branch Administrators</span>
                <div className="rsc-icon-chip"><Award size={18} /></div>
              </div>
              <span className="rsc-stat-num">{branchAdminsCount}</span>
              <div className="rsc-stat-footer">
                <span className="text-xs text-muted">Across {uniqueBranchesCount} major offices</span>
                <span className="trend-chip trend-flat">Active</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid-2-col">
            <div className="card p-5">
              <h3 className="chart-title mb-4">
                <Activity size={16} className="text-primary" /> Security Event Analytics
              </h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorChanges" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="Logins" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLogins)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Changes" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorChanges)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="chart-title mb-4">
                <Users size={16} className="text-purple" /> User Access Distribution
              </h3>
              <div style={{ width: '100%', height: 260 }} className="flex-center">
                <div style={{ width: '50%', height: '100%' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={roleDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {roleDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-column gap-2" style={{ width: '50%', paddingLeft: 20 }}>
                  {roleDistributionData.map((r, i) => (
                    <div key={i} className="flex-center gap-2 text-xs">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color }}></div>
                      <span className="font-semibold text-primary">{r.name}:</span>
                      <span className="text-muted">{r.value} ({totalEmployeesCount ? Math.round(r.value / totalEmployeesCount * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hierarchy & Activity Logs split */}
          <div className="grid-2-col">
            
            {/* Role Hierarchy Visual Tree */}
            <div className="hierarchy-tree-container card">
              <h3 className="card-sec-title">
                <Sliders size={16} /> Access Inheritance Hierarchy
              </h3>
              <p className="subtitle mb-4">Visual representation of system role priority levels. Higher nodes inherit all sub-nodes.</p>
              {sortedRolesForTree.length > 0 ? (
                renderHierarchyTree(sortedRolesForTree)
              ) : (
                <div className="py-5 text-center text-muted flex-column align-center justify-center gap-2">
                  <Sliders size={28} className="opacity-50 mb-1" />
                  <p className="m-0 font-medium">No active roles fetched from database</p>
                  <span className="text-xs opacity-75">Create roles above to populate the hierarchy tree.</span>
                </div>
              )}
            </div>

            {/* Recent permission activity feed */}
            <div className="card p-5">
              <h3 className="card-sec-title">
                <Activity size={16} /> Recent Administrative Activity
              </h3>
              <p className="subtitle mb-4">Real-time log of security, permissions updates, and explicit user overrides.</p>
              
              <div className="activity-feed-list pt-2">
                {auditLogs.slice(0, 5).map((log, idx) => {
                  const initials = log.changedBy.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={idx} className="activity-feed-item">
                      <div className="activity-avatar" style={{ background: '#3b82f6' }}>
                        {initials || 'S'}
                      </div>
                      <div className="activity-body">
                        <div className="activity-title">
                          <strong>{log.changedBy}</strong> performed action on module <span className="font-semibold text-primary">{log.module}</span>
                        </div>
                        <p className="text-xs text-muted mb-1">{log.action}</p>
                        <div className="activity-meta">
                          <span className="log-id-code text-xs">{log.id}</span>
                          <span className="flex-center gap-1"><Clock size={12} /> {log.timestamp}</span>
                        </div>
                      </div>
                      <div className="activity-status-icon text-success">
                        <CheckCircle size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div className="card p-5">
            <h3 className="card-sec-title mb-1">
              <ShieldAlert size={16} /> Core Policy & Security Enforcements
            </h3>
            <p className="subtitle mb-4">Configure environment security controls, logins limits, and operational audits policies.</p>
            
            <div className="security-features-grid">
              {securityFeatures.map((sec, i) => {
                const SecIcon = sec.icon;
                return (
                  <div key={i} className="security-feature-card">
                    <div className="sec-feature-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                      <SecIcon size={20} />
                    </div>
                    <div className="sec-feature-body">
                      <h4 className="sec-feature-title">{sec.title}</h4>
                      <p className="sec-feature-desc">{sec.desc}</p>
                      <span className={`sec-feature-status text-xs bg-${sec.variant}-light text-${sec.variant}`}>
                        {sec.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="flex-column gap-4">
          {/* Filters Bar */}
          <div className="rp-filter-bar card p-4 flex-between gap-4 flex-wrap">
            <div className="flex-center gap-3 flex-wrap flex-grow-1">
              <div className="flex-center gap-2">
                <Search size={16} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="table-search-input"
                />
              </div>

              <select
                value={roleStatusFilter}
                onChange={(e) => setRoleStatusFilter(e.target.value)}
                className="table-filter-select"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <select
                value={roleAccessFilter}
                onChange={(e) => setRoleAccessFilter(e.target.value)}
                className="table-filter-select"
              >
                <option value="">All Access</option>
                <option value="Full Access">Full Access</option>
                <option value="Administrative">Administrative</option>
                <option value="Managerial">Managerial</option>
                <option value="Lead Access">Lead Access</option>
                <option value="Standard">Standard</option>
              </select>
            </div>

            <div className="flex-center gap-2">
              <Button variant="outline" onClick={() => setShowCloneModal(true)} icon={Copy}>
                Clone Role
              </Button>
              <Button variant="outline" onClick={() => setShowAssignModal(true)} icon={Key}>
                Assign Users
              </Button>
            </div>
          </div>

          {/* Roles Table */}
          <div className="card p-0 overflow-x-auto">
            <table className="width-full custom-table-rp">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>ID Code</th>
                  <th>Protected Users</th>
                  <th>Inheritance Scope</th>
                  <th>Date Created</th>
                  <th>Last Modified</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoles.map((role) => (
                  <tr key={role.id}>
                    <td>
                      <div className="role-name-cell">
                        <div className="role-icon-badge" style={{ background: `${role.color}20`, color: role.color }}>
                          {role.icon || '👤'}
                        </div>
                        <div>
                          <div className="role-name-txt">{role.name}</div>
                          <div className="role-desc-txt text-xs text-muted">{role.description}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="log-id-code">{role.id}</span></td>
                    <td className="font-semibold">{role.userCount} active</td>
                    <td>
                      <Badge variant={role.id === 'super_admin' ? 'purple' : role.id === 'employee' ? 'neutral' : 'info'}>
                        {role.accessLevel}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted">{role.createdDate}</td>
                    <td className="text-sm text-muted">{role.lastModified}</td>
                    <td>
                      <Badge variant={role.status === 'Active' ? 'success' : 'danger'}>
                        {role.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex-center justify-center gap-2">
                        <button
                          className="action-circle-btn"
                          title="Edit Role Details"
                          onClick={() => handleEditRoleClick(role)}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          className="action-circle-btn danger-btn"
                          title="Delete Role"
                          onClick={() => handleDeleteRoleClick(role)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Matrix Tab */}
      {activeTab === 'matrix' && (
        <div className="flex-column gap-6">
          <div className="grid-2-col" style={{ gridTemplateColumns: '1fr 3fr' }}>
            
            {/* Left: Role Select List */}
            <div className="flex-column gap-3">
              <h3 className="card-sec-title">System Roles</h3>
              <p className="subtitle">Select a role to view and manually adjust operations permissions.</p>
              
              <div className="flex-column gap-3">
                {localRoles.map((role) => {
                  const isActive = role.id === selectedRoleId;
                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`card p-4 flex-column gap-2 cursor-pointer ${isActive ? 'active-role-card-v2' : ''}`}
                      style={{
                        borderLeft: `4px solid ${role.color || '#3b82f6'}`,
                        background: isActive ? 'var(--bg-elevated)' : 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        transition: 'all 0.2s',
                        boxShadow: isActive ? 'var(--shadow-md)' : 'none'
                      }}
                    >
                      <div className="flex-between">
                        <h4 className="font-semibold text-primary" style={{ margin: 0, fontSize: '0.9rem' }}>{role.name}</h4>
                        <Badge variant={role.id === 'super_admin' ? 'purple' : 'neutral'}>
                          {role.id.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted" style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.3 }}>
                        {role.description}
                      </p>
                      <div className="flex-center gap-1 text-xs text-muted" style={{ fontSize: '0.7rem' }}>
                        <Users size={12} />
                        <span>{role.userCount} active users</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Permission Checkbox Matrix for the selected Role */}
            <div className="card p-5">
              <div className="flex-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h3 className="card-sec-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{localRoles.find(r => r.id === selectedRoleId)?.name || 'Custom'} Matrix</span>
                  </h3>
                  <p className="subtitle" style={{ margin: 0 }}>
                    {selectedRoleId === 'super_admin' 
                      ? 'Locked: Super Admin permissions are permanent and cannot be modified.' 
                      : 'Toggle checkboxes below to manually modify system actions.'}
                  </p>
                </div>
                
                <div className="flex-center gap-2">
                  <Button variant="outline" onClick={() => setShowAddPermModal(true)} icon={Plus}>
                    Add Permission
                  </Button>
                  {selectedRoleId !== 'super_admin' && (
                    <Button variant="primary" onClick={handleSaveRolePermissions}>
                      Save Permissions
                    </Button>
                  )}
                </div>
              </div>

              <div className="perm-matrix-wrapper border-color border-bottom">
                <table className="perm-matrix-table custom-table-rp">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>MODULE / COMPONENT</th>
                      {operations.map(op => {
                        const colAllChecked = isColumnAllChecked(op.key);
                        return (
                          <th key={op.key} className="text-center">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <span>{op.label}</span>
                              {selectedRoleId !== 'super_admin' && (
                                <button
                                  type="button"
                                  className={`action-circle-btn ${colAllChecked ? 'success-btn' : ''}`}
                                  title={colAllChecked ? `Deselect all for ${op.label}` : `Select all for ${op.label}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleColumnToggle(op.key);
                                  }}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    minWidth: 18,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: colAllChecked ? 'rgba(16,185,129,0.2)' : 'var(--color-neutral-light)',
                                    borderColor: colAllChecked ? '#10b981' : 'var(--border-color)',
                                    color: colAllChecked ? '#10b981' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    borderRadius: '50%',
                                    transition: 'all 0.2s',
                                    marginTop: 4
                                  }}
                                >
                                  <Check size={10} strokeWidth={colAllChecked ? 3 : 2} />
                                </button>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {modulesList.flatMap(mod => {
                      const isHierarchical = HIERARCHICAL_MODULES.includes(mod.key);
                      const isExpanded = expandedModules[mod.key];
                      
                      // For hierarchical modules, we render the parent container row,
                      // and if expanded, we render the two child rows.
                      if (isHierarchical) {
                        const parentRow = (
                          <tr key={`${mod.key}_parent`} className="parent-module-row" style={{ background: 'var(--bg-elevated)', borderLeft: '3px solid var(--color-primary)' }}>
                            <td colSpan={7} style={{ textAlign: 'left', padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setExpandedModules(prev => ({ ...prev, [mod.key]: !prev[mod.key] }))}>
                                <span style={{ display: 'inline-flex', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                                  ▶
                                </span>
                                <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{mod.label}</strong>
                              </div>
                            </td>
                          </tr>
                        );

                        if (!isExpanded) {
                          return [parentRow];
                        }

                        const childRows = [
                          { scopeKey: `${mod.key}_self`, label: 'Self Information' },
                          { scopeKey: mod.key, label: 'Company Information' }
                        ].map(({ scopeKey, label }) => (
                          <tr key={`${scopeKey}_child`} className="child-module-row animate-fade-in" style={{ opacity: 0.9 }}>
                            <td style={{ textAlign: 'left', paddingLeft: '32px' }}>
                              <div className="perm-module-icon font-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {selectedRoleId !== 'super_admin' && (
                                  <button
                                    type="button"
                                    className={`action-circle-btn ${isRowKeyAllChecked(scopeKey) ? 'success-btn' : ''}`}
                                    title={isRowKeyAllChecked(scopeKey) ? "Deselect all in row" : "Select all in row"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRowKeyToggle(scopeKey);
                                    }}
                                    style={{
                                      width: 22,
                                      height: 22,
                                      minWidth: 22,
                                      padding: 0,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: isRowKeyAllChecked(scopeKey) ? 'rgba(16,185,129,0.2)' : 'var(--color-neutral-light)',
                                      borderColor: isRowKeyAllChecked(scopeKey) ? '#10b981' : 'var(--border-color)',
                                      color: isRowKeyAllChecked(scopeKey) ? '#10b981' : 'var(--text-primary)',
                                      cursor: 'pointer',
                                      borderRadius: '50%',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <Check size={12} strokeWidth={isRowKeyAllChecked(scopeKey) ? 3 : 2} />
                                  </button>
                                )}
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '4px' }}>↳ {label}</span>
                              </div>
                            </td>
                            {operations.map(op => {
                              const isChecked = selectedRoleId === 'super_admin' ? true : !!localPermissions[scopeKey]?.[op.key];
                              return (
                                <td
                                  key={op.key}
                                  className="text-center"
                                  onClick={() => handleCheckboxToggle(scopeKey, op.key)}
                                  style={{ cursor: selectedRoleId === 'super_admin' ? 'default' : 'pointer' }}
                                >
                                  <div className="flex-center justify-center">
                                    <span className={`perm-chip ${isChecked ? 'pchip-full' : 'pchip-none'}`} style={{ minWidth: 42 }}>
                                      {isChecked ? '✓' : '✗'}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ));

                        return [parentRow, ...childRows];
                      }

                      // Normal flat rows
                      return [
                        <tr key={mod.key}>
                          <td style={{ textAlign: 'left' }}>
                            <div className="perm-module-icon font-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {selectedRoleId !== 'super_admin' && (
                                <button
                                  type="button"
                                  className={`action-circle-btn ${isRowKeyAllChecked(mod.key) ? 'success-btn' : ''}`}
                                  title={isRowKeyAllChecked(mod.key) ? "Deselect all in row" : "Select all in row"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRowKeyToggle(mod.key);
                                  }}
                                  style={{
                                    width: 22,
                                    height: 22,
                                    minWidth: 22,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isRowKeyAllChecked(mod.key) ? 'rgba(16,185,129,0.2)' : 'var(--color-neutral-light)',
                                    borderColor: isRowKeyAllChecked(mod.key) ? '#10b981' : 'var(--border-color)',
                                    color: isRowKeyAllChecked(mod.key) ? '#10b981' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    borderRadius: '50%',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <Check size={12} strokeWidth={isRowKeyAllChecked(mod.key) ? 3 : 2} />
                                </button>
                              )}
                              <Sliders size={14} className="text-muted" />
                              <span>{(mod.key === 'company_overview' && selectedRoleId !== 'super_admin' && selectedRoleId !== 'company_admin' && selectedRoleId !== 'SuperAdmin') ? 'Branch Overview' : mod.label}</span>
                              {!['dashboard', 'company_overview', 'employee_management', 'agency_branch_management', 'department_management', 'team_management', 'attendance_management', 'leave_management', 'project_management', 'task_monitoring', 'work_reports', 'performance_analytics', 'payroll_management', 'announcements', 'notifications', 'document_management', 'role_permission', 'system_settings', 'security_audit_logs', 'profile_settings'].includes(mod.key) && (
                                <button
                                  type="button"
                                  className="icon-action-btn icon-action-danger"
                                  style={{ marginLeft: 8, padding: 2, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                  title={`Delete ${mod.label} permission module`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePermissionModule(mod.key, mod.label);
                                  }}
                                >
                                  <Trash2 size={13} style={{ color: '#ef4444' }} />
                                </button>
                              )}
                            </div>
                          </td>
                          {operations.map(op => {
                            const isChecked = selectedRoleId === 'super_admin' ? true : !!localPermissions[mod.key]?.[op.key];
                            return (
                              <td
                                key={op.key}
                                className="text-center"
                                onClick={() => handleCheckboxToggle(mod.key, op.key)}
                                style={{ cursor: selectedRoleId === 'super_admin' ? 'default' : 'pointer' }}
                              >
                                <div className="flex-center justify-center">
                                  <span className={`perm-chip ${isChecked ? 'pchip-full' : 'pchip-none'}`} style={{ minWidth: 42 }}>
                                    {isChecked ? '✓' : '✗'}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ];
                    })}
                  </tbody>
                </table>
              </div>

              {selectedRoleId !== 'super_admin' && (
                <div className="flex-between pt-4 mt-2">
                  <span className="text-xs text-muted">Unsaved changes will be lost if you switch to another role in the sidebar.</span>
                  <Button variant="primary" onClick={handleSaveRolePermissions}>
                    Save Permissions Matrix
                  </Button>
                </div>
              )}
          </div>
        </div>


        </div>
      )}

      {/* User Access Tab */}
      {activeTab === 'user_access' && (
        <div className="flex-column gap-4">
          {/* User access header & quick restrict */}
          <div className="rp-filter-bar card p-4 flex-between gap-4 flex-wrap">
            <div className="flex-center gap-3 flex-wrap flex-grow-1">
              <div className="flex-center gap-2">
                <Search size={16} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search user access overrides..."
                  value={userAccessSearch}
                  onChange={(e) => setUserAccessSearch(e.target.value)}
                  className="table-search-input"
                  style={{ minWidth: 280 }}
                />
              </div>
            </div>

            <div className="flex-center gap-2">
              <Button variant="primary" onClick={() => setShowRestrictModal(true)} icon={ShieldAlert}>
                Add User Access Override
              </Button>
            </div>
          </div>

          {/* User Overrides Grid */}
          <div className="user-override-grid">
            {filteredUserOverrides.map((ov) => {
              const initials = ov.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const isDenial = ov.scope.includes('Restricted') || ov.type.includes('Denial');
              return (
                <div key={ov.id} className="user-override-card card flex-column gap-3">
                  <div className="flex-between">
                    <div className="flex-center gap-2">
                      <Avatar name={ov.userName} size="md" />
                      <div>
                        <h4 className="font-semibold text-primary">{ov.userName}</h4>
                        <span className="text-xs text-muted">{ov.userId}</span>
                      </div>
                    </div>
                    <Badge variant={isDenial ? 'danger' : 'success'}>
                      {ov.type}
                    </Badge>
                  </div>

                  <div className="border-bottom pb-2">
                    <div className="text-xs text-muteduppercase tracking-wide">Target Module</div>
                    <div className="font-semibold text-sm">{ov.module}</div>
                  </div>

                  <div className="flex-between text-xs">
                    <div>
                      <span className="text-muted">Scope:</span> <strong className={isDenial ? 'text-danger' : 'text-success'}>{ov.scope}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Expires:</span> <span className="font-semibold">{ov.expiry}</span>
                    </div>
                  </div>

                  <div className="flex-center justify-end gap-2 pt-2 border-top">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveOverride(ov.id, ov.userName)}
                      icon={Trash2}
                    >
                      Revoke Override
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

            {filteredUserOverrides.length === 0 && (
              <div className="card p-6 flex-column flex-center text-center">
                <Lock size={48} className="text-muted mb-2" />
                <h4 className="font-semibold text-primary">No user overrides found</h4>
                <p className="text-xs text-muted">All active employees inherit roles permissions directly. Use override to grant/deny modules access.</p>
              </div>
            )}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="flex-column gap-4">
          <div className="rp-filter-bar card p-4 flex-between gap-4 flex-wrap">
            <div className="flex-center gap-3 flex-wrap flex-grow-1">
              <div className="flex-center gap-2">
                <Search size={16} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="table-search-input"
                  style={{ minWidth: 260 }}
                />
              </div>

              <select
                value={auditModuleFilter}
                onChange={(e) => setAuditModuleFilter(e.target.value)}
                className="table-filter-select"
              >
                <option value="">All Modules</option>
                <option value="Security Control">Security Control</option>
                <option value="Role permissions">Role permissions</option>
                <option value="User Override">User Override</option>
                <option value="Modules Access">Modules Access</option>
              </select>
            </div>

            <Button
              variant="outline"
              onClick={() => handleExportReportDirect('security_audit_logs', 'CSV')}
              icon={Download}
            >
              Export CSV
            </Button>
          </div>

          <div className="card p-0 overflow-x-auto">
            <table className="width-full custom-table-rp">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Log ID</th>
                  <th>Target / Role</th>
                  <th>Changed By</th>
                  <th>Module</th>
                  <th>Action Statement</th>
                  <th>Value Change Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs text-muted font-semibold">{log.timestamp}</td>
                    <td><span className="log-id-code">{log.id}</span></td>
                    <td className="font-semibold">{log.user}</td>
                    <td>
                      <span className="text-sm font-semibold">{log.changedBy}</span>
                    </td>
                    <td><Badge variant="neutral">{log.module}</Badge></td>
                    <td className="text-sm">{log.action}</td>
                    <td>
                      <div className="flex-center gap-1 text-xs">
                        <span className="audit-change-badge old-val">{log.oldVal}</span>
                        <span className="arrow-val">➔</span>
                        <span className="audit-change-badge new-val">{log.newVal}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="flex-column gap-6">
          <div className="card p-5">
            <h3 className="card-sec-title mb-1">
              <FileText size={16} /> Compliance & Access Audit Reports
            </h3>
            <p className="subtitle mb-4">
              Compile, schedule and download organizational access structures, security audits and ISO compliance files.
            </p>

            <div className="report-cards-grid">
              <div className="report-card">
                <div className="report-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  <Users size={22} />
                </div>
                <h4 className="report-card-title">User Permissions Audit</h4>
                <p className="report-card-desc text-xs text-muted">Complete breakdown of every user with roles, overrides, and MFA validation logs.</p>
                <div className="report-card-formats mt-auto">
                  <button className="report-format-btn" onClick={() => handleExportReportDirect('user_permissions_audit', 'PDF')}><FileDown size={12} /> PDF</button>
                  <button className="report-format-btn" onClick={() => handleExportReportDirect('user_permissions_audit', 'CSV')}><FileDown size={12} /> CSV</button>
                </div>
              </div>

              <div className="report-card">
                <div className="report-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <Key size={22} />
                </div>
                <h4 className="report-card-title">Role Authorization Matrix</h4>
                <p className="report-card-desc text-xs text-muted">Export current 12x6 module matrix permission levels mapping for external auditor security checks.</p>
                <div className="report-card-formats mt-auto">
                  <button className="report-format-btn" onClick={() => handleExportReportDirect('roles_auth_matrix', 'Excel')}><FileDown size={12} /> Excel</button>
                  <button className="report-format-btn" onClick={() => handleExportReportDirect('roles_auth_matrix', 'PDF')}><FileDown size={12} /> PDF</button>
                </div>
              </div>

              <div className="report-card">
                <div className="report-card-icon" style={{ background: 'rgba(236,72,153,0.12)', color: '#ec4899' }}>
                  <Database size={22} />
                </div>
                <h4 className="report-card-title">System Audit Log History</h4>
                <p className="report-card-desc text-xs text-muted">Full sequence of all authorization migrations, overrides additions, and policy modifications.</p>
                <div className="report-card-formats mt-auto">
                  <button className="report-format-btn" onClick={() => handleExportReportDirect('audit_log_history', 'CSV')}><FileDown size={12} /> CSV</button>
                  <button className="report-format-btn" onClick={() => handleExportReportDirect('audit_log_history', 'Excel')}><FileDown size={12} /> Excel</button>
                </div>
              </div>

              <div className="report-card">
                <div className="report-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  <ShieldAlert size={22} />
                </div>
                <h4 className="report-card-title">ISO 27001 Security Audit</h4>
                <p className="report-card-desc text-xs text-muted">Compliance rating report testing credential standards, privilege access loops and session durations.</p>
                <div className="report-card-formats mt-auto">
                  <button className="report-format-btn" onClick={() => handleExportReportDirect('iso_27001_compliance', 'PDF')}><FileDown size={12} /> PDF</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer Stats Bar ─── */}
      <div className="rp-page-footer mt-4">
        <div className="footer-stat-item">
          <span className="footer-stat-label">Security Protocol:</span>
          <span className="footer-stat-value text-success">TLS 1.3 Protected</span>
        </div>
        <div className="footer-stat-item">
          <span className="footer-stat-label">Database Sync Status:</span>
          <span className="footer-stat-value text-info">Realtime Connected</span>
        </div>
        <div className="footer-stat-item">
          <span className="footer-stat-label">Active Audit Monitor:</span>
          <span className="footer-stat-value text-warning">Listening</span>
        </div>
        <div className="footer-stat-item">
          <span className="footer-stat-label">Current Node:</span>
          <span className="footer-stat-value">Node-4A (HQ)</span>
        </div>
      </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Create/Edit Role Modal */}
      {showCreateModal && (
        <div className="rp-modal-overlay">
          <form onSubmit={handleSaveRole} className="rp-modal-container flex-column">
            <div className="rp-modal-header">
              <h3 className="rp-modal-title">
                <Sliders size={18} className="text-primary" />
                {editingRole ? `Modify Role Details: ${editingRole.name}` : 'Establish New System Role'}
              </h3>
              <button type="button" className="rp-modal-close-btn" onClick={() => {
                setShowCreateModal(false);
                setEditingRole(null);
              }}><X size={16} /></button>
            </div>
            
            <div className="rp-modal-body">
              <div className="form-group">
                <label className="form-label required">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance Auditor, Compliance Officer"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Description</label>
                <textarea
                  required
                  placeholder="Provide scope details for this administrative role."
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="form-textarea"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Access Level Inheritance</label>
                  <select
                    value={createForm.accessLevel}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, accessLevel: e.target.value }))}
                    className="form-select"
                  >
                    <option value="Full Access">Full Access</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Managerial">Managerial</option>
                    <option value="Lead Access">Lead Access</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value }))}
                    className="form-select"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Role Icon Emoji</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={createForm.icon}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, icon: e.target.value }))}
                    className="form-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Color Accent Badge</label>
                  <input
                    type="color"
                    value={createForm.color}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, color: e.target.value }))}
                    className="form-input"
                    style={{ padding: 2, height: 38, cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            <div className="rp-modal-footer">
              <Button type="button" variant="outline" onClick={() => {
                setShowCreateModal(false);
                setEditingRole(null);
              }}>Cancel</Button>
              <Button type="submit" variant="primary">
                {editingRole ? 'Save Changes' : 'Initialize Role'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Clone Role Modal */}
      {showCloneModal && (
        <div className="rp-modal-overlay">
          <form onSubmit={handleCloneRole} className="rp-modal-container flex-column">
            <div className="rp-modal-header">
              <h3 className="rp-modal-title">
                <Copy size={18} className="text-primary" /> Clone Authorization Structure
              </h3>
              <button type="button" className="rp-modal-close-btn" onClick={() => setShowCloneModal(false)}><X size={16} /></button>
            </div>

            <div className="rp-modal-body">
              <div className="form-group">
                <label className="form-label">Source Role Permissions</label>
                <select
                  value={cloneForm.sourceRoleId}
                  onChange={(e) => setCloneForm(prev => ({ ...prev, sourceRoleId: e.target.value }))}
                  className="form-select"
                >
                  {localRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} permissions matrix</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label required">New Target Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regional Supervisor, Junior Accountant"
                  value={cloneForm.targetName}
                  onChange={(e) => setCloneForm(prev => ({ ...prev, targetName: e.target.value }))}
                  className="form-input"
                />
              </div>

              <label className="toggle-control mt-2">
                <input
                  type="checkbox"
                  checked={cloneForm.inheritAll}
                  onChange={(e) => setCloneForm(prev => ({ ...prev, inheritAll: e.target.checked }))}
                />
                <span className="toggle-label">Inherit all matrix checkboxes configurations</span>
              </label>
            </div>

            <div className="rp-modal-footer">
              <Button type="button" variant="outline" onClick={() => setShowCloneModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Generate Cloned Role</Button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Assign Role Modal */}
      {showAssignModal && (
        <div className="rp-modal-overlay">
          <form onSubmit={handleAssignRole} className="rp-modal-container flex-column">
            <div className="rp-modal-header">
              <h3 className="rp-modal-title">
                <Key size={18} className="text-primary" /> Assign Role to Employees
              </h3>
              <button type="button" className="rp-modal-close-btn" onClick={() => setShowAssignModal(false)}><X size={16} /></button>
            </div>

            <div className="rp-modal-body">
              <div className="form-group">
                <label className="form-label">Select Employee</label>
                <select
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, userId: e.target.value }))}
                  className="form-select"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id} - {e.role || 'No Role'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Role assignment</label>
                <select
                  value={assignForm.roleId}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, roleId: e.target.value }))}
                  className="form-select"
                >
                  {localRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Tenure Type</label>
                  <select
                    value={assignForm.type}
                    onChange={(e) => setAssignForm(prev => ({ ...prev, type: e.target.value }))}
                    className="form-select"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Temporary Grant">Temporary Grant (Timed)</option>
                  </select>
                </div>

                {assignForm.type === 'Temporary Grant' && (
                  <div className="form-group">
                    <label className="form-label required">Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={assignForm.expiry}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, expiry: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Operational Reason</label>
                <textarea
                  placeholder="Justification for access rights changes."
                  value={assignForm.reason}
                  onChange={(e) => setAssignForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="form-textarea"
                />
              </div>
            </div>

            <div className="rp-modal-footer">
              <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Confirm Assignment</Button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Restrict Access Override Modal */}
      {showRestrictModal && (
        <div className="rp-modal-overlay">
          <form onSubmit={handleRestrictAccess} className="rp-modal-container flex-column">
            <div className="rp-modal-header">
              <h3 className="rp-modal-title">
                <ShieldAlert size={18} className="text-danger" /> Add Access Override Policy
              </h3>
              <button type="button" className="rp-modal-close-btn" onClick={() => setShowRestrictModal(false)}><X size={16} /></button>
            </div>

            <div className="rp-modal-body">
              <div className="form-group">
                <label className="form-label">Target Employee</label>
                <select
                  value={restrictForm.userId}
                  onChange={(e) => setRestrictForm(prev => ({ ...prev, userId: e.target.value }))}
                  className="form-select"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.id} - {e.role || 'Employee'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Module Scope</label>
                <select
                  value={restrictForm.module}
                  onChange={(e) => setRestrictForm(prev => ({ ...prev, module: e.target.value }))}
                  className="form-select"
                >
                  <option value="Dashboard Overview">Dashboard Overview</option>
                  <option value="Employee Directory">Employee Directory</option>
                  <option value="Attendance Tracking">Attendance Tracking</option>
                  <option value="Leave Operations">Leave Operations</option>
                  <option value="Projects & Workflows">Projects & Workflows</option>
                  <option value="Payroll Processing">Payroll Processing</option>
                  <option value="Role & Permission">Role & Permission</option>
                  <option value="Security Controls">Security Controls</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Override Scope</label>
                  <select
                    value={restrictForm.scope}
                    onChange={(e) => setRestrictForm(prev => ({ ...prev, scope: e.target.value }))}
                    className="form-select"
                  >
                    <option value="None (Restricted)">None (Explicitly Restricted)</option>
                    <option value="Read Only">Read Only Access</option>
                    <option value="Read & Write">Read & Write Access</option>
                    <option value="Full Access">Full Control Waiver</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Grant/Denial Type</label>
                  <select
                    value={restrictForm.type}
                    onChange={(e) => setRestrictForm(prev => ({ ...prev, type: e.target.value }))}
                    className="form-select"
                  >
                    <option value="Explicit Denial">Explicit Restriction Policy</option>
                    <option value="Temporary Grant">Temporary Access Waiver</option>
                    <option value="Special Waiver">Permanent Overwrite Waiver</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Boundary</label>
                <input
                  type="text"
                  placeholder="e.g. Permanent, 2026-06-30"
                  value={restrictForm.expiry}
                  onChange={(e) => setRestrictForm(prev => ({ ...prev, expiry: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>

            <div className="rp-modal-footer">
              <Button type="button" variant="outline" onClick={() => setShowRestrictModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Authorize Override</Button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Add Permission Module Modal */}
      {showAddPermModal && (
        <div className="rp-modal-overlay">
          <form onSubmit={handleAddPermissionModule} className="rp-modal-container flex-column">
            <div className="rp-modal-header">
              <h3 className="rp-modal-title">
                <Plus size={18} className="text-primary" /> Create New Permission Module
              </h3>
              <button type="button" className="rp-modal-close-btn" onClick={() => setShowAddPermModal(false)}><X size={16} /></button>
            </div>

            <div className="rp-modal-body">
              <div className="form-group">
                <label className="form-label required">Permission Module Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asset Management, Inventory Control"
                  value={newPermForm.name}
                  onChange={(e) => setNewPermForm(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Access Level (Non-Admins)</label>
                <select
                  value={newPermForm.defaultLevel}
                  onChange={(e) => setNewPermForm(prev => ({ ...prev, defaultLevel: e.target.value }))}
                  className="form-select"
                >
                  <option value="Full">Full Access</option>
                  <option value="Limited">Limited Access</option>
                  <option value="View">View Only</option>
                  <option value="No">No Access</option>
                </select>
              </div>
            </div>

            <div className="rp-modal-footer">
              <Button type="button" variant="outline" onClick={() => setShowAddPermModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Add Module</Button>
            </div>
          </form>
        </div>
      )}



    </>
  );
};

export default RolesPermissions;
