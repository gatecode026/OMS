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
  Edit2, Power, MoreVertical, Building2, X, Save,
  FileText, AlertCircle, ArrowRight, Download, BarChart3,
  PieChart as LucidePieChart, Info, Settings, ShieldCheck, Check,
  AlertTriangle, FileSpreadsheet, Eye, ChevronDown, CheckCircle2,
  RefreshCw, Layers, MapPin, Landmark
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, Legend
} from 'recharts';

const Departments = () => {
  const isLoading = usePageLoading(600);
  const { 
    employees = [], 
    branches = [], 
    departments: contextDepartments = [], 
    attendance = [],
    addDepartment, 
    updateDepartment,
    updateEmployee,
    addToast, 
    showConfirm,
    teams: contextTeams = [],
    deleteTeam,
    updateTeam,
    addActivityLog,
    hasPermission,
    projectsList = [],
    tasks = []
  } = useApp() || {};

  // Tab State
  const [activeTab, setActiveTab] = useState('directory');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [perfFilter, setPerfFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [branchOptions, setBranchOptions] = useState([]);
  const [showCustomBranchInput, setShowCustomBranchInput] = useState(false);
  const [customBranch, setCustomBranch] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [transferForm, setTransferForm] = useState({
    employee: '', source: '', target: '', reason: '', date: '2026-06-01'
  });
  const [exportFormState, setExportFormState] = useState({
    report: 'Department Summary Report', format: 'PDF'
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const departments = useMemo(() => {
    const rawDepts = Array.isArray(contextDepartments) ? contextDepartments : [];
    
    const todayStr = (() => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    return rawDepts.map(dept => {
      const nameLower = (dept.name || '').trim().toLowerCase();
      
      // Real workforce count of active employees in department
      const deptActiveEmps = (employees || []).filter(emp => 
        emp && 
        (emp.department || '').trim().toLowerCase() === nameLower && 
        emp.status !== 'Inactive'
      );

      // Real productivity rate for the department
      const deptActiveEmpIds = new Set(deptActiveEmps.map(emp => emp.id));
      const deptTasks = (tasks || []).filter(t => deptActiveEmpIds.has(t.assigneeId));
      const deptProductivity = deptTasks.length > 0
        ? Math.round(deptTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length / deptTasks.length * 100)
        : (deptActiveEmps.length > 0
          ? Math.round(deptActiveEmps.reduce((sum, emp) => sum + (emp.productivityScore || 90), 0) / deptActiveEmps.length)
          : 0);

      // Real attendance rate for the department today
      const deptPresentToday = deptActiveEmps.filter(emp => {
        const hasTodayRecord = (attendance || []).some(record => 
          record.employeeId === emp.id && 
          record.date === todayStr
        );
        if (hasTodayRecord) {
          return (attendance || []).some(record => 
            record.employeeId === emp.id && 
            record.date === todayStr && 
            ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Half Day', 'Half-Day'].includes(record.status)
          );
        }
        return ['Present', 'Late', 'Work From Home', 'WFH', 'Overtime', 'Punched In'].includes(emp.attendanceStatus || emp.todayPunchStatus);
      }).length;

      const deptAttendance = deptActiveEmps.length > 0
        ? Math.round((deptPresentToday / deptActiveEmps.length) * 100)
        : 0;

      // Real active teams count
      const liveTeamsCount = (contextTeams || []).filter(t => 
        (t.department || '').trim().toLowerCase() === nameLower && 
        t.status === 'Active'
      ).length;

      // Real active projects count
      const liveProjectsCount = (projectsList || []).filter(p => 
        (p.department || '').trim().toLowerCase() === nameLower && 
        p.status !== 'Completed'
      ).length;

      // Real WFH filings count
      const deptWfhFilings = deptActiveEmps.filter(emp => {
        return (attendance || []).some(record => 
          record.employeeId === emp.id && 
          ['Work From Home', 'WFH'].includes(record.status)
        );
      }).length;

      // Real tasks completed and in progress counts
      const deptEmpIds = new Set(deptActiveEmps.map(e => e.id));
      let tasksCompleted = 0;
      let tasksInProgress = 0;
      (projectsList || []).forEach(project => {
        if (project.tasks) {
          project.tasks.forEach(task => {
            if (deptEmpIds.has(task.assigneeId)) {
              if (task.completed || task.status === 'Done' || task.status === 'done') {
                tasksCompleted++;
              } else if (task.status === 'In Progress' || task.status === 'in_progress') {
                tasksInProgress++;
              }
            }
          });
        }
      });

      return {
        ...dept,
        employeeCount: deptActiveEmps.length,
        attendanceRate: deptAttendance,
        avgPerformance: deptProductivity,
        activeTeams: liveTeamsCount,
        activeProjects: liveProjectsCount,
        wfhFilings: deptWfhFilings,
        tasksCompleted,
        tasksInProgress
      };
    });
  }, [contextDepartments, employees, attendance, contextTeams, projectsList, tasks]);

  const teams = Array.isArray(contextTeams) ? contextTeams : [];

  useEffect(() => {
    if (branches && branches.length > 0) {
      setBranchOptions(branches.map(b => b.name));
    } else {
      setBranchOptions([]);
    }
  }, [branches]);

  const defaultBranch = useMemo(() => {
    return branches.length > 0 ? branches[0].name : '';
  }, [branches]);

  const [newDeptForm, setNewDeptForm] = useState({
    name: '', code: '', head: '', branch: defaultBranch, description: ''
  });

  useEffect(() => {
    setNewDeptForm(prev => ({
      ...prev,
      branch: prev.branch || defaultBranch
    }));
  }, [defaultBranch]);

  // Auto-generate serialized department code
  useEffect(() => {
    if (isEditMode) return;
    const deptName = newDeptForm.name;
    const branchName = newDeptForm.branch === 'add_custom' ? customBranch : newDeptForm.branch;
    
    if (!deptName || !branchName) {
      setNewDeptForm(prev => ({ ...prev, code: '' }));
      return;
    }
    
    const cleanBranch = (branchName || '').replace(/branch|office|agency/gi, '').trim();
    const branchAbbr = cleanBranch ? cleanBranch.slice(0, 3).toUpperCase() : 'HQ';
    const cleanDept = (deptName || '').trim();
    const deptAbbr = cleanDept ? cleanDept.slice(0, 3).toUpperCase() : 'DEPT';
    const prefix = `${branchAbbr}-${deptAbbr}-`;
    
    const matchingCodes = departments
      .map(d => d.departmentCode || d.code || '')
      .filter(code => code && code.startsWith(prefix));
      
    let nextNum = 1;
    if (matchingCodes.length > 0) {
      const nums = matchingCodes.map(code => {
        const suffix = code.replace(prefix, '');
        const num = parseInt(suffix, 10);
        return isNaN(num) ? 0 : num;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const serial = String(nextNum).padStart(2, '00');
    const generatedCode = `${prefix}${serial}`;
    
    setNewDeptForm(prev => ({ ...prev, code: generatedCode }));
  }, [newDeptForm.name, newDeptForm.branch, customBranch, isEditMode, departments]);

  const availableTeamLeaders = useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return employees.filter(emp =>
      emp.roleId === 'team_leader' ||
      emp.role === 'Team Leader' ||
      emp.roleId === 'manager' ||
      emp.role === 'Manager'
    );
  }, [employees]);

  const handleEditClick = (dept) => {
    setIsEditMode(true);
    setEditingDeptId(dept.id);
    setNewDeptForm({
      name: dept.name,
      code: dept.departmentCode || dept.code || '',
      head: dept.head,
      branch: dept.branch,
      description: dept.description || ''
    });
    setAddDeptOpen(true);
  };

  const handleAddClick = () => {
    setIsEditMode(false);
    setEditingDeptId(null);
    setNewDeptForm({ name: '', code: '', head: '', branch: defaultBranch, description: '' });
    setAddDeptOpen(true);
  };

  // Use live employees array for accurate total count; fallback to summing department counts
  const totalEmployees = employees.length > 0
    ? employees.filter(e => e.status !== 'Inactive').length
    : departments.reduce((acc, d) => acc + (d.employeeCount || 0), 0);

  // Map of department name (lowercase) -> real-time employee count from live employees array
  const deptEmployeeCountMap = React.useMemo(() => {
    const map = {};
    (employees || []).forEach(emp => {
      const dept = (emp.department || '').trim().toLowerCase();
      if (dept) {
        map[dept] = (map[dept] || 0) + 1;
      }
    });
    return map;
  }, [employees]);

  const getLiveEmpCount = (deptName) => deptEmployeeCountMap[(deptName || '').trim().toLowerCase()] || 0;

  const getLiveTeamsCount = (deptName) => {
    if (!deptName) return 0;
    return (contextTeams || []).filter(t => (t.department || '').trim().toLowerCase() === deptName.trim().toLowerCase() && t.status === 'Active').length;
  };

  const getLiveProjectsCount = (deptName) => {
    if (!deptName) return 0;
    return (projectsList || []).filter(p => (p.department || '').trim().toLowerCase() === deptName.trim().toLowerCase() && p.status !== 'Completed').length;
  };

  const avgPerf = departments.length > 0 ? Math.round(departments.reduce((acc, d) => acc + (d.avgPerformance || 0), 0) / departments.length) : 0;
  const activeDepts = departments.filter(d => d.status === 'Active').length;
  const totalTeams = teams.length;


  const handleApplyFilter = (d) => {
    const matchesSearch = !search || 
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.id?.toLowerCase().includes(search.toLowerCase()) ||
      d.head?.toLowerCase().includes(search.toLowerCase()) ||
      d.departmentCode?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchesBranch = branchFilter === 'All' || (d.branch && d.branch.includes(branchFilter));
    
    let matchesPerf = true;
    const perf = d.avgPerformance || 0;
    if (perfFilter === 'High Performance') matchesPerf = perf >= 90;
    else if (perfFilter === 'Average Performance') matchesPerf = perf >= 80 && perf < 90;
    else if (perfFilter === 'Low Performance') matchesPerf = perf < 80;

    return matchesSearch && matchesStatus && matchesBranch && matchesPerf;
  };

  const filteredDepts = departments.filter(handleApplyFilter);

  const handleAddDeptSubmit = async (e) => {
    e.preventDefault();
    if (!newDeptForm.name || !newDeptForm.code || !newDeptForm.head) {
      if (addToast) addToast('error', 'Please fill in all required fields.');
      return;
    }
    const finalBranch = newDeptForm.branch === 'add_custom' ? customBranch.trim() : newDeptForm.branch;
    if (!finalBranch) {
      if (addToast) addToast('error', 'Please enter a custom branch name.');
      return;
    }
    
    const tl = availableTeamLeaders.find(x => x.name === newDeptForm.head);
    const headId = tl ? tl.id : 'EMP-2026-999';

    if (newDeptForm.branch === 'add_custom' && !branchOptions.includes(finalBranch)) {
      setBranchOptions([...branchOptions, finalBranch]);
    }

    if (isEditMode && updateDepartment) {
      const updated = await updateDepartment(editingDeptId, {
        name: newDeptForm.name,
        departmentCode: newDeptForm.code,
        head: newDeptForm.head,
        headId: headId,
        branch: finalBranch,
        description: newDeptForm.description
      });
      if (updated && addActivityLog) {
        await addActivityLog(`Department ${newDeptForm.name} Updated`, 'Departments', 'update');
        setAddDeptOpen(false);
        setNewDeptForm({ name: '', code: '', head: '', branch: defaultBranch, description: '' });
        setShowCustomBranchInput(false);
        setCustomBranch('');
      }
    } else if (addDepartment) {
      const newDeptObj = {
        id: `DEPT-${Date.now().toString().slice(-4)}`,
        name: newDeptForm.name,
        departmentCode: newDeptForm.code,
        head: newDeptForm.head,
        headId: headId,
        employeeCount: 0,
        activeTeams: 0,
        branch: finalBranch,
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
        status: 'Active',
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      };

      const saved = await addDepartment(newDeptObj);
      if (saved && addActivityLog) {
        await addActivityLog(`New Department ${newDeptForm.name} Created`, 'Departments', 'create');
        setAddDeptOpen(false);
        setNewDeptForm({ name: '', code: '', head: '', branch: defaultBranch, description: '' });
        setShowCustomBranchInput(false);
        setCustomBranch('');
      }
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferForm.employee || !transferForm.reason) {
      if (addToast) addToast('error', 'Please fill in all transfer fields.');
      return;
    }
    if (transferForm.source === transferForm.target) {
      if (addToast) addToast('warning', 'Source and target departments must be different.');
      return;
    }

    // Find the actual employee record by ID (transferForm.employee stores the ID)
    const emp = employees.find(em => em.id === transferForm.employee || em.name === transferForm.employee);
    if (!emp) {
      if (addToast) addToast('error', 'Employee not found. Please select a valid employee.');
      return;
    }

    // Find the target department to get the branch info if available
    const targetDept = departments.find(d => d.name === transferForm.target);

    // Build the update payload — update the employee's department (and branch if dept has one)
    const updatePayload = { department: transferForm.target };
    if (targetDept && targetDept.branch) {
      updatePayload.branch = targetDept.branch;
    }

    // Persist to database via updateEmployee
    const updated = await updateEmployee(emp.id, updatePayload);
    if (!updated && updated !== undefined) {
      // updateEmployee shows its own error toast on failure
      return;
    }

    if (addActivityLog) {
      await addActivityLog(
        `Transferred ${emp.name} from ${transferForm.source} to ${transferForm.target}`,
        'Departments',
        'assign'
      );
    }

    setTransferOpen(false);
    if (addToast) addToast('success', `${emp.name} successfully transferred to ${transferForm.target}.`);
    setTransferForm({ employee: '', source: '', target: '', reason: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleExportSubmit = (e) => {
    e.preventDefault();
    setExporting(true);
    setExportProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setExportProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setExporting(false);
          setExportOpen(false);

          const headers = [
            'Department ID',
            'Department Name',
            'Department Code',
            'Department Head',
            'Branch/Location',
            'Description',
            'Status',
            'Workforce Count',
            'Attendance Rate Today (%)',
            'Productivity Score (%)',
            'Active Teams',
            'Active Projects',
            'WFH Filings Today'
          ];
          const rows = departments.map(d => [
            d.id || '',
            d.name || '',
            d.code || '',
            d.head || '',
            d.branch || '',
            d.description || '',
            d.status || 'Active',
            d.employeeCount || 0,
            d.attendanceRate || 0,
            d.avgPerformance || 0,
            d.activeTeams || 0,
            d.activeProjects || 0,
            d.wfhFilings || 0
          ]);

          if (exportFormState.format === 'PDF') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
              const tableHeadersHTML = headers.map(h => `<th>${h}</th>`).join('');
              const tableRowsHTML = rows.map(r => `<tr>${r.map(val => `<td>${val}</td>`).join('')}</tr>`).join('');
              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>${exportFormState.report}</title>
                    <style>
                      body { font-family: sans-serif; padding: 20px; color: #334155; }
                      h1 { color: #0f172a; margin-bottom: 5px; }
                      p { color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                      th { background-color: #f1f5f9; padding: 10px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
                      td { padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; }
                      tr:nth-child(even) td { background-color: #f8fafc; }
                    </style>
                  </head>
                  <body>
                    <h1>${exportFormState.report}</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <table>
                      <thead><tr>${tableHeadersHTML}</tr></thead>
                      <tbody>${tableRowsHTML}</tbody>
                    </table>
                    <script>
                      window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
                    </script>
                  </body>
                </html>
              `);
              printWindow.document.close();
              if (addToast) addToast('success', 'PDF Print window opened.');
            } else {
              if (addToast) addToast('error', 'Pop-up blocked. Please allow popups.');
            }
          } else {
            const csvContent = "\ufeff" + [
              headers.join(','),
              ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `departments_${exportFormState.report.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${exportFormState.format === 'Excel' ? 'xls' : 'csv'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (addToast) addToast('success', `${exportFormState.report} downloaded successfully.`);
          }
        }, 400);
      }
    }, 100);
  };

  const performanceTrendData = departments.map(d => ({
    name: d.name || '',
    Productivity: d.avgPerformance || 0,
    Attendance: d.attendanceRate || 0,
    Projects: (getLiveProjectsCount(d.name) || d.activeProjects || 0) * 20
  }));

  const employeeDistributionChartData = departments.map(d => ({
    name: d.name || '',
    value: getLiveEmpCount(d.name) || d.employeeCount || 0,
    color: d.color || `#${Math.floor(Math.random()*16777215).toString(16)}`
  })).filter(item => item.value > 0);

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
        
        <div className="dept-header-actions">
          {hasPermission('department_management', 'create') && (
            <Button variant="primary" icon={Plus} onClick={() => handleAddClick()}>
              Add Dept
            </Button>
          )}
          {hasPermission('department_management', 'update') && (
            <Button variant="secondary" icon={ArrowRight} onClick={() => setTransferOpen(true)}>
              Transfer Staff
            </Button>
          )}
          {hasPermission('department_management', 'export') && (
            <Button variant="ghost" icon={Download} onClick={() => setExportOpen(true)}>
              Export Reports
            </Button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="dept-navigation-tabcard card">
        <div className="dept-tabs-nav">
          {[
            { id: 'directory', label: 'Department Directory', icon: GitMerge },
            { id: 'analytics', label: 'Performance Analytics', icon: TrendingUp },
            { id: 'teams', label: 'Team Management', icon: Users }
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
          
          <div className="dept-stats-row">
            {[
              { label: 'Total Departments', value: departments.length, icon: GitMerge, color: '#3b82f6', subtitle: 'Total configured sectors' },
              { label: 'Active Departments', value: activeDepts, icon: CheckCircle2, color: '#10b981', subtitle: 'Running operations' },
              { label: 'Total Employees', value: totalEmployees, icon: Users, color: '#06b6d4', subtitle: 'Workforce allocation' },
              { label: 'Active Teams', value: totalTeams, icon: Layers, color: '#8b5cf6', subtitle: 'Functional subgroups' },
              { label: 'Avg Productivity', value: `${avgPerf}%`, icon: TrendingUp, color: '#ef4444', subtitle: 'Department performance' }
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
                  <th>{FIELD_LABELS?.branch || 'Branch'}</th>
                  <th>Workforce Count</th>
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
                        <td><Badge variant="neutral">{getLiveEmpCount(dept.name) || dept.employeeCount || 0} active</Badge></td>
                        <td>
                          <Badge variant={(dept.attendanceRate || 0) >= 92 ? 'success' : 'warning'}>
                            {dept.attendanceRate || 0}%
                          </Badge>
                        </td>
                        <td>
                          <div className="flex-center gap-2">
                            <TrendingUp size={12} style={{ color: (dept.avgPerformance || 0) >= 90 ? 'var(--color-success)' : 'var(--color-warning)' }} />
                            <span className="bold-text">{dept.avgPerformance || 0}%</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={dept.status === 'Active' ? 'success' : 'danger'}>
                            {dept.status}
                          </Badge>
                        </td>
                        <td className="text-xs text-muted">{dept.createdDate}</td>
                        <td>
                          <div className="dept-table-actions">
                            <button className="icon-action-btn" title="View Details" onClick={() => setSelectedDept(dept)}>
                              <Eye size={13} />
                            </button>
                            {hasPermission('department_management', 'update') && (
                              <button className="icon-action-btn" title="Edit" onClick={() => handleEditClick(dept)}>
                                <Edit2 size={13} />
                              </button>
                            )}
                            {hasPermission('department_management', 'delete') && (
                              <button
                                className={`icon-action-btn ${dept.status === 'Active' ? 'text-success' : 'text-muted'}`}
                                title={dept.status === 'Active' ? 'Deactivate Department' : 'Activate Department'}
                                onClick={async () => {
                                  const nextStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
                                  if (updateDepartment) {
                                    await updateDepartment(dept.id, { status: nextStatus });
                                    if (addToast) addToast('success', `Department status updated to ${nextStatus}`);
                                  }
                                }}
                              >
                                <Power size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center py-8 text-muted">
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
                      <span className="legend-val">{item.value} ({totalEmployees > 0 ? Math.round((item.value / totalEmployees) * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
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
          </div>

          <div className="card table-responsive">
            <table className="dept-list-table">
              <thead>
                <tr>
                  <th>Team ID</th>
                  <th>Team Name</th>
                  <th>{FIELD_LABELS?.teamLeader || 'Team Leader'}</th>
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
                    <td><Badge variant="neutral">{team.employeeCount || 0} Members</Badge></td>
                    <td><Badge variant="neutral">{team.activeProjects || 0} Active</Badge></td>
                    <td>
                      <Badge variant={team.status === 'Active' ? 'success' : 'warning'}>
                        {team.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="dept-table-actions">
                        <button className="icon-action-btn" title="View Team Performance" onClick={() => addToast && addToast('info', `Displaying ${team.name} performance metrics...`)}>
                          <TrendingUp size={13} />
                        </button>
                        {hasPermission('team_management', 'update') && (
                          <button className="icon-action-btn" title="Edit Team" onClick={() => addToast && addToast('info', `Editing team ${team.name}...`)}>
                            <Edit2 size={13} />
                          </button>
                        )}
                        {hasPermission('team_management', 'delete') && (
                          <button
                            className={`icon-action-btn ${team.status === 'Active' ? 'text-success' : 'text-muted'}`}
                            title={team.status === 'Active' ? 'Deactivate Team' : 'Activate Team'}
                            onClick={async () => {
                              if (updateTeam) {
                                const nextStatus = team.status === 'Active' ? 'Inactive' : 'Active';
                                await updateTeam(team.id, { status: nextStatus });
                                if (addToast) addToast('success', `Team status updated to ${nextStatus}`);
                              }
                            }}
                          >
                            <Power size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FOOTER NOTICE */}
      <div className="card dept-footer-section flex-center justify-between text-xs text-muted">
        <span>Total Configured Sectors: {departments.length} • Total Registered Subteams: {totalTeams}</span>
        <span>Last Updated Time: Just Now • Department Management System Active</span>
      </div>

      {/* MODAL 1: ADD/EDIT DEPARTMENT */}
      <Modal isOpen={addDeptOpen} onClose={() => setAddDeptOpen(false)} title={isEditMode ? "Edit Department" : "Add Department"} size="md">
        <form onSubmit={handleAddDeptSubmit} className="policy-form flex-column gap-4 py-2">
          <div className="form-group flex-column gap-1">
            <label htmlFor="deptBranch">Branch Location</label>
            <select
              id="deptBranch"
              className="form-control"
              value={newDeptForm.branch}
              onChange={e => {
                const val = e.target.value;
                setNewDeptForm({ ...newDeptForm, branch: val });
                setShowCustomBranchInput(val === 'add_custom');
              }}
            >
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
              onChange={e => setNewDeptForm({ ...newDeptForm, head: e.target.value })}
            >
              <option value="">Select Department Head / Manager</option>
              {availableTeamLeaders.map(tl => (
                <option key={tl.id} value={tl.name}>
                  {tl.name} ({tl.role || 'Team Leader'})
                </option>
              ))}
            </select>
          </div>

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

      {/* MODAL 2: TRANSFER STAFF */}
      <Modal isOpen={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Employees" size="md">
        <form onSubmit={handleTransferSubmit} className="policy-form flex-column gap-4 py-2">
          <div className="form-group flex-column gap-1">
            <label htmlFor="transferEmpName">Employee Name *</label>
            <select
              id="transferEmpName"
              required
              className="form-control"
              value={transferForm.employee}
              onChange={e => {
                const selectedEmp = employees.find(em => em.id === e.target.value);
                setTransferForm(prev => ({
                  ...prev,
                  employee: e.target.value,
                  // Auto-fill source department from the selected employee's current department
                  source: selectedEmp?.department || prev.source
                }));
              }}
            >
              <option value="">Select Employee...</option>
              {employees
                .filter(em => em.roleId !== 'company_admin' && em.roleId !== 'super_admin')
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(em => (
                  <option key={em.id} value={em.id}>
                    {em.name} — {em.department || 'No Dept'} ({em.id})
                  </option>
                ))
              }
            </select>
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

      {/* MODAL 3: EXPORT REPORT */}
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

      {/* MODAL 4: DETAILED DEPARTMENT OVERVIEW */}
      {selectedDept && (
        <Modal
          isOpen={!!selectedDept}
          onClose={() => setSelectedDept(null)}
          title={`Department Detail: ${selectedDept.name}`}
          size="lg"
        >
          <div className="dept-modal-body">
            <div className="dept-modal-head" style={{ borderColor: selectedDept.color }}>
              <div className="dept-modal-icon" style={{ background: `${selectedDept.color}20`, color: selectedDept.color }}>
                <GitMerge size={28} />
              </div>
              <div className="flex-1">
                <div className="flex-between">
                  <h3 className="dept-modal-name">{selectedDept.name}</h3>
                  <Badge variant={selectedDept.status === 'Active' ? 'success' : 'danger'}>{selectedDept.status}</Badge>
                </div>
                <p className="dept-modal-branch">Code: <code>{selectedDept.departmentCode}</code> • Branch Location: {selectedDept.branch} • Founded: {selectedDept.createdDate}</p>
              </div>
            </div>

            <p className="dept-modal-desc">{selectedDept.description || 'No description provided.'}</p>

            <div className="dept-modal-stats-grid">
              <div className="dept-stat-tile">
                <span className="dept-stat-label">Active Employees</span>
                <span className="dept-stat-val" style={{ color: selectedDept.color }}>{getLiveEmpCount(selectedDept.name) || selectedDept.employeeCount || 0}</span>
              </div>
              <div className="dept-stat-tile">
                <span className="dept-stat-label">Subteams Registered</span>
                <span className="dept-stat-val" style={{ color: selectedDept.color }}>{getLiveTeamsCount(selectedDept.name) || selectedDept.activeTeams || 0}</span>
              </div>
              <div className="dept-stat-tile">
                <span className="dept-stat-label">Active Projects</span>
                <span className="dept-stat-val" style={{ color: selectedDept.color }}>{getLiveProjectsCount(selectedDept.name) || selectedDept.activeProjects || 0}</span>
              </div>
              <div className="dept-stat-tile">
                <span className="dept-stat-label">Performance Rating</span>
                <span className="dept-stat-val" style={{ color: selectedDept.color }}>{selectedDept.avgPerformance || 0}%</span>
              </div>
            </div>

            <div className="dept-modal-head-section">
              <span className="dept-stat-label">Department Head Profile</span>
              <div className="dept-head-profile">
                <Avatar name={selectedDept.head} size="md" />
                <div className="flex-1">
                  <span className="dept-head-name">{selectedDept.head}</span>
                  <span className="dept-head-role">Authorized Manager • ID: {selectedDept.headId}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Departments;