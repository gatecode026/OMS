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
  const { currentUserRole, currentUser, showConfirm, notifications, addNotification, updateNotification, deleteNotification } = useApp();

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
  const [logs, setLogs] = useState([]);

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
  const handleBulkMarkRead = async () => {
    if (selectedRowIds.length === 0) {
      addPageToast('warning', 'No notifications selected.');
      return;
    }
    await Promise.all(selectedRowIds.map(id => updateNotification(id, { readStatus: 'Read', readTime: 'Just now', read: true })));
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
      async () => {
        await Promise.all(selectedRowIds.map(id => deleteNotification(id)));
        addPageToast('danger', `Permanently deleted ${selectedRowIds.length} records.`);
        setSelectedRowIds([]);
      },
      'danger'
    );
  };

  const handleBulkResend = async () => {
    if (selectedRowIds.length === 0) {
      addPageToast('warning', 'No notifications selected.');
      return;
    }
    await Promise.all(selectedRowIds.map(id => {
      const n = notifications.find(x => x.id === id);
      if (n && n.deliveryStatus === 'Failed') {
        return updateNotification(id, { deliveryStatus: 'Delivered', delivered: n.delivered + n.failed, failed: 0 });
      }
      return Promise.resolve();
    }));
    addPageToast('success', `Initiated resend job for failed channels.`);
    setSelectedRowIds([]);
  };

  // Submit Create form
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.message.trim()) {
      addPageToast('warning', 'Title and Message are required.');
      return;
    }

    let recipientRole = 'all';
    if (createForm.recipientType === 'Employees') recipientRole = 'employee';
    if (createForm.recipientType === 'Managers') recipientRole = 'manager';
    if (createForm.recipientType === 'Admins') recipientRole = 'admin';

    const newNotif = {
      title: createForm.title,
      message: createForm.message,
      category: createForm.category,
      priority: createForm.priority,
      recipientType: createForm.recipientType,
      recipientRole: recipientRole,
      sentBy: perspective === 'super_admin' ? 'Super Admin' : 'Branch Admin',
      sentDate: new Date().toISOString().split('T')[0],
      deliveryStatus: createForm.schedule === 'Immediate' ? 'Delivered' : 'Scheduled',
      readStatus: 'Unread',
      readTime: '—',
      recipients: createForm.recipientType === 'All Employees' ? 320 : createForm.recipientType === 'Employees' ? 240 : createForm.recipientType === 'Managers' ? 60 : 20,
      delivered: createForm.schedule === 'Immediate' ? (createForm.recipientType === 'All Employees' ? 320 : createForm.recipientType === 'Employees' ? 240 : createForm.recipientType === 'Managers' ? 60 : 20) : 0,
      read: 0,
      failed: 0
    };

    await addNotification(newNotif);
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

  const handleToggleReadStatus = async (notifId) => {
    const n = notifications.find(x => x.id === notifId);
    if (!n) return;
    const isRead = n.readStatus === 'Read';
    await updateNotification(notifId, {
      readStatus: isRead ? 'Unread' : 'Read',
      readTime: isRead ? '—' : 'Just now',
      read: !isRead
    });
    addPageToast('info', 'Notification read status updated.');
  };

  const handleResendSingle = async (notifId) => {
    const n = notifications.find(x => x.id === notifId);
    if (!n) return;
    await updateNotification(notifId, {
      deliveryStatus: 'Delivered',
      delivered: n.recipients,
      failed: 0
    });
    addPageToast('success', `Redelivered logs via notification channels.`);
  };

  const handleDeleteSingle = (notifId) => {
    showConfirm(
      'Delete Log Record?',
      'This will clear this notification log from the database indices.',
      async () => {
        await deleteNotification(notifId);
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

  // --- Recharts Analytics Data ---
  const trendsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const data = months.slice(0, currentMonthIdx + 1).map(m => ({ name: m, sent: 0, delivered: 0, failed: 0 }));
    
    notifications.forEach(n => {
      if (!n.sentDate) return;
      const date = new Date(n.sentDate);
      const mIdx = date.getMonth();
      if (mIdx <= currentMonthIdx) {
        data[mIdx].sent += n.recipients || 1;
        data[mIdx].delivered += n.delivered || 1;
        data[mIdx].failed += n.failed || 0;
      }
    });
    
    const sumSent = data.reduce((sum, d) => sum + d.sent, 0);
    if (sumSent === 0) {
      return [
        { name: 'Jan', sent: 10, delivered: 10, failed: 0 },
        { name: 'Feb', sent: 20, delivered: 20, failed: 0 },
        { name: 'Mar', sent: 30, delivered: 30, failed: 0 },
        { name: 'Apr', sent: 40, delivered: 40, failed: 0 },
        { name: 'May', sent: 50, delivered: 50, failed: 0 },
        { name: 'Jun', sent: 60, delivered: 60, failed: 0 }
      ];
    }
    return data;
  }, [notifications]);

  const deptData = useMemo(() => {
    const counts = {};
    notifications.forEach(n => {
      const dept = n.department || 'All';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    const results = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return results.length > 0 ? results : [
      { name: 'Engineering', count: 5 },
      { name: 'HR', count: 3 },
      { name: 'Sales', count: 2 }
    ];
  }, [notifications]);

  const branchData = useMemo(() => {
    const counts = {};
    notifications.forEach(n => {
      const b = n.branch || 'Head Office';
      counts[b] = (counts[b] || 0) + 1;
    });
    const results = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return results.length > 0 ? results : [
      { name: 'Head Office', count: 8 },
      { name: 'Branch Office', count: 2 }
    ];
  }, [notifications]);

  const pieStatusData = useMemo(() => {
    let delivered = 0;
    let failed = 0;
    let scheduled = 0;
    
    notifications.forEach(n => {
      delivered += n.delivered || 0;
      failed += n.failed || 0;
      if (n.deliveryStatus === 'Scheduled') {
        scheduled += n.recipients || 1;
      }
    });
    
    if (delivered === 0 && failed === 0 && scheduled === 0) {
      return [
        { name: 'Delivered', value: 1, fill: '#10b981' },
        { name: 'Failed', value: 0, fill: '#ef4444' },
        { name: 'Scheduled', value: 0, fill: '#3b82f6' }
      ];
    }
    return [
      { name: 'Delivered', value: delivered, fill: '#10b981' },
      { name: 'Failed', value: failed, fill: '#ef4444' },
      { name: 'Scheduled', value: scheduled, fill: '#3b82f6' }
    ].filter(d => d.value > 0);
  }, [notifications]);

  const gaugeData = useMemo(() => {
    let delivered = 0;
    let failed = 0;
    
    notifications.forEach(n => {
      delivered += n.delivered || 0;
      failed += n.failed || 0;
    });
    
    const total = delivered + failed;
    const rate = total > 0 ? parseFloat(((delivered / total) * 100).toFixed(1)) : 100;
    const margin = total > 0 ? parseFloat(((failed / total) * 100).toFixed(1)) : 0;
    
    return [
      { name: 'Success Rate', value: rate, fill: '#10b981' },
      { name: 'Failure Margin', value: margin, fill: '#ef4444' }
    ];
  }, [notifications]);

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
              <option value="manager">Manager</option>
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
          <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}><FileText size={16} /> System Logs</button>
        </div>
      </div>

      {/* ==================== TAB CONTENT: DASHBOARD ==================== */}
      {activeTab === 'dashboard' && (
        <div className="flex-column gap-6">
          {/* Stats Cards Row */}
          <div className="notifications-stats-row">
            <div className="notifications-stat-card border-bottom-primary" onClick={() => setActiveTab('all-notifications')}>
              <div className="stat-card-header">
                <span className="stat-label">Total Dispatch Logs</span>
                <div className="stat-icon-chip"><Inbox size={18} /></div>
              </div>
              <div className="stat-num">{formatNumber(125480)}</div>
              <div className="flex-center justify-between">
                <Badge variant="primary" style={{ fontSize: '0.68rem' }}>Month</Badge>
                <div className="stat-trend trend-green"><TrendingUp size={11} /> +12.4% vs May</div>
              </div>
            </div>

            <div className="notifications-stat-card border-bottom-info">
              <div className="stat-card-header">
                <span className="stat-label">Automated Trigger Rules</span>
                <div className="stat-icon-chip"><Zap size={18} /></div>
              </div>
              <div className="stat-num">24</div>
              <div className="flex-center justify-between">
                <Badge variant="info" style={{ fontSize: '0.68rem' }}>Active</Badge>
                <div className="stat-trend trend-blue"><Activity size={11} /> 8 Rules Configured</div>
              </div>
            </div>

            <div className="notifications-stat-card border-bottom-success" onClick={() => setActiveTab('all-notifications')}>
              <div className="stat-card-header">
                <span className="stat-label">Dispatched Today</span>
                <div className="stat-icon-chip"><Send size={18} /></div>
              </div>
              <div className="stat-num">{formatNumber(1285)}</div>
              <div className="flex-center justify-between">
                <Badge variant="success" style={{ fontSize: '0.68rem' }}>Realtime</Badge>
                <div className="stat-trend trend-green"><CheckCircle size={11} /> 100% uptime</div>
              </div>
            </div>

            <div className="notifications-stat-card border-bottom-warning" onClick={() => { setActiveTab('all-notifications'); setFilterStatus('Pending'); }}>
              <div className="stat-card-header">
                <span className="stat-label">Pending / Queued</span>
                <div className="stat-icon-chip"><Clock size={18} /></div>
              </div>
              <div className="stat-num">42</div>
              <div className="flex-center justify-between">
                <Badge variant="warning" style={{ fontSize: '0.68rem' }}>Scheduler</Badge>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Awaiting cron cycle</span>
              </div>
            </div>
          </div>

          <div className="notifications-stats-row">
            <div className="notifications-stat-card border-bottom-success" onClick={() => { setActiveTab('all-notifications'); setFilterStatus('Delivered'); }}>
              <div className="stat-card-header">
                <span className="stat-label">Delivered Dispatches</span>
                <div className="stat-icon-chip"><CheckCircle size={18} /></div>
              </div>
              <div className="stat-num">{formatNumber(124210)}</div>
              <div className="flex-center justify-between">
                <Badge variant="success" style={{ fontSize: '0.68rem' }}>99.2%</Badge>
                <div className="stat-trend trend-green">Gateway confirmed delivery</div>
              </div>
            </div>

            <div className="notifications-stat-card border-bottom-primary">
              <div className="stat-card-header">
                <span className="stat-label">Read / Acknowledged</span>
                <div className="stat-icon-chip"><Eye size={18} /></div>
              </div>
              <div className="stat-num">{formatNumber(118450)}</div>
              <div className="flex-center justify-between">
                <Badge variant="primary" style={{ fontSize: '0.68rem' }}>Audited</Badge>
                <div className="stat-trend trend-blue">95.3% engagement</div>
              </div>
            </div>

            <div className="notifications-stat-card border-bottom-warning">
              <div className="stat-card-header">
                <span className="stat-label">Unread Notifications</span>
                <div className="stat-icon-chip"><Bell size={18} /></div>
              </div>
              <div className="stat-num">{formatNumber(5760)}</div>
              <div className="flex-center justify-between">
                <Badge variant="warning" style={{ fontSize: '0.68rem' }}>Inbox</Badge>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Pending reader session</span>
              </div>
            </div>

            <div className="notifications-stat-card border-bottom-success" onClick={() => setActiveTab('analytics')}>
              <div className="stat-card-header">
                <span className="stat-label">Delivery Success Rate</span>
                <div className="stat-icon-chip"><TrendingUp size={18} /></div>
              </div>
              <div className="stat-num">99.2%</div>
              <div className="flex-center justify-between">
                <Badge variant="success" style={{ fontSize: '0.68rem' }}>KPI</Badge>
                <div className="stat-trend trend-green">+0.1% gains</div>
              </div>
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
                {(() => {
                  const isAdminRole = ['super_admin', 'branch_admin', 'dept_admin', 'manager', 'team_leader'].includes(currentUserRole);
                  const myNotifications = notifications.filter(n => {
                    const recipientId   = n.recipientId || n.targetUserId || n.forUserId;
                    const recipientRole = (n.recipientRole || n.targetRole || n.recipientType || '').toLowerCase();
                    const msg = (n.message || n.title || '').toLowerCase();

                    // Rule 1: specific user
                    if (recipientId) return recipientId === currentUser?.id;

                    // Rule 2: employee-only
                    if (recipientRole === 'employee') return currentUserRole === 'employee';

                    // Rule 3: admin-only
                    if (recipientRole === 'admin' || recipientRole === 'super_admin' || recipientRole === 'manager' || recipientRole === 'team_leader') return isAdminRole;

                    // Rule 4: global / broadcast notification (recipientRole is 'all', 'everyone', or empty)
                    if (recipientRole === 'all' || recipientRole === 'everyone' || !recipientRole) {
                      // If it's an employee-personal message, only show it to employees
                      const isPersonalEmployeeMsg =
                        msg.startsWith('your ') ||
                        msg.includes('your leave') ||
                        msg.includes('your request') ||
                        msg.includes('your attendance') ||
                        msg.includes('has been approved') ||
                        msg.includes('has been rejected') ||
                        msg.includes('note: approved') ||
                        msg.includes('note: rejected');

                      if (isPersonalEmployeeMsg) {
                        return currentUserRole === 'employee';
                      }

                      // Broadcast / general notification → show to everyone
                      return true;
                    }

                    // Fallback: match specific role
                    return recipientRole === currentUserRole?.toLowerCase();
                  }).slice(0, 5);


                  return myNotifications.length > 0 ? myNotifications.map((feed, idx) => (
                    <div key={feed.id} className={`feed-item border-left-${(feed.priority || 'normal').toLowerCase()}`} onClick={() => handleViewDetails(feed)}>
                      <div className="feed-avatar" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                        {(feed.category || feed.type || 'N')[0].toUpperCase()}
                      </div>
                      <div className="feed-content">
                        <div className="flex-center justify-between">
                          <strong className="feed-title">{feed.title || feed.message?.slice(0, 40)}</strong>
                          <Badge variant={feed.deliveryStatus === 'Delivered' || !feed.deliveryStatus ? 'success' : 'danger'} style={{ fontSize: '0.68rem' }}>
                            {feed.deliveryStatus || 'Delivered'}
                          </Badge>
                        </div>
                        <p className="feed-msg">{feed.message}</p>
                        <div className="feed-meta">
                          <span className="flex-center gap-1"><Clock size={11} /> {feed.sentDate || feed.timestamp || 'Just now'}</span>
                          <span>•</span>
                          <span>Priority: <span style={{ color: getPriorityStyle(feed.priority || 'Normal'), fontWeight: 700 }}>{feed.priority || 'Normal'}</span></span>
                          <span>•</span>
                          <span>Recipients: <strong>{feed.recipients || 1}</strong></span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                      <Bell size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>No notifications for you today</p>
                    </div>
                  );
                })()}
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
                <select
                  value={createForm.recipientType}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, recipientType: e.target.value }))}
                  className="table-filter-select width-full"
                  style={{ padding: '8px' }}
                >
                  <option value="All Employees">All Employees</option>
                  <option value="Employees">Employees</option>
                  <option value="Managers">Managers</option>
                  <option value="Admins">Admins</option>
                </select>
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
                      <td style={{ padding: '6px 12px' }}>Balram Suman (EMP-2026-001)</td>
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
