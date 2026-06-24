import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getRequiredRoleForPath, hasRoleAccess, PATH_TO_MODULE } from '../permissions/permissions';
import { connectSocket, disconnectSocket } from '../lib/socketManager';

const AppContext = createContext(undefined);

export const normalizeEmployee = (emp) => {
  if (!emp) return emp;
  const normalized = { ...emp };

  // 1. Employee ID / id / employeeId
  const idVal = normalized.id || normalized.employeeId;
  normalized.id = idVal;
  normalized.employeeId = idVal;

  // 2. Full Name / name / fullName
  const nameVal = normalized.name || normalized.fullName;
  normalized.name = nameVal;
  normalized.fullName = nameVal;

  // 3. Contact Number / phone / contactNumber
  const phoneVal = normalized.phone || normalized.contactNumber;
  normalized.phone = phoneVal;
  normalized.contactNumber = phoneVal;

  // 4. Official Email / workEmail / officialEmail
  const oEmail = normalized.officialEmail || normalized.workEmail;
  if (oEmail) {
    normalized.officialEmail = oEmail;
    normalized.workEmail = oEmail;
  }

  // 5. Branch / Agency / branchAgency / branch
  const loc = normalized.branch || normalized.branchAgency;
  if (loc) {
    normalized.branch = loc;
    normalized.branchAgency = loc;
  }

  // 6. Shift Timing / shift / shiftTiming
  const sh = normalized.shiftTiming || normalized.shift;
  normalized.shiftTiming = sh;
  normalized.shift = sh;

  // 7. Punch In Time (cleared from fallback to prevent stale data; resolved dynamically from today's logs)
  normalized.punchInTime = null;
  normalized.todayPunchIn = null;
  normalized.punchIn = null;

  // 8. Punch Out Time (cleared from fallback to prevent stale data; resolved dynamically from today's logs)
  normalized.punchOutTime = null;
  normalized.todayPunchOut = null;
  normalized.punchOut = null;

  // 9. Working Hours (cleared from fallback to prevent stale data; resolved dynamically from today's logs)
  normalized.workingHours = 0;
  normalized.todayWorkingHours = 0;
  normalized.totalHours = 0;

  // 10. Attendance Status (defaults to 'Not Punched' to prevent stale 'Present' fallback)
  normalized.attendanceStatus = 'Not Punched';
  normalized.todayPunchStatus = 'Not Punched';


  // 11. Employment Status / accountStatus / employmentStatus / status
  const est = (normalized.status === 'Active' || normalized.status === 'Disabled' || normalized.status === 'Suspended')
    ? normalized.status
    : (normalized.accountStatus || normalized.employmentStatus || 'Active');
  normalized.status = est;
  normalized.accountStatus = est;
  normalized.employmentStatus = est;

  // Address Parsing
  const isSameAddrString = typeof normalized.permanentAddress === 'string' &&
                           typeof normalized.currentAddress === 'string' &&
                           normalized.permanentAddress.trim() === normalized.currentAddress.trim();

  if (typeof normalized.currentAddress === 'string') {
    const parts = normalized.currentAddress.split(', ');
    normalized.currentAddress = {
      line1: parts[0] || normalized.currentAddress || '',
      city: parts[1] || normalized.city || '',
      state: parts[2] ? parts[2].split(' - ')[0] : (normalized.state || ''),
      country: normalized.country || 'India',
      pincode: parts[2] ? parts[2].split(' - ')[1] : (normalized.zipCode || normalized.pincode || '')
    };
  } else if (!normalized.currentAddress) {
    normalized.currentAddress = {
      line1: '',
      city: normalized.city || '',
      state: normalized.state || '',
      country: normalized.country || 'India',
      pincode: normalized.zipCode || normalized.pincode || ''
    };
  } else if (typeof normalized.currentAddress === 'object') {
    normalized.currentAddress = {
      line1: normalized.currentAddress.line1 || '',
      city: normalized.currentAddress.city || normalized.city || '',
      state: normalized.currentAddress.state || normalized.state || '',
      country: normalized.currentAddress.country || normalized.country || 'India',
      pincode: normalized.currentAddress.pincode || normalized.currentAddress.zipCode || normalized.zipCode || normalized.pincode || ''
    };
  }

  if (isSameAddrString) {
    normalized.permanentAddress = { ...normalized.currentAddress };
  } else if (typeof normalized.permanentAddress === 'string') {
    const parts = normalized.permanentAddress.split(', ');
    normalized.permanentAddress = {
      line1: parts[0] || normalized.permanentAddress || '',
      city: parts[1] || '',
      state: parts[2] ? parts[2].split(' - ')[0] : '',
      country: 'India',
      pincode: parts[2] ? parts[2].split(' - ')[1] : ''
    };
  } else if (!normalized.permanentAddress) {
    normalized.permanentAddress = { line1: '', city: '', state: '', country: 'India', pincode: '' };
  } else if (typeof normalized.permanentAddress === 'object') {
    normalized.permanentAddress = {
      line1: normalized.permanentAddress.line1 || '',
      city: normalized.permanentAddress.city || '',
      state: normalized.permanentAddress.state || '',
      country: normalized.permanentAddress.country || 'India',
      pincode: normalized.permanentAddress.pincode || normalized.permanentAddress.zipCode || ''
    };
  }

  // Emergency Contact
  normalized.emergencyName = normalized.emergencyContactName || normalized.emergencyName || '';
  normalized.emergencyRelation = normalized.emergencyRelation || '';
  normalized.emergencyMobile = normalized.emergencyContactPhone || normalized.emergencyMobile || '';

  // Banking
  normalized.bank = normalized.bank || {
    accountName: normalized.name,
    bankName: normalized.bankName || '',
    branch: normalized.bankBranch || '',
    accountNumber: normalized.bankAccountNumber || '',
    ifsc: normalized.bankIfscCode || '',
    upiId: normalized.bankUpiId || '',
    verified: false
  };

  // Documents
  normalized.documents = normalized.documents || [];

  // Activities
  normalized.activities = normalized.activities || [];

  // MFA
  normalized.mfaEnabled = normalized.mfaEnabled || { email: false, mobile: false, authenticator: false };

  // General fields
  normalized.photoUrl = normalized.photoUrl || normalized.avatar || null;
  normalized.dob = normalized.dob || '';
  normalized.maritalStatus = normalized.maritalStatus || '';
  normalized.bloodGroup = normalized.bloodGroup || '';
  normalized.nationality = normalized.nationality || '';
  normalized.officialEmail = normalized.officialEmail || normalized.email || '';
  normalized.officialMobile = normalized.officialMobile || normalized.phone || '';
  normalized.teamName = normalized.teamName || normalized.team || '';

  // 12. Individual Leave Balances (preserved as undefined if not set to allow policy default fallback)

  return normalized;
};

export const AppProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token') || '');
  const [initialized, setInitialized] = useState(() => !localStorage.getItem('saas_token') && !sessionStorage.getItem('saas_token'));
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leavePolicyConfigs, setLeavePolicyConfigs] = useState([]);
  const [holidaysList, setHolidaysList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);

  const [payroll, setPayroll] = useState([]);
  const [payrollGrades, setPayrollGrades] = useState([]);
  const [payrollReimbursements, setPayrollReimbursements] = useState([]);
  const [payrollLoans, setPayrollLoans] = useState([]);
  const [payrollAdvances, setPayrollAdvances] = useState([]);
  const [payrollBonuses, setPayrollBonuses] = useState([]);
  const [payrollPayments, setPayrollPayments] = useState([]);
  const [payrollConfigs, setPayrollConfigs] = useState({
    id: 'GLOBAL_CONFIG',
    leaveDeductionRate: 2000,
    lateArrivalPenalty: 300,
    overtimeHourlyRate: 500,
    taxProfiles: {},
    salaryStructures: {},
    attendanceDaysMap: {}
  });
  const [notifications, setNotifications] = useState([]);
  const [documentsList, setDocumentsList] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissionModules, setPermissionModules] = useState([]);
  const [userOverrides, setUserOverrides] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [appraisalReviews, setAppraisalReviews] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [emergencyAlert, setEmergencyAlert] = useState({ isActive: false, title: '', description: '', date: '' });
  const [announcementTrackingLogs, setAnnouncementTrackingLogs] = useState([]);
  const [announcementAuditLogs, setAnnouncementAuditLogs] = useState([]);

  // Shell Features States
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmType: 'primary', // 'primary', 'danger', 'warning'
    onConfirm: () => { },
    onCancel: () => { }
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(() => {
    return localStorage.getItem('saas_role') || 'super_admin';
  });
  const [currentUserId, setCurrentUserId] = useState(() => {
    return localStorage.getItem('saas_user_id') || '';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Theme states
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('saas_theme') || 'dark';
    let resolved = saved;
    if (saved === 'auto') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (resolved === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    return saved;
  });

  const applyTheme = (next) => {
    if (next === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const currentResolved = prev === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : prev;
      const next = currentResolved === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('saas_theme', next);
      return next;
    });
  };

  const setThemeMode = (mode) => {
    // mode: 'dark' | 'light' | 'auto'
    let resolved = mode;
    if (mode === 'auto') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setTheme(mode); // keep 'auto' in state for UI
    applyTheme(resolved);
    localStorage.setItem('saas_theme', mode);
  };

  // Listen to media query changes if theme is auto
  useEffect(() => {
    if (theme !== 'auto') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e) => {
      const resolved = e.matches ? 'dark' : 'light';
      applyTheme(resolved);
    };
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [theme]);

  // Accent color state
  const [accentColor, setAccentColorState] = useState(() => {
    return localStorage.getItem('saas_accent') || '#d946ef';
  });

  const setAccentColor = (color) => {
    setAccentColorState(color);
    localStorage.setItem('saas_accent', color);
    // Convert hex to rgb components for translucent variants
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', color);
    document.documentElement.style.setProperty('--color-primary-light', `rgba(${r},${g},${b},0.15)`);
    document.documentElement.style.setProperty('--shadow-focus', `0 0 0 3px rgba(${r},${g},${b},0.3)`);
  };

  // Initialize accent color on mount
  useEffect(() => {
    const saved = localStorage.getItem('saas_accent');
    if (saved) setAccentColor(saved);
  }, []);

  // Font size state
  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem('saas_fontsize') || 'medium';
  });

  const setFontSize = (size) => {
    setFontSizeState(size);
    localStorage.setItem('saas_fontsize', size);
    const sizeMap = { small: '13px', medium: '14px', large: '16px' };
    document.documentElement.style.setProperty('font-size', sizeMap[size] || '14px');
  };

  // Initialize font size on mount
  useEffect(() => {
    const saved = localStorage.getItem('saas_fontsize') || 'medium';
    const sizeMap = { small: '13px', medium: '14px', large: '16px' };
    document.documentElement.style.setProperty('font-size', sizeMap[saved] || '14px');
  }, []);

  // Compact sidebar (dense) setting
  const [sidebarDense, setSidebarDenseState] = useState(() => {
    return localStorage.getItem('saas_sidebar_dense') === 'true';
  });

  const setSidebarDense = (val) => {
    setSidebarDenseState(val);
    localStorage.setItem('saas_sidebar_dense', val ? 'true' : 'false');
  };

  // General Settings
  const [generalSettings, setGeneralSettingsState] = useState(() => {
    const saved = localStorage.getItem('saas_general_settings');
    return saved ? JSON.parse(saved) : {
      companyName: 'Gatecode OMS',
      timezone: 'IST (UTC+5:30)',
      language: 'English (IN)',
      dateFormat: 'DD-MM-YYYY',
      currency: 'INR (₹)',
      fiscalYear: 'January'
    };
  });

  const setGeneralSettings = (settings) => {
    setGeneralSettingsState(settings);
    localStorage.setItem('saas_general_settings', JSON.stringify(settings));
  };

  // Load public company name and profile settings on initial mount
  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/settings/public?_t=' + Date.now(), { cache: 'no-store' });
        const result = await response.json();
        if (result.status === 'success' && result.data) {
          const data = result.data;
          setGeneralSettingsState(prev => {
            const nextSettings = {
              ...prev,
              companyName: data.companyName || prev.companyName || 'Gatecode OMS'
            };
            // Sync to local storage as offline fallback
            localStorage.setItem('saas_general_settings', JSON.stringify(nextSettings));
            return nextSettings;
          });
        }
      } catch (err) {
        console.error('Failed to fetch public settings from database:', err);
      }
    };
    fetchPublicSettings();
  }, []);

  // Notification Settings
  const [notificationSettings, setNotificationSettingsState] = useState(() => {
    const saved = localStorage.getItem('saas_notification_settings');
    return saved ? JSON.parse(saved) : {
      emailNotifs: true,
      pushNotifs: true,
      leaveAlerts: true,
      payrollAlerts: true,
      securityAlerts: true,
      weeklyDigest: false
    };
  });

  const setNotificationSettings = (settings) => {
    setNotificationSettingsState(settings);
    localStorage.setItem('saas_notification_settings', JSON.stringify(settings));
  };

  // Security Settings
  const [securitySettings, setSecuritySettingsState] = useState(() => {
    const saved = localStorage.getItem('saas_security_settings');
    return saved ? JSON.parse(saved) : {
      twoFactor: false,
      sessionTimeout: '30 minutes',
      loginAlerts: true,
      ipWhitelist: ''
    };
  });

  const setSecuritySettings = (settings) => {
    setSecuritySettingsState(settings);
    localStorage.setItem('saas_security_settings', JSON.stringify(settings));
  };

  // Attendance Rules Settings
  const [attendanceRules, setAttendanceRulesState] = useState(() => {
    const saved = localStorage.getItem('saas_attendance_rules');
    return saved ? JSON.parse(saved) : {
      dailyHours: 8,
      weeklyHours: 40,
      shiftRules: 'Fixed Shift Rules',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15,
      lateMarkLimit: 30,
      halfDayLimit: 120,
      overtimeRate: 1.5,
      autoPunchOut: true,
      punchOutTime: '21:00',
      attendanceReminders: true,
      missingAlerts: true,
      lateTimeThreshold: '09:15',
      halfDayHoursThreshold: 8
    };
  });

  const setAttendanceRules = (rules) => {
    setAttendanceRulesState(rules);
    localStorage.setItem('saas_attendance_rules', JSON.stringify(rules));
  };

  // Messages states
  const [messages, setMessages] = useState([]);

  const markMessageRead = (id) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, unread: false } : m)));
  };

  const markAllMessagesRead = () => {
    setMessages(prev => prev.map(m => ({ ...m, unread: false })));
  };

  // Computed Current User details based on Selected Role
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (currentUserId) {
      const match = employees.find(e => e.id === currentUserId);
      if (match && match.roleId === currentUserRole) {
        setCurrentUser(match);
        return;
      }

      // Check if we have the logged in user stored in localStorage (useful for Super Admin not returned by employees API)
      const savedUserStr = localStorage.getItem('saas_user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          if (savedUser && savedUser.id === currentUserId && savedUser.roleId === currentUserRole) {
            setCurrentUser(savedUser);
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved user:', e);
        }
      }
    }
    // Sync current user when role changes to demonstrate RBAC
    const savedUserStr = localStorage.getItem('saas_user');
    let savedSuperAdmin = null;
    if (savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        if (u && u.roleId === 'super_admin') {
          savedSuperAdmin = u;
        }
      } catch (e) { }
    }

    const userMap = {
      super_admin: savedSuperAdmin || employees.find(e => e.roleId === 'super_admin') || employees[0],
      dept_admin: employees.find(e => e.roleId === 'dept_admin'),
      branch_admin: employees.find(e => e.roleId === 'branch_admin'),
      manager: employees.find(e => e.roleId === 'manager'),
      team_leader: employees.find(e => e.roleId === 'team_leader'),
      employee: employees.find(e => e.roleId === 'employee')
    };
    const defaultUser = userMap[currentUserRole] || employees[0];
    setCurrentUser(defaultUser);
    if (defaultUser && defaultUser.id !== currentUserId) {
      setCurrentUserId(defaultUser.id);
    }
  }, [currentUserRole, currentUserId, employees]);

  const tasks = React.useMemo(() => {
    if (!projectsList) return [];
    const aggregatedTasks = [];
    
    const normalizeName = (name) => {
      if (!name) return '';
      return name.trim().replace(/\s+/g, ' ').toLowerCase();
    };

    projectsList.forEach(proj => {
      if (proj.tasks) {
        proj.tasks.forEach(t => {
          let resolvedAssigneeId = t.assigneeId;

          // 1. Try finding by assigneeId
          let matchedEmp = null;
          if (t.assigneeId) {
            matchedEmp = (employees || []).find(e => e.id === t.assigneeId);
          }

          // 2. Try finding by assigneeName
          if (!matchedEmp && t.assigneeName && t.assigneeName !== 'Unassigned') {
            const firstAssignee = t.assigneeName.split(',')[0];
            const normAssignee = normalizeName(firstAssignee);
            matchedEmp = (employees || []).find(e => normalizeName(e.name) === normAssignee);
          }

          // 3. Try finding by assignedTo names
          if (!matchedEmp && t.assignedTo && t.assignedTo.length > 0) {
            const normAssignedNames = t.assignedTo.map(normalizeName);
            matchedEmp = (employees || []).find(e => normAssignedNames.includes(normalizeName(e.name)));
          }

          if (matchedEmp) {
            resolvedAssigneeId = matchedEmp.id;
          }

          // 4. Fallback: check if currently logged in user is assigned
          const normCurrentUserName = normalizeName(currentUser?.name);
          const isCurrentUserAssigned = (t.assignedTo && t.assignedTo.map(normalizeName).includes(normCurrentUserName)) ||
                                         (t.assigneeName && normalizeName(t.assigneeName).includes(normCurrentUserName)) ||
                                         (t.assigneeId && currentUser && t.assigneeId === currentUser.id);

          if (!resolvedAssigneeId && isCurrentUserAssigned) {
            resolvedAssigneeId = currentUser.id;
          }

          // Default fallback
          if (!resolvedAssigneeId) {
            resolvedAssigneeId = 'EMP-2026-003';
          }

          const resolvedAssigneeName = t.assigneeName || (t.assignedTo && t.assignedTo.length > 0 ? t.assignedTo.join(', ') : proj.leader || 'Unassigned');
          
          aggregatedTasks.push({
            ...t,
            project: proj.name,
            projectId: proj.id,
            projectName: proj.name,
            department: proj.department || '',
            assigneeId: resolvedAssigneeId,
            assigneeName: resolvedAssigneeName,
            description: t.description || '',
            estimatedHours: t.estimatedHours || 20,
            status: t.completed
              ? 'Done'
              : (t.status === 'Done' || t.status === 'done' || t.status === 'Completed' || t.status === 'completed'
                ? 'Done'
                : (t.status === 'in_progress' || t.status === 'In Progress'
                  ? 'In Progress'
                  : (t.status === 'review' || t.status === 'In Review' || t.status === 'under_review'
                    ? 'In Review'
                    : t.status || 'To Do'))),
            progress: t.completed ? 100 : (t.progress !== undefined ? t.progress : 0),
            comments: t.comments || [],
            attachments: t.attachments || [],
            approvals: (t.approvals && t.approvals.length > 0 ? t.approvals : [
              { level: 1, role: 'Employee', approver: t.assigneeName || proj.leader || 'Employee', status: t.completed ? 'Approved' : 'Pending', timestamp: '', remarks: '' },
              { level: 2, role: 'Team Leader Approval', approver: proj.leader || 'Team Leader', status: t.completed ? 'Approved' : 'Pending', timestamp: '', remarks: '' },
              { level: 3, role: 'Project Manager Approval', approver: proj.manager || 'Project Manager', status: t.completed ? 'Approved' : 'Pending', timestamp: '', remarks: '' }
            ]).filter(app => app.level !== 4 && app.role !== 'Super Admin Approval'),
            activityLog: t.activityLog || [
              { id: `act-${Math.random().toString(36).substring(2, 9)}`, action: 'created', details: `Task created`, timestamp: 'Just now', userName: 'System' }
            ]
          });
        });
      }
    });
    return aggregatedTasks;
  }, [projectsList, currentUser, employees]);

  useEffect(() => {
    localStorage.setItem('saas_role', currentUserRole);
  }, [currentUserRole]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('saas_user_id', currentUserId);
    } else {
      localStorage.removeItem('saas_user_id');
    }
  }, [currentUserId]);

  // Auto-connect socket on mount/refresh if authenticated
  useEffect(() => {
    if (token && currentUser) {
      console.log('[AppContext] Auto-connecting socket on token/user load...');
      connectSocket(token, currentUser.companyId);
    }
  }, [token, currentUser]);

  // Auth Actions
  const login = async (email, password) => {
    if (!email || email.trim().length === 0) {
      throw new Error('Email address cannot be empty.');
    }
    if (!password || password.trim().length === 0) {
      throw new Error('Password cannot be empty.');
    }

    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.message || 'Authentication failed');
      }

      const { user, token } = result.data;

      // Save real credentials and token
      localStorage.setItem('saas_token', token);
      sessionStorage.setItem('saas_token', token);
      localStorage.setItem('saas_role', user.roleId);
      localStorage.setItem('saas_user_id', user.id);
      localStorage.setItem('saas_user', JSON.stringify(user));

      setToken(token);

      // Merge backend loaded user metadata with existing local employee mock arrays
      setEmployees(prev => {
        const index = prev.findIndex(e => e.id === user.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...user };
          return updated;
        } else {
          return [...prev, user];
        }
      });

      setCurrentUserRole(user.roleId);
      setCurrentUserId(user.id);
      setCurrentUser(user);

      // Connect socket on login
      connectSocket(token, user.companyId);

      addActivityLog(`User logged in via database: ${user.name}`, 'Authentication', 'success');
      return user;
    } catch (err) {
      addToast('error', err.message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_role');
    localStorage.removeItem('saas_user_id');
    localStorage.removeItem('saas_user');
    sessionStorage.removeItem('saas_token');
    sessionStorage.removeItem('just_logged_in');

    setCurrentUserRole(null);
    setCurrentUserId('');
    setCurrentUser(null);
    setToken('');

    // Disconnect socket on logout
    disconnectSocket();

    // Hard redirect to login — ensures full state reset and no stale role/context
    window.location.href = '/login';
  };
  const fetchEmployees = async () => {
    if (!token) {
      setEmployees([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const result = await response.json();
      if (result.status === 'success') {
        setEmployees((result.data || []).map(normalizeEmployee));
      }
    } catch (err) {
      console.error('Failed to fetch employees from backend:', err);
      setEmployees([]);
    }
  };

  const fetchPayrollData = async () => {
    if (!token) {
      setPayroll([]);
      setPayrollGrades([]);
      setPayrollReimbursements([]);
      setPayrollLoans([]);
      setPayrollAdvances([]);
      setPayrollBonuses([]);
      setPayrollPayments([]);
      setPayrollConfigs({
        id: 'GLOBAL_CONFIG',
        leaveDeductionRate: 2000,
        lateArrivalPenalty: 300,
        overtimeHourlyRate: 500,
        taxProfiles: {},
        salaryStructures: {},
        attendanceDaysMap: {}
      });
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        const { grades, reimbursements, loans, advances, bonuses, payments, config } = result.data;
        setPayrollGrades(grades || []);
        setPayrollReimbursements(reimbursements || []);
        setPayrollLoans(loans || []);
        setPayrollAdvances(advances || []);
        setPayrollBonuses(bonuses || []);
        setPayrollPayments(payments || []);
        setPayroll(payments || []);
        if (config) {
          setPayrollConfigs(config);
        }
      }
    } catch (err) {
      console.error('Failed to fetch payroll data from backend:', err);
    }
  };

  // fetchEmployees and fetchPayrollData are called in the main data-loading useEffect below

  const fetchSystemSettings = async () => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success' && result.data) {
        const data = result.data;
        // Merge companyProfile.companyName into generalSettings so the sidebar always reflects the saved name
        const mergedGeneral = {
          ...(data.generalSettings || {}),
          companyName: data.companyProfile?.companyName || data.generalSettings?.companyName || 'Gatecode OMS'
        };
        setGeneralSettingsState(mergedGeneral);
        if (data.notificationSettings) setNotificationSettingsState(data.notificationSettings);
        if (data.securitySettings) setSecuritySettingsState(data.securitySettings);
        if (data.attendanceRules) {
          setAttendanceRulesState(data.attendanceRules);
          localStorage.setItem('saas_attendance_rules', JSON.stringify(data.attendanceRules));
        }
      }
    } catch (err) {
      console.error('Failed to fetch system settings from database:', err);
    }
  };

  const saveSystemSettings = async (payload) => {
    if (!token) return false;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        const data = result.data;
        // Keep company name in sync across both companyProfile and generalSettings
        const mergedGeneral = {
          ...(data.generalSettings || {}),
          companyName: data.companyProfile?.companyName || data.generalSettings?.companyName || 'Gatecode OMS'
        };
        setGeneralSettingsState(mergedGeneral);
        if (data.notificationSettings) setNotificationSettingsState(data.notificationSettings);
        if (data.securitySettings) setSecuritySettingsState(data.securitySettings);
        if (data.attendanceRules) {
          setAttendanceRulesState(data.attendanceRules);
          localStorage.setItem('saas_attendance_rules', JSON.stringify(data.attendanceRules));
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save settings to database:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchSystemSettings();
  }, [token]);

  const fetchBranches = async () => {
    if (!token) {
      setBranches([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/branches', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setBranches(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch branches from backend:', err);
      setBranches([]);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [token]);

  const fetchDepartments = async () => {
    if (!token) {
      setDepartments([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/departments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setDepartments(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments from backend:', err);
      setDepartments([]);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [token]);

  const fetchTeams = async () => {
    if (!token) {
      setTeams([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setTeams(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch teams from backend:', err);
      setTeams([]);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [token]);

  const fetchProjects = async () => {
    if (!token) {
      setProjectsList([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setProjectsList(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects from backend:', err);
      setProjectsList([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  const fetchAttendance = async () => {
    if (!token) {
      setAttendance([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/attendance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setAttendance(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch attendance from backend:', err);
      setAttendance([]);
    }
  };

  const fetchLeaves = async () => {
    if (!token) {
      setLeaveRequests([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/leaves', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setLeaveRequests(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaves from backend:', err);
      setLeaveRequests([]);
    }
  };

  const fetchLeavePolicies = async () => {
    if (!token) {
      setLeavePolicyConfigs([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/leaves/policies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setLeavePolicyConfigs(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch leave policies from backend:', err);
      setLeavePolicyConfigs([]);
    }
  };

  const fetchHolidays = async () => {
    if (!token) {
      setHolidaysList([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/holidays', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setHolidaysList(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch holidays from backend:', err);
      setHolidaysList([]);
    }
  };

  const fetchNotifications = async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setNotifications(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    }
  };

  const fetchDocuments = async () => {
    if (!token) {
      setDocumentsList([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/documents', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setDocumentsList(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setDocumentsList([]);
    }
  };

  const addDocument = async (docData) => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(docData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchDocuments();
        addActivityLog(`Uploaded document: ${docData.name}`, 'Documents', 'success');
        addToast('success', 'Document uploaded successfully.');
        return result.data;
      } else {
        addToast('danger', result.message || 'Failed to upload document.');
      }
    } catch (err) {
      console.error('Failed to upload document:', err);
      addToast('danger', 'Error uploading document.');
    }
  };

  const deleteDocument = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchDocuments();
        addActivityLog(`Deleted document ID: ${id}`, 'Documents', 'warning');
        addToast('warning', 'Document deleted successfully.');
        return true;
      } else {
        addToast('danger', result.message || 'Failed to delete document.');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      addToast('danger', 'Error deleting document.');
    }
  };

  const addNotification = async (notifData) => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notifData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchNotifications();
        addActivityLog(`Created notification: ${notifData.title}`, 'Notifications', 'success');
        addToast('success', 'Notification dispatch record created.');
        return result.data;
      } else {
        addToast('danger', result.message || 'Failed to dispatch notification.');
      }
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
      addToast('danger', 'Error dispatching notification.');
    }
  };

  const triggerAutomaticNotification = async (ruleId, { title, message, recipientId, recipientRole, category }) => {
    try {
      const savedRules = localStorage.getItem('automation_rules');
      let isEnabled = true;
      if (savedRules) {
        const parsed = JSON.parse(savedRules);
        for (const cat of parsed) {
          const rule = cat.rules.find(r => r.id === ruleId);
          if (rule) {
            isEnabled = rule.enabled;
            break;
          }
        }
      }
      if (!isEnabled) {
        console.log(`Notification trigger ${ruleId} is disabled.`);
        return;
      }

      const newNotif = {
        id: `NTF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        type: 'info',
        title,
        message,
        time: new Date().toISOString(),
        category: category || 'System',
        priority: 'Normal',
        recipientType: recipientId ? 'Individual' : (recipientRole === 'employee' ? 'Employees' : 'All Employees'),
        recipientRole: recipientRole || 'all',
        recipientId: recipientId || '',
        sentBy: 'System Automation',
        sentDate: new Date().toISOString().split('T')[0],
        deliveryStatus: 'Delivered',
        readStatus: 'Unread',
        readTime: '—',
        recipients: recipientId ? 1 : (
          recipientRole === 'employee' 
            ? (employees ? employees.filter(e => e.roleId === 'employee').length : 1)
            : (employees ? employees.length : 1)
        ),
        delivered: recipientId ? 1 : (
          recipientRole === 'employee' 
            ? (employees ? employees.filter(e => e.roleId === 'employee').length : 1)
            : (employees ? employees.length : 1)
        ),
        read: 0,
        failed: 0
      };

      await addNotification(newNotif);
    } catch (e) {
      console.error('Failed to trigger automatic notification:', e);
    }
  };

  const updateNotification = async (id, updatedFields) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchNotifications();
        return result.data;
      }
    } catch (err) {
      console.error('Failed to update notification:', err);
    }
  };

  const deleteNotification = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchNotifications();
        addToast('warning', 'Notification log deleted.');
        return true;
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const fetchActivityLogs = async () => {
    if (!token) {
      setActivityLogs([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/activity-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setActivityLogs(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
      setActivityLogs([]);
    }
  };

  const fetchRoles = async () => {
    if (!token) {
      setRoles([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/roles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setRoles(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setRoles([]);
    }
  };

  const fetchPermissionModules = async () => {
    if (!token) {
      setPermissionModules([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/roles/permissions-modules', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setPermissionModules(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch permission modules:', err);
      setPermissionModules([]);
    }
  };

  const addPermissionModule = async (name) => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/roles/permissions-modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ label: name })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPermissionModules();
        await fetchRoles();
        addActivityLog(`Added permission module: ${name}`, 'Permissions', 'success');
        addToast('success', `Permission module "${name}" added successfully.`);
        return result.data;
      } else {
        addToast('danger', result.message || 'Failed to add permission module.');
      }
    } catch (err) {
      console.error('Failed to add permission module:', err);
      addToast('danger', 'Error adding permission module.');
    }
  };

  const deletePermissionModule = async (key) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/roles/permissions-modules/${key}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPermissionModules();
        await fetchRoles();
        addActivityLog(`Deleted permission module: ${key}`, 'Permissions', 'warning');
        addToast('warning', `Permission module "${key}" deleted successfully.`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to delete permission module.');
      }
    } catch (err) {
      console.error('Failed to delete permission module:', err);
      addToast('danger', 'Error deleting permission module.');
    }
  };

  const addRole = async (roleData) => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchRoles();
        addActivityLog(`Created role: ${roleData.name}`, 'Permissions', 'success');
        addToast('success', `Role ${roleData.name} created successfully.`);
        return result.data;
      } else {
        addToast('danger', result.message || 'Failed to create role.');
      }
    } catch (err) {
      console.error('Error creating role:', err);
      addToast('danger', 'Network error while creating role.');
    }
  };

  const updateRole = async (id, roleData) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/roles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roleData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchRoles();
        addActivityLog(`Updated role: ${roleData.name || id}`, 'Permissions', 'success');
        addToast('success', `Role details updated successfully.`);
        return result.data;
      } else {
        addToast('danger', result.message || 'Failed to update role.');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      addToast('danger', 'Network error while updating role.');
    }
  };

  const deleteRole = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/roles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchRoles();
        addActivityLog(`Deleted role ID: ${id}`, 'Permissions', 'danger');
        addToast('warning', `Role deleted successfully.`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to delete role.');
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      addToast('danger', 'Network error while deleting role.');
    }
  };

  const fetchUserOverrides = async () => {
    if (!token) {
      setUserOverrides([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/roles/overrides', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setUserOverrides(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch user overrides:', err);
      setUserOverrides([]);
    }
  };

  const addUserOverride = async (overrideData) => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/roles/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(overrideData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchUserOverrides();
        addActivityLog(`Added override for user: ${overrideData.userName}`, 'Permissions', 'success');
        addToast('success', `Override rule added successfully.`);
        return result.data;
      } else {
        addToast('danger', result.message || 'Failed to add override.');
      }
    } catch (err) {
      console.error('Error adding user override:', err);
      addToast('danger', 'Network error while adding user override.');
    }
  };

  const deleteUserOverride = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/roles/overrides/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchUserOverrides();
        addActivityLog(`Deleted override ID: ${id}`, 'Permissions', 'danger');
        addToast('warning', `Override rule deleted successfully.`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to delete override.');
      }
    } catch (err) {
      console.error('Error deleting user override:', err);
      addToast('danger', 'Network error while deleting override.');
    }
  };

  const fetchDailyReports = async () => {
    if (!token) {
      setDailyReports([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/work-reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setDailyReports(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch daily reports from backend:', err);
      setDailyReports([]);
    }
  };

  const fetchAppraisalReviews = async () => {
    if (!token) {
      setAppraisalReviews([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/appraisal-reviews', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setAppraisalReviews(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch appraisal reviews from backend:', err);
      setAppraisalReviews([]);
    }
  };

  const fetchAnnouncements = async () => {
    if (!token) {
      setAnnouncementsList([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/announcements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setAnnouncementsList(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      setAnnouncementsList([]);
    }
  };

  const fetchEmergencyAlert = async () => {
    if (!token) {
      setEmergencyAlert({ isActive: false, title: '', description: '', date: '' });
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/announcements/emergency', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setEmergencyAlert(result.data || { isActive: false, title: '', description: '', date: '' });
      }
    } catch (err) {
      console.error('Failed to fetch emergency alert:', err);
    }
  };

  const fetchAnnouncementTracking = async () => {
    if (!token) {
      setAnnouncementTrackingLogs([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/announcements/tracking', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setAnnouncementTrackingLogs(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tracking logs:', err);
      setAnnouncementTrackingLogs([]);
    }
  };

  const fetchAnnouncementAudits = async () => {
    if (!token) {
      setAnnouncementAuditLogs([]);
      return;
    }
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/announcements/audit-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setAnnouncementAuditLogs(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setAnnouncementAuditLogs([]);
    }
  };

  const createAnnouncement = async (annData) => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(annData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchAnnouncements();
        fetchAnnouncementAudits();
        fetchAnnouncementTracking();
        addToast('success', 'Announcement published/scheduled successfully.');
        return result.data;
      } else {
        addToast('danger', result.message || 'Failed to create announcement.');
      }
    } catch (err) {
      console.error('Failed to create announcement:', err);
      addToast('danger', 'Error creating announcement.');
    }
  };

  const updateAnnouncement = async (id, annData) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/announcements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(annData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchAnnouncements();
        fetchAnnouncementAudits();
        return result.data;
      }
    } catch (err) {
      console.error('Failed to update announcement:', err);
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchAnnouncements();
        fetchAnnouncementAudits();
        addToast('success', 'Announcement deleted successfully.');
      }
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const acknowledgeAnnouncement = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/announcements/${id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchAnnouncements();
        fetchAnnouncementTracking();
        addToast('success', 'Announcement / Policy acknowledged successfully.');
        return result.data;
      }
    } catch (err) {
      console.error('Failed to acknowledge announcement:', err);
    }
  };

  const likeAnnouncement = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/announcements/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchAnnouncements();
        return result.data;
      }
    } catch (err) {
      console.error('Failed to like announcement:', err);
    }
  };

  const addAnnouncementComment = async (id, commentText) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/announcements/${id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText })
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchAnnouncements();
        addToast('success', 'Comment posted.');
        return result.data;
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const deleteAnnouncementComment = async (id, commentId) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/announcements/${id}/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchAnnouncements();
        addToast('success', 'Comment deleted.');
        return result.data;
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const triggerEmergencyAlert = async (alertData) => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/announcements/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(alertData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchEmergencyAlert();
        fetchAnnouncementAudits();
        addToast('success', 'Emergency broadcast updated.');
        return result.data;
      }
    } catch (err) {
      console.error('Failed to trigger emergency alert:', err);
    }
  };

  const viewAnnouncement = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/announcements/${id}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchAnnouncements();
        fetchAnnouncementTracking();
        return result.data;
      }
    } catch (err) {
      console.error('Failed to log announcement view:', err);
    }
  };

  const addAppraisalReview = async (reviewData) => {
    if (!token) return;
    try {
      const emp = employees.find(e => e.name === reviewData.employeeName);
      const payload = {
        ...reviewData,
        employeeId: emp ? emp.id : 'EMP-UNKNOWN'
      };

      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/appraisal-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        const newReview = result.data;
        setAppraisalReviews(prev => [newReview, ...prev]);
        addActivityLog(`Submitted appraisal review for ${reviewData.employeeName}`, 'Performance', 'success');
        addToast('success', `Appraisal review for ${reviewData.employeeName} submitted successfully.`);

        // Trigger Automatic Notification
        await triggerAutomaticNotification('HR-03', {
          title: 'Performance Appraisal Score Updated',
          message: `Your performance review for period ${newReview.period} has been submitted. Rating: ${newReview.rating}.`,
          recipientId: newReview.employeeId,
          recipientRole: 'employee',
          category: 'HR'
        });

        fetchEmployees();
        return newReview;
      } else {
        addToast('danger', result.message || 'Failed to submit appraisal review.');
      }
    } catch (err) {
      console.error('Failed to submit appraisal review to backend:', err);
      addToast('danger', 'Error submitting appraisal review.');
    }
  };

  useEffect(() => {
    if (!token) {
      setInitialized(true);
      return;
    }
    setInitialized(false);
    const loadInitialData = async () => {
      try {
        await Promise.allSettled([
          fetchEmployees(),
          fetchAttendance(),
          fetchLeaves(),
          fetchLeavePolicies(),
          fetchHolidays(),
          fetchDailyReports(),
          fetchAppraisalReviews(),
          fetchPayrollData(),
          fetchAnnouncements(),
          fetchEmergencyAlert(),
          fetchAnnouncementTracking(),
          fetchAnnouncementAudits(),
          fetchNotifications(),
          fetchDocuments(),
          fetchActivityLogs(),
          fetchRoles(),
          fetchPermissionModules(),
          fetchUserOverrides()
        ]);
      } catch (err) {
        console.error('Failed to load initial application state:', err);
      } finally {
        setInitialized(true);
      }
    };
    loadInitialData();
  }, [token]);

  // Background polling disabled to prevent terminal log flooding (Option B)


  // Toast Handler
  const addToast = (type, message, action = null) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => {
      // Remove any active toast with the same message to prevent duplicate alerts stacking
      const filtered = prev.filter(t => t.message !== message);
      // Keep only the most recent toast to prevent vertical overflow/stacking clutter
      const limited = filtered.slice(-1);
      return [...limited, { id, type, message, action }];
    });
    // Auto-dismiss after 3.5 seconds if there's an action, otherwise 2.5 seconds (gives user time to click)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, action ? 3500 : 2500);
  };

  // Confirm Dialog Handler
  const showConfirm = (title, message, onConfirmAction, confirmType = 'primary') => {
    console.log('AppContext: showConfirm called with title =', title);
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmType,
      onConfirm: () => {
        console.log('AppContext: showConfirm wrapper onConfirm triggered');
        if (onConfirmAction) {
          try {
            onConfirmAction();
          } catch (err) {
            console.error('Error in onConfirmAction callback:', err);
          }
        }
        closeConfirm();
      },
      onCancel: () => {
        console.log('AppContext: showConfirm wrapper onCancel triggered');
        closeConfirm();
      }
    });
  };

  const closeConfirm = () => {
    console.log('AppContext: closeConfirm executing');
    setConfirmDialog(prev => {
      console.log('AppContext: setConfirmDialog setting isOpen = false, previous =', prev);
      return { ...prev, isOpen: false };
    });
  };

  // Logging Helper
  const addActivityLog = async (action, module, status = 'success', details = '', target = '') => {
    const logId = `LOG-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const logData = {
      id: logId,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor: currentUser?.name || 'System User',
      actionType: action,
      fieldChanged: module,
      oldValue: status,
      newValue: details || target || '—',
      ip: '127.0.0.1'
    };

    if (token) {
      try {
        await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/activity-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(logData)
        });
        fetchActivityLogs();
      } catch (err) {
        console.error('Failed to post activity log:', err);
        setActivityLogs(prev => [logData, ...prev]);
      }
    } else {
      setActivityLogs(prev => [logData, ...prev]);
    }
  };

  // Employee CRUD Handlers
  const addEmployee = async (newEmp) => {
    const [firstName, ...restParts] = (newEmp.name || '').split(' ');
    const lastName = restParts.join('') || 'user';
    const defaultWorkEmail = firstName ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@saas.io` : `emp.${employees.length + 1}@saas.io`;
    const defaultPersonalEmail = firstName ? `${firstName.toLowerCase()}${lastName.toLowerCase()}${employees.length}@gmail.com` : `emp.${employees.length + 1}@gmail.com`;

    const entry = {
      ...newEmp,
      // id is intentionally NOT set here — backend generates the company-scoped ID
      status: newEmp.status || 'Active',
      email: newEmp.officialEmail || newEmp.email,
      workEmail: newEmp.workEmail || newEmp.officialEmail || defaultWorkEmail,
      designation: newEmp.designation || newEmp.role || 'Employee',
      attendanceStatus: newEmp.attendanceStatus || 'Present',
      workStatus: newEmp.workStatus || 'Active',
      accountStatus: newEmp.accountStatus || 'Active',
      teamLeader: newEmp.teamLeader || 'Unassigned',
      projectManager: newEmp.projectManager || 'Unassigned',
      nationality: newEmp.nationality || 'Not specified',
      personalEmail: newEmp.personalEmail || defaultPersonalEmail,
      emergencyContactName: newEmp.emergencyContactName || '',
      emergencyContactPhone: newEmp.emergencyContactPhone || '',
      emergencyContactPhoneAlt: newEmp.emergencyContactPhoneAlt || '',
      currentAddress: newEmp.currentAddress || '',
      permanentAddress: newEmp.permanentAddress || '',
      employmentType: newEmp.employmentType || 'Full-Time',
      workLocation: newEmp.workLocation || newEmp.branch || '',
      attendanceHistory: [],
      overtimeHistory: [],
      leaveHistory: [],
      taskHistory: [],
      performanceScore: { overall: 0, attendance: 0, taskCompletion: 0, reportSubmission: 0, leaveDiscipline: 0, monthly: [0, 0, 0, 0, 0, 0] },
      documents: newEmp.documents || [],
      activityLog: [],

      // New default properties
      employeeType: newEmp.employeeType || 'Full-Time',
      probationEndDate: newEmp.probationEndDate || '',
      contractEndDate: newEmp.contractEndDate || '',
      employmentStatus: newEmp.employmentStatus || 'Confirmed',
      bankName: newEmp.bankName || '',
      bankAccountNumber: newEmp.bankAccountNumber || '',
      bankIfscCode: newEmp.bankIfscCode || '',
      bankUpiId: newEmp.bankUpiId || '',
      skills: newEmp.skills || [],
      certifications: newEmp.certifications || [],
      employmentHistory: newEmp.employmentHistory || [],
      securityInfo: newEmp.securityInfo || { lastLogin: '—', loginDevice: '—', loginLocation: '—', failedAttempts: 0, mfaStatus: 'Disabled' },
      payrollSummary: newEmp.payrollSummary || { salaryStatus: 'Pending', lastSalaryDate: '—', upcomingPayrollDate: '—', bonusHistory: [] },
      productivityScore: newEmp.productivityScore || 0,
      performanceRating: newEmp.performanceRating || 'Good',
      leaveBalance: newEmp.leaveBalance || 0,
      currentProjectsCount: newEmp.currentProjectsCount || 0,
      experience: newEmp.experience || 0,
      shift: newEmp.shift || 'Morning (09:00 AM - 06:00 PM)',
      todayPunchIn: null,
      todayPunchOut: null,
      todayWorkingHours: 0,
      todayPunchStatus: 'Not Punched',
      lastSeen: '—'
    };

    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(entry)
      });
      const result = await response.json();
      if (result.status === 'success') {
        const savedEmp = normalizeEmployee(result.data);
        setEmployees(prev => [...prev, savedEmp]);
        addActivityLog(`Added new employee: ${savedEmp.name}`, 'Employees', 'success');
        addToast('success', `Employee ${savedEmp.name} created successfully! ID: ${savedEmp.id}`);

        // Trigger Automatic Notification
        await triggerAutomaticNotification('HR-01', {
          title: 'New Employee Profile Created',
          message: `Welcome aboard! A new profile has been created for ${savedEmp.name} (${savedEmp.designation || 'Staff'}) in the ${savedEmp.department || 'General'} department.`,
          recipientRole: 'admin',
          category: 'HR'
        });

        // Increment User Count in Role Card
        setRoles(prev =>
          prev.map(r => (r.id === newEmp.roleId ? { ...r, userCount: r.userCount + 1 } : r))
        );

        return savedEmp; // return so caller can display the backend-assigned id
      } else {
        addToast('error', result.message || 'Failed to save employee to database');
      }
    } catch (err) {
      console.error('Error creating employee:', err);
      addToast('error', 'Network error while creating employee');
    }
  };

  const updateEmployee = async (id, updatedData) => {
    const dataToSend = {
      ...updatedData,
      email: updatedData.officialEmail || updatedData.email
    };
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });
      const result = await response.json();
      if (result.status === 'success') {
        const savedEmp = normalizeEmployee(result.data);
        setEmployees(prev =>
          prev.map(e => (e.id === id ? savedEmp : e))
        );
        // If the updated user is the currently logged in user, sync local storage & currentUser state!
        if (currentUser && (currentUser.id === id || currentUser.employeeId === id)) {
          setCurrentUser(savedEmp);
          localStorage.setItem('saas_user', JSON.stringify(savedEmp));
        }
        // Sync manager info in branches dynamically in real-time
        setBranches(prev =>
          prev.map(b => b.managerId === id ? {
            ...b,
            manager: savedEmp.name,
            managerPhone: savedEmp.phone || '',
            managerEmail: savedEmp.email || ''
          } : b)
        );
        addActivityLog(`Updated details for employee ID: ${id}`, 'Employees', 'success');
        addToast('success', 'Employee details updated successfully!');
        fetchBranches();
      } else {
        addToast('error', result.message || 'Failed to update employee in database');
      }
    } catch (err) {
      console.error('Error updating employee:', err);
      addToast('error', 'Network error while updating employee');
    }
  };

  const deactivateEmployee = async (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Inactive' })
      });
      const result = await response.json();
      if (result.status === 'success') {
        const updatedEmp = normalizeEmployee(result.data);
        setEmployees(prev =>
          prev.map(e => (e.id === id ? updatedEmp : e))
        );
        addActivityLog(`Deactivated employee: ${emp.name}`, 'Employees', 'danger');
        addToast('warning', `Employee ${emp.name} has been deactivated.`);

        // Trigger Automatic Notification
        await triggerAutomaticNotification('HR-02', {
          title: 'Employee Account Deactivated',
          message: `The employee account for ${emp.name} (${emp.id}) has been deactivated.`,
          recipientRole: 'admin',
          category: 'HR'
        });
      } else {
        addToast('error', result.message || 'Failed to deactivate employee in database');
      }
    } catch (err) {
      console.error('Error deactivating employee:', err);
      addToast('error', 'Network error while deactivating employee');
    }
  };

  const activateEmployee = async (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Active' })
      });
      const result = await response.json();
      if (result.status === 'success') {
        const updatedEmp = normalizeEmployee(result.data);
        setEmployees(prev =>
          prev.map(e => (e.id === id ? updatedEmp : e))
        );
        addActivityLog(`Activated employee: ${emp.name}`, 'Employees', 'success');
        addToast('success', `Employee ${emp.name} has been activated.`);
      } else {
        addToast('error', result.message || 'Failed to activate employee in database');
      }
    } catch (err) {
      console.error('Error activating employee:', err);
      addToast('error', 'Network error while activating employee');
    }
  };

  const bulkAssignRole = async (ids, roleId) => {
    const roleObj = roles.find(r => r.id === roleId);
    try {
      const updatePromises = Array.from(ids).map(async (id) => {
        const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ roleId, role: roleObj ? roleObj.name : (roleId === 'employee' ? 'Employee' : undefined) })
        });
        const result = await response.json();
        return result.status === 'success' ? normalizeEmployee(result.data) : null;
      });

      const updatedEmps = await Promise.all(updatePromises);
      const validUpdates = updatedEmps.filter(Boolean);

      setEmployees(prev =>
        prev.map(e => {
          const match = validUpdates.find(u => u.id === e.id);
          return match || e;
        })
      );
      addActivityLog(`Bulk assigned role "${roleObj?.name}" to ${ids.size} employees`, 'Employees', 'success');
      addToast('success', `Assigned role "${roleObj?.name}" to ${ids.size} employees.`);
    } catch (err) {
      console.error('Error during bulk role assignment:', err);
      addToast('error', 'Network error during bulk role assignment');
    }
  };

  const bulkTransferDept = async (ids, deptName) => {
    try {
      const updatePromises = Array.from(ids).map(async (id) => {
        const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ department: deptName })
        });
        const result = await response.json();
        return result.status === 'success' ? normalizeEmployee(result.data) : null;
      });

      const updatedEmps = await Promise.all(updatePromises);
      const validUpdates = updatedEmps.filter(Boolean);

      setEmployees(prev =>
        prev.map(e => {
          const match = validUpdates.find(u => u.id === e.id);
          return match || e;
        })
      );
      addActivityLog(`Bulk transferred ${ids.size} employees to department: ${deptName}`, 'Employees', 'success');
      addToast('success', `Transferred ${ids.size} employees to ${deptName}.`);
    } catch (err) {
      console.error('Error during bulk department transfer:', err);
      addToast('error', 'Network error during bulk department transfer');
    }
  };

  const bulkUpdateStatus = async (ids, status) => {
    try {
      const updatePromises = Array.from(ids).map(async (id) => {
        const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        const result = await response.json();
        return result.status === 'success' ? normalizeEmployee(result.data) : null;
      });

      const updatedEmps = await Promise.all(updatePromises);
      const validUpdates = updatedEmps.filter(Boolean);

      setEmployees(prev =>
        prev.map(e => {
          const match = validUpdates.find(u => u.id === e.id);
          return match || e;
        })
      );
      addActivityLog(`Bulk updated status of ${ids.size} employees to "${status}"`, 'Employees', 'success');
      addToast('success', `Updated status of ${ids.size} employees to "${status}".`);
    } catch (err) {
      console.error('Error during bulk status update:', err);
      addToast('error', 'Network error during bulk status update');
    }
  };

  const bulkAllocateLeave = async (ids, leaveData) => {
    try {
      const increment = parseInt(leaveData) || 0;
      const updatePromises = Array.from(ids).map(async (id) => {
        const emp = employees.find(e => e.id === id);
        if (!emp) return null;

        const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ leaveBalance: (emp.leaveBalance || 0) + increment })
        });
        const result = await response.json();
        return result.status === 'success' ? normalizeEmployee(result.data) : null;
      });

      const updatedEmps = await Promise.all(updatePromises);
      const validUpdates = updatedEmps.filter(Boolean);

      setEmployees(prev =>
        prev.map(e => {
          const match = validUpdates.find(u => u.id === e.id);
          return match || e;
        })
      );
      addActivityLog(`Bulk allocated ${leaveData} leaves to ${ids.size} employees`, 'Employees', 'success');
      addToast('success', `Allocated ${leaveData} leaves to ${ids.size} employees.`);
    } catch (err) {
      console.error('Error during bulk leave allocation:', err);
      addToast('error', 'Network error during bulk leave allocation');
    }
  };

  const bulkSendNotification = (ids, message) => {
    setNotifications(prev => [
      {
        id: `NTF-BULK-${Math.random().toString(36).substring(2, 9)}`,
        type: 'info',
        message: `Notification sent to ${ids.size} employees: "${message}"`,
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
    addActivityLog(`Sent bulk notification to ${ids.size} employees: "${message}"`, 'Employees', 'success');
    addToast('success', `Notification sent to ${ids.size} employees.`);
  };

  // Leave Requests Handlers
  const approveLeaveRequest = async (id, notes = '') => {
    const leave = leaveRequests.find(l => l.id === id);
    if (!leave) return;

    try {
      const updatedHistory = [
        ...(leave.history || []),
        { date: new Date().toISOString().split('T')[0], status: 'Approved', comment: `Approved by ${currentUser?.name || 'Manager'}` }
      ];

      const payload = {
        status: 'Approved',
        approverNotes: notes || 'Approved by Manager',
        history: updatedHistory
      };

      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/leaves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.status === 'success') {
        setLeaveRequests(prev =>
          prev.map(l => (l.id === id ? result.data : l))
        );

        // Update Employee Status in DB
        await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${leave.employeeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'On Leave' })
        });

        fetchEmployees();

        addActivityLog(`Approved leave request for ${leave.employeeName}`, 'Leaves', 'success');
        addToast('success', `Leave request for ${leave.employeeName} approved.`);

        // Add Notification — targeted to the employee who requested leave
        await triggerAutomaticNotification('LV-02', {
          title: 'Leave Request Approved',
          message: `Your ${leave.type || 'leave'} request (${leave.fromDate} to ${leave.toDate || leave.fromDate}) has been Approved. Note: ${notes || 'Approved by Manager'}`,
          recipientId: leave.employeeId,
          recipientRole: 'employee',
          category: 'Leave'
        });
      } else {
        addToast('error', result.message || 'Failed to approve leave request');
      }
    } catch (err) {
      console.error('Error approving leave:', err);
      addToast('error', 'Network error while approving leave');
    }
  };

  const rejectLeaveRequest = async (id, notes = '') => {
    const leave = leaveRequests.find(l => l.id === id);
    if (!leave) return;

    try {
      const updatedHistory = [
        ...(leave.history || []),
        { date: new Date().toISOString().split('T')[0], status: 'Rejected', comment: `Rejected by ${currentUser?.name || 'Manager'}: ${notes}` }
      ];

      const payload = {
        status: 'Rejected',
        approverNotes: notes || 'Rejected by Manager',
        history: updatedHistory
      };

      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/leaves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.status === 'success') {
        setLeaveRequests(prev =>
          prev.map(l => (l.id === id ? result.data : l))
        );

        addActivityLog(`Rejected leave request for ${leave.employeeName}`, 'Leaves', 'danger');
        addToast('error', `Leave request for ${leave.employeeName} rejected.`);

        // Add Notification — targeted to the employee who requested leave
        await triggerAutomaticNotification('LV-03', {
          title: 'Leave Request Rejected',
          message: `Your ${leave.type || 'leave'} request (${leave.fromDate} to ${leave.toDate || leave.fromDate}) has been Rejected. Note: ${notes || 'Rejected by Manager'}`,
          recipientId: leave.employeeId,
          recipientRole: 'employee',
          category: 'Leave'
        });
      } else {
        addToast('error', result.message || 'Failed to reject leave request');
      }
    } catch (err) {
      console.error('Error rejecting leave:', err);
      addToast('error', 'Network error while rejecting leave');
    }
  };

  const applyLeave = async (leaveData) => {
    return await addLeaveRequest(leaveData);
  };

  const addLeaveRequest = async (newLeave) => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLeave)
      });

      const result = await response.json();
      if (result.status === 'success') {
        setLeaveRequests(prev => [result.data, ...prev]);

        // If the leave is pre-approved (assigned directly by Admin), update employee status to 'On Leave'
        if (result.data.status === 'Approved') {
          try {
            await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${result.data.employeeId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'On Leave' })
            });
            fetchEmployees();
          } catch (empErr) {
            console.error('Failed to update employee status on leave assignment:', empErr);
          }
        }

        addActivityLog(`Submitted leave request for ${result.data.employeeName}`, 'Leaves', 'success');
        addToast('success', result.data.status === 'Approved' ? `Leave assigned successfully for ${result.data.employeeName}.` : 'Leave request submitted successfully for approval.');

        // Notify admin/manager about the new leave application (only if status is Pending)
        if (result.data.status === 'Pending') {
          await triggerAutomaticNotification('LV-01', {
            title: 'New Leave Application Submitted',
            message: `${result.data.employeeName} has applied for ${result.data.type || 'Leave'} from ${result.data.fromDate} to ${result.data.toDate || result.data.fromDate} (${result.data.days || 1} day(s)). Action required.`,
            recipientRole: 'admin',
            category: 'Leave'
          });
        }

        return result.data;
      } else {
        addToast('error', result.message || 'Failed to submit leave request');
      }
    } catch (err) {
      console.error('Error adding leave request:', err);
      addToast('error', 'Network error while submitting leave request');
    }
  };

  const updateLeaveRequest = async (id, updatedLeave) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/leaves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedLeave)
      });

      const result = await response.json();
      if (result.status === 'success') {
        setLeaveRequests(prev =>
          prev.map(l => (l.id === id ? result.data : l))
        );
        addActivityLog(`Updated leave request ${id}`, 'Leaves', 'success');
        addToast('success', `Leave request ${id} updated successfully.`);
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to update leave request');
      }
    } catch (err) {
      console.error('Error updating leave request:', err);
      addToast('error', 'Network error while updating leave request');
    }
  };

  const addLeavePolicy = async (newPolicy) => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/leaves/policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPolicy)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setLeavePolicyConfigs(prev => [...prev, result.data]);
        addToast('success', `${newPolicy.leaveName} policy added successfully!`);
        return true;
      } else {
        addToast('error', result.message || 'Failed to add leave policy');
        return false;
      }
    } catch (err) {
      console.error('Error adding policy:', err);
      addToast('error', 'Network error while adding policy');
      return false;
    }
  };

  const updateTaskProgress = async (id, status, progress, remarks) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === id));
    if (!project) return;

    if ((status === 'Done' || status === 'done' || status === 'completed' || Number(progress) === 100) && currentUserRole === 'employee') {
      addToast('error', 'Only management can approve and set task status to "Done".');
      return;
    }

    const updatedTasks = project.tasks.map(t => {
      if (t.id === id) {
        const completed = status === 'Done' || status === 'done' || status === 'completed' || Number(progress) === 100;
        return {
          ...t,
          status: status,
          progress: Number(progress),
          completed,
          remarks: remarks || t.remarks,
          activityLog: [
            ...(t.activityLog || []),
            {
              id: `act-${Math.random().toString(36).substring(2, 9)}`,
              action: 'progress_updated',
              details: `Progress set to ${progress}% (Status: ${status})`,
              timestamp: 'Just now',
              userName: currentUser?.name || 'System'
            }
          ]
        };
      }
      return t;
    });

    const tasksDone = updatedTasks.filter(t => t.completed).length;
    const progressTotal = project.tasksTotal > 0 ? Math.round((tasksDone / project.tasksTotal) * 100) : 0;

    const success = await updateProject(project.id, {
      tasks: updatedTasks,
      tasksDone,
      progress: progressTotal,
      status: progressTotal === 100 ? 'Completed' : project.status
    });

    if (success) {
      addActivityLog(`Updated task status to ${status} (${progress}%)`, 'Tasks', 'success');
      addToast('success', `Task updated successfully.`);
      return updatedTasks.find(t => t.id === id);
    }
  };

  const updateLeavePolicy = async (id, updatedPolicy) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/leaves/policies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedPolicy)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setLeavePolicyConfigs(prev =>
          prev.map(p => (p.id === id ? result.data : p))
        );
        return true;
      } else {
        addToast('error', result.message || 'Failed to update leave policy');
        return false;
      }
    } catch (err) {
      console.error('Error updating policy:', err);
      addToast('error', 'Network error while updating policy');
      return false;
    }
  };

  const deleteLeavePolicy = async (id) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/leaves/policies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setLeavePolicyConfigs(prev => prev.filter(p => p.id !== id));
        addToast('success', 'Leave policy deleted successfully.');
        return true;
      } else {
        addToast('error', result.message || 'Failed to delete leave policy');
        return false;
      }
    } catch (err) {
      console.error('Error deleting policy:', err);
      addToast('error', 'Network error while deleting policy');
      return false;
    }
  };

  const resetLeavePolicies = async () => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/leaves/policies/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setLeavePolicyConfigs(result.data || []);
        addToast('success', 'All policies have been reset to default values.');
        return true;
      } else {
        addToast('error', result.message || 'Failed to reset leave policies');
        return false;
      }
    } catch (err) {
      console.error('Error resetting policies:', err);
      addToast('error', 'Network error while resetting policies');
      return false;
    }
  };

  const addHoliday = async (newHoliday) => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newHoliday)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setHolidaysList(prev => [...prev, result.data]);
        return true;
      } else {
        addToast('error', result.message || 'Failed to add holiday');
        return false;
      }
    } catch (err) {
      console.error('Error adding holiday:', err);
      addToast('error', 'Network error while adding holiday');
      return false;
    }
  };

  const deleteHoliday = async (id) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/holidays/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setHolidaysList(prev => prev.filter(h => h.id !== id));
        addToast('success', 'Holiday deleted successfully.');
        return true;
      } else {
        addToast('error', result.message || 'Failed to delete holiday');
        return false;
      }
    } catch (err) {
      console.error('Error deleting holiday:', err);
      addToast('error', 'Network error while deleting holiday');
      return false;
    }
  };

  // Branch CRUD Handlers
  const addBranch = async (newBranchData) => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBranchData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setBranches(prev => [...prev, result.data]);
        addToast('success', `Branch "${result.data.name}" added successfully!`);
        addActivityLog(`Added new branch: ${result.data.name}`, 'Branches', 'success');
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to add branch');
      }
    } catch (err) {
      console.error('Error adding branch:', err);
      addToast('error', 'Network error while adding branch');
    }
  };

  const updateBranch = async (id, updatedFields) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/branches/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setBranches(prev => prev.map(b => b.id === id ? result.data : b));
        addActivityLog(`Updated branch ID: ${id}`, 'Branches', 'success');
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to update branch');
      }
    } catch (err) {
      console.error('Error updating branch:', err);
      addToast('error', 'Network error while updating branch');
    }
  };

  const deleteBranch = async (id) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/branches/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setBranches(prev => prev.filter(b => b.id !== id));
        addToast('warning', `Branch removed successfully.`);
        addActivityLog(`Deleted branch ID: ${id}`, 'Branches', 'danger');
      } else {
        addToast('error', result.message || 'Failed to delete branch');
      }
    } catch (err) {
      console.error('Error deleting branch:', err);
      addToast('error', 'Network error while deleting branch');
    }
  };

  // Department CRUD Handlers
  const addDepartment = async (newDeptData) => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newDeptData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setDepartments(prev => [...prev, result.data]);
        addToast('success', `Department "${result.data.name}" added successfully!`);
        addActivityLog(`Added new department: ${result.data.name}`, 'Departments', 'success');
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to add department');
      }
    } catch (err) {
      console.error('Error adding department:', err);
      addToast('error', 'Network error while adding department');
    }
  };

  const updateDepartment = async (id, updatedFields) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setDepartments(prev => prev.map(d => d.id === id ? result.data : d));
        addActivityLog(`Updated department ID: ${id}`, 'Departments', 'success');
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to update department');
      }
    } catch (err) {
      console.error('Error updating department:', err);
      addToast('error', 'Network error while updating department');
    }
  };

  const deleteDepartment = async (id) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/departments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setDepartments(prev => prev.filter(d => d.id !== id));
        addToast('warning', `Department removed successfully.`);
        addActivityLog(`Deleted department ID: ${id}`, 'Departments', 'danger');
      } else {
        addToast('error', result.message || 'Failed to delete department');
      }
    } catch (err) {
      console.error('Error deleting department:', err);
      addToast('error', 'Network error while deleting department');
    }
  };

  // Team CRUD Handlers
  const addTeam = async (newTeamData) => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTeamData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setTeams(prev => [...prev, result.data]);
        addToast('success', `Team "${result.data.name}" added successfully!`);
        addActivityLog(`Added new team: ${result.data.name}`, 'Teams', 'success');
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to add team');
      }
    } catch (err) {
      console.error('Error adding team:', err);
      addToast('error', 'Network error while adding team');
    }
  };

  const updateTeam = async (id, updatedFields) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/teams/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setTeams(prev => prev.map(t => t.id === id ? result.data : t));
        addActivityLog(`Updated team ID: ${id}`, 'Teams', 'success');
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to update team');
      }
    } catch (err) {
      console.error('Error updating team:', err);
      addToast('error', 'Network error while updating team');
    }
  };

  const deleteTeam = async (id) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/teams/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setTeams(prev => prev.filter(t => t.id !== id));
        addToast('warning', `Team removed successfully.`);
        addActivityLog(`Deleted team ID: ${id}`, 'Teams', 'danger');
      } else {
        addToast('error', result.message || 'Failed to delete team');
      }
    } catch (err) {
      console.error('Error deleting team:', err);
      addToast('error', 'Network error while deleting team');
    }
  };

  // Project CRUD Handlers
  const addProject = async (newProjData) => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProjData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setProjectsList(prev => [...prev, result.data]);
        addToast('success', `Project "${result.data.name}" created successfully!`);
        addActivityLog(`Created project: ${result.data.name}`, 'Projects', 'success');
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      addToast('error', 'Network error while creating project');
    }
  };

  const updateProject = async (id, updatedFields) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setProjectsList(prev => prev.map(p => p.id === id ? result.data : p));
        addActivityLog(`Updated project ID: ${id}`, 'Projects', 'success');
        return result.data;
      } else {
        addToast('error', result.message || 'Failed to update project');
        return null;
      }
    } catch (err) {
      console.error('Error updating project:', err);
      addToast('error', 'Network error while updating project');
      return null;
    }
  };

  const deleteProject = async (id) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setProjectsList(prev => prev.filter(p => p.id !== id));
        addToast('warning', `Project removed successfully.`);
        addActivityLog(`Deleted project ID: ${id}`, 'Projects', 'danger');
      } else {
        addToast('error', result.message || 'Failed to delete project');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      addToast('error', 'Network error while deleting project');
    }
  };

  const addAttendanceRecord = async (newRecord) => {
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRecord)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setAttendance(prev => [result.data, ...prev]);
        addActivityLog(`Logged attendance record for ${result.data.employeeName}`, 'Attendance', 'success');
        addToast('success', 'Attendance record logged successfully.');

        // Trigger Automatic Notification
        if (result.data.status === 'Late') {
          await triggerAutomaticNotification('ATT-01', {
            title: 'Late Punch In Warning',
            message: `Dear ${result.data.employeeName}, your punch in at ${result.data.punchIn || 'late time'} on ${result.data.date} has been marked as Late. Please check with your supervisor.`,
            recipientId: result.data.employeeId,
            recipientRole: 'employee',
            category: 'Attendance'
          });
        } else if (result.data.status === 'Absent') {
          await triggerAutomaticNotification('ATT-03', {
            title: 'Absenteeism Notification',
            message: `Dear ${result.data.employeeName}, you were marked as Absent on ${result.data.date}. Please verify your check-in or request leave.`,
            recipientId: result.data.employeeId,
            recipientRole: 'employee',
            category: 'Attendance'
          });
        }
      } else {
        addToast('error', result.message || 'Failed to log attendance to database');
      }
    } catch (err) {
      console.error('Error logging attendance:', err);
      addToast('error', 'Network error while logging attendance');
    }
  };

  const updateAttendanceRecord = async (id, updatedData) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/attendance/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        setAttendance(prev =>
          prev.map(a => (a.id === id ? result.data : a))
        );
        addActivityLog(`Updated attendance record for ${result.data.employeeName}`, 'Attendance', 'success');
        addToast('success', 'Attendance record updated successfully.');

        // Trigger Automatic Notification
        if (result.data.totalHours > 9) {
          await triggerAutomaticNotification('ATT-02', {
            title: 'Overtime Work Confirmed',
            message: `${result.data.employeeName} completed ${result.data.totalHours} hours of work on ${result.data.date} (Overtime confirmed).`,
            recipientRole: 'admin',
            category: 'Attendance'
          });
        }
      } else {
        addToast('error', result.message || 'Failed to update attendance in database');
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      addToast('error', 'Network error while updating attendance');
    }
  };

  // Tasks Handlers
  const updateTaskStatus = async (id, newStatus) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === id));
    if (!project) return;

    const updatedTasks = project.tasks.map(t => {
      if (t.id === id) {
        const completed = newStatus === 'Done' || newStatus === 'done' || newStatus === 'completed';
        return {
          ...t,
          status: newStatus,
          completed,
          progress: completed ? 100 : t.progress,
          activityLog: [
            ...(t.activityLog || []),
            {
              id: `act-${Math.random().toString(36).substring(2, 9)}`,
              action: 'status_updated',
              details: `Status set to ${newStatus}`,
              timestamp: 'Just now',
              userName: currentUser?.name || 'System'
            }
          ]
        };
      }
      return t;
    });

    const tasksDone = updatedTasks.filter(t => t.completed).length;
    const progress = project.tasksTotal > 0 ? Math.round((tasksDone / project.tasksTotal) * 100) : 0;

    const success = await updateProject(project.id, {
      tasks: updatedTasks,
      tasksDone,
      progress,
      status: progress === 100 ? 'Completed' : project.status
    });

    if (success) {
      addActivityLog(`Moved task to ${newStatus}`, 'Tasks', 'success');
      addToast('success', `Task moved to ${newStatus}.`);
      return updatedTasks.find(t => t.id === id);
    }
  };

  const addTask = async (taskData) => {
    let projectId = taskData.projectId;
    let project = projectsList.find(p => p.id === projectId);

    // If not found by ID, try finding by name (since Managers.jsx passes project name as taskData.project)
    if (!project && taskData.project) {
      project = projectsList.find(p => p.name === taskData.project);
    }

    // Fallback to first project if still not found
    if (!project) {
      project = projectsList[0];
    }

    if (!project) {
      addToast('error', 'Project not found');
      return;
    }

    projectId = project.id;
    const nextTaskId = `t-${projectId}-${project.tasks.length + 1}`;

    const assignee = employees.find(e => e.id === taskData.assigneeId);

    const newTask = {
      id: nextTaskId,
      title: taskData.title.trim(),
      completed: false,
      dueDate: taskData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: taskData.priority || 'Medium',
      status: 'To Do',
      overdue: false,
      assigneeId: taskData.assigneeId || '',
      assigneeName: assignee ? assignee.name : 'Unassigned',
      description: taskData.description || '',
      estimatedHours: Number(taskData.estimatedHours) || 20,
      progress: 0,
      comments: [],
      attachments: [],
      approvals: [
        { level: 1, role: 'Employee', approver: assignee ? assignee.name : 'Employee', status: 'Pending', timestamp: '', remarks: '' },
        { level: 2, role: 'Team Leader Approval', approver: project.leader || 'Team Leader', status: 'Pending', timestamp: '', remarks: '' },
        { level: 3, role: 'Project Manager Approval', approver: project.manager || 'Project Manager', status: 'Pending', timestamp: '', remarks: '' }
      ],
      activityLog: [
        { id: `act-${Math.random().toString(36).substring(2, 9)}`, action: 'created', details: `Task created`, timestamp: 'Just now', userName: currentUser?.name || 'System' }
      ]
    };

    const newTasks = [...project.tasks, newTask];
    const tasksTotal = project.tasksTotal + 1;
    const progress = Math.round((project.tasksDone / tasksTotal) * 100);

    const success = await updateProject(projectId, {
      tasks: newTasks,
      tasksTotal,
      progress
    });

    if (success) {
      addActivityLog(`Created task: "${newTask.title}"`, 'Tasks', 'success');
      addToast('success', 'Task created successfully.');

      // Trigger Automatic Notification
      await triggerAutomaticNotification('TSK-01', {
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${newTask.title}" in project "${project.name}". Due Date: ${newTask.dueDate || 'No due date'}.`,
        recipientId: newTask.assigneeId,
        recipientRole: 'employee',
        category: 'Project'
      });

      return newTask;
    }
  };

  const deleteTask = async (id) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === id));
    if (!project) return;

    const newTasks = project.tasks.filter(t => t.id !== id);
    const tasksTotal = Math.max(0, project.tasksTotal - 1);
    const tasksDone = newTasks.filter(t => t.completed).length;
    const progress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;

    const success = await updateProject(project.id, {
      tasks: newTasks,
      tasksTotal,
      tasksDone,
      progress,
      status: progress === 100 ? 'Completed' : project.status
    });

    if (success) {
      addActivityLog(`Deleted task "${id}"`, 'Tasks', 'danger');
      addToast('warning', `Task deleted.`);
    }
  };

  const reassignTask = async (taskId, assigneeId, assigneeName) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === taskId));
    if (!project) return;

    const assignee = employees.find(e => e.id === assigneeId);
    const updatedTasks = project.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          assigneeId,
          assigneeName,
          activityLog: [
            ...(t.activityLog || []),
            {
              id: `act-${Math.random().toString(36).substring(2, 9)}`,
              action: 'reassigned',
              details: `Reassigned to ${assigneeName}`,
              timestamp: 'Just now',
              userName: currentUser?.name || 'System'
            }
          ]
        };
      }
      return t;
    });

    const success = await updateProject(project.id, { tasks: updatedTasks });
    if (success) {
      addActivityLog(`Reassigned task ${taskId} to ${assigneeName}`, 'Tasks', 'info');
      addToast('info', `Task reassigned to ${assigneeName}`);
      return updatedTasks.find(t => t.id === taskId);
    }
  };

  const extendTaskDeadline = async (taskId, newDate) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === taskId));
    if (!project) return;

    const updatedTasks = project.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          dueDate: newDate,
          activityLog: [
            ...(t.activityLog || []),
            {
              id: `act-${Math.random().toString(36).substring(2, 9)}`,
              action: 'deadline_extended',
              details: `Deadline extended to ${newDate}`,
              timestamp: 'Just now',
              userName: currentUser?.name || 'System'
            }
          ]
        };
      }
      return t;
    });

    const success = await updateProject(project.id, { tasks: updatedTasks });
    if (success) {
      addActivityLog(`Extended deadline for task ${taskId} to ${newDate}`, 'Tasks', 'warning');
      addToast('success', `Extended deadline to ${newDate}`);
      return updatedTasks.find(t => t.id === taskId);
    }
  };

  const escalateTask = async (taskId) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === taskId));
    if (!project) return;

    const updatedTasks = project.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          priority: 'Critical',
          activityLog: [
            ...(t.activityLog || []),
            {
              id: `act-${Math.random().toString(36).substring(2, 9)}`,
              action: 'escalated',
              details: `Task escalated to Critical priority`,
              timestamp: 'Just now',
              userName: currentUser?.name || 'System'
            }
          ]
        };
      }
      return t;
    });

    const success = await updateProject(project.id, { tasks: updatedTasks });
    if (success) {
      addActivityLog(`Escalated task ${taskId} to Critical priority`, 'Tasks', 'danger');
      addToast('error', `Task ${taskId} escalated to Critical!`);
      return updatedTasks.find(t => t.id === taskId);
    }
  };

  const addTaskRemarks = async (taskId, remarks) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === taskId));
    if (!project) return;

    const updatedTasks = project.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          remarks,
          activityLog: [
            ...(t.activityLog || []),
            {
              id: `act-${Math.random().toString(36).substring(2, 9)}`,
              action: 'remarks_added',
              details: `Remarks added: ${remarks}`,
              timestamp: 'Just now',
              userName: currentUser?.name || 'System'
            }
          ]
        };
      }
      return t;
    });

    const success = await updateProject(project.id, { tasks: updatedTasks });
    if (success) {
      addToast('success', 'Remarks added to task.');
      return updatedTasks.find(t => t.id === taskId);
    }
  };

  const addTaskComment = async (taskId, text, senderName, senderRole) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === taskId));
    if (!project) return;

    const newComment = {
      id: `c-${Math.random().toString(36).substring(2, 9)}`,
      sender: senderName,
      role: senderRole,
      text,
      time: 'Just now'
    };

    const updatedTasks = project.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          comments: [...(t.comments || []), newComment],
          activityLog: [
            ...(t.activityLog || []),
            {
              id: `act-${Math.random().toString(36).substring(2, 9)}`,
              action: 'comment_added',
              details: `Comment added by ${senderName}`,
              timestamp: 'Just now',
              userName: senderName
            }
          ]
        };
      }
      return t;
    });

    const success = await updateProject(project.id, { tasks: updatedTasks });
    if (success) {
      addToast('success', 'Comment posted.');
      return updatedTasks.find(t => t.id === taskId);
    }
  };

  const approveTaskLevel = async (taskId, level, remarks, approverName) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === taskId));
    if (!project) return;

    const updatedTasks = project.tasks.map(t => {
      if (t.id !== taskId) return t;
      const updatedApprovals = (t.approvals || []).map(app => {
        if (app.level === level) {
          return {
            ...app,
            status: 'Approved',
            timestamp: 'Just now',
            remarks: remarks || 'Approved'
          };
        }
        return app;
      });

      let finalStatus = t.status || 'To Do';
      const allCompleted = updatedApprovals.every(app => app.status === 'Approved');
      if (allCompleted) {
        finalStatus = 'Done';
      } else if (level === 2) {
        finalStatus = 'In Review';
      }

      return {
        ...t,
        approvals: updatedApprovals,
        status: finalStatus,
        completed: allCompleted,
        progress: allCompleted ? 100 : t.progress,
        activityLog: [
          ...(t.activityLog || []),
          {
            id: `act-${Math.random().toString(36).substring(2, 9)}`,
            action: 'approval_approved',
            details: `Level ${level} approved by ${approverName || 'Approver'}`,
            timestamp: 'Just now',
            userName: approverName || 'Approver'
          }
        ]
      };
    });

    const tasksDone = updatedTasks.filter(t => t.completed).length;
    const progress = project.tasksTotal > 0 ? Math.round((tasksDone / project.tasksTotal) * 100) : 0;

    const success = await updateProject(project.id, {
      tasks: updatedTasks,
      tasksDone,
      progress,
      status: progress === 100 ? 'Completed' : project.status
    });

    if (success) {
      addToast('success', `Level ${level} Approval submitted.`);
      return updatedTasks.find(t => t.id === taskId);
    }
  };

  const rejectTaskLevel = async (taskId, level, remarks, approverName) => {
    const project = projectsList.find(p => p.tasks.some(t => t.id === taskId));
    if (!project) return;

    const updatedTasks = project.tasks.map(t => {
      if (t.id !== taskId) return t;
      const updatedApprovals = (t.approvals || []).map(app => {
        if (app.level === level) {
          return {
            ...app,
            status: 'Rejected',
            timestamp: 'Just now',
            remarks: remarks || 'Rejected'
          };
        }
        return app;
      });

      return {
        ...t,
        approvals: updatedApprovals,
        status: 'To Do',
        completed: false,
        activityLog: [
          ...(t.activityLog || []),
          {
            id: `act-${Math.random().toString(36).substring(2, 9)}`,
            action: 'approval_rejected',
            details: `Level ${level} rejected by ${approverName || 'Approver'}`,
            timestamp: 'Just now',
            userName: approverName || 'Approver'
          }
        ]
      };
    });

    const tasksDone = updatedTasks.filter(t => t.completed).length;
    const progress = project.tasksTotal > 0 ? Math.round((tasksDone / project.tasksTotal) * 100) : 0;

    const success = await updateProject(project.id, {
      tasks: updatedTasks,
      tasksDone,
      progress,
      status: progress === 100 ? 'Completed' : project.status
    });

    if (success) {
      addToast('error', `Approval rejected at Level ${level}.`);
      return updatedTasks.find(t => t.id === taskId);
    }
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const active = tasks.filter(t => t.status === 'In Progress' || t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'Done' || t.status === 'done').length;
    const pending = tasks.filter(t => t.status === 'To Do' || t.status === 'todo').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => t.dueDate < todayStr && t.status !== 'Done' && t.status !== 'done').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, active, completed, pending, overdue, completionRate };
  };

  const getEmployeeTaskSummary = (employeeId) => {
    const empTasks = tasks.filter(t => t.assigneeId === employeeId);
    const assigned = empTasks.length;
    const completed = empTasks.filter(t => t.status === 'Done' || t.status === 'done').length;
    const pending = empTasks.filter(t => t.status !== 'Done' && t.status !== 'done').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = empTasks.filter(t => t.dueDate < todayStr && t.status !== 'Done' && t.status !== 'done').length;
    const productivity = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    return { assigned, completed, pending, overdue, productivity };
  };

  const getTeamTaskRanking = () => {
    const teamMap = {};
    employees.forEach(emp => {
      if (!emp.team) return;
      if (!teamMap[emp.team]) {
        teamMap[emp.team] = {
          name: emp.team,
          leader: emp.teamLeader || 'Unassigned',
          totalTasks: 0,
          completedTasks: 0
        };
      }
      const empStats = getEmployeeTaskSummary(emp.id);
      teamMap[emp.team].totalTasks += empStats.assigned;
      teamMap[emp.team].completedTasks += empStats.completed;
    });

    return Object.values(teamMap).map(t => {
      const productivity = t.totalTasks > 0 ? Math.round((t.completedTasks / t.totalTasks) * 100) : 0;
      return { ...t, productivity };
    }).sort((a, b) => b.productivity - a.productivity);
  };

  const getDepartmentTaskAnalytics = () => {
    const deptMap = {};
    const activeDeptNames = new Set((departments || []).filter(d => d.status === 'Active').map(d => d.name));
    employees.forEach(emp => {
      if (!emp.department || !activeDeptNames.has(emp.department)) return;
      if (!deptMap[emp.department]) {
        deptMap[emp.department] = {
          department: emp.department,
          totalTasks: 0,
          completed: 0,
          pending: 0
        };
      }
      const empStats = getEmployeeTaskSummary(emp.id);
      deptMap[emp.department].totalTasks += empStats.assigned;
      deptMap[emp.department].completed += empStats.completed;
      deptMap[emp.department].pending += empStats.pending;
    });

    return Object.values(deptMap).map(d => {
      const completionRate = d.totalTasks > 0 ? Math.round((d.completed / d.totalTasks) * 100) : 0;
      return { ...d, completionRate };
    });
  };

  const getWorkloadDistribution = () => {
    return employees.map(emp => {
      const stats = getEmployeeTaskSummary(emp.id);
      let workloadStatus = 'Normal';
      if (stats.assigned > 20) workloadStatus = 'Overloaded';
      else if (stats.assigned >= 16) workloadStatus = 'High';
      else if (stats.assigned >= 11) workloadStatus = 'Balanced';
      return {
        id: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        assignedTasks: stats.assigned,
        pendingTasks: stats.pending,
        overdueTasks: stats.overdue,
        workloadStatus
      };
    });
  };

  // Payroll Handlers
  const runPayroll = (month, year) => {
    bulkUpdatePayrollStatus(month, year, 'release');
  };

  const generatePayslip = (employeeName) => {
    addToast('success', `Payslip generated for ${employeeName}. Sent to Document Vault.`);
  };

  const addOrUpdateSalaryGrade = async (gradeForm) => {
    if (!token) return false;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gradeForm)
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`${gradeForm.id ? 'Updated' : 'Created'} salary grade ${gradeForm.grade}`, 'Payroll', 'success');
        addToast('success', `Salary grade saved successfully.`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to save salary grade.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error saving salary grade.');
      return false;
    }
  };

  const deleteSalaryGrade = async (id) => {
    if (!token) return false;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/payroll/grades/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Deleted salary grade ${id}`, 'Payroll', 'warning');
        addToast('success', 'Salary grade deleted successfully.');
        return true;
      } else {
        addToast('danger', result.message || 'Failed to delete salary grade.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error deleting salary grade.');
      return false;
    }
  };

  const createLoanOrAdvance = async (applyForm) => {
    if (!token) return false;
    try {
      const emp = employees.find(e => e.id === applyForm.employeeId);
      const payload = {
        ...applyForm,
        employeeName: emp ? emp.name : 'Unknown Employee',
        remainingBalance: applyForm.amount,
        progress: 0,
        status: 'Approved'
      };
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/loans-advances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Created ${applyForm.type} for ${payload.employeeName}`, 'Payroll', 'success');
        addToast('success', `${applyForm.type} created successfully.`);
        return true;
      } else {
        addToast('danger', result.message || `Failed to create ${applyForm.type}.`);
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error creating loan or advance.');
      return false;
    }
  };

  const recommendBonus = async (bonusForm) => {
    if (!token) return false;
    try {
      const emp = employees.find(e => e.id === bonusForm.employeeId);
      const payload = {
        ...bonusForm,
        employeeName: emp ? emp.name : 'Unknown Employee',
        requestDate: new Date().toISOString().split('T')[0],
        status: 'Pending',
        approvalFlow: ['TL Approved']
      };
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/bonuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Recommended bonus for ${payload.employeeName}`, 'Payroll', 'success');
        addToast('success', 'Bonus recommendation submitted successfully.');
        return true;
      } else {
        addToast('danger', result.message || 'Failed to submit bonus recommendation.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error submitting bonus recommendation.');
      return false;
    }
  };

  const updateReimbursementStatus = async (id, newStatus) => {
    if (!token) return false;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/payroll/reimbursements/status/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Updated reimbursement ${id} status to ${newStatus}`, 'Payroll', 'success');
        addToast('success', `Reimbursement ${id} set to: ${newStatus}`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to update reimbursement status.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error updating reimbursement status.');
      return false;
    }
  };

  const updateBonusStatus = async (id, newStatus) => {
    if (!token) return false;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/payroll/bonuses/status/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Updated bonus ${id} status to ${newStatus}`, 'Payroll', 'success');
        addToast('success', `Bonus ${id} status updated: ${newStatus}`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to update bonus status.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error updating bonus status.');
      return false;
    }
  };

  const processPayrollCalculations = async (month, year, calculatedData) => {
    if (!token) return false;
    try {
      const promises = calculatedData.map(payment => {
        return fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...payment,
            month,
            year
          })
        });
      });
      await Promise.all(promises);
      await fetchPayrollData();
      addActivityLog(`Processed payroll for ${month} ${year}`, 'Payroll', 'success');
      addToast('success', `Recalculated salary figures and verified attendance links for ${month} ${year}.`);
      return true;
    } catch (err) {
      console.error('Failed to process payroll:', err);
      addToast('danger', 'Error processing payroll.');
      return false;
    }
  };

  const bulkUpdatePayrollStatus = async (month, year, actionType, calculatedData = []) => {
    if (!token) return false;
    let nextStatus = 'Calculated';
    if (actionType === 'verify') nextStatus = 'HR Verified';
    if (actionType === 'approve') nextStatus = 'Finance Approved';
    if (actionType === 'release') nextStatus = 'Released';
    if (actionType === 'hold') nextStatus = 'Hold';

    try {
      // 1. First ensure all draft records are created in the database
      const promises = calculatedData.map(payment => {
        return fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...payment,
            month,
            year,
            status: nextStatus
          })
        });
      });
      await Promise.all(promises);

      // 2. Call the bulk status update to align everything
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/payments/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ month, year, status: nextStatus })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Bulk Action: ${actionType} for ${month} ${year}`, 'Payroll', 'success');
        addToast('success', `Successfully processed bulk action: ${actionType.toUpperCase()}`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to perform bulk action.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error during bulk action.');
      return false;
    }
  };

  const updateSinglePayrollStatus = async (paymentObj, status) => {
    if (!token) return false;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...paymentObj,
          status
        })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Updated payroll status for ${paymentObj.employeeId} to ${status}`, 'Payroll', 'success');
        addToast('info', `Status of employee ${paymentObj.employeeId} set to: ${status}`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to update employee payroll status.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error updating employee payroll status.');
      return false;
    }
  };

  const toggleEmployeeTaxRegime = async (empId) => {
    if (!token) return false;
    const current = payrollConfigs.taxProfiles[empId] || { pan: 'AAAPS1234F', regime: 'New', taxableIncome: 900000 };
    const nextRegime = current.regime === 'New' ? 'Old' : 'New';
    const updatedTaxProfiles = {
      ...payrollConfigs.taxProfiles,
      [empId]: { ...current, regime: nextRegime }
    };
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...payrollConfigs,
          taxProfiles: updatedTaxProfiles
        })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Toggled tax regime for ${empId} to ${nextRegime}`, 'Payroll', 'success');
        addToast('success', `Tax regime toggled for ${empId} to ${nextRegime}.`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to toggle tax regime.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error toggling tax regime.');
      return false;
    }
  };

  const savePayrollSalaryRevision = async (empId, newBasic) => {
    if (!token) return false;
    const emp = employees.find(e => e.id === empId);
    const empBasic = Number(emp?.salaryAmount) || 0;
    const current = payrollConfigs.salaryStructures[empId] || { basic: empBasic };
    const updatedSalaryStructures = {
      ...payrollConfigs.salaryStructures,
      [empId]: {
        ...current,
        basic: parseInt(newBasic),
        hra: Math.round(parseInt(newBasic) * 0.4),
        pf: Math.round(parseInt(newBasic) * 0.12),
        tds: Math.round(parseInt(newBasic) * 0.1)
      }
    };
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...payrollConfigs,
          salaryStructures: updatedSalaryStructures
        })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog(`Revised salary for ${empId} to ${newBasic}`, 'Payroll', 'success');
        addToast('success', `Revised salary for ${empId} successfully.`);
        return true;
      } else {
        addToast('danger', result.message || 'Failed to revise salary.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error revising salary.');
      return false;
    }
  };

  const updatePayrollConfig = async (configs) => {
    if (!token) return false;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/payroll/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...payrollConfigs,
          ...configs
        })
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchPayrollData();
        addActivityLog('Updated global payroll configuration settings', 'Payroll', 'success');
        addToast('success', 'Global payroll configurations updated successfully.');
        return true;
      } else {
        addToast('danger', result.message || 'Failed to update configurations.');
        return false;
      }
    } catch (err) {
      console.error(err);
      addToast('danger', 'Error updating configurations.');
      return false;
    }
  };

  // Daily Work Reports Handlers

  const updateDailyReportStatus = async (id, status, feedback) => {
    if (!token) return;
    try {
      const report = dailyReports.find(r => r.id === id);
      if (!report) {
        addToast('danger', `Report ${id} not found.`);
        return;
      }

      const actionLabel = status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : status === 'Changes Requested' ? 'Requested Changes' : 'Escalated';
      const updatedHistory = [
        ...(report.approvalHistory || []),
        {
          role: currentUserRole === 'team_leader' ? 'Team Leader' : currentUserRole === 'manager' ? 'Project Manager' : 'Admin',
          user: currentUser?.name || 'Manager',
          action: actionLabel,
          timestamp: new Date().toISOString(),
          comments: feedback || ''
        }
      ];

      const calculatedProd = Math.round((report.tasksCompleted / Math.max(1, report.tasksAssigned)) * 100);
      const newProductivityScore = status === 'Approved' ? calculatedProd : Math.round(calculatedProd * 0.7);

      const payload = {
        status,
        feedback: feedback || report.feedback,
        productivityScore: newProductivityScore,
        approvalHistory: updatedHistory
      };

      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/work-reports/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        const updatedReport = result.data;
        setDailyReports(prev =>
          prev.map(r => (r.id === id ? updatedReport : r))
        );
        addActivityLog(`Updated report ${id} status to ${status}`, 'Work Reports', 'success');
        addToast('success', `Report ${id} successfully updated to ${status}.`);

        // Trigger Automatic Notification for work report review status update
        await triggerAutomaticNotification('TSK-03', {
          title: 'Daily Work Report Status Updated',
          message: `Your daily work report for ${updatedReport.date} has been reviewed and marked as "${status}". Feedback: ${feedback || 'None'}`,
          recipientId: updatedReport.employeeId,
          recipientRole: 'employee',
          category: 'Project'
        });

        return updatedReport;
      } else {
        addToast('danger', result.message || 'Failed to update report status.');
      }
    } catch (err) {
      console.error('Failed to update report status on backend:', err);
      addToast('danger', 'Error updating report status.');
    }
  };


  // Role Permissions Handler
  const updatePermissions = async (roleId, updatedPermissions) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: updatedPermissions })
      });
      const result = await response.json();
      if (result.status === 'success') {
        fetchRoles();
        addActivityLog(`Modified system permissions for role: ${roleId}`, 'Permissions', 'success');
        addToast('success', 'Permission saved automatically.');
        return result.data;
      } else {
        addToast('danger', result.message || 'Failed to update permissions.');
      }
    } catch (err) {
      console.error('Error updating permissions:', err);
      addToast('danger', 'Error updating permissions in database.');
    }
  };

  // Notifications Handlers
  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('info', 'All notifications marked as read.');
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => {
        return fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/${n.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ read: true, readStatus: 'Read', readTime: 'Just now' })
        });
      }));
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ read: true, readStatus: 'Read', readTime: 'Just now' })
      });
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Check RBAC permission helper with Overrides support
  const hasPermission = (module, action) => {
    const normalizedRole = (currentUserRole || '').toLowerCase();
    
    // Super admin and company admin have permission for everything
    if (
      normalizedRole === 'super_admin' || 
      normalizedRole === 'company_admin' || 
      normalizedRole.endsWith('_company_admin') || 
      normalizedRole.endsWith('_super_admin')
    ) {
      return true;
    }

    // 1. Check User Overrides first
    const activeUserId = currentUserId || currentUser?.id;
    if (activeUserId && userOverrides && userOverrides.length > 0) {
      // Find matching overrides for this user and module
      const userOvs = userOverrides.filter(ov => {
        if (ov.userId !== activeUserId) return false;

        // Normalize names
        const ovModule = (ov.module || '').toLowerCase();
        const targetModule = (module || '').toLowerCase();

        // Match base module names
        const matchPayroll = ovModule.includes('payroll') && targetModule.includes('payroll');
        const matchLeave = ovModule.includes('leave') && targetModule.includes('leave');
        const matchEmployee = ovModule.includes('employee') && targetModule.includes('employee');
        const matchTask = (ovModule.includes('project') || ovModule.includes('task')) && (targetModule.includes('task') || targetModule.includes('project'));
        const matchPermission = (ovModule.includes('permission') || ovModule.includes('role')) && targetModule.includes('permission');
        const matchSetting = ovModule.includes('setting') && targetModule.includes('setting');
        const matchAttendance = ovModule.includes('attendance') && targetModule.includes('attendance');
        const matchDashboard = ovModule.includes('dashboard') && targetModule.includes('dashboard');

        return matchPayroll || matchLeave || matchEmployee || matchTask || matchPermission || matchSetting || matchAttendance || matchDashboard || ovModule === targetModule;
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
          if (type.includes('deny') || type.includes('denial') || scope.includes('none') || scope.includes('restricted')) {
            return false;
          }

          // Temporary Grant overrides default role settings
          if (type.includes('grant') || type.includes('allow') || scope.includes('read') || scope.includes('write') || scope.includes('full')) {
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

    // Map frontend module keys to backend DB permission keys
    const MODULE_MAPPING = {
      'employee_management': 'employees',
      'attendance_management': 'attendance',
      'leave_management': 'leaves',
      'payroll_management': 'payroll',
      'department_management': 'departments',
      'agency_branch_management': 'branches',
      'project_management': 'projects',
      'task_monitoring': 'tasks',
      'team_management': 'teams',
      'system_settings': 'settings',
      'document_management': 'documents',
      'notifications': 'notifications'
    };

    const dbKey = MODULE_MAPPING[module] || module;
    const isDbBacked = Object.values(MODULE_MAPPING).includes(dbKey) || Object.keys(MODULE_MAPPING).includes(module);

    if (isDbBacked) {
      const roleObj = roles.find(r => r.id === currentUserRole);
      const permissions = roleObj?.permissions;
      const dbPermission = permissions
        ? (permissions[module] !== undefined ? permissions[module] : permissions[dbKey])
        : undefined;

      if (dbPermission !== undefined) {
        const res = !!dbPermission?.[action];
        console.log('hasPermission DB-backed details:', {
          module,
          dbKey,
          action,
          currentUserRole,
          result: res
        });
        return res;
      }
    }

    // Fallback: Resolve required role and use hierarchy check if module is not DB-backed or is not found in roles Obj
    const route = Object.keys(PATH_TO_MODULE).find(key => PATH_TO_MODULE[key] === module);
    if (route) {
      const requiredRole = getRequiredRoleForPath(route);
      const res = hasRoleAccess(currentUserRole, requiredRole);
      console.log('hasPermission fallback hierarchy details:', {
        module,
        action,
        currentUserRole,
        requiredRole,
        result: res
      });
      return res;
    }

    return true;
  };


  // Memoize the normalized employees array to prevent creating a new reference
  // on every render, which would cause all context consumers to re-render infinitely.
  // Also dynamically resolve branch and department for manager roles.
  const memoizedEmployees = useMemo(() => {
    return (employees || []).map(emp => {
      const normalized = normalizeEmployee(emp);
      if (normalized && (normalized.roleId === 'manager' || normalized.role === 'Manager')) {
        const hasNoBranch = !normalized.branch || normalized.branch === '—' || normalized.branch === '-';
        if (hasNoBranch) {
          const foundBranch = (branches || []).find(
            b => (b.managerId && b.managerId === normalized.id) || (b.manager && b.manager.trim().toLowerCase() === normalized.name.trim().toLowerCase())
          );
          if (foundBranch) {
            normalized.branch = foundBranch.name;
            normalized.branchAgency = foundBranch.name;
          }
        }
      }
      return normalized;
    });
  }, [employees, branches, departments]);

  const memoizedCurrentUser = useMemo(() => {
    if (!currentUser) return null;
    const normalized = normalizeEmployee(currentUser);
    if (normalized && (normalized.roleId === 'manager' || normalized.role === 'Manager')) {
      const hasNoBranch = !normalized.branch || normalized.branch === '—' || normalized.branch === '-';
      if (hasNoBranch) {
        const foundBranch = (branches || []).find(
          b => (b.managerId && b.managerId === normalized.id) || (b.manager && b.manager.trim().toLowerCase() === normalized.name.trim().toLowerCase())
        );
        if (foundBranch) {
          normalized.branch = foundBranch.name;
          normalized.branchAgency = foundBranch.name;
        }
      }
    }
    return normalized;
  }, [currentUser, branches, departments]);


  return (
    <AppContext.Provider
      value={{
        employees: memoizedEmployees,
        branches,
        addBranch,
        updateBranch,
        deleteBranch,
        departments,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        teams,
        addTeam,
        updateTeam,
        deleteTeam,
        projectsList,
        addProject,
        updateProject,
        deleteProject,
        attendance,
        leaveRequests,
        tasks,
        payroll,
        payrollGrades,
        payrollReimbursements,
        payrollLoans,
        payrollAdvances,
        payrollBonuses,
        payrollPayments,
        payrollConfigs,
        fetchPayrollData,
        addOrUpdateSalaryGrade,
        deleteSalaryGrade,
        createLoanOrAdvance,
        recommendBonus,
        updateReimbursementStatus,
        updateBonusStatus,
        processPayrollCalculations,
        bulkUpdatePayrollStatus,
        updateSinglePayrollStatus,
        toggleEmployeeTaxRegime,
        savePayrollSalaryRevision,
        updatePayrollConfig,
        token,
        setToken,
        notifications,
        setNotifications,
        fetchNotifications,
        addNotification,
        triggerAutomaticNotification,
        updateNotification,
        deleteNotification,
        documentsList,
        fetchDocuments,
        addDocument,
        deleteDocument,
        activityLogs,
        addActivityLog,
        fetchActivityLogs,
        roles,
        fetchRoles,
        addRole,
        updateRole,
        deleteRole,
        userOverrides,
        fetchUserOverrides,
        addUserOverride,
        deleteUserOverride,
        dailyReports,
        setDailyReports,
        updateDailyReportStatus,
        appraisalReviews,
        addAppraisalReview,
        toasts,
        confirmDialog,
        commandPaletteOpen,
        currentUserRole,
        sidebarCollapsed,
        currentUser: memoizedCurrentUser,
        setCurrentUserRole,
        initialized,

        setSidebarCollapsed,
        setCommandPaletteOpen,
        addToast,
        showConfirm,
        closeConfirm,
        addEmployee,
        updateEmployee,
        deactivateEmployee,
        activateEmployee,
        bulkAssignRole,
        bulkTransferDept,
        bulkUpdateStatus,
        bulkAllocateLeave,
        bulkSendNotification,
        approveLeaveRequest,
        rejectLeaveRequest,
        applyLeave,
        addLeaveRequest,
        updateLeaveRequest,
        fetchLeaves,
        leavePolicyConfigs,
        addLeavePolicy,
        updateLeavePolicy,
        deleteLeavePolicy,
        resetLeavePolicies,
        holidaysList,
        addHoliday,
        deleteHoliday,
        updateTaskStatus,
        updateTaskProgress,
        addTask,
        deleteTask,
        reassignTask,
        extendTaskDeadline,
        escalateTask,
        addTaskRemarks,
        addTaskComment,
        approveTaskLevel,
        rejectTaskLevel,
        getTaskStats,
        getEmployeeTaskSummary,
        getTeamTaskRanking,
        getDepartmentTaskAnalytics,
        getWorkloadDistribution,
        updateAttendanceRecord,
        addAttendanceRecord,
        runPayroll,
        generatePayslip,
        updatePermissions,
        permissionModules,
        addPermissionModule,
        deletePermissionModule,
        markAllNotificationsRead,
        markNotificationRead,
        hasPermission,
        theme,
        toggleTheme,
        setThemeMode,
        accentColor,
        setAccentColor,
        fontSize,
        setFontSize,
        sidebarDense,
        setSidebarDense,
        generalSettings,
        setGeneralSettings,
        notificationSettings,
        setNotificationSettings,
        securitySettings,
        setSecuritySettings,
        attendanceRules,
        setAttendanceRules,
        saveSystemSettings,
        messages,
        markMessageRead,
        markAllMessagesRead,
        login,
        logout,
        fetchAttendance,
        fetchEmployees,
        fetchBranches,
        fetchDepartments,
        fetchTeams,
        announcementsList,
        emergencyAlert,
        announcementTrackingLogs,
        announcementAuditLogs,
        fetchAnnouncements,
        fetchEmergencyAlert,
        fetchAnnouncementTracking,
        fetchAnnouncementAudits,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        acknowledgeAnnouncement,
        likeAnnouncement,
        addAnnouncementComment,
        deleteAnnouncementComment,
        triggerEmergencyAlert,
        viewAnnouncement
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
