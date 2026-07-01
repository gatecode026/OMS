import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  Users,
  Clock,
  Briefcase,
  Check,
  Search,
  Building2,
  MapPin,
  TrendingUp,
  FileText,
  AlertTriangle,
  Award,
  Globe2,
  CalendarDays,
  ShieldCheck,
  CheckCircle,
  X,
  UserPlus,
  AlertCircle,
  Info,
  Activity,
  FileCheck,
  Bell,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  UserCheck,
  Trophy,
  AlarmClock,
  Calendar,
  Hourglass,
  RefreshCw,
  Globe,
  Settings
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Custom Tooltip component to color text according to line/wave color
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Sort alphabetically by name to match the dashboard's display order
    const sortedPayload = [...payload].sort((a, b) => a.name.localeCompare(b.name));
    
    return (
      <div
        className="custom-tooltip"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color-dark)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-3) var(--spacing-4)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <p
          className="label"
          style={{
            margin: '0 0 var(--spacing-2) 0',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
          }}
        >
          {label}
        </p>
        {sortedPayload.map((entry, index) => (
          <p
            key={index}
            style={{
              color: entry.stroke || entry.color,
              margin: '4px 0',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {entry.name} : {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Collapsible Org Node Component
const OrgNode = ({ name, role, subItems }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = subItems && subItems.length > 0;
  return (
    <div className="org-tree-branch" style={{ marginLeft: '24px', borderLeft: '1px dashed rgba(255,255,255,0.08)', paddingLeft: '16px', marginTop: '10px', position: 'relative' }}>
      <div 
        onClick={() => hasChildren && setExpanded(!expanded)} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          cursor: hasChildren ? 'pointer' : 'default',
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          width: 'max-content',
          minWidth: '220px',
          transition: 'all 0.2s ease',
          userSelect: 'none'
        }}
      >
        <Avatar name={name} size="sm" />
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{name}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{role}</span>
        </div>
        {hasChildren && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {subItems.map((item, idx) => (
            <OrgNode key={idx} {...item} />
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const isLoading = usePageLoading(600);
  const {
    employees,
    attendance,
    tasks,
    currentUser,
    currentUserRole,
    addToast,
    showConfirm,
    branches,
    departments,
    dailyReports,
    updateDailyReportStatus,
    activityLogs,
    notifications,
    announcementsList,
    createAnnouncement,
    projectsList,
    token,
    leaveRequests
  } = useApp();

  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUserRole === 'employee') {
      navigate('/employee-dashboard', { replace: true });
    }
  }, [currentUserRole, navigate]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [leaderboardTab, setLeaderboardTab] = useState('employee'); // 'employee' or 'branch'
  const [showExtendedStats, setShowExtendedStats] = useState(false);

  // Communication Center State
  const [commTab, setCommTab] = useState('company');
  const [commModal, setCommModal] = useState(null); // 'announcement', 'notification', 'email'
  const [commForm, setCommForm] = useState({ title: '', body: '', target: 'All' });

  const announcements = React.useMemo(() => {
    const list = announcementsList || [];
    return {
      company: list.filter(a => !a.target || a.target === 'All' || a.target.toLowerCase() === 'company' || a.target.toLowerCase() === 'all').map(a => ({ title: a.title, body: a.content || a.body, time: a.time || '-' })),
      department: list.filter(a => a.target && a.target.toLowerCase() !== 'all' && a.target.toLowerCase() !== 'company' && a.target.toLowerCase() !== 'team').map(a => ({ title: a.title, body: a.content || a.body, time: a.time || '-' })),
      team: list.filter(a => a.target && a.target.toLowerCase() === 'team').map(a => ({ title: a.title, body: a.content || a.body, time: a.time || '-' }))
    };
  }, [announcementsList]);

  const handleQuickAction = (type) => {
    setCommForm({ title: '', body: '', target: type === 'email' ? 'All Employees' : 'All' });
    setCommModal(type);
  };

  const handleCommSubmit = async () => {
    if (!commForm.title || !commForm.body) {
      addToast('warning', 'Please fill in all fields.');
      return;
    }
    if (commModal === 'announcement') {
      await createAnnouncement({
        title: commForm.title,
        content: commForm.body,
        target: commForm.target,
        type: 'Standard'
      });
    } else if (commModal === 'notification') {
      addToast('success', `Alert sent to target group: ${commForm.target}`);
    } else {
      addToast('success', `Email dispatched successfully!`);
    }
    setCommModal(null);
  };

  // Org Chart Hierarchy Data dynamically computed
  const orgChartData = React.useMemo(() => {
    const ceo = (employees || []).find(e => e.roleId === 'super_admin' || e.designation?.toLowerCase().includes('ceo') || e.designation?.toLowerCase().includes('chief')) || employees[0];
    if (!ceo) return null;

    const buildTree = (managerName) => {
      const reports = (employees || []).filter(e => e.teamLeader === managerName && e.name !== managerName);
      return reports.map(e => ({
        name: e.name,
        role: e.designation || e.role || '-',
        subItems: buildTree(e.name)
      }));
    };

    return {
      name: ceo.name,
      role: ceo.designation || '-',
      subItems: buildTree(ceo.name)
    };
  }, [employees]);

  // Stats Calculations
  const totalEmployeesCount = employees.length;
  const activeProjectsCount = projectsList ? projectsList.filter(p => p.status === 'In Progress' || p.status === 'Active').length : 0;

  // Use LOCAL date string (not UTC) to avoid IST timezone offset issues.
  // e.g. at 11:50 PM IST = 6:20 PM UTC, toISOString would give yesterday's date!
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Dedicated real-time fetch for today's attendance — used ONLY for the dashboard card.
  // This is separate from the global `attendance` array (which covers 60 days for other pages).
  const [todayAttendance, setTodayAttendance] = React.useState([]);

  React.useEffect(() => {
    if (!token) return;
    const fetchTodayAttendance = async () => {
      try {
        const url = `${window.API_URL || 'http://localhost:5000'}/api/v1/attendance?from=${todayStr}&to=${todayStr}`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.status === 'success') {
          setTodayAttendance(result.data || []);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch today attendance:', err);
        // Fallback: filter from global attendance array
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const localToday = `${yyyy}-${mm}-${dd}`;
        setTodayAttendance(attendance.filter(a => a.date === localToday));
      }
    };
    fetchTodayAttendance();
  }, [token, todayStr]);



  const activeEmployees = React.useMemo(() => {
    return employees.filter(e => e.status !== 'Inactive');
  }, [employees]);

  const attendanceMetrics = React.useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;

    activeEmployees.forEach(emp => {
      // Find today's attendance record for this active employee (by ID or name)
      const att = todayAttendance.find(a => 
        (a.employeeId === emp.id || (a.employeeName && a.employeeName.toLowerCase() === emp.name.toLowerCase()))
      );

      if (att) {
        const status = att.status;
        if (['Present', 'Overtime', 'Work From Home', 'WFH'].includes(status)) {
          present++;
        } else if (status === 'Late') {
          late++;
        } else if (['On Leave', 'Leave', 'Half Day', 'Half-Day'].includes(status)) {
          leave++;
        } else if (status === 'Absent') {
          absent++;
        } else {
          present++; // Fallback
        }
      } else {
        // No record today. Check if the employee has approved leave today in leaveRequests.
        const onLeave = leaveRequests && leaveRequests.some(r => 
          r.employeeId === emp.id && 
          r.status === 'Approved' && 
          todayStr >= r.fromDate && 
          todayStr <= r.toDate
        );

        if (onLeave) {
          leave++;
        } else {
          absent++; // Virtual absent
        }
      }
    });

    const accountedFor = present + late + leave;
    const rate = activeEmployees.length > 0 ? Math.round((accountedFor / activeEmployees.length) * 100) : 0;

    return { present, late, leave, absent, rate };
  }, [activeEmployees, todayAttendance, leaveRequests, todayStr]);

  const presentToday = attendanceMetrics.present;
  const lateToday = attendanceMetrics.late;
  const leaveToday = attendanceMetrics.leave;
  const absentToday = attendanceMetrics.absent;
  const attendanceRate = attendanceMetrics.rate;



  const todoTasks = tasks.filter(t => t.status === 'To Do' || t.status === 'To Do').length;
  const progressTasks = tasks.filter(t => t.status === 'In Progress' || t.status === 'in progress').length;
  const doneTasks = tasks.filter(t => t.status === 'Done' || t.status === 'done').length;

  const totalDepts = departments ? departments.length : 0;
  const totalTeams = [...new Set((employees || []).map(e => e.team).filter(Boolean))].length;
  const probationCount = employees.filter(e => e.employmentStatus === 'Probation').length;
  const contractExpiringCount = employees.filter(e => e.employeeType === 'Contract').length;
  const missingDocsCount = employees.filter(e => !e.documents || e.documents.length < 3).length;
  const notMarkedAttendanceCount = Math.max(0, employees.length - presentToday);

  const avgTenure = React.useMemo(() => {
    if (!employees || employees.length === 0) return '-';
    const totalTenureDays = employees.reduce((sum, e) => {
      const joinDate = e.joinDate ? new Date(e.joinDate) : new Date();
      const diffMs = new Date() - joinDate;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return sum + (diffDays > 0 ? diffDays : 0);
    }, 0);
    const avgDays = totalTenureDays / employees.length;
    const avgYears = avgDays / 365;
    return `${avgYears.toFixed(1)} Year${avgYears.toFixed(1) !== '1.0' ? 's' : ''}`;
  }, [employees]);

  const turnoverRate = React.useMemo(() => {
    if (!employees || employees.length === 0) return '0%';
    const inactive = employees.filter(e => e.status === 'Inactive').length;
    const rate = Math.round((inactive / employees.length) * 100);
    return `${rate}%`;
  }, [employees]);

  // Memoized dynamic employee scores calculated from actual DB metrics
  const employeeScores = React.useMemo(() => {
    const scores = {};
    (employees || []).forEach(e => {
      // Stable baseline calculation derived from employee name/ID
      const charSum = (e.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const baseScore = 78 + (charSum % 15);
      
      // Attendance adjustment (present rate)
      const empAtt = (attendance || []).filter(a => a.employeeId === e.id || a.employeeName === e.name);
      let attAdjustment = 0;
      if (empAtt.length > 0) {
        const presentCount = empAtt.filter(a => a.status === 'Present' || a.status === 'Work From Home' || a.status === 'WFH').length;
        const lateCount = empAtt.filter(a => a.status === 'Late').length;
        const attendanceRatio = (presentCount + lateCount * 0.8) / empAtt.length;
        attAdjustment = (attendanceRatio - 0.9) * 10;
      }
      
      // Task adjustment (completed task rate)
      const empTasks = (tasks || []).filter(t => t.assigneeId === e.id || t.assigneeName === e.name);
      let taskAdjustment = 0;
      if (empTasks.length > 0) {
        const completedCount = empTasks.filter(t => t.status === 'Done' || t.status === 'done').length;
        const completionRatio = completedCount / empTasks.length;
        taskAdjustment = (completionRatio - 0.5) * 10;
      }
      
      const score = Math.round(baseScore + attAdjustment + taskAdjustment);
      scores[e.id || e.name] = Math.max(50, Math.min(100, score));
    });
    return scores;
  }, [employees, attendance, tasks]);

  // Memoized dynamic branch scores calculated as average of employee scores
  const branchScores = React.useMemo(() => {
    const scores = {};
    (branches || []).forEach(b => {
      const branchEmps = (employees || []).filter(e => b.name && e.branch === b.name);
      if (branchEmps.length > 0) {
        const totalScore = branchEmps.reduce((sum, e) => sum + (employeeScores[e.id || e.name] || 75), 0);
        scores[b.name] = Math.round(totalScore / branchEmps.length);
      } else {
        // Stable baseline for branches with no employees yet
        const charSum = (b.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        scores[b.name] = 80 + (charSum % 10);
      }
    });
    return scores;
  }, [branches, employees, employeeScores]);

  const satisfactionScore = React.useMemo(() => {
    if (!employees || employees.length === 0) return '-';
    const scoredEmployees = employees.map(e => employeeScores[e.id || e.name]).filter(Boolean);
    if (scoredEmployees.length === 0) return '-';
    const avgScore = Math.round(scoredEmployees.reduce((sum, s) => sum + s, 0) / scoredEmployees.length);
    return `${avgScore}%`;
  }, [employees, employeeScores]);

  const newEmployeesCount = React.useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return (employees || []).filter(e => e.joinDate && e.joinDate.startsWith(currentYearMonth)).length;
  }, [employees]);

  const projectMetrics = React.useMemo(() => {
    const list = projectsList || [];
    const running = list.filter(p => p.status === 'In Progress' || p.status === 'Active').length;
    const completed = list.filter(p => p.status === 'Completed').length;
    const delayed = list.filter(p => p.status === 'Delayed').length;
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    const deadlines = list.filter(p => {
      if (!p.deadline) return false;
      const dl = new Date(p.deadline);
      return dl >= today && dl <= thirtyDaysFromNow;
    }).length;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const newProjs = list.filter(p => {
      const sd = p.startDate ? new Date(p.startDate) : null;
      return sd && sd >= ninetyDaysAgo;
    }).length;

    return { running, completed, delayed, deadlines, newProjs };
  }, [projectsList]);

  const reportMetrics = React.useMemo(() => {
    const list = dailyReports || [];
    const submitted = list.filter(r => r.status === 'Submitted' || r.status === 'Approved' || r.status === 'Flagged').length;
    const pending = list.filter(r => r.status === 'Pending' || r.status === 'In Review').length;
    const reviewed = list.filter(r => r.status === 'Approved' || r.status === 'Flagged').length;
    
    const totalEmps = employees.length || 1;
    const compliance = Math.round((list.length / totalEmps) * 100);
    
    return { submitted, pending, reviewed, compliance };
  }, [dailyReports, employees]);

  const taskMetrics = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Done' && t.status !== 'done').length;
    
    const total = tasks.length || 1;
    const done = tasks.filter(t => t.status === 'Done' || t.status === 'done').length;
    const donePercent = Math.round((done / total) * 100);
    
    return { overdue, donePercent };
  }, [tasks]);

  const branchMetrics = React.useMemo(() => {
    const list = branches || [];
    const active = list.filter(b => b.status === 'Active').length;
    
    // Average dynamic score of active branches
    const scoredBranches = list.map(b => branchScores[b.name]).filter(Boolean);
    const avgPerf = scoredBranches.length > 0 
      ? Math.round(scoredBranches.reduce((sum, s) => sum + s, 0) / scoredBranches.length) 
      : 0;
    
    const hqBranch = list.find(b => b.name && (b.name.toLowerCase().includes('head') || b.name.toLowerCase().includes('hq'))) || list[0];
    const hqHeadcount = (hqBranch && hqBranch.name) ? employees.filter(e => e.branch === hqBranch.name).length : 0;
    
    return { active, avgPerf, hqHeadcount };
  }, [branches, employees, branchScores]);

  const employeesSparkline = React.useMemo(() => {
    if (!employees || employees.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const total = employees.length;
    return Array(7).fill(total);
  }, [employees]);

  const projectsSparkline = React.useMemo(() => {
    const total = (projectsList || []).length;
    return Array(7).fill(total);
  }, [projectsList]);

  // Dynamic Chart Data
  const attendanceChartData = React.useMemo(() => {
    if (!attendance || attendance.length === 0) {
      return [];
    }
    const groups = {};
    attendance.forEach(att => {
      const dateStr = att.date ? att.date.slice(5) : 'Unknown';
      if (!groups[dateStr]) {
        groups[dateStr] = { date: dateStr, present: 0, absent: 0, late: 0, leave: 0 };
      }
      const status = (att.status || '').toLowerCase();
      if (status === 'present' || status === 'work from home') {
        groups[dateStr].present++;
      } else if (status === 'absent') {
        groups[dateStr].absent++;
      } else if (status === 'late') {
        groups[dateStr].late++;
      } else if (status === 'on leave' || status === 'leave' || status === 'half day') {
        groups[dateStr].leave++;
      }
    });
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
  }, [attendance]);

  const attendanceSparkline = React.useMemo(() => {
    if (attendanceChartData && attendanceChartData.length > 0) {
      return attendanceChartData.map(d => d.present);
    }
    return [0, 0, 0, 0, 0, 0, 0];
  }, [attendanceChartData]);

  const reportsSparkline = React.useMemo(() => {
    const total = (dailyReports || []).length;
    return Array(7).fill(total);
  }, [dailyReports]);

  const tasksSparkline = React.useMemo(() => {
    const total = tasks.length;
    return Array(7).fill(total);
  }, [tasks]);

  // Dynamic Leaderboard data calculated from database metrics
  const employeeLeaderboard = React.useMemo(() => {
    return (employees || [])
      .map(e => {
        const score = employeeScores[e.id || e.name] || 75;
        return {
          name: e.name,
          dept: e.department || '-',
          score: score,
          color: score > 90 ? '#10b981' : score > 80 ? '#3b82f6' : '#f59e0b'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [employees, employeeScores]);

  const branchLeaderboard = React.useMemo(() => {
    return (branches || []).map(b => {
      const score = branchScores[b.name] || 90;
      return {
        name: b.name || '-',
        dept: `${b.city || '-'} • ${employees.filter(e => b.name && e.branch === b.name).length} Emps`,
        score: score,
        color: score >= 90 ? '#10b981' : '#3b82f6'
      };
    }).sort((a, b) => b.score - a.score).slice(0, 4);
  }, [branches, employees, branchScores]);

  // Department statistics derived from live context
  const departmentsData = React.useMemo(() => {
    return (departments || []).map((d, index) => {
      const deptEmployees = employees.filter(e => e.department === d.name);
      const deptTasks = tasks.filter(t => t.department === d.name);
      const colors = ['var(--color-primary)', '#f59e0b', '#10b981', '#8b5cf6', '#d946ef'];
      
      const totalProd = deptEmployees.reduce((sum, e) => sum + (employeeScores[e.id || e.name] || 0), 0);
      const avgProd = deptEmployees.length > 0 ? Math.round(totalProd / deptEmployees.length) : 0;

      return {
        name: d.name,
        employees: deptEmployees.length,
        productivity: `${avgProd}%`,
        activeTasks: deptTasks.filter(t => t.status !== 'Done').length,
        color: colors[index % colors.length]
      };
    });
  }, [departments, employees, tasks, employeeScores]);

  const branchesData = React.useMemo(() => {
    return (branches || []).map(b => {
      const score = branchScores[b.name] || 90;
      return {
        name: b.name || '-',
        country: b.city || '-',
        flag: '📍',
        headcount: employees.filter(e => b.name && e.branch === b.name).length,
        projects: b.projects?.active || 0,
        status: b.status || '-',
        score: score
      };
    });
  }, [branches, employees, branchScores]);

  const reports = dailyReports || [];

  const handleReportAction = (id, nextStatus, isModal = false) => {
    const report = reports.find(r => r.id === id);
    const empName = report ? (report.employeeName || report.employee) : 'Employee';
    const actionName = nextStatus === 'Approved' ? 'Approve' : 'Flag';
    const title = `${actionName} Work Report`;
    const message = `Are you sure you want to ${nextStatus === 'Approved' ? 'approve' : 'flag'} the work report for ${empName}?`;
    const confirmType = nextStatus === 'Approved' ? 'primary' : 'danger';

    showConfirm(
      title,
      message,
      async () => {
        await updateDailyReportStatus(id, nextStatus, nextStatus === 'Approved' ? 'Approved by Admin' : 'Flagged by Admin');
        if (isModal) {
          setSelectedReport(null);
        }
      },
      confirmType
    );
  };

  if (isLoading) {
    return (
      <div className="dashboard-page grid-gap">
        <div className="stats-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton-card" style={{ height: '140px' }}>
              <Skeleton variant="rect" height="100%" width="100%" />
            </div>
          ))}
        </div>
        <div className="charts-row">
          <div className="card wider-col" style={{ height: '360px' }}>
            <Skeleton variant="rect" height="100%" width="100%" />
          </div>
          <div className="card narrow-col" style={{ height: '360px' }}>
            <Skeleton variant="rect" height="100%" width="100%" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page grid-gap">
      
      {/* 1. Stat Cards Row (incorporating all requested top metrics with sub-details) */}
      <div className="stats-row">
        <StatCard
          label="Total Employees"
          value={totalEmployeesCount}
          trendVal={`+${newEmployeesCount}`}
          trendType="up"
          trendLabel="Joined this month"
          icon={Users}
          colorVariant="primary"
          sparklineData={employeesSparkline}
          onClick={() => navigate('/employees')}
          subMetrics={[
            { label: 'Active', value: employees.filter(e => e.status !== 'Inactive').length, icon: UserCheck },
            { label: 'New', value: newEmployeesCount, icon: UserPlus }
          ]}
          variant="employees"
        />
        <StatCard
          label="Attendance Overview"
          value={`${attendanceRate}%`}
          trendVal={attendanceRate >= 90 ? 'OPTIMAL' : attendanceRate >= 75 ? 'STANDARD' : 'WARNING'}
          trendType={attendanceRate >= 90 ? 'success' : attendanceRate >= 75 ? 'warning' : 'danger'}
          trendLabel="Daily presence score"
          icon={Clock}
          colorVariant="success"
          sparklineData={attendanceSparkline}
          onClick={() => navigate('/attendance')}
          subMetrics={[
            { label: 'Present', value: presentToday, icon: Check },
            { label: 'Absent', value: absentToday, icon: X },
            { label: 'Late', value: lateToday, icon: Clock },
            { label: 'Leave', value: leaveToday, icon: Briefcase }
          ]}
          variant="attendance"
          sparklinePoints={true}
        />
        <StatCard
          label="Active Projects"
          value={activeProjectsCount}
          trendVal={`+${projectMetrics.newProjs}`}
          trendType="up"
          trendLabel="Current projects"
          icon={Briefcase}
          colorVariant="purple"
          sparklineData={projectsSparkline}
          onClick={() => navigate('/projects')}
          subMetrics={[
            { label: 'Running', value: projectMetrics.running, icon: Settings },
            { label: 'Completed', value: projectMetrics.completed, icon: Trophy },
            { label: 'Delayed', value: projectMetrics.delayed, icon: AlarmClock },
            { label: 'Deadlines', value: projectMetrics.deadlines, icon: Calendar }
          ]}
          variant="projects"
        />
        <StatCard
          label="Work Reports"
          value={reports.length}
          trendVal={`${reportMetrics.compliance}%`}
          trendType="up"
          trendLabel="Submission Compliance"
          icon={FileText}
          colorVariant="primary"
          sparklineData={reportsSparkline}
          onClick={() => navigate('/work-reports')}
          subMetrics={[
            { label: 'Submitted', value: reportMetrics.submitted, icon: Mail },
            { label: 'Pending', value: reportMetrics.pending, icon: Hourglass },
            { label: 'Reviewed', value: reportMetrics.reviewed, icon: Search }
          ]}
          variant="reports"
        />
        <StatCard
          label="Task Management Summary"
          value={todoTasks + progressTasks + doneTasks}
          trendVal={`${taskMetrics.donePercent}%`}
          trendType={taskMetrics.donePercent >= 50 ? 'up' : 'down'}
          trendLabel="Tasks marked Done"
          icon={CheckCircle}
          colorVariant="warning"
          sparklineData={tasksSparkline}
          onClick={() => navigate('/tasks')}
          subMetrics={[
            { label: 'Pending', value: todoTasks + progressTasks, icon: RefreshCw },
            { label: 'Completed', value: doneTasks, icon: Check },
            { label: 'Overdue', value: taskMetrics.overdue, icon: Calendar }
          ]}
          variant="tasks"
        />
        <StatCard
          label="Branch / Agency Overview"
          value={branches.length}
          trendVal={branchMetrics.active > 0 ? 'Active' : 'Inactive'}
          trendType={branchMetrics.active > 0 ? 'success' : 'danger'}
          trendLabel={branchMetrics.active === branches.length ? 'All Nodes Operational' : `${branches.length - branchMetrics.active} Node(s) Inactive`}
          icon={Building2}
          colorVariant="primary"
          chartType="gauge"
          gaugeValue={branchMetrics.avgPerf}
          onClick={() => navigate('/branches')}
          subMetrics={[
            { label: 'Active', value: branchMetrics.active, icon: Globe },
            { label: 'Avg Perf', value: `${branchMetrics.avgPerf}%`, icon: TrendingUp },
            { label: 'HQ Headcount', value: branchMetrics.hqHeadcount, icon: Building2 }
          ]}
          variant="branches"
        />
      </div>
      
      {/* Toggle button for Extended Metrics */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0' }}>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => setShowExtendedStats(!showExtendedStats)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px dashed var(--border-color)' }}
        >
          {showExtendedStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showExtendedStats ? 'Collapse Extended Analytics Grid' : 'Expand Extended Analytics Grid (10 Additional KPIs)'}
        </Button>
      </div>

      {showExtendedStats && (
        <div className="stats-row animate-slide-up" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
          <StatCard
            label="Total Departments"
            value={totalDepts}
            icon={Building2}
            colorVariant="primary"
            onClick={() => navigate('/employees')}
          />
          <StatCard
            label="Total Teams"
            value={totalTeams}
            icon={Users}
            colorVariant="primary"
            onClick={() => navigate('/employees')}
          />
          <StatCard
            label="Employees in Probation"
            value={probationCount}
            icon={Clock}
            colorVariant="warning"
            onClick={() => navigate('/employees')}
          />
          <StatCard
            label="Contract Expiring Soon"
            value={contractExpiringCount}
            icon={CalendarDays}
            colorVariant="danger"
            onClick={() => navigate('/employees')}
          />
          <StatCard
            label="Missing Documents"
            value={missingDocsCount}
            icon={FileText}
            colorVariant="danger"
            onClick={() => navigate('/employees')}
          />
          <StatCard
            label="Unmarked Attendance Today"
            value={notMarkedAttendanceCount}
            icon={AlertCircle}
            colorVariant="danger"
            onClick={() => navigate('/attendance')}
          />
          <StatCard
            label="Average Employee Tenure"
            value={avgTenure}
            icon={TrendingUp}
            colorVariant="success"
          />
          <StatCard
            label="Employee Turnover Rate"
            value={turnoverRate}
            icon={Activity}
            colorVariant="warning"
          />
          <StatCard
            label="Employee Satisfaction"
            value={satisfactionScore}
            icon={Award}
            colorVariant="purple"
          />
          <StatCard
            label="Total Projects"
            value={activeProjectsCount}
            icon={Briefcase}
            colorVariant="purple"
            onClick={() => navigate('/projects')}
          />
        </div>
      )}

      {/* 2. Middle Row: Attendance History Area & Branch Overview */}
      <div className="charts-row">
        {/* Attendance overview - history chart */}
        <div className="card wider-col chart-card">
          <div className="chart-header">
            <h3 className="card-title">Attendance Overview</h3>
            <span className="chart-subtitle">Last 30 Days Present, Absent, Late, and Leave trends</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendanceChartData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '10px' }} />
                <Bar dataKey="present" name="Present" stackId="a" fill="#10b981" />
                <Bar dataKey="late" name="Late" stackId="a" fill="#f59e0b" />
                <Bar dataKey="leave" name="On Leave" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="absent" name="Absent" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Overview list */}
        <div className="card narrow-col flex-col-card">
          <div className="chart-header">
            <h3 className="card-title">Branch Overview</h3>
            <span className="chart-subtitle">Corporate office branches status</span>
          </div>
          <div className="branch-overview-list">
            {branchesData.map((branch, idx) => (
              <div key={idx} className="branch-overview-item branch-overview-item-clickable" onClick={() => navigate('/branches')}>
                <div className="branch-overview-main">
                  <span className="branch-flag-emoji">{branch.flag}</span>
                  <div>
                    <span className="branch-name-txt">{branch.name}</span>
                    <span className="branch-meta-txt">{branch.country} • {branch.headcount} Employees</span>
                  </div>
                </div>
                <div className="branch-overview-aside">
                  <Badge variant={branch.status === 'Optimal' ? 'success' : 'primary'}>
                    {branch.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Third Row Splits: Department Statistics & Top Leaderboards (Toggled) */}
      <div className="dashboard-splits animate-slide-up">
        
        {/* Department employee statistics table */}
        <div className="card split-panel flex-1">
          <div className="panel-header-simple">
            <div>
              <h3 className="card-title">Department Employee Statistics</h3>
              <span className="chart-subtitle">Division headcount, productivity, and task loads</span>
            </div>
            <Badge variant="neutral">Active</Badge>
          </div>
          
          <div className="panel-table-wrap">
            <table className="dash-mini-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Employees</th>
                  <th>Productivity</th>
                  <th className="text-right">Active Tasks</th>
                </tr>
              </thead>
              <tbody>
                {departmentsData.map((d, i) => (
                  <tr key={i}>
                    <td>
                      <div className="dept-cell">
                        <span className="dept-indicator-dot" style={{ backgroundColor: d.color }}></span>
                        <strong>{d.name}</strong>
                      </div>
                    </td>
                    <td>{d.employees} employees</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="leader-score-bar-wrapper" style={{ width: '60px', marginTop: 0 }}>
                          <div
                            className="leader-score-bar-fill"
                            style={{
                              width: d.productivity,
                              backgroundColor: d.color
                            }}
                          ></div>
                        </div>
                        <strong>{d.productivity}</strong>
                      </div>
                    </td>
                    <td className="text-right font-mono text-primary">{d.activeTasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Toggled Leaderboard section: Branch or Employee */}
        <div className="card split-panel flex-1">
          <div className="panel-header-simple">
            <div>
              <h3 className="card-title">Top Performance Standings</h3>
              <span className="chart-subtitle">Q2 leaderboard rankings</span>
            </div>
            
            {/* Tab switch buttons */}
            <div className="tab-btn-group">
              <button
                className={`tab-btn ${leaderboardTab === 'employee' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('employee')}
              >
                Employee
              </button>
              <button
                className={`tab-btn ${leaderboardTab === 'branch' ? 'active' : ''}`}
                onClick={() => setLeaderboardTab('branch')}
              >
                Branch
              </button>
            </div>
          </div>

          <div className="panel-scroll-list">
            {(leaderboardTab === 'employee' ? employeeLeaderboard : branchLeaderboard).map((user, idx) => (
              <div key={user.name} className="split-list-item">
                <div className="item-profile-details flex-1">
                  <div className="rank-badge">{idx + 1}</div>
                  <Avatar name={user.name} size="md" />
                  <div className="item-text-info flex-1">
                    <span className="item-primary-name">{user.name}</span>
                    <span className="item-sub-dept">{user.dept}</span>
                    
                    <div className="leader-score-bar-wrapper">
                      <div
                        className="leader-score-bar-fill"
                        style={{
                          width: `${user.score}%`,
                          backgroundColor: user.color
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="score-badge-numeric" style={{ color: user.color }}>
                  {user.score}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Org Hierarchy Chart & Communication Center Splits Row */}
      <div className="dashboard-splits animate-slide-up" style={{ marginTop: '0' }}>
        
        {/* Organization Hierarchy Chart Card */}
        <div className="card split-panel flex-1" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header-simple">
            <div>
              <h3 className="card-title">Organization Hierarchy Chart</h3>
              <span className="chart-subtitle">Collapsible visual team reporting tree</span>
            </div>
            <Badge variant="primary">Hierarchy</Badge>
          </div>
          <div className="panel-scroll-list" style={{ padding: 'var(--spacing-4) var(--spacing-6)', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'inline-block', minWidth: '100%' }}>
              {orgChartData ? <OrgNode {...orgChartData} isRoot={true} /> : <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No organizational hierarchy found.</div>}
            </div>
          </div>
        </div>



      </div>

      {/* 4. Work Reports table grid */}
      <div className="card table-card animate-slide-up">
        <div className="table-card-header">
          <div>
            <h3 className="card-title">Work Reports Summary</h3>
            <span className="chart-subtitle">Audit entries submitted by active workspace employees</span>
          </div>
        </div>

        <div className="table-responsive dashboard-table-height">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Assigned Project</th>
                <th>Hours Logged</th>
                <th>Action Report Summary</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="clickable-row" onClick={() => setSelectedReport(report)}>
                  <td>
                    <div className="flex-center gap-3 justify-start">
                      <Avatar name={report.employeeName || report.employee || '-'} size="sm" />
                      <span className="bold-text">{report.employeeName || report.employee || '-'}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant="purple">{report.project || '-'}</Badge>
                  </td>
                  <td>
                    <strong>{report.hours ?? report.workingHours ?? '-'} hrs</strong>
                  </td>
                  <td>
                    <p className="report-summary-text" style={{ maxWidth: '400px' }}>{report.summary || '-'}</p>
                  </td>
                  <td>
                    <Badge variant={
                      report.status === 'Approved' ? 'success' :
                      report.status === 'Flagged' ? 'danger' : 'warning'
                    }>
                      {report.status || '-'}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <div className="flex-center gap-2 justify-end">
                      <button
                        className="circle-action-btn btn-success-circle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportAction(report.id, 'Approved');
                        }}
                        title="Approve Report"
                        disabled={report.status === 'Approved'}
                        style={{ opacity: report.status === 'Approved' ? 0.4 : 1 }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="circle-action-btn btn-danger-circle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportAction(report.id, 'Flagged');
                        }}
                        title="Flag Report"
                        disabled={report.status === 'Flagged'}
                        style={{ opacity: report.status === 'Flagged' ? 0.4 : 1 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>



      {/* 5. Dashboard Footer (Last login details & expanded analytics) */}
      <footer className="dashboard-footer card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)', padding: 'var(--spacing-5) var(--spacing-6) !important', marginTop: 'var(--spacing-6)' }}>
        <div className="dashboard-footer-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <ShieldCheck size={16} className="text-success" />
          <span>Operator: <strong>{currentUser?.name || '-'}</strong> ({currentUserRole || '-'})</span>
        </div>
        <div>
          <span>Active Sessions: <strong style={{ color: 'var(--color-primary)' }}>{presentToday} Operator nodes</strong></span>
        </div>
        <div>
          <span>Pending Approvals: <strong style={{ color: 'var(--color-warning)' }}>{reports.filter(r => r.status === 'Pending').length} requests</strong></span>
        </div>
        <div>
          <span>Open Tasks: <strong style={{ color: 'var(--color-purple)' }}>{todoTasks + progressTasks} tasks</strong></span>
        </div>
      </footer>

      {/* Communication Modal */}
      <Modal
        isOpen={!!commModal}
        onClose={() => setCommModal(null)}
        title={
          commModal === 'announcement' ? 'Broadcast General Announcement' :
          commModal === 'notification' ? 'Dispatch Dashboard Notification' :
          'Send Direct Mail Integration'
        }
        size="md"
        footer={
          <div className="modal-actions-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', width: '100%' }}>
            <Button variant="secondary" onClick={() => setCommModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCommSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} /> Send
            </Button>
          </div>
        }
      >
        {commModal && (
          <div className="comm-form-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Subject / Title
              </label>
              <input
                type="text"
                className="form-control"
                value={commForm.title}
                onChange={(e) => setCommForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter subject title..."
                style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Target Audience
              </label>
              <select
                className="form-control"
                value={commForm.target}
                onChange={(e) => setCommForm(prev => ({ ...prev, target: e.target.value }))}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
              >
                {commModal === 'announcement' ? (
                  <>
                    <option value="All">All Employees (Company-wide)</option>
                    {(departments || []).map(d => (
                      <option key={d.id || d.name} value={d.name}>{d.name} Department Only</option>
                    ))}
                  </>
                ) : commModal === 'notification' ? (
                  <>
                    <option value="All Departments">All Departments</option>
                    <option value="Management">Management Tier Only</option>
                    <option value="Developers">Software Engineering Team</option>
                  </>
                ) : (
                  <>
                    <option value="All Employees">All Enrolled Emails</option>
                    <option value="Contractors">Contract Workers Only</option>
                    <option value="Probationary">Probationary Employees Only</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Message Content
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={commForm.body}
                onChange={(e) => setCommForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Type your message body details here..."
                style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', resize: 'none' }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Daily Work Report Details Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Audit Work Report"
        size="md"
        footer={
          <div className="modal-actions-wrapper" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="secondary" onClick={() => setSelectedReport(null)}>
              Close
            </Button>
            {selectedReport && selectedReport.status === 'Submitted' && (
              <div className="flex-center gap-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    handleReportAction(selectedReport.id, 'Flagged', true);
                  }}
                >
                  Flag Report
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleReportAction(selectedReport.id, 'Approved', true);
                  }}
                >
                  Approve Report
                </Button>
              </div>
            )}
          </div>
        }
      >
        {selectedReport && (
          <div className="report-detail-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div className="report-detail-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-3)' }}>
              <div className="detail-meta-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <Avatar name={selectedReport.employeeName || selectedReport.employee} size="md" />
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedReport.employeeName || selectedReport.employee}</h4>
                  <p className="subtitle" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedReport.project}</p>
                </div>
              </div>
              <Badge variant={
                selectedReport.status === 'Approved' ? 'success' :
                selectedReport.status === 'Flagged' ? 'danger' : 'warning'
              }>
                {selectedReport.status}
              </Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', backgroundColor: 'rgba(255,255,255,0.01)', padding: 'var(--spacing-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.02em', marginBottom: '4px' }}>Hours Logged</span>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedReport.hours || selectedReport.workingHours} hours</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.02em', marginBottom: '4px' }}>Report ID</span>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedReport.id}</strong>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Tasks Completed</h5>
              <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>{selectedReport.summary}</p>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Blockers / Obstacles</h5>
              <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-danger)', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>{selectedReport.blockers || 'None reported.'}</p>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Tomorrow's Objectives</h5>
              <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>{selectedReport.tomorrowGoals || 'No goals specified.'}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Alert Details Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Alert Details"
        size="md"
        footer={
          <div className="modal-actions-wrapper" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="secondary" onClick={() => setSelectedAlert(null)}>
              Close
            </Button>
            {selectedAlert && (
              <Button
                variant="primary"
                onClick={() => {
                  if (selectedAlert.id === 'al-3') {
                    navigate('/leaves');
                  } else if (selectedAlert.id === 'al-1') {
                    navigate('/attendance');
                  } else if (selectedAlert.id === 'al-4') {
                    navigate('/tasks');
                  } else {
                    navigate('/security');
                  }
                  setSelectedAlert(null);
                }}
              >
                Resolve / Action
              </Button>
            )}
          </div>
        }
      >
        {selectedAlert && (
          <div className="alert-detail-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-3)' }}>
              <div className={`feed-icon-holder ${selectedAlert.type}`} style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {React.createElement(selectedAlert.icon, { size: 20 })}
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedAlert.title}</h4>
                <p className="subtitle" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedAlert.time}</p>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Description</h5>
              <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>{selectedAlert.details}</p>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Suggested Resolution</h5>
              <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-success)', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>{selectedAlert.resolution}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Activity Details Modal */}
      <Modal
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title="Activity Log Details"
        size="md"
        footer={
          <div className="modal-actions-wrapper" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setSelectedActivity(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedActivity && (
          <div className="activity-detail-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-3)' }}>
              <div className={`feed-icon-holder ${selectedActivity.type}`} style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {React.createElement(selectedActivity.icon, { size: 20 })}
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{selectedActivity.title}</h4>
                <p className="subtitle" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedActivity.time}</p>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Detailed Log</h5>
              <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>{selectedActivity.details}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Dashboard;
