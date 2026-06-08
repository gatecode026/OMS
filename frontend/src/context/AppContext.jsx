import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  mockAttendance,
  mockLeaveRequests,
  mockTasks,
  mockPayroll,
  mockNotifications,
  mockActivityLogs,
  mockRoles,
  mockDailyReports
} from '../data/mockData';


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

  // 7. Punch In Time / todayPunchIn / punchInTime / punchIn
  const pIn = normalized.punchInTime || normalized.todayPunchIn || normalized.punchIn;
  normalized.punchInTime = pIn;
  normalized.todayPunchIn = pIn;
  normalized.punchIn = pIn;

  // 8. Punch Out Time / todayPunchOut / punchOutTime / punchOut
  const pOut = normalized.punchOutTime || normalized.todayPunchOut || normalized.punchOut;
  normalized.punchOutTime = pOut;
  normalized.todayPunchOut = pOut;
  normalized.punchOut = pOut;

  // 9. Working Hours / todayWorkingHours / workingHours / totalHours
  const hrs = normalized.workingHours || normalized.todayWorkingHours || normalized.totalHours;
  normalized.workingHours = hrs;
  normalized.todayWorkingHours = hrs;
  normalized.totalHours = hrs;

  // 10. Attendance Status / attendanceStatus / todayPunchStatus / status
  const att = normalized.attendanceStatus || normalized.status || normalized.todayPunchStatus;
  normalized.attendanceStatus = att;
  normalized.status = att;
  normalized.todayPunchStatus = att;

  // 11. Employment Status / accountStatus / employmentStatus
  const est = normalized.employmentStatus || normalized.accountStatus;
  normalized.employmentStatus = est;
  normalized.accountStatus = est;

  // Address Parsing
  if (typeof normalized.currentAddress === 'string') {
    const parts = normalized.currentAddress.split(', ');
    normalized.currentAddress = {
      line1: parts[0] || normalized.currentAddress,
      city: parts[1] || 'Jaipur',
      state: parts[2] ? parts[2].split(' - ')[0] : 'Rajasthan',
      country: 'India',
      pincode: parts[2] ? parts[2].split(' - ')[1] : '302015'
    };
  } else if (!normalized.currentAddress) {
    normalized.currentAddress = { line1: '12 Lal Kothi', city: 'Jaipur', state: 'Rajasthan', country: 'India', pincode: '302015' };
  }

  if (typeof normalized.permanentAddress === 'string') {
    const parts = normalized.permanentAddress.split(', ');
    normalized.permanentAddress = {
      line1: parts[0] || normalized.permanentAddress,
      city: parts[1] || 'Jaipur',
      state: parts[2] ? parts[2].split(' - ')[0] : 'Rajasthan',
      country: 'India',
      pincode: parts[2] ? parts[2].split(' - ')[1] : '302015'
    };
  } else if (!normalized.permanentAddress) {
    normalized.permanentAddress = { line1: '12 Lal Kothi', city: 'Jaipur', state: 'Rajasthan', country: 'India', pincode: '302015' };
  }

  // Emergency Contact
  normalized.emergencyName = normalized.emergencyContactName || normalized.emergencyName || 'Priya Sharma';
  normalized.emergencyRelation = normalized.emergencyRelation || 'Spouse';
  normalized.emergencyMobile = normalized.emergencyContactPhone || normalized.emergencyMobile || '+91 98001 00001';

  // Banking
  normalized.bank = normalized.bank || {
    accountName: normalized.name,
    bankName: normalized.bankName || 'HDFC Bank',
    branch: normalized.bankBranch || 'Jaipur Main',
    accountNumber: normalized.bankAccountNumber || '1234567890',
    ifsc: normalized.bankIfscCode || 'HDFC0001234',
    upiId: normalized.bankUpiId || '',
    verified: true
  };

  // Documents
  normalized.documents = normalized.documents || [
    { id: 'doc1', type: 'aadhaar', name: 'Aadhaar Card', status: 'verified', uploadedAt: '2025-02-01' },
    { id: 'doc2', type: 'pan', name: 'PAN Card', status: 'verified', uploadedAt: '2025-02-01' },
    { id: 'doc3', type: 'offer_letter', name: 'Offer Letter', status: 'available', uploadedAt: '2025-01-15' }
  ];

  // Activities
  normalized.activities = normalized.activities || [
    { id: 'act1', date: '2026-06-05', action: 'Photo Updated', details: 'Profile photo changed' },
    { id: 'act2', date: '2026-06-04', action: 'Bank Verified', details: 'Bank account verified by admin' },
    { id: 'act3', date: '2026-06-02', action: 'Password Changed', details: 'Security update' }
  ];

  // MFA
  normalized.mfaEnabled = normalized.mfaEnabled || { email: true, mobile: true, authenticator: false };

  // General fields
  normalized.photoUrl = normalized.photoUrl || normalized.avatar || null;
  normalized.dob = normalized.dob || '1995-03-15';
  normalized.maritalStatus = normalized.maritalStatus || 'Married';
  normalized.bloodGroup = normalized.bloodGroup || 'O+';
  normalized.nationality = normalized.nationality || 'Indian';
  normalized.officialEmail = normalized.officialEmail || normalized.email || '';
  normalized.officialMobile = normalized.officialMobile || normalized.phone || '';
  normalized.teamName = normalized.teamName || normalized.team || 'Operations Core';

  // 12. Individual Leave Balances
  normalized.clBalance = typeof normalized.clBalance === 'number' ? normalized.clBalance : 8;
  normalized.slBalance = typeof normalized.slBalance === 'number' ? normalized.slBalance : 12;
  normalized.plBalance = typeof normalized.plBalance === 'number' ? normalized.plBalance : 15;
  normalized.maternityBalance = typeof normalized.maternityBalance === 'number' ? normalized.maternityBalance : (normalized.gender === 'Female' ? 180 : 0);

  return normalized;
};

export const AppProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token') || '');
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leavePolicyConfigs, setLeavePolicyConfigs] = useState([]);
  const [holidaysList, setHolidaysList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const tasks = React.useMemo(() => {
    if (!projectsList) return [];
    const aggregatedTasks = [];
    projectsList.forEach(proj => {
      if (proj.tasks) {
        proj.tasks.forEach(t => {
          aggregatedTasks.push({
            ...t,
            project: proj.name,
            projectId: proj.id,
            projectName: proj.name,
            department: proj.department || 'Engineering',
            assigneeId: t.assigneeId || 'EMP-2026-003',
            assigneeName: t.assigneeName || proj.leader || 'Unassigned',
            description: t.description || '',
            estimatedHours: t.estimatedHours || 20,
            status: t.status || (t.completed ? 'Done' : 'To Do'),
            progress: t.progress !== undefined ? t.progress : (t.completed ? 100 : 0),
            comments: t.comments || [],
            attachments: t.attachments || [],
            approvals: t.approvals && t.approvals.length > 0 ? t.approvals : [
              { level: 1, role: 'Employee', approver: t.assigneeName || proj.leader || 'Employee', status: t.completed ? 'Approved' : 'Pending', timestamp: '', remarks: '' },
              { level: 2, role: 'Team Leader Approval', approver: proj.leader || 'Team Leader', status: t.completed ? 'Approved' : 'Pending', timestamp: '', remarks: '' },
              { level: 3, role: 'Project Manager Approval', approver: proj.manager || 'Project Manager', status: t.completed ? 'Approved' : 'Pending', timestamp: '', remarks: '' },
              { level: 4, role: 'Super Admin Approval', approver: 'Aarav Sharma', status: t.completed ? 'Approved' : 'Pending', timestamp: '', remarks: '' }
            ],
            activityLog: t.activityLog || [
              { id: `act-${Math.random().toString(36).substring(2, 9)}`, action: 'created', details: `Task created`, timestamp: 'Just now', userName: 'System' }
            ]
          });
        });
      }
    });
    return aggregatedTasks;
  }, [projectsList]);
  const [payroll, setPayroll] = useState(mockPayroll);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activityLogs, setActivityLogs] = useState(mockActivityLogs);
  const [roles, setRoles] = useState(mockRoles);
  const [dailyReports, setDailyReports] = useState(mockDailyReports);

  // Shell Features States
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmType: 'primary', // 'primary', 'danger', 'warning'
    onConfirm: () => {},
    onCancel: () => {}
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
      companyName: 'Office Management Pvt. Ltd.',
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

  // Messages states
  const [messages, setMessages] = useState([
    { id: 'msg-1', sender: 'Ananya Gupta', text: 'Hey Aarav, the frontend lazy route changes are live in production. Please check.', time: '10m ago', unread: true },
    { id: 'msg-2', sender: 'Vikram Singh', text: 'Can you review the leave request I submitted yesterday? Need to travel next week.', time: '1h ago', unread: true },
    { id: 'msg-3', sender: 'Neha Verma', text: 'Draft payroll calculations for May are ready in the dashboard.', time: '5h ago', unread: false }
  ]);

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
    }
    // Sync current user when role changes to demonstrate RBAC
    const userMap = {
      super_admin: employees.find(e => e.roleId === 'super_admin') || employees[0],
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

  // Auth Actions
  const login = async (email, password) => {
    if (!email || email.trim().length === 0) {
      throw new Error('Email address cannot be empty.');
    }
    if (!password || password.trim().length === 0) {
      throw new Error('Password cannot be empty.');
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
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
    sessionStorage.removeItem('saas_token');

    setCurrentUserRole('super_admin');
    setCurrentUserId('');
    setCurrentUser(null);
    setToken('');
  };

  const fetchEmployees = async () => {
    if (!token) {
      setEmployees([]);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/v1/employees', {
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

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const fetchBranches = async () => {
    if (!token) {
      setBranches([]);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/v1/branches', {
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
      const response = await fetch('http://localhost:5000/api/v1/departments', {
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
      const response = await fetch('http://localhost:5000/api/v1/teams', {
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
      const response = await fetch('http://localhost:5000/api/v1/projects', {
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
      const response = await fetch('http://localhost:5000/api/v1/attendance', {
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
      const response = await fetch('http://localhost:5000/api/v1/leaves', {
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
      const response = await fetch('http://localhost:5000/api/v1/leaves/policies', {
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
      const response = await fetch('http://localhost:5000/api/v1/holidays', {
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

  useEffect(() => {
    fetchAttendance();
    fetchLeaves();
    fetchLeavePolicies();
    fetchHolidays();
  }, [token]);

  // Real-time polling for attendance logs and employee statuses every 5 seconds
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchAttendance();
      fetchEmployees();
      fetchLeaves();
      fetchHolidays();
      fetchProjects();
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Toast Handler
  const addToast = (type, message) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
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
  const addActivityLog = (action, module, status = 'success') => {
    const newLog = {
      id: `LOG-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      employeeName: currentUser?.name || 'System User',
      department: currentUser?.department || 'Operations',
      action,
      module,
      timestamp: 'Just now',
      status
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // Employee CRUD Handlers
  const addEmployee = async (newEmp) => {
    const year = newEmp.joinDate ? new Date(newEmp.joinDate).getFullYear() : new Date().getFullYear();
    const generatedId = `EMP-${year}-${100 + employees.length}`;
    const [firstName, ...restParts] = (newEmp.name || '').split(' ');
    const lastName = restParts.join('') || 'user';
    const defaultWorkEmail = firstName ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@saas.io` : `emp.${employees.length + 1}@saas.io`;
    const defaultPersonalEmail = firstName ? `${firstName.toLowerCase()}${lastName.toLowerCase()}${employees.length}@gmail.com` : `emp.${employees.length + 1}@gmail.com`;

    const entry = {
      ...newEmp,
      id: newEmp.id || generatedId,
      status: newEmp.status || 'Active',
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
      documents: [],
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
      productivityScore: newEmp.productivityScore || 75,
      performanceRating: newEmp.performanceRating || 'Good',
      leaveBalance: newEmp.leaveBalance || 15,
      currentProjectsCount: newEmp.currentProjectsCount || 0,
      experience: newEmp.experience || 0,
      shift: newEmp.shift || 'Morning (09:00 AM - 06:00 PM)',
      todayPunchIn: '09:02 AM',
      todayPunchOut: '06:15 PM',
      todayWorkingHours: 8.2,
      todayPunchStatus: 'Punched In',
      lastSeen: 'Just now'
    };

    try {
      const response = await fetch('http://localhost:5000/api/v1/employees', {
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
        addToast('success', `Employee ${savedEmp.name} created successfully!`);
        
        // Increment User Count in Role Card
        setRoles(prev =>
          prev.map(r => (r.id === newEmp.roleId ? { ...r, userCount: r.userCount + 1 } : r))
        );
      } else {
        addToast('error', result.message || 'Failed to save employee to database');
      }
    } catch (err) {
      console.error('Error creating employee:', err);
      addToast('error', 'Network error while creating employee');
    }
  };

  const updateEmployee = async (id, updatedData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      const result = await response.json();
      if (result.status === 'success') {
        const savedEmp = normalizeEmployee(result.data);
        setEmployees(prev =>
          prev.map(e => (e.id === id ? savedEmp : e))
        );
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
      const response = await fetch(`http://localhost:5000/api/v1/employees/${id}`, {
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
      const response = await fetch(`http://localhost:5000/api/v1/employees/${id}`, {
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
        const response = await fetch(`http://localhost:5000/api/v1/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ roleId, role: roleObj ? roleObj.name : undefined })
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
        const response = await fetch(`http://localhost:5000/api/v1/employees/${id}`, {
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
        const response = await fetch(`http://localhost:5000/api/v1/employees/${id}`, {
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
        
        const response = await fetch(`http://localhost:5000/api/v1/employees/${id}`, {
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

      const response = await fetch(`http://localhost:5000/api/v1/leaves/${id}`, {
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
        await fetch(`http://localhost:5000/api/v1/employees/${leave.employeeId}`, {
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
        
        // Add Notification
        setNotifications(prev => [
          {
            id: `NTF-${Math.random().toString(36).substring(2, 9)}`,
            type: 'success',
            message: `Your leave request from ${leave.fromDate} has been Approved.`,
            timestamp: 'Just now',
            read: false
          },
          ...prev
        ]);
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

      const response = await fetch(`http://localhost:5000/api/v1/leaves/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/v1/leaves', {
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
            await fetch(`http://localhost:5000/api/v1/employees/${result.data.employeeId}`, {
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
      const response = await fetch(`http://localhost:5000/api/v1/leaves/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/v1/leaves/policies', {
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
    }
  };

  const updateLeavePolicy = async (id, updatedPolicy) => {
    try {
      const response = await fetch(`http://localhost:5000/api/v1/leaves/policies/${id}`, {
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
      const response = await fetch(`http://localhost:5000/api/v1/leaves/policies/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/v1/leaves/policies/reset', {
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
      const response = await fetch('http://localhost:5000/api/v1/holidays', {
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
      const response = await fetch(`http://localhost:5000/api/v1/holidays/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/v1/branches', {
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
      const response = await fetch(`http://localhost:5000/api/v1/branches/${id}`, {
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
      const response = await fetch(`http://localhost:5000/api/v1/branches/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/v1/departments', {
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
      const response = await fetch(`http://localhost:5000/api/v1/departments/${id}`, {
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
      const response = await fetch(`http://localhost:5000/api/v1/departments/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/v1/teams', {
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
      const response = await fetch(`http://localhost:5000/api/v1/teams/${id}`, {
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
      const response = await fetch(`http://localhost:5000/api/v1/teams/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/v1/projects', {
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
      const response = await fetch(`http://localhost:5000/api/v1/projects/${id}`, {
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
      const response = await fetch(`http://localhost:5000/api/v1/projects/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/v1/attendance', {
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
      const response = await fetch(`http://localhost:5000/api/v1/attendance/${id}`, {
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
        { level: 3, role: 'Project Manager Approval', approver: project.manager || 'Project Manager', status: 'Pending', timestamp: '', remarks: '' },
        { level: 4, role: 'Super Admin Approval', approver: 'Aarav Sharma', status: 'Pending', timestamp: '', remarks: '' }
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
    employees.forEach(emp => {
      if (!emp.department) return;
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
    setPayroll(prev =>
      prev.map(p => ({ ...p, status: 'Paid' }))
    );
    addActivityLog(`Processed payroll for period: ${month} ${year}`, 'Payroll', 'success');
    addToast('success', `Payroll processed and disbursed for ${month} ${year}!`);
  };

  const generatePayslip = (employeeName) => {
    addToast('success', `Payslip generated for ${employeeName}. Sent to Document Vault.`);
  };

  // Daily Work Reports Handlers
  const addDailyReport = (reportData) => {
    const newId = `REP-${String(dailyReports.length + 1).padStart(3, '0')}`;
    const newReport = {
      ...reportData,
      id: newId,
      submittedTime: new Date().toISOString(),
      approvalHistory: [
        { role: 'Employee', user: reportData.employeeName, action: 'Submitted', timestamp: new Date().toISOString(), comments: '' }
      ]
    };
    setDailyReports(prev => [newReport, ...prev]);
    addActivityLog(`Submitted Daily Report for ${reportData.date}`, 'Work Reports', 'success');
    addToast('success', `Daily report ${newId} submitted successfully.`);
    
    // Add Notification
    setNotifications(prev => [
      {
        id: `NTF-${Math.random().toString(36).substring(2, 9)}`,
        type: 'info',
        message: `${reportData.employeeName} submitted a daily work report.`,
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  const updateDailyReportStatus = (id, status, feedback) => {
    setDailyReports(prev =>
      prev.map(r => {
        if (r.id === id) {
          const actionLabel = status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : status === 'Changes Requested' ? 'Requested Changes' : 'Escalated';
          const updatedHistory = [
            ...(r.approvalHistory || []),
            {
              role: currentUserRole === 'team_leader' ? 'Team Leader' : currentUserRole === 'manager' ? 'Project Manager' : 'Admin',
              user: currentUser?.name || 'Manager',
              action: actionLabel,
              timestamp: new Date().toISOString(),
              comments: feedback || ''
            }
          ];
          return {
            ...r,
            status: status,
            feedback: feedback || r.feedback,
            approvalHistory: updatedHistory
          };
        }
        return r;
      })
    );
    addActivityLog(`Updated report ${id} status to ${status}`, 'Work Reports', 'success');
    addToast('success', `Report ${id} successfully updated to ${status}.`);
  };

  // Role Permissions Handler
  const updatePermissions = (roleId, updatedPermissions) => {
    setRoles(prev =>
      prev.map(r => (r.id === roleId ? { ...r, permissions: updatedPermissions } : r))
    );
    addActivityLog(`Modified system permissions for role: ${roleId}`, 'Permissions', 'success');
    addToast('success', `Permissions updated for ${roleId} role.`);
  };

  // Notifications Handlers
  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('info', 'All notifications marked as read.');
  };

  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  // Check RBAC permission helper
  const hasPermission = (module, action) => {
    // Super admin has permission for everything
    if (currentUserRole === 'super_admin') return true;
    const roleObj = roles.find(r => r.id === currentUserRole);
    if (!roleObj) return false;
    return !!roleObj.permissions[module]?.[action];
  };

  return (
    <AppContext.Provider
      value={{
        employees: employees.map(normalizeEmployee),
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
        notifications,
        activityLogs,
        roles,
        dailyReports,
        setDailyReports,
        addDailyReport,
        updateDailyReportStatus,
        toasts,
        confirmDialog,
        commandPaletteOpen,
        currentUserRole,
        sidebarCollapsed,
        currentUser,
        setCurrentUserRole,
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
        messages,
        markMessageRead,
        markAllMessagesRead,
        login,
        logout,
        fetchAttendance,
        fetchEmployees,
        fetchBranches,
        fetchDepartments,
        fetchTeams
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
