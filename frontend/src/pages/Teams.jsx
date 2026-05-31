import React, { useState, useMemo } from 'react';
import './Teams.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  Award, Plus, Users, TrendingUp, Search, Edit2, Trash2, MapPin, CheckCircle2, UserMinus, BookOpen,
  Briefcase, BarChart2, Calendar, FileText, Settings, ArrowUpRight, TrendingDown,
  AlertTriangle, CheckSquare, Eye, Shield, User, FileCode, Check, Send, Trash, Play, HelpCircle
} from 'lucide-react';

// SECTION 2 - 8 initial sample rows
const initialTeams = [
  {
    id: 'TM-001',
    name: 'Development Team',
    leader: 'Rahul Sharma',
    department: 'IT',
    branch: 'Head Office',
    activeProjects: 8,
    completedTasks: 45,
    productivity: 96,
    attendance: 92,
    status: 'Active',
    description: 'Core product engineering and architecture team responsible for frontend, backend, and DevOps.',
    createdDate: '2025-01-10',
    type: 'Permanent',
    maxSize: 30,
    shift: 'Flexible',
    goals: 'Deliver version 2.0 microservices migration and achieve 99.9% uptime.',
    assistantLeader: 'Vikram Mehta',
    projectManager: 'Sneha Patel',
    membersList: [
      { name: 'Rahul Sharma', id: 'EMP-001', designation: 'Tech Lead', date: '2025-01-10', attendance: 92, productivity: 96 },
      { name: 'Vikram Mehta', id: 'EMP-005', designation: 'Senior Developer', date: '2025-02-15', attendance: 86, productivity: 91 },
      { name: 'Suresh Kumar', id: 'EMP-012', designation: 'Frontend Engineer', date: '2025-03-01', attendance: 94, productivity: 90 },
      { name: 'Ananya Gupta', id: 'EMP-018', designation: 'QA Specialist', date: '2025-04-10', attendance: 95, productivity: 88 }
    ]
  },
  {
    id: 'TM-002',
    name: 'Sales Team A',
    leader: 'Priya Singh',
    department: 'Sales',
    branch: 'Branch Office',
    activeProjects: 6,
    completedTasks: 38,
    productivity: 94,
    attendance: 89,
    status: 'Active',
    description: 'Domestic enterprise sales and client relationship management operations.',
    createdDate: '2025-01-18',
    type: 'Permanent',
    maxSize: 20,
    shift: 'Morning',
    goals: 'Exceed Q2 pipeline generation target by 15% and increase customer retention.',
    assistantLeader: 'Raj Verma',
    projectManager: 'Amit Kumar',
    membersList: [
      { name: 'Priya Singh', id: 'EMP-002', designation: 'Sales Manager', date: '2025-01-18', attendance: 89, productivity: 94 },
      { name: 'Raj Verma', id: 'EMP-007', designation: 'Sales Rep', date: '2025-03-05', attendance: 84, productivity: 85 }
    ]
  },
  {
    id: 'TM-003',
    name: 'Marketing Team',
    leader: 'Amit Kumar',
    department: 'Marketing',
    branch: 'Head Office',
    activeProjects: 5,
    completedTasks: 29,
    productivity: 92,
    attendance: 91,
    status: 'Active',
    description: 'Digital campaign strategy, SEO optimization, and social media brand outreach.',
    createdDate: '2025-02-05',
    type: 'Permanent',
    maxSize: 15,
    shift: 'Morning',
    goals: 'Launch summer campaign and reduce customer acquisition cost (CAC) by 10%.',
    assistantLeader: 'Kavita Joshi',
    projectManager: 'Sneha Patel',
    membersList: [
      { name: 'Amit Kumar', id: 'EMP-003', designation: 'Marketing Lead', date: '2025-02-05', attendance: 91, productivity: 92 },
      { name: 'Kavita Joshi', id: 'EMP-006', designation: 'Content Strategist', date: '2025-03-12', attendance: 90, productivity: 87 }
    ]
  },
  {
    id: 'TM-004',
    name: 'HR Operations',
    leader: 'Sneha Patel',
    department: 'HR',
    branch: 'Head Office',
    activeProjects: 3,
    completedTasks: 22,
    productivity: 89,
    attendance: 88,
    status: 'Active',
    description: 'Employee onboarding, talent acquisition, policy compliance, and benefits administration.',
    createdDate: '2025-02-12',
    type: 'Permanent',
    maxSize: 10,
    shift: 'Morning',
    goals: 'Revise employee handbook and onboard 50 new engineers in Q2.',
    assistantLeader: 'Neha Verma',
    projectManager: 'Rahul Sharma',
    membersList: [
      { name: 'Sneha Patel', id: 'EMP-004', designation: 'HR Director', date: '2025-02-12', attendance: 88, productivity: 89 }
    ]
  },
  {
    id: 'TM-005',
    name: 'Design Team',
    leader: 'Vikram Mehta',
    department: 'IT',
    branch: 'Agency',
    activeProjects: 4,
    completedTasks: 18,
    productivity: 91,
    attendance: 86,
    status: 'Under Review',
    description: 'User experience design, user interface mockups, prototyping, and graphic elements.',
    createdDate: '2025-02-28',
    type: 'Project-based',
    maxSize: 12,
    shift: 'Flexible',
    goals: 'Refresh visual assets of web console and design client portal interface.',
    assistantLeader: 'Suresh Kumar',
    projectManager: 'Sneha Patel',
    membersList: [
      { name: 'Vikram Mehta', id: 'EMP-005', designation: 'UI/UX Director', date: '2025-02-28', attendance: 86, productivity: 91 }
    ]
  },
  {
    id: 'TM-006',
    name: 'Finance Team',
    leader: 'Kavita Joshi',
    department: 'Finance',
    branch: 'Branch Office',
    activeProjects: 2,
    completedTasks: 15,
    productivity: 87,
    attendance: 90,
    status: 'Active',
    description: 'Corporate accounts auditing, budgets analysis, tax reporting, and resource allocations.',
    createdDate: '2025-03-01',
    type: 'Permanent',
    maxSize: 8,
    shift: 'Morning',
    goals: 'Audit annual statements and optimize corporate travel expenses policy.',
    assistantLeader: 'Neha Gupta',
    projectManager: 'Amit Kumar',
    membersList: [
      { name: 'Kavita Joshi', id: 'EMP-006', designation: 'Finance Lead', date: '2025-03-01', attendance: 90, productivity: 87 }
    ]
  },
  {
    id: 'TM-007',
    name: 'Support Team',
    leader: 'Raj Verma',
    department: 'Operations',
    branch: 'Agency',
    activeProjects: 5,
    completedTasks: 31,
    productivity: 85,
    attendance: 84,
    status: 'Inactive',
    description: 'Technical customer support desk operations resolving tickets and system status issues.',
    createdDate: '2025-03-10',
    type: 'Temporary',
    maxSize: 15,
    shift: 'Flexible',
    goals: 'Maintain customer satisfaction score (CSAT) above 85% and resolve Tier 1 tickets.',
    assistantLeader: 'Rahul Sharma',
    projectManager: 'Priya Singh',
    membersList: [
      { name: 'Raj Verma', id: 'EMP-007', designation: 'Helpdesk Lead', date: '2025-03-10', attendance: 84, productivity: 85 }
    ]
  },
  {
    id: 'TM-008',
    name: 'Research Team',
    leader: 'Neha Gupta',
    department: 'IT',
    branch: 'Head Office',
    activeProjects: 3,
    completedTasks: 12,
    productivity: 93,
    attendance: 88,
    status: 'New Team',
    description: 'Future tech R&D, artificial intelligence prototyping, and machine learning models testing.',
    createdDate: '2025-04-01',
    type: 'Project-based',
    maxSize: 10,
    shift: 'Flexible',
    goals: 'Train advanced neural network prototypes on text processing inputs.',
    assistantLeader: 'Amit Kumar',
    projectManager: 'Sneha Patel',
    membersList: [
      { name: 'Neha Gupta', id: 'EMP-008', designation: 'R&D Lead', date: '2025-04-01', attendance: 88, productivity: 93 }
    ]
  }
];

// Recharts Chart Mock Data
const productivityChartData = [
  { name: 'IT', productivity: 96 },
  { name: 'Sales', productivity: 94 },
  { name: 'Marketing', productivity: 92 },
  { name: 'HR', productivity: 91 },
  { name: 'Operations', productivity: 89 }
];

const statusChartData = [
  { name: 'Active', value: 78, color: '#10b981' },
  { name: 'Under Review', value: 4, color: '#f59e0b' },
  { name: 'New Team', value: 2, color: '#3b82f6' },
  { name: 'Inactive', value: 1, color: '#ef4444' },
  { name: 'Archived', value: 1, color: '#94a3b8' }
];

const workloadChartData = [
  { name: 'IT', Capacity: 100, Workload: 87, Utilization: 87 },
  { name: 'Sales', Capacity: 100, Workload: 92, Utilization: 92 },
  { name: 'Marketing', Capacity: 100, Workload: 76, Utilization: 76 },
  { name: 'HR', Capacity: 100, Workload: 68, Utilization: 68 },
  { name: 'Finance', Capacity: 100, Workload: 82, Utilization: 82 },
  { name: 'Operations', Capacity: 100, Workload: 90, Utilization: 90 }
];

const attendanceTrendData = [
  { day: 'Mon', Attendance: 90 },
  { day: 'Tue', Attendance: 92 },
  { day: 'Wed', Attendance: 94 },
  { day: 'Thu', Attendance: 91 },
  { day: 'Fri', Attendance: 88 },
  { day: 'Sat', Attendance: 85 },
  { day: 'Sun', Attendance: 86 }
];

// Dismissible warning & system alerts
const initialAlerts = [
  { id: 'a1', type: 'warning', text: 'Team Leader Not Assigned — 2 teams' },
  { id: 'a2', type: 'warning', text: 'Low Productivity Team — 1 team' },
  { id: 'a3', type: 'warning', text: 'Team Understaffed — 3 teams' },
  { id: 'a4', type: 'warning', text: 'Overloaded Team — 1 team' },
  { id: 'a5', type: 'warning', text: 'Project Deadline Approaching — 5 projects' },
  { id: 'a6', type: 'info', text: 'New Team Created' },
  { id: 'a7', type: 'info', text: 'Team Leader Assigned' },
  { id: 'a8', type: 'info', text: 'Team Updated Successfully' },
  { id: 'a9', type: 'info', text: 'Members Added to Team' }
];

const initialActivities = [
  { id: 'ac1', type: 'green', text: 'New Development Team Created', time: 'Just now' },
  { id: 'ac2', type: 'blue', text: 'Rahul Sharma Assigned as Team Leader', time: '2 min ago' },
  { id: 'ac3', type: 'green', text: '5 Employees Added to Marketing Team', time: '10 min ago' },
  { id: 'ac4', type: 'yellow', text: 'Sales Team Achieved Monthly Target', time: '25 min ago' },
  { id: 'ac5', type: 'blue', text: 'Project Assigned to Design Team', time: '1 hr ago' }
];

const Teams = () => {
  const isLoading = usePageLoading(600);
  const { addToast, showConfirm } = useApp();

  // Core Team List State
  const [teams, setTeams] = useState(initialTeams);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [prodFilter, setProdFilter] = useState('');
  const [exportFormat, setExportFormat] = useState('PDF');

  // Modal / Drawer States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('info');
  const [activePageTab, setActivePageTab] = useState('directory');
  const [showSummary, setShowSummary] = useState(true);

  // Dismissible Alert States
  const [alerts, setAlerts] = useState(initialAlerts);
  const [activities, setActivities] = useState(initialActivities);

  // Create Team Form State
  const [newTeam, setNewTeam] = useState({
    name: '',
    code: '',
    department: 'IT',
    branch: 'Head Office',
    description: '',
    leader: '',
    assistantLeader: '',
    projectManager: '',
    type: 'Permanent',
    maxSize: 10,
    shift: 'Flexible',
    goals: ''
  });

  // Table pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 8 teams displayed in the mock list

  // Validation state
  const [formErrors, setFormErrors] = useState({});

  // Filters calculation
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                          t.id.toLowerCase().includes(search.toLowerCase()) ||
                          t.leader.toLowerCase().includes(search.toLowerCase()) ||
                          t.department.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = statusFilter ? t.status === statusFilter : true;
      const matchDept = deptFilter ? t.department === deptFilter : true;
      const matchBranch = branchFilter ? t.branch === branchFilter : true;
      
      let matchProd = true;
      if (prodFilter === 'High') matchProd = t.productivity >= 92;
      else if (prodFilter === 'Average') matchProd = t.productivity >= 88 && t.productivity < 92;
      else if (prodFilter === 'Low') matchProd = t.productivity < 88;

      return matchSearch && matchStatus && matchDept && matchBranch && matchProd;
    });
  }, [teams, search, statusFilter, deptFilter, branchFilter, prodFilter]);

  // Paginated view (normally calculated dynamically, here showing matched rows)
  const paginatedTeams = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredTeams.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTeams, currentPage]);

  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage) || 1;

  // Form submit handler
  const handleCreateTeamSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!newTeam.name) errors.name = 'Team Name is required';
    if (!newTeam.code) errors.code = 'Team Code is required';
    if (!newTeam.leader) errors.leader = 'Team Leader is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('danger', 'Please correct form validation errors.');
      return;
    }

    // Auto-assemble the new team mock structure
    const createdTeam = {
      id: newTeam.code,
      name: newTeam.name,
      leader: newTeam.leader,
      department: newTeam.department,
      branch: newTeam.branch,
      activeProjects: 0,
      completedTasks: 0,
      productivity: 90,
      attendance: 100,
      status: 'Active',
      description: newTeam.description,
      createdDate: new Date().toISOString().split('T')[0],
      type: newTeam.type,
      maxSize: newTeam.maxSize,
      shift: newTeam.shift,
      goals: newTeam.goals,
      assistantLeader: newTeam.assistantLeader,
      projectManager: newTeam.projectManager,
      membersList: [
        { name: newTeam.leader, id: 'EMP-' + Math.floor(Math.random() * 900 + 100), designation: 'Tech Lead', date: new Date().toISOString().split('T')[0], attendance: 100, productivity: 90 }
      ]
    };

    setTeams(prev => [createdTeam, ...prev]);
    setCreateModalOpen(false);
    // Add success system alert dynamically
    setAlerts(prev => [
      { id: Date.now().toString(), type: 'info', text: `New Team Created: ${newTeam.name}` },
      ...prev
    ]);
    setActivities(prev => [
      { id: Date.now().toString(), type: 'green', text: `New ${newTeam.name} Created`, time: 'Just now' },
      ...prev
    ]);

    // Reset Form
    setNewTeam({
      name: '',
      code: '',
      department: 'IT',
      branch: 'Head Office',
      description: '',
      leader: '',
      assistantLeader: '',
      projectManager: '',
      type: 'Permanent',
      maxSize: 10,
      shift: 'Flexible',
      goals: ''
    });
    setFormErrors({});
    addToast('success', 'Team created successfully!');
  };

  const handleExport = (format) => {
    addToast('info', `Exporting data as ${format}...`);
  };

  const handleDismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleRowClick = (team) => {
    setSelectedTeam(team);
    setActiveDrawerTab('info');
    setDetailDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="teams-page">
        <div className="teams-top-cards">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ height: 110 }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div style={{ height: 400, marginTop: 20 }} className="card">
          <Skeleton variant="rect" height="100%" />
        </div>
      </div>
    );
  }

  return (
    <div className="teams-page">

      {/* Page Header */}
      <div className="teams-page-header">
        <div className="att-header-left">
          <div className="att-header-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Users size={16} />
          </div>
          <div>
            <h2 className="syne-heading" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Team Management</h2>
            <p className="page-desc-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Create, organize, manage, and monitor all corporate teams, leaders, members, projects, workloads, and department productivity.
            </p>
          </div>
        </div>
        <div className="att-header-actions">
          <Button variant="secondary" onClick={() => addToast('info', 'Refreshing dashboard data...')} size="sm">
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setCreateModalOpen(true)} icon={Plus} size="sm">
            Create Team
          </Button>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="teams-page-tabs">
        <button
          type="button"
          className={`teams-page-tab-btn ${activePageTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActivePageTab('directory')}
        >
          <Users size={16} />
          <span>Directory & Overview</span>
        </button>
        <button
          type="button"
          className={`teams-page-tab-btn ${activePageTab === 'productivity' ? 'active' : ''}`}
          onClick={() => setActivePageTab('productivity')}
        >
          <BarChart2 size={16} />
          <span>Productivity & Workload</span>
        </button>
        <button
          type="button"
          className={`teams-page-tab-btn ${activePageTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActivePageTab('attendance')}
        >
          <Calendar size={16} />
          <span>Attendance Analytics</span>
        </button>
        <button
          type="button"
          className={`teams-page-tab-btn ${activePageTab === 'operations' ? 'active' : ''}`}
          onClick={() => setActivePageTab('operations')}
        >
          <Settings size={16} />
          <span>Operations & Feeds</span>
        </button>
      </div>

      {/* Scrollable Tab Content Container */}
      <div className="teams-tab-scrollable-content">
        {activePageTab === 'directory' && (
          <div className="teams-tab-inner-vertical">
            {/* SECTION 1 — TOP SUMMARY CARDS */}
            {showSummary && (
              <div className="teams-top-cards">
                {[
                  { label: 'Total Teams', desc: 'Active organizational groups', value: '86', trend: '↑ 4.2% this month', icon: Users, colorClass: 'teams-top-icon-blue' },
                  { label: 'Active Teams', desc: 'Teams with active task pipelines', value: '78', trend: '↑ 2.1% this month', icon: CheckCircle2, colorClass: 'teams-top-icon-green' },
                  { label: 'Team Leaders', desc: 'Designated team commanders', value: '86', trend: '↑ 1.8% this month', icon: Award, colorClass: 'teams-top-icon-purple' },
                  { label: 'Total Members', desc: 'Employees assigned to groups', value: '1,250', trend: '↑ 6.3% this month', icon: Users, colorClass: 'teams-top-icon-amber' },
                  { label: 'Active Projects', desc: 'Ongoing deliverables mapped', value: '42', trend: '↑ 3.5% this month', icon: Briefcase, colorClass: 'teams-top-icon-coral' },
                  { label: 'Productivity Rate', desc: 'Average velocity rating', value: '92%', trend: '↑ 1.2% this month', icon: BarChart2, colorClass: 'teams-top-icon-teal' }
                ].map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <div key={i} className="teams-top-card">
                      <div className="teams-top-card-header">
                        <div className={`teams-top-icon-box ${c.colorClass}`}>
                          <Icon size={16} />
                        </div>
                        <span className="teams-top-trend teams-trend-up">{c.trend}</span>
                      </div>
                      <div className="teams-top-value">{c.value}</div>
                      <div className="teams-top-details">
                        <span className="teams-top-label">{c.label}</span>
                        <span className="teams-top-desc">{c.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECTION 2 & 11 — TEAM DIRECTORY TABLE WITH INTEGRATED FILTERS */}
            <div className="teams-card">
              <div className="teams-card-title-row">
                <h3 className="teams-card-title">
                  <Users size={18} style={{ color: '#3b82f6' }} />
                  <span>Team Directory & Registries</span>
                </h3>
                <div className="teams-table-exports">
                  <button className="teams-export-btn" onClick={() => setShowSummary(!showSummary)}>
                    {showSummary ? '🙈 Hide KPIs' : '👁️ Show KPIs'}
                  </button>
                  <button className="teams-export-btn" onClick={() => handleExport('PDF')}>📄 PDF</button>
                  <button className="teams-export-btn" onClick={() => handleExport('Excel')}>📊 Excel</button>
                  <button className="teams-export-btn" onClick={() => handleExport('CSV')}>📁 CSV</button>
                </div>
              </div>

              {/* Filters Row */}
              <div className="teams-filters-box">
                <div className="teams-search-actions">
                  <div className="dept-search-wrap" style={{ flex: 1, maxWidth: '100%' }}>
                    <Search size={16} className="dept-search-icon" />
                    <input
                      className="dept-search-input"
                      placeholder="Search by Team ID, Team Name, Leader, or Department..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="teams-filters-row">
                  <div className="teams-filter-group">
                    <span className="teams-filter-label">Status Filter</span>
                    <select
                      className="teams-filter-select"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Under Review">Under Review</option>
                      <option value="New Team">New Team</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="teams-filter-group">
                    <span className="teams-filter-label">Department Filter</span>
                    <select
                      className="teams-filter-select"
                      value={deptFilter}
                      onChange={e => setDeptFilter(e.target.value)}
                    >
                      <option value="">All Departments</option>
                      <option value="IT">IT (Tech)</option>
                      <option value="HR">HR</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                  <div className="teams-filter-group">
                    <span className="teams-filter-label">Branch / Agency</span>
                    <select
                      className="teams-filter-select"
                      value={branchFilter}
                      onChange={e => setBranchFilter(e.target.value)}
                    >
                      <option value="">All Locations</option>
                      <option value="Head Office">Head Office</option>
                      <option value="Branch Office">Branch Office</option>
                      <option value="Agency">Agency</option>
                    </select>
                  </div>
                  <div className="teams-filter-group">
                    <span className="teams-filter-label">Productivity Performance</span>
                    <select
                      className="teams-filter-select"
                      value={prodFilter}
                      onChange={e => setProdFilter(e.target.value)}
                    >
                      <option value="">All Performance Levels</option>
                      <option value="High">High (92%+)</option>
                      <option value="Average">Average (88%-92%)</option>
                      <option value="Low">Low (&lt;88%)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Team ID</th>
                      <th>Team Name</th>
                      <th>Team Leader</th>
                      <th>Department</th>
                      <th>Branch/Agency</th>
                      <th className="text-center">Projects</th>
                      <th className="text-center">Completed Tasks</th>
                      <th className="text-center">Productivity</th>
                      <th className="text-center">Attendance</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTeams.length > 0 ? (
                      paginatedTeams.map(t => (
                        <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(t)}>
                          <td className="bold-text">{t.id}</td>
                          <td className="bold-text">{t.name}</td>
                          <td>{t.leader}</td>
                          <td><Badge variant="neutral">{t.department}</Badge></td>
                          <td>{t.branch}</td>
                          <td className="text-center">{t.activeProjects}</td>
                          <td className="text-center">{t.completedTasks}</td>
                          <td className="text-center text-success bold-text">{t.productivity}%</td>
                          <td className="text-center text-info">{t.attendance}%</td>
                          <td>
                            <Badge variant={
                              t.status === 'Active' ? 'success' :
                              t.status === 'Under Review' ? 'warning' :
                              t.status === 'Inactive' ? 'danger' :
                              t.status === 'New Team' ? 'info' : 'secondary'
                            }>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="text-right" onClick={e => e.stopPropagation()}>
                            <div className="split-item-actions" style={{ display: 'inline-flex' }}>
                              <button className="icon-action-btn" title="View details" onClick={() => handleRowClick(t)}>
                                <Eye size={13} />
                              </button>
                              <button className="icon-action-btn" title="Edit team" onClick={() => addToast('info', `Editing ${t.name}...`)}>
                                <Edit2 size={13} />
                              </button>
                              <button
                                className="icon-action-btn icon-action-danger"
                                title="Disband team"
                                onClick={() => showConfirm(
                                  'Disband Team',
                                  `Are you sure you want to disband ${t.name}?`,
                                  () => {
                                    setTeams(prev => prev.filter(tm => tm.id !== t.id));
                                    addToast('warning', `${t.name} has been disbanded.`);
                                  },
                                  'danger'
                                )}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="11" className="text-center" style={{ padding: '40px 0', color: 'var(--text-muted)' }}>
                          No teams match your active search filter settings.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="table-card-header" style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16, marginBottom: 0 }}>
                <span className="text-muted text-xs">
                  Showing 1–{paginatedTeams.length} of {filteredTeams.length} teams
                </span>
                <div className="teams-table-exports">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs" style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: 600 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePageTab === 'productivity' && (
          <div className="teams-tab-inner-vertical">
            {/* SECTION 2 — TEAM PERFORMANCE ANALYTICS DASHBOARD (CHARTS) */}
            <div className="teams-card">
              <div className="teams-card-title-row">
                <h3 className="teams-card-title">
                  <BarChart2 size={18} style={{ color: '#8b5cf6' }} />
                  <span>Team Performance Analytics Dashboard</span>
                </h3>
                <Badge variant="info">Q2 Live Metrics</Badge>
              </div>
              
              <div className="teams-charts-row">
                {/* Bar Chart */}
                <div className="teams-chart-box">
                  <div className="teams-filter-label" style={{ marginBottom: 12, display: 'block' }}>
                    Team Productivity by Department (%)
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={productivityChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <YAxis domain={[80, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      <Bar dataKey="productivity" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={25}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="teams-chart-box">
                  <div className="teams-filter-label" style={{ marginBottom: 12, display: 'block' }}>
                    Team Status Distribution
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      <Legend verticalAlign="bottom" height={24} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Performance Score Cards */}
              <div className="teams-mini-score-grid">
                {[
                  { label: 'Team Productivity', value: '92%' },
                  { label: 'Attendance Average', value: '88%' },
                  { label: 'Task Completion', value: '94%' },
                  { label: 'Employee Utilization', value: '87%' }
                ].map((score, i) => (
                  <div key={i} className="teams-mini-score-card">
                    <span className="teams-mini-score-val">{score.value}</span>
                    <span className="teams-mini-score-label">{score.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 7 — TEAM PRODUCTIVITY ANALYTICS (RANKINGS + WORKLOAD) */}
            <div className="teams-card">
              <div className="teams-card-title-row">
                <h3 className="teams-card-title">
                  <Award size={18} style={{ color: '#f59e0b' }} />
                  <span>Team Productivity Rankings & Capacity Overview</span>
                </h3>
                <Badge variant="success">Q2 Rankings</Badge>
              </div>

              <div className="teams-rankings-workload">
                {/* Rankings Table */}
                <div>
                  <div className="teams-filter-label" style={{ marginBottom: 12, display: 'block' }}>
                    Leaderboard rankings
                  </div>
                  {[
                    { rank: 1, name: 'Development Team', members: 25, productivity: '96%', completion: '95%', colorClass: 'teams-rank-gold' },
                    { rank: 2, name: 'Sales Team A', members: 18, productivity: '94%', completion: '93%', colorClass: 'teams-rank-silver' },
                    { rank: 3, name: 'Research Team', members: 10, productivity: '93%', completion: '88%', colorClass: 'teams-rank-bronze' },
                    { rank: 4, name: 'Marketing Team', members: 15, productivity: '92%', completion: '91%', colorClass: '' }
                  ].map((rankItem) => (
                    <div key={rankItem.rank} className="teams-rank-row">
                      <div className={`teams-rank-num ${rankItem.colorClass}`}>
                        {rankItem.rank}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="bold-text" style={{ fontSize: '0.875rem' }}>{rankItem.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{rankItem.members} active members</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="bold-text text-success" style={{ fontSize: '0.875rem' }}>{rankItem.productivity}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>Tasks: {rankItem.completion}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Workload Area Chart */}
                <div className="teams-chart-box" style={{ height: 'auto', minHeight: 250 }}>
                  <div className="teams-filter-label" style={{ marginBottom: 12, display: 'block' }}>
                    Workload Distribution Capacity vs Utilization (%)
                  </div>
                  <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={workloadChartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <YAxis domain={[50, 100]} stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      <Area type="monotone" dataKey="Utilization" stroke="#10b981" fillOpacity={1} fill="url(#colorUtil)" />
                      <Area type="monotone" dataKey="Capacity" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePageTab === 'attendance' && (
          <div className="teams-tab-inner-vertical">
            {/* SECTION 10 — TEAM ATTENDANCE ANALYTICS (TRENDS) */}
            <div className="teams-card">
              <div className="teams-card-title-row">
                <h3 className="teams-card-title">
                  <CheckSquare size={18} style={{ color: '#10b981' }} />
                  <span>Team Attendance Trends & Activity Analytics</span>
                </h3>
                <Badge variant="success">88% Avg Attendance</Badge>
              </div>

              <div className="teams-rankings-workload">
                {/* Stats overview cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { title: 'Leave Statistics', value: '4.8%', desc: 'Avg monthly sick/casual leave' },
                    { title: 'Late Arrivals', value: '12.4%', desc: 'Arrivals post grace period limit' },
                    { title: 'Overtime Analysis', value: '184 hrs', desc: 'Total calculated overtime logs' },
                    { title: 'Shift Coverage', value: '98.6%', desc: 'Assigned rosters covered daily' }
                  ].map((stat, idx) => (
                    <div key={idx} className="teams-mini-score-card" style={{ textAlign: 'left', padding: '16px' }}>
                      <span className="teams-mini-score-val" style={{ color: '#10b981', fontSize: '1.4rem' }}>{stat.value}</span>
                      <span className="teams-mini-score-label" style={{ fontSize: '0.72rem', color: 'var(--text-primary)', textTransform: 'none', margin: '4px 0 2px' }}>{stat.title}</span>
                      <span className="text-muted" style={{ fontSize: '0.68rem', lineHeight: '1.3' }}>{stat.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Attendance line chart */}
                <div className="teams-chart-box" style={{ height: 'auto', minHeight: 220 }}>
                  <div className="teams-filter-label" style={{ marginBottom: 12, display: 'block' }}>
                    7-Day Team Attendance Rate Trend (%)
                  </div>
                  <ResponsiveContainer width="100%" height="82%">
                    <LineChart data={attendanceTrendData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <YAxis domain={[80, 100]} stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      <Line type="monotone" dataKey="Attendance" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePageTab === 'operations' && (
          <div className="teams-dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* COLUMN 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* SECTION 12 — QUICK ACTION BUTTONS PANEL */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <Settings size={16} />
                  <span>Quick Actions Grid</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Button variant="primary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => setCreateModalOpen(true)}>Create Team</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => addToast('info', 'Choose a team row to assign leader')}>Assign Leader</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => addToast('info', 'Choose a team details drawer to add members')}>Add Members</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => addToast('info', 'Select member in details to transfer')}>Transfer Staff</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => addToast('info', 'Choose project to allocate')}>Allocate Project</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => handleExport(exportFormat)}>Export Registry</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem', gridColumn: 'span 2' }} onClick={() => addToast('info', 'Generating core performance report...')}>Generate Analytics Reports</Button>
                </div>
              </div>

              {/* SECTION 5 — TEAM MEMBER MANAGEMENT */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <Shield size={16} style={{ color: '#ef4444' }} />
                  <span>Super Admin Actions</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => addToast('success', 'Permission verified. Open add members panel...')}>➕ Add Team Members</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => addToast('warning', 'Permission verified. Choose member to remove...')}>➖ Remove Team Members</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => addToast('info', 'Initiating employee transfer log...')}>🔄 Transfer Employees</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => addToast('info', 'Assign new team leader role...')}>👤 Assign Team Leader</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => addToast('info', 'Update direct reporting managers...')}>🔁 Change Reporting Manager</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => addToast('success', 'Opening project allocation console...')}>📁 Allocate Projects</button>
                </div>
              </div>

              {/* SECTION 6 — TEAM LEADER MANAGEMENT */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <User size={16} style={{ color: '#8b5cf6' }} />
                  <span>Team Leader Details</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name="Rahul Sharma" size="md" />
                    <div>
                      <div className="bold-text" style={{ fontSize: '0.875rem' }}>Rahul Sharma</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>ID: EMP-001 | Tech Lead</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Contact:</strong> rahul.sharma@enterprise.com</div>
                    <div><strong>Assigned Team:</strong> Development Team</div>
                    <div><strong>Experience:</strong> 8 years senior track</div>
                    <div><strong>Performance Score:</strong> <span className="text-success bold-text">98%</span></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <Button variant="secondary" size="sm" onClick={() => addToast('info', 'Opening transfer dialog...')}>Change Lead</Button>
                    <Button variant="secondary" size="sm" onClick={() => addToast('info', 'Modifying system permissions...')}>Permissions</Button>
                  </div>
                </div>
              </div>

              {/* SECTION 8 — TEAM COMMUNICATION CENTER */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <Send size={16} style={{ color: '#3b82f6' }} />
                  <span>Team Communication Center</span>
                </h3>
                <div className="teams-comm-list" style={{ marginBottom: 16 }}>
                  <div className="teams-comm-card">
                    <span className="teams-comm-title">📢 General Announcement</span>
                    <p className="teams-comm-desc">Summer sprint cycle planning schedule is uploaded under document stores.</p>
                  </div>
                  <div className="teams-comm-card">
                    <span className="teams-comm-title">💬 Tech Internal Discussion</span>
                    <p className="teams-comm-desc">Migration review scheduled for next Monday 10:00 AM.</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <Button variant="secondary" size="sm" onClick={() => addToast('success', 'Announcement sent successfully.')}>Post Alert</Button>
                  <Button variant="secondary" size="sm" onClick={() => addToast('info', 'Opening scheduler dialog...')}>Meet Calendar</Button>
                </div>
              </div>
            </div>

            {/* COLUMN 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* SECTION 9 — TEAM DOCUMENT MANAGEMENT */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <FileCode size={16} style={{ color: '#f59e0b' }} />
                  <span>Team Document Management</span>
                </h3>
                <div className="teams-doc-grid">
                  {[
                    { name: 'Team SOPs & Guidelines', format: 'PDF' },
                    { name: 'Monthly Audit Reports', format: 'XLSX' },
                    { name: 'Meeting Minutes Core', format: 'DOCX' },
                    { name: 'Architecture Mockups', format: 'PNG' }
                  ].map((doc, i) => (
                    <div key={i} className="teams-doc-card" onClick={() => addToast('success', `Downloading ${doc.name}.${doc.format.toLowerCase()}`)}>
                      <div className="teams-doc-info">
                        <FileText size={16} style={{ color: '#f59e0b' }} />
                        <span className="teams-doc-name">{doc.name}</span>
                      </div>
                      <Badge variant={doc.format === 'PDF' ? 'danger' : doc.format === 'XLSX' ? 'success' : 'info'}>
                        {doc.format}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 13 — NOTIFICATIONS & ALERTS */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                  <span>Alerts & Notifications Panel</span>
                </h3>
                <div className="teams-alerts-stack">
                  {alerts.map((al) => (
                    <div key={al.id} className={`teams-alert-item ${al.type === 'warning' ? 'teams-alert-warning' : 'teams-alert-info'}`}>
                      <span style={{ flex: 1 }}>{al.type === 'warning' ? '⚠️' : '✅'} {al.text}</span>
                      <span className="teams-alert-dismiss-btn" onClick={() => handleDismissAlert(al.id)}>×</span>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center text-muted" style={{ padding: '10px 0', fontSize: '0.78rem' }}>
                      No system alerts active.
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 15 — RECENT TEAM ACTIVITIES FEED */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <Play size={16} style={{ color: '#10b981' }} />
                  <span>Recent Team Activities Feed</span>
                </h3>
                <div className="teams-activity-feed">
                  {activities.map((act) => (
                    <div key={act.id} className="teams-activity-item">
                      <span className={`teams-activity-dot teams-activity-dot-${act.type}`} />
                      <span className="teams-activity-title">{act.text}</span>
                      <span className="teams-activity-time">{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 14 — REPORTS & EXPORTS */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <FileText size={16} style={{ color: '#3b82f6' }} />
                  <span>Generate Reports & Exports</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="teams-filter-label">Export Format Options</div>
                  <div className="export-format-toggles" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {['PDF', 'Excel', 'CSV'].map(fmt => (
                      <button
                        key={fmt}
                        className={`format-toggle-btn ${exportFormat === fmt ? 'active' : ''}`}
                        onClick={() => setExportFormat(fmt)}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 4 }}>
                    <Button variant="secondary" size="sm" onClick={() => handleExport(exportFormat)}>📄 Team Performance Summary</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleExport(exportFormat)}>📄 Employee Workload Audit</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleExport(exportFormat)}>📄 Roster Attendance Analytics</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER SECTION */}
      <div className="teams-footer-bar">
        <div className="teams-footer-pills">
          <div className="teams-footer-pill">
            <Users size={14} style={{ color: '#3b82f6' }} />
            <span>Total Teams: 86</span>
          </div>
          <div className="teams-footer-pill">
            <Users size={14} style={{ color: '#10b981' }} />
            <span>Total Members: 1,250</span>
          </div>
          <div className="teams-footer-pill">
            <Calendar size={14} style={{ color: '#f59e0b' }} />
            <span>Last Updated: Just Now</span>
          </div>
          <div className="teams-footer-pill">
            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            <span>System Status: Active</span>
          </div>
        </div>
        <span className="text-muted text-xs">SaaS Enterprise Dashboard v2.0</span>
      </div>

      {/* SECTION 3 — CREATE NEW TEAM SLIDE-OVER */}
      {createModalOpen && (
        <div className="teams-slideover-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="teams-slideover-container" onClick={e => e.stopPropagation()}>
            <div className="teams-slideover-header">
              <h3 className="syne-heading" style={{ fontSize: '1.2rem', margin: 0 }}>Create New Team</h3>
              <span className="teams-alert-dismiss-btn" style={{ fontSize: '1.4rem' }} onClick={() => setCreateModalOpen(false)}>×</span>
            </div>
            
            <form className="teams-slideover-body" onSubmit={handleCreateTeamSubmit}>
              {/* Basic Info */}
              <div>
                <div className="teams-slideover-section-title">Basic Information</div>
                <div className="teams-form-grid">
                  <div className="teams-form-group">
                    <label>Team Name*</label>
                    <input
                      type="text"
                      placeholder="Enter team name"
                      value={newTeam.name}
                      onChange={e => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                      style={{ borderColor: formErrors.name ? '#ef4444' : '' }}
                    />
                    {formErrors.name && <span className="text-danger text-xs">{formErrors.name}</span>}
                  </div>
                  <div className="teams-form-group">
                    <label>Team Code*</label>
                    <input
                      type="text"
                      placeholder="Auto-generated e.g. TM-009"
                      value={newTeam.code}
                      onChange={e => setNewTeam(prev => ({ ...prev, code: e.target.value }))}
                      style={{ borderColor: formErrors.code ? '#ef4444' : '' }}
                    />
                    {formErrors.code && <span className="text-danger text-xs">{formErrors.code}</span>}
                  </div>
                  <div className="teams-form-group">
                    <label>Department*</label>
                    <select
                      className="teams-filter-select"
                      value={newTeam.department}
                      onChange={e => setNewTeam(prev => ({ ...prev, department: e.target.value }))}
                    >
                      <option value="IT">IT (Tech)</option>
                      <option value="HR">HR</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                  <div className="teams-form-group">
                    <label>Branch / Agency*</label>
                    <select
                      className="teams-filter-select"
                      value={newTeam.branch}
                      onChange={e => setNewTeam(prev => ({ ...prev, branch: e.target.value }))}
                    >
                      <option value="Head Office">Head Office</option>
                      <option value="Branch Office">Branch Office</option>
                      <option value="Agency">Agency</option>
                    </select>
                  </div>
                  <div className="teams-form-full">
                    <label>Team Description</label>
                    <textarea
                      rows={3}
                      placeholder="Brief team purpose..."
                      value={newTeam.description}
                      onChange={e => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 10, color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Leadership Assignment */}
              <div>
                <div className="teams-slideover-section-title">Leadership Assignment</div>
                <div className="teams-form-grid">
                  <div className="teams-form-group">
                    <label>Team Leader*</label>
                    <input
                      type="text"
                      placeholder="Leader name (e.g. Rahul Sharma)"
                      value={newTeam.leader}
                      onChange={e => setNewTeam(prev => ({ ...prev, leader: e.target.value }))}
                      style={{ borderColor: formErrors.leader ? '#ef4444' : '' }}
                    />
                    {formErrors.leader && <span className="text-danger text-xs">{formErrors.leader}</span>}
                  </div>
                  <div className="teams-form-group">
                    <label>Assistant Team Leader</label>
                    <input
                      type="text"
                      placeholder="Assistant Leader (optional)"
                      value={newTeam.assistantLeader}
                      onChange={e => setNewTeam(prev => ({ ...prev, assistantLeader: e.target.value }))}
                    />
                  </div>
                  <div className="teams-form-full">
                    <label>Reporting Project Manager</label>
                    <input
                      type="text"
                      placeholder="Project Manager (optional)"
                      value={newTeam.projectManager}
                      onChange={e => setNewTeam(prev => ({ ...prev, projectManager: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Team Configuration */}
              <div>
                <div className="teams-slideover-section-title">Team Configuration</div>
                <div className="teams-form-grid">
                  <div className="teams-form-group">
                    <label>Team Type</label>
                    <select
                      className="teams-filter-select"
                      value={newTeam.type}
                      onChange={e => setNewTeam(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="Permanent">Permanent</option>
                      <option value="Project-based">Project-based</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>
                  <div className="teams-form-group">
                    <label>Maximum Team Size</label>
                    <input
                      type="number"
                      value={newTeam.maxSize}
                      onChange={e => setNewTeam(prev => ({ ...prev, maxSize: parseInt(e.target.value) || 10 }))}
                    />
                  </div>
                  <div className="teams-form-group">
                    <label>Working Shift</label>
                    <select
                      className="teams-filter-select"
                      value={newTeam.shift}
                      onChange={e => setNewTeam(prev => ({ ...prev, shift: e.target.value }))}
                    >
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>
                  <div className="teams-form-full">
                    <label>Performance Goals</label>
                    <textarea
                      rows={2}
                      placeholder="Outline target team KPI metrics..."
                      value={newTeam.goals}
                      onChange={e => setNewTeam(prev => ({ ...prev, goals: e.target.value }))}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 10, color: 'var(--text-primary)', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </form>
            
            <div className="teams-slideover-footer">
              <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => { addToast('info', 'Team draft saved successfully.'); setCreateModalOpen(false); }}>Save as Draft</Button>
              <Button variant="primary" onClick={handleCreateTeamSubmit}>Create Team</Button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4 — TEAM DETAIL drawer */}
      {detailDrawerOpen && selectedTeam && (
        <div className="teams-slideover-backdrop" onClick={() => setDetailDrawerOpen(false)}>
          <div className="teams-slideover-container" onClick={e => e.stopPropagation()}>
            <div className="teams-slideover-header">
              <h3 className="syne-heading" style={{ fontSize: '1.2rem', margin: 0 }}>Team Details: {selectedTeam.name}</h3>
              <span className="teams-alert-dismiss-btn" style={{ fontSize: '1.4rem' }} onClick={() => setDetailDrawerOpen(false)}>×</span>
            </div>

            {/* Tab navigation */}
            <div style={{ padding: '0 24px' }}>
              <div className="teams-drawer-tabs">
                {[
                  { id: 'info', label: 'Team Info' },
                  { id: 'members', label: 'Members' },
                  { id: 'structure', label: 'Hierarchy' },
                  { id: 'projects', label: 'Projects' },
                  { id: 'tasks', label: 'Tasks' },
                  { id: 'attendance', label: 'Attendance' }
                ].map(tab => (
                  <span
                    key={tab.id}
                    className={`teams-drawer-tab ${activeDrawerTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveDrawerTab(tab.id)}
                  >
                    {tab.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="teams-slideover-body">
              
              {/* Tab 1: Info */}
              {activeDrawerTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div className="teams-slideover-section-title">Core Information</div>
                    <div className="teams-form-grid" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div><strong>Team Name:</strong> {selectedTeam.name}</div>
                      <div><strong>Team Code:</strong> {selectedTeam.id}</div>
                      <div><strong>Department:</strong> {selectedTeam.department}</div>
                      <div><strong>Branch Location:</strong> {selectedTeam.branch}</div>
                      <div><strong>Team Leader:</strong> {selectedTeam.leader}</div>
                      <div><strong>Created Date:</strong> {selectedTeam.createdDate}</div>
                      <div><strong>Status:</strong> {selectedTeam.status}</div>
                      <div><strong>Type:</strong> {selectedTeam.type || 'Permanent'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="teams-slideover-section-title">Team Description</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {selectedTeam.description || 'No description provided.'}
                    </p>
                  </div>
                  <div>
                    <div className="teams-slideover-section-title">Leadership Hierarchy</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div><strong>Assistant Leader:</strong> {selectedTeam.assistantLeader || 'Not Assigned'}</div>
                      <div><strong>Project Manager:</strong> {selectedTeam.projectManager || 'Not Assigned'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Members */}
              {activeDrawerTab === 'members' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="teams-search-actions">
                    <div className="teams-filter-label">Assigned Members List</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="secondary" size="sm" onClick={() => addToast('info', 'Initiating Add Member workflow...')}>Add Member</Button>
                      <Button variant="secondary" size="sm" onClick={() => addToast('info', 'Select member to remove...')}>Remove Member</Button>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table style={{ fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>ID</th>
                          <th>Designation</th>
                          <th className="text-center">Productivity</th>
                          <th className="text-center">Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTeam.membersList ? selectedTeam.membersList.map((m, i) => (
                          <tr key={i}>
                            <td className="bold-text">{m.name}</td>
                            <td>{m.id}</td>
                            <td>{m.designation}</td>
                            <td className="text-center text-success bold-text">{m.productivity}%</td>
                            <td className="text-center text-info">{m.attendance}%</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="5" className="text-center">No member profiles loaded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Hierarchy Tree */}
              {activeDrawerTab === 'structure' && (
                <div>
                  <div className="teams-slideover-section-title">Structural Tree Roster</div>
                  <div className="teams-tree-wrapper">
{selectedTeam.leader} (Team Leader)
├── {selectedTeam.assistantLeader || 'Assistant Leader'} (Senior Developer)
│   ├── Suresh Kumar (Frontend Dev)
│   └── Ananya Gupta (QA Analyst)
│       ├── Interns
│       └── Trainees
                  </div>
                </div>
              )}

              {/* Tab 4: Projects */}
              {activeDrawerTab === 'projects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="teams-slideover-section-title">Project Allocation Status</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Active Projects', value: selectedTeam.activeProjects, color: '#3b82f6' },
                      { label: 'Completed Projects', value: selectedTeam.completedTasks, color: '#10b981' },
                      { label: 'Pending Projects', value: 3, color: '#f59e0b' },
                      { label: 'Delayed Projects', value: 1, color: '#ef4444' }
                    ].map((proj, idx) => (
                      <div key={idx} className="teams-mini-score-card" style={{ borderLeft: `3px solid ${proj.color}`, padding: 12, textAlign: 'left' }}>
                        <span className="teams-mini-score-val" style={{ color: proj.color }}>{proj.value}</span>
                        <span className="teams-mini-score-label" style={{ fontSize: '0.72rem', textTransform: 'none', color: 'var(--text-primary)' }}>{proj.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Tasks */}
              {activeDrawerTab === 'tasks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="teams-slideover-section-title">Task Completion Metrics</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><strong>Total Assigned:</strong> {selectedTeam.completedTasks + 15}</div>
                    <div><strong>Completed Tasks:</strong> {selectedTeam.completedTasks}</div>
                    <div><strong>Pending Tasks:</strong> 12</div>
                    <div><strong>Overdue Tasks:</strong> 3</div>
                    <div style={{ gridColumn: 'span 2', marginTop: 10 }}>
                      <div className="teams-filter-label" style={{ marginBottom: 4 }}>Completion rate: {Math.round((selectedTeam.completedTasks / (selectedTeam.completedTasks + 15)) * 100)}%</div>
                      <div className="dept-budget-bar-bg" style={{ height: 6 }}>
                        <div className="dept-budget-bar-fill" style={{ width: `${Math.round((selectedTeam.completedTasks / (selectedTeam.completedTasks + 15)) * 100)}%`, background: '#8b5cf6' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Attendance */}
              {activeDrawerTab === 'attendance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="teams-slideover-section-title">Roster Daily Attendance Overview</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><strong>Present Members:</strong> {selectedTeam.membersList ? selectedTeam.membersList.length : 4}</div>
                    <div><strong>Absent Members:</strong> 0</div>
                    <div><strong>On Leave:</strong> 0</div>
                    <div><strong>Attendance Rate:</strong> {selectedTeam.attendance}%</div>
                  </div>
                </div>
              )}

            </div>
            
            <div className="teams-slideover-footer">
              <Button variant="secondary" onClick={() => setDetailDrawerOpen(false)}>Close Drawer</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Teams;
