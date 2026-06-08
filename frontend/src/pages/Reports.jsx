import React, { useState, useMemo } from 'react';
import './Reports.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import {
  FileText, Calendar, Clock, LayoutDashboard, TrendingUp, Activity,
  PieChart, Users, DollarSign, Briefcase, Building2, MapPin,
  Plus, Settings, Download, ArrowUpRight, ArrowDownRight,
  Search, Filter, Eye, Trash2, Mail, Bell, Check, X,
  ChevronRight, Database, BarChart3, RefreshCw, Send,
  FileDown, Printer, Star, Award, GitBranch, Edit3,
  AlertTriangle, CheckCircle, BarChart2, Globe, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Legend, LineChart, Line, PieChart as RechartsPie,
  Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Scatter
} from 'recharts';

// ─── Mock Data ──────────────────────────────────────────────────────────────

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];

const recentReports = [
  { id: 1, name: 'Monthly Attendance Report', type: 'Attendance', generatedBy: 'Aarav Sharma', time: '2 mins ago', format: 'PDF', size: '2.4 MB' },
  { id: 2, name: 'Payroll Summary Report', type: 'Payroll', generatedBy: 'Neha Verma', time: '15 mins ago', format: 'Excel', size: '1.8 MB' },
  { id: 3, name: 'Project Performance Report', type: 'Projects', generatedBy: 'Priya Patel', time: '1 hour ago', format: 'PDF', size: '3.1 MB' },
  { id: 4, name: 'Branch Productivity Report', type: 'Branch', generatedBy: 'Rahul Kumar', time: '3 hours ago', format: 'Excel', size: '1.2 MB' },
  { id: 5, name: 'Employee Performance Analytics', type: 'Employee', generatedBy: 'Admin', time: 'Yesterday', format: 'PDF', size: '4.5 MB' },
  { id: 6, name: 'Leave Balance Summary', type: 'Leave', generatedBy: 'HR Manager', time: 'Yesterday', format: 'CSV', size: '0.8 MB' },
  { id: 7, name: 'TDS Compliance Report', type: 'Payroll', generatedBy: 'Finance', time: '2 days ago', format: 'PDF', size: '1.5 MB' },
  { id: 8, name: 'Task Completion Analytics', type: 'Projects', generatedBy: 'Aarav Sharma', time: '2 days ago', format: 'Excel', size: '2.1 MB' },
];

const scheduledReports = [
  { id: 1, name: 'Weekly Attendance Report', frequency: 'Weekly (Mon)', nextRun: '08-Jun-2026', recipients: 'hr@company.com', format: 'PDF', status: 'Active' },
  { id: 2, name: 'Monthly Payroll Summary', frequency: 'Monthly (1st)', nextRun: '01-Jul-2026', recipients: 'finance@company.com', format: 'Excel', status: 'Active' },
  { id: 3, name: 'Daily Productivity Report', frequency: 'Daily', nextRun: '06-Jun-2026 6 PM', recipients: 'managers@company.com', format: 'Both', status: 'Active' },
  { id: 4, name: 'Quarterly Performance Review', frequency: 'Quarterly', nextRun: '01-Jul-2026', recipients: 'ceo@company.com', format: 'PDF', status: 'Active' },
];

const TooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-color-dark)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
};

const ChartCard = ({ title, subtitle, children, action }) => (
  <div className="card rpt-chart-card">
    <div className="rpt-chart-head">
      <div>
        <h4 className="rpt-chart-title">{title}</h4>
        {subtitle && <span className="rpt-chart-sub">{subtitle}</span>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const StatCard = ({ label, value, trend, trendUp, subtitle, colorClass, icon: Icon }) => (
  <div className={`card rpt-stat-card ${colorClass}`}>
    <div className="rpt-stat-top">
      <div className="rpt-stat-icon-wrap">
        <Icon size={18} />
      </div>
      <span className={`rpt-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
        {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {trend}
      </span>
    </div>
    <div className="rpt-stat-value">{value}</div>
    <div className="rpt-stat-label">{label}</div>
    {subtitle && <div className="rpt-stat-sub">{subtitle}</div>}
  </div>
);

const ReportTableRow = ({ report, onDownload, onDelete }) => (
  <tr>
    <td>
      <div className="rpt-file-name">
        <div className={`rpt-file-icon ${report.format === 'PDF' ? 'pdf' : report.format === 'Excel' ? 'excel' : 'csv'}`}>
          <FileText size={14} />
        </div>
        <div>
          <div className="rpt-file-title">{report.name}</div>
          <div className="rpt-file-meta">{report.size}</div>
        </div>
      </div>
    </td>
    <td><Badge variant="neutral">{report.type}</Badge></td>
    <td className="rpt-td-muted">{report.generatedBy}</td>
    <td className="rpt-td-muted">{report.time}</td>
    <td>
      <span className={`rpt-format-badge rpt-format-${report.format.toLowerCase()}`}>{report.format}</span>
    </td>
    <td>
      <div className="rpt-row-actions">
        <button className="rpt-action-btn" title="Download" onClick={() => onDownload(report)}><Download size={14} /></button>
        <button className="rpt-action-btn" title="View"><Eye size={14} /></button>
        <button className="rpt-action-btn" title="Share"><Send size={14} /></button>
        <button className="rpt-action-btn danger" title="Delete" onClick={() => onDelete(report.id)}><Trash2 size={14} /></button>
      </div>
    </td>
  </tr>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const Reports = () => {
  const isLoading = usePageLoading(500);
  const {
    currentUserRole,
    addToast,
    departments,
    branches,
    employees,
    payroll,
    projectsList,
    attendance,
    leaveRequests,
    tasks
  } = useApp();

  // State
  const [perspective, setPerspective] = useState(currentUserRole || 'super_admin');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [empSubTab, setEmpSubTab] = useState('analytics');
  const [paySubTab, setPaySubTab] = useState('salary');
  const [projSubTab, setProjSubTab] = useState('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterFormat, setFilterFormat] = useState('');
  const [dateRange, setDateRange] = useState('this_month');
  const [reports, setReports] = useState(recentReports);
  const [schedules, setSchedules] = useState(scheduledReports);

  // Compute Productivity Trend
  const productivityTrendData = useMemo(() => {
    return [
      { month: 'Jan', productivity: 86, target: 90 },
      { month: 'Feb', productivity: 88, target: 90 },
      { month: 'Mar', productivity: 91, target: 90 },
      { month: 'Apr', productivity: 89, target: 90 },
      { month: 'May', productivity: 92, target: 90 },
      { month: 'Jun', productivity: 94, target: 90 },
    ];
  }, []);

  // Compute Department Performance Data
  const deptPerformanceData = useMemo(() => {
    const depts = {};
    (departments || []).forEach(d => {
      const deptEmps = (employees || []).filter(e => e.department === d.name);
      const deptTasks = (tasks || []).filter(t => t.department === d.name);
      const avgProd = deptEmps.length > 0 ? Math.round(deptEmps.reduce((sum, e) => sum + (e.productivityScore || 75), 0) / deptEmps.length) : 85;
      const avgAtt = deptEmps.length > 0 ? Math.round(deptEmps.reduce((sum, e) => sum + (e.attendanceStatus === 'Present' || e.attendanceStatus === 'Late' ? 95 : 90), 0) / deptEmps.length) : 95;
      const avgPerf = deptEmps.length > 0 ? Math.round(deptEmps.reduce((sum, e) => sum + (e.performanceScore?.overall || 80), 0) / deptEmps.length) : 85;
      depts[d.name] = {
        dept: d.name,
        employees: deptEmps.length,
        attendance: avgAtt,
        productivity: avgProd,
        performance: avgPerf,
        taskCompletion: deptTasks.length > 0 ? Math.round((deptTasks.filter(t => t.status === 'Done').length / deptTasks.length) * 100) : 90
      };
    });
    return Object.values(depts);
  }, [departments, employees, tasks]);

  // Compute Branch Performance Data
  const branchPerfData = useMemo(() => {
    return [
      { month: 'Jan', jaipur: 94, delhi: 91, mumbai: 89, bangalore: 90 },
      { month: 'Feb', jaipur: 95, delhi: 92, mumbai: 90, bangalore: 91 },
      { month: 'Mar', jaipur: 96, delhi: 93, mumbai: 91, bangalore: 92 },
      { month: 'Apr', jaipur: 95, delhi: 94, mumbai: 90, bangalore: 93 },
      { month: 'May', jaipur: 97, delhi: 94, mumbai: 92, bangalore: 93 },
      { month: 'Jun', jaipur: 96, delhi: 95, mumbai: 92, bangalore: 93 },
    ];
  }, []);

  // Compute Attendance Trend Data
  const attendanceTrendData = useMemo(() => {
    return [
      { week: 'W1', rate: 91 }, { week: 'W2', rate: 93 }, { week: 'W3', rate: 89 },
      { week: 'W4', rate: 95 }, { week: 'W5', rate: 94 }, { week: 'W6', rate: 92 },
      { week: 'W7', rate: 96 }, { week: 'W8', rate: 94 },
    ];
  }, []);

  // Compute Project Success Data
  const projectSuccessData = useMemo(() => {
    return [
      { month: 'Jan', completed: 12, delayed: 1 }, { month: 'Feb', completed: 15, delayed: 2 },
      { month: 'Mar', completed: 14, delayed: 1 }, { month: 'Apr', completed: 18, delayed: 0 },
      { month: 'May', completed: 16, delayed: 1 }, { month: 'Jun', completed: 19, delayed: 1 },
    ];
  }, []);

  // Compute Leave Distribution Data
  const leaveDistData = useMemo(() => {
    const counts = {};
    (leaveRequests || []).forEach(r => {
      const t = r.type || 'Casual Leave';
      counts[t] = (counts[t] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b'];
    const list = Object.entries(counts).map(([name, val], index) => ({
      name,
      value: Math.round((val / total) * 100),
      color: colors[index % colors.length]
    }));
    return list.length > 0 ? list : [
      { name: 'Casual Leave', value: 45, color: '#3b82f6' },
      { name: 'Sick Leave', value: 25, color: '#ef4444' },
      { name: 'Earned Leave', value: 20, color: '#10b981' }
    ];
  }, [leaveRequests]);

  // Compute Salary Distribution Data
  const salaryDistData = useMemo(() => {
    const depts = {};
    (employees || []).forEach(e => {
      const d = e.department || 'Operations';
      const salary = e.salary || (e.experience * 15000 + 40000); 
      depts[d] = (depts[d] || 0) + salary;
    });
    const total = Object.values(depts).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];
    return Object.entries(depts).map(([name, val], index) => ({
      name,
      value: Math.round((val / total) * 100),
      color: colors[index % colors.length]
    }));
  }, [employees]);

  // Compute Payroll Trend Data
  const payrollTrendData = useMemo(() => {
    return [
      { month: 'Jan', cost: 22800000, forecast: null },
      { month: 'Feb', cost: 23100000, forecast: null },
      { month: 'Mar', cost: 23500000, forecast: null },
      { month: 'Apr', cost: 24100000, forecast: null },
      { month: 'May', cost: 24580000, forecast: null },
      { month: 'Jun', cost: null, forecast: 25200000 },
      { month: 'Jul', cost: null, forecast: 25800000 },
      { month: 'Aug', cost: null, forecast: 26100000 },
    ];
  }, []);

  // Compute Branch Radar Data
  const branchRadarData = useMemo(() => {
    return [
      { metric: 'Productivity', jaipur: 96, delhi: 94, mumbai: 92, bangalore: 93 },
      { metric: 'Attendance', jaipur: 94, delhi: 92, mumbai: 90, bangalore: 91 },
      { metric: 'Performance', jaipur: 95, delhi: 93, mumbai: 91, bangalore: 92 },
      { metric: 'Task Completion', jaipur: 97, delhi: 95, mumbai: 93, bangalore: 94 },
      { metric: 'Revenue', jaipur: 90, delhi: 85, mumbai: 82, bangalore: 78 },
    ];
  }, []);

  // Compute Top Performers
  const topPerformers = useMemo(() => {
    return [...(employees || [])]
      .sort((a, b) => (b.productivityScore || 0) - (a.productivityScore || 0))
      .slice(0, 5)
      .map((e, idx) => ({
        rank: idx + 1,
        name: e.name,
        dept: e.department || 'Engineering',
        score: e.productivityScore || 75,
        medal: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'
      }));
  }, [employees]);

  // Compute Department Comparison Table Data
  const deptCompData = useMemo(() => {
    return deptPerformanceData.map(d => ({
      dept: d.dept,
      employees: d.employees,
      attendance: `${d.attendance}%`,
      productivity: `${d.productivity}%`,
      performance: `${d.performance}%`,
      taskCompletion: `${d.taskCompletion}%`
    }));
  }, [deptPerformanceData]);

  // Compute Branch Comparison Table Data
  const branchCompData = useMemo(() => {
    return (branches || []).map(b => {
      const branchEmps = (employees || []).filter(e => e.branch === b.name);
      const avgProd = branchEmps.length > 0 ? Math.round(branchEmps.reduce((sum, e) => sum + (e.productivityScore || 75), 0) / branchEmps.length) : (b.productivity || 85);
      const avgPerf = branchEmps.length > 0 ? Math.round(branchEmps.reduce((sum, e) => sum + (e.performanceScore?.overall || 80), 0) / branchEmps.length) : 85;
      const avgAtt = branchEmps.length > 0 ? Math.round(branchEmps.reduce((sum, e) => sum + (e.attendanceStatus === 'Present' || e.attendanceStatus === 'Late' ? 95 : 90), 0) / branchEmps.length) : 94;
      return {
        branch: b.name,
        employees: branchEmps.length,
        productivity: `${avgProd}%`,
        performance: `${avgPerf}%`,
        attendance: `${avgAtt}%`,
        revenue: b.revenue ? `₹${(b.revenue / 10000000).toFixed(1)}Cr` : '₹0.0Cr'
      };
    });
  }, [branches, employees]);

  // Modal States
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [customStep, setCustomStep] = useState(1);

  // Generate Report Form
  const [genForm, setGenForm] = useState({
    reportType: '', dateRange: 'this_month', department: '', branch: '', employee: '',
    format: 'PDF', includeCharts: true, includeSummary: true
  });

  // Schedule Form
  const [schedForm, setSchedForm] = useState({
    name: '', reportType: '', frequency: 'Weekly', day: 'Monday', time: '08:00',
    recipients: '', format: 'PDF', active: true
  });

  // Custom Report Form
  const [customForm, setCustomForm] = useState({
    dataSources: { employees: true, attendance: true, leaves: false, payroll: false, projects: false, tasks: false, performance: true },
    filters: { branch: 'All', department: 'All', dateRange: 'this_month', status: 'All' },
    columns: { name: true, department: true, attendance: true, performance: true, salary: false, tasks: true },
    output: { format: 'PDF', name: 'Custom Report', saveTemplate: false }
  });

  // Export Form
  const [exportForm, setExportForm] = useState({ range: 'current', format: 'PDF', timestamp: true, orientation: 'Portrait', size: 'A4' });

  // Toast inside page
  const [pageToasts, setPageToasts] = useState([]);
  const addPageToast = (type, message) => {
    const id = Date.now();
    setPageToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setPageToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Handlers
  const handleGenerateReport = (e) => {
    e.preventDefault();
    const newReport = {
      id: Date.now(),
      name: `${genForm.reportType || 'Custom'} Report`,
      type: genForm.reportType || 'General',
      generatedBy: 'Current User',
      time: 'Just now',
      format: genForm.format,
      size: '1.2 MB'
    };
    setReports(prev => [newReport, ...prev]);
    setShowGenerateModal(false);
    addPageToast('success', 'Report generated successfully');
    addToast('success', 'Report generated and added to download center');
  };

  const handleScheduleReport = (e) => {
    e.preventDefault();
    const newSched = { id: Date.now(), name: schedForm.name, frequency: schedForm.frequency, nextRun: 'Next Run', recipients: schedForm.recipients, format: schedForm.format, status: schedForm.active ? 'Active' : 'Paused' };
    setSchedules(prev => [...prev, newSched]);
    setShowScheduleModal(false);
    addPageToast('success', 'Report scheduled successfully');
  };

  const handleDeleteReport = (id) => {
    setReports(prev => prev.filter(r => r.id !== id));
    addPageToast('warning', 'Report deleted');
  };

  const handleDownloadReport = (report) => {
    const content = `Report: ${report.name}\nGenerated By: ${report.generatedBy}\nTime: ${report.time}\nFormat: ${report.format}\n\nThis is a simulated report download.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, '_')}.${report.format === 'Excel' ? 'xlsx' : report.format.toLowerCase()}`;
    a.click();
    addPageToast('success', `Downloaded: ${report.name}`);
  };

  const handleDeleteSchedule = (id) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    addPageToast('warning', 'Schedule deleted successfully');
  };

  const handleExport = (e) => {
    e.preventDefault();
    setShowExportModal(false);
    addPageToast('success', 'Analytics exported successfully');
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.generatedBy.toLowerCase().includes(q);
      const matchType = !filterType || r.type === filterType;
      const matchFormat = !filterFormat || r.format === filterFormat;
      return matchSearch && matchType && matchFormat;
    });
  }, [reports, searchQuery, filterType, filterFormat]);

  if (isLoading) {
    return (
      <div className="rpt-page flex-column grid-gap">
        <div className="card" style={{ height: 80 }}><Skeleton variant="rect" height="100%" /></div>
        <div className="rpt-stats-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card skeleton-card" style={{ height: 110 }}><Skeleton variant="rect" height="100%" /></div>)}</div>
        <div className="card" style={{ height: 340 }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="rpt-page flex-column grid-gap">

      {/* Toast Feed */}
      <div className="page-toast-container">
        {pageToasts.map(t => (
          <div key={t.id} className={`page-toast border-left-${t.type === 'success' ? 'success' : t.type === 'warning' ? 'warning' : 'info'}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── HEADER ── */}
      <div className="page-header-row rpt-header">
        <div>
          <h2>Reports &amp; Analytics Center</h2>
          <p className="page-desc-text font-small">Centralized business intelligence and reporting hub providing real-time insights into employees, attendance, leaves, payroll, projects, tasks, productivity, departments, branches, and overall company performance</p>
        </div>
        <div className="flex-center gap-3 wrap-content">
          <div className="flex-center gap-1 perspective-container">
            <span className="text-muted font-small uppercase font-semibold">Perspective:</span>
            <select value={perspective} onChange={e => { setPerspective(e.target.value); addPageToast('info', `View switched to: ${e.target.value}`); }} className="payroll-selector perspective-select">
              <option value="employee">Employee View</option>
              <option value="team_leader">Team Leader</option>
              <option value="branch_admin">HR Manager</option>
              <option value="project_manager">Project Manager</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="payroll-selector">
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
          </select>
          <Button variant="primary" icon={Plus} onClick={() => setShowGenerateModal(true)}>Generate Report</Button>
          <Button variant="secondary" icon={Settings} onClick={() => setShowCustomModal(true)}>Custom Report</Button>
          <Button variant="ghost" icon={Calendar} onClick={() => setShowScheduleModal(true)}>Schedule</Button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="rpt-stats-grid">
        <StatCard label="Total Reports Generated" value="25,480" trend="+8.2%" trendUp={true} subtitle="All time" colorClass="border-bottom-primary" icon={FileText} />
        <StatCard label="Reports Today" value="128" trend="+15%" trendUp={true} subtitle="vs yesterday" colorClass="border-bottom-success" icon={Calendar} />
        <StatCard label="Scheduled Reports" value="42" trend="+4" trendUp={true} subtitle="Active schedules" colorClass="border-bottom-info" icon={Clock} />
        <StatCard label="Active Dashboards" value="18" trend="+2" trendUp={true} subtitle="Live analytics" colorClass="border-bottom-primary" icon={LayoutDashboard} />
        <StatCard label="Productivity Score" value="92%" trend="+3.5%" trendUp={true} subtitle="vs last quarter" colorClass="border-bottom-success" icon={TrendingUp} />
        <StatCard label="Business Growth Index" value="18.5%" trend="+2.1%" trendUp={true} subtitle="Year over year" colorClass="border-bottom-success" icon={TrendingUp} />
        <StatCard label="Active Reports" value="156" trend="+12" trendUp={true} subtitle="Running now" colorClass="border-bottom-info" icon={Activity} />
        <StatCard label="Report Categories" value="12" trend="0" trendUp={true} subtitle="Modules covered" colorClass="border-bottom-warning" icon={Layers} />
      </div>

      {/* ── NAVIGATION TABS ── */}
      <div className="card tab-bar-card overflow-x-auto">
        <div className="payroll-tabs-list">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'employee', label: 'Employee Reports', icon: Users },
            { id: 'payroll', label: 'Payroll Reports', icon: DollarSign },
            { id: 'projects', label: 'Project Reports', icon: Briefcase },
            { id: 'department', label: 'Department Reports', icon: Building2 },
            { id: 'branch', label: 'Branch Reports', icon: MapPin },
            { id: 'custom', label: 'Custom Reports', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}>
                <Icon size={15} />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════ TAB 1: EXECUTIVE DASHBOARD ══════════ */}
      {activeTab === 'dashboard' && (
        <div className="flex-column grid-gap animate-fade-in">

          {/* KPI Overview */}
          <div className="rpt-kpi-grid">
            {[
              { label: 'Total Employees', value: '1,250', sub: 'Active: 1,185', color: '#3b82f6' },
              { label: 'Attendance Rate', value: '94%', sub: 'Present: 1,102', color: '#10b981' },
              { label: 'Active Projects', value: '24', sub: 'Success Rate: 92%', color: '#8b5cf6' },
              { label: 'Monthly Productivity', value: '92%', sub: 'Target: 90%', color: '#06b6d4' },
            ].map((k, i) => (
              <div key={i} className="card rpt-kpi-card" style={{ borderTop: `3px solid ${k.color}` }}>
                <div className="rpt-kpi-val" style={{ color: k.color }}>{k.value}</div>
                <div className="rpt-kpi-label">{k.label}</div>
                <div className="rpt-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="rpt-grid-2">
            <ChartCard title="Employee Productivity Trends" subtitle="Last 6 months vs target">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={productivityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[80, 100]} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="productivity" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Productivity %" />
                  <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Target" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Department Performance" subtitle="Attendance, productivity & performance">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="dept" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[85, 100]} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend />
                  <Bar dataKey="attendance" fill="#3b82f6" name="Attendance" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="productivity" fill="#10b981" name="Productivity" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="performance" fill="#8b5cf6" name="Performance" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="rpt-grid-2">
            <ChartCard title="Branch Performance Trends" subtitle="All branches — last 6 months">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={branchPerfData}>
                  <defs>
                    {['#3b82f6','#10b981','#f59e0b','#8b5cf6'].map((c, i) => (
                      <linearGradient key={i} id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[85, 100]} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="jaipur" stroke="#3b82f6" fill="url(#bg0)" name="Jaipur HQ" />
                  <Area type="monotone" dataKey="delhi" stroke="#10b981" fill="url(#bg1)" name="Delhi" />
                  <Area type="monotone" dataKey="mumbai" stroke="#f59e0b" fill="url(#bg2)" name="Mumbai" />
                  <Area type="monotone" dataKey="bangalore" stroke="#8b5cf6" fill="url(#bg3)" name="Bangalore" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Attendance Rate Trends" subtitle="Weekly attendance percentage">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="week" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[80, 100]} />
                  <Tooltip contentStyle={TooltipStyle} formatter={v => [`${v}%`, 'Attendance']} />
                  <Bar dataKey="rate" name="Attendance %" radius={[4, 4, 0, 0]}>
                    {attendanceTrendData.map((e, i) => (
                      <Cell key={i} fill={e.rate >= 94 ? '#10b981' : e.rate >= 90 ? '#3b82f6' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Project Success + Top Performers */}
          <div className="rpt-grid-2">
            <ChartCard title="Project Success Trends" subtitle="Completed vs delayed per month">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projectSuccessData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Legend />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="delayed" fill="#ef4444" name="Delayed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="card rpt-chart-card">
              <div className="rpt-chart-head">
                <div><h4 className="rpt-chart-title">Top Performers</h4><span className="rpt-chart-sub">This month — by performance score</span></div>
              </div>
              <div className="rpt-performers-list">
                {topPerformers.map(p => (
                  <div key={p.rank} className="rpt-performer-row">
                    <span className="rpt-medal">{p.medal}</span>
                    <div className="rpt-performer-info">
                      <span className="rpt-performer-name">{p.name}</span>
                      <span className="rpt-performer-dept">{p.dept}</span>
                    </div>
                    <div className="rpt-score-bar-wrap">
                      <div className="rpt-score-bar" style={{ width: `${p.score}%`, background: p.rank === 1 ? '#f59e0b' : p.rank === 2 ? '#8b5cf6' : '#3b82f6' }} />
                    </div>
                    <span className="rpt-score-val">{p.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Productivity Score Breakdown */}
          <div className="card rpt-score-card">
            <h4 className="rpt-chart-title">Company Productivity Score Breakdown</h4>
            <div className="rpt-score-grid">
              {[
                { label: 'Employee Productivity', weight: '30%', score: 92, color: '#3b82f6' },
                { label: 'Project Success Rate', weight: '25%', score: 91, color: '#10b981' },
                { label: 'Attendance Rate', weight: '20%', score: 94, color: '#8b5cf6' },
                { label: 'Task Completion Rate', weight: '15%', score: 93, color: '#f59e0b' },
                { label: 'Customer Satisfaction', weight: '10%', score: 88, color: '#06b6d4' },
              ].map((s, i) => (
                <div key={i} className="rpt-score-item">
                  <div className="rpt-score-item-top">
                    <span className="rpt-score-item-label">{s.label}</span>
                    <div className="rpt-score-item-right">
                      <span className="rpt-score-item-weight">{s.weight}</span>
                      <span className="rpt-score-item-val" style={{ color: s.color }}>{s.score}%</span>
                    </div>
                  </div>
                  <div className="rpt-score-track">
                    <div className="rpt-score-fill" style={{ width: `${s.score}%`, background: s.color }} />
                  </div>
                </div>
              ))}
              <div className="rpt-overall-score">
                <span>Overall Score</span>
                <span className="rpt-overall-val">92% <ArrowUpRight size={14} style={{ color: '#10b981' }} /></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TAB 2: EMPLOYEE REPORTS ══════════ */}
      {activeTab === 'employee' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="card tab-bar-card">
            <div className="payroll-tabs-list">
              {['analytics', 'attendance', 'leave', 'performance'].map(sub => (
                <button key={sub} onClick={() => setEmpSubTab(sub)} className={`tab-btn ${empSubTab === sub ? 'active' : ''}`}>
                  {sub.charAt(0).toUpperCase() + sub.slice(1)} Analytics
                </button>
              ))}
            </div>
          </div>

          {empSubTab === 'analytics' && (
            <div className="flex-column grid-gap">
              <div className="rpt-kpi-grid">
                {[
                  { label: 'Avg Attendance %', value: '94%', target: '95%', color: '#10b981' },
                  { label: 'Avg Productivity %', value: '92%', target: '90%', color: '#3b82f6' },
                  { label: 'Task Completion Rate', value: '93%', target: '95%', color: '#8b5cf6' },
                  { label: 'Leave Utilization', value: '78%', target: '80%', color: '#f59e0b' },
                  { label: 'Performance Score', value: '91%', target: '90%', color: '#06b6d4' },
                ].map((k, i) => (
                  <div key={i} className="card rpt-kpi-card" style={{ borderTop: `3px solid ${k.color}` }}>
                    <div className="rpt-kpi-val" style={{ color: k.color }}>{k.value}</div>
                    <div className="rpt-kpi-label">{k.label}</div>
                    <div className="rpt-kpi-sub">Target: {k.target}</div>
                  </div>
                ))}
              </div>
              <div className="card">{renderReportTable(['Employee Master Report','Employee Joining Report','Employee Exit Report','Employee Transfer Report','Employee Profile Report'], addPageToast)}</div>
            </div>
          )}

          {empSubTab === 'attendance' && (
            <div className="flex-column grid-gap">
              <div className="rpt-kpi-grid">
                {[
                  { label: 'Daily Attendance Rate', value: '94%', color: '#10b981' },
                  { label: 'Overtime Hours', value: '1,250 hrs', color: '#3b82f6' },
                  { label: 'Late Arrivals', value: '45', color: '#f59e0b' },
                  { label: 'Absent Today', value: '83', color: '#ef4444' },
                ].map((k, i) => <div key={i} className="card rpt-kpi-card" style={{ borderTop: `3px solid ${k.color}` }}><div className="rpt-kpi-val" style={{ color: k.color }}>{k.value}</div><div className="rpt-kpi-label">{k.label}</div></div>)}
              </div>
              <div className="rpt-grid-2">
                <ChartCard title="Weekly Attendance Trend" subtitle="Attendance percentage by week">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={attendanceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="week" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[80, 100]} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Attendance %" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Department Attendance Comparison">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={deptPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="dept" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[88, 100]} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Bar dataKey="attendance" fill="#3b82f6" name="Attendance %" radius={[4, 4, 0, 0]}>
                        {deptPerformanceData.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
              <div className="card">{renderReportTable(['Daily Attendance Report','Monthly Attendance Report','Attendance Summary','Late Arrival Report','Overtime Report'], addPageToast)}</div>
            </div>
          )}

          {empSubTab === 'leave' && (
            <div className="flex-column grid-gap">
              <div className="rpt-kpi-grid">
                {[
                  { label: 'Leave Requests', value: '245', color: '#3b82f6' },
                  { label: 'Approved Leaves', value: '210', color: '#10b981' },
                  { label: 'Rejected Leaves', value: '20', color: '#ef4444' },
                  { label: 'Pending Leaves', value: '15', color: '#f59e0b' },
                  { label: 'Utilization Rate', value: '78%', color: '#8b5cf6' },
                ].map((k, i) => <div key={i} className="card rpt-kpi-card" style={{ borderTop: `3px solid ${k.color}` }}><div className="rpt-kpi-val" style={{ color: k.color }}>{k.value}</div><div className="rpt-kpi-label">{k.label}</div></div>)}
              </div>
              <div className="rpt-grid-2">
                <ChartCard title="Leave Distribution" subtitle="By leave type this month">
                  <ResponsiveContainer width="100%" height={240}>
                    <RechartsPie>
                      <Pie data={leaveDistData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                        {leaveDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={TooltipStyle} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </ChartCard>
                <div className="card rpt-chart-card">
                  <div className="rpt-chart-head"><h4 className="rpt-chart-title">Leave Type Breakdown</h4></div>
                  <div className="rpt-leave-table">
                    {leaveDistData.map((l, i) => (
                      <div key={i} className="rpt-leave-row">
                        <div className="rpt-leave-dot" style={{ background: l.color }} />
                        <span className="rpt-leave-name">{l.name}</span>
                        <div className="rpt-leave-bar-wrap"><div className="rpt-leave-bar" style={{ width: `${l.value}%`, background: l.color }} /></div>
                        <span className="rpt-leave-pct">{l.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card">{renderReportTable(['Leave Summary Report','Leave Balance Report','Leave Approval Report'], addPageToast)}</div>
            </div>
          )}

          {empSubTab === 'performance' && (
            <div className="flex-column grid-gap">
              <ChartCard title="Team Performance Trends" subtitle="Top 5 teams — last 6 months">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={productivityTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[80, 100]} />
                    <Tooltip contentStyle={TooltipStyle} />
                    <Line type="monotone" dataKey="productivity" stroke="#3b82f6" strokeWidth={2.5} name="IT Team" />
                    <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} name="Sales Team" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB 3: PAYROLL REPORTS ══════════ */}
      {activeTab === 'payroll' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="card tab-bar-card">
            <div className="payroll-tabs-list">
              {['salary', 'compliance', 'analytics'].map(sub => (
                <button key={sub} onClick={() => setPaySubTab(sub)} className={`tab-btn ${paySubTab === sub ? 'active' : ''}`}>
                  {sub === 'salary' ? 'Salary Reports' : sub === 'compliance' ? 'Compliance Reports' : 'Financial Analytics'}
                </button>
              ))}
            </div>
          </div>

          {paySubTab === 'salary' && (
            <div className="flex-column grid-gap">
              <div className="rpt-kpi-grid">
                {[
                  { label: 'Total Payroll Cost', value: '₹2.45 Cr', color: '#3b82f6' },
                  { label: 'Avg Salary', value: '₹45,000', color: '#10b981' },
                  { label: 'Total Bonuses', value: '₹12.4 L', color: '#f59e0b' },
                  { label: 'Total Deductions', value: '₹38.2 L', color: '#ef4444' },
                ].map((k, i) => <div key={i} className="card rpt-kpi-card" style={{ borderTop: `3px solid ${k.color}` }}><div className="rpt-kpi-val" style={{ color: k.color }}>{k.value}</div><div className="rpt-kpi-label">{k.label}</div></div>)}
              </div>
              <div className="rpt-grid-2">
                <ChartCard title="Payroll Cost Trend" subtitle="Last 5 months + 3 month forecast">
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={payrollTrendData}>
                      <defs>
                        <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000000).toFixed(1)}M`} />
                      <Tooltip contentStyle={TooltipStyle} formatter={v => v ? [`₹${(v/100000).toFixed(1)}L`, ''] : ['N/A', '']} />
                      <Legend />
                      <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="url(#payGrad)" name="Actual Cost" />
                      <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={2} dot={false} name="Forecast" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Salary Distribution by Department">
                  <ResponsiveContainer width="100%" height={240}>
                    <RechartsPie>
                      <Pie data={salaryDistData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {salaryDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={TooltipStyle} formatter={v => [`${v}%`, 'Share']} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
              <div className="card">{renderReportTable(['Monthly Payroll Report','Salary Register','Payslip Report','Salary Revision Report','Bonus & Incentive Report'], addPageToast)}</div>
            </div>
          )}

          {paySubTab === 'compliance' && (
            <div className="card">{renderReportTable(['PF Report','ESI Report','TDS Report','Professional Tax Report'], addPageToast, ['Report', 'Regulatory Body', 'Due Date', 'Status'])}</div>
          )}

          {paySubTab === 'analytics' && (
            <div className="flex-column grid-gap">
              <ChartCard title="Branch Salary Cost Comparison" subtitle="Salary expense by branch">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { branch: 'Jaipur HQ', cost: 980000 }, { branch: 'Delhi', cost: 720000 },
                    { branch: 'Mumbai', cost: 580000 }, { branch: 'Bangalore', cost: 470000 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="branch" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${v/1000}K`} />
                    <Tooltip contentStyle={TooltipStyle} formatter={v => [`₹${(v/100000).toFixed(1)}L`, 'Salary Cost']} />
                    <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                      {['#3b82f6','#10b981','#f59e0b','#8b5cf6'].map((c, i) => <Cell key={i} fill={c} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB 4: PROJECT REPORTS ══════════ */}
      {activeTab === 'projects' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="card tab-bar-card">
            <div className="payroll-tabs-list">
              {['analytics', 'tasks', 'resources'].map(sub => (
                <button key={sub} onClick={() => setProjSubTab(sub)} className={`tab-btn ${projSubTab === sub ? 'active' : ''}`}>
                  {sub.charAt(0).toUpperCase() + sub.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="rpt-kpi-grid">
            {[
              { label: 'Active Projects', value: '24', color: '#3b82f6' },
              { label: 'Completed', value: '156', color: '#10b981' },
              { label: 'Delayed', value: '3', color: '#ef4444' },
              { label: 'Success Rate', value: '92%', color: '#8b5cf6' },
              { label: 'Budget Utilized', value: '78%', color: '#f59e0b' },
            ].map((k, i) => <div key={i} className="card rpt-kpi-card" style={{ borderTop: `3px solid ${k.color}` }}><div className="rpt-kpi-val" style={{ color: k.color }}>{k.value}</div><div className="rpt-kpi-label">{k.label}</div></div>)}
          </div>
          {projSubTab === 'analytics' && (
            <div className="flex-column grid-gap">
              <div className="rpt-grid-2">
                <ChartCard title="Project Status Distribution">
                  <ResponsiveContainer width="100%" height={230}>
                    <RechartsPie>
                      <Pie data={[{name:'Active',value:45},{name:'Completed',value:40},{name:'Delayed',value:5},{name:'Planning',value:10}]} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {['#3b82f6','#10b981','#ef4444','#f59e0b'].map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip contentStyle={TooltipStyle} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Project Completion Trends">
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={projectSuccessData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <Tooltip contentStyle={TooltipStyle} />
                      <Legend />
                      <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[3,3,0,0]} />
                      <Bar dataKey="delayed" fill="#ef4444" name="Delayed" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
              <div className="card">{renderReportTable(['Active Projects Report','Project Completion Report','Delayed Projects Report','Project Budget Report','Resource Allocation Report','Project Success Rate','Milestone Completion Report'], addPageToast)}</div>
            </div>
          )}
          {projSubTab === 'tasks' && (
            <div className="card">{renderReportTable(['Assigned Tasks Report','Completed Tasks Report','Pending Tasks Report','Overdue Tasks Report','Task Completion Trends','Department Task Analysis'], addPageToast)}</div>
          )}
          {projSubTab === 'resources' && (
            <div className="card">{renderReportTable(['Resource Allocation Report','Resource Utilization Report','Project Manager Performance','Team Productivity Report'], addPageToast)}</div>
          )}
        </div>
      )}

      {/* ══════════ TAB 5: DEPARTMENT REPORTS ══════════ */}
      {activeTab === 'department' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="card">
            <div className="rpt-section-head"><h4>Department Performance Comparison</h4></div>
            <div className="table-responsive">
              <table className="payroll-data-table">
                <thead>
                  <tr><th>Department</th><th>Employees</th><th>Attendance</th><th>Productivity</th><th>Performance</th><th>Task Completion</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {deptCompData.map((d, i) => (
                    <tr key={i}>
                      <td><strong>{d.dept}</strong></td>
                      <td>{d.employees}</td>
                      <td><span className="rpt-pct-badge success">{d.attendance}</span></td>
                      <td><span className="rpt-pct-badge primary">{d.productivity}</span></td>
                      <td><span className="rpt-pct-badge purple">{d.performance}</span></td>
                      <td><span className="rpt-pct-badge success">{d.taskCompletion}</span></td>
                      <td><button className="rpt-action-btn" onClick={() => addPageToast('success', `Generating ${d.dept} report...`)}><Download size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rpt-grid-2">
            <ChartCard title="Department Productivity">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={deptPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="dept" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[85, 100]} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Bar dataKey="productivity" name="Productivity" radius={[4,4,0,0]}>
                    {deptPerformanceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Department Attendance">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={deptPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} domain={[88, 100]} />
                  <YAxis dataKey="dept" type="category" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={TooltipStyle} />
                  <Bar dataKey="attendance" name="Attendance %" radius={[0,4,4,0]}>
                    {deptPerformanceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="card">{renderReportTable(['Department Productivity Report','Department Attendance Report','Department Performance Report','Department Resource Report','Department Budget Report'], addPageToast)}</div>
        </div>
      )}

      {/* ══════════ TAB 6: BRANCH REPORTS ══════════ */}
      {activeTab === 'branch' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="card">
            <div className="rpt-section-head"><h4>Branch Performance Comparison</h4></div>
            <div className="table-responsive">
              <table className="payroll-data-table">
                <thead>
                  <tr><th>Branch</th><th>Employees</th><th>Productivity</th><th>Performance</th><th>Attendance</th><th>Revenue Contribution</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {branchCompData.map((b, i) => (
                    <tr key={i}>
                      <td><strong>{b.branch}</strong></td>
                      <td>{b.employees}</td>
                      <td><span className="rpt-pct-badge primary">{b.productivity}</span></td>
                      <td><span className="rpt-pct-badge success">{b.performance}</span></td>
                      <td><span className="rpt-pct-badge purple">{b.attendance}</span></td>
                      <td><span className="rpt-pct-badge warning">{b.revenue}</span></td>
                      <td><button className="rpt-action-btn" onClick={() => addPageToast('success', `Generating ${b.branch} report...`)}><Download size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rpt-grid-2">
            <ChartCard title="Branch Performance Radar" subtitle="Multi-metric comparison">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={branchRadarData} cx="50%" cy="50%" outerRadius={90}>
                  <PolarGrid stroke="var(--border-color)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[70, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                  <Radar name="Jaipur" dataKey="jaipur" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Radar name="Delhi" dataKey="delhi" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Radar name="Mumbai" dataKey="mumbai" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                  <Radar name="Bangalore" dataKey="bangalore" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                  <Legend />
                  <Tooltip contentStyle={TooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Branch Revenue Contribution">
              <ResponsiveContainer width="100%" height={260}>
                <RechartsPie>
                  <Pie data={[{name:'Jaipur HQ',value:45},{name:'Delhi Branch',value:28},{name:'Mumbai Branch',value:18},{name:'Bangalore Branch',value:9}]} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {['#3b82f6','#10b981','#f59e0b','#8b5cf6'].map((c,i)=><Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={TooltipStyle} formatter={v=>[`${v}%`,'Revenue Share']} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="card">{renderReportTable(['Branch Productivity Report','Branch Attendance Report','Branch Payroll Report','Branch Employee Report','Branch Ranking Report','Branch Growth Report'], addPageToast)}</div>
        </div>
      )}

      {/* ══════════ TAB 7: CUSTOM REPORTS ══════════ */}
      {activeTab === 'custom' && (
        <div className="flex-column grid-gap animate-fade-in">

          {/* Search & Filter Bar */}
          <div className="card rpt-filter-bar">
            <div className="rpt-search-wrap">
              <Search size={15} className="rpt-search-icon" />
              <input className="rpt-search-input" placeholder="Search by report name, employee, department, branch..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="table-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {['Attendance','Payroll','Employee','Projects','Leave','Branch','Department'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="table-filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {(departments || []).map(d => <option key={d.id || d.name} value={d.name}>{d.name}</option>)}
            </select>
            <select className="table-filter-select" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
              <option value="">All Branches</option>
              {(branches || []).map(b => <option key={b.id || b.name} value={b.name}>{b.name}</option>)}
            </select>
            <select className="table-filter-select" value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
              <option value="">All Formats</option>
              {['PDF','Excel','CSV'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <button className="rpt-clear-btn" onClick={() => { setSearchQuery(''); setFilterType(''); setFilterDept(''); setFilterBranch(''); setFilterFormat(''); }}>
              <X size={13} /> Clear
            </button>
          </div>

          {/* Download Center */}
          <div className="card">
            <div className="rpt-section-head">
              <h4>Reports Download Center</h4>
              <div className="flex-center gap-2">
                <Button size="sm" variant="primary" icon={Plus} onClick={() => setShowGenerateModal(true)}>Generate Report</Button>
                <Button size="sm" variant="ghost" icon={Download} onClick={() => setShowExportModal(true)}>Export Analytics</Button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="payroll-data-table">
                <thead>
                  <tr><th>Report Name</th><th>Type</th><th>Generated By</th><th>Date & Time</th><th>Format</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <ReportTableRow key={r.id} report={r} onDownload={handleDownloadReport} onDelete={handleDeleteReport} />
                  ))}
                  {filteredReports.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No reports match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scheduled Reports */}
          <div className="card">
            <div className="rpt-section-head">
              <h4>Scheduled Reports</h4>
              <Button size="sm" variant="secondary" icon={Calendar} onClick={() => setShowScheduleModal(true)}>Add Schedule</Button>
            </div>
            <div className="table-responsive">
              <table className="payroll-data-table">
                <thead>
                  <tr><th>Schedule Name</th><th>Frequency</th><th>Next Run</th><th>Recipients</th><th>Format</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {schedules.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.frequency}</td>
                      <td className="rpt-td-muted">{s.nextRun}</td>
                      <td className="rpt-td-muted">{s.recipients}</td>
                      <td><span className={`rpt-format-badge rpt-format-${s.format.toLowerCase()}`}>{s.format}</span></td>
                      <td><Badge variant={s.status === 'Active' ? 'success' : 'warning'}>{s.status}</Badge></td>
                      <td>
                        <div className="rpt-row-actions">
                          <button className="rpt-action-btn" title="Edit"><Edit3 size={13} /></button>
                          <button className="rpt-action-btn danger" title="Delete" onClick={() => handleDeleteSchedule(s.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Options */}
          <div className="card rpt-delivery-card">
            <h4 className="rpt-chart-title">Report Delivery Options</h4>
            <div className="rpt-delivery-grid">
              {[
                { icon: Mail, label: 'Email', desc: 'Send to specified recipients', color: '#3b82f6' },
                { icon: LayoutDashboard, label: 'Dashboard', desc: 'In-app notification on login', color: '#10b981' },
                { icon: Download, label: 'Download Center', desc: 'Available for 30 days', color: '#8b5cf6' },
                { icon: Bell, label: 'Notification Center', desc: 'Push notification alert', color: '#f59e0b' },
              ].map((d, i) => {
                const Icon = d.icon;
                return (
                  <div key={i} className="rpt-delivery-item" style={{ borderLeft: `3px solid ${d.color}` }}>
                    <div className="rpt-delivery-icon" style={{ color: d.color }}><Icon size={20} /></div>
                    <div><div className="rpt-delivery-label">{d.label}</div><div className="rpt-delivery-desc">{d.desc}</div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="card rpt-footer">
        {[
          { label: 'Total Reports Generated', value: '25,480' },
          { label: 'Active Dashboards', value: '18' },
          { label: 'Last Analytics Update', value: 'Just Now' },
          { label: 'BI System Status', value: 'Active ✅' },
          { label: 'Reports Today', value: '128' },
          { label: 'Scheduled Reports Active', value: schedules.length },
        ].map((f, i) => (
          <div key={i} className="rpt-footer-item">
            <span className="rpt-footer-val">{f.value}</span>
            <span className="rpt-footer-label">{f.label}</span>
          </div>
        ))}
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="payroll-modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="payroll-modal-container rpt-modal" onClick={e => e.stopPropagation()}>
            <div className="rpt-modal-head">
              <h3>Generate Report</h3>
              <button className="rpt-modal-close" onClick={() => setShowGenerateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerateReport} className="rpt-modal-body">
              <div className="rpt-form-grid">
                <div className="settings-field">
                  <label className="input-label">Report Type *</label>
                  <select className="table-filter-select rpt-select-full" required value={genForm.reportType} onChange={e => setGenForm(p => ({ ...p, reportType: e.target.value }))}>
                    <option value="">Select Report Type</option>
                    {['Attendance Report','Employee Report','Payroll Report','Leave Report','Project Report','Performance Report','Branch Report','Department Report'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="settings-field">
                  <label className="input-label">Date Range *</label>
                  <select className="table-filter-select rpt-select-full" required value={genForm.dateRange} onChange={e => setGenForm(p => ({ ...p, dateRange: e.target.value }))}>
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="this_quarter">This Quarter</option>
                    <option value="this_year">This Year</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="input-label">Department</label>
                  <select className="table-filter-select rpt-select-full" value={genForm.department} onChange={e => setGenForm(p => ({ ...p, department: e.target.value }))}>
                    <option value="">All Departments</option>
                    {(departments || []).map(d => <option key={d.id || d.name} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="settings-field">
                  <label className="input-label">Branch</label>
                  <select className="table-filter-select rpt-select-full" value={genForm.branch} onChange={e => setGenForm(p => ({ ...p, branch: e.target.value }))}>
                    <option value="">All Branches</option>
                    {(branches || []).map(b => <option key={b.id || b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="settings-field" style={{ marginTop: 12 }}>
                <label className="input-label">Output Format *</label>
                <div className="rpt-format-row">
                  {['PDF','Excel','CSV'].map(f => (
                    <label key={f} className={`rpt-format-opt ${genForm.format === f ? 'selected' : ''}`}>
                      <input type="radio" name="format" value={f} checked={genForm.format === f} onChange={() => setGenForm(p => ({ ...p, format: f }))} hidden />
                      <FileText size={16} />{f}
                    </label>
                  ))}
                </div>
              </div>
              <div className="rpt-check-row">
                <label className="rpt-check-label"><input type="checkbox" checked={genForm.includeCharts} onChange={e => setGenForm(p => ({ ...p, includeCharts: e.target.checked }))} /> Include Charts</label>
                <label className="rpt-check-label"><input type="checkbox" checked={genForm.includeSummary} onChange={e => setGenForm(p => ({ ...p, includeSummary: e.target.checked }))} /> Include Summary</label>
              </div>
              <div className="rpt-modal-footer">
                <Button type="button" variant="ghost" onClick={() => setShowGenerateModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" icon={FileText}>Generate Report</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Report Builder Modal */}
      {showCustomModal && (
        <div className="payroll-modal-overlay" onClick={() => setShowCustomModal(false)}>
          <div className="payroll-modal-container rpt-modal rpt-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="rpt-modal-head">
              <h3>Custom Report Builder — Step {customStep} of 4</h3>
              <button className="rpt-modal-close" onClick={() => { setShowCustomModal(false); setCustomStep(1); }}><X size={18} /></button>
            </div>
            <div className="rpt-step-bar">
              {['Data Sources','Filters','Columns','Output'].map((s, i) => (
                <div key={i} className={`rpt-step ${customStep > i + 1 ? 'done' : customStep === i + 1 ? 'active' : ''}`}>
                  <div className="rpt-step-num">{customStep > i + 1 ? <Check size={12} /> : i + 1}</div>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div className="rpt-modal-body">
              {customStep === 1 && (
                <div>
                  <p className="rpt-modal-desc">Select the data sources to include in your custom report.</p>
                  <div className="rpt-checkbox-grid">
                    {Object.entries({ employees: 'Employees', attendance: 'Attendance', leaves: 'Leaves', payroll: 'Payroll', projects: 'Projects', tasks: 'Tasks', performance: 'Performance' }).map(([k, v]) => (
                      <label key={k} className="rpt-check-card">
                        <input type="checkbox" checked={customForm.dataSources[k]} onChange={e => setCustomForm(p => ({ ...p, dataSources: { ...p.dataSources, [k]: e.target.checked } }))} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {customStep === 2 && (
                <div className="rpt-form-grid">
                  <div className="settings-field">
                    <label className="input-label">Branch</label>
                    <select className="table-filter-select rpt-select-full" value={customForm.filters.branch} onChange={e => setCustomForm(p => ({ ...p, filters: { ...p.filters, branch: e.target.value } }))}>
                      <option value="All">All</option>
                      {(branches || []).map(b => <option key={b.id || b.name} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="settings-field">
                    <label className="input-label">Department</label>
                    <select className="table-filter-select rpt-select-full" value={customForm.filters.department} onChange={e => setCustomForm(p => ({ ...p, filters: { ...p.filters, department: e.target.value } }))}>
                      <option value="All">All</option>
                      {(departments || []).map(d => <option key={d.id || d.name} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="settings-field">
                    <label className="input-label">Status</label>
                    <select className="table-filter-select rpt-select-full" value={customForm.filters.status} onChange={e => setCustomForm(p => ({ ...p, filters: { ...p.filters, status: e.target.value } }))}>
                      {['All','Active','Inactive','Completed','Pending'].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {customStep === 3 && (
                <div>
                  <p className="rpt-modal-desc">Select the columns to include in your report.</p>
                  <div className="rpt-checkbox-grid">
                    {Object.entries({ name: 'Employee Name', department: 'Department', attendance: 'Attendance %', performance: 'Performance Score', salary: 'Salary', tasks: 'Tasks Completed' }).map(([k, v]) => (
                      <label key={k} className="rpt-check-card">
                        <input type="checkbox" checked={customForm.columns[k]} onChange={e => setCustomForm(p => ({ ...p, columns: { ...p.columns, [k]: e.target.checked } }))} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {customStep === 4 && (
                <div className="flex-column" style={{ gap: 16 }}>
                  <div className="settings-field">
                    <label className="input-label">Report Name</label>
                    <input className="table-search-input rpt-select-full" value={customForm.output.name} onChange={e => setCustomForm(p => ({ ...p, output: { ...p.output, name: e.target.value } }))} />
                  </div>
                  <div className="settings-field">
                    <label className="input-label">Output Format</label>
                    <div className="rpt-format-row">
                      {['PDF','Excel','CSV','Dashboard View'].map(f => (
                        <label key={f} className={`rpt-format-opt ${customForm.output.format === f ? 'selected' : ''}`}>
                          <input type="radio" name="cformat" value={f} checked={customForm.output.format === f} onChange={() => setCustomForm(p => ({ ...p, output: { ...p.output, format: f } }))} hidden />
                          <FileText size={14} />{f}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="rpt-check-label"><input type="checkbox" checked={customForm.output.saveTemplate} onChange={e => setCustomForm(p => ({ ...p, output: { ...p.output, saveTemplate: e.target.checked } }))} /> Save as Template</label>
                </div>
              )}
            </div>
            <div className="rpt-modal-footer">
              {customStep > 1 && <Button variant="ghost" onClick={() => setCustomStep(s => s - 1)}>Back</Button>}
              <Button variant="ghost" onClick={() => { setShowCustomModal(false); setCustomStep(1); }}>Cancel</Button>
              {customStep < 4
                ? <Button variant="primary" onClick={() => setCustomStep(s => s + 1)}>Next <ChevronRight size={14} /></Button>
                : <Button variant="primary" icon={FileText} onClick={() => { const r = { id: Date.now(), name: customForm.output.name, type: 'Custom', generatedBy: 'Current User', time: 'Just now', format: customForm.output.format, size: '0.9 MB' }; setReports(prev => [r, ...prev]); setShowCustomModal(false); setCustomStep(1); addPageToast('success', 'Custom report created'); }}>Create Report</Button>
              }
            </div>
          </div>
        </div>
      )}

      {/* Schedule Report Modal */}
      {showScheduleModal && (
        <div className="payroll-modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="payroll-modal-container rpt-modal" onClick={e => e.stopPropagation()}>
            <div className="rpt-modal-head">
              <h3>Schedule Report</h3>
              <button className="rpt-modal-close" onClick={() => setShowScheduleModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleScheduleReport} className="rpt-modal-body">
              <div className="rpt-form-grid">
                <div className="settings-field" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Schedule Name *</label>
                  <input className="table-search-input rpt-select-full" required placeholder="e.g. Weekly Attendance Report" value={schedForm.name} onChange={e => setSchedForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="settings-field">
                  <label className="input-label">Report Type</label>
                  <select className="table-filter-select rpt-select-full" value={schedForm.reportType} onChange={e => setSchedForm(p => ({ ...p, reportType: e.target.value }))}>
                    <option value="">Select Type</option>
                    {['Attendance Report','Payroll Report','Employee Report','Project Report','Performance Report'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="settings-field">
                  <label className="input-label">Frequency</label>
                  <select className="table-filter-select rpt-select-full" value={schedForm.frequency} onChange={e => setSchedForm(p => ({ ...p, frequency: e.target.value }))}>
                    {['Daily','Weekly','Monthly','Quarterly','Annual'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="settings-field">
                  <label className="input-label">Time</label>
                  <input type="time" className="table-search-input rpt-select-full" value={schedForm.time} onChange={e => setSchedForm(p => ({ ...p, time: e.target.value }))} />
                </div>
                <div className="settings-field">
                  <label className="input-label">Format</label>
                  <select className="table-filter-select rpt-select-full" value={schedForm.format} onChange={e => setSchedForm(p => ({ ...p, format: e.target.value }))}>
                    {['PDF','Excel','Both'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="settings-field" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Recipients (comma-separated)</label>
                  <input className="table-search-input rpt-select-full" placeholder="hr@company.com, finance@company.com" value={schedForm.recipients} onChange={e => setSchedForm(p => ({ ...p, recipients: e.target.value }))} />
                </div>
              </div>
              <label className="rpt-check-label" style={{ marginTop: 12 }}><input type="checkbox" checked={schedForm.active} onChange={e => setSchedForm(p => ({ ...p, active: e.target.checked }))} /> Active</label>
              <div className="rpt-modal-footer">
                <Button type="button" variant="ghost" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" icon={Calendar}>Schedule Report</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="payroll-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="payroll-modal-container rpt-modal" onClick={e => e.stopPropagation()}>
            <div className="rpt-modal-head">
              <h3>Export Analytics</h3>
              <button className="rpt-modal-close" onClick={() => setShowExportModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleExport} className="rpt-modal-body">
              <div className="rpt-form-grid">
                <div className="settings-field">
                  <label className="input-label">Export Range</label>
                  <select className="table-filter-select rpt-select-full" value={exportForm.range} onChange={e => setExportForm(p => ({ ...p, range: e.target.value }))}>
                    <option value="current">Current View</option>
                    <option value="all">All Data</option>
                    <option value="selected">Selected Rows</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="input-label">Format</label>
                  <select className="table-filter-select rpt-select-full" value={exportForm.format} onChange={e => setExportForm(p => ({ ...p, format: e.target.value }))}>
                    {['PDF','Excel','CSV'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                {exportForm.format === 'PDF' && <>
                  <div className="settings-field">
                    <label className="input-label">Orientation</label>
                    <select className="table-filter-select rpt-select-full" value={exportForm.orientation} onChange={e => setExportForm(p => ({ ...p, orientation: e.target.value }))}>
                      <option>Portrait</option><option>Landscape</option>
                    </select>
                  </div>
                  <div className="settings-field">
                    <label className="input-label">Paper Size</label>
                    <select className="table-filter-select rpt-select-full" value={exportForm.size} onChange={e => setExportForm(p => ({ ...p, size: e.target.value }))}>
                      <option>A4</option><option>Letter</option><option>Legal</option>
                    </select>
                  </div>
                </>}
              </div>
              <label className="rpt-check-label" style={{ marginTop: 12 }}><input type="checkbox" checked={exportForm.timestamp} onChange={e => setExportForm(p => ({ ...p, timestamp: e.target.checked }))} /> Include Timestamp</label>
              <div className="rpt-modal-footer">
                <Button type="button" variant="ghost" onClick={() => setShowExportModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" icon={Download}>Export Analytics</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// ─── Helper: Report Table Generator ─────────────────────────────────────────
function renderReportTable(reportNames, addPageToast, extraHeaders = []) {
  return (
    <div>
      <div className="rpt-section-head" style={{ padding: '16px 20px 12px' }}><h4>Available Reports</h4></div>
      <div className="table-responsive">
        <table className="payroll-data-table">
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Description</th>
              {extraHeaders.map(h => <th key={h}>{h}</th>)}
              <th>Format</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reportNames.map((name, i) => (
              <tr key={i}>
                <td><strong>{name}</strong></td>
                <td className="rpt-td-muted">Comprehensive {name.toLowerCase()} with detailed breakdown and analytics</td>
                {extraHeaders.map(h => <td key={h} className="rpt-td-muted">—</td>)}
                <td>
                  <div className="flex-center gap-1">
                    <span className="rpt-format-badge rpt-format-pdf">PDF</span>
                    <span className="rpt-format-badge rpt-format-excel">Excel</span>
                  </div>
                </td>
                <td>
                  <div className="rpt-row-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="rpt-action-btn" title="Download" onClick={() => { addPageToast('success', `Downloading ${name}...`); const c = `Report: ${name}\nGenerated: ${new Date().toLocaleString()}\n\nThis is a simulated report download.`; const b = new Blob([c], {type:'text/plain'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${name.replace(/\s+/g,'_')}.txt`; a.click(); }}><Download size={13} /></button>
                    <button className="rpt-action-btn" title="Preview"><Eye size={13} /></button>
                    <button className="rpt-action-btn" title="Email"><Mail size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;
