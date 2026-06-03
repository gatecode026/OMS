import React, { useState, useEffect } from 'react';
import './LeaveManagement.css';
import { useApp } from '../context/AppContext';
import { FIELD_LABELS } from '../utils/fieldLabels';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import {
  Check, X, Eye, FileText, CalendarDays, Search, Filter, Plus, Settings,
  AlertCircle, Calendar, TrendingUp, Users, BarChart3, PieChart, ArrowRight,
  Clock, Settings2, FileSpreadsheet, FileUp, Download, Info, Bell, Briefcase,
  HeartPulse, Umbrella, UserCheck, Smile, ShieldAlert, Trash2, Edit, CheckCircle2,
  Database, Save, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, Legend
} from 'recharts';

const LeaveManagement = () => {
  const isLoading = usePageLoading(600);
  const {
    employees,
    leaveRequests,
    approveLeaveRequest,
    rejectLeaveRequest,
    showConfirm,
    addToast
  } = useApp();

  // Primary Tab state: 'requests' | 'analytics' | 'balances' | 'holidays' | 'policies'
  const [activeTab, setActiveTab] = useState('requests');

  // Requests Sub-tab status filter: 'Pending' | 'Approved' | 'Rejected' | 'All'
  const [statusTab, setStatusTab] = useState('Pending');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLeaveType, setFilterLeaveType] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All');
  const [alertFeedOpen, setAlertFeedOpen] = useState(true);

  // Leave List state (includes user-added leaves locally)
  const [leavesList, setLeavesList] = useState([]);

  useEffect(() => {
    if (leaveRequests) {
      setLeavesList(leaveRequests);
    }
  }, [leaveRequests]);

  // ==================== ADMIN LEAVE POLICY TABLE STATE ====================
  const [leavePolicyConfigs, setLeavePolicyConfigs] = useState([
    { id: 'POL-001', leaveCode: 'CL', leaveName: 'Casual Leave', defaultDays: 8, maxCarryForward: 5, isActive: true, genderRestriction: 'All', description: 'For personal urgent reasons or brief errands' },
    { id: 'POL-002', leaveCode: 'SL', leaveName: 'Sick Leave', defaultDays: 10, maxCarryForward: 3, isActive: true, genderRestriction: 'All', description: 'For medical recovery or doctor consultations' },
    { id: 'POL-003', leaveCode: 'PL', leaveName: 'Paid Leave', defaultDays: 15, maxCarryForward: 10, isActive: true, genderRestriction: 'All', description: 'Annual leave for vacation or relaxation' },
    { id: 'POL-004', leaveCode: 'ML', leaveName: 'Maternity Leave', defaultDays: 180, maxCarryForward: 0, isActive: true, genderRestriction: 'Female', description: 'For expectant mothers around childbirth' },
    { id: 'POL-010', leaveCode: 'UL', leaveName: 'Unpaid Leave', defaultDays: 30, maxCarryForward: 0, isActive: true, genderRestriction: 'All', description: 'Without pay when balances exhausted' }
  ]);

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

  // Policy configurations state
  const [policies, setPolicies] = useState({
    accrualRate: 'Monthly',
    carryForwardLimit: 10,
    halfDayPolicy: true,
    holidayEncashment: true,
    maternityDuration: 180,
    restrictDoubleFilings: true,
    useGlobalPolicyTable: true // New flag to use the global policy table
  });

  // Modal open states
  const [applyModalOpen, setApplyModalOpen] = useState(false);
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

  // Form states for Applying Leave
  const [applyForm, setApplyForm] = useState({
    employeeId: '',
    type: 'Casual Leave',
    fromDate: '',
    toDate: '',
    reason: '',
    documentType: 'Emergency Documents',
    uploadedFileName: '',
    uploadedFileFormat: ''
  });

  // Reports and Exports builder state
  const [reportType, setReportType] = useState('Daily Leave Record');
  const [exportFormat, setExportFormat] = useState('PDF');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Active Date selection in calendars
  const [calendarMonth, setCalendarMonth] = useState('June 2026');

  // Mock static balance records
  const [balancesList, setBalancesList] = useState([
    { id: 'BAL-001', employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', cl: 8, sl: 12, pl: 15, maternity: 0 },
    { id: 'BAL-002', employeeId: 'EMP-2026-002', employeeName: 'Vikram Singh', cl: 6, sl: 8, pl: 10, maternity: 0 },
    { id: 'BAL-003', employeeId: 'EMP-2026-003', employeeName: 'Ananya Gupta', cl: 5, sl: 10, pl: 18, maternity: 0 },
    { id: 'BAL-004', employeeId: 'EMP-2026-004', employeeName: 'Rohit Sharma', cl: 7, sl: 6, pl: 12, maternity: 0 },
    { id: 'BAL-005', employeeId: 'EMP-2026-005', employeeName: 'Priya Patel', cl: 4, sl: 7, pl: 14, maternity: 180 },
    { id: 'BAL-006', employeeId: 'EMP-2026-006', employeeName: 'Arjun Mehta', cl: 9, sl: 11, pl: 20, maternity: 0 },
    { id: 'BAL-007', employeeId: 'EMP-2026-007', employeeName: 'Neha Verma', cl: 3, sl: 9, pl: 8, maternity: 0 }
  ]);

  // Mock static Holiday lists
  const [holidaysList, setHolidaysList] = useState([
    { id: 'HOL-01', name: 'New Year\'s Day', date: '2026-01-01', type: 'National', description: 'Global celebration of the first day of the year.' },
    { id: 'HOL-02', name: 'Republic Day', date: '2026-01-26', type: 'National', description: 'Honors the constitution initialization date.' },
    { id: 'HOL-03', name: 'Holi Festival', date: '2026-03-04', type: 'Regional', description: 'Spring festival of colors.' },
    { id: 'HOL-04', name: 'Good Friday', date: '2026-04-03', type: 'Company', description: 'Friday before Easter Sunday.' },
    { id: 'HOL-05', name: 'Eid al-Fitr', date: '2026-04-20', type: 'National', description: 'Islamic festival ending Ramadan.' },
    { id: 'HOL-06', name: 'Independence Day', date: '2026-08-15', type: 'National', description: 'Commemorating freedom from UK rule.' },
    { id: 'HOL-07', name: 'Gandhi Jayanti', date: '2026-10-02', type: 'National', description: 'Mahatma Gandhi\'s birth anniversary.' },
    { id: 'HOL-08', name: 'Diwali', date: '2026-11-09', type: 'National', description: 'Festival of lights.' },
    { id: 'HOL-09', name: 'Karnataka Rajyotsava', date: '2026-11-01', type: 'Optional', description: 'State formation holiday.' },
    { id: 'HOL-10', name: 'Christmas Day', date: '2026-12-25', type: 'National', description: 'Annual birthday celebration of Jesus Christ.' }
  ]);

  // Mock department metrics
  const departmentAnalyticsData = [
    { department: 'Engineering', totalLeaves: 120, leaveRequests: 25, approved: 20, pending: 5 },
    { department: 'Human Resources', totalLeaves: 35, leaveRequests: 10, approved: 8, pending: 2 },
    { department: 'Sales', totalLeaves: 85, leaveRequests: 15, approved: 12, pending: 3 },
    { department: 'Marketing', totalLeaves: 60, leaveRequests: 12, approved: 10, pending: 2 }
  ];

  // Mock notifications feed items
  const [alertsFeed, setAlertsFeed] = useState([
    { id: 'AL-001', type: 'warning', message: 'New leave request from Arjun Mehta requires approval.', timestamp: '5 mins ago', read: false },
    { id: 'AL-002', type: 'info', message: 'Karnataka Rajyotsava optional holiday added to calendar.', timestamp: '1 hour ago', read: false },
    { id: 'AL-003', type: 'success', message: 'Leave policy adjustment updated successfully by Aarav.', timestamp: '2 hours ago', read: true },
    { id: 'AL-004', type: 'danger', message: 'Maternity leave document verification failed for EMP-005.', timestamp: '1 day ago', read: true }
  ]);

  // Chart data
  const trendsData = [
    { name: 'Jan', requests: 45, approved: 38 },
    { name: 'Feb', requests: 55, approved: 48 },
    { name: 'Mar', requests: 70, approved: 60 },
    { name: 'Apr', requests: 62, approved: 54 },
    { name: 'May', requests: 88, approved: 75 },
    { name: 'Jun', requests: 95, approved: 82 }
  ];

  const typesDistributionData = [
    { name: 'Casual Leave', value: 40, color: 'var(--accent-blue-solid)' },
    { name: 'Sick Leave', value: 25, color: 'var(--accent-pink-solid)' },
    { name: 'Paid Leave', value: 25, color: 'var(--accent-green-solid)' },
    { name: 'Maternity Leave', value: 10, color: 'var(--accent-purple-solid)' }
  ];

  const approvalRateData = [
    { name: 'IT', Approved: 92, Rejected: 8 },
    { name: 'HR', Approved: 88, Rejected: 12 },
    { name: 'Sales', Approved: 85, Rejected: 15 },
    { name: 'Marketing', Approved: 90, Rejected: 10 }
  ];

  // Leave Types Descriptions (from policy configs)
  const leaveTypesList = leavePolicyConfigs.map(config => ({
    code: config.leaveCode,
    name: config.leaveName,
    desc: config.description,
    quota: `${config.defaultDays} days/year`,
    maxCarry: config.maxCarryForward,
    genderRestriction: config.genderRestriction,
    active: config.isActive
  }));

  // Calendar Schedule Data for June 2026
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-06-${String(dayNum).padStart(2, '0')}`;
    let leaves = [];
    let availability = 100;

    if (dayNum === 2) {
      leaves = [{ name: 'Suresh Kumar', type: 'CL', color: 'orange' }];
      availability = 85;
    } else if (dayNum === 15 || dayNum === 16) {
      leaves = [{ name: 'Arjun Mehta', type: 'PL', color: 'green' }];
      availability = 85;
    } else if (dayNum === 28) {
      leaves = [
        { name: 'Neha Verma', type: 'SL', color: 'pink' },
        { name: 'Vikram Singh', type: 'PL', color: 'green' }
      ];
      availability = 70;
    }

    return { dayNum, dateStr, leaves, availability };
  });

  // Calculate top KPI numbers dynamically based on leaves list
  const totalRequestsCount = leavesList.length;
  const approvedRequestsCount = leavesList.filter(l => l.status === 'Approved').length;
  const rejectedRequestsCount = leavesList.filter(l => l.status === 'Rejected').length;
  const pendingRequestsCount = leavesList.filter(l => l.status === 'Pending').length;
  const onLeaveTodayCount = leavesList.filter(l => l.status === 'Approved' && l.fromDate <= '2026-06-02' && l.toDate >= '2026-06-02').length;
  const leaveUtilizationRate = '88%';

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
        matchesStatus = req.status === 'Approved' && req.fromDate <= '2026-06-02' && req.toDate >= '2026-06-02';
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

  const handleUpdatePolicy = () => {
    setLeavePolicyConfigs(prev => 
      prev.map(p => 
        p.id === editingPolicy.id 
          ? { ...p, ...policyEditForm }
          : p
      )
    );
    addToast('success', `${policyEditForm.leaveName} policy updated successfully!`);
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
  };

  const handleAddPolicy = () => {
    if (!newPolicyForm.leaveCode || !newPolicyForm.leaveName) {
      addToast('warning', 'Please fill all required fields.');
      return;
    }
    
    const newId = `POL-${String(leavePolicyConfigs.length + 1).padStart(3, '0')}`;
    const newPolicy = { id: newId, ...newPolicyForm };
    setLeavePolicyConfigs(prev => [...prev, newPolicy]);
    addToast('success', `${newPolicyForm.leaveName} policy added successfully!`);
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
  };

  const handleDeletePolicy = (policy) => {
    const action = () => {
      setLeavePolicyConfigs(prev => prev.filter(p => p.id !== policy.id));
      addToast('warning', `${policy.leaveName} policy has been deleted.`);
      setShowDeletePolicyConfirm(null);
    };
    
    showConfirm(
      'Delete Leave Policy',
      `Are you sure you want to delete "${policy.leaveName}" policy? This action cannot be undone.`,
      action,
      'danger'
    );
  };

  const handleTogglePolicyStatus = (policyId, currentStatus) => {
    setLeavePolicyConfigs(prev => 
      prev.map(p => 
        p.id === policyId 
          ? { ...p, isActive: !currentStatus }
          : p
      )
    );
    addToast('info', `Policy ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
  };

  // Reset all policies to default
  const handleResetAllPolicies = () => {
    const action = () => {
      setLeavePolicyConfigs([
        { id: 'POL-001', leaveCode: 'CL', leaveName: 'Casual Leave', defaultDays: 8, maxCarryForward: 5, isActive: true, genderRestriction: 'All', description: 'For personal urgent reasons or brief errands' },
        { id: 'POL-002', leaveCode: 'SL', leaveName: 'Sick Leave', defaultDays: 10, maxCarryForward: 3, isActive: true, genderRestriction: 'All', description: 'For medical recovery or doctor consultations' },
        { id: 'POL-003', leaveCode: 'PL', leaveName: 'Paid Leave', defaultDays: 15, maxCarryForward: 10, isActive: true, genderRestriction: 'All', description: 'Annual leave for vacation or relaxation' },
        { id: 'POL-004', leaveCode: 'ML', leaveName: 'Maternity Leave', defaultDays: 180, maxCarryForward: 0, isActive: true, genderRestriction: 'Female', description: 'For expectant mothers around childbirth' },
        { id: 'POL-010', leaveCode: 'UL', leaveName: 'Unpaid Leave', defaultDays: 30, maxCarryForward: 0, isActive: true, genderRestriction: 'All', description: 'Without pay when balances exhausted' }
      ]);
      addToast('success', 'All policies have been reset to default values.');
    };
    
    showConfirm(
      'Reset All Policies',
      'This will reset all leave policies to their default values. Are you sure?',
      action,
      'danger'
    );
  };

  const handleRowClick = (leave) => {
    setSelectedLeave(leave);
    setApproverNotesInput(leave.approverNotes || '');
    setDetailModalOpen(true);
  };

  const handleApprove = (id, name, isModal = false) => {
    const action = () => {
      approveLeaveRequest(id, isModal ? approverNotesInput : '');
      setLeavesList(prev =>
        prev.map(l => (l.id === id ? { ...l, status: 'Approved', approverNotes: isModal ? approverNotesInput : 'Approved' } : l))
      );
      if (isModal) setDetailModalOpen(false);
      addToast('success', `Leave request for ${name} has been approved.`);
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
      setLeavesList(prev =>
        prev.map(l => (l.id === id ? { ...l, status: 'Rejected', approverNotes: isModal ? approverNotesInput : 'Rejected' } : l))
      );
      if (isModal) setDetailModalOpen(false);
      addToast('error', `Leave request for ${name} has been rejected.`);
    };

    showConfirm(
      'Reject Leave Request',
      `Are you sure you want to reject this leave request for ${name}?`,
      action,
      'danger'
    );
  };

  const handleEditLeaveClick = (leave) => {
    setEditingLeave(leave);
    setApplyForm({
      employeeId: leave.employeeId,
      type: leave.type,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
      reason: leave.reason,
      documentType: leave.documentType || 'Emergency Documents',
      uploadedFileName: leave.fileName || '',
      uploadedFileFormat: leave.fileFormat || ''
    });
    setApplyModalOpen(true);
  };

  const handleCloseApplyModal = () => {
    setApplyModalOpen(false);
    setEditingLeave(null);
    setApplyForm({
      employeeId: '',
      type: 'Casual Leave',
      fromDate: '',
      toDate: '',
      reason: '',
      documentType: 'Emergency Documents',
      uploadedFileName: '',
      uploadedFileFormat: ''
    });
  };

  const scrollToTable = () => {
    setTimeout(() => {
      const element = document.querySelector('.approval-status-tabs');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Submit new leave locally or update existing
  const handleApplySubmit = (e) => {
    if (e) e.preventDefault();
    if (!applyForm.employeeId || !applyForm.fromDate || !applyForm.toDate || !applyForm.reason) {
      addToast('warning', 'Please fill all required leave application fields.');
      return;
    }

    const employeeSelected = employees.find(emp => emp.id === applyForm.employeeId);

    if (employeeSelected) {
      const selectedPolicy = leavePolicyConfigs.find(p => p.leaveName === applyForm.type);
      if (selectedPolicy) {
        if (selectedPolicy.leaveName === 'Maternity Leave') {
          if (employeeSelected.gender !== 'Female' || employeeSelected.maritalStatus !== 'Married') {
            addToast('danger', 'Maternity Leave is only allowed for married female employees.');
            return;
          }
        }
        if (selectedPolicy.genderRestriction === 'Female' && employeeSelected.gender !== 'Female') {
          addToast('danger', `${selectedPolicy.leaveName} is only allowed for female employees.`);
          return;
        }
        if (selectedPolicy.genderRestriction === 'Male' && employeeSelected.gender !== 'Male') {
          addToast('danger', `${selectedPolicy.leaveName} is only allowed for male employees.`);
          return;
        }
      }
    }

    if (editingLeave) {
      setLeavesList(prev =>
        prev.map(l =>
          l.id === editingLeave.id
            ? {
                ...l,
                employeeId: applyForm.employeeId,
                employeeName: employeeSelected ? employeeSelected.name : l.employeeName,
                department: employeeSelected ? employeeSelected.department : l.department,
                type: applyForm.type,
                fromDate: applyForm.fromDate,
                toDate: applyForm.toDate,
                days: Math.max(1, Math.ceil((new Date(applyForm.toDate) - new Date(applyForm.fromDate)) / (1000 * 60 * 60 * 24)) + 1),
                reason: applyForm.reason,
                documentType: applyForm.documentType,
                fileName: applyForm.uploadedFileName || null,
                fileFormat: applyForm.uploadedFileFormat || null
              }
            : l
        )
      );

      addToast('success', `Leave request ${editingLeave.id} has been updated.`);

      setAlertsFeed(prev => [
        {
          id: `AL-${Math.random().toString(36).substring(2, 9)}`,
          type: 'info',
          message: `Leave request ${editingLeave.id} updated by Admin.`,
          timestamp: 'Just now',
          read: false
        },
        ...prev
      ]);

      handleCloseApplyModal();
    } else {
      const newLeaveId = `LR-${Math.floor(100 + Math.random() * 900)}`;

      const newRequest = {
        id: newLeaveId,
        employeeId: applyForm.employeeId,
        employeeName: employeeSelected ? employeeSelected.name : 'Unknown Employee',
        department: employeeSelected ? employeeSelected.department : 'Engineering',
        type: applyForm.type,
        fromDate: applyForm.fromDate,
        toDate: applyForm.toDate,
        days: Math.max(1, Math.ceil((new Date(applyForm.toDate) - new Date(applyForm.fromDate)) / (1000 * 60 * 60 * 24)) + 1),
        reason: applyForm.reason,
        status: 'Pending',
        appliedDate: new Date().toISOString().split('T')[0],
        history: [
          { date: new Date().toISOString().split('T')[0], status: 'Pending', comment: `Applied by ${employeeSelected ? employeeSelected.name : 'Employee'}` }
        ],
        documentType: applyForm.documentType,
        fileName: applyForm.uploadedFileName || null,
        fileFormat: applyForm.uploadedFileFormat || null,
        approverNotes: ''
      };

      setLeavesList(prev => [newRequest, ...prev]);
      handleCloseApplyModal();
      addToast('success', 'Leave request submitted successfully for approval.');

      setAlertsFeed(prev => [
        {
          id: `AL-${Math.random().toString(36).substring(2, 9)}`,
          type: 'warning',
          message: `New leave request from ${newRequest.employeeName} submitted.`,
          timestamp: 'Just now',
          read: false
        },
        ...prev
      ]);
    }
  };

  // Mock file attachment handler
  const simulateFileUpload = (format) => {
    const names = {
      PNG: 'medical_report_signature.png',
      JPG: 'accident_car_damage.jpg',
      PDF: 'dental_surgery_certificate.pdf',
      DOCX: 'flight_itinerary_visa.docx'
    };
    setApplyForm(prev => ({
      ...prev,
      uploadedFileName: names[format],
      uploadedFileFormat: format
    }));
    addToast('info', `${format} document mock-attached.`);
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

  const handleAddHoliday = (e) => {
    if (e) e.preventDefault();
    if (!newHolidayForm.date || !newHolidayForm.name) {
      addToast('warning', 'Please fill in the date and name.');
      return;
    }
    const newHol = {
      id: `HOL-${Date.now()}`,
      ...newHolidayForm
    };
    setHolidaysList(prev => [...prev, newHol]);
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
  };

  // Balance edit trigger
  const handleEditBalanceClick = (balance) => {
    setBalanceEditEmployee(balance);
    setBalanceInput({
      cl: balance.cl,
      sl: balance.sl,
      pl: balance.pl,
      maternity: balance.maternity
    });
  };

  // Save modified balance
  const handleSaveBalance = () => {
    if (!balanceEditEmployee) return;

    setBalancesList(prev =>
      prev.map(b =>
        b.employeeId === balanceEditEmployee.employeeId
          ? { ...b, ...balanceInput }
          : b
      )
    );

    addToast('success', `Adjusted leave balances for ${balanceEditEmployee.employeeName}.`);
    setBalanceEditEmployee(null);

    setAlertsFeed(prev => [
      {
        id: `AL-${Math.random().toString(36).substring(2, 9)}`,
        type: 'info',
        message: `Balances manually overridden for ${balanceEditEmployee.employeeName}.`,
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
            title="Edit Leave Request"
          >
            <Edit size={14} />
          </button>
          {row.status === 'Pending' && (
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

  return (
    <div className="leaves-page flex-column grid-gap">
      
      {/* 1. Header Strip */}
      <div className="page-header-row justify-between">
        <div>
          <h2>Leave Management Control</h2>
          <p className="page-desc-text">Oversee balances, request approvals, policy overrides, and company calendars</p>
        </div>
        <div className="flex-center gap-3">
          <Button variant="primary" icon={Plus} onClick={() => setApplyModalOpen(true)}>
            Add New Leave
          </Button>
          <Button variant="secondary" icon={Settings2} onClick={() => { setActiveTab('policies'); addToast('info', 'Viewing Policy & Leave Settings'); }}>
            Policy Controls
          </Button>
          <Button variant="secondary" icon={Plus} onClick={() => setShowAddHolidayModal(true)}>
            Add Holiday
          </Button>
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
          ].map(tab => (
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
        
        {activeTab === 'requests' && (
          <button 
            className={`alert-feed-toggle-btn flex-center gap-1 ${alertFeedOpen ? 'active' : ''}`}
            onClick={() => setAlertFeedOpen(!alertFeedOpen)}
          >
            <Bell size={16} />
            <span>Alerts Feed</span>
            <span className="pulse-dot"></span>
          </button>
        )}
      </div>

      {/* ==================== TAB 1: REQUESTS & APPROVALS ==================== */}
      {activeTab === 'requests' && (
        <div className={`leaves-tab-layout ${alertFeedOpen ? 'with-sidebar' : 'full-width'}`}>
          
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
                    <option value="Engineering">Engineering</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
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
                    { key: 'OnLeaveToday', label: 'On Leave Today', count: leavesList.filter(l => l.status === 'Approved' && l.fromDate <= '2026-06-02' && l.toDate >= '2026-06-02').length, color: 'purple' },
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

          {/* Right sidebar panel: Alerts Feed */}
          {alertFeedOpen && (
            <div className="leaves-right-sidebar card animate-fade-in">
              <div className="sidebar-feed-header">
                <div className="flex-center gap-2">
                  <Bell size={18} className="text-primary" />
                  <h4>Notifications & Alerts</h4>
                </div>
                <button 
                  className="mark-all-read-btn"
                  onClick={() => {
                    setAlertsFeed(prev => prev.map(a => ({ ...a, read: true })));
                    addToast('info', 'Marked all notifications as read.');
                  }}
                >
                  Mark All Read
                </button>
              </div>

              <div className="alerts-list-feed">
                {alertsFeed.map((alert) => (
                  <div key={alert.id} className={`alert-feed-item type-${alert.type} ${alert.read ? 'read' : 'unread'}`}>
                    <div className="alert-meta-top">
                      <span className={`alert-type-bullet color-${alert.type}`}></span>
                      <span className="alert-time-text">{alert.timestamp}</span>
                    </div>
                    <p className="alert-message-content">{alert.message}</p>
                    {!alert.read && (
                      <button
                        className="mark-single-read-btn"
                        onClick={() => {
                          setAlertsFeed(prev => prev.map(a => (a.id === alert.id ? { ...a, read: true } : a)));
                        }}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="quick-actions-bar mt-4 pt-4 border-top">
                <h5>Quick System Actions</h5>
                <div className="actions-button-grid">
                  <button className="quick-act-btn" onClick={() => setApplyModalOpen(true)}>
                    <Plus size={14} />
                    <span>Apply Leave</span>
                  </button>
                  <button className="quick-act-btn" onClick={() => { setActiveTab('balances'); addToast('info', 'Adjust employee quotas below.'); }}>
                    <Edit size={14} />
                    <span>Adjust Balance</span>
                  </button>
                  <button className="quick-act-btn" onClick={() => { setActiveTab('holidays'); addToast('info', 'Select format and download reports.'); }}>
                    <Download size={14} />
                    <span>Export Reports</span>
                  </button>
                  <button className="quick-act-btn" onClick={() => { setActiveTab('analytics'); addToast('info', 'Leave analytics page focused.'); }}>
                    <TrendingUp size={14} />
                    <span>Generate Analytics</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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
                    <option value="June 2026">June 2026</option>
                    <option value="July 2026">July 2026</option>
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
                      <th>CL Balance</th>
                      <th>SL Balance</th>
                      <th>PL Balance</th>
                      <th>Maternity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balancesList.map((bal) => (
                      <tr key={bal.id}>
                        <td><strong className="text-xs font-mono">{bal.employeeId}</strong></td>
                        <td>{bal.employeeName}</td>
                        <td><span className="balance-badge cl-badge">{bal.cl} days</span></td>
                        <td><span className="balance-badge sl-badge">{bal.sl} days</span></td>
                        <td><span className="balance-badge pl-badge">{bal.pl} days</span></td>
                        <td>{bal.maternity} days</td>
                        <td>
                          <button
                            className="action-btn-mini edit-btn"
                            onClick={() => handleEditBalanceClick(bal)}
                            title="Edit Quotas"
                          >
                            <Edit size={14} />
                          </button>
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

              <div className="policy-form-field">
                <label>Carry Forward Limit (PL max days)</label>
                <input 
                  type="number"
                  value={policies.carryForwardLimit}
                  onChange={(e) => setPolicies({ ...policies, carryForwardLimit: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="policy-form-field">
                <label>Maternity Leave Entitlement (Days)</label>
                <input 
                  type="number"
                  value={policies.maternityDuration}
                  onChange={(e) => setPolicies({ ...policies, maternityDuration: parseInt(e.target.value) || 0 })}
                />
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
                  onClick={() => {
                    addToast('success', 'Leave policies configurations saved successfully!');
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
                  }}
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
                <div className="flex-center gap-2">
                  <Button variant="secondary" icon={Plus} onClick={() => setShowAddHolidayModal(true)}>
                    Add Holiday
                  </Button>
                </div>
              </div>

              <div className="holidays-table-view">
                <table>
                  <thead>
                    <tr>
                      <th>Holiday Date</th>
                      <th>Holiday Description</th>
                      <th>Category</th>
                      <th>Detailed Summary</th>
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
        title={`Adjust Quotas: ${balanceEditEmployee?.employeeName}`}
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
              <div className="policy-form-field">
                <label>Casual Leave (CL)</label>
                <input 
                  type="number" 
                  value={balanceInput.cl} 
                  onChange={(e) => setBalanceInput({ ...balanceInput, cl: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="policy-form-field">
                <label>Sick Leave (SL)</label>
                <input 
                  type="number" 
                  value={balanceInput.sl} 
                  onChange={(e) => setBalanceInput({ ...balanceInput, sl: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="policy-form-field">
                <label>Paid Leave (PL)</label>
                <input 
                  type="number" 
                  value={balanceInput.pl} 
                  onChange={(e) => setBalanceInput({ ...balanceInput, pl: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="policy-form-field">
                <label>Maternity Leave</label>
                <input 
                  type="number" 
                  value={balanceInput.maternity} 
                  onChange={(e) => setBalanceInput({ ...balanceInput, maternity: parseInt(e.target.value) || 0 })}
                />
              </div>

            </div>
          </div>
        )}
      </Modal>

      {/* ==================== MODAL: APPLY LEAVE ==================== */}
      <Modal
        isOpen={applyModalOpen}
        onClose={handleCloseApplyModal}
        title={editingLeave ? `Edit Leave Request: ${editingLeave.id}` : "Apply Leave Absence Request"}
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={handleCloseApplyModal}>
              {editingLeave ? "Cancel Edit" : "Cancel Request"}
            </Button>
            <Button variant="primary" onClick={handleApplySubmit} icon={editingLeave ? Check : Plus}>
              {editingLeave ? "Save Changes" : "Submit Application"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleApplySubmit} className="apply-leave-modal-body animate-fade-in flex-column gap-4">
          <div className="modal-form-section-title flex-center gap-2 justify-start mb-1">
            <Users size={16} className="text-primary" />
            <h5>Employee Information</h5>
          </div>

          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Select Filing Employee *</label>
              <select
                value={applyForm.employeeId}
                onChange={(e) => {
                  const empId = e.target.value;
                  const emp = employees.find(x => x.id === empId);
                  let leaveType = applyForm.type;
                  if (emp) {
                    const selectedPolicy = leavePolicyConfigs.find(p => p.leaveName === leaveType);
                    if (selectedPolicy) {
                      if (selectedPolicy.leaveName === 'Maternity Leave' && (emp.gender !== 'Female' || emp.maritalStatus !== 'Married')) {
                        leaveType = 'Casual Leave';
                      }
                      if (selectedPolicy.genderRestriction === 'Female' && emp.gender !== 'Female') {
                        leaveType = 'Casual Leave';
                      }
                      if (selectedPolicy.genderRestriction === 'Male' && emp.gender !== 'Male') {
                        leaveType = 'Casual Leave';
                      }
                    }
                  }
                  setApplyForm({ ...applyForm, employeeId: empId, type: leaveType });
                }}
                required
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                ))}
              </select>
            </div>

            <div className="policy-form-field">
              <label>Leave Category / Code *</label>
              <select
                value={applyForm.type}
                onChange={(e) => setApplyForm({ ...applyForm, type: e.target.value })}
              >
                {leavePolicyConfigs
                  .filter(p => p.isActive)
                  .filter(p => {
                    const emp = employees.find(x => x.id === applyForm.employeeId);
                    if (!emp) return true;
                    if (p.leaveName === 'Maternity Leave' && (emp.gender !== 'Female' || emp.maritalStatus !== 'Married')) {
                      return false;
                    }
                    if (p.genderRestriction === 'Female' && emp.gender !== 'Female') {
                      return false;
                    }
                    if (p.genderRestriction === 'Male' && emp.gender !== 'Male') {
                      return false;
                    }
                    return true;
                  })
                  .map(policy => (
                    <option key={policy.leaveCode} value={policy.leaveName}>
                      {policy.leaveName} ({policy.leaveCode}) - {policy.defaultDays} days/year
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="modal-form-section-title flex-center gap-2 justify-start mb-1 mt-2">
            <CalendarDays size={16} className="text-primary" />
            <h5>Duration & Reasoning</h5>
          </div>

          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Start Date *</label>
              <input
                type="date"
                value={applyForm.fromDate}
                onChange={(e) => setApplyForm({ ...applyForm, fromDate: e.target.value })}
                required
              />
            </div>

            <div className="policy-form-field">
              <label>End Date *</label>
              <input
                type="date"
                value={applyForm.toDate}
                onChange={(e) => setApplyForm({ ...applyForm, toDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="policy-form-field">
            <label>Detailed Reason for Absence *</label>
            <textarea
              placeholder="Please provide explicit reason details (e.g. Travel tickets, doctor prescriptions etc)..."
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div className="modal-form-section-title flex-center gap-2 justify-start mb-1 mt-2">
            <FileText size={16} className="text-primary" />
            <h5>Method & Supporting Documents</h5>
          </div>

          <div className="apply-fields-grid-2">
            <div className="policy-form-field">
              <label>Document Category</label>
              <select
                value={applyForm.documentType}
                onChange={(e) => setApplyForm({ ...applyForm, documentType: e.target.value })}
              >
                <option value="Medical Certificate">Medical Certificate</option>
                <option value="Emergency Documents">Emergency Documents</option>
                <option value="Travel Documents">Travel Documents</option>
                <option value="Approved Work Documents">Approved Work Documents</option>
              </select>
            </div>

            <div className="policy-form-field flex-column">
              <label>Attached Document Preview</label>
              {applyForm.uploadedFileName ? (
                <div className="file-preview-pill flex-row justify-between items-center">
                  <div className="flex-center gap-2">
                    <FileText size={14} className="text-primary" />
                    <span className="file-name-txt">{applyForm.uploadedFileName}</span>
                  </div>
                  <button 
                    type="button" 
                    className="clear-file-btn"
                    onClick={() => setApplyForm(prev => ({ ...prev, uploadedFileName: '', uploadedFileFormat: '' }))}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <span className="text-muted text-xs italic mt-2">No document attached. Choose below.</span>
              )}
            </div>
          </div>

          <div className="document-uploader-mock-zone flex-column items-center justify-center">
            <FileUp size={28} className="text-muted mb-2" />
            <p className="uploader-main-txt">Drag and drop files here to upload supporting certificates</p>
            <p className="uploader-sub-txt">Supported Formats: PNG, JPG, PDF, DOCX (Max size 5MB)</p>
            
            <div className="simulated-upload-buttons-row mt-3 flex-row gap-2">
              <button type="button" className="mock-upload-btn" onClick={() => simulateFileUpload('PDF')}>Mock Upload PDF</button>
              <button type="button" className="mock-upload-btn" onClick={() => simulateFileUpload('PNG')}>Mock Upload PNG</button>
              <button type="button" className="mock-upload-btn" onClick={() => simulateFileUpload('DOCX')}>Mock Upload DOCX</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL: LEAVE DETAILS ==================== */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Leave Request Details"
        size="md"
        footer={
          selectedLeave?.status === 'Pending' ? (
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
        {selectedLeave && (
          <div className="leave-modal-detail-body animate-fade-in">
            
            {/* 1. Profile information */}
            <div className="leave-detail-profile">
              <Avatar name={selectedLeave.employeeName} size="md" />
              <div className="profile-details-column flex-column items-start">
                <h4 className="detail-profile-name">{selectedLeave.employeeName}</h4>
                <div className="flex-row items-center gap-2 mt-1 flex-wrap">
                  <span className="profile-tag-detail">ID: {selectedLeave.employeeId || 'EMP-2026-006'}</span>
                  <span className="profile-tag-divider">•</span>
                  <span className="profile-tag-detail">Dept: {selectedLeave.department || 'Engineering'}</span>
                  <span className="profile-tag-divider">•</span>
                  <span className="profile-tag-detail">Role: Senior Developer</span>
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
                <strong>Aarav Sharma</strong>
              </div>
              <div className="assignment-box">
                <span className="block-label">Project Manager</span>
                <strong>Rohit Sharma</strong>
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
                    <span className="step-status-sub">Aarav Sharma — {selectedLeave.status !== 'Pending' ? 'Reviewed' : 'Awaiting Review'}</span>
                  </div>
                </div>

                <div className={`hierarchy-step ${selectedLeave.status === 'Approved' ? 'completed' : selectedLeave.status === 'Rejected' ? 'rejected' : ''}`}>
                  <div className="step-badge flex-center">
                    {selectedLeave.status === 'Approved' ? <Check size={12} /> : selectedLeave.status === 'Rejected' ? <X size={12} /> : <Clock size={12} />}
                  </div>
                  <div className="step-info">
                    <span className="step-role">Project Manager Approval</span>
                    <span className="step-status-sub">Rohit Sharma — {selectedLeave.status === 'Approved' ? 'Approved' : selectedLeave.status === 'Rejected' ? 'Rejected' : 'Pending'}</span>
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
        )}
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

    </div>
  );
};

export default LeaveManagement;