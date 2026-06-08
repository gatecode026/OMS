import React, { useState, useMemo, useRef } from 'react';
import './WorkReports.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SlideOver from '../components/common/SlideOver';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FileText, Search, Filter, CheckCircle, AlertTriangle, Clock, ThumbsUp,
  Eye, MessageSquare, Sparkles, Plus, Download, Calendar, Users, BarChart3,
  TrendingUp, Send, Trash2, ArrowLeft, ArrowRight, ShieldAlert, Award,
  Volume2, ShieldCheck, RefreshCw, Layers, Check, X, FileSpreadsheet, Paperclip
} from 'lucide-react';

/* ── Shared Chart Tooltip Style ─────────────────────────────────── */
const CHART_TT = {
  contentStyle: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.78rem',
  },
  cursor: { fill: 'rgba(255,255,255,0.03)' }
};

/* ═══════════════════════════════════════════════════════════
   SEED DATA FOR ENTERPRISE REPORTS
   ═══════════════════════════════════════════════════════════ */
const SEED_REPORTS = [
  {
    id: 'REP-001',
    employeeName: 'Divya Singh',
    employeeId: 'EMP-102',
    department: 'IT',
    team: 'Dev Team Alpha',
    project: 'SaaS Platform v3.0',
    date: '2026-06-03',
    tasksAssigned: 5,
    tasksCompleted: 4,
    pendingTasksCount: 1,
    summary: 'Refactored role authentication validation hooks and structured context providers.',
    ongoingTasks: 'JWT encryption helper integration.',
    pendingTasks: 'Verify unit tests on permission layouts.',
    majorAccomplishments: 'RBAC context compiles with zero memory leak alerts.',
    challengesFaced: 'Network latency inside local Vite hot-reload pipeline.',
    supportRequired: 'Infrastructure audit for server response rates.',
    loginTime: '09:00',
    logoutTime: '18:15',
    workingHours: 9.25,
    overtimeHours: 1.25,
    plannedTasksTomorrow: 'Integrate workspace alerts with user toast context.',
    expectedDeliverablesTomorrow: 'Test cases documentation.',
    priorityTasksTomorrow: 'Security routing hooks testing.',
    attachments: ['rbac_schema_v3.pdf', 'console_error_logs.xlsx'],
    status: 'Approved',
    submittedTime: '2026-06-03T18:30:00',
    productivityScore: 94,
    feedback: 'Excellent work structuring the RBAC core module.',
    approvalHistory: [
      { role: 'Employee', user: 'Divya Singh', action: 'Submitted', timestamp: '2026-06-03T18:30:00', comments: '' },
      { role: 'Team Leader', user: 'Rohan Verma', action: 'Approved', timestamp: '2026-06-03T19:45:00', comments: 'Verified tasks & working logs.' }
    ]
  },
  {
    id: 'REP-002',
    employeeName: 'Rajesh Kumar',
    employeeId: 'EMP-108',
    department: 'Marketing',
    team: 'Brand Design',
    project: 'Sales Funnel Automation',
    date: '2026-06-03',
    tasksAssigned: 4,
    tasksCompleted: 4,
    pendingTasksCount: 0,
    summary: 'Completed marketing dashboard mockups and exported dark mode SVG icon sets.',
    ongoingTasks: 'Figma layout updates.',
    pendingTasks: 'None.',
    majorAccomplishments: 'High fidelity UI prototype signed off by client accounts.',
    challengesFaced: 'Delay in copywriter asset releases.',
    supportRequired: 'Marketing coordinator follow-up with copy teams.',
    loginTime: '09:15',
    logoutTime: '17:45',
    workingHours: 8.5,
    overtimeHours: 0.5,
    plannedTasksTomorrow: 'Coordinate styling alignments with frontend developers.',
    expectedDeliverablesTomorrow: 'Figma export package.',
    priorityTasksTomorrow: 'Brand guidelines updates.',
    attachments: ['funnel_drafts_v1.zip'],
    status: 'Submitted',
    submittedTime: '2026-06-03T18:00:00',
    productivityScore: 100,
    feedback: '',
    approvalHistory: [
      { role: 'Employee', user: 'Rajesh Kumar', action: 'Submitted', timestamp: '2026-06-03T18:00:00', comments: '' }
    ]
  },
  {
    id: 'REP-003',
    employeeName: 'Meena Sharma',
    employeeId: 'EMP-115',
    department: 'Sales',
    team: 'Corporate Outreach',
    project: 'Q3 Promo Campaign',
    date: '2026-06-03',
    tasksAssigned: 6,
    tasksCompleted: 3,
    pendingTasksCount: 3,
    summary: 'Attempted cold calls to regional branch clients. Logged sparse feedback logs.',
    ongoingTasks: 'Sales deck review.',
    pendingTasks: 'Follow up with 15 corporate leads.',
    majorAccomplishments: 'Scheduled 1 introductory client meeting.',
    challengesFaced: 'Heavy client call rejections due to budget constraints.',
    supportRequired: 'Pricing revision or discount structures.',
    loginTime: '08:30',
    logoutTime: '16:30',
    workingHours: 8.0,
    overtimeHours: 0.0,
    plannedTasksTomorrow: 'Follow up with active leads and audit pipeline.',
    expectedDeliverablesTomorrow: 'Daily pipeline conversion sheets.',
    priorityTasksTomorrow: 'Reschedule client call with IT manager.',
    attachments: [],
    status: 'Changes Requested',
    submittedTime: '2026-06-03T17:15:00',
    productivityScore: 50,
    feedback: 'Please clarify your outreach metrics and detail client objection logs.',
    approvalHistory: [
      { role: 'Employee', user: 'Meena Sharma', action: 'Submitted', timestamp: '2026-06-03T17:15:00', comments: '' },
      { role: 'Team Leader', user: 'Ankit Sharma', action: 'Requested Changes', timestamp: '2026-06-03T19:00:00', comments: 'Logs too brief. Detail client responses.' }
    ]
  },
  {
    id: 'REP-004',
    employeeName: 'Prakash Patel',
    employeeId: 'EMP-121',
    department: 'Operations',
    team: 'Systems Integration',
    project: 'HR Digitization System',
    date: '2026-06-02',
    tasksAssigned: 8,
    tasksCompleted: 7,
    pendingTasksCount: 1,
    summary: 'Configured directory sync utilities and onboarded new staff hardware.',
    ongoingTasks: 'Active Directory updates.',
    pendingTasks: 'VLAN mapping checks.',
    majorAccomplishments: 'Deployed 5 cloud environments in staging branch.',
    challengesFaced: 'Network bandwidth throttle during provisioning.',
    supportRequired: 'IT network team upgrade ticket.',
    loginTime: '09:00',
    logoutTime: '18:30',
    workingHours: 9.5,
    overtimeHours: 1.5,
    plannedTasksTomorrow: 'VLAN configurations review.',
    expectedDeliverablesTomorrow: 'Network diagram v2.',
    priorityTasksTomorrow: 'Provisioning checklist review.',
    attachments: ['ad_sync_report.pdf'],
    status: 'Approved',
    submittedTime: '2026-06-02T18:45:00',
    productivityScore: 88,
    feedback: 'Excellent efficiency and overtime contribution.',
    approvalHistory: [
      { role: 'Employee', user: 'Prakash Patel', action: 'Submitted', timestamp: '2026-06-02T18:45:00', comments: '' },
      { role: 'Project Manager', user: 'Priya Verma', action: 'Approved', timestamp: '2026-06-02T20:00:00', comments: 'System checklist completed correctly.' }
    ]
  },
  {
    id: 'REP-005',
    employeeName: 'Sunita Rao',
    employeeId: 'EMP-130',
    department: 'HR',
    team: 'Talent Acquisition',
    project: 'Employee Wellness Portal',
    date: '2026-06-02',
    tasksAssigned: 5,
    tasksCompleted: 2,
    pendingTasksCount: 3,
    summary: 'Conducted screening interviews. Left early due to medical checkup.',
    ongoingTasks: 'Candidate portal review.',
    pendingTasks: 'Follow up with 5 shortlisted developers.',
    majorAccomplishments: 'Drafted wellness portal feature proposals.',
    challengesFaced: 'Sourcing delay for senior engineering candidates.',
    supportRequired: 'Sponsorship budget for talent portals.',
    loginTime: '09:30',
    logoutTime: '14:30',
    workingHours: 5.0,
    overtimeHours: 0.0,
    plannedTasksTomorrow: 'Catch up on screening queue and interview audits.',
    expectedDeliverablesTomorrow: 'Candidate pipeline spreadsheet.',
    priorityTasksTomorrow: 'Interview scheduling.',
    attachments: [],
    status: 'Escalated',
    submittedTime: '2026-06-02T15:00:00',
    productivityScore: 40,
    feedback: 'Escalated to HR Director to allocate backup interview support.',
    approvalHistory: [
      { role: 'Employee', user: 'Sunita Rao', action: 'Submitted', timestamp: '2026-06-02T15:00:00', comments: '' },
      { role: 'Team Leader', user: 'Meera Joshi', action: 'Escalated', timestamp: '2026-06-02T16:30:00', comments: 'Sickness leave balance applied. Escalating task load.' }
    ]
  }
];

const DEFAULTERS_LIST = [
  { name: 'Kiran Mehta', empId: 'EMP-112', department: 'IT', team: 'Infra Ops', missingCount: 3, lastReminder: '2 days ago', status: 'High Risk' },
  { name: 'Neha Gupta', empId: 'EMP-104', department: 'HR', team: 'People Ops', missingCount: 1, lastReminder: '1 day ago', status: 'Moderate Risk' },
  { name: 'Amit Singh', empId: 'EMP-118', department: 'Sales', team: 'Direct Sales', missingCount: 2, lastReminder: 'Just now', status: 'High Risk' }
];

const AUDIT_TRAIL = [
  { id: 'LOG-001', user: 'Divya Singh', role: 'Employee', action: 'Submission', target: 'REP-001', timestamp: '2026-06-03 18:30:00', details: 'Submitted Daily Report' },
  { id: 'LOG-002', user: 'Rohan Verma', role: 'Team Leader', action: 'Approval', target: 'REP-001', timestamp: '2026-06-03 19:45:00', details: 'Approved REP-001 with comments: Excellent work.' },
  { id: 'LOG-003', user: 'Meena Sharma', role: 'Employee', action: 'Submission', target: 'REP-003', timestamp: '2026-06-03 17:15:00', details: 'Submitted Daily Report' },
  { id: 'LOG-004', user: 'Ankit Sharma', role: 'Team Leader', action: 'Rejection', target: 'REP-003', timestamp: '2026-06-03 19:00:00', details: 'Requested changes for REP-003: Logs too brief.' },
  { id: 'LOG-005', user: 'Sunita Rao', role: 'Employee', action: 'Submission', target: 'REP-005', timestamp: '2026-06-02 15:00:00', details: 'Submitted Daily Report' }
];

const NOTIFICATION_SEEDS = [
  { id: 'NTF-901', message: 'Divya Singh (REP-001) submitted daily report.', timestamp: '1 hour ago', read: false },
  { id: 'NTF-902', message: 'Report REP-003 marked as changes requested by Ankit Sharma.', timestamp: '2 hours ago', read: false },
  { id: 'NTF-903', message: 'Prakash Patel (REP-004) report approved successfully.', timestamp: '1 day ago', read: true },
  { id: 'NTF-904', message: 'Defaulter alert: Kiran Mehta missed reports for 3 consecutive days.', timestamp: '2 days ago', read: true }
];

/* ── Static charts data ────────────────────────────────────────── */
const DEPT_CHART_DATA = [
  { name: 'IT', productivity: 91, completionRate: 85, submissions: 18, pending: 1 },
  { name: 'Marketing', productivity: 88, completionRate: 82, submissions: 12, pending: 2 },
  { name: 'Sales', productivity: 72, completionRate: 65, submissions: 24, pending: 4 },
  { name: 'HR', productivity: 81, completionRate: 78, submissions: 9, pending: 0 },
  { name: 'Operations', productivity: 85, completionRate: 80, submissions: 15, pending: 1 }
];

const WEEKLY_TREND = [
  { name: 'Mon', completion: 74, submissions: 14 },
  { name: 'Tue', completion: 82, submissions: 18 },
  { name: 'Wed', completion: 89, submissions: 22 },
  { name: 'Thu', completion: 85, submissions: 20 },
  { name: 'Fri', completion: 93, submissions: 25 },
  { name: 'Sat', completion: 91, submissions: 10 }
];

const CAPACITY_DATA = [
  { name: 'Fully Utilized', value: 55, fill: 'var(--color-success)' },
  { name: 'Under-utilized', value: 25, fill: 'var(--accent-blue-solid)' },
  { name: 'Overloaded', value: 20, fill: 'var(--color-danger)' }
];

/* ═══════════════════════════════════════════════════════════
   HELPERS & MATH RULES
   ═══════════════════════════════════════════════════════════ */
const calculateWorkingHours = (login, logout) => {
  if (!login || !logout) return 0;
  const [loginH, loginM] = login.split(':').map(Number);
  const [logoutH, logoutM] = logout.split(':').map(Number);
  const diff = (logoutH + logoutM / 60) - (loginH + loginM / 60);
  return Math.max(0, parseFloat(diff.toFixed(2)));
};

const getStatusBadgeVariant = (status) => {
  switch (status) {
    case 'Approved': return 'success';
    case 'Submitted': return 'warning';
    case 'Changes Requested': return 'danger';
    case 'Escalated': return 'info';
    case 'Rejected': return 'danger';
    default: return 'neutral';
  }
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  return isoString.split('T')[1]?.slice(0, 5) || '';
};

/* ═══════════════════════════════════════════════════════════
   MAIN MODULE COMPONENT
   ═══════════════════════════════════════════════════════════ */
const WorkReports = () => {
  const { addToast, currentUser, currentUserRole, employees, dailyReports: rawReports, setDailyReports: setReports } = useApp();
  const loading = usePageLoading(800);

  const initialUserRole = useMemo(() => {
    if (currentUserRole === 'super_admin') return 'Super Admin';
    if (currentUserRole === 'branch_admin' || currentUserRole === 'dept_admin') return 'HR/Admin';
    if (currentUserRole === 'project_manager') return 'Project Manager';
    if (currentUserRole === 'team_leader') return 'Team Leader';
    return 'Employee';
  }, [currentUserRole]);

  /* Simulated user perspective configuration */
  const [userRole, setUserRole] = useState(initialUserRole);

  React.useEffect(() => {
    setUserRole(initialUserRole);
  }, [initialUserRole]);

  /* Page Tabs Controller */
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, directory, submit, calendar, analytics, leaderboards, logs

  const reports = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin') return rawReports;
    return rawReports.filter(r => {
      const emp = employees.find(e => e.id === r.employeeId || e.name === r.employeeName);
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'dept_admin') {
        return r.department === currentUser?.department || emp?.department === currentUser?.department;
      }
      if (currentUserRole === 'employee') {
        return r.employeeId === currentUser?.id || emp?.id === currentUser?.id;
      }
      return true;
    });
  }, [rawReports, employees, currentUser, currentUserRole]);

  const [auditLogs, setAuditLogs] = useState(AUDIT_TRAIL);
  const [notifications, setNotifications] = useState(NOTIFICATION_SEEDS);

  /* Filter, Search, Pagination state */
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [sortCol, setSortCol] = useState('submittedTime');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  /* Checkbox Bulk Selection State */
  const [selectedIds, setSelectedIds] = useState([]);

  /* Selected Audit Detail Drawers & Modals */
  const [selectedReport, setSelectedReport] = useState(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState('');
  const [evaluationRating, setEvaluationRating] = useState('Excellent');

  /* Submission Form States */
  const [formProject, setFormProject] = useState('SaaS Platform v3.0');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasksAssigned, setTasksAssigned] = useState(5);
  const [tasksCompleted, setTasksCompleted] = useState(4);
  const [formSummary, setFormSummary] = useState('');
  const [formOngoing, setFormOngoing] = useState('');
  const [formPending, setFormPending] = useState('');
  const [formAccomplish, setFormAccomplish] = useState('');
  const [formChallenges, setFormChallenges] = useState('');
  const [formSupport, setFormSupport] = useState('');
  const [formLogin, setFormLogin] = useState('09:00');
  const [formLogout, setFormLogout] = useState('18:00');
  const [tomorrowPlanned, setTomorrowPlanned] = useState('');
  const [tomorrowDeliverable, setTomorrowDeliverable] = useState('');
  const [tomorrowPriority, setTomorrowPriority] = useState('Medium');
  
  /* Upload file simulator state */
  const [formFiles, setFormFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  /* Calendar Monthly navigation */
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed base)
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  /* Export system mock animation states */
  const [exporting, setExporting] = useState(false);

  /* Add dynamic log helper */
  const addAuditLog = (action, target, details) => {
    const newLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      user: userRole === 'Employee' ? 'Divya Singh' : userRole === 'Team Leader' ? 'Rohan Verma' : 'Super Admin User',
      role: userRole,
      action,
      target,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  /* Add Notification helper */
  const pushNotification = (message) => {
    const newNtf = {
      id: `NTF-${Math.floor(100 + Math.random() * 900)}`,
      message,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [newNtf, ...prev]);
  };

  /* Form calculation values */
  const calculatedHours = useMemo(() => calculateWorkingHours(formLogin, formLogout), [formLogin, formLogout]);
  const calculatedOvertime = useMemo(() => Math.max(0, parseFloat((calculatedHours - 8).toFixed(2))), [calculatedHours]);

  /* Submit validation & action */
  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!formSummary.trim() || !formAccomplish.trim()) {
      addToast('danger', 'Please enter a tasks summary and major accomplishments.');
      return;
    }
    if (tasksCompleted > tasksAssigned) {
      addToast('danger', 'Tasks completed cannot exceed tasks assigned.');
      return;
    }

    const newReportId = `REP-${String(reports.length + 1).padStart(3, '0')}`;
    const newReport = {
      id: newReportId,
      employeeName: currentUser?.name || 'Rahul Sharma',
      employeeId: currentUser?.id || 'EMP-201',
      department: currentUser?.department || 'IT',
      team: currentUser?.teamName || 'Dev Team Alpha',
      project: formProject,
      date: formDate,
      tasksAssigned: Number(tasksAssigned),
      tasksCompleted: Number(tasksCompleted),
      pendingTasksCount: Math.max(0, tasksAssigned - tasksCompleted),
      summary: formSummary,
      ongoingTasks: formOngoing || 'None.',
      pendingTasks: formPending || 'None.',
      majorAccomplishments: formAccomplish,
      challengesFaced: formChallenges || 'None.',
      supportRequired: formSupport || 'None.',
      loginTime: formLogin,
      logoutTime: formLogout,
      workingHours: calculatedHours,
      overtimeHours: calculatedOvertime,
      plannedTasksTomorrow: tomorrowPlanned || 'None.',
      expectedDeliverablesTomorrow: tomorrowDeliverable || 'None.',
      priorityTasksTomorrow: tomorrowPriority,
      attachments: formFiles.map(f => f.name),
      status: 'Submitted',
      submittedTime: new Date().toISOString(),
      productivityScore: Math.round((Number(tasksCompleted) / Math.max(1, Number(tasksAssigned))) * 100),
      feedback: '',
      approvalHistory: [
        { role: 'Employee', user: currentUser?.name || 'Rahul Sharma', action: 'Submitted', timestamp: new Date().toISOString(), comments: '' }
      ]
    };

    setReports(prev => [newReport, ...prev]);
    pushNotification(`${currentUser?.name || 'Rahul Sharma'} (REP-${newReport.id}) submitted daily work report.`);
    addAuditLog('Submission', newReportId, `${currentUser?.name || 'Rahul Sharma'} submitted daily report for ${formDate}`);

    addToast('success', `Daily work report ${newReportId} submitted successfully.`);

    // Reset fields
    setFormSummary('');
    setFormOngoing('');
    setFormPending('');
    setFormAccomplish('');
    setFormChallenges('');
    setFormSupport('');
    setTomorrowPlanned('');
    setTomorrowDeliverable('');
    setFormFiles([]);
    setFileInputKey(Date.now());
    
    // Switch to table
    setActiveTab('directory');
  };

  /* File simulator */
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormFiles(prev => [...prev, ...files]);
    addToast('info', `${files.length} simulated attachment(s) uploaded.`);
  };

  const removeAttachedFile = (idx) => {
    setFormFiles(prev => prev.filter((_, i) => i !== idx));
  };

  /* Audit details action */
  const triggerAuditAction = (actionType) => {
    if (!selectedReport) return;
    
    let updatedStatus = 'Submitted';
    let actionLabel = '';

    if (actionType === 'Approve') {
      updatedStatus = 'Approved';
      actionLabel = 'Approved';
    } else if (actionType === 'Reject') {
      updatedStatus = 'Rejected';
      actionLabel = 'Rejected';
    } else if (actionType === 'Changes') {
      updatedStatus = 'Changes Requested';
      actionLabel = 'Requested Changes';
    } else if (actionType === 'Escalate') {
      updatedStatus = 'Escalated';
      actionLabel = 'Escalated';
    }

    const calculatedProd = Math.round((selectedReport.tasksCompleted / Math.max(1, selectedReport.tasksAssigned)) * 100);

    setReports(prev =>
      prev.map(r => {
        if (r.id === selectedReport.id) {
          const updatedHistory = [
            ...r.approvalHistory,
            {
              role: userRole,
              user: userRole === 'Super Admin' ? 'Super Admin User' : 'Rohan Verma',
              action: actionLabel,
              timestamp: new Date().toISOString(),
              comments: evaluationFeedback
            }
          ];
          return {
            ...r,
            status: updatedStatus,
            feedback: evaluationFeedback,
            productivityScore: actionType === 'Approve' ? calculatedProd : Math.round(calculatedProd * 0.7), // slight penalty for flags/corrections
            approvalHistory: updatedHistory
          };
        }
        return r;
      })
    );

    addAuditLog(actionType === 'Approve' ? 'Approval' : 'Rejection', selectedReport.id, `Report status updated to ${updatedStatus} by ${userRole}`);
    pushNotification(`Report ${selectedReport.id} was ${updatedStatus.toLowerCase()} by manager.`);
    addToast('success', `Report ${selectedReport.id} successfully updated to ${updatedStatus}.`);

    // Reset drawer state
    setSelectedReport(null);
    setEvaluationFeedback('');
  };

  /* Bulk state actions */
  const handleBulkStatusChange = (status) => {
    if (selectedIds.length === 0) {
      addToast('warning', 'Please select at least one report.');
      return;
    }

    setReports(prev =>
      prev.map(r => {
        if (selectedIds.includes(r.id)) {
          return {
            ...r,
            status: status,
            feedback: `Bulk ${status.toLowerCase()} action applied by ${userRole}.`
          };
        }
        return r;
      })
    );

    addAuditLog('Bulk Update', selectedIds.join(','), `Bulk updated ${selectedIds.length} reports to ${status}`);
    addToast('success', `Bulk approved ${selectedIds.length} reports successfully.`);
    setSelectedIds([]);
  };

  /* Defaulter warning dispatcher */
  const handleSendReminder = (name, empId) => {
    pushNotification(`Defaulter reminder alert sent to ${name} (${empId}).`);
    addAuditLog('Reminder', empId, `Sent report reminder alert to ${name}`);
    addToast('info', `Work report submission reminder sent to ${name}.`);
  };

  /* Export system trigger */
  const handleExportSystem = (format) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      addToast('success', `Daily Work Reports exported successfully in ${format} format.`);
    }, 1500);
  };

  /* Auto Calculations derived states */
  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'Submitted' || r.status === 'Escalated').length;
    const approved = reports.filter(r => r.status === 'Approved').length;
    const rejected = reports.filter(r => r.status === 'Rejected' || r.status === 'Changes Requested').length;
    
    const activeReporting = new Set(reports.map(r => r.employeeId)).size;
    const avgProductivity = total > 0 ? Math.round(reports.reduce((s, r) => s + (r.productivityScore || 80), 0) / total) : 0;
    
    return { total, pending, approved, rejected, activeReporting, avgProductivity };
  }, [reports]);

  /* Filter and search execution */
  const filtered = useMemo(() => {
    return reports.filter(r => {
      // Search text match
      const query = search.toLowerCase();
      if (search) {
        const matchesName = r.employeeName.toLowerCase().includes(query);
        const matchesProj = r.project.toLowerCase().includes(query);
        const matchesDept = r.department.toLowerCase().includes(query);
        const matchesId = r.id.toLowerCase().includes(query);
        const matchesSummary = r.summary.toLowerCase().includes(query);
        if (!matchesName && !matchesProj && !matchesDept && !matchesId && !matchesSummary) return false;
      }

      // Status filters
      if (statusFilter !== 'All') {
        if (statusFilter === 'Flagged') {
          if (r.status !== 'Changes Requested' && r.status !== 'Escalated') return false;
        } else if (r.status !== statusFilter) {
          return false;
        }
      }

      // Project filter
      if (projectFilter !== 'All' && r.project !== projectFilter) return false;

      // Department filter
      if (deptFilter && r.department !== deptFilter) return false;

      // Calendar click or date filter
      if (dateFilter && r.date !== dateFilter) return false;

      return true;
    });
  }, [reports, search, statusFilter, projectFilter, deptFilter, dateFilter]);

  /* Sorted data */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortCol];
      let bv = b[sortCol];
      if (typeof av === 'string') {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir]);

  /* Pagination slices */
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const pagedList = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, page]);

  /* Saved views triggers */
  const applySavedView = (viewName) => {
    setPage(1);
    setDateFilter('');
    if (viewName === 'all') {
      setStatusFilter('All');
      setProjectFilter('All');
      setSearch('');
    } else if (viewName === 'pending') {
      setStatusFilter('Submitted');
      setProjectFilter('All');
    } else if (viewName === 'flagged') {
      setStatusFilter('Flagged');
      setProjectFilter('All');
    } else if (viewName === 'my') {
      setStatusFilter('All');
      setSearch('Rahul Sharma'); // employee view
    }
    addToast('info', `Applied filter view: ${viewName.toUpperCase()}`);
  };

  /* Calendar grids builder */
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    
    const cells = [];
    
    // Empty cells for alignment
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateStr: '', reports: [] });
    }
    
    // Fill monthly dates
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayReports = reports.filter(r => r.date === dateStr);
      cells.push({
        day,
        dateStr,
        reports: dayReports
      });
    }
    return cells;
  }, [currentYear, currentMonth, reports]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  /* Checkbox utility methods */
  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(pagedList.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  /* Loading state wrapper */
  if (loading) {
    return (
      <div className="work-reports-page animate-fade-in">
        <div style={{ height: '70px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="reports-stats">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="reports-card card" style={{ height: 110 }}><Skeleton variant="rect" height="100%" /></div>)}</div>
        <div className="reports-card card" style={{ height: 400 }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="work-reports-page animate-fade-in">
      
      {/* ── HEADER ── */}
      <div className="reports-header flex-row justify-between flex-wrap gap-4">
        <div className="reports-title-section">
          <h1>Daily Work Reports</h1>
          <p className="subtitle">Submit updates, audit timesheets, track deliverables, and manage employee productivity.</p>
        </div>

        {/* Dynamic Role Switcher & Tabs */}
        <div className="flex-center gap-3 flex-wrap">
          {currentUserRole !== 'employee' && (
            <div className="role-switcher-container">
              <span className="role-switcher-label">View Perspective:</span>
              <select
                value={userRole}
                onChange={(e) => {
                  setUserRole(e.target.value);
                  addToast('info', `Dashboard view role changed to: ${e.target.value}`);
                }}
                className="role-selector-input"
              >
                <option>Employee</option>
                <option>Team Leader</option>
                <option>Project Manager</option>
                <option>HR/Admin</option>
                <option>Super Admin</option>
              </select>
            </div>
          )}
          
          <Button variant="ghost" size="sm" icon={Download} onClick={() => handleExportSystem('CSV')}>
            {exporting ? 'Exporting...' : 'Export Directory'}
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setActiveTab('submit')}>
            Submit Work Report
          </Button>
        </div>
      </div>

      {/* ── TABS BAR ── */}
      <div className="reports-tabs-bar">
        {[
          { id: 'dashboard', label: 'Dashboard Overview', icon: <BarChart3 size={15} /> },
          { id: 'directory', label: 'Reports Directory', icon: <FileText size={15} /> },
          { id: 'submit', label: 'Submit Daily Report', icon: <Send size={15} /> },
          { id: 'calendar', label: 'Calendar Grid', icon: <Calendar size={15} /> },
          { id: 'analytics', label: 'Analytics & Heatmap', icon: <TrendingUp size={15} /> },
          currentUserRole !== 'employee' && { id: 'leaderboards', label: 'Leaderboard & Reminders', icon: <Award size={15} /> },
          currentUserRole !== 'employee' && { id: 'logs', label: 'Notifications & Audits', icon: <ShieldAlert size={15} /> }
        ].filter(Boolean).map(t => (
          <button
            key={t.id}
            className={`reports-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(t.id);
              setPage(1);
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ── */}
      {activeTab === 'dashboard' && (
        <div className="flex-column gap-5 animate-slide-up">
          <div className="reports-stats">
            <div className="card stat-metric-card border-left-blue">
              <span className="card-lbl-gray">Total Submissions</span>
              <div className="card-value-display text-white">{stats.total}</div>
              <span className="card-sub-desc">↑ 12% vs previous period</span>
            </div>
            
            <div className="card stat-metric-card border-left-warning">
              <span className="card-lbl-gray">Pending Review</span>
              <div className="card-value-display text-warning">{stats.pending}</div>
              <span className="card-sub-desc">Awaiting manager validation</span>
            </div>

            <div className="card stat-metric-card border-left-success">
              <span className="card-lbl-gray">Approved Logs</span>
              <div className="card-value-display text-success">{stats.approved}</div>
              <span className="card-sub-desc">Verified timesheets & goals</span>
            </div>

            <div className="card stat-metric-card border-left-danger">
              <span className="card-lbl-gray">Flags & Rejections</span>
              <div className="card-value-display text-danger">{stats.rejected}</div>
              <span className="card-sub-desc">Clarifications requested</span>
            </div>
          </div>

          {currentUserRole !== 'employee' ? (
            <div className="reports-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="card stat-metric-card border-left-teal">
                <span className="card-lbl-gray">Active Workforce Logged</span>
                <div className="card-value-display text-teal">{stats.activeReporting} Staff</div>
                <span className="card-sub-desc">Reporting to date</span>
              </div>

              <div className="card stat-metric-card border-left-purple">
                <span className="card-lbl-gray">Avg Productivity Score</span>
                <div className="card-value-display text-purple">{stats.avgProductivity}%</div>
                <span className="card-sub-desc">Calculated completion matrix</span>
              </div>

              <div className="card stat-metric-card border-left-orange">
                <span className="card-lbl-gray">Missing Reports</span>
                <div className="card-value-display text-orange">3 Alerts</div>
                <span className="card-sub-desc">From active roster teams</span>
              </div>

              <div className="card stat-metric-card border-left-neutral">
                <span className="card-lbl-gray">Late Submissions</span>
                <div className="card-value-display text-white">2 Records</div>
                <span className="card-sub-desc">Past 18:00 cutoff deadline</span>
              </div>
            </div>
          ) : (
            <div className="reports-stats" style={{ gridTemplateColumns: '1fr' }}>
              <div className="card stat-metric-card border-left-purple">
                <span className="card-lbl-gray">My Avg Productivity Score</span>
                <div className="card-value-display text-purple">{stats.avgProductivity}%</div>
                <span className="card-sub-desc">Based on submitted daily reports</span>
              </div>
            </div>
          )}

          {/* Quick Analytics overview */}
          <div className="reports-kpi-grid">
            <div className="card flex-column padding-5">
              <span className="pm-dir-title" style={{ marginBottom: 12 }}>Department Productivity Overview</span>
              <div className="reports-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEPT_CHART_DATA} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10}/>
                    <YAxis stroke="var(--text-muted)" fontSize={10} domain={[0, 100]}/>
                    <Tooltip {...CHART_TT}/>
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '0.7rem' }}/>
                    <Bar name="Avg Productivity Score (%)" dataKey="productivity" fill="var(--color-primary)" radius={[4, 4, 0, 0]}/>
                    <Bar name="Task Completion Rate (%)" dataKey="completionRate" fill="var(--accent-blue-solid)" radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card flex-column padding-5">
              <span className="pm-dir-title" style={{ marginBottom: 12 }}>Weekly Submissions Compliance Trend</span>
              <div className="reports-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={WEEKLY_TREND}>
                    <defs>
                      <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10}/>
                    <YAxis stroke="var(--text-muted)" fontSize={10}/>
                    <Tooltip {...CHART_TT}/>
                    <Area type="monotone" name="Reports Submitted" dataKey="submissions" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorSub)"/>
                    <Line type="monotone" name="Completion Rate (%)" dataKey="completion" stroke="var(--color-success)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORTS DIRECTORY TAB ── */}
      {activeTab === 'directory' && (
        <div className="card flex-column padding-0 animate-slide-up">
          
          {/* Controls toolbar */}
          <div className="reports-control-toolbar flex-row justify-between flex-wrap gap-3">
            
            {/* Left filters */}
            <div className="flex-center gap-2 flex-wrap">
              <div className="reports-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search name, ID, project..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="reports-select-filter"
              >
                <option value="All">All Statuses</option>
                <option>Submitted</option>
                <option>Approved</option>
                <option>Changes Requested</option>
                <option>Escalated</option>
                <option>Rejected</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                className="reports-select-filter"
              >
                <option value="">All Departments</option>
                <option>IT</option>
                <option>HR</option>
                <option>Marketing</option>
                <option>Sales</option>
                <option>Operations</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className="reports-select-filter"
              />

              {(search || statusFilter !== 'All' || deptFilter || dateFilter) && (
                <Button variant="ghost" size="xs" onClick={() => { setSearch(''); setStatusFilter('All'); setDeptFilter(''); setDateFilter(''); setPage(1); }}>
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Right saved views & Bulk */}
            <div className="flex-center gap-2 flex-wrap">
              <div className="reports-saved-views">
                <span className="label">Quick Views:</span>
                <button className="view-link-btn" onClick={() => applySavedView('all')}>All</button>
                <button className="view-link-btn" onClick={() => applySavedView('pending')}>Pending</button>
                <button className="view-link-btn" onClick={() => applySavedView('flagged')}>Flagged</button>
                {userRole === 'Employee' && <button className="view-link-btn" onClick={() => applySavedView('my')}>My Submissions</button>}
              </div>

              {/* Bulk Actions Menu */}
              {selectedIds.length > 0 && (
                <div className="bulk-actions-wrapper">
                  <Badge variant="warning">{selectedIds.length} Selected</Badge>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkStatusChange(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bulk-actions-dropdown"
                  >
                    <option value="">— Bulk Actions —</option>
                    <option value="Approved">Bulk Approve</option>
                    <option value="Changes Requested">Bulk Request Changes</option>
                    <option value="Rejected">Bulk Reject</option>
                  </select>
                </div>
              )}
            </div>

          </div>

          {/* Directory Data Table */}
          <div className="reports-table-wrap">
            <table className="reports-data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === pagedList.length && pagedList.length > 0}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Dept/Team</th>
                  <th>Project</th>
                  <th>Report Date</th>
                  <th>Tasks Assg.</th>
                  <th>Tasks Comp.</th>
                  <th>Time Logged</th>
                  <th>Prod. Score</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedList.length > 0 ? pagedList.map(report => (
                  <tr key={report.id} className={selectedIds.includes(report.id) ? 'row-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(report.id)}
                        onChange={(e) => toggleSelectOne(report.id, e.target.checked)}
                      />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{report.id}</td>
                    <td>
                      <div className="flex-center gap-2 justify-start">
                        <Avatar name={report.employeeName} size="sm" />
                        <strong>{report.employeeName}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="table-dept-text">{report.department}</span>
                      <span className="table-sub-text">{report.team}</span>
                    </td>
                    <td>
                      <Badge variant="neutral">{report.project}</Badge>
                    </td>
                    <td>{report.date}</td>
                    <td>{report.tasksAssigned}</td>
                    <td>{report.tasksCompleted}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{report.workingHours} hrs</span>
                      <span className="table-sub-text">In: {report.loginTime} • Out: {report.logoutTime}</span>
                    </td>
                    <td>
                      <Badge variant={report.productivityScore >= 90 ? 'success' : report.productivityScore >= 70 ? 'info' : 'warning'}>
                        {report.productivityScore}%
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={getStatusBadgeVariant(report.status)}>{report.status}</Badge>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={Eye}
                        onClick={() => {
                          setSelectedReport(report);
                          setEvaluationFeedback(report.feedback || '');
                        }}
                      >
                        Audit / Review
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={12} className="reports-table-empty">
                      <FileText size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 8 }} />
                      <p>No work reports found matching the selected filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="reports-pagination flex-row justify-between flex-wrap gap-2">
            <span className="pagination-info-text">
              Showing {sorted.length === 0 ? 0 : (page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, sorted.length)} of {sorted.length} daily logs
            </span>
            <div className="flex-center gap-1">
              <button
                className="pagination-btn-arrow"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ‹ Prev
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`pagination-num-btn ${page === i + 1 ? 'active' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="pagination-btn-arrow"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ── SUBMIT REPORT TAB ── */}
      {activeTab === 'submit' && (
        <form onSubmit={handleReportSubmit} className="card flex-column padding-5 animate-slide-up">
          <span className="pm-dir-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>Submit Daily Work Report</span>
          
          <div className="reports-form-grid" style={{ marginTop: 10 }}>
            {/* Auto filled mock details */}
            <div className="form-group-item">
              <label className="reports-form-lbl">Employee Profile</label>
              <div className="reports-form-readonly">Rahul Sharma (EMP-201) — IT · Dev Team Alpha</div>
            </div>
            
            <div className="form-group-item">
              <label className="reports-form-lbl">Report Date</label>
              <input
                type="date"
                className="reports-form-input"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="form-group-item">
              <label className="reports-form-lbl">Associated Project</label>
              <select
                className="reports-form-input"
                value={formProject}
                onChange={(e) => setFormProject(e.target.value)}
              >
                <option>SaaS Platform v3.0</option>
                <option>Sales Funnel Automation</option>
                <option>HR Digitization System</option>
                <option>Employee Wellness Portal</option>
                <option>Q3 Promo Campaign</option>
              </select>
            </div>
          </div>

          <div className="reports-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="form-group-item">
              <label className="reports-form-lbl">Tasks Assigned Today *</label>
              <input
                type="number"
                min={0}
                className="reports-form-input"
                value={tasksAssigned}
                onChange={(e) => setTasksAssigned(Number(e.target.value))}
              />
            </div>

            <div className="form-group-item">
              <label className="reports-form-lbl">Tasks Completed Today *</label>
              <input
                type="number"
                min={0}
                className="reports-form-input"
                value={tasksCompleted}
                onChange={(e) => setTasksCompleted(Number(e.target.value))}
              />
            </div>

            {/* Time login trackers */}
            <div className="form-group-item">
              <label className="reports-form-lbl">Login Time</label>
              <input
                type="time"
                className="reports-form-input"
                value={formLogin}
                onChange={(e) => setFormLogin(e.target.value)}
              />
            </div>

            <div className="form-group-item">
              <label className="reports-form-lbl">Logout Time</label>
              <input
                type="time"
                className="reports-form-input"
                value={formLogout}
                onChange={(e) => setFormLogout(e.target.value)}
              />
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            ⏰ <strong>Automatic Time Calculation:</strong> Logged Working Hours: <strong style={{ color: 'var(--color-primary)' }}>{calculatedHours} hrs</strong> | Overtime Registered: <strong style={{ color: 'var(--color-success)' }}>{calculatedOvertime} hrs</strong> (Standard basis: 8 hours).
          </div>

          {/* Work Summary Details */}
          <div className="form-group-item">
            <label className="reports-form-lbl">Tasks Completed / Progress Summary *</label>
            <textarea
              className="reports-form-textarea"
              rows={3}
              placeholder="Detail specific task deliverables and milestones completed..."
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
            />
          </div>

          <div className="reports-form-grid">
            <div className="form-group-item">
              <label className="reports-form-lbl">Ongoing Tasks (Today)</label>
              <textarea
                className="reports-form-textarea"
                rows={2}
                placeholder="List works in progress..."
                value={formOngoing}
                onChange={(e) => setFormOngoing(e.target.value)}
              />
            </div>
            
            <div className="form-group-item">
              <label className="reports-form-lbl">Pending Tasks (Today)</label>
              <textarea
                className="reports-form-textarea"
                rows={2}
                placeholder="List tasks not started or left incomplete..."
                value={formPending}
                onChange={(e) => setFormPending(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group-item">
            <label className="reports-form-lbl">Major Accomplishments today *</label>
            <textarea
              className="reports-form-textarea"
              rows={2}
              placeholder="What core highlights or positive outcomes were achieved today?"
              value={formAccomplish}
              onChange={(e) => setFormAccomplish(e.target.value)}
            />
          </div>

          <div className="reports-form-grid">
            <div className="form-group-item">
              <label className="reports-form-lbl">Challenges Faced</label>
              <textarea
                className="reports-form-textarea"
                rows={2}
                placeholder="Log blockers, database delays, server latency..."
                value={formChallenges}
                onChange={(e) => setFormChallenges(e.target.value)}
              />
            </div>

            <div className="form-group-item">
              <label className="reports-form-lbl">Support / Help Required</label>
              <textarea
                className="reports-form-textarea"
                rows={2}
                placeholder="Specify if senior backup or server administrator audit is needed..."
                value={formSupport}
                onChange={(e) => setFormSupport(e.target.value)}
              />
            </div>
          </div>

          {/* Planning Section */}
          <div className="form-group-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
            <span className="reports-form-lbl" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>Tomorrow Planning & Delivery Strategy</span>
            <div className="reports-form-grid" style={{ marginTop: 8 }}>
              <div className="form-group-item">
                <label className="reports-form-lbl">Planned Tasks (Tomorrow)</label>
                <input
                  type="text"
                  className="reports-form-input"
                  placeholder="e.g. Profiling indexes"
                  value={tomorrowPlanned}
                  onChange={(e) => setTomorrowPlanned(e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label className="reports-form-lbl">Expected Deliverables</label>
                <input
                  type="text"
                  className="reports-form-input"
                  placeholder="e.g. Excel data sheet"
                  value={tomorrowDeliverable}
                  onChange={(e) => setTomorrowDeliverable(e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label className="reports-form-lbl">Priority Level</label>
                <select
                  className="reports-form-input"
                  value={tomorrowPriority}
                  onChange={(e) => setTomorrowPriority(e.target.value)}
                >
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attachments Upload simulator */}
          <div className="form-group-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
            <label className="reports-form-lbl"><Paperclip size={14} style={{ marginRight: 4 }} /> Attachments / Work Certifications</label>
            <div className="reports-file-uploader-wrap">
              <input
                key={fileInputKey}
                type="file"
                multiple
                id="form-upload-file"
                className="hidden-file-input"
                onChange={handleFileChange}
              />
              <label htmlFor="form-upload-file" className="reports-upload-placeholder-btn">
                <span>📁 Click to browse files (PDF, DOCX, XLSX, PNG, ZIP)</span>
              </label>

              {formFiles.length > 0 && (
                <div className="reports-attached-list">
                  {formFiles.map((file, idx) => (
                    <div key={idx} className="attached-file-badge">
                      <span className="file-name-text">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      <button type="button" onClick={() => removeAttachedFile(idx)} className="file-remove-btn"><X size={12}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
            <Button variant="ghost" onClick={() => { setActiveTab('directory'); }}>Cancel</Button>
            <Button variant="primary" type="submit">Submit Daily Report</Button>
          </div>
        </form>
      )}

      {/* ── CALENDAR VIEW TAB ── */}
      {activeTab === 'calendar' && (
        <div className="card flex-column padding-5 animate-slide-up">
          <div className="reports-calendar-header flex-row justify-between flex-wrap gap-3">
            <div>
              <span className="pm-dir-title">Reports Submission Schedule Calendar</span>
              <p className="subtitle">Visual calendar tracking daily reporting compliance status.</p>
            </div>
            <div className="flex-center gap-2">
              <button className="calendar-nav-arrow" onClick={handlePrevMonth}>‹</button>
              <strong className="calendar-month-title">{monthNames[currentMonth]} {currentYear}</strong>
              <button className="calendar-nav-arrow" onClick={handleNextMonth}>›</button>
            </div>
          </div>

          {/* Calendar legends */}
          <div className="calendar-legends-strip flex-row justify-start gap-4" style={{ margin: '12px 0 6px 0' }}>
            <span className="legend-indicator"><span className="legend-dot status-approved" /> Approved</span>
            <span className="legend-indicator"><span className="legend-dot status-submitted" /> Submitted</span>
            <span className="legend-indicator"><span className="legend-dot status-flagged" /> Action Needed</span>
            <span className="legend-indicator"><span className="legend-dot status-missing" /> Missing / Unsubmitted</span>
          </div>

          <div className="calendar-grid-wrapper">
            <div className="calendar-weekdays-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="calendar-weekday-cell">{d}</div>)}
            </div>
            <div className="calendar-days-grid">
              {calendarDays.map((cell, idx) => {
                const isToday = cell.dateStr === '2026-06-03';
                const hasSub = cell.reports.length > 0;
                
                // Determine day status color
                let dayClass = 'day-cell';
                if (!cell.day) dayClass += ' cell-empty';
                if (isToday) dayClass += ' cell-today';
                
                let dotClass = '';
                if (hasSub) {
                  const status = cell.reports[0].status;
                  if (status === 'Approved') dotClass = 'status-approved';
                  else if (status === 'Submitted') dotClass = 'status-submitted';
                  else dotClass = 'status-flagged';
                } else if (cell.day && cell.day < 3 && currentMonth === 5) {
                  // Mock missing reports for dates before today in June
                  dotClass = 'status-missing';
                }

                return (
                  <div
                    key={idx}
                    className={dayClass}
                    onClick={() => {
                      if (cell.day) {
                        setDateFilter(cell.dateStr);
                        setActiveTab('directory');
                        addToast('info', `Filtered reports for date: ${cell.dateStr}`);
                      }
                    }}
                  >
                    <span className="day-number-text">{cell.day}</span>
                    {cell.day && (
                      <div className="day-cell-content">
                        {dotClass && <span className={`calendar-status-dot-large ${dotClass}`} />}
                        {hasSub && (
                          <div className="day-cell-reports-summary">
                            {cell.reports.map(r => (
                              <span key={r.id} className="summary-lbl">{r.employeeName.split(' ')[0]} ({r.workingHours}h)</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS & WORKLOAD TAB ── */}
      {activeTab === 'analytics' && (
        <div className="flex-column gap-5 animate-slide-up">
          
          {/* Workload Heatmap grid visualization */}
          <div className="card padding-5">
            <span className="pm-dir-title">Employee Capacity & Daily Workload Heatmap</span>
            <p className="subtitle" style={{ marginBottom: 12 }}>Color-coded workload indexes based on actual logged hours (Overloaded &gt; 8.5h, Optimal 7.5h–8.5h, Under-utilized &lt; 7h).</p>
            
            <div className="reports-heatmap-container">
              <div className="heatmap-header-row">
                <div className="heatmap-name-col">Employee Name</div>
                {['May 28', 'May 29', 'May 30', 'May 31', 'Jun 01', 'Jun 02', 'Jun 03'].map(date => <div key={date} className="heatmap-date-header">{date}</div>)}
              </div>

              {[
                { name: 'Divya Singh', hours: [8.0, 8.2, 0.0, 0.0, 8.5, 9.0, 9.25] },
                { name: 'Rajesh Kumar', hours: [7.5, 8.0, 0.0, 0.0, 8.0, 8.2, 8.5] },
                { name: 'Meena Sharma', hours: [6.0, 7.5, 0.0, 0.0, 7.0, 7.5, 8.0] },
                { name: 'Prakash Patel', hours: [8.5, 8.0, 0.0, 0.0, 9.0, 9.5, 0.0] },
                { name: 'Sunita Rao', hours: [7.8, 8.0, 0.0, 0.0, 7.5, 5.0, 0.0] }
              ].map(emp => (
                <div key={emp.name} className="heatmap-body-row">
                  <div className="heatmap-name-col">
                    <Avatar name={emp.name} size="xs" />
                    <span>{emp.name}</span>
                  </div>
                  {emp.hours.map((hrs, idx) => {
                    let colorClass = 'heat-empty';
                    if (hrs > 0) {
                      if (hrs > 8.5) colorClass = 'heat-overloaded';
                      else if (hrs >= 7.5) colorClass = 'heat-optimal';
                      else colorClass = 'heat-under';
                    }
                    return (
                      <div key={idx} className={`heatmap-cell ${colorClass}`} title={`${hrs} hours logged`}>
                        {hrs > 0 ? `${hrs}h` : '—'}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            
            <div className="heatmap-legends-row">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Workload Index:</span>
              <span className="legend-indicator"><span className="legend-box heat-overloaded" /> Overloaded (&gt;8.5h)</span>
              <span className="legend-indicator"><span className="legend-box heat-optimal" /> Optimal (7.5h - 8.5h)</span>
              <span className="legend-indicator"><span className="legend-box heat-under" /> Under-utilized (&lt;7.5h)</span>
            </div>
          </div>

          <div className="reports-kpi-grid">
            {/* Pie Chart of Capacity utilization */}
            <div className="card padding-5">
              <span className="pm-dir-title" style={{ marginBottom: 12 }}>Resource Capacity Allocation Breakdown</span>
              <div className="reports-chart-container" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={CAPACITY_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {CAPACITY_DATA.map((e, idx) => <Cell key={idx} fill={e.fill} />)}
                    </Pie>
                    <Tooltip {...CHART_TT} formatter={(v) => [`${v}%`, 'Distribution']}/>
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '0.7rem' }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hour submission totals per project */}
            <div className="card padding-5">
              <span className="pm-dir-title" style={{ marginBottom: 12 }}>Working vs Overtime Hours Analysis</span>
              <div className="reports-chart-container" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { project: 'SaaS Platform v3', work: 32, ot: 4.5 },
                    { project: 'Sales Funnel', work: 24, ot: 1.0 },
                    { project: 'HR Digitization', work: 16, ot: 2.5 },
                    { project: 'Wellness Portal', work: 8, ot: 0.0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="project" stroke="var(--text-muted)" fontSize={9} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} />
                    <Tooltip {...CHART_TT} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '0.7rem' }} />
                    <Bar name="Work Hours Logged" dataKey="work" fill="var(--accent-blue-solid)" stackId="a" radius={[2, 2, 0, 0]}/>
                    <Bar name="Overtime Logged" dataKey="ot" fill="var(--color-success)" stackId="a" radius={[2, 2, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LEADERBOARDS & MONITORING TAB ── */}
      {activeTab === 'leaderboards' && (
        <div className="reports-kpi-grid animate-slide-up">
          
          {/* Top Performers */}
          <div className="card padding-5">
            <span className="pm-dir-title" style={{ marginBottom: 10 }}>Top Performance Leaderboard</span>
            <div className="reports-table-wrap">
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Performer</th>
                    <th>Submissions</th>
                    <th>Avg Score</th>
                    <th>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: '🥇 1st', name: 'Rajesh Kumar', count: 5, score: 98, status: '100% on time' },
                    { rank: '🥈 2nd', name: 'Divya Singh', count: 5, score: 94, status: '100% on time' },
                    { rank: '🥉 3rd', name: 'Prakash Patel', count: 4, score: 88, status: '95% on time' }
                  ].map(p => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 700 }}>{p.rank}</td>
                      <td>
                        <div className="flex-center gap-2 justify-start">
                          <Avatar name={p.name} size="sm" />
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      <td>{p.count} submissions</td>
                      <td>
                        <Badge variant="success">{p.score}%</Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-success)' }}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing / Defaulters Reminders */}
          <div className="card padding-5">
            <span className="pm-dir-title" style={{ marginBottom: 10 }}>Compliance Monitoring & Defaulters</span>
            <p className="subtitle" style={{ marginBottom: 12 }}>Employees with missing reports or delayed logs. Click to alert them directly.</p>
            
            <div className="flex-column gap-3">
              {DEFAULTERS_LIST.map(d => (
                <div key={d.name} className="defaulter-row flex-row justify-between padding-3">
                  <div className="flex-center gap-3">
                    <Avatar name={d.name} size="sm" />
                    <div>
                      <strong className="text-white">{d.name}</strong>
                      <span className="table-sub-text">{d.department} • {d.team}</span>
                    </div>
                  </div>
                  <div className="flex-center gap-3">
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="danger">{d.missingCount} Missing</Badge>
                      <span className="table-sub-text" style={{ marginTop: 2 }}>Last alert: {d.lastReminder}</span>
                    </div>
                    
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={Volume2}
                      onClick={() => handleSendReminder(d.name, d.empId)}
                    >
                      Alert Staff
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── AUDIT & NOTIFICATIONS TAB ── */}
      {activeTab === 'logs' && (
        <div className="reports-kpi-grid animate-slide-up">
          
          {/* Notifications Feed */}
          <div className="card padding-5">
            <div className="flex-row justify-between align-center" style={{ marginBottom: 12 }}>
              <span className="pm-dir-title">In-App Notification Feed Inbox</span>
              <button
                className="view-link-btn"
                onClick={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  addToast('success', 'All notifications marked as read.');
                }}
              >
                Mark all as read
              </button>
            </div>
            
            <div className="flex-column gap-3">
              {notifications.map(n => (
                <div key={n.id} className={`notification-item flex-row justify-between padding-3 ${!n.read ? 'unread' : ''}`}>
                  <div className="flex-center gap-2">
                    {!n.read && <span className="notification-unread-dot" />}
                    <span className="notification-message-text">{n.message}</span>
                  </div>
                  <span className="notification-time-lbl">{n.timestamp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Audit logs */}
          <div className="card padding-5">
            <span className="pm-dir-title" style={{ marginBottom: 10 }}>Security Audit Trails & Logs</span>
            <div className="reports-table-wrap">
              <table className="reports-data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor (Role)</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.timestamp}</td>
                      <td>
                        <strong>{log.user}</strong>
                        <span className="table-sub-text">{log.role}</span>
                      </td>
                      <td>
                        <Badge variant={log.action === 'Approval' ? 'success' : log.action === 'Rejection' ? 'danger' : 'info'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{log.target}</td>
                      <td style={{ fontSize: '0.78rem' }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ── Slide-over Detail Audit Drawer ── */}
      {selectedReport && (
        <SlideOver
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title={`Audit Daily Report — ${selectedReport.id}`}
        >
          <div className="report-detail-wrapper animate-slide-up">
            
            {/* Employee info header card */}
            <div className="reports-drawer-hero flex-row justify-between align-center">
              <div className="flex-center gap-3">
                <Avatar name={selectedReport.employeeName} size="md" />
                <div>
                  <h4>{selectedReport.employeeName}</h4>
                  <p className="subtitle">{selectedReport.department} • {selectedReport.team} • ID: {selectedReport.employeeId}</p>
                </div>
              </div>
              <Badge variant={getStatusBadgeVariant(selectedReport.status)}>{selectedReport.status}</Badge>
            </div>

            {/* Core calculations summary widgets */}
            <div className="reports-drawer-widgets-strip">
              <div className="widget-item">
                <span className="lbl">Completion Rate</span>
                <span className="val">{Math.round((selectedReport.tasksCompleted / Math.max(1, selectedReport.tasksAssigned)) * 100)}%</span>
                <span className="desc">Assigned: {selectedReport.tasksAssigned} | Done: {selectedReport.tasksCompleted}</span>
              </div>

              <div className="widget-item">
                <span className="lbl">Efficiency Index</span>
                <span className="val">
                  {Math.min(100, Math.round(((selectedReport.tasksCompleted / Math.max(1, selectedReport.tasksAssigned)) * 100) * (8 / Math.max(1, selectedReport.workingHours))))}%
                </span>
                <span className="desc">Completion vs Hours ratio</span>
              </div>

              <div className="widget-item">
                <span className="lbl">Time Utilized</span>
                <span className="val">{Math.round((selectedReport.workingHours / 8) * 100)}%</span>
                <span className="desc">Total hours: {selectedReport.workingHours} hrs</span>
              </div>
            </div>

            {/* Timings */}
            <div className="reports-meta-block">
              <span className="block-title">Shift Timing & Attendance Logs</span>
              <div className="block-row flex-row justify-between">
                <span>Login timestamp: <strong>{selectedReport.loginTime}</strong></span>
                <span>Logout timestamp: <strong>{selectedReport.logoutTime}</strong></span>
                <span>Overtime hours logged: <strong style={{ color: 'var(--color-success)' }}>{selectedReport.overtimeHours} hrs</strong></span>
              </div>
            </div>

            {/* Accomplishments & Summary boxes */}
            <div className="drawer-content-box">
              <span className="box-title">Daily Work Summary</span>
              <div className="box-text-wrapper">{selectedReport.summary}</div>
            </div>

            <div className="drawer-content-box border-left-success">
              <span className="box-title text-success">Major Achievements & Accomplishments</span>
              <div className="box-text-wrapper">{selectedReport.majorAccomplishments}</div>
            </div>

            {selectedReport.challengesFaced && (
              <div className="drawer-content-box border-left-danger">
                <span className="box-title text-danger">Challenges / Obstacles Logged</span>
                <div className="box-text-wrapper">{selectedReport.challengesFaced}</div>
              </div>
            )}

            {/* Tomorrow expectation planning */}
            <div className="drawer-content-box border-left-info">
              <span className="box-title text-info">Tomorrow Strategy Objectives Planning</span>
              <div className="box-text-wrapper">
                <p>🎯 <strong>Objective planned:</strong> {selectedReport.plannedTasksTomorrow || 'None.'}</p>
                <p>📋 <strong>Expected deliverables:</strong> {selectedReport.expectedDeliverablesTomorrow || 'None.'}</p>
                <p>⚠️ <strong>Priority designation:</strong> <Badge variant="neutral">{selectedReport.priorityTasksTomorrow || 'Medium'}</Badge></p>
              </div>
            </div>

            {/* Attachment files */}
            {selectedReport.attachments && selectedReport.attachments.length > 0 && (
              <div className="drawer-content-box">
                <span className="box-title"><Paperclip size={13} style={{ marginRight: 3 }} /> Work Attachments</span>
                <div className="flex-column gap-2" style={{ marginTop: 6 }}>
                  {selectedReport.attachments.map(file => (
                    <a
                      key={file}
                      href="#"
                      onClick={(e) => { e.preventDefault(); addToast('info', `Simulating download of attached file: ${file}`); }}
                      className="attached-download-link flex-row justify-between padding-2"
                    >
                      <span className="file-name"><FileSpreadsheet size={14} style={{ marginRight: 6, color: 'var(--color-success)' }} /> {file}</span>
                      <span className="download-btn-text">Download file 📥</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Approval History Timeline */}
            <div className="drawer-content-box">
              <span className="box-title">Workflow Approvals Audit History</span>
              <div className="approvals-timeline-wrapper">
                {selectedReport.approvalHistory.map((history, idx) => (
                  <div key={idx} className="timeline-node-item">
                    <div className="node-marker-wrapper">
                      <span className="node-marker-dot" />
                      {idx < selectedReport.approvalHistory.length - 1 && <span className="node-marker-line" />}
                    </div>
                    <div className="node-content-block">
                      <div className="node-header flex-row justify-between">
                        <strong>{history.user} ({history.role})</strong>
                        <span className="node-time-lbl">{history.timestamp.replace('T', ' ').slice(0, 16)}</span>
                      </div>
                      <div className="node-action-text">
                        Action performed: <Badge variant={getStatusBadgeVariant(history.action === 'Submitted' ? 'Submitted' : history.action === 'Approved' ? 'Approved' : 'Changes Requested')}>{history.action}</Badge>
                      </div>
                      {history.comments && <p className="node-comments-text">Remarks: <em>"{history.comments}"</em></p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manager Review inputs */}
            {(userRole !== 'Employee' && currentUserRole !== 'employee') && (
              <div className="drawer-review-inputs-wrapper" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <span className="box-title" style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>Manager Evaluation & Review Details</span>
                
                <div className="form-group-item" style={{ marginTop: 8 }}>
                  <label className="reports-form-lbl">Feedback / Correction Remarks *</label>
                  <textarea
                    className="reports-form-textarea"
                    rows={3}
                    placeholder="Enter review findings, approval comments, or changes requested reasons..."
                    value={evaluationFeedback}
                    onChange={(e) => setEvaluationFeedback(e.target.value)}
                  />
                </div>

                <div className="reports-drawer-action-buttons">
                  <button
                    className="review-action-btn changes-btn"
                    onClick={() => triggerAuditAction('Changes')}
                  >
                    Request Changes
                  </button>
                  <button
                    className="review-action-btn escalate-btn"
                    onClick={() => triggerAuditAction('Escalate')}
                  >
                    Escalate
                  </button>
                  <button
                    className="review-action-btn reject-btn"
                    onClick={() => triggerAuditAction('Reject')}
                  >
                    Reject
                  </button>
                  <button
                    className="review-action-btn approve-btn"
                    onClick={() => triggerAuditAction('Approve')}
                  >
                    Approve Daily Report
                  </button>
                </div>
              </div>
            )}

          </div>
        </SlideOver>
      )}

    </div>
  );
};

export default WorkReports;
