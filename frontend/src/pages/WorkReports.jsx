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
// Real-time calculations will be performed dynamically from context data inside the component

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
  const {
    addToast,
    currentUser,
    currentUserRole,
    employees,
    dailyReports: rawReports,
    setDailyReports: setReports,
    addDailyReport,
    projectsList,
    updateDailyReportStatus,
    activityLogs,
    notifications: globalNotifications,
    setNotifications: setGlobalNotifications,
    addActivityLog,
    markAllNotificationsRead,
    departments: rawDepartments,
    hasPermission,
    addNotification
  } = useApp();
  const departments = useMemo(() => (rawDepartments || []).filter(d => d.status === 'Active'), [rawDepartments]);
  const loading = usePageLoading(800);

  const userRole = useMemo(() => {
    if (currentUserRole === 'super_admin') return 'Super Admin';
    if (currentUserRole === 'company_admin') return 'Company Admin';
    if (currentUserRole === 'branch_admin' || currentUserRole === 'dept_admin' || currentUserRole === 'hr') return 'HR/Admin';
    if (currentUserRole === 'project_manager' || currentUserRole === 'manager') return 'Project Manager';
    if (currentUserRole === 'team_leader') return 'Team Leader';
    return 'Employee';
  }, [currentUserRole]);

  const [perspective, setPerspective] = useState(() => {
    if (currentUserRole === 'employee') return 'self';
    const hasCompanyRead = hasPermission('work_reports', 'read', 'company');
    const hasSelfRead = hasPermission('work_reports', 'read', 'self');

    const saved = localStorage.getItem('perspective_work_reports');
    if (saved === 'self' && hasSelfRead) return 'self';
    if (saved === 'company' && hasCompanyRead) return 'company';

    return hasCompanyRead ? 'company' : 'self';
  });

  const showPerspectiveDropdown = useMemo(() => {
    if (currentUserRole === 'employee') return false;
    const hasCompanyRead = hasPermission('work_reports', 'read', 'company');
    const hasSelfRead = hasPermission('work_reports', 'read', 'self');
    return hasCompanyRead && hasSelfRead;
  }, [currentUserRole, hasPermission]);

  React.useEffect(() => {
    if (currentUserRole !== 'employee') {
      localStorage.setItem('perspective_work_reports', perspective);
    }
  }, [perspective, currentUserRole]);

  React.useEffect(() => {
    if (currentUserRole === 'employee') {
      setPerspective('self');
    } else {
      const hasCompanyRead = hasPermission('work_reports', 'read', 'company');
      const hasSelfRead = hasPermission('work_reports', 'read', 'self');
      const saved = localStorage.getItem('perspective_work_reports');
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

  const isEmployee = isEmployeeView;

  const scopedEmployees = useMemo(() => {
    const activeRole = isEmployee ? 'employee' : currentUserRole;
    if (!activeRole || activeRole === 'super_admin' || activeRole === 'company_admin') {
      return employees;
    }
    return employees.filter(emp => {
      if (activeRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (activeRole === 'dept_admin' || activeRole === 'team_leader') {
        return emp?.department === currentUser?.department;
      }
      if (activeRole === 'employee') {
        return emp?.id === currentUser?.id;
      }
      return true;
    });
  }, [employees, currentUser, currentUserRole, isEmployee]);

  const getAssignedTasksCountForProject = (projectName) => {
    if (!projectName) return 0;
    const normalizeName = (name) => {
      if (!name) return '';
      return name.trim().replace(/\s+/g, ' ').toLowerCase();
    };
    const normCurrentUserName = normalizeName(currentUser?.name);
    
    const proj = (projectsList || []).find(p => p.name === projectName);
    if (!proj || !proj.tasks) return 0;
    
    let count = 0;
    proj.tasks.forEach(t => {
      const isCurrentUserAssigned = (t.assignedTo && t.assignedTo.map(normalizeName).includes(normCurrentUserName)) ||
                                     (t.assigneeName && normalizeName(t.assigneeName).includes(normCurrentUserName)) ||
                                     (t.assigneeId && currentUser && t.assigneeId === currentUser.id);
      if (isCurrentUserAssigned) {
        count++;
      }
    });
    return count;
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    project: '',
    tasksAssigned: 0,
    tasksCompleted: 0,
    summary: '',
    majorAccomplishments: ''
  });

  const handleProjectChange = (projectName) => {
    const assignedTasks = getAssignedTasksCountForProject(projectName);
    setFormData(prev => ({
      ...prev,
      project: projectName,
      tasksAssigned: assignedTasks,
      tasksCompleted: 0
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project.trim()) {
      addToast('warning', 'Please specify the project name.');
      return;
    }
    if (!formData.summary.trim()) {
      addToast('warning', 'Please provide a daily work summary.');
      return;
    }
    if (!formData.majorAccomplishments.trim()) {
      addToast('warning', 'Please list your major accomplishments.');
      return;
    }

    const payload = {
      ...formData,
      employeeId: currentUser?.employeeId || currentUser?.id || 'GATECO-EMP-001',
      employeeName: currentUser?.name || 'Employee',
      department: currentUser?.department || 'IT',
      team: currentUser?.teamName || 'Operations',
      submittedTime: new Date().toISOString(),
      status: 'Submitted',
      productivityScore: Math.min(100, Math.round((formData.tasksCompleted / Math.max(1, formData.tasksAssigned)) * 100)),
      approvalHistory: [
        {
          role: 'Employee',
          user: currentUser?.name || 'Employee',
          action: 'Submitted',
          timestamp: new Date().toISOString(),
          comments: 'Daily report submitted.'
        }
      ]
    };

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await addDailyReport(payload);
      if (result) {
        addToast('success', 'Daily work report submitted successfully!');
        setFormData(prev => ({
          ...prev,
          summary: '',
          majorAccomplishments: ''
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Page Tabs Controller */
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, directory, submit, calendar, analytics, leaderboards, logs

  const [timeFilter, setTimeFilter] = useState('AllTime'); // 'AllTime' | 'Today' | 'Weekly' | 'Monthly' | 'Yearly'

  const reports = useMemo(() => {
    let filtered = rawReports;
    const activeRole = isEmployee ? 'employee' : currentUserRole;

    if (activeRole && activeRole !== 'super_admin') {
      filtered = rawReports.filter(r => {
        const emp = employees.find(e => e.id === r.employeeId || e.name === r.employeeName);
        if (activeRole === 'branch_admin') {
          return emp?.branch === currentUser?.branch;
        }
        if (activeRole === 'dept_admin' || activeRole === 'team_leader') {
          return r.department === currentUser?.department || emp?.department === currentUser?.department;
        }
        if (activeRole === 'employee') {
          return r.employeeId === currentUser?.id || emp?.id === currentUser?.id;
        }
        return true;
      });
    }

    if (timeFilter === 'AllTime') return filtered;

    const parseDate = (dStr) => {
      if (!dStr) return new Date();
      const [y, m, d] = dStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    const refDate = parseDate(new Date().toISOString().slice(0, 10));

    return filtered.filter(r => {
      if (!r.date) return false;
      const rDate = parseDate(r.date);
      const diffTime = refDate.getTime() - rDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (timeFilter === 'Today') {
        return r.date === new Date().toISOString().slice(0, 10);
      }
      if (timeFilter === 'Weekly') {
        return diffDays >= 0 && diffDays < 7;
      }
      if (timeFilter === 'Monthly') {
        return diffDays >= 0 && diffDays < 30;
      }
      if (timeFilter === 'Yearly') {
        return diffDays >= 0 && diffDays < 365;
      }
      return true;
    });
  }, [rawReports, employees, currentUser, currentUserRole, isEmployee, timeFilter]);

  const isWithinTimeRange = (ts, filterValue) => {
    if (!ts || filterValue === 'AllTime') return true;
    const lower = ts.toLowerCase();
    
    if (lower.includes('-')) {
      const datePart = lower.split(' ')[0] || lower.split('T')[0];
      const [y, m, d] = datePart.split('-').map(Number);
      const logDate = new Date(y, m - 1, d);
      const refDate = new Date();
      refDate.setHours(0, 0, 0, 0);
      logDate.setHours(0, 0, 0, 0);
      const diffTime = refDate.getTime() - logDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (filterValue === 'Today') return datePart === refDate.toISOString().slice(0, 10);
      if (filterValue === 'Weekly') return diffDays >= 0 && diffDays < 7;
      if (filterValue === 'Monthly') return diffDays >= 0 && diffDays < 30;
      if (filterValue === 'Yearly') return diffDays >= 0 && diffDays < 365;
      return true;
    }
    
    if (filterValue === 'Today') {
      return lower.includes('minute') || lower.includes('hour') || lower.includes('now') || lower.includes('second');
    }
    if (filterValue === 'Weekly') {
      if (lower.includes('day')) {
        const num = parseInt(lower.match(/\d+/)?.[0] || '1', 10);
        return num < 7;
      }
      return lower.includes('minute') || lower.includes('hour') || lower.includes('now') || lower.includes('second');
    }
    if (filterValue === 'Monthly') {
      if (lower.includes('day')) {
        const num = parseInt(lower.match(/\d+/)?.[0] || '1', 10);
        return num < 30;
      }
      if (lower.includes('week')) {
        const num = parseInt(lower.match(/\d+/)?.[0] || '1', 10);
        return num < 4;
      }
      return !lower.includes('month') && !lower.includes('year');
    }
    if (filterValue === 'Yearly') {
      return !lower.includes('year');
    }
    return true;
  };

  const auditLogs = useMemo(() => {
    if (!activityLogs) return [];
    return activityLogs
      .filter(log => log.module === 'Work Reports' || (log.action && log.action.toLowerCase().includes('report')) || (log.details && log.details.toLowerCase().includes('report')))
      .filter(log => isWithinTimeRange(log.timestamp, timeFilter))
      .map(log => ({
        id: log.id,
        timestamp: log.timestamp || 'Just now',
        user: log.employeeName || log.user || 'System User',
        role: log.role || (employees.find(e => e.name === (log.employeeName || log.user))?.designation || 'Staff'),
        action: log.action || 'Activity',
        target: log.target || 'Work Reports',
        details: log.details || `${log.action} in ${log.module}`
      }));
  }, [activityLogs, employees, timeFilter]);

  const notifications = useMemo(() => {
    if (!globalNotifications) return [];
    return globalNotifications
      .filter(n => n.message && (n.message.toLowerCase().includes('report') || n.message.toLowerCase().includes('dwr')))
      .filter(n => isWithinTimeRange(n.timestamp, timeFilter));
  }, [globalNotifications, timeFilter]);

  // Derived Analytics Computations (Real-time and database backed)
  const deptChartData = useMemo(() => {
    const deptMap = {};
    reports.forEach(r => {
      const dept = r.department || 'Operations';
      const score = r.productivityScore ?? 80;
      const assigned = r.tasksAssigned || 0;
      const completed = r.tasksCompleted || 0;
      
      if (!deptMap[dept]) {
        deptMap[dept] = { name: dept, totalScore: 0, totalReports: 0, totalAssigned: 0, totalCompleted: 0 };
      }
      deptMap[dept].totalScore += score;
      deptMap[dept].totalReports += 1;
      deptMap[dept].totalAssigned += assigned;
      deptMap[dept].totalCompleted += completed;
    });
    
    return Object.values(deptMap).map(d => {
      const avgProd = d.totalReports > 0 ? Math.round(d.totalScore / d.totalReports) : 0;
      const compRate = d.totalAssigned > 0 ? Math.round((d.totalCompleted / d.totalAssigned) * 100) : 0;
      return {
        name: d.name,
        productivity: avgProd,
        completionRate: compRate
      };
    });
  }, [reports]);

  const weeklyTrend = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    
    return dates.map(dateStr => {
      const dayReports = reports.filter(r => r.date === dateStr);
      const submissions = dayReports.length;
      
      let totalAssigned = 0;
      let totalCompleted = 0;
      dayReports.forEach(r => {
        totalAssigned += r.tasksAssigned || 0;
        totalCompleted += r.tasksCompleted || 0;
      });
      const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
      
      const dateObj = new Date(dateStr);
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      
      return {
        name: formattedDate,
        submissions,
        completion: completionRate
      };
    });
  }, [reports]);

  const capacityData = useMemo(() => {
    if (reports.length === 0) {
      return [
        { name: 'Optimal', value: 0, fill: 'var(--color-success)' },
        { name: 'Under-utilized', value: 0, fill: 'var(--color-warning)' },
        { name: 'Overloaded', value: 0, fill: 'var(--color-danger)' }
      ];
    }
    
    let optimalCount = 0;
    let underCount = 0;
    let overCount = 0;
    
    reports.forEach(r => {
      const hrs = r.workingHours;
      if (hrs > 8.5) overCount++;
      else if (hrs >= 7.5) optimalCount++;
      else underCount++;
    });
    
    const total = reports.length;
    return [
      { name: 'Optimal', value: Math.round((optimalCount / total) * 100), fill: 'var(--color-success)' },
      { name: 'Under-utilized', value: Math.round((underCount / total) * 100), fill: 'var(--color-warning)' },
      { name: 'Overloaded', value: Math.round((overCount / total) * 100), fill: 'var(--color-danger)' }
    ];
  }, [reports]);

  const projectHoursData = useMemo(() => {
    const projectsMap = {};
    reports.forEach(r => {
      const proj = r.project || 'General / Other';
      const workHrs = parseFloat(r.workingHours || 0);
      const otHrs = parseFloat(r.overtimeHours || 0);
      
      if (!projectsMap[proj]) {
        projectsMap[proj] = { project: proj, work: 0, ot: 0 };
      }
      projectsMap[proj].work += workHrs;
      projectsMap[proj].ot += otHrs;
    });
    
    return Object.values(projectsMap).map(p => ({
      project: p.project,
      work: parseFloat(p.work.toFixed(1)),
      ot: parseFloat(p.ot.toFixed(1))
    }));
  }, [reports]);

  const leaderboardData = useMemo(() => {
    const empStats = {};
    reports.forEach(r => {
      const name = r.employeeName;
      const score = r.productivityScore ?? 80;
      if (!empStats[name]) {
        empStats[name] = { name, totalScore: 0, count: 0 };
      }
      empStats[name].totalScore += score;
      empStats[name].count += 1;
    });
    
    const sortedPerformers = Object.values(empStats)
      .map(emp => ({
        name: emp.name,
        count: emp.count,
        score: Math.round(emp.totalScore / emp.count),
        status: '100% on time'
      }))
      .sort((a, b) => b.score - a.score);
      
    const badges = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
    return sortedPerformers.map((p, idx) => ({
      ...p,
      rank: badges[idx] || `${idx + 1}th`
    }));
  }, [reports]);

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

  /* Auto Calculations derived states */
  const stats = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter(r => r.status === 'Submitted' || r.status === 'Escalated').length;
    const approved = filtered.filter(r => r.status === 'Approved').length;
    const rejected = filtered.filter(r => r.status === 'Rejected' || r.status === 'Changes Requested').length;
    
    const activeReporting = new Set(filtered.map(r => r.employeeId)).size;
    const avgProductivity = total > 0 ? Math.round(filtered.reduce((s, r) => s + (r.productivityScore ?? 80), 0) / total) : 0;
    
    return { total, pending, approved, rejected, activeReporting, avgProductivity };
  }, [filtered]);

  const lateSubmissionsCount = useMemo(() => {
    return filtered.filter(r => {
      if (!r.submittedTime) return false;
      const timePart = r.submittedTime.split('T')[1];
      if (!timePart) return false;
      const [h, m] = timePart.split(':').map(Number);
      return h >= 18 && (h > 18 || m > 0);
    }).length;
  }, [filtered]);

  const defaultersList = useMemo(() => {
    const weekdays = [];
    let curr = dateFilter ? new Date(dateFilter) : new Date();
    
    // Safety check for invalid date
    if (isNaN(curr.getTime())) curr = new Date();

    while (weekdays.length < 5) {
      const day = curr.getDay();
      if (day !== 0 && day !== 6) {
        weekdays.push(curr.toISOString().slice(0, 10));
      }
      curr.setDate(curr.getDate() - 1);
    }

    const list = [];
    scopedEmployees.forEach(emp => {
      let missingCount = 0;
      weekdays.forEach(dateStr => {
        const hasReport = reports.some(r => r.date === dateStr && (r.employeeId === emp.id || r.employeeName === emp.name));
        if (!hasReport) {
          missingCount++;
        }
      });
      
      if (missingCount > 0) {
        // Find the latest reminder notification for this employee
        const empReminders = (globalNotifications || []).filter(n => 
          (n.recipientId === emp.id || n.targetUserId === emp.id || n.forUserId === emp.id) &&
          n.category === 'Reminder'
        );
        
        let lastReminderText = 'Never alerted';
        if (empReminders.length > 0) {
          const sorted = empReminders.sort((a, b) => new Date(b.createdAt || b.sentDate) - new Date(a.createdAt || a.sentDate));
          const latest = sorted[0];
          const dateObj = new Date(latest.createdAt || latest.sentDate);
          lastReminderText = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        list.push({
          empId: emp.id,
          name: emp.name,
          department: emp.department || 'IT',
          team: emp.teamName || 'Operations',
          missingCount,
          lastReminder: lastReminderText
        });
      }
    });

    return list.sort((a, b) => b.missingCount - a.missingCount);
  }, [scopedEmployees, reports, globalNotifications, dateFilter]);

  const missingReportsCount = useMemo(() => {
    const checkDate = dateFilter || new Date().toISOString().slice(0, 10);
    const day = new Date(checkDate).getDay();
    if (day === 0 || day === 6) return 0; // No compliance alerts on weekends

    let count = 0;
    scopedEmployees.forEach(emp => {
      const hasReport = reports.some(r => r.date === checkDate && (r.employeeId === emp.id || r.employeeName === emp.name));
      if (!hasReport) {
        count++;
      }
    });
    return count;
  }, [scopedEmployees, reports, dateFilter]);

  const heatmapDates = useMemo(() => {
    const dates = [];
    const baseDate = dateFilter ? new Date(dateFilter) : new Date();
    
    // Safety check for invalid date
    const finalBaseDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(finalBaseDate);
      d.setDate(finalBaseDate.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }, [dateFilter]);

  const heatmapData = useMemo(() => {
    return scopedEmployees.map(emp => {
      const hours = heatmapDates.map(dateStr => {
        const rep = reports.find(r => r.date === dateStr && (r.employeeId === emp.id || r.employeeName === emp.name));
        return rep ? parseFloat(rep.workingHours || 0) : 0.0;
      });
      return {
        name: emp.name,
        hours
      };
    });
  }, [scopedEmployees, heatmapDates, reports]);



  /* Selected Audit Detail Drawers & Modals */
  const [selectedReport, setSelectedReport] = useState(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState('');
  const [evaluationRating, setEvaluationRating] = useState('Excellent');



  /* Calendar Monthly navigation */
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()); // 0-indexed base
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  /* Export system mock animation states */
  const [exporting, setExporting] = useState(false);

  /* Add dynamic log helper */
  const addAuditLog = (action, target, details) => {
    if (addActivityLog) {
      addActivityLog(action, 'Work Reports', 'success', details, target);
    }
  };

  /* Add Notification helper */
  const pushNotification = (message) => {
    if (setGlobalNotifications) {
      setGlobalNotifications(prev => [
        {
          id: `NTF-${Math.floor(100 + Math.random() * 900)}`,
          type: 'info',
          message,
          timestamp: 'Just now',
          read: false
        },
        ...prev
      ]);
    }
  };



  /* Audit details action */
  const triggerAuditAction = async (actionType) => {
    if (!selectedReport) return;
    
    let updatedStatus = 'Submitted';

    if (actionType === 'Approve') {
      updatedStatus = 'Approved';
    } else if (actionType === 'Reject') {
      updatedStatus = 'Rejected';
    } else if (actionType === 'Changes') {
      updatedStatus = 'Changes Requested';
    } else if (actionType === 'Escalate') {
      updatedStatus = 'Escalated';
    }

    const updatedReport = await updateDailyReportStatus(selectedReport.id, updatedStatus, evaluationFeedback);
    if (updatedReport) {
      addAuditLog(actionType === 'Approve' ? 'Approval' : 'Rejection', selectedReport.id, `Report status updated to ${updatedStatus} by ${userRole}`);
      pushNotification(`Report ${selectedReport.id} was ${updatedStatus.toLowerCase()} by manager.`);

      // Reset drawer state
      setSelectedReport(null);
      setEvaluationFeedback('');
    }
  };

  /* Bulk state actions */
  const handleBulkStatusChange = async (status) => {
    if (selectedIds.length === 0) {
      addToast('warning', 'Please select at least one report.');
      return;
    }

    try {
      await Promise.all(selectedIds.map(id => updateDailyReportStatus(id, status, `Bulk ${status.toLowerCase()} action applied by ${userRole}.`)));
      addAuditLog('Bulk Update', selectedIds.join(','), `Bulk updated ${selectedIds.length} reports to ${status}`);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to perform bulk update:', err);
    }
  };

  /* Defaulter warning dispatcher */
  const handleSendReminder = async (name, empId) => {
    try {
      if (addNotification) {
        await addNotification({
          title: 'Missing Work Report Alert',
          message: `Dear ${name}, you have missing work reports. Please submit them as soon as possible.`,
          type: 'system',
          category: 'Reminder',
          priority: 'High',
          recipientId: empId,
          targetUserId: empId,
          forUserId: empId,
          sentBy: currentUser?.name || 'Manager',
          sentDate: new Date().toISOString().split('T')[0]
        });
      }
      pushNotification(`Defaulter reminder alert sent to ${name} (${empId}).`);
      addAuditLog('Reminder', empId, `Sent report reminder alert to ${name}`);
    } catch (err) {
      console.error('Failed to send reminder alert:', err);
      addToast('danger', `Failed to alert ${name}.`);
    }
  };

  /* Export system trigger */
  const handleExportSystem = (format) => {
    if (filtered.length === 0) {
      addToast('warning', 'No reports available to export.');
      return;
    }
    setExporting(true);
    setTimeout(() => {
      try {
        const headers = [
          'Report ID',
          'Employee ID',
          'Employee Name',
          'Department',
          'Team',
          'Project',
          'Date',
          'Tasks Assigned',
          'Tasks Completed',
          'Working Hours',
          'Login Time',
          'Logout Time',
          'Productivity Score (%)',
          'Status',
          'Summary',
          'Remarks/Feedback'
        ];

        const rows = filtered.map(r => [
          r.id || '',
          r.employeeId || '',
          r.employeeName || '',
          r.department || '',
          r.team || '',
          r.project || '',
          r.date || '',
          r.tasksAssigned !== undefined ? r.tasksAssigned : '',
          r.tasksCompleted !== undefined ? r.tasksCompleted : '',
          r.workingHours !== undefined ? r.workingHours : '',
          r.loginTime || '',
          r.logoutTime || '',
          r.productivityScore !== undefined ? r.productivityScore : '',
          r.status || '',
          (r.summary || '').replace(/"/g, '""'),
          (r.feedback || r.remarks || '').replace(/"/g, '""')
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(val => `"${val}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `work_reports_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setExporting(false);
        const msg = isEmployee
          ? `My Work Reports exported successfully in ${format} format.`
          : `Daily Work Reports exported successfully in ${format} format.`;
        addToast('success', msg);
      } catch (err) {
        console.error('Failed to export reports:', err);
        setExporting(false);
        addToast('error', 'Failed to export reports. Please try again.');
      }
    }, 1000);
  };



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
      setSearch(isEmployee ? '' : (currentUser?.name || '')); // employee view
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
      {isEmployee ? (
        <>
          {/* ── EMPLOYEE HEADER ── */}
          <div className="reports-header flex-row justify-between flex-wrap gap-4">
            <div className="reports-title-section">
              <h1>My Daily Work Reports</h1>
              <p className="subtitle">Submit your daily work reports and track your submission history.</p>
            </div>
            <div className="flex-center gap-3">
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
              <Button variant="ghost" size="sm" icon={Download} onClick={() => handleExportSystem('CSV')}>
                {exporting ? 'Exporting...' : 'Export My Reports'}
              </Button>
            </div>
          </div>

          <div className="employee-layout-grid">
            {/* LEFT COLUMN: Submit Form */}
            <div className="card padding-5 employee-submit-card animate-slide-up">
              <div className="flex-row align-center gap-2" style={{ marginBottom: 16 }}>
                <Plus size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Submit Daily Report</h2>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-column gap-4">
                {/* Row 1: Date & Project */}
                <div className="form-row-2">
                  <div className="form-group-item">
                    <label className="reports-form-lbl">Report Date *</label>
                    <input
                      type="date"
                      className="reports-form-input"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group-item">
                    <label className="reports-form-lbl">Project Name / Client *</label>
                    <select
                      className="reports-form-input"
                      value={formData.project}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      required
                    >
                      <option value="">— Select Project —</option>
                      {(projectsList || []).map(p => (
                        <option key={p.id || p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Timings & Hours */}

                {/* Row 3: Tasks Counts */}
                <div className="form-row-2">
                  <div className="form-group-item">
                    <label className="reports-form-lbl">Tasks Assigned *</label>
                    <input
                      type="number"
                      min="0"
                      className="reports-form-input"
                      value={formData.tasksAssigned}
                      readOnly
                      required
                    />
                  </div>
                  <div className="form-group-item">
                    <label className="reports-form-lbl">Tasks Completed *</label>
                    <input
                      type="number"
                      min="0"
                      className="reports-form-input"
                      value={formData.tasksCompleted}
                      onChange={(e) => setFormData(prev => ({ ...prev, tasksCompleted: parseInt(e.target.value, 10) || 0 }))}
                      required
                    />
                  </div>
                </div>

                {/* Row 4: Summary & Accomplishments */}
                <div className="form-group-item">
                  <label className="reports-form-lbl">Daily Work Summary *</label>
                  <textarea
                    className="reports-form-textarea"
                    rows={3}
                    placeholder="Describe the specific tasks you worked on today..."
                    value={formData.summary}
                    onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="reports-form-lbl">Major Accomplishments *</label>
                  <textarea
                    className="reports-form-textarea"
                    rows={2}
                    placeholder="Key accomplishments or milestones reached..."
                    value={formData.majorAccomplishments}
                    onChange={(e) => setFormData(prev => ({ ...prev, majorAccomplishments: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <Button type="submit" variant="primary" icon={Send} fullWidth disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Daily Work Report'}
                  </Button>
                </div>
              </form>
            </div>

            {/* RIGHT COLUMN: Submitted Reports List */}
            <div className="card padding-5 employee-history-card flex-column animate-slide-up">
              <div className="flex-row align-center gap-2" style={{ marginBottom: 16 }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>My Submitted Reports</h2>
              </div>

              {/* Quick Filters */}
              <div className="reports-filters-group flex-row gap-2" style={{ marginBottom: 16 }}>
                <div className="reports-search-box flex-1">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search project or summary..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    style={{ height: '32px', fontSize: '0.8rem' }}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="reports-select-filter"
                  style={{ height: '32px', fontSize: '0.8rem', padding: '0 8px' }}
                >
                  <option value="All">All Statuses</option>
                  <option>Submitted</option>
                  <option>Approved</option>
                  <option>Changes Requested</option>
                  <option>Escalated</option>
                  <option>Rejected</option>
                </select>
              </div>

              <div className="reports-table-wrap flex-1" style={{ overflowY: 'auto' }}>
                <table className="reports-data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Tasks</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedList.length > 0 ? pagedList.map(report => (
                      <tr key={report.id}>
                        <td>{report.date}</td>
                        <td><Badge variant="neutral">{report.project}</Badge></td>
                        <td>{report.tasksCompleted}/{report.tasksAssigned}</td>
                        <td>{report.workingHours} hrs</td>
                        <td><Badge variant={getStatusBadgeVariant(report.status)}>{report.status}</Badge></td>
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
                            View
                          </Button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="reports-table-empty">
                          <FileText size={24} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 8 }} />
                          <p style={{ fontSize: '0.8rem' }}>No reports found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="reports-pagination flex-row justify-between" style={{ marginTop: 16 }}>
                <span className="pagination-info-text" style={{ fontSize: '0.75rem' }}>
                  Showing {sorted.length === 0 ? 0 : (page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, sorted.length)} of {sorted.length} logs
                </span>
                <div className="flex-center gap-1">
                  <button className="pagination-btn-arrow" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                  <button className="pagination-btn-arrow" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── HEADER ── */}
          <div className="reports-header flex-row justify-between flex-wrap gap-4">
        <div className="reports-title-section">
          <h1>Work Reports</h1>
          <p className="subtitle">Submit updates, audit timesheets, track deliverables, and manage employee productivity.</p>
        </div>

        {/* Dynamic Role Switcher & Tabs */}
        <div className="flex-center gap-3 flex-wrap">
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

          <div className="role-switcher-container">
            <span className="role-switcher-label">Time Period:</span>
            <select
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                addToast('info', `Filtered data for time range: ${e.target.value}`);
              }}
              className="role-selector-input"
            >
              <option value="AllTime">All Time</option>
              <option value="Today">Today</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          
          <Button variant="ghost" size="sm" icon={Download} onClick={() => handleExportSystem('CSV')}>
            {exporting ? 'Exporting...' : (isEmployee ? 'Export My Reports' : 'Export Directory')}
          </Button>
        </div>
      </div>

      {/* ── TABS BAR ── */}
      <div className="reports-tabs-bar">
        {[
          { id: 'dashboard', label: 'Dashboard Overview', icon: <BarChart3 size={15} /> },
          { id: 'directory', label: 'Reports Directory', icon: <FileText size={15} /> },
          { id: 'calendar', label: 'Calendar Grid', icon: <Calendar size={15} /> },
          hasPermission('work_reports', 'update') && { id: 'analytics', label: 'Analytics & Heatmap', icon: <TrendingUp size={15} /> },
          hasPermission('work_reports', 'update') && { id: 'leaderboards', label: 'Leaderboard & Reminders', icon: <Award size={15} /> },
          hasPermission('work_reports', 'update') && { id: 'logs', label: 'Notifications & Audits', icon: <ShieldAlert size={15} /> }
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
              <span className="card-sub-desc">Logged submission entries</span>
            </div>
            
            <div className="card stat-metric-card border-left-warning">
              <span className="card-lbl-gray">Pending Review</span>
              <div className="card-value-display text-warning">{stats.pending}</div>
              <span className="card-sub-desc">{stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% of submissions</span>
            </div>

            <div className="card stat-metric-card border-left-success">
              <span className="card-lbl-gray">Approved Logs</span>
              <div className="card-value-display text-success">{stats.approved}</div>
              <span className="card-sub-desc">{stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% approval rate</span>
            </div>

            <div className="card stat-metric-card border-left-danger">
              <span className="card-lbl-gray">Flags & Rejections</span>
              <div className="card-value-display text-danger">{stats.rejected}</div>
              <span className="card-sub-desc">{stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}% revision rate</span>
            </div>
          </div>

          {hasPermission('work_reports', 'update') ? (
            <div className="reports-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <div className="card stat-metric-card border-left-teal">
                <span className="card-lbl-gray">Active Workforce Logged</span>
                <div className="card-value-display text-teal">{stats.activeReporting} Staff</div>
                <span className="card-sub-desc">{scopedEmployees.length > 0 ? Math.round((stats.activeReporting / scopedEmployees.length) * 100) : 0}% of workforce</span>
              </div>

              <div className="card stat-metric-card border-left-purple">
                <span className="card-lbl-gray">Avg Productivity Score</span>
                <div className="card-value-display text-purple">{stats.avgProductivity}%</div>
                <span className="card-sub-desc">Calculated performance average</span>
              </div>

              <div className="card stat-metric-card border-left-orange">
                <span className="card-lbl-gray">Missing Reports</span>
                <div className="card-value-display text-orange">{missingReportsCount} Alerts</div>
                <span className="card-sub-desc">{stats.total + missingReportsCount > 0 ? Math.round((stats.total / (stats.total + missingReportsCount)) * 100) : 100}% compliance rate</span>
              </div>

              <div className="card stat-metric-card border-left-neutral">
                <span className="card-lbl-gray">Late Submissions</span>
                <div className="card-value-display text-white">{lateSubmissionsCount} Records</div>
                <span className="card-sub-desc">{stats.total > 0 ? Math.round((lateSubmissionsCount / stats.total) * 100) : 0}% after-hours entries</span>
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
                  <BarChart data={deptChartData} barSize={16}>
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
                  <AreaChart data={weeklyTrend}>
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
            <div className="reports-filters-group">
              <div className="reports-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder={isEmployee ? "Search project, ID, summary..." : "Search name, ID, project..."}
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
                {(departments || []).map(dept => (
                  <option key={dept.id || dept.name} value={dept.name}>{dept.name}</option>
                ))}
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
            <div className="reports-views-group">
              <div className="reports-saved-views">
                <span className="label">Quick Views:</span>
                <button 
                  className={`view-link-btn ${statusFilter === 'All' && !search ? 'active' : ''}`} 
                  onClick={() => applySavedView('all')}
                >
                  All
                </button>
                <button 
                  className={`view-link-btn ${statusFilter === 'Submitted' ? 'active' : ''}`} 
                  onClick={() => applySavedView('pending')}
                >
                  Pending
                </button>
                <button 
                  className={`view-link-btn ${statusFilter === 'Flagged' ? 'active' : ''}`} 
                  onClick={() => applySavedView('flagged')}
                >
                  Flagged
                </button>
                {userRole === 'Employee' && (
                  <button 
                    className={`view-link-btn ${search === (currentUser?.name || '') ? 'active' : ''}`} 
                    onClick={() => applySavedView('my')}
                  >
                    My Submissions
                  </button>
                )}
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
                  {!isEmployee && (
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length === pagedList.length && pagedList.length > 0}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
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
                    {!isEmployee && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(report.id)}
                          onChange={(e) => toggleSelectOne(report.id, e.target.checked)}
                        />
                      </td>
                    )}
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
                        {isEmployee ? 'View Details' : 'Audit / Review'}
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isEmployee ? 11 : 12} className="reports-table-empty">
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
          <div className="calendar-legends-strip flex-row justify-start gap-4 flex-wrap" style={{ margin: '12px 0 6px 0' }}>
            <span className="reports-legend-indicator"><span className="legend-dot status-approved" /> Approved</span>
            <span className="reports-legend-indicator"><span className="legend-dot status-submitted" /> Submitted</span>
            <span className="reports-legend-indicator"><span className="legend-dot status-flagged" /> Action Needed</span>
            <span className="reports-legend-indicator"><span className="legend-dot status-missing" /> Missing / Unsubmitted</span>
          </div>

          <div className="calendar-grid-wrapper">
            <div className="calendar-weekdays-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="calendar-weekday-cell">{d}</div>)}
            </div>
            <div className="calendar-days-grid">
              {calendarDays.map((cell, idx) => {
                const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);
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
                  // Mark past days without submissions as missing
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
                {heatmapDates.map(dateStr => {
                  const dateObj = new Date(dateStr);
                  const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                  return <div key={dateStr} className="heatmap-date-header">{formatted}</div>;
                })}
              </div>

              {heatmapData.map(emp => (
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
            
            <div className="heatmap-legends-row flex-wrap">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Workload Index:</span>
              <span className="reports-legend-indicator"><span className="legend-box heat-overloaded" /> Overloaded (&gt;8.5h)</span>
              <span className="reports-legend-indicator"><span className="legend-box heat-optimal" /> Optimal (7.5h - 8.5h)</span>
              <span className="reports-legend-indicator"><span className="legend-box heat-under" /> Under-utilized (&lt;7.5h)</span>
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
                      data={capacityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {capacityData.map((e, idx) => <Cell key={idx} fill={e.fill} />)}
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
                  <BarChart data={projectHoursData}>
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
                  {leaderboardData.length > 0 ? leaderboardData.map(p => (
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
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center padding-3 text-muted">No leaderboard data available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing / Defaulters Reminders */}
          <div className="card padding-5">
            <span className="pm-dir-title" style={{ marginBottom: 10 }}>Compliance Monitoring & Defaulters</span>
            <p className="subtitle" style={{ marginBottom: 12 }}>Employees with missing reports or delayed logs. Click to alert them directly.</p>
            
            <div className="flex-column gap-3">
              {defaultersList.length > 0 ? defaultersList.map(d => (
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
              )) : (
                <div className="padding-3 text-center text-muted">All employees have submitted their work reports. 100% compliance! 🎉</div>
              )}
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
                  if (markAllNotificationsRead) {
                    markAllNotificationsRead();
                  }
                }}
              >
                Mark all as read
              </button>
            </div>
            
            <div className="flex-column gap-3">
              {notifications.length > 0 ? notifications.map(n => (
                <div key={n.id} className={`notification-item flex-row justify-between padding-3 ${!n.read ? 'unread' : ''}`}>
                  <div className="flex-center gap-2">
                    {!n.read && <span className="notification-unread-dot" />}
                    <span className="notification-message-text">{n.message}</span>
                  </div>
                  <span className="notification-time-lbl">{n.timestamp}</span>
                </div>
              )) : (
                <div className="padding-3 text-center text-muted" style={{ fontSize: '0.85rem' }}>No DWR notifications found.</div>
              )}
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
                  {auditLogs.length > 0 ? auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.timestamp}</td>
                      <td>
                        <strong>{log.user}</strong>
                        <span className="table-sub-text">{log.role}</span>
                      </td>
                      <td>
                        <Badge variant={log.action === 'Approval' || log.action === 'Approved' ? 'success' : log.action === 'Rejection' || log.action === 'Rejected' ? 'danger' : 'info'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{log.target}</td>
                      <td style={{ fontSize: '0.78rem' }}>{log.details}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center padding-3 text-muted">No audit logs logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
      </>
      )}

      {/* ── Slide-over Detail Audit Drawer ── */}
      <SlideOver
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? (isEmployee ? `Daily Report Details — ${selectedReport.id}` : `Audit Daily Report — ${selectedReport.id}`) : ''}
      >
        {selectedReport && (
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
            {(userRole !== 'Employee' && hasPermission('work_reports', 'approve')) && (
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
        )}
      </SlideOver>

    </div>
  );
};

export default WorkReports;
