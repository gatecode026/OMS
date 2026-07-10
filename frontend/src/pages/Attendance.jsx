import React, { useState, useMemo, useEffect } from 'react';
import './Attendance.css';
import './EmployeeDashboard.css';
import { useApp } from '../context/AppContext';
import { FIELD_LABELS } from '../utils/fieldLabels';
import { useNavigate } from 'react-router-dom';
import { encodeEmployeeId } from '../utils/hashId';
import TodayStatusCard from '../components/TodayStatusCard';
import AttendanceDayCard from '../components/AttendanceDayCard';
import AttendanceSummaryChart from '../components/AttendanceSummaryChart';
import WeeklyTrendChart from '../components/WeeklyTrendChart';
import MonthlyDonutChart from '../components/MonthlyDonutChart';
import LiveActivityFeed from '../components/LiveActivityFeed';
import useMyAttendance from '../hooks/useMyAttendance';
import usePageLoading from '../hooks/usePageLoading';
import MarkAttendanceModal from '../components/employeeDashboard/modals/MarkAttendanceModal';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  Download, Calendar, Filter, Edit2, Search, Clock, Plus,
  AlertCircle, Sparkles, Check, CheckCircle2, UserCheck,
  UserMinus, ShieldAlert, Award, ArrowUpRight, ShieldCheck, Shield,
  Activity, MapPin, Globe, Zap, Bell, BarChart2, FileText,
  RefreshCw, Settings, Users, Cpu, TrendingUp, TrendingDown,
  ChevronRight, AlertTriangle, CheckSquare, Coffee, Home,
  Smartphone, Fingerprint, Wifi, Eye, Share2, MoreHorizontal,
  Target, Layers, BookOpen, Briefcase, Building, Monitor
} from 'lucide-react';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime12 = (time24) => {
  if (!time24) return '--:--';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

const getDatesRange = (rangeType) => {
  const dates = [];
  const today = new Date();
  
  if (rangeType === 'today') {
    dates.push(getLocalDateString());
  } else if (rangeType === '7days') {
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
  } else if (rangeType === 'month') {
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const currentDay = today.getDate();
    for (let i = currentDay; i >= 1; i--) {
      const dayStr = String(i).padStart(2, '0');
      const monthStr = String(month).padStart(2, '0');
      dates.push(`${year}-${monthStr}-${dayStr}`);
    }
  }
  return dates;
};

const normalizeWorkMode = (mode) => {
  if (!mode) return 'WFO';
  const m = mode.trim().toUpperCase();
  if (m === 'WFH' || m.includes('HOME')) return 'WFH';
  if (m === 'HYBRID') return 'Hybrid';
  return 'WFO';
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || timeStr === '--:--') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      const hrs = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      if (!isNaN(hrs) && !isNaN(mins)) {
        return hrs * 60 + mins;
      }
    }
    return null;
  }
  let hrs = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hrs !== 12) hrs += 12;
  if (ampm === 'AM' && hrs === 12) hrs = 0;
  return hrs * 60 + mins;
};

const calculateWorkingHours = (punchIn, punchOut) => {
  const inMins = parseTimeToMinutes(punchIn);
  const outMins = parseTimeToMinutes(punchOut);
  if (inMins === null || outMins === null) return 0;
  
  let diffMins = outMins - inMins;
  if (diffMins < 0) {
    diffMins += 24 * 60;
  }
  const diffHours = diffMins / 60;
  return Math.round(diffHours * 100) / 100;
};

const convert12to24 = (time12) => {
  if (!time12 || time12 === '--:--') return '';
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    if (/^\d{2}:\d{2}$/.test(time12.trim())) return time12.trim();
    return '';
  }
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const convert24to12 = (time24) => {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return '';
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

const decimalToTimeStr = (decimalVal) => {
  if (decimalVal === undefined || decimalVal === null || isNaN(decimalVal) || decimalVal <= 0) return '00:00';
  const hrs = Math.floor(decimalVal);
  const mins = Math.round((decimalVal - hrs) * 60);
  let finalHrs = hrs;
  let finalMins = mins;
  if (finalMins === 60) {
    finalHrs += 1;
    finalMins = 0;
  }
  return `${String(finalHrs).padStart(2, '0')}:${String(finalMins).padStart(2, '0')}`;
};

const timeStrToDecimal = (timeStr) => {
  if (!timeStr) return 0;
  if (typeof timeStr === 'number') return timeStr;
  const str = String(timeStr).trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return parseFloat((hrs + mins / 60).toFixed(2));
  }
  return parseFloat(str) || 0;
};

const calculateWorkingHours60 = (punchIn, punchOut) => {
  const inMins = parseTimeToMinutes(punchIn);
  const outMins = parseTimeToMinutes(punchOut);
  if (inMins === null || outMins === null) return '00:00';
  
  let diffMins = outMins - inMins;
  if (diffMins < 0) {
    diffMins += 24 * 60;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const Attendance = () => {
  const isLoading = usePageLoading(600);
  const navigate = useNavigate();
  const {
    attendance,
    employees,
    branches,
    departments,
    updateAttendanceRecord,
    addAttendanceRecord,
    updateEmployee,
    addToast,
    currentUser,
    currentUserRole,
    fetchEmployees,
    fetchAttendance,
    attendanceRules,
    hasPermission,
    correctionRequests,
    fetchCorrectionRequests,
    token
  } = useApp();

  const [personalTab, setPersonalTab] = useState('today'); // today, 7days, month, custom
  const [customRange, setCustomRange] = useState({ from: '', to: '' });

  const [queueFilterTab, setQueueFilterTab] = useState('active'); // 'active' or 'history'

  const filteredQueueRequests = useMemo(() => {
    const list = correctionRequests || [];
    if (queueFilterTab === 'active') {
      return list.filter(r => ['Pending', 'Under Review', 'More Information Required'].includes(r.status));
    }
    return list.filter(r => ['Approved', 'Rejected', 'Cancelled'].includes(r.status));
  }, [correctionRequests, queueFilterTab]);

  // Attendance Correction workflow states
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: '',
    correctionType: 'Manual Attendance Request',
    requestedPunchIn: '09:30',
    requestedPunchOut: '18:00',
    requestedStatus: 'Present',
    requestedShift: 'Day Shift',
    reason: '',
    remarks: ''
  });
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailRemarks, setDetailRemarks] = useState('');

  // Compute date range for useMyAttendance hook to load broad chart data (always last 30 days by default, or custom range)
  const personalFiltersForFetch = useMemo(() => {
    const today = new Date();
    const getFormattedDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${date}`;
    };
    
    if (personalTab === 'custom' && customRange.from && customRange.to) {
      return { from: customRange.from, to: customRange.to };
    }
    
    // Fetch last 30 days to fully populate all graphs
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return { from: getFormattedDate(thirtyDaysAgo), to: getFormattedDate(today) };
  }, [personalTab, customRange]);

  const {
    loading: personalLoading,
    todayRecord: personalTodayRecord,
    summary: personalSummary,
    records: personalRecords,
    refetch: personalRefetch
  } = useMyAttendance(personalFiltersForFetch);

  // Locally filter records for display in logs and feeds based on selected tab
  const filteredRecords = useMemo(() => {
    const today = new Date();
    const getFormattedDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${date}`;
    };
    const todayStr = getFormattedDate(today);

    if (personalTab === 'today') {
      return personalRecords.filter(r => r.date === todayStr);
    }
    if (personalTab === '7days') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      const startStr = getFormattedDate(start);
      return personalRecords.filter(r => r.date >= startStr && r.date <= todayStr);
    }
    if (personalTab === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startStr = getFormattedDate(startOfMonth);
      return personalRecords.filter(r => r.date >= startStr && r.date <= todayStr);
    }
    return personalRecords;
  }, [personalRecords, personalTab]);

  console.log('DEBUG Attendance.jsx: personalTodayRecord =', personalTodayRecord, 'loading =', personalLoading);

  const canManageAttendance = useMemo(() => {
    if (typeof hasPermission !== 'function') return true;
    return hasPermission('attendance_management', 'create') || 
           hasPermission('attendance_management', 'update') || 
           hasPermission('attendance_management', 'approve') ||
           hasPermission('attendance_management', 'delete');
  }, [hasPermission]);

  const scopedEmployees = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin') return employees;
    if (currentUserRole === 'branch_admin') {
      return employees.filter(e => e.branch === currentUser?.branch);
    }
    if (currentUserRole === 'dept_admin' || currentUserRole === 'team_leader') {
      return employees.filter(e => e.department === currentUser?.department);
    }
    if (currentUserRole === 'employee') {
      return employees.filter(e => e.id === currentUser?.id);
    }
    return employees;
  }, [employees, currentUser, currentUserRole]);

  const [perspective, setPerspective] = useState(() => {
    if (currentUserRole === 'employee') return 'self';
    const hasCompanyRead = hasPermission('attendance_management', 'read', 'company');
    const hasSelfRead = hasPermission('attendance_management', 'read', 'self');
    
    const saved = localStorage.getItem('perspective_attendance');
    if (saved === 'self' && hasSelfRead) return 'self';
    if (saved === 'company' && hasCompanyRead) return 'company';

    return hasCompanyRead ? 'company' : 'self';
  });

  const showPerspectiveDropdown = useMemo(() => {
    if (currentUserRole === 'employee') return false;
    const hasCompanyRead = hasPermission('attendance_management', 'read', 'company');
    const hasSelfRead = hasPermission('attendance_management', 'read', 'self');
    return hasCompanyRead && hasSelfRead;
  }, [currentUserRole, hasPermission]);

  useEffect(() => {
    if (currentUserRole !== 'employee') {
      localStorage.setItem('perspective_attendance', perspective);
    }
  }, [perspective, currentUserRole]);

  useEffect(() => {
    if (currentUserRole === 'employee') {
      setPerspective('self');
    } else {
      const hasCompanyRead = hasPermission('attendance_management', 'read', 'company');
      const hasSelfRead = hasPermission('attendance_management', 'read', 'self');
      const saved = localStorage.getItem('perspective_attendance');
      if (saved === 'self' && hasSelfRead) {
        setPerspective('self');
      } else if (saved === 'company' && hasCompanyRead) {
        setPerspective('company');
      } else {
        setPerspective(hasCompanyRead ? 'company' : 'self');
      }
    }
  }, [currentUserRole, hasPermission]);

  const isEmployeeView = perspective === 'self';
  const isCompanyView = perspective === 'company';

  // Active view tab state
  const [activeSection, setActiveSection] = useState('records');

  useEffect(() => {
    if (perspective === 'self') {
      setActiveSection('records');
    } else {
      setActiveSection('overview');
    }
  }, [perspective]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(getLocalDateString());
  const [deptFilter, setDeptFilter] = useState('');
  const isGlobalAdmin = currentUserRole === 'super_admin' || currentUserRole === 'company_admin';
  const [branchFilter, setBranchFilter] = useState(() => {
    if (currentUserRole && currentUserRole !== 'super_admin' && currentUserRole !== 'company_admin') {
      return currentUser?.branch || '';
    }
    return '';
  });

  useEffect(() => {
    if (currentUser && currentUserRole && currentUserRole !== 'super_admin' && currentUserRole !== 'company_admin') {
      setBranchFilter(currentUser.branch || '');
    }
  }, [currentUser?.branch, currentUserRole]);
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('');
  const [timeRangeFilter, setTimeRangeFilter] = useState('today'); // today, 7days, month



  // Edit record states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    punchIn: '',
    punchOut: '',
    totalHours: '00:00',
    status: 'Present',
    source: 'Biometric',
    workMode: 'WFO'
  });

  // Mark Attendance state
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    reportType: 'All Employees',
    employeeId: '',
    dateRange: 'AllTime',
    format: 'CSV'
  });
  const [selfAttModalOpen, setSelfAttModalOpen] = useState(false);
  const [markFormData, setMarkFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    branch: '',
    workMode: 'WFO',
    date: getLocalDateString(),
    punchIn: '',
    punchOut: '',
    breakTime: '45 mins',
    totalHours: '00:00',
    status: 'Present',
    source: 'Web Portal'
  });

  useEffect(() => {
    if (currentUser && currentUserRole === 'employee') {
      setMarkFormData(prev => {
        const nextData = {
          ...prev,
          employeeId: currentUser.id,
          employeeName: currentUser.name,
          department: currentUser.department || '',
          branch: currentUser.branch || '',
          workMode: currentUser.workMode || 'Work From Office'
        };
        if (
          prev.employeeId === nextData.employeeId &&
          prev.employeeName === nextData.employeeName &&
          prev.department === nextData.department &&
          prev.branch === nextData.branch &&
          prev.workMode === nextData.workMode
        ) {
          return prev;
        }
        return nextData;
      });
    }
  }, [
    currentUser?.id,
    currentUser?.name,
    currentUser?.department,
    currentUser?.branch,
    currentUser?.workMode,
    currentUserRole
  ]);

  useEffect(() => {
    if (perspective === 'self') {
      setActiveSection('records');
    }
  }, [perspective]);

  // Auto-calculate hours for Edit Modal
  useEffect(() => {
    if (editFormData.punchIn && editFormData.punchOut) {
      const calculated = calculateWorkingHours60(editFormData.punchIn, editFormData.punchOut);
      setEditFormData(prev => {
        if (prev.totalHours !== calculated) {
          return { ...prev, totalHours: calculated };
        }
        return prev;
      });
    } else {
      setEditFormData(prev => {
        if (prev.totalHours !== '00:00') {
          return { ...prev, totalHours: '00:00' };
        }
        return prev;
      });
    }
  }, [editFormData.punchIn, editFormData.punchOut]);

  // Auto-calculate hours for Mark Modal
  useEffect(() => {
    if (markFormData.punchIn && markFormData.punchOut) {
      const calculated = calculateWorkingHours60(markFormData.punchIn, markFormData.punchOut);
      setMarkFormData(prev => {
        if (prev.totalHours !== calculated) {
          return { ...prev, totalHours: calculated };
        }
        return prev;
      });
    } else {
      setMarkFormData(prev => {
        if (prev.totalHours !== '00:00') {
          return { ...prev, totalHours: '00:00' };
        }
        return prev;
      });
    }
  }, [markFormData.punchIn, markFormData.punchOut]);

  // Assign Shift state
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftFormData, setShiftFormData] = useState({
    employeeId: '',
    shift: 'Morning (09:00 AM - 06:00 PM)'
  });

  // Manage Break state
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [modalBreaks, setModalBreaks] = useState([]);
  const [newBreakName, setNewBreakName] = useState('');
  const [newBreakDuration, setNewBreakDuration] = useState('');

  const globalBreaks = useMemo(() => {
    // 1. Search for a record on the current dateFilter that has a non-empty breaks array (ignoring settings doc)
    let recordWithBreaks = (attendance || []).find(
      a => a.date === dateFilter && a.breaks && a.breaks.length > 0 && a.id !== 'SETTINGS-BREAKS'
    );
    // 2. If not found, look up any previous record in history with a non-empty breaks array
    if (!recordWithBreaks) {
      recordWithBreaks = (attendance || []).find(
        a => a.breaks && a.breaks.length > 0 && a.id !== 'SETTINGS-BREAKS'
      );
    }
    // 3. Fallback
    if (recordWithBreaks) {
      return recordWithBreaks.breaks;
    }
    return [];
  }, [attendance, dateFilter]);

  const totalBreakMinutes = useMemo(() => {
    return globalBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
  }, [globalBreaks]);

  useEffect(() => {
    if (breakModalOpen) {
      setModalBreaks(globalBreaks.map(b => ({ ...b })));
      setNewBreakName('');
      setNewBreakDuration('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakModalOpen]);





  // Modals Actions
  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    setEditFormData({
      date: record.date || getLocalDateString(),
      punchIn: record.punchIn === '--:--' ? '' : (record.punchIn || ''),
      punchOut: record.punchOut === '--:--' ? '' : (record.punchOut || ''),
      totalHours: decimalToTimeStr(record.totalHours),
      status: record.status || 'Present',
      source: record.source || 'Biometric',
      workMode: record.workMode || 'WFO'
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedRecord) return;
    
    const isNoPunch = editFormData.status === 'Absent' || editFormData.status === 'On Leave';
    if (!isNoPunch && !editFormData.punchIn) {
      addToast('error', 'Please enter Punch In time.');
      return;
    }
    
    const decimalHours = isNoPunch ? 0 : timeStrToDecimal(editFormData.totalHours);
    const recordPayload = {
      employeeId: selectedRecord.employeeId,
      employeeName: selectedRecord.employeeName,
      department: selectedRecord.department,
      branch: selectedRecord.branch,
      date: editFormData.date || selectedRecord.date,
      punchIn: isNoPunch ? '--:--' : (editFormData.punchIn || '--:--'),
      punchOut: isNoPunch ? '--:--' : (editFormData.punchOut || '--:--'),
      breakTime: '45 mins',
      totalHours: decimalHours,
      status: editFormData.status,
      source: isNoPunch ? 'System' : editFormData.source,
      workMode: isNoPunch ? '' : normalizeWorkMode(editFormData.workMode),
      overtime: !isNoPunch && decimalHours > 8 ? `${(decimalHours - 8).toFixed(1)} hrs` : '0 hrs'
    };

    if (selectedRecord.isVirtual) {
      addAttendanceRecord(recordPayload);
    } else {
      updateAttendanceRecord(selectedRecord.id, recordPayload);
    }
    
    setEditModalOpen(false);
    addToast('success', 'Attendance record updated successfully.');
  };

  const handleEditAutoPunchIn = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    setEditFormData(prev => ({ ...prev, punchIn: timeString }));
    addToast('info', `Punch In time set to ${timeString}`);
  };

  const handleEditAutoPunchOut = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    setEditFormData(prev => ({ ...prev, punchOut: timeString }));
    addToast('info', `Punch Out time set to ${timeString}`);
  };

  // Auto-set current time for punch in
  const handleAutoPunchIn = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    setMarkFormData(prev => ({ ...prev, punchIn: timeString }));
    addToast('info', `Punch In time set to ${timeString}`);
  };

  // Auto-set current time for punch out and calculate hours
  const handleAutoPunchOut = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    setMarkFormData(prev => ({ ...prev, punchOut: timeString }));
    addToast('info', `Punch Out time set to ${timeString}`);
  };

  const handleExportSubmit = (e) => {
    e.preventDefault();
    const { reportType, employeeId, dateRange, format } = exportOptions;

    let targets = [...attendance];
    if (reportType === 'Specific Employee' && employeeId) {
      targets = targets.filter(rec => rec.employeeId === employeeId);
    }

    const now = new Date();
    targets = targets.filter(rec => {
      if (dateRange === 'AllTime' || dateRange === 'All') return true;
      if (!rec.date) return false;
      const recDate = new Date(rec.date);
      const diffTime = Math.abs(now - recDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateRange === 'Today') return diffDays <= 1;
      if (dateRange === 'Weekly') return diffDays <= 7;
      if (dateRange === 'Monthly') return diffDays <= 30;
      if (dateRange === 'Yearly') return diffDays <= 365;
      return true;
    });

    targets.sort((a, b) => new Date(b.date) - new Date(a.date));

    const filename = `Attendance_Report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'PDF') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #1e293b;
                margin: 40px;
                background-color: #ffffff;
              }
              h2 {
                color: #0f172a;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 12px;
                margin-bottom: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 10px 12px;
                text-align: left;
                font-size: 0.85rem;
              }
              th {
                background-color: #f1f5f9;
                font-weight: 600;
              }
              .status-present {
                color: #059669;
                font-weight: bold;
              }
              .status-absent {
                color: #dc2626;
                font-weight: bold;
              }
              .meta-info {
                font-size: 0.85rem;
                color: #64748b;
                margin-bottom: 30px;
              }
            </style>
          </head>
          <body>
            <h2>Workforce Attendance Management Report</h2>
            <div class="meta-info">
              <strong>Generated At:</strong> ${new Date().toLocaleString()}<br/>
              <strong>Date Scope:</strong> ${dateRange}<br/>
              <strong>Scope:</strong> ${reportType === 'Specific Employee' ? 'Single Employee Timesheet' : 'Organization-wide Log Audit'}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Total Hours</th>
                  <th>Source</th>
                  <th>Work Mode</th>
                </tr>
              </thead>
              <tbody>
                ${targets.map(rec => {
                  const emp = (employees || []).find(e => e.id === rec.employeeId);
                  const name = rec.employeeName || (emp ? emp.name : 'Unknown');
                  return `
                    <tr>
                      <td>${rec.employeeId}</td>
                      <td><strong>${name}</strong></td>
                      <td>${rec.date}</td>
                      <td><span class="${rec.status === 'Present' || rec.status === 'Late' ? 'status-present' : 'status-absent'}">${rec.status}</span></td>
                      <td>${rec.punchIn || '--:--'}</td>
                      <td>${rec.punchOut || '--:--'}</td>
                      <td>${rec.totalHours || '00:00'}</td>
                      <td>${rec.source || 'Biometric'}</td>
                      <td>${rec.workMode || 'WFO'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      setIsExportOpen(false);
      return;
    }

    const headers = [
      ['WORKFORCE ATTENDANCE EXPORT REPORT'],
      ['Report Type', reportType.toUpperCase()],
      ['Date Scope', dateRange],
      ['Generated At', new Date().toLocaleString()],
      [],
      ['Employee ID', 'Name', 'Date', 'Status', 'Punch In', 'Punch Out', 'Total Hours', 'Source', 'Work Mode']
    ];

    targets.forEach(rec => {
      const emp = (employees || []).find(e => e.id === rec.employeeId);
      const name = rec.employeeName || (emp ? emp.name : 'Unknown');
      headers.push([
        rec.employeeId,
        name,
        rec.date,
        rec.status,
        rec.punchIn || '--:--',
        rec.punchOut || '--:--',
        rec.totalHours || '00:00',
        rec.source || 'Biometric',
        rec.workMode || 'WFO'
      ]);
    });

    const fileContent = "\ufeff" + headers.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const mimeType = format === 'Excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
    const fileExtension = format === 'Excel' ? 'xls' : 'csv';

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.${fileExtension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast('success', `${format} report exported successfully!`);
    setIsExportOpen(false);
  };

  const handleMarkSubmit = () => {
    if (!markFormData.employeeId || !markFormData.employeeName) {
      addToast('error', 'Please select an employee.');
      return;
    }
    
    const isNoPunch = markFormData.status === 'Absent' || markFormData.status === 'On Leave';
    if (!isNoPunch && !markFormData.punchIn) {
      addToast('error', 'Please enter Punch In time.');
      return;
    }

    const empData = employees.find(e => e.id === markFormData.employeeId);
    const decimalHours = isNoPunch ? 0 : timeStrToDecimal(markFormData.totalHours);
    const record = {
      id: `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: markFormData.employeeId,
      employeeName: markFormData.employeeName,
      department: markFormData.department || empData?.department || '',
      branch: markFormData.branch || empData?.branch || '',
      workMode: normalizeWorkMode(markFormData.workMode || empData?.workMode || 'WFO'),
      date: markFormData.date,
      punchIn: markFormData.punchIn,
      punchOut: markFormData.punchOut || '--:--',
      breakTime: `${totalBreakMinutes} mins`,
      breaks: globalBreaks,
      totalHours: decimalHours,
      status: markFormData.status,
      source: markFormData.source,
      overtime: decimalHours > 8 ? `${(decimalHours - 8).toFixed(1)} hrs` : '0 hrs'
    };
    addAttendanceRecord(record);
    setMarkModalOpen(false);
    setMarkFormData({
      employeeId: '',
      employeeName: '',
      department: '',
      branch: '',
      workMode: 'WFO',
      date: getLocalDateString(),
      punchIn: '',
      punchOut: '',
      breakTime: '45 mins',
      totalHours: '00:00',
      status: 'Present',
      source: 'Web Portal'
    });
    addToast('success', `Attendance marked for ${markFormData.employeeName}`);
  };

  const handleShiftSubmit = () => {
    if (!shiftFormData.employeeId) {
      addToast('error', 'Please select an employee.');
      return;
    }
    const empData = employees.find(e => e.id === shiftFormData.employeeId);
    if (!empData) return;

    // Find if a real attendance record exists for this employee on this date
    const existingRecord = (attendance || []).find(
      a => a.employeeId === shiftFormData.employeeId && a.date === dateFilter
    );

    if (existingRecord) {
      updateAttendanceRecord(existingRecord.id, {
        ...existingRecord,
        shift: shiftFormData.shift
      });
    } else {
      const newRecord = {
        id: `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        employeeId: shiftFormData.employeeId,
        employeeName: empData.name,
        department: empData.department || '',
        branch: empData.branch || '',
        workMode: empData.workMode || 'WFO',
        date: dateFilter,
        punchIn: '--:--',
        punchOut: '--:--',
        breakTime: `${totalBreakMinutes} mins`,
        breaks: globalBreaks,
        totalHours: 0,
        status: 'Absent',
        source: 'System',
        shift: shiftFormData.shift,
        overtime: '0 hrs'
      };
      addAttendanceRecord(newRecord);
    }

    addToast('success', `Assigned temporary shift ${shiftFormData.shift} to ${empData.name} for ${dateFilter}`);
    setShiftModalOpen(false);
  };

  const handleAddNewBreakToList = () => {
    if (!newBreakName.trim()) {
      addToast('error', 'Please enter a break name.');
      return;
    }
    const duration = parseInt(newBreakDuration) || 0;
    if (duration <= 0) {
      addToast('error', 'Please enter a valid duration greater than 0.');
      return;
    }
    setModalBreaks(prev => [...prev, { breakType: newBreakName.trim(), duration }]);
    setNewBreakName('');
    setNewBreakDuration('');
    addToast('success', `Added ${newBreakName.trim()} to local list.`);
  };

  const handleSaveBreaksConfig = async () => {
    const totalMins = modalBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const todayRecords = (attendance || []).filter(
      a => a.date === dateFilter && a.id !== 'SETTINGS-BREAKS'
    );

    try {
      if (todayRecords.length > 0) {
        await Promise.all(
          todayRecords.map(record =>
            updateAttendanceRecord(record.id, {
              ...record,
              breaks: modalBreaks,
              breakTime: `${totalMins} mins`
            })
          )
        );
        addToast('success', `Updated breaks configuration for all ${todayRecords.length} active employee logs.`);
      } else {
        addToast('info', 'No active attendance logs found for today. New logs created today will use this configuration.');
      }
      setBreakModalOpen(false);
    } catch (err) {
      console.error('Failed to save breaks config:', err);
      addToast('error', 'Failed to save configuration.');
    }
  };

  const handleRequestAttendance = () => {
    addToast('success', 'Attendance check-in reminder request broadcasted to all active employees.');
  };

  const parseTimeToHours = (timeStr) => {
    if (!timeStr || timeStr === '--:--') return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h + m / 60;
  };

  const convertTo24Hour = (timeStr) => {
    if (!timeStr || timeStr === '--:--') return '';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;

    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (match) {
      let hrs = parseInt(match[1], 10);
      const mins = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hrs !== 12) hrs += 12;
      if (ampm === 'AM' && hrs === 12) hrs = 0;
      return `${String(hrs).padStart(2, '0')}:${mins}`;
    }

    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    return '';
  };

  const handleOpenCorrection = (record = null) => {
    console.log('DEBUG handleOpenCorrection record:', record);
    if (record) {
      const punchIn24 = convertTo24Hour(record.punchIn);
      const punchOut24 = convertTo24Hour(record.punchOut);
      setCorrectionForm({
        date: record.date || '',
        correctionType: record.punchIn === '--:--' || record.punchOut === '--:--' ? 'Forgot to Punch' : 'Wrong Punch In Time',
        requestedPunchIn: punchIn24 || '09:30',
        requestedPunchOut: punchOut24 || '18:00',
        requestedStatus: record.status || 'Present',
        requestedShift: record.shift || 'Day Shift',
        reason: '',
        remarks: ''
      });
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setCorrectionForm({
        date: todayStr,
        correctionType: 'Manual Attendance Request',
        requestedPunchIn: '09:30',
        requestedPunchOut: '18:00',
        requestedStatus: 'Present',
        requestedShift: 'Day Shift',
        reason: '',
        remarks: ''
      });
    }
    setSelectedCorrection(null);
    setIsCorrectionOpen(true);
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();

    if (!correctionForm.date) {
      addToast('error', 'Date is required.');
      return;
    }

    if (!correctionForm.reason) {
      addToast('error', 'Reason is required.');
      return;
    }

    const inHours = parseTimeToHours(correctionForm.requestedPunchIn);
    const outHours = parseTimeToHours(correctionForm.requestedPunchOut);
    if (inHours >= outHours) {
      addToast('error', 'Requested Punch Out time must be after Punch In time.');
      return;
    }

    try {
      const isResubmit = selectedCorrection && selectedCorrection.status === 'More Information Required';
      const url = isResubmit 
        ? (window.API_URL || 'http://localhost:5000') + `/api/v1/attendance-corrections/${selectedCorrection.id}`
        : (window.API_URL || 'http://localhost:5000') + '/api/v1/attendance-corrections';
      const method = isResubmit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(correctionForm)
      });
      const result = await res.json();
      if (result.status === 'success') {
        addToast('success', isResubmit ? 'Correction request resubmitted.' : 'Correction request submitted successfully.');
        setIsCorrectionOpen(false);
        setSelectedCorrection(null);
        if (fetchCorrectionRequests) fetchCorrectionRequests();
      } else {
        addToast('error', result.message || 'Failed to submit correction request.');
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Network error occurred.');
    }
  };

  const handleActionCorrection = async (actionType) => {
    if (!selectedCorrection) return;

    if (!detailRemarks && actionType !== 'approve') {
      addToast('error', 'Comments/Remarks are required for this action.');
      return;
    }

    try {
      const res = await fetch((window.API_URL || 'http://localhost:5000') + `/api/v1/attendance-corrections/${selectedCorrection.id}/${actionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comments: detailRemarks })
      });
      const result = await res.json();
      if (result.status === 'success') {
        addToast('success', `Request successfully ${actionType}d.`);
        setIsDetailOpen(false);
        setSelectedCorrection(null);
        setDetailRemarks('');
        if (fetchCorrectionRequests) fetchCorrectionRequests();
        if (fetchAttendance) fetchAttendance();
        if (personalRefetch) personalRefetch();
      } else {
        addToast('error', result.message || `Failed to ${actionType} request.`);
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Network error occurred.');
    }
  };

  const handleCancelCorrection = async (correctionId) => {
    if (!window.confirm('Are you sure you want to cancel this correction request?')) return;
    try {
      const res = await fetch((window.API_URL || 'http://localhost:5000') + `/api/v1/attendance-corrections/${correctionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Cancelled', remarks: 'Cancelled by employee' })
      });
      const result = await res.json();
      if (result.status === 'success') {
        addToast('success', 'Correction request cancelled.');
        if (fetchCorrectionRequests) fetchCorrectionRequests();
      } else {
        addToast('error', result.message || 'Failed to cancel request.');
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Network error occurred.');
    }
  };

  const handleResubmitCorrection = (req) => {
    setCorrectionForm({
      date: req.date,
      correctionType: req.correctionType,
      requestedPunchIn: req.requestedPunchIn,
      requestedPunchOut: req.requestedPunchOut,
      requestedStatus: req.requestedStatus,
      requestedShift: req.requestedShift,
      reason: req.reason,
      remarks: req.remarks || ''
    });
    setSelectedCorrection(req);
    setIsCorrectionOpen(true);
  };

  const handleApproveAll = async () => {
    const recordsToApprove = (attendance || []).filter(item => {
      const matchDate = item.date === dateFilter;
      const hasPunchIn = item.punchIn && item.punchIn !== '--:--';
      const noPunchOut = !item.punchOut || item.punchOut === '--:--';
      const notVirtual = !item.isVirtual && !String(item.id).startsWith('ABS-');
      return matchDate && hasPunchIn && noPunchOut && notVirtual;
    });

    if (recordsToApprove.length === 0) {
      addToast('info', 'No active check-in logs requiring approval.');
      return;
    }

    try {
      addToast('info', `Approving check-ins for ${recordsToApprove.length} employee(s)...`);
      await Promise.all(recordsToApprove.map(item => {
        let outTime = '06:00 PM';
        if (item.shift) {
          const match = item.shift.match(/-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
          if (match) {
            outTime = match[1];
          }
        }
        const decimalHours = calculateWorkingHours(item.punchIn, outTime);
        return updateAttendanceRecord(item.id, {
          ...item,
          punchOut: outTime,
          totalHours: decimalHours,
          overtime: decimalHours > 8 ? `${(decimalHours - 8).toFixed(1)} hrs` : '0 hrs'
        });
      }));
      addToast('success', `Approved check-ins and set default punch-out times for ${recordsToApprove.length} employee(s).`);
    } catch (err) {
      console.error('Failed to approve check-ins:', err);
      addToast('error', 'Failed to approve attendance entries.');
    }
  };

  const handleScheduleReport = () => {
    addToast('info', 'Monthly automatic attendance report scheduled for the 1st of every month.');
  };

  // Navigate to records tab with filter
  const navigateToRecordsWithFilter = (filterType, filterValue) => {
    setActiveSection('records');
    if (filterType === 'status') {
      setStatusFilter(filterValue);
    } else if (filterType === 'workMode') {
      setWorkModeFilter(filterValue);
    } else if (filterType === 'branch') {
      setBranchFilter(filterValue);
    }
    // Scroll to table after a short delay
    setTimeout(() => {
      document.querySelector('.att-records-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Process and Filter Attendance Ledger
  const ledgerData = useMemo(() => {
    if (isEmployeeView) {
      const dates = getDatesRange(timeRangeFilter);
      const records = [];
      
      dates.forEach(date => {
        // 1. Find actual records for the logged-in employee on this date
        const empRecords = (attendance || []).filter(item => {
          const isUser = item.employeeId === currentUser?.id || item.employeeName === currentUser?.name;
          return isUser && item.date === date;
        });
        
        if (empRecords.length > 0) {
          empRecords.forEach(item => {
            const empDetails = currentUser;
            let status = item.status;
            if ((status === 'On Leave' || status === 'Leave') && empDetails && empDetails.leaveHistory) {
              const foundLeave = empDetails.leaveHistory.find(l => 
                l.status === 'Approved' && 
                item.date >= l.fromDate && 
                item.date <= l.toDate
              );
              if (foundLeave) {
                status = foundLeave.type;
              }
            }
            let totalHours = item.totalHours || 0;
            if (item.punchIn && item.punchOut && item.punchIn !== '--:--' && item.punchOut !== '--:--') {
              totalHours = calculateWorkingHours(item.punchIn, item.punchOut);
            }
            records.push({
              ...item,
              status,
              employeeId: item.employeeId || empDetails?.id || '',
              employeeName: item.employeeName || empDetails?.name || 'Unknown',
              department: item.department || empDetails?.department || '',
              branch: item.branch || empDetails?.branch || '',
              shift: item.shift || empDetails?.shift || 'Flexible Shift',
              source: item.source || 'Biometric',
              breakTime: item.breakTime || '0 mins',
              workMode: item.workMode || empDetails?.workMode || 'WFO',
              totalHours,
              overtime: totalHours > 8 ? `${(totalHours - 8).toFixed(1)} hrs` : '0 hrs'
            });
          });
        } else {
          // Virtual Absent record
          const emp = currentUser;
          records.push({
            id: `ABS-${emp?.id || 'emp'}-${date}`,
            employeeId: emp?.id || '',
            employeeName: emp?.name || 'Unknown',
            department: emp?.department || '',
            branch: emp?.branch || '',
            date: date,
            status: 'Absent',
            punchIn: '--:--',
            punchOut: '--:--',
            totalHours: 0,
            shift: emp?.shift || 'Flexible Shift',
            source: 'System',
            workMode: emp?.workMode || 'WFO',
            breakTime: '0 mins',
            overtime: '0 hrs',
            isVirtual: true
          });
        }
      });
      return records;
    }

    if (!dateFilter) return [];
    
    // 1. Filter attendance records by role (for admins)
    const scopedAttendance = (attendance || []).filter(item => {
      if (!currentUserRole || currentUserRole === 'super_admin') return true;
      const emp = (employees || []).find(e => e.id === item.employeeId || e.name === item.employeeName);
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'dept_admin') {
        return item.department === currentUser?.department || emp?.department === currentUser?.department;
      }
      return true;
    });

    // 2. Filter local scoped attendance by selected date
    const dayRecords = scopedAttendance.filter(item => item.date === dateFilter);
    
    // 3. Map actual records to include employee details
    const records = dayRecords.map(item => {
      const empDetails = (scopedEmployees || []).find(e => e.id === item.employeeId || e.name === item.employeeName);
      let status = item.status;
      if ((status === 'On Leave' || status === 'Leave') && empDetails && empDetails.leaveHistory) {
        const foundLeave = empDetails.leaveHistory.find(l => 
          l.status === 'Approved' && 
          item.date >= l.fromDate && 
          item.date <= l.toDate
        );
        if (foundLeave) {
          status = foundLeave.type;
        }
      }
      let totalHours = item.totalHours || 0;
      if (item.punchIn && item.punchOut && item.punchIn !== '--:--' && item.punchOut !== '--:--') {
        totalHours = calculateWorkingHours(item.punchIn, item.punchOut);
      }
      return {
        ...item,
        status,
        employeeId: item.employeeId || empDetails?.id || '',
        shift: item.shift || empDetails?.shift || 'Flexible Shift',
        source: item.source || 'Biometric',
        breakTime: item.breakTime || '0 mins',
        workMode: item.workMode || empDetails?.workMode || 'WFO',
        totalHours,
        overtime: totalHours > 8 ? `${(totalHours - 8).toFixed(1)} hrs` : '0 hrs'
      };
    });
    
    // 4. For any employee in scopedEmployees who doesn't have a record on this date, create a virtual 'Absent' record
    const markedEmpIds = new Set(records.map(r => r.employeeId));
    
    (scopedEmployees || []).forEach(emp => {
      if (!emp || markedEmpIds.has(emp.id)) return;
      
      records.push({
        id: `ABS-${emp.id}-${dateFilter}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department || '',
        branch: emp.branch || '',
        date: dateFilter,
        punchIn: '--:--',
        punchOut: '--:--',
        totalHours: 0,
        status: 'Absent',
        source: 'System',
        breakTime: '45 mins',
        workMode: emp.workMode || 'WFO',
        shift: emp.shift || 'Flexible Shift',
        overtime: '0 hrs',
        isVirtual: true
      });
    });
    
    return records;
  }, [attendance, employees, scopedEmployees, currentUserRole, currentUser, dateFilter, timeRangeFilter]);

  // Filtered attendance for KPIs (ignores statusFilter and workModeFilter so counts don't zero out on card selection)
  const kpiFilteredAttendance = useMemo(() => {
    return ledgerData.filter(a => {
      const matchesSearch = searchQuery
        ? a.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDate = (isEmployeeView || !dateFilter) ? true : a.date === dateFilter;
      const matchesDept = deptFilter ? a.department === deptFilter : true;
      const matchesBranch = (() => {
        if (!branchFilter) return true;
        if (!a.branch) return false;
        const normObjBranch = a.branch.toLowerCase().replace(/branch|office|agency/gi, '').trim();
        const normFilterBranch = branchFilter.toLowerCase().replace(/branch|office|agency/gi, '').trim();
        return normObjBranch.includes(normFilterBranch) || normFilterBranch.includes(normObjBranch);
      })();
      const matchesShift = shiftFilter ? a.shift?.toLowerCase().includes(shiftFilter.toLowerCase()) : true;
      const matchesSource = sourceFilter ? a.source?.toLowerCase() === sourceFilter.toLowerCase() : true;

      return matchesSearch && matchesDate && matchesDept && matchesBranch && matchesShift && matchesSource;
    });
  }, [ledgerData, searchQuery, dateFilter, deptFilter, branchFilter, shiftFilter, sourceFilter, currentUserRole]);

  // Get work mode counts (responds to filters and updates in real-time)
  const workModeStats = useMemo(() => {
    const filteredEmployees = (scopedEmployees || []).filter(e => {
      if (!e) return false;
      const matchesSearch = searchQuery
        ? e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.id?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDept = deptFilter ? e.department === deptFilter : true;
      const matchesBranch = (() => {
        if (!branchFilter) return true;
        if (!e.branch) return false;
        const normObjBranch = e.branch.toLowerCase().replace(/branch|office|agency/gi, '').trim();
        const normFilterBranch = branchFilter.toLowerCase().replace(/branch|office|agency/gi, '').trim();
        return normObjBranch.includes(normFilterBranch) || normFilterBranch.includes(normObjBranch);
      })();
      const matchesShift = shiftFilter ? e.shift?.toLowerCase().includes(shiftFilter.toLowerCase()) : true;
      return matchesSearch && matchesDept && matchesBranch && matchesShift;
    });

    let office = 0;
    let wfh = 0;
    let hybrid = 0;

    filteredEmployees.forEach(e => {
      if (!e) return;
      const todayRecord = (kpiFilteredAttendance || []).find(a => a?.employeeId === e.id);
      
      // Only count if they have a real attendance record and are not absent or on leave
      if (!todayRecord || todayRecord.isVirtual) return;
      
      const status = todayRecord.status ? todayRecord.status.toLowerCase() : '';
      if (status === 'absent' || status.includes('leave')) return;

      const activeMode = todayRecord.workMode || e.workMode || 'WFO';
      const normMode = normalizeWorkMode(activeMode);
      if (normMode === 'WFH') {
        wfh++;
      } else if (normMode === 'Hybrid') {
        hybrid++;
      } else {
        office++;
      }
    });

    return { office, wfh, hybrid, total: office + wfh + hybrid };
  }, [scopedEmployees, kpiFilteredAttendance, searchQuery, deptFilter, branchFilter, shiftFilter]);

  // Compute Weekly Trend based on active database logs and scoped employees
  const weeklyTrendData = useMemo(() => {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const todayStr = today.toISOString().split('T')[0];

    const weekDates = daysOfWeek.map((day, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() + distanceToMonday + idx);
      return d.toISOString().split('T')[0];
    });

    const totalEmps = (scopedEmployees || []).length || 1;

    return daysOfWeek.map((day, idx) => {
      const dateStr = weekDates[idx];
      if (dateStr > todayStr) {
        return 0; // Future days
      }

      // Filter attendance logs matching this date
      const dailyLogs = (attendance || []).filter(a => a.date === dateStr);
      // Filter logs belonging to the scoped employees
      const scopedLogs = dailyLogs.filter(a => 
        (scopedEmployees || []).some(emp => emp.id === a.employeeId || emp.name === a.employeeName)
      );

      if (scopedLogs.length === 0) {
        return 0;
      }

      const presentCount = scopedLogs.filter(a => 
        a.status === 'Present' || a.status === 'Late' || a.status === 'Work From Home' || a.status === 'WFH'
      ).length;
      
      return Math.round((presentCount / totalEmps) * 100);
    });
  }, [attendance, scopedEmployees]);


  // Filter Predicates
  const filteredAttendance = useMemo(() => {
    return ledgerData.filter(a => {
      const matchesSearch = searchQuery
        ? a.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDate = (isEmployeeView || !dateFilter) ? true : a.date === dateFilter;
      const matchesDept = deptFilter ? a.department === deptFilter : true;
      const matchesBranch = (() => {
        if (!branchFilter) return true;
        if (!a.branch) return false;
        const normObjBranch = a.branch.toLowerCase().replace(/branch|office|agency/gi, '').trim();
        const normFilterBranch = branchFilter.toLowerCase().replace(/branch|office|agency/gi, '').trim();
        return normObjBranch.includes(normFilterBranch) || normFilterBranch.includes(normObjBranch);
      })();
      const matchesShift = shiftFilter ? a.shift?.toLowerCase().includes(shiftFilter.toLowerCase()) : true;
      const matchesStatus = statusFilter 
        ? (statusFilter.toLowerCase() === 'on leave'
            ? (a.status?.toLowerCase() === 'on leave' || a.status?.toLowerCase() === 'leave' || a.status?.toLowerCase().includes('leave'))
            : statusFilter.toLowerCase() === 'present'
              ? (a.status?.toLowerCase() === 'present' || a.status?.toLowerCase() === 'late')
              : a.status?.toLowerCase() === statusFilter.toLowerCase()
          )
        : true;
      const matchesSource = sourceFilter ? a.source?.toLowerCase() === sourceFilter.toLowerCase() : true;
      const matchesWorkMode = workModeFilter
        ? normalizeWorkMode(a.workMode) === normalizeWorkMode(workModeFilter)
        : true;

      return matchesSearch && matchesDate && matchesDept && matchesBranch && matchesShift && matchesStatus && matchesSource && matchesWorkMode;
    });
  }, [ledgerData, searchQuery, dateFilter, deptFilter, branchFilter, shiftFilter, statusFilter, sourceFilter, workModeFilter, currentUserRole]);


  // Calculations for Summary Statistics based on active filters
  const filteredEmployeesCount = useMemo(() => {
    return scopedEmployees.filter(e => {
      const matchesSearch = searchQuery
        ? e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.id?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDept = deptFilter ? e.department === deptFilter : true;
      const matchesBranch = (() => {
        if (!branchFilter) return true;
        if (!e.branch) return false;
        const normObjBranch = e.branch.toLowerCase().replace(/branch|office|agency/gi, '').trim();
        const normFilterBranch = branchFilter.toLowerCase().replace(/branch|office|agency/gi, '').trim();
        return normObjBranch.includes(normFilterBranch) || normFilterBranch.includes(normObjBranch);
      })();
      const matchesShift = shiftFilter ? e.shift?.toLowerCase().includes(shiftFilter.toLowerCase()) : true;
      return matchesSearch && matchesDept && matchesBranch && matchesShift;
    }).length;
  }, [scopedEmployees, searchQuery, deptFilter, branchFilter, shiftFilter]);

  const totalEmployees = filteredEmployeesCount;

  const joinedThisMonth = useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    return scopedEmployees.filter(e => e.joinDate && e.joinDate.startsWith(currentYearMonth)).length;
  }, [scopedEmployees]);

  const totalPresent = useMemo(() => kpiFilteredAttendance.filter(a => ['Present', 'Overtime'].includes(a.status)).length, [kpiFilteredAttendance]);
  const totalLate = useMemo(() => kpiFilteredAttendance.filter(a => a.status === 'Late').length, [kpiFilteredAttendance]);
  const totalAbsent = useMemo(() => kpiFilteredAttendance.filter(a => a.status === 'Absent').length, [kpiFilteredAttendance]);
  const totalLeave = useMemo(() => kpiFilteredAttendance.filter(a => ['On Leave', 'Leave'].includes(a.status) || (a.status && a.status.includes('Leave'))).length, [kpiFilteredAttendance]);
  const totalWFH = useMemo(() => kpiFilteredAttendance.filter(a => ['Work From Home', 'WFH'].includes(a.status)).length, [kpiFilteredAttendance]);
  const totalHalfDay = useMemo(() => kpiFilteredAttendance.filter(a => ['Half Day', 'Half-Day'].includes(a.status)).length, [kpiFilteredAttendance]);
  
  const attendanceRate = useMemo(() => {
    const rawRate = totalEmployees > 0 ? Math.round(((totalPresent + totalLate + totalHalfDay + totalWFH) / Math.max(totalEmployees, 1)) * 100) : 0;
    return Math.min(rawRate, 100);
  }, [totalEmployees, totalPresent, totalLate, totalHalfDay, totalWFH]);

  const rateComparison = useMemo(() => {
    const today = new Date(dateFilter || getLocalDateString());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayRecords = (attendance || []).filter(a => a.date === yesterdayStr);
    const scopedYesterdayRecords = yesterdayRecords.filter(a => {
      const emp = scopedEmployees.find(e => e.id === a.employeeId);
      return !!emp;
    });

    const yesterdayPresent = scopedYesterdayRecords.filter(a => ['Present', 'Overtime'].includes(a.status)).length;
    const yesterdayLate = scopedYesterdayRecords.filter(a => a.status === 'Late').length;
    const yesterdayHalfDay = scopedYesterdayRecords.filter(a => ['Half Day', 'Half-Day'].includes(a.status)).length;
    const yesterdayWFH = scopedYesterdayRecords.filter(a => ['Work From Home', 'WFH'].includes(a.status)).length;

    const yesterdayRate = totalEmployees > 0 ? Math.round(((yesterdayPresent + yesterdayLate + yesterdayHalfDay + yesterdayWFH) / Math.max(totalEmployees, 1)) * 100) : 0;
    const rateDiff = attendanceRate - Math.min(yesterdayRate, 100);
    return {
      diff: rateDiff,
      label: `${rateDiff >= 0 ? '+' : ''}${rateDiff}% vs yesterday`
    };
  }, [attendance, dateFilter, scopedEmployees, totalEmployees, attendanceRate]);

  // Get counts by status for clickable cards
  const statusCounts = useMemo(() => {
    return {
      present: totalPresent + totalLate,
      absent: totalAbsent,
      late: totalLate,
      leave: totalLeave,
      wfh: totalWFH,
      halfDay: totalHalfDay
    };
  }, [totalPresent, totalAbsent, totalLate, totalLeave, totalWFH, totalHalfDay]);

  const handleExport = (format = 'CSV') => {
    if (!filteredAttendance || filteredAttendance.length === 0) {
      addToast('error', 'No records to export.');
      return;
    }

    if (format === 'CSV' || format === 'Excel') {
      const headers = [
        'Employee ID',
        'Employee Name',
        'Department',
        'Branch',
        'Date',
        'Shift',
        'Punch In',
        'Punch Out',
        'Break Time',
        'Work Hours',
        'Overtime',
        'Status',
        'Source',
        'Work Mode'
      ];
      
      const rows = [headers];
      filteredAttendance.forEach(r => {
          const breakMins = r.breaks && r.breaks.length > 0
            ? r.breaks.reduce((sum, b) => sum + (b.duration || 0), 0)
            : 0;
          rows.push([
            `"${r.employeeId || ''}"`,
            `"${r.employeeName || ''}"`,
            `"${r.department || ''}"`,
            `"${r.branch || ''}"`,
            `"${r.date || ''}"`,
            `"${r.shift || ''}"`,
            `"${r.punchIn || '--:--'}"`,
            `"${r.punchOut || '--:--'}"`,
            `"${breakMins > 0 ? `${breakMins} mins` : '0 mins'}"`,
            `"${r.totalHours > 0 ? decimalToTimeStr(r.totalHours) : '00:00'}"`,
            `"${r.overtime || '0 hrs'}"`,
            `"${r.status || ''}"`,
            `"${r.source || ''}"`,
            `"${r.workMode || ''}"`
          ]);
      });
      
      const csvContent = rows.map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const filename = `attendance_report_${dateFilter || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', `Export generated! ${filename} downloaded successfully.`);
    } else if (format === 'PDF') {
      addToast('info', 'Opening print dialog for PDF export...');
      window.print();
    }
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
    else if (status === 'On Leave' || status === 'Leave' || (status && status.includes('Leave'))) { variant = 'warning'; text = `🌴 ${status}`; }
    else if (status === 'Overtime') { variant = 'success'; text = '⏰ Overtime'; }
    return <Badge variant={variant}>{text}</Badge>;
  };

  // Work mode badge helper
  const getWorkModeBadge = (workMode) => {
    const mode = normalizeWorkMode(workMode);
    if (mode === 'WFO') {
      return <Badge variant="primary">🏢 WFO</Badge>;
    } else if (mode === 'WFH') {
      return <Badge variant="info">🏠 WFH</Badge>;
    } else if (mode === 'Hybrid') {
      return <Badge variant="warning">🔄 Hybrid</Badge>;
    }
    return <Badge variant="neutral">—</Badge>;
  };

  // Data Table Columns
  const columns = useMemo(() => {
    const cols = [
      {
        key: 'employeeId',
        header: FIELD_LABELS.id,
        sortable: true,
        render: (row) => (
          <span
            className="clickable-emp-name"
            onClick={() => navigate(`/employees/${encodeEmployeeId(row.employeeId)}?tab=attendance_punch`)}
            style={{ fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer' }}
          >
            {row.employeeId}
          </span>
        )
      },
      {
        key: 'employeeName',
        header: FIELD_LABELS.name,
        sortable: true,
        render: (row) => (
          <div
            className="flex-center gap-3 justify-start clickable-emp-name"
            onClick={() => navigate(`/employees/${encodeEmployeeId(row.employeeId)}?tab=attendance_punch`)}
            style={{ cursor: 'pointer' }}
          >
            <Avatar name={row.employeeName} size="sm" />
            <span className="emp-name-bold">{row.employeeName}</span>
          </div>
        )
      },
      {
        key: 'department',
        header: FIELD_LABELS.department,
        sortable: true,
        render: (row) => (
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.department}</span>
        )
      },
      {
        key: 'branch',
        header: FIELD_LABELS.branch,
        sortable: true,
        render: (row) => (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{row.branch}</span>
        )
      },
      { key: 'shift', header: FIELD_LABELS.shiftTiming, sortable: true },
      { key: 'punchIn', header: FIELD_LABELS.punchInTime, sortable: true },
      { key: 'punchOut', header: FIELD_LABELS.punchOutTime, sortable: true },
      {
        key: 'breakTime',
        header: 'Break',
        sortable: true,
        render: (row) => {
          const breakMins = row.breaks && row.breaks.length > 0
            ? row.breaks.reduce((sum, b) => sum + (b.duration || 0), 0)
            : 0;
          return <span>{breakMins > 0 ? `${breakMins} mins` : '--'}</span>;
        }
      },
      {
        key: 'totalHours',
        header: FIELD_LABELS.workingHours,
        sortable: true,
        render: (row) => <span>{row.totalHours > 0 ? `${decimalToTimeStr(row.totalHours)} hrs` : '--'}</span>
      },
      {
        key: 'overtime',
        header: 'Overtime',
        sortable: true,
        render: (row) => <span style={{ color: row.overtime !== '0 hrs' ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: row.overtime !== '0 hrs' ? 600 : 400 }}>{row.overtime}</span>
      },
      {
        key: 'status',
        header: FIELD_LABELS.attendanceStatus,
        sortable: true,
        render: (row) => getStatusBadge(row.status)
      },
      {
        key: 'source',
        header: 'Source',
        sortable: true,
        render: (row) => (
          <span className="att-source-tag" title="Source Device">
            {row.source === 'Biometric' ? '⚙️ Bio' : row.source === 'GPS' ? '📍 GPS' : row.source === 'RFID' ? '💳 RFID' : row.source === 'Web Portal' ? '💻 Web' : '📱 App'}
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
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Edit2 size={12} />
          </button>
        )
      }
    ];
    if (currentUserRole === 'employee' || !canManageAttendance) {
      return cols.filter(c => c.key !== 'actions');
    }
    return cols;
  }, [currentUserRole, employees, navigate]);

  // Branch data for Branch Management
  const branchData = useMemo(() => {
    const dbBranches = branches && branches.length > 0 
      ? branches.map(b => b?.name).filter(Boolean) 
      : Array.from(new Set((scopedEmployees || []).map(e => e?.branch).filter(Boolean)));
    
    const finalBranches = dbBranches;

    return finalBranches.map(branchName => {
      const branchEmployees = (scopedEmployees || []).filter(e => e?.branch === branchName);
      let officeCount = 0;
      let wfhCount = 0;
      let hybridCount = 0;
      let activeToday = 0;

      branchEmployees.forEach(e => {
        if (!e) return;
        const todayRecord = (kpiFilteredAttendance || []).find(a => a?.employeeId === e.id);
        
        // Only count if they have a real attendance record and are not absent or on leave
        if (!todayRecord || todayRecord.isVirtual) return;
        
        const status = todayRecord.status ? todayRecord.status.toLowerCase() : '';
        if (status === 'absent' || status.includes('leave')) return;

        activeToday++;

        const activeMode = todayRecord.workMode || e.workMode || 'WFO';
        const normMode = normalizeWorkMode(activeMode);
        if (normMode === 'WFH') {
          wfhCount++;
        } else if (normMode === 'Hybrid') {
          hybridCount++;
        } else {
          officeCount++;
        }
      });

      const branchObj = (branches || []).find(b => b.name === branchName);
      const address = branchObj ? (branchObj.address || `${branchObj.city || ''}, ${branchObj.state || ''}`) : '';

      return {
        name: branchName,
        address: address || '',
        total: branchEmployees.length,
        active: activeToday,
        office: officeCount,
        wfh: wfhCount,
        hybrid: hybridCount,
        rate: branchEmployees.length > 0 ? Math.round((activeToday / branchEmployees.length) * 100) : 0
      };
    });
  }, [branches, scopedEmployees, kpiFilteredAttendance]);


  // ─── Helper: Export CSV ───
  const handleDownloadReport = () => {
    const rows = [['Date', 'Status', 'Punch In', 'Punch Out', 'Work Hours', 'Source']];
    filteredRecords.forEach(r => {
      rows.push([
        r.date || '', r.status || '',
        r.punchIn || '--:--', r.punchOut || '--:--',
        r.totalHours ? `${r.totalHours}h` : '0h',
        r.source || 'Biometric'
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Attendance report downloaded successfully.');
  };

  const renderCorrectionForm = () => {
    return (
      <form onSubmit={handleSubmitCorrection}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Correction Date</label>
              <input
                type="date"
                required
                disabled={!!selectedCorrection}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                value={correctionForm.date}
                onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Correction Type</label>
              <select
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                value={correctionForm.correctionType}
                onChange={(e) => setCorrectionForm({ ...correctionForm, correctionType: e.target.value })}
              >
                <option value="Missing Punch In">Missing Punch In</option>
                <option value="Missing Punch Out">Missing Punch Out</option>
                <option value="Wrong Punch In Time">Wrong Punch In Time</option>
                <option value="Wrong Punch Out Time">Wrong Punch Out Time</option>
                <option value="Forgot to Punch">Forgot to Punch</option>
                <option value="Wrong Working Hours">Wrong Working Hours</option>
                <option value="Wrong Shift">Wrong Shift</option>
                <option value="Wrong Attendance Status">Wrong Attendance Status</option>
                <option value="Wrong Break Time">Wrong Break Time</option>
                <option value="Wrong Overtime">Wrong Overtime</option>
                <option value="Manual Attendance Request">Manual Attendance Request</option>
                <option value="Work From Home Correction">Work From Home Correction</option>
                <option value="Field Visit Attendance">Field Visit Attendance</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Requested Punch In Time</label>
              <input
                type="time"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                value={correctionForm.requestedPunchIn}
                onChange={(e) => setCorrectionForm({ ...correctionForm, requestedPunchIn: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Requested Punch Out Time</label>
              <input
                type="time"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                value={correctionForm.requestedPunchOut}
                onChange={(e) => setCorrectionForm({ ...correctionForm, requestedPunchOut: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Requested Status</label>
              <select
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                value={correctionForm.requestedStatus}
                onChange={(e) => setCorrectionForm({ ...correctionForm, requestedStatus: e.target.value })}
              >
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Work From Home">Work From Home</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Requested Shift</label>
              <select
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                value={correctionForm.requestedShift}
                onChange={(e) => setCorrectionForm({ ...correctionForm, requestedShift: e.target.value })}
              >
                <option value="Day Shift">Day Shift (09:30 AM – 06:00 PM)</option>
                <option value="Night Shift">Night Shift (09:30 PM – 06:00 AM)</option>
                <option value="Early Shift">Early Shift (07:00 AM – 03:30 PM)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Reason for Correction</label>
            <textarea
              required
              rows="3"
              placeholder="Explain why this correction is needed..."
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical'
              }}
              value={correctionForm.reason}
              onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Additional Comments (Optional)</label>
            <textarea
              rows="2"
              placeholder="Any extra remarks..."
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical'
              }}
              value={correctionForm.remarks}
              onChange={(e) => setCorrectionForm({ ...correctionForm, remarks: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="ghost" onClick={() => {
              setIsCorrectionOpen(false);
              setSelectedCorrection(null);
            }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {selectedCorrection ? "Resubmit Request" : "Submit Request"}
            </Button>
          </div>
        </div>
      </form>
    );
  };

  const renderCorrectionDetails = () => {
    if (!selectedCorrection) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{selectedCorrection.employeeName}</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              ID: {selectedCorrection.employeeId} • {selectedCorrection.department} ({selectedCorrection.branch})
            </span>
          </div>
          <span className={`ep-badge ${
            selectedCorrection.status === 'Approved' ? 'ep-badge-success' :
            selectedCorrection.status === 'Rejected' ? 'ep-badge-danger' :
            selectedCorrection.status === 'More Information Required' ? 'ep-badge-warning' :
            'ep-badge-info'
          }`} style={{ alignSelf: 'flex-start', padding: '4px 8px', borderRadius: '4px' }}>
            {selectedCorrection.status}
          </span>
        </div>

        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            Before vs Requested Comparison
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div style={{ borderRight: '1px dashed var(--border-color)', paddingRight: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>CURRENT RECORD</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.8rem' }}>
                <span>Punch In:</span><strong>{selectedCorrection.currentPunchIn}</strong>
                <span>Punch Out:</span><strong>{selectedCorrection.currentPunchOut}</strong>
                <span>Status:</span><strong>{selectedCorrection.currentStatus}</strong>
                <span>Shift:</span><strong>{selectedCorrection.currentShift || '—'}</strong>
                <span>Hours:</span><strong>{selectedCorrection.currentTotalHours} hrs</strong>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>REQUESTED CHANGE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '0.8rem' }}>
                <span>Punch In:</span><strong style={{ color: 'var(--color-primary)' }}>{selectedCorrection.requestedPunchIn}</strong>
                <span>Punch Out:</span><strong style={{ color: 'var(--color-primary)' }}>{selectedCorrection.requestedPunchOut}</strong>
                <span>Status:</span><strong style={{ color: 'var(--color-primary)' }}>{selectedCorrection.requestedStatus}</strong>
                <span>Shift:</span><strong style={{ color: 'var(--color-primary)' }}>{selectedCorrection.requestedShift || '—'}</strong>
              </div>
            </div>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reason for request:</span>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '6px', border: '0.5px solid var(--border-color)' }}>
            {selectedCorrection.reason}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Request Activity Timeline:</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
            {(selectedCorrection.timeline || []).map((t, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{t.action}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{new Date(t.timestamp).toLocaleString()}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>By: {t.actorName} ({t.actorRole})</span>
                {t.comments && (
                  <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    " {t.comments} "
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          {(selectedCorrection.status === 'Pending' || selectedCorrection.status === 'Under Review') && hasPermission('attendance_management', 'approve') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Remarks / Comments (Required for Reject / More Info)</label>
                <textarea
                  rows="2"
                  placeholder="Add approval remarks or comments..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  value={detailRemarks}
                  onChange={(e) => setDetailRemarks(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  className="success-btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                  onClick={() => {
                    setIsDetailOpen(false);
                    setSelectedCorrection(null);
                    setDetailRemarks('');
                  }}
                >
                  Close
                </button>
                <button
                  className="success-btn"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--color-warning)', color: 'var(--color-warning)', background: 'transparent', cursor: 'pointer' }}
                  onClick={() => handleActionCorrection('more-info')}
                >
                  Request Info
                </button>
                <button
                  className="success-btn success-btn-danger"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                  onClick={() => handleActionCorrection('reject')}
                >
                  Reject
                </button>
                <button
                  className="success-btn success-btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                  onClick={() => handleActionCorrection('approve')}
                >
                  Approve Request
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="success-btn"
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedCorrection(null);
                  setDetailRemarks('');
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isEmployeeView) {
    if (personalLoading && personalRecords.length === 0) {
      return (
        <div className="attendance-page flex-column grid-gap padding-4">
          <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', margin: '8px 0' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card" style={{ height: '90px' }}><Skeleton variant="rect" height="100%" /></div>
            ))}
          </div>
          <div className="card" style={{ height: '300px' }}><Skeleton variant="rect" height="100%" /></div>
        </div>
      );
    }

    // Compute overtime from records
    const totalOvertimeHrs = personalRecords.reduce((sum, r) => {
      const extra = (r.totalHours || 0) - 8;
      return sum + (extra > 0 ? extra : 0);
    }, 0);
    const attendancePct = personalSummary.totalWorkingDays > 0
      ? Math.round((personalSummary.presentDays / personalSummary.totalWorkingDays) * 100)
      : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0 0 2rem 0' }}>
        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-success))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Activity size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>My Attendance</h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Personal punch log, shift analytics &amp; work hours</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {showPerspectiveDropdown && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>View Mode:</span>
                <select
                  value={perspective}
                  onChange={(e) => setPerspective(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <option value="self">Self Info</option>
                  <option value="company">Company Info</option>
                </select>
              </div>
            )}
            <Button variant="secondary" onClick={personalRefetch} icon={RefreshCw} size="sm">Refresh</Button>
            <Button variant="outline" onClick={handleDownloadReport} icon={Download} size="sm">Download Report</Button>
          </div>
        </div>

        {/* ── 5 Stat Cards ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
          gap: '12px'
        }}>
          {[
            {
              label: 'Present Days',
              value: `${personalSummary.presentDays}`,
              sub: `/ ${personalSummary.totalWorkingDays} working days`,
              color: 'var(--color-success)',
              bg: 'rgba(16,185,129,0.08)',
              border: 'rgba(16,185,129,0.2)',
              icon: <CheckCircle2 size={18} />
            },
            {
              label: 'Absent Days',
              value: `${personalSummary.absentDays}`,
              sub: 'days missed',
              color: 'var(--color-danger)',
              bg: 'rgba(239,68,68,0.08)',
              border: 'rgba(239,68,68,0.2)',
              icon: <UserMinus size={18} />
            },
            {
              label: 'Late Arrivals',
              value: `${personalSummary.lateDays}`,
              sub: 'days late this month',
              color: 'var(--color-warning)',
              bg: 'rgba(245,158,11,0.08)',
              border: 'rgba(245,158,11,0.2)',
              icon: <Clock size={18} />
            },
            {
              label: 'Avg Work Hours',
              value: `${personalSummary.avgHours}h`,
              sub: 'per day',
              color: 'var(--color-info)',
              bg: 'rgba(59,130,246,0.08)',
              border: 'rgba(59,130,246,0.2)',
              icon: <BarChart2 size={18} />
            },
            {
              label: 'Attendance Rate',
              value: `${attendancePct}%`,
              sub: `${personalSummary.presentDays} / ${personalSummary.totalWorkingDays} days`,
              color: attendancePct >= 90 ? 'var(--color-success)' : attendancePct >= 75 ? 'var(--color-warning)' : 'var(--color-danger)',
              bg: attendancePct >= 90 ? 'rgba(16,185,129,0.08)' : attendancePct >= 75 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
              border: attendancePct >= 90 ? 'rgba(16,185,129,0.2)' : attendancePct >= 75 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
              icon: <Award size={18} />
            }
          ].map((card, i) => (
            <div key={i} style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {card.label}
                </span>
                <span style={{ color: card.color, opacity: 0.8 }}>{card.icon}</span>
              </div>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{card.sub}</span>
            </div>
          ))}
        </div>

        {/* ── Date Filter Tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', gap: '4px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            padding: '3px',
            borderRadius: 'var(--radius-lg)'
          }}>
            {[
              { key: 'today', label: 'Today' },
              { key: '7days', label: 'Last 7 Days' },
              { key: 'month', label: 'This Month' },
              { key: 'custom', label: 'Custom' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setPersonalTab(t.key)}
                style={{
                  padding: '7px 16px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: personalTab === t.key ? 'var(--color-primary)' : 'transparent',
                  color: personalTab === t.key ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {personalTab === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                value={customRange.from}
                onChange={e => setCustomRange(prev => ({ ...prev, from: e.target.value }))}
                style={{ padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>to</span>
              <input
                type="date"
                value={customRange.to}
                onChange={e => setCustomRange(prev => ({ ...prev, to: e.target.value }))}
                style={{ padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
              />
            </div>
          )}
        </div>

        {/* ── Today Status Card ── */}
        {personalTab === 'today' && (
          <TodayStatusCard todayRecord={personalTodayRecord} />
        )}

        {/* ── Charts Row: Bar + Weekly Trend + Donut ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px'
        }}>
          <AttendanceSummaryChart records={personalRecords} />
          <WeeklyTrendChart records={personalRecords} />
          <MonthlyDonutChart records={personalRecords} />
        </div>

        {/* ── Bottom Section: Attendance Log + Live Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '14px' }}>
          {/* Attendance Log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                Attendance Log
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{filteredRecords.length} record(s)</span>
            </div>
            {filteredRecords.length === 0 ? (
              <div style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.875rem'
              }}>
                No records found for the selected period
              </div>
            ) : (
              filteredRecords.map(rec => {
                const hasPending = (correctionRequests || []).some(
                  req => req.date === rec.date && req.employeeId === currentUser?.id && ['Pending', 'Under Review'].includes(req.status)
                );
                return (
                  <AttendanceDayCard
                    key={rec.id}
                    record={rec}
                    onRequestCorrection={hasPending ? null : handleOpenCorrection}
                  />
                );
              })
            )}
          </div>

          {/* Live Activity Feed */}
          <LiveActivityFeed records={filteredRecords} />
        </div>

        {/* ── Correction Requests History ── */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} style={{ color: 'var(--color-success)' }} />
              Correction Requests History
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {(correctionRequests || []).filter(r => r.employeeId === currentUser?.id).length} request(s) total
            </span>
          </div>

          {((correctionRequests || []).filter(r => r.employeeId === currentUser?.id).length === 0) ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No correction requests submitted yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', paddingBottom: '8px' }}>
                    <th style={{ padding: '10px 8px' }}>Date</th>
                    <th style={{ padding: '10px 8px' }}>Correction Type</th>
                    <th style={{ padding: '10px 8px' }}>Requested Punch</th>
                    <th style={{ padding: '10px 8px' }}>Status</th>
                    <th style={{ padding: '10px 8px' }}>Submitted On</th>
                    <th style={{ padding: '10px 8px' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(correctionRequests || [])
                    .filter(r => r.employeeId === currentUser?.id)
                    .map((req) => {
                      let statusBadge = 'ep-badge-info';
                      if (req.status === 'Approved') statusBadge = 'ep-badge-success';
                      if (req.status === 'Rejected') statusBadge = 'ep-badge-danger';
                      if (req.status === 'Cancelled') statusBadge = 'ep-badge-muted';
                      if (req.status === 'More Information Required') statusBadge = 'ep-badge-warning';

                      return (
                        <tr 
                          key={req.id} 
                          style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedCorrection(req);
                            setIsDetailOpen(true);
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{req.date}</td>
                          <td style={{ padding: '10px 8px' }}>{req.correctionType}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>In:</span> <strong>{req.requestedPunchIn}</strong> • <span style={{ color: 'var(--text-secondary)' }}>Out:</span> <strong>{req.requestedPunchOut}</strong>
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <span className={`ep-badge ${statusBadge}`} style={{ fontSize: '0.68rem', padding: '3px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {req.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '10px 8px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.reason}>
                            {req.reason}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Modals for Employee View ── */}
        <MarkAttendanceModal
          isOpen={selfAttModalOpen}
          onClose={() => {
            setSelfAttModalOpen(false);
            personalRefetch();
            fetchAttendance();
          }}
          todayRecord={personalTodayRecord || {}}
          currentUser={currentUser || {}}
        />

        {isCorrectionOpen && (
          <Modal
            isOpen={isCorrectionOpen}
            onClose={() => {
              setIsCorrectionOpen(false);
              setSelectedCorrection(null);
            }}
            title={selectedCorrection ? "Resubmit Attendance Correction Request" : "Request Attendance Correction"}
            size="md"
          >
            {renderCorrectionForm()}
          </Modal>
        )}

        {isDetailOpen && selectedCorrection && (
          <Modal
            isOpen={isDetailOpen}
            onClose={() => {
              setIsDetailOpen(false);
              setSelectedCorrection(null);
              setDetailRemarks('');
            }}
            title="Attendance Correction Request Details"
            size="lg"
          >
            {renderCorrectionDetails()}
          </Modal>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="attendance-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="att-skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => (
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
          {showPerspectiveDropdown && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>View Mode:</span>
              <select
                value={perspective}
                onChange={(e) => setPerspective(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              >
                <option value="self">Self Info</option>
                <option value="company">Company Info</option>
              </select>
            </div>
          )}
          <Button variant="secondary" onClick={async () => {
            addToast('info', 'Refreshing live data...');
            await Promise.all([fetchAttendance(), fetchEmployees()]);
            addToast('success', 'Data refreshed successfully.');
          }} icon={RefreshCw} size="sm">
            Refresh
          </Button>
          {isCompanyView && canManageAttendance && (
            <>
              <Button variant="secondary" onClick={() => setShiftModalOpen(true)} icon={Clock} size="sm">
                Assign Shift
              </Button>
              <Button variant="secondary" onClick={() => setBreakModalOpen(true)} icon={Coffee} size="sm">
                Manage Breaks
              </Button>
              <Button variant="secondary" onClick={handleApproveAll} icon={ShieldCheck} size="sm">
                Approve All
              </Button>
            </>
          )}
          {isCompanyView && currentUserRole !== 'company_admin' && currentUserRole !== 'super_admin' && currentUserRole !== 'SuperAdmin' && (
            <Button variant="primary" onClick={() => setSelfAttModalOpen(true)} icon={Plus}>
              Self Attendance
            </Button>
          )}
          {isCompanyView && canManageAttendance && (
            <Button variant="primary" onClick={() => setMarkModalOpen(true)} icon={Plus}>
              Mark Attendance
            </Button>
          )}
          {isCompanyView && canManageAttendance && (
            <Button variant="outline" onClick={() => setIsExportOpen(true)} icon={Download}>
              Export Details
            </Button>
          )}
        </div>
      </div>

      {/* ═══ Work Mode Cards (Total/WFH/WFO/Hybrid) - CLICKABLE ═══ */}
      {isCompanyView && (
        <div className="att-workmode-strip">
          <div className="att-workmode-card att-workmode-total" onClick={() => navigateToRecordsWithFilter('workMode', '')}>
            <div className="att-workmode-icon"><Users size={24} /></div>
            <div className="att-workmode-info">
              <span className="att-workmode-label">Total Attendance</span>
              <span className="att-workmode-count">{workModeStats.total}</span>
              <span className="att-workmode-sub">Employees today</span>
            </div>
            <ChevronRight size={16} className="att-workmode-arrow" />
          </div>
          <div className="att-workmode-card att-workmode-wfh" onClick={() => navigateToRecordsWithFilter('workMode', 'WFH')}>
            <div className="att-workmode-icon"><Home size={24} /></div>
            <div className="att-workmode-info">
              <span className="att-workmode-label">WFH</span>
              <span className="att-workmode-count">{workModeStats.wfh}</span>
              <span className="att-workmode-sub">Employees today</span>
            </div>
            <ChevronRight size={16} className="att-workmode-arrow" />
          </div>
          <div className="att-workmode-card att-workmode-office" onClick={() => navigateToRecordsWithFilter('workMode', 'WFO')}>
            <div className="att-workmode-icon"><Building size={24} /></div>
            <div className="att-workmode-info">
              <span className="att-workmode-label">WFO</span>
              <span className="att-workmode-count">{workModeStats.office}</span>
              <span className="att-workmode-sub">Employees today</span>
            </div>
            <ChevronRight size={16} className="att-workmode-arrow" />
          </div>
          <div className="att-workmode-card att-workmode-hybrid" onClick={() => navigateToRecordsWithFilter('workMode', 'Hybrid')}>
            <div className="att-workmode-icon"><RefreshCw size={24} /></div>
            <div className="att-workmode-info">
              <span className="att-workmode-label">Hybrid</span>
              <span className="att-workmode-count">{workModeStats.hybrid}</span>
              <span className="att-workmode-sub">Employees today</span>
            </div>
            <ChevronRight size={16} className="att-workmode-arrow" />
          </div>
        </div>
      )}

      {/* ═══ Top Summary KPI Cards - CLICKABLE ═══ */}
      {isCompanyView && (
        <div className="att-kpi-strip">
          <div className="att-kpi-card att-kpi-blue" onClick={() => navigateToRecordsWithFilter('status', '')} style={{ cursor: 'pointer' }}>
            <div className="att-kpi-header">
              <span className="att-kpi-label">Total Employees</span>
              <div className="att-kpi-icon-box att-kpi-icon-blue"><Users size={16} /></div>
            </div>
            <div className="att-kpi-value">{totalEmployees.toLocaleString()}</div>
            <div className="att-kpi-sub">
              {joinedThisMonth >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{joinedThisMonth >= 0 ? `+${joinedThisMonth}` : joinedThisMonth} this month</span>
            </div>
          </div>

          <div className="att-kpi-card att-kpi-green" onClick={() => navigateToRecordsWithFilter('status', 'Present')} style={{ cursor: 'pointer' }}>
            <div className="att-kpi-header">
              <span className="att-kpi-label">Present Today</span>
              <div className="att-kpi-icon-box att-kpi-icon-green"><CheckCircle2 size={16} /></div>
            </div>
            <div className="att-kpi-value">{statusCounts.present}</div>
            <div className="att-kpi-sub">
              <span className="att-kpi-sub-tag">{totalHalfDay} Half-Day</span>
              <span>{totalWFH} WFH</span>
            </div>
          </div>

          <div className="att-kpi-card att-kpi-red" onClick={() => navigateToRecordsWithFilter('status', 'Absent')} style={{ cursor: 'pointer' }}>
            <div className="att-kpi-header">
              <span className="att-kpi-label">Absent Today</span>
              <div className="att-kpi-icon-box att-kpi-icon-red"><UserMinus size={16} /></div>
            </div>
            <div className="att-kpi-value">{statusCounts.absent}</div>
            <div className="att-kpi-sub">
              <TrendingDown size={11} />
              <span>Unexcused absence</span>
            </div>
          </div>

          <div className="att-kpi-card att-kpi-amber" onClick={() => navigateToRecordsWithFilter('status', 'On Leave')} style={{ cursor: 'pointer' }}>
            <div className="att-kpi-header">
              <span className="att-kpi-label">Employees on Leave</span>
              <div className="att-kpi-icon-box att-kpi-icon-amber"><BookOpen size={16} /></div>
            </div>
            <div className="att-kpi-value">{statusCounts.leave}</div>
            <div className="att-kpi-sub">
              <span>Approved holidays</span>
            </div>
          </div>

          <div className="att-kpi-card att-kpi-purple" onClick={() => navigateToRecordsWithFilter('status', 'Late')} style={{ cursor: 'pointer' }}>
            <div className="att-kpi-header">
              <span className="att-kpi-label">Late Arrivals</span>
              <div className="att-kpi-icon-box att-kpi-icon-purple"><AlertCircle size={16} /></div>
            </div>
            <div className="att-kpi-value">{statusCounts.late}</div>
            <div className="att-kpi-sub">
              <span>After {formatTime12(attendanceRules?.lateTimeThreshold || '09:15')}</span>
            </div>
          </div>

          <div className="att-kpi-card att-kpi-cyan" onClick={() => navigateToRecordsWithFilter('status', 'Work From Home')} style={{ cursor: 'pointer' }}>
            <div className="att-kpi-header">
              <span className="att-kpi-label">Work From Home</span>
              <div className="att-kpi-icon-box att-kpi-icon-cyan"><Home size={16} /></div>
            </div>
            <div className="att-kpi-value">{statusCounts.wfh}</div>
            <div className="att-kpi-sub">
              <span>Active WFH logs</span>
            </div>
          </div>

          <div className="att-kpi-card att-kpi-indigo" onClick={() => navigateToRecordsWithFilter('status', 'Half Day')} style={{ cursor: 'pointer' }}>
            <div className="att-kpi-header">
              <span className="att-kpi-label">Half Day</span>
              <div className="att-kpi-icon-box att-kpi-icon-indigo"><Clock size={16} /></div>
            </div>
            <div className="att-kpi-value">{statusCounts.halfDay}</div>
            <div className="att-kpi-sub">
              <span>Partial attendance</span>
            </div>
          </div>

          <div className="att-kpi-card att-kpi-rose">
            <div className="att-kpi-header">
              <span className="att-kpi-label">Attendance Rate</span>
              <div className="att-kpi-icon-box att-kpi-icon-rose"><BarChart2 size={16} /></div>
            </div>
            <div className="att-kpi-value">{attendanceRate}%</div>
            <div className="att-kpi-sub">
              {rateComparison.diff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{rateComparison.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Section Navigation Tabs ═══ */}
      <div className="att-section-tabs">
        {[
          isCompanyView && { id: 'overview', label: 'Overview & Analytics', icon: BarChart2 },
          { id: 'records', label: 'Attendance Records', icon: FileText },
          hasPermission('attendance_management', 'approve') && { id: 'corrections', label: 'Correction Requests', icon: Shield },
          !isCompanyView && { id: 'my-requests', label: 'My Corrections', icon: FileText },
          isCompanyView && { id: 'branches', label: 'Branch Management', icon: Building },
          isCompanyView && { id: 'reports', label: 'Reports & Export', icon: Download },
        ].filter(Boolean).map(tab => {
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
                    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border-color)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke="url(#presentGrad)"
                      strokeWidth="10"
                      strokeDasharray={`${(attendanceRate / 100) * 314} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    <text x="60" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="900">{attendanceRate}%</text>
                    <text x="60" y="74" textAnchor="middle" fill="var(--text-muted)" fontSize="7.5" fontWeight="700">Present Rate</text>
                  </svg>
                </div>
                <div className="att-donut-legend">
                  {[
                    { label: 'Present', count: statusCounts.present, color: '#4ade80' },
                    { label: 'Absent', count: statusCounts.absent, color: '#f87171' },
                    { label: 'On Leave', count: statusCounts.leave, color: '#fbbf24' },
                    { label: 'WFH', count: statusCounts.wfh, color: '#60a5fa' },
                    { label: 'Half Day', count: statusCounts.halfDay, color: '#a78bfa' },
                    { label: 'Late', count: statusCounts.late, color: '#fb923c' },
                  ].map((item, i) => (
                    <div key={i} className="att-legend-item" style={{ cursor: 'pointer' }} onClick={() => navigateToRecordsWithFilter('status', item.label)}>
                      <span className="att-legend-dot" style={{ background: item.color }} />
                      <span className="att-legend-label">{item.label}</span>
                      <span className="att-legend-count">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="att-weekly-bars">
                <div className="att-weekly-title">Weekly Trend</div>
                <div className="att-bar-group">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    const heights = weeklyTrendData;
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

            {/* Work Mode Distribution */}
            <div className="att-dept-breakdown">
              <div className="att-section-mini-title">Work Mode Distribution</div>
              <div className="att-dept-row" style={{ cursor: 'pointer' }} onClick={() => navigateToRecordsWithFilter('workMode', 'WFO')}>
                <span className="att-dept-name">🏢 WFO</span>
                <div className="att-dept-bar-wrap">
                  <div className="att-dept-bar-fill" style={{ width: `${workModeStats.total > 0 ? (workModeStats.office / workModeStats.total) * 100 : 0}%`, background: '#3b82f6' }} />
                </div>
                <span className="att-dept-count">{workModeStats.office}/{workModeStats.total}</span>
              </div>
              <div className="att-dept-row" style={{ cursor: 'pointer' }} onClick={() => navigateToRecordsWithFilter('workMode', 'WFH')}>
                <span className="att-dept-name">🏠 WFH</span>
                <div className="att-dept-bar-wrap">
                  <div className="att-dept-bar-fill" style={{ width: `${workModeStats.total > 0 ? (workModeStats.wfh / workModeStats.total) * 100 : 0}%`, background: '#10b981' }} />
                </div>
                <span className="att-dept-count">{workModeStats.wfh}/{workModeStats.total}</span>
              </div>
              <div className="att-dept-row" style={{ cursor: 'pointer' }} onClick={() => navigateToRecordsWithFilter('workMode', 'Hybrid')}>
                <span className="att-dept-name">🔄 Hybrid</span>
                <div className="att-dept-bar-wrap">
                  <div className="att-dept-bar-fill" style={{ width: `${workModeStats.total > 0 ? (workModeStats.hybrid / workModeStats.total) * 100 : 0}%`, background: '#f59e0b' }} />
                </div>
                <span className="att-dept-count">{workModeStats.hybrid}/{workModeStats.total}</span>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* ═══ ATTENDANCE RECORDS ═══ */}
      {activeSection === 'records' && (
        <div className="att-records-section">
          {/* Filters Panel */}
          <div className="card att-filters-panel">
            {isEmployeeView ? (
              <div className="employee-filter-container">
                <span className="employee-filter-label">
                  <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                  Filter Records:
                </span>
                <div className="employee-filter-tabs">
                  <button
                    className={`employee-filter-btn ${timeRangeFilter === 'today' ? 'active' : ''}`}
                    onClick={() => setTimeRangeFilter('today')}
                  >
                    Today
                  </button>
                  <button
                    className={`employee-filter-btn ${timeRangeFilter === '7days' ? 'active' : ''}`}
                    onClick={() => setTimeRangeFilter('7days')}
                  >
                    Last 7 Days
                  </button>
                  <button
                    className={`employee-filter-btn ${timeRangeFilter === 'month' ? 'active' : ''}`}
                    onClick={() => setTimeRangeFilter('month')}
                  >
                    This Month
                  </button>
                </div>
              </div>
            ) : (
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
                  {(departments || []).map(dept => (
                    <option key={dept.id || dept.name} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
                {isGlobalAdmin && (
                  <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                    <option value="">All Branches</option>
                    {(branches && branches.length > 0 ? branches.map(b => b.name) : Array.from(new Set(employees.map(e => e.branch).filter(Boolean)))).map(branchName => (
                      <option key={branchName} value={branchName}>{branchName}</option>
                    ))}
                  </select>
                )}
                <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                  <option value="">All Shifts</option>
                  <option value="Morning">Morning Shift</option>
                  <option value="Evening">Evening Shift</option>
                  <option value="Night">Night Shift</option>
                  <option value="Flexible">Flexible</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Select</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Overtime">Overtime</option>
                </select>
                <select value={workModeFilter} onChange={(e) => setWorkModeFilter(e.target.value)}>
                  <option value="">Select</option>
                  <option value="WFO">WFO</option>
                  <option value="WFH">WFH</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  <option value="">Select</option>
                  <option value="Biometric">Biometric</option>
                  <option value="GPS">GPS</option>
                  <option value="RFID">RFID</option>
                  <option value="Web Portal">Web Portal</option>
                  <option value="Mobile App">Mobile App</option>
                </select>
                <Button variant="ghost" onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('');
                  setBranchFilter('');
                  setShiftFilter('');
                  setStatusFilter('');
                  setSourceFilter('');
                  setWorkModeFilter('');
                  addToast('info', 'All filters cleared');
                }}>Clear</Button>
              </div>
            )}
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

          {/* Status summary below table - CLICKABLE */}
          <div className="att-status-summary-row">
            {[
              { label: 'Present', count: statusCounts.present, color: '#4ade80', icon: CheckCircle2, filter: 'Present' },
              { label: 'Absent', count: statusCounts.absent, color: '#f87171', icon: UserMinus, filter: 'Absent' },
              { label: 'Late', count: statusCounts.late, color: '#fb923c', icon: AlertCircle, filter: 'Late' },
              { label: 'On Leave', count: statusCounts.leave, color: '#fbbf24', icon: BookOpen, filter: 'On Leave' },
              { label: 'WFH', count: statusCounts.wfh, color: '#60a5fa', icon: Home, filter: 'Work From Home' },
              { label: 'Half Day', count: statusCounts.halfDay, color: '#a78bfa', icon: Clock, filter: 'Half Day' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="att-status-chip" style={{ borderColor: `${s.color}30`, cursor: 'pointer' }} onClick={() => navigateToRecordsWithFilter('status', s.filter)}>
                  <Icon size={13} style={{ color: s.color }} />
                  <span className="att-status-chip-count" style={{ color: s.color }}>{s.count}</span>
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ MY CORRECTION REQUESTS ═══ */}
      {activeSection === 'my-requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>My Correction Requests</h3>
            <button
              className="success-btn success-btn-primary"
              onClick={() => handleOpenCorrection(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>+ New Correction Request</span>
            </button>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            {(!correctionRequests || correctionRequests.filter(r => r.employeeId === currentUser?.id).length === 0) ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No attendance correction requests submitted yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', paddingBottom: '10px' }}>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Type</th>
                      <th style={{ padding: '12px' }}>Requested Timing/Status</th>
                      <th style={{ padding: '12px' }}>Submitted On</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Approver</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correctionRequests
                      .filter(r => r.employeeId === currentUser?.id)
                      .map(req => {
                        let statusBadge = 'ep-badge-info';
                        if (req.status === 'Approved') statusBadge = 'ep-badge-success';
                        if (req.status === 'Rejected') statusBadge = 'ep-badge-danger';
                        if (req.status === 'Cancelled') statusBadge = 'ep-badge-muted';
                        if (req.status === 'More Information Required') statusBadge = 'ep-badge-warning';

                        return (
                          <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px', fontWeight: 500 }}>
                              {new Date(req.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '12px' }}>{req.correctionType}</td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span>🕒 {req.requestedPunchIn} – {req.requestedPunchOut}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status: <strong>{req.requestedStatus}</strong></span>
                              </div>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                              {new Date(req.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span className={`ep-badge ${statusBadge}`} style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                {req.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                              {req.approvedBy || req.timeline.find(t => t.action === 'Approved' || t.action === 'Rejected' || t.action === 'More Info Requested')?.actorName || '—'}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="success-btn"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                                  onClick={() => {
                                    setSelectedCorrection(req);
                                    setIsDetailOpen(true);
                                  }}
                                >
                                  View
                                </button>
                                {req.status === 'Pending' && (
                                  <button
                                    className="success-btn success-btn-danger"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-danger)', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}
                                    onClick={() => handleCancelCorrection(req.id)}
                                  >
                                    Cancel
                                  </button>
                                )}
                                {req.status === 'More Information Required' && (
                                  <button
                                    className="success-btn success-btn-primary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }}
                                    onClick={() => handleResubmitCorrection(req)}
                                  >
                                    Resubmit
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ APPROVER CORRECTION REQUESTS ═══ */}
      {activeSection === 'corrections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI widgets */}
          <div className="att-kpis-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card att-kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending Requests</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {(correctionRequests || []).filter(r => r.status === 'Pending' || r.status === 'Under Review').length}
                </span>
                <span className="ep-badge ep-badge-warning" style={{ fontSize: '0.7rem' }}>Action Required</span>
              </div>
            </div>
            <div className="card att-kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Approved Requests</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-success)' }}>
                  {(correctionRequests || []).filter(r => r.status === 'Approved').length}
                </span>
                <span className="ep-badge ep-badge-success" style={{ fontSize: '0.7rem' }}>Total Approved</span>
              </div>
            </div>
            <div className="card att-kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>More Info Requested</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                  {(correctionRequests || []).filter(r => r.status === 'More Information Required').length}
                </span>
                <span className="ep-badge ep-badge-info" style={{ fontSize: '0.7rem' }}>Awaiting Reply</span>
              </div>
            </div>
            <div className="card att-kpi-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Rejected Requests</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                  {(correctionRequests || []).filter(r => r.status === 'Rejected').length}
                </span>
                <span className="ep-badge ep-badge-danger" style={{ fontSize: '0.7rem' }}>Rejected</span>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Correction Requests Queue</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{filteredQueueRequests.length} Request(s) shown</span>
              </div>
              
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setQueueFilterTab('active')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: queueFilterTab === 'active' ? 'var(--color-primary)' : 'transparent',
                    color: queueFilterTab === 'active' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  Active Requests ({(correctionRequests || []).filter(r => ['Pending', 'Under Review', 'More Information Required'].includes(r.status)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilterTab('history')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: queueFilterTab === 'history' ? 'var(--color-primary)' : 'transparent',
                    color: queueFilterTab === 'history' ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  History ({(correctionRequests || []).filter(r => ['Approved', 'Rejected', 'Cancelled'].includes(r.status)).length})
                </button>
              </div>
            </div>

            {(!filteredQueueRequests || filteredQueueRequests.length === 0) ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {queueFilterTab === 'active' ? 'No active correction requests in the queue.' : 'No historical requests found.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', paddingBottom: '10px' }}>
                      <th style={{ padding: '12px' }}>Employee</th>
                      <th style={{ padding: '12px' }}>Branch / Dept</th>
                      <th style={{ padding: '12px' }}>Date</th>
                      <th style={{ padding: '12px' }}>Correction Type</th>
                      <th style={{ padding: '12px' }}>Reason</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueueRequests.map(req => {
                      let statusBadge = 'ep-badge-info';
                      if (req.status === 'Approved') statusBadge = 'ep-badge-success';
                      if (req.status === 'Rejected') statusBadge = 'ep-badge-danger';
                      if (req.status === 'Cancelled') statusBadge = 'ep-badge-muted';
                      if (req.status === 'More Information Required') statusBadge = 'ep-badge-warning';

                      return (
                        <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.employeeName}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {req.employeeId}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>{req.branch || '—'}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{req.department || '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontWeight: 500 }}>
                            {new Date(req.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '12px' }}>{req.correctionType}</td>
                          <td style={{ padding: '12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.reason}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`ep-badge ${statusBadge}`} style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                              {req.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button
                              className="success-btn success-btn-primary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                              onClick={() => {
                                setSelectedCorrection(req);
                                setIsDetailOpen(true);
                              }}
                            >
                              {queueFilterTab === 'active' ? 'Review Request' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ BRANCH MANAGEMENT (Replaced Country) ═══ */}
      {activeSection === 'branches' && (
        <div className="att-branches-grid">
          <div className="card att-branches-card">
            <div className="att-card-header">
              <div className="att-card-title">
                <Building size={16} style={{ color: '#60a5fa' }} />
                <span>Branch Management</span>
              </div>
              <Button variant="secondary" size="sm" icon={Plus} onClick={() => addToast('info', 'Add new branch dialog coming soon.')}>
                Add Branch
              </Button>
            </div>
            <div className="att-branches-list">
              {branchData.map((branch, i) => (
                <div key={i} className="att-branch-item" onClick={() => navigateToRecordsWithFilter('branch', branch?.name)} style={{ cursor: 'pointer' }}>
                  <div className="att-branch-icon">
                    {(branch?.name || '').toLowerCase().includes('jaipur') ? '🕌' : (branch?.name || '').toLowerCase().includes('delhi') ? '🏛️' : (branch?.name || '').toLowerCase().includes('mumbai') ? '🌊' : '🏙️'}
                  </div>
                  <div className="att-branch-info">
                    <strong>{branch?.name || 'Unknown Branch'}</strong>
                    <span className="att-branch-address">
                      {branch.address}
                    </span>
                  </div>
                  <div className="att-branch-stats">
                    <div className="att-branch-stat">
                      <span>{branch?.total || 0}</span>
                      <span>Total</span>
                    </div>
                    <div className="att-branch-stat">
                      <span style={{ color: '#4ade80' }}>{branch?.active || 0}</span>
                      <span>Active</span>
                    </div>
                    <div className="att-branch-stat">
                      <span style={{ color: '#f87171' }}>{(branch?.total || 0) - (branch?.active || 0)}</span>
                      <span>Absent</span>
                    </div>
                  </div>
                  <div className="att-branch-bar-wrap">
                    <div className="att-branch-bar-fill" style={{ width: `${branch?.rate || 0}%` }} />
                  </div>
                  <div className="att-branch-workmode">
                    <span title="Office">🏢 {branch?.office || 0}</span>
                    <span title="WFH">🏠 {branch?.wfh || 0}</span>
                    <span title="Hybrid">🔄 {branch?.hybrid || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="att-branch-right-col">
            {/* Branch Wise Attendance Summary */}
            <div className="card att-branch-summary-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <BarChart2 size={15} style={{ color: '#4ade80' }} />
                  <span>Branch Attendance Summary</span>
                </div>
              </div>
              <div className="att-branch-summary">
                {branchData.map((branch, i) => (
                  <div key={i} className="att-branch-summary-row">
                    <div className="att-branch-summary-name">{branch?.name || 'Unknown'}</div>
                    <div className="att-branch-summary-bar">
                      <div className="att-branch-summary-fill" style={{ width: `${branch?.rate || 0}%`, background: (branch?.rate || 0) > 80 ? '#4ade80' : (branch?.rate || 0) > 60 ? '#fbbf24' : '#f87171' }} />
                    </div>
                    <div className="att-branch-summary-rate">{branch?.rate || 0}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Branch Wise Work Mode Distribution */}
            <div className="card att-branch-workmode-card">
              <div className="att-card-header">
                <div className="att-card-title">
                  <Users size={15} style={{ color: '#a78bfa' }} />
                  <span>Work Mode by Branch</span>
                </div>
              </div>
              <div className="att-branch-workmode-list">
                {branchData.map((branch, i) => (
                  <div key={i} className="att-branch-wm-row">
                    <strong>{branch?.name || 'Unknown'}</strong>
                    <div className="att-branch-wm-stats">
                      <span className="att-wm-office">🏢 {branch?.office || 0}</span>
                      <span className="att-wm-wfh">🏠 {branch?.wfh || 0}</span>
                      <span className="att-wm-hybrid">🔄 {branch?.hybrid || 0}</span>
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
                    <button 
                      key={range} 
                      className="att-range-btn"
                      onClick={() => {
                        if (range === 'Today') setDateFilter(getLocalDateString());
                        addToast('info', `${range} report selected`);
                      }}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                <div className="att-custom-range">
                  <label>Custom From</label>
                  <input type="date" className="att-range-input" defaultValue="2026-05-01" onChange={(e) => setDateFilter(e.target.value)} />
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
                  { label: 'Online Right Now', value: statusCounts.present, color: '#4ade80' },
                  { label: 'On Break', value: Math.floor(statusCounts.present * 0.15), color: '#fbbf24' },
                  { label: 'Offline Today', value: statusCounts.absent, color: '#f87171' },
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
                <input type="text" value={selectedRecord.employeeName} disabled style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)', width: '100%', height: '38px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label>Branch / Office</label>
                <input type="text" value={selectedRecord.branch} disabled style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)', width: '100%', height: '38px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label>Status</label>
                <select value={editFormData.status}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                  <option value="">Select</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Overtime">Overtime</option>
                </select>
              </div>
              {(() => {
                const isNoPunch = editFormData.status === 'Absent' || editFormData.status === 'On Leave';
                return (
                  <div style={{ opacity: isNoPunch ? 0.4 : 1, pointerEvents: isNoPunch ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                    <label>Mode</label>
                    <select value={editFormData.workMode}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, workMode: e.target.value }))}
                      disabled={isNoPunch}
                      style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                      <option value="">Select</option>
                      <option value="WFO">WFO</option>
                      <option value="WFH">WFH</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                );
              })()}
            </div>

            {(() => {
              const isNoPunch = editFormData.status === 'Absent' || editFormData.status === 'On Leave';
              return (
                <>
                  <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', opacity: isNoPunch ? 0.4 : 1, pointerEvents: isNoPunch ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                    <div>
                      <label>Punch In Time {!isNoPunch && '*'}</label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input type="time" value={convert12to24(editFormData.punchIn)}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, punchIn: convert24to12(e.target.value) }))}
                          disabled={isNoPunch}
                          style={{ flex: 1, height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)', colorScheme: 'dark' }} />
                        <Button type="button" variant="secondary" onClick={handleEditAutoPunchIn} style={{ padding: '0 10px', minWidth: 'auto' }} title="Set Current Time" disabled={isNoPunch}>⏱️</Button>
                      </div>
                    </div>
                    <div>
                      <label>Punch Out Time</label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input type="time" value={convert12to24(editFormData.punchOut)}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, punchOut: convert24to12(e.target.value) }))}
                          disabled={isNoPunch}
                          style={{ flex: 1, height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)', colorScheme: 'dark' }} />
                        <Button type="button" variant="secondary" onClick={handleEditAutoPunchOut} style={{ padding: '0 10px', minWidth: 'auto' }} title="Set Current Time" disabled={isNoPunch || !editFormData.punchIn}>⏱️</Button>
                      </div>
                    </div>
                  </div>

                  <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', opacity: isNoPunch ? 0.4 : 1, pointerEvents: isNoPunch ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                    <div>
                      <label>Total Hours</label>
                      <input type="text" placeholder="e.g. 08:30" value={editFormData.totalHours}
                        disabled={isNoPunch}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, totalHours: e.target.value }))}
                        style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label>Source Device</label>
                      <select value={editFormData.source}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, source: e.target.value }))}
                        disabled={isNoPunch}
                        style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                        <option value="">Select</option>
                        <option value="Biometric">Biometric</option>
                        <option value="GPS">GPS</option>
                        <option value="RFID">RFID</option>
                        <option value="Web Portal">Web Portal</option>
                        <option value="Mobile App">Mobile App</option>
                      </select>
                    </div>
                  </div>
                </>
              );
            })()}

            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
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
      <Modal
        isOpen={markModalOpen}
        onClose={() => setMarkModalOpen(false)}
        title="Mark Attendance Log"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setMarkModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleMarkSubmit}>Mark Attendance</Button>
          </div>
        }
      >
        <div className="create-task-form-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div className="form-field">
            <label>Select Employee *</label>
            {currentUserRole === 'employee' ? (
              <input 
                type="text" 
                value={currentUser?.name || ''} 
                disabled 
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)', opacity: 0.7, cursor: 'not-allowed' }} 
              />
            ) : (
              <select
                value={markFormData.employeeId}
                onChange={(e) => {
                  const found = scopedEmployees.find(emp => emp.id === e.target.value);
                  setMarkFormData(prev => ({
                    ...prev,
                    employeeId: e.target.value,
                    employeeName: found?.name || '',
                    department: found?.department || '',
                    branch: found?.branch || '',
                    workMode: found?.workMode || 'Work From Office'
                  }));
                }}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}
              >
                <option value="">Choose employee...</option>
                {scopedEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.id}) — {emp.department}</option>
                ))}
              </select>
            )}
          </div>

          {markFormData.employeeName && (
            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Department:</span>
                <strong style={{ marginLeft: '5px', fontSize: '0.8rem' }}>{markFormData.department}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Branch:</span>
                <strong style={{ marginLeft: '5px', fontSize: '0.8rem' }}>{markFormData.branch}</strong>
              </div>
            </div>
          )}

          {/* ── Status & Mode (moved to top) ── */}
          <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div>
              <label>Status</label>
              <select value={markFormData.status}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, status: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                <option value="">Select</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Work From Home">Work From Home</option>
                <option value="On Leave">On Leave</option>
                <option value="Overtime">Overtime</option>
              </select>
            </div>
            {(() => {
              const isNoPunch = markFormData.status === 'Absent' || markFormData.status === 'On Leave';
              return (
                <div style={{ opacity: isNoPunch ? 0.4 : 1, pointerEvents: isNoPunch ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                  <label>Mode</label>
                  <select value={markFormData.workMode}
                    onChange={(e) => setMarkFormData(prev => ({ ...prev, workMode: e.target.value }))}
                    disabled={isNoPunch}
                    style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                    <option value="">Select</option>
                    <option value="WFO">WFO</option>
                    <option value="WFH">WFH</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              );
            })()}
          </div>

          {/* ── Punch In / Punch Out (disabled for Absent / On Leave) ── */}
          {(() => {
            const isNoPunch = markFormData.status === 'Absent' || markFormData.status === 'On Leave';
            return (
              <>
                <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', opacity: isNoPunch ? 0.4 : 1, pointerEvents: isNoPunch ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                  <div>
                    <label>Punch In Time {!isNoPunch && '*'}</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="time" value={convert12to24(markFormData.punchIn)}
                        onChange={(e) => setMarkFormData(prev => ({ ...prev, punchIn: convert24to12(e.target.value) }))}
                        disabled={isNoPunch}
                        style={{ flex: 1, height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)', colorScheme: 'dark' }} />
                      <Button type="button" variant="secondary" onClick={handleAutoPunchIn} style={{ padding: '0 10px', minWidth: 'auto' }} title="Set Current Time" disabled={isNoPunch}>⏱️</Button>
                    </div>
                  </div>
                  <div>
                    <label>Punch Out Time</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="time" value={convert12to24(markFormData.punchOut)}
                        onChange={(e) => setMarkFormData(prev => ({ ...prev, punchOut: convert24to12(e.target.value) }))}
                        disabled={isNoPunch}
                        style={{ flex: 1, height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)', colorScheme: 'dark' }} />
                      <Button type="button" variant="secondary" onClick={handleAutoPunchOut} style={{ padding: '0 10px', minWidth: 'auto' }} title="Set Current Time" disabled={isNoPunch || !markFormData.punchIn}>⏱️</Button>
                    </div>
                  </div>
                </div>

                <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', opacity: isNoPunch ? 0.4 : 1, pointerEvents: isNoPunch ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                  <div>
                    <label>Total Hours</label>
                    <input type="text" placeholder="e.g. 08:30" value={markFormData.totalHours}
                      disabled={isNoPunch}
                      onChange={(e) => setMarkFormData(prev => ({ ...prev, totalHours: e.target.value }))}
                      style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label>Source Device</label>
                    <select value={markFormData.source}
                      onChange={(e) => setMarkFormData(prev => ({ ...prev, source: e.target.value }))}
                      disabled={isNoPunch}
                      style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                      <option value="">Select</option>
                      <option value="Biometric">Biometric</option>
                      <option value="GPS">GPS</option>
                      <option value="RFID">RFID</option>
                      <option value="Web Portal">Web Portal</option>
                      <option value="Mobile App">Mobile App</option>
                    </select>
                  </div>
                </div>
              </>
            );
          })()}

          <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div>
              <label>Date</label>
              <input type="date" value={markFormData.date}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label>Break Time</label>
              <input type="text" placeholder="e.g. 45 mins" value={markFormData.breakTime}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, breakTime: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>
      </Modal>

      <MarkAttendanceModal
        isOpen={selfAttModalOpen}
        onClose={() => {
          setSelfAttModalOpen(false);
          personalRefetch();
          fetchAttendance();
        }}
        todayRecord={personalTodayRecord || {}}
        currentUser={currentUser || {}}
      />

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
              {scopedEmployees.map(emp => (
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

      {/* Manage Breaks Modal */}
      <Modal isOpen={breakModalOpen} onClose={() => setBreakModalOpen(false)} title="Manage Global Breaks" size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setBreakModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveBreaksConfig}>Save Configuration</Button>
          </div>
        }
      >
        <div className="create-task-form-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          
          {/* Active breaks list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Configured Breaks</label>
            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {modalBreaks.length > 0 ? (
                modalBreaks.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>☕ {b.breakType}</span>
                    <input
                      type="number"
                      value={b.duration || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setModalBreaks(prev => prev.map((item, idx) => idx === i ? { ...item, duration: val } : item));
                      }}
                      style={{ width: '80px', height: '36px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 8px', color: 'var(--text-primary)', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>mins</span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setModalBreaks(prev => prev.filter((_, idx) => idx !== i));
                      }}
                      style={{ color: 'var(--color-danger)', padding: '4px 8px', minWidth: 'auto', height: '32px' }}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>No breaks configured. Add a new break below.</div>
              )}
              
              {modalBreaks.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Total Break Duration:</span>
                  <strong style={{ color: 'var(--color-success)', fontSize: '1.1rem' }}>
                    {modalBreaks.reduce((sum, b) => sum + (b.duration || 0), 0)} mins
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Form to add custom breaks */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px', marginTop: '10px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>Add Custom Break</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Break Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tea Break"
                  value={newBreakName}
                  onChange={(e) => setNewBreakName(e.target.value)}
                  style={{ width: '100%', height: '36px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Duration (mins)</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={newBreakDuration}
                  onChange={(e) => setNewBreakDuration(e.target.value)}
                  style={{ width: '100%', height: '36px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddNewBreakToList}
                style={{ height: '36px', display: 'flex', alignItems: 'center' }}
              >
                Add Break
              </Button>
            </div>
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
            { label: 'Mark Attendance', icon: CheckSquare, color: '#4ade80', action: () => setMarkModalOpen(true), adminOnly: true },
            { label: 'Assign Shift', icon: Clock, color: '#60a5fa', action: () => setShiftModalOpen(true), adminOnly: true },
            { label: 'Manage Breaks', icon: Coffee, color: '#fb7185', action: () => setBreakModalOpen(true), adminOnly: true },
            { label: 'Request Check-In', icon: UserCheck, color: '#fbbf24', action: handleRequestAttendance, adminOnly: true },
            { label: 'Approve All', icon: ShieldCheck, color: '#a78bfa', action: handleApproveAll, adminOnly: true },
            { label: 'Schedule Report', icon: Calendar, color: '#f472b6', action: handleScheduleReport, adminOnly: true },
            { label: 'Download Report', icon: Download, color: '#38bdf8', action: () => handleExport('CSV') },
            { label: 'Alerts', icon: Bell, color: '#fb923c', action: () => addToast('info', 'Showing attendance alerts...'), adminOnly: true },
            { label: 'System Status', icon: Activity, color: '#2ec4b6', action: () => addToast('success', 'All systems online.'), adminOnly: true },
          ].filter(act => !act.adminOnly || currentUserRole !== 'employee').map((action, i) => {
            const Icon = action.icon;
            return (
              <button key={i} className="att-fab-btn" onClick={action.action} title={action.label}>
                <Icon size={14} style={{ color: action.color }} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      {/* ── Export Results Modal Form ── */}
      {isExportOpen && (
        <Modal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Workforce Attendance Report"
        >
          <form onSubmit={handleExportSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Report Type</label>
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  value={exportOptions.reportType}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    reportType: e.target.value,
                    employeeId: e.target.value === 'All Employees' ? '' : exportOptions.employeeId || (employees[0]?.id || '')
                  })}
                >
                  <option value="All Employees">All Employees Timesheets</option>
                  <option value="Specific Employee">Specific Employee Timesheet</option>
                </select>
              </div>

              {exportOptions.reportType === 'Specific Employee' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select Employee</label>
                  <select
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    value={exportOptions.employeeId}
                    onChange={(e) => setExportOptions({ ...exportOptions, employeeId: e.target.value })}
                    required
                  >
                    <option value="">— Select Employee —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department} • {emp.designation})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Date Scope</label>
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  value={exportOptions.dateRange}
                  onChange={(e) => setExportOptions({ ...exportOptions, dateRange: e.target.value })}
                >
                  <option value="AllTime">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Weekly">Weekly (Last 7 Days)</option>
                  <option value="Monthly">Monthly (Last 30 Days)</option>
                  <option value="Yearly">Yearly (Last 365 Days)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Export Format</label>
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value })}
                >
                  <option value="CSV">Standard CSV File (.csv)</option>
                  <option value="Excel">Microsoft Excel Sheet (.xls)</option>
                  <option value="PDF">Adobe PDF Document (.pdf)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <Button type="button" variant="ghost" onClick={() => setIsExportOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Compile & Export
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Attendance Correction Form Modal ── */}
      {isCorrectionOpen && (
        <Modal
          isOpen={isCorrectionOpen}
          onClose={() => {
            setIsCorrectionOpen(false);
            setSelectedCorrection(null);
          }}
          title={selectedCorrection ? "Resubmit Attendance Correction Request" : "Request Attendance Correction"}
          size="md"
        >
          {renderCorrectionForm()}
        </Modal>
      )}

      {/* ── Attendance Correction Request Detail Modal ── */}
      {isDetailOpen && selectedCorrection && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedCorrection(null);
            setDetailRemarks('');
          }}
          title="Attendance Correction Request Details"
          size="lg"
        >
          {renderCorrectionDetails()}
        </Modal>
      )}
      </div>

    </div>
  );
};

export default Attendance;