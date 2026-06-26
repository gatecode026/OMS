import React, { useState, useMemo, useEffect, useRef } from 'react';
import './WebPortalAttendance.css';
import { useApp } from '../context/AppContext';
import { FIELD_LABELS } from '../utils/fieldLabels';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  Search, Calendar, Clock, Monitor, UserCheck, CheckCircle2, FileText,
  Edit2, Trash2, RefreshCw, Download, Filter, X, ChevronRight,
  Users, Building, MapPin, Briefcase, AlertCircle, Save, Plus,
  CheckCircle, XCircle, Eye, TrendingUp, TrendingDown, Activity,
  Smartphone, Wifi, Zap, Shield, Award, Star, Bell, Settings,
  Fingerprint, Globe, Coffee, Sun, Moon, Battery, Signal,
  SlidersHorizontal, ChevronDown, ChevronUp, Columns
} from 'lucide-react';

// ─── Column Visibility Constants ──────────────────────────────────────────────
const WP_COL_GROUPS = [
  {
    label: 'Identity',
    keys: ['checkbox', 'employeeId', 'employee'],
  },
  {
    label: 'Organization',
    keys: ['department', 'branch', 'shift'],
  },
  {
    label: 'Attendance',
    keys: ['punchIn', 'punchOut', 'breakTime', 'workingHours', 'overtime', 'status'],
  },
  {
    label: 'System',
    keys: ['source', 'lastUpdated'],
  },
  {
    label: 'Actions',
    keys: ['actions'],
  },
];

const WP_COL_LABELS = {
  checkbox: 'Select',
  employeeId: FIELD_LABELS.id,
  employee: FIELD_LABELS.name,
  department: FIELD_LABELS.department,
  branch: FIELD_LABELS.branch,
  shift: FIELD_LABELS.shiftTiming,
  punchIn: FIELD_LABELS.punchInTime,
  punchOut: FIELD_LABELS.punchOutTime,
  breakTime: 'BREAK',
  workingHours: FIELD_LABELS.workingHours,
  overtime: 'OVERTIME',
  status: FIELD_LABELS.attendanceStatus,
  source: 'Source',
  lastUpdated: 'Last Updated',
  actions: 'ACTIONS',
};

const WP_DEFAULT_VISIBILITY = {
  checkbox: true,
  employeeId: true,
  employee: true,
  department: true,
  branch: true,
  shift: true,
  punchIn: true,
  punchOut: true,
  breakTime: true,
  workingHours: true,
  overtime: true,
  status: true,
  source: false,
  lastUpdated: false,
  actions: true,
};

const WP_LS_KEY = 'saas_wp_col_visibility';

// ─── Work Mode Badge Component ────────────────────────────────────────────────
const WorkModeBadge = ({ mode }) => {
  if (!mode) return null;
  const lower = mode.toLowerCase();
  if (lower.includes('home') || lower === 'wfh') {
    return (
      <span className="wp-wmode-pill wp-wmode-wfh">
        <span>🏠</span> WFH
      </span>
    );
  }
  if (lower === 'hybrid') {
    return (
      <span className="wp-wmode-pill wp-wmode-hybrid">
        <span>🔄</span> Hybrid
      </span>
    );
  }
  return (
    <span className="wp-wmode-pill wp-wmode-office">
      <span>🏢</span> Office
    </span>
  );
};

// ─── Premium Status Badge ─────────────────────────────────────────────────────
const WpStatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  if (s === 'absent') return <span className="wp-status-pill wp-s-absent">❌ Absent</span>;
  if (s === 'late') return <span className="wp-status-pill wp-s-late">🕐 Late</span>;
  if (s === 'half day' || s === 'half-day') return <span className="wp-status-pill wp-s-halfday">🌗 Half Day</span>;
  if (s.includes('leave')) return <span className="wp-status-pill wp-s-leave">🌴 On Leave</span>;
  if (s === 'work from home' || s === 'wfh') return <span className="wp-status-pill wp-s-wfh">🏠 WFH</span>;
  if (s === 'overtime') return <span className="wp-status-pill wp-s-ot">⏰ Overtime</span>;
  return <span className="wp-status-pill wp-s-present">✅ Present</span>;
};

// ─── Online Status Dot ────────────────────────────────────────────────────────
const OnlineDot = ({ status }) => {
  const map = {
    Active: 'dot-active',
    Working: 'dot-active',
    Idle: 'dot-idle',
    'In Meeting': 'dot-meeting',
    Offline: 'dot-offline',
  };
  const cls = map[status] || 'dot-idle';
  return <span className={`wp-online-dot ${cls}`} title={status || 'Offline'} />;
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const ToggleSwitch = ({ on, onChange }) => (
  <span
    className={`wp-ts ${on ? 'wp-ts-on' : ''}`}
    onClick={e => { e.stopPropagation(); onChange(!on); }}
  >
    <span className="wp-ts-thumb" />
  </span>
);

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const WebPortalAttendance = () => {
  const isLoading = usePageLoading(600);
  const {
    attendance,
    employees,
    branches,
    departments: rawDepartments,
    updateAttendanceRecord,
    addAttendanceRecord,
    deleteAttendanceRecord,
    addToast,
    attendanceRules
  } = useApp();
  const departments = useMemo(() => (rawDepartments || []).filter(d => d.status === 'Active'), [rawDepartments]);

  // ── Form/View State ──
  const [formMode, setFormMode] = useState('single');
  const [wpSearch, setWpSearch] = useState('');
  const [wpBranch, setWpBranch] = useState('');
  const [wpDept, setWpDept] = useState('');
  const [wpStatus, setWpStatus] = useState('');
  const [wpWorkMode, setWpWorkMode] = useState('');
  const [dateFilter, setDateFilter] = useState(getLocalDateString());
  const [wpState, setWpState] = useState({});
  const [viewMode, setViewMode] = useState('table');

  // ── Column Visibility ──
  const [colVis, setColVis] = useState(() => {
    try { return { ...WP_DEFAULT_VISIBILITY, ...JSON.parse(localStorage.getItem(WP_LS_KEY) || '{}') }; }
    catch { return WP_DEFAULT_VISIBILITY; }
  });
  const [showColPanel, setShowColPanel] = useState(false);
  const colPanelRef = useRef(null);

  // ── Filter Drawer (mobile) ──
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // ── Quick Attendance Form ──
  const [quickFormOpen, setQuickFormOpen] = useState(false);
  const [quickFormData, setQuickFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    branch: '',
    workMode: '',
    date: getLocalDateString(),
    punchIn: '',
    punchOut: '',
    breakTime: '45 mins',
    totalHours: 0,
    status: 'Present',
    source: 'Web Portal',
    notes: ''
  });

  // ── Edit Modal State ──
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditEmp, setSelectedEditEmp] = useState(null);
  const [editFormData, setEditFormData] = useState({
    punchIn: '',
    punchOut: '',
    status: 'Present',
    totalHours: 0,
    notes: ''
  });

  // ── Bulk Action State ──
  const [bulkActionModal, setBulkActionModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('Present');
  const [selectedForBulk, setSelectedForBulk] = useState([]);

  // ── Persist column visibility ──
  useEffect(() => {
    localStorage.setItem(WP_LS_KEY, JSON.stringify(colVis));
  }, [colVis]);

  // ── Close column panel on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (colPanelRef.current && !colPanelRef.current.contains(e.target)) {
        setShowColPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Helper: parse break string to numeric hours ──
  const parseBreakToHours = (breakStr) => {
    if (!breakStr) return 0;
    const num = parseInt(breakStr, 10);
    if (isNaN(num)) return 0;
    if (breakStr.toLowerCase().includes('min')) {
      return num / 60;
    }
    if (breakStr.toLowerCase().includes('hr') || breakStr.toLowerCase().includes('hour')) {
      return num;
    }
    return 0;
  };

  // ── Helper: parse time to minutes since midnight ──
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    try {
      const cleaned = timeStr.trim().toUpperCase();
      const isPM = cleaned.includes('PM');
      const isAM = cleaned.includes('AM');
      const [timePart] = cleaned.split(/\s+/);
      let [hours, minutes] = timePart.split(':').map(Number);
      if (isNaN(hours)) hours = 0;
      if (isNaN(minutes)) minutes = 0;
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      return hours * 60 + minutes;
    } catch (e) {
      return null;
    }
  };

  // ── Helper: parse shift timing string to punch in/out default times ──
  const parseShiftTimes = (shiftStr) => {
    if (!shiftStr) return { punchIn: '09:00 AM', punchOut: '06:00 PM' };
    const match = shiftStr.match(/(\d{2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{2}:\d{2}\s*(?:AM|PM))/i);
    if (match) {
      return { punchIn: match[1], punchOut: match[2] };
    }
    return { punchIn: '09:00 AM', punchOut: '06:00 PM' };
  };

  // ── Helper: calculate hours ──
  const helperCalculateHours = (inStr, outStr, breakStr = '') => {
    if (!inStr || !outStr || inStr === '--:--' || outStr === '--:--') return 0;
    try {
      const parseTime = (timeStr) => {
        const cleaned = timeStr.trim().toUpperCase();
        const isPM = cleaned.includes('PM');
        const isAM = cleaned.includes('AM');
        const [timePart] = cleaned.split(/\s+/);
        let [hours, minutes] = timePart.split(':').map(Number);
        if (isNaN(hours)) hours = 0;
        if (isNaN(minutes)) minutes = 0;
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
      };
      const inTime = parseTime(inStr);
      let outTime = parseTime(outStr);
      if (outTime < inTime) outTime.setDate(outTime.getDate() + 1);
      const diffMs = outTime - inTime;
      const hours = diffMs / (1000 * 60 * 60);
      const breakHrs = parseBreakToHours(breakStr);
      const netHours = Math.max(0, hours - breakHrs);
      return Math.max(0, Math.round(netHours * 10) / 10);
    } catch (e) {
      return 0;
    }
  };

  // ── Quick punch handlers ──
  const handleQuickPunchIn = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setQuickFormData(prev => ({ ...prev, punchIn: timeString }));
    addToast('info', `Punch In set to ${timeString}`);
  };

  const handleQuickPunchOut = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setQuickFormData(prev => {
      const totalHours = helperCalculateHours(prev.punchIn, timeString, prev.breakTime);
      return { ...prev, punchOut: timeString, totalHours };
    });
    addToast('info', `Punch Out set to ${timeString}`);
  };

  // ── Submit quick form ──
  const handleQuickFormSubmit = () => {
    if (!quickFormData.employeeId) { addToast('error', 'Please select an employee'); return; }
    if (!quickFormData.punchIn) { addToast('error', 'Please enter Punch In time'); return; }

    const record = {
      id: `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: quickFormData.employeeId,
      employeeName: quickFormData.employeeName,
      department: quickFormData.department,
      branch: quickFormData.branch,
      workMode: quickFormData.workMode,
      date: quickFormData.date,
      punchIn: quickFormData.punchIn,
      punchOut: quickFormData.punchOut || '--:--',
      breakTime: quickFormData.breakTime,
      totalHours: quickFormData.totalHours,
      status: quickFormData.status,
      source: 'Web Portal',
      notes: quickFormData.notes,
      overtime: quickFormData.totalHours > 8 ? `${(quickFormData.totalHours - 8).toFixed(1)} hrs` : '0 hrs'
    };

    addAttendanceRecord(record);
    addToast('success', `Attendance marked for ${quickFormData.employeeName}`);
    setQuickFormOpen(false);
    setQuickFormData({
      employeeId: '', employeeName: '', department: '', branch: '', workMode: '',
      date: getLocalDateString(),
      punchIn: '', punchOut: '', breakTime: '45 mins',
      totalHours: 0, status: 'Present', source: 'Web Portal', notes: ''
    });

    setTimeout(() => {
      const todayRecord = attendance.find(a => a.employeeId === quickFormData.employeeId && a.date === dateFilter);
      if (todayRecord) {
        setWpState(prev => ({
          ...prev,
          [quickFormData.employeeId]: {
            punchIn: todayRecord.punchIn,
            punchOut: todayRecord.punchOut,
            status: todayRecord.status,
            totalHours: todayRecord.totalHours,
            isNew: false,
            recordId: todayRecord.id
          }
        }));
      }
    }, 100);
  };

  // ── Sync row state ──
  useEffect(() => {
    const initialState = {};
    employees.forEach(emp => {
      const record = attendance.find(a => a.employeeId === emp.id && a.date === dateFilter);
      const breakTime = record?.breakTime || '45 mins';
      const punchIn = record?.punchIn || '';
      const punchOut = record?.punchOut || '';
      const totalHours = (record && record.totalHours) ? record.totalHours : helperCalculateHours(punchIn, punchOut, breakTime);

      initialState[emp.id] = {
        punchIn: punchIn,
        punchOut: punchOut,
        status: record?.status || 'Present',
        totalHours: totalHours,
        breakTime: breakTime,
        isNew: !record,
        recordId: record?.id || null,
        source: record?.source || 'Web Portal',
        notes: record?.notes || '',
        lastUpdated: record?.updatedAt || record?.date || '',
        workMode: record?.workMode || emp.workMode || 'WFO'
      };
    });
    setWpState(initialState);
  }, [employees, attendance, dateFilter]);

  // ── Filter employees ──
  const wpFilteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = wpSearch
        ? emp.name?.toLowerCase().includes(wpSearch.toLowerCase()) || emp.id?.toLowerCase().includes(wpSearch.toLowerCase())
        : true;
      const matchBranch = wpBranch ? emp.branch === wpBranch : true;
      const matchDept = wpDept ? emp.department === wpDept : true;
      const matchStatus = wpStatus
        ? (wpState[emp.id]?.status || '').toLowerCase() === wpStatus.toLowerCase()
        : true;
      const matchWorkMode = wpWorkMode
        ? (wpState[emp.id]?.workMode || '').toLowerCase() === wpWorkMode.toLowerCase()
        : true;
      return matchSearch && matchBranch && matchDept && matchStatus && matchWorkMode;
    });
  }, [employees, wpSearch, wpBranch, wpDept, wpStatus, wpWorkMode, wpState]);

  // ── Statistics ──
  const stats = useMemo(() => {
    const todayRecords = attendance.filter(a => a.date === dateFilter);
    const webPortalToday = todayRecords.filter(a => a.source === 'Web Portal').length;
    const presentToday = todayRecords.filter(a => a.status === 'Present' || a.status === 'Overtime').length;

    // Use TOTAL employees (not filtered view) as the denominator for consistent percentages
    const totalEmployees = employees.length;
    const completionRate = totalEmployees > 0 ? Math.min(100, Math.round((webPortalToday / totalEmployees) * 100)) : 0;

    const lateThresholdMins = timeToMinutes(attendanceRules?.lateTimeThreshold || '09:15');
    const onTimeCount = todayRecords.filter(a => {
      if (!a.punchIn) return false;
      const mins = timeToMinutes(a.punchIn);
      return mins !== null && mins <= lateThresholdMins;
    }).length;

    return {
      webPortalToday,
      presentToday,
      totalEmployees: wpFilteredEmployees.length, // filtered count shown in table header
      completionRate,
      pendingCount: Math.max(0, totalEmployees - webPortalToday), // never negative
      onTimeRate: presentToday > 0 ? Math.round((onTimeCount / presentToday) * 100) : 0,
      avgHours: presentToday > 0 ? Math.round(todayRecords.reduce((sum, a) => sum + (a.totalHours || 0), 0) / presentToday * 10) / 10 : 0
    };
  }, [attendance, dateFilter, wpFilteredEmployees, employees]);

  // ── Change handlers ──
  const handleWpChange = (empId, field, value) => {
    setWpState(prev => {
      const row = { ...prev[empId] };
      row[field] = value;
      if (field === 'punchIn' || field === 'punchOut' || field === 'breakTime') {
        row.totalHours = helperCalculateHours(row.punchIn, row.punchOut, row.breakTime);
      }
      return { ...prev, [empId]: row };
    });
  };

  const handleWpPunchInClick = (empId) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setWpState(prev => {
      const row = { ...prev[empId], punchIn: timeString };
      row.totalHours = helperCalculateHours(row.punchIn, row.punchOut, row.breakTime);
      return { ...prev, [empId]: row };
    });
    addToast('info', `Punch In set for ${empId} to ${timeString}`);
  };

  const handleWpPunchOutClick = (empId) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setWpState(prev => {
      const row = { ...prev[empId], punchOut: timeString };
      row.totalHours = helperCalculateHours(row.punchIn, row.punchOut, row.breakTime);
      return { ...prev, [empId]: row };
    });
    addToast('info', `Punch Out set for ${empId} to ${timeString}`);
  };

  const handleWpMarkSubmit = (empId, updatedRow = null) => {
    const row = updatedRow || wpState[empId];
    if (!row) return;

    const isStatusWithoutPunch = ['absent', 'on leave', 'leave'].includes((row.status || '').toLowerCase());
    if (!isStatusWithoutPunch && (!row.punchIn || row.punchIn === '--:--')) {
      addToast('error', 'Please enter a Punch In time.');
      return;
    }

    const empData = employees.find(e => e.id === empId);
    if (!empData) return;

    const punchIn = isStatusWithoutPunch ? '--:--' : row.punchIn;
    const punchOut = isStatusWithoutPunch ? '--:--' : (row.punchOut || '--:--');
    const totalHours = isStatusWithoutPunch ? 0 : (parseFloat(row.totalHours) || 0);

    const record = {
      employeeId: empId,
      employeeName: empData.name,
      department: empData.department || '',
      branch: empData.branch || '',
      workMode: row.workMode || empData.workMode || 'WFO',
      date: dateFilter,
      punchIn: punchIn,
      punchOut: punchOut,
      breakTime: row.breakTime || '0 mins',
      totalHours: totalHours,
      status: row.status,
      source: 'Web Portal',
      notes: row.notes || '',
      overtime: totalHours > 8 ? `${(totalHours - 8).toFixed(1)} hrs` : '0 hrs'
    };

    if (row.isNew) {
      const newRecord = { ...record, id: `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}` };
      addAttendanceRecord(newRecord);
      setWpState(prev => ({
        ...prev,
        [empId]: {
          ...prev[empId],
          punchIn,
          punchOut,
          totalHours,
          isNew: false,
          recordId: newRecord.id
        }
      }));
      addToast('success', `Attendance marked for ${empData.name}`);
    } else {
      updateAttendanceRecord(row.recordId, record);
      setWpState(prev => ({
        ...prev,
        [empId]: {
          ...prev[empId],
          punchIn,
          punchOut,
          totalHours
        }
      }));
      addToast('success', `Attendance updated for ${empData.name}`);
    }
  };

  const handleOpenEdit = (emp) => {
    const row = wpState[emp.id];
    setSelectedEditEmp(emp);
    setEditFormData({
      punchIn: row?.punchIn || '',
      punchOut: row?.punchOut || '',
      status: row?.status || 'Present',
      totalHours: row?.totalHours || 0,
      notes: row?.notes || '',
      workMode: row?.workMode || 'WFO'
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedEditEmp) return;
    const empId = selectedEditEmp.id;
    const updatedRow = {
      ...wpState[empId],
      punchIn: editFormData.punchIn,
      punchOut: editFormData.punchOut,
      status: editFormData.status,
      totalHours: editFormData.totalHours,
      notes: editFormData.notes,
      workMode: editFormData.workMode || 'WFO'
    };
    setWpState(prev => ({
      ...prev,
      [empId]: updatedRow
    }));
    handleWpMarkSubmit(empId, updatedRow);
    setEditModalOpen(false);
  };

  const handleBulkStatusUpdate = () => {
    selectedForBulk.forEach(empId => {
      const currentRow = wpState[empId];
      if (currentRow) {
        const updatedRow = { ...currentRow, status: bulkStatus };
        setWpState(prev => ({ ...prev, [empId]: updatedRow }));
        handleWpMarkSubmit(empId, updatedRow);
      }
    });
    setBulkActionModal(false);
    setSelectedForBulk([]);
    addToast('success', `Bulk status updated for ${selectedForBulk.length} employees`);
  };

  const handleBulkMarkStatus = (status) => {
    selectedForBulk.forEach(empId => {
      const currentRow = wpState[empId];
      if (currentRow) {
        const updatedRow = { ...currentRow, status };
        setWpState(prev => ({ ...prev, [empId]: updatedRow }));
        handleWpMarkSubmit(empId, updatedRow);
      }
    });
    setSelectedForBulk([]);
    addToast('success', `Marked ${selectedForBulk.length} employees as ${status}`);
  };

  const toggleSelectForBulk = (empId) => {
    setSelectedForBulk(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  };

  const toggleSelectAll = () => {
    if (selectedForBulk.length === wpFilteredEmployees.length) {
      setSelectedForBulk([]);
    } else {
      setSelectedForBulk(wpFilteredEmployees.map(emp => emp.id));
    }
  };

  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Branch', 'Date', 'Punch In', 'Punch Out', 'Total Hours', 'Status', 'Source', 'Notes'];
    const rows = wpFilteredEmployees.map(emp => {
      const row = wpState[emp.id];
      return [
        emp.id, emp.name, emp.department, emp.branch, dateFilter,
        row?.punchIn || '--', row?.punchOut || '--', row?.totalHours || 0,
        row?.status || 'Present', 'Web Portal', row?.notes || ''
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `webportal_attendance_${dateFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Export completed successfully');
  };

  // ── Recent Web Portal entries ──
  const webPortalRecords = useMemo(() => {
    return attendance
      .filter(a => a.source === 'Web Portal')
      .map(item => {
        const empDetails = employees.find(e => e.id === item.employeeId);
        return {
          ...item,
          department: item.department || empDetails?.department || '',
          branch: item.branch || empDetails?.branch || '',
          employeeName: item.employeeName || empDetails?.name || 'Unknown'
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [attendance, employees]);

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="wp-attendance-page">
        <div className="card wp-skeleton-header"><Skeleton variant="rect" height="100%" /></div>
        <div className="wp-stats-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card"><Skeleton variant="rect" height="100px" /></div>
          ))}
        </div>
        <div className="card"><Skeleton variant="rect" height="400px" /></div>
      </div>
    );
  }

  const activeFilters = [wpSearch, wpBranch, wpDept, wpStatus, wpWorkMode].filter(Boolean).length;

  return (
    <div className="wp-attendance-page">

      {/* ═══ Page Header ═══ */}
      <div className="wp-page-header">
        <div className="wp-header-left">
          <div className="wp-header-icon">
            <Monitor size={24} />
          </div>
          <div>
            <h1>Web Portal Attendance</h1>
            <p>Self-service attendance logging for remote and hybrid workforce</p>
          </div>
        </div>
        <div className="wp-header-actions">
          <Button variant="primary" onClick={() => setQuickFormOpen(true)} icon={Plus} size="sm">
            Quick Check-in
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} icon={Download} size="sm">
            Export
          </Button>
          <Button
            variant="secondary"
            onClick={() => setBulkActionModal(true)}
            icon={Settings}
            size="sm"
            disabled={selectedForBulk.length === 0}
          >
            Bulk ({selectedForBulk.length})
          </Button>
        </div>
      </div>

      {/* ═══ Statistics Cards ═══ */}
      <div className="wp-stats-grid">
        <div className="wp-stat-card wp-stat-total">
          <div className="wp-stat-icon"><Users size={20} /></div>
          <div className="wp-stat-info">
            <span className="wp-stat-value">{stats.totalEmployees}</span>
            <span className="wp-stat-label">Total Employees</span>
            <div className="wp-stat-progress"><div className="wp-stat-prog-fill" style={{ width: '100%', background: '#60a5fa' }} /></div>
          </div>
          <div className="wp-stat-trend wp-trend-up"><TrendingUp size={13} /> <span>+12</span></div>
        </div>

        <div className="wp-stat-card wp-stat-marked">
          <div className="wp-stat-icon"><CheckCircle2 size={20} /></div>
          <div className="wp-stat-info">
            <span className="wp-stat-value">{stats.webPortalToday}</span>
            <span className="wp-stat-label">Marked Today</span>
            <div className="wp-stat-progress"><div className="wp-stat-prog-fill" style={{ width: `${stats.completionRate}%`, background: '#4ade80' }} /></div>
          </div>
          <div className="wp-stat-trend"><span className="wp-stat-percent">{stats.completionRate}%</span> done</div>
        </div>

        <div className="wp-stat-card wp-stat-pending">
          <div className="wp-stat-icon"><Clock size={20} /></div>
          <div className="wp-stat-info">
            <span className="wp-stat-value">{stats.pendingCount}</span>
            <span className="wp-stat-label">Pending</span>
            <div className="wp-stat-progress"><div className="wp-stat-prog-fill" style={{ width: stats.totalEmployees > 0 ? `${Math.round((stats.pendingCount / stats.totalEmployees) * 100)}%` : '0%', background: '#fbbf24' }} /></div>
          </div>
          <div className="wp-stat-trend">Awaiting check-in</div>
        </div>

        <div className="wp-stat-card wp-stat-present">
          <div className="wp-stat-icon"><Activity size={20} /></div>
          <div className="wp-stat-info">
            <span className="wp-stat-value">{stats.presentToday}</span>
            <span className="wp-stat-label">Present Today</span>
            <div className="wp-stat-progress"><div className="wp-stat-prog-fill" style={{ width: stats.totalEmployees > 0 ? `${Math.round((stats.presentToday / stats.totalEmployees) * 100)}%` : '0%', background: '#a78bfa' }} /></div>
          </div>
          <div className="wp-stat-trend wp-trend-up"><TrendingUp size={13} /> <span>+5</span></div>
        </div>

        <div className="wp-stat-card wp-stat-ontime">
          <div className="wp-stat-icon"><Zap size={20} /></div>
          <div className="wp-stat-info">
            <span className="wp-stat-value">{stats.onTimeRate}%</span>
            <span className="wp-stat-label">On Time Rate</span>
            <div className="wp-stat-progress"><div className="wp-stat-prog-fill" style={{ width: `${stats.onTimeRate}%`, background: '#34d399' }} /></div>
          </div>
          <div className="wp-stat-trend">Before 9:15 AM</div>
        </div>

        <div className="wp-stat-card wp-stat-hours">
          <div className="wp-stat-icon"><Clock size={20} /></div>
          <div className="wp-stat-info">
            <span className="wp-stat-value">{stats.avgHours}</span>
            <span className="wp-stat-label">Avg Hours</span>
            <div className="wp-stat-progress"><div className="wp-stat-prog-fill" style={{ width: stats.avgHours > 0 ? `${Math.min(100, (stats.avgHours / 10) * 100)}%` : '0%', background: '#f472b6' }} /></div>
          </div>
          <div className="wp-stat-trend">per employee</div>
        </div>
      </div>

      {/* ═══ Attendance Table — Full Width ═══ */}
      <div className="card wp-attendance-card">

          {/* Card Header */}
          <div className="wp-card-header">
            <div className="wp-card-title">
              <Monitor size={16} />
              <span>Mark Team Attendance</span>
              <span className="wp-emp-count-pill">{wpFilteredEmployees.length} employees</span>
            </div>
            <div className="wp-header-controls">
              <div className="wp-date-badge">
                <Calendar size={12} />
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="wp-date-input" />
              </div>
            </div>
          </div>

          {/* ─── Enterprise Filter Toolbar ─── */}
          <div className="wp-toolbar">
            <div className="wp-toolbar-left">
              <div className="wp-search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search employee or ID..."
                  value={wpSearch}
                  onChange={e => setWpSearch(e.target.value)}
                />
                {wpSearch && <button className="wp-search-clear" onClick={() => setWpSearch('')}><X size={12} /></button>}
              </div>

              <select value={wpDept} onChange={e => setWpDept(e.target.value)} className="wp-filter-select">
                <option value="">Department</option>
                {(departments || []).map(d => (
                  <option key={d.id || d.name} value={d.name}>{d.name}</option>
                ))}
              </select>

              <select value={wpBranch} onChange={e => setWpBranch(e.target.value)} className="wp-filter-select">
                <option value="">Branch</option>
                {(branches && branches.length > 0 ? branches.map(b => b.name) : Array.from(new Set(employees.map(e => e.branch).filter(Boolean)))).map(branchName => {
                  const emoji = branchName.toLowerCase().includes('jaipur') ? '🕌' : branchName.toLowerCase().includes('delhi') ? '🏛️' : branchName.toLowerCase().includes('mumbai') ? '🌊' : '🏙️';
                  return (
                    <option key={branchName} value={branchName}>{emoji} {branchName}</option>
                  );
                })}
              </select>

              <select value={wpStatus} onChange={e => setWpStatus(e.target.value)} className="wp-filter-select">
                <option value="">Status</option>
                <option value="Present">✅ Present</option>
                <option value="Absent">❌ Absent</option>
                <option value="Late">🕐 Late</option>
                <option value="On Leave">🌴 On Leave</option>
                <option value="Overtime">⏰ Overtime</option>
              </select>

              <select value={wpWorkMode} onChange={e => setWpWorkMode(e.target.value)} className="wp-filter-select">
                <option value="">Mode</option>
                <option value="WFO">🏢 WFO</option>
                <option value="WFH">🏠 WFH</option>
                <option value="Hybrid">🔄 Hybrid</option>
              </select>

              {activeFilters > 0 && (
                <button className="wp-clear-filters" onClick={() => { setWpSearch(''); setWpBranch(''); setWpDept(''); setWpStatus(''); setWpWorkMode(''); }}>
                  <X size={13} /> Clear
                </button>
              )}
            </div>

            <div className="wp-toolbar-right">
              <button className="wp-bulk-select-btn" onClick={toggleSelectAll}>
                {selectedForBulk.length === wpFilteredEmployees.length && wpFilteredEmployees.length > 0 ? 'Deselect All' : 'Select All'}
              </button>

              {/* Column Visibility */}
              <div className="wp-col-toggle-wrapper" ref={colPanelRef}>
                <button className="wp-col-toggle-btn" onClick={() => setShowColPanel(v => !v)}>
                  <SlidersHorizontal size={14} />
                  Columns
                  <ChevronDown size={12} style={{ opacity: 0.6 }} />
                </button>

                {showColPanel && (
                  <div className="wp-col-panel">
                    <div className="wp-col-panel-header">Column Visibility</div>
                    {WP_COL_GROUPS.map(group => (
                      <div key={group.label} className="wp-col-group">
                        <div className="wp-col-group-label">{group.label}</div>
                        {group.keys.map(key => (
                          <label key={key} className="wp-col-row" onClick={() => {
                            if (key === 'checkbox' || key === 'actions') return;
                            setColVis(prev => ({ ...prev, [key]: !prev[key] }));
                          }}>
                            <span>{WP_COL_LABELS[key]}</span>
                            <ToggleSwitch
                              on={colVis[key]}
                              onChange={val => {
                                if (key !== 'checkbox' && key !== 'actions') {
                                  setColVis(prev => ({ ...prev, [key]: val }));
                                }
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                    <button className="wp-col-reset-btn" onClick={() => setColVis(WP_DEFAULT_VISIBILITY)}>
                      <RefreshCw size={12} /> Reset Defaults
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Sticky Bulk Action Bar ─── */}
          <div className={`wp-bulk-bar ${selectedForBulk.length > 0 ? 'wp-bulk-bar-visible' : ''}`}>
            <div className="wp-bulk-bar-left">
              <span className="wp-bulk-count-badge">{selectedForBulk.length}</span>
              <span className="wp-bulk-bar-label">employees selected</span>
              <button className="wp-bulk-deselect" onClick={() => setSelectedForBulk([])}>Deselect all</button>
            </div>
            <div className="wp-bulk-bar-right">
              <button className="wp-bulk-btn wp-bulk-present" onClick={() => handleBulkMarkStatus('Present')}>
                <CheckCircle size={13} /> Present
              </button>
              <button className="wp-bulk-btn wp-bulk-absent" onClick={() => handleBulkMarkStatus('Absent')}>
                <XCircle size={13} /> Absent
              </button>
              <button className="wp-bulk-btn wp-bulk-wfh" onClick={() => handleBulkMarkStatus('Work From Home')}>
                <Globe size={13} /> WFH
              </button>
              <button className="wp-bulk-btn wp-bulk-leave" onClick={() => handleBulkMarkStatus('On Leave')}>
                <Calendar size={13} /> Leave
              </button>
              <button className="wp-bulk-btn wp-bulk-export" onClick={handleExportCSV}>
                <Download size={13} /> Export
              </button>
              <button className="wp-bulk-btn wp-bulk-update" onClick={() => setBulkActionModal(true)}>
                <Settings size={13} /> Bulk Update
              </button>
            </div>
          </div>

          {/* ─── Table ─── */}
          <div className="wp-table-wrapper">
            <table className="wp-attendance-table">
              <thead>
                <tr>
                  {colVis.checkbox && (
                    <th className="wp-th-check">
                      <input
                        type="checkbox"
                        checked={selectedForBulk.length === wpFilteredEmployees.length && wpFilteredEmployees.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  {colVis.employeeId && <th>{WP_COL_LABELS.employeeId}</th>}
                  {colVis.employee && <th className="wp-th-employee">{WP_COL_LABELS.employee}</th>}
                  {colVis.department && <th>{WP_COL_LABELS.department}</th>}
                  {colVis.branch && <th>{WP_COL_LABELS.branch}</th>}
                  {colVis.shift && <th>{WP_COL_LABELS.shift}</th>}
                  {colVis.punchIn && <th>{WP_COL_LABELS.punchIn}</th>}
                  {colVis.punchOut && <th>{WP_COL_LABELS.punchOut}</th>}
                  {colVis.breakTime && <th>{WP_COL_LABELS.breakTime}</th>}
                  {colVis.workingHours && <th>{WP_COL_LABELS.workingHours}</th>}
                  {colVis.overtime && <th>{WP_COL_LABELS.overtime}</th>}
                  {colVis.status && <th>{WP_COL_LABELS.status}</th>}
                  {colVis.source && <th>{WP_COL_LABELS.source}</th>}
                  {colVis.lastUpdated && <th>{WP_COL_LABELS.lastUpdated}</th>}
                  {colVis.actions && <th className="wp-th-actions">{WP_COL_LABELS.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {wpFilteredEmployees.map(emp => {
                  const rowState = wpState[emp.id] || { punchIn: '', punchOut: '', status: '', totalHours: 0, breakTime: '45 mins', isNew: true };
                  const isSelected = selectedForBulk.includes(emp.id);
                  const shiftTimes = parseShiftTimes(emp.shift || emp.shiftTiming);
                  return (
                    <tr key={emp.id} className={`wp-emp-row ${isSelected ? 'wp-row-selected' : ''}`}>
                      {colVis.checkbox && (
                        <td className="wp-td-check">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectForBulk(emp.id)}
                          />
                        </td>
                      )}

                      {colVis.employeeId && (
                        <td>
                          <span className="wp-emp-id-mono">{emp.id}</span>
                        </td>
                      )}

                      {colVis.employee && (
                        <td className="wp-td-employee">
                          <div className="wp-employee-cell">
                            <div className="wp-avatar-wrapper">
                              <Avatar name={emp.name} size="sm" />
                              <OnlineDot status={emp.status || 'Idle'} />
                            </div>
                            <div className="wp-emp-info">
                              <div className="wp-emp-name">{emp.name}</div>
                              <div className="wp-emp-role">{emp.designation || emp.role || 'Employee'}</div>
                            </div>
                          </div>
                        </td>
                      )}

                      {colVis.department && (
                        <td>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.department}</span>
                        </td>
                      )}

                      {colVis.branch && (
                        <td>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.branch}</span>
                        </td>
                      )}

                      {colVis.shift && (
                        <td>
                          <span className="wp-shift-text" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {emp.shift || 'Flexible Shift'}
                          </span>
                        </td>
                      )}

                      {colVis.punchIn && (
                        <td>
                          <div className="wp-time-input-group">
                            <input
                              type="text"
                              placeholder={shiftTimes.punchIn}
                              value={rowState.punchIn}
                              onChange={e => handleWpChange(emp.id, 'punchIn', e.target.value)}
                              className="wp-time-input"
                            />
                            <button
                              className="wp-time-btn wp-punch-in-btn"
                              onClick={() => handleWpPunchInClick(emp.id)}
                              title="Set current time"
                            >
                              <Clock size={11} />
                            </button>
                          </div>
                        </td>
                      )}

                      {colVis.punchOut && (
                        <td>
                          <div className="wp-time-input-group">
                            <input
                              type="text"
                              placeholder={shiftTimes.punchOut}
                              value={rowState.punchOut}
                              onChange={e => handleWpChange(emp.id, 'punchOut', e.target.value)}
                              className="wp-time-input"
                            />
                            <button
                              className="wp-time-btn wp-punch-out-btn"
                              onClick={() => handleWpPunchOutClick(emp.id)}
                              title="Set current time"
                              disabled={!rowState.punchIn}
                            >
                              <Clock size={11} />
                            </button>
                          </div>
                        </td>
                      )}

                      {colVis.breakTime && (
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {rowState.breakTime || '--'}
                          </span>
                        </td>
                      )}

                      {colVis.workingHours && (
                        <td className="wp-hours-cell">
                          <span className={rowState.totalHours > 0 ? 'wp-hours-value' : 'wp-hours-empty'}>
                            {rowState.totalHours > 0 ? `${rowState.totalHours} hrs` : '--'}
                          </span>
                        </td>
                      )}

                      {colVis.overtime && (
                        <td>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            color: rowState.totalHours > 8 ? 'var(--color-success)' : 'var(--text-muted)', 
                            fontWeight: rowState.totalHours > 8 ? 600 : 400 
                          }}>
                            {rowState.totalHours > 8 ? `${(rowState.totalHours - 8).toFixed(1)} hrs` : '0 hrs'}
                          </span>
                        </td>
                      )}

                      {colVis.status && (
                        <td>
                          <div className="wp-status-wrapper">
                            <select
                              value={rowState.status}
                              onChange={e => handleWpChange(emp.id, 'status', e.target.value)}
                              className="wp-status-select"
                            >
                              <option value="">Select Status</option>
                              <option value="Present">✅ Present</option>
                              <option value="Late">🕐 Late</option>
                              <option value="Absent">❌ Absent</option>
                              <option value="Half Day">🌗 Half Day</option>
                              <option value="On Leave">🌴 On Leave</option>
                              <option value="Overtime">⏰ Overtime</option>
                            </select>
                          </div>
                        </td>
                      )}

                      {colVis.source && (
                        <td>
                          <span className="wp-source-badge">
                            <Globe size={10} /> {rowState.source || 'Web Portal'}
                          </span>
                        </td>
                      )}

                      {colVis.lastUpdated && (
                        <td>
                          <span className="wp-last-updated">
                            {rowState.lastUpdated ? new Date(rowState.lastUpdated).toLocaleDateString() : '--'}
                          </span>
                        </td>
                      )}

                      {colVis.actions && (
                        <td>
                          <div className="wp-action-group">
                            <button
                              className="wp-action-btn wp-btn-edit"
                              onClick={() => handleOpenEdit(emp)}
                              title="Edit Attendance"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className={`wp-action-btn ${rowState.isNew ? 'wp-btn-mark' : 'wp-btn-update'}`}
                              onClick={() => handleWpMarkSubmit(emp.id)}
                              title={rowState.isNew ? 'Mark Attendance' : 'Update Attendance'}
                            >
                              {rowState.isNew ? <CheckCircle2 size={13} /> : <Save size={13} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {wpFilteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan="14" className="wp-empty-cell">
                      <div className="wp-empty-state">
                        <Users size={48} className="wp-empty-icon" />
                        <p>No employees found</p>
                        <span>Try adjusting your search or filters</span>
                        <button className="wp-empty-clear-btn" onClick={() => { setWpSearch(''); setWpBranch(''); setWpDept(''); setWpStatus(''); }}>
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Table Footer ─── */}
          <div className="wp-table-footer">
            <div className="wp-footer-info">
              <span>Showing <strong>{wpFilteredEmployees.length}</strong> employees</span>
              <span className="wp-footer-sep">·</span>
              <span>{new Date(dateFilter).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="wp-footer-legend">
              <span><span className="wp-leg-dot" style={{ background: '#3b82f6' }} />Office</span>
              <span><span className="wp-leg-dot" style={{ background: '#10b981' }} />WFH</span>
              <span><span className="wp-leg-dot" style={{ background: '#f59e0b' }} />Hybrid</span>
              <span><span className="wp-leg-dot" style={{ background: '#fbbf24' }} />Overtime</span>
            </div>
          </div>
      </div>

      {/* ═══ Bottom Row: Quick Stats + Recent Entries + Branch Distribution ═══ */}
      <div className="wp-bottom-row">

        {/* Quick Stats Card */}
        <div className="card wp-quick-stats-card">
            <div className="wp-card-header">
              <div className="wp-card-title"><Zap size={16} /><span>Quick Stats</span></div>
            </div>
            <div className="wp-quick-stats-grid">
              <div className="wp-quick-stat">
                <div className="wp-qs-value" style={{ color: '#4ade80' }}>{stats.completionRate}%</div>
                <div className="wp-qs-label">Completion</div>
                <div className="wp-qs-bar"><div className="wp-qs-fill" style={{ width: `${stats.completionRate}%`, background: '#4ade80' }} /></div>
              </div>
              <div className="wp-quick-stat">
                <div className="wp-qs-value" style={{ color: '#fbbf24' }}>{stats.pendingCount}</div>
                <div className="wp-qs-label">Pending</div>
                <div className="wp-qs-bar"><div className="wp-qs-fill" style={{ width: `${stats.totalEmployees > 0 ? Math.round((stats.pendingCount / stats.totalEmployees) * 100) : 0}%`, background: '#fbbf24' }} /></div>
              </div>
              <div className="wp-quick-stat">
                <div className="wp-qs-value" style={{ color: '#60a5fa' }}>{stats.webPortalToday}</div>
                <div className="wp-qs-label">Web Portal</div>
                <div className="wp-qs-bar"><div className="wp-qs-fill" style={{ width: `${stats.completionRate}%`, background: '#60a5fa' }} /></div>
              </div>
              <div className="wp-quick-stat">
                <div className="wp-qs-value" style={{ color: '#a78bfa' }}>{stats.onTimeRate}%</div>
                <div className="wp-qs-label">On Time</div>
                <div className="wp-qs-bar"><div className="wp-qs-fill" style={{ width: `${stats.onTimeRate}%`, background: '#a78bfa' }} /></div>
              </div>
            </div>
        </div>

        {/* Recent Entries */}
        <div className="card wp-recent-card">
            <div className="wp-card-header">
              <div className="wp-card-title"><FileText size={16} /><span>Recent Entries</span></div>
              <Badge variant="info">{webPortalRecords.length} new</Badge>
            </div>
            <div className="wp-recent-list">
              {webPortalRecords.map((entry, i) => (
                <div key={i} className="wp-recent-item">
                  <Avatar name={entry.employeeName} size="sm" />
                  <div className="wp-recent-info">
                    <div className="wp-recent-name">{entry.employeeName}</div>
                    <div className="wp-recent-meta">
                      <span><Building size={10} /> {entry.branch}</span>
                      <span><Briefcase size={10} /> {entry.department}</span>
                    </div>
                  </div>
                  <div className="wp-recent-times">
                    <span className="wp-recent-in">In: {entry.punchIn}</span>
                    <span className="wp-recent-out">Out: {entry.punchOut || '--'}</span>
                  </div>
                  <WpStatusBadge status={entry.status} />
                </div>
              ))}
              {webPortalRecords.length === 0 && (
                <div className="wp-empty-recent">
                  <Clock size={32} />
                  <p>No recent entries</p>
                  <span>Use Quick Check-in to mark attendance</span>
                </div>
              )}
            </div>
        </div>

        {/* Branch Distribution */}
        <div className="card wp-branch-dist-card">
            <div className="wp-card-header">
              <div className="wp-card-title"><MapPin size={16} /><span>Branch Distribution</span></div>
            </div>
            <div className="wp-branch-list">
              {(branches && branches.length > 0 ? branches.map(b => b.name) : Array.from(new Set(employees.map(e => e.branch).filter(Boolean)))).map(branch => {
                const count = wpFilteredEmployees.filter(e => e.branch === branch).length;
                const percentage = stats.totalEmployees > 0 ? Math.round((count / stats.totalEmployees) * 100) : 0;
                const emoji = branch.toLowerCase().includes('jaipur') ? '🕌' : branch.toLowerCase().includes('delhi') ? '🏛️' : branch.toLowerCase().includes('mumbai') ? '🌊' : '🏙️';
                return (
                  <div key={branch} className="wp-branch-item">
                    <div className="wp-branch-row">
                      <span className="wp-branch-emoji">{emoji}</span>
                      <span className="wp-branch-name">{branch}</span>
                      <span className="wp-branch-count">{count} emp</span>
                      <span className="wp-branch-pct">{percentage}%</span>
                    </div>
                    <div className="wp-branch-bar">
                      <div className="wp-branch-fill" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
        </div>

      </div>

      {/* ═══ Quick Check-in Modal ═══ */}
      <Modal isOpen={quickFormOpen} onClose={() => setQuickFormOpen(false)} title="Quick Check-in" size="md">
        <div className="wp-quick-form">
          <div className="wp-quick-form-grid">
            <div className="wp-form-field wp-field-full">
              <label>Select Employee *</label>
              <select
                value={quickFormData.employeeId}
                onChange={ev => {
                  const found = employees.find(em => em.id === ev.target.value);
                  setQuickFormData(prev => ({
                    ...prev,
                    employeeId: ev.target.value,
                    employeeName: found?.name || '',
                    department: found?.department || '',
                    branch: found?.branch || '',
                    workMode: found?.workMode || ''
                  }));
                }}
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.id}) - {emp.department}</option>
                ))}
              </select>
            </div>

            {quickFormData.employeeName && (
              <div className="wp-employee-preview wp-field-full">
                <Avatar name={quickFormData.employeeName} size="md" />
                <div>
                  <strong>{quickFormData.employeeName}</strong>
                  <br />
                  <small>{quickFormData.department} · {quickFormData.branch}</small>
                </div>
                <WorkModeBadge mode={quickFormData.workMode} />
              </div>
            )}

            <div className="wp-form-field">
              <label>Date</label>
              <input type="date" value={quickFormData.date} onChange={e => setQuickFormData(prev => ({ ...prev, date: e.target.value }))} />
            </div>

            <div className="wp-punch-buttons wp-field-full">
              <button type="button" className="wp-quick-punch-in" onClick={handleQuickPunchIn}>
                <Clock size={15} /> Punch In Now
              </button>
              <button type="button" className="wp-quick-punch-out" onClick={handleQuickPunchOut} disabled={!quickFormData.punchIn}>
                <Clock size={15} /> Punch Out Now
              </button>
            </div>

            <div className="wp-form-field">
              <label>Punch In Time</label>
              <input type="text" placeholder="09:00 AM" value={quickFormData.punchIn} onChange={e => setQuickFormData(prev => ({ ...prev, punchIn: e.target.value, totalHours: helperCalculateHours(e.target.value, prev.punchOut, prev.breakTime) }))} />
            </div>
            <div className="wp-form-field">
              <label>Punch Out Time</label>
              <input type="text" placeholder="06:00 PM" value={quickFormData.punchOut} onChange={e => setQuickFormData(prev => ({ ...prev, punchOut: e.target.value, totalHours: helperCalculateHours(prev.punchIn, e.target.value, prev.breakTime) }))} />
            </div>
            <div className="wp-form-field">
              <label>Total Hours</label>
              <input type="number" step="0.1" value={quickFormData.totalHours} onChange={e => setQuickFormData(prev => ({ ...prev, totalHours: parseFloat(e.target.value) || 0 }))} />
            </div>

            <div className="wp-form-field">
              <label>Status</label>
              <select value={quickFormData.status} onChange={e => setQuickFormData(prev => ({ ...prev, status: e.target.value }))}>
                <option value="Present">✅ Present</option>
                <option value="Late">🕐 Late</option>
                <option value="Absent">❌ Absent</option>
                <option value="Half Day">🌗 Half Day</option>
                <option value="On Leave">🌴 On Leave</option>
                <option value="Overtime">⏰ Overtime</option>
              </select>
            </div>

            <div className="wp-form-field">
              <label>Mode</label>
              <select value={quickFormData.workMode} onChange={e => setQuickFormData(prev => ({ ...prev, workMode: e.target.value }))}>
                <option value="WFO">WFO</option>
                <option value="WFH">WFH</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div className="wp-form-field wp-field-full">
              <label>Notes (Optional)</label>
              <textarea rows="2" placeholder="Any remarks..." value={quickFormData.notes} onChange={e => setQuickFormData(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>

          <div className="wp-quick-form-actions">
            <Button variant="secondary" onClick={() => setQuickFormOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleQuickFormSubmit} disabled={!quickFormData.employeeId || !quickFormData.punchIn}>
              Submit Attendance
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ Edit Modal ═══ */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Attendance: ${selectedEditEmp?.name}`} size="sm">
        <div className="wp-edit-form">
          <div className="wp-edit-field">
            <label>Punch In Time</label>
            <input
              type="text"
              placeholder="09:00 AM"
              value={editFormData.punchIn}
              onChange={e => {
                const val = e.target.value;
                setEditFormData(prev => {
                  const breakTime = selectedEditEmp ? wpState[selectedEditEmp.id]?.breakTime : '45 mins';
                  return { ...prev, punchIn: val, totalHours: helperCalculateHours(val, prev.punchOut, breakTime) };
                });
              }}
            />
          </div>
          <div className="wp-edit-field">
            <label>Punch Out Time</label>
            <input
              type="text"
              placeholder="06:00 PM"
              value={editFormData.punchOut}
              onChange={e => {
                const val = e.target.value;
                setEditFormData(prev => {
                  const breakTime = selectedEditEmp ? wpState[selectedEditEmp.id]?.breakTime : '45 mins';
                  return { ...prev, punchOut: val, totalHours: helperCalculateHours(prev.punchIn, val, breakTime) };
                });
              }}
            />
          </div>
          <div className="wp-edit-field">
            <label>Total Hours</label>
            <input
              type="number"
              step="0.1"
              value={editFormData.totalHours}
              onChange={e => setEditFormData(prev => ({ ...prev, totalHours: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="wp-edit-field">
            <label>Status</label>
            <select value={editFormData.status} onChange={e => setEditFormData(prev => ({ ...prev, status: e.target.value }))}>
              <option value="Present">✅ Present</option>
              <option value="Late">🕐 Late</option>
              <option value="Absent">❌ Absent</option>
              <option value="Half Day">🌗 Half Day</option>
              <option value="On Leave">🌴 On Leave</option>
              <option value="Overtime">⏰ Overtime</option>
            </select>
          </div>
          <div className="wp-edit-field">
            <label>Mode</label>
            <select value={editFormData.workMode} onChange={e => setEditFormData(prev => ({ ...prev, workMode: e.target.value }))}>
              <option value="WFO">WFO</option>
              <option value="WFH">WFH</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
          <div className="wp-edit-field"><label>Notes</label><textarea rows="2" placeholder="Any remarks..." value={editFormData.notes} onChange={e => setEditFormData(prev => ({ ...prev, notes: e.target.value }))} /></div>
        </div>
        <div className="wp-modal-footer">
          <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleEditSubmit}>Save Changes</Button>
        </div>
      </Modal>

      {/* ═══ Bulk Action Modal ═══ */}
      <Modal isOpen={bulkActionModal} onClose={() => setBulkActionModal(false)} title="Bulk Status Update" size="sm">
        <div className="wp-bulk-form">
          <div className="wp-bulk-info">
            <Users size={20} />
            <span>Updating status for <strong>{selectedForBulk.length}</strong> employees</span>
          </div>
          <div className="wp-edit-field">
            <label>Select Status</label>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
              <option value="Present">✅ Present</option>
              <option value="Late">🕐 Late</option>
              <option value="Absent">❌ Absent</option>
              <option value="Half Day">🌗 Half Day</option>
              <option value="On Leave">🌴 On Leave</option>
              <option value="Overtime">⏰ Overtime</option>
            </select>
          </div>
        </div>
        <div className="wp-modal-footer">
          <Button variant="secondary" onClick={() => setBulkActionModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleBulkStatusUpdate}>Apply to {selectedForBulk.length} employees</Button>
        </div>
      </Modal>

    </div>
  );
};

export default WebPortalAttendance;