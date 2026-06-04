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
   SEED DATA FOR ENTERPRISE PERFORMANCE MANAGEMENT
   ═══════════════════════════════════════════════════════════ */
const INITIAL_EMPLOYEES = [
  {
    id: 'EMP-2026-001',
    name: 'Aarav Sharma',
    department: 'Operations',
    team: 'Core Ops Team',
    designation: 'Chief Operations Officer',
    attendancePct: 98,
    tasksAssigned: 45,
    tasksCompleted: 44,
    productivity: 98,
    attendance: 98,
    efficiency: 95,
    quality: 98,
    status: 'Active',
    branch: 'Jaipur HQ',
    kpiScore: 98,
    overdueTasks: 0,
    lastReviewDate: '2026-05-15'
  },
  {
    id: 'EMP-2026-002',
    name: 'Vikram Singh',
    department: 'Engineering',
    team: 'UI/UX Design',
    designation: 'Engineering Manager',
    attendancePct: 92,
    tasksAssigned: 35,
    tasksCompleted: 31,
    productivity: 88,
    attendance: 92,
    efficiency: 89,
    quality: 90,
    status: 'Active',
    branch: 'Delhi Office',
    kpiScore: 90,
    overdueTasks: 1,
    lastReviewDate: '2026-04-12'
  },
  {
    id: 'EMP-2026-102',
    name: 'Divya Singh',
    department: 'IT',
    team: 'Dev Team Alpha',
    designation: 'Tech Lead',
    attendancePct: 96,
    tasksAssigned: 40,
    tasksCompleted: 38,
    productivity: 95,
    attendance: 96,
    efficiency: 92,
    quality: 94,
    status: 'Active',
    branch: 'Jaipur HQ',
    kpiScore: 94,
    overdueTasks: 0,
    lastReviewDate: '2026-05-20'
  },
  {
    id: 'EMP-2026-108',
    name: 'Rajesh Kumar',
    department: 'Marketing',
    team: 'Brand Design',
    designation: 'Brand Designer',
    attendancePct: 91,
    tasksAssigned: 28,
    tasksCompleted: 26,
    productivity: 93,
    attendance: 91,
    efficiency: 88,
    quality: 89,
    status: 'Active',
    branch: 'Branch Office',
    kpiScore: 90,
    overdueTasks: 0,
    lastReviewDate: '2026-05-28'
  },
  {
    id: 'EMP-2026-115',
    name: 'Meena Sharma',
    department: 'Sales',
    team: 'Corporate Outreach',
    designation: 'Sales Representative',
    attendancePct: 89,
    tasksAssigned: 32,
    tasksCompleted: 24,
    productivity: 75,
    attendance: 89,
    efficiency: 80,
    quality: 82,
    status: 'Active',
    branch: 'Delhi Office',
    kpiScore: 81,
    overdueTasks: 2,
    lastReviewDate: '2026-05-10'
  },
  {
    id: 'EMP-2026-121',
    name: 'Prakash Patel',
    department: 'Operations',
    team: 'Systems Integration',
    designation: 'IT Ops Specialist',
    attendancePct: 95,
    tasksAssigned: 38,
    tasksCompleted: 35,
    productivity: 92,
    attendance: 95,
    efficiency: 91,
    quality: 90,
    status: 'Active',
    branch: 'Jaipur HQ',
    kpiScore: 92,
    overdueTasks: 0,
    lastReviewDate: '2026-04-18'
  },
  {
    id: 'EMP-2026-130',
    name: 'Sunita Rao',
    department: 'HR',
    team: 'Talent Acquisition',
    designation: 'HR Coordinator',
    attendancePct: 94,
    tasksAssigned: 22,
    tasksCompleted: 20,
    productivity: 91,
    attendance: 94,
    efficiency: 89,
    quality: 92,
    status: 'Active',
    branch: 'Branch Office',
    kpiScore: 91,
    overdueTasks: 0,
    lastReviewDate: '2026-05-02'
  },
  {
    id: 'EMP-2026-112',
    name: 'Kiran Mehta',
    department: 'IT',
    team: 'Infra Ops',
    designation: 'Systems Engineer',
    attendancePct: 84,
    tasksAssigned: 25,
    tasksCompleted: 15,
    productivity: 60,
    attendance: 84,
    efficiency: 65,
    quality: 70,
    status: 'On Leave',
    branch: 'Delhi Office',
    kpiScore: 70,
    overdueTasks: 3,
    lastReviewDate: '2026-03-15'
  },
  {
    id: 'EMP-2026-118',
    name: 'Amit Bose',
    department: 'Sales',
    team: 'Direct Sales',
    designation: 'Outreach Manager',
    attendancePct: 76,
    tasksAssigned: 30,
    tasksCompleted: 16,
    productivity: 53,
    attendance: 76,
    efficiency: 60,
    quality: 55,
    status: 'PIP',
    branch: 'Delhi Office',
    kpiScore: 59,
    overdueTasks: 5,
    lastReviewDate: '2026-05-01'
  }
];

const SEED_GOALS = [
  {
    id: 'GOAL-001',
    title: 'Optimize Core Recharts Gradients',
    description: 'Improve chart rendering performance and refactor linear-gradient layouts.',
    type: 'Project',
    startDate: '2026-05-20',
    dueDate: '2026-06-15',
    targetValue: 100,
    currentProgress: 85,
    status: 'In Progress',
    assignee: 'Vikram Singh',
    department: 'Engineering'
  },
  {
    id: 'GOAL-002',
    title: 'Reduce Server Latency by 20%',
    description: 'Optimize indexing schemes and configure query caching profiles.',
    type: 'Department',
    startDate: '2026-05-01',
    dueDate: '2026-06-30',
    targetValue: 100,
    currentProgress: 60,
    status: 'In Progress',
    assignee: 'Divya Singh',
    department: 'IT'
  },
  {
    id: 'GOAL-003',
    title: 'Publish Brand Guidelines v2',
    description: 'Export structured CSS variables, font families and high quality dark mode icons.',
    type: 'Team',
    startDate: '2026-04-10',
    dueDate: '2026-05-31',
    targetValue: 100,
    currentProgress: 100,
    status: 'Completed',
    assignee: 'Rajesh Kumar',
    department: 'Marketing'
  },
  {
    id: 'GOAL-004',
    title: 'Onboard 5 Senior Software Engineers',
    description: 'Source, screen, and interview candidates for the core engineering division.',
    type: 'Individual',
    startDate: '2026-05-15',
    dueDate: '2026-06-25',
    targetValue: 5,
    currentProgress: 2,
    status: 'In Progress',
    assignee: 'Sunita Rao',
    department: 'HR'
  },
  {
    id: 'GOAL-005',
    title: 'Increase Corporate Conversions',
    description: 'Scale outreach campaigns and increase leads response rates by 15%.',
    type: 'Team',
    startDate: '2026-05-01',
    dueDate: '2026-06-10',
    targetValue: 100,
    currentProgress: 45,
    status: 'In Progress',
    assignee: 'Meena Sharma',
    department: 'Sales'
  }
];

const SEED_REVIEWS = [
  {
    id: 'REV-001',
    employeeName: 'Divya Singh',
    reviewer: 'Aarav Sharma',
    type: 'Quarterly',
    period: 'Q1 2026',
    rating: 'Outstanding',
    notes: 'Exceeded all performance targets. Maintained near-perfect attendance and delivered robust RBAC authentication modules on-time.',
    feedback: 'Keep up the exemplary focus on software security schemas.',
    recommendations: 'Recommended for promotion to Technical Director.',
    date: '2026-04-15'
  },
  {
    id: 'REV-002',
    employeeName: 'Rajesh Kumar',
    reviewer: 'Aarav Sharma',
    type: 'Monthly',
    period: 'May 2026',
    rating: 'Excellent',
    notes: 'Designed brand guideline packs, showing high efficiency and quality. Sourcing deliverables was seamless.',
    feedback: 'Improve coordination timelines with development teams.',
    recommendations: 'Encourage leading cross-functional design sprints.',
    date: '2026-05-28'
  },
  {
    id: 'REV-003',
    employeeName: 'Vikram Singh',
    reviewer: 'Aarav Sharma',
    type: 'Quarterly',
    period: 'Q1 2026',
    rating: 'Good',
    notes: 'Solid project management and team alignment. Minor scope shifts on Recharts optimization goals.',
    feedback: 'Focus on stabilizing project sprint estimates.',
    recommendations: 'Provide standard scrum master certifications support.',
    date: '2026-04-12'
  }
];

const SEED_PIPS = [
  {
    id: 'PIP-001',
    employeeName: 'Amit Bose',
    issuesIdentified: 'Low productivity score (53%), high task backlog, and delayed milestones on outreach plans.',
    improvementTargets: 'Close at least 25 client tickets weekly and maintain a productivity score above 75%.',
    reviewPeriod: '30 Days (Jun 1 - Jun 30)',
    actionPlan: 'Daily standup check-ins with sales leader and weekly review syncs with department head.',
    status: 'Active',
    reviewer: 'Aarav Sharma',
    dateCreated: '2026-06-01'
  }
];

const SEED_ALERTS = [
  { id: 'ALT-001', message: 'Low productivity alert: Amit Bose performance rating dropped below threshold (59%).', type: 'Performance Decline', read: false, date: '2 hours ago' },
  { id: 'ALT-002', message: 'Performance Review Due: Kiran Mehta Q2 appraisal review needs setup.', type: 'Review Due', read: false, date: '1 day ago' },
  { id: 'ALT-003', message: 'Goal Deadline Near: "Optimize Core Recharts Gradients" due in 11 days.', type: 'Goal Deadline Near', read: false, date: '1 day ago' },
  { id: 'ALT-004', message: 'Goal Achieved: Rajesh Kumar completed "Publish Brand Guidelines v2" successfully.', type: 'Goal Achieved', read: true, date: '3 days ago' }
];

const SEED_AUDITS = [
  { id: 'AUD-001', user: 'Aarav Sharma', action: 'Weight Configuration Update', target: 'Org KPI System', timestamp: '2026-06-04 10:00:00', oldVal: 'Prod: 25%, Att: 25%', newVal: 'Prod: 30%, Att: 20%' },
  { id: 'AUD-002', user: 'Super Admin', action: 'Create PIP Log', target: 'Amit Bose', timestamp: '2026-06-01 09:15:00', oldVal: 'None', newVal: 'Active PIP-001' },
  { id: 'AUD-003', user: 'Aarav Sharma', action: 'Submit Performance Review', target: 'Rajesh Kumar', timestamp: '2026-05-28 17:45:00', oldVal: 'None', newVal: 'Excellent Appraisal' }
];

/* ── Charts Mock Data ────────────────────────────────────────── */
const MONTHLY_TREND = [
  { month: 'Jan', overall: 78, Operations: 82, Engineering: 80, Sales: 72, IT: 84 },
  { month: 'Feb', overall: 80, Operations: 84, Engineering: 82, Sales: 75, IT: 85 },
  { month: 'Mar', overall: 82, Operations: 85, Engineering: 83, Sales: 76, IT: 87 },
  { month: 'Apr', overall: 85, Operations: 88, Engineering: 86, Sales: 80, IT: 90 },
  { month: 'May', overall: 88, Operations: 90, Engineering: 88, Sales: 81, IT: 92 }
];

const COMPETENCY_RADAR = [
  { subject: 'Productivity', score: 92, fullMark: 100 },
  { subject: 'Attendance', score: 90, fullMark: 100 },
  { subject: 'Efficiency', score: 86, fullMark: 100 },
  { subject: 'Quality', score: 89, fullMark: 100 },
  { subject: 'Goal Achieved', score: 82, fullMark: 100 },
  { subject: 'Collaboration', score: 85, fullMark: 100 }
];

const DEPT_PERF_DATA = [
  { name: 'Operations', score: 95, color: 'var(--color-primary)' },
  { name: 'IT', score: 92, color: 'var(--accent-blue-solid)' },
  { name: 'Engineering', score: 88, color: 'var(--color-success)' },
  { name: 'HR', score: 85, color: '#a855f7' },
  { name: 'Sales', score: 72, color: 'var(--color-warning)' },
  { name: 'Marketing', score: 70, color: 'var(--color-danger)' }
];

const BRANCH_RANKINGS = [
  { name: 'Jaipur HQ', score: 95, successRate: 97, color: 'var(--color-primary)' },
  { name: 'Delhi Office', score: 88, successRate: 91, color: 'var(--accent-blue-solid)' },
  { name: 'Branch Office', score: 82, successRate: 85, color: 'var(--color-success)' }
];

const PROJECT_RANKINGS = [
  { name: 'SaaS Platform v3.0', manager: 'Rahul Sharma', progress: 85, score: 94, budget: '78%' },
  { name: 'Sales Funnel Automation', manager: 'Priya Verma', progress: 65, score: 90, budget: '90%' },
  { name: 'HR Digitization System', manager: 'Priya Verma', progress: 95, score: 88, budget: '65%' },
  { name: 'Employee Wellness Portal', manager: 'Sunita Rao', progress: 40, score: 85, budget: '50%' }
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT DEFINITION
   ═══════════════════════════════════════════════════════════ */
const Performance = () => {
  const { addToast } = useApp();
  const isLoading = usePageLoading(800);

  /* Simulated view perspective */
  const [userRole, setUserRole] = useState('Super Admin'); // Employee, Team Leader, Department Manager, HR/Admin, Super Admin

  /* Sub-Navigation workspace tabs */
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, directory, framework, goals, reviews, pips, audits

  /* Master States */
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [goals, setGoals] = useState(SEED_GOALS);
  const [reviews, setReviews] = useState(SEED_REVIEWS);
  const [pips, setPips] = useState(SEED_PIPS);
  const [alerts, setAlerts] = useState(SEED_ALERTS);
  const [auditLogs, setAuditLogs] = useState(SEED_AUDITS);

  /* Weights framework states */
  const [weights, setWeights] = useState({
    productivity: 30,
    attendance: 20,
    efficiency: 20,
    quality: 30
  });

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
    targetValue: 100, currentProgress: 0, assignee: '', department: 'Engineering'
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
  const addAuditLog = (action, target, oldVal, newVal) => {
    const newLog = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      user: userRole === 'Employee' ? 'Aarav Sharma' : userRole === 'Team Leader' ? 'Ananya Gupta' : 'Super Admin',
      action,
      target,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      oldVal,
      newVal
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const pushAlert = (message, type) => {
    const newAlert = {
      id: `ALT-${Math.floor(100 + Math.random() * 900)}`,
      message,
      type,
      read: false,
      date: 'Just now'
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

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
  const handleGoalSubmit = (e) => {
    e.preventDefault();
    if (!goalForm.title.trim() || !goalForm.assignee.trim()) {
      addToast('danger', 'Please enter a goal title and select an assignee.');
      return;
    }

    const newGoalId = `GOAL-${String(goals.length + 1).padStart(3, '0')}`;
    const newGoal = {
      ...goalForm,
      id: newGoalId,
      status: Number(goalForm.currentProgress) >= Number(goalForm.targetValue) ? 'Completed' : 'In Progress',
      completionPercentage: Math.min(100, Math.round((Number(goalForm.currentProgress) / Math.max(1, Number(goalForm.targetValue))) * 100))
    };

    setGoals(prev => [newGoal, ...prev]);
    addAuditLog('Create OKR Goal', newGoalId, 'None', `Title: ${goalForm.title}`);
    pushAlert(`New Goal Assigned: "${goalForm.title}" to ${goalForm.assignee}`, 'Goal Assignment');
    addToast('success', `Goal "${goalForm.title}" assigned successfully.`);
    
    // Reset goal form
    setGoalForm({
      title: '', description: '', type: 'Individual', startDate: '', dueDate: '',
      targetValue: 100, currentProgress: 0, assignee: '', department: 'Engineering'
    });
    setShowGoalModal(false);
  };

  /* OKR progress incremental booster */
  const incrementGoalProgress = (id) => {
    setGoals(prev =>
      prev.map(g => {
        if (g.id === id) {
          const nextVal = Math.min(g.targetValue, g.currentProgress + 10);
          const isDone = nextVal >= g.targetValue;
          return {
            ...g,
            currentProgress: nextVal,
            status: isDone ? 'Completed' : 'In Progress'
          };
        }
        return g;
      })
    );
    addToast('info', 'Goal progress updated by +10%');
  };

  /* Appraisal Review submission */
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewForm.employeeName.trim() || !reviewForm.notes.trim()) {
      addToast('danger', 'Please select an employee and provide appraisal review notes.');
      return;
    }

    const newRevId = `REV-${String(reviews.length + 1).padStart(3, '0')}`;
    const newReview = {
      ...reviewForm,
      id: newRevId,
      reviewer: userRole === 'Super Admin' ? 'Super Admin' : 'Aarav Sharma',
      date: new Date().toISOString().split('T')[0]
    };

    setReviews(prev => [newReview, ...prev]);

    // Map appraisal rating to numeric quality score
    let mappedQuality = 80;
    if (reviewForm.rating === 'Outstanding') mappedQuality = 100;
    else if (reviewForm.rating === 'Excellent') mappedQuality = 92;
    else if (reviewForm.rating === 'Good') mappedQuality = 84;
    else if (reviewForm.rating === 'Average') mappedQuality = 72;
    else if (reviewForm.rating === 'Needs Improvement') mappedQuality = 55;

    // Update selected employee quality and final score
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.name === reviewForm.employeeName) {
          const updatedEmp = {
            ...emp,
            quality: mappedQuality,
            lastReviewDate: newReview.date
          };
          updatedEmp.kpiScore = calculateFinalScore(updatedEmp, weights);
          return updatedEmp;
        }
        return emp;
      })
    );

    addAuditLog('Submit Appraisal Review', newRevId, 'None', `Rating: ${reviewForm.rating}`);
    pushAlert(`Performance Appraisal submitted for ${reviewForm.employeeName}: ${reviewForm.rating}`, 'Review Completed');
    addToast('success', `Appraisal review for ${reviewForm.employeeName} submitted.`);

    // Reset Review form
    setReviewForm({
      employeeName: '', type: 'Quarterly', period: 'Q2 2026', rating: 'Excellent',
      notes: '', feedback: '', recommendations: ''
    });

    // Close detail drawer if active
    setSelectedEmp(null);
  };

  /* PIP Resolution actions */
  const resolvePip = (pipId, name) => {
    setPips(prev => prev.filter(p => p.id !== pipId));
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.name === name) {
          const updated = {
            ...emp,
            status: 'Active',
            productivity: Math.min(100, emp.productivity + 20),
            quality: Math.min(100, emp.quality + 15)
          };
          updated.kpiScore = calculateFinalScore(updated, weights);
          return updated;
        }
        return emp;
      })
    );
    addAuditLog('Resolve PIP', pipId, 'Active PIP', 'Resolved (Active Status Restored)');
    pushAlert(`PIP Plan resolved for ${name}. Employee status restored to Active.`, 'PIP Completed');
    addToast('success', `Performance Improvement Plan resolved. ${name} is now restored to Active status.`);
  };

  /* PIP Escalation logic */
  const escalatePip = (pipId, name) => {
    setPips(prev =>
      prev.map(p => {
        if (p.id === pipId) {
          return { ...p, status: 'Escalated' };
        }
        return p;
      })
    );
    addAuditLog('Escalate PIP', pipId, 'Active PIP', 'Escalated to Executive Board');
    pushAlert(`PIP alert escalated to HR Director: ${name} goals not met.`, 'PIP Escalation');
    addToast('warning', `PIP for ${name} escalated to HR Board.`);
  };

  /* Create new PIP submission */
  const handlePipSubmit = (e) => {
    e.preventDefault();
    if (!pipForm.employeeName.trim() || !pipForm.issuesIdentified.trim()) {
      addToast('danger', 'Please select an employee and describe performance issues.');
      return;
    }

    const newPipId = `PIP-${String(pips.length + 1).padStart(3, '0')}`;
    const newPip = {
      ...pipForm,
      id: newPipId,
      status: 'Active',
      reviewer: userRole === 'Super Admin' ? 'Super Admin' : 'Aarav Sharma',
      dateCreated: new Date().toISOString().split('T')[0]
    };

    setPips(prev => [newPip, ...prev]);

    // Change employee status in table to PIP
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.name === pipForm.employeeName) {
          return { ...emp, status: 'PIP' };
        }
        return emp;
      })
    );

    addAuditLog('Create PIP', newPipId, 'None', `Employee: ${pipForm.employeeName}`);
    pushAlert(`Performance Improvement Plan (PIP) issued for ${pipForm.employeeName}`, 'PIP Opened');
    addToast('warning', `PIP successfully issued to ${pipForm.employeeName}. Status changed to PIP.`);

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
      if (userRole === 'Employee') return e.name === 'Aarav Sharma';
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

    return {
      avgOverallScore,
      avgProductivity,
      taskCompletionRate,
      avgAttendance,
      activeGoalsCount,
      reviewsCompletedCount
    };
  }, [employees, goals, reviews, userRole]);

  /* ── Filtered & Sorted Employees list ────────────────────── */
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Perspective lockdown
      if (userRole === 'Employee' && emp.name !== 'Aarav Sharma') return false;

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
          <div className="role-switcher-container">
            <span className="role-switcher-label">View Perspective:</span>
            <select
              value={userRole}
              onChange={(e) => {
                setUserRole(e.target.value);
                setPage(1);
                // Switch tabs back to dashboard if locked tab is active
                if (e.target.value === 'Employee' && ['framework', 'pips'].includes(activeTab)) {
                  setActiveTab('dashboard');
                }
                addToast('info', `Performance dashboard role swapped to: ${e.target.value}`);
              }}
              className="role-selector-input"
            >
              <option>Employee</option>
              <option>Team Leader</option>
              <option>Department Manager</option>
              <option>HR/Admin</option>
              <option>Super Admin</option>
            </select>
          </div>

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
          { id: 'framework', label: 'KPI Framework Weights', icon: <Settings size={15} />, visible: userRole !== 'Employee' },
          { id: 'goals', label: 'Goals & OKRs', icon: <Target size={15} />, visible: true },
          { id: 'reviews', label: 'Appraisal Reviews', icon: <Star size={15} />, visible: true },
          { id: 'pips', label: 'PIP (Improvement Plans)', icon: <AlertCircle size={15} />, visible: userRole !== 'Employee' },
          { id: 'audits', label: 'Alerts & Security Audits', icon: <ShieldAlert size={15} />, visible: true }
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
              <div className="card-value-display text-purple">91.7%</div>
              <span className="card-sub-desc">Sprint delivery target</span>
            </div>

            <div className="card perf-stat-card border-left-orange">
              <span className="card-lbl-gray">Top Performing Dept</span>
              <div className="card-value-display text-orange">Operations</div>
              <span className="card-sub-desc">Score: 95% this month</span>
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
                  <AreaChart data={MONTHLY_TREND}>
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
                    <Line type="monotone" name="IT" dataKey="IT" stroke="var(--accent-blue-solid)" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" name="Engineering" dataKey="Engineering" stroke="var(--color-success)" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" name="Sales" dataKey="Sales" stroke="var(--color-warning)" strokeWidth={1.5} dot={false} />
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
              <p className="subtitle" style={{ marginBottom: 12 }}>Jaipur vs Delhi vs Branch Offices overall performance metrics.</p>
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
            <p className="subtitle" style={{ marginBottom: 10 }}>Track milestone progress, budget usage indexes, and overall team performance.</p>
            <div className="reports-table-wrap">
              <table className="perf-data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Manager Assigned</th>
                    <th>Progress</th>
                    <th>Budget Used</th>
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
                      <td>{p.budget}</td>
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
                    <option>Operations</option>
                    <option>IT</option>
                    <option>Engineering</option>
                    <option>HR</option>
                    <option>Sales</option>
                    <option>Marketing</option>
                  </select>

                  <select
                    value={branchFilter}
                    onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
                    className="reports-select-filter"
                  >
                    <option value="All">All Branches</option>
                    <option>Jaipur HQ</option>
                    <option>Delhi Office</option>
                    <option>Branch Office</option>
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
                <span className="reports-form-lbl" style={{ fontWeight: 600 }}>Simulated recalculation for Aarav Sharma:</span>
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
                        <option>Engineering</option>
                        <option>IT</option>
                        <option>Operations</option>
                        <option>Sales</option>
                        <option>Marketing</option>
                        <option>HR</option>
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
                onClick={() => {
                  setAlerts(prev => prev.map(a => ({ ...n, read: true })));
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
