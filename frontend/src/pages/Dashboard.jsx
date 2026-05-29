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
  Bell
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
  { name: 'Jaipur HQ', country: 'India', flag: '🇮🇳', headcount: 3, projects: 2, status: 'Optimal', score: 97, revenue: '$2.4M' },
  { name: 'London Agency', country: 'United Kingdom', flag: '🇬🇧', headcount: 4, projects: 2, status: 'Active', score: 89, revenue: '$1.8M' },
  { name: 'Tokyo DevHub', country: 'Japan', flag: '🇯🇵', headcount: 1, projects: 1, status: 'Optimal', score: 82, revenue: '$920K' },
  { name: 'Singapore Office', country: 'Singapore', flag: '🇸🇬', headcount: 1, projects: 1, status: 'Active', score: 75, revenue: '$680K' }
];

const mockDeptsData = [
  { name: 'IT', employees: 220, productivity: '92%', activeTasks: 180, color: 'var(--color-primary)' },
  { name: 'HR', employees: 45, productivity: '88%', activeTasks: 24, color: '#f59e0b' },
  { name: 'Sales', employees: 160, productivity: '95%', activeTasks: 110, color: '#10b981' },
  { name: 'Marketing', employees: 85, productivity: '90%', activeTasks: 72, color: '#8b5cf6' }
];

const mockReportsData = [
  { id: 'R-1', employee: 'Aarav Sharma', avatar: 'AS', project: 'SaaS Platform v2', hours: 8, status: 'Approved', summary: 'Refactored lazy routes, authorization guards, and theme settings.', blockers: 'None. Clean build outputs verified.', tomorrowGoals: 'Develop active theme toggling and setup inbox messaging.' },
  { id: 'R-2', employee: 'John Doe', avatar: 'JD', project: 'Marketing Website', hours: 7.5, status: 'Submitted', summary: 'Designed fresh layouts, vector assets, and brand color systems.', blockers: 'None. Client review pending.', tomorrowGoals: 'Finalize SVG icons export and coordinate assets deployment.' },
  { id: 'R-3', employee: 'Jane Smith', avatar: 'JS', project: 'Q2 Promo Campaign', hours: 6, status: 'Flagged', summary: 'Attended client reviews. Did not log detailed task logs.', blockers: 'Awaiting copy approval from operations.', tomorrowGoals: 'Submit corrected hours sheet.' },
  { id: 'R-4', employee: 'Bob Johnson', avatar: 'BJ', project: 'Branch Deployments', hours: 8.5, status: 'Approved', summary: 'Configured workstations, user controls, and IP whitelist profiles.', blockers: 'Network latency issues resolved.', tomorrowGoals: 'Verify backup cron schedules and session timeouts.' }
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
    title: <span><strong>John Miller</strong> submitted a medical leave request</span>,
    details: 'Medical leave request submitted for 3 days starting June 1st. Attachment uploaded.'
  },
  {
    id: 'act-3',
    type: 'primary',
    time: '3 hours ago',
    icon: CheckCircle,
    title: <span><strong>Elena Rostova</strong> updated task <strong>Deploy production v2.1</strong> to Done</span>,
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
    title: <span><strong>Marcus Vance</strong> submitted Q2 Marketing Work Report</span>,
    details: 'Logged 8.5 hours. Core focus: campaign assets creation and ad copywriting draft.'
  },
  {
    id: 'act-6',
    type: 'primary',
    time: '1 day ago',
    icon: FileCheck,
    title: <span><strong>Sophia Laurent</strong> approved DevOps CI/CD pipeline automation workflow</span>,
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
    details: 'Neha Patel, John Miller, and Aarav Sharma checked in after the grace period (09:15 AM). Late flags applied.',
    resolution: 'Notify employees or waive compliance flag.'
  },
  {
    id: 'al-2',
    type: 'danger',
    title: 'Missing Punch-Outs',
    desc: 'Missing punch-out detected for John Doe yesterday.',
    time: '2 hours ago',
    icon: AlertCircle,
    details: 'John Doe failed to log checkout session. Current active status is still open.',
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

const Dashboard = () => {
  const isLoading = usePageLoading(600);
  const {
    employees,
    attendance,
    tasks,
    currentUser,
    addToast
  } = useApp();

  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [leaderboardTab, setLeaderboardTab] = useState('employee'); // 'employee' or 'branch'
  const [reports, setReports] = useState(mockReportsData);

  // Stats Calculations
  const totalEmployeesCount = employees.length || 8;
  const activeProjectsCount = 4; // Mock projects total count
  const presentToday = attendance.filter(a => a.date === '2026-05-29' && a.status === 'Present').length || 7;
  const attendanceRate = Math.round((presentToday / totalEmployeesCount) * 100);

  const todoTasks = tasks.filter(t => t.status === 'To Do').length;
  const progressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const doneTasks = tasks.filter(t => t.status === 'Done').length;

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
    { name: 'Elena Rostova', dept: 'Engineering', score: 98, color: '#10b981' },
    { name: 'Aarav Sharma', dept: 'Operations', score: 95, color: '#3b82f6' },
    { name: 'Marcus Vance', dept: 'Sales', score: 88, color: '#8b5cf6' },
    { name: 'John Miller', dept: 'Engineering', score: 76, color: '#f59e0b' }
  ];

  const branchLeaderboard = mockBranchesData.map(b => ({
    name: b.name,
    dept: `${b.country} • ${b.headcount} Emps`,
    score: b.score,
    color: b.status === 'Optimal' ? '#10b981' : '#3b82f6'
  }));

  const handleReportAction = (id, nextStatus) => {
    setReports(prev =>
      prev.map(r => (r.id === id ? { ...r, status: nextStatus } : r))
    );
    addToast(
      nextStatus === 'Approved' ? 'success' : 'warning',
      `Work report status updated to ${nextStatus}.`
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

      {/* 5. Dashboard Footer (Last login details) */}
      <footer className="dashboard-footer card">
        <div className="dashboard-footer-info">
          <ShieldCheck size={14} className="text-success" />
          <span>Active Operator: <strong>{currentUser?.name || 'Aarav Sharma'}</strong> (Super Admin)</span>
        </div>
        <div>
          <span>Last Login: <strong>2026-05-29 08:06:17</strong> from IP <strong>192.168.1.120</strong> (JaipurHQ)</span>
        </div>
      </footer>

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
                    handleReportAction(selectedReport.id, 'Flagged');
                    setSelectedReport(null);
                  }}
                >
                  Flag Report
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleReportAction(selectedReport.id, 'Approved');
                    setSelectedReport(null);
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
