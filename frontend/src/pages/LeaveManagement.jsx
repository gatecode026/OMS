import React, { useState, useEffect, useMemo } from 'react';
import './LeaveManagement.css';
import { useApp } from '../context/AppContext';
import { useLocation } from 'react-router-dom';
import { FIELD_LABELS } from '../utils/fieldLabels';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import LeaveBalanceCard from '../components/leave/LeaveBalanceCard';
import LeaveRequestCard from '../components/leave/LeaveRequestCard';
import ApplyLeavePanel from '../components/leave/ApplyLeavePanel';
import LeaveFilterTabs from '../components/leave/LeaveFilterTabs';
import UpcomingHolidays from '../components/leave/UpcomingHolidays';
import LeaveUsageChart from '../components/leave/LeaveUsageChart';
import {
  Check, X, Eye, FileText, CalendarDays, Search, Filter, Plus, Settings,
  AlertCircle, Calendar, TrendingUp, Users, BarChart3, ArrowRight,
  Clock, Settings2, FileSpreadsheet, FileUp, Download, Info, Bell, Briefcase,
  HeartPulse, Umbrella, UserCheck, Smile, ShieldAlert, Trash2, Edit, CheckCircle2,
  Database, Save, RefreshCw, Leaf, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, Legend
} from 'recharts';
import { 
  MdOutlineDateRange, MdHourglassEmpty, MdCheckCircle, MdCancel, MdAdd, MdRefresh, 
  MdBeachAccess, MdLocalHospital, MdDateRange, MdChildCare, MdPeople, MdAssignment 
} from 'react-icons/md';
import { 
  FiBriefcase, FiCalendar, FiClock, FiCheckSquare, FiAlertCircle, FiSettings, FiPlus, FiArrowRight 
} from 'react-icons/fi';
import { 
  BsCalendarCheck, BsCalendarEvent, BsFileText, BsUmbrella 
} from 'react-icons/bs';

const LeaveManagement = () => {
  const isLoading = usePageLoading(600);
  const {
    employees,
    leaveRequests,
    approveLeaveRequest,
    rejectLeaveRequest,
    addLeaveRequest,
    updateLeaveRequest,
    showConfirm,
    addToast,
    currentUser,
    currentUserRole,
    leavePolicyConfigs,
    addLeavePolicy,
    updateLeavePolicy,
    deleteLeavePolicy,
    resetLeavePolicies,
    holidaysList,
    addHoliday,
    deleteHoliday,
    updateEmployee,
    departments: rawDepartments,
    fetchLeaves
  } = useApp();
  const departments = useMemo(() => (rawDepartments || []).filter(d => d.status === 'Active'), [rawDepartments]);

  // Primary Tab state: 'requests' | 'analytics' | 'balances' | 'holidays' | 'policies'
  const [activeTab, setActiveTab] = useState('requests');

  // Employee personal view state
  const empStatusTabState = useState('Pending');
  const applyPanelOpenState = useState(false);

  // Requests Sub-tab status filter: 'Pending' | 'Approved' | 'Rejected' | 'All'
  const [statusTab, setStatusTab] = useState('Pending');

  // Auto-focus pending tab when redirected from a notification
  const location = useLocation();
  useEffect(() => {
    if (location.state?.openPending) {
      setActiveTab('requests');
      setStatusTab('Pending');
      // Clear state so back-navigation doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLeaveType, setFilterLeaveType] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All');

  // Leave List state (includes user-added leaves locally)
  const [leavesList, setLeavesList] = useState([]);

  useEffect(() => {
    if (leaveRequests) {
      setLeavesList(leaveRequests);
    }
  }, [leaveRequests]);

  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyEditForm, setPolicyEditForm] = useState({
    leaveCode: '',
    leaveName: '',
    defaultDays: 0,
    maxCarryForward: 0,
    isActive: true,
    genderRestriction: 'All',
    description: ''
  });
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [newPolicyForm, setNewPolicyForm] = useState({
    leaveCode: '',
    leaveName: '',
    defaultDays: 0,
    maxCarryForward: 0,
    isActive: true,
    genderRestriction: 'All',
    description: ''
  });
  const [showDeletePolicyConfirm, setShowDeletePolicyConfirm] = useState(null);
  const [policySearchQuery, setPolicySearchQuery] = useState('');
  const [filterPolicyGender, setFilterPolicyGender] = useState('All');
  const [filterPolicyStatus, setFilterPolicyStatus] = useState('All');

  // Balance Edit State
  const [balanceEditEmployee, setBalanceEditEmployee] = useState(null);
  const [balanceInput, setBalanceInput] = useState({ cl: 0, sl: 0, pl: 0, maternity: 0 });
  // Policy configurations state (persisted locally)
  const [policies, setPolicies] = useState(() => {
    const saved = localStorage.getItem('leave_policy_settings');
    return saved ? JSON.parse(saved) : {
      accrualRate: 'Monthly',
      halfDayPolicy: true,
      holidayEncashment: true,
      restrictDoubleFilings: true,
      useGlobalPolicyTable: true
    };
  });

  useEffect(() => {
    localStorage.setItem('leave_policy_settings', JSON.stringify(policies));
  }, [policies]);

  // Dynamic policy rates for active policies
  const [policyRates, setPolicyRates] = useState({});

  useEffect(() => {
    if (leavePolicyConfigs && leavePolicyConfigs.length > 0) {
      const rates = {};
      leavePolicyConfigs.forEach(p => {
        rates[p.id] = {
          defaultDays: p.defaultDays,
          maxCarryForward: p.maxCarryForward
        };
      });
      setPolicyRates(rates);
    }
  }, [leavePolicyConfigs]);

  // Modal open states
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHolidayForm, setNewHolidayForm] = useState({
    date: '',
    name: '',
    type: 'National',
    description: ''
  });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approverNotesInput, setApproverNotesInput] = useState('');
  const [editingLeave, setEditingLeave] = useState(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    employeeId: '',
    customLeaveType: 'CL',
    startDate: '',
    days: 1,
    reason: ''
  });

  const handleEditLeaveClick = (leave) => {
    setEditingLeave(leave);
    setApplyForm({
      employeeId: leave.employeeId,
      customLeaveType: leave.type,
      startDate: leave.fromDate,
      days: leave.days,
      reason: leave.reason
    });
    setApplyModalOpen(true);
  };

  const handleApplySubmit = (e) => {
    if (e) e.preventDefault();
    const empId = currentUser?.id || applyForm.employeeId;
    const emp = employees.find(e => e.id === empId);
    
    if (!empId) {
      addToast('warning', 'Employee ID is required.');
      return;
    }
    if (!applyForm.customLeaveType || !applyForm.startDate || !applyForm.days) {
      addToast('warning', 'Please fill in all required fields.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (applyForm.startDate < today) {
      addToast('warning', 'Start date cannot be before today.');
      return;
    }

    const start = new Date(applyForm.startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(applyForm.days) - 1);
    const endDateStr = end.toISOString().split('T')[0];

    // Privileged roles (managers and admins) get auto-approved leave
    const isPrivilegedRole = ['manager', 'dept_admin', 'branch_admin', 'super_admin'].includes(currentUserRole);
    const autoStatus = isPrivilegedRole ? 'Approved' : 'Pending';
    const historyComment = isPrivilegedRole ? 'Leave registered by manager (self-approved)' : 'Applied by employee';

    if (editingLeave) {
      const updatedRequest = {
        ...editingLeave,
        type: applyForm.customLeaveType,
        fromDate: applyForm.startDate,
        toDate: endDateStr,
        days: parseInt(applyForm.days),
        reason: applyForm.reason
      };
      updateLeaveRequest(editingLeave.id, updatedRequest);
      addToast('success', 'Leave request updated successfully.');
      setEditingLeave(null);
    } else {
      const newRequest = {
        id: `LR-${Math.floor(100 + Math.random() * 900)}`,
        employeeId: empId,
        employeeName: emp?.name || currentUser?.name || 'Employee',
        department: emp?.department || currentUser?.department || '',
        type: applyForm.customLeaveType,
        fromDate: applyForm.startDate,
        toDate: endDateStr,
        days: parseInt(applyForm.days),
        reason: applyForm.reason || '',
        status: autoStatus,
        appliedDate: new Date().toISOString().split('T')[0],
        approverNotes: isPrivilegedRole ? 'Self-registered by manager' : '',
        history: [
          { date: new Date().toISOString().split('T')[0], status: autoStatus, comment: historyComment }
        ]
      };
      addLeaveRequest(newRequest);
      addToast('success', isPrivilegedRole ? 'Leave registered and approved successfully.' : 'Leave request submitted successfully.');
    }

    setApplyModalOpen(false);
    setApplyForm({
      employeeId: '',
      customLeaveType: 'CL',
      startDate: '',
      days: 1,
      reason: ''
    });
  };

  // Leave Assignment states
  const [showAssignLeaveModal, setShowAssignLeaveModal] = useState(false);
  const [selectedAssignEmployee, setSelectedAssignEmployee] = useState(null);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [showAssignEmployeeDropdown, setShowAssignEmployeeDropdown] = useState(false);
  const [assignForm, setAssignForm] = useState({
    customLeaveType: '',
    startDate: '',
    days: 1,
    reason: ''
  });

  // Reports and Exports builder state
  const [reportType, setReportType] = useState('Daily Leave Record');
  const [exportFormat, setExportFormat] = useState('PDF');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Active Date selection in calendars
  const calendarMonthOptions = useMemo(() => {
    const options = [];
    const date = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (let i = -2; i <= 3; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
      options.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
    }
    if (!options.includes('June 2026')) options.push('June 2026');
    if (!options.includes('July 2026')) options.push('July 2026');
    return [...new Set(options)].sort((a, b) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      const dateA = new Date(parseInt(yA, 10), months.indexOf(mA), 1);
      const dateB = new Date(parseInt(yB, 10), months.indexOf(mB), 1);
      return dateA - dateB;
    });
  }, []);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentStr = `${months[date.getMonth()]} ${date.getFullYear()}`;
    return calendarMonthOptions.includes(currentStr) ? currentStr : 'June 2026';
  });


  useEffect(() => {
    if (leaveRequests) {
      const scoped = leaveRequests.filter(req => {
        if (!currentUserRole || currentUserRole === 'super_admin') return true;
        const emp = employees.find(e => e.id === req.employeeId);
        if (currentUserRole === 'branch_admin') {
          return emp?.branch === currentUser?.branch;
        }
        if (currentUserRole === 'dept_admin' || currentUserRole === 'team_leader') {
          return req.department === currentUser?.department;
        }
        if (currentUserRole === 'employee') {
          return req.employeeId === currentUser?.id;
        }
        return true;
      });
      setLeavesList(scoped);
    }
  }, [leaveRequests, currentUser, currentUserRole, employees]);

  useEffect(() => {
    if (applyModalOpen && (currentUserRole === 'employee' || currentUserRole === 'manager') && currentUser) {
      setApplyForm(prev => ({ ...prev, employeeId: currentUser.id }));
    }
  }, [applyModalOpen, currentUserRole, currentUser]);

  const scopedEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!currentUserRole || currentUserRole === 'super_admin') return true;
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'dept_admin' || currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department;
      }
      if (currentUserRole === 'employee') {
        return emp?.id === currentUser?.id;
      }
      return true;
    });
  }, [employees, currentUser, currentUserRole]);

  // Dynamic department metrics
  const departmentAnalyticsData = useMemo(() => {
    const data = {};
    (departments || []).forEach(d => {
      data[d.name] = { department: d.name, totalLeaves: 0, leaveRequests: 0, approved: 0, pending: 0 };
    });
    
    leavesList.forEach(l => {
      const dept = l.department || '';
      if (!data[dept]) {
        data[dept] = { department: dept, totalLeaves: 0, leaveRequests: 0, approved: 0, pending: 0 };
      }
      data[dept].leaveRequests += 1;
      if (l.status === 'Approved') {
        data[dept].approved += 1;
        data[dept].totalLeaves += Number(l.days) || 0;
      } else if (l.status === 'Pending') {
        data[dept].pending += 1;
      }
    });
    return Object.values(data);
  }, [leavesList, departments]);

  // Alerts feed items (starts empty)
  const [alertsFeed, setAlertsFeed] = useState([]);

  // Chart data
  const trendsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const data = months.slice(0, currentMonthIdx + 1).map(m => ({ name: m, requests: 0, approved: 0 }));
    
    leavesList.forEach(l => {
      if (!l.fromDate) return;
      const date = new Date(l.fromDate);
      const mIdx = date.getMonth();
      if (mIdx <= currentMonthIdx) {
        data[mIdx].requests += 1;
        if (l.status === 'Approved') {
          data[mIdx].approved += 1;
        }
      }
    });
    return data;
  }, [leavesList]);

  const typesDistributionData = useMemo(() => {
    const typesMap = {};
    leavesList.forEach(l => {
      if (l.status === 'Approved') {
        typesMap[l.type] = (typesMap[l.type] || 0) + 1;
      }
    });
    const colorsMap = {
      'CL': 'var(--accent-blue-solid)',
      'Casual Leave': 'var(--accent-blue-solid)',
      'SL': 'var(--accent-pink-solid)',
      'Sick Leave': 'var(--accent-pink-solid)',
      'PL': 'var(--accent-green-solid)',
      'Paid Leave': 'var(--accent-green-solid)',
      'Annual Leave': 'var(--accent-green-solid)',
      'ML': 'var(--accent-purple-solid)',
      'Maternity Leave': 'var(--accent-purple-solid)'
    };
    const results = Object.entries(typesMap).map(([name, value]) => ({
      name,
      value,
      color: colorsMap[name] || 'var(--color-primary)'
    }));
    return results.length > 0 ? results : [
      { name: 'Casual Leave', value: 1, color: 'var(--accent-blue-solid)' }
    ];
  }, [leavesList]);

  const approvalRateData = useMemo(() => {
    const data = {};
    (departments || []).forEach(d => {
      data[d.name] = { name: d.name, Approved: 0, Rejected: 0 };
    });
    
    leavesList.forEach(l => {
      const dept = l.department || '';
      if (!data[dept]) {
        data[dept] = { name: dept, Approved: 0, Rejected: 0 };
      }
      if (l.status === 'Approved') {
        data[dept].Approved += 1;
      } else if (l.status === 'Rejected') {
        data[dept].Rejected += 1;
      }
    });
    
    return Object.values(data).map(d => {
      const total = d.Approved + d.Rejected;
      const appRate = total > 0 ? Math.round((d.Approved / total) * 100) : 100;
      const rejRate = total > 0 ? Math.round((d.Rejected / total) * 100) : 0;
      return {
        name: d.name,
        Approved: appRate,
        Rejected: rejRate
      };
    });
  }, [leavesList, departments]);

  // Leave Types Descriptions (from policy configs)
  const leaveTypesList = leavePolicyConfigs.map(config => ({
    code: config.leaveCode,
    name: config.leaveName,
    desc: config.description,
    quota: `${config.defaultDays} days/month`,
    maxCarry: config.maxCarryForward,
    genderRestriction: config.genderRestriction,
    active: config.isActive
  }));

  // Get today's local date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Calendar Schedule Data dynamically calculated from the database
  const calendarDays = useMemo(() => {
    if (!calendarMonth) return [];
    const [monthName, yearStr] = calendarMonth.split(' ');
    const year = parseInt(yearStr, 10);
    const monthsMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    const monthIndex = monthsMap[monthName] ?? 5; // default June
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const activeEmployeesCount = (employees || []).filter(e => e.status === 'Active' || e.status === 'active' || !e.status).length || 10;

    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      
      // Filter approved leaves overlapping this day
      const dailyLeaves = (leavesList || []).filter(l => {
        return l.status === 'Approved' && l.fromDate <= dateStr && l.toDate >= dateStr;
      });

      const leaves = dailyLeaves.map(l => {
        const typeColors = {
          'CL': 'orange',
          'Casual Leave': 'orange',
          'SL': 'pink',
          'Sick Leave': 'pink',
          'PL': 'green',
          'Paid Leave': 'green',
          'Annual Leave': 'green',
          'ML': 'pink',
          'Maternity Leave': 'pink'
        };
        const color = typeColors[l.type] || 'orange';
        return {
          name: l.employeeName || 'Employee',
          type: l.type,
          color
        };
      });

      const uniqueEmployeesOnLeave = new Set(dailyLeaves.map(l => l.employeeId || l.employeeName)).size;
      const availability = Math.max(0, Math.round(((activeEmployeesCount - uniqueEmployeesOnLeave) / activeEmployeesCount) * 100));

      return { dayNum, dateStr, leaves, availability };
    });
  }, [calendarMonth, leavesList, employees]);

  // Calculate top KPI numbers dynamically based on leaves list
  const totalRequestsCount = leavesList.length;
  const approvedRequestsCount = leavesList.filter(l => l.status === 'Approved').length;
  const rejectedRequestsCount = leavesList.filter(l => l.status === 'Rejected').length;
  const pendingRequestsCount = leavesList.filter(l => l.status === 'Pending').length;
  const onLeaveTodayCount = leavesList.filter(l => l.status === 'Approved' && l.fromDate <= todayStr && l.toDate >= todayStr).length;

  const leaveUtilizationRate = useMemo(() => {
    const activeEmployeesCount = (employees || []).filter(e => e.status === 'Active' || e.status === 'active' || !e.status).length || 1;
    const totalQuota = (leavePolicyConfigs || []).reduce((acc, p) => acc + (p.defaultDays || 0), 0) * activeEmployeesCount;
    const totalApprovedDays = leavesList.filter(l => l.status === 'Approved').reduce((acc, curr) => acc + (curr.days || 0), 0);
    return totalQuota > 0 ? Math.min(100, Math.round((totalApprovedDays / totalQuota) * 100)) + '%' : '0%';
  }, [leavesList, leavePolicyConfigs, employees]);

  // Filters calculation
  const getFilteredLeaves = () => {
    return leavesList.filter(req => {
      const matchesSearch =
        req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.employeeId && req.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (req.department && req.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = filterLeaveType === 'All' || req.type === filterLeaveType;
      const matchesDept = filterDept === 'All' || req.department === filterDept;

      let matchesStatus = false;
      if (statusTab === 'All') {
        matchesStatus = true;
      } else if (statusTab === 'OnLeaveToday') {
        matchesStatus = req.status === 'Approved' && req.fromDate <= todayStr && req.toDate >= todayStr;
      } else {
        matchesStatus = req.status === statusTab;
      }

      return matchesSearch && matchesType && matchesStatus && matchesDept;
    });
  };

  // Get filtered policies for the admin table
  const getFilteredPolicies = () => {
    return leavePolicyConfigs.filter(policy => {
      const matchesSearch = 
        policy.leaveCode.toLowerCase().includes(policySearchQuery.toLowerCase()) ||
        policy.leaveName.toLowerCase().includes(policySearchQuery.toLowerCase());
      const matchesGender = filterPolicyGender === 'All' || policy.genderRestriction === filterPolicyGender;
      const matchesStatus = filterPolicyStatus === 'All' || 
        (filterPolicyStatus === 'Active' && policy.isActive) ||
        (filterPolicyStatus === 'Inactive' && !policy.isActive);
      return matchesSearch && matchesGender && matchesStatus;
    });
  };

  // Policy CRUD Operations
  const handleEditPolicyClick = (policy) => {
    setEditingPolicy(policy);
    setPolicyEditForm({
      leaveCode: policy.leaveCode,
      leaveName: policy.leaveName,
      defaultDays: policy.defaultDays,
      maxCarryForward: policy.maxCarryForward,
      isActive: policy.isActive,
      genderRestriction: policy.genderRestriction,
      description: policy.description
    });
  };

  const handleUpdatePolicy = async () => {
    const success = await updateLeavePolicy(editingPolicy.id, policyEditForm);
    if (success) {
      setEditingPolicy(null);
      // Add alert for policy change
      setAlertsFeed(prev => [
        {
          id: `AL-${Math.random().toString(36).substring(2, 9)}`,
          type: 'success',
          message: `Leave policy "${policyEditForm.leaveName}" updated by Admin.`,
          timestamp: 'Just now',
          read: false
        },
        ...prev
      ]);
    }
  };

  const handleAddPolicy = async () => {
    if (!newPolicyForm.leaveCode || !newPolicyForm.newPolicyName && !newPolicyForm.leaveName) {
      addToast('warning', 'Please fill all required fields.');
      return;
    }
    
    // Generate next POL-xxx ID
    const nextNum = leavePolicyConfigs.length > 0 
      ? Math.max(...leavePolicyConfigs.map(p => parseInt(p.id.split('-')[1]) || 0)) + 1 
      : 1;
    const newId = `POL-${String(nextNum).padStart(3, '0')}`;
    const newPolicy = { id: newId, ...newPolicyForm };
    const success = await addLeavePolicy(newPolicy);
    if (success) {
      setShowAddPolicyModal(false);
      setNewPolicyForm({
        leaveCode: '',
        leaveName: '',
        defaultDays: 0,
        maxCarryForward: 0,
        isActive: true,
        genderRestriction: 'All',
        description: ''
      });
    }
  };

  const handleDeletePolicy = (policy) => {
    const action = async () => {
      const success = await deleteLeavePolicy(policy.id);
      if (success) {
        setShowDeletePolicyConfirm(null);
      }
    };
    
    showConfirm(
      'Delete Leave Policy',
      `Are you sure you want to delete "${policy.leaveName}" policy? This action cannot be undone.`,
      action,
      'danger'
    );
  };

  const handleTogglePolicyStatus = async (policyId, currentStatus) => {
    const policy = leavePolicyConfigs.find(p => p.id === policyId);
    if (!policy) return;
    const success = await updateLeavePolicy(policyId, { ...policy, isActive: !currentStatus });
    if (success) {
      addToast('info', `Policy ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
    }
  };

  // Reset all policies to default
  const handleResetAllPolicies = () => {
    const action = async () => {
      await resetLeavePolicies();
    };
    
    showConfirm(
      'Reset All Policies',
      'This will reset all leave policies to their default values. Are you sure?',
      action,
      'danger'
    );
  };

  const handleSavePolicyConfigs = async () => {
    let successCount = 0;
    let totalToUpdate = 0;

    for (const policy of activePolicies) {
      const updatedRates = policyRates[policy.id];
      if (updatedRates) {
        if (updatedRates.defaultDays !== policy.defaultDays || updatedRates.maxCarryForward !== policy.maxCarryForward) {
          totalToUpdate++;
          const success = await updateLeavePolicy(policy.id, {
            ...policy,
            defaultDays: updatedRates.defaultDays,
            maxCarryForward: updatedRates.maxCarryForward
          });
          if (success) successCount++;
        }
      }
    }

    if (totalToUpdate === 0) {
      addToast('info', 'No policy configurations were changed.');
      return;
    }

    if (successCount === totalToUpdate) {
      addToast('success', `${successCount} leave policy configuration(s) updated successfully!`);
    } else {
      addToast('warning', `Updated ${successCount} of ${totalToUpdate} leave policy configurations.`);
    }

    setAlertsFeed(prev => [
      {
        id: `AL-${Math.random().toString(36).substring(2, 9)}`,
        type: 'success',
        message: 'Super Admin updated global leave rules settings.',
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  const handleRowClick = (leave) => {
    setSelectedLeave(leave);
    setApproverNotesInput(leave.approverNotes || '');
    setDetailModalOpen(true);
  };

  const handleApprove = (id, name, isModal = false) => {
    const action = () => {
      approveLeaveRequest(id, isModal ? approverNotesInput : '');
      if (isModal) setDetailModalOpen(false);
    };

    showConfirm(
      'Approve Leave Request',
      `Are you sure you want to approve this leave request for ${name}?`,
      action,
      'primary'
    );
  };

  const handleReject = (id, name, isModal = false) => {
    const action = () => {
      rejectLeaveRequest(id, isModal ? approverNotesInput : '');
      if (isModal) setDetailModalOpen(false);
    };

    showConfirm(
      'Reject Leave Request',
      `Are you sure you want to reject this leave request for ${name}?`,
      action,
      'danger'
    );
  };



  const scrollToTable = () => {
    setTimeout(() => {
      const element = document.querySelector('.approval-status-tabs');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const filteredEmployees = employees.filter(emp => {
    const term = employeeSearchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(term) ||
      emp.id.toLowerCase().includes(term)
    );
  });

  const handleAssignSubmit = (e) => {
    if (e) e.preventDefault();
    if (!selectedAssignEmployee) {
      addToast('warning', 'Please select an employee.');
      return;
    }
    if (!assignForm.customLeaveType || !assignForm.startDate || !assignForm.days) {
      addToast('warning', 'Please fill in all leave assignment fields.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (assignForm.startDate < today) {
      addToast('warning', 'Start date cannot be before today.');
      return;
    }

    const start = new Date(assignForm.startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + parseInt(assignForm.days) - 1);
    const endDateStr = end.toISOString().split('T')[0];

    const newRequest = {
      id: `LR-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: selectedAssignEmployee.id,
      employeeName: selectedAssignEmployee.name,
      department: selectedAssignEmployee.department || '',
      type: assignForm.customLeaveType,
      fromDate: assignForm.startDate,
      toDate: endDateStr,
      days: parseInt(assignForm.days),
      reason: assignForm.reason || 'Assigned by Administrator',
      status: 'Approved',
      appliedDate: new Date().toISOString().split('T')[0],
      history: [
        { date: new Date().toISOString().split('T')[0], status: 'Approved', comment: 'Leave assigned directly by Administrator' }
      ],
      approverNotes: 'Assigned by Administrator'
    };

    addLeaveRequest(newRequest);
    
    // Close modal and reset state
    setShowAssignLeaveModal(false);
    setSelectedAssignEmployee(null);
    setEmployeeSearchQuery('');
    setAssignForm({
      customLeaveType: '',
      startDate: '',
      days: 1,
      reason: ''
    });
  };



  // Simulate Report Exporting
  const handleGenerateReport = (e) => {
    e.preventDefault();
    setIsExporting(true);
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExporting(false);
            addToast('success', `${reportType} exported successfully as ${exportFormat}!`);
          }, 300);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const handleAddHoliday = async (e) => {
    if (e) e.preventDefault();
    if (!newHolidayForm.date || !newHolidayForm.name) {
      addToast('warning', 'Please fill in the date and name.');
      return;
    }
    const newHol = {
      id: `HOL-${Date.now()}`,
      ...newHolidayForm
    };
    const success = await addHoliday(newHol);
    if (success) {
      addToast('success', `Holiday "${newHolidayForm.name}" added successfully!`);
      
      setAlertsFeed(prev => [
        {
          id: `AL-${Math.random().toString(36).substring(2, 9)}`,
          type: 'success',
          message: `New holiday "${newHolidayForm.name}" scheduled.`,
          timestamp: 'Just now',
          read: false
        },
        ...prev
      ]);
      
      setNewHolidayForm({
        date: '',
        name: '',
        type: 'National',
        description: ''
      });
      setShowAddHolidayModal(false);
    }
  };

  const handleDeleteHolidayClick = (holiday) => {
    const action = async () => {
      await deleteHoliday(holiday.id);
    };
    
    showConfirm(
      'Delete Scheduled Holiday',
      `Are you sure you want to delete the holiday "${holiday.name}"? This action cannot be undone.`,
      action,
      'danger'
    );
  };

  const activePolicies = leavePolicyConfigs.filter(p => p.isActive);

  const getRemainingBalance = (employee, policy) => {
    const code = policy.leaveCode;
    // Always use the policy's defaultDays as the monthly quota (what admin assigned)
    const initialQuota = policy.defaultDays;

    // Only count actual employee-requested leaves (exclude auto-allocation records
    // created when the policy was set up — those have reason starting with 'Automatic policy allocation:')
    const approvedDaysTaken = leaveRequests
      .filter(req => 
        req.employeeId === employee.id && 
        req.status === 'Approved' && 
        (req.type === code || req.type === policy.leaveName) &&
        !(req.reason && req.reason.startsWith('Automatic policy allocation:'))
      )
      .reduce((sum, req) => sum + (Number(req.days) || 0), 0);

    return Math.max(0, initialQuota - approvedDaysTaken);
  };

  // Balance edit trigger
  const handleEditBalanceClick = (employee) => {
    setBalanceEditEmployee(employee);
    
    const inputs = {};
    activePolicies.forEach(policy => {
      const code = policy.leaveCode;
      const fieldName = code === 'ML' ? 'maternityBalance' : `${code.toLowerCase()}Balance`;
      let val = typeof employee[fieldName] === 'number' ? employee[fieldName] : (policy.defaultDays || 0);
      inputs[code] = val;
    });
    setBalanceInput(inputs);
  };

  // Save modified balance
  const handleSaveBalance = async () => {
    if (!balanceEditEmployee) return;

    const updates = {};
    activePolicies.forEach(policy => {
      const code = policy.leaveCode;
      const val = balanceInput[code] || 0;
      if (code === 'CL') updates.clBalance = val;
      else if (code === 'SL') updates.slBalance = val;
      else if (code === 'PL') updates.plBalance = val;
      else if (code === 'ML') updates.maternityBalance = val;
      else updates[code + 'Balance'] = val;
    });

    await updateEmployee(balanceEditEmployee.id, updates);

    addToast('success', `Adjusted leave balances for ${balanceEditEmployee.name}.`);
    setBalanceEditEmployee(null);

    setAlertsFeed(prev => [
      {
        id: `AL-${Math.random().toString(36).substring(2, 9)}`,
        type: 'info',
        message: `Balances manually overridden for ${balanceEditEmployee.name}.`,
        timestamp: 'Just now',
        read: false
      },
      ...prev
    ]);
  };

  // Columns definition for Main Leaves History
  const historyColumns = [
    {
      key: 'employeeName',
      header: FIELD_LABELS.name,
      sortable: true,
      render: (row) => (
        <div className="flex-center gap-3 justify-start">
          <Avatar name={row.employeeName} size="sm" />
          <div className="flex-column items-start justify-center">
            <span className="emp-name-bold">{row.employeeName}</span>
            <span className="text-muted text-xs font-mono">{row.employeeId || 'EMP-2026-006'}</span>
          </div>
        </div>
      )
    },
    { key: 'type', header: 'Leave Type', sortable: true },
    { key: 'fromDate', header: 'From Date', sortable: true },
    { key: 'toDate', header: 'To Date', sortable: true },
    {
      key: 'days',
      header: 'Days',
      sortable: true,
      render: (row) => <strong className="text-sm">{row.days} days</strong>
    },
    {
      key: 'status',
      header: FIELD_LABELS.leaveStatus,
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'Approved' ? 'success' : row.status === 'Pending' ? 'warning' : 'danger'}>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
          <button
            className="action-btn-mini view-btn"
            onClick={() => handleRowClick(row)}
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            className="action-btn-mini edit-btn"
            onClick={() => handleEditLeaveClick(row)}
            title={row.status === 'Pending' ? "Edit Leave Request" : "Cannot edit approved/rejected requests"}
            disabled={row.status !== 'Pending'}
          >
            <Edit size={14} />
          </button>
          {row.status === 'Pending' && currentUserRole !== 'employee' && (
            <>
              <button
                className="action-btn-mini success-btn"
                onClick={() => handleApprove(row.id, row.employeeName)}
                title="Quick Approve"
              >
                <Check size={14} />
              </button>
              <button
                className="action-btn-mini danger-btn"
                onClick={() => handleReject(row.id, row.employeeName)}
                title="Quick Reject"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="leaves-page grid-gap animate-fade-in">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="card" style={{ height: '400px' }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // EMPLOYEE PERSONAL LEAVE DASHBOARD
  // ═══════════════════════════════════════
  if (currentUserRole === 'employee') {
    // Build balance cards from policy configs
    const myLeaves = leavesList; // already scoped to current user
    
    const myHolidays = holidaysList || [];

    // Use policies from the database only — no hardcoded fallbacks
    const currentPolicies = leavePolicyConfigs || [];

    const getPolicyCodeOfRequest = (type) => {
      const t = (type || '').toLowerCase();
      if (t === 'cl' || t === 'casual' || t === 'casual leave') return 'CL';
      if (t === 'sl' || t === 'sick' || t === 'sick leave') return 'SL';
      if (t === 'pl' || t === 'el' || t === 'paid' || t === 'paid leave' || t === 'earned' || t === 'earned leave') return 'PL';
      if (t === 'ml' || t === 'maternity' || t === 'maternity leave') return 'ML';
      if (t === 'ul' || t === 'unpaid' || t === 'unpaid leave') return 'UL';
      return type;
    };

    // Filter policies based on gender restriction
    const filteredPolicies = currentPolicies.filter(p => {
      if (!p.isActive) return false;
      if (p.genderRestriction && p.genderRestriction !== 'All' && currentUser?.gender) {
        return p.genderRestriction.toLowerCase() === currentUser.gender.toLowerCase();
      }
      return true;
    });

    const balances = filteredPolicies.map(policy => {
      const code = policy.leaveCode;
      const total = (() => {
        if (code === 'CL' && typeof currentUser?.clBalance === 'number') return currentUser.clBalance;
        if (code === 'SL' && typeof currentUser?.slBalance === 'number') return currentUser.slBalance;
        if (code === 'PL' && typeof currentUser?.plBalance === 'number') return currentUser.plBalance;
        if (code === 'ML' && typeof currentUser?.maternityBalance === 'number') return currentUser.maternityBalance;
        return policy.defaultDays || 0;
      })();
      const used = myLeaves
        .filter(r => r.status === 'Approved' && getPolicyCodeOfRequest(r.type) === code && !(r.reason || '').startsWith('Automatic policy allocation:'))
        .reduce((s, r) => s + (Number(r.days) || 0), 0);
      return { type: code, label: policy.leaveName, total, used };
    });

    const tabCounts = {
      Pending:  myLeaves.filter(l => l.status === 'Pending').length,
      Approved: myLeaves.filter(l => l.status === 'Approved').length,
      Rejected: myLeaves.filter(l => l.status === 'Rejected').length,
      All:      myLeaves.length,
    };

    const [empStatusTab, setEmpStatusTab] = empStatusTabState;
    const [applyPanelOpen, setApplyPanelOpen] = applyPanelOpenState;

    const filteredMyLeaves = empStatusTab === 'All'
      ? [...myLeaves].sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
      : myLeaves.filter(l => l.status === empStatusTab).sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate));

    const handleEmpApply = (formData) => {
      const typeLabel = formData.type === 'CL' ? 'Casual Leave' : 
                        formData.type === 'SL' ? 'Sick Leave' : 
                        formData.type === 'PL' ? 'Earned Leave' : 
                        formData.type;

      if (editingLeave) {
        const updatedRequest = {
          ...editingLeave,
          type: typeLabel,
          fromDate: formData.fromDate,
          toDate: formData.toDate,
          days: formData.days,
          reason: formData.reason || '',
          history: [
            ...(editingLeave.history || []),
            { date: new Date().toISOString().split('T')[0], status: 'Pending', comment: 'Edited by employee' }
          ]
        };
        updateLeaveRequest(editingLeave.id, updatedRequest);
        addToast('success', 'Leave request updated successfully.');
        setEditingLeave(null);
      } else {
        const newRequest = {
          id: `LR-${Math.floor(100 + Math.random() * 900)}`,
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          department: currentUser.department || '',
          type: typeLabel,
          fromDate: formData.fromDate,
          toDate: formData.toDate,
          days: formData.days,
          reason: formData.reason || '',
          status: 'Pending',
          appliedDate: new Date().toISOString().split('T')[0],
          history: [{ date: new Date().toISOString().split('T')[0], status: 'Pending', comment: 'Applied by employee' }]
        };
        addLeaveRequest(newRequest);
        addToast('success', 'Leave request submitted successfully.');
      }
      if (fetchLeaves) fetchLeaves(); // Refresh the list from the server
    };

    const handleEmpCancel = (leaveId) => {
      showConfirm(
        'Cancel Leave Request',
        'Are you sure you want to cancel this leave request?',
        () => {
          const leave = myLeaves.find(l => l.id === leaveId);
          if (leave) {
            updateLeaveRequest(leaveId, { ...leave, status: 'Cancelled' });
            addToast('success', 'Leave request cancelled.');
            if (fetchLeaves) fetchLeaves(); // Refresh the list from the server
          }
        },
        'danger'
      );
    };

    const handleEmpEdit = (leave) => {
      setEditingLeave(leave);
      setApplyPanelOpen(true);
      setTimeout(() => {
        const el = document.getElementById('apply-leave-panel-container');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    const totalAvailable = balances.filter(b => b.type !== 'UL').reduce((s, b) => s + Math.max(0, b.total - b.used), 0);
    const totalUsed = balances.filter(b => b.type !== 'UL').reduce((s, b) => s + b.used, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>

        {/* ── Page Header ── */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px',
          background: 'var(--bg-card)',
          padding: '20px 24px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--color-success, #10b981), #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)'
            }}>
              <BsUmbrella size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>My Leaves</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Track your balance, requests &amp; upcoming time off</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                if (fetchLeaves) {
                  fetchLeaves();
                  addToast('success', 'Refreshed leave data');
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Refresh Data"
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            >
              <MdRefresh size={18} />
            </button>
            <button
              onClick={() => setApplyPanelOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0 22px', height: '40px',
                background: 'linear-gradient(135deg, var(--color-success, #10b981), #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)'; }}
            >
              <FiPlus size={16} />
              Apply for Leave
            </button>
          </div>
        </div>

        {/* ── Apply Panel (inline, slides down) ── */}
        <div id="apply-leave-panel-container">
          <ApplyLeavePanel
            open={applyPanelOpen}
            onClose={() => { setApplyPanelOpen(false); setEditingLeave(null); }}
            onSubmit={handleEmpApply}
            balances={balances}
            holidays={myHolidays}
            editingLeave={editingLeave}
          />
        </div>

        {/* ── Quick Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { 
              label: 'Available Balance', 
              value: totalAvailable, 
              color: 'var(--color-success, #10b981)', 
              bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.07) 0%, rgba(16, 185, 129, 0.02) 100%)', 
              border: 'rgba(16, 185, 129, 0.2)',
              icon: BsCalendarCheck,
              iconColor: '#10b981',
              desc: 'Days remaining for use'
            },
            { 
              label: 'Leaves Used', 
              value: totalUsed, 
              color: 'var(--color-warning, #f59e0b)', 
              bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.07) 0%, rgba(245, 158, 11, 0.02) 100%)', 
              border: 'rgba(245, 158, 11, 0.2)',
              icon: FiClock,
              iconColor: '#f59e0b',
              desc: 'Approved days taken'
            },
            { 
              label: 'Pending Approval', 
              value: tabCounts.Pending, 
              color: 'var(--color-info, #3b82f6)', 
              bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.07) 0%, rgba(59, 130, 246, 0.02) 100%)', 
              border: 'rgba(59, 130, 246, 0.2)',
              icon: MdHourglassEmpty,
              iconColor: '#3b82f6',
              desc: 'Awaiting manager response'
            },
            { 
              label: 'Approved Filings', 
              value: tabCounts.Approved, 
              color: 'var(--color-success, #10b981)', 
              bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.07) 0%, rgba(16, 185, 129, 0.02) 100%)', 
              border: 'rgba(16, 185, 129, 0.2)',
              icon: MdCheckCircle,
              iconColor: '#10b981',
              desc: 'Successfully processed'
            },
          ].map((s, i) => {
            const CardIcon = s.icon;
            return (
              <div 
                key={i} 
                style={{ 
                  background: 'var(--bg-card)', 
                  backgroundImage: s.bg,
                  border: `1px solid var(--border-color)`, 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = s.iconColor;
                  e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.08)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.02)';
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{s.label}</div>
                  <div style={{ fontSize: '2.1rem', fontWeight: 800, color: s.color, lineHeight: 1.1, marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: `${s.iconColor}12`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CardIcon size={22} style={{ color: s.iconColor }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Leave Balance Cards ── */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '22px 24px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{ 
            fontSize: '0.8rem', 
            fontWeight: 800, 
            color: 'var(--text-primary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FiBriefcase size={16} style={{ color: 'var(--color-success)' }} />
            <span>Leave Balances & Limits</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {balances.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px', textAlign: 'center', gridColumn: '1/-1' }}>
                No active leave policies configured
              </div>
            ) : (
              balances.map(b => <LeaveBalanceCard key={b.type} type={b.type} label={b.label} total={b.total} used={b.used} />)
            )}
          </div>
        </div>

        {/* ── Request Cards Section ── */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--radius-xl)', 
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{
            padding: '20px 24px 0',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <FiCalendar size={16} style={{ color: 'var(--color-info)' }} />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                Filing Status & History
              </h3>
            </div>
            <LeaveFilterTabs active={empStatusTab} onChange={setEmpStatusTab} counts={tabCounts} />
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredMyLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <FiCalendar size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.25, color: 'var(--text-muted)' }} />
                No {empStatusTab === 'All' ? '' : empStatusTab.toLowerCase()} leave requests found
              </div>
            ) : (
              filteredMyLeaves.map(leave => (
                <LeaveRequestCard key={leave.id} leave={leave} onCancel={handleEmpCancel} onEdit={handleEmpEdit} />
              ))
            )}
          </div>
        </div>

        {/* ── Bottom Section: Chart + Holidays ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
          <LeaveUsageChart leaveRequests={myLeaves} />
          <UpcomingHolidays holidays={myHolidays} />
        </div>

      </div>
    );
  }

  return (
    <div className="leaves-page flex-column grid-gap">
      
      {/* 1. Header Strip */}
      <div className="page-header-row justify-between">
        <div>
          <h2>Leave Management Control</h2>
          <p className="page-desc-text">Oversee balances, request approvals, policy overrides, and company calendars</p>
        </div>
        <div className="flex align-center gap-3">
          {currentUserRole !== 'employee' && (
            <>
              {currentUserRole === 'manager' && (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => {
                    setEditingLeave(null);
                    setApplyForm({
                      employeeId: currentUser?.id || '',
                      customLeaveType: 'CL',
                      startDate: new Date().toISOString().split('T')[0],
                      days: 1,
                      reason: ''
                    });
                    setApplyModalOpen(true);
                  }}
                >
                  Apply Leave
                </Button>
              )}
              <Button variant="secondary" icon={Settings2} onClick={() => { setActiveTab('policies'); addToast('info', 'Viewing Policy & Leave Settings'); }}>
                Policy Controls
              </Button>
              <Button variant="secondary" icon={Plus} onClick={() => setShowAddHolidayModal(true)}>
                Add Holiday
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Top-level Module Tabs Menu */}
      <div className="tabs-header-strip flex-row justify-between items-center w-full">
        <div className="tabs-navigation-buttons">
          {[
            { key: 'requests', label: 'Requests & Approval Center', icon: UserCheck },
            { key: 'analytics', label: 'Analytics & Team Calendar', icon: BarChart3 },
            { key: 'balances', label: 'Balances & Policy Limits', icon: HeartPulse },
            { key: 'holidays', label: 'Holiday & Report Exports', icon: Calendar },
            { key: 'policies', label: 'Admin Leave Table', icon: Database }
          ].filter(tab => {
            if (currentUserRole === 'employee') {
              return tab.key === 'requests' || tab.key === 'holidays';
            }
            return true;
          }).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-btn-item flex-center gap-2 ${activeTab === tab.key ? 'active' : ''}`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
      </div>

      {/* ==================== TAB 1: REQUESTS & APPROVALS ==================== */}
      {activeTab === 'requests' && (
        <div className="leaves-tab-layout full-width">
          
          <div className="leaves-main-panel flex-column grid-gap">
            
            {/* Top KPI Cards Row */}
            <div className="leaves-kpi-grid">
              <div 
                className="kpi-card-custom gradient-blue"
                onClick={() => { setStatusTab('All'); setActiveTab('requests'); scrollToTable(); }}
              >
                <div className="kpi-info-sec">
                  <span className="kpi-title">Total Filings</span>
                  <span className="kpi-value">{totalRequestsCount}</span>
                </div>
                <div className="kpi-icon-sec">
                  <Briefcase size={28} />
                </div>
              </div>

              <div 
                className="kpi-card-custom gradient-orange"
                onClick={() => { setStatusTab('Pending'); setActiveTab('requests'); scrollToTable(); }}
              >
                <div className="kpi-info-sec">
                  <span className="kpi-title">Pending Action</span>
                  <span className="kpi-value">{pendingRequestsCount}</span>
                </div>
                <div className="kpi-icon-sec">
                  <Clock size={28} />
                </div>
              </div>

              <div 
                className="kpi-card-custom gradient-green"
                onClick={() => { setStatusTab('Approved'); setActiveTab('requests'); scrollToTable(); }}
              >
                <div className="kpi-info-sec">
                  <span className="kpi-title">Approved Leaves</span>
                  <span className="kpi-value">{approvedRequestsCount}</span>
                </div>
                <div className="kpi-icon-sec">
                  <CheckCircle2 size={28} />
                </div>
              </div>

              <div 
                className="kpi-card-custom gradient-red"
                onClick={() => { setStatusTab('Rejected'); setActiveTab('requests'); scrollToTable(); }}
              >
                <div className="kpi-info-sec">
                  <span className="kpi-title">Rejected Filings</span>
                  <span className="kpi-value">{rejectedRequestsCount}</span>
                </div>
                <div className="kpi-icon-sec">
                  <ShieldAlert size={28} />
                </div>
              </div>

              <div 
                className="kpi-card-custom gradient-purple"
                onClick={() => { setStatusTab('OnLeaveToday'); setActiveTab('requests'); scrollToTable(); }}
              >
                <div className="kpi-info-sec">
                  <span className="kpi-title">On Leave Today</span>
                  <span className="kpi-value">{onLeaveTodayCount}</span>
                </div>
                <div className="kpi-icon-sec">
                  <Users size={28} />
                </div>
              </div>

              <div 
                className="kpi-card-custom gradient-pink"
                onClick={() => { setActiveTab('analytics'); }}
              >
                <div className="kpi-info-sec">
                  <span className="kpi-title">Utilization Rate</span>
                  <span className="kpi-value">{leaveUtilizationRate}</span>
                </div>
                <div className="kpi-icon-sec">
                  <TrendingUp size={28} />
                </div>
              </div>
            </div>

            {/* Filters panel */}
            <div className="card filters-card-wrapper">
              <div className="filters-header-row">
                <div className="flex-center gap-2">
                  <Filter size={18} className="text-primary" />
                  <h4>Search & Multi-Filters</h4>
                </div>
                <button 
                  className="reset-filters-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterLeaveType('All');
                    setFilterDept('All');
                    setStatusTab('Pending');
                  }}
                >
                  Clear Filters
                </button>
              </div>
              <div className="filters-controls-grid">
                <div className="filter-input-box">
                  <label>Search Employee / Request ID</label>
                  <div className="search-field-inner">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Type name, ID or department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="filter-input-box">
                  <label>Leave Category</label>
                  <select value={filterLeaveType} onChange={(e) => setFilterLeaveType(e.target.value)}>
                    <option value="All">All Categories</option>
                    {leavePolicyConfigs.filter(p => p.isActive).map(policy => (
                      <option key={policy.leaveCode} value={policy.leaveName}>
                        {policy.leaveName} ({policy.leaveCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-input-box">
                  <label>Department</label>
                  <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                    <option value="All">All Departments</option>
                    {(departments || []).map(d => (
                      <option key={d.id || d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-input-box">
                  <label>Date Filter</label>
                  <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value)}>
                    <option value="All">All Dates</option>
                    <option value="Today">Applied Today</option>
                    <option value="Week">This Week</option>
                    <option value="Month">This Month</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Approval Sub-tab Strip */}
            <div className="approval-status-tabs card">
              <div className="flex-row justify-between items-center flex-wrap gap-2">
                <div className="status-selection-list">
                  {[
                    { key: 'Pending', label: 'Pending Requests', count: leavesList.filter(l => l.status === 'Pending').length, color: 'warning' },
                    { key: 'Approved', label: 'Approved Leaves', count: leavesList.filter(l => l.status === 'Approved').length, color: 'success' },
                    { key: 'Rejected', label: 'Rejected Filings', count: leavesList.filter(l => l.status === 'Rejected').length, color: 'danger' },
                    { key: 'OnLeaveToday', label: 'On Leave Today', count: onLeaveTodayCount, color: 'purple' },
                    { key: 'All', label: 'Full Leave Directory', count: leavesList.length, color: 'neutral' }
                  ].map(statusItem => (
                    <button
                      key={statusItem.key}
                      className={`status-tab-btn ${statusTab === statusItem.key ? 'active' : ''}`}
                      onClick={() => setStatusTab(statusItem.key)}
                    >
                      <span>{statusItem.label}</span>
                      <span className={`status-tab-badge bg-var-${statusItem.color}`}>
                        {statusItem.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex-center gap-2">
                  <Button variant="secondary" icon={FileSpreadsheet} onClick={() => addToast('info', 'Simulated PDF leave checklist export started.')}>
                    Export List
                  </Button>
                </div>
              </div>

              <div className="table-inner-wrapper mt-4">
                <DataTable
                  columns={historyColumns}
                  data={getFilteredLeaves()}
                  loading={isLoading}
                  rowsPerPage={10}
                  emptyTitle={`No ${statusTab} Requests Found`}
                  emptyDescription="Try clearing your search keyword or switching filters."
                  emptyActionText="Clear Filters"
                  emptyOnActionClick={() => {
                    setSearchQuery('');
                    setFilterLeaveType('All');
                    setFilterDept('All');
                    setStatusTab('All');
                  }}
                  emptyActionIcon={CalendarDays}
                />
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ==================== TAB 2: ANALYTICS & CALENDARS ==================== */}
      {activeTab === 'analytics' && (
        <div className="leaves-tab-layout-vertical animate-fade-in flex-column grid-gap">
          
          {/* Charts Row */}
          <div className="analytics-charts-grid">
            <div className="card chart-box">
              <div className="chart-header">
                <h4>Leave Filing Trends (Monthly)</h4>
                <p className="text-xs text-muted">Analysis of seasonal leaves requests versus approval volume</p>
              </div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-pink-solid)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--accent-pink-solid)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-green-solid)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--accent-green-solid)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="requests" stroke="var(--accent-pink-solid)" fillOpacity={1} fill="url(#reqGrad)" name="Filed Requests" />
                    <Area type="monotone" dataKey="approved" stroke="var(--accent-green-solid)" fillOpacity={1} fill="url(#appGrad)" name="Approved Requests" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card chart-box">
              <div className="chart-header">
                <h4>Leave Type Distribution</h4>
                <p className="text-xs text-muted">Breakdown of absence reasons across active employees</p>
              </div>
              <div className="flex-row justify-center items-center" style={{ width: '100%', height: 280 }}>
                <div style={{ width: '60%', height: '100%' }}>
                  <ResponsiveContainer>
                    <RechartsPieChart>
                      <Pie
                        data={typesDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {typesDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="pie-legend flex-column items-start justify-center gap-2" style={{ width: '40%' }}>
                  {typesDistributionData.map((item, idx) => (
                    <div key={idx} className="flex-center gap-2 justify-start">
                      <span className="pie-legend-bullet" style={{ backgroundColor: item.color }}></span>
                      <span className="text-xs text-secondary">{item.name} ({item.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-data-grid">
            
            {/* Department Wise analytics */}
            <div className="card dept-analytics-table-box">
              <div className="table-header-row justify-between mb-4">
                <div>
                  <h4>Department-Wise Leave Analytics</h4>
                  <p className="text-muted text-xs">Total count of filings, approvals, and pending metrics by branch sectors</p>
                </div>
              </div>
              <div className="dept-data-grid">
                <table>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total Leaves Filings</th>
                      <th>Leave Requests</th>
                      <th>Approved</th>
                      <th>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentAnalyticsData.map((dept, index) => (
                      <tr key={index}>
                        <td><strong>{dept.department}</strong></td>
                        <td>{dept.totalLeaves}</td>
                        <td>{dept.leaveRequests}</td>
                        <td>
                          <Badge variant="success">{dept.approved} approved</Badge>
                        </td>
                        <td>
                          <Badge variant="warning">{dept.pending} pending</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Team Calendar Grid Availability */}
            <div className="card team-leave-calendar-card">
              <div className="calendar-card-header justify-between mb-4">
                <div>
                  <h4>Team Leave Calendar</h4>
                  <p className="text-muted text-xs">Visual resource availability mapping and planned team departures</p>
                </div>
                <div className="flex-center gap-2">
                  <select 
                    value={calendarMonth} 
                    onChange={(e) => setCalendarMonth(e.target.value)}
                    className="calendar-month-select"
                  >
                    {calendarMonthOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="calendar-month-grid">
                {calendarDays.map((day) => (
                  <div key={day.dayNum} className="calendar-day-tile">
                    <div className="day-header flex-row justify-between">
                      <span className="day-number">{day.dayNum}</span>
                      <span className={`availability-indicator ${day.availability < 100 ? 'restricted' : 'clear'}`}>
                        {day.availability}% avail
                      </span>
                    </div>
                    <div className="day-leaves-list">
                      {day.leaves.map((leave, idx) => (
                        <div key={idx} className={`calendar-leave-chip color-${leave.color}`} title={`${leave.name} on ${{ 'CL': 'Casual Leave', 'SL': 'Sick Leave', 'PL': 'Paid Leave', 'ML': 'Maternity Leave', 'UL': 'Unpaid Leave' }[leave.type] || leave.type}`}>
                          {leave.name.split(' ')[0]} ({
                            {
                              'CL': 'Casual Leave',
                              'SL': 'Sick Leave',
                              'PL': 'Paid Leave',
                              'ML': 'Maternity Leave',
                              'UL': 'Unpaid Leave'
                            }[leave.type] || leave.type
                          })
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="calendar-legend-row flex-row gap-4 mt-3">
                <div className="flex-center gap-2">
                  <span className="legend-box color-green"></span>
                  <span className="text-xs">Annual Leaves (PL)</span>
                </div>
                <div className="flex-center gap-2">
                  <span className="legend-box color-orange"></span>
                  <span className="text-xs">Casual Leaves (CL)</span>
                </div>
                <div className="flex-center gap-2">
                  <span className="legend-box color-pink"></span>
                  <span className="text-xs">Sick Leaves (SL)</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ==================== TAB 3: BALANCES & POLICIES ==================== */}
      {activeTab === 'balances' && (
        <div className="leaves-tab-layout with-sidebar animate-fade-in">
          
          {/* Left panel: Balance Table */}
          <div className="leaves-main-panel flex-column grid-gap">
            <div className="card balance-table-card">
              <div className="table-header-row justify-between mb-4">
                <div>
                  <h4>Employee Leave Balance Table</h4>
                  <p className="text-muted text-xs">Override or review sick, casual, maternity, and paid leave quotas</p>
                </div>
              </div>

              <div className="balances-data-grid">
                <table>
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Employee Name</th>
                      {activePolicies.map(policy => (
                        <th key={policy.id}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{policy.leaveName}</span>
                            <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 400 }}>
                              Allocated: {policy.defaultDays} days/month
                            </span>
                          </div>
                        </th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td><strong className="text-xs font-mono">{emp.id}</strong></td>
                        <td>{emp.name}</td>
                        {activePolicies.map(policy => {
                          const remaining = getRemainingBalance(emp, policy);
                          const total = policy.defaultDays;
                          const used = total - remaining;
                          const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
                          const badgeClass = 
                            remaining === 0 ? 'danger-badge' :
                            remaining < total * 0.5 ? 'warning-badge' :
                            policy.leaveCode === 'CL' ? 'cl-badge' :
                            policy.leaveCode === 'SL' ? 'sl-badge' :
                            policy.leaveCode === 'PL' ? 'pl-badge' : 'neutral-badge';
                          return (
                            <td key={policy.id}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className={`balance-badge ${badgeClass}`}>{remaining} days</span>
                                  <span style={{ fontSize: '10px', opacity: 0.55 }}>/ {total}</span>
                                </div>
                                <div style={{ 
                                  height: '3px', 
                                  background: 'var(--border-color)', 
                                  borderRadius: '2px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{ 
                                    height: '100%', 
                                    width: `${pct}%`,
                                    background: remaining === 0 ? 'var(--accent-pink-solid)' : 
                                               remaining < total * 0.5 ? 'var(--accent-orange, #f59e0b)' : 
                                               'var(--accent-green-solid)',
                                    borderRadius: '2px',
                                    transition: 'width 0.3s ease'
                                  }} />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td>
                          {currentUserRole !== 'employee' && (
                            <button
                              className="action-btn-mini edit-btn"
                              onClick={() => handleEditBalanceClick(emp)}
                              title="Edit Quotas"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave directory cards - dynamically from policy configs */}
            <div className="leave-types-directory-header mt-2">
              <h4>Leave Types Directory</h4>
              <p className="text-xs text-muted">Definitions and annual limits for all company-permitted absence codes</p>
            </div>
            <div className="leave-types-grid">
              {leaveTypesList.filter(p => p.active).map((item, index) => (
                <div key={index} className="card leave-type-card">
                  <div className="leave-type-card-header flex-row justify-between items-center">
                    <span className="type-badge-code">{item.code}</span>
                    <span className="type-quota-limit">{item.quota}</span>
                  </div>
                  <h5 className="type-title-text mt-2">{item.name}</h5>
                  <p className="type-desc-text mt-1">{item.desc}</p>
                  {item.maxCarry > 0 && (
                    <span className="text-xs text-muted mt-2">Max Carry Forward: {item.maxCarry} days</span>
                  )}
                  {item.genderRestriction !== 'All' && (
                    <span className="text-xs text-primary mt-1">🎯 {item.genderRestriction} only</span>
                  )}
                </div>
              ))}
            </div>

          </div>

          {/* Right Panel: Policy Settings */}
          <div className="leaves-right-sidebar card">
            <div className="policy-settings-header flex-center gap-2 justify-start mb-4">
              <Settings size={18} className="text-primary" />
              <h4>Leave Policy Management</h4>
            </div>

            <div className="policy-form flex-column gap-4">
              <div className="policy-form-field">
                <label>Accrual Rules Cycle</label>
                <select 
                  value={policies.accrualRate} 
                  onChange={(e) => setPolicies({ ...policies, accrualRate: e.target.value })}
                >
                  <option value="Monthly">Monthly Accruals</option>
                  <option value="Quarterly">Quarterly Accruals</option>
                  <option value="Annual">Annual Allotment</option>
                </select>
              </div>

              {/* Dynamic Active Policy Rates */}
              <div className="active-policies-quick-settings flex-column gap-3">
                <h5 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Active Policy Parameters
                </h5>
                {activePolicies.map(policy => {
                  const rates = policyRates[policy.id] || {
                    defaultDays: policy.defaultDays,
                    maxCarryForward: policy.maxCarryForward
                  };
                  return (
                    <div key={policy.id} className="active-policy-item-box p-3 border rounded" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-xs" style={{ color: 'var(--accent-blue-solid)' }}>
                          {policy.leaveName} ({policy.leaveCode})
                        </span>
                        <Badge variant="success">Active</Badge>
                      </div>
                      
                      <div className="policy-form-field mb-2">
                        <label style={{ fontSize: '11px', opacity: 0.85 }}>Monthly Quota (Days)</label>
                        <input 
                          type="number"
                          min="0"
                          value={rates.defaultDays}
                          onChange={(e) => setPolicyRates(prev => ({
                            ...prev,
                            [policy.id]: {
                              ...(prev[policy.id] || { maxCarryForward: policy.maxCarryForward }),
                              defaultDays: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>

                      <div className="policy-form-field">
                        <label style={{ fontSize: '11px', opacity: 0.85 }}>Carry Forward Limit (Max Days)</label>
                        <input 
                          type="number"
                          min="0"
                          value={rates.maxCarryForward}
                          onChange={(e) => setPolicyRates(prev => ({
                            ...prev,
                            [policy.id]: {
                              ...(prev[policy.id] || { defaultDays: policy.defaultDays }),
                              maxCarryForward: parseInt(e.target.value) || 0
                            }
                          }))}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="policy-checkbox-toggles flex-column gap-3 mt-2">
                <label className="checkbox-toggle-label">
                  <input
                    type="checkbox"
                    checked={policies.halfDayPolicy}
                    onChange={(e) => setPolicies({ ...policies, halfDayPolicy: e.target.checked })}
                  />
                  <div className="checkbox-text-sec">
                    <span>Half-day Policy</span>
                    <p className="text-xs text-muted">Allow employees to file for half-day AM/PM leaves</p>
                  </div>
                </label>

                <label className="checkbox-toggle-label">
                  <input
                    type="checkbox"
                    checked={policies.holidayEncashment}
                    onChange={(e) => setPolicies({ ...policies, holidayEncashment: e.target.checked })}
                  />
                  <div className="checkbox-text-sec">
                    <span>Holiday Encashment</span>
                    <p className="text-xs text-muted">Allow conversion of leftover PL into end-of-year bonuses</p>
                  </div>
                </label>

                <label className="checkbox-toggle-label">
                  <input
                    type="checkbox"
                    checked={policies.restrictDoubleFilings}
                    onChange={(e) => setPolicies({ ...policies, restrictDoubleFilings: e.target.checked })}
                  />
                  <div className="checkbox-text-sec">
                    <span>Restrict Double Filings</span>
                    <p className="text-xs text-muted">Prevent overlap filings on already approved dates</p>
                  </div>
                </label>

                <label className="checkbox-toggle-label">
                  <input
                    type="checkbox"
                    checked={policies.useGlobalPolicyTable}
                    onChange={(e) => setPolicies({ ...policies, useGlobalPolicyTable: e.target.checked })}
                  />
                  <div className="checkbox-text-sec">
                    <span>Use Global Policy Table</span>
                    <p className="text-xs text-muted">Apply admin-defined default days from policy table</p>
                  </div>
                </label>
              </div>

              <div className="mt-4 pt-4 border-top">
                <Button 
                  variant="primary" 
                  onClick={handleSavePolicyConfigs}
                  className="w-full"
                >
                  Save Policy Configs
                </Button>

              </div>

              <div className="mt-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setActiveTab('policies')}
                  className="w-full flex-center gap-2"
                  icon={Database}
                >
                  Manage Leave Policy Table
                </Button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB 4: HOLIDAYS & REPORTS ==================== */}
      {activeTab === 'holidays' && (
        <div className="leaves-tab-layout with-sidebar animate-fade-in">
          
          {/* Left panel: Holidays Calendar */}
          <div className="leaves-main-panel flex-column grid-gap">
            <div className="card holidays-calendar-card">
              <div className="table-header-row justify-between mb-4">
                <div>
                  <h4>Company Holiday Calendar</h4>
                  <p className="text-muted text-xs">Approved scheduled holidays for the current fiscal calendar year</p>
                </div>
                {currentUserRole !== 'employee' && (
                  <div className="flex-center gap-2">
                    <Button variant="secondary" icon={Plus} onClick={() => setShowAddHolidayModal(true)}>
                      Add Holiday
                    </Button>
                  </div>
                )}
              </div>

              <div className="holidays-table-view">
                <table>
                  <thead>
                    <tr>
                      <th>Holiday Date</th>
                      <th>Holiday Description</th>
                      <th>Category</th>
                      <th>Detailed Summary</th>
                      {currentUserRole !== 'employee' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {holidaysList.map((hol) => (
                      <tr key={hol.id}>
                        <td><strong className="text-sm">{hol.date}</strong></td>
                        <td><strong>{hol.name}</strong></td>
                        <td>
                          <Badge variant={
                            hol.type === 'National' ? 'purple' :
                            hol.type === 'Regional' ? 'warning' :
                            hol.type === 'Company' ? 'success' : 'neutral'
                          }>
                            {hol.type} Holiday
                          </Badge>
                        </td>
                        <td className="text-secondary text-xs">{hol.description}</td>
                        {currentUserRole !== 'employee' && (
                          <td>
                            <div className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="action-btn-mini danger-btn"
                                onClick={() => handleDeleteHolidayClick(hol)}
                                title="Delete Holiday"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right panel: Reports Exporter */}
          <div className="leaves-right-sidebar card">
            <div className="policy-settings-header flex-center gap-2 justify-start mb-4">
              <FileSpreadsheet size={18} className="text-primary" />
              <h4>Reports & Exports</h4>
            </div>

            <form onSubmit={handleGenerateReport} className="reports-export-form flex-column gap-4">
              <div className="policy-form-field">
                <label>Target Report Category</label>
                <select 
                  value={reportType} 
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <optgroup label="Leave Statuses">
                    <option value="Daily Leave Record">Daily Leave Record</option>
                    <option value="Monthly Leave Report">Monthly Leave Report</option>
                    <option value="Annual Leave Summary">Annual Leave Summary</option>
                  </optgroup>
                  <optgroup label="Employee Records">
                    <option value="Leave Balance Status">Leave Balance Status</option>
                    <option value="Leave History Report">Leave History Report</option>
                    <option value="Leave Calendar Report">Leave Calendar Report</option>
                  </optgroup>
                  <optgroup label="Department Analytics">
                    <option value="Department Leave Analytics">Department Leave Analytics</option>
                    <option value="Project Leave Analytics">Project Leave Analytics</option>
                  </optgroup>
                </select>
              </div>

              <div className="policy-form-field">
                <label>Export File Format</label>
                <div className="format-selection-chips flex-row gap-2">
                  {['PDF', 'Excel', 'CSV'].map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      className={`format-chip-btn ${exportFormat === fmt ? 'active' : ''}`}
                      onClick={() => setExportFormat(fmt)}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="policy-form-field mt-2">
                <Button 
                  type="submit"
                  variant="primary" 
                  disabled={isExporting}
                  className="w-full flex-center gap-2 justify-center"
                >
                  <Download size={16} />
                  <span>{isExporting ? 'Generating...' : 'Generate & Export'}</span>
                </Button>
              </div>

              {isExporting && (
                <div className="progress-bar-wrapper mt-3 flex-column gap-1">
                  <div className="flex-row justify-between text-xs text-muted">
                    <span>Processing report queries...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${exportProgress}%` }}></div>
                  </div>
                </div>
              )}

            </form>
          </div>

        </div>
      )}

      {/* ==================== TAB 5: ADMIN POLICY TABLE ==================== */}
      {activeTab === 'policies' && (
        <div className="leaves-tab-layout-vertical animate-fade-in flex-column grid-gap">
          
          {/* Policy Management Header */}
          <div className="card filters-card-wrapper">
            <div className="filters-header-row">
              <div className="flex-center gap-2">
                <Database size={18} className="text-primary" />
                <h4>Global Leave Policy Configuration Table</h4>
              </div>
              <div className="flex-center gap-2">
                <Button variant="primary" icon={Plus} onClick={() => setShowAssignLeaveModal(true)} disabled={true}>
                  Leave assign
                </Button>
                <Button variant="danger" icon={RefreshCw} onClick={handleResetAllPolicies}>
                  Reset to Default
                </Button>
                <Button variant="primary" icon={Plus} onClick={() => setShowAddPolicyModal(true)}>
                  Add New Policy
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted mt-2">
              Configure default leave quotas for all employees. Changes here will apply as default entitlements during leave balance initialization.
            </p>
          </div>

          {/* Policy Filters */}
          <div className="card filters-card-wrapper">
            <div className="filters-controls-grid">
              <div className="filter-input-box">
                <label>Search Policy</label>
                <div className="search-field-inner">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by code or name..."
                    value={policySearchQuery}
                    onChange={(e) => setPolicySearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-input-box">
                <label>Gender Restriction</label>
                <select value={filterPolicyGender} onChange={(e) => setFilterPolicyGender(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="All">Unrestricted</option>
                  <option value="Female">Female Only</option>
                  <option value="Male">Male Only</option>
                </select>
              </div>

              <div className="filter-input-box">
                <label>Policy Status</label>
                <select value={filterPolicyStatus} onChange={(e) => setFilterPolicyStatus(e.target.value)}>
                  <option value="All">All Policies</option>
                  <option value="Active">Active Policies</option>
                  <option value="Inactive">Inactive Policies</option>
                </select>
              </div>
              <div className="filter-input-box">
                <label>Total Policies</label>
                <div className="flex-center gap-2 mt-2">
                  <Badge variant="primary">Active: {leavePolicyConfigs.filter(p => p.isActive).length}</Badge>
                  <Badge variant="neutral">Total: {leavePolicyConfigs.length}</Badge>
                </div>
              </div>
            </div>
          </div>
          {/* Main Policy Table */}
          <div className="card">
            <div className="table-inner-wrapper">
              <div className="policy-admin-table">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Leave Code</th>
                      <th>Leave Name</th>
                      <th>Default Days (Annual)</th>
                      <th>Max Carry Forward</th>
                      <th>Gender Restriction</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredPolicies().map((policy) => (
                      <tr key={policy.id} className={!policy.isActive ? 'inactive-row' : ''}>
                        <td><strong className="text-primary">{policy.leaveCode}</strong></td>
                        <td>{policy.leaveName}</td>
                        <td>
                          <span className="policy-days-badge">
                            {policy.defaultDays} {policy.defaultDays === 1 ? 'day' : 'days'}
                          </span>
                        </td>
                        <td>
                          {policy.maxCarryForward > 0 ? (
                            <span className="carry-badge">{policy.maxCarryForward} days</span>
                          ) : (
                            <span className="text-muted text-xs">No carry forward</span>
                          )}
                        </td>
                        <td>
                          {policy.genderRestriction === 'All' ? (
                            <Badge variant="neutral">All</Badge>
                          ) : policy.genderRestriction === 'Female' ? (
                            <Badge variant="purple">👩 Female Only</Badge>
                          ) : (
                            <Badge variant="blue">👨 Male Only</Badge>
                          )}
                        </td>
                        <td>
                          <button
                            className={`status-toggle-btn ${policy.isActive ? 'active' : 'inactive'}`}
                            onClick={() => handleTogglePolicyStatus(policy.id, policy.isActive)}
                          >
                            {policy.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td>
                          <span className="text-secondary text-xs policy-desc-preview" title={policy.description}>
                            {policy.description.length > 35 ? policy.description.substring(0, 35) + '...' : policy.description}
                          </span>
                        </td>
                        <td>
                          <div className="policy-actions">
                            <button
                              className="action-btn-mini edit-btn"
                              onClick={() => handleEditPolicyClick(policy)}
                              title="Edit Policy"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="action-btn-mini danger-btn"
                              onClick={() => setShowDeletePolicyConfirm(policy)}
                              title="Delete Policy"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredPolicies().length === 0 && (
                  <div className="empty-table-state text-center py-8">
                    <Database size={48} className="text-muted mx-auto mb-3" />
                    <p className="text-secondary">No policies found matching your filters.</p>
                    <Button variant="secondary" className="mt-3" onClick={() => {
                      setPolicySearchQuery('');
                      setFilterPolicyGender('All');
                      setFilterPolicyStatus('All');
                    }}>
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary Info */}
          <div className="card bg-primary-light border-primary">
            <div className="flex-row justify-between items-center flex-wrap gap-3">
              <div className="flex-center gap-3">
                <Info size={20} className="text-primary" />
                <div>
                  <h5 className="text-sm font-semibold">How Policy Table Works</h5>
                  <p className="text-xs text-muted">These default values are applied when initializing employee leave balances. HR can override individual employee balances in the "Balances" tab.</p>
                </div>
              </div>
              <div className="flex-center gap-2">
                <span className="text-xs text-primary">Total Annual Leave Quota: </span>
                <strong>{leavePolicyConfigs.filter(p => p.isActive && p.defaultDays > 0).reduce((sum, p) => sum + p.defaultDays, 0)} days</strong>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ==================== MODAL: EDIT POLICY ==================== */}
      <Modal
        isOpen={editingPolicy !== null}
        onClose={() => setEditingPolicy(null)}
        title={`Edit Leave Policy: ${editingPolicy?.leaveName}`}
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setEditingPolicy(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdatePolicy} icon={Save}>
              Update Policy
            </Button>
          </div>
        }
      >
        {editingPolicy && (
          <div className="policy-edit-form animate-fade-in flex-column gap-4">
            <div className="apply-fields-grid-2">
              <div className="policy-form-field">
                <label>Leave Code *</label>
                <input
                  type="text"
                  value={policyEditForm.leaveCode}
                  onChange={(e) => setPolicyEditForm({ ...policyEditForm, leaveCode: e.target.value.toUpperCase() })}
                  maxLength={5}
                  placeholder="e.g., CL, SL, PL"
                />
              </div>
              <div className="policy-form-field">
                <label>Leave Name *</label>
                <input
                  type="text"
                  value={policyEditForm.leaveName}
                  onChange={(e) => setPolicyEditForm({ ...policyEditForm, leaveName: e.target.value })}
                  placeholder="e.g., Casual Leave"
                />
              </div>
            </div>

            <div className="apply-fields-grid-2">
              <div className="policy-form-field">
                <label>Default Days (Annual)</label>
                <input
                  type="number"
                  value={policyEditForm.defaultDays}
                  onChange={(e) => setPolicyEditForm({ ...policyEditForm, defaultDays: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="365"
                />
              </div>
              <div className="policy-form-field">
                <label>Max Carry Forward Days</label>
                <input
                  type="number"
                  value={policyEditForm.maxCarryForward}
                  onChange={(e) => setPolicyEditForm({ ...policyEditForm, maxCarryForward: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="365"
                />
              </div>
            </div>

            <div className="apply-fields-grid-2">
              <div className="policy-form-field">
                <label>Gender Restriction</label>
                <select
                  value={policyEditForm.genderRestriction}
                  onChange={(e) => setPolicyEditForm({ ...policyEditForm, genderRestriction: e.target.value })}
                >
                  <option value="All">All Employees</option>
                  <option value="Female">Female Only</option>
                  <option value="Male">Male Only</option>
                </select>
              </div>
              <div className="policy-form-field">
                <label>Status</label>
                <select
                  value={policyEditForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setPolicyEditForm({ ...policyEditForm, isActive: e.target.value === 'active' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="policy-form-field">
              <label>Description</label>
              <textarea
                value={policyEditForm.description}
                onChange={(e) => setPolicyEditForm({ ...policyEditForm, description: e.target.value })}
                rows={3}
                placeholder="Describe when and how this leave type can be used..."
              />
            </div>

            <div className="info-box bg-primary-light p-3 rounded-md">
              <p className="text-xs text-secondary">
                <strong>Note:</strong> Changes to default days will apply to new employees only. Existing employee balances need to be manually adjusted in the Balances tab.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== MODAL: ADD NEW POLICY ==================== */}
      <Modal
        isOpen={showAddPolicyModal}
        onClose={() => setShowAddPolicyModal(false)}
        title="Add New Leave Policy"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setShowAddPolicyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddPolicy} icon={Plus}>
              Add Policy
            </Button>
          </div>
        }
      >
        <div className="policy-add-form animate-fade-in flex-column gap-4">
          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Leave Code *</label>
              <input
                type="text"
                value={newPolicyForm.leaveCode}
                onChange={(e) => setNewPolicyForm({ ...newPolicyForm, leaveCode: e.target.value.toUpperCase() })}
                maxLength={5}
                placeholder="e.g., CL, SL, PL"
                required
              />
            </div>
            <div className="policy-form-field">
              <label>Leave Name *</label>
              <input
                type="text"
                value={newPolicyForm.leaveName}
                onChange={(e) => setNewPolicyForm({ ...newPolicyForm, leaveName: e.target.value })}
                placeholder="e.g., Casual Leave"
                required
              />
            </div>
          </div>

          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Default Days (Annual)</label>
              <input
                type="number"
                value={newPolicyForm.defaultDays}
                onChange={(e) => setNewPolicyForm({ ...newPolicyForm, defaultDays: parseInt(e.target.value) || 0 })}
                min="0"
                max="365"
              />
            </div>
            <div className="policy-form-field">
              <label>Max Carry Forward Days</label>
              <input
                type="number"
                value={newPolicyForm.maxCarryForward}
                onChange={(e) => setNewPolicyForm({ ...newPolicyForm, maxCarryForward: parseInt(e.target.value) || 0 })}
                min="0"
                max="365"
              />
            </div>
          </div>

          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Gender Restriction</label>
              <select
                value={newPolicyForm.genderRestriction}
                onChange={(e) => setNewPolicyForm({ ...newPolicyForm, genderRestriction: e.target.value })}
              >
                <option value="All">All Employees</option>
                <option value="Female">Female Only</option>
                <option value="Male">Male Only</option>
              </select>
            </div>
            <div className="policy-form-field">
              <label>Status</label>
              <select
                value={newPolicyForm.isActive ? 'active' : 'inactive'}
                onChange={(e) => setNewPolicyForm({ ...newPolicyForm, isActive: e.target.value === 'active' })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="policy-form-field">
            <label>Description</label>
            <textarea
              value={newPolicyForm.description}
              onChange={(e) => setNewPolicyForm({ ...newPolicyForm, description: e.target.value })}
              rows={3}
              placeholder="Describe when and how this leave type can be used..."
            />
          </div>
        </div>
      </Modal>

      {/* ==================== MODAL: ADJUST BALANCES ==================== */}
      <Modal
        isOpen={balanceEditEmployee !== null}
        onClose={() => setBalanceEditEmployee(null)}
        title={`Adjust Quotas: ${balanceEditEmployee?.name}`}
        size="sm"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setBalanceEditEmployee(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveBalance} icon={Check}>
              Apply Overrides
            </Button>
          </div>
        }
      >
        {balanceEditEmployee && (
          <div className="balance-editor-form flex-column gap-3 animate-fade-in">
            <p className="text-xs text-muted mb-2">Adjust manual leave day quotas. Changes take effect immediately in reporting fields.</p>
            <div className="editor-fields-grid">
              {activePolicies.map(policy => (
                <div key={policy.id} className="policy-form-field">
                  <label>{policy.leaveName} ({policy.leaveCode})</label>
                  <input 
                    type="number" 
                    value={balanceInput[policy.leaveCode] || 0} 
                    onChange={(e) => setBalanceInput({ ...balanceInput, [policy.leaveCode]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>



      {/* ==================== MODAL: LEAVE DETAILS ==================== */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Leave Request Details"
        size="md"
        footer={
          (selectedLeave?.status === 'Pending' && currentUserRole !== 'employee') ? (
            <div className="modal-actions-wrapper">
              <Button
                variant="secondary"
                onClick={() => handleReject(selectedLeave.id, selectedLeave.employeeName, true)}
                icon={X}
              >
                Reject Request
              </Button>
              <Button
                variant="primary"
                onClick={() => handleApprove(selectedLeave.id, selectedLeave.employeeName, true)}
                icon={Check}
              >
                Approve Request
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
              Close Detail
            </Button>
          )
        }
      >
        {selectedLeave && (() => {
          const selectedEmp = employees.find(e => e.id === selectedLeave.employeeId);
          return (
          <div className="leave-modal-detail-body animate-fade-in">
            
            {/* 1. Profile information */}
            <div className="leave-detail-profile">
              <Avatar name={selectedLeave.employeeName} size="md" />
              <div className="profile-details-column flex-column items-start">
                <h4 className="detail-profile-name">{selectedLeave.employeeName}</h4>
                <div className="flex-row items-center gap-2 mt-1 flex-wrap">
                  <span className="profile-tag-detail">ID: {selectedLeave.employeeId || 'EMP-2026-006'}</span>
                  <span className="profile-tag-divider">•</span>
                  <span className="profile-tag-detail">Dept: {selectedLeave.department || ''}</span>
                  <span className="profile-tag-divider">•</span>
                  <span className="profile-tag-detail">Role: {selectedEmp?.designation || 'Staff'}</span>
                </div>
              </div>
              <Badge variant={selectedLeave.status === 'Approved' ? 'success' : selectedLeave.status === 'Pending' ? 'warning' : 'danger'}>
                {selectedLeave.status}
              </Badge>
            </div>

            {/* Manager and Lead info */}
            <div className="manager-assignments-strip card flex-row justify-between flex-wrap gap-3">
              <div className="assignment-box">
                <span className="block-label">Team Leader</span>
                <strong>{selectedEmp?.teamLeader || 'Not Assigned'}</strong>
              </div>
              <div className="assignment-box">
                <span className="block-label">Project Manager</span>
                <strong>{selectedEmp?.projectManager || 'Not Assigned'}</strong>
              </div>
              <div className="assignment-box">
                <span className="block-label">Filing Date</span>
                <span>{selectedLeave.appliedDate}</span>
              </div>
            </div>

            {/* 2. Dates summary */}
            <div className="leave-dates-summary">
              <div className="date-block">
                <span className="block-label">From Date</span>
                <strong>{selectedLeave.fromDate}</strong>
              </div>
              <div className="date-block">
                <span className="block-label">To Date</span>
                <strong>{selectedLeave.toDate}</strong>
              </div>
              <div className="date-block block-highlight">
                <span className="block-label">Total Days</span>
                <strong>{selectedLeave.days} Days</strong>
              </div>
            </div>

            {/* Leave type and document attachments */}
            <div className="leave-reason-section card">
              <div className="flex-row justify-between items-center mb-2">
                <span className="section-label">Filing Category</span>
                <Badge variant="purple">{selectedLeave.type}</Badge>
              </div>
              
              <span className="section-label mt-2">Reason for Absence</span>
              <p className="reason-full-text mt-1">{selectedLeave.reason}</p>

              {/* Supporting document preview block */}
              <div className="attached-document-details-sec mt-3 border-top pt-3">
                <span className="section-label">Attached Document ({selectedLeave.documentType || 'Medical Certificate'})</span>
                {selectedLeave.fileName ? (
                  <div className="document-download-card flex-row justify-between items-center mt-2">
                    <div className="flex-center gap-2">
                      <FileText size={16} className="text-primary" />
                      <div className="flex-column items-start justify-center">
                        <span className="text-sm font-semibold">{selectedLeave.fileName}</span>
                        <span className="text-xs text-muted">Format: {selectedLeave.fileFormat || 'PDF'}</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="download-doc-btn flex-center gap-1"
                      onClick={() => addToast('success', 'Document download simulation initiated.')}
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                ) : selectedLeave.type === 'Sick Leave' ? (
                  <div className="document-download-card flex-row justify-between items-center mt-2">
                    <div className="flex-center gap-2">
                      <FileText size={16} className="text-primary" />
                      <div className="flex-column items-start justify-center">
                        <span className="text-sm font-semibold">dental_surgery_certificate.pdf</span>
                        <span className="text-xs text-muted">Format: PDF</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="download-doc-btn flex-center gap-1"
                      onClick={() => addToast('success', 'Medical document download initiated.')}
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted italic mt-1">No supporting files attached to this leave filing.</p>
                )}
              </div>
            </div>

            {/* 3. Approver notes form */}
            <div className="leave-notes-section">
              <span className="section-label">Approver Notes & Comments</span>
              {selectedLeave.status === 'Pending' ? (
                <textarea
                  placeholder="Enter comments, adjustment rules notes or fitment recommendations here..."
                  value={approverNotesInput}
                  onChange={(e) => setApproverNotesInput(e.target.value)}
                  rows={3}
                />
              ) : (
                <p className="approver-notes-display">
                  {selectedLeave.approverNotes || <em>No comments recorded by the approver.</em>}
                </p>
              )}
            </div>

            {/* 4. Approval Workflow Timeline */}
            <div className="leave-history-timeline-section card">
              <span className="section-label">Approval Workflow Routing</span>
              
              <div className="workflow-hierarchy-tracker mt-3">
                <div className="hierarchy-step completed">
                  <div className="step-badge flex-center">
                    <Check size={12} />
                  </div>
                  <div className="step-info">
                    <span className="step-role">Employee (Filed)</span>
                    <span className="step-status-sub">{selectedLeave.employeeName} — {selectedLeave.appliedDate}</span>
                  </div>
                </div>

                <div className={`hierarchy-step ${selectedLeave.status !== 'Pending' ? 'completed' : 'active'}`}>
                  <div className="step-badge flex-center">
                    {selectedLeave.status !== 'Pending' ? <Check size={12} /> : <Clock size={12} />}
                  </div>
                  <div className="step-info">
                    <span className="step-role">Team Leader Approval</span>
                    <span className="step-status-sub">{selectedEmp?.teamLeader || 'Team Leader'} — {selectedLeave.status !== 'Pending' ? 'Reviewed' : 'Awaiting Review'}</span>
                  </div>
                </div>

                <div className={`hierarchy-step ${selectedLeave.status === 'Approved' ? 'completed' : selectedLeave.status === 'Rejected' ? 'rejected' : ''}`}>
                  <div className="step-badge flex-center">
                    {selectedLeave.status === 'Approved' ? <Check size={12} /> : selectedLeave.status === 'Rejected' ? <X size={12} /> : <Clock size={12} />}
                  </div>
                  <div className="step-info">
                    <span className="step-role">Project Manager Approval</span>
                    <span className="step-status-sub">{selectedEmp?.projectManager || 'Project Manager'} — {selectedLeave.status === 'Approved' ? 'Approved' : selectedLeave.status === 'Rejected' ? 'Rejected' : 'Pending'}</span>
                  </div>
                </div>

                <div className={`hierarchy-step ${selectedLeave.status === 'Approved' ? 'completed' : ''}`}>
                  <div className="step-badge flex-center">
                    {selectedLeave.status === 'Approved' ? <Check size={12} /> : <Info size={12} />}
                  </div>
                  <div className="step-info">
                    <span className="step-role">Super Admin Audit</span>
                    <span className="step-status-sub">Auto-logged on final decision approval</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
          );
        })()}
      </Modal>

      {/* ==================== MODAL: ADD HOLIDAY ==================== */}
      <Modal
        isOpen={showAddHolidayModal}
        onClose={() => setShowAddHolidayModal(false)}
        title="Add New Scheduled Holiday"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setShowAddHolidayModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddHoliday} icon={Plus}>
              Add Holiday
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddHoliday} className="policy-add-form animate-fade-in flex-column gap-4">
          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Holiday Date *</label>
              <input
                type="date"
                value={newHolidayForm.date}
                onChange={(e) => setNewHolidayForm({ ...newHolidayForm, date: e.target.value })}
                required
              />
            </div>
            <div className="policy-form-field">
              <label>Holiday Description (Name) *</label>
              <input
                type="text"
                value={newHolidayForm.name}
                onChange={(e) => setNewHolidayForm({ ...newHolidayForm, name: e.target.value })}
                placeholder="e.g., Independence Day"
                required
              />
            </div>
          </div>

          <div className="policy-form-field">
            <label>Category *</label>
            <select
              value={newHolidayForm.type}
              onChange={(e) => setNewHolidayForm({ ...newHolidayForm, type: e.target.value })}
            >
              <option value="National">National Holiday</option>
              <option value="Regional">Regional Holiday</option>
              <option value="Company">Company Holiday</option>
              <option value="Optional">Optional Holiday</option>
            </select>
          </div>

          <div className="policy-form-field">
            <label>Detailed Summary (Description)</label>
            <textarea
              value={newHolidayForm.description}
              onChange={(e) => setNewHolidayForm({ ...newHolidayForm, description: e.target.value })}
              rows={3}
              placeholder="Provide a brief summary or historical context..."
            />
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL: LEAVE ASSIGN ==================== */}
      <Modal
        isOpen={showAssignLeaveModal}
        onClose={() => {
          setShowAssignLeaveModal(false);
          setSelectedAssignEmployee(null);
          setEmployeeSearchQuery('');
        }}
        title="Assign Leave directly"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => {
              setShowAssignLeaveModal(false);
              setSelectedAssignEmployee(null);
              setEmployeeSearchQuery('');
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssignSubmit} icon={Plus}>
              Assign Leave
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAssignSubmit} className="apply-leave-modal-body animate-fade-in flex-column gap-4">
          <div className="modal-form-section-title flex-center gap-2 justify-start mb-1">
            <Users size={16} className="text-primary" />
            <h5>Select Employee</h5>
          </div>

          <div className="policy-form-field position-relative">
            <label>Search and select employee *</label>
            <div className="searchable-dropdown-wrapper">
              <input
                type="text"
                placeholder="Type name or ID to search employee..."
                value={employeeSearchQuery}
                onChange={(e) => {
                  setEmployeeSearchQuery(e.target.value);
                  setShowAssignEmployeeDropdown(true);
                  if (selectedAssignEmployee) {
                    setSelectedAssignEmployee(null);
                  }
                }}
                onFocus={() => setShowAssignEmployeeDropdown(true)}
                className="w-full"
                required
              />
              {showAssignEmployeeDropdown && filteredEmployees.length > 0 && (
                <div className="searchable-dropdown-options">
                  {filteredEmployees.map(emp => (
                    <div
                      key={emp.id}
                      className="searchable-option"
                      onClick={() => {
                        setSelectedAssignEmployee(emp);
                        setEmployeeSearchQuery(`${emp.name} (${emp.id})`);
                        setShowAssignEmployeeDropdown(false);
                      }}
                    >
                      <strong>{emp.name}</strong> ({emp.id}) - {emp.department}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-form-section-title flex-center gap-2 justify-start mb-1 mt-2">
            <CalendarDays size={16} className="text-primary" />
            <h5>Duration & Custom Leave Type</h5>
          </div>

          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Leave Type (Custom) *</label>
              <input
                type="text"
                placeholder="e.g. Sick Leave, Study Leave..."
                value={assignForm.customLeaveType}
                onChange={(e) => setAssignForm({ ...assignForm, customLeaveType: e.target.value })}
                required
              />
            </div>

            <div className="policy-form-field">
              <label>Days *</label>
              <input
                type="number"
                min="1"
                value={assignForm.days}
                onChange={(e) => setAssignForm({ ...assignForm, days: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
          </div>

          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Start Date *</label>
              <input
                type="date"
                value={assignForm.startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                required
              />
            </div>

            <div className="policy-form-field">
              <label>Reason / Notes</label>
              <textarea
                placeholder="Reason details..."
                value={assignForm.reason}
                onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })}
                rows={1}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Apply Leave Modal — managers register directly (auto-approved), employees submit for approval */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title={
          editingLeave
            ? 'Edit Leave Request'
            : ['manager', 'dept_admin', 'branch_admin', 'super_admin'].includes(currentUserRole)
            ? 'Register Leave'
            : 'Apply for Leave'
        }
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setApplyModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleApplySubmit}>
              {editingLeave
                ? 'Update Request'
                : ['manager', 'dept_admin', 'branch_admin', 'super_admin'].includes(currentUserRole)
                ? 'Register Leave'
                : 'Submit Request'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleApplySubmit} className="apply-leave-modal-body animate-fade-in flex-column gap-4">
          <div className="policy-form-field">
            <label>Leave Type *</label>
            <select
              value={applyForm.customLeaveType}
              onChange={(e) => setApplyForm({ ...applyForm, customLeaveType: e.target.value })}
              required
            >
              {activePolicies.map(p => (
                <option key={p.id} value={p.leaveCode}>{p.leaveName} ({p.leaveCode})</option>
              ))}
            </select>
          </div>

          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Start Date *</label>
              <input
                type="date"
                value={applyForm.startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                required
              />
            </div>

            <div className="policy-form-field">
              <label>Days *</label>
              <input
                type="number"
                min="1"
                value={applyForm.days}
                onChange={(e) => setApplyForm({ ...applyForm, days: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
          </div>

          <div className="policy-form-field">
            <label>Reason / Description</label>
            <textarea
              placeholder="Provide details for leave request..."
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              rows={3}
            />
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default LeaveManagement;