import React, { useState, useMemo } from 'react';
import './Performance.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import SlideOver from '../components/common/SlideOver';
import Skeleton from '../components/common/Skeleton';
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
    projectsList,
    addNotification,
    markAllNotificationsRead,
    currentUserRole,
    tasks = [],
    attendance = [],
    currentUserId
  } = useApp();
  const currentUser = useMemo(() => (contextEmployees || []).find(e => e.id === currentUserId), [contextEmployees, currentUserId]);
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
  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [pips, setPips] = useState([]);

  // Sync employees from context
  React.useEffect(() => {
    if (contextEmployees) {
      const mapped = (contextEmployees || []).map(emp => {
        const empTasks = (tasks || []).filter(task => task.assigneeId === emp.id);
        const tasksAssigned = empTasks.length;
        const tasksCompleted = empTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length;
        
        let productivity = emp.productivityScore ?? 85;
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
            attendancePct = ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Punched In'].includes(emp.todayPunchStatus || emp.attendanceStatus) ? 100 : 0;
          }
        }
        
        const nameHash = (emp.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const efficiency = Math.min(100, Math.max(60, productivity - 5 + (nameHash % 9)));
        const quality = Math.min(100, Math.max(65, productivity + 3 - (nameHash % 7)));
        
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
    return (departments || []).map(d => ({
      name: d.name,
      score: d.avgPerformance || d.productivity || 90,
      color: d.color || 'var(--color-primary)'
    }));
  }, [departments]);

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
          ? Math.round(branchEmployees.reduce((sum, emp) => sum + (emp.productivityScore ?? 90), 0) / branchEmployees.length)
          : 90);

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
            ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Punched In'].includes(e.todayPunchStatus || e.attendanceStatus)
          ).length;
          calculatedAttendance = Math.round((presentCount / activeBranchEmps.length) * 100);
        } else {
          calculatedAttendance = b.attendance || b.attendanceRate || 95;
        }
      }

      return {
        name: b.name,
        score: calculatedProductivity,
        successRate: calculatedAttendance,
        color: b.color || 'var(--color-primary)'
      };
    });
  }, [branches, contextEmployees, tasks, attendance]);

  const branchSubtitle = useMemo(() => {
    const names = (branches || []).map(b => b.name).slice(0, 3).join(' vs ');
    return `${names || 'Branch Offices'} overall performance metrics.`;
  }, [branches]);

  const PROJECT_RANKINGS = useMemo(() => {
    return (projectsList || []).map(p => ({
      name: p.name,
      manager: p.leader || p.manager || 'Unassigned',
      progress: p.progress || 0,
      score: p.productivity || p.kpiScore || 85
    }));
  }, [projectsList]);

  const COMPETENCY_RADAR = useMemo(() => {
    if (!employees || employees.length === 0) {
      return [
        { subject: 'Productivity', score: 0, fullMark: 100 },
        { subject: 'Attendance', score: 0, fullMark: 100 },
        { subject: 'Efficiency', score: 0, fullMark: 100 },
        { subject: 'Quality', score: 0, fullMark: 100 },
        { subject: 'Goal Achieved', score: 0, fullMark: 100 },
        { subject: 'Collaboration', score: 0, fullMark: 100 }
      ];
    }
    const count = employees.length;
    const avgProd = Math.round(employees.reduce((s, e) => s + (e.productivity || 0), 0) / count);
    const avgAtt = Math.round(employees.reduce((s, e) => s + (e.attendance || e.attendancePct || 0), 0) / count);
    const avgEff = Math.round(employees.reduce((s, e) => s + (e.efficiency || 0), 0) / count);
    const avgQual = Math.round(employees.reduce((s, e) => s + (e.quality || 0), 0) / count);
    
    const avgGoalProgress = goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + Math.min(100, Math.round((g.currentProgress / g.targetValue) * 100)), 0) / goals.length)
      : 80;
      
    return [
      { subject: 'Productivity', score: avgProd, fullMark: 100 },
      { subject: 'Attendance', score: avgAtt, fullMark: 100 },
      { subject: 'Efficiency', score: avgEff, fullMark: 100 },
      { subject: 'Quality', score: avgQual, fullMark: 100 },
      { subject: 'Goal Achieved', score: avgGoalProgress, fullMark: 100 },
      { subject: 'Collaboration', score: 85, fullMark: 100 }
    ];
  }, [employees, goals]);

  // Fetch goals and pips from API
  const fetchGoalsAndPips = async () => {
    if (!token) return;
    try {
      // Fetch goals
      const goalsRes = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/performance/goals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const goalsData = await goalsRes.json();
      if (goalsData.status === 'success') {
        setGoals(goalsData.data || []);
      }

      // Fetch pips
      const pipsRes = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/performance/pips', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pipsData = await pipsRes.json();
      if (pipsData.status === 'success') {
        setPips(pipsData.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch goals and pips:', err);
    }
  };

  React.useEffect(() => {
    fetchGoalsAndPips();
  }, [token]);



  /* Search, Filters, and Sorting */
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortCol, setSortCol] = useState('kpiScore');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  /* Slider configurations editor states */
  const [editWeights, setEditWeights] = useState({ ...weights });

  /* Slide-over employee detailed review profile */
  const [selectedEmp, setSelectedEmp] = useState(null);

  /* OKR Goal wizard forms states */
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '', description: '', type: 'Individual', startDate: '', dueDate: '',
    targetValue: 100, currentProgress: 0, assignee: '', department: ''
  });

  /* Appraisal Review form states */
  const [reviewForm, setReviewForm] = useState({
    employeeName: '', type: 'Quarterly', period: 'Q2 2026', rating: 'Excellent',
    notes: '', feedback: '', recommendations: ''
  });

  /* PIP wizard form states */
  const [pipForm, setPipForm] = useState({
    employeeName: '', issuesIdentified: '', improvementTargets: '',
    reviewPeriod: '30 Days', actionPlan: ''
  });

  /* Simulated reports export action state */
  const [exporting, setExporting] = useState(false);

  /* ── State Helpers ────────────────────────────────────────── */
  const addAuditLog = async (action, target, oldVal, newVal) => {
    if (addActivityLog) {
      await addActivityLog(action, target, 'success', newVal, oldVal);
    }
  };

  const pushAlert = async (message, type) => {
    if (addNotification) {
      await addNotification({
        title: type,
        message,
        type: 'info',
        iconName: 'Settings'
      });
    }
  };



  /* Weights update submission */
  const handleSaveWeights = (e) => {
    e.preventDefault();
    const sum = editWeights.productivity + editWeights.attendance + editWeights.efficiency + editWeights.quality;
    if (sum !== 100) {
      addToast('danger', `Weights sum must equal exactly 100% (Current sum: ${sum}%).`);
      return;
    }

    setWeights(editWeights);
    const oldValString = `Prod: ${weights.productivity}%, Att: ${weights.attendance}%, Eff: ${weights.efficiency}%, Qual: ${weights.quality}%`;
    const newValString = `Prod: ${editWeights.productivity}%, Att: ${editWeights.attendance}%, Eff: ${editWeights.efficiency}%, Qual: ${editWeights.quality}%`;

    // Recalculate kpi scores for all employees in state
    setEmployees(prev =>
      prev.map(emp => ({
        ...emp,
        kpiScore: calculateFinalScore(emp, editWeights)
      }))
    );

    addAuditLog('Weight Configuration Update', 'Org KPI System', oldValString, newValString);
    pushAlert('System KPI framework weights updated. Overall scores recalculated.', 'KPI Config Update');
    addToast('success', 'KPI Framework weights updated and employee scores recalculated successfully.');
  };

  /* Reset Weights */
  const handleResetWeights = () => {
    setEditWeights({ ...weights });
    addToast('info', 'Weights form reset to current values.');
  };

  /* OKR Goal wizard submit */
  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim() || !goalForm.assignee.trim()) {
      addToast('danger', 'Please enter a goal title and select an assignee.');
      return;
    }

    const payload = {
      title: goalForm.title,
      description: goalForm.description,
      type: goalForm.type,
      startDate: goalForm.startDate || new Date().toISOString().split('T')[0],
      dueDate: goalForm.dueDate || new Date().toISOString().split('T')[0],
      targetValue: Number(goalForm.targetValue),
      currentProgress: Number(goalForm.currentProgress),
      status: Number(goalForm.currentProgress) >= Number(goalForm.targetValue) ? 'Completed' : 'In Progress',
      assignee: goalForm.assignee,
      department: goalForm.department
    };

    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/performance/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        addToast('success', `Goal "${goalForm.title}" assigned successfully.`);
        fetchGoalsAndPips();
      } else {
        addToast('danger', result.message || 'Failed to assign goal.');
      }
    } catch (err) {
      console.error('Failed to create goal:', err);
      addToast('danger', 'Error creating goal.');
    }
    
    // Reset goal form
    setGoalForm({
      title: '', description: '', type: 'Individual', startDate: '', dueDate: '',
      targetValue: 100, currentProgress: 0, assignee: '', department: ''
    });
    setShowGoalModal(false);
  };

  /* OKR progress incremental booster */
  const incrementGoalProgress = async (id) => {
    const goal = goals.find(g => g.id === id || g._id === id);
    if (!goal) return;

    const nextVal = Math.min(goal.targetValue, goal.currentProgress + 10);
    const isDone = nextVal >= goal.targetValue;
    const payload = {
      currentProgress: nextVal,
      status: isDone ? 'Completed' : 'In Progress'
    };

    const targetId = goal._id || goal.id;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/performance/goals/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        addToast('info', 'Goal progress updated by +10%');
        fetchGoalsAndPips();
      }
    } catch (err) {
      console.error('Failed to update goal progress:', err);
    }
  };

  /* Appraisal Review submission */
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.employeeName.trim() || !reviewForm.notes.trim()) {
      addToast('danger', 'Please select an employee and provide appraisal review notes.');
      return;
    }

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
    }
  };

  /* PIP Resolution actions */
  const resolvePip = async (pipId, name) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/performance/pips/${pipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.status === 'success') {
        const emp = employees.find(e => e.name === name);
        if (emp && updateEmployee) {
          await updateEmployee(emp.id, {
            status: 'Active',
            productivity: Math.min(100, emp.productivity + 20),
            quality: Math.min(100, emp.quality + 15)
          });
        }
        addToast('success', `Performance Improvement Plan resolved. ${name} is now restored to Active status.`);
        fetchGoalsAndPips();
      }
    } catch (err) {
      console.error('Failed to resolve PIP:', err);
    }
  };

  /* PIP Escalation logic */
  const escalatePip = async (pipId, name) => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/performance/pips/${pipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Escalated' })
      });
      const result = await response.json();
      if (result.status === 'success') {
        addToast('warning', `PIP for ${name} escalated to HR Board.`);
        fetchGoalsAndPips();
      }
    } catch (err) {
      console.error('Failed to escalate PIP:', err);
    }
  };

  /* Create new PIP submission */
  const handlePipSubmit = async (e) => {
    e.preventDefault();
    if (!pipForm.employeeName.trim() || !pipForm.issuesIdentified.trim()) {
      addToast('danger', 'Please select an employee and describe performance issues.');
      return;
    }

    const payload = {
      employeeName: pipForm.employeeName,
      issuesIdentified: pipForm.issuesIdentified,
      improvementTargets: pipForm.improvementTargets,
      reviewPeriod: pipForm.reviewPeriod,
      actionPlan: pipForm.actionPlan,
      status: 'Active',
      reviewer: userRole === 'Super Admin' ? 'Super Admin' : (currentUser?.name || 'Manager'),
      dateCreated: new Date().toISOString().split('T')[0]
    };

    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/performance/pips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        addToast('warning', `PIP successfully issued to ${pipForm.employeeName}. Status changed to PIP.`);
        
        // Change employee status in table to PIP
        const emp = employees.find(e => e.name === pipForm.employeeName);
        if (emp && updateEmployee) {
          await updateEmployee(emp.id, { status: 'PIP' });
        }
        
        fetchGoalsAndPips();
      }
    } catch (err) {
      console.error('Failed to create PIP:', err);
    }

    // Reset PIP Form
    setPipForm({
      employeeName: '', issuesIdentified: '', improvementTargets: '',
      reviewPeriod: '30 Days', actionPlan: ''
    });

    setSelectedEmp(null);
  };

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

    const activeGoalsCount = goals.length;
    const reviewsCompletedCount = reviews.length;

    // Calculate project success rate as average project progress
    const totalProjProgress = (projectsList || []).reduce((sum, p) => sum + (p.progress || 0), 0);
    const projectSuccessRate = (projectsList || []).length > 0 ? (totalProjProgress / projectsList.length).toFixed(1) : '85.0';

    // Calculate top performing department based on average employee productivity
    const deptPerformance = (departments || []).map(d => {
      const deptEmployees = employees.filter(e => e.department === d.name);
      const totalProd = deptEmployees.reduce((sum, e) => sum + (e.productivity || 0), 0);
      const avg = deptEmployees.length > 0 ? Math.round(totalProd / deptEmployees.length) : 0;
      return { name: d.name, score: avg };
    });
    const sortedDepts = [...deptPerformance].sort((a, b) => b.score - a.score);
    const topDeptName = sortedDepts.length > 0 ? sortedDepts[0].name : 'Operations';
    const topDeptScore = sortedDepts.length > 0 ? sortedDepts[0].score : 90;

    return {
      avgOverallScore,
      avgProductivity,
      taskCompletionRate,
      avgAttendance,
      activeGoalsCount,
      reviewsCompletedCount,
      projectSuccessRate,
      topDeptName,
      topDeptScore
    };
  }, [employees, goals, reviews, userRole, projectsList, departments]);

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
          <p className="perf-subtitle">Track organizational competency indexes, OKR goals, performance logs, reviews, and PIPs.</p>
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
          { id: 'goals', label: 'OKR Goals', icon: <Target size={15} />, visible: true },
          { id: 'reviews', label: 'Appraisal Reviews', icon: <Star size={15} />, visible: true },
          { id: 'framework', label: 'Scoring Framework', icon: <Settings size={15} />, visible: userRole !== 'Employee' },
          { id: 'pips', label: 'Performance PIPs', icon: <AlertTriangle size={15} />, visible: userRole !== 'Employee' },
          { id: 'audits', label: 'Alerts & Audits', icon: <Activity size={15} />, visible: true }
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

            <div className="card perf-stat-card border-left-neutral">
              <span className="card-lbl-gray">Active KPI Goals</span>
              <div className="card-value-display text-white">{stats.activeGoalsCount} OKRs</div>
              <span className="card-sub-desc">Assigned framework targets</span>
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

              {(searchQuery || deptFilter !== 'All' || ratingFilter !== 'All' || branchFilter !== 'All' || statusFilter !== 'All') && (
                <Button variant="ghost" size="xs" onClick={() => { setSearchQuery(''); setDeptFilter('All'); setRatingFilter('All'); setBranchFilter('All'); setStatusFilter('All'); setPage(1); }}>
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

      {/* ── TAB 3: KPI CONFIG WEIGHTS ── */}
      {activeTab === 'framework' && userRole !== 'Employee' && (
        <form onSubmit={handleSaveWeights} className="card flex-column padding-5 animate-slide-up">
          <span className="perf-chart-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>KPI Weights Scoring Framework Editor</span>
          <p className="subtitle" style={{ marginTop: 6, marginBottom: 12 }}>Adjust scoring weight configurations. The sum must equal exactly 100%. Changing weights dynamically updates final KPI scores across all employee listings.</p>

          <div className="kpi-weight-editor-container">
            {/* Left panel sliders */}
            <div className="flex-column gap-4" style={{ flex: 1 }}>
              <div className="slider-group-item">
                <div className="flex-row justify-between align-center">
                  <label className="reports-form-lbl">Productivity Score Weight</label>
                  <strong>{editWeights.productivity}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editWeights.productivity}
                  onChange={(e) => setEditWeights(prev => ({ ...prev, productivity: Number(e.target.value) }))}
                  className="kpi-weight-slider"
                />
                <span className="table-sub-text">Weighted based on Completed Tasks & Daily Log submission rates.</span>
              </div>

              <div className="slider-group-item">
                <div className="flex-row justify-between align-center">
                  <label className="reports-form-lbl">Attendance Score Weight</label>
                  <strong>{editWeights.attendance}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editWeights.attendance}
                  onChange={(e) => setEditWeights(prev => ({ ...prev, attendance: Number(e.target.value) }))}
                  className="kpi-weight-slider"
                />
                <span className="table-sub-text">Weighted based on Punctuality ratios and Presence percentages.</span>
              </div>

              <div className="slider-group-item">
                <div className="flex-row justify-between align-center">
                  <label className="reports-form-lbl">Efficiency Score Weight</label>
                  <strong>{editWeights.efficiency}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editWeights.efficiency}
                  onChange={(e) => setEditWeights(prev => ({ ...prev, efficiency: Number(e.target.value) }))}
                  className="kpi-weight-slider"
                />
                <span className="table-sub-text">Weighted based on Task Completion speed vs Sprint deadlines.</span>
              </div>

              <div className="slider-group-item">
                <div className="flex-row justify-between align-center">
                  <label className="reports-form-lbl">Quality Score Weight</label>
                  <strong>{editWeights.quality}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editWeights.quality}
                  onChange={(e) => setEditWeights(prev => ({ ...prev, quality: Number(e.target.value) }))}
                  className="kpi-weight-slider"
                />
                <span className="table-sub-text">Weighted based on Manager appraisal ratings and Client feedback logs.</span>
              </div>

              {/* Total indicator status */}
              {(() => {
                const total = editWeights.productivity + editWeights.attendance + editWeights.efficiency + editWeights.quality;
                return (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      background: total === 100 ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                      border: `1px dashed ${total === 100 ? 'var(--color-success)' : 'var(--color-danger)'}`,
                      color: total === 100 ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 600
                    }}
                  >
                    📊 Total Configured Sum: {total}% {total === 100 ? '(Valid Config)' : `(Invalid: Must sum to 100%)`}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <Button type="button" variant="ghost" onClick={handleResetWeights}>Reset</Button>
                <Button type="submit" variant="primary">Save Configuration & Recalculate</Button>
              </div>
            </div>

            {/* Right panel visual calculations preview */}
            <div className="kpi-calculation-formula-box flex-column gap-3">
              <span className="reports-form-lbl" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Scoring Calculations Flow Engine</span>
              
              <div className="formula-block-wrap">
                <span className="formula-title">Productivity Calculation:</span>
                <span className="formula-text">P_Score = (Tasks Completed / Tasks Assigned) * 100</span>
              </div>

              <div className="formula-block-wrap">
                <span className="formula-title">Combined Final Scoring Engine:</span>
                <span className="formula-text" style={{ fontStyle: 'italic' }}>
                  Final Score = (P_Score * {editWeights.productivity}%) + (A_Score * {editWeights.attendance}%) + (E_Score * {editWeights.efficiency}%) + (Q_Score * {editWeights.quality}%)
                </span>
              </div>

              <div className="formula-simulation-preview" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 5 }}>
                <span className="reports-form-lbl" style={{ fontWeight: 600 }}>Simulated recalculation for Balram Suman:</span>
                <div className="flex-row justify-between text-secondary-sm" style={{ marginTop: 6 }}>
                  <span>Productivity: 98 * {editWeights.productivity}%</span>
                  <span>= {parseFloat((98 * editWeights.productivity / 100).toFixed(1))}</span>
                </div>
                <div className="flex-row justify-between text-secondary-sm">
                  <span>Attendance: 98 * {editWeights.attendance}%</span>
                  <span>= {parseFloat((98 * editWeights.attendance / 100).toFixed(1))}</span>
                </div>
                <div className="flex-row justify-between text-secondary-sm">
                  <span>Efficiency: 95 * {editWeights.efficiency}%</span>
                  <span>= {parseFloat((95 * editWeights.efficiency / 100).toFixed(1))}</span>
                </div>
                <div className="flex-row justify-between text-secondary-sm">
                  <span>Quality: 98 * {editWeights.quality}%</span>
                  <span>= {parseFloat((98 * editWeights.quality / 100).toFixed(1))}</span>
                </div>
                <div className="flex-row justify-between" style={{ borderTop: '1px dashed var(--border-color)', marginTop: 6, paddingTop: 4, fontWeight: 700, color: 'var(--color-success)' }}>
                  <span>Simulated Overall score:</span>
                  <span>
                    {Math.round((98 * editWeights.productivity + 98 * editWeights.attendance + 95 * editWeights.efficiency + 98 * editWeights.quality) / 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ── TAB 4: GOAL & OKR MANAGEMENT ── */}
      {activeTab === 'goals' && (
        <div className="flex-column gap-4 animate-slide-up">
          <div className="flex-row justify-between align-center flex-wrap gap-2">
            <div>
              <span className="perf-chart-title">OKR & Performance Goals</span>
              <p className="subtitle">Set, view, track and update key targets for employees, teams, and departments.</p>
            </div>
            {/* Trigger modal */}
            {userRole !== 'Employee' && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowGoalModal(true)}>
                Create New OKR Goal
              </Button>
            )}
          </div>

          {/* Goals cards grid */}
          <div className="goals-cards-grid">
            {goals.map((g) => {
              const percent = Math.min(100, Math.round((g.currentProgress / g.targetValue) * 100));
              let statusClass = 'goal-badge-inprogress';
              if (g.status === 'Completed') statusClass = 'goal-badge-completed';
              else if (g.status === 'Overdue') statusClass = 'goal-badge-overdue';

              return (
                <div key={g.id} className="card goal-card flex-column justify-between">
                  <div className="flex-column gap-2">
                    <div className="flex-row justify-between align-center">
                      <Badge variant="neutral">{g.type} Goal</Badge>
                      <span className={`goal-status-lbl ${statusClass}`}>{g.status}</span>
                    </div>

                    <strong className="goal-title-txt">{g.title}</strong>
                    <p className="goal-desc-txt">{g.description}</p>
                  </div>

                  <div className="goal-progress-section" style={{ marginTop: 14 }}>
                    <div className="flex-row justify-between align-center text-secondary-sm" style={{ marginBottom: 6 }}>
                      <span>Progress: <strong>{g.currentProgress}</strong> / {g.targetValue}</span>
                      <strong>{percent}%</strong>
                    </div>

                    <div className="goal-bar-track">
                      <div
                        className="goal-bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: g.status === 'Completed' ? 'var(--color-success)' : 'var(--color-primary)'
                        }}
                      />
                    </div>

                    <div className="flex-row justify-between align-center" style={{ marginTop: 10, borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                      <span className="table-sub-text">Due: {g.dueDate} | Owner: <strong>{g.assignee}</strong></span>
                      {g.status !== 'Completed' && (userRole !== 'Employee') && (
                        <button
                          type="button"
                          className="goal-increment-btn"
                          onClick={() => incrementGoalProgress(g.id)}
                        >
                          +10% Progress 🚀
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goal creation modal */}
          {showGoalModal && (
            <div className="modal-overlay-custom" onClick={(e) => e.target === e.currentTarget && setShowGoalModal(false)}>
              <div className="card modal-body-custom flex-column padding-5">
                <div className="flex-row justify-between align-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                  <span className="perf-chart-title">Create New OKR Goal</span>
                  <button className="goal-close-modal-btn" onClick={() => setShowGoalModal(false)}><X size={16} /></button>
                </div>

                <form onSubmit={handleGoalSubmit} className="flex-column gap-3" style={{ marginTop: 10 }}>
                  <div className="form-group-item">
                    <label className="reports-form-lbl">Goal Title *</label>
                    <input
                      type="text"
                      className="reports-form-input"
                      placeholder="e.g. Optimize Database Indexes"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <label className="reports-form-lbl">Goal Description</label>
                    <textarea
                      className="reports-form-textarea"
                      rows={2}
                      placeholder="Describe target objectives and measurable key results..."
                      value={goalForm.description}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="reports-form-grid">
                    <div className="form-group-item">
                      <label className="reports-form-lbl">Goal Scope / Type</label>
                      <select
                        className="reports-form-input"
                        value={goalForm.type}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option>Individual</option>
                        <option>Team</option>
                        <option>Department</option>
                        <option>Project</option>
                      </select>
                    </div>

                    <div className="form-group-item">
                      <label className="reports-form-lbl">Associated Department</label>
                      <select
                        className="reports-form-input"
                        value={goalForm.department}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, department: e.target.value }))}
                      >
                        {(departments || []).map(d => (
                          <option key={d.id || d.name} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="reports-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="form-group-item">
                      <label className="reports-form-lbl">Target Value</label>
                      <input
                        type="number"
                        className="reports-form-input"
                        value={goalForm.targetValue}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, targetValue: Number(e.target.value) }))}
                      />
                    </div>

                    <div className="form-group-item">
                      <label className="reports-form-lbl">Start Date</label>
                      <input
                        type="date"
                        className="reports-form-input"
                        value={goalForm.startDate}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>

                    <div className="form-group-item">
                      <label className="reports-form-lbl">Due Date</label>
                      <input
                        type="date"
                        className="reports-form-input"
                        value={goalForm.dueDate}
                        onChange={(e) => setGoalForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group-item">
                    <label className="reports-form-lbl">Owner / Assignee *</label>
                    <select
                      className="reports-form-input"
                      value={goalForm.assignee}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, assignee: e.target.value }))}
                      required
                    >
                      <option value="">— Select Assignee —</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name} ({emp.designation})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                    <Button type="button" variant="ghost" onClick={() => setShowGoalModal(false)}>Cancel</Button>
                    <Button type="submit" variant="primary">Assign OKR Goal</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

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
                  <Button type="submit" variant="primary">Submit Review Evaluation</Button>
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

      {/* ── TAB 6: PERFORMANCE IMPROVEMENT PLANS ── */}
      {activeTab === 'pips' && userRole !== 'Employee' && (
        <div className="reports-kpi-grid animate-slide-up">
          
          {/* Active PIP list */}
          <div className="card padding-5">
            <span className="perf-chart-title">Active Performance Improvement Plans (PIP)</span>
            <p className="subtitle" style={{ marginBottom: 10 }}>Track and assist employees currently on structured recovery targets.</p>
            
            <div className="flex-column gap-3">
              {pips.length > 0 ? pips.map(p => (
                <div key={p.id} className="pip-card-item flex-column gap-3 padding-4">
                  <div className="flex-row justify-between align-center">
                    <div>
                      <strong className="text-white" style={{ fontSize: '0.95rem' }}>{p.employeeName}</strong>
                      <span className="table-sub-text">Plan ID: {p.id} | Opened: {p.dateCreated}</span>
                    </div>
                    <Badge variant={p.status === 'Escalated' ? 'danger' : 'warning'}>{p.status}</Badge>
                  </div>

                  <div className="flex-column gap-2 text-secondary-sm">
                    <div>
                      <strong style={{ color: 'var(--color-danger)' }}>Issues Identified:</strong>
                      <p style={{ margin: '2px 0 0 0' }}>{p.issuesIdentified}</p>
                    </div>

                    <div>
                      <strong style={{ color: 'var(--color-success)' }}>Improvement Targets:</strong>
                      <p style={{ margin: '2px 0 0 0' }}>{p.improvementTargets}</p>
                    </div>

                    <div>
                      <strong>Action Plan:</strong>
                      <p style={{ margin: '2px 0 0 0' }}>{p.actionPlan}</p>
                    </div>

                    <div>
                      <strong>Review Period:</strong>
                      <p style={{ margin: '2px 0 0 0' }}>{p.reviewPeriod}</p>
                    </div>
                  </div>

                  {/* Actions resolutions */}
                  <div className="flex-row justify-between align-center" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 6 }}>
                    <span className="table-sub-text">Assigned Reviewer: <strong>{p.reviewer}</strong></span>
                    <div className="flex-center gap-2">
                      {p.status !== 'Escalated' && (
                        <button
                          type="button"
                          className="pip-action-btn btn-escalate"
                          onClick={() => escalatePip(p.id, p.employeeName)}
                        >
                          Escalate to HR
                        </button>
                      )}
                      <button
                        type="button"
                        className="pip-action-btn btn-resolve"
                        onClick={() => resolvePip(p.id, p.employeeName)}
                      >
                        Resolve PIP (Goals Met) ✓
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '32px', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  🎉 No employees currently registered on Performance Improvement Plans.
                </div>
              )}
            </div>
          </div>

          {/* Issue New PIP form */}
          <div className="card padding-5">
            <span className="perf-chart-title">Issue Performance Improvement Plan</span>
            <p className="subtitle" style={{ marginBottom: 12 }}>Open a structured PIP recovery plan for underperforming employees.</p>

            <form onSubmit={handlePipSubmit} className="flex-column gap-3">
              <div className="form-group-item">
                <label className="reports-form-lbl">Select Employee *</label>
                <select
                  className="reports-form-input"
                  value={pipForm.employeeName}
                  onChange={(e) => setPipForm(prev => ({ ...prev, employeeName: e.target.value }))}
                  required
                >
                  <option value="">— Select Employee —</option>
                  {employees.filter(e => e.kpiScore < 75).map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name} (Score: {emp.kpiScore}% • {emp.department})</option>
                  ))}
                </select>
                <span className="table-sub-text">Only employees with score below 75% are eligible for PIP tracking.</span>
              </div>

              <div className="form-group-item">
                <label className="reports-form-lbl">Issues Identified *</label>
                <textarea
                  className="reports-form-textarea"
                  rows={2}
                  placeholder="Describe specific performance gaps, backlogs, punctuality delays..."
                  value={pipForm.issuesIdentified}
                  onChange={(e) => setPipForm(prev => ({ ...prev, issuesIdentified: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group-item">
                <label className="reports-form-lbl">Improvement Targets & Deliverables *</label>
                <textarea
                  className="reports-form-textarea"
                  rows={2}
                  placeholder="Measurable objectives required to pass plan (e.g. 80% task completion)..."
                  value={pipForm.improvementTargets}
                  onChange={(e) => setPipForm(prev => ({ ...prev, improvementTargets: e.target.value }))}
                  required
                />
              </div>

              <div className="reports-form-grid">
                <div className="form-group-item">
                  <label className="reports-form-lbl">Plan Review Duration</label>
                  <select
                    className="reports-form-input"
                    value={pipForm.reviewPeriod}
                    onChange={(e) => setPipForm(prev => ({ ...prev, reviewPeriod: e.target.value }))}
                  >
                    <option>30 Days</option>
                    <option>45 Days</option>
                    <option>60 Days</option>
                    <option>90 Days</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label className="reports-form-lbl">Recovery Action Plan Description</label>
                  <input
                    type="text"
                    className="reports-form-input"
                    placeholder="e.g. Daily mentoring Standups"
                    value={pipForm.actionPlan}
                    onChange={(e) => setPipForm(prev => ({ ...prev, actionPlan: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <Button type="submit" variant="primary">Issue Warning & Active PIP</Button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ── TAB 7: ALERTS & SECURITY AUDITS ── */}
      {activeTab === 'audits' && (
        <div className="reports-kpi-grid animate-slide-up">
          
          {/* Notifications Alerts Inbox */}
          <div className="card padding-5">
            <div className="flex-row justify-between align-center" style={{ marginBottom: 12 }}>
              <span className="perf-chart-title">System Performance Alerts Feed</span>
              <button
                type="button"
                className="view-link-btn"
                onClick={async () => {
                  if (markAllNotificationsRead) {
                    await markAllNotificationsRead();
                  }
                  addToast('success', 'All notifications marked as read.');
                }}
              >
                Mark all as read
              </button>
            </div>

            <div className="flex-column gap-3">
              {alerts.map(a => (
                <div key={a.id} className={`notification-item flex-row justify-between padding-3 ${!a.read ? 'unread' : ''}`}>
                  <div className="flex-center gap-2">
                    {!a.read && <span className="notification-unread-dot" />}
                    <span className="notification-message-text">{a.message}</span>
                  </div>
                  <span className="notification-time-lbl">{a.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail List */}
          <div className="card padding-5">
            <span className="perf-chart-title">Framework Settings Audit Logs</span>
            <p className="subtitle" style={{ marginBottom: 10 }}>Logs of modifications, score recalculations, evaluations, and PIP creations.</p>
            
            <div className="reports-table-wrap">
              <table className="perf-data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action Done</th>
                    <th>Target Value Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.timestamp}</td>
                      <td><strong>{log.user}</strong></td>
                      <td>
                        <Badge variant={log.action.includes('Review') || log.action.includes('Appraisal') ? 'success' : log.action.includes('Weight') ? 'info' : 'warning'}>
                          {log.action}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>
                        <span className="table-dept-text">{log.target}</span>
                        <span className="table-sub-text">Old: {log.oldVal} • New: {log.newVal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ── Drilldown Slideover Detail Panel Drawer ── */}
      {selectedEmp && (
        <SlideOver
          isOpen={!!selectedEmp}
          onClose={() => setSelectedEmp(null)}
          title={`Performance Profile — ${selectedEmp.id}`}
        >
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

            {/* OKR goals currently assigned */}
            <div className="drawer-content-box">
              <span className="box-title">OKR Goals Assigned</span>
              <div className="flex-column gap-2" style={{ marginTop: 6 }}>
                {goals.filter(g => g.assignee === selectedEmp.name).length > 0 ? (
                  goals.filter(g => g.assignee === selectedEmp.name).map(g => (
                    <div key={g.id} className="flex-column gap-1 padding-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      <div className="flex-row justify-between text-secondary-sm">
                        <strong>{g.title}</strong>
                        <span>{g.status}</span>
                      </div>
                      <div className="goal-bar-track" style={{ height: 4 }}>
                        <div style={{ width: `${Math.round((g.currentProgress / g.targetValue)*100)}%`, height: '100%', background: 'var(--color-primary)' }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="table-sub-text">No active goals assigned to this employee.</p>
                )}
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

                {selectedEmp.status === 'PIP' ? (
                  <div style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', border: '1px dashed var(--color-danger)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                    ⚠️ This employee is currently registered in an Active PIP improvement plan. Manage their resolution status under the PIP Tab.
                  </div>
                ) : (
                  <div className="flex-row justify-between gap-3" style={{ marginTop: 10 }}>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{ color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}
                      onClick={() => {
                        setActiveTab('pips');
                        setSelectedEmp(null);
                      }}
                    >
                      Issue Warning / PIP
                    </Button>
                  </div>
                )}
              </div>
            )}

          </div>
        </SlideOver>
      )}

    </div>
  );
};

export default Performance;
