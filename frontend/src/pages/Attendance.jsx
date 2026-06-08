import React, { useState, useMemo, useEffect } from 'react';
import './Attendance.css';
import { useApp } from '../context/AppContext';
import { FIELD_LABELS } from '../utils/fieldLabels';
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
  Target, Layers, BookOpen, Briefcase, Building, Monitor
} from 'lucide-react';

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeWorkMode = (mode) => {
  if (!mode) return 'WFO';
  const m = mode.trim().toUpperCase();
  if (m === 'WFH' || m.includes('HOME')) return 'WFH';
  if (m === 'HYBRID') return 'Hybrid';
  return 'WFO';
};

const Attendance = () => {
  const isLoading = usePageLoading(600);
  const navigate = useNavigate();
  const {
    attendance,
    employees,
    branches,
    updateAttendanceRecord,
    addAttendanceRecord,
    updateEmployee,
    addToast,
    currentUser,
    currentUserRole,
    fetchAttendance,
    fetchEmployees
  } = useApp();

  const scopedEmployees = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin') return employees;
    if (currentUserRole === 'branch_admin') {
      return employees.filter(e => e.branch === currentUser?.branch);
    }
    if (currentUserRole === 'dept_admin') {
      return employees.filter(e => e.department === currentUser?.department);
    }
    if (currentUserRole === 'employee') {
      return employees.filter(e => e.id === currentUser?.id);
    }
    return employees;
  }, [employees, currentUser, currentUserRole]);

  // Active view tab state
  const [activeSection, setActiveSection] = useState('overview');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(getLocalDateString());
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('');



  // Edit record states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    punchIn: '',
    punchOut: '',
    totalHours: 0,
    status: 'Present',
    source: 'Biometric',
    workMode: 'WFO'
  });

  // Mark Attendance state
  const [markModalOpen, setMarkModalOpen] = useState(false);
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
    totalHours: 0,
    status: 'Present',
    source: 'Web Portal'
  });

  useEffect(() => {
    if (currentUser && currentUserRole === 'employee') {
      setMarkFormData(prev => ({
        ...prev,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        department: currentUser.department || '',
        branch: currentUser.branch || '',
        workMode: currentUser.workMode || 'Work From Office'
      }));
    }
  }, [currentUser, currentUserRole]);

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
    return [
      { breakType: 'Lunch Break', duration: 40 },
      { breakType: 'Snacks Break', duration: 15 }
    ];
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

  // Automation Rules State (with localStorage persistence)
  const [automationRules, setAutomationRules] = useState(() => {
    const saved = localStorage.getItem('attendance_automation_rules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(rule => {
            let icon = Cpu;
            if (rule.id === 1) icon = UserMinus;
            else if (rule.id === 2) icon = Bell;
            else if (rule.id === 3) icon = Clock;
            else if (rule.id === 4) icon = FileText;
            else if (rule.id === 5) icon = Target;
            else if (rule.id === 6) icon = Smartphone;
            return { ...rule, icon };
          });
        }
      } catch (e) {
        console.error("Error parsing automation rules from localStorage", e);
      }
    }
    return [
      { id: 1, name: 'Auto Mark Absent', desc: 'Mark absent if no punch by 11 AM', active: true, icon: UserMinus },
      { id: 2, name: 'Late Alert Email', desc: 'Send email when employee is 30+ min late', active: true, icon: Bell },
      { id: 3, name: 'OT Calculation', desc: 'Calculate overtime automatically post 8 hrs', active: true, icon: Clock },
      { id: 4, name: 'Monthly Report', desc: 'Auto-send reports on 1st of each month', active: false, icon: FileText },
      { id: 5, name: 'Leave Deduction', desc: 'Auto deduct from leave balance on absence', active: true, icon: Target },
      { id: 6, name: 'SMS Notification', desc: 'Send SMS for consecutive 3-day absences', active: false, icon: Smartphone },
    ];
  });

  // Save automation rules to localStorage when changed
  useEffect(() => {
    localStorage.setItem('attendance_automation_rules', JSON.stringify(automationRules));
  }, [automationRules]);

  // Toggle automation rule
  const toggleAutomationRule = (ruleId) => {
    setAutomationRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, active: !rule.active } : rule
    ));
    const rule = automationRules.find(r => r.id === ruleId);
    addToast('success', `${rule?.name} ${rule?.active ? 'disabled' : 'enabled'} successfully.`);
  };



  // Modals Actions
  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    setEditFormData({
      date: record.date || getLocalDateString(),
      punchIn: record.punchIn === '--:--' ? '' : (record.punchIn || ''),
      punchOut: record.punchOut === '--:--' ? '' : (record.punchOut || ''),
      totalHours: record.totalHours || 0,
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
    
    const recordPayload = {
      employeeId: selectedRecord.employeeId,
      employeeName: selectedRecord.employeeName,
      department: selectedRecord.department,
      branch: selectedRecord.branch,
      date: editFormData.date || selectedRecord.date,
      punchIn: isNoPunch ? '--:--' : (editFormData.punchIn || '--:--'),
      punchOut: isNoPunch ? '--:--' : (editFormData.punchOut || '--:--'),
      breakTime: '45 mins',
      totalHours: isNoPunch ? 0 : (parseFloat(editFormData.totalHours) || 0),
      status: editFormData.status,
      source: isNoPunch ? 'System' : editFormData.source,
      workMode: isNoPunch ? '' : normalizeWorkMode(editFormData.workMode),
      overtime: !isNoPunch && editFormData.totalHours > 8 ? `${(editFormData.totalHours - 8).toFixed(1)} hrs` : '0 hrs'
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
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setEditFormData(prev => ({ ...prev, punchIn: timeString }));
    addToast('info', `Punch In time set to ${timeString}`);
  };

  const handleEditAutoPunchOut = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    if (editFormData.punchIn) {
      const punchInTime = new Date(`2000/01/01 ${editFormData.punchIn}`);
      const punchOutTime = new Date(`2000/01/01 ${timeString}`);
      const diffHours = (punchOutTime - punchInTime) / (1000 * 60 * 60);
      const totalHours = Math.round(diffHours * 10) / 10;
      setEditFormData(prev => ({ ...prev, punchOut: timeString, totalHours: totalHours > 0 ? totalHours : 0 }));
    } else {
      setEditFormData(prev => ({ ...prev, punchOut: timeString }));
    }
    addToast('info', `Punch Out time set to ${timeString}`);
  };

  // Auto-set current time for punch in
  const handleAutoPunchIn = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMarkFormData(prev => ({ ...prev, punchIn: timeString }));
    addToast('info', `Punch In time set to ${timeString}`);
  };

  // Auto-set current time for punch out and calculate hours
  const handleAutoPunchOut = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Calculate hours if punch in exists
    if (markFormData.punchIn) {
      const punchInTime = new Date(`2000/01/01 ${markFormData.punchIn}`);
      const punchOutTime = new Date(`2000/01/01 ${timeString}`);
      const diffHours = (punchOutTime - punchInTime) / (1000 * 60 * 60);
      const totalHours = Math.round(diffHours * 10) / 10;
      setMarkFormData(prev => ({ ...prev, punchOut: timeString, totalHours: totalHours > 0 ? totalHours : 0 }));
    } else {
      setMarkFormData(prev => ({ ...prev, punchOut: timeString }));
    }
    addToast('info', `Punch Out time set to ${timeString}`);
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
    const record = {
      id: `ATT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      employeeId: markFormData.employeeId,
      employeeName: markFormData.employeeName,
      department: markFormData.department || empData?.department || 'Engineering',
      branch: markFormData.branch || empData?.branch || 'Jaipur',
      workMode: normalizeWorkMode(markFormData.workMode || empData?.workMode || 'WFO'),
      date: markFormData.date,
      punchIn: markFormData.punchIn,
      punchOut: markFormData.punchOut || '--:--',
      breakTime: `${totalBreakMinutes} mins`,
      breaks: globalBreaks,
      totalHours: parseFloat(markFormData.totalHours) || 0,
      status: markFormData.status,
      source: markFormData.source,
      overtime: markFormData.totalHours > 8 ? `${(markFormData.totalHours - 8).toFixed(1)} hrs` : '0 hrs'
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
      totalHours: 0,
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
        department: empData.department || 'Engineering',
        branch: empData.branch || 'Jaipur',
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

  const handleApproveAll = () => {
    addToast('success', 'All pending attendance entries approved successfully.');
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
    if (!dateFilter) return [];
    
    // 1. Filter attendance records by role
    const scopedAttendance = (attendance || []).filter(item => {
      if (!currentUserRole || currentUserRole === 'super_admin') return true;
      const emp = (employees || []).find(e => e.id === item.employeeId || e.name === item.employeeName);
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'dept_admin') {
        return item.department === currentUser?.department || emp?.department === currentUser?.department;
      }
      if (currentUserRole === 'employee') {
        return item.employeeId === currentUser?.id || emp?.id === currentUser?.id;
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
      const totalHours = item.totalHours || 0;
      return {
        ...item,
        status,
        employeeId: item.employeeId || empDetails?.id || 'EMP-2026-999',
        shift: item.shift || empDetails?.shift || 'Flexible (09:00 AM - 06:00 PM)',
        source: item.source || 'Biometric',
        breakTime: item.breakTime || '45 mins',
        workMode: item.workMode || empDetails?.workMode || 'WFO',
        overtime: item.overtime || (totalHours > 8 ? `${(totalHours - 8).toFixed(1)} hrs` : '0 hrs')
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
        department: emp.department || 'Engineering',
        branch: emp.branch || 'Jaipur',
        date: dateFilter,
        punchIn: '--:--',
        punchOut: '--:--',
        totalHours: 0,
        status: 'Absent',
        source: 'System',
        breakTime: '45 mins',
        workMode: emp.workMode || 'WFO',
        shift: emp.shift || 'Flexible (09:00 AM - 06:00 PM)',
        overtime: '0 hrs',
        isVirtual: true
      });
    });
    
    return records;
  }, [attendance, employees, scopedEmployees, currentUserRole, currentUser, dateFilter]);

  // Filtered attendance for KPIs (ignores statusFilter and workModeFilter so counts don't zero out on card selection)
  const kpiFilteredAttendance = useMemo(() => {
    return ledgerData.filter(a => {
      const matchesSearch = searchQuery
        ? a.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDate = dateFilter ? a.date === dateFilter : true;
      const matchesDept = deptFilter ? a.department === deptFilter : true;
      const matchesBranch = branchFilter ? a.branch === branchFilter : true;
      const matchesShift = shiftFilter ? a.shift?.toLowerCase().includes(shiftFilter.toLowerCase()) : true;
      const matchesSource = sourceFilter ? a.source?.toLowerCase() === sourceFilter.toLowerCase() : true;

      return matchesSearch && matchesDate && matchesDept && matchesBranch && matchesShift && matchesSource;
    });
  }, [ledgerData, searchQuery, dateFilter, deptFilter, branchFilter, shiftFilter, sourceFilter]);

  // Get work mode counts (responds to filters and updates in real-time)
  const workModeStats = useMemo(() => {
    const filteredEmployees = (scopedEmployees || []).filter(e => {
      if (!e) return false;
      const matchesSearch = searchQuery
        ? e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.id?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDept = deptFilter ? e.department === deptFilter : true;
      const matchesBranch = branchFilter ? e.branch === branchFilter : true;
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

  // Filter Predicates
  const filteredAttendance = useMemo(() => {
    return ledgerData.filter(a => {
      const matchesSearch = searchQuery
        ? a.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDate = dateFilter ? a.date === dateFilter : true;
      const matchesDept = deptFilter ? a.department === deptFilter : true;
      const matchesBranch = branchFilter ? a.branch === branchFilter : true;
      const matchesShift = shiftFilter ? a.shift?.toLowerCase().includes(shiftFilter.toLowerCase()) : true;
      const matchesStatus = statusFilter 
        ? (statusFilter.toLowerCase() === 'on leave'
            ? (a.status?.toLowerCase() === 'on leave' || a.status?.toLowerCase() === 'leave' || a.status?.toLowerCase().includes('leave'))
            : a.status?.toLowerCase() === statusFilter.toLowerCase()
          )
        : true;
      const matchesSource = sourceFilter ? a.source?.toLowerCase() === sourceFilter.toLowerCase() : true;
      const matchesWorkMode = workModeFilter
        ? normalizeWorkMode(a.workMode) === normalizeWorkMode(workModeFilter)
        : true;

      return matchesSearch && matchesDate && matchesDept && matchesBranch && matchesShift && matchesStatus && matchesSource && matchesWorkMode;
    });
  }, [ledgerData, searchQuery, dateFilter, deptFilter, branchFilter, shiftFilter, statusFilter, sourceFilter, workModeFilter]);


  // Calculations for Summary Statistics based on active filters
  const filteredEmployeesCount = useMemo(() => {
    return scopedEmployees.filter(e => {
      const matchesSearch = searchQuery
        ? e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.id?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesDept = deptFilter ? e.department === deptFilter : true;
      const matchesBranch = branchFilter ? e.branch === branchFilter : true;
      const matchesShift = shiftFilter ? e.shift?.toLowerCase().includes(shiftFilter.toLowerCase()) : true;
      return matchesSearch && matchesDept && matchesBranch && matchesShift;
    }).length;
  }, [scopedEmployees, searchQuery, deptFilter, branchFilter, shiftFilter]);

  const totalEmployees = filteredEmployeesCount;
  const totalPresent = useMemo(() => kpiFilteredAttendance.filter(a => ['Present', 'Overtime'].includes(a.status)).length, [kpiFilteredAttendance]);
  const totalLate = useMemo(() => kpiFilteredAttendance.filter(a => a.status === 'Late').length, [kpiFilteredAttendance]);
  const totalAbsent = useMemo(() => kpiFilteredAttendance.filter(a => a.status === 'Absent').length, [kpiFilteredAttendance]);
  const totalLeave = useMemo(() => kpiFilteredAttendance.filter(a => ['On Leave', 'Leave'].includes(a.status) || (a.status && a.status.includes('Leave'))).length, [kpiFilteredAttendance]);
  const totalWFH = useMemo(() => kpiFilteredAttendance.filter(a => ['Work From Home', 'WFH'].includes(a.status)).length, [kpiFilteredAttendance]);
  const totalHalfDay = useMemo(() => kpiFilteredAttendance.filter(a => ['Half Day', 'Half-Day'].includes(a.status)).length, [kpiFilteredAttendance]);
  
  const attendanceRate = useMemo(() => {
    const rawRate = totalEmployees > 0 ? Math.round(((totalPresent + totalHalfDay + totalWFH) / Math.max(totalEmployees, 1)) * 100) : 94;
    return Math.min(rawRate, 100);
  }, [totalEmployees, totalPresent, totalHalfDay, totalWFH]);

  // Get counts by status for clickable cards
  const statusCounts = useMemo(() => {
    return {
      present: totalPresent,
      absent: totalAbsent,
      late: totalLate,
      leave: totalLeave,
      wfh: totalWFH,
      halfDay: totalHalfDay
    };
  }, [totalPresent, totalAbsent, totalLate, totalLeave, totalWFH, totalHalfDay]);

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
            onClick={() => navigate(`/employees/${row.employeeId}?tab=attendance_punch`)}
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
            onClick={() => navigate(`/employees/${row.employeeId}?tab=attendance_punch`)}
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
        render: (row) => <span>{totalBreakMinutes} mins</span>
      },
      {
        key: 'totalHours',
        header: FIELD_LABELS.workingHours,
        sortable: true,
        render: (row) => <span>{row.totalHours > 0 ? `${row.totalHours} hrs` : '--'}</span>
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
    if (currentUserRole === 'employee') {
      return cols.filter(c => c.key !== 'actions');
    }
    return cols;
  }, [currentUserRole, employees, navigate]);

  // Branch data for Branch Management
  const branchData = useMemo(() => {
    const dbBranches = branches && branches.length > 0 
      ? branches.map(b => b?.name).filter(Boolean) 
      : Array.from(new Set((scopedEmployees || []).map(e => e?.branch).filter(Boolean)));
    
    const finalBranches = dbBranches.length > 0 ? dbBranches : ['Jaipur Branch'];

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

      return {
        name: branchName,
        total: branchEmployees.length,
        active: activeToday,
        office: officeCount,
        wfh: wfhCount,
        hybrid: hybridCount,
        rate: branchEmployees.length > 0 ? Math.round((activeToday / branchEmployees.length) * 100) : 0
      };
    });
  }, [branches, scopedEmployees, kpiFilteredAttendance]);

  // Live punch feed data with real employees
  const livePunchFeed = useMemo(() => {
    const recentAttendances = [...attendance].reverse().slice(0, 10);
    return recentAttendances.map(att => ({
      name: att.employeeName,
      action: att.punchIn && !att.punchOut ? 'Punched In' : (att.punchOut ? 'Punched Out' : 'No Punch'),
      time: att.punchIn || '--:--',
      source: att.source || 'Biometric',
      type: att.punchIn && !att.punchOut ? 'in' : (att.punchOut ? 'out' : 'absent'),
      dept: att.department
    }));
  }, [attendance]);

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
          <Button variant="secondary" onClick={async () => {
            addToast('info', 'Refreshing live data...');
            await Promise.all([fetchAttendance(), fetchEmployees()]);
            addToast('success', 'Data refreshed successfully.');
          }} icon={RefreshCw} size="sm">
            Refresh
          </Button>
          {currentUserRole !== 'employee' && (
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
          <Button variant="primary" onClick={() => setMarkModalOpen(true)} icon={Plus}>
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* ═══ Work Mode Cards (Total/WFH/WFO/Hybrid) - CLICKABLE ═══ */}
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

      {/* ═══ Top Summary KPI Cards - CLICKABLE ═══ */}
      <div className="att-kpi-strip">
        <div className="att-kpi-card att-kpi-blue" onClick={() => navigateToRecordsWithFilter('status', '')} style={{ cursor: 'pointer' }}>
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
            <span>After 09:15 AM</span>
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
            <TrendingUp size={11} />
            <span>+2.1% vs last week</span>
          </div>
        </div>
      </div>

      {/* ═══ Section Navigation Tabs ═══ */}
      <div className="att-section-tabs">
        {[
          { id: 'overview', label: 'Overview & Analytics', icon: BarChart2 },
          { id: 'records', label: 'Attendance Records', icon: FileText },
          { id: 'monitor', label: 'Live Punch Monitor', icon: Activity },
          { id: 'branches', label: 'Branch Management', icon: Building },
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
                      strokeDasharray={`${(statusCounts.present / Math.max(filteredAttendance.length, 1)) * 314} 314`}
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
              {livePunchFeed.length > 0 ? livePunchFeed.map((ev, i) => (
                <div key={i} className="att-feed-item">
                  <div className={`att-feed-dot att-feed-${ev.type}`} />
                  <Avatar name={ev.name} size="xs" />
                  <div className="att-feed-info">
                    <strong>{ev.name}</strong>
                    <span className="att-feed-action">{ev.action}</span>
                    <span className="att-feed-meta">{ev.time} · {ev.source} · {ev.dept}</span>
                  </div>
                  <div className={`att-feed-type-tag att-type-${ev.type}`}>
                    {ev.type === 'in' ? '↑ In' : ev.type === 'out' ? '↓ Out' : ev.type === 'late' ? '⚠ Late' : '❌'}
                  </div>
                </div>
              )) : (
                <div className="att-empty-feed">No recent punch activity</div>
              )}
            </div>
            <div className="att-punch-footer">
              <div className="att-punch-stat-row">
                <div className="att-punch-mini-stat">
                  <span>Today Punched In</span>
                  <strong style={{ color: '#4ade80' }}>{statusCounts.present}</strong>
                </div>
                <div className="att-punch-mini-stat">
                  <span>Punched Out</span>
                  <strong style={{ color: '#60a5fa' }}>{Math.floor(statusCounts.present * 0.6)}</strong>
                </div>
                <div className="att-punch-mini-stat">
                  <span>Still Working</span>
                  <strong style={{ color: '#fbbf24' }}>{statusCounts.present - Math.floor(statusCounts.present * 0.6)}</strong>
                </div>
              </div>
            </div>
          </div>

          {currentUserRole !== 'employee' && (
            <div className="card att-automation-rules-card" style={{ gridColumn: 'span 2' }}>
              <div className="att-card-header">
                <div className="att-card-title">
                  <Cpu size={16} style={{ color: 'var(--color-primary)' }} />
                  <span>Attendance Automation & Alert Rules</span>
                </div>
                <Button variant="secondary" size="sm" onClick={handleScheduleReport}>
                  Schedule Reports
                </Button>
              </div>
              <div className="att-rules-list">
                {automationRules.map(rule => {
                  const RuleIcon = rule.icon || Cpu;
                  return (
                    <div key={rule.id} className="att-rule-row">
                      <div className={`att-rule-icon-wrap ${rule.active ? 'att-rule-icon-on' : 'att-rule-icon-off'}`}>
                        <RuleIcon size={16} />
                      </div>
                      <div className="att-rule-info">
                        <strong>{rule.name}</strong>
                        <span>{rule.desc}</span>
                      </div>
                      <button
                        className={`att-rule-toggle ${rule.active ? 'att-rule-on' : 'att-rule-off'}`}
                        onClick={() => toggleAutomationRule(rule.id)}
                      >
                        {rule.active ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                {(branches && branches.length > 0 ? branches.map(b => b.name) : Array.from(new Set(employees.map(e => e.branch).filter(Boolean)))).map(branchName => (
                  <option key={branchName} value={branchName}>{branchName}</option>
                ))}
              </select>
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
              {livePunchFeed.length > 0 ? livePunchFeed.map((ev, i) => (
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
              )) : (
                <div className="att-empty-feed-full">No recent punch activity. Mark attendance to see live feed.</div>
              )}
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
                {filteredAttendance.filter(a => a.punchIn && !a.punchOut).slice(0, 5).map((emp, i) => (
                  <div key={i} className="att-pout-row">
                    <Avatar name={emp.employeeName} size="xs" />
                    <div className="att-pout-info">
                      <strong>{emp.employeeName}</strong>
                      <span>{emp.department}</span>
                    </div>
                    <div className="att-pout-times">
                      <span>In: {emp.punchIn}</span>
                      <span>Expected: {emp.shift?.split('-')[1] || '06:00 PM'}</span>
                    </div>
                    <span className="att-pout-status att-warn">Still Working</span>
                  </div>
                ))}
                {filteredAttendance.filter(a => a.punchIn && !a.punchOut).length === 0 && (
                  <div className="att-empty-out">No active punches</div>
                )}
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
                  { label: 'Biometric', count: filteredAttendance.filter(a => a.source === 'Biometric').length, pct: 57, icon: '⚙️', color: '#4ade80' },
                  { label: 'GPS (Mobile)', count: filteredAttendance.filter(a => a.source === 'GPS').length, pct: 23, icon: '📍', color: '#60a5fa' },
                  { label: 'RFID', count: filteredAttendance.filter(a => a.source === 'RFID').length, pct: 12, icon: '💳', color: '#fbbf24' },
                  { label: 'Web Portal', count: filteredAttendance.filter(a => a.source === 'Web Portal').length, pct: 8, icon: '💻', color: '#a78bfa' },
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
                      {(branch?.name || '').toLowerCase().includes('jaipur') ? 'Malviya Nagar' : 
                       (branch?.name || '').toLowerCase().includes('delhi') ? 'Connaught Place' : 
                       (branch?.name || '').toLowerCase().includes('mumbai') ? 'BKC' : 'MG Road'}
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
                        <input type="text" placeholder="e.g. 09:00 AM" value={editFormData.punchIn}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, punchIn: e.target.value }))}
                          disabled={isNoPunch}
                          style={{ flex: 1, height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
                        <Button type="button" variant="secondary" onClick={handleEditAutoPunchIn} style={{ padding: '0 10px', minWidth: 'auto' }} title="Set Current Time" disabled={isNoPunch}>⏱️</Button>
                      </div>
                    </div>
                    <div>
                      <label>Punch Out Time</label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input type="text" placeholder="e.g. 06:00 PM" value={editFormData.punchOut}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, punchOut: e.target.value }))}
                          disabled={isNoPunch}
                          style={{ flex: 1, height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
                        <Button type="button" variant="secondary" onClick={handleEditAutoPunchOut} style={{ padding: '0 10px', minWidth: 'auto' }} title="Set Current Time" disabled={isNoPunch || !editFormData.punchIn}>⏱️</Button>
                      </div>
                    </div>
                  </div>

                  <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', opacity: isNoPunch ? 0.4 : 1, pointerEvents: isNoPunch ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                    <div>
                      <label>Total Hours</label>
                      <input type="number" step="0.1" placeholder="e.g. 8.5" value={editFormData.totalHours}
                        disabled={isNoPunch}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, totalHours: parseFloat(e.target.value) || 0 }))}
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
            <select
              value={markFormData.employeeId}
              onChange={(e) => {
                const found = employees.find(emp => emp.id === e.target.value);
                setMarkFormData(prev => ({
                  ...prev,
                  employeeId: e.target.value,
                  employeeName: found?.name || '',
                  department: found?.department || '',
                  branch: found?.branch || '',
                  workMode: found?.workMode || ''
                }));
              }}
              style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}
            >
              <option value="">Choose employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id}) — {emp.department}</option>
              ))}
            </select>
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
                      <input type="text" placeholder="e.g. 09:00 AM" value={markFormData.punchIn}
                        onChange={(e) => setMarkFormData(prev => ({ ...prev, punchIn: e.target.value }))}
                        disabled={isNoPunch}
                        style={{ flex: 1 }} />
                      <Button type="button" variant="secondary" onClick={handleAutoPunchIn} style={{ padding: '0 10px', minWidth: 'auto' }} title="Set Current Time" disabled={isNoPunch}>⏱️</Button>
                    </div>
                  </div>
                  <div>
                    <label>Punch Out Time</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="text" placeholder="e.g. 06:00 PM" value={markFormData.punchOut}
                        onChange={(e) => setMarkFormData(prev => ({ ...prev, punchOut: e.target.value }))}
                        disabled={isNoPunch}
                        style={{ flex: 1 }} />
                      <Button type="button" variant="secondary" onClick={handleAutoPunchOut} style={{ padding: '0 10px', minWidth: 'auto' }} title="Set Current Time" disabled={isNoPunch || !markFormData.punchIn}>⏱️</Button>
                    </div>
                  </div>
                </div>

                <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', opacity: isNoPunch ? 0.4 : 1, pointerEvents: isNoPunch ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                  <div>
                    <label>Total Hours</label>
                    <input type="number" step="0.1" placeholder="e.g. 8.5" value={markFormData.totalHours}
                      disabled={isNoPunch}
                      onChange={(e) => setMarkFormData(prev => ({ ...prev, totalHours: parseFloat(e.target.value) || 0 }))} />
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

      {/* Mark Attendance Modal */}
      <Modal isOpen={markModalOpen} onClose={() => setMarkModalOpen(false)} title="Mark Attendance Log" size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setMarkModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleMarkSubmit}>Mark Attendance</Button>
          </div>
        }
      >
        <div className="create-task-form-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <div className="form-field">
            <label>Select Employee</label>
            {currentUserRole === 'employee' ? (
              <input type="text" value={currentUser?.name || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }} />
            ) : (
              <select value={markFormData.employeeId}
                onChange={(e) => {
                  const emp = employees.find(empData => empData.id === e.target.value);
                  setMarkFormData(prev => ({
                    ...prev,
                    employeeId: e.target.value,
                    employeeName: emp ? emp.name : '',
                    department: emp ? emp.department : '',
                    branch: emp ? emp.branch : '',
                    workMode: emp ? emp.workMode : 'Work From Office'
                  }));
                }}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                <option value="">Choose employee...</option>
                {scopedEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div>
              <label>Punch In Time</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="e.g. 09:00 AM" value={markFormData.punchIn}
                  onChange={(e) => setMarkFormData(prev => ({ ...prev, punchIn: e.target.value }))}
                  style={{ flex: 1 }} />
                <Button variant="secondary" size="sm" onClick={handleAutoPunchIn}>Now</Button>
              </div>
            </div>
            <div>
              <label>Punch Out Time</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="e.g. 06:00 PM" value={markFormData.punchOut}
                  onChange={(e) => setMarkFormData(prev => ({ ...prev, punchOut: e.target.value }))}
                  style={{ flex: 1 }} />
                <Button variant="secondary" size="sm" onClick={handleAutoPunchOut}>Now</Button>
              </div>
            </div>
          </div>

          <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div>
              <label>Work Mode</label>
              <select value={markFormData.workMode}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, workMode: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}>
                <option value="Work From Office">Work From Office</option>
                <option value="Work From Home">Work From Home</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label>Break Time</label>
              <input type="text" placeholder="e.g. 45 mins" value={markFormData.breakTime}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, breakTime: e.target.value }))} />
            </div>
          </div>

          <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
            <div>
              <label>Status</label>
              <select value={markFormData.status}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, status: e.target.value }))}
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
              <input type="date" value={markFormData.date}
                onChange={(e) => setMarkFormData(prev => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>
      </Modal>
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
      </div>

    </div>
  );
};

export default Attendance;