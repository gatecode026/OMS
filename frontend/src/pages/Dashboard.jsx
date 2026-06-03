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
  Send
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const mockBranchesData = [
  { name: 'Jaipur HQ', country: 'India', flag: '🇮🇳', headcount: 3, projects: 2, status: 'Optimal', score: 97, revenue: '₹20.4Cr' },
  { name: 'Delhi Office', country: 'India', flag: '🇮🇳', headcount: 4, projects: 2, status: 'Active', score: 89, revenue: '₹15.3Cr' },
  { name: 'Mumbai Office', country: 'India', flag: '🇮🇳', headcount: 1, projects: 1, status: 'Optimal', score: 82, revenue: '₹7.8Cr' },
  { name: 'Bangalore Office', country: 'India', flag: '🇮🇳', headcount: 1, projects: 1, status: 'Active', score: 75, revenue: '₹5.7Cr' }
];

const mockDeptsData = [
  { name: 'IT', employees: 220, productivity: '92%', activeTasks: 180, color: 'var(--color-primary)' },
  { name: 'HR', employees: 45, productivity: '88%', activeTasks: 24, color: '#f59e0b' },
  { name: 'Sales', employees: 160, productivity: '95%', activeTasks: 110, color: '#10b981' },
  { name: 'Marketing', employees: 85, productivity: '90%', activeTasks: 72, color: '#8b5cf6' }
];

const mockReportsData = [
  { id: 'R-1', employee: 'Aarav Sharma', avatar: 'AS', project: 'SaaS Platform v2', hours: 8, status: 'Approved', summary: 'Refactored lazy routes, authorization guards, and theme settings.', blockers: 'None. Clean build outputs verified.', tomorrowGoals: 'Develop active theme toggling and setup inbox messaging.' },
  { id: 'R-2', employee: 'Rajesh Kumar', avatar: 'RK', project: 'Marketing Website', hours: 7.5, status: 'Submitted', summary: 'Designed fresh layouts, vector assets, and brand color systems.', blockers: 'None. Client review pending.', tomorrowGoals: 'Finalize SVG icons export and coordinate assets deployment.' },
  { id: 'R-3', employee: 'Meena Sharma', avatar: 'MS', project: 'Q2 Promo Campaign', hours: 6, status: 'Flagged', summary: 'Attended client reviews. Did not log detailed task logs.', blockers: 'Awaiting copy approval from operations.', tomorrowGoals: 'Submit corrected hours sheet.' },
  { id: 'R-4', employee: 'Prakash Patel', avatar: 'PP', project: 'Branch Deployments', hours: 8.5, status: 'Approved', summary: 'Configured workstations, user controls, and IP whitelist profiles.', blockers: 'Network latency issues resolved.', tomorrowGoals: 'Verify backup cron schedules and session timeouts.' }
];

const mockActivitiesData = [
  {
    id: 'act-1',
    type: 'success',
    time: '10 mins ago',
    icon: Clock,
    title: <span><strong>Aarav Sharma</strong> punched in at Jaipur HQ office</span>,
    details: 'Checked in physically at 08:58 AM using biometric hardware at Jaipur Malviya Nagar office.'
  },
  {
    id: 'act-2',
    type: 'warning',
    time: '1 hour ago',
    icon: CalendarDays,
    title: <span><strong>Vikram Singh</strong> submitted a medical leave request</span>,
    details: 'Medical leave request submitted for 3 days starting June 1st. Attachment uploaded.'
  },
  {
    id: 'act-3',
    type: 'primary',
    time: '3 hours ago',
    icon: CheckCircle,
    title: <span><strong>Ananya Gupta</strong> updated task <strong>Deploy production v2.1</strong> to Done</span>,
    details: 'Task moved to Done status. Commit hash: 9a2f1c8d. All unit tests passed.'
  },
  {
    id: 'act-4',
    type: 'purple',
    time: '5 hours ago',
    icon: UserPlus,
    title: <span>New employee <strong>Neha Patel</strong> added to IT department</span>,
    details: 'Onboarded Neha Patel as Frontend Engineer. Provisioned email: neha.patel@saas.com.'
  },
  {
    id: 'act-5',
    type: 'success',
    time: '1 day ago',
    icon: FileText,
    title: <span><strong>Rohit Sharma</strong> submitted Q2 Marketing Work Report</span>,
    details: 'Logged 8.5 hours. Core focus: campaign assets creation and ad copywriting draft.'
  },
  {
    id: 'act-6',
    type: 'primary',
    time: '1 day ago',
    icon: FileCheck,
    title: <span><strong>Neha Verma</strong> approved DevOps CI/CD pipeline automation workflow</span>,
    details: 'Workflow recipe triggered. Production deployments now run on staging success.'
  }
];

const mockAlertsData = [
  {
    id: 'al-1',
    type: 'danger',
    title: 'Late Attendance Alert',
    desc: '3 employees clocked in late at Jaipur HQ today.',
    time: 'Just now',
    icon: AlertTriangle,
    details: 'Neha Patel, Vikram Singh, and Aarav Sharma checked in after the grace period (09:15 AM). Late flags applied.',
    resolution: 'Notify employees or waive compliance flag.'
  },
  {
    id: 'al-2',
    type: 'danger',
    title: 'Missing Punch-Outs',
    desc: 'Missing punch-out detected for Rajesh Kumar yesterday.',
    time: '2 hours ago',
    icon: AlertCircle,
    details: 'Rajesh Kumar failed to log checkout session. Current active status is still open.',
    resolution: 'Force logout session or manually input check-out timesheet.'
  },
  {
    id: 'al-3',
    type: 'warning',
    title: 'Pending Approvals',
    desc: '5 leave requests are awaiting manager approval reviews.',
    time: '4 hours ago',
    icon: Clock,
    details: 'Leave queue has reached threshold level. Delay is blocking sprint allocation.',
    resolution: 'Go to Leave Management page to audit pending requests.'
  },
  {
    id: 'al-4',
    type: 'purple',
    title: 'Upcoming Deadline',
    desc: '"Security Audit and Penetration Test" is due in 2 hours.',
    time: '5 hours ago',
    icon: Activity,
    details: 'High-severity task is pending final QA review. Assigned to Aarav Sharma.',
    resolution: 'Ping assignee or reassign deadline.'
  },
  {
    id: 'al-5',
    type: 'primary',
    title: 'System Notification',
    desc: 'Automatic cloud backup completed successfully at 04:00 AM.',
    time: '6 hours ago',
    icon: Info,
    details: 'Database incremental storage pool successfully replicated across region blocks. Integrity status: green.',
    resolution: 'View audit logs or configure schedules.'
  }
];
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
    addToast,
    showConfirm
  } = useApp();

  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [leaderboardTab, setLeaderboardTab] = useState('employee'); // 'employee' or 'branch'
  const [reports, setReports] = useState(mockReportsData);
  const [showExtendedStats, setShowExtendedStats] = useState(false);

  // Communication Center State
  const [commTab, setCommTab] = useState('company');
  const [commModal, setCommModal] = useState(null); // 'announcement', 'notification', 'email'
  const [commForm, setCommForm] = useState({ title: '', body: '', target: 'All' });
  const [announcements, setAnnouncements] = useState({
    company: [
      { title: 'CEO Townhall Meeting', body: 'Q2 All-Hands meeting scheduled for June 5th at 3 PM IST.', time: '1d ago' },
      { title: 'New Office Policy', body: 'Updated remote work policy document uploaded in Document Vault.', time: '3d ago' }
    ],
    department: [
      { title: 'Engineering Sprint Sync', body: 'All devs please update task statuses before end of sprint.', time: '2h ago' },
      { title: 'HR Compliance Audit', body: 'Please verify and update document list under employee profile.', time: '1d ago' }
    ],
    team: [
      { title: 'Frontend UI Polish', body: 'Meeting today at 4:30 PM to discuss dashboard custom gradient colors.', time: '30m ago' }
    ]
  });

  const handleQuickAction = (type) => {
    setCommForm({ title: '', body: '', target: type === 'email' ? 'All Employees' : 'All Departments' });
    setCommModal(type);
  };

  const handleCommSubmit = () => {
    if (!commForm.title || !commForm.body) {
      addToast('warning', 'Please fill in all fields.');
      return;
    }
    if (commModal === 'announcement') {
      const newAnn = { title: commForm.title, body: commForm.body, time: 'Just now' };
      setAnnouncements(prev => ({
        ...prev,
        company: [newAnn, ...prev.company]
      }));
      addToast('success', 'Announcement published successfully!');
    } else if (commModal === 'notification') {
      addToast('success', `Alert sent to target group: ${commForm.target}`);
    } else {
      addToast('success', `Email dispatched successfully!`);
    }
    setCommModal(null);
  };

  // Org Chart Hierarchy Data
  const orgChartData = {
    name: 'Aarav Sharma',
    role: 'Chief Executive Officer / COO',
    subItems: [
      {
        name: 'Vikram Singh',
        role: 'Engineering Director / Branch Admin',
        subItems: [
          {
            name: 'Ananya Gupta',
            role: 'Engineering Manager / Team Leader',
            subItems: [
              { name: 'Suresh Kumar', role: 'Frontend Developer', subItems: [] },
              { name: 'Kavita Singh', role: 'QA Engineer', subItems: [] }
            ]
          },
          {
            name: 'Arjun Mehta',
            role: 'Data Manager / Team Leader',
            subItems: [
              { name: 'Amit Bose', role: 'Cloud Engineer', subItems: [] }
            ]
          }
        ]
      },
      {
        name: 'Priya Patel',
        role: 'Marketing Director / Branch Admin',
        subItems: [
          {
            name: 'Rohit Sharma',
            role: 'Sales Manager / Team Leader',
            subItems: [
              { name: 'Deepak Joshi', role: 'Account Executive', subItems: [] },
              { name: 'Naveen Saxena', role: 'Sales Specialist', subItems: [] }
            ]
          }
        ]
      }
    ]
  };

  // Stats Calculations
  const totalEmployeesCount = employees.length || 8;
  const activeProjectsCount = 4; // Mock projects total count
  const presentToday = attendance.filter(a => a.date === '2026-05-29' && a.status === 'Present').length || 7;
  const attendanceRate = Math.round((presentToday / totalEmployeesCount) * 100);

  const todoTasks = tasks.filter(t => t.status === 'To Do').length;
  const progressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const doneTasks = tasks.filter(t => t.status === 'Done').length;

  const totalDepts = [...new Set(employees.map(e => e.department))].length || 4;
  const totalTeams = [...new Set(employees.map(e => e.team).filter(Boolean))].length || 6;
  const probationCount = employees.filter(e => e.employmentStatus === 'Probation').length || 3;
  const contractExpiringCount = employees.filter(e => e.employeeType === 'Contract').length || 2;
  const missingDocsCount = employees.filter(e => !e.documents || e.documents.length < 3).length || 5;
  const notMarkedAttendanceCount = Math.max(0, employees.length - presentToday);
  const avgTenure = "2.4 Years";
  const turnoverRate = "4.8%";
  const satisfactionScore = "88%";

  // Chart Data
  const attendanceChartData = [
    { date: '05-22', present: 8, absent: 1, late: 1, leave: 1 },
    { date: '05-23', present: 9, absent: 0, late: 0, leave: 1 },
    { date: '05-24', present: 7, absent: 2, late: 1, leave: 0 },
    { date: '05-25', present: 8, absent: 1, late: 2, leave: 0 },
    { date: '05-26', present: 9, absent: 0, late: 1, leave: 1 },
    { date: '05-27', present: 8, absent: 1, late: 0, leave: 2 },
    { date: '05-28', present: 7, absent: 2, late: 1, leave: 1 },
    { date: '05-29', present: 8, absent: 1, late: 1, leave: 1 }
  ];

  // Leaderboard data
  const employeeLeaderboard = [
    { name: 'Ananya Gupta', dept: 'Engineering', score: 98, color: '#10b981' },
    { name: 'Aarav Sharma', dept: 'Operations', score: 95, color: '#3b82f6' },
    { name: 'Rohit Sharma', dept: 'Sales', score: 88, color: '#8b5cf6' },
    { name: 'Vikram Singh', dept: 'Engineering', score: 76, color: '#f59e0b' }
  ];

  const branchLeaderboard = mockBranchesData.map(b => ({
    name: b.name,
    dept: `${b.country} • ${b.headcount} Emps`,
    score: b.score,
    color: b.status === 'Optimal' ? '#10b981' : '#3b82f6'
  }));

  const handleReportAction = (id, nextStatus, isModal = false) => {
    const report = reports.find(r => r.id === id);
    const empName = report ? report.employee : 'Employee';
    const actionName = nextStatus === 'Approved' ? 'Approve' : 'Flag';
    const title = `${actionName} Work Report`;
    const message = `Are you sure you want to ${nextStatus === 'Approved' ? 'approve' : 'flag'} the work report for ${empName}?`;
    const confirmType = nextStatus === 'Approved' ? 'primary' : 'danger';

    showConfirm(
      title,
      message,
      () => {
        setReports(prev =>
          prev.map(r => (r.id === id ? { ...r, status: nextStatus } : r))
        );
        addToast(
          nextStatus === 'Approved' ? 'success' : 'warning',
          `Work report status updated to ${nextStatus}.`
        );
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
          trendVal="+3"
          trendType="up"
          trendLabel="Joined this month"
          icon={Users}
          colorVariant="primary"
          sparklineData={[6, 7, 7, 8, 8, 8, 9]}
          onClick={() => navigate('/employees')}
          subMetrics={[
            { label: 'Active', value: employees.filter(e => e.status !== 'Inactive').length },
            { label: 'New', value: 3 }
          ]}
        />
        <StatCard
          label="Attendance Overview"
          value={`${attendanceRate}%`}
          trendVal="Optimal"
          trendType="success"
          trendLabel="Daily presence score"
          icon={Clock}
          colorVariant="success"
          sparklineData={[80, 85, 82, 88, 84, 86, 88]}
          onClick={() => navigate('/attendance')}
          subMetrics={[
            { label: 'Present', value: presentToday },
            { label: 'Absent', value: totalEmployeesCount - presentToday - 1 },
            { label: 'Late', value: 1 },
            { label: 'Leave', value: 1 }
          ]}
        />
        <StatCard
          label="Active Projects"
          value={activeProjectsCount}
          trendVal="+1"
          trendType="up"
          trendLabel="Initiated this quarter"
          icon={Briefcase}
          colorVariant="purple"
          sparklineData={[2, 2, 3, 3, 4, 4, 4]}
          onClick={() => navigate('/projects')}
          subMetrics={[
            { label: 'Running', value: 3 },
            { label: 'Completed', value: 1 },
            { label: 'Delayed', value: 0 },
            { label: 'Deadlines', value: 2 }
          ]}
        />
        <StatCard
          label="Daily Work Reports"
          value={reports.length}
          trendVal="92%"
          trendType="up"
          trendLabel="Submission compliance"
          icon={FileText}
          colorVariant="primary"
          sparklineData={[5, 6, 5, 7, 6, 8, 8]}
          onClick={() => navigate('/work-reports')}
          subMetrics={[
            { label: 'Submitted', value: 4 },
            { label: 'Pending', value: 1 },
            { label: 'Reviewed', value: 3 }
          ]}
        />
        <StatCard
          label="Task Management Summary"
          value={todoTasks + progressTasks + doneTasks}
          trendVal={doneTasks}
          trendType="info"
          trendLabel="Tasks marked Done"
          icon={CheckCircle}
          colorVariant="warning"
          sparklineData={[4, 5, 4, 6, 5, 7, 7]}
          onClick={() => navigate('/tasks')}
          subMetrics={[
            { label: 'Pending', value: todoTasks + progressTasks },
            { label: 'Completed', value: doneTasks },
            { label: 'Overdue', value: 2 }
          ]}
        />
        <StatCard
          label="Branch / Agency Overview"
          value={mockBranchesData.length}
          trendVal="Active"
          trendType="up"
          trendLabel="All nodes operational"
          icon={Building2}
          colorVariant="primary"
          sparklineData={[4, 4, 4, 4, 4, 4, 4]}
          onClick={() => navigate('/branches')}
          subMetrics={[
            { label: 'Active', value: 4 },
            { label: 'Avg Perf', value: '91%' },
            { label: 'HQ Headcount', value: 3 }
          ]}
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
              <AreaChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" name="Present" />
                <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAbsent)" name="Absent" />
                <Area type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorLate)" name="Late" />
                <Area type="monotone" dataKey="leave" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeave)" name="On Leave" />
              </AreaChart>
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
            {mockBranchesData.map((branch, idx) => (
              <div key={idx} className="branch-overview-item branch-overview-item-clickable" onClick={() => navigate('/branches')}>
                <div className="branch-overview-main">
                  <span className="branch-flag-emoji">{branch.flag}</span>
                  <div>
                    <span className="branch-name-txt">{branch.name}</span>
                    <span className="branch-meta-txt">{branch.country} • {branch.headcount} Employees</span>
                  </div>
                </div>
                <div className="branch-overview-aside">
                  <span className="branch-rev">{branch.revenue}</span>
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
                {mockDeptsData.map((d, i) => (
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
              <OrgNode {...orgChartData} isRoot={true} />
            </div>
          </div>
        </div>

        {/* Communication Center Card */}
        <div className="card split-panel flex-1" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header-simple" style={{ paddingBottom: 'var(--spacing-3)' }}>
            <div>
              <h3 className="card-title">Communication Center</h3>
              <span className="chart-subtitle">Direct broadcasting & quick updates</span>
            </div>
            
            {/* Communication Tab selector */}
            <div className="tab-btn-group">
              <button
                className={`tab-btn ${commTab === 'company' ? 'active' : ''}`}
                onClick={() => setCommTab('company')}
              >
                Company
              </button>
              <button
                className={`tab-btn ${commTab === 'department' ? 'active' : ''}`}
                onClick={() => setCommTab('department')}
              >
                Dept
              </button>
              <button
                className={`tab-btn ${commTab === 'team' ? 'active' : ''}`}
                onClick={() => setCommTab('team')}
              >
                Team
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', padding: 'var(--spacing-3) var(--spacing-6)', gap: 'var(--spacing-2)', borderBottom: '1px solid var(--border-color)' }}>
            <Button size="sm" onClick={() => handleQuickAction('announcement')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Bell size={12} /> Broadcast
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleQuickAction('notification')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} /> Alert
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleQuickAction('email')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mail size={12} /> Email
            </Button>
          </div>

          <div className="panel-scroll-list" style={{ padding: 'var(--spacing-4) var(--spacing-6)', flex: 1, overflowY: 'auto' }}>
            {announcements[commTab]?.length === 0 ? (
              <div className="empty-panel-view">
                <h4>No announcements</h4>
                <p>No recent broadcasts for this segment.</p>
              </div>
            ) : (
              announcements[commTab]?.map((ann, idx) => (
                <div key={idx} className="split-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{ann.title}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ann.time}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>{ann.body}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. Daily Work Reports table grid */}
      <div className="card table-card animate-slide-up">
        <div className="table-card-header">
          <div>
            <h3 className="card-title">Daily Work Reports Summary</h3>
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
                      <Avatar name={report.employee} size="sm" />
                      <span className="bold-text">{report.employee}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant="purple">{report.project}</Badge>
                  </td>
                  <td>
                    <strong>{report.hours} hrs</strong>
                  </td>
                  <td>
                    <p className="report-summary-text" style={{ maxWidth: '400px' }}>{report.summary}</p>
                  </td>
                  <td>
                    <Badge variant={
                      report.status === 'Approved' ? 'success' :
                      report.status === 'Flagged' ? 'danger' : 'warning'
                    }>
                      {report.status}
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

      {/* 6. Recent Activities and Notifications & Alerts Splits */}
      <div className="dashboard-splits animate-slide-up" style={{ marginTop: 'var(--spacing-6)' }}>
        {/* Recent Activities Panel */}
        <div className="card split-panel flex-1">
          <div className="panel-header-simple">
            <div>
              <h3 className="card-title">Recent Activities Panel</h3>
              <span className="chart-subtitle">Real-time workforce audit logs</span>
            </div>
            <Badge variant="success">Live</Badge>
          </div>
          
          <div className="panel-scroll-list activity-feed" style={{ padding: 'var(--spacing-4) var(--spacing-6)' }}>
            {mockActivitiesData.map((act) => {
              const IconComp = act.icon;
              return (
                <div
                  key={act.id}
                  className="feed-item feed-item-clickable"
                  onClick={() => setSelectedActivity(act)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={`feed-icon-holder ${act.type}`}>
                    <IconComp size={14} />
                  </div>
                  <div className="feed-content">
                    <span className="feed-title">{act.title}</span>
                    <span className="feed-time">{act.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notifications & Alerts Panel */}
        <div className="card split-panel flex-1">
          <div className="panel-header-simple">
            <div>
              <h3 className="card-title">Notifications & Alerts</h3>
              <span className="chart-subtitle">Actionable alerts and compliance indicators</span>
            </div>
            <Badge variant="danger">5 Alerts</Badge>
          </div>
          
          <div className="panel-scroll-list alert-feed" style={{ padding: 'var(--spacing-4) var(--spacing-6)' }}>
            {mockAlertsData.map((alert) => {
              const IconComp = alert.icon;
              return (
                <div
                  key={alert.id}
                  className="feed-item feed-item-clickable"
                  onClick={() => setSelectedAlert(alert)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={`feed-icon-holder ${alert.type}`}>
                    <IconComp size={14} />
                  </div>
                  <div className="feed-content">
                    <span className="feed-title"><strong>{alert.title}:</strong> {alert.desc}</span>
                    <span className="feed-time">{alert.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Dashboard Footer (Last login details & expanded analytics) */}
      <footer className="dashboard-footer card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)', padding: 'var(--spacing-5) var(--spacing-6) !important', marginTop: 'var(--spacing-6)' }}>
        <div className="dashboard-footer-info" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <ShieldCheck size={16} className="text-success" />
          <span>Operator: <strong>{currentUser?.name || 'Aarav Sharma'}</strong> (Super Admin)</span>
        </div>
        <div>
          <span>Active Sessions: <strong style={{ color: 'var(--color-primary)' }}>12 Operator nodes</strong></span>
        </div>
        <div>
          <span>Pending Approvals: <strong style={{ color: 'var(--color-warning)' }}>5 requests</strong></span>
        </div>
        <div>
          <span>Open Tasks: <strong style={{ color: 'var(--color-purple)' }}>{todoTasks + progressTasks} tasks</strong></span>
        </div>
        <div>
          <span>System Health: <strong style={{ color: 'var(--color-success)' }}>99.8% Operational</strong></span>
        </div>
        <div>
          <span>Data Sync: <strong style={{ color: 'var(--text-primary)' }}>Synchronized (Just now)</strong></span>
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
                    <option value="IT">IT Department Only</option>
                    <option value="HR">HR Department Only</option>
                    <option value="Sales">Sales Department Only</option>
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
                <Avatar name={selectedReport.employee} size="md" />
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedReport.employee}</h4>
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
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{selectedReport.hours} hours</strong>
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
                    navigate('/activity-logs');
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
