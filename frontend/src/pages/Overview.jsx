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

// ─── MASTER MOCK DATASETS ───────────────────────────────────────────────────

const mockBranchesList = [
  { id: 'BR-01', name: 'Jaipur HQ', country: 'India', manager: 'Aarav Sharma', employeesCount: 320, activeProjects: 12, timezone: 'IST (UTC+5:30)', status: 'Optimal', lat: '26.9124° N', lng: '75.7873° E', address: 'Malviya Nagar, Jaipur, Rajasthan 302017, India', productivity: 94, attendance: 96, type: 'branch' },
  { id: 'BR-02', name: 'Delhi Office', country: 'India', manager: 'Rajesh Kumar', employeesCount: 220, activeProjects: 8, timezone: 'IST (UTC+5:30)', status: 'Optimal', lat: '28.6139° N', lng: '77.2090° E', address: 'Connaught Place, New Delhi - 110001', productivity: 91, attendance: 93, type: 'branch' },
  { id: 'BR-03', name: 'Mumbai Office', country: 'India', manager: 'Sanjay Gupta', employeesCount: 180, activeProjects: 6, timezone: 'IST (UTC+5:30)', status: 'High Load', lat: '19.0760° N', lng: '72.8777° E', address: 'Bandra Kurla Complex, Mumbai - 400051', productivity: 89, attendance: 90, type: 'branch' },
  { id: 'BR-04', name: 'Kolkata Office', country: 'India', manager: 'Shweta Joshi', employeesCount: 120, activeProjects: 5, timezone: 'IST (UTC+5:30)', status: 'Optimal', lat: '22.5726° N', lng: '88.3639° E', address: 'Salt Lake City, Kolkata - 700091', productivity: 83, attendance: 92, type: 'branch' },
  { id: 'BR-05', name: 'Chennai Office', country: 'India', manager: 'Harish Verma', employeesCount: 95, activeProjects: 4, timezone: 'IST (UTC+5:30)', status: 'Critical', lat: '13.0827° N', lng: '80.2707° E', address: 'OMR Road, Chennai - 600096', productivity: 68, attendance: 85, type: 'branch' }
];

const mockDeptsList = [
  { name: 'IT', iconName: 'Layers', count: 450, manager: 'Ananya Gupta', activeProjects: 18, productivity: 92, attendance: 94, color: 'var(--color-primary)', type: 'department' },
  { name: 'HR', iconName: 'Users', count: 120, manager: 'Neha Verma', activeProjects: 4, productivity: 88, attendance: 95, color: '#f59e0b', type: 'department' },
  { name: 'Sales', iconName: 'DollarSign', count: 310, manager: 'Rohit Sharma', activeProjects: 8, productivity: 95, attendance: 91, color: '#10b981', type: 'department' },
  { name: 'Marketing', iconName: 'Megaphone', count: 180, manager: 'Priya Patel', activeProjects: 6, productivity: 90, attendance: 92, color: '#8b5cf6', type: 'department' },
  { name: 'Finance', iconName: 'Building2', count: 90, manager: 'Manoj Tiwari', activeProjects: 3, productivity: 87, attendance: 96, color: '#06b6d4', type: 'department' },
  { name: 'Operations', iconName: 'Network', count: 100, manager: 'Aarav Sharma', activeProjects: 5, productivity: 93, attendance: 93, color: '#ec4899', type: 'department' }
];

const mockWorkflowsList = [
  { id: 'WF-01', name: 'CI/CD Automated Deployment', progress: 85, status: 'Running', department: 'IT', branch: 'Jaipur HQ', date: '2026-05-29' },
  { id: 'WF-02', name: 'Quarterly Payroll Disbursal', progress: 100, status: 'Completed', department: 'Finance', branch: 'Delhi Office', date: '2026-05-28' },
  { id: 'WF-03', name: 'Candidate Onboarding Sync', progress: 45, status: 'Running', department: 'HR', branch: 'Mumbai Office', date: '2026-05-29' },
  { id: 'WF-04', name: 'Sales Lead Nurturing Campaign', progress: 20, status: 'Paused', department: 'Sales', branch: 'Jaipur HQ', date: '2026-05-25' },
  { id: 'WF-05', name: 'Social Media Ad Placement', progress: 95, status: 'Delayed', department: 'Marketing', branch: 'Kolkata Office', date: '2026-05-22' },
  { id: 'WF-06', name: 'Office Asset Audit', progress: 60, status: 'Running', department: 'Operations', branch: 'Chennai Office', date: '2026-05-27' },
  { id: 'WF-07', name: 'Database Security Hardening', progress: 10, status: 'Paused', department: 'IT', branch: 'Delhi Office', date: '2026-05-24' }
];

const mockProjectsList = [
  { id: 'PRJ-01', name: 'SaaS Platform v2.0', status: 'In Progress', progress: 78, department: 'IT', branch: 'Jaipur HQ', date: '2026-05-29', productivity: 92 },
  { id: 'PRJ-02', name: 'Employee Engagement System', status: 'Completed', progress: 100, department: 'HR', branch: 'Delhi Office', date: '2026-05-15', productivity: 94 },
  { id: 'PRJ-03', name: 'Q2 Domestic Sales Boost', status: 'In Progress', progress: 60, department: 'Sales', branch: 'Mumbai Office', date: '2026-05-28', productivity: 88 },
  { id: 'PRJ-04', name: 'APAC Marketing Rebrand', status: 'Delayed', progress: 35, department: 'Marketing', branch: 'Kolkata Office', date: '2026-05-10', productivity: 70 },
  { id: 'PRJ-05', name: 'Audit & Compliance Prep', status: 'Pending', progress: 10, department: 'Finance', branch: 'Delhi Office', date: '2026-05-26', productivity: 85 },
  { id: 'PRJ-06', name: 'Chennai Facility Setup', status: 'Delayed', progress: 40, department: 'Operations', branch: 'Chennai Office', date: '2026-05-05', productivity: 65 }
];

const mockTasksList = [
  { id: 'TSK-01', name: 'Resolve SSL Cert Latency', assignee: 'Ananya Gupta', priority: 'Critical', dueDate: '2026-05-30', status: 'Delayed', department: 'IT', branch: 'Jaipur HQ' },
  { id: 'TSK-02', name: 'Submit Q2 Tax Audit Report', assignee: 'Manoj Tiwari', priority: 'High', dueDate: '2026-06-05', status: 'Pending', department: 'Finance', branch: 'Delhi Office' },
  { id: 'TSK-03', name: 'Finalize Offer Letters Batch', assignee: 'Neha Verma', priority: 'Medium', dueDate: '2026-06-02', status: 'Pending', department: 'HR', branch: 'Jaipur HQ' },
  { id: 'TSK-04', name: 'Optimize Recharts Rendering', assignee: 'Vikram Singh', priority: 'High', dueDate: '2026-05-29', status: 'Delayed', department: 'IT', branch: 'Delhi Office' },
  { id: 'TSK-05', name: 'Verify Biometric Punches', assignee: 'Aarav Sharma', priority: 'Low', dueDate: '2026-06-01', status: 'Pending', department: 'Operations', branch: 'Jaipur HQ' },
  { id: 'TSK-06', name: 'Setup Chennai IP Whitelist', assignee: 'Harish Verma', priority: 'Critical', dueDate: '2026-05-25', status: 'Delayed', department: 'IT', branch: 'Chennai Office' }
];

const mockAnnouncementsList = [
  { id: 'ANN-01', date: '2026-05-29', category: 'Events', title: 'CEO Townhall Meeting', desc: 'Annual company townhall scheduled for next Monday at 3 PM IST to align on Q3 goals.', department: 'Operations', branch: 'Jaipur HQ' },
  { id: 'ANN-02', date: '2026-05-28', category: 'Policies', title: 'New HR Policy Update', desc: 'Revised guidelines on medical allowances and remote leaves uploaded to the Document Vault.', department: 'HR', branch: 'Delhi Office' },
  { id: 'ANN-03', date: '2026-05-26', category: 'Milestones', title: 'Q1 Sales Target Achieved', desc: 'The marketing and sales team successfully achieved and exceeded our Q1 revenue goal by 12%!', department: 'Sales', branch: 'Mumbai Office' },
  { id: 'ANN-04', date: '2026-05-24', category: 'Operations', title: 'New Branch in Ahmedabad', desc: 'We are expanding! Our new office in Ahmedabad, Gujarat, is officially operational.', department: 'Operations', branch: 'Jaipur HQ' }
];

const mockActivitiesList = [
  { id: 'ACT-01', time: '10 mins ago', type: 'success', title: 'New employees joined', details: '15 new employees joined this month across engineering and sales divisions.', department: 'HR', branch: 'Jaipur HQ', iconName: 'UserPlus', date: '2026-05-30' },
  { id: 'ACT-02', time: '1 hour ago', type: 'primary', title: 'Project completed successfully', details: 'Project Alpha v2.0 completed milestone testing and deployed to production.', department: 'IT', branch: 'Delhi Office', iconName: 'CheckCircle', date: '2026-05-30' },
  { id: 'ACT-03', time: '3 hours ago', type: 'success', title: 'Attendance milestone reached', details: 'Attendance reached 96% today company-wide, setting a new weekly record.', department: 'Operations', branch: 'Jaipur HQ', iconName: 'TrendingUp', date: '2026-05-30' },
  { id: 'ACT-04', time: '5 hours ago', type: 'purple', title: 'New branch added', details: 'Added new regional operations node in Connaught Place, Delhi Branch.', department: 'Operations', branch: 'Delhi Office', iconName: 'Building2', date: '2026-05-30' },
  { id: 'ACT-05', time: '1 day ago', type: 'warning', title: 'Latency threshold breach', details: 'Staging web server latency increased above 500ms; routing auto-scaled.', department: 'IT', branch: 'Mumbai Office', iconName: 'AlertTriangle', date: '2026-05-29' },
  { id: 'ACT-06', time: '2 days ago', type: 'danger', title: 'Delayed project flagged', details: 'APAC Marketing Rebrand flagged as delayed due to content reviews.', department: 'Marketing', branch: 'Kolkata Office', iconName: 'Clock', date: '2026-05-28' }
];

const mockAlertsList = [
  { id: 'AL-01', type: 'danger', title: 'Delayed Projects', message: 'Project "APAC Marketing Rebrand" is delayed by 18 days.', timestamp: 'Just now', department: 'Marketing', branch: 'Kolkata Office', iconName: 'AlertCircle' },
  { id: 'AL-02', type: 'danger', title: 'Low Productivity', message: 'Chennai Office productivity dropped to 68% (threshold 75%).', timestamp: '12 mins ago', department: 'Operations', branch: 'Chennai Office', iconName: 'AlertTriangle' },
  { id: 'AL-03', type: 'warning', title: 'Attendance Warnings', message: '5 late punch-ins flagged at Mumbai Office today.', timestamp: '1 hour ago', department: 'Operations', branch: 'Mumbai Office', iconName: 'Clock' },
  { id: 'AL-04', type: 'warning', title: 'Pending Approvals', message: '3 engineering leave requests awaiting review.', timestamp: '3 hours ago', department: 'HR', branch: 'Delhi Office', iconName: 'CheckCircle' },
  { id: 'AL-05', type: 'purple', title: 'Security Alerts', message: 'Multiple login attempts detected from unauthorized IP at Chennai node.', timestamp: '5 hours ago', department: 'IT', branch: 'Chennai Office', iconName: 'Shield' }
];

const mockGrowthData = [
  { month: 'Jan', employees: 850, projects: 28, productivity: 82, departments: 18 },
  { month: 'Feb', employees: 920, projects: 30, productivity: 84, departments: 20 },
  { month: 'Mar', employees: 1040, projects: 32, productivity: 86, departments: 22 },
  { month: 'Apr', employees: 1150, projects: 36, productivity: 89, departments: 24 },
  { month: 'May', employees: 1220, projects: 39, productivity: 91, departments: 24 },
  { month: 'Jun', employees: 1250, projects: 42, productivity: 94, departments: 24 }
];

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
  Shield: Shield
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
  const { addToast } = useApp();
  const navigate = useNavigate();
  const loading = usePageLoading(600);

  // ── Search & Filter State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [performanceFilter, setPerformanceFilter] = useState('All');

  // ── Interactive UI States ──
  const [selectedBranch, setSelectedBranch] = useState(mockBranchesList[0]);
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
  const [announcements, setAnnouncements] = useState(mockAnnouncementsList);
  const [alerts, setAlerts] = useState(mockAlertsList);
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
      const now = new Date('2026-05-30'); // System Date
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
  const filteredBranches = useMemo(() => mockBranchesList.filter(matchesFilters), [searchQuery, branchFilter, deptFilter, performanceFilter]);
  const filteredDepts = useMemo(() => mockDeptsList.filter(matchesFilters), [searchQuery, branchFilter, deptFilter, performanceFilter]);
  const filteredWorkflows = useMemo(() => mockWorkflowsList.filter(matchesFilters), [searchQuery, branchFilter, deptFilter, dateFilter]);
  const filteredProjects = useMemo(() => mockProjectsList.filter(matchesFilters), [searchQuery, branchFilter, deptFilter, dateFilter, performanceFilter]);
  const filteredTasks = useMemo(() => mockTasksList.filter(matchesFilters), [searchQuery, branchFilter, deptFilter]);
  const filteredAnnouncements = useMemo(() => announcements.filter(matchesFilters), [announcements, searchQuery, branchFilter, deptFilter, dateFilter]);
  const filteredActivities = useMemo(() => mockActivitiesList.filter(matchesFilters), [searchQuery, branchFilter, deptFilter]);
  const filteredAlerts = useMemo(() => alerts.filter(matchesFilters), [alerts, searchQuery, branchFilter, deptFilter]);

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
    addToast('success', `Generating & Downloading ${reportConfig.type} in ${reportConfig.format} format...`);
  };

  const handleCreateAnnouncement = () => {
    if (!announcementForm.title || !announcementForm.desc) {
      addToast('warning', 'Please fill in all announcement fields.');
      return;
    }
    const newAnn = {
      id: `ANN-${Date.now()}`,
      date: '2026-05-30',
      category: announcementForm.category,
      title: announcementForm.title,
      desc: announcementForm.desc,
      department: deptFilter === 'All' ? 'Operations' : deptFilter,
      branch: branchFilter === 'All' ? 'Jaipur HQ' : branchFilter
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    setAnnouncementForm({ title: '', category: 'General', desc: '' });
    setShowAnnounceModal(false);
    addToast('success', 'Company announcement posted successfully.');
  };

  const handleDismissAlert = (id) => {
    setAlerts(prev => prev.filter(al => al.id !== id));
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
    if (filteredBranches.length > 0 && !filteredBranches.some(b => b.id === selectedBranch.id)) {
      setSelectedBranch(filteredBranches[0]);
    }
  }, [filteredBranches, selectedBranch]);

  // ── Workforce Analytics Data Calculations ──
  const workforceDonutData = [
    { name: 'Active', value: Math.round(totalEmployees * 0.82), color: '#10b981' },
    { name: 'New Joiners', value: Math.round(totalEmployees * 0.05), color: '#3b82f6' },
    { name: 'On Leave', value: Math.round(totalEmployees * 0.04), color: '#ef4444' },
    { name: 'Remote', value: Math.round(totalEmployees * 0.09), color: '#8b5cf6' }
  ];

  const deptBarData = filteredDepts.map(d => ({
    name: d.name,
    Employees: d.count,
    color: d.color
  }));

  // ── Today Attendance Summary Metrics ──
  const attendanceMetrics = {
    present: Math.round(totalEmployees * 0.94),
    late: Math.round(totalEmployees * 0.03),
    absent: Math.round(totalEmployees * 0.02),
    onLeave: Math.round(totalEmployees * 0.01),
    overtime: Math.round(totalEmployees * 0.12)
  };

  const weeklyAttendanceTrend = [
    { name: 'Mon', Attendance: 91 },
    { name: 'Tue', Attendance: 93 },
    { name: 'Wed', Attendance: 92 },
    { name: 'Thu', Attendance: 95 },
    { name: 'Fri', Attendance: 94 },
    { name: 'Sat', Attendance: 88 },
    { name: 'Sun', Attendance: 85 }
  ];

  const shiftData = [
    { shift: 'Morning', count: Math.round(totalEmployees * 0.65) },
    { shift: 'Evening', count: Math.round(totalEmployees * 0.25) },
    { shift: 'Night', count: Math.round(totalEmployees * 0.10) }
  ];

  // ── Real-Time Strip Data ──
  const onlineEmployeesCount = Math.round(totalEmployees * 0.72);
  const runningWorkflowsCount = filteredWorkflows.filter(w => w.status === 'Running').length;
  const activeMeetingsCount = Math.max(2, Math.round(filteredBranches.length * 1.5));
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
          <Button variant="secondary" onClick={() => setIsAlertsOpen(true)} icon={Bell} className="alerts-toggle-btn">
            Alerts ({filteredAlerts.length})
          </Button>
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
            {mockBranchesList.map(b => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
          
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="All">All Departments</option>
            {mockDeptsList.map(d => (
              <option key={d.name} value={d.name}>{d.name}</option>
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
                <span className="card-subtitle">Headcount and annual budget allocation</span>
              </div>
              <div className="depts-list">
                {filteredDepts.map((dept) => {
                  const percentage = totalEmployees > 0 ? Math.round((dept.count / 1250) * 100) : 0;
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
                    const isSelected = selectedBranch.id === b.id;
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
                <div className="branch-detail-panel">
                  <div className="branch-detail-header">
                    <div className="branch-title-wrap">
                      <Globe2 size={24} className="globe-icon" />
                      <div>
                        <h4>{selectedBranch.name}</h4>
                        <span className="country-sub">{selectedBranch.country}</span>
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
                      <span className="meta-val">{selectedBranch.employeesCount} Employees</span>
                    </div>
                    <div className="branch-meta-item">
                      <span className="meta-label">Running Projects</span>
                      <span className="meta-val">{selectedBranch.activeProjects} Projects</span>
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
                      <span className="meta-label">Coordinates</span>
                      <span className="meta-val code-val">
                        {selectedBranch.lat}, {selectedBranch.lng}
                      </span>
                    </div>
                    <div className="branch-meta-item span-all">
                      <span className="meta-label">Physical Address</span>
                      <span className="meta-val address-val">
                        {selectedBranch.address}
                      </span>
                    </div>
                  </div>

                  <div className="branch-status-box">
                    <CheckCircle size={16} className="status-box-icon" />
                    <p>
                      Branch is operational with high connectivity. Automated payroll, leave sync, and timesheet reports are fully integrated.
                    </p>
                  </div>
                </div>
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
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mockGrowthData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} />
                  <Legend />
                  {visibleLines.employees && <Line type="monotone" dataKey="employees" stroke="var(--color-primary)" strokeWidth={2.5} name="Employees" dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                  {visibleLines.projects && <Line type="monotone" dataKey="projects" stroke="#10b981" strokeWidth={2.5} name="Projects" dot={{ r: 4 }} />}
                  {visibleLines.productivity && <Line type="monotone" dataKey="productivity" stroke="#f59e0b" strokeWidth={2.5} name="Productivity Rate %" dot={{ r: 4 }} />}
                  {visibleLines.departments && <Line type="monotone" dataKey="departments" stroke="#8b5cf6" strokeWidth={2.5} name="Departments" dot={{ r: 4 }} />}
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
            ['Delayed Projects', 'Low Productivity', 'Attendance Warnings', 'Pending Approvals', 'Security Alerts'].map((groupTitle) => {
              const groupAlerts = filteredAlerts.filter(al => {
                if (groupTitle === 'Security Alerts') return al.title === 'Security Alerts' || al.title === 'Security';
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
                <option value="Jaipur HQ">Jaipur HQ</option>
                <option value="Delhi Office">Delhi Office</option>
                <option value="Mumbai Office">Mumbai Office</option>
                <option value="Kolkata Office">Kolkata Office</option>
                <option value="Chennai Office">Chennai Office</option>
              </select>
            </div>
            <div className="form-group-select">
              <label>Department Target</label>
              <select value={reportConfig.dept} onChange={(e) => setReportConfig(prev => ({ ...prev, dept: e.target.value }))}>
                <option value="All">All Divisions</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
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
