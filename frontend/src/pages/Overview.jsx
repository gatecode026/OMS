import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Overview.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Avatar from '../components/common/Avatar';
import {
  Building2, Network, Users, DollarSign, MapPin, Globe2, Clock, CheckCircle,
  AlertTriangle, Play, Pause, AlertCircle, FileText, ChevronRight, ChevronDown,
  ChevronUp, Bell, Plus, Download, Search, RefreshCw, Layers, Calendar, HelpCircle,
  Briefcase, Check, Shield, Send, MoreHorizontal, UserPlus, Info, Activity, X, ArrowUpRight,
  TrendingUp, Megaphone, Trash2, LayoutDashboard
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ─── MASTER DATASETS FROM CONTEXT ───────────────────────────────────────────

const iconMap = {
  Layers: Layers,
  Users: Users,
  DollarSign: DollarSign,
  Megaphone: Megaphone,
  Building2: Building2,
  Network: Network,
  UserPlus: UserPlus,
  CheckCircle: CheckCircle,
  TrendingUp: TrendingUp,
  AlertTriangle: AlertTriangle,
  Clock: Clock,
  AlertCircle: AlertCircle,
  Shield: Shield,
  Calendar: Calendar,
  Trash2: Trash2,
  Info: Info
};

const RenderIcon = ({ name, ...props }) => {
  const IconComponent = iconMap[name] || HelpCircle;
  return <IconComponent {...props} />;
};

// ─── MINI DONUT COMPONENT FOR DEPARTMENTS ────────────────────────────────────
const MiniDonut = ({ percentage, color }) => {
  const radius = 16;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="mini-donut-container">
      <svg width="40" height="40" className="mini-donut">
        <circle cx="20" cy="20" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="transparent" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
        />
        <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" className="donut-text" fill="var(--text-primary)">
          {percentage}%
        </text>
      </svg>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const Overview = () => {
  const {
    addToast,
    branches: contextBranches,
    departments: contextDepartments,
    projectsList,
    tasks,
    notifications,
    activityLogs,
    announcementsList,
    createAnnouncement,
    deleteNotification,
    employees,
    attendance
  } = useApp();
  const navigate = useNavigate();
  const loading = usePageLoading(600);

  const branches = contextBranches || [];
  const departments = (contextDepartments || []).filter(d => d.status === 'Active');
  const alerts = notifications || [];
  const announcements = announcementsList || [];

  const branchesMapped = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return branches.map(b => {
      const bName = (b.name || '').trim().toLowerCase();

      // Employees in this branch
      const branchEmployees = employees.filter(emp =>
        (emp.branch || '').trim().toLowerCase() === bName
      );
      const count = branchEmployees.length > 0
        ? branchEmployees.length
        : (b.employeeCount || b.employeesCount || b.headcount || 0);

      // ── Real Productivity: calculated from tasks assigned to branch employees ──
      const branchEmpIds = new Set(branchEmployees.map(e => e.id));
      const branchTasks = (tasks || []).filter(t => branchEmpIds.has(t.assigneeId));
      const calculatedProductivity = branchTasks.length > 0
        ? Math.round(branchTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length / branchTasks.length * 100)
        : (branchEmployees.length > 0
          ? Math.round(branchEmployees.reduce((sum, emp) => sum + (emp.productivityScore || 90), 0) / branchEmployees.length)
          : 0);

      // ── Real Attendance: filter attendance records by branch employees today ──
      const branchAttToday = (attendance || []).filter(a =>
        branchEmpIds.has(a.employeeId) && a.date === today
      );
      let calculatedAttendance = 0;
      if (branchAttToday.length > 0) {
        const present = branchAttToday.filter(a =>
          a.status === 'Present' || a.status === 'Late' ||
          a.status === 'Work From Home' || a.status === 'WFH' || a.status === 'Overtime'
        ).length;
        calculatedAttendance = Math.round((present / branchAttToday.length) * 100);
      } else {
        const activeBranchEmps = branchEmployees.filter(e => e.status === 'Active');
        if (activeBranchEmps.length > 0) {
          const presentCount = activeBranchEmps.filter(e =>
            ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Punched In'].includes(e.attendanceStatus || e.todayPunchStatus)
          ).length;
          calculatedAttendance = Math.round((presentCount / activeBranchEmps.length) * 100);
        }
      }

      // ── Active Projects: aggregate via departments that have employees in this branch ──
      const branchDepts = new Set(
        branchEmployees.map(e => (e.department || '').trim().toLowerCase()).filter(Boolean)
      );
      const activeProjectsCount = (projectsList || []).filter(p =>
        branchDepts.has((p.department || '').trim().toLowerCase()) &&
        (p.status === 'In Progress' || p.status === 'Active' || p.status === 'Running')
      ).length;

      // ── Status from real data ──
      const derivedStatus = calculatedProductivity >= 90
        ? 'Optimal'
        : calculatedProductivity >= 75
          ? 'High Load'
          : calculatedProductivity > 0
            ? 'Critical'
            : (b.status || 'Active');

      return {
        ...b,
        type: 'branch',
        employeesCount: count,
        productivity: calculatedProductivity,
        attendance: calculatedAttendance,
        activeProjects: activeProjectsCount,
        country: b.country || 'India',
        status: derivedStatus
      };
    });
  }, [branches, employees, attendance, projectsList, tasks]);

  const departmentsMapped = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return departments.map(d => {
      const dName = (d.name || '').trim().toLowerCase();

      const deptEmployees = employees.filter(emp =>
        (emp.department || '').trim().toLowerCase() === dName
      );
      const count = deptEmployees.length > 0 ? deptEmployees.length : (d.employeeCount || 0);

      // ── Real Productivity: calculated from tasks assigned to department employees ──
      const deptEmpIds = new Set(deptEmployees.map(e => e.id));
      const deptTasks = (tasks || []).filter(t => deptEmpIds.has(t.assigneeId));
      const calculatedProductivity = deptTasks.length > 0
        ? Math.round(deptTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length / deptTasks.length * 100)
        : (deptEmployees.length > 0
          ? Math.round(deptEmployees.reduce((sum, emp) => sum + (emp.productivityScore || 90), 0) / deptEmployees.length)
          : 0);

      // ── Real Attendance: filter attendance records by department employees today ──
      const deptAttToday = (attendance || []).filter(a =>
        deptEmpIds.has(a.employeeId) && a.date === today
      );
      let calculatedAttendance = 0;
      if (deptAttToday.length > 0) {
        const present = deptAttToday.filter(a =>
          a.status === 'Present' || a.status === 'Late' ||
          a.status === 'Work From Home' || a.status === 'WFH' || a.status === 'Overtime'
        ).length;
        calculatedAttendance = Math.round((present / deptAttToday.length) * 100);
      } else {
        const activeDeptEmps = deptEmployees.filter(e => e.status === 'Active');
        if (activeDeptEmps.length > 0) {
          const presentCount = activeDeptEmps.filter(e =>
            ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Punched In'].includes(e.attendanceStatus || e.todayPunchStatus)
          ).length;
          calculatedAttendance = Math.round((presentCount / activeDeptEmps.length) * 100);
        }
      }

      // ── Active Projects: direct department match ──
      const activeProjectsCount = (projectsList || []).filter(p =>
        (p.department || '').trim().toLowerCase() === dName &&
        (p.status === 'In Progress' || p.status === 'Active' || p.status === 'Running')
      ).length;

      return {
        ...d,
        type: 'department',
        count: count,
        productivity: calculatedProductivity,
        attendance: calculatedAttendance,
        activeProjects: activeProjectsCount
      };
    });
  }, [departments, employees, attendance, projectsList, tasks]);

  const projectsMapped = useMemo(() => {
    return (projectsList || []).map(p => ({
      ...p,
      productivity: p.productivity || 0,
      date: p.date || p.startDate || p.createdAt?.split('T')[0] || ''
    }));
  }, [projectsList]);

  const tasksMapped = useMemo(() => {
    return (tasks || []).map(t => ({
      ...t,
      name: t.title,
      assignee: t.assigneeName,
      date: t.dueDate
    }));
  }, [tasks]);

  const announcementsMapped = useMemo(() => {
    return (announcements || []).map(ann => ({
      ...ann,
      date: ann.date || ann.createdAt?.split('T')[0] || ''
    }));
  }, [announcements]);

  const activitiesMapped = useMemo(() => {
    return (activityLogs || []).map(log => {
      let iconName = 'Clock';
      let typeClass = 'primary';
      const actionLower = (log.actionType || '').toLowerCase();
      if (actionLower.includes('punch') || actionLower.includes('attendance')) {
        iconName = 'Clock';
        typeClass = 'success';
      } else if (actionLower.includes('leave')) {
        iconName = 'Calendar';
        typeClass = 'warning';
      } else if (actionLower.includes('task')) {
        iconName = 'CheckCircle';
        typeClass = 'primary';
      } else if (actionLower.includes('employee') || actionLower.includes('user')) {
        iconName = 'UserPlus';
        typeClass = 'purple';
      } else if (actionLower.includes('role') || actionLower.includes('permission')) {
        iconName = 'Shield';
        typeClass = 'danger';
      } else if (actionLower.includes('delete') || actionLower.includes('remove')) {
        iconName = 'Trash2';
        typeClass = 'danger';
      }

      return {
        id: log.id,
        time: log.timestamp || 'Just now',
        type: typeClass,
        title: log.actionType || 'Activity Logged',
        details: `${log.actor || 'System'}: ${log.actionType} (${log.fieldChanged || ''})`,
        date: log.timestamp?.split(' ')[0] || '2026-05-30',
        iconName: iconName
      };
    });
  }, [activityLogs]);

  const alertsMapped = useMemo(() => {
    return (notifications || []).map(n => ({
      id: n.id,
      type: n.type || 'info',
      title: n.title || 'Notification',
      message: n.message || '',
      timestamp: n.time || 'Just now',
      iconName: n.iconName || (n.type === 'danger' ? 'AlertCircle' : 'AlertTriangle')
    }));
  }, [notifications]);

  // ── Search & Filter State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [performanceFilter, setPerformanceFilter] = useState('All');

  // ── Interactive UI States ──
  const [selectedBranch, setSelectedBranch] = useState(null);
  
  useEffect(() => {
    if (branchesMapped && branchesMapped.length > 0) {
      if (!selectedBranch || !branchesMapped.some(b => b.id === selectedBranch.id)) {
        setSelectedBranch(branchesMapped[0]);
      }
    }
  }, [branchesMapped, selectedBranch]);

  const [visibleLines, setVisibleLines] = useState({
    employees: true,
    projects: true,
    productivity: true,
    departments: true
  });
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [reportConfig, setReportConfig] = useState({ type: 'Company Performance', format: 'PDF', fromDate: '', toDate: '', dept: 'All', branch: 'All' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', category: 'General', desc: '' });
  const [activitiesLimit, setActivitiesLimit] = useState(4);
  const [branchSortKey, setBranchSortKey] = useState('name');
  const [branchSortDir, setBranchSortDir] = useState('asc');

  // ── Scroll Animation Hook ──
  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-scroll-in-visible');
          }
        });
      },
      { threshold: 0.05 }
    );
    const elements = document.querySelectorAll('.animate-scroll-in');
    elements.forEach((el) => observer.observe(el));
    return () => elements.forEach((el) => observer.unobserve(el));
  }, [loading]);

  // ── Filter Function Helper ──
  const matchesFilters = (item) => {
    // 1. Search Query Match
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = item.name && item.name.toLowerCase().includes(q);
      const titleMatch = item.title && item.title.toLowerCase().includes(q);
      const descMatch = item.desc && item.desc.toLowerCase().includes(q);
      const deptMatch = item.department && item.department.toLowerCase().includes(q);
      const branchMatch = item.branch && item.branch.toLowerCase().includes(q);
      const detailsMatch = item.details && item.details.toLowerCase().includes(q);
      const assigneeMatch = item.assignee && item.assignee.toLowerCase().includes(q);
      
      if (!nameMatch && !titleMatch && !descMatch && !deptMatch && !branchMatch && !detailsMatch && !assigneeMatch) {
        return false;
      }
    }

    // 2. Branch Filter Match
    if (branchFilter !== 'All') {
      if (item.branch && item.branch !== branchFilter) return false;
      if (item.name && item.type === 'branch' && item.name !== branchFilter) return false;
    }

    // 3. Department Filter Match
    if (deptFilter !== 'All') {
      if (item.department && item.department !== deptFilter) return false;
      if (item.name && item.type === 'department' && item.name !== deptFilter) return false;
    }

    // 4. Date Filter Match
    if (dateFilter !== 'All' && item.date) {
      const itemDate = new Date(item.date);
      const now = new Date(); // Use real current date
      const diffTime = Math.abs(now - itemDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (dateFilter === 'Last 30 Days' && diffDays > 30) return false;
      if (dateFilter === 'Last 3 Months' && diffDays > 90) return false;
      if (dateFilter === 'Last 6 Months' && diffDays > 180) return false;
    }

    // 5. Performance Filter Match
    if (performanceFilter !== 'All' && item.productivity !== undefined) {
      if (performanceFilter === 'High' && item.productivity <= 90) return false;
      if (performanceFilter === 'Average' && (item.productivity < 75 || item.productivity > 90)) return false;
      if (performanceFilter === 'Low' && item.productivity >= 75) return false;
    }

    return true;
  };

  // ── Filtered Datasets ──
  const filteredBranches = useMemo(() => branchesMapped.filter(matchesFilters), [branchesMapped, searchQuery, branchFilter, deptFilter, performanceFilter]);
  const filteredDepts = useMemo(() => departmentsMapped.filter(matchesFilters), [departmentsMapped, searchQuery, branchFilter, deptFilter, performanceFilter]);
  const filteredProjects = useMemo(() => projectsMapped.filter(matchesFilters), [projectsMapped, searchQuery, branchFilter, deptFilter, dateFilter, performanceFilter]);
  const filteredWorkflows = useMemo(() => {
    return filteredProjects.map(p => ({
      id: p.id.replace('PRJ', 'WF'),
      name: `${p.name} Release Pipeline`,
      progress: p.progress,
      status: p.status === 'Completed' ? 'Completed' : 'Running',
      department: p.department || '',
      branch: p.branch || 'Head Office',
      date: p.date
    }));
  }, [filteredProjects]);
  const filteredTasks = useMemo(() => tasksMapped.filter(matchesFilters), [tasksMapped, searchQuery, branchFilter, deptFilter]);
  const filteredAnnouncements = useMemo(() => announcementsMapped.filter(matchesFilters), [announcementsMapped, searchQuery, branchFilter, deptFilter, dateFilter]);
  const filteredActivities = useMemo(() => activitiesMapped.filter(matchesFilters), [activitiesMapped, searchQuery, branchFilter, deptFilter]);
  const filteredAlerts = useMemo(() => alertsMapped.filter(matchesFilters), [alertsMapped, searchQuery, branchFilter, deptFilter]);

  // ── KPI Recalculations ──
  const totalEmployees = useMemo(() => filteredBranches.reduce((acc, b) => acc + b.employeesCount, 0), [filteredBranches]);
  const totalProjectsCount = useMemo(() => filteredProjects.length, [filteredProjects]);
  const averageProductivity = useMemo(() => {
    if (filteredBranches.length === 0) return 0;
    return Math.round(filteredBranches.reduce((acc, b) => acc + b.productivity, 0) / filteredBranches.length);
  }, [filteredBranches]);
  const averageAttendance = useMemo(() => {
    if (filteredBranches.length === 0) return 0;
    return Math.round(filteredBranches.reduce((acc, b) => acc + b.attendance, 0) / filteredBranches.length);
  }, [filteredBranches]);

  // ── Sort Branches Table ──
  const sortedBranches = useMemo(() => {
    return [...filteredBranches].sort((a, b) => {
      let valA = a[branchSortKey];
      let valB = b[branchSortKey];
      if (typeof valA === 'string') {
        return branchSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return branchSortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredBranches, branchSortKey, branchSortDir]);

  const handleBranchSortClick = (key) => {
    if (branchSortKey === key) {
      setBranchSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setBranchSortKey(key);
      setBranchSortDir('asc');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setBranchFilter('All');
    setDeptFilter('All');
    setDateFilter('All');
    setPerformanceFilter('All');
    addToast('info', 'Filters cleared successfully.');
  };

  const handleExportSubmit = () => {
    setShowReportsModal(false);
    
    // Filter employees based on branch and department selections
    let filteredEmployeesList = [...employees];
    if (reportConfig.branch !== 'All') {
      filteredEmployeesList = filteredEmployeesList.filter(e => e.branch === reportConfig.branch);
    }
    if (reportConfig.dept !== 'All') {
      filteredEmployeesList = filteredEmployeesList.filter(e => e.department === reportConfig.dept);
    }

    let headers = [];
    let rows = [];

    if (reportConfig.type === 'Employee Analytics') {
      headers = ['Employee ID', 'Employee Name', 'Role/Designation', 'Department', 'Branch', 'Productivity Score', 'Status'];
      rows = filteredEmployeesList.map(e => [
        e.id || '-',
        e.name || '-',
        e.designation || e.role || '-',
        e.department || '-',
        e.branch || '-',
        `${e.productivityScore ?? 75}%`,
        e.status || 'Active'
      ]);
    } else if (reportConfig.type === 'Attendance') {
      headers = ['Date', 'Employee ID', 'Employee Name', 'Branch', 'Department', 'Status', 'Punch In', 'Punch Out'];
      let filteredAttendance = [...attendance];
      if (reportConfig.fromDate) {
        filteredAttendance = filteredAttendance.filter(a => a.date >= reportConfig.fromDate);
      }
      if (reportConfig.toDate) {
        filteredAttendance = filteredAttendance.filter(a => a.date <= reportConfig.toDate);
      }
      if (reportConfig.branch !== 'All') {
        filteredAttendance = filteredAttendance.filter(a => {
          const emp = employees.find(e => e.id === a.employeeId) || {};
          return (emp.branch || a.branch || '') === reportConfig.branch;
        });
      }
      if (reportConfig.dept !== 'All') {
        filteredAttendance = filteredAttendance.filter(a => {
          const emp = employees.find(e => e.id === a.employeeId) || {};
          return (emp.department || a.department || '') === reportConfig.dept;
        });
      }
      rows = filteredAttendance.map(a => {
        const emp = employees.find(e => e.id === a.employeeId) || {};
        return [
          a.date || '-',
          a.employeeId || '-',
          a.employeeName || emp.name || '-',
          emp.branch || a.branch || '-',
          emp.department || a.department || '-',
          a.status || '-',
          a.punchIn || '-',
          a.punchOut || '-'
        ];
      });
    } else if (reportConfig.type === 'Branch Productivity') {
      headers = ['Branch Name', 'City', 'Employees Count', 'Status', 'Productivity Score', 'Attendance Score'];
      let filteredBranchesList = branchesMapped;
      if (reportConfig.branch !== 'All') {
        filteredBranchesList = filteredBranchesList.filter(b => b.name === reportConfig.branch);
      }
      rows = filteredBranchesList.map(b => [
        b.name || '-',
        b.city || '-',
        b.employeesCount || 0,
        b.status || '-',
        `${b.productivity || 90}%`,
        `${b.attendance || 95}%`
      ]);
    } else if (reportConfig.type === 'Company Performance') {
      let targetEmployees = [...employees];
      if (reportConfig.branch !== 'All') {
        targetEmployees = targetEmployees.filter(e => e.branch === reportConfig.branch);
      }
      if (reportConfig.dept !== 'All') {
        targetEmployees = targetEmployees.filter(e => e.department === reportConfig.dept);
      }

      let targetBranches = branchesMapped;
      if (reportConfig.branch !== 'All') {
        targetBranches = targetBranches.filter(b => b.name === reportConfig.branch);
      }

      let targetProjects = [...projectsList];
      if (reportConfig.branch !== 'All') {
        targetProjects = targetProjects.filter(p => p.branch === reportConfig.branch);
      }
      if (reportConfig.dept !== 'All') {
        targetProjects = targetProjects.filter(p => p.department === reportConfig.dept);
      }

      const avgProd = targetEmployees.length > 0 
        ? Math.round(targetEmployees.reduce((acc, e) => acc + (e.productivityScore ?? 75), 0) / targetEmployees.length)
        : (targetBranches.length > 0 ? Math.round(targetBranches.reduce((acc, b) => acc + b.productivity, 0) / targetBranches.length) : 90);

      const avgAtt = targetBranches.length > 0
        ? Math.round(targetBranches.reduce((acc, b) => acc + b.attendance, 0) / targetBranches.length)
        : 95;

      headers = ['Metric', 'Value'];
      rows = [
        ['Target Scope - Office', reportConfig.branch === 'All' ? 'All Branches' : reportConfig.branch],
        ['Target Scope - Division', reportConfig.dept === 'All' ? 'All Departments' : reportConfig.dept],
        ['Total Branches Under Scope', targetBranches.length],
        ['Total Employees Under Scope', targetEmployees.length],
        ['Average Attendance Rate', `${avgAtt}%`],
        ['Average Productivity Score', `${avgProd}%`],
        ['Running Projects Under Scope', targetProjects.filter(p => p.status === 'In Progress' || p.status === 'Active').length]
      ];
    } else {
      // Workflow Operational Speed
      headers = ['Workflow Name', 'Department', 'Branch', 'Progress', 'Status'];
      let filteredProjects = [...projectsList];
      if (reportConfig.branch !== 'All') {
        filteredProjects = filteredProjects.filter(p => p.branch === reportConfig.branch);
      }
      if (reportConfig.dept !== 'All') {
        filteredProjects = filteredProjects.filter(p => p.department === reportConfig.dept);
      }
      rows = filteredProjects.map(p => [
        p.name || '-',
        p.department || '-',
        p.branch || '-',
        `${p.progress ?? 0}%`,
        p.status || '-'
      ]);
    }

    if (reportConfig.format === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        addToast('danger', 'Pop-up blocked. Please enable pop-ups to print/download PDF reports.');
        return;
      }
      
      const tableHeadersHTML = headers.map(h => `<th>${h}</th>`).join('');
      const tableRowsHTML = rows.map(r => `<tr>${r.map(val => `<td>${val}</td>`).join('')}</tr>`).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${reportConfig.type} Report</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
              body {
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                color: #1e293b;
                padding: 40px;
                line-height: 1.5;
                background: #fff;
                margin: 0;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 24px;
                margin-bottom: 30px;
              }
              .title-area h1 {
                font-size: 26px;
                font-weight: 800;
                color: #0f172a;
                margin: 0 0 6px 0;
                letter-spacing: -0.02em;
              }
              .title-area .meta-line {
                font-size: 13px;
                color: #64748b;
                margin: 3px 0;
              }
              .logo {
                font-size: 20px;
                font-weight: 800;
                color: #7c3aed;
                letter-spacing: -0.01em;
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .logo-dot {
                width: 8px;
                height: 8px;
                background: #7c3aed;
                border-radius: 50%;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 30px;
              }
              th {
                background-color: #f8fafc;
                text-align: left;
                padding: 12px 16px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                color: #475569;
                border-bottom: 2px solid #e2e8f0;
                letter-spacing: 0.05em;
              }
              td {
                padding: 14px 16px;
                font-size: 13px;
                border-bottom: 1px solid #e2e8f0;
                color: #334155;
              }
              tr:nth-child(even) td {
                background-color: #f8fafc;
              }
              .footer {
                margin-top: 80px;
                text-align: center;
                font-size: 11px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
                padding-top: 24px;
              }
              @media print {
                body { padding: 20px; }
                .footer { position: fixed; bottom: 0; left: 0; right: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title-area">
                <h1>${reportConfig.type} Report</h1>
                <div class="meta-line"><strong>Scope:</strong> Office: ${reportConfig.branch} | Division: ${reportConfig.dept}</div>
                ${reportConfig.fromDate ? `<div class="meta-line"><strong>Date Range:</strong> ${reportConfig.fromDate} to ${reportConfig.toDate || 'Present'}</div>` : ''}
                <div class="meta-line"><strong>Generated On:</strong> ${new Date().toLocaleString()}</div>
              </div>
              <div class="logo">
                <div class="logo-dot"></div>
                <span>OMS Enterprise</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>${tableHeadersHTML}</tr>
              </thead>
              <tbody>
                ${tableRowsHTML}
              </tbody>
            </table>
            <div class="footer">
              OMS Office Management System • Confidential Enterprise Report
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      addToast('success', `${reportConfig.type} Report opened in print window.`);
    } else if (reportConfig.format === 'Excel') {
      const filename = `${reportConfig.type.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.xls`;
      
      const tableHeadersHTML = headers.map(h => `<th style="background-color: #7c3aed; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-family: Arial, sans-serif; font-size: 13px;">${h}</th>`).join('');
      const tableRowsHTML = rows.map(r => `<tr>${r.map(val => `<td style="border: 1px solid #cbd5e1; padding: 8px; font-family: Arial, sans-serif; color: #334155; font-size: 12px;">${val}</td>`).join('')}</tr>`).join('');

      const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${reportConfig.type.substring(0, 30)}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <meta http-equiv="content-type" content="text/html; charset=UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
          </style>
        </head>
        <body>
          <h2 style="font-family: Arial, sans-serif; color: #1e293b; margin-bottom: 5px;">${reportConfig.type} Report</h2>
          <p style="font-family: Arial, sans-serif; color: #64748b; font-size: 12px; margin-top: 0; margin-bottom: 20px;">
            <strong>Generated On:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Scope:</strong> Office: ${reportConfig.branch} | Division: ${reportConfig.dept}<br/>
            ${reportConfig.fromDate ? `<strong>Date Range:</strong> ${reportConfig.fromDate} to ${reportConfig.toDate || 'Present'}` : ''}
          </p>
          <table>
            <thead>
              <tr>${tableHeadersHTML}</tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast('success', `Successfully downloaded "${filename}".`);
    } else {
      // CSV Format
      const filename = `${reportConfig.type.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`;
      const csvContent = "\ufeff" + [
        headers.join(','),
        ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast('success', `Successfully downloaded "${filename}".`);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.desc) {
      addToast('warning', 'Please fill in all announcement fields.');
      return;
    }
    const finalBranch = branchFilter === 'All' ? (branches[0]?.name || 'Jaipur HQ') : branchFilter;
    const newAnn = {
      category: announcementForm.category,
      title: announcementForm.title,
      desc: announcementForm.desc,
      department: deptFilter === 'All' ? 'Operations' : deptFilter,
      branch: finalBranch,
      date: new Date().toISOString().split('T')[0]
    };
    await createAnnouncement(newAnn);
    setAnnouncementForm({ title: '', category: 'General', desc: '' });
    setShowAnnounceModal(false);
  };

  const handleDismissAlert = async (id) => {
    await deleteNotification(id);
    addToast('info', 'Alert dismissed.');
  };

  const handleQuickActionTrigger = (action) => {
    if (action === 'Add Employee') {
      navigate('/employees/add');
      addToast('info', 'Opening Employee Creation Wizard');
    } else if (action === 'Create Department') {
      navigate('/departments');
      addToast('info', 'Redirecting to Department Management');
    } else if (action === 'Add Branch') {
      navigate('/branches');
      addToast('info', 'Redirecting to Branch Management');
    } else if (action === 'Create Project') {
      navigate('/projects');
      addToast('info', 'Redirecting to Project Management');
    } else {
      addToast('info', `Action triggered: ${action}`);
    }
  };

  const handleResetBranchExplorer = (branch) => {
    setSelectedBranch(branch);
  };

  // Synchronize Global Office Explorer selected branch if it gets filtered out
  useEffect(() => {
    if (filteredBranches.length > 0 && (!selectedBranch || !filteredBranches.some(b => b.id === selectedBranch.id))) {
      setSelectedBranch(filteredBranches[0]);
    }
  }, [filteredBranches, selectedBranch]);

  // ── Workforce Analytics Data Calculations ──
  const workforceDonutData = useMemo(() => {
    let active = 0;
    let newJoiners = 0;
    let onLeave = 0;
    let remote = 0;

    employees.forEach(emp => {
      const status = (emp.attendanceStatus || emp.status || '').toLowerCase();
      const workMode = (emp.workMode || '').toLowerCase();
      
      if (status.includes('leave')) {
        onLeave++;
      } else if (workMode.includes('remote') || workMode.includes('home') || status.includes('wfh')) {
        remote++;
      } else if (status.includes('present') || status.includes('active')) {
        active++;
      } else {
        active++;
      }

      if (emp.joinDate) {
        const join = new Date(emp.joinDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (join >= thirtyDaysAgo) {
          newJoiners++;
        }
      }
    });

    // Fallback if DB is not populated yet
    if (active === 0 && onLeave === 0 && remote === 0) {
      active = 0;
      newJoiners = 0;
      onLeave = 0;
      remote = 0;
    }

    return [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'New Joiners', value: newJoiners, color: '#3b82f6' },
      { name: 'On Leave', value: onLeave, color: '#ef4444' },
      { name: 'Remote', value: remote, color: '#8b5cf6' }
    ];
  }, [employees, totalEmployees]);

  const deptBarData = filteredDepts.map(d => ({
    name: d.name,
    Employees: d.count,
    color: d.color
  }));

  // ── Today Attendance Summary Metrics ──
  const attendanceMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = (attendance || []).filter(a => a.date === today);
    
    const presentCount = todayAttendance.filter(a =>
      a.status === 'Present' || a.status === 'Work From Home' || a.status === 'WFH'
    ).length;
    const lateCount = todayAttendance.filter(a => a.status === 'Late').length;
    const absentCount = todayAttendance.filter(a => a.status === 'Absent').length;
    const leaveCount = todayAttendance.filter(a => a.status === 'On Leave' || a.status === 'Leave').length;
    const overtimeCount = todayAttendance.filter(a => a.status === 'Overtime').length;

    return {
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      onLeave: leaveCount,
      overtime: overtimeCount
    };
  }, [attendance]);

  const weeklyAttendanceTrend = useMemo(() => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = { Mon: { present: 0, total: 0 }, Tue: { present: 0, total: 0 }, Wed: { present: 0, total: 0 }, Thu: { present: 0, total: 0 }, Fri: { present: 0, total: 0 }, Sat: { present: 0, total: 0 }, Sun: { present: 0, total: 0 } };
    
    (attendance || []).forEach(attRecord => {
      if (attRecord.date) {
        const dayName = weekdays[new Date(attRecord.date).getDay()];
        if (counts[dayName]) {
          counts[dayName].total++;
          if (attRecord.status === 'Present' || attRecord.status === 'Late' || attRecord.status === 'WFH') {
            counts[dayName].present++;
          }
        }
      }
    });

    const avg = averageAttendance || 0;
    return Object.keys(counts).map(day => {
      const data = counts[day];
      const rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : avg;
      return {
        name: day,
        Attendance: rate
      };
    });
  }, [attendance, averageAttendance]);

  const growthData = useMemo(() => {
    const now = new Date();
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    // Build last 6 calendar months
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { label: monthLabels[d.getMonth()], year: d.getFullYear(), month: d.getMonth() };
    });

    // ── Per-month employee join counts (new hires each month) ──
    const empJoinsPerMonth = months.map(({ year, month }) => {
      return employees.filter(emp => {
        if (!emp.joinDate) return false;
        const join = new Date(emp.joinDate);
        return join.getFullYear() === year && join.getMonth() === month;
      }).length;
    });
    const totalWithJoinDate = employees.filter(e => e.joinDate).length;
    const totalWithoutJoinDate = employees.length - totalWithJoinDate;
    // Distribute employees without a joinDate evenly across the 6-month window
    const baseEmpPerMonth = Math.floor(totalWithoutJoinDate / 6);

    // ── Per-month project start counts ──
    const projPerMonth = months.map(({ year, month }) => {
      return (projectsList || []).filter(p => {
        const dateStr = p.startDate || p.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length;
    });
    const totalProjWithDate = (projectsList || []).filter(p => p.startDate || p.createdAt).length;
    const projWithoutDate = (projectsList || []).length - totalProjWithDate;
    const baseProjPerMonth = Math.floor(projWithoutDate / 6);

    // ── Per-month productivity: calculated from tasks in that month ──
    const prodPerMonth = months.map(({ year, month }) => {
      const monthTasks = (tasks || []).filter(t => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      if (monthTasks.length > 0) {
        const completed = monthTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length;
        return Math.round((completed / monthTasks.length) * 100);
      }
      return 0;
    });

    // ── Per-month department creation counts ──
    const deptPerMonth = months.map(({ year, month }) => {
      return departments.filter(d => {
        const created = d.createdAt || d.updatedAt;
        if (!created) return false;
        const dt = new Date(created);
        return dt.getFullYear() === year && dt.getMonth() === month;
      }).length;
    });
    const totalDeptWithDate = departments.filter(d => d.createdAt || d.updatedAt).length;
    const deptWithoutDate = departments.length - totalDeptWithDate;
    const baseDeptPerMonth = Math.floor(deptWithoutDate / 6);

    return months.map(({ label }, i) => ({
      month: label,
      employees: empJoinsPerMonth[i] + baseEmpPerMonth,
      projects: projPerMonth[i] + baseProjPerMonth,
      productivity: prodPerMonth[i],
      departments: deptPerMonth[i] + baseDeptPerMonth
    }));
  }, [employees, projectsList, departments, totalProjectsCount, averageProductivity, tasks]);


  const shiftData = useMemo(() => {
    let morning = 0;
    let evening = 0;
    let night = 0;
    employees.forEach(emp => {
      const shift = (emp.shiftTiming || emp.shift || '').toLowerCase();
      if (shift.includes('evening') || shift.includes('2:00 pm') || shift.includes('14:00')) evening++;
      else if (shift.includes('night') || shift.includes('10:00 pm') || shift.includes('22:00')) night++;
      else morning++;
    });

    return [
      { shift: 'Morning', count: morning },
      { shift: 'Evening', count: evening },
      { shift: 'Night', count: night }
    ];
  }, [employees, totalEmployees]);

  // ── Real-Time Strip Data ──
  const onlineEmployeesCount = useMemo(() => {
    if (!employees || employees.length === 0) return 0;
    return employees.filter(emp => emp.status === 'Present' || emp.attendanceStatus === 'Present' || emp.status === 'Active' || emp.attendanceStatus === 'Late' || emp.attendanceStatus === 'WFH').length;
  }, [employees]);

  const runningWorkflowsCount = filteredWorkflows.filter(w => w.status === 'Running').length;
  const activeMeetingsCount = 0;
  const systemActivityLog = filteredActivities.slice(0, 3).map(act => act.details);

  if (loading) {
    return (
      <div className="page-loading-wrapper">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const hasNoData = filteredBranches.length === 0 && filteredDepts.length === 0;

  return (
    <div className="overview-page animate-fade-in">
      
      {/* ── Page Header ── */}
      <div className="overview-header">
        <div className="overview-title-section">
          <h1>Company Overview</h1>
          <p className="subtitle">Monitor and manage complete organizational performance, company operations, and global operational metrics.</p>
        </div>
        <div className="overview-header-actions">
          <Button variant="primary" onClick={() => setShowReportsModal(true)} icon={FileText}>
            Generate Reports
          </Button>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="card filters-card overview-filters-card">
        <div className="filters-grid">
          <div className="filter-input-wrapper">
            <Search size={16} className="filter-search-icon" />
            <input
              type="text"
              placeholder="Search branch, department, announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-search-field"
            />
          </div>
          
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="All">All Branches</option>
            {branchesMapped.map(b => (
              <option key={b.id || b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="All">All Departments</option>
            {departmentsMapped.map(d => (
              <option key={d.id || d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
          
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="All">All Time</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="Last 6 Months">Last 6 Months</option>
          </select>
          
          <select value={performanceFilter} onChange={(e) => setPerformanceFilter(e.target.value)}>
            <option value="All">All Performance</option>
            <option value="High">High (&gt;90%)</option>
            <option value="Average">Average (75-90%)</option>
            <option value="Low">Needs Attention (&lt;75%)</option>
          </select>
          
          <Button variant="ghost" onClick={handleResetFilters}>Clear</Button>
        </div>
      </div>

      {hasNoData ? (
        /* ── Empty State View ── */
        <div className="overview-empty-state card flex-center flex-column animate-fade-in" style={{ padding: 'var(--space-12) 0', gap: 'var(--space-4)' }}>
          <AlertCircle size={48} style={{ color: 'var(--text-muted)' }} />
          <h3 className="card-title">No Dashboard Data Found</h3>
          <p className="chart-subtitle" style={{ maxWidth: '360px', margin: '0 auto', textAlign: 'center' }}>
            No records matched your search query or filter values. Try resetting the criteria parameters.
          </p>
          <Button variant="secondary" onClick={handleResetFilters} icon={RefreshCw}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <>
          {/* ── KPI Stats Grid ── */}
          <div className="overview-stats-grid">
            <StatCard
              title="Total Branches"
              value={filteredBranches.length}
              icon={Building2}
              description="Global operational hubs"
              trend={branchFilter !== 'All' ? 'Filtered' : '+1 in last 6 months'}
              trendType="info"
            />
            <StatCard
              title="Global Headcount"
              value={totalEmployees}
              icon={Users}
              description="Active workforce members"
              trend={performanceFilter !== 'All' ? 'Filtered' : '+8% this quarter'}
              trendType="success"
            />
            <StatCard
              title="Global Productivity"
              value={`${averageProductivity}%`}
              icon={TrendingUp}
              description="Average productivity rating"
              trend="Target: 90%+"
              trendType={averageProductivity >= 90 ? 'success' : 'warning'}
            />
            <StatCard
              title="Global Attendance"
              value={`${averageAttendance}%`}
              icon={Clock}
              description="Average daily attendance rate"
              trend="Optimal compliance"
              trendType="success"
            />
          </div>

          {/* ── 1. REAL-TIME MONITORING STRIP ── */}
          <div className="realtime-strip card animate-scroll-in">
            <div className="strip-stats">
              <div className="strip-item">
                <span className="live-dot pulse-dot"></span>
                <span className="strip-label">Online Employees:</span>
                <strong className="strip-value">{onlineEmployeesCount}</strong>
              </div>
              <div className="strip-item">
                <span className="live-dot pulse-dot"></span>
                <span className="strip-label">Running Workflows:</span>
                <strong className="strip-value">{runningWorkflowsCount}</strong>
              </div>
              <div className="strip-item">
                <span className="live-dot pulse-dot"></span>
                <span className="strip-label">Active Meetings:</span>
                <strong className="strip-value">{activeMeetingsCount}</strong>
              </div>
              <div className="strip-item">
                <span className="live-dot pulse-dot"></span>
                <span className="strip-label">System Health:</span>
                <strong className="strip-value text-success">99.8%</strong>
              </div>
            </div>
            <div className="strip-ticker-wrapper">
              <div className="ticker-label">
                <Activity size={14} className="text-primary-c" />
                <span>LIVE UPDATES:</span>
              </div>
              <div className="ticker-viewport">
                <div className="ticker-track">
                  {systemActivityLog.length > 0 ? (
                    systemActivityLog.map((act, index) => (
                      <span key={index} className="ticker-item">
                        <span className="ticker-bullet">•</span> {act}
                      </span>
                    ))
                  ) : (
                    <span className="ticker-item">All operations synced. No new updates.</span>
                  )}
                  {/* Repeat to enable clean looping effect */}
                  {systemActivityLog.map((act, index) => (
                    <span key={`dup-${index}`} className="ticker-item">
                      <span className="ticker-bullet">•</span> {act}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Existing Interactive Branch & Dept Explorer Splits ── */}
          <div className="overview-main-grid animate-scroll-in">
            
            {/* Left Side: Department Distribution */}
            <div className="overview-depts card">
              <div className="card-header">
                <h3>Department Breakdown</h3>
                <span className="card-subtitle">Headcount breakdown</span>
              </div>
              <div className="depts-list">
                {filteredDepts.map((dept) => {
                  const percentage = totalEmployees > 0 ? Math.round((dept.count / totalEmployees) * 100) : 0;
                  return (
                    <div key={dept.name} className="dept-progress-item">
                      <div className="dept-progress-info">
                        <span className="dept-name">{dept.name}</span>
                        <span className="dept-metrics">
                          <strong>{dept.count}</strong> employees ({percentage}%) • <strong>{dept.activeProjects} Projects</strong>
                        </span>
                      </div>
                      <div className="dept-progress-bar-wrapper">
                        <div
                          className="dept-progress-bar"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: dept.color,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side: Interactive Branch Explorer */}
            <div className="overview-branches card">
              <div className="card-header">
                <h3>Global Office Explorer</h3>
                <span className="card-subtitle">Select a branch to view detailed operational metrics</span>
              </div>

              <div className="branches-split">
                {/* Branches Quick Select List */}
                <div className="branches-list-selector">
                  {filteredBranches.map((b) => {
                    const isSelected = selectedBranch && selectedBranch.id === b.id;
                    return (
                      <button
                        key={b.id}
                        className={`branch-select-row ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedBranch(b)}
                      >
                        <div className="branch-select-main">
                          <MapPin size={16} className="pin-icon" />
                          <span className="branch-select-name">{b.name}</span>
                        </div>
                        <Badge variant={b.status === 'Optimal' ? 'success' : b.status === 'High Load' ? 'warning' : 'danger'}>
                          {b.status}
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Branch Detail Panel */}
                {selectedBranch ? (
                  <div className="branch-detail-panel">
                    <div className="branch-detail-header">
                      <div className="branch-title-wrap">
                        <Globe2 size={24} className="globe-icon" />
                        <div>
                          <h4>{selectedBranch.name}</h4>
                          <span className="country-sub">{selectedBranch.country || 'India'}</span>
                        </div>
                      </div>
                      <Badge variant={selectedBranch.status === 'Optimal' ? 'success' : selectedBranch.status === 'High Load' ? 'warning' : 'danger'}>
                        {selectedBranch.status}
                      </Badge>
                    </div>

                    <div className="branch-meta-grid">
                      <div className="branch-meta-item">
                        <span className="meta-label">Branch Manager</span>
                        <span className="meta-val">{selectedBranch.manager}</span>
                      </div>
                      <div className="branch-meta-item">
                        <span className="meta-label">Local Timezone</span>
                        <span className="meta-val flex-center gap-1 justify-start">
                          <Clock size={12} /> {selectedBranch.timezone}
                        </span>
                      </div>
                      <div className="branch-meta-item">
                        <span className="meta-label">Active Headcount</span>
                        <span className="meta-val">{selectedBranch.employeesCount || selectedBranch.headcount || 0} Employees</span>
                      </div>
                      <div className="branch-meta-item">
                        <span className="meta-label">Running Projects</span>
                        <span className="meta-val">{selectedBranch.activeProjects || 0} Projects</span>
                      </div>
                      <div className="branch-meta-item">
                        <span className="meta-label">Productivity Index</span>
                        <span className="meta-val text-success">{selectedBranch.productivity}%</span>
                      </div>
                      <div className="branch-meta-item">
                        <span className="meta-label">Attendance Index</span>
                        <span className="meta-val text-info">{selectedBranch.attendance}%</span>
                      </div>
                      <div className="branch-meta-item span-all">
                        <span className="meta-label">Location</span>
                        <span className="meta-val code-val">
                          {[selectedBranch.city, selectedBranch.state, selectedBranch.zipCode].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                      {selectedBranch.phone || selectedBranch.email ? (
                        <div className="branch-meta-item span-all">
                          <span className="meta-label">Contact</span>
                          <span className="meta-val">
                            {[selectedBranch.phone, selectedBranch.email].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                      ) : null}
                      <div className="branch-meta-item span-all">
                        <span className="meta-label">Physical Address</span>
                        <span className="meta-val address-val">
                          {selectedBranch.address || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="branch-status-box">
                      <CheckCircle size={16} className="status-box-icon" />
                      <p>
                        {selectedBranch.status === 'Optimal'
                          ? `${selectedBranch.name} is operating at full capacity. Productivity at ${selectedBranch.productivity}%, attendance at ${selectedBranch.attendance}% — all systems nominal.`
                          : selectedBranch.status === 'High Load'
                            ? `${selectedBranch.name} is under high operational load. ${selectedBranch.employeesCount} employees active with ${selectedBranch.activeProjects} running project${selectedBranch.activeProjects !== 1 ? 's' : ''}. Monitor resource allocation.`
                            : selectedBranch.status === 'Critical'
                              ? `${selectedBranch.name} requires immediate attention. Productivity is at ${selectedBranch.productivity}%. Review staffing and project distribution.`
                              : `${selectedBranch.name} is ${selectedBranch.status?.toLowerCase() || 'active'}. ${selectedBranch.employeesCount || 0} employees assigned across ${selectedBranch.departments?.length || 0} department${(selectedBranch.departments?.length || 0) !== 1 ? 's' : ''}.`
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="branch-detail-panel flex-center flex-column" style={{ padding: 'var(--space-12) 0', gap: 'var(--space-2)' }}>
                    <MapPin size={32} className="text-muted mb-2" />
                    <span className="text-muted">No branch selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. BRANCH / AGENCY OVERVIEW TABLE ── */}
          <div className="card overview-table-card animate-scroll-in">
            <div className="card-header-table">
              <div>
                <h3>Branch / Agency Operational Standings</h3>
                <span className="card-subtitle">Real-time performance indicators and operational sync statuses</span>
              </div>
            </div>
            
            <div className="table-responsive">
              <table className="overview-branches-table">
                <thead>
                  <tr>
                    <th onClick={() => handleBranchSortClick('name')} className="sortable-th">
                      Branch Name {branchSortKey === 'name' && (branchSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleBranchSortClick('employeesCount')} className="sortable-th">
                      Employees {branchSortKey === 'employeesCount' && (branchSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleBranchSortClick('activeProjects')} className="sortable-th">
                      Active Projects {branchSortKey === 'activeProjects' && (branchSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleBranchSortClick('productivity')} className="sortable-th">
                      Productivity % {branchSortKey === 'productivity' && (branchSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleBranchSortClick('attendance')} className="sortable-th">
                      Attendance % {branchSortKey === 'attendance' && (branchSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleBranchSortClick('status')} className="sortable-th">
                      Status {branchSortKey === 'status' && (branchSortDir === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBranches.map((branch) => {
                    const prodClass = branch.productivity > 90 ? 'prod-high' : branch.productivity >= 75 ? 'prod-avg' : 'prod-low';
                    return (
                      <tr key={branch.id} onClick={() => handleResetBranchExplorer(branch)} className="branch-row-clickable">
                        <td className="bold-text flex-center justify-start gap-2">
                          <MapPin size={14} className="text-muted" />
                          <span>{branch.name}</span>
                        </td>
                        <td>{branch.employeesCount} Emps</td>
                        <td>{branch.activeProjects} Projects</td>
                        <td>
                          <span className={`productivity-indicator-cell ${prodClass}`}>
                            {branch.productivity}%
                          </span>
                        </td>
                        <td><strong>{branch.attendance}%</strong></td>
                        <td>
                          <Badge variant={branch.status === 'Optimal' ? 'success' : branch.status === 'High Load' ? 'warning' : 'danger'}>
                            {branch.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 3. DEPARTMENT OVERVIEW CARDS ── */}
          <div className="department-overview-section animate-scroll-in">
            <div className="section-title-wrapper">
              <h3>Department Operational Analytics</h3>
              <span className="card-subtitle">Division metrics, manager details, and work statuses</span>
            </div>
            
            <div className="departments-horizontal-scroll">
              {filteredDepts.map((dept) => (
                <div key={dept.name} className="department-overview-card card">
                  <div className="dept-card-header">
                    <div className="dept-icon-bg" style={{ background: `${dept.color}15`, color: dept.color }}>
                      <RenderIcon name={dept.iconName} size={18} />
                    </div>
                    <div>
                      <h4 className="dept-card-title">{dept.name} Department</h4>
                      <span className="dept-manager-sub">Lead: {dept.manager}</span>
                    </div>
                  </div>
                  
                  <div className="dept-card-stats-grid">
                    <div className="dept-stat-box">
                      <span className="meta-label">Employees</span>
                      <strong className="bold-text">{dept.count}</strong>
                    </div>
                    <div className="dept-stat-box">
                      <span className="meta-label">Attendance</span>
                      <strong className="text-info">{dept.attendance}%</strong>
                    </div>
                  </div>

                  <div className="dept-progress-wrap">
                    <div className="dept-progress-header">
                      <span className="meta-label">Active Projects</span>
                      <span className="progress-pct-label">{dept.activeProjects} running</span>
                    </div>
                    <div className="dept-progress-track">
                      <div className="dept-progress-fill" style={{ width: `${Math.min(dept.activeProjects * 6, 100)}%`, backgroundColor: dept.color }}></div>
                    </div>
                  </div>

                  <div className="dept-donut-row">
                    <div className="dept-donut-info">
                      <span className="meta-label">Productivity</span>
                      <span className="dept-prod-status" style={{ color: dept.color }}>
                        {dept.productivity >= 90 ? 'Outstanding' : 'Steady'}
                      </span>
                    </div>
                    <MiniDonut percentage={dept.productivity} color={dept.color} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. WORKFORCE ANALYTICS + ATTENDANCE & SHIFT OVERVIEW ── */}
          <div className="workforce-attendance-grid animate-scroll-in">
            
            {/* Left: Workforce Analytics */}
            <div className="card workforce-analytics-panel">
              <div className="card-header">
                <h3>Workforce Distribution & Analytics</h3>
                <span className="card-subtitle">Employment segment allocations and branch headcounts</span>
              </div>
              
              <div className="workforce-charts-wrapper">
                {totalEmployees > 0 ? (
                  <div className="donut-chart-container relative-pie-container">
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie
                          data={workforceDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {workforceDonutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-center-label">
                      <span className="pie-center-number">{totalEmployees}</span>
                      <span className="pie-center-text">Employees</span>
                    </div>
                    <div className="pie-custom-legend" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', marginTop: '10px' }}>
                      {workforceDonutData.map((item, idx) => (
                        <div key={idx} className="legend-item">
                          <span className="legend-dot" style={{ backgroundColor: item.color }} />
                          <span className="legend-name">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-center flex-column" style={{ height: '170px', margin: 'auto' }}>
                    <Users size={32} className="text-muted mb-2" />
                    <span className="text-muted">No employees registered</span>
                  </div>
                )}

                <div className="bar-chart-container" style={{ minHeight: '190px' }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={deptBarData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                      <Bar dataKey="Employees" fill="var(--color-primary)" radius={[4, 4, 0, 0]}>
                        {deptBarData.map((entry, index) => (
                          <Cell key={`bar-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right: Attendance & Shift Overview */}
            <div className="card attendance-shift-panel">
              <div className="card-header">
                <h3>Attendance & Shift Overview</h3>
                <span className="card-subtitle">Daily punch summary, weekly statistics, and rosters</span>
              </div>
              
              <div className="attendance-summary-row">
                <div className="att-summary-box text-center">
                  <span className="att-count text-success">{attendanceMetrics.present}</span>
                  <span className="meta-label">Present</span>
                </div>
                <div className="att-summary-box text-center">
                  <span className="att-count text-warning">{attendanceMetrics.late}</span>
                  <span className="meta-label">Late</span>
                </div>
                <div className="att-summary-box text-center">
                  <span className="att-count text-danger">{attendanceMetrics.absent}</span>
                  <span className="meta-label">Absent</span>
                </div>
                <div className="att-summary-box text-center">
                  <span className="att-count text-muted">{attendanceMetrics.onLeave}</span>
                  <span className="meta-label">Leave</span>
                </div>
                <div className="att-summary-box text-center">
                  <span className="att-count text-primary-c">{attendanceMetrics.overtime}</span>
                  <span className="meta-label">Overtime</span>
                </div>
              </div>

              <div className="attendance-trend-chart-wrapper">
                <span className="chart-title-internal">Weekly Attendance Rate Trend</span>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={weeklyAttendanceTrend} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={9} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={9} domain={[70, 100]} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                    <Area type="monotone" dataKey="Attendance" stroke="var(--color-primary)" fill="url(#attGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="shift-breakdown-row">
                <span className="chart-title-internal">Shift Allocation</span>
                <div className="shifts-list-flex">
                  {shiftData.map((shift, idx) => (
                    <div key={idx} className="shift-pill-box">
                      <span className="shift-name">{shift.shift} Shift</span>
                      <strong className="shift-count">{shift.count} Emps</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. PROJECT & WORKFLOW OVERVIEW (3 Columns) ── */}
          <div className="projects-workflow-3col animate-scroll-in">
            
            {/* Col 1: Active Workflows */}
            <div className="card workflow-col">
              <div className="col-header">
                <h3>Active Workflows</h3>
                <span className="card-subtitle">Automated processes running</span>
              </div>
              <div className="workflows-scroll-list">
                {filteredWorkflows.length > 0 ? (
                  filteredWorkflows.map((flow) => (
                    <div key={flow.id} className="workflow-item-card">
                      <div className="workflow-meta">
                        <span className="flow-title bold-text">{flow.name}</span>
                        <Badge variant={flow.status === 'Completed' ? 'success' : flow.status === 'Running' ? 'info' : flow.status === 'Paused' ? 'warning' : 'danger'}>
                          {flow.status}
                        </Badge>
                      </div>
                      <div className="flow-progress-row">
                        <div className="flow-progress-bar-track">
                          <div className="flow-progress-bar-fill" style={{ width: `${flow.progress}%`, backgroundColor: flow.status === 'Completed' ? 'var(--color-success)' : 'var(--color-primary)' }}></div>
                        </div>
                        <span className="flow-progress-num">{flow.progress}%</span>
                      </div>
                      <div className="flow-card-footer">
                        <span>Dept: <strong>{flow.department}</strong></span>
                        <span>Node: {flow.branch}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-column-content">No active workflows match criteria.</div>
                )}
              </div>
            </div>

            {/* Col 2: Project Status Breakdown */}
            <div className="card project-status-col">
              <div className="col-header">
                <h3>Project Progress Standings</h3>
                <span className="card-subtitle">High-level project execution stages</span>
              </div>
              
              <div className="project-status-list">
                {[
                  { key: 'Completed', label: 'Completed Projects', color: '#10b981' },
                  { key: 'In Progress', label: 'In Progress Platform', color: '#3b82f6' },
                  { key: 'Pending', label: 'Pending Assessment', color: '#f59e0b' },
                  { key: 'Delayed', label: 'Delayed Deployment', color: '#ef4444' }
                ].map((item) => {
                  const count = filteredProjects.filter(p => p.status === item.key).length;
                  const percent = filteredProjects.length > 0 ? Math.round((count / filteredProjects.length) * 100) : 0;
                  return (
                    <div key={item.key} className="project-status-item">
                      <div className="status-item-meta">
                        <div className="label-with-indicator">
                          <span className="status-dot" style={{ backgroundColor: item.color }}></span>
                          <span className="status-label-text">{item.label}</span>
                        </div>
                        <strong className="status-count-val">{count} ({percent}%)</strong>
                      </div>
                      <div className="status-progress-track">
                        <div className="status-progress-fill" style={{ width: `${percent}%`, backgroundColor: item.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="project-highlight-box">
                <span className="meta-label">Featured Active Project</span>
                {filteredProjects.length > 0 ? (
                  <div className="featured-project-details">
                    <strong className="bold-text">{filteredProjects[0].name}</strong>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '4px' }}>
                      <span>Productivity: {filteredProjects[0].productivity}%</span>
                      <span className="text-primary-c">{filteredProjects[0].progress}% Complete</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted text-xs">No active projects.</span>
                )}
              </div>
            </div>

            {/* Col 3: Pending & Delayed Tasks */}
            <div className="card tasks-col">
              <div className="col-header">
                <h3>Pending & Delayed Tasks</h3>
                <span className="card-subtitle">Roster tasks requiring priority attention</span>
              </div>
              
              <div className="tasks-scroll-list">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <div key={task.id} className="task-item-card">
                      <div className="task-card-header">
                        <span className="task-title-text bold-text">{task.name}</span>
                        <Badge variant={task.priority === 'Critical' ? 'danger' : task.priority === 'High' ? 'warning' : 'neutral'}>
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="task-card-body">
                        <span>Assigned to: <strong>{task.assignee}</strong></span>
                        <span className={`due-date-span ${task.status === 'Delayed' ? 'text-danger' : ''}`}>
                          Due: {task.dueDate}
                        </span>
                      </div>
                      <div className="task-card-footer">
                        <span>Dept: {task.department}</span>
                        <Badge variant={task.status === 'Delayed' ? 'danger' : 'warning'}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-column-content">No overdue or pending tasks.</div>
                )}
              </div>
            </div>
          </div>

          {/* ── 6. MONTHLY GROWTH ANALYTICS ── */}
          <div className="card growth-analytics-section animate-scroll-in">
            <div className="growth-section-header">
              <div>
                <h3>Monthly Growth Analytics</h3>
                <span className="card-subtitle">Last 6 months employee onboarding, projects, and productivity trends</span>
              </div>
              
              <div className="growth-line-toggles">
                <button
                  className={`toggle-line-btn ${visibleLines.employees ? 'active' : ''}`}
                  onClick={() => setVisibleLines(prev => ({ ...prev, employees: !prev.employees }))}
                >
                  <span className="legend-indicator" style={{ backgroundColor: 'var(--color-primary)' }} />
                  Employee Growth
                </button>
                <button
                  className={`toggle-line-btn ${visibleLines.projects ? 'active' : ''}`}
                  onClick={() => setVisibleLines(prev => ({ ...prev, projects: !prev.projects }))}
                >
                  <span className="legend-indicator" style={{ backgroundColor: '#10b981' }} />
                  Project Growth
                </button>
                <button
                  className={`toggle-line-btn ${visibleLines.productivity ? 'active' : ''}`}
                  onClick={() => setVisibleLines(prev => ({ ...prev, productivity: !prev.productivity }))}
                >
                  <span className="legend-indicator" style={{ backgroundColor: '#f59e0b' }} />
                  Productivity Improvement
                </button>
                <button
                  className={`toggle-line-btn ${visibleLines.departments ? 'active' : ''}`}
                  onClick={() => setVisibleLines(prev => ({ ...prev, departments: !prev.departments }))}
                >
                  <span className="legend-indicator" style={{ backgroundColor: '#8b5cf6' }} />
                  Department Expansion
                </button>
              </div>
            </div>

            <div className="growth-chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={growthData} margin={{ top: 10, right: 50, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 15, fill: 'var(--text-muted)', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    label={{ value: 'Productivity %', angle: 90, position: 'insideRight', offset: 15, fill: '#f59e0b', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value, name) => {
                      if (name === 'Productivity Rate %') return [`${value}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  {visibleLines.employees && <Line yAxisId="left" type="monotone" dataKey="employees" stroke="var(--color-primary)" strokeWidth={2.5} name="Employees" dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />}
                  {visibleLines.projects && <Line yAxisId="left" type="monotone" dataKey="projects" stroke="#10b981" strokeWidth={2.5} name="Projects" dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />}
                  {visibleLines.productivity && <Line yAxisId="right" type="monotone" dataKey="productivity" stroke="#f59e0b" strokeWidth={2.5} name="Productivity Rate %" dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />}
                  {visibleLines.departments && <Line yAxisId="left" type="monotone" dataKey="departments" stroke="#8b5cf6" strokeWidth={2.5} name="Departments" dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>


          {/* ── 7. COMPANY ANNOUNCEMENTS + 8. RECENT ACTIVITIES SPLIT ── */}
          <div className="announcements-activities-grid animate-scroll-in">
            
            {/* Announcements Panel */}
            <div className="card announcements-section">
              <div className="card-header-with-action">
                <div>
                  <h3>Company Announcements</h3>
                  <span className="card-subtitle">Broadcast feeds and official memos</span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowAnnounceModal(true)} icon={Plus}>
                  Post Announcement
                </Button>
              </div>

              <div className="announcements-list-wrapper">
                {filteredAnnouncements.length > 0 ? (
                  filteredAnnouncements.map((ann) => (
                    <div key={ann.id} className="announcement-card-item">
                      <div className="announce-meta-row">
                        <span className="announce-date">{ann.date}</span>
                        <Badge variant={ann.category === 'Policies' ? 'warning' : ann.category === 'Milestones' ? 'success' : 'info'}>
                          {ann.category}
                        </Badge>
                      </div>
                      <h4 className="announce-title">{ann.title}</h4>
                      <p className="announce-desc">{ann.desc}</p>
                      <div className="announce-card-footer">
                        <span>Posted in: {ann.branch} • {ann.department}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-panel-view">
                    <Megaphone size={36} className="text-muted" />
                    <h4>No Announcements</h4>
                    <p>No announcements found for this filter criteria.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activities Feed */}
            <div className="card activities-section">
              <div className="card-header">
                <h3>Recent Company Activities</h3>
                <span className="card-subtitle">Log feed of real-time employee actions and milestones</span>
              </div>

              <div className="timeline-wrapper">
                {filteredActivities.length > 0 ? (
                  <div className="timeline-track">
                    {filteredActivities.slice(0, activitiesLimit).map((act) => (
                      <div key={act.id} className="timeline-node">
                        <div className={`timeline-icon-holder ${act.type}`}>
                          <RenderIcon name={act.iconName} size={13} />
                        </div>
                        <div className="timeline-content">
                          <div className="content-header-row">
                            <span className="activity-title bold-text">{act.title}</span>
                            <span className="activity-time">{act.time}</span>
                          </div>
                          <p className="activity-desc">{act.details}</p>
                          <span className="activity-context">
                            Node: {act.branch} • {act.department}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel-view">
                    <Activity size={36} className="text-muted" />
                    <h4>No Activities Registered</h4>
                    <p>No timeline activities matched search filters.</p>
                  </div>
                )}

                {filteredActivities.length > activitiesLimit && (
                  <div className="timeline-load-more text-center">
                    <Button variant="ghost" size="sm" onClick={() => setActivitiesLimit(prev => prev + 3)} icon={ChevronDown}>
                      Load More Activities
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 9. NOTIFICATIONS & ALERTS COLLAPSIBLE SIDE PANEL ── */}
      <div className={`alerts-sidebar-panel ${isAlertsOpen ? 'open' : ''} glass`}>
        <div className="sidebar-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} className="text-primary-c" />
            <h3>Actionable Alerts ({filteredAlerts.length})</h3>
          </div>
          <button className="sidebar-close-btn" onClick={() => setIsAlertsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-panel-body">
          {filteredAlerts.length > 0 ? (
            ['Delayed Projects', 'Low Productivity', 'Attendance Warnings', 'Pending Approvals', 'Security Alerts', 'General Alerts'].map((groupTitle) => {
              const groupAlerts = filteredAlerts.filter(al => {
                if (groupTitle === 'Security Alerts') return al.type === 'security' || al.title === 'Security Alerts' || al.title === 'Security';
                if (groupTitle === 'General Alerts') {
                  const otherCategories = ['Delayed Projects', 'Low Productivity', 'Attendance Warnings', 'Pending Approvals', 'Security Alerts'];
                  return !otherCategories.some(cat => al.title.toLowerCase().includes(cat.substring(0, 10).toLowerCase())) && al.type !== 'security';
                }
                return al.title.toLowerCase().includes(groupTitle.substring(0, 10).toLowerCase());
              });
              if (groupAlerts.length === 0) return null;
              
              return (
                <div key={groupTitle} className="alerts-group-box">
                  <h4 className="alerts-group-title">{groupTitle}</h4>
                  <div className="alerts-list-container">
                    {groupAlerts.map((alert) => (
                      <div key={alert.id} className={`alert-node-item alert-${alert.type}`}>
                        <div className="alert-node-main">
                          <div className="alert-icon-wrap">
                            <RenderIcon name={alert.iconName} size={14} />
                          </div>
                          <div className="alert-message-wrap">
                            <p className="alert-msg-text">{alert.message}</p>
                            <span className="alert-time-text">{alert.timestamp}</span>
                          </div>
                        </div>
                        <button className="alert-dismiss-btn" onClick={() => handleDismissAlert(alert.id)}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-panel-view" style={{ padding: 'var(--space-12) 0' }}>
              <Shield className="text-muted" size={40} />
              <h4>All systems operational</h4>
              <p>No new warnings or security anomalies reported.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 10. REPORTS & EXPORT MODAL ── */}
      <Modal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        title="Enterprise Report Generator"
        size="md"
        footer={
          <div className="modal-actions-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', width: '100%' }}>
            <Button variant="secondary" onClick={() => setShowReportsModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExportSubmit} icon={Download}>
              Generate & Download
            </Button>
          </div>
        }
      >
        <div className="report-modal-form">
          <div className="form-group-select">
            <label>Select Report Type</label>
            <select value={reportConfig.type} onChange={(e) => setReportConfig(prev => ({ ...prev, type: e.target.value }))}>
              <option value="Company Performance">Company Performance Summary</option>
              <option value="Employee Analytics">Employee Productivity Analytics</option>
              <option value="Attendance">Attendance Compliance Report</option>
              <option value="Branch Productivity">Branch Productivity Matrix</option>
              <option value="Workflow">Workflow Operational Speed</option>
            </select>
          </div>

          <div className="form-row-grid">
            <div className="form-group-select">
              <label>Branch Target</label>
              <select value={reportConfig.branch} onChange={(e) => setReportConfig(prev => ({ ...prev, branch: e.target.value }))}>
                <option value="All">All Offices</option>
                {branchesMapped.map(b => (
                  <option key={b.id || b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group-select">
              <label>Department Target</label>
              <select value={reportConfig.dept} onChange={(e) => setReportConfig(prev => ({ ...prev, dept: e.target.value }))}>
                <option value="All">All Divisions</option>
                {departmentsMapped.map(d => (
                  <option key={d.id || d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row-grid">
            <div className="form-group-select">
              <label>Start Date</label>
              <input type="date" value={reportConfig.fromDate} onChange={(e) => setReportConfig(prev => ({ ...prev, fromDate: e.target.value }))} />
            </div>
            <div className="form-group-select">
              <label>End Date</label>
              <input type="date" value={reportConfig.toDate} onChange={(e) => setReportConfig(prev => ({ ...prev, toDate: e.target.value }))} />
            </div>
          </div>

          <div className="form-group-select">
            <label>Export Format</label>
            <div className="export-format-toggles">
              {['PDF', 'Excel', 'CSV'].map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  className={`format-toggle-btn ${reportConfig.format === fmt ? 'active' : ''}`}
                  onClick={() => setReportConfig(prev => ({ ...prev, format: fmt }))}
                >
                  {fmt === 'PDF' ? 'PDF Doc (.pdf)' : fmt === 'Excel' ? 'Excel Sheet (.xlsx)' : 'Flat File (.csv)'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Post Announcement Modal ── */}
      <Modal
        isOpen={showAnnounceModal}
        onClose={() => setShowAnnounceModal(false)}
        title="Broadcast New Announcement"
        size="md"
        footer={
          <div className="modal-actions-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', width: '100%' }}>
            <Button variant="secondary" onClick={() => setShowAnnounceModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateAnnouncement} icon={Send}>
              Publish Announcement
            </Button>
          </div>
        }
      >
        <div className="announce-modal-form">
          <div className="form-group-select">
            <label>Announcement Subject Title</label>
            <input
              type="text"
              placeholder="e.g. Q2 Performance Target Reached"
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="form-group-select">
            <label>Broadcast Category</label>
            <select value={announcementForm.category} onChange={(e) => setAnnouncementForm(prev => ({ ...prev, category: e.target.value }))}>
              <option value="General">General Memo</option>
              <option value="Policies">Company Policy</option>
              <option value="Milestones">Performance Milestone</option>
              <option value="Events">Corporate Event</option>
            </select>
          </div>

          <div className="form-group-select">
            <label>Announcement Description Detail</label>
            <textarea
              rows={4}
              placeholder="Provide a detailed message description to broadcast across active channels..."
              value={announcementForm.desc}
              onChange={(e) => setAnnouncementForm(prev => ({ ...prev, desc: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── 11. QUICK ACTION BUTTONS STICKY BOTTOM DOCK ── */}
      <div className="overview-quick-dock glass">
        <button onClick={() => handleQuickActionTrigger('Add Employee')} className="quick-dock-btn" title="Add Employee">
          <UserPlus size={16} />
          <span>Add Employee</span>
        </button>
        <button onClick={() => handleQuickActionTrigger('Create Department')} className="quick-dock-btn" title="Create Department">
          <Network size={16} />
          <span>Create Dept</span>
        </button>
        <button onClick={() => handleQuickActionTrigger('Add Branch')} className="quick-dock-btn" title="Add Branch">
          <Building2 size={16} />
          <span>Add Branch</span>
        </button>
        <button onClick={() => handleQuickActionTrigger('Create Project')} className="quick-dock-btn" title="Create Project">
          <Briefcase size={16} />
          <span>Create Project</span>
        </button>
        <button onClick={() => setShowReportsModal(true)} className="quick-dock-btn" title="Generate Reports">
          <FileText size={16} />
          <span>Reports</span>
        </button>
        <button onClick={() => setShowAnnounceModal(true)} className="quick-dock-btn" title="Send Announcement">
          <Megaphone size={16} />
          <span>Announce</span>
        </button>
        <button onClick={() => {
          const el = document.querySelector('.growth-analytics-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }} className="quick-dock-btn" title="View Analytics">
          <TrendingUp size={16} />
          <span>Analytics</span>
        </button>
      </div>

      {/* ── 12. FOOTER BAR ── */}
      <footer className="overview-footer-bar card">
        <div className="footer-status-pill">
          <Shield size={14} className="text-success" />
          <span>Company Operations Running Smoothly</span>
        </div>
        <div className="footer-sync-time">
          <Clock size={12} />
          <span>Last Updated: Just Now (60s Auto-Refresh)</span>
        </div>
        <div>
          <span>Database Sync: <strong className="text-success">Connected</strong></span>
        </div>
        <div>
          <span>Cloud Backup: <strong className="text-primary-c">Successful (04:00 AM)</strong></span>
        </div>
      </footer>

    </div>
  );
};

export default Overview;
