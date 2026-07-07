import React, { useState, useMemo } from 'react';
import './Performance.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import SlideOver from '../components/common/SlideOver';
import Skeleton from '../components/common/Skeleton';
import { getBaseRole } from '../permissions/permissions';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Award, Target, TrendingUp, BarChart3, ChevronDown, ChevronUp, Star, Zap, AlertTriangle, Search,
  Plus, Download, Users, CheckCircle, MessageSquare, Calendar, ShieldAlert, Trash2, Eye, Activity,
  SlidersHorizontal, RefreshCw, X, Briefcase, Shield, Volume2, FileText, Check, Settings, Play, ThumbsUp, AlertCircle
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
   ENTERPRISE PERFORMANCE MANAGEMENT
   ═══════════════════════════════════════════════════════════ */



const Performance = () => {
  const {
    token,
    employees: contextEmployees,
    updateEmployee,
    addToast,
    departments: contextDepartments,
    branches,
    appraisalReviews,
    addAppraisalReview,
    notifications,
    activityLogs,
    addActivityLog,
    projectsList,
    addNotification,
    markAllNotificationsRead,
    currentUserRole,
    tasks = [],
    attendance = [],
    currentUserId
  } = useApp();
  const currentUser = useMemo(() => (contextEmployees || []).find(e => e.id === currentUserId), [contextEmployees, currentUserId]);
  const isGlobalRole = useMemo(() => {
    const base = getBaseRole(currentUserRole);
    return base === 'super_admin' || base === 'company_admin' || base === 'hr';
  }, [currentUserRole]);
  const departments = useMemo(() => (contextDepartments || []).filter(d => d.status === 'Active'), [contextDepartments]);
  const isLoading = usePageLoading(800);

  const mappedUserRole = useMemo(() => {
    switch (currentUserRole) {
      case 'employee': return 'Employee';
      case 'team_leader': return 'Team Leader';
      case 'manager':
      case 'dept_admin':
      case 'project_manager':
      case 'department_manager':
        return 'Department Manager';
      case 'branch_admin':
      case 'hr_admin':
        return 'HR/Admin';
      case 'super_admin':
      default:
        return 'Super Admin';
    }
  }, [currentUserRole]);

  /* Simulated view perspective */
  const [userRole, setUserRole] = useState(mappedUserRole);

  React.useEffect(() => {
    setUserRole(mappedUserRole);
  }, [mappedUserRole]);

  /* Sub-Navigation workspace tabs */
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, directory, framework, goals, reviews, pips, audits

  /* Weights framework states */
  const [weights, setWeights] = useState({
    productivity: 30,
    attendance: 20,
    efficiency: 20,
    quality: 30
  });

  /* Recalculate employee KPI scores based on weights config */
  const calculateFinalScore = (emp, currentWeights) => {
    const divisor = currentWeights.productivity + currentWeights.attendance + currentWeights.efficiency + currentWeights.quality;
    if (divisor === 0) return 0;
    const finalVal = (
      (emp.productivity * currentWeights.productivity) +
      (emp.attendance * currentWeights.attendance) +
      (emp.efficiency * currentWeights.efficiency) +
      (emp.quality * currentWeights.quality)
    ) / divisor;
    return Math.round(finalVal);
  };

  /* Master States */
  const [employees, setEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Sync employees from context
  React.useEffect(() => {
    if (contextEmployees) {
      const mapped = (contextEmployees || []).map(emp => {
        const empTasks = (tasks || []).filter(task => task.assigneeId === emp.id);
        const tasksAssigned = empTasks.length;
        const tasksCompleted = empTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length;
        
        let productivity = emp.productivityScore || 0;
        if (tasksAssigned > 0) {
          productivity = Math.round((tasksCompleted / tasksAssigned) * 100);
        }
        
        let attendancePct = emp.performanceScore?.attendance || 0;
        if (attendancePct === 0) {
          const empAtts = (attendance || []).filter(att => att.employeeId === emp.id);
          if (empAtts.length > 0) {
            const present = empAtts.filter(att => ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Punched In'].includes(att.status)).length;
            attendancePct = Math.round((present / empAtts.length) * 100);
          } else {
            attendancePct = ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Punched In'].includes(emp.todayPunchStatus) ? 100 : 0;
          }
        }
        
        const efficiency = emp.efficiency ?? (productivity > 0 ? productivity : 80);
        const quality = emp.quality ?? (productivity > 0 ? productivity : 80);
        
        const mappedEmp = {
          ...emp,
          productivity,
          attendance: attendancePct,
          attendancePct,
          efficiency,
          quality,
          tasksAssigned,
          tasksCompleted
        };
        
        mappedEmp.kpiScore = calculateFinalScore(mappedEmp, weights);
        return mappedEmp;
      });
      setEmployees(mapped);
    }
  }, [contextEmployees, tasks, attendance, weights]);

  // Sync reviews from context
  React.useEffect(() => {
    if (appraisalReviews) {
      setReviews(appraisalReviews);
    }
  }, [appraisalReviews]);

  const alerts = useMemo(() => {
    return (notifications || []).map(n => ({
      id: n.id || n._id,
      message: n.message || n.title || '',
      type: n.type || 'Performance',
      read: n.read || false,
      date: n.time || 'Just now'
    }));
  }, [notifications]);

  const auditLogs = useMemo(() => {
    return (activityLogs || []).map(log => ({
      id: log.id,
      timestamp: log.timestamp || 'Just now',
      user: log.actor || 'System User',
      action: log.actionType || 'Action Logged',
      target: log.fieldChanged || '—',
      oldVal: log.oldValue || '—',
      newVal: log.newValue || '—'
    }));
  }, [activityLogs]);

  // Derived Performance Charts / Rankings Datasets
  const DEPT_PERF_DATA = useMemo(() => {
    return (departments || []).map(d => {
      const deptEmployees = employees.filter(e => {
        if (e.department !== d.name) return false;
        if (!isGlobalRole && currentUser && currentUser.branch && e.branch !== currentUser.branch) return false;
        return true;
      });
      const totalScore = deptEmployees.reduce((sum, e) => sum + (e.productivity || 0), 0);
      const avg = deptEmployees.length > 0 ? Math.round(totalScore / deptEmployees.length) : 0;
      return {
        name: d.name,
        score: avg,
        color: d.color || 'var(--color-primary)'
      };
    });
  }, [departments, employees, isGlobalRole, currentUser]);

  const MONTHLY_TREND_DYNAMIC = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const deptList = (departments || []).map(d => d.name);
    
    // Calculate current scores for each department
    const currentDeptScores = {};
    (departments || []).forEach(d => {
      currentDeptScores[d.name] = d.avgPerformance || d.productivity || 80;
    });

    return months.map((month, idx) => {
      const monthData = { month };
      let sum = 0;
      let count = 0;
      
      deptList.forEach(deptName => {
        const baseScore = currentDeptScores[deptName] || 80;
        // Project historically: subtract some variance for earlier months
        const projectedScore = Math.max(50, Math.min(100, Math.round(baseScore - (5 - idx) * 2 + (idx % 2 === 0 ? 1 : -1))));
        monthData[deptName] = projectedScore;
        sum += projectedScore;
        count++;
      });
      
      monthData.overall = count > 0 ? Math.round(sum / count) : 80;
      return monthData;
    });
  }, [departments]);

  const BRANCH_RANKINGS = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (branches || []).map(b => {
      const bName = (b.name || '').trim().toLowerCase();
      const branchEmployees = (contextEmployees || []).filter(emp =>
        (emp.branch || '').trim().toLowerCase() === bName
      );
      
      const branchEmpIds = new Set(branchEmployees.map(e => e.id));
      const branchTasks = (tasks || []).filter(t => branchEmpIds.has(t.assigneeId));
      const calculatedProductivity = branchTasks.length > 0
        ? Math.round(branchTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length / branchTasks.length * 100)
        : (branchEmployees.length > 0
          ? Math.round(branchEmployees.reduce((sum, emp) => sum + (emp.productivityScore || 0), 0) / branchEmployees.length)
          : 0);

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
            ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Punched In'].includes(e.todayPunchStatus)
          ).length;
          calculatedAttendance = Math.round((presentCount / activeBranchEmps.length) * 100);
        } else {
          calculatedAttendance = b.attendance || b.attendanceRate || 0;
        }
      }

      return {
        name: b.name,
        score: calculatedProductivity,
        successRate: calculatedAttendance,
        color: b.color || 'var(--color-primary)'
      };
    });
  }, [branches, contextEmployees, tasks, attendance, isGlobalRole, currentUser]);

  const branchSubtitle = useMemo(() => {
    const names = (branches || []).map(b => b.name).slice(0, 3).join(' vs ');
    return `${names || 'Branch Offices'} overall performance metrics.`;
  }, [branches]);

  const PROJECT_RANKINGS = useMemo(() => {
    return (projectsList || []).map(p => ({
      name: p.name,
      manager: p.leader || p.manager || 'Unassigned',
      progress: p.progress || 0,
      score: p.productivity || p.kpiScore || 0
    }));
  }, [projectsList]);

  const COMPETENCY_RADAR = useMemo(() => {
    const branchEmployeesList = employees.filter(e => {
      if (!isGlobalRole && currentUser && currentUser.branch && e.branch !== currentUser.branch) return false;
      return true;
    });

    if (!branchEmployeesList || branchEmployeesList.length === 0) {
      return [
        { subject: 'Productivity', score: 0, fullMark: 100 },
        { subject: 'Attendance', score: 0, fullMark: 100 },
        { subject: 'Efficiency', score: 0, fullMark: 100 },
        { subject: 'Quality', score: 0, fullMark: 100 },
        { subject: 'Collaboration', score: 0, fullMark: 100 }
      ];
    }
    const count = branchEmployeesList.length;
    const avgProd = Math.round(branchEmployeesList.reduce((s, e) => s + (e.productivity || 0), 0) / count);
    const avgAtt = Math.round(branchEmployeesList.reduce((s, e) => s + (e.attendance || e.attendancePct || 0), 0) / count);
    const avgEff = Math.round(branchEmployeesList.reduce((s, e) => s + (e.efficiency || 0), 0) / count);
    const avgQual = Math.round(branchEmployeesList.reduce((s, e) => s + (e.quality || 0), 0) / count);
    
    const avgCollab = reviews.length > 0 
      ? Math.round(reviews.reduce((s, r) => s + (r.rating === 'Outstanding' ? 95 : r.rating === 'Excellent' ? 88 : r.rating === 'Good' ? 80 : 70), 0) / reviews.length) 
      : 80;
      
    return [
      { subject: 'Productivity', score: avgProd, fullMark: 100 },
      { subject: 'Attendance', score: avgAtt, fullMark: 100 },
      { subject: 'Efficiency', score: avgEff, fullMark: 100 },
      { subject: 'Quality', score: avgQual, fullMark: 100 },
      { subject: 'Collaboration', score: avgCollab, fullMark: 100 }
    ];
  }, [employees, reviews, isGlobalRole, currentUser]);

  // No goals or pips fetches required



  /* Search, Filters, and Sorting */
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  React.useEffect(() => {
    if (!isGlobalRole && currentUser && currentUser.branch) {
      setBranchFilter(currentUser.branch);
    }
  }, [isGlobalRole, currentUser]);
  const [sortCol, setSortCol] = useState('kpiScore');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  /* Slider configurations editor states */
  const [editWeights, setEditWeights] = useState({ ...weights });

  /* Slide-over employee detailed review profile */
  const [selectedEmp, setSelectedEmp] = useState(null);

  /* Appraisal Review form states */
  const [reviewForm, setReviewForm] = useState({
    employeeName: '', type: 'Quarterly', period: 'Q2 2026', rating: 'Excellent',
    notes: '', feedback: '', recommendations: ''
  });

  /* Simulated reports export action state */
  const [exporting, setExporting] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Helper functions cleaned up

  /* Appraisal Review submission */
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.employeeName.trim() || !reviewForm.notes.trim()) {
      addToast('danger', 'Please select an employee and provide appraisal review notes.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await addAppraisalReview({
        employeeName: reviewForm.employeeName,
        type: reviewForm.type,
        period: reviewForm.period,
        rating: reviewForm.rating,
        notes: reviewForm.notes,
        feedback: reviewForm.feedback,
        recommendations: reviewForm.recommendations
      });

      // Mappings rating to numeric quality score
      let mappedQuality = 80;
      if (reviewForm.rating === 'Outstanding') mappedQuality = 100;
      else if (reviewForm.rating === 'Excellent') mappedQuality = 92;
      else if (reviewForm.rating === 'Good') mappedQuality = 84;
      else if (reviewForm.rating === 'Average') mappedQuality = 72;
      else if (reviewForm.rating === 'Needs Improvement') mappedQuality = 55;

      // Update selected employee quality and final score
      const emp = employees.find(e => e.name === reviewForm.employeeName);
      if (emp && updateEmployee) {
        await updateEmployee(emp.id, {
          quality: mappedQuality,
          lastReviewDate: new Date().toISOString().split('T')[0]
        });
      }

      // Reset Review form
      setReviewForm({
        employeeName: '', type: 'Quarterly', period: 'Q2 2026', rating: 'Excellent',
        notes: '', feedback: '', recommendations: ''
      });

      // Close detail drawer if active
      setSelectedEmp(null);
    } catch (err) {
      console.error('Failed to submit appraisal review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // PIP handlers cleaned up

  /* Export Action */
  const triggerExport = (fmt) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      addToast('success', `KPI & Performance analytics report exported successfully in ${fmt} format.`);
    }, 1500);
  };

  /* ── Derived Statistics ───────────────────────────────────── */
  const stats = useMemo(() => {
    // Filter to role view
    const visibleEmployees = employees.filter(e => {
      if (userRole === 'Employee') return e.id === currentUserId;
      if (!isGlobalRole && currentUser && currentUser.branch && e.branch !== currentUser.branch) return false;
      return true;
    });

    const totalCount = visibleEmployees.length;
    const avgOverallScore = totalCount > 0 
      ? Math.round(visibleEmployees.reduce((s, r) => s + r.kpiScore, 0) / totalCount) 
      : 0;
    const avgProductivity = totalCount > 0 
      ? Math.round(visibleEmployees.reduce((s, r) => s + r.productivity, 0) / totalCount) 
      : 0;
    const avgAttendance = totalCount > 0 
      ? Math.round(visibleEmployees.reduce((s, r) => s + r.attendancePct, 0) / totalCount) 
      : 0;

    const completedTasks = visibleEmployees.reduce((s, r) => s + r.tasksCompleted, 0);
    const assignedTasks = visibleEmployees.reduce((s, r) => s + r.tasksAssigned, 0);
    const taskCompletionRate = assignedTasks > 0 ? Math.round((completedTasks / assignedTasks) * 100) : 0;

    const reviewsCompletedCount = reviews.length;

    // Calculate project success rate as average project progress
    const totalProjProgress = (projectsList || []).reduce((sum, p) => sum + (p.progress || 0), 0);
    const projectSuccessRate = (projectsList || []).length > 0 ? (totalProjProgress / projectsList.length).toFixed(1) : '0.0';

    // Calculate top performing department based on average employee productivity
    const deptPerformance = (departments || []).map(d => {
      const deptEmployees = employees.filter(e => e.department === d.name);
      const totalProd = deptEmployees.reduce((sum, e) => sum + (e.productivity || 0), 0);
      const avg = deptEmployees.length > 0 ? Math.round(totalProd / deptEmployees.length) : 0;
      return { name: d.name, score: avg };
    });
    const sortedDepts = [...deptPerformance].sort((a, b) => b.score - a.score);
    const topDeptName = sortedDepts.length > 0 && sortedDepts[0].score > 0 ? sortedDepts[0].name : 'N/A';
    const topDeptScore = sortedDepts.length > 0 && sortedDepts[0].score > 0 ? sortedDepts[0].score : 0;

    return {
      avgOverallScore,
      avgProductivity,
      taskCompletionRate,
      avgAttendance,
      reviewsCompletedCount,
      projectSuccessRate,
      topDeptName,
      topDeptScore
    };
  }, [employees, reviews, userRole, projectsList, departments, isGlobalRole, currentUser]);

  /* ── Filtered & Sorted Employees list ────────────────────── */
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Perspective lockdown
      if (userRole === 'Employee' && emp.id !== currentUserId) return false;

      // Search Query match
      const query = searchQuery.toLowerCase();
      if (searchQuery) {
        const matchesName = emp.name.toLowerCase().includes(query);
        const matchesId = emp.id.toLowerCase().includes(query);
        const matchesDesignation = emp.designation.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDesignation) return false;
      }

      // Department Filter
      if (deptFilter !== 'All' && emp.department !== deptFilter) return false;

      // Status Filter
      if (statusFilter !== 'All' && emp.status !== statusFilter) return false;

      // Branch Filter
      if (branchFilter !== 'All' && emp.branch !== branchFilter) return false;

      // Rating Filter
      if (ratingFilter !== 'All') {
        if (ratingFilter === 'Outstanding' && emp.kpiScore < 95) return false;
        if (ratingFilter === 'Excellent' && (emp.kpiScore < 85 || emp.kpiScore >= 95)) return false;
        if (ratingFilter === 'Good' && (emp.kpiScore < 75 || emp.kpiScore >= 85)) return false;
        if (ratingFilter === 'Average' && (emp.kpiScore < 60 || emp.kpiScore >= 75)) return false;
        if (ratingFilter === 'Needs Improvement' && emp.kpiScore >= 60) return false;
      }

      return true;
    });
  }, [employees, searchQuery, deptFilter, statusFilter, branchFilter, ratingFilter, userRole]);

  /* Sorted employees */
  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
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
  }, [filteredEmployees, sortCol, sortDir]);

  /* Paginated list */
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return sortedEmployees.slice(start, start + itemsPerPage);
  }, [sortedEmployees, page]);

  const totalPages = Math.max(1, Math.ceil(sortedEmployees.length / itemsPerPage));

  /* Determine performance rating label based on score */
  const getRatingLabel = (score) => {
    if (score >= 95) return 'Outstanding';
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    return 'Needs Improvement';
  };

  const getRatingBadgeVariant = (rating) => {
    switch (rating) {
      case 'Outstanding': return 'success';
      case 'Excellent': return 'info';
      case 'Good': return 'primary';
      case 'Average': return 'warning';
      default: return 'danger';
    }
  };

  const simulatedEmp = useMemo(() => {
    return employees[0] || {
      name: 'Sample Employee',
      productivity: 95,
      attendance: 95,
      efficiency: 90,
      quality: 95
    };
  }, [employees]);

  /* Loading State */
  if (isLoading) {
    return (
      <div className="performance-page animate-fade-in">
        <div style={{ height: '70px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="perf-stats-grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card perf-stat-card" style={{ height: 110 }}><Skeleton variant="rect" height="100%" /></div>)}</div>
        <div className="card" style={{ height: 400 }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="performance-page animate-fade-in">
      
      {/* ── HEADER ── */}
      <div className="perf-header flex-row justify-between flex-wrap gap-4">
        <div className="perf-title-section">
          <h2>Performance & KPI Analytics</h2>
          <p className="perf-subtitle">Track organizational competency indexes and appraisal reviews.</p>
        </div>

        {/* Dynamic Role Selector / Perspective */}
        <div className="flex-center gap-3 flex-wrap">

          <Button variant="ghost" size="sm" icon={Download} onClick={() => triggerExport('CSV')}>
            {exporting ? 'Exporting...' : 'Export Results'}
          </Button>

          {/* HR/Admin and Super Admin can schedule review directly */}
          {(userRole === 'Super Admin' || userRole === 'HR/Admin' || userRole === 'Department Manager') && (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setActiveTab('reviews')}>
              Schedule Appraisal Review
            </Button>
          )}
        </div>
      </div>

      {/* ── SUB-NAVIGATION TABS ── */}
      <div className="perf-tabs-bar">
        {[
          { id: 'dashboard', label: 'Executive Dashboard', icon: <BarChart3 size={15} />, visible: true },
          { id: 'directory', label: 'Rankings Directory', icon: <Users size={15} />, visible: true },
          { id: 'reviews', label: 'Appraisal Reviews', icon: <Star size={15} />, visible: true }
        ].filter(t => t.visible).map(t => (
          <button
            key={t.id}
            className={`perf-tab-btn ${activeTab === t.id ? 'active' : ''}`}
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

      {/* ── TAB 1: EXECUTIVE DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div className="flex-column gap-5 animate-slide-up">
          
          {/* Dashboard cards ribbon */}
          <div className="perf-stats-grid">
            <div className="card perf-stat-card border-left-success">
              <span className="card-lbl-gray">Overall Score</span>
              <div className="card-value-display text-success">{stats.avgOverallScore}%</div>
              <span className="card-sub-desc">↑ 4% vs previous period</span>
            </div>

            <div className="card perf-stat-card border-left-blue">
              <span className="card-lbl-gray">Avg Productivity</span>
              <div className="card-value-display text-blue">{stats.avgProductivity}%</div>
              <span className="card-sub-desc">Tasks completion basis</span>
            </div>

            <div className="card perf-stat-card border-left-teal">
              <span className="card-lbl-gray">Task Completion Rate</span>
              <div className="card-value-display text-teal">{stats.taskCompletionRate}%</div>
              <span className="card-sub-desc">On-time metrics ratio</span>
            </div>

            <div className="card perf-stat-card border-left-warning">
              <span className="card-lbl-gray">Attendance Rating</span>
              <div className="card-value-display text-warning">{stats.avgAttendance}%</div>
              <span className="card-sub-desc">Present roster index</span>
            </div>
          </div>

          <div className="perf-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div className="card perf-stat-card border-left-purple">
              <span className="card-lbl-gray">Project Success Rate</span>
              <div className="card-value-display text-purple">{stats.projectSuccessRate}%</div>
              <span className="card-sub-desc">Sprint delivery target</span>
            </div>

            <div className="card perf-stat-card border-left-orange">
              <span className="card-lbl-gray">Top Performing Dept</span>
              <div className="card-value-display text-orange">{stats.topDeptName}</div>
              <span className="card-sub-desc">Score: {stats.topDeptScore}% this month</span>
            </div>

            <div className="card perf-stat-card border-left-blue">
              <span className="card-lbl-gray">Appraisal Reviews</span>
              <div className="card-value-display text-blue">{stats.reviewsCompletedCount} Logs</div>
              <span className="card-sub-desc">Completed evaluations</span>
            </div>
          </div>

          {/* KPI Charts Row */}
          <div className="perf-kpi-charts-wrapper">
            <div className="card padding-5">
              <span className="perf-chart-title">Organisation Performance Trends</span>
              <p className="subtitle" style={{ marginBottom: 12 }}>Monthly competency tracking comparison across active departments.</p>
              <div className="reports-chart-container" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MONTHLY_TREND_DYNAMIC}>
                    <defs>
                      <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} domain={[60, 100]} />
                    <Tooltip {...CHART_TT} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                    <Area type="monotone" name="Overall Index" dataKey="overall" stroke="var(--color-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOverall)" />
                    {(departments || []).map((d, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#d946ef'];
                      const strokeColor = d.color || colors[index % colors.length];
                      return (
                        <Line
                          key={d.name}
                          type="monotone"
                          name={d.name}
                          dataKey={d.name}
                          stroke={strokeColor}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card padding-5">
              <span className="perf-chart-title">Global Competency Radar Matrix</span>
              <p className="subtitle" style={{ marginBottom: 12 }}>Avg capability parameters calculated across all active teams.</p>
              <div className="reports-chart-container" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={COMPETENCY_RADAR}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="subject" stroke="var(--text-muted)" fontSize={10} />
                    <Tooltip {...CHART_TT} />
                    <Radar name="Averages Score" dataKey="score" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.15} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="perf-kpi-charts-wrapper">
            {/* Department Comparative Bar Chart */}
            <div className="card padding-5">
              <span className="perf-chart-title">Department Productivity Scores</span>
              <p className="subtitle" style={{ marginBottom: 12 }}>Actual benchmark efficiency scores recorded this month.</p>
              <div className="reports-chart-container" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEPT_PERF_DATA} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} domain={[0, 100]} />
                    <Tooltip {...CHART_TT} />
                    <Bar name="Efficiency Score (%)" dataKey="score" radius={[4, 4, 0, 0]}>
                      {DEPT_PERF_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Branch rankings comparative chart */}
            {isGlobalRole && (
              <div className="card padding-5">
                <span className="perf-chart-title">Branch Success & Performance Index</span>
                <p className="subtitle" style={{ marginBottom: 12 }}>{branchSubtitle}</p>
                <div className="reports-chart-container" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={BRANCH_RANKINGS} barSize={18} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="var(--text-muted)" fontSize={10} domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={10} width={80} />
                      <Tooltip {...CHART_TT} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                      <Bar name="Overall Score" dataKey="score" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                      <Bar name="Project Success Rate" dataKey="successRate" fill="var(--accent-blue-solid)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Project performance scoreboard */}
          <div className="card padding-5">
            <span className="perf-chart-title">Key Projects Delivery Status & Performance</span>
            <p className="subtitle" style={{ marginBottom: 10 }}>Track milestone progress and overall team performance.</p>
            <div className="reports-table-wrap">
              <table className="perf-data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Manager Assigned</th>
                    <th>Progress</th>
                    <th>Delivery KPI</th>
                    <th>Status Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECT_RANKINGS.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.manager}</td>
                      <td>
                        <div className="flex-center gap-2 justify-start">
                          <div className="progress-bar-mini" style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                            <div style={{ width: `${p.progress}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '3px' }} />
                          </div>
                          <span>{p.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{p.score}%</span>
                      </td>
                      <td>
                        <Badge variant={p.score >= 90 ? 'success' : p.score >= 85 ? 'primary' : 'warning'}>
                          {p.score >= 90 ? 'Outstanding' : p.score >= 85 ? 'Optimal' : 'Needs Sync'}
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

      {/* ── TAB 2: RANKINGS DIRECTORY ── */}
      {activeTab === 'directory' && (
        <div className="card flex-column padding-0 animate-slide-up">
          
          {/* Controls Filter Bar */}
          <div className="reports-control-toolbar flex-row justify-between flex-wrap gap-3">
            
            {/* Left Search and Filters */}
            <div className="flex-center gap-2 flex-wrap">
              <div className="reports-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search name, ID, position..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>

              {userRole !== 'Employee' && (
                <>
                  <select
                    value={deptFilter}
                    onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                    className="reports-select-filter"
                  >
                    <option value="All">All Departments</option>
                    {(departments || []).map(d => (
                      <option key={d.id || d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>

                  {isGlobalRole && (
                    <select
                      value={branchFilter}
                      onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
                      className="reports-select-filter"
                    >
                      <option value="All">All Branches</option>
                      {(branches || []).map(b => (
                        <option key={b.id || b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  )}

                  <select
                    value={ratingFilter}
                    onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
                    className="reports-select-filter"
                  >
                    <option value="All">All Ratings</option>
                    <option>Outstanding</option>
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Average</option>
                    <option>Needs Improvement</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="reports-select-filter"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active Status</option>
                    <option value="On Leave">On Leave</option>
                    <option value="PIP">Under PIP</option>
                  </select>
                </>
              )}

              {(searchQuery || deptFilter !== 'All' || ratingFilter !== 'All' || branchFilter !== (isGlobalRole ? 'All' : (currentUser?.branch || 'All')) || statusFilter !== 'All') && (
                <Button variant="ghost" size="xs" onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('All');
                  setRatingFilter('All');
                  setBranchFilter(!isGlobalRole && currentUser && currentUser.branch ? currentUser.branch : 'All');
                  setStatusFilter('All');
                  setPage(1);
                }}>
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Right Export indicator */}
            <div className="flex-center gap-2">
              <span className="pagination-info-text">Found {sortedEmployees.length} employee records</span>
            </div>
          </div>

          {/* Directory Data Table */}
          <div className="reports-table-wrap">
            <table className="perf-data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Rank</th>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Department & Designation</th>
                  <th>Roster Branch</th>
                  <th>Attendance %</th>
                  <th>Task Progress</th>
                  <th>Productivity Score</th>
                  <th>Overall KPI Score</th>
                  <th>Performance Rating</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.length > 0 ? paginatedEmployees.map((emp, i) => {
                  const globalRank = sortedEmployees.findIndex(e => e.id === emp.id) + 1;
                  const rating = getRatingLabel(emp.kpiScore);
                  
                  return (
                    <tr key={emp.id} className={emp.status === 'PIP' ? 'pip-alert-row' : ''}>
                      <td style={{ fontWeight: 700 }}>
                        {globalRank === 1 ? '🥇 1st' : globalRank === 2 ? '🥈 2nd' : globalRank === 3 ? '🥉 3rd' : `#${globalRank}`}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.id}</td>
                      <td>
                        <div className="flex-center gap-2 justify-start">
                          <Avatar name={emp.name} size="sm" />
                          <strong>{emp.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="table-dept-text">{emp.department}</span>
                        <span className="table-sub-text">{emp.designation}</span>
                      </td>
                      <td>{emp.branch}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{emp.attendancePct}%</span>
                      </td>
                      <td>
                        <span className="table-dept-text">Done: {emp.tasksCompleted} / {emp.tasksAssigned}</span>
                        <span className="table-sub-text">Rate: {Math.round((emp.tasksCompleted / Math.max(1, emp.tasksAssigned)) * 100)}%</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{emp.productivity}%</span>
                      </td>
                      <td>
                        <div className="flex-center gap-2 justify-start">
                          <div className="progress-bar-mini" style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                            <div
                              style={{
                                width: `${emp.kpiScore}%`,
                                height: '100%',
                                background: emp.kpiScore >= 90 ? 'var(--color-success)' : emp.kpiScore >= 75 ? 'var(--color-primary)' : 'var(--color-warning)',
                                borderRadius: '3px'
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 800 }}>{emp.kpiScore}%</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={getRatingBadgeVariant(rating)}>{rating}</Badge>
                      </td>
                      <td>
                        <Badge variant={emp.status === 'Active' ? 'success' : emp.status === 'On Leave' ? 'warning' : 'danger'}>
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={Eye}
                          onClick={() => {
                            setSelectedEmp(emp);
                            setReviewForm(prev => ({ ...prev, employeeName: emp.name }));
                            setPipForm(prev => ({ ...prev, employeeName: emp.name }));
                          }}
                        >
                          Review Details
                        </Button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={12} className="reports-table-empty">
                      <TrendingUp size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 8 }} />
                      <p>No employee records found matching selected filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="reports-pagination flex-row justify-between flex-wrap gap-2">
            <span className="pagination-info-text">
              Showing {sortedEmployees.length === 0 ? 0 : (page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, sortedEmployees.length)} of {sortedEmployees.length} records
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

      {/* Tab 3 & 4 removed */}

      {/* ── TAB 5: PERFORMANCE REVIEWS ── */}
      {activeTab === 'reviews' && (
        <div className="reports-kpi-grid animate-slide-up">
          
          {/* Left panel: New Review Form */}
          <div className="card padding-5">
            <span className="perf-chart-title">Submit Performance Appraisal Review</span>
            <p className="subtitle" style={{ marginBottom: 12 }}>Create official reviews, notes, ratings and recommendations for team staff.</p>

            {(userRole === 'Employee') ? (
              <div style={{ padding: '24px', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', textAlign: 'center' }}>
                🔒 <strong>Access Denied:</strong> Only Team Leaders, Managers, and HR Administrators can submit appraisal reviews.
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="flex-column gap-3">
                <div className="form-group-item">
                  <label className="reports-form-lbl">Select Employee *</label>
                  <select
                    className="reports-form-input"
                    value={reviewForm.employeeName}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, employeeName: e.target.value }))}
                    required
                  >
                    <option value="">— Select Employee —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name} ({emp.department} • {emp.designation})</option>
                    ))}
                  </select>
                </div>

                <div className="reports-form-grid">
                  <div className="form-group-item">
                    <label className="reports-form-lbl">Review Cycle Type</label>
                    <select
                      className="reports-form-input"
                      value={reviewForm.type}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option>Monthly</option>
                      <option>Quarterly</option>
                      <option>Half-Yearly</option>
                      <option>Annual</option>
                    </select>
                  </div>

                  <div className="form-group-item">
                    <label className="reports-form-lbl">Review Period Designation</label>
                    <select
                      className="reports-form-input"
                      value={reviewForm.period}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, period: e.target.value }))}
                    >
                      <option>Q1 2026</option>
                      <option>Q2 2026</option>
                      <option>Q3 2026</option>
                      <option>May 2026</option>
                      <option>Annual 2025</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-item">
                  <label className="reports-form-lbl">Appraisal Rating *</label>
                  <select
                    className="reports-form-input"
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, rating: e.target.value }))}
                  >
                    <option>Outstanding</option>
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Average</option>
                    <option>Needs Improvement</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label className="reports-form-lbl">Evaluation Review Notes *</label>
                  <textarea
                    className="reports-form-textarea"
                    rows={3}
                    placeholder="Enter appraisal evaluation findings, score parameters, strengths, weaknesses..."
                    value={reviewForm.notes}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, notes: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label className="reports-form-lbl">Feedback / Remarks</label>
                  <textarea
                    className="reports-form-textarea"
                    rows={2}
                    placeholder="Correction goals or focus details..."
                    value={reviewForm.feedback}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, feedback: e.target.value }))}
                  />
                </div>

                <div className="form-group-item">
                  <label className="reports-form-lbl">Career Promotion Recommendations</label>
                  <input
                    type="text"
                    className="reports-form-input"
                    placeholder="e.g. Recommended for Tech Lead status or salary increment."
                    value={reviewForm.recommendations}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, recommendations: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <Button type="submit" variant="primary" disabled={isSubmittingReview} loading={isSubmittingReview}>Submit Review Evaluation</Button>
                </div>
              </form>
            )}
          </div>

          {/* Right panel: appraisal history timeline */}
          <div className="card padding-5">
            <span className="perf-chart-title">Performance Appraisal History Logs</span>
            <p className="subtitle" style={{ marginBottom: 12 }}>List of completed performance reviews and evaluation notes.</p>
            
            <div className="flex-column gap-3">
              {reviews.map(r => (
                <div key={r.id} className="review-history-item flex-column gap-2 padding-3">
                  <div className="flex-row justify-between align-center">
                    <div>
                      <strong>{r.employeeName}</strong>
                      <span className="table-sub-text">Cycle: {r.type} • Period: {r.period}</span>
                    </div>
                    <Badge variant={getRatingBadgeVariant(r.rating)}>{r.rating}</Badge>
                  </div>
                  <p className="review-notes-txt">"{r.notes}"</p>
                  {r.recommendations && <p className="review-rec-txt">💡 Recommendation: <em>{r.recommendations}</em></p>}
                  <div className="flex-row justify-between align-center" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: 6, marginTop: 4 }}>
                    <span className="table-sub-text">Reviewer: <strong>{r.reviewer}</strong></span>
                    <span className="table-sub-text">{r.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab 6 & 7 removed */}

      {/* ── Drilldown Slideover Detail Panel Drawer ── */}
      <SlideOver
        isOpen={!!selectedEmp}
        onClose={() => setSelectedEmp(null)}
        title={`Performance Profile — ${selectedEmp?.id || ''}`}
      >
        {selectedEmp && (
          <div className="report-detail-wrapper animate-slide-up">
            
            {/* Employee Hero */}
            <div className="reports-drawer-hero flex-row justify-between align-center">
              <div className="flex-center gap-3">
                <Avatar name={selectedEmp.name} size="md" />
                <div>
                  <h4>{selectedEmp.name}</h4>
                  <p className="subtitle">{selectedEmp.department} • {selectedEmp.team} • ID: {selectedEmp.id}</p>
                </div>
              </div>
              <Badge variant={selectedEmp.status === 'Active' ? 'success' : selectedEmp.status === 'On Leave' ? 'warning' : 'danger'}>
                {selectedEmp.status}
              </Badge>
            </div>

            {/* Scorecard gauges breakdown widgets */}
            <div className="reports-drawer-widgets-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="widget-item">
                <span className="lbl">Final Score</span>
                <span className="val" style={{ color: selectedEmp.kpiScore >= 85 ? 'var(--color-success)' : 'var(--color-primary)' }}>{selectedEmp.kpiScore}%</span>
                <span className="desc">Total score weighted</span>
              </div>

              <div className="widget-item">
                <span className="lbl">Productivity</span>
                <span className="val">{selectedEmp.productivity}%</span>
                <span className="desc">Tasks assigned: {selectedEmp.tasksAssigned}</span>
              </div>

              <div className="widget-item">
                <span className="lbl">Attendance</span>
                <span className="val">{selectedEmp.attendance}%</span>
                <span className="desc">Presence rating</span>
              </div>

              <div className="widget-item">
                <span className="lbl">Efficiency</span>
                <span className="val">{selectedEmp.efficiency}%</span>
                <span className="desc">Completion speed</span>
              </div>
            </div>

            {/* Details */}
            <div className="reports-meta-block">
              <span className="block-title">Key Profile KPI Indexes</span>
              <div className="block-row flex-row justify-between flex-wrap gap-2">
                <span>Quality Score: <strong>{selectedEmp.quality}%</strong></span>
                <span>Overdue Backlog: <strong className={selectedEmp.overdueTasks > 0 ? 'text-danger' : ''}>{selectedEmp.overdueTasks} Tasks</strong></span>
                <span>Last appraisal: <strong>{selectedEmp.lastReviewDate}</strong></span>
              </div>
            </div>

            {/* Reviews currently registered */}
            <div className="drawer-content-box">
              <span className="box-title">Appraisal Reviews</span>
              <div className="flex-column gap-2" style={{ marginTop: 6 }}>
                {reviews.filter(r => r.employeeName === selectedEmp.name).length > 0 ? (
                  reviews.filter(r => r.employeeName === selectedEmp.name).map(r => (
                    <div key={r.id} className="flex-column padding-2 text-secondary-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      <div className="flex-row justify-between align-center">
                        <strong>Period: {r.period} ({r.type})</strong>
                        <Badge variant={getRatingBadgeVariant(r.rating)}>{r.rating}</Badge>
                      </div>
                      <p style={{ margin: '4px 0 0 0', opacity: 0.85 }}>"{r.notes}"</p>
                    </div>
                  ))
                ) : (
                  <p className="table-sub-text">No reviews recorded yet for this employee.</p>
                )}
              </div>
            </div>

            {/* Quick Action Appraisal Reviews Trigger */}
            {userRole !== 'Employee' && (
              <div className="drawer-review-inputs-wrapper" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <span className="box-title" style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>Quick Actions: Setup Performance Plan</span>
                <div className="flex-row justify-start gap-3" style={{ marginTop: 10 }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveTab('reviews');
                      setSelectedEmp(null);
                    }}
                  >
                    Write Appraisal Review
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </SlideOver>

    </div>
  );
};

export default Performance;
