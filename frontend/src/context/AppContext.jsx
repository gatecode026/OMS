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

export const AppProvider = ({ children }) => {
  // App Core States
  const [employees, setEmployees] = useState(mockEmployees);
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
  const [currentUserRole, setCurrentUserRole] = useState('super_admin');
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
    { id: 'msg-1', sender: 'Elena Rostova', text: 'Hey Aarav, the frontend lazy route changes are live in production. Please check.', time: '10m ago', unread: true },
    { id: 'msg-2', sender: 'John Miller', text: 'Can you review the leave request I submitted yesterday? Need to travel next week.', time: '1h ago', unread: true },
    { id: 'msg-3', sender: 'Sophia Laurent', text: 'Draft payroll calculations for May are ready in the dashboard.', time: '5h ago', unread: false }
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
    // Sync current user when role changes to demonstrate RBAC
    const userMap = {
      super_admin: employees.find(e => e.roleId === 'super_admin') || employees[0],
      branch_admin: employees.find(e => e.roleId === 'branch_admin'),
      team_leader: employees.find(e => e.roleId === 'team_leader'),
      employee: employees.find(e => e.roleId === 'employee')
    };
    setCurrentUser(userMap[currentUserRole] || employees[0]);
  }, [currentUserRole, employees]);

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
    const id = `EMP-2026-${String(employees.length + 1).padStart(3, '0')}`;
    const [firstName, ...restParts] = newEmp.name.split(' ');
    const lastName = restParts.join('') || 'user';
    const entry = {
      ...newEmp,
      id,
      status: 'Active',
      workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@saas.io`,
      designation: newEmp.designation || newEmp.role,
      attendanceStatus: 'Present',
      workStatus: 'Active',
      accountStatus: 'Active',
      teamLeader: newEmp.teamLeader || 'Unassigned',
      projectManager: newEmp.projectManager || 'Unassigned',
      nationality: newEmp.nationality || 'Not specified',
      personalEmail: `${firstName.toLowerCase()}${lastName.toLowerCase()}${employees.length}@gmail.com`,
      emergencyContactName: newEmp.emergencyContactName || '',
      emergencyContactPhone: newEmp.emergencyContactPhone || '',
      currentAddress: newEmp.currentAddress || '',
      permanentAddress: newEmp.permanentAddress || '',
      employmentType: newEmp.employmentType || 'Full-Time',
      workLocation: newEmp.workLocation || newEmp.branch || '',
      attendanceHistory: [],
      leaveHistory: [],
      taskHistory: [],
      performanceScore: { overall: 0, attendance: 0, taskCompletion: 0, reportSubmission: 0, leaveDiscipline: 0, monthly: [0, 0, 0, 0, 0, 0] },
      documents: [],
      activityLog: []
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
        employees,
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
        approveLeaveRequest,
        rejectLeaveRequest,
        updateTaskStatus,
        addTask,
        deleteTask,
        updateAttendanceRecord,
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
        markAllMessagesRead
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
