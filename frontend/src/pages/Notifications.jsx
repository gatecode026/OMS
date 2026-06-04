import React, { useState, useMemo } from 'react';
import './Notifications.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Bell,
  Megaphone,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  MessageSquare,
  Users,
  TrendingUp,
  Eye,
  EyeOff,
  Send,
  Calendar,
  Filter,
  Search,
  Download,
  FileText,
  PieChart,
  BarChart3,
  Activity,
  Zap,
  Settings,
  Plus,
  Play,
  Pause,
  Repeat,
  Flag,
  Star,
  Inbox,
  Archive,
  Trash2,
  Edit,
  Copy,
  RefreshCw,
  Check,
  X,
  FileDown,
  MinusCircle,
  PlusCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie as RePie,
  Cell
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#d946ef'];

const Notifications = () => {
  const isLoading = usePageLoading(600);
  const { currentUserRole, showConfirm } = useApp();

  // Selected Month/Year
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');

  // Role Perspective override (defaults to currentUserRole, but can be switched)
  const [perspective, setPerspective] = useState(currentUserRole || 'super_admin');

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // --- Search & Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Selected Notification for Detail drawer/view
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Create Notification Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    message: '',
    category: 'Company',
    priority: 'Normal',
    recipientType: 'All Employees',
    channels: { email: true, push: true, sms: false },
    schedule: 'Immediate',
    scheduleDate: ''
  });

  // Template modal and edit states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'Company',
    content: ''
  });

  // Selected notifications for bulk actions
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Toast notification state inside page
  const [pageToasts, setPageToasts] = useState([]);
  const addPageToast = (type, message) => {
    const id = Date.now();
    setPageToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setPageToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Helper formatter for count numbers
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  // --- Seed Data inside state for full interactivity ---
  const [notifications, setNotifications] = useState([
    { id: 'NTF-001', title: 'Q2 Performance Appraisals Initiated', message: 'Annual performance evaluations for the second quarter are officially open. All managers must finalize feedback submissions.', category: 'HR', priority: 'High', recipientType: 'All Managers', sentBy: 'HR Manager', sentDate: '2026-06-02', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '2 hours ago', recipients: 45, delivered: 45, read: 42, failed: 0 },
    { id: 'NTF-002', title: 'Production DB Offline Maintenance Warning', message: 'The primary PostgreSQL cluster will go offline for version upgrades on June 6th at 12:00 AM IST.', category: 'Emergency', priority: 'Critical', recipientType: 'Engineering Dept', sentBy: 'DevOps Lead', sentDate: '2026-06-03', deliveryStatus: 'Scheduled', readStatus: 'Unread', readTime: '—', recipients: 120, delivered: 0, read: 0, failed: 0 },
    { id: 'NTF-003', title: 'SaaS Platform v3.0 Scope Finalization', message: 'The product specifications for the v3.0 releases have been approved. All stakeholders must sign off by end of day.', category: 'Project', priority: 'Medium', recipientType: 'Product Team', sentBy: 'Product Director', sentDate: '2026-06-01', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '1 day ago', recipients: 18, delivered: 18, read: 18, failed: 0 },
    { id: 'NTF-004', title: 'Jaipur Office Reopening & Hybrid Schedule', message: 'The physical workspace renovation is complete. Jaipur staff is expected to report in-office Tuesdays and Thursdays.', category: 'Company', priority: 'Normal', recipientType: 'Jaipur Branch', sentBy: 'Ops Manager', sentDate: '2026-05-28', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '3 days ago', recipients: 88, delivered: 86, read: 75, failed: 2 },
    { id: 'NTF-005', title: 'Annual Healthcare Policy Renewal Update', message: 'Insurance cards have been updated for all enrolled employees. Please download the new health cards from your profile.', category: 'HR', priority: 'Normal', recipientType: 'All Employees', sentBy: 'Benefits Specialist', sentDate: '2026-05-25', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '5 days ago', recipients: 320, delivered: 318, read: 290, failed: 2 },
    { id: 'NTF-006', title: 'Critical Bug Alert in Client Payment Gateway', message: 'Stripe webhook exceptions detected in production. Payouts for June 3rd are temporarily suspended.', category: 'Emergency', priority: 'Critical', recipientType: 'Billing & QA', sentBy: 'CTO Office', sentDate: '2026-06-04', deliveryStatus: 'Delivered', readStatus: 'Unread', readTime: '—', recipients: 12, delivered: 10, read: 8, failed: 2 },
    { id: 'NTF-007', title: 'Summer Hackathon 2026 Registrations Open', message: 'Form your teams and submit pitches for the annual summer hackathon. Grand prize includes ₹5,00,000 cash rewards.', category: 'Event', priority: 'Normal', recipientType: 'All Employees', sentBy: 'Culture Committee', sentDate: '2026-06-01', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '2 days ago', recipients: 320, delivered: 320, read: 145, failed: 0 },
    { id: 'NTF-008', title: 'Mandatory ISO Security Compliance Audit', message: 'All employees must finish the cybersecurity awareness test. Access credentials will be restricted after June 15th.', category: 'Emergency', priority: 'Critical', recipientType: 'All Employees', sentBy: 'IT Compliance', sentDate: '2026-06-03', deliveryStatus: 'Delivered', readStatus: 'Unread', readTime: '—', recipients: 320, delivered: 319, read: 205, failed: 1 },
    { id: 'NTF-009', title: 'Client Meeting: AWS Cloud Strategy Review', message: 'AWS representatives will present cloud optimization options tomorrow at 3:00 PM in Conference Room A.', category: 'Project', priority: 'Medium', recipientType: 'Infrastructure Lead', sentBy: 'Rahul Sharma', sentDate: '2026-06-03', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '5 hours ago', recipients: 5, delivered: 5, read: 5, failed: 0 },
    { id: 'NTF-010', title: 'Bonus Distribution Schedule Confirmation', message: 'Q2 Performance Incentives have been disbursed to accounts. Summary slips are available in the Payroll section.', category: 'HR', priority: 'High', recipientType: 'All Employees', sentBy: 'Finance Ops', sentDate: '2026-05-30', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '4 days ago', recipients: 320, delivered: 317, read: 310, failed: 3 },
    { id: 'NTF-011', title: 'Marketing Creative Assets Upload Complete', message: 'New brand assets and templates for H2 campaign collateral are uploaded in the Shared Drive repository.', category: 'Project', priority: 'Normal', recipientType: 'Marketing Team', sentBy: 'Creative Lead', sentDate: '2026-05-27', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '6 days ago', recipients: 15, delivered: 15, read: 12, failed: 0 },
    { id: 'NTF-012', title: 'System Downtime Postponed Notice', message: 'The database server migration scheduled for June 6th is postponed to June 13th due to release delays.', category: 'Emergency', priority: 'High', recipientType: 'Engineering Dept', sentBy: 'DevOps Lead', sentDate: '2026-06-04', deliveryStatus: 'Delivered', readStatus: 'Unread', readTime: '—', recipients: 120, delivered: 120, read: 95, failed: 0 },
    { id: 'NTF-013', title: 'Employee Engagement Survey Q2 Deadline', message: 'Only 40% of the team members have filled the engagement survey. Please share your honest feedback by tomorrow.', category: 'HR', priority: 'Medium', recipientType: 'All Employees', sentBy: 'HR Specialist', sentDate: '2026-06-02', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '1 day ago', recipients: 320, delivered: 319, read: 120, failed: 1 },
    { id: 'NTF-014', title: 'Office Safety Mock Drill Scheduled', message: 'A mandatory fire evacuation and safety mock drill will run tomorrow between 11:30 AM and 12:00 PM IST.', category: 'Company', priority: 'Normal', recipientType: 'Head Office Staff', sentBy: 'Facility Mgr', sentDate: '2026-06-03', deliveryStatus: 'Delivered', readStatus: 'Read', readTime: '16 hours ago', recipients: 140, delivered: 140, read: 132, failed: 0 },
    { id: 'NTF-015', title: 'Failed SMS API Webhook Payout Failures', message: 'Failed SMS delivery alerts for customer alerts. Integrations must re-authenticate the Nexmo API keys.', category: 'Emergency', priority: 'Critical', recipientType: 'Integrations Team', sentBy: 'System Monitor', sentDate: '2026-06-04', deliveryStatus: 'Failed', readStatus: 'Unread', readTime: '—', recipients: 8, delivered: 0, read: 0, failed: 8 }
  ]);

  // Automation Rules
  const [automationRules, setAutomationRules] = useState([
    {
      id: 'CAT-SYS',
      category: 'System Events',
      rules: [
        { id: 'SYS-01', trigger: 'Database CPU Threshold > 90%', channel: 'Email + Push', enabled: true },
        { id: 'SYS-02', trigger: 'Failed API Integrations Warning', channel: 'SMS + Dashboard', enabled: true },
        { id: 'SYS-03', trigger: 'Server Deployment Complete', channel: 'Slack webhook', enabled: false }
      ]
    },
    {
      id: 'CAT-HR',
      category: 'HR Alerts',
      rules: [
        { id: 'HR-01', trigger: 'New Employee Profile Created', channel: 'Email Onboarding', enabled: true },
        { id: 'HR-02', trigger: 'Leave Request Status Update', channel: 'Push Notification', enabled: true },
        { id: 'HR-03', trigger: 'Performance Appraisal Opened', channel: 'Dashboard Toast', enabled: true }
      ]
    },
    {
      id: 'CAT-PERF',
      category: 'Performance Notifications',
      rules: [
        { id: 'PRF-01', trigger: 'Daily Task Overdue Report', channel: 'Email to Lead', enabled: true },
        { id: 'PRF-02', trigger: 'KPI Metrics Quarterly Publish', channel: 'Dashboard Alert', enabled: false },
        { id: 'PRF-03', trigger: 'Activity Log Security Exception', channel: 'SMS Alert', enabled: true }
      ]
    },
    {
      id: 'CAT-PRJ',
      category: 'Project Actions',
      rules: [
        { id: 'PRJ-01', trigger: 'New Project Assignment', channel: 'Email + Push', enabled: true },
        { id: 'PRJ-02', trigger: 'Project Budget Threshold > 95%', channel: 'SMS to Lead', enabled: true },
        { id: 'PRJ-03', trigger: 'Milestone Review Submitted', channel: 'Slack alert', enabled: false }
      ]
    }
  ]);

  // Notification Templates
  const [templates, setTemplates] = useState([
    { id: 'TMP-001', name: 'Critical Maintenance Alert', category: 'Emergency', content: 'URGENT: The {system_name} will undergo emergency maintenance on {date} at {time}. Downtime expected: {duration}. Please save your work.', usageCount: 48 },
    { id: 'TMP-002', name: 'Leave Application Status', category: 'HR', content: 'Hello {employee_name}, your leave request for {date_range} has been {status} by {approved_by}. Log in to view comments.', usageCount: 1540 },
    { id: 'TMP-003', name: 'Project Assignment Notice', category: 'Project', content: 'You have been assigned to the project "{project_name}" as a {role}. Kickoff meeting is scheduled on {date}.', usageCount: 382 },
    { id: 'TMP-004', name: 'Virtual Event Invitation', category: 'Event', content: 'Join us for {event_title} on {date} at {time}. Keynotes by {speakers}. Slido code for questions: #{code}.', usageCount: 92 },
    { id: 'TMP-005', name: 'ISO Auditing Test Deadline', category: 'Emergency', content: 'REMINDER: The ISO Compliance Test deadline is {date}. Failure to complete will lead to temporarily restricted logins.', usageCount: 14 }
  ]);

  // Settings channel preferences
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
    slackEnabled: false,
    retryFailed: true,
    rateLimiting: '10 / min',
    retentionDays: 90
  });

  // Audited Logs
  const [logs, setLogs] = useState([
    { id: 'LOG-001', timestamp: '2026-06-04 15:10', trigger: 'Manual Create Notification', recipient: 'All Employees', channel: 'Email + SMS', status: 'Success', response: 'SMTP OK, Nexmo Gateway Deliver' },
    { id: 'LOG-002', timestamp: '2026-06-04 14:05', trigger: 'Database CPU Warning Rule', recipient: 'Sysadmin Group', channel: 'Push + Email', status: 'Success', response: 'GCM OK, SMTP OK' },
    { id: 'LOG-003', timestamp: '2026-06-04 12:30', trigger: 'Task Overdue Alert Rule', recipient: 'Rahul Sharma', channel: 'Email', status: 'Success', response: 'SMTP OK' },
    { id: 'LOG-004', timestamp: '2026-06-04 09:15', trigger: 'Nexmo API Authentication Sync', recipient: 'Integrations Team', channel: 'SMS', status: 'Failed', response: 'HTTP 401 Unauthorized API Key' }
  ]);

  // Computed / Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      // Search text filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          notif.id.toLowerCase().includes(q) ||
          notif.title.toLowerCase().includes(q) ||
          notif.message.toLowerCase().includes(q) ||
          notif.recipientType.toLowerCase().includes(q) ||
          notif.sentBy.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Dropdown filters
      if (filterCategory && notif.category !== filterCategory) return false;
      if (filterPriority && notif.priority !== filterPriority) return false;
      if (filterStatus && notif.deliveryStatus !== filterStatus) return false;

      return true;
    });
  }, [notifications, searchQuery, filterCategory, filterPriority, filterStatus]);

  // Toggle Automation Rules
  const handleToggleRule = (catId, ruleId) => {
    setAutomationRules(prev => prev.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          rules: cat.rules.map(rule => rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule)
        };
      }
      return cat;
    }));
    addPageToast('info', 'Automation trigger rule status updated.');
  };

  // Bulk Actions
  const handleBulkMarkRead = () => {
    if (selectedRowIds.length === 0) {
      addPageToast('warning', 'No notifications selected.');
      return;
    }
    setNotifications(prev => prev.map(n => selectedRowIds.includes(n.id) ? { ...n, readStatus: 'Read', readTime: 'Just now' } : n));
    addPageToast('success', `Marked ${selectedRowIds.length} notifications as read.`);
    setSelectedRowIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) {
      addPageToast('warning', 'No notifications selected.');
      return;
    }
    showConfirm(
      `Delete ${selectedRowIds.length} Notifications?`,
      'Are you sure you want to permanently delete the selected dispatch logs?',
      () => {
        setNotifications(prev => prev.filter(n => !selectedRowIds.includes(n.id)));
        addPageToast('danger', `Permanently deleted ${selectedRowIds.length} records.`);
        setSelectedRowIds([]);
      },
      'danger'
    );
  };

  const handleBulkResend = () => {
    if (selectedRowIds.length === 0) {
      addPageToast('warning', 'No notifications selected.');
      return;
    }
    setNotifications(prev => prev.map(n => {
      if (selectedRowIds.includes(n.id) && n.deliveryStatus === 'Failed') {
        return { ...n, deliveryStatus: 'Delivered', delivered: n.delivered + n.failed, failed: 0 };
      }
      return n;
    }));
    addPageToast('success', `Initiated resend job for failed channels.`);
    setSelectedRowIds([]);
  };

  // Submit Create form
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) {
      addPageToast('warning', 'Title and Message are required.');
      return;
    }

    const newId = `NTF-${String(notifications.length + 1).padStart(3, '0')}`;
    const newNotif = {
      id: newId,
      title: createForm.title,
      message: createForm.message,
      category: createForm.category,
      priority: createForm.priority,
      recipientType: createForm.recipientType,
      sentBy: perspective === 'super_admin' ? 'Super Admin' : 'Branch Admin',
      sentDate: new Date().toISOString().split('T')[0],
      deliveryStatus: createForm.schedule === 'Immediate' ? 'Delivered' : 'Scheduled',
      readStatus: 'Unread',
      readTime: '—',
      recipients: 320,
      delivered: createForm.schedule === 'Immediate' ? 320 : 0,
      read: 0,
      failed: 0
    };

    setNotifications(prev => [newNotif, ...prev]);
    addPageToast('success', `Notification "${createForm.title}" dispatched successfully.`);
    setShowCreateModal(false);

    // Reset Form
    setCreateForm({
      title: '',
      message: '',
      category: 'Company',
      priority: 'Normal',
      recipientType: 'All Employees',
      channels: { email: true, push: true, sms: false },
      schedule: 'Immediate',
      scheduleDate: ''
    });
  };

  // Handle Template Actions
  const handleTemplateSubmit = (e) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      addPageToast('warning', 'Template Name and Content are required.');
      return;
    }

    if (editingTemplate) {
      setTemplates(prev => prev.map(tmpl => 
        tmpl.id === editingTemplate.id 
          ? { ...tmpl, name: templateForm.name, category: templateForm.category, content: templateForm.content }
          : tmpl
      ));
      addPageToast('success', `Template "${templateForm.name}" updated successfully.`);
    } else {
      const maxId = templates.reduce((max, t) => {
        const num = parseInt(t.id.replace('TMP-', ''), 10);
        return num > max ? num : max;
      }, 0);
      const newId = `TMP-${String(maxId + 1).padStart(3, '0')}`;
      const newTmpl = {
        id: newId,
        name: templateForm.name,
        category: templateForm.category,
        content: templateForm.content,
        usageCount: 0
      };
      setTemplates(prev => [...prev, newTmpl]);
      addPageToast('success', `Template "${templateForm.name}" created successfully.`);
    }

    setShowTemplateModal(false);
    setTemplateForm({ name: '', category: 'Company', content: '' });
    setEditingTemplate(null);
  };

  const handleEditTemplate = (tmpl) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      name: tmpl.name,
      category: tmpl.category,
      content: tmpl.content
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = (tmplId) => {
    showConfirm(
      'Delete Template?',
      'Are you sure you want to permanently delete this message template?',
      () => {
        setTemplates(prev => prev.filter(t => t.id !== tmplId));
        addPageToast('danger', 'Template deleted.');
      },
      'danger'
    );
  };

  // Action column triggers
  const handleViewDetails = (notif) => {
    setSelectedNotif(notif);
    setShowDetailModal(true);
  };

  const handleToggleReadStatus = (notifId) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === notifId) {
        const isRead = n.readStatus === 'Read';
        return {
          ...n,
          readStatus: isRead ? 'Unread' : 'Read',
          readTime: isRead ? '—' : 'Just now'
        };
      }
      return n;
    }));
    addPageToast('info', 'Notification read status updated.');
  };

  const handleResendSingle = (notifId) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === notifId) {
        return {
          ...n,
          deliveryStatus: 'Delivered',
          delivered: n.recipients,
          failed: 0
        };
      }
      return n;
    }));
    addPageToast('success', `Redelivered logs via notification channels.`);
  };

  const handleDeleteSingle = (notifId) => {
    showConfirm(
      'Delete Log Record?',
      'This will clear this notification log from the database indices.',
      () => {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
        addPageToast('danger', 'Notification log deleted.');
      },
      'danger'
    );
  };

  // Export report trigger
  const handleExportData = () => {
    addPageToast('info', 'Generating notification delivery audit report...');
    setTimeout(() => {
      addPageToast('success', 'Notification_Audit_June_2026.pdf successfully downloaded.');
    }, 1200);
  };

  // --- Recharts Mock Analytics Data ---
  const trendsData = [
    { name: 'Jan', sent: 85000, delivered: 84800, failed: 200 },
    { name: 'Feb', sent: 92000, delivered: 91700, failed: 300 },
    { name: 'Mar', sent: 110000, delivered: 109400, failed: 600 },
    { name: 'Apr', sent: 105000, delivered: 104500, failed: 500 },
    { name: 'May', sent: 121000, delivered: 120200, failed: 800 },
    { name: 'Jun', sent: 125480, delivered: 124210, failed: 1270 }
  ];

  const deptData = [
    { name: 'Engineering', count: 480 },
    { name: 'Marketing', count: 320 },
    { name: 'HR', count: 240 },
    { name: 'Sales', count: 180 },
    { name: 'Operations', count: 150 }
  ];

  const branchData = [
    { name: 'Head Office', count: 720 },
    { name: 'Delhi Branch', count: 310 },
    { name: 'Mumbai Agency', count: 180 },
    { name: 'Jaipur Office', count: 120 }
  ];

  const pieStatusData = [
    { name: 'Delivered', value: 124210, fill: '#10b981' },
    { name: 'Failed', value: 1228, fill: '#ef4444' },
    { name: 'Scheduled', value: 42, fill: '#3b82f6' }
  ];

  // Gauge data showing 99.2% rate
  const gaugeData = [
    { name: 'Success Rate', value: 99.2, fill: '#10b981' },
    { name: 'Failure Margin', value: 0.8, fill: '#ef4444' }
  ];

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Critical': return '#ef4444';
      case 'High': return '#f59e0b';
      case 'Medium': return '#3b82f6';
      default: return '#10b981';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Critical': return 'badge-danger';
      case 'High': return 'badge-warning';
      case 'Medium': return 'badge-info';
      default: return 'badge-success';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Delivered': return 'badge-success';
      case 'Pending': return 'badge-warning';
      case 'Scheduled': return 'badge-info';
      case 'Failed': return 'badge-danger';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="notifications-page">
        <div className="notifications-stats-row mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="notifications-stat-card" style={{ height: 120 }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="card p-6" style={{ height: 400 }}>
          <Skeleton variant="rect" height="100%" />
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page animate-fade-in">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="notifications-page-header flex-between mb-6">
        <div>
          <div className="flex-center gap-2">
            <h2 className="title-bold" style={{ margin: 0 }}>Notification Dispatch Center</h2>
            <Badge variant="primary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>v2.4 Enterprise</Badge>
          </div>
          <p className="subtitle" style={{ marginTop: 4 }}>Monitor, trigger, and configure communication logs, automated workflows, templates & delivery metrics</p>
        </div>

        <div className="flex-center gap-3">
          <div className="perspective-container flex-center gap-1">
            <span className="text-muted text-xs font-semibold uppercase">Perspective:</span>
            <select
              value={perspective}
              onChange={(e) => setPerspective(e.target.value)}
              className="perspective-select"
            >
              <option value="super_admin">Super Admin</option>
              <option value="branch_admin">Branch Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="team_leader">Team Leader</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="notifications-selector"
          >
            <option value="January">January</option>
            <option value="February">February</option>
            <option value="March">March</option>
            <option value="April">April</option>
            <option value="May">May</option>
            <option value="June">June</option>
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="notifications-selector"
            style={{ minWidth: '90px' }}
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
      </div>

      {/* ==================== TAB NAVIGATION ==================== */}
      <div className="tab-bar-card card p-1 mb-6">
        <div className="notifications-tabs-list">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><Activity size={16} /> Dashboard</button>
          <button className={`tab-btn ${activeTab === 'all-notifications' ? 'active' : ''}`} onClick={() => setActiveTab('all-notifications')}><Inbox size={16} /> Notification Logs</button>
          <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><BarChart3 size={16} /> Analytics</button>
          <button className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}><Copy size={16} /> Templates</button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={16} /> Preference Settings</button>
          <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}><FileText size={16} /> System Logs</button>
        </div>
      </div>

      {/* ==================== TAB CONTENT: DASHBOARD ==================== */}
      {activeTab === 'dashboard' && (
        <div className="flex-column gap-6">
          {/* Stats Cards Row */}
          <div className="notifications-stats-row">
            <div className="notifications-stat-card border-bottom-primary" onClick={() => setActiveTab('all-notifications')}>
              <div className="stat-card-header flex-center justify-between">
                <span className="stat-label">Total Dispatch Logs</span>
                <Badge variant="primary">Month</Badge>
              </div>
              <div className="stat-num">{formatNumber(125480)}</div>
              <div className="stat-trend trend-green text-xs"><TrendingUp size={12} style={{ marginRight: 4 }} /> +12.4% vs May</div>
            </div>

            <div className="notifications-stat-card border-bottom-info" onClick={() => setActiveTab('settings')}>
              <div className="stat-card-header flex-center justify-between">
                <span className="stat-label">Automated Trigger Rules</span>
                <Badge variant="info">Active</Badge>
              </div>
              <div className="stat-num">24</div>
              <div className="stat-trend trend-blue text-xs"><Zap size={12} style={{ marginRight: 4 }} /> 8 Rules Configured</div>
            </div>

            <div className="notifications-stat-card border-bottom-success" onClick={() => setActiveTab('all-notifications')}>
              <div className="stat-card-header flex-center justify-between">
                <span className="stat-label">Dispatched Today</span>
                <Badge variant="success">Realtime</Badge>
              </div>
              <div className="stat-num">{formatNumber(1285)}</div>
              <div className="stat-trend trend-green text-xs"><CheckCircle size={12} style={{ marginRight: 4 }} /> 100% gateway uptime</div>
            </div>

            <div className="notifications-stat-card border-bottom-warning" onClick={() => { setActiveTab('all-notifications'); setFilterStatus('Pending'); }}>
              <div className="stat-card-header flex-center justify-between">
                <span className="stat-label">Pending / Queued</span>
                <Badge variant="warning">Scheduler</Badge>
              </div>
              <div className="stat-num">42</div>
              <div className="stat-trend text-muted text-xs">Awaiting cron cycle</div>
            </div>
          </div>

          <div className="notifications-stats-row">
            <div className="notifications-stat-card border-bottom-success" onClick={() => { setActiveTab('all-notifications'); setFilterStatus('Delivered'); }}>
              <div className="stat-card-header flex-center justify-between">
                <span className="stat-label">Delivered Dispatches</span>
                <Badge variant="success">99.2%</Badge>
              </div>
              <div className="stat-num">{formatNumber(124210)}</div>
              <div className="stat-trend trend-green text-xs">Gateway confirmed delivery</div>
            </div>

            <div className="notifications-stat-card border-bottom-primary">
              <div className="stat-card-header flex-center justify-between">
                <span className="stat-label">Read / Acknowledged</span>
                <Badge variant="primary">Audited</Badge>
              </div>
              <div className="stat-num">{formatNumber(118450)}</div>
              <div className="stat-trend trend-green text-xs">95.3% engagement rate</div>
            </div>

            <div className="notifications-stat-card border-bottom-warning">
              <div className="stat-card-header flex-center justify-between">
                <span className="stat-label">Unread Notifications</span>
                <Badge variant="warning">Inbox</Badge>
              </div>
              <div className="stat-num">{formatNumber(5760)}</div>
              <div className="stat-trend text-muted text-xs">Pending reader session</div>
            </div>

            <div className="notifications-stat-card border-bottom-success" onClick={() => setActiveTab('analytics')}>
              <div className="stat-card-header flex-center justify-between">
                <span className="stat-label">Delivery Success Rate</span>
                <Badge variant="success">KPI</Badge>
              </div>
              <div className="stat-num">99.2%</div>
              <div className="stat-trend trend-green text-xs">+0.1% optimization gains</div>
            </div>
          </div>

          {/* Quick actions & today's summary */}
          <div className="grid-2-col gap-6">
            {/* Automation Rules Swapper */}
            <div className="card p-5">
              <div className="flex-center justify-between border-bottom pb-3 mb-4">
                <div>
                  <h3 className="card-sec-title flex-center gap-2" style={{ margin: 0 }}><Zap size={18} className="text-primary" /> Live Rules Routing Engine</h3>
                  <p className="subtitle" style={{ marginTop: 2 }}>Toggle event triggers to instantly dispatch channels based on system actions</p>
                </div>
                {perspective === 'super_admin' && (
                  <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowCreateModal(true)}>New Notification</Button>
                )}
              </div>

              <div className="automation-rules-grid">
                {automationRules.map(cat => (
                  <div key={cat.id} className="rule-category-card">
                    <div className="rule-category-header">
                      <span className="rule-category-title">{cat.category}</span>
                      <Badge variant="info" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>{cat.rules.length} Triggers</Badge>
                    </div>
                    <div className="rule-items-container">
                      {cat.rules.map(rule => (
                        <div key={rule.id} className={`rule-item-card ${!rule.enabled ? 'disabled' : ''}`}>
                          <div className="rule-info-col">
                            <span className={`rule-status-dot ${rule.enabled ? 'active' : ''}`}></span>
                            <div className="rule-text-wrap">
                              <span className="rule-trigger-txt">{rule.trigger}</span>
                              <span className="rule-route-txt">
                                <Mail size={11} /> Route: {rule.channel}
                              </span>
                            </div>
                          </div>
                          <label className="switch-control">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              disabled={perspective === 'employee'}
                              onChange={() => handleToggleRule(cat.id, rule.id)}
                            />
                            <span className="switch-slider"></span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Notification Feed */}
            <div className="card p-5">
              <div className="flex-center justify-between border-bottom pb-3 mb-4">
                <div>
                  <h3 className="card-sec-title flex-center gap-2" style={{ margin: 0 }}><Bell size={18} className="text-primary" /> Today's Live Dispatch Feed</h3>
                  <p className="subtitle" style={{ marginTop: 2 }}>Real-time audit log of communications sent on June 4, 2026</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => addPageToast('success', 'Feed records refreshed in realtime.')}></Button>
                  <Button variant="secondary" size="sm" icon={FileDown} onClick={handleExportData}>Audit Report</Button>
                </div>
              </div>

              <div className="today-feed-list">
                {notifications.slice(0, 5).map((feed, idx) => (
                  <div key={feed.id} className={`feed-item border-left-${feed.priority.toLowerCase()}`} onClick={() => handleViewDetails(feed)}>
                    <div className="feed-avatar" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                      {feed.category[0]}
                    </div>
                    <div className="feed-content">
                      <div className="flex-center justify-between">
                        <strong className="feed-title">{feed.title}</strong>
                        <Badge variant={feed.deliveryStatus === 'Delivered' ? 'success' : 'danger'} style={{ fontSize: '0.68rem' }}>{feed.deliveryStatus}</Badge>
                      </div>
                      <p className="feed-msg">{feed.message}</p>
                      <div className="feed-meta">
                        <span className="flex-center gap-1"><Clock size={11} /> {feed.sentDate}</span>
                        <span>•</span>
                        <span>Priority: <span style={{ color: getPriorityStyle(feed.priority), fontWeight: 700 }}>{feed.priority}</span></span>
                        <span>•</span>
                        <span>Recipients: <strong>{feed.recipients}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: LOGS DATABASE ==================== */}
      {activeTab === 'all-notifications' && (
        <div className="flex-column gap-6 animate-fade-in">
          {/* Filters card */}
          <div className="card p-4">
            <div className="flex-between flex-wrap gap-4">
              <div className="flex-row gap-3 flex-wrap align-center">
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="table-search-input"
                    style={{ paddingLeft: '32px', minWidth: '220px' }}
                    placeholder="Search ID, title, message..."
                  />
                </div>

                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="table-filter-select">
                  <option value="">All Categories</option>
                  <option value="Company">Company</option>
                  <option value="HR">HR</option>
                  <option value="Project">Project</option>
                  <option value="Event">Event</option>
                  <option value="Emergency">Emergency</option>
                </select>

                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="table-filter-select">
                  <option value="">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Normal">Normal</option>
                </select>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="table-filter-select">
                  <option value="">All Statuses</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Pending">Pending</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Failed">Failed</option>
                </select>

                {(filterCategory || filterPriority || filterStatus || searchQuery) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFilterCategory('');
                      setFilterPriority('');
                      setFilterStatus('');
                      setSearchQuery('');
                      addPageToast('info', 'Filters reset successfully.');
                    }}
                  >
                    Reset Filters
                  </Button>
                )}
              </div>

              <div className="flex-row gap-2 align-center">
                {selectedRowIds.length > 0 && (
                  <div className="flex-center gap-2 animate-fade-in" style={{ background: 'var(--color-primary-light)', padding: '4px 10px', borderRadius: '6px', marginRight: 10 }}>
                    <span className="text-xs font-semibold text-primary">{selectedRowIds.length} Selected</span>
                    <Button variant="secondary" size="xs" onClick={handleBulkMarkRead}>Mark Read</Button>
                    <Button variant="secondary" size="xs" onClick={handleBulkResend}>Resend</Button>
                    <Button variant="secondary" size="xs" onClick={handleBulkDelete} style={{ color: 'var(--color-danger)' }}>Delete</Button>
                  </div>
                )}

                {perspective === 'super_admin' && (
                  <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowCreateModal(true)}>New Notification</Button>
                )}
                <Button variant="secondary" size="sm" icon={FileDown} onClick={handleExportData}>Export CSV</Button>
              </div>
            </div>
          </div>

          {/* Database Table */}
          <div className="card table-wrapper-card p-0">
            <DataTable
              columns={[
                {
                  header: (
                    <input
                      type="checkbox"
                      checked={filteredNotifications.length > 0 && selectedRowIds.length === filteredNotifications.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRowIds(filteredNotifications.map(n => n.id));
                        } else {
                          setSelectedRowIds([]);
                        }
                      }}
                    />
                  ),
                  cell: (row) => (
                    <input
                      type="checkbox"
                      checked={selectedRowIds.includes(row.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRowIds(prev => [...prev, row.id]);
                        } else {
                          setSelectedRowIds(prev => prev.filter(id => id !== row.id));
                        }
                      }}
                    />
                  )
                },
                { header: 'ID', accessor: 'id', cell: (row) => <strong className="font-semibold text-primary">{row.id}</strong> },
                {
                  header: 'Title & Message',
                  accessor: 'title',
                  cell: (row) => (
                    <div style={{ maxWidth: '350px' }}>
                      <strong className="text-primary block text-sm" style={{ cursor: 'pointer' }} onClick={() => handleViewDetails(row)}>{row.title}</strong>
                      <p className="text-muted text-xs truncate" style={{ margin: '2px 0 0 0' }}>{row.message}</p>
                    </div>
                  )
                },
                { header: 'Category', accessor: 'category', cell: (row) => <Badge variant="neutral">{row.category}</Badge> },
                {
                  header: 'Priority',
                  accessor: 'priority',
                  cell: (row) => (
                    <Badge variant={getPriorityBadgeClass(row.priority)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="color-dot" style={{ backgroundColor: getPriorityStyle(row.priority) }}></span>
                      {row.priority}
                    </Badge>
                  )
                },
                { header: 'Recipients', accessor: 'recipientType', cell: (row) => <div className="text-xs font-medium text-secondary">{row.recipientType} ({row.recipients})</div> },
                { header: 'Sent By', accessor: 'sentBy' },
                { header: 'Sent Date', accessor: 'sentDate' },
                { header: 'Delivery Status', accessor: 'deliveryStatus', cell: (row) => <Badge variant={getStatusBadgeClass(row.deliveryStatus)}>{row.deliveryStatus}</Badge> },
                { header: 'Read Status', accessor: 'readStatus', cell: (row) => <Badge variant={row.readStatus === 'Read' ? 'success' : 'warning'}>{row.readStatus}</Badge> },
                {
                  header: 'Actions',
                  cell: (row) => (
                    <div className="flex-center gap-2">
                      <button className="action-circle-btn" onClick={() => handleViewDetails(row)} title="View Detail Audit"><Eye size={13} /></button>
                      <button className="action-circle-btn" onClick={() => handleToggleReadStatus(row.id)} title="Toggle Read/Unread">{row.readStatus === 'Read' ? <EyeOff size={13} /> : <Check size={13} />}</button>
                      {row.deliveryStatus === 'Failed' && (
                        <button className="action-circle-btn" onClick={() => handleResendSingle(row.id)} title="Retry Failures"><RefreshCw size={13} /></button>
                      )}
                      {perspective === 'super_admin' && (
                        <button className="action-circle-btn danger-btn" onClick={() => handleDeleteSingle(row.id)} title="Delete dispatch"><Trash2 size={13} /></button>
                      )}
                    </div>
                  )
                }
              ]}
              data={filteredNotifications}
            />
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: ANALYTICS ==================== */}
      {activeTab === 'analytics' && (
        <div className="flex-column gap-6 animate-fade-in">
          <div className="grid-4-col gap-5">
            {/* Delivery Rate Gauge */}
            <div className="card p-5 flex-column align-center text-center">
              <h4 className="chart-title">Overall Delivery rate KPI</h4>
              <div style={{ width: '100%', height: 140 }}>
                <ResponsiveContainer>
                  <RePieChart>
                    <RePie
                      data={gaugeData}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {gaugeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </RePie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '-20px' }}>99.2%</strong>
              <span className="text-muted text-xs">Gateway Response Confirmed</span>
            </div>

            {/* Status Distribution Pie Chart */}
            <div className="card p-5 flex-column align-center text-center">
              <h4 className="chart-title">Delivery Status Distribution</h4>
              <div style={{ width: '100%', height: 140 }}>
                <ResponsiveContainer>
                  <RePieChart>
                    <RePie
                      data={pieStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </RePie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-2 justify-center flex-wrap" style={{ fontSize: '0.75rem', marginTop: 10 }}>
                {pieStatusData.map(d => (
                  <span key={d.name} className="flex-center gap-1"><span className="color-dot" style={{ backgroundColor: d.fill }}></span> {d.name}</span>
                ))}
              </div>
            </div>

            {/* Department bar chart */}
            <div className="card p-5 flex-column">
              <h4 className="chart-title">Volume by Department</h4>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={deptData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Branch Volume Bar Chart */}
            <div className="card p-5 flex-column">
              <h4 className="chart-title">Volume by Branch Location</h4>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={branchData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Trends Line Chart */}
          <div className="card p-5">
            <h4 className="chart-title">Monthly Dispatch Trends & Success margins (2026)</h4>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <Legend />
                  <Line type="monotone" name="Total Dispatched" dataKey="sent" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Successful Delivery" dataKey="delivered" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" name="Failures" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: TEMPLATES ==================== */}
      {activeTab === 'templates' && (
        <div className="flex-column gap-6 animate-fade-in">
          <div className="flex-center justify-between">
            <div>
              <h3 className="card-sec-title" style={{ margin: 0 }}>Message Template Manager</h3>
              <p className="subtitle" style={{ marginTop: 2 }}>Pre-compiled boilerplate messages for emergencies, transactional processes, and HR workflows</p>
            </div>
            {perspective === 'super_admin' && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', category: 'Company', content: '' }); setShowTemplateModal(true); }}>New Template</Button>
            )}
          </div>

          <div className="templates-grid">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="template-card">
                <div className="template-header">
                  <Badge variant="neutral">{tmpl.category}</Badge>
                  <span className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>{tmpl.id}</span>
                </div>
                <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>{tmpl.name}</strong>
                <div className="template-body">
                  {tmpl.content}
                </div>
                <div className="template-footer">
                  <span>Usage: <strong>{tmpl.usageCount} dispatches</strong></span>
                  <div className="flex gap-1">
                    <button className="action-circle-btn" onClick={() => { setCreateForm(prev => ({ ...prev, title: tmpl.name, message: tmpl.content.replace(/{[^}]+}/g, '___') })); setShowCreateModal(true); }} title="Load into composer"><Send size={12} /></button>
                    {perspective === 'super_admin' && (
                      <>
                        <button className="action-circle-btn" onClick={() => handleEditTemplate(tmpl)} title="Edit Template"><Edit size={12} /></button>
                        <button className="action-circle-btn" onClick={() => addPageToast('success', 'Template layout copied to clipboard.')} title="Copy Layout"><Copy size={12} /></button>
                        <button className="action-circle-btn danger-btn" onClick={() => handleDeleteTemplate(tmpl.id)} title="Delete Template"><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: PREFERENCES SETTINGS ==================== */}
      {activeTab === 'settings' && (
        <div className="flex-column gap-6 animate-fade-in">
          <div>
            <h3 className="card-sec-title" style={{ margin: 0 }}>Notification Preferences Settings</h3>
            <p className="subtitle" style={{ marginTop: 2 }}>Configure central gateway channels, retry rules, and retention settings</p>
          </div>

          <div className="pref-grid">
            {/* Global Dispatch Channels */}
            <div className="pref-card">
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Active Gateway Channels</strong>
              <div className="pref-row">
                <div>
                  <div style={{ fontWeight: 600 }}>SMTP Mail Server Gate</div>
                  <div className="text-xs text-muted">Primary gateway for newsletters, daily notifications & digests</div>
                </div>
                <label className="switch-control">
                  <input type="checkbox" checked={preferences.emailEnabled} disabled={perspective !== 'super_admin'} onChange={() => setPreferences(prev => ({ ...prev, emailEnabled: !prev.emailEnabled }))} />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="pref-row">
                <div>
                  <div style={{ fontWeight: 600 }}>Nexmo SMS Provider Gate</div>
                  <div className="text-xs text-muted">Secondary gateway for urgent OTPs and emergency shutdowns</div>
                </div>
                <label className="switch-control">
                  <input type="checkbox" checked={preferences.smsEnabled} disabled={perspective !== 'super_admin'} onChange={() => setPreferences(prev => ({ ...prev, smsEnabled: !prev.smsEnabled }))} />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="pref-row">
                <div>
                  <div style={{ fontWeight: 600 }}>Google GCM Push Service</div>
                  <div className="text-xs text-muted">Web app native dashboard toaster and active pop-ups</div>
                </div>
                <label className="switch-control">
                  <input type="checkbox" checked={preferences.pushEnabled} disabled={perspective !== 'super_admin'} onChange={() => setPreferences(prev => ({ ...prev, pushEnabled: !prev.pushEnabled }))} />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="pref-row">
                <div>
                  <div style={{ fontWeight: 600 }}>Slack Webhooks API</div>
                  <div className="text-xs text-muted">Instant team channels alert routing integrations</div>
                </div>
                <label className="switch-control">
                  <input type="checkbox" checked={preferences.slackEnabled} disabled={perspective !== 'super_admin'} onChange={() => setPreferences(prev => ({ ...prev, slackEnabled: !prev.slackEnabled }))} />
                  <span className="switch-slider"></span>
                </label>
              </div>
            </div>

            {/* Failover and Routing parameters */}
            <div className="pref-card">
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Failover & Rate Limiting Controls</strong>

              <div className="pref-row">
                <div>
                  <div style={{ fontWeight: 600 }}>Auto-Retry Failed Dispatches</div>
                  <div className="text-xs text-muted">Attempt redelivery 3 times if gateway times out</div>
                </div>
                <label className="switch-control">
                  <input type="checkbox" checked={preferences.retryFailed} disabled={perspective !== 'super_admin'} onChange={() => setPreferences(prev => ({ ...prev, retryFailed: !prev.retryFailed }))} />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="flex-column gap-2" style={{ marginTop: 10 }}>
                <label className="input-label">Throttle Rates (Limit per employee session)</label>
                <select value={preferences.rateLimiting} disabled={perspective !== 'super_admin'} onChange={(e) => setPreferences(prev => ({ ...prev, rateLimiting: e.target.value }))} className="table-filter-select width-full p-2">
                  <option value="5 / min">5 Notifications / minute</option>
                  <option value="10 / min">10 Notifications / minute</option>
                  <option value="30 / min">30 Notifications / minute</option>
                  <option value="No limits">Unrestricted</option>
                </select>
              </div>

              <div className="flex-column gap-2" style={{ marginTop: 10 }}>
                <label className="input-label">Audit Logs Retention Period</label>
                <select value={preferences.retentionDays} disabled={perspective !== 'super_admin'} onChange={(e) => setPreferences(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 90 }))} className="table-filter-select width-full p-2">
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="180">180 Days</option>
                  <option value="365">1 Year</option>
                </select>
              </div>
            </div>
          </div>

          {perspective === 'super_admin' && (
            <div className="flex justify-end mt-4">
              <Button variant="primary" onClick={() => addPageToast('success', 'Central configuration rules saved.')}>Save Settings Configurations</Button>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB CONTENT: AUDIT LOGS ==================== */}
      {activeTab === 'logs' && (
        <div className="flex-column gap-6 animate-fade-in">
          <div className="flex-center justify-between">
            <div>
              <h3 className="card-sec-title" style={{ margin: 0 }}>System Dispatcher Audit Log</h3>
              <p className="subtitle" style={{ marginTop: 2 }}>Low-level server responses for Nexmo and SMTP socket deliveries</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => { setLogs([ { id: 'LOG-000', timestamp: 'Just now', trigger: 'Realtime Syslog Sync Job', recipient: 'Scheduler Thread', channel: 'Internal Sync', status: 'Success', response: 'Index updated successfully' }, ...logs ]); addPageToast('success', 'System dispatch logs synchronized.'); }}></Button>
              <Button variant="secondary" size="sm" icon={FileDown} onClick={handleExportData}>Download Syslogs</Button>
            </div>
          </div>

          <div className="card table-wrapper-card p-0">
            <DataTable
              columns={[
                { header: 'Timestamp', accessor: 'timestamp' },
                { header: 'Trigger Rule / Manual Dispatch', accessor: 'trigger' },
                { header: 'Recipient Group', accessor: 'recipient' },
                { header: 'Gateway Channel', accessor: 'channel' },
                { header: 'Response Status', accessor: 'status', cell: (row) => <Badge variant={row.status === 'Success' ? 'success' : 'danger'}>{row.status}</Badge> },
                { header: 'Gateway API Server Response Message', accessor: 'response', cell: (row) => <code style={{ fontSize: '0.78rem', color: row.status === 'Success' ? 'var(--text-secondary)' : 'var(--color-danger)' }}>{row.response}</code> }
              ]}
              data={logs}
            />
          </div>
        </div>
      )}

      {/* ==================== PAGE TOASTS CONTAINER ==================== */}
      <div className="page-toast-container">
        {pageToasts.map(toast => (
          <div key={toast.id} className="page-toast border-left-success">
            {toast.type === 'success' && <CheckCircle size={16} className="text-success mr-2" />}
            {toast.type === 'info' && <Bell size={16} className="text-primary mr-2" />}
            {toast.type === 'warning' && <AlertTriangle size={16} className="text-warning mr-2" />}
            {toast.type === 'danger' && <XCircle size={16} className="text-danger mr-2" />}
            <span style={{ marginLeft: 6 }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ==================== CREATE NOTIFICATION MODAL ==================== */}
      {showCreateModal && (
        <div className="notifications-modal-overlay">
          <form className="notifications-modal-container animate-slide-up" onSubmit={handleCreateSubmit}>
            <div className="flex-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 className="modal-title-bold" style={{ margin: 0 }}>Compose New Notification</h3>
                <p className="subtitle" style={{ marginTop: 2 }}>Publish announcements or manual system dispatches</p>
              </div>
              <button className="action-circle-btn" type="button" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-3 font-small">
              <div>
                <label className="input-label">Notification Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="table-search-input width-full"
                  placeholder="e.g. Q2 Townhall Agenda"
                />
              </div>

              <div>
                <label className="input-label">Message Content</label>
                <textarea
                  required
                  rows="4"
                  value={createForm.message}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, message: e.target.value }))}
                  className="table-search-input width-full"
                  style={{ resize: 'vertical', minHeight: '80px', padding: '8px' }}
                  placeholder="Enter details to dispatch..."
                />
              </div>

              <div className="grid-2-col gap-3">
                <div>
                  <label className="input-label">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="table-filter-select width-full"
                    style={{ padding: '8px' }}
                  >
                    <option value="Company">Company Announcement</option>
                    <option value="HR">HR & Benefits</option>
                    <option value="Project">Project Updates</option>
                    <option value="Event">Event invitations</option>
                    <option value="Emergency">Emergency warning</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Priority Level</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="table-filter-select width-full"
                    style={{ padding: '8px' }}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Target Audience Group</label>
                <input
                  type="text"
                  value={createForm.recipientType}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, recipientType: e.target.value }))}
                  className="table-search-input width-full"
                  placeholder="e.g. All Employees, Engineering, Jaipur Staff..."
                />
              </div>

              <div>
                <label className="input-label">Active Gateway Channels</label>
                <div className="flex gap-4 p-2" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label className="flex-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.channels.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, channels: { ...prev.channels, email: e.target.checked } }))}
                    />
                    <span>Email Gateway</span>
                  </label>
                  <label className="flex-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.channels.push}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, channels: { ...prev.channels, push: e.target.checked } }))}
                    />
                    <span>Push Notice</span>
                  </label>
                  <label className="flex-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.channels.sms}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, channels: { ...prev.channels, sms: e.target.checked } }))}
                    />
                    <span>SMS Gateway</span>
                  </label>
                </div>
              </div>

              <div className="grid-2-col gap-3">
                <div>
                  <label className="input-label">Delivery Schedule Mode</label>
                  <select
                    value={createForm.schedule}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, schedule: e.target.value }))}
                    className="table-filter-select width-full"
                    style={{ padding: '8px' }}
                  >
                    <option value="Immediate">Immediate Dispatch</option>
                    <option value="Scheduled">Schedule for Later</option>
                  </select>
                </div>

                {createForm.schedule === 'Scheduled' && (
                  <div>
                    <label className="input-label">Schedule DateTime</label>
                    <input
                      type="datetime-local"
                      required
                      value={createForm.scheduleDate}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, scheduleDate: e.target.value }))}
                      className="table-search-input width-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-center justify-between mt-5 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel Composer</Button>
              <Button variant="primary" type="submit" icon={Send}>
                {createForm.schedule === 'Immediate' ? 'Dispatch Immediate' : 'Queue Dispatches'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== DETAILS AUDIT MODAL ==================== */}
      {showDetailModal && selectedNotif && (
        <div className="notifications-modal-overlay">
          <div className="notifications-modal-container animate-slide-up" style={{ maxWidth: '650px' }}>
            <div className="detail-modal-card">
              {/* Watermark styling */}
              <div className="detail-watermark">{selectedNotif.category}</div>

              {/* Header */}
              <div className="detail-modal-header flex-center justify-between">
                <div>
                  <span className="text-xs text-muted font-bold uppercase" style={{ fontFamily: 'monospace' }}>Dispatch ID: {selectedNotif.id}</span>
                  <h3 className="modal-title-bold" style={{ margin: '4px 0 0 0' }}>{selectedNotif.title}</h3>
                </div>
                <button className="action-circle-btn" onClick={() => setShowDetailModal(false)}><X size={18} /></button>
              </div>

              {/* Body message */}
              <div className="mb-4 p-3" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Dispatched Message Content</strong>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{selectedNotif.message}</p>
              </div>

              {/* Details grid */}
              <div className="detail-modal-grid mb-5">
                <div className="detail-info-row">
                  <span className="detail-info-label">Category Group:</span>
                  <span className="detail-info-val">{selectedNotif.category}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Priority Rating:</span>
                  <span className="detail-info-val" style={{ color: getPriorityStyle(selectedNotif.priority) }}>{selectedNotif.priority}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Dispatcher User:</span>
                  <span className="detail-info-val">{selectedNotif.sentBy}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Dispatched Date:</span>
                  <span className="detail-info-val">{selectedNotif.sentDate}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Gateway Status:</span>
                  <span className="detail-info-val"><Badge variant={getStatusBadgeClass(selectedNotif.deliveryStatus)}>{selectedNotif.deliveryStatus}</Badge></span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Read Status:</span>
                  <span className="detail-info-val"><Badge variant={selectedNotif.readStatus === 'Read' ? 'success' : 'warning'}>{selectedNotif.readStatus}</Badge></span>
                </div>
              </div>

              {/* Delivery Analytics tracking section */}
              <div className="section-label"><Activity size={12} /> Delivery Analytics Metrics</div>
              <div className="grid-4-col gap-3 mb-4 text-center">
                <div className="p-2" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span className="text-xs text-muted block">Recipients</span>
                  <strong className="text-md text-primary">{selectedNotif.recipients}</strong>
                </div>
                <div className="p-2" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span className="text-xs text-muted block">Delivered</span>
                  <strong className="text-md text-success">{selectedNotif.delivered}</strong>
                </div>
                <div className="p-2" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span className="text-xs text-muted block">Read Rate</span>
                  <strong className="text-md text-primary">{selectedNotif.recipients > 0 ? Math.round((selectedNotif.read / selectedNotif.recipients) * 100) : 0}%</strong>
                </div>
                <div className="p-2" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span className="text-xs text-muted block">Failures</span>
                  <strong className="text-md text-danger">{selectedNotif.failed}</strong>
                </div>
              </div>

              {/* Recipient breakdown list */}
              <div className="section-label"><Users size={12} /> Detailed Recipient Log Audit</div>
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table className="notifications-data-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Recipient Employee</th>
                      <th style={{ padding: '8px 12px' }}>Channel Route</th>
                      <th style={{ padding: '8px 12px' }}>Gateway Status</th>
                      <th style={{ padding: '8px 12px' }}>Audit Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 12px' }}>Aarav Sharma (EMP-2026-001)</td>
                      <td style={{ padding: '6px 12px' }}>Email + Push</td>
                      <td style={{ padding: '6px 12px' }}><Badge variant="success">Delivered</Badge></td>
                      <td style={{ padding: '6px 12px' }}>Read (10m ago)</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 12px' }}>Vikram Singh (EMP-2026-002)</td>
                      <td style={{ padding: '6px 12px' }}>Email + Push</td>
                      <td style={{ padding: '6px 12px' }}><Badge variant="success">Delivered</Badge></td>
                      <td style={{ padding: '6px 12px' }}>Read (1h ago)</td>
                    </tr>
                    {selectedNotif.failed > 0 && (
                      <tr>
                        <td style={{ padding: '6px 12px' }}>Suresh Kumar (EMP-2026-009)</td>
                        <td style={{ padding: '6px 12px' }}>SMS Gateway</td>
                        <td style={{ padding: '6px 12px' }}><Badge variant="danger">Failed</Badge></td>
                        <td style={{ padding: '6px 12px' }}>Nexmo 401 Auth Error</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              {selectedNotif.deliveryStatus === 'Failed' && (
                <Button variant="primary" onClick={() => { handleResendSingle(selectedNotif.id); setShowDetailModal(false); }} style={{ marginRight: 10 }}>Resend logs</Button>
              )}
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close Window</Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TEMPLATE MODAL ==================== */}
      {showTemplateModal && (
        <div className="notifications-modal-overlay">
          <form className="notifications-modal-container animate-slide-up" onSubmit={handleTemplateSubmit}>
            <div className="flex-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 className="modal-title-bold" style={{ margin: 0 }}>
                  {editingTemplate ? 'Edit Message Template' : 'Create New Template'}
                </h3>
                <p className="subtitle" style={{ marginTop: 2 }}>
                  {editingTemplate ? 'Modify the structure and properties of this precompiled message' : 'Configure a new reusable boilerplate layout'}
                </p>
              </div>
              <button className="action-circle-btn" type="button" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}><X size={18} /></button>
            </div>

            <div className="flex-column gap-3 font-small">
              <div>
                <label className="input-label">Template Name</label>
                <input
                  type="text"
                  required
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="table-search-input width-full"
                  placeholder="e.g. System Outage Alert"
                />
              </div>

              <div>
                <label className="input-label">Category</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                  className="table-filter-select width-full"
                  style={{ padding: '8px' }}
                >
                  <option value="Company">Company</option>
                  <option value="HR">HR</option>
                  <option value="Project">Project</option>
                  <option value="Event">Event</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="input-label">Template Content</label>
                <textarea
                  required
                  rows="5"
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                  className="table-search-input width-full"
                  style={{ resize: 'vertical', minHeight: '100px', padding: '8px' }}
                  placeholder="Hello {employee_name}, your request has been processed..."
                />
                <span className="text-xs text-muted mt-1 block">Use placeholders like <code>{"{employee_name}"}</code>, <code>{"{date}"}</code>, or <code>{"{status}"}</code>.</span>
              </div>
            </div>

            <div className="flex-center justify-between mt-5 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <Button variant="secondary" type="button" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}>Cancel</Button>
              <Button variant="primary" type="submit" icon={editingTemplate ? Edit : Plus}>
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Notifications;
