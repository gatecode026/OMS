import React, { useState, useMemo } from 'react';
import './ActivityLogs.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Activity, Clock, LogIn, LogOut, UserCheck, UserX, FileText, 
  Calendar, Briefcase, DollarSign, Shield, AlertTriangle, 
  Eye, Search, Filter, Download, FileDown, Printer, 
  RefreshCw, ChevronRight, ChevronDown, MoreVertical,
  CheckCircle, XCircle, AlertCircle, Info, Server, Database,
  Lock, Key, Users, Building, MapPin, Globe, Smartphone,
  Laptop, Tablet, Wifi, TrendingUp, TrendingDown, PieChart,
  BarChart3, LineChart, Calendar as CalendarIcon, Timer,
  Fingerprint, ShieldCheck, UserPlus, UserMinus, Edit,
  Trash2, Upload, Download as DownloadIcon, Share2,
  MessageSquare, Bell, Award, Gift, Heart, Zap, Cloud,
  Settings, HelpCircle, Menu, X, Plus
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, LineChart as ReLineChart, Line,
  PieChart as RePieChart, Pie as RePie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#d946ef'];

const ActivityLogs = () => {
  const isLoading = usePageLoading(600);
  const { activityLogs, currentUserRole, showConfirm } = useApp();

  // Selected Month/Year
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');

  // Role Perspective override (defaults to currentUserRole, but can be switched)
  const [perspective, setPerspective] = useState(currentUserRole || 'super_admin');

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // --- Search & Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Selected Log for slide-over drawer
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Whitelist IP Modal State
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [whitelistForm, setWhitelistForm] = useState({
    cidrBlock: '',
    description: '',
    scope: 'Global'
  });

  // Selected rows for bulk actions
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  // Toast notification state
  const [pageToasts, setPageToasts] = useState([]);
  const addPageToast = (type, message) => {
    const id = Date.now();
    setPageToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setPageToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- Seed data extensions for interactive states ---
  // Active User Sessions
  const [activeSessions, setActiveSessions] = useState([
    { id: 'SES-9421', employeeName: 'Balram Suman', ipAddress: '103.45.201.8', location: 'Delhi, India', device: 'desktop', browser: 'Chrome', loginTime: '2026-06-04 10:15', mfa: 'Verified', status: 'active' },
    { id: 'SES-8310', employeeName: 'Vikram Singh', ipAddress: '172.16.89.4', location: 'Noida, India', device: 'desktop', browser: 'Firefox', loginTime: '2026-06-04 11:30', mfa: 'Verified', status: 'active' },
    { id: 'SES-7120', employeeName: 'Ananya Gupta', ipAddress: '192.168.2.14', location: 'Bangalore, India', device: 'laptop', browser: 'Safari', loginTime: '2026-06-04 12:45', mfa: 'Verified', status: 'active' },
    { id: 'SES-6015', employeeName: 'Rohit Sharma', ipAddress: '103.45.201.21', location: 'Mumbai, India', device: 'mobile', browser: 'Chrome Mobile', loginTime: '2026-06-04 14:10', mfa: 'Bypassed (IP)', status: 'active' },
    { id: 'SES-5982', employeeName: 'Priya Patel', ipAddress: '10.0.0.122', location: 'Ahmedabad, India', device: 'tablet', browser: 'Safari Mobile', loginTime: '2026-06-04 15:05', mfa: 'Verified', status: 'active' }
  ]);

  // Whitelisted IPs
  const [whitelistedIPs, setWhitelistedIPs] = useState([
    { id: 'WIP-001', cidrBlock: '103.45.201.0/24', description: 'Delhi Corporate Office Gateway', scope: 'Global', addedBy: 'Super Admin', addedDate: '2026-01-15' },
    { id: 'WIP-002', cidrBlock: '172.16.89.0/24', description: 'Noida Branch Office Server Room', scope: 'Internal', addedBy: 'Security Lead', addedDate: '2026-03-22' },
    { id: 'WIP-003', cidrBlock: '192.168.2.0/24', description: 'Bangalore Office Production IP', scope: 'Global', addedBy: 'IT Auditor', addedDate: '2026-04-10' }
  ]);

  // Settings & Configuration Changes Log
  const [configChanges, setConfigChanges] = useState([
    { id: 'CCN-001', operator: 'Balram Suman', key: 'central_mfa_policy', prev: 'MFA_OPTIONAL', next: 'MFA_MANDATORY_ALL', scope: 'Security', timestamp: '2026-06-03 14:20' },
    { id: 'CCN-002', operator: 'Neha Verma', key: 'payroll_disbursement_day', prev: '28th', next: '30th', scope: 'Payroll', timestamp: '2026-06-02 09:15' },
    { id: 'CCN-003', operator: 'Balram Suman', key: 'max_daily_login_attempts', prev: '5 Attempts', next: '3 Attempts', scope: 'Security', timestamp: '2026-05-30 17:50' },
    { id: 'CCN-004', operator: 'Suresh Kumar', key: 'cron_payroll_sync_interval', prev: '0 0 * * *', next: '0 0/12 * * *', scope: 'System', timestamp: '2026-05-28 11:10' }
  ]);

  // Admin High-Privilege Operations Log
  const [adminOps, setAdminOps] = useState([
    { id: 'AOP-001', operator: 'Balram Suman', action: 'Trigger Production DB Backup', target: 'Postgres DB Cluster', managerSig: 'Verified', auditorSig: 'Verified', status: 'Executed', timestamp: '2026-06-04 03:00' },
    { id: 'AOP-002', operator: 'Neha Verma', action: 'Promoted Vikram Singh to Admin', target: 'User Roles & Permissions', managerSig: 'Verified', auditorSig: 'Pending', status: 'Pending Verification', timestamp: '2026-06-04 13:40' },
    { id: 'AOP-003', operator: 'Balram Suman', action: 'Purged 180-Day System Logs', target: 'Syslog Indexes', managerSig: 'Verified', auditorSig: 'Verified', status: 'Executed', timestamp: '2026-06-01 10:00' },
    { id: 'AOP-004', operator: 'Suresh Kumar', action: 'Exported Financial Budget Sheet', target: 'Billing Core API', managerSig: 'Pending', auditorSig: 'Pending', status: 'Awaiting Authorization', timestamp: '2026-06-04 15:30' }
  ]);

  // System diagnostics connection stats
  const [diagnostics] = useState({
    dbPoolActive: 14,
    dbPoolMax: 50,
    cpuUsage: 48,
    ramUsage: 72,
    diskUsage: 64,
    queueUptime: '99.98%',
    activeCronJobs: 8
  });

  // Dynamic enrichment of baseline activity logs
  const enrichedLogs = useMemo(() => {
    const defaultIPs = ['103.45.201.8', '172.16.89.4', '192.168.2.14', '103.45.201.21', '10.0.0.122', '192.168.1.45', '103.45.201.1'];
    const defaultDevices = ['desktop', 'mobile', 'tablet', 'laptop'];
    const defaultBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    const defaultMacs = ['00:1A:2B:3C:4D:5E', '3C:5A:B1:D2:C3:E4', 'FF:AA:88:99:33:EE', '12:34:56:78:9A:BC'];
    const defaultRoles = {
      'Balram Suman': 'Super Admin',
      'Vikram Singh': 'Engineering Manager',
      'Ananya Gupta': 'Senior Developer',
      'Rohit Sharma': 'Sales Representative',
      'Priya Patel': 'Marketing Lead',
      'Arjun Mehta': 'QA Associate',
      'Neha Verma': 'HR Executive'
    };

    return activityLogs.map((log, idx) => ({
      ...log,
      role: defaultRoles[log.employeeName] || 'Employee',
      ipAddress: log.ipAddress || defaultIPs[idx % defaultIPs.length],
      deviceType: log.deviceType || defaultDevices[idx % defaultDevices.length],
      browser: log.browser || defaultBrowsers[idx % defaultBrowsers.length],
      macAddress: log.macAddress || defaultMacs[idx % defaultMacs.length],
      details: log.details || `Low-level audit footprint for action: '${log.action}' on module: '${log.module}'. Target resource integrity verified.`,
      payloadDiff: log.payloadDiff || {
        previous: `{"status": "active", "updated_at": "2026-06-03", "operator": "${log.employeeName}"}`,
        newVal: `{"status": "modified", "updated_at": "2026-06-04", "operator": "${log.employeeName}"}`
      }
    }));
  }, [activityLogs]);

  // Filtered Logs list based on filters/search
  const filteredLogs = useMemo(() => {
    return enrichedLogs.filter(log => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          log.id.toLowerCase().includes(q) ||
          log.employeeName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.module.toLowerCase().includes(q) ||
          log.ipAddress.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterModule && log.module !== filterModule) return false;
      if (filterStatus && log.status !== filterStatus) return false;
      if (filterDept && log.department !== filterDept) return false;
      return true;
    });
  }, [enrichedLogs, searchQuery, filterModule, filterStatus, filterDept]);

  // Unique lists for filters
  const modulesList = useMemo(() => ['All', ...new Set(enrichedLogs.map(l => l.module))], [enrichedLogs]);
  const deptsList = useMemo(() => ['All', ...new Set(enrichedLogs.map(l => l.department))], [enrichedLogs]);

  // --- Click Actions and Handlers ---
  const handleToggleSession = (sessionId) => {
    setActiveSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const isRevoked = s.status === 'revoked';
        return {
          ...s,
          status: isRevoked ? 'active' : 'revoked'
        };
      }
      return s;
    }));
    addPageToast('info', 'Active session status modified.');
  };

  const handleRevokeSession = (sessionId) => {
    showConfirm(
      'Terminate Active Session?',
      'This will immediately revoke the selected user token, forcing them to re-authenticate via MFA.',
      () => {
        setActiveSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'revoked' } : s));
        addPageToast('danger', `Session ${sessionId} has been terminated.`);
      },
      'danger'
    );
  };

  const handleApplyWhitelist = (e) => {
    e.preventDefault();
    if (!whitelistForm.cidrBlock.trim() || !whitelistForm.description.trim()) {
      addPageToast('warning', 'CIDR Block and Description are required.');
      return;
    }
    const newIP = {
      id: `WIP-${String(whitelistedIPs.length + 1).padStart(3, '0')}`,
      cidrBlock: whitelistForm.cidrBlock,
      description: whitelistForm.description,
      scope: whitelistForm.scope,
      addedBy: perspective === 'super_admin' ? 'Super Admin' : 'Auditor Account',
      addedDate: new Date().toISOString().split('T')[0]
    };
    setWhitelistedIPs(prev => [...prev, newIP]);
    addPageToast('success', `IP Range ${whitelistForm.cidrBlock} registered.`);
    setShowWhitelistModal(false);
    setWhitelistForm({ cidrBlock: '', description: '', scope: 'Global' });
  };

  const handleRemoveWhitelist = (id, range) => {
    showConfirm(
      'Delete Whitelist Range?',
      `Are you sure you want to delete range ${range}? Unregistered connections from this zone will undergo default firewall verification.`,
      () => {
        setWhitelistedIPs(prev => prev.filter(w => w.id !== id));
        addPageToast('danger', `Removed whitelisting for ${range}.`);
      },
      'danger'
    );
  };

  const handleRollbackConfig = (log) => {
    showConfirm(
      'Rollback Settings Parameter?',
      `Revert setting '${log.key}' back to its previous state: '${log.prev}'?`,
      () => {
        addPageToast('success', `Settings parameter rolled back: '${log.key}' is now active.`);
        // Add config entry recording rollback action
        const newEntry = {
          id: `CCN-${String(configChanges.length + 1).padStart(3, '0')}`,
          operator: perspective === 'super_admin' ? 'Super Admin' : 'Auditor',
          key: log.key,
          prev: log.next,
          next: log.prev,
          scope: log.scope,
          timestamp: 'Just now'
        };
        setConfigChanges(prev => [newEntry, ...prev]);
      }
    );
  };

  const handleVerifyAdminOp = (id) => {
    setAdminOps(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          auditorSig: 'Verified',
          status: a.managerSig === 'Verified' ? 'Executed' : 'Pending Manager Signature'
        };
      }
      return a;
    }));
    addPageToast('success', 'Security integrity signature added to admin payload.');
  };

  const handleBulkArchive = () => {
    if (selectedRowIds.length === 0) {
      addPageToast('warning', 'No audit logs selected.');
      return;
    }
    addPageToast('success', `Archived ${selectedRowIds.length} logs to low-cost backup index.`);
    setSelectedRowIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) {
      addPageToast('warning', 'No audit logs selected.');
      return;
    }
    showConfirm(
      `Purge ${selectedRowIds.length} Logs?`,
      'This will permanently delete the selected logs from all diagnostic indices.',
      () => {
        addPageToast('danger', `Successfully purged ${selectedRowIds.length} audit records.`);
        setSelectedRowIds([]);
      },
      'danger'
    );
  };

  const handleExportCSV = () => {
    addPageToast('info', 'Compiling spreadsheet audit reports...');
    setTimeout(() => {
      addPageToast('success', 'System_Audit_Report_June_2026.csv downloaded.');
    }, 1200);
  };

  // --- Visual Helper Functions ---
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={14} className="log-status-icon success" style={{ color: 'var(--color-success)' }} />;
      case 'warning': return <AlertTriangle size={14} className="log-status-icon warning" style={{ color: 'var(--color-warning)' }} />;
      case 'danger': return <XCircle size={14} className="log-status-icon danger" style={{ color: 'var(--color-danger)' }} />;
      default: return <Info size={14} className="log-status-icon info" style={{ color: 'var(--color-primary)' }} />;
    }
  };

  const getDeviceIcon = (device) => {
    switch (device) {
      case 'mobile': return <Smartphone size={13} style={{ color: 'var(--text-muted)' }} />;
      case 'tablet': return <Tablet size={13} style={{ color: 'var(--text-muted)' }} />;
      default: return <Laptop size={13} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  // --- Analytics Charts Data ---
  const trendsData = [
    { name: '00:00', total: 1800, success: 1780, failures: 20 },
    { name: '04:00', total: 950, success: 940, failures: 10 },
    { name: '08:00', total: 4200, success: 4120, failures: 80 },
    { name: '12:00', total: 8900, success: 8780, failures: 120 },
    { name: '16:00', total: 6480, success: 6390, failures: 90 },
    { name: '20:00', total: 3100, success: 3080, failures: 20 }
  ];

  const moduleDistributionData = [
    { name: 'Auth Core', count: 480, fill: '#3b82f6' },
    { name: 'Payroll API', count: 320, fill: '#10b981' },
    { name: 'Workflows', count: 240, fill: '#f59e0b' },
    { name: 'Employees', count: 180, fill: '#ef4444' },
    { name: 'System Settings', count: 120, fill: '#8b5cf6' }
  ];

  const statusDistributionData = [
    { name: 'Success', value: 18240, fill: '#10b981' },
    { name: 'Warning', value: 340, fill: '#f59e0b' },
    { name: 'Danger', value: 85, fill: '#ef4444' }
  ];

  if (isLoading) {
    return (
      <div className="activity-logs-page">
        <div className="logs-stats-row mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="logs-stat-card" style={{ height: 120 }}>
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
    <div className="activity-logs-page animate-fade-in">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="activity-logs-page-header flex-between mb-6">
        <div>
          <div className="flex-center gap-2">
            <h2 className="title-bold" style={{ margin: 0 }}>Security audit log center</h2>
            <Badge variant="danger" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>integrity status: active</Badge>
          </div>
          <p className="subtitle" style={{ marginTop: 4 }}>Monitor system modifications, user logins, configuration rollbacks, and high-privilege access metrics</p>
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
              <option value="security_admin">Security Admin</option>
              <option value="branch_manager">Branch Manager</option>
              <option value="it_auditor">IT Auditor</option>
            </select>
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="logs-selector"
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
            className="logs-selector"
            style={{ minWidth: '90px' }}
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
      </div>

      {/* ==================== TAB NAVIGATION ==================== */}
      <div className="tab-bar-card card p-1 mb-6">
        <div className="logs-tabs-list">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><Activity size={16} /> Overview Dashboard</button>
          <button className={`tab-btn ${activeTab === 'audit-trails' ? 'active' : ''}`} onClick={() => setActiveTab('audit-trails')}><FileText size={16} /> Audit Trails Database</button>
          <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}><Shield size={16} /> Security Access Monitor</button>
          <button className={`tab-btn ${activeTab === 'configuration' ? 'active' : ''}`} onClick={() => setActiveTab('configuration')}><Settings size={16} /> Settings & Config Changes</button>
          <button className={`tab-btn ${activeTab === 'admin-ops' ? 'active' : ''}`} onClick={() => setActiveTab('admin-ops')}><Lock size={16} /> Admin Operations Log</button>
          <button className={`tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`} onClick={() => setActiveTab('diagnostics')}><Server size={16} /> Diagnostics & Services</button>
        </div>
      </div>

      {/* ==================== TAB CONTENT: DASHBOARD ==================== */}
      {activeTab === 'dashboard' && (
        <div className="flex-column gap-6">
          {/* Top Row Stats */}
          <div className="logs-stats-row">
            <div className="logs-stat-card border-bottom-primary" onClick={() => setActiveTab('audit-trails')}>
              <div className="stat-card-header">
                <span className="stat-label">Total Audit Events</span>
                <div className="stat-icon-chip"><FileText size={18} /></div>
              </div>
              <div className="stat-num">{activityLogs.length}</div>
              <div className="flex-center justify-between">
                <Badge variant="primary" style={{ fontSize: '0.68rem' }}>24h</Badge>
                <div className="stat-trend trend-green"><TrendingUp size={11} /> Active Monitoring</div>
              </div>
            </div>

            <div className="logs-stat-card border-bottom-success" onClick={() => { setActiveTab('audit-trails'); setFilterStatus('success'); }}>
              <div className="stat-card-header">
                <span className="stat-label">Successful Actions</span>
                <div className="stat-icon-chip"><CheckCircle size={18} /></div>
              </div>
              <div className="stat-num">{activityLogs.filter(l => l.status === 'success').length}</div>
              <div className="flex-center justify-between">
                <Badge variant="success" style={{ fontSize: '0.68rem' }}>OK</Badge>
                <div className="stat-trend trend-green">98.2% Success rate</div>
              </div>
            </div>

            <div className="logs-stat-card border-bottom-warning" onClick={() => { setActiveTab('audit-trails'); setFilterStatus('warning'); }}>
              <div className="stat-card-header">
                <span className="stat-label">Security Warnings</span>
                <div className="stat-icon-chip"><AlertTriangle size={18} /></div>
              </div>
              <div className="stat-num">{activityLogs.filter(l => l.status === 'warning').length}</div>
              <div className="flex-center justify-between">
                <Badge variant="warning" style={{ fontSize: '0.68rem' }}>Alert</Badge>
                <div className="stat-trend trend-yellow">Non-critical logs</div>
              </div>
            </div>

            <div className="logs-stat-card border-bottom-danger" onClick={() => { setActiveTab('audit-trails'); setFilterStatus('danger'); }}>
              <div className="stat-card-header">
                <span className="stat-label">Critical Incidents</span>
                <div className="stat-icon-chip"><XCircle size={18} /></div>
              </div>
              <div className="stat-num">{activityLogs.filter(l => l.status === 'danger').length}</div>
              <div className="flex-center justify-between">
                <Badge variant="danger" style={{ fontSize: '0.68rem' }}>Security</Badge>
                <div className="stat-trend trend-red">MFA Failures / Access denied</div>
              </div>
            </div>
          </div>

          <div className="logs-stats-row">
            <div className="logs-stat-card border-bottom-info" onClick={() => setActiveTab('security')}>
              <div className="stat-card-header">
                <span className="stat-label">Active Sessions</span>
                <div className="stat-icon-chip"><Globe size={18} /></div>
              </div>
              <div className="stat-num">{activeSessions.filter(s => s.status === 'active').length}</div>
              <div className="flex-center justify-between">
                <Badge variant="info" style={{ fontSize: '0.68rem' }}>Online</Badge>
                <div className="stat-trend trend-blue">Across 3 regional zones</div>
              </div>
            </div>

            <div className="logs-stat-card border-bottom-primary">
              <div className="stat-card-header">
                <span className="stat-label">IP Whitelisting Ranges</span>
                <div className="stat-icon-chip"><Shield size={18} /></div>
              </div>
              <div className="stat-num">{whitelistedIPs.length}</div>
              <div className="flex-center justify-between">
                <Badge variant="primary" style={{ fontSize: '0.68rem' }}>Rule</Badge>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Active network layers</span>
              </div>
            </div>

            <div className="logs-stat-card border-bottom-warning" onClick={() => setActiveTab('configuration')}>
              <div className="stat-card-header">
                <span className="stat-label">Configuration Changes</span>
                <div className="stat-icon-chip"><Settings size={18} /></div>
              </div>
              <div className="stat-num">{configChanges.length}</div>
              <div className="flex-center justify-between">
                <Badge variant="warning" style={{ fontSize: '0.68rem' }}>Config</Badge>
                <span className="text-muted" style={{ fontSize: '0.72rem' }}>Awaiting rollback limits</span>
              </div>
            </div>

            <div className="logs-stat-card border-bottom-success">
              <div className="stat-card-header">
                <span className="stat-label">Log Integrity Score</span>
                <div className="stat-icon-chip"><ShieldCheck size={18} /></div>
              </div>
              <div className="stat-num">100%</div>
              <div className="flex-center justify-between">
                <Badge variant="success" style={{ fontSize: '0.68rem' }}>Secure</Badge>
                <div className="stat-trend trend-green">Cryptographic verification OK</div>
              </div>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid-2-col gap-6">
            {/* Volume Area Chart */}
            <div className="card p-5">
              <h4 className="chart-title mb-4 flex-center justify-between">
                <span><Activity size={16} className="text-primary mr-1" /> Realtime Event Logs volume trend</span>
                <span className="text-xs text-muted">Interval: 4 Hours</span>
              </h4>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={trendsData}>
                    <defs>
                      <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="failColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    <Legend />
                    <Area type="monotone" name="Total Actions" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#totalColor)" />
                    <Area type="monotone" name="Failures / Alerts" dataKey="failures" stroke="#ef4444" fillOpacity={1} fill="url(#failColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Charts column */}
            <div className="grid-2-col gap-6">
              {/* Distribution Pie chart */}
              <div className="card p-5 flex-column align-center text-center">
                <h4 className="chart-title mb-4"><ShieldCheck size={16} className="text-success mr-1" /> Audit Status Distribution</h4>
                <div style={{ width: '100%', height: 160 }}>
                  <ResponsiveContainer>
                    <RePieChart>
                      <RePie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </RePie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-3 justify-center flex-wrap" style={{ fontSize: '0.75rem', marginTop: 10 }}>
                  {statusDistributionData.map(d => (
                    <span key={d.name} className="flex-center gap-1"><span className="color-dot" style={{ backgroundColor: d.fill, width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }}></span> {d.name}</span>
                  ))}
                </div>
              </div>

              {/* Modules Bar chart */}
              <div className="card p-5 flex-column">
                <h4 className="chart-title mb-4"><Database size={16} className="text-primary mr-1" /> Action Frequency by Module</h4>
                <div style={{ width: '100%', height: 160 }}>
                  <ResponsiveContainer>
                    <BarChart data={moduleDistributionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                      <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={10} width={75} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {moduleDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: AUDIT TRAILS DATABASE ==================== */}
      {activeTab === 'audit-trails' && (
        <div className="flex-column gap-6 animate-fade-in">
          {/* Filters Row */}
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
                    placeholder="Search Logs, Users, IPs..."
                  />
                </div>

                <select value={filterModule} onChange={(e) => setFilterModule(e.target.value === 'All' ? '' : e.target.value)} className="table-filter-select">
                  <option value="">All Modules</option>
                  {modulesList.filter(m => m !== 'All').map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value === 'All' ? '' : e.target.value)} className="table-filter-select">
                  <option value="">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>

                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value === 'All' ? '' : e.target.value)} className="table-filter-select">
                  <option value="">All Departments</option>
                  {deptsList.filter(d => d !== 'All').map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {(filterModule || filterStatus || filterDept || searchQuery) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFilterModule('');
                      setFilterStatus('');
                      setFilterDept('');
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
                    <Button variant="secondary" size="xs" onClick={handleBulkArchive}>Archive</Button>
                    <Button variant="secondary" size="xs" onClick={handleBulkDelete} style={{ color: 'var(--color-danger)' }}>Purge</Button>
                  </div>
                )}

                <Button variant="secondary" size="sm" icon={FileDown} onClick={handleExportCSV}>Export CSV</Button>
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
                      checked={filteredLogs.length > 0 && selectedRowIds.length === filteredLogs.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRowIds(filteredLogs.map(l => l.id));
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
                { header: 'Log ID', accessor: 'id', cell: (row) => <code className="log-id-code">{row.id}</code> },
                {
                  header: 'User Account',
                  accessor: 'employeeName',
                  cell: (row) => (
                    <div className="flex-center gap-3 justify-start">
                      <Avatar name={row.employeeName} size="sm" />
                      <div>
                        <strong className="block text-sm text-primary">{row.employeeName}</strong>
                        <span className="text-xs text-muted block" style={{ marginTop: 1 }}>{row.role}</span>
                      </div>
                    </div>
                  )
                },
                { header: 'Department', accessor: 'department', cell: (row) => <span className="text-xs font-semibold text-secondary">{row.department}</span> },
                { header: 'Action Performed', accessor: 'action', cell: (row) => <div className="text-sm font-medium" style={{ maxWidth: '280px' }}>{row.action}</div> },
                { header: 'Target Module', accessor: 'module', cell: (row) => <Badge variant="neutral">{row.module}</Badge> },
                {
                  header: 'Device & Browser',
                  cell: (row) => (
                    <div className="flex-center gap-2 justify-start text-xs text-muted">
                      {getDeviceIcon(row.deviceType)}
                      <span>{row.browser}</span>
                    </div>
                  )
                },
                { header: 'IP Address', accessor: 'ipAddress', cell: (row) => <code style={{ fontSize: '0.8rem' }}>{row.ipAddress}</code> },
                { header: 'Timestamp', accessor: 'timestamp', cell: (row) => <div className="flex-center gap-2 justify-start"><Clock size={12} className="text-muted" /><span className="text-muted text-xs">{row.timestamp}</span></div> },
                { header: 'Status', accessor: 'status', cell: (row) => <Badge variant={row.status === 'success' ? 'success' : row.status === 'danger' ? 'danger' : 'warning'}>{row.status}</Badge> },
                {
                  header: 'Actions',
                  cell: (row) => (
                    <div className="flex-center gap-2">
                      <button className="action-circle-btn" onClick={() => { setSelectedLog(row); setShowDetailModal(true); }} title="View Low-Level Payload"><Eye size={13} /></button>
                      {perspective === 'super_admin' && (
                        <button className="action-circle-btn danger-btn" onClick={() => { setSelectedRowIds([row.id]); handleBulkDelete(); }} title="Purge Record"><Trash2 size={13} /></button>
                      )}
                    </div>
                  )
                }
              ]}
              data={filteredLogs}
            />
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: SECURITY ACCESS MONITOR ==================== */}
      {activeTab === 'security' && (
        <div className="flex-column gap-6 animate-fade-in">
          <div className="flex-between">
            <div>
              <h3 className="card-sec-title flex-center gap-2" style={{ margin: 0 }}><Shield size={18} className="text-primary" /> Active Login Sessions</h3>
              <p className="subtitle" style={{ marginTop: 2 }}>Authorized user access keys requiring real-time session tracking</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => addPageToast('success', 'Active authentication sessions synchronized.')}></Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowWhitelistModal(true)}>Add Whitelisted IP</Button>
            </div>
          </div>

          <div className="grid-3-col gap-6">
            {/* Sessions List */}
            <div className="card p-5 grid-span-2" style={{ gridColumn: 'span 2' }}>
              <strong className="block text-md mb-4 flex-center gap-2 text-primary"><Users size={16} /> Online Connection Handlers ({activeSessions.filter(s => s.status === 'active').length})</strong>
              <div className="session-feed-list">
                {activeSessions.map(session => (
                  <div key={session.id} className={`session-item ${session.status === 'revoked' ? 'revoked' : ''}`}>
                    <div className="session-user-info">
                      <Avatar name={session.employeeName} size="md" />
                      <div>
                        <strong className="text-sm text-primary flex-center gap-2">
                          {session.employeeName}
                          <Badge variant={session.status === 'active' ? 'success' : 'danger'}>{session.status}</Badge>
                        </strong>
                        <div className="session-meta-grid">
                          <span className="flex-center gap-1"><MapPin size={11} /> {session.location}</span>
                          <span>•</span>
                          <span className="flex-center gap-1"><Globe size={11} /> IP: {session.ipAddress}</span>
                          <span>•</span>
                          <span className="flex-center gap-1"><Clock size={11} /> Access: {session.loginTime}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-center gap-3">
                      <span className="text-xs text-muted bg-elevated px-2 py-1 rounded" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Lock size={10} className="text-success" /> MFA: {session.mfa}
                      </span>
                      {session.status === 'active' ? (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={perspective === 'branch_manager' || perspective === 'it_auditor'}
                          style={{ color: 'var(--color-danger)' }}
                        >
                          Revoke Session
                        </Button>
                      ) : (
                        <span className="text-xs text-danger font-semibold">Revoked</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Whitelisted IPs */}
            <div className="card p-5 flex-column gap-4">
              <strong className="block text-md border-bottom pb-2 flex-center gap-2 text-primary"><ShieldCheck size={16} /> Firewalled Whitelist CIDRs</strong>
              <div className="flex-column gap-3">
                {whitelistedIPs.map(rule => (
                  <div key={rule.id} className="p-3" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <div className="flex-center justify-between">
                      <code style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>{rule.cidrBlock}</code>
                      {perspective === 'super_admin' && (
                        <button className="action-circle-btn danger-btn" style={{ width: 22, height: 22 }} onClick={() => handleRemoveWhitelist(rule.id, rule.cidrBlock)}><X size={10} /></button>
                      )}
                    </div>
                    <p className="text-xs text-secondary mt-1" style={{ margin: '4px 0 0 0' }}>{rule.description}</p>
                    <div className="flex-center justify-between text-muted" style={{ fontSize: '0.68rem', marginTop: 8, borderTop: '1px solid var(--border-color)', paddingTop: 4 }}>
                      <span>Added by: {rule.addedBy}</span>
                      <span>{rule.addedDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: CONFIG CHANGES ==================== */}
      {activeTab === 'configuration' && (
        <div className="flex-column gap-6 animate-fade-in">
          <div>
            <h3 className="card-sec-title flex-center gap-2" style={{ margin: 0 }}><Settings size={18} className="text-primary" /> Settings Configuration Audit Trail</h3>
            <p className="subtitle" style={{ marginTop: 2 }}>Log updates to secure variables, environment tokens, and authentication parameters</p>
          </div>

          <div className="card table-wrapper-card p-0">
            <DataTable
              columns={[
                { header: 'Change ID', accessor: 'id', cell: (row) => <code className="log-id-code">{row.id}</code> },
                { header: 'Modified Setting Key', accessor: 'key', cell: (row) => <code style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{row.key}</code> },
                {
                  header: 'Payload Value Change (Diff)',
                  cell: (row) => (
                    <div className="config-diff-box">
                      <div className="diff-minus">- {row.prev}</div>
                      <div className="diff-plus" style={{ marginTop: 4 }}>+ {row.next}</div>
                    </div>
                  )
                },
                { header: 'System Scope', accessor: 'scope', cell: (row) => <Badge variant="neutral">{row.scope}</Badge> },
                { header: 'Triggered By', accessor: 'operator' },
                { header: 'Timestamp', accessor: 'timestamp', cell: (row) => <span className="text-xs text-muted">{row.timestamp}</span> },
                {
                  header: 'Actions',
                  cell: (row) => (
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={RefreshCw}
                      disabled={perspective !== 'super_admin' && perspective !== 'security_admin'}
                      onClick={() => handleRollbackConfig(row)}
                    >
                      Rollback Change
                    </Button>
                  )
                }
              ]}
              data={configChanges}
            />
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: ADMIN OPS LOG ==================== */}
      {activeTab === 'admin-ops' && (
        <div className="flex-column gap-6 animate-fade-in">
          <div className="flex-between">
            <div>
              <h3 className="card-sec-title flex-center gap-2" style={{ margin: 0 }}><Lock size={18} className="text-primary" /> Administrative operations registry</h3>
              <p className="subtitle" style={{ marginTop: 2 }}>Dual-signature verification tracking for top-tier destructive system instructions</p>
            </div>
            <Button variant="secondary" size="sm" icon={FileDown} onClick={handleExportCSV}>Download Registry Log</Button>
          </div>

          <div className="card table-wrapper-card p-0">
            <DataTable
              columns={[
                { header: 'Op ID', accessor: 'id', cell: (row) => <code className="log-id-code">{row.id}</code> },
                {
                  header: 'Action Requested',
                  accessor: 'action',
                  cell: (row) => (
                    <div>
                      <strong className="block text-primary">{row.action}</strong>
                      <span className="text-xs text-muted block" style={{ marginTop: 2 }}>Target: {row.target}</span>
                    </div>
                  )
                },
                { header: 'Operator', accessor: 'operator' },
                { header: 'Timestamp', accessor: 'timestamp' },
                {
                  header: 'Manager Signature',
                  accessor: 'managerSig',
                  cell: (row) => (
                    <Badge variant={row.managerSig === 'Verified' ? 'success' : 'warning'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={11} /> {row.managerSig}
                    </Badge>
                  )
                },
                {
                  header: 'IT Auditor Signature',
                  accessor: 'auditorSig',
                  cell: (row) => (
                    <Badge variant={row.auditorSig === 'Verified' ? 'success' : 'warning'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={11} /> {row.auditorSig}
                    </Badge>
                  )
                },
                { header: 'Status Flag', accessor: 'status', cell: (row) => <Badge variant={row.status === 'Executed' ? 'success' : 'warning'}>{row.status}</Badge> },
                {
                  header: 'Authorize Signature',
                  cell: (row) => (
                    <Button
                      variant="primary"
                      size="xs"
                      icon={Fingerprint}
                      disabled={(perspective !== 'super_admin' && perspective !== 'it_auditor') || row.auditorSig === 'Verified'}
                      onClick={() => handleVerifyAdminOp(row.id)}
                    >
                      Authorize
                    </Button>
                  )
                }
              ]}
              data={adminOps}
            />
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: DIAGNOSTICS ==================== */}
      {activeTab === 'diagnostics' && (
        <div className="flex-column gap-6 animate-fade-in">
          <div>
            <h3 className="card-sec-title flex-center gap-2" style={{ margin: 0 }}><Server size={18} className="text-primary" /> Low-level Server diagnostics & socket pools</h3>
            <p className="subtitle" style={{ marginTop: 2 }}>Real-time telemetry tracking for microservices, database transactions, and scheduled cron engines</p>
          </div>

          <div className="grid-4-col gap-6">
            {/* CPU Metric */}
            <div className="diagnostics-metric-card">
              <div className="flex-center justify-between text-sm">
                <span className="font-semibold text-secondary">Diagnostic Core CPU Load</span>
                <strong className="text-primary">{diagnostics.cpuUsage}%</strong>
              </div>
              <div className="metric-bar-container">
                <div className="metric-bar-fill" style={{ width: `${diagnostics.cpuUsage}%`, backgroundColor: 'var(--color-primary)' }}></div>
              </div>
              <span className="text-xs text-muted">Running 16 Thread Pool allocations</span>
            </div>

            {/* RAM Metric */}
            <div className="diagnostics-metric-card">
              <div className="flex-center justify-between text-sm">
                <span className="font-semibold text-secondary">System Server Memory Memory</span>
                <strong className="text-primary">{diagnostics.ramUsage}%</strong>
              </div>
              <div className="metric-bar-container">
                <div className="metric-bar-fill" style={{ width: `${diagnostics.ramUsage}%`, backgroundColor: 'var(--color-warning)' }}></div>
              </div>
              <span className="text-xs text-muted">Allocated: 11.5 GB of 16 GB</span>
            </div>

            {/* DB Connections */}
            <div className="diagnostics-metric-card">
              <div className="flex-center justify-between text-sm">
                <span className="font-semibold text-secondary">Database Connection Pools</span>
                <strong className="text-primary">{diagnostics.dbPoolActive} / {diagnostics.dbPoolMax}</strong>
              </div>
              <div className="metric-bar-container">
                <div className="metric-bar-fill" style={{ width: `${(diagnostics.dbPoolActive / diagnostics.dbPoolMax) * 100}%`, backgroundColor: 'var(--color-success)' }}></div>
              </div>
              <span className="text-xs text-muted">Latency: 8 ms PostgreSQL</span>
            </div>

            {/* Disk usage */}
            <div className="diagnostics-metric-card">
              <div className="flex-center justify-between text-sm">
                <span className="font-semibold text-secondary">Elastic Storage Storage</span>
                <strong className="text-primary">{diagnostics.diskUsage}%</strong>
              </div>
              <div className="metric-bar-container">
                <div className="metric-bar-fill" style={{ width: `${diagnostics.diskUsage}%`, backgroundColor: 'var(--color-danger)' }}></div>
              </div>
              <span className="text-xs text-muted">Indexed: 1.2 TB of 2.0 TB</span>
            </div>
          </div>

          {/* Active Diagnostic Cron jobs list */}
          <div className="grid-2-col gap-6">
            <div className="card p-5">
              <strong className="block text-md mb-4 flex-center gap-2 text-primary"><Clock size={16} /> Scheduler Cron engines</strong>
              <table className="logs-data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Cron Job ID</th>
                    <th>Schedule Rule</th>
                    <th>Subprocess target</th>
                    <th>Status</th>
                    <th>Last Executed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>cron_payroll_sync</code></td>
                    <td><code>0 0/12 * * *</code></td>
                    <td>Trigger Payroll State Calculator</td>
                    <td><Badge variant="success">Standby</Badge></td>
                    <td>2 hours ago</td>
                  </tr>
                  <tr>
                    <td><code>cron_backup_dump</code></td>
                    <td><code>0 2 * * *</code></td>
                    <td>Postgres Dump Stream S3</td>
                    <td><Badge variant="success">Standby</Badge></td>
                    <td>14 hours ago</td>
                  </tr>
                  <tr>
                    <td><code>cron_log_rotate</code></td>
                    <td><code>0 0 1 * *</code></td>
                    <td>Purge Older Syslog indexes</td>
                    <td><Badge variant="info">Scheduled</Badge></td>
                    <td>4 days ago</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card p-5">
              <strong className="block text-md mb-4 flex-center gap-2 text-primary"><Database size={16} /> Replication integrity statuses</strong>
              <div className="flex-column gap-3 text-sm">
                <div className="flex-center justify-between p-2 rounded" style={{ background: 'var(--bg-elevated)' }}>
                  <span>AWS Frankfurt Primary Cluster</span>
                  <span className="text-success font-semibold flex-center gap-1"><CheckCircle size={12} /> Syncing (0 ms)</span>
                </div>
                <div className="flex-center justify-between p-2 rounded" style={{ background: 'var(--bg-elevated)' }}>
                  <span>AWS Mumbai Secondary Replica</span>
                  <span className="text-success font-semibold flex-center gap-1"><CheckCircle size={12} /> Syncing (12 ms)</span>
                </div>
                <div className="flex-center justify-between p-2 rounded" style={{ background: 'var(--bg-elevated)' }}>
                  <span>Google Cloud Platform (Backup Replication)</span>
                  <span className="text-warning font-semibold flex-center gap-1"><AlertTriangle size={12} /> Lagging (3.4 s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PAGE TOASTS CONTAINER ==================== */}
      <div className="page-toast-container">
        {pageToasts.map(toast => (
          <div key={toast.id} className="page-toast border-left-success" style={{ borderLeft: '4px solid var(--color-success)' }}>
            {toast.type === 'success' && <CheckCircle size={16} className="text-success mr-2" style={{ color: 'var(--color-success)' }} />}
            {toast.type === 'info' && <Info size={16} className="text-primary mr-2" style={{ color: 'var(--color-primary)' }} />}
            {toast.type === 'warning' && <AlertTriangle size={16} className="text-warning mr-2" style={{ color: 'var(--color-warning)' }} />}
            {toast.type === 'danger' && <XCircle size={16} className="text-danger mr-2" style={{ color: 'var(--color-danger)' }} />}
            <span style={{ marginLeft: 6 }}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ==================== REGISTER WHITELIST MODAL ==================== */}
      {showWhitelistModal && (
        <div className="logs-modal-overlay">
          <form className="logs-modal-container animate-slide-up" onSubmit={handleApplyWhitelist}>
            <div className="flex-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 className="modal-title-bold" style={{ margin: 0 }}>Register Whitelisted CIDR Block</h3>
                <p className="subtitle" style={{ marginTop: 2 }}>Allow authentication bypassing or secure channel tunnels</p>
              </div>
              <button className="action-circle-btn" type="button" onClick={() => setShowWhitelistModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-3 font-small">
              <div>
                <label className="input-label">CIDR IP Range Block</label>
                <input
                  type="text"
                  required
                  value={whitelistForm.cidrBlock}
                  onChange={(e) => setWhitelistForm(prev => ({ ...prev, cidrBlock: e.target.value }))}
                  className="table-search-input width-full"
                  placeholder="e.g. 192.168.1.0/24"
                />
              </div>

              <div>
                <label className="input-label">Description / Gateway Zone</label>
                <input
                  type="text"
                  required
                  value={whitelistForm.description}
                  onChange={(e) => setWhitelistForm(prev => ({ ...prev, description: e.target.value }))}
                  className="table-search-input width-full"
                  placeholder="e.g. Hyderabad Office Wi-Fi"
                />
              </div>

              <div>
                <label className="input-label">Access Scope</label>
                <select
                  value={whitelistForm.scope}
                  onChange={(e) => setWhitelistForm(prev => ({ ...prev, scope: e.target.value }))}
                  className="table-filter-select width-full"
                  style={{ padding: '8px' }}
                >
                  <option value="Global">Global Office Subnets</option>
                  <option value="Internal">Internal Server Room LAN</option>
                  <option value="Restricted">Restricted Auditor Tunnel</option>
                </select>
              </div>
            </div>

            <div className="flex-center justify-between mt-5 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <Button variant="secondary" type="button" onClick={() => setShowWhitelistModal(false)}>Cancel Register</Button>
              <Button variant="primary" type="submit" icon={Plus}>Register IP Scope</Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== AUDIT LOG DETAIL MODAL DRAWER ==================== */}
      {showDetailModal && selectedLog && (
        <div className="logs-modal-overlay">
          <div className="logs-modal-container animate-slide-up" style={{ maxWidth: '650px' }}>
            <div className="detail-modal-card">
              <div className="detail-watermark">{selectedLog.module}</div>

              <div className="detail-modal-header flex-center justify-between">
                <div>
                  <span className="text-xs text-muted font-bold uppercase" style={{ fontFamily: 'monospace' }}>Footprint ID: {selectedLog.id}</span>
                  <h3 className="modal-title-bold" style={{ margin: '4px 0 0 0' }}>{selectedLog.action}</h3>
                </div>
                <button className="action-circle-btn" onClick={() => setShowDetailModal(false)}><X size={18} /></button>
              </div>

              <div className="mb-4 p-3" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Audited Event Description</strong>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{selectedLog.details}</p>
              </div>

              <div className="detail-modal-grid mb-5">
                <div className="detail-info-row">
                  <span className="detail-info-label">Operator User:</span>
                  <span className="detail-info-val">{selectedLog.employeeName}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">User Role Account:</span>
                  <span className="detail-info-val">{selectedLog.role}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Target Module:</span>
                  <span className="detail-info-val">{selectedLog.module}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Client IP Address:</span>
                  <span className="detail-info-val" style={{ fontFamily: 'monospace' }}>{selectedLog.ipAddress}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Client MAC Address:</span>
                  <span className="detail-info-val" style={{ fontFamily: 'monospace' }}>{selectedLog.macAddress}</span>
                </div>
                <div className="detail-info-row">
                  <span className="detail-info-label">Diagnostic Status:</span>
                  <span className="detail-info-val"><Badge variant={selectedLog.status === 'success' ? 'success' : selectedLog.status === 'danger' ? 'danger' : 'warning'}>{selectedLog.status}</Badge></span>
                </div>
              </div>

              {/* Payload differences section */}
              <div className="section-label"><Database size={12} /> Database Payload Modification Differences</div>
              <div className="flex-column gap-2 mb-4">
                <div className="text-xs font-semibold text-muted">PREVIOUS PAYLOAD DATA:</div>
                <pre style={{ margin: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'monospace', color: 'var(--color-danger)' }}>
                  {selectedLog.payloadDiff.previous}
                </pre>
                
                <div className="text-xs font-semibold text-muted style-mt-3" style={{ marginTop: 8 }}>MODIFIED PAYLOAD DATA:</div>
                <pre style={{ margin: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.75rem', overflowX: 'auto', fontFamily: 'monospace', color: 'var(--color-success)' }}>
                  {selectedLog.payloadDiff.newVal}
                </pre>
              </div>

              {/* Browser & OS agent string */}
              <div className="section-label"><Smartphone size={12} /> Client Access Parameters</div>
              <div className="grid-2-col gap-3 mb-4 text-center">
                <div className="p-2" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span className="text-xs text-muted block">Client Device</span>
                  <strong className="text-md text-primary" style={{ textTransform: 'uppercase' }}>{selectedLog.deviceType}</strong>
                </div>
                <div className="p-2" style={{ background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span className="text-xs text-muted block">Browser Client</span>
                  <strong className="text-md text-primary">{selectedLog.browser}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close Window</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;
