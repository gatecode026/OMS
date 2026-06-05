import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import './SecurityAudit.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Shield,
  Lock,
  Key,
  Users,
  AlertTriangle,
  Activity,
  Bell,
  Database,
  Edit,
  Plus,
  Trash2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  RefreshCw,
  Sliders,
  Download,
  FileText,
  Fingerprint,
  Globe,
  MapPin,
  Tv,
  Check,
  X,
  HelpCircle,
  Filter,
  ShieldAlert,
  Search,
  Eye,
  Settings,
  ShieldCheck,
  Laptop
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

const SecurityAudit = () => {
  const isLoading = usePageLoading(600);
  const { employees, showConfirm, currentUserRole, addToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect non-super-admins to Dashboard
  useEffect(() => {
    if (currentUserRole !== 'super_admin') {
      navigate('/', { replace: true });
    }
  }, [currentUserRole, navigate]);

  // Tab Defaulting based on path
  const defaultTab = location.pathname === '/audit-logs' ? 'audit' : 'dashboard';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync tab with pathname changes
  useEffect(() => {
    if (location.pathname === '/audit-logs') {
      setActiveTab('audit');
    } else if (location.pathname === '/security') {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  // Page level toast feed
  const [pageToasts, setPageToasts] = useState([]);
  const addPageToast = (type, message) => {
    const id = Date.now();
    setPageToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setPageToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- Seed State Data (SOC Operations) ---

  // 1. Password Policy State
  const [passPolicy, setPassPolicy] = useState({
    minLength: 8,
    requireUppercase: 'Yes',
    requireLowercase: 'Yes',
    requireNumbers: 'Yes',
    requireSpecial: 'Yes',
    expiryDays: 90,
    reuseRestriction: 5,
    preventCommon: 'Yes',
    firstLoginChange: 'Yes',
    notifyOnChange: 'Yes'
  });

  // 2. MFA Policy State
  const [mfaPolicy, setMfaPolicy] = useState({
    enableMfa: 'Optional',
    mfaAdminOnly: 'Required',
    mfaAllUsers: 'Optional',
    emailOtp: true,
    smsOtp: true,
    authenticatorApp: true,
    backupCodes: true,
    otpValidity: 300,
    rememberDays: 30,
    failureLimit: 3
  });

  // 3. Login Restrictions State
  const [loginRestrictions, setLoginRestrictions] = useState({
    maxFailedAttempts: 5,
    lockDuration: 30,
    sessionTimeout: 30,
    autoLogoutInactivity: 'Yes',
    concurrentSessions: 'No',
    maxConcurrent: 1,
    forceLogoutRoleChange: 'Yes',
    forceLogoutPasswordChange: 'Yes',
    loginCaptcha: 'Yes',
    showLastLogin: 'Yes'
  });

  // 4. IP Whitelist State (CRUD)
  const [allowedIps, setAllowedIps] = useState([
    { id: 'IP-101', ip: '192.168.1.50', startRange: '192.168.1.1', endRange: '192.168.1.254', location: 'Jaipur HQ', purpose: 'Office Network', status: 'Active' },
    { id: 'IP-102', ip: '10.8.0.45', startRange: '10.8.0.1', endRange: '10.8.0.100', location: 'Mumbai DC', purpose: 'VPN Network', status: 'Active' },
    { id: 'IP-103', ip: '172.16.2.10', startRange: '172.16.2.1', endRange: '172.16.2.50', location: 'Delhi Branch', purpose: 'Branch Network', status: 'Active' },
    { id: 'IP-104', ip: '192.168.12.8', startRange: '192.168.12.1', endRange: '192.168.12.30', location: 'Remote Employees', purpose: 'Remote Access', status: 'Inactive' }
  ]);

  const [ipForm, setIpForm] = useState({
    ip: '', startRange: '', endRange: '', location: '', purpose: 'Office Network', status: 'Active'
  });
  const [editingIpId, setEditingIpId] = useState(null);

  // Restricted/Blocked IPs (Read Only with Unblock option)
  const [restrictedIps, setRestrictedIps] = useState([
    { id: 'BLK-001', ipAddress: '198.51.100.72', reason: 'Failed Login Limit Exceeded', blockDate: '2026-06-05 09:14', attempts: 12, blockedBy: 'Auth Gate' },
    { id: 'BLK-002', ipAddress: '203.0.113.88', reason: 'Suspicious Bot Behavior Detected', blockDate: '2026-06-04 18:22', attempts: 45, blockedBy: 'WAF Console' },
    { id: 'BLK-003', ipAddress: '45.227.254.12', reason: 'Brute Force Attempt on Admin Route', blockDate: '2026-06-03 23:40', attempts: 98, blockedBy: 'Super Admin' }
  ]);

  // 5. Device Restrictions State
  const [deviceConfig, setDeviceConfig] = useState({
    restrictDeviceType: 'No',
    allowedDevices: ['Desktop', 'Laptop', 'Mobile', 'Tablet'],
    requireRegistration: 'No',
    maxDevices: 3,
    autoBlockUnknown: 'No',
    deviceApprovalRequired: 'Yes',
    sessionPerDevice: 'No'
  });

  // Authorized Devices List
  const [authorizedDevices, setAuthorizedDevices] = useState([
    { id: 'DEV-001', name: 'Aarav Macbook Pro', type: 'Laptop', browser: 'Chrome', os: 'macOS', registeredBy: 'Aarav Sharma', regDate: '2026-04-12', lastLogin: '2026-06-05 11:20', status: 'Active' },
    { id: 'DEV-002', name: 'Divya HP EliteBook', type: 'Laptop', browser: 'Edge', os: 'Windows', registeredBy: 'Divya Singh', regDate: '2026-04-15', lastLogin: '2026-06-05 10:45', status: 'Active' },
    { id: 'DEV-003', name: 'Sanjay iPhone 15', type: 'Mobile', browser: 'Safari', os: 'iOS', registeredBy: 'Sanjay Gupta', regDate: '2026-05-02', lastLogin: '2026-06-05 09:10', status: 'Active' },
    { id: 'DEV-004', name: 'Meena Tablet Pro', type: 'Tablet', browser: 'Chrome', os: 'Android', registeredBy: 'Meena Sharma', regDate: '2026-05-20', lastLogin: '2026-06-04 15:30', status: 'Blocked' },
    { id: 'DEV-005', name: 'Unknown Windows Client', type: 'Desktop', browser: 'Firefox', os: 'Windows', registeredBy: 'Ravi Yadav', regDate: '2026-06-01', lastLogin: '2026-06-05 08:00', status: 'Pending' }
  ]);

  // 6. Timing Restrictions State
  const [timingConfig, setTimingConfig] = useState({
    restrictByTime: 'No',
    officeStart: '09:00 AM',
    officeEnd: '06:00 PM',
    weekendAllowed: 'Yes',
    holidayAllowed: 'Yes',
    restrictByLocation: 'No',
    allowedLocations: ['Jaipur HQ', 'Delhi Branch', 'Mumbai Office']
  });

  // 7. Active Sessions State (Tab 4)
  const [activeSessions, setActiveSessions] = useState([
    { id: 'SES-001', employeeName: 'Aarav Sharma', employeeId: 'EMP-2026-001', role: 'Super Admin', loginTime: '2026-06-05 08:30', lastActivity: '2026-06-05 11:58', duration: '3h 28m', deviceType: 'Laptop', browser: 'Chrome', os: 'macOS', ipAddress: '192.168.1.50', location: 'Jaipur, India', status: 'Active' },
    { id: 'SES-002', employeeName: 'Divya Singh', employeeId: 'EMP-2026-002', role: 'Super Admin', loginTime: '2026-06-05 09:15', lastActivity: '2026-06-05 11:55', duration: '2h 40m', deviceType: 'Laptop', browser: 'Edge', os: 'Windows', ipAddress: '192.168.1.120', location: 'Jaipur, India', status: 'Active' },
    { id: 'SES-003', employeeName: 'Sanjay Gupta', employeeId: 'EMP-2026-003', role: 'Branch Admin', loginTime: '2026-06-05 09:00', lastActivity: '2026-06-05 11:30', duration: '2h 55m', deviceType: 'Mobile', browser: 'Safari', os: 'iOS', ipAddress: '10.8.0.45', location: 'Mumbai, India', status: 'Idle' },
    { id: 'SES-004', employeeName: 'Ananya Gupta', employeeId: 'EMP-2026-004', role: 'Team Leader', loginTime: '2026-06-05 10:00', lastActivity: '2026-06-05 11:50', duration: '1h 50m', deviceType: 'Laptop', browser: 'Chrome', os: 'Linux', ipAddress: '172.16.2.10', location: 'Delhi, India', status: 'Active' },
    { id: 'SES-005', employeeName: 'Ravi Yadav', employeeId: 'EMP-2026-005', role: 'Employee', loginTime: '2026-06-05 10:15', lastActivity: '2026-06-05 10:45', duration: '30m', deviceType: 'Desktop', browser: 'Firefox', os: 'Windows', ipAddress: '192.168.12.8', location: 'Delhi, India', status: 'Idle' }
  ]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionRoleFilter, setSessionRoleFilter] = useState('All');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // 8. Security Alerts State (Tab 5)
  const [securityAlerts, setSecurityAlerts] = useState([
    { id: 'ALT-101', timestamp: '2026-06-05 11:42', severity: 'Critical', alertType: 'Multiple Failed Logins', description: 'User Sanjay Gupta attempted login 8 times with incorrect credentials', user: 'Sanjay Gupta', ipAddress: '198.51.100.72', location: 'Beijing, China', status: 'New' },
    { id: 'ALT-102', timestamp: '2026-06-05 11:15', severity: 'High', alertType: 'Suspicious Location Login', description: 'Access granted to Aarav Sharma from an unrecognized IP range', user: 'Aarav Sharma', ipAddress: '203.0.113.88', location: 'London, UK', status: 'Investigating' },
    { id: 'ALT-103', timestamp: '2026-06-05 10:05', severity: 'Medium', alertType: 'Data Export Attempt', description: 'Employee Meena Sharma attempted to export salary records of 45+ users', user: 'Meena Sharma', ipAddress: '192.168.1.135', location: 'Jaipur, India', status: 'New' },
    { id: 'ALT-104', timestamp: '2026-06-04 17:30', severity: 'Low', alertType: 'New Device Login', description: 'Ravi Yadav logged in from new device: Unknown Windows Client', user: 'Ravi Yadav', ipAddress: '192.168.12.8', location: 'Delhi, India', status: 'Resolved' },
    { id: 'ALT-105', timestamp: '2026-06-04 14:20', severity: 'High', alertType: 'Permission Changed', description: 'Super Admin changed permissions for Branch Admin role', user: 'Divya Singh', ipAddress: '192.168.1.120', location: 'Jaipur, India', status: 'Resolved' }
  ]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // 9. Complete Audit Trail State (Tab 6)
  const [auditLogsData, setAuditLogsData] = useState([
    { id: 'AUD-8801', timestamp: '2026-06-05 11:55', user: 'Divya Singh', empId: 'EMP-2026-002', role: 'Super Admin', eventType: 'Permission Change', module: 'Security', action: 'Enforced MFA requirement for all Branch Administrators', oldVal: 'Optional', newVal: 'Required', ipAddress: '192.168.1.120', device: 'Chrome / Windows', location: 'Jaipur, India', status: 'Success', severity: 'High' },
    { id: 'AUD-8802', timestamp: '2026-06-05 11:42', user: 'Sanjay Gupta', empId: 'EMP-2026-003', role: 'Branch Admin', eventType: 'Failed Login', module: 'Authentication', action: 'Failed authentication: Incorrect password entered', oldVal: '—', newVal: '—', ipAddress: '198.51.100.72', device: 'Firefox / Linux', location: 'Beijing, China', status: 'Failed', severity: 'Critical' },
    { id: 'AUD-8803', timestamp: '2026-06-05 11:20', user: 'Aarav Sharma', empId: 'EMP-2026-001', role: 'Super Admin', eventType: 'Login', module: 'Authentication', action: 'User logged in successfully via Authenticator App', oldVal: '—', newVal: '—', ipAddress: '203.0.113.88', device: 'Safari / macOS', location: 'London, UK', status: 'Success', severity: 'Info' },
    { id: 'AUD-8804', timestamp: '2026-06-05 10:15', user: 'Ananya Gupta', empId: 'EMP-2026-004', role: 'Team Leader', eventType: 'Update', module: 'Task', action: 'Modified task status: SOC Setup Phase 1 to Completed', oldVal: 'In Progress', newVal: 'Completed', ipAddress: '172.16.2.10', device: 'Chrome / Linux', location: 'Delhi, India', status: 'Success', severity: 'Info' },
    { id: 'AUD-8805', timestamp: '2026-06-05 10:05', user: 'Meena Sharma', empId: 'EMP-2026-006', role: 'Employee', eventType: 'Export', module: 'Payroll', action: 'Attempted export of June Payroll Draft excel sheet', oldVal: '—', newVal: 'JunePayrollDraft.xlsx', ipAddress: '192.168.1.135', device: 'Chrome / Windows', location: 'Jaipur, India', status: 'Warning', severity: 'Medium' },
    { id: 'AUD-8806', timestamp: '2026-06-04 18:00', user: 'Divya Singh', empId: 'EMP-2026-002', role: 'Super Admin', eventType: 'Create', module: 'Employee', action: 'Created new Employee Profile: Ravi Yadav', oldVal: '—', newVal: 'EMP-2026-005 Active', ipAddress: '192.168.1.120', device: 'Edge / Windows', location: 'Jaipur, India', status: 'Success', severity: 'Info' },
    { id: 'AUD-8807', timestamp: '2026-06-04 15:30', user: 'Sanjay Gupta', empId: 'EMP-2026-003', role: 'Branch Admin', eventType: 'Password Change', module: 'Authentication', action: 'User changed password from profile dashboard', oldVal: '******', newVal: '******', ipAddress: '10.8.0.45', device: 'Chrome / macOS', location: 'Mumbai, India', status: 'Success', severity: 'Medium' },
    { id: 'AUD-8808', timestamp: '2026-06-03 14:15', user: 'Ravi Yadav', empId: 'EMP-2026-005', role: 'Employee', eventType: 'Access', module: 'Documents', action: 'Accessed document: NDA Agreement policy', oldVal: '—', newVal: 'NDA_Policy_Sign.pdf', ipAddress: '192.168.12.8', device: 'Chrome / Windows', location: 'Delhi, India', status: 'Success', severity: 'Info' },
    { id: 'AUD-8809', timestamp: '2026-06-02 09:10', user: 'Divya Singh', empId: 'EMP-2026-002', role: 'Super Admin', eventType: 'Delete', module: 'Security', action: 'Removed whitelisted IP range: 192.168.10.0/24', oldVal: 'Allowed', newVal: 'Removed', ipAddress: '192.168.1.120', device: 'Chrome / Windows', location: 'Jaipur, India', status: 'Success', severity: 'High' }
  ]);

  // Audit Logs filters
  const [auditSearch, setAuditSearch] = useState('');
  const [filterEventType, setFilterEventType] = useState('All');
  const [filterModule, setFilterModule] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('today');

  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  // 10. Compliance Scorecard
  const complianceData = [
    { area: 'Password Policy', score: 95, status: 'Excellent', color: '#10b981' },
    { area: 'MFA Adoption', score: 87, status: 'Good', color: '#3b82f6' },
    { area: 'Device Compliance', score: 92, status: 'Excellent', color: '#10b981' },
    { area: 'IP Security', score: 85, status: 'Good', color: '#3b82f6' },
    { area: 'Session Security', score: 90, status: 'Excellent', color: '#10b981' },
    { area: 'Audit Coverage', score: 100, status: 'Excellent', color: '#10b981' }
  ];

  // --- Chart Mock Series (Tab 1 Dashboard) ---
  const loginActivityTrends = [
    { name: 'May 05', logins: 845, threats: 4 },
    { name: 'May 10', logins: 920, threats: 12 },
    { name: 'May 15', logins: 1050, threats: 8 },
    { name: 'May 20', logins: 1250, threats: 15 },
    { name: 'May 25', logins: 1100, threats: 6 },
    { name: 'May 30', logins: 1350, threats: 18 },
    { name: 'Jun 05', logins: 1450, threats: 2 }
  ];

  const failedLoginAttempts = [
    { hour: '00:00', attempts: 4 },
    { hour: '04:00', attempts: 1 },
    { hour: '08:00', attempts: 12 },
    { hour: '12:00', attempts: 28 },
    { hour: '16:00', attempts: 45 },
    { hour: '20:00', attempts: 55 }
  ];

  const securityEventsByType = [
    { name: 'Authentication', value: 845, color: '#8b5cf6' },
    { name: 'Access Controls', value: 562, color: '#3b82f6' },
    { name: 'Data Changes', value: 348, color: '#ec4899' },
    { name: 'Security Threats', value: 145, color: '#ef4444' }
  ];

  const suspiciousIps = [
    { ip: '198.51.100.72', attempts: 42 },
    { ip: '203.0.113.88', attempts: 28 },
    { ip: '45.227.254.12', attempts: 18 },
    { ip: '185.220.101.4', attempts: 12 }
  ];

  // --- CRUD Handlers ---

  // IP Whitelist CRUD
  const handleSaveIp = (e) => {
    e.preventDefault();
    if (!ipForm.ip.trim()) return;

    if (editingIpId) {
      // Update
      setAllowedIps(prev => prev.map(item => item.id === editingIpId ? { ...item, ...ipForm } : item));
      addPageToast('success', `Whitelisted IP ${ipForm.ip} updated successfully.`);
      setEditingIpId(null);
    } else {
      // Create
      const newEntry = {
        ...ipForm,
        id: `IP-${Math.floor(100 + Math.random() * 900)}`
      };
      setAllowedIps(prev => [...prev, newEntry]);
      addPageToast('success', `Whitelisted IP range ${newEntry.ip} added successfully.`);
    }

    setIpForm({ ip: '', startRange: '', endRange: '', location: '', purpose: 'Office Network', status: 'Active' });
  };

  const handleEditIpClick = (item) => {
    setEditingIpId(item.id);
    setIpForm({
      ip: item.ip,
      startRange: item.startRange,
      endRange: item.endRange,
      location: item.location,
      purpose: item.purpose,
      status: item.status
    });
  };

  const handleDeleteIp = (id, label) => {
    showConfirm(
      'Remove Whitelist Range',
      `Are you sure you want to remove whitelisted IP "${label}"? Systems on this IP will be subject to standard rules.`,
      () => {
        setAllowedIps(prev => prev.filter(item => item.id !== id));
        addPageToast('warning', `Whitelisted IP "${label}" removed.`);
      },
      'danger'
    );
  };

  const handleUnblockIp = (id, ip) => {
    setRestrictedIps(prev => prev.filter(item => item.id !== id));
    addPageToast('success', `IP Address ${ip} has been unblocked successfully.`);
  };

  // Device Management Toggles
  const handleToggleDeviceStatus = (id, name, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Blocked' : 'Active';
    setAuthorizedDevices(prev => prev.map(d => d.id === id ? { ...d, status: nextStatus } : d));
    addPageToast(nextStatus === 'Blocked' ? 'warning' : 'success', `Device "${name}" status set to ${nextStatus}.`);
  };

  const handleRemoveDevice = (id, name) => {
    showConfirm(
      'Remove Device Registry',
      `Are you sure you want to remove the authorized device "${name}"? Access from this device will require re-registration.`,
      () => {
        setAuthorizedDevices(prev => prev.filter(d => d.id !== id));
        addPageToast('warning', `Device "${name}" registry deleted.`);
      },
      'danger'
    );
  };

  // Session Revocation
  const handleForceLogoutSession = (sessionId, userName) => {
    showConfirm(
      'Force Logout Session',
      `Are you sure you want to immediately terminate the session for user "${userName}"? The user will be redirected to the login screen.`,
      () => {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        addPageToast('success', `User "${userName}" session terminated successfully.`);
      },
      'danger'
    );
  };

  const handleForceLogoutAll = () => {
    showConfirm(
      'Force Logout All Users',
      'WARNING: This will immediately terminate all active user sessions except for your current active session. Do you wish to proceed?',
      () => {
        // SES-001 is current user (Aarav Sharma)
        setActiveSessions(prev => prev.filter(s => s.id === 'SES-001'));
        addPageToast('warning', 'All remote administrator and staff sessions terminated successfully.');
      },
      'danger'
    );
  };

  // Alert Resolution
  const handleResolveAlert = (alertId) => {
    setSecurityAlerts(prev => prev.map(alt => alt.id === alertId ? { ...alt, status: 'Resolved' } : alt));
    addPageToast('success', `Security Alert "${alertId}" marked as Resolved.`);
  };

  const handleDismissAlert = (alertId) => {
    setSecurityAlerts(prev => prev.map(alt => alt.id === alertId ? { ...alt, status: 'Ignored' } : alt));
    addPageToast('info', `Security Alert "${alertId}" dismissed.`);
  };

  // Save Settings forms
  const handleSaveSecuritySettings = (e, formName) => {
    e.preventDefault();
    addPageToast('success', `${formName} configuration saved successfully.`);
  };

  // --- Filter Logic ---

  // Sessions filter
  const filteredSessions = useMemo(() => {
    return activeSessions.filter(s => {
      const matchSearch = s.employeeName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
                          s.employeeId.toLowerCase().includes(sessionSearch.toLowerCase()) ||
                          s.ipAddress.includes(sessionSearch);
      const matchRole = sessionRoleFilter === 'All' || s.role === sessionRoleFilter;
      return matchSearch && matchRole;
    });
  }, [activeSessions, sessionSearch, sessionRoleFilter]);

  // Audit Logs filter
  const filteredAuditLogs = useMemo(() => {
    return auditLogsData.filter(log => {
      const matchSearch = log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.ipAddress.includes(auditSearch);

      const matchType = filterEventType === 'All' || log.eventType === filterEventType;
      const matchModule = filterModule === 'All' || log.module === filterModule;
      const matchRole = filterRole === 'All' || log.role === filterRole;
      const matchStatus = filterStatus === 'All' || log.status === filterStatus;
      const matchSeverity = filterSeverity === 'All' || log.severity === filterSeverity;

      return matchSearch && matchType && matchModule && matchRole && matchStatus && matchSeverity;
    });
  }, [auditLogsData, auditSearch, filterEventType, filterModule, filterRole, filterStatus, filterSeverity]);

  // Simulated Exports
  const handleExportData = (exportName, format) => {
    addPageToast('info', `Generating ${exportName} in ${format} format...`);
    setTimeout(() => {
      addPageToast('success', `Download complete: ${exportName.replace(/\s+/g, '_')}_export.${format.toLowerCase()}`);
    }, 1500);
  };

  const handleSimulateScan = () => {
    addPageToast('info', 'Initiating network vulnerability and SOC audit scan...');
    setTimeout(() => {
      addPageToast('success', 'Security Scan Completed. No new vulnerabilities found.');
    }, 2000);
  };

  const handleClearAlerts = () => {
    showConfirm(
      'Resolve All Alerts',
      'Are you sure you want to mark all active alerts as Resolved?',
      () => {
        setSecurityAlerts(prev => prev.map(alt => ({ ...alt, status: 'Resolved' })));
        addPageToast('success', 'All security alerts resolved.');
      },
      'primary'
    );
  };

  if (isLoading) {
    return (
      <div className="security-audit-page flex-column gap-4 p-5">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="security-stats-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton-card" style={{ height: '110px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: '340px' }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="security-audit-page p-5">
      
      {/* Toast Alert Feed */}
      <div className="page-toast-container">
        {pageToasts.map(t => (
          <div key={t.id} className={`page-toast border-left-${t.type}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Page Header */}
      <div className="security-audit-header">
        <div className="flex gap-2 mb1">
          <h2>Security Settings &amp; Audit Logs</h2>
          <span className="security-badge">🔒 Security Operations Center (SOC)</span>
        </div>
        <p className="text-secondary font-small">
          Monitor system security, manage access policies, track user activities, detect suspicious behavior, enforce compliance standards, and maintain a complete audit trail of all actions performed within the ERP system.
        </p>

        <div className="flex-row align-center gap-3 flex-wrap mt-1">
          <Button variant="ghost" onClick={() => handleExportData('Audit Logs', 'PDF')} icon={Download}>
            Export Audit Logs
          </Button>
          <Button variant="ghost" onClick={() => handleExportData('SOC Security Summary', 'PDF')} icon={FileText}>
            Generate Report
          </Button>
          <Button variant="primary" onClick={handleSimulateScan} icon={RefreshCw}>
            Run Scan
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="card tab-bar-card overflow-x-auto">
        <div className="security-tabs-list">
          <button onClick={() => setActiveTab('dashboard')} className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}><Shield size={16} />Security Dashboard</button>
          <button onClick={() => setActiveTab('login_security')} className={`tab-btn ${activeTab === 'login_security' ? 'active' : ''}`}><Lock size={16} />Login Security</button>
          <button onClick={() => setActiveTab('access_controls')} className={`tab-btn ${activeTab === 'access_controls' ? 'active' : ''}`}><Key size={16} />Access Controls</button>
          <button onClick={() => setActiveTab('sessions')} className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}><Users size={16} />Session Management</button>
          <button onClick={() => setActiveTab('alerts')} className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}><AlertTriangle size={16} />Security Alerts</button>
          <button onClick={() => setActiveTab('audit')} className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}><Activity size={16} />Audit Logs</button>
        </div>
      </div>

      {/* Top Summary Cards (Always visible) */}
      <div className="security-stats-row mb-4">
        
        <div className="card security-stat-card border-bottom-primary">
          <div className="stat-card-header flex-center justify-between width-full">
            <span className="stat-label">Total Security Events</span>
            <span className="stat-trend trend-green"><ArrowUpRight size={14} /> +8.4%</span>
          </div>
          <h3 className="stat-num">18,450</h3>
          <div className="flex-center justify-between font-small text-muted width-full">
            <span>Auth: 12,450</span>
            <span>Alerts: 145</span>
          </div>
        </div>

        <div className="card security-stat-card border-bottom-danger">
          <div className="stat-card-header flex-center justify-between width-full">
            <span className="stat-label">Failed Login Attempts</span>
            <span className="stat-trend trend-red"><ArrowUpRight size={14} /> +1.2%</span>
          </div>
          <h3 className="stat-num text-danger">145</h3>
          <div className="flex-center justify-between font-small text-muted width-full">
            <span>Blocked IPs: 7</span>
            <span>Policy Lockouts: 4</span>
          </div>
        </div>

        <div className="card security-stat-card border-bottom-info">
          <div className="stat-card-header flex-center justify-between width-full">
            <span className="stat-label">Active User Sessions</span>
            <span className="badge-live font-xsmall"><CheckCircle size={10} /> 248 Active</span>
          </div>
          <h3 className="stat-num text-info">248</h3>
          <div className="flex-center justify-between font-small text-muted width-full">
            <span>Admin Sessions: 12</span>
            <span>Idle Sessions: 32</span>
          </div>
        </div>

        <div className="card security-stat-card border-bottom-warning">
          <div className="stat-card-header flex-center justify-between width-full">
            <span className="stat-label">Security Alerts</span>
            <span className="badge-warning-custom font-xsmall">12 Alerts</span>
          </div>
          <h3 className="stat-num text-warning">12</h3>
          <div className="flex-center justify-between font-small text-muted width-full">
            <span>Critical: 2</span>
            <span>High: 5</span>
          </div>
        </div>

      </div>

      <div className="security-stats-row mb-6">
        
        <div className="card security-stat-card border-bottom-orange">
          <div className="stat-card-header flex-center justify-between width-full">
            <span className="stat-label">Permission Changes</span>
            <span className="stat-trend trend-green"><ArrowUpRight size={14} /> +24 today</span>
          </div>
          <h3 className="stat-num text-warning">24</h3>
          <div className="flex-center justify-between font-small text-muted width-full">
            <span>Role changes: 2</span>
            <span>Policy edits: 8</span>
          </div>
        </div>

        <div className="card security-stat-card border-bottom-primary">
          <div className="stat-card-header flex-center justify-between width-full">
            <span className="stat-label">Audit Logs Generated</span>
            <span className="stat-trend trend-green"><ArrowUpRight size={14} /> +5.4%</span>
          </div>
          <h3 className="stat-num">2.8M</h3>
          <div className="flex-center justify-between font-small text-muted width-full">
            <span>Retention: 365 days</span>
            <span>WAF logs included</span>
          </div>
        </div>

        <div className="card security-stat-card border-bottom-success">
          <div className="stat-card-header flex-center justify-between width-full">
            <span className="stat-label">Active MFA Users</span>
            <span className="stat-trend trend-green"><ArrowUpRight size={14} /> +12.4%</span>
          </div>
          <h3 className="stat-num text-success">1,087</h3>
          <div className="flex-center justify-between font-small text-muted width-full">
            <span>Coverage: 87.2%</span>
            <span>Admins: 100%</span>
          </div>
        </div>

        <div className="card security-stat-card border-bottom-success">
          <div className="stat-card-header flex-center justify-between width-full">
            <span className="stat-label">System Health Score</span>
            <span className="badge-live font-xsmall"><ShieldCheck size={10} /> SOC Enforced</span>
          </div>
          <h3 className="stat-num text-success">98%</h3>
          <div className="flex-center justify-between font-small text-muted width-full">
            <span>ISO 27001 Compliant</span>
            <span>Stable status</span>
          </div>
        </div>

      </div>

      {/* ==================== TAB CONTENT: SECURITY DASHBOARD ==================== */}
      {activeTab === 'dashboard' && (
        <div className="flex-column gap-6 animate-fade-in">
          
          {/* Charts grid */}
          <div className="grid-2-col">
            <div className="card chart-container-card">
              <h4 className="chart-title"><Sliders size={16} className="text-primary" /> Login Activity Trends (30 Days)</h4>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={loginActivityTrends}>
                    <defs>
                      <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="logins" name="Successful Logins" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLogins)" strokeWidth={2} />
                    <Area type="monotone" dataKey="threats" name="Blocked Threats" stroke="#ef4444" fillOpacity={1} fill="url(#colorThreats)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card chart-container-card">
              <h4 className="chart-title"><AlertTriangle size={16} className="text-danger" /> Failed Logins by Hour</h4>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={failedLoginAttempts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                    <Bar dataKey="attempts" name="Failed Attempts" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid-2-col">
            <div className="card chart-container-card flex-row gap-4 p-5 align-center justify-between">
              <div style={{ width: '50%', height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={securityEventsByType} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                      {securityEventsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-column gap-2" style={{ width: '50%' }}>
                <h4 className="chart-title" style={{ margin: 0 }}><Activity size={16} /> Events by Category</h4>
                <div className="flex-column gap-2 mt-2">
                  {securityEventsByType.map((item, idx) => (
                    <div key={item.name} className="flex-center justify-between font-small">
                      <span className="flex-center gap-2">
                        <span className="color-dot" style={{ backgroundColor: item.color, width: 10, height: 10 }}></span>
                        {item.name}
                      </span>
                      <span className="font-semibold text-primary">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card chart-container-card">
              <h4 className="chart-title"><Globe size={16} className="text-warning" /> Top Suspicious Source IPs</h4>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={suspiciousIps} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis dataKey="ip" type="category" stroke="var(--text-muted)" fontSize={11} width={100} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                    <Bar dataKey="attempts" name="Access Blocks" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Real-time feed */}
          <div className="card p-5">
            <h4 className="chart-title mb-4"><ShieldCheck size={18} className="text-success" /> Real-Time SOC Security Feed</h4>
            <div className="table-wrapper">
              <table className="sec-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>User</th>
                    <th>IP Address</th>
                    <th>Location</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogsData.slice(0, 5).map((log) => (
                    <tr key={log.id} className={log.severity === 'Critical' ? 'log-critical-row' : ''}>
                      <td>{log.timestamp}</td>
                      <td><Badge variant="info">{log.eventType}</Badge></td>
                      <td>
                        <div className="flex-center gap-2">
                          <Avatar name={log.user} size={24} />
                          <strong>{log.user}</strong>
                        </div>
                      </td>
                      <td><code>{log.ipAddress}</code></td>
                      <td>{log.location}</td>
                      <td><span className="text-muted text-xs">{log.device}</span></td>
                      <td>
                        <Badge variant={log.status === 'Success' ? 'success' : log.status === 'Warning' ? 'warning' : 'danger'}>
                          {log.status}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={log.severity === 'Critical' ? 'danger' : log.severity === 'High' ? 'warning' : 'info'}>
                          {log.severity}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB CONTENT: LOGIN SECURITY ==================== */}
      {activeTab === 'login_security' && (
        <div className="grid-2-col animate-fade-in">
          
          {/* Password Policy */}
          <form onSubmit={(e) => handleSaveSecuritySettings(e, 'Password Security Policy')} className="card config-card">
            <h3 className="config-section-title"><Key size={18} /> Password Policy Configurations</h3>
            
            <div className="form-grid-2">
              <div className="form-field">
                <label>Minimum Password Length</label>
                <input
                  type="number"
                  min="6"
                  max="20"
                  value={passPolicy.minLength}
                  onChange={(e) => setPassPolicy(p => ({ ...p, minLength: parseInt(e.target.value) || 8 }))}
                  required
                />
              </div>

              <div className="form-field">
                <label>Password Expiry Period (Days)</label>
                <input
                  type="number"
                  value={passPolicy.expiryDays}
                  onChange={(e) => setPassPolicy(p => ({ ...p, expiryDays: parseInt(e.target.value) || 90 }))}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Require Uppercase Letters</label>
                <select value={passPolicy.requireUppercase} onChange={(e) => setPassPolicy(p => ({ ...p, requireUppercase: e.target.value }))}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="form-field">
                <label>Require Lowercase Letters</label>
                <select value={passPolicy.requireLowercase} onChange={(e) => setPassPolicy(p => ({ ...p, requireLowercase: e.target.value }))}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label>Require Numbers</label>
                <select value={passPolicy.requireNumbers} onChange={(e) => setPassPolicy(p => ({ ...p, requireNumbers: e.target.value }))}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="form-field">
                <label>Require Special Characters</label>
                <select value={passPolicy.requireSpecial} onChange={(e) => setPassPolicy(p => ({ ...p, requireSpecial: e.target.value }))}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Password Reuse Restriction (Count)</label>
              <input
                type="number"
                value={passPolicy.reuseRestriction}
                onChange={(e) => setPassPolicy(p => ({ ...p, reuseRestriction: parseInt(e.target.value) || 5 }))}
                required
              />
            </div>

            <div className="toggle-field">
              <div className="toggle-label-wrap">
                <span className="toggle-title">Prevent Common Passwords</span>
                <span className="toggle-desc">Blocks simple/standard sequences like "Password123"</span>
              </div>
              <button
                type="button"
                className={`switch-btn ${passPolicy.preventCommon === 'Yes' ? 'active' : ''}`}
                onClick={() => setPassPolicy(p => ({ ...p, preventCommon: p.preventCommon === 'Yes' ? 'No' : 'Yes' }))}
              >
                <div className="switch-thumb"></div>
              </button>
            </div>

            <div className="toggle-field">
              <div className="toggle-label-wrap">
                <span className="toggle-title">Force Password Change on First Login</span>
                <span className="toggle-desc">Temporary passwords must be updated immediately</span>
              </div>
              <button
                type="button"
                className={`switch-btn ${passPolicy.firstLoginChange === 'Yes' ? 'active' : ''}`}
                onClick={() => setPassPolicy(p => ({ ...p, firstLoginChange: p.firstLoginChange === 'Yes' ? 'No' : 'Yes' }))}
              >
                <div className="switch-thumb"></div>
              </button>
            </div>

            <div className="security-alert-banner">
              <AlertTriangle size={16} className="text-warning" />
              <p>Warning: Password complexity settings are audited regularly for compliance reviews.</p>
            </div>

            <Button variant="primary" type="submit">Save Password Policies</Button>
          </form>

          {/* MFA and Login Restrictions */}
          <div className="flex-column gap-6">
            
            {/* MFA Settings */}
            <form onSubmit={(e) => handleSaveSecuritySettings(e, 'MFA Policies')} className="card config-card">
              <h3 className="config-section-title"><Fingerprint size={18} /> Multi-Factor Authentication</h3>
              
              <div className="form-field">
                <label>Enable MFA</label>
                <select value={mfaPolicy.enableMfa} onChange={(e) => setMfaPolicy(p => ({ ...p, enableMfa: e.target.value }))}>
                  <option value="Required">Required (All users must use MFA)</option>
                  <option value="Optional">Optional (Users can choose)</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              <div className="form-grid-2">
                <div className="toggle-field">
                  <span className="toggle-title text-sm">Email OTP Verification</span>
                  <button type="button" className={`switch-btn ${mfaPolicy.emailOtp ? 'active' : ''}`} onClick={() => setMfaPolicy(p => ({ ...p, emailOtp: !p.emailOtp }))}>
                    <div className="switch-thumb"></div>
                  </button>
                </div>

                <div className="toggle-field">
                  <span className="toggle-title text-sm">SMS OTP Verification</span>
                  <button type="button" className={`switch-btn ${mfaPolicy.smsOtp ? 'active' : ''}`} onClick={() => setMfaPolicy(p => ({ ...p, smsOtp: !p.smsOtp }))}>
                    <div className="switch-thumb"></div>
                  </button>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="toggle-field">
                  <span className="toggle-title text-sm">Authenticator App (TOTP)</span>
                  <button type="button" className={`switch-btn ${mfaPolicy.authenticatorApp ? 'active' : ''}`} onClick={() => setMfaPolicy(p => ({ ...p, authenticatorApp: !p.authenticatorApp }))}>
                    <div className="switch-thumb"></div>
                  </button>
                </div>

                <div className="toggle-field">
                  <span className="toggle-title text-sm">Backup Recovery Codes</span>
                  <button type="button" className={`switch-btn ${mfaPolicy.backupCodes ? 'active' : ''}`} onClick={() => setMfaPolicy(p => ({ ...p, backupCodes: !p.backupCodes }))}>
                    <div className="switch-thumb"></div>
                  </button>
                </div>
              </div>

              {mfaPolicy.authenticatorApp && (
                <div className="qr-container">
                  <div className="qr-placeholder">
                    {/* Simulated SVG QR Code */}
                    <svg width="70" height="70" viewBox="0 0 100 100">
                      <rect width="100" height="100" fill="#fff" />
                      <rect x="10" y="10" width="20" height="20" fill="#000" />
                      <rect x="70" y="10" width="20" height="20" fill="#000" />
                      <rect x="10" y="70" width="20" height="20" fill="#000" />
                      <rect x="40" y="40" width="20" height="20" fill="#000" />
                      <rect x="40" y="20" width="10" height="10" fill="#000" />
                      <rect x="70" y="70" width="20" height="20" fill="#000" />
                    </svg>
                  </div>
                  <div className="flex-column gap-1">
                    <span className="font-semibold text-xs text-primary">Authenticator Seed:</span>
                    <code className="text-xs text-secondary">SAAS-SOC-SECRET-2026</code>
                  </div>
                </div>
              )}

              <Button variant="primary" type="submit">Save MFA Configuration</Button>
            </form>

            {/* Login Restrictions */}
            <form onSubmit={(e) => handleSaveSecuritySettings(e, 'Login Access Lockouts')} className="card config-card">
              <h3 className="config-section-title"><Lock size={18} /> Access & Lockout Settings</h3>
              
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Max Failed Attempts</label>
                  <input type="number" value={loginRestrictions.maxFailedAttempts} onChange={(e) => setLoginRestrictions(r => ({ ...r, maxFailedAttempts: parseInt(e.target.value) || 5 }))} />
                </div>
                
                <div className="form-field">
                  <label>Lockout Duration (min)</label>
                  <input type="number" value={loginRestrictions.lockDuration} onChange={(e) => setLoginRestrictions(r => ({ ...r, lockDuration: parseInt(e.target.value) || 30 }))} />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Inactivity Timeout (min)</label>
                  <input type="number" value={loginRestrictions.sessionTimeout} onChange={(e) => setLoginRestrictions(r => ({ ...r, sessionTimeout: parseInt(e.target.value) || 30 }))} />
                </div>

                <div className="form-field">
                  <label>Max Concurrent Sessions</label>
                  <input type="number" value={loginRestrictions.maxConcurrent} onChange={(e) => setLoginRestrictions(r => ({ ...r, maxConcurrent: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>

              <Button variant="primary" type="submit">Save Lockout Rules</Button>
            </form>

          </div>

        </div>
      )}

      {/* ==================== TAB CONTENT: ACCESS CONTROLS ==================== */}
      {activeTab === 'access_controls' && (
        <div className="flex-column gap-6 animate-fade-in">
          
          <div className="grid-2-col">
            
            {/* Allowed IPs CRUD */}
            <div className="card config-card">
              <h3 className="config-section-title"><Globe size={18} /> Whitelisted IP Address Rules</h3>
              
              <form onSubmit={handleSaveIp} className="flex-column gap-3 mb-4 filter-wrapper-card">
                <span className="font-semibold text-xs text-secondary uppercase tracking-wider">{editingIpId ? 'Edit Whitelist Entry' : 'Create Whitelist Rule'}</span>
                
                <div className="form-grid-2">
                  <div className="form-field">
                    <label>IP Address / Block</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.50"
                      value={ipForm.ip}
                      onChange={(e) => setIpForm(prev => ({ ...prev, ip: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Purpose Category</label>
                    <select value={ipForm.purpose} onChange={(e) => setIpForm(prev => ({ ...prev, purpose: e.target.value }))}>
                      <option value="Office Network">Office Network</option>
                      <option value="Branch Network">Branch Network</option>
                      <option value="VPN Network">VPN Network</option>
                      <option value="Remote Access">Remote Access</option>
                      <option value="Partner Access">Partner Access</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>IP Range (Start)</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.1"
                      value={ipForm.startRange}
                      onChange={(e) => setIpForm(prev => ({ ...prev, startRange: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>IP Range (End)</label>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.254"
                      value={ipForm.endRange}
                      onChange={(e) => setIpForm(prev => ({ ...prev, endRange: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-field">
                    <label>Office / Location Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Head Office HQ"
                      value={ipForm.location}
                      onChange={(e) => setIpForm(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div className="form-field">
                    <label>Rule Status</label>
                    <select value={ipForm.status} onChange={(e) => setIpForm(prev => ({ ...prev, status: e.target.value }))}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex-center gap-2 mt-2">
                  <Button variant="primary" type="submit" icon={Plus}>
                    {editingIpId ? 'Update Rule' : 'Add Rule'}
                  </Button>
                  {editingIpId && (
                    <Button variant="ghost" onClick={() => {
                      setEditingIpId(null);
                      setIpForm({ ip: '', startRange: '', endRange: '', location: '', purpose: 'Office Network', status: 'Active' });
                    }}>Cancel</Button>
                  )}
                </div>
              </form>

              {/* IP Whitelist Table */}
              <div className="table-wrapper">
                <table className="sec-table">
                  <thead>
                    <tr>
                      <th>IP & Ranges</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowedIps.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex-column">
                            <strong>{item.ip}</strong>
                            {item.startRange && <span className="text-muted text-xs">({item.startRange} - {item.endRange})</span>}
                          </div>
                        </td>
                        <td><Badge variant="info">{item.purpose}</Badge></td>
                        <td>{item.location || '—'}</td>
                        <td><Badge variant={item.status === 'Active' ? 'success' : 'secondary'}>{item.status}</Badge></td>
                        <td>
                          <div className="flex-center gap-2">
                            <button className="icon-btn text-warning" onClick={() => handleEditIpClick(item)} title="Edit IP rule"><Edit size={14} /></button>
                            <button className="icon-btn text-danger" onClick={() => handleDeleteIp(item.id, item.ip)} title="Remove IP rule"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Blocked IPs Section */}
            <div className="card config-card">
              <h3 className="config-section-title"><ShieldAlert size={18} className="text-danger" /> Restricted / Blocked IPs (WAF Auto-blocks)</h3>
              
              <div className="table-wrapper">
                <table className="sec-table">
                  <thead>
                    <tr>
                      <th>Blocked IP</th>
                      <th>Reason</th>
                      <th>Attempts</th>
                      <th>Blocked Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restrictedIps.map(item => (
                      <tr key={item.id} className="log-critical-row">
                        <td><code>{item.ipAddress}</code></td>
                        <td><span className="text-danger font-semibold">{item.reason}</span></td>
                        <td><strong>{item.attempts} times</strong></td>
                        <td><span className="text-muted text-xs">{item.blockDate}</span></td>
                        <td>
                          <Button variant="ghost" size="sm" onClick={() => handleUnblockIp(item.id, item.ipAddress)}>
                            Unblock IP
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Device & Login Timings Restrictions */}
          <div className="grid-2-col">
            
            {/* Device restrictions */}
            <div className="card config-card">
              <h3 className="config-section-title"><Laptop size={18} /> Device Control & Registered Clients</h3>
              
              <div className="form-grid-2 mb-4">
                <div className="form-field">
                  <label>Restrict by Device Type</label>
                  <select value={deviceConfig.restrictDeviceType} onChange={(e) => setDeviceConfig(prev => ({ ...prev, restrictDeviceType: e.target.value }))}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Require Device Registration</label>
                  <select value={deviceConfig.requireRegistration} onChange={(e) => setDeviceConfig(prev => ({ ...prev, requireRegistration: e.target.value }))}>
                    <option value="Yes">Yes (New logins must be approved)</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              {/* Devices Registry Table */}
              <div className="table-wrapper">
                <table className="sec-table">
                  <thead>
                    <tr>
                      <th>Device Name</th>
                      <th>OS & Browser</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authorizedDevices.map(dev => (
                      <tr key={dev.id}>
                        <td>
                          <div className="flex-column">
                            <strong>{dev.name}</strong>
                            <span className="text-muted text-xs">Type: {dev.type}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs">{dev.os} / {dev.browser}</span>
                        </td>
                        <td>{dev.registeredBy}</td>
                        <td>
                          <Badge variant={dev.status === 'Active' ? 'success' : dev.status === 'Blocked' ? 'danger' : 'warning'}>
                            {dev.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleDeviceStatus(dev.id, dev.name, dev.status)}>
                              {dev.status === 'Active' ? 'Block' : 'Activate'}
                            </Button>
                            <button className="icon-btn text-danger" onClick={() => handleRemoveDevice(dev.id, dev.name)} title="Remove device"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Timings restrictions */}
            <form onSubmit={(e) => handleSaveSecuritySettings(e, 'Access Timing Policies')} className="card config-card">
              <h3 className="config-section-title"><Calendar size={18} /> Login Timing & Location Restrictions</h3>
              
              <div className="toggle-field">
                <div className="toggle-label-wrap">
                  <span className="toggle-title">Restrict Logins by Work Hours</span>
                  <span className="toggle-desc">Blocks system accesses outside standard shift periods</span>
                </div>
                <button
                  type="button"
                  className={`switch-btn ${timingConfig.restrictByTime === 'Yes' ? 'active' : ''}`}
                  onClick={() => setTimingConfig(prev => ({ ...prev, restrictByTime: prev.restrictByTime === 'Yes' ? 'No' : 'Yes' }))}
                >
                  <div className="switch-thumb"></div>
                </button>
              </div>

              {timingConfig.restrictByTime === 'Yes' && (
                <div className="form-grid-2 animate-slide-up">
                  <div className="form-field">
                    <label>Allowed Workday Start</label>
                    <input type="text" value={timingConfig.officeStart} onChange={(e) => setTimingConfig(prev => ({ ...prev, officeStart: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label>Allowed Workday End</label>
                    <input type="text" value={timingConfig.officeEnd} onChange={(e) => setTimingConfig(prev => ({ ...prev, officeEnd: e.target.value }))} />
                  </div>
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Weekend Admin Access Allowed</label>
                  <select value={timingConfig.weekendAllowed} onChange={(e) => setTimingConfig(prev => ({ ...prev, weekendAllowed: e.target.value }))}>
                    <option value="Yes">Yes</option>
                    <option value="No">No (Strictly Blocked)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Holiday Admin Access Allowed</label>
                  <select value={timingConfig.holidayAllowed} onChange={(e) => setTimingConfig(prev => ({ ...prev, holidayAllowed: e.target.value }))}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="form-field mt-2">
                <label>Geographic Boundary Login (Allowed Locations)</label>
                <select value={timingConfig.restrictByLocation} onChange={(e) => setTimingConfig(prev => ({ ...prev, restrictByLocation: e.target.value }))}>
                  <option value="No">No Restrictions (Global Access)</option>
                  <option value="Yes">Limit to Certified Offices/Countries only</option>
                </select>
              </div>

              <Button variant="primary" type="submit">Save Access Restrictions</Button>
            </form>

          </div>

        </div>
      )}

      {/* ==================== TAB CONTENT: SESSION MANAGEMENT ==================== */}
      {activeTab === 'sessions' && (
        <div className="flex-column gap-4 animate-fade-in">
          
          <div className="filter-wrapper-card flex-between gap-4 wrap-content">
            <div className="flex-center gap-3 wrap-content">
              <div className="search-box position-relative flex-center">
                <Search size={16} className="text-muted" style={{ position: 'absolute', left: 10 }} />
                <input
                  type="text"
                  placeholder="Search user, ID or IP..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  style={{ paddingLeft: 32, height: 36, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.8rem' }}
                />
              </div>

              <select
                value={sessionRoleFilter}
                onChange={(e) => setSessionRoleFilter(e.target.value)}
                className="sec-selector"
                style={{ height: 36, padding: '0 10px', minWidth: 150 }}
              >
                <option value="All">All Roles</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Branch Admin">Branch Admin</option>
                <option value="Team Leader">Team Leader</option>
                <option value="Employee">Employee</option>
              </select>
            </div>

            <div className="flex-center gap-3">
              <Button variant="ghost" onClick={() => handleExportData('Active Admin Sessions', 'CSV')} icon={Download}>Export CSV</Button>
              <Button variant="danger" onClick={handleForceLogoutAll} icon={X}>Force Logout All</Button>
            </div>
          </div>

          <div className="card p-5">
            <div className="table-wrapper">
              <table className="sec-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>ID & Role</th>
                    <th>Login Time</th>
                    <th>Last Activity</th>
                    <th>Session Duration</th>
                    <th>Browser / OS</th>
                    <th>IP Address & Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map(session => (
                    <tr key={session.id}>
                      <td>
                        <div className="flex-center gap-2">
                          <Avatar name={session.employeeName} size={32} />
                          <strong>{session.employeeName}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="flex-column">
                          <code>{session.employeeId}</code>
                          <Badge variant="info">{session.role}</Badge>
                        </div>
                      </td>
                      <td>{session.loginTime}</td>
                      <td>{session.lastActivity}</td>
                      <td>{session.duration}</td>
                      <td><span className="text-xs">{session.browser} / {session.os}</span></td>
                      <td>
                        <div className="flex-column">
                          <code>{session.ipAddress}</code>
                          <span className="text-muted text-xs">{session.location}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={session.status === 'Active' ? 'success' : 'warning'}>
                          {session.status}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedSession(session);
                            setShowSessionModal(true);
                          }}>View</Button>
                          {session.id !== 'SES-001' && (
                            <Button variant="danger" size="sm" onClick={() => handleForceLogoutSession(session.id, session.employeeName)}>
                              Force Logout
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB CONTENT: SECURITY ALERTS ==================== */}
      {activeTab === 'alerts' && (
        <div className="flex-column gap-6 animate-fade-in">
          
          {/* Alerts Summary counts */}
          <div className="grid-4-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            
            <div className="card p-4 flex-between align-center" style={{ borderLeft: '4px solid #ef4444' }}>
              <div className="flex-column">
                <span className="text-muted font-semibold text-xs uppercase">Critical Alerts</span>
                <h3 className="text-danger mt-1">2</h3>
              </div>
              <span style={{ fontSize: 24 }}>🔴</span>
            </div>

            <div className="card p-4 flex-between align-center" style={{ borderLeft: '4px solid #f97316' }}>
              <div className="flex-column">
                <span className="text-muted font-semibold text-xs uppercase">High Alerts</span>
                <h3 className="text-warning mt-1">5</h3>
              </div>
              <span style={{ fontSize: 24 }}>🟠</span>
            </div>

            <div className="card p-4 flex-between align-center" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="flex-column">
                <span className="text-muted font-semibold text-xs uppercase">Medium Alerts</span>
                <h3 className="text-warning mt-1">3</h3>
              </div>
              <span style={{ fontSize: 24 }}>🟡</span>
            </div>

            <div className="card p-4 flex-between align-center" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="flex-column">
                <span className="text-muted font-semibold text-xs uppercase">Low Alerts</span>
                <h3 className="text-info mt-1">2</h3>
              </div>
              <span style={{ fontSize: 24 }}>🔵</span>
            </div>

          </div>

          {/* Alerts Controls */}
          <div className="filter-wrapper-card flex-between align-center">
            <span className="font-semibold text-sm">Real-time alerts monitoring</span>
            <Button variant="ghost" onClick={handleClearAlerts} icon={CheckCircle}>Resolve All Alerts</Button>
          </div>

          {/* Alerts Table */}
          <div className="card p-5">
            <div className="table-wrapper">
              <table className="sec-table">
                <thead>
                  <tr>
                    <th>Alert ID</th>
                    <th>Timestamp</th>
                    <th>Severity</th>
                    <th>Alert Type</th>
                    <th>Description</th>
                    <th>Affected User</th>
                    <th>Source IP & Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {securityAlerts.map(alt => (
                    <tr key={alt.id} className={alt.severity === 'Critical' ? 'log-critical-row' : ''}>
                      <td><code>{alt.id}</code></td>
                      <td>{alt.timestamp}</td>
                      <td>
                        <Badge variant={alt.severity === 'Critical' ? 'danger' : alt.severity === 'High' ? 'warning' : alt.severity === 'Medium' ? 'warning' : 'info'}>
                          {alt.severity}
                        </Badge>
                      </td>
                      <td><strong>{alt.alertType}</strong></td>
                      <td><p className="text-xs" style={{ maxWidth: 220 }}>{alt.description}</p></td>
                      <td>{alt.user}</td>
                      <td>
                        <div className="flex-column">
                          <code>{alt.ipAddress}</code>
                          <span className="text-muted text-xs">{alt.location}</span>
                        </div>
                      </td>
                      <td>
                        <select
                          value={alt.status}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSecurityAlerts(prev => prev.map(a => a.id === alt.id ? { ...a, status: val } : a));
                            addPageToast('success', `Alert ${alt.id} marked as ${val}`);
                          }}
                          className="sec-selector"
                          style={{ height: 28, fontSize: '0.75rem', minWidth: 100, padding: 0 }}
                        >
                          <option value="New">New</option>
                          <option value="Investigating">Investigating</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Ignored">Ignored</option>
                        </select>
                      </td>
                      <td>
                        <div className="flex-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedAlert(alt);
                            setShowAlertModal(true);
                          }}>Details</Button>
                          {alt.status !== 'Resolved' && (
                            <Button variant="primary" size="sm" onClick={() => handleResolveAlert(alt.id)}>Resolve</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB CONTENT: AUDIT LOGS ==================== */}
      {activeTab === 'audit' && (
        <div className="flex-column gap-4 animate-fade-in">
          
          {/* Summary categories */}
          <div className="grid-3-col">
            <div className="card p-4 flex-center gap-3">
              <span style={{ fontSize: 24 }}>🔐</span>
              <div className="flex-column">
                <span className="text-muted text-xs font-semibold uppercase">Authentication Logs</span>
                <span className="font-bold text-lg text-primary">845,230 Events</span>
              </div>
            </div>

            <div className="card p-4 flex-center gap-3">
              <span style={{ fontSize: 24 }}>✏️</span>
              <div className="flex-column">
                <span className="text-muted text-xs font-semibold uppercase">Data Modifications</span>
                <span className="font-bold text-lg text-primary">348,920 Changes</span>
              </div>
            </div>

            <div className="card p-4 flex-center gap-3">
              <span style={{ fontSize: 24 }}>⚙️</span>
              <div className="flex-column">
                <span className="text-muted text-xs font-semibold uppercase">Admin Actions</span>
                <span className="font-bold text-lg text-primary">28,450 Records</span>
              </div>
            </div>
          </div>

          {/* Search & Filters Section */}
          <div className="card filter-wrapper-card flex-column gap-3">
            
            <div className="sec-filters-row">
              <div className="filter-group">
                <label>Search Audit Logs</label>
                <input
                  type="text"
                  placeholder="User, action, module, IP..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Event Type</label>
                <select value={filterEventType} onChange={(e) => setFilterEventType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="Login">Login</option>
                  <option value="Failed Login">Failed Login</option>
                  <option value="Password Change">Password Change</option>
                  <option value="Permission Change">Permission Change</option>
                  <option value="Create">Create</option>
                  <option value="Update">Update</option>
                  <option value="Delete">Delete</option>
                  <option value="Export">Export</option>
                </select>
              </div>

              <div className="filter-group">
                <label>System Module</label>
                <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
                  <option value="All">All Modules</option>
                  <option value="Authentication">Authentication</option>
                  <option value="Security">Security</option>
                  <option value="Employee">Employee</option>
                  <option value="Task">Task</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Leaves">Leaves</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Severity</label>
                <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Info">Info</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Operator Role</label>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                  <option value="All">All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Branch Admin">Branch Admin</option>
                  <option value="Team Leader">Team Leader</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
            </div>

            <div className="flex-between align-center mt-2 wrap-content gap-3">
              <span className="font-small text-muted">Showing {filteredAuditLogs.length} audit logs</span>
              <div className="flex-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleExportData('Audit Logs Filtered', 'Excel')} icon={Download}>Export Excel</Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setAuditSearch('');
                  setFilterEventType('All');
                  setFilterModule('All');
                  setFilterRole('All');
                  setFilterStatus('All');
                  setFilterSeverity('All');
                }}>Reset Filters</Button>
              </div>
            </div>

          </div>

          {/* Audit Logs Table */}
          <div className="card p-5">
            <div className="table-wrapper">
              <table className="sec-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Event</th>
                    <th>Module</th>
                    <th>Action Details</th>
                    <th>IP Address</th>
                    <th>Severity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map(log => (
                    <tr key={log.id} className={log.severity === 'Critical' ? 'log-critical-row' : ''}>
                      <td><code>{log.id}</code></td>
                      <td>{log.timestamp}</td>
                      <td><strong>{log.user}</strong></td>
                      <td><Badge variant="info">{log.role}</Badge></td>
                      <td><Badge variant="secondary">{log.eventType}</Badge></td>
                      <td><span className="font-semibold text-xs">{log.module}</span></td>
                      <td><p className="text-xs" style={{ maxWidth: 240 }}>{log.action}</p></td>
                      <td><code>{log.ipAddress}</code></td>
                      <td>
                        <Badge variant={log.severity === 'Critical' ? 'danger' : log.severity === 'High' ? 'warning' : 'info'}>
                          {log.severity}
                        </Badge>
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedAuditLog(log);
                          setShowLogModal(true);
                        }}>Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* 1. Active Session Details Modal */}
      {showSessionModal && selectedSession && (
        <div className="modal-backdrop flex-center">
          <div className="modal-content card p-6 animate-zoom-in" style={{ width: 500 }}>
            <div className="flex-between align-center mb-4">
              <h3 className="title-bold">User Session Details</h3>
              <button className="icon-btn text-muted" onClick={() => setShowSessionModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-4">
              
              <div className="flex-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <Avatar name={selectedSession.employeeName} size={48} />
                <div className="flex-column">
                  <strong className="text-lg text-primary">{selectedSession.employeeName}</strong>
                  <span className="text-xs text-muted">ID: {selectedSession.employeeId} | Role: {selectedSession.role}</span>
                </div>
              </div>

              <div className="grid-2-col gap-4">
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Login Time</span>
                  <span className="font-medium text-sm text-primary">{selectedSession.loginTime}</span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Last Activity</span>
                  <span className="font-medium text-sm text-primary">{selectedSession.lastActivity}</span>
                </div>
              </div>

              <div className="grid-2-col gap-4">
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Device Model</span>
                  <span className="font-medium text-sm text-primary">{selectedSession.deviceType}</span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Browser & OS</span>
                  <span className="font-medium text-sm text-primary">{selectedSession.browser} on {selectedSession.os}</span>
                </div>
              </div>

              <div className="grid-2-col gap-4">
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">IP Address</span>
                  <span className="font-medium text-sm text-primary"><code>{selectedSession.ipAddress}</code></span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Geographic Location</span>
                  <span className="font-medium text-sm text-primary">{selectedSession.location}</span>
                </div>
              </div>

              <div className="flex-column gap-2 p-3 mt-2" style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                <span className="text-muted text-xs font-semibold uppercase">Recent Activities</span>
                <ul className="flex-column gap-1 text-xs" style={{ paddingLeft: 16 }}>
                  <li>Logged in via portal gateway (Success)</li>
                  <li>Accessed Security Dashboard</li>
                  <li>Viewed System Settings</li>
                </ul>
              </div>

              <div className="flex-center justify-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <Button variant="ghost" onClick={() => setShowSessionModal(false)}>Close</Button>
                {selectedSession.id !== 'SES-001' && (
                  <Button variant="danger" onClick={() => {
                    handleForceLogoutSession(selectedSession.id, selectedSession.employeeName);
                    setShowSessionModal(false);
                  }}>Force Logout</Button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 2. Security Alert Details Modal */}
      {showAlertModal && selectedAlert && (
        <div className="modal-backdrop flex-center">
          <div className="modal-content card p-6 animate-zoom-in" style={{ width: 550 }}>
            <div className="flex-between align-center mb-4">
              <h3 className="title-bold">Security Alert Analysis</h3>
              <button className="icon-btn text-muted" onClick={() => setShowAlertModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-4">
              
              <div className="flex-between align-center pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-column">
                  <strong className="text-lg text-primary">{selectedAlert.alertType}</strong>
                  <span className="text-xs text-muted">Alert ID: {selectedAlert.id} | Timestamp: {selectedAlert.timestamp}</span>
                </div>
                <Badge variant={selectedAlert.severity === 'Critical' ? 'danger' : selectedAlert.severity === 'High' ? 'warning' : 'info'}>
                  {selectedAlert.severity}
                </Badge>
              </div>

              <div className="flex-column gap-1">
                <span className="text-muted text-xs font-semibold uppercase">Description</span>
                <p className="text-sm text-primary">{selectedAlert.description}</p>
              </div>

              <div className="grid-2-col gap-4">
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Affected Account</span>
                  <span className="font-medium text-sm text-primary">{selectedAlert.user}</span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Threat Severity</span>
                  <span className="font-medium text-sm text-primary">{selectedAlert.severity} Level Threat</span>
                </div>
              </div>

              <div className="grid-2-col gap-4">
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Source IP Address</span>
                  <span className="font-medium text-sm text-primary"><code>{selectedAlert.ipAddress}</code></span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Threat Location</span>
                  <span className="font-medium text-sm text-primary">{selectedAlert.location}</span>
                </div>
              </div>

              <div className="flex-column gap-2 p-3 mt-2" style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>
                <span className="text-danger text-xs font-semibold uppercase">Recommended SOC Actions</span>
                <ul className="flex-column gap-1 text-xs text-secondary" style={{ paddingLeft: 16 }}>
                  <li>Temporarily suspend user authentication tokens.</li>
                  <li>Verify matching activity logs in Audit Trail.</li>
                  <li>Block source IP address range if unauthorized.</li>
                </ul>
              </div>

              <div className="flex-center justify-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <Button variant="ghost" onClick={() => setShowAlertModal(false)}>Close</Button>
                {selectedAlert.status !== 'Resolved' && (
                  <Button variant="primary" onClick={() => {
                    handleResolveAlert(selectedAlert.id);
                    setShowAlertModal(false);
                  }}>Resolve Alert</Button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 3. Audit Log Details Modal */}
      {showLogModal && selectedAuditLog && (
        <div className="modal-backdrop flex-center">
          <div className="modal-content card p-6 animate-zoom-in" style={{ width: 600 }}>
            <div className="flex-between align-center mb-4">
              <h3 className="title-bold">System Audit Details</h3>
              <button className="icon-btn text-muted" onClick={() => setShowLogModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-4">
              
              <div className="flex-between align-center pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex-column">
                  <strong className="text-lg text-primary">{selectedAuditLog.action}</strong>
                  <span className="text-xs text-muted">Log ID: {selectedAuditLog.id} | Timestamp: {selectedAuditLog.timestamp}</span>
                </div>
                <Badge variant={selectedAuditLog.status === 'Success' ? 'success' : 'danger'}>
                  {selectedAuditLog.status}
                </Badge>
              </div>

              <div className="grid-3-col gap-4">
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Operator Name</span>
                  <span className="font-medium text-sm text-primary">{selectedAuditLog.user}</span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Employee ID</span>
                  <span className="font-medium text-sm text-primary"><code>{selectedAuditLog.empId}</code></span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Operator Role</span>
                  <span className="font-medium text-sm text-primary">{selectedAuditLog.role}</span>
                </div>
              </div>

              <div className="grid-3-col gap-4">
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Event Type</span>
                  <span className="font-medium text-sm text-primary">{selectedAuditLog.eventType}</span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">System Module</span>
                  <span className="font-medium text-sm text-primary">{selectedAuditLog.module}</span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Event Severity</span>
                  <Badge variant={selectedAuditLog.severity === 'High' || selectedAuditLog.severity === 'Critical' ? 'danger' : 'info'}>
                    {selectedAuditLog.severity}
                  </Badge>
                </div>
              </div>

              <div className="grid-3-col gap-4">
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">IP Address</span>
                  <span className="font-medium text-sm text-primary"><code>{selectedAuditLog.ipAddress}</code></span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Device Info</span>
                  <span className="font-medium text-sm text-primary">{selectedAuditLog.device}</span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Geographic Location</span>
                  <span className="font-medium text-sm text-primary">{selectedAuditLog.location}</span>
                </div>
              </div>

              <div className="grid-2-col gap-4 p-3" style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Value (Before Change)</span>
                  <span className="font-mono text-xs text-secondary mt-1">{selectedAuditLog.oldVal}</span>
                </div>
                <div className="flex-column">
                  <span className="text-muted text-xs font-semibold uppercase">Value (After Change)</span>
                  <span className="font-mono text-xs text-success mt-1">{selectedAuditLog.newVal}</span>
                </div>
              </div>

              <div className="flex-center justify-end gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                <Button variant="primary" onClick={() => setShowLogModal(false)}>Close</Button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SecurityAudit;
