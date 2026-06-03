import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  mockEmployees,
  mockAttendance,
  mockLeaveRequests,
  mockTasks,
  mockPayroll,
  mockNotifications,
  mockActivityLogs,
  mockRoles
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

  return normalized;
};

export const AppProvider = ({ children }) => {
  // App Core States
  const [employees, setEmployees] = useState(() => mockEmployees.map(normalizeEmployee));
  const [attendance, setAttendance] = useState(mockAttendance);
  const [leaveRequests, setLeaveRequests] = useState(mockLeaveRequests);
  const [tasks, setTasks] = useState(mockTasks);
  const [payroll, setPayroll] = useState(mockPayroll);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activityLogs, setActivityLogs] = useState(mockActivityLogs);
  const [roles, setRoles] = useState(mockRoles);

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
    if (saved === 'light') {
      document.documentElement.classList.add('light-theme');
    }
    return saved;
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('saas_theme', next);
      if (next === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
      return next;
    });
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
      branch_admin: employees.find(e => e.roleId === 'branch_admin'),
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
  };

  // Toast Handler
  const addToast = (type, message) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Confirm Dialog Handler
  const showConfirm = (title, message, onConfirm, confirmType = 'primary') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmType,
      onConfirm: () => {
        onConfirm();
        closeConfirm();
      },
      onCancel: closeConfirm
    });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
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
  const addEmployee = (newEmp) => {
    const generatedId = `EMP-2026-${String(employees.length + 1).padStart(3, '0')}`;
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
    setEmployees(prev => [...prev, entry]);
    addActivityLog(`Added new employee: ${entry.name}`, 'Employees', 'success');
    addToast('success', `Employee ${entry.name} created successfully!`);
    
    // Increment User Count in Role Card
    setRoles(prev =>
      prev.map(r => (r.id === newEmp.roleId ? { ...r, userCount: r.userCount + 1 } : r))
    );
  };

  const updateEmployee = (id, updatedData) => {
    setEmployees(prev =>
      prev.map(e => (e.id === id ? { ...e, ...updatedData } : e))
    );
    addActivityLog(`Updated details for employee ID: ${id}`, 'Employees', 'success');
    addToast('success', 'Employee details updated successfully!');
  };

  const deactivateEmployee = (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    
    setEmployees(prev =>
      prev.map(e => (e.id === id ? { ...e, status: 'Inactive' } : e))
    );
    addActivityLog(`Deactivated employee: ${emp.name}`, 'Employees', 'danger');
    addToast('warning', `Employee ${emp.name} has been deactivated.`);
  };

  const activateEmployee = (id) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    
    setEmployees(prev =>
      prev.map(e => (e.id === id ? { ...e, status: 'Active' } : e))
    );
    addActivityLog(`Activated employee: ${emp.name}`, 'Employees', 'success');
    addToast('success', `Employee ${emp.name} has been activated.`);
  };


  const bulkAssignRole = (ids, roleId) => {
    const roleObj = roles.find(r => r.id === roleId);
    setEmployees(prev =>
      prev.map(e => (ids.has(e.id) ? { ...e, roleId, role: roleObj ? roleObj.name : e.role } : e))
    );
    addActivityLog(`Bulk assigned role "${roleObj?.name}" to ${ids.size} employees`, 'Employees', 'success');
    addToast('success', `Assigned role "${roleObj?.name}" to ${ids.size} employees.`);
  };

  const bulkTransferDept = (ids, deptName) => {
    setEmployees(prev =>
      prev.map(e => (ids.has(e.id) ? { ...e, department: deptName } : e))
    );
    addActivityLog(`Bulk transferred ${ids.size} employees to department: ${deptName}`, 'Employees', 'success');
    addToast('success', `Transferred ${ids.size} employees to ${deptName}.`);
  };

  const bulkUpdateStatus = (ids, status) => {
    setEmployees(prev =>
      prev.map(e => (ids.has(e.id) ? { ...e, status } : e))
    );
    addActivityLog(`Bulk updated status of ${ids.size} employees to "${status}"`, 'Employees', 'success');
    addToast('success', `Updated status of ${ids.size} employees to "${status}".`);
  };

  const bulkAllocateLeave = (ids, leaveData) => {
    setEmployees(prev =>
      prev.map(e => (ids.has(e.id) ? { ...e, leaveBalance: (e.leaveBalance || 0) + (parseInt(leaveData) || 0) } : e))
    );
    addActivityLog(`Bulk allocated ${leaveData} leaves to ${ids.size} employees`, 'Employees', 'success');
    addToast('success', `Allocated ${leaveData} leaves to ${ids.size} employees.`);
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
  const approveLeaveRequest = (id, notes = '') => {
    const leave = leaveRequests.find(l => l.id === id);
    if (!leave) return;

    setLeaveRequests(prev =>
      prev.map(l =>
        l.id === id
          ? {
              ...l,
              status: 'Approved',
              approverNotes: notes || 'Approved by Manager',
              history: [
                ...l.history,
                { date: '2026-05-29', status: 'Approved', comment: `Approved by ${currentUser?.name}` }
              ]
            }
          : l
      )
    );

    // Update Employee Status if leave is active now
    setEmployees(prev =>
      prev.map(e => (e.id === leave.employeeId ? { ...e, status: 'On Leave' } : e))
    );

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
  };

  const rejectLeaveRequest = (id, notes = '') => {
    const leave = leaveRequests.find(l => l.id === id);
    if (!leave) return;

    setLeaveRequests(prev =>
      prev.map(l =>
        l.id === id
          ? {
              ...l,
              status: 'Rejected',
              approverNotes: notes || 'Rejected by Manager',
              history: [
                ...l.history,
                { date: '2026-05-29', status: 'Rejected', comment: `Rejected by ${currentUser?.name}: ${notes}` }
              ]
            }
          : l
      )
    );
    addActivityLog(`Rejected leave request for ${leave.employeeName}`, 'Leaves', 'danger');
    addToast('error', `Leave request for ${leave.employeeName} rejected.`);
  };

  const addAttendanceRecord = (newRecord) => {
    setAttendance(prev => [newRecord, ...prev]);
    addActivityLog(`Logged attendance record for ${newRecord.employeeName}`, 'Attendance', 'success');
    addToast('success', 'Attendance record logged successfully.');
  };

  const updateAttendanceRecord = (id, updatedData) => {
    setAttendance(prev =>
      prev.map(a => (a.id === id ? { ...a, ...updatedData } : a))
    );
    addActivityLog(`Updated attendance record for ${updatedData.employeeName}`, 'Attendance', 'success');
    addToast('success', 'Attendance record updated successfully.');
  };

  // Tasks Handlers
  const updateTaskStatus = (id, newStatus) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status: newStatus } : t))
    );
    addActivityLog(`Moved task "${task.title}" to ${newStatus}`, 'Tasks', 'success');
    addToast('success', `Task moved to ${newStatus}.`);
  };

  const addTask = (taskData) => {
    const id = `TSK-${Math.floor(100 + Math.random() * 900)}`;
    const assignee = employees.find(e => e.id === taskData.assigneeId);
    const entry = {
      ...taskData,
      id,
      assigneeName: assignee ? assignee.name : 'Unassigned',
      status: 'To Do'
    };
    setTasks(prev => [...prev, entry]);
    addActivityLog(`Created task: "${entry.title}"`, 'Tasks', 'success');
    addToast('success', 'Task created successfully.');
  };

  const deleteTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    addActivityLog(`Deleted task "${task.title}"`, 'Tasks', 'danger');
    addToast('warning', `Task "${task.title}" deleted.`);
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
        attendance,
        leaveRequests,
        tasks,
        payroll,
        notifications,
        activityLogs,
        roles,
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
        updateTaskStatus,
        addTask,
        deleteTask,
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
        messages,
        markMessageRead,
        markAllMessagesRead,
        login,
        logout
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
