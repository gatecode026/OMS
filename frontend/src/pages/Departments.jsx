import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './Departments.css';
import { useApp } from '../context/AppContext';
import { FIELD_LABELS } from '../utils/fieldLabels';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  GitMerge, Plus, Users, TrendingUp, Clock, Search,
  Edit2, Trash2, MoreVertical, Building2, X, Save,
  FileText, AlertCircle, ArrowRight, Download, BarChart3,
  PieChart as LucidePieChart, Info, Settings, ShieldCheck, Check,
  AlertTriangle, FileSpreadsheet, Eye, ChevronDown, CheckCircle2,
  RefreshCw, Layers, MapPin, Landmark
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, Legend
} from 'recharts';

const mockDepartments = [
  {
    id: 'DEPT-001',
    name: 'Engineering',
    departmentCode: 'ENG-TECH',
    head: 'Ananya Gupta',
    headId: 'EMP-2026-003',
    employeeCount: 15,
    activeTeams: 4,
    branch: 'Delhi Head Office',
    budget: 480000,
    spent: 310000,
    projects: 5,
    activeProjects: 3,
    completedProjects: 8,
    pendingProjects: 1,
    delayedProjects: 1,
    avgPerformance: 88,
    attendanceRate: 94,
    wfhFilings: 8,
    tasksCompleted: 142,
    tasksInProgress: 34,
    color: '#3b82f6',
    description: 'Responsible for all software development, infrastructure management, and technical innovation across the platform.',
    createdDate: '2022-01-15',
    status: 'Active'
  },
  {
    id: 'DEPT-002',
    name: 'Sales',
    departmentCode: 'SLS-GROW',
    head: 'Rohit Sharma',
    headId: 'EMP-2026-004',
    employeeCount: 12,
    activeTeams: 3,
    branch: 'Jaipur Office',
    budget: 320000,
    spent: 198000,
    projects: 3,
    activeProjects: 2,
    completedProjects: 5,
    pendingProjects: 0,
    delayedProjects: 1,
    avgPerformance: 92,
    attendanceRate: 91,
    wfhFilings: 3,
    tasksCompleted: 210,
    tasksInProgress: 15,
    color: '#10b981',
    description: 'Drives revenue growth through new business acquisition, account management, and client relationship development.',
    createdDate: '2022-01-15',
    status: 'Active'
  },
  {
    id: 'DEPT-003',
    name: 'Marketing',
    departmentCode: 'MKT-BRAND',
    head: 'Priya Patel',
    headId: 'EMP-2026-005',
    employeeCount: 8,
    activeTeams: 2,
    branch: 'Mumbai Agency',
    budget: 250000,
    spent: 215000,
    projects: 4,
    activeProjects: 4,
    completedProjects: 3,
    pendingProjects: 2,
    delayedProjects: 0,
    avgPerformance: 79,
    attendanceRate: 88,
    wfhFilings: 12,
    tasksCompleted: 98,
    tasksInProgress: 28,
    color: '#8b5cf6',
    description: 'Manages brand identity, digital marketing campaigns, content creation, and customer acquisition strategies.',
    createdDate: '2022-03-01',
    status: 'Under Review'
  },
  {
    id: 'DEPT-004',
    name: 'Human Resources',
    departmentCode: 'HR-PEOPLE',
    head: 'Neha Verma',
    headId: 'EMP-2026-007',
    employeeCount: 6,
    activeTeams: 2,
    branch: 'Delhi Head Office',
    budget: 180000,
    spent: 92000,
    projects: 2,
    activeProjects: 2,
    completedProjects: 4,
    pendingProjects: 1,
    delayedProjects: 0,
    avgPerformance: 85,
    attendanceRate: 95,
    wfhFilings: 5,
    tasksCompleted: 64,
    tasksInProgress: 12,
    color: '#f59e0b',
    description: 'Handles recruitment, employee onboarding, training & development, performance reviews, and compliance.',
    createdDate: '2022-01-15',
    status: 'Expansion Mode'
  },
  {
    id: 'DEPT-005',
    name: 'Operations',
    departmentCode: 'OPS-FLOW',
    head: 'Aarav Sharma',
    headId: 'EMP-2026-001',
    employeeCount: 10,
    activeTeams: 3,
    branch: 'Jaipur Office',
    budget: 290000,
    spent: 245000,
    projects: 2,
    activeProjects: 1,
    completedProjects: 6,
    pendingProjects: 1,
    delayedProjects: 0,
    avgPerformance: 95,
    attendanceRate: 92,
    wfhFilings: 4,
    tasksCompleted: 115,
    tasksInProgress: 22,
    color: '#ef4444',
    description: 'Oversees day-to-day business operations, process optimization, vendor management, and cross-team coordination.',
    createdDate: '2022-01-15',
    status: 'Active'
  },
  {
    id: 'DEPT-006',
    name: 'Research & Dev',
    departmentCode: 'RND-INNOV',
    head: 'Dr. Vikramaditya',
    headId: 'EMP-2026-010',
    employeeCount: 4,
    activeTeams: 1,
    branch: 'Mumbai Agency',
    budget: 150000,
    spent: 35000,
    projects: 1,
    activeProjects: 1,
    completedProjects: 2,
    pendingProjects: 0,
    delayedProjects: 0,
    avgPerformance: 90,
    attendanceRate: 96,
    wfhFilings: 6,
    tasksCompleted: 30,
    tasksInProgress: 8,
    color: '#06b6d4',
    description: 'Explores future product offerings, applies AI research, and runs pilot experimentation protocols.',
    createdDate: '2025-05-01',
    status: 'Inactive'
  }
];

const mockTeams = [
  { id: 'TEAM-001', name: 'UI/UX Design', leader: 'Vikram Singh', department: 'Engineering', employeeCount: 3, activeProjects: 2, status: 'Active' },
  { id: 'TEAM-002', name: 'Backend Dev', leader: 'Suresh Kumar', department: 'Engineering', employeeCount: 5, activeProjects: 3, status: 'Active' },
  { id: 'TEAM-003', name: 'Direct Sales', leader: 'Rahul Sharma', department: 'Sales', employeeCount: 8, activeProjects: 1, status: 'Active' },
  { id: 'TEAM-004', name: 'Content Marketing', leader: 'Priya Patel', department: 'Marketing', employeeCount: 4, activeProjects: 2, status: 'Active' },
  { id: 'TEAM-005', name: 'Talent Acquisition', leader: 'Neha Verma', department: 'Human Resources', employeeCount: 3, activeProjects: 1, status: 'Active' },
  { id: 'TEAM-006', name: 'Support Ops', leader: 'Aarav Sharma', department: 'Operations', employeeCount: 6, activeProjects: 2, status: 'Under Review' },
  { id: 'TEAM-007', name: 'QA Testing', leader: 'Karan Malhotra', department: 'Engineering', employeeCount: 4, activeProjects: 1, status: 'Active' }
];

const mockAlerts = [
  { id: 'AL-01', type: 'warning', title: 'Department Goal In Progress', message: 'Engineering department currently working on Goal-Alpha.', time: '10 mins ago' },
  { id: 'AL-02', type: 'danger', title: 'Department Head Resigned', message: 'Ananya Gupta (Engineering Head) has submitted resignation.', time: '1 hour ago' },
  { id: 'AL-03', type: 'danger', title: 'Department Budget Shortage', message: 'Marketing department has spent 86% of its annual allocation.', time: '3 hours ago' },
  { id: 'AL-04', type: 'warning', title: 'Team Leader Vacancy', message: 'Backend Dev team requires a new lead engineer.', time: '1 day ago' },
  { id: 'AL-05', type: 'info', title: 'High Employee Turnover', message: 'Sales department showing higher turnover rate (12%) this month.', time: '2 days ago' }
];

const mockActivities = [
  { id: 'ACT-01', message: 'New IT Department Created', time: '10 mins ago', type: 'create' },
  { id: 'ACT-02', message: 'Rahul Sharma Assigned as Department Head for Sales', time: '2 hours ago', type: 'assign' },
  { id: 'ACT-03', message: 'Marketing Team Formed under Priya Patel', time: '1 day ago', type: 'create' },
  { id: 'ACT-04', message: 'Sales Department Achieved Monthly Target', time: '3 days ago', type: 'success' },
  { id: 'ACT-05', message: 'New Theme Added in the HR Department', time: '5 days ago', type: 'update' }
];

const mockDocuments = [
  { id: 'DOC-01', name: 'Department Policies 2026.pdf', size: '1.2 MB', category: 'Standard Policy', date: '2026-05-10' },
  { id: 'DOC-02', name: 'Engineering SOP v2.docx', size: '850 KB', category: 'SOP Documents', date: '2026-05-12' },
  { id: 'DOC-03', name: 'Company Organization Chart.png', size: '2.4 MB', category: 'Organization Charts', date: '2026-05-15' },
  { id: 'DOC-04', name: 'Team Guidelines.pdf', size: '920 KB', category: 'Team Guidelines', date: '2026-05-18' },
  { id: 'DOC-05', name: 'Q1 Department Performance Report.xlsx', size: '1.5 MB', category: 'Performance Reports', date: '2026-05-20' }
];

const Departments = () => {
  const isLoading = usePageLoading(600);
  const { employees, branches, departments: contextDepartments, addDepartment, updateDepartment, deleteDepartment, addToast, showConfirm } = useApp();

  // Tab State: 'directory' | 'analytics' | 'teams' | 'documents' | 'alerts'
  const [activeTab, setActiveTab] = useState('directory');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [perfFilter, setPerfFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');

  const [branchOptions, setBranchOptions] = useState([]);

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchOptions(branches.map(b => b.name));
    } else {
      setBranchOptions(['Delhi Head Office', 'Jaipur Office', 'Mumbai Agency']);
    }
  }, [branches]);

  const [showCustomBranchInput, setShowCustomBranchInput] = useState(false);
  const [customBranch, setCustomBranch] = useState('');

  // Dynamic Data Lists
  const departments = contextDepartments || [];
  const [teams, setTeams] = useState(mockTeams);
  const [alertsFeed, setAlertsFeed] = useState(mockAlerts);
  const [recentActivities, setRecentActivities] = useState(mockActivities);
  const [documents, setDocuments] = useState(mockDocuments);

  // Modals Toggle States
  const [selectedDept, setSelectedDept] = useState(null);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const defaultBranch = useMemo(() => {
    return branches.length > 0 ? branches[0].name : 'Delhi Head Office';
  }, [branches]);

  // Form states
  const [newDeptForm, setNewDeptForm] = useState({
    name: '', code: '', head: '', branch: '', budget: 100000, description: ''
  });

  useEffect(() => {
    setNewDeptForm(prev => ({
      ...prev,
      branch: prev.branch || defaultBranch
    }));
  }, [defaultBranch]);

  const availableTeamLeaders = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return employees.filter(emp =>
      emp.roleId === 'team_leader' ||
      emp.role === 'Team Leader' ||
      emp.roleId === 'manager' ||
      emp.role === 'Manager'
    );
  }, [employees]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);

  const handleEditClick = (dept) => {
    setIsEditMode(true);
    setEditingDeptId(dept.id);
    setNewDeptForm({
      name: dept.name,
      code: dept.departmentCode || dept.code || '',
      head: dept.head,
      branch: dept.branch,
      budget: dept.budget,
      description: dept.description || ''
    });
    setAddDeptOpen(true);
  };

  const handleAddClick = () => {
    setIsEditMode(false);
    setEditingDeptId(null);
    setNewDeptForm({ name: '', code: '', head: '', branch: defaultBranch, budget: 100000, description: '' });
    setAddDeptOpen(true);
  };

  const [newTeamForm, setNewTeamForm] = useState({
    name: '', leader: '', department: 'Engineering', count: 0, status: 'Active', members: []
  });
  const [transferForm, setTransferForm] = useState({
    employee: '', source: 'Sales', target: 'Engineering', reason: '', date: '2026-06-01'
  });
  const [exportFormState, setExportFormState] = useState({
    report: 'Department Summary Report', format: 'PDF'
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Policies configurations
  const [policiesConfig, setPoliciesConfig] = useState({
    standard: true, custom: false, workingHours: 40, shiftConfig: 'General Shift', criteria: 'KPI Thresholds'
  });

  // Drag-and-drop file upload simulator
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);

  // KPI Computations
  const totalBudget = departments.reduce((acc, d) => acc + d.budget, 0);
  const totalSpent = departments.reduce((acc, d) => acc + d.spent, 0);
  const totalEmployees = departments.reduce((acc, d) => acc + d.employeeCount, 0);
  const avgPerf = Math.round(departments.reduce((acc, d) => acc + d.avgPerformance, 0) / (departments.length || 1));
  const activeDepts = departments.filter(d => d.status === 'Active').length;
  const totalTeams = teams.length;

  const handleApplyFilter = (d) => {
    // Search Box filter
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.head.toLowerCase().includes(search.toLowerCase()) ||
      d.departmentCode.toLowerCase().includes(search.toLowerCase());

    // Status Filter
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;

    // Branch Filter
    const matchesBranch = branchFilter === 'All' || d.branch.includes(branchFilter);

    // Performance Filter
    let matchesPerf = true;
    if (perfFilter === 'High Performance') matchesPerf = d.avgPerformance >= 90;
    else if (perfFilter === 'Average Performance') matchesPerf = d.avgPerformance >= 80 && d.avgPerformance < 90;
    else if (perfFilter === 'Low Performance') matchesPerf = d.avgPerformance < 80;

    return matchesSearch && matchesStatus && matchesBranch && matchesPerf;
  };

  const filteredDepts = departments.filter(handleApplyFilter);

  const deptEmployees = employees.filter(emp => emp.department === newTeamForm.department);

  // Handle Action - Add/Edit Department
  const handleAddDeptSubmit = async (e) => {
    e.preventDefault();
    if (!newDeptForm.name || !newDeptForm.code || !newDeptForm.head) {
      addToast('error', 'Please fill in all required fields.');
      return;
    }
    const finalBranch = newDeptForm.branch === 'add_custom' ? customBranch.trim() : newDeptForm.branch;
    if (!finalBranch) {
      addToast('error', 'Please enter a custom branch name.');
      return;
    }
    
    const tl = availableTeamLeaders.find(x => x.name === newDeptForm.head);
    const headId = tl ? tl.id : 'EMP-2026-999';

    if (newDeptForm.branch === 'add_custom' && !branchOptions.includes(finalBranch)) {
      setBranchOptions([...branchOptions, finalBranch]);
    }

    if (isEditMode) {
      const updated = await updateDepartment(editingDeptId, {
        name: newDeptForm.name,
        departmentCode: newDeptForm.code,
        head: newDeptForm.head,
        headId: headId,
        branch: finalBranch,
        budget: Number(newDeptForm.budget),
        description: newDeptForm.description
      });
      if (updated) {
        setRecentActivities([
          { id: `ACT-${Date.now()}`, message: `Department ${newDeptForm.name} Updated`, time: 'Just now', type: 'update' },
          ...recentActivities
        ]);
        setAddDeptOpen(false);
        setNewDeptForm({ name: '', code: '', head: '', branch: defaultBranch, budget: 100000, description: '' });
        setShowCustomBranchInput(false);
        setCustomBranch('');
      }
    } else {
      const newDeptObj = {
        id: `DEPT-${Date.now().toString().slice(-4)}`,
        name: newDeptForm.name,
        departmentCode: newDeptForm.code,
        head: newDeptForm.head,
        headId: headId,
        employeeCount: 0,
        activeTeams: 0,
        branch: finalBranch,
        budget: Number(newDeptForm.budget),
        spent: 0,
        projects: 0,
        activeProjects: 0,
        completedProjects: 0,
        pendingProjects: 0,
        delayedProjects: 0,
        avgPerformance: 100,
        attendanceRate: 100,
        wfhFilings: 0,
        tasksCompleted: 0,
        tasksInProgress: 0,
        description: newDeptForm.description,
        createdDate: new Date().toISOString().split('T')[0],
        status: 'Active'
      };

      const saved = await addDepartment(newDeptObj);
      if (saved) {
        setRecentActivities([
          { id: `ACT-${Date.now()}`, message: `New Department ${newDeptForm.name} Created`, time: 'Just now', type: 'create' },
          ...recentActivities
        ]);
        setAddDeptOpen(false);
        setNewDeptForm({ name: '', code: '', head: '', branch: defaultBranch, budget: 100000, description: '' });
        setShowCustomBranchInput(false);
        setCustomBranch('');
      }
    }
  };

  // Handle Action - Create Team
  const handleCreateTeamSubmit = (e) => {
    e.preventDefault();
    if (!newTeamForm.name || !newTeamForm.leader) {
      addToast('error', 'Please specify team name and team leader.');
      return;
    }
    const newTeamObj = {
      id: `TEAM-00${teams.length + 1}`,
      name: newTeamForm.name,
      leader: newTeamForm.leader,
      department: newTeamForm.department,
      employeeCount: Number(newTeamForm.count),
      activeProjects: 1,
      status: newTeamForm.status
    };
    setTeams([...teams, newTeamObj]);
    setRecentActivities([
      { id: `ACT-${Date.now()}`, message: `Team ${newTeamForm.name} Formed under ${newTeamForm.leader}`, time: 'Just now', type: 'create' },
      ...recentActivities
    ]);
    // update parent department employee/teams count
    const targetDept = departments.find(d => d.name === newTeamForm.department);
    if (targetDept) {
      updateDepartment(targetDept.id, {
        activeTeams: targetDept.activeTeams + 1,
        employeeCount: targetDept.employeeCount + Number(newTeamForm.count)
      });
    }
    setCreateTeamOpen(false);
    addToast('success', `Team "${newTeamForm.name}" registered successfully.`);
    setNewTeamForm({ name: '', leader: '', department: 'Engineering', count: 0, status: 'Active', members: [] });
  };

  // Handle Action - Transfer Employee
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferForm.employee || !transferForm.reason) {
      addToast('error', 'Please fill in all transfer fields.');
      return;
    }
    // Update department sizes
    const sourceDept = departments.find(d => d.name === transferForm.source);
    const targetDept = departments.find(d => d.name === transferForm.target);
    if (sourceDept) {
      updateDepartment(sourceDept.id, {
        employeeCount: Math.max(0, sourceDept.employeeCount - 1)
      });
    }
    if (targetDept) {
      updateDepartment(targetDept.id, {
        employeeCount: targetDept.employeeCount + 1
      });
    }
    setRecentActivities([
      { id: `ACT-${Date.now()}`, message: `Transferred ${transferForm.employee} from ${transferForm.source} to ${transferForm.target}`, time: 'Just now', type: 'assign' },
      ...recentActivities
    ]);
    setTransferOpen(false);
    addToast('success', `Transfer of ${transferForm.employee} initiated successfully.`);
    setTransferForm({ employee: '', source: 'Sales', target: 'Engineering', reason: '', date: '2026-06-01' });
  };

  // Handle Action - Export Reports simulation
  const handleExportSubmit = (e) => {
    e.preventDefault();
    setExporting(true);
    setExportProgress(0);

    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setExporting(false);
            setExportOpen(false);
            addToast('success', `${exportFormState.report} exported successfully as ${exportFormState.format}.`);
          }, 400);
          return 100;
        }
        return prev + 20;
      });
    }, 250);
  };

  // Handle Document upload simulation
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          const newDoc = {
            id: `DOC-${Date.now()}`,
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            category: 'Standard Policy',
            date: new Date().toISOString().split('T')[0]
          };
          setDocuments([newDoc, ...documents]);
          addToast('success', `${file.name} uploaded successfully.`);
          setUploadedFile(null);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  // Chart Data preparation
  const performanceTrendData = departments.map(d => ({
    name: d.name,
    Productivity: d.avgPerformance,
    Attendance: d.attendanceRate,
    Projects: d.activeProjects * 20
  }));

  const employeeDistributionChartData = departments.map(d => ({
    name: d.name,
    value: d.employeeCount,
    color: d.color
  }));

  const budgetUsageChartData = departments.map(d => ({
    name: d.name,
    Budget: d.budget,
    Spent: d.spent
  }));

  if (isLoading) {
    return (
      <div className="departments-page">
        <div className="dept-stats-row">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ height: 100 }}>
              <Skeleton variant="rect" height="100%" width="100%" />
            </div>
          ))}
        </div>
        <div className="dept-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card dept-card-skeleton">
              <Skeleton variant="rect" height={220} width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="departments-page animate-fade-in">
      
      {/* Page Header */}
      <div className="dept-header-section card">
        <div className="dept-header-left">
          <div className="dept-title-container">
            <GitMerge size={26} className="text-primary" />
            <div>
              <h2>Department Management</h2>
              <p>Create, manage, and monitor company departments, teams, reporting structures, financial performance, and workload allocation.</p>
            </div>
          </div>
        </div>
        
        {/* Quick Action Buttons on header */}
        <div className="dept-header-actions">
          <Button variant="primary" icon={Plus} onClick={() => handleAddClick()}>
            Add Dept
          </Button>
          <Button variant="secondary" icon={Users} onClick={() => setCreateTeamOpen(true)}>
            Create Team
          </Button>
          <Button variant="secondary" icon={ArrowRight} onClick={() => setTransferOpen(true)}>
            Transfer Staff
          </Button>
          <Button variant="ghost" icon={Download} onClick={() => setExportOpen(true)}>
            Export Reports
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="dept-navigation-tabcard card">
        <div className="dept-tabs-nav">
          {[
            { id: 'directory', label: 'Department Directory', icon: GitMerge },
            { id: 'analytics', label: 'Performance Analytics', icon: TrendingUp },
            { id: 'teams', label: 'Team Management', icon: Users },
            { id: 'documents', label: 'Policies & Documents', icon: FileText },
            { id: 'alerts', label: 'Alerts & Activity Logs', icon: AlertCircle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`dept-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT - DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="dept-tab-wrapper flex-column gap-4">
          
          {/* Top Summary Cards */}
          <div className="dept-stats-row">
            {[
              { label: 'Total Departments', value: departments.length, icon: GitMerge, color: '#3b82f6', subtitle: 'Total configured sectors' },
              { label: 'Active Departments', value: activeDepts, icon: CheckCircle2, color: '#10b981', subtitle: 'Running operations' },
              { label: 'Total Employees', value: totalEmployees, icon: Users, color: '#06b6d4', subtitle: 'Workforce allocation' },
              { label: 'Active Teams', value: totalTeams, icon: Layers, color: '#8b5cf6', subtitle: 'Functional subgroups' },
              { label: 'Avg Productivity', value: `${avgPerf}%`, icon: TrendingUp, color: '#ef4444', subtitle: 'Department performance' },
              { label: 'Budget Utilization', value: `${Math.round((totalSpent / totalBudget) * 100)}%`, icon: Clock, color: '#f59e0b', subtitle: 'Financial spends rate' }
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="card dept-summary-stat">
                  <div className="dept-sum-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="dept-sum-val">{stat.value}</p>
                    <p className="dept-sum-label">{stat.label}</p>
                    <span className="dept-sum-subtext">{stat.subtitle}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search & Filters */}
          <div className="card dept-filters-grid">
            <div className="dept-search-wrap">
              <Search size={16} className="dept-search-icon" />
              <input
                className="dept-search-input"
                placeholder="Search by code, head, name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="filter-select-group">
              <div className="filter-select-wrap">
                <ChevronDown size={14} className="filter-chevron" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Expansion Mode">Expansion Mode</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="filter-select-wrap">
                <ChevronDown size={14} className="filter-chevron" />
                <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                  <option value="All">All Locations</option>
                  {branchOptions.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div className="filter-select-wrap">
                <ChevronDown size={14} className="filter-chevron" />
                <select value={perfFilter} onChange={e => setPerfFilter(e.target.value)}>
                  <option value="All">All Performance</option>
                  <option value="High Performance">High (&gt;=90%)</option>
                  <option value="Average Performance">Average (80%-90%)</option>
                  <option value="Low Performance">Low (&lt;80%)</option>
                </select>
              </div>

              <div className="filter-select-wrap">
                <ChevronDown size={14} className="filter-chevron" />
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
                  <option value="All">All Dates</option>
                  <option value="Monthly">Monthly Range</option>
                  <option value="Quarterly">Quarterly Range</option>
                  <option value="Yearly">Yearly Range</option>
                </select>
              </div>
            </div>
          </div>

          {/* Department List Table */}
          <div className="card dept-table-card table-responsive">
            <table className="dept-list-table">
              <thead>
                <tr>
                  <th>Department ID</th>
                  <th>Department Name</th>
                  <th>Department Code</th>
                  <th>Department Head</th>
                  <th>{FIELD_LABELS.branch}</th>
                  <th>Workforce Count</th>
                  <th>Budget Spent</th>
                  <th>Attendance Rate</th>
                  <th>Productivity Rate</th>
                  <th>Department Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepts.length > 0 ? (
                  filteredDepts.map(dept => {
                    const spentPct = Math.round((dept.spent / dept.budget) * 100);
                    return (
                      <tr key={dept.id}>
                        <td className="bold-text">{dept.id}</td>
                        <td>
                          <div className="dept-name-cell">
                            <span className="dept-color-tag" style={{ background: dept.color }}></span>
                            <span className="dept-table-name">{dept.name}</span>
                          </div>
                        </td>
                        <td><code className="dept-table-code">{dept.departmentCode}</code></td>
                        <td>
                          <div className="dept-head-mini">
                            <Avatar name={dept.head} size="xs" />
                            <span>{dept.head}</span>
                          </div>
                        </td>
                        <td className="text-sm"><MapPin size={12} className="inline-icon" /> {dept.branch}</td>
                        <td><Badge variant="neutral">{dept.employeeCount} active</Badge></td>
                        <td>
                          <div className="dept-table-budget-util">
                            <div className="flex-between text-xs mb-1">
                              <span>${dept.spent.toLocaleString()} spent</span>
                              <span>{spentPct}%</span>
                            </div>
                            <div className="dept-budget-bar-bg" style={{ height: '4px' }}>
                              <div
                                className="dept-budget-bar-fill"
                                style={{ width: `${spentPct}%`, background: spentPct > 80 ? '#ef4444' : dept.color }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge variant={dept.attendanceRate >= 92 ? 'success' : 'warning'}>
                            {dept.attendanceRate}%
                          </Badge>
                        </td>
                        <td>
                          <div className="flex-center gap-2">
                            <TrendingUp size={12} style={{ color: dept.avgPerformance >= 90 ? 'var(--color-success)' : 'var(--color-warning)' }} />
                            <span className="bold-text">{dept.avgPerformance}%</span>
                          </div>
                        </td>
                        <td>
                          <Badge
                            variant={
                              dept.status === 'Active' ? 'success' :
                              dept.status === 'Under Review' ? 'warning' :
                              dept.status === 'Expansion Mode' ? 'purple' : 'danger'
                            }
                          >
                            {dept.status}
                          </Badge>
                        </td>
                        <td className="text-xs text-muted">{dept.createdDate}</td>
                        <td>
                          <div className="dept-table-actions">
                            <button className="icon-action-btn" title="View Details" onClick={() => setSelectedDept(dept)}>
                              <Eye size={13} />
                            </button>
                            <button className="icon-action-btn" title="Edit" onClick={() => handleEditClick(dept)}>
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="icon-action-btn icon-action-danger"
                              title="Delete"
                              onClick={() => showConfirm(
                                'Delete Department',
                                `Are you sure you want to delete the ${dept.name} department? This cannot be undone.`,
                                () => {
                                  deleteDepartment(dept.id);
                                },
                                'danger'
                              )}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" className="text-center py-8 text-muted">
                      No departments match the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT - ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="dept-tab-wrapper flex-column gap-5">
          <div className="dept-analytics-grid">
            
            {/* Chart 1: Productivity & Attendance Metrics */}
            <div className="card chart-card">
              <div className="chart-header">
                <h3 className="card-title">Department Performance Metrics</h3>
                <span className="chart-subtitle">Average productivity score vs. attendance rates per department</span>
              </div>
              <div className="chart-body" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceTrendData}>
                    <defs>
                      <linearGradient id="prodColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="attnColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="Productivity" stroke="#3b82f6" fillOpacity={1} fill="url(#prodColor)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Attendance" stroke="#10b981" fillOpacity={1} fill="url(#attnColor)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Employee Distribution */}
            <div className="card chart-card">
              <div className="chart-header">
                <h3 className="card-title">Workforce Distribution</h3>
                <span className="chart-subtitle">Percentage of total employee share per department</span>
              </div>
              <div className="chart-body flex-center" style={{ height: 300 }}>
                <div className="pie-wrapper" style={{ width: '60%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={employeeDistributionChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {employeeDistributionChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="pie-center-label">
                    <span className="pie-center-number">{totalEmployees}</span>
                    <span className="pie-center-text">Total Staff</span>
                  </div>
                </div>
                <div className="pie-custom-legend" style={{ width: '40%' }}>
                  {employeeDistributionChartData.map((item, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: item.color }} />
                      <span className="legend-name">{item.name}</span>
                      <span className="legend-val">{item.value} ({Math.round((item.value / totalEmployees) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Financial Budget Utilization */}
            <div className="card chart-card" style={{ gridColumn: 'span 2' }}>
              <div className="chart-header">
                <h3 className="card-title">Budget Allocation & Expenditures</h3>
                <span className="chart-subtitle">Quarterly financial budget limit vs. actual spending rates by department</span>
              </div>
              <div className="chart-body" style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={budgetUsageChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }} />
                    <Legend />
                    <Bar dataKey="Budget" fill="#334155" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Spent" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT - TEAMS */}
      {activeTab === 'teams' && (
        <div className="dept-tab-wrapper flex-column gap-4">
          <div className="card dept-toolbar">
            <h3 className="card-title">Team Directory</h3>
            <Button variant="primary" icon={Plus} onClick={() => setCreateTeamOpen(true)}>
              New Team
            </Button>
          </div>

          <div className="card table-responsive">
            <table className="dept-list-table">
              <thead>
                <tr>
                  <th>Team ID</th>
                  <th>Team Name</th>
                  <th>{FIELD_LABELS.teamLeader}</th>
                  <th>Department</th>
                  <th>Employee Count</th>
                  <th>Active Projects</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(team => (
                  <tr key={team.id}>
                    <td className="bold-text">{team.id}</td>
                    <td className="bold-text">{team.name}</td>
                    <td>
                      <div className="dept-head-mini">
                        <Avatar name={team.leader} size="xs" />
                        <span>{team.leader}</span>
                      </div>
                    </td>
                    <td><Badge variant="purple">{team.department}</Badge></td>
                    <td><Badge variant="neutral">{team.employeeCount} Members</Badge></td>
                    <td><Badge variant="neutral">{team.activeProjects} Active</Badge></td>
                    <td>
                      <Badge variant={team.status === 'Active' ? 'success' : 'warning'}>
                        {team.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="dept-table-actions">
                        <button className="icon-action-btn" title="View Team Performance" onClick={() => addToast('info', `Displaying ${team.name} performance metrics...`)}>
                          <TrendingUp size={13} />
                        </button>
                        <button className="icon-action-btn" title="Edit Team" onClick={() => addToast('info', `Editing team ${team.name}...`)}>
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="icon-action-btn icon-action-danger"
                          title="Dissolve Team"
                          onClick={() => showConfirm(
                            'Dissolve Team',
                            `Are you sure you want to dissolve the team ${team.name}? All members will remain in their parent departments.`,
                            () => {
                              setTeams(prev => prev.filter(t => t.id !== team.id));
                              addToast('warning', `Team ${team.name} dissolved.`);
                            },
                            'danger'
                          )}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT - POLICIES & DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="dept-tab-wrapper">
          <div className="dept-policy-docs-layout">
            
            {/* Left: Policy Configuration */}
            <div className="card policy-config-panel flex-column gap-4">
              <h3 className="card-title flex-center justify-start gap-2">
                <Settings size={18} className="text-primary" />
                <span>Department Policy Settings</span>
              </h3>
              
              <div className="policy-checkbox-toggles flex-column gap-3 mt-2">
                <label className="checkbox-toggle-label">
                  <input
                    type="checkbox"
                    checked={policiesConfig.standard}
                    onChange={e => setPoliciesConfig({ ...policiesConfig, standard: e.target.checked })}
                  />
                  <div>
                    <span className="toggle-title">Enforce Standard Workhours</span>
                    <p className="toggle-desc">Lock weekly working hours guidelines to standard contract definitions.</p>
                  </div>
                </label>

                <label className="checkbox-toggle-label">
                  <input
                    type="checkbox"
                    checked={policiesConfig.custom}
                    onChange={e => setPoliciesConfig({ ...policiesConfig, custom: e.target.checked })}
                  />
                  <div>
                    <span className="toggle-title">Enable Cross-Department Allocation</span>
                    <p className="toggle-desc">Allows managers to assign employees to projects in external departments.</p>
                  </div>
                </label>
              </div>

              <div className="form-group flex-column gap-1">
                <label>Weekly Working Hours Cap</label>
                <input
                  type="number"
                  className="form-control"
                  value={policiesConfig.workingHours}
                  onChange={e => setPoliciesConfig({ ...policiesConfig, workingHours: Number(e.target.value) })}
                />
              </div>

              <div className="form-group flex-column gap-1">
                <label>Default Shift Schedule</label>
                <select
                  className="form-control"
                  value={policiesConfig.shiftConfig}
                  onChange={e => setPoliciesConfig({ ...policiesConfig, shiftConfig: e.target.value })}
                >
                  <option value="General Shift">General Shift (9AM - 6PM)</option>
                  <option value="Night Shift">Night Shift (9PM - 6AM)</option>
                  <option value="Rotational Shift">Rotational Shift</option>
                  <option value="Flexible Shift">Flexible Hours</option>
                </select>
              </div>

              <div className="form-group flex-column gap-1">
                <label>Performance Auditing Thresholds</label>
                <select
                  className="form-control"
                  value={policiesConfig.criteria}
                  onChange={e => setPoliciesConfig({ ...policiesConfig, criteria: e.target.value })}
                >
                  <option value="KPI Thresholds">KPI Target Completion Percentage</option>
                  <option value="Workflow Output">Workflow Activity Output Rate</option>
                  <option value="Subjective Score">Peer Reviews and Manager Ratings</option>
                </select>
              </div>

              <Button variant="primary" icon={Check} onClick={() => addToast('success', 'Policy configurations saved successfully.')}>
                Save Policy Configurations
              </Button>
            </div>

            {/* Right: Document Management */}
            <div className="card document-manager-panel flex-column gap-4">
              <h3 className="card-title">Department Document Management</h3>
              
              {/* Drag and Drop Upload zone simulator */}
              <div className="document-uploader-mock-zone flex-column items-center justify-center">
                <FileText size={32} className="uploader-icon text-muted mb-2" />
                <p className="uploader-text">Drag and drop file here, or click to upload</p>
                <span className="uploader-subtext text-xs text-muted">Supports PDF, DOCX, XLSX, JPG, PNG (Max 10MB)</span>
                
                <input
                  type="file"
                  id="doc-uploader"
                  className="uploader-input-real"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <Button variant="secondary" onClick={() => document.getElementById('doc-uploader').click()} className="mt-3">
                  Select File
                </Button>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="progress-bar-wrapper mt-3 flex-column gap-1" style={{ width: '80%' }}>
                    <div className="flex-center justify-between text-xs">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="dept-budget-bar-bg" style={{ height: '4px' }}>
                      <div className="dept-budget-bar-fill" style={{ width: `${uploadProgress}%`, background: 'var(--color-primary)' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Document List */}
              <div className="uploaded-docs-list flex-column gap-3">
                <span className="section-small-title uppercase tracking-wider text-xs text-muted">Available Files</span>
                {documents.map(doc => (
                  <div key={doc.id} className="uploaded-doc-item flex-center justify-between">
                    <div className="flex-center gap-3">
                      <div className="doc-icon-avatar">
                        <FileText size={18} className="text-primary" />
                      </div>
                      <div className="doc-meta-info flex-column">
                        <span className="doc-name bold-text text-sm">{doc.name}</span>
                        <span className="doc-details-text text-xs text-muted">{doc.size} • {doc.category} • Uploaded {doc.date}</span>
                      </div>
                    </div>
                    <div className="doc-item-actions flex-center gap-2">
                      <button className="icon-action-btn" title="Download Document" onClick={() => addToast('success', `Downloading ${doc.name}...`)}>
                        <Download size={13} />
                      </button>
                      <button
                        className="icon-action-btn icon-action-danger"
                        title="Remove Document"
                        onClick={() => showConfirm(
                          'Remove Document',
                          `Are you sure you want to remove the document "${doc.name}"?`,
                          () => {
                            setDocuments(prev => prev.filter(d => d.id !== doc.id));
                            addToast('warning', `Document "${doc.name}" removed.`);
                          },
                          'danger'
                        )}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT - ALERTS & TIMELINE */}
      {activeTab === 'alerts' && (
        <div className="dept-tab-wrapper">
          <div className="dept-policy-docs-layout">
            
            {/* Left: Alerts & Notifications */}
            <div className="card policy-config-panel flex-column gap-4">
              <h3 className="card-title flex-center justify-start gap-2">
                <AlertCircle size={18} className="text-danger" />
                <span>Department Notifications & Alerts</span>
              </h3>
              <div className="alerts-feed-wrapper flex-column gap-3 mt-2">
                {alertsFeed.map(alert => (
                  <div key={alert.id} className={`alert-feed-item alert-border-${alert.type} flex-center gap-3`}>
                    <div className={`alert-avatar alert-bg-${alert.type}`}>
                      {alert.type === 'danger' ? <AlertTriangle size={16} /> : <Info size={16} />}
                    </div>
                    <div className="alert-content flex-column flex-1">
                      <span className="alert-title bold-text text-sm">{alert.title}</span>
                      <p className="alert-text text-xs text-secondary mt-1">{alert.message}</p>
                      <span className="alert-time text-xxs text-muted mt-1">{alert.time}</span>
                    </div>
                    <button
                      className="alert-dismiss-btn"
                      onClick={() => setAlertsFeed(prev => prev.filter(a => a.id !== alert.id))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Activity Log Timeline */}
            <div className="card document-manager-panel flex-column gap-4">
              <h3 className="card-title">Recent Activity Logs</h3>
              <div className="activity-timeline-wrapper flex-column">
                {recentActivities.map((act, idx) => (
                  <div key={act.id} className="timeline-item-container flex-center justify-start gap-4">
                    <div className="timeline-left-connector">
                      <div className={`timeline-node timeline-node-${act.type}`} />
                      {idx < recentActivities.length - 1 && <div className="timeline-connector-line" />}
                    </div>
                    <div className="timeline-content-details flex-column pb-6">
                      <span className="timeline-message text-sm text-secondary">{act.message}</span>
                      <span className="timeline-time text-xs text-muted">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER NOTICE */}
      <div className="card dept-footer-section flex-center justify-between text-xs text-muted">
        <span>Total Configured Sectors: {departments.length} • Total Registered Subteams: {totalTeams}</span>
        <span>Last Updated Time: Just Now • Department Management System Active</span>
      </div>

      {/* ─── ALL QUICK ACTION MODALS ────────────────────────────────────────── */}

      {/* MODAL 1: ADD/EDIT DEPARTMENT */}
      <Modal isOpen={addDeptOpen} onClose={() => setAddDeptOpen(false)} title={isEditMode ? "Edit Department" : "Add Department"} size="md">
        <form onSubmit={handleAddDeptSubmit} className="policy-form flex-column gap-4 py-2">
          <div className="form-group flex-column gap-1">
            <label htmlFor="deptName">Department Name *</label>
            <input
              id="deptName"
              type="text"
              required
              className="form-control"
              placeholder="e.g. Finance, Customer Support"
              value={newDeptForm.name}
              onChange={e => setNewDeptForm({ ...newDeptForm, name: e.target.value })}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="deptCode">Department Code *</label>
            <input
              id="deptCode"
              type="text"
              required
              className="form-control"
              placeholder="e.g. FIN-CORP, SUP-CARE"
              value={newDeptForm.code}
              onChange={e => setNewDeptForm({ ...newDeptForm, code: e.target.value })}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="deptHead">Department Head / Manager *</label>
            <select
              id="deptHead"
              required
              className="form-control"
              value={newDeptForm.head}
              onChange={e => {
                const val = e.target.value;
                setNewDeptForm({ ...newDeptForm, head: val });
              }}
            >
              <option value="">Select Department Head / Manager</option>
              {newDeptForm.head && !availableTeamLeaders.some(tl => tl.name === newDeptForm.head) && (
                <option value={newDeptForm.head}>{newDeptForm.head} (Current Head)</option>
              )}
              {availableTeamLeaders.map(tl => (
                <option key={tl.id} value={tl.name}>
                  {tl.name} ({tl.role || 'Team Leader'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="deptBranch">Branch Location</label>
            <select
              id="deptBranch"
              className="form-control"
              value={newDeptForm.branch}
              onChange={e => {
                const val = e.target.value;
                setNewDeptForm({ ...newDeptForm, branch: val });
                if (val === 'add_custom') {
                  setShowCustomBranchInput(true);
                } else {
                  setShowCustomBranchInput(false);
                }
              }}
            >
              {newDeptForm.branch && !branchOptions.includes(newDeptForm.branch) && (
                <option value={newDeptForm.branch}>{newDeptForm.branch} (Current Branch)</option>
              )}
              {branchOptions.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
              <option value="add_custom">+ Add Custom Location...</option>
            </select>
          </div>

          {showCustomBranchInput && (
            <div className="form-group flex-column gap-1 animate-fade-in">
              <label htmlFor="customBranch">Custom Branch Name *</label>
              <input
                id="customBranch"
                type="text"
                required
                className="form-control"
                placeholder="e.g. Bangalore Office"
                value={customBranch}
                onChange={e => setCustomBranch(e.target.value)}
              />
            </div>
          )}

          <div className="form-group flex-column gap-1">
            <label htmlFor="deptBudget">Allocated Annual Budget ($)</label>
            <input
              id="deptBudget"
              type="number"
              className="form-control"
              value={newDeptForm.budget}
              onChange={e => setNewDeptForm({ ...newDeptForm, budget: Number(e.target.value) })}
            />
          </div>

          {/* Accent Color picker removed as requested */}

          <div className="form-group flex-column gap-1">
            <label htmlFor="deptDesc">Description</label>
            <textarea
              id="deptDesc"
              rows="3"
              className="form-control"
              placeholder="Describe department roles and duties..."
              value={newDeptForm.description}
              onChange={e => setNewDeptForm({ ...newDeptForm, description: e.target.value })}
            />
          </div>

          <div className="flex-center justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => setAddDeptOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">{isEditMode ? "Save Changes" : "Create Department"}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CREATE TEAM */}
      <Modal isOpen={createTeamOpen} onClose={() => setCreateTeamOpen(false)} title="Create Team" size="md">
        <form onSubmit={handleCreateTeamSubmit} className="policy-form flex-column gap-4 py-2">
          <div className="form-group flex-column gap-1">
            <label htmlFor="teamName">Team Name *</label>
            <input
              id="teamName"
              type="text"
              required
              className="form-control"
              placeholder="e.g. DevOps Core, Digital Ads"
              value={newTeamForm.name}
              onChange={e => setNewTeamForm({ ...newTeamForm, name: e.target.value })}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="teamLeader">Team Leader *</label>
            <input
              id="teamLeader"
              type="text"
              required
              className="form-control"
              placeholder="Full Name"
              value={newTeamForm.leader}
              onChange={e => setNewTeamForm({ ...newTeamForm, leader: e.target.value })}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="teamDept">Parent Department</label>
            <select
              id="teamDept"
              className="form-control"
              value={newTeamForm.department}
              onChange={e => setNewTeamForm({ ...newTeamForm, department: e.target.value, members: [], count: 0 })}
            >
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group flex-column gap-1">
            <label>Select Team Members</label>
            <div style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textTransform: 'none' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color-dark)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-elevated)', zIndex: 10 }}>
                    <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', border: 'none' }}>Name & Designation</th>
                    <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', width: '95px', border: 'none' }}>Performance</th>
                    <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', width: '95px', border: 'none' }}>Productivity</th>
                    <th style={{ padding: '8px 10px', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', width: '95px', border: 'none' }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {deptEmployees.map(emp => {
                    const isSelected = newTeamForm.members?.includes(emp.name);
                    const perfVal = emp.performanceScore?.overall || 75;
                    const prodVal = emp.productivityScore || 80;
                    const attVal = emp.performanceScore?.attendance || 90;

                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isSelected ? 'var(--color-primary-light)' : 'transparent' }}>
                        {/* Column 1: Checkbox & Name */}
                        <td style={{ padding: '8px 10px', verticalAlign: 'middle', border: 'none' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, textTransform: 'none', width: '100%', justifyContent: 'flex-start' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              style={{ 
                                cursor: 'pointer',
                                width: '15px',
                                height: '15px',
                                margin: '0',
                                flexShrink: 0
                              }}
                              onChange={() => {
                                const updatedMembers = isSelected
                                  ? newTeamForm.members.filter(m => m !== emp.name)
                                  : [...(newTeamForm.members || []), emp.name];
                                setNewTeamForm({
                                  ...newTeamForm,
                                  members: updatedMembers,
                                  count: updatedMembers.length
                                });
                              }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', textTransform: 'none' }}>
                              <span style={{ fontWeight: '600', color: 'var(--text-primary)', textTransform: 'none', lineHeight: '1.2' }}>{emp.name}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'none', marginTop: '2px' }}>{emp.designation}</span>
                            </div>
                          </label>
                        </td>

                        {/* Column 2: Performance Progress bar */}
                        <td style={{ padding: '8px 10px', verticalAlign: 'middle', border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '600', minWidth: '24px', color: 'var(--text-primary)' }}>{perfVal}%</span>
                            <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden', flexShrink: 0 }}>
                              <div style={{ width: `${perfVal}%`, height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-full)' }} />
                            </div>
                          </div>
                        </td>

                        {/* Column 3: Productivity Progress bar */}
                        <td style={{ padding: '8px 10px', verticalAlign: 'middle', border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '600', minWidth: '24px', color: 'var(--text-primary)' }}>{prodVal}%</span>
                            <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden', flexShrink: 0 }}>
                              <div style={{ width: `${prodVal}%`, height: '100%', backgroundColor: 'var(--accent-blue-solid)', borderRadius: 'var(--radius-full)' }} />
                            </div>
                          </div>
                        </td>

                        {/* Column 4: Attendance Progress bar */}
                        <td style={{ padding: '8px 10px', verticalAlign: 'middle', border: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: '600', minWidth: '24px', color: 'var(--text-primary)' }}>{attVal}%</span>
                            <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden', flexShrink: 0 }}>
                              <div style={{ width: `${attVal}%`, height: '100%', backgroundColor: 'var(--color-success)', borderRadius: 'var(--radius-full)' }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {deptEmployees.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '20px 10px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', textTransform: 'none', border: 'none' }}>
                        No employees available in this department.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="teamCount">Initial Workforce Size (Calculated)</label>
            <input
              id="teamCount"
              type="number"
              className="form-control"
              disabled
              value={newTeamForm.count}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="teamStatus">Current Status</label>
            <select
              id="teamStatus"
              className="form-control"
              value={newTeamForm.status}
              onChange={e => setNewTeamForm({ ...newTeamForm, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Under Review">Under Review</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <div className="flex-center justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Establish Team</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: TRANSFER STAFF */}
      <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Employees" size="md">
        <form onSubmit={handleTransferSubmit} className="policy-form flex-column gap-4 py-2">
          
          <div className="form-group flex-column gap-1">
            <label htmlFor="transferEmpName">Employee Name *</label>
            <input
              id="transferEmpName"
              type="text"
              required
              className="form-control"
              placeholder="e.g. Suresh Kumar"
              value={transferForm.employee}
              onChange={e => setTransferForm({ ...transferForm, employee: e.target.value })}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="transferSource">Source Department</label>
            <select
              id="transferSource"
              className="form-control"
              value={transferForm.source}
              onChange={e => setTransferForm({ ...transferForm, source: e.target.value })}
            >
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="transferTarget">Target Department</label>
            <select
              id="transferTarget"
              className="form-control"
              value={transferForm.target}
              onChange={e => setTransferForm({ ...transferForm, target: e.target.value })}
            >
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="transferReason">Reason for transfer *</label>
            <textarea
              id="transferReason"
              required
              rows="3"
              className="form-control"
              placeholder="Workload re-allocation, skills requirement etc..."
              value={transferForm.reason}
              onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label htmlFor="transferDate">Effective Transfer Date</label>
            <input
              id="transferDate"
              type="date"
              className="form-control"
              value={transferForm.date}
              onChange={e => setTransferForm({ ...transferForm, date: e.target.value })}
            />
          </div>

          <div className="flex-center justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Submit Transfer</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: EXPORT REPORT PROGRESS */}
      <Modal isOpen={exportOpen} onClose={() => setExportOpen(false)} title="Export Department Reports" size="sm">
        <form onSubmit={handleExportSubmit} className="policy-form flex-column gap-4 py-2">
          
          <div className="form-group flex-column gap-1">
            <label>Select Report Target</label>
            <select
              className="form-control"
              value={exportFormState.report}
              onChange={e => setExportFormState({ ...exportFormState, report: e.target.value })}
            >
              <option value="Department Summary Report">Department Summary Report</option>
              <option value="Productivity Report">Productivity Report</option>
              <option value="Employee Distribution Report">Employee Distribution Report</option>
            </select>
          </div>

          <div className="form-group flex-column gap-1">
            <label>Supported Export Formats</label>
            <select
              className="form-control"
              value={exportFormState.format}
              onChange={e => setExportFormState({ ...exportFormState, format: e.target.value })}
            >
              <option value="PDF">PDF File</option>
              <option value="Excel">Excel Spreadsheet</option>
            </select>
          </div>

          {exporting ? (
            <div className="progress-bar-wrapper mt-3 flex-column gap-1">
              <div className="flex-center justify-between text-xs">
                <span>Generating {exportFormState.format}...</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="dept-budget-bar-bg" style={{ height: '6px' }}>
                <div className="dept-budget-bar-fill" style={{ width: `${exportProgress}%`, background: 'var(--color-primary)' }} />
              </div>
            </div>
          ) : (
            <div className="flex-center justify-end gap-2 mt-2">
              <Button variant="secondary" type="button" onClick={() => setExportOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Start Download</Button>
            </div>
          )}
        </form>
      </Modal>

      {/* MODAL 5: DETAILED DEPARTMENT OVERVIEW */}
      {selectedDept && (
        <Modal
          isOpen={!!selectedDept}
          onClose={() => setSelectedDept(null)}
          title={`Department Detail: ${selectedDept.name}`}
          size="lg"
        >
          <div className="dept-modal-body">
            
            {/* Modal Head Banner */}
            <div className="dept-modal-head" style={{ borderColor: selectedDept.color }}>
              <div className="dept-modal-icon" style={{ background: `${selectedDept.color}20`, color: selectedDept.color }}>
                <GitMerge size={28} />
              </div>
              <div className="flex-1">
                <div className="flex-between">
                  <h3 className="dept-modal-name">{selectedDept.name}</h3>
                  <Badge variant={selectedDept.status === 'Active' ? 'success' : 'warning'}>{selectedDept.status}</Badge>
                </div>
                <p className="dept-modal-branch">Code: <code>{selectedDept.departmentCode}</code> • Branch Location: {selectedDept.branch} • Founded: {selectedDept.createdDate}</p>
              </div>
            </div>

            {/* Description */}
            <p className="dept-modal-desc">{selectedDept.description}</p>

            {/* Overview Stats (Tile Grid) */}
            <div className="dept-modal-stats-grid">
              <div className="dept-stat-tile">
                <span className="dept-stat-label">Active Employees</span>
                <span className="dept-stat-val" style={{ color: selectedDept.color }}>{selectedDept.employeeCount}</span>
              </div>
              <div className="dept-stat-tile">
                <span className="dept-stat-label">Subteams Registered</span>
                <span className="dept-stat-val" style={{ color: selectedDept.color }}>{selectedDept.activeTeams}</span>
              </div>
              <Link to={`/projects?status=In Progress&department=${selectedDept.name}`} className="dept-stat-tile dept-stat-link">
                <span className="dept-stat-label">Active Projects</span>
                <span className="dept-stat-val" style={{ color: selectedDept.color }}>{selectedDept.activeProjects}</span>
              </Link>
              <div className="dept-stat-tile">
                <span className="dept-stat-label">Performance Rating</span>
                <span className="dept-stat-val" style={{ color: selectedDept.color }}>{selectedDept.avgPerformance}%</span>
              </div>
            </div>

            {/* Multi-Section Details Grid */}
            <div className="dept-modal-detail-sections-grid">
              
              {/* Section A: Employees Overview */}
              <div className="card detail-section-card flex-column gap-2">
                <span className="section-small-title uppercase tracking-wider text-xs text-muted">Employees Overview</span>
                <div className="flex-between text-sm py-1 border-bottom">
                  <span>Workforce Strength</span>
                  <span className="bold-text">{selectedDept.employeeCount} Active</span>
                </div>
                <div className="flex-between text-sm py-1 border-bottom">
                  <span>Employees On Leave</span>
                  <span className="bold-text text-warning">1 On Leave</span>
                </div>
                <div className="flex-between text-sm py-1">
                  <span>WFH Filings (Monthly)</span>
                  <span className="bold-text">{selectedDept.wfhFilings} Filings</span>
                </div>
              </div>

              {/* Section B: Team Overview */}
              <div className="card detail-section-card flex-column gap-2">
                <span className="section-small-title uppercase tracking-wider text-xs text-muted">Team Structure</span>
                <div className="flex-between text-sm py-1 border-bottom">
                  <span>Subteams count</span>
                  <span className="bold-text">{selectedDept.activeTeams} Teams</span>
                </div>
                <div className="flex-between text-sm py-1 border-bottom">
                  <span>Team Leader Assigned</span>
                  <span className="bold-text text-success">Yes</span>
                </div>
                <div className="flex-between text-sm py-1">
                  <span>Managerial Span</span>
                  <span className="bold-text">{Math.ceil(selectedDept.employeeCount / Math.max(1, selectedDept.activeTeams))} staff/team</span>
                </div>
              </div>

              {/* Section C: Project Allocation */}
              <div className="card detail-section-card flex-column gap-2">
                <span className="section-small-title uppercase tracking-wider text-xs text-muted">Project Statistics</span>
                <Link to={`/projects?status=In Progress&department=${selectedDept.name}`} className="flex-between text-sm py-1 border-bottom dept-stat-row-link">
                  <span>Active Projects</span>
                  <span className="bold-text text-primary">{selectedDept.activeProjects} In Progress</span>
                </Link>
                <Link to={`/projects?status=Completed&department=${selectedDept.name}`} className="flex-between text-sm py-1 border-bottom dept-stat-row-link">
                  <span>Completed Targets</span>
                  <span className="bold-text text-success">{selectedDept.completedProjects} Delivered</span>
                </Link>
                <Link to={`/projects?status=Delayed&department=${selectedDept.name}`} className="flex-between text-sm py-1 dept-stat-row-link">
                  <span>Delayed Milestones</span>
                  <span className="bold-text text-danger">{selectedDept.delayedProjects} Delayed</span>
                </Link>
              </div>

              {/* Section D: Attendance Statistics */}
              <div className="card detail-section-card flex-column gap-2">
                <span className="section-small-title uppercase tracking-wider text-xs text-muted">Attendance Overview</span>
                <div className="flex-between text-sm py-1 border-bottom">
                  <span>Monthly Attendance %</span>
                  <span className="bold-text text-success">{selectedDept.attendanceRate}%</span>
                </div>
                <div className="flex-between text-sm py-1 border-bottom">
                  <span>Average Delay Rate</span>
                  <span className="bold-text">1.2%</span>
                </div>
                <div className="flex-between text-sm py-1">
                  <span>Present Ratio Today</span>
                  <span className="bold-text">14/15 present</span>
                </div>
              </div>

              {/* Section E: Productivity Overview */}
              <div className="card detail-section-card flex-column gap-2" style={{ gridColumn: 'span 2' }}>
                <span className="section-small-title uppercase tracking-wider text-xs text-muted">Productivity & Task Tracking</span>
                <div className="dept-modal-productivity-grid">
                  <div className="prod-meta-stat">
                    <span>Tasks Completed</span>
                    <strong className="text-success">{selectedDept.tasksCompleted}</strong>
                  </div>
                  <div className="prod-meta-stat">
                    <span>Tasks in Progress</span>
                    <strong className="text-primary">{selectedDept.tasksInProgress}</strong>
                  </div>
                  <div className="prod-meta-stat">
                    <span>Department Rank</span>
                    <strong>#2</strong>
                  </div>
                  <div className="prod-meta-stat">
                    <span>Workflow Efficiency</span>
                    <strong>94%</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Financial Spends and Budget progress */}
            <div className="dept-modal-budget">
              <div className="dept-budget-header">
                <span className="dept-stat-label">Budget Allocation and Spends ($)</span>
                <span className="dept-budget-pct" style={{ color: Math.round((selectedDept.spent / selectedDept.budget) * 100) > 80 ? '#ef4444' : selectedDept.color }}>
                  {Math.round((selectedDept.spent / selectedDept.budget) * 100)}% Used
                </span>
              </div>
              <div className="dept-budget-bar-bg" style={{ height: '6px' }}>
                <div
                  className="dept-budget-bar-fill"
                  style={{
                    width: `${Math.round((selectedDept.spent / selectedDept.budget) * 100)}%`,
                    background: Math.round((selectedDept.spent / selectedDept.budget) * 100) > 80 ? '#ef4444' : selectedDept.color
                  }}
                />
              </div>
              <div className="dept-budget-numbers mt-2 flex-between text-xs text-muted">
                <span>Spent: ${selectedDept.spent.toLocaleString()}</span>
                <span>Remaining: ${(selectedDept.budget - selectedDept.spent).toLocaleString()}</span>
                <span>Total: ${selectedDept.budget.toLocaleString()}</span>
              </div>
            </div>

            {/* Department Head Section */}
            <div className="dept-modal-head-section">
              <span className="dept-stat-label">Department Head Profile</span>
              <Link to={`/employees/${selectedDept.headId}`} className="dept-head-profile">
                <Avatar name={selectedDept.head} size="md" />
                <div className="flex-1">
                  <span className="dept-head-name">{selectedDept.head}</span>
                  <span className="dept-head-role">Authorized Manager • ID: {selectedDept.headId}</span>
                </div>
              </Link>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};

export default Departments;
