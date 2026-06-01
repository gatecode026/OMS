import React, { useState, useMemo } from 'react';
import './Attendance.css';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  Download, Calendar, Filter, Edit2, Search, Clock, Plus,
  AlertCircle, Sparkles, Check, CheckCircle2, UserCheck,
  UserMinus, ShieldAlert, Award, ArrowUpRight, ShieldCheck,
  Activity, MapPin, Globe, Zap, Bell, BarChart2, FileText,
  RefreshCw, Settings, Users, Cpu, TrendingUp, TrendingDown,
  ChevronRight, AlertTriangle, CheckSquare, Coffee, Home,
  Smartphone, Fingerprint, Wifi, Eye, Share2, MoreHorizontal,
  Target, Layers, BookOpen
} from 'lucide-react';

const Attendance = () => {
  const isLoading = usePageLoading(600);
  const navigate = useNavigate();
  const {
    attendance,
    employees,
    updateAttendanceRecord,
    addAttendanceRecord,
    updateEmployee,
    addToast
  } = useApp();

  // Active view tab state
  const [activeSection, setActiveSection] = useState('overview');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('2026-05-29');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Edit record states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    punchIn: '',
    punchOut: '',
    totalHours: 0,
    status: 'Present',
    source: 'Biometric'
  });

  // Mark Attendance state
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [markFormData, setMarkFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    branch: '',
    date: '2026-05-29',
    punchIn: '09:00 AM',
    punchOut: '06:00 PM',
    breakTime: '45 mins',
    totalHours: 8.25,
    status: 'Present',
    source: 'Biometric'
  });

  // Assign Shift state
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftFormData, setShiftFormData] = useState({
    employeeId: '',
    shift: 'Morning (09:00 AM - 06:00 PM)'
  });

  // Modals Actions
  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    setEditFormData({
      date: record.date || '',
      punchIn: record.punchIn || '',
      punchOut: record.punchOut || '',
      totalHours: record.totalHours || 0,
      status: record.status || 'Present',
      source: record.source || 'Biometric'
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedRecord) return;
    updateAttendanceRecord(selectedRecord.id, editFormData);
    setEditModalOpen(false);
  };

  const handleMarkSubmit = () => {
    if (!markFormData.employeeId || !markFormData.employeeName) {
      addToast('error', 'Please select an employee.');
      return;
    }
    const empData = employees.find(e => e.id === markFormData.employeeId);
    const record = {
      id: `ATT-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: markFormData.employeeId,
      employeeName: markFormData.employeeName,
      department: markFormData.department || empData?.department || 'Engineering',
      branch: markFormData.branch || empData?.branch || 'Jaipur',
      date: markFormData.date,
      punchIn: markFormData.punchIn,
      punchOut: markFormData.punchOut,
      breakTime: markFormData.breakTime,
      totalHours: parseFloat(markFormData.totalHours) || 8.0,
      status: markFormData.status,
      source: markFormData.source
    };
    addAttendanceRecord(record);
    setMarkModalOpen(false);
    setMarkFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      branch: '',
      date: '2026-05-29',
      punchIn: '09:00 AM',
      punchOut: '06:00 PM',
      breakTime: '45 mins',
      totalHours: 8.25,
      status: 'Present',
      source: 'Biometric'
    });
  };

  const handleShiftSubmit = () => {
    if (!shiftFormData.employeeId) {
      addToast('error', 'Please select an employee.');
      return;
    }
    const empData = employees.find(e => e.id === shiftFormData.employeeId);
    if (!empData) return;
    updateEmployee(shiftFormData.employeeId, { shift: shiftFormData.shift });
    addToast('success', `Assigned ${shiftFormData.shift} to ${empData.name}`);
    setShiftModalOpen(false);
  };

  const handleRequestAttendance = () => {
    addToast('success', 'Attendance check-in reminder request broadcasted to all active employees.');
  };

  const handleApproveAll = () => {
    addToast('success', 'All pending attendance entries approved successfully.');
  };

  const handleScheduleReport = () => {
    addToast('info', 'Monthly automatic attendance report scheduled for the 1st of every month.');
  };

  // Process and Filter Attendance Ledger
  const ledgerData = useMemo(() => {
    return attendance.map(item => {
      const empDetails = employees.find(e => e.id === item.employeeId || e.name === item.employeeName);
      return {
        ...item,
        employeeId: item.employeeId || empDetails?.id || 'EMP-2026-999',
        shift: empDetails?.shift || 'Flexible (09:00 AM - 06:00 PM)',
        source: item.source || 'Biometric',
        breakTime: item.breakTime || '45 mins',
        overtime: item.overtime || (item.totalHours > 8 ? `${(item.totalHours - 8).toFixed(1)} hrs` : '0 hrs')
      };
    });
  }, [attendance, employees]);

  // Filter Predicates
  const filteredAttendance = useMemo(() => {
    return ledgerData.filter(a => {
      const matchesSearch = searchQuery
        ? a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDate = dateFilter ? a.date === dateFilter : true;
      const matchesDept = deptFilter ? a.department === deptFilter : true;
      const matchesBranch = branchFilter ? a.branch === branchFilter : true;
      const matchesShift = shiftFilter ? a.shift.toLowerCase().includes(shiftFilter.toLowerCase()) : true;
      const matchesStatus = statusFilter ? a.status.toLowerCase() === statusFilter.toLowerCase() : true;
      const matchesSource = sourceFilter ? a.source.toLowerCase() === sourceFilter.toLowerCase() : true;

      return matchesSearch && matchesDate && matchesDept && matchesBranch && matchesShift && matchesStatus && matchesSource;
    });
  }, [ledgerData, searchQuery, dateFilter, deptFilter, branchFilter, shiftFilter, statusFilter, sourceFilter]);

  // Calculations for Summary Statistics
  const totalEmployees = 1250;
  const totalPresent = filteredAttendance.filter(a => ['Present', 'Overtime'].includes(a.status)).length;
  const totalLate = filteredAttendance.filter(a => a.status === 'Late').length;
  const totalAbsent = filteredAttendance.filter(a => a.status === 'Absent').length;
  const totalLeave = filteredAttendance.filter(a => ['On Leave', 'Leave'].includes(a.status)).length;
  const totalWFH = filteredAttendance.filter(a => ['Work From Home', 'WFH'].includes(a.status)).length;
  const totalHalfDay = filteredAttendance.filter(a => ['Half Day', 'Half-Day'].includes(a.status)).length;
  const attendanceRate = totalEmployees > 0 ? Math.round(((totalPresent + totalHalfDay + totalWFH) / Math.max(filteredAttendance.length, 1)) * 100) : 94;

  const handleExport = (format = 'CSV') => {
    addToast('success', `Export generated! attendance_report_${dateFilter || 'all'}.${format.toLowerCase()} downloaded successfully.`);
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    let variant = 'neutral';
    let text = status;
    if (status === 'Present') { variant = 'success'; text = '✅ Present'; }
    else if (status === 'Late') { variant = 'warning'; text = '🕐 Late'; }
    else if (status === 'Absent') { variant = 'danger'; text = '❌ Absent'; }
    else if (status === 'Half Day' || status === 'Half-Day') { variant = 'info'; text = '🌗 Half Day'; }
    else if (status === 'Work From Home' || status === 'WFH') { variant = 'info'; text = '🏠 WFH'; }
    else if (status === 'On Leave' || status === 'Leave') { variant = 'warning'; text = '🌴 Leave'; }
    else if (status === 'Overtime') { variant = 'success'; text = '⏰ Overtime'; }
    return <Badge variant={variant}>{text}</Badge>;
  };

  // Data Table Columns
  const columns = [
    {
      key: 'employeeId',
      header: 'Emp ID',
      sortable: true,
      render: (row) => (
        <span
          className="clickable-emp-name"
          onClick={() => navigate(`/employees/${row.employeeId}?tab=attendance_punch`)}
          style={{ fontFamily: 'monospace', fontWeight: 600 }}
        >
          {row.employeeId}
        </span>
      )
    },
    {
      key: 'employeeName',
      header: 'Employee Name',
      sortable: true,
      render: (row) => (
        <div
          className="flex-center gap-3 justify-start clickable-emp-name"
          onClick={() => navigate(`/employees/${row.employeeId}?tab=attendance_punch`)}
        >
          <Avatar name={row.employeeName} size="sm" />
          <span className="emp-name-bold">{row.employeeName}</span>
        </div>
      )
    },
    {
      key: 'deptBranch',
      header: 'Dept & Branch',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.department}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{row.branch}</span>
        </div>
      )
    },
    { key: 'shift', header: 'Shift', sortable: true },
    { key: 'punchIn', header: 'Punch In', sortable: true },
    { key: 'punchOut', header: 'Punch Out', sortable: true },
    { key: 'breakTime', header: 'Break', sortable: true },
    {
      key: 'totalHours',
      header: 'Hours',
      sortable: true,
      render: (row) => <span>{row.totalHours > 0 ? `${row.totalHours} hrs` : '--'}</span>
    },
    { key: 'overtime', header: 'Overtime', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => getStatusBadge(row.status)
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (row) => (
        <span className="att-source-tag" title="Source Device">
          {row.source === 'Biometric' ? '⚙️ Bio' : row.source === 'GPS' ? '📍 GPS' : row.source === 'RFID' ? '💳 RFID' : '💻 Web'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          className="circle-action-btn btn-success-circle"
          onClick={() => handleOpenEdit(row)}
          title="Edit Log"
          style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Edit2 size={12} />
        </button>
      )
    }
  ];

  // Live punch feed data
  const livePunchFeed = [
    { name: 'Rahul Sharma', action: 'Punched In', time: '09:02 AM', source: 'Biometric', type: 'in', dept: 'Engineering' },
    { name: 'Priya Verma', action: 'Punched Out', time: '06:15 PM', source: 'Web Portal', type: 'out', dept: 'Marketing' },
    { name: 'Amit Bose', action: 'Punched In', time: '09:00 AM', source: 'Mobile App', type: 'in', dept: 'Sales' },
    { name: 'Ananya Gupta', action: 'Late Punch In', time: '09:35 AM', source: 'Biometric', type: 'late', dept: 'HR' },
    { name: 'Vijay Chauhan', action: 'WFH Check-in', time: '09:00 AM', source: 'GPS Location', type: 'wfh', dept: 'Operations' },
    { name: 'Meena Sharma', action: 'Break Started', time: '01:05 PM', source: 'Biometric', type: 'break', dept: 'Finance' },
  ];

  // Department-wise breakdown
  const deptBreakdown = [
    { name: 'Engineering', present: 42, total: 50, color: '#4ade80' },
    { name: 'Marketing', present: 18, total: 22, color: '#60a5fa' },
    { name: 'Sales', present: 28, total: 35, color: '#fbbf24' },
    { name: 'Operations', present: 15, total: 20, color: '#a78bfa' },
    { name: 'Human Resources', present: 10, total: 12, color: '#f472b6' },
  ];

  // Leave data
  const leaveData = [
    { type: 'Casual Leave', availed: 3, total: 12, color: '#60a5fa' },
    { type: 'Sick Leave', availed: 1, total: 8, color: '#f87171' },
    { type: 'Privilege Leave', availed: 5, total: 15, color: '#4ade80' },
    { type: 'Maternity Leave', availed: 0, total: 90, color: '#f472b6' },
  ];

  // Automation rules
  const automationRules = [
    { name: 'Auto Mark Absent', desc: 'Mark absent if no punch by 11 AM', active: true, icon: UserMinus },
    { name: 'Late Alert Email', desc: 'Send email when employee is 30+ min late', active: true, icon: Bell },
    { name: 'OT Calculation', desc: 'Calculate overtime automatically post 8 hrs', active: true, icon: Clock },
    { name: 'Monthly Report', desc: 'Auto-send reports on 1st of each month', active: false, icon: FileText },
    { name: 'Leave Deduction', desc: 'Auto deduct from leave balance on absence', active: true, icon: Target },
    { name: 'SMS Notification', desc: 'Send SMS for consecutive 3-day absences', active: false, icon: Smartphone },
  ];

  // Country/location data
  const locationData = [
    { country: 'India', offices: ['Jaipur', 'Delhi', 'Mumbai', 'Bangalore'], employees: 850, active: 782 },
    { country: 'US', offices: ['New York', 'San Francisco'], employees: 220, active: 198 },
    { country: 'UK', offices: ['London'], employees: 90, active: 84 },
    { country: 'UAE', offices: ['Dubai'], employees: 90, active: 80 },
  ];

  if (isLoading) {
    return (
      <div className="attendance-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="att-skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: '110px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: '400px' }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="attendance-page flex-column grid-gap">

      {/* ═══ Page Header ═══ */}
      <div className="att-page-header">
        <div className="att-header-left">
          <div className="att-header-icon-wrap">
            <Activity size={22} />
          </div>
          <div>
            <h2>Attendance Management</h2>
            <p className="page-desc-text">Real-time biometric logs, shift analytics, punch monitoring, and workforce attendance intelligence.</p>
          </div>
        </div>
        <div className="att-header-actions">
          <Button variant="secondary" onClick={() => addToast('info', 'Refreshing live data...')} icon={RefreshCw} size="sm">
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setShiftModalOpen(true)} icon={Clock} size="sm">
            Assign Shift
          </Button>
          <Button variant="secondary" onClick={handleApproveAll} icon={ShieldCheck} size="sm">
            Approve All
          </Button>
          <Button variant="primary" onClick={() => setMarkModalOpen(true)} icon={Plus}>
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* ═══ Top Summary KPI Cards ═══ */}
      <div className="att-kpi-strip">
        <div className="att-kpi-card att-kpi-blue">
          <div className="att-kpi-header">
            <span className="att-kpi-label">Total Employees</span>
            <div className="att-kpi-icon-box att-kpi-icon-blue"><Users size={16} /></div>
          </div>
          <div className="att-kpi-value">{totalEmployees.toLocaleString()}</div>
          <div className="att-kpi-sub">
            <TrendingUp size={11} />
            <span>+12 this month</span>
          </div>
        </div>

        <div className="att-kpi-card att-kpi-green">
          <div className="att-kpi-header">
            <span className="att-kpi-label">Present Today</span>
            <div className="att-kpi-icon-box att-kpi-icon-green"><CheckCircle2 size={16} /></div>
          </div>
          <div className="att-kpi-value">{totalPresent + totalHalfDay}</div>
          <div className="att-kpi-sub">
            <span className="att-kpi-sub-tag">{totalHalfDay} Half-Day</span>
            <span>{totalWFH} WFH</span>
          </div>
        </div>

        <div className="att-kpi-card att-kpi-red">
          <div className="att-kpi-header">
            <span className="att-kpi-label">Absent Today</span>
            <div className="att-kpi-icon-box att-kpi-icon-red"><UserMinus size={16} /></div>
          </div>
          <div className="att-kpi-value">{totalAbsent}</div>
          <div className="att-kpi-sub">
            <TrendingDown size={11} />
            <span>Unexcused absence</span>
          </div>
        </div>

        <div className="att-kpi-card att-kpi-amber">
          <div className="att-kpi-header">
            <span className="att-kpi-label">Employees on Leave</span>
            <div className="att-kpi-icon-box att-kpi-icon-amber"><BookOpen size={16} /></div>
          </div>
          <div className="att-kpi-value">{totalLeave}</div>
          <div className="att-kpi-sub">
            <span>Approved holidays</span>
          </div>
        </div>

        <div className="att-kpi-card att-kpi-purple">
          <div className="att-kpi-header">
            <span className="att-kpi-label">Late Arrivals</span>
            <div className="att-kpi-icon-box att-kpi-icon-purple"><AlertCircle size={16} /></div>
          </div>
          <div className="att-kpi-value">{totalLate}</div>
          <div className="att-kpi-sub">
            <span>After 09:15 AM</span>
          </div>
        </div>

        <div className="att-kpi-card att-kpi-cyan">
          <div className="att-kpi-header">
            <span className="att-kpi-label">Work From Home</span>
            <div className="att-kpi-icon-box att-kpi-icon-cyan"><Home size={16} /></div>
          </div>
          <div className="att-kpi-value">{totalWFH}</div>
          <div className="att-kpi-sub">
            <span>Active WFH logs</span>
          </div>
        </div>

        <div className="att-kpi-card att-kpi-indigo">
          <div className="att-kpi-header">
            <span className="att-kpi-label">Attendance Rate</span>
            <div className="att-kpi-icon-box att-kpi-icon-indigo"><BarChart2 size={16} /></div>
          </div>
          <div className="att-kpi-value">{attendanceRate}%</div>
          <div className="att-kpi-sub">
            <TrendingUp size={11} />
            <span>+2.1% vs last week</span>
          </div>
        </div>

        <div className="att-kpi-card att-kpi-rose">
          <div className="att-kpi-header">
            <span className="att-kpi-label">Overtime Today</span>
            <div className="att-kpi-icon-box att-kpi-icon-rose"><Zap size={16} /></div>
          </div>
          <div className="att-kpi-value">7</div>
          <div className="att-kpi-sub">
            <span>~2.3 hrs avg extra</span>
          </div>
        </div>
      </div>

      {/* ═══ Section Navigation Tabs ═══ */}
      <div className="att-section-tabs">
        {[
          { id: 'overview', label: 'Overview & Analytics', icon: BarChart2 },
          { id: 'records', label: 'Attendance Records', icon: FileText },
          { id: 'monitor', label: 'Live Punch Monitor', icon: Activity },
          { id: 'locations', label: 'Country Management', icon: Globe },
          { id: 'leave', label: 'Leave Information', icon: BookOpen },
          { id: 'automation', label: 'Automation', icon: Cpu },
          { id: 'reports', label: 'Reports & Export', icon: Download },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`att-tab-btn ${activeSection === tab.id ? 'att-tab-active' : ''}`}
              onClick={() => setActiveSection(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ OVERVIEW & ANALYTICS ═══ */}
      {activeSection === 'overview' && (
        <div className="att-overview-grid">
          {/* Daily Attendance Analytics */}
          <div className="card att-analytics-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <BarChart2 size={16} style={{ color: 'var(--color-primary)' }} />
                <span>Daily Attendance Analytics</span>
              </div>
              <Badge variant="info">Today</Badge>
            </div>

            {/* Donut-style summary ring */}
            <div className="att-analytics-body">
              <div className="att-donut-section">
                <div className="att-donut-ring">
                  <svg viewBox="0 0 120 120" width="120" height="120">
                    <defs>
                      <linearGradient id="presentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke="url(#presentGrad)"
                      strokeWidth="10"
                      strokeDasharray={`${(totalPresent / Math.max(filteredAttendance.length, 1)) * 314} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{ filter: 'drop-shadow(0 0 5px rgba(34, 211, 238, 0.4))' }}
                    />
                    <text x="60" y="58" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" style={{ fontFamily: 'var(--font-mono)' }}>{attendanceRate}%</text>
                    <text x="60" y="74" textAnchor="middle" fill="var(--text-muted)" fontSize="7.5" fontWeight="700" letterSpacing="0.04em" textTransform="uppercase">Present Rate</text>
                  </svg>
                </div>
                <div className="att-donut-legend">
                  {[
                    { label: 'Present', count: totalPresent, color: '#4ade80' },
                    { label: 'Absent', count: totalAbsent, color: '#f87171' },
                    { label: 'On Leave', count: totalLeave, color: '#fbbf24' },
                    { label: 'WFH', count: totalWFH, color: '#60a5fa' },
                    { label: 'Half Day', count: totalHalfDay, color: '#a78bfa' },
                    { label: 'Late', count: totalLate, color: '#fb923c' },
                  ].map((item, i) => (
                    <div key={i} className="att-legend-item">
                      <span className="att-legend-dot" style={{ background: item.color }} />
                      <span className="att-legend-label">{item.label}</span>
                      <span className="att-legend-count">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar chart for weekly trend */}
              <div className="att-weekly-bars">
                <div className="att-weekly-title">Weekly Trend</div>
                <div className="att-bar-group">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    const heights = [88, 92, 87, 94, 90, 45, 30];
                    return (
                      <div key={day} className="att-bar-col">
                        <div className="att-bar-wrap">
                          <div
                            className="att-bar-fill"
                            style={{
                              height: `${heights[i]}%`,
                              background: i === 3 ? 'linear-gradient(to top, #818cf8, #c084fc)' : 'linear-gradient(to top, #3b82f6, #6366f1)'
                            }}
                          />
                        </div>
                        <span className="att-bar-label">{day}</span>
                        <span className="att-bar-pct">{heights[i]}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dept breakdown */}
            <div className="att-dept-breakdown">
              <div className="att-section-mini-title">Department Breakdown</div>
              {deptBreakdown.map((dept, i) => (
                <div key={i} className="att-dept-row">
                  <span className="att-dept-name">{dept.name}</span>
<div className="att-dept-bar-wrap">
                    <div
                      className="att-dept-bar-fill"
                      style={{
                        width: `${(dept.present / dept.total) * 100}%`,
                        background: dept.color
                      }}
                    />
                  </div>
                  <span className="att-dept-count">{dept.present}/{dept.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Punch In/Out Monitor Widget */}
          <div className="card att-punch-monitor-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <Activity size={16} style={{ color: '#4ade80' }} />
                <span>Live Punch Monitor</span>
              </div>
              <div className="att-live-badge">
                <span className="att-live-dot" />
                <span>LIVE</span>
              </div>
            </div>
            <div className="att-punch-feed">
              {livePunchFeed.map((ev, i) => (
                <div key={i} className="att-feed-item">
                  <div className={`att-feed-dot att-feed-${ev.type}`} />
                  <Avatar name={ev.name} size="xs" />
                  <div className="att-feed-info">
                    <strong>{ev.name}</strong>
                    <span className="att-feed-action">{ev.action}</span>
                    <span className="att-feed-meta">{ev.time} · {ev.source} · {ev.dept}</span>
                  </div>
                  <div className={`att-feed-type-tag att-type-${ev.type}`}>
                    {ev.type === 'in' ? '↑ In' : ev.type === 'out' ? '↓ Out' : ev.type === 'late' ? '⚠ Late' : ev.type === 'wfh' ? '🏠' : '☕'}
                  </div>
                </div>
              ))}
            </div>
            <div className="att-punch-footer">
              <div className="att-punch-stat-row">
                <div className="att-punch-mini-stat">
                  <span>Today Punched In</span>
                  <strong style={{ color: '#4ade80' }}>847</strong>
                </div>
                <div className="att-punch-mini-stat">
                  <span>Punched Out</span>
                  <strong style={{ color: '#60a5fa' }}>312</strong>
                </div>
                <div className="att-punch-mini-stat">
                  <span>Still Working</span>
                  <strong style={{ color: '#fbbf24' }}>535</strong>
                </div>
              </div>
            </div>

            {/* Real-time system status */}
            <div className="att-system-status">
              <div className="att-section-mini-title">System Status</div>
              {[
                { label: 'Biometric Devices', status: 'Online', ok: true },
                { label: 'GPS Tracking', status: 'Active', ok: true },
                { label: 'RFID Access', status: 'Online', ok: true },
                { label: 'Mobile App Sync', status: 'Syncing', ok: true },
              ].map((sys, i) => (
                <div key={i} className="att-sys-row">
                  <span className="att-sys-label">{sys.label}</span>
                  <span className={`att-sys-status ${sys.ok ? 'att-sys-ok' : 'att-sys-err'}`}>
                    <span className="att-sys-dot" />
                    {sys.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ATTENDANCE RECORDS ═══ */}
      {activeSection === 'records' && (
        <div className="att-records-section">
          {/* Filters Panel */}
          <div className="card att-filters-panel">
            <div className="att-filters-row">
              <div className="att-search-box">
                <Search size={15} className="att-search-icon" />
                <input
                  type="text"
                  placeholder="Search by Employee name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="att-date-box">
                <Calendar size={14} className="att-date-icon" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Operations">Operations</option>
                <option value="Human Resources">Human Resources</option>
              </select>
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">All Branches</option>
                <option value="Jaipur">Jaipur</option>
                <option value="Delhi">Delhi</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bangalore">Bangalore</option>
              </select>
              <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                <option value="">All Shifts</option>
                <option value="Morning">Morning Shift</option>
                <option value="Evening">Evening Shift</option>
                <option value="Night">Night Shift</option>
                <option value="Flexible">Flexible</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Work From Home">WFH</option>
                <option value="On Leave">On Leave</option>
                <option value="Overtime">Overtime</option>
              </select>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option value="">All Sources</option>
                <option value="Biometric">Biometric</option>
                <option value="GPS">GPS</option>
                <option value="RFID">RFID</option>
                <option value="Web Login">Web Login</option>
                <option value="Mobile App">Mobile App</option>
              </select>
            </div>
          </div>

          {/* Main Table */}
          <div className="card table-wrapper-card">
            <div className="table-header-title">
              <h3>Attendance Ledger Records</h3>
              <div className="att-table-header-right">
                <span className="count-tag">{filteredAttendance.length} records</span>
                <Button variant="secondary" icon={Download} size="sm" onClick={() => handleExport('CSV')}>
                  Export CSV
                </Button>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredAttendance}
              loading={isLoading}
              rowsPerPage={12}
              emptyTitle="No Attendance Records Found"
              emptyDescription="Try adjusting your filter values or selecting another date."
            />
          </div>

          {/* Status summary below table */}
          <div className="att-status-summary-row">
            {[
              { label: 'Present', count: totalPresent, color: '#4ade80', icon: CheckCircle2 },
              { label: 'Absent', count: totalAbsent, color: '#f87171', icon: UserMinus },
              { label: 'Late', count: totalLate, color: '#fb923c', icon: AlertCircle },
              { label: 'On Leave', count: totalLeave, color: '#fbbf24', icon: BookOpen },
              { label: 'WFH', count: totalWFH, color: '#60a5fa', icon: Home },
              { label: 'Half Day', count: totalHalfDay, color: '#a78bfa', icon: Clock },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="att-status-chip" style={{ borderColor: `${s.color}30` }}>
                  <Icon size={13} style={{ color: s.color }} />
                  <span className="att-status-chip-count" style={{ color: s.color }}>{s.count}</span>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ LIVE PUNCH MONITOR ═══ */}
      {activeSection === 'monitor' && (
        <div className="att-monitor-grid">
          <div className="card att-full-punch-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <Activity size={16} style={{ color: '#4ade80' }} />
                <span>Real-Time Punch Feed</span>
              </div>
              <div className="att-live-badge">
                <span className="att-live-dot" />
                <span>LIVE</span>
              </div>
            </div>
            <div className="att-monitor-feed-full">
              {[...livePunchFeed, ...livePunchFeed].map((ev, i) => (
                <div key={i} className="att-monitor-feed-row">
                  <div className={`att-feed-dot att-feed-${ev.type}`} style={{ flexShrink: 0 }} />
                  <Avatar name={ev.name} size="sm" />
                  <div className="att-monitor-info">
                    <strong>{ev.name}</strong>
                    <span>{ev.dept}</span>
                  </div>
                  <span className="att-monitor-action">{ev.action}</span>
                  <span className="att-monitor-source">{ev.source}</span>
                  <span className="att-monitor-time">{ev.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="att-monitor-right-col">
            {/* Punch Out Monitoring */}
            <div className="card att-punch-out-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Clock size={15} style={{ color: '#60a5fa' }} />
                  <span>Punch Out Monitoring</span>
                </div>
              </div>
              <div className="att-punch-out-list">
                {[
                  { name: 'Rajesh Kumar', dept: 'Engineering', checkin: '09:00 AM', expected: '06:00 PM', status: 'Still Working' },
                  { name: 'Sunita Patel', dept: 'Marketing', checkin: '09:15 AM', expected: '06:15 PM', status: 'Extended' },
                  { name: 'Arjun Mehta', dept: 'Sales', checkin: '08:55 AM', expected: '05:55 PM', status: 'On Time' },
                ].map((emp, i) => (
                  <div key={i} className="att-pout-row">
                    <Avatar name={emp.name} size="xs" />
                    <div className="att-pout-info">
                      <strong>{emp.name}</strong>
                      <span>{emp.dept}</span>
                    </div>
                    <div className="att-pout-times">
                      <span>In: {emp.checkin}</span>
                      <span>Out: {emp.expected}</span>
                    </div>
                    <span className={`att-pout-status ${emp.status === 'On Time' ? 'att-ok' : 'att-warn'}`}>{emp.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="card att-source-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Fingerprint size={15} style={{ color: '#a78bfa' }} />
                  <span>Punch Source Breakdown</span>
                </div>
              </div>
              <div className="att-source-list">
                {[
                  { label: 'Biometric', count: 482, pct: 57, icon: '⚙️', color: '#4ade80' },
                  { label: 'GPS (Mobile)', count: 198, pct: 23, icon: '📍', color: '#60a5fa' },
                  { label: 'RFID', count: 103, pct: 12, icon: '💳', color: '#fbbf24' },
                  { label: 'Web Portal', count: 64, pct: 8, icon: '💻', color: '#a78bfa' },
                ].map((src, i) => (
                  <div key={i} className="att-src-item">
                    <span className="att-src-icon">{src.icon}</span>
                    <div className="att-src-info">
                      <span className="att-src-name">{src.label}</span>
                      <div className="att-src-bar">
                        <div className="att-src-bar-fill" style={{ width: `${src.pct}%`, background: src.color }} />
                      </div>
                    </div>
                    <span className="att-src-count">{src.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alarms */}
            <div className="card att-alarms-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <ShieldAlert size={15} style={{ color: '#f87171' }} />
                  <span>Attendance Alarms</span>
                </div>
                <Badge variant="danger">3 Active</Badge>
              </div>
              <div className="att-alarms-list">
                <div className="att-alarm-item att-alarm-error">
                  <strong>Missing Clock-Out</strong>
                  <p>Rajesh Kumar — no clock-out logged for yesterday.</p>
                </div>
                <div className="att-alarm-item att-alarm-warning">
                  <strong>Frequent Late Arrivals (3×)</strong>
                  <p>Vikram Singh and Ananya Gupta — late 3+ times this week.</p>
                </div>
                <div className="att-alarm-item att-alarm-info">
                  <strong>Consecutive Absence</strong>
                  <p>Meena Sharma — absent for 3 consecutive working days.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ COUNTRY / LOCATION MANAGEMENT ═══ */}
      {activeSection === 'locations' && (
        <div className="att-locations-grid">
          <div className="card att-locations-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <Globe size={16} style={{ color: '#60a5fa' }} />
                <span>Country Management</span>
              </div>
              <Button variant="secondary" size="sm" icon={Plus} onClick={() => addToast('info', 'Add new country/region dialog coming soon.')}>
                Add Location
              </Button>
            </div>
            <div className="att-locations-list">
              {locationData.map((loc, i) => (
                <div key={i} className="att-location-item">
                  <div className="att-location-flag">
                    {loc.country === 'India' ? '🇮🇳' : loc.country === 'US' ? '🇺🇸' : loc.country === 'UK' ? '🇬🇧' : '🇦🇪'}
                  </div>
                  <div className="att-location-info">
                    <strong>{loc.country}</strong>
                    <span className="att-location-offices">{loc.offices.join(', ')}</span>
                  </div>
                  <div className="att-location-stats">
                    <div className="att-location-stat">
                      <span>{loc.employees}</span>
                      <span>Total</span>
                    </div>
                    <div className="att-location-stat">
                      <span style={{ color: '#4ade80' }}>{loc.active}</span>
                      <span>Active</span>
                    </div>
                    <div className="att-location-stat">
                      <span style={{ color: '#f87171' }}>{loc.employees - loc.active}</span>
                      <span>Absent</span>
                    </div>
                  </div>
                  <div className="att-loc-bar-wrap">
                    <div className="att-loc-bar-fill" style={{ width: `${(loc.active / loc.employees) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="att-loc-right-col">
            {/* Search by region */}
            <div className="card att-loc-search-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Search size={15} />
                  <span>Search & Filter</span>
                </div>
              </div>
              <div className="att-loc-search-fields">
                <input type="text" placeholder="Search by employee name..." className="att-loc-input" />
                <input type="text" placeholder="Search by department..." className="att-loc-input" />
                <input type="text" placeholder="Filter by city / branch..." className="att-loc-input" />
                <select className="att-loc-select">
                  <option>All Timezones</option>
                  <option>IST (UTC+5:30)</option>
                  <option>EST (UTC-5)</option>
                  <option>GMT (UTC+0)</option>
                  <option>GST (UTC+4)</option>
                </select>
              </div>

              <div className="att-filter-tags">
                {['Present Only', 'Absent', 'Late', 'WFH', 'On Leave'].map(tag => (
                  <button key={tag} className="att-filter-tag-btn">{tag}</button>
                ))}
              </div>
            </div>

            {/* Timezone display */}
            <div className="card att-timezone-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Clock size={15} style={{ color: '#fbbf24' }} />
                  <span>Active Timezones</span>
                </div>
              </div>
              <div className="att-timezone-list">
                {[
                  { zone: 'IST', offset: '+5:30', time: '13:53', country: 'India', count: 850 },
                  { zone: 'EST', offset: '-5:00', time: '03:23', country: 'United States', count: 220 },
                  { zone: 'GMT', offset: '+0:00', time: '08:23', country: 'United Kingdom', count: 90 },
                  { zone: 'GST', offset: '+4:00', time: '12:23', country: 'UAE', count: 90 },
                ].map((tz, i) => (
                  <div key={i} className="att-tz-row">
                    <div className="att-tz-zone">{tz.zone}</div>
                    <div className="att-tz-info">
                      <strong>{tz.country}</strong>
                      <span>UTC{tz.offset}</span>
                    </div>
                    <div className="att-tz-time">{tz.time}</div>
                    <div className="att-tz-count">{tz.count} emp</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LEAVE INFORMATION ═══ */}
      {activeSection === 'leave' && (
        <div className="att-leave-grid">
          <div className="card att-leave-policy-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <BookOpen size={16} style={{ color: '#fbbf24' }} />
                <span>Leave Entitlements</span>
              </div>
            </div>
            <div className="att-leave-types">
              {leaveData.map((leave, i) => (
                <div key={i} className="att-leave-type-row">
                  <div className="att-leave-type-info">
                    <strong>{leave.type}</strong>
                    <span>{leave.availed} availed of {leave.total} days</span>
                  </div>
                  <div className="att-leave-bar-wrap">
                    <div
                      className="att-leave-bar-fill"
                      style={{ width: `${(leave.availed / leave.total) * 100}%`, background: leave.color }}
                    />
                  </div>
                  <span className="att-leave-rem">{leave.total - leave.availed} rem.</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card att-leave-analytics-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <TrendingUp size={16} style={{ color: '#a78bfa' }} />
                <span>Leave Analytics</span>
              </div>
            </div>
            <div className="att-leave-analytics-body">
              {[
                { label: 'Monthly Avg Leave', value: '2.3 days', color: '#60a5fa', icon: BarChart2 },
                { label: 'Productivity Impact', value: 'Low', color: '#4ade80', icon: TrendingUp },
                { label: 'Pending Approvals', value: '8', color: '#fb923c', icon: AlertCircle },
                { label: 'Carry Forward', value: '1,240 days', color: '#a78bfa', icon: ArrowUpRight },
                { label: 'LOP Cases', value: '3', color: '#f87171', icon: AlertTriangle },
                { label: 'Team Avg Leaves', value: '1.8/month', color: '#fbbf24', icon: Users },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="att-leave-stat-card">
                    <Icon size={16} style={{ color: item.color }} />
                    <div className="att-leave-stat-value" style={{ color: item.color }}>{item.value}</div>
                    <div className="att-leave-stat-label">{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card att-leave-status-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <CheckSquare size={16} style={{ color: '#4ade80' }} />
                <span>Recent Leave Requests</span>
              </div>
            </div>
            <div className="att-leave-requests">
              {[
                { name: 'Rahul Sharma', type: 'Casual Leave', days: 2, from: '2026-06-01', status: 'Approved' },
                { name: 'Priya Verma', type: 'Sick Leave', days: 1, from: '2026-05-31', status: 'Pending' },
                { name: 'Ananya Gupta', type: 'Privilege Leave', days: 5, from: '2026-06-10', status: 'Pending' },
                { name: 'Vijay Chauhan', type: 'Casual Leave', days: 1, from: '2026-05-30', status: 'Rejected' },
              ].map((req, i) => (
                <div key={i} className="att-leave-req-row">
                  <Avatar name={req.name} size="xs" />
                  <div className="att-leave-req-info">
                    <strong>{req.name}</strong>
                    <span>{req.type} · {req.days} day{req.days > 1 ? 's' : ''} · From {req.from}</span>
                  </div>
                  <Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'danger' : 'warning'}>
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ AUTOMATION ═══ */}
      {activeSection === 'automation' && (
        <div className="att-automation-grid">
          <div className="card att-automation-rules-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <Cpu size={16} style={{ color: '#a78bfa' }} />
                <span>Automation Rules</span>
              </div>
              <Badge variant="info">{automationRules.filter(r => r.active).length} Active</Badge>
            </div>
            <div className="att-rules-list">
              {automationRules.map((rule, i) => {
                const Icon = rule.icon;
                return (
                  <div key={i} className="att-rule-row">
                    <div className={`att-rule-icon-wrap ${rule.active ? 'att-rule-icon-on' : 'att-rule-icon-off'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="att-rule-info">
                      <strong>{rule.name}</strong>
                      <span>{rule.desc}</span>
                    </div>
                    <button
                      className={`att-rule-toggle ${rule.active ? 'att-rule-on' : 'att-rule-off'}`}
                      onClick={() => addToast('success', `${rule.name} ${rule.active ? 'disabled' : 'enabled'}.`)}
                    >
                      {rule.active ? 'ON' : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="att-automation-right">
            {/* Automation Features */}
            <div className="card att-auto-features-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Sparkles size={15} style={{ color: '#fbbf24' }} />
                  <span>Automation Features</span>
                </div>
              </div>
              <div className="att-auto-features-list">
                {[
                  { feat: 'Employees on punch-in', enabled: true },
                  { feat: 'Daily attendance summary', enabled: true },
                  { feat: 'Attendance regularization', enabled: false },
                  { feat: 'Calculate overtime hours', enabled: true },
                  { feat: 'Generate attendance summary', enabled: true },
                  { feat: 'Send attendance reports', enabled: false },
                ].map((item, i) => (
                  <div key={i} className="att-auto-feat-row">
                    <div className={`att-auto-dot ${item.enabled ? 'att-dot-on' : 'att-dot-off'}`} />
                    <span>{item.feat}</span>
                    <span className={`att-auto-status ${item.enabled ? 'att-status-on' : 'att-status-off'}`}>
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Punch Functions */}
            <div className="card att-punch-functions-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Settings size={15} style={{ color: '#60a5fa' }} />
                  <span>Punch Functions</span>
                </div>
              </div>
              <div className="att-punch-functions">
                {[
                  { label: 'Current day punch count', desc: 'All employees today' },
                  { label: 'Managing shift employee', desc: 'Auto assign on shift change' },
                  { label: 'Tracking hours overtime', desc: 'Flag > 8h automatically' },
                  { label: 'The team members status', desc: 'Real-time team dashboard' },
                  { label: 'Track break monitoring', desc: 'Alert on extended breaks' },
                  { label: 'Generate report alerts', desc: 'Daily digest at 8PM' },
                ].map((fn, i) => (
                  <div key={i} className="att-punch-fn-row">
                    <Check size={12} style={{ color: '#4ade80', flexShrink: 0 }} />
                    <div className="att-punch-fn-info">
                      <span className="att-fn-label">{fn.label}</span>
                      <span className="att-fn-desc">{fn.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REPORTS & EXPORT ═══ */}
      {activeSection === 'reports' && (
        <div className="att-reports-grid">
          <div className="card att-reports-main">
            <div className="att-card-header">
              <div className="att-card-title">
                <FileText size={16} style={{ color: '#60a5fa' }} />
                <span>Reports & Export System</span>
              </div>
            </div>
            <div className="att-reports-types">
              {[
                { label: 'Daily attendance reports', desc: 'All employee daily logs summary', icon: Calendar, color: '#60a5fa' },
                { label: 'Monthly attendance summary', desc: 'Month-wise breakdown by dept', icon: BarChart2, color: '#4ade80' },
                { label: 'Employee attendance history', desc: 'Per-employee full history', icon: Users, color: '#a78bfa' },
                { label: 'Overtime records report', desc: 'Employees with overtime entries', icon: Clock, color: '#fbbf24' },
                { label: 'Department attendance stats', desc: 'Dept-level attendance analytics', icon: Layers, color: '#f472b6' },
                { label: 'Leave & absence analytics', desc: 'Leave trends and patterns', icon: BookOpen, color: '#fb923c' },
              ].map((rpt, i) => {
                const Icon = rpt.icon;
                return (
                  <div key={i} className="att-report-row">
                    <div className="att-report-icon" style={{ background: `${rpt.color}18`, border: `1px solid ${rpt.color}25` }}>
                      <Icon size={16} style={{ color: rpt.color }} />
                    </div>
                    <div className="att-report-info">
                      <strong>{rpt.label}</strong>
                      <span>{rpt.desc}</span>
                    </div>
                    <div className="att-report-actions">
                      <button className="att-report-btn" onClick={() => handleExport('PDF')}>PDF</button>
                      <button className="att-report-btn" onClick={() => handleExport('Excel')}>Excel</button>
                      <button className="att-report-btn" onClick={() => handleExport('CSV')}>CSV</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="att-reports-right">
            {/* Export Formats */}
            <div className="card att-export-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Share2 size={15} style={{ color: '#4ade80' }} />
                  <span>Export Formats</span>
                </div>
              </div>
              <div className="att-export-formats">
                {[
                  { format: 'CSV', desc: 'Comma-separated values', icon: '📊', action: () => handleExport('CSV') },
                  { format: 'Excel', desc: 'Microsoft Excel .xlsx', icon: '📗', action: () => handleExport('Excel') },
                  { format: 'PDF', desc: 'Portable Document Format', icon: '📕', action: () => handleExport('PDF') },
                ].map((fmt, i) => (
                  <button key={i} className="att-export-fmt-btn" onClick={fmt.action}>
                    <span className="att-fmt-icon">{fmt.icon}</span>
                    <div>
                      <strong>{fmt.format}</strong>
                      <span>{fmt.desc}</span>
                    </div>
                    <Download size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Date range filters */}
            <div className="card att-date-range-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Calendar size={15} style={{ color: '#fbbf24' }} />
                  <span>Report Date Range</span>
                </div>
              </div>
              <div className="att-date-range-body">
                <div className="att-range-buttons">
                  {['Today', 'Weekly', 'Monthly', 'Quarterly'].map(range => (
                    <button key={range} className="att-range-btn">{range}</button>
                  ))}
                </div>
                <div className="att-custom-range">
                  <label>Custom From</label>
                  <input type="date" className="att-range-input" defaultValue="2026-05-01" />
                  <label>To</label>
                  <input type="date" className="att-range-input" defaultValue="2026-05-31" />
                </div>
              </div>
            </div>

            {/* Real-time dashboard */}
            <div className="card att-realtime-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Activity size={15} style={{ color: '#4ade80' }} />
                  <span>Real-Time Dashboard</span>
                </div>
                <div className="att-live-badge"><span className="att-live-dot" /><span>LIVE</span></div>
              </div>
              <div className="att-realtime-stats">
                {[
                  { label: 'Online Right Now', value: '538', color: '#4ade80' },
                  { label: 'On Break', value: '67', color: '#fbbf24' },
                  { label: 'Offline Today', value: '134', color: '#f87171' },
                  { label: 'Live Updates', value: '∞', color: '#60a5fa' },
                ].map((stat, i) => (
                  <div key={i} className="att-rt-stat">
                    <div className="att-rt-val" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="att-rt-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modals ═══ */}

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Attendance Log: ${selectedRecord?.employeeName}`}
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSubmit}>Save Changes</Button>
          </div>
        }
      >
        {selectedRecord && (
          <div className="create-task-form-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label>Employee Name</label>
                <input type="text" value={selectedRecord.employeeName} disabled style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }} />
              </div>
              <div>
                <label>Branch / Office</label>
                <input type="text" value={selectedRecord.branch} disabled style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }} />
              </div>
            </div>
            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label>Punch In Time</label>
                <input type="text" placeholder="e.g. 09:00 AM" value={editFormData.punchIn}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, punchIn: e.target.value }))} />
              </div>
              <div>
                <label>Punch Out Time</label>
                <input type="text" placeholder="e.g. 06:00 PM" value={editFormData.punchOut}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, punchOut: e.target.value }))} />
              </div>
            </div>
            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label>Total Hours</label>
                <input type="number" step="0.01" placeholder="e.g. 8.5" value={editFormData.totalHours}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, totalHours: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label>Source Device</label>
                <select value={editFormData.source}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, source: e.target.value }))}
                  style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                  <option value="Biometric">Biometric</option>
                  <option value="GPS">GPS</option>
                  <option value="RFID">RFID</option>
                  <option value="Web Login">Web Login</option>
                  <option value="Mobile App">Mobile App</option>
                </select>
              </div>
            </div>
            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label>Status</label>
                <select value={editFormData.status}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Work From Home">Work From Home</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Overtime">Overtime</option>
                </select>
              </div>
              <div>
                <label>Date</label>
                <input type="date" value={editFormData.date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                  style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Mark Attendance Modal */}
      <Modal isOpen={markModalOpen} onClose={() => setMarkModalOpen(false)} title="Mark Attendance Entry" size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setMarkModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleMarkSubmit}>Log Attendance</Button>
          </div>
        }
      >
        <div className="create-task-form-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div className="form-field">
            <label>Select Employee</label>
            <select value={markFormData.employeeId}
              onChange={(e) => {
                const selectedEmp = employees.find(emp => emp.id === e.target.value);
                setMarkFormData(prev => ({
                  ...prev,
                  employeeId: e.target.value,
                  employeeName: selectedEmp ? selectedEmp.name : '',
                  department: selectedEmp ? selectedEmp.department : '',
                  branch: selectedEmp ? selectedEmp.branch : ''
                }));
              }}
              style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
              <option value="">Choose employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id}) — {emp.department}</option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div>
              <label>Date</label>
              <input type="date" value={markFormData.date}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label>Source</label>
              <select value={markFormData.source}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, source: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                <option value="Biometric">⚙️ Biometric</option>
                <option value="GPS">📍 GPS</option>
                <option value="RFID">💳 RFID</option>
                <option value="Web Login">💻 Web Portal</option>
                <option value="Mobile App">📱 Mobile App</option>
              </select>
            </div>
          </div>
          <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div>
              <label>Punch In</label>
              <input type="text" placeholder="09:02 AM" value={markFormData.punchIn}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, punchIn: e.target.value }))} />
            </div>
            <div>
              <label>Punch Out</label>
              <input type="text" placeholder="06:15 PM" value={markFormData.punchOut}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, punchOut: e.target.value }))} />
            </div>
          </div>
          <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div>
              <label>Working Hours</label>
              <input type="number" step="0.1" placeholder="8.2" value={markFormData.totalHours}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, totalHours: e.target.value }))} />
            </div>
            <div>
              <label>Status</label>
              <select value={markFormData.status}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, status: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                <option value="Present">✅ Present</option>
                <option value="Late">🕐 Late</option>
                <option value="Absent">❌ Absent</option>
                <option value="Half Day">🌗 Half Day</option>
                <option value="Work From Home">🏠 WFH</option>
                <option value="On Leave">🌴 On Leave</option>
                <option value="Overtime">⏰ Overtime</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Assign Shift Modal */}
      <Modal isOpen={shiftModalOpen} onClose={() => setShiftModalOpen(false)} title="Assign Shift Schedule" size="sm"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setShiftModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleShiftSubmit}>Assign Shift</Button>
          </div>
        }
      >
        <div className="create-task-form-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div className="form-field">
            <label>Select Employee</label>
            <select value={shiftFormData.employeeId}
              onChange={(e) => setShiftFormData(prev => ({ ...prev, employeeId: e.target.value }))}
              style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
              <option value="">Choose employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} — {emp.shift || 'Flexible'}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Shift Schedule</label>
            <select value={shiftFormData.shift}
              onChange={(e) => setShiftFormData(prev => ({ ...prev, shift: e.target.value }))}
              style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
              <option value="Morning (09:00 AM - 06:00 PM)">Morning (09:00 AM - 06:00 PM)</option>
              <option value="Evening (02:00 PM - 11:00 PM)">Evening (02:00 PM - 11:00 PM)</option>
              <option value="Night (10:00 PM - 07:00 AM)">Night (10:00 PM - 07:00 AM)</option>
              <option value="Flexible (09:00 AM - 06:00 PM)">Flexible (09:00 AM - 06:00 PM)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Floating Bottom Quick Actions Bar */}
      <div className="att-floating-actions-bar">
        <div className="att-fab-title">
          <Zap size={14} style={{ color: '#fbbf24', marginRight: '4px' }} />
          <span>Quick Actions</span>
        </div>
        <div className="att-fab-buttons">
          {[
            { label: 'Mark Attendance', icon: CheckSquare, color: '#4ade80', action: () => setMarkModalOpen(true) },
            { label: 'Assign Shift', icon: Clock, color: '#60a5fa', action: () => setShiftModalOpen(true) },
            { label: 'Request Check-In', icon: UserCheck, color: '#fbbf24', action: handleRequestAttendance },
            { label: 'Approve All', icon: ShieldCheck, color: '#a78bfa', action: handleApproveAll },
            { label: 'Schedule Report', icon: Calendar, color: '#f472b6', action: handleScheduleReport },
            { label: 'Download Report', icon: Download, color: '#38bdf8', action: () => handleExport('CSV') },
            { label: 'Alerts', icon: Bell, color: '#fb923c', action: () => addToast('info', 'Showing attendance alerts...') },
            { label: 'System Status', icon: Activity, color: '#2ec4b6', action: () => addToast('success', 'All systems online.') },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <button key={i} className="att-fab-btn" onClick={action.action} title={action.label}>
                <Icon size={14} style={{ color: action.color }} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Attendance;
