import React, { useState, useMemo, useEffect } from 'react';
import './TaskMonitoring.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  KanbanSquare, Plus, AlertCircle, Calendar, Flag, Trophy, Award, Search,
  SlidersHorizontal, ChevronDown, ChevronUp, UserCheck, Clock, RefreshCw, Send,
  CheckSquare, MessageSquare, Download, PanelRightClose, Trash2, Eye, User, FileCode, Check, X,
  AlertTriangle, Play, HelpCircle
} from 'lucide-react';

const TaskMonitoring = () => {
  const isLoading = usePageLoading(600);
  const {
    tasks,
    employees,
    roles,
    currentUserRole,
    currentUser,
    updateTaskStatus,
    addTask,
    deleteTask,
    reassignTask,
    extendTaskDeadline,
    escalateTask,
    addTaskRemarks,
    addTaskComment,
    approveTaskLevel,
    rejectTaskLevel,
    getTaskStats,
    getEmployeeTaskSummary,
    getTeamTaskRanking,
    getDepartmentTaskAnalytics,
    getWorkloadDistribution,
    showConfirm,
    addToast,
    projectsList
  } = useApp();

  // Active Main View: 'kanban', 'list', 'analytics'
  const [activeView, setActiveView] = useState('kanban');

  // Interactive Filter Cards State (matches click behaviors)
  const [activeCardFilter, setActiveCardFilter] = useState('all');

  // Search and Filter Fields State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Sort states for List Tables
  const [teamSortKey, setTeamSortKey] = useState('productivity');
  const [teamSortDir, setTeamSortDir] = useState('desc');

  // Modal & Drawer States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Overdue Actions Modal States
  const [actionTaskId, setActionTaskId] = useState(null);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);
  const [isRemarksOpen, setIsRemarksOpen] = useState(false);

  // Form Inputs States
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTaskRemarks, setNewTaskRemarks] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Gantt Chart View Toggle
  const [ganttViewEnabled, setGanttViewEnabled] = useState(false);

  // Expandable Rows in Employee Table
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);

  // Create Task Form State
  const [createForm, setCreateForm] = useState({
    projectId: '',
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'Medium'
  });

  // When projectsList loads, default the select option
  useEffect(() => {
    if (projectsList && projectsList.length > 0 && !createForm.projectId) {
      setCreateForm(prev => ({ ...prev, projectId: projectsList[0].id }));
    }
  }, [projectsList]);

  // Export Options State
  const [exportOptions, setExportOptions] = useState({
    reportType: 'Task Report',
    dateRange: 'Last 30 days',
    format: 'CSV'
  });

  // Dynamic Date Check constant
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper mapping helpers for Status Columns
  const getDisplayStatus = (statusVal) => {
    switch (statusVal.toLowerCase()) {
      case 'todo':
      case 'assigned':
      case 'to do':
        return 'To Do';
      case 'in progress':
      case 'in_progress':
        return 'In Progress';
      case 'in review':
      case 'under_review':
      case 'review':
        return 'In Review';
      case 'done':
      case 'completed':
        return 'Done';
      case 'pending_approval':
      case 'pending approval':
        return 'Pending Approval';
      case 'overdue':
        return 'Overdue';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'To Do';
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'Critical': return 'danger';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusVariant = (status) => {
    const disp = getDisplayStatus(status);
    switch (disp) {
      case 'Done': return 'success';
      case 'In Progress': return 'primary';
      case 'In Review': return 'info';
      case 'Pending Approval': return 'warning';
      case 'Overdue': return 'danger';
      case 'Cancelled': return 'neutral';
      default: return 'neutral';
    }
  };

  const isTaskOverdue = (task) => {
    const status = getDisplayStatus(task.status);
    if (status === 'Done') return false;
    return task.dueDate < todayStr;
  };

  // Compute live calculations
  const stats = useMemo(() => {
    const total = tasks.length;
    const active = tasks.filter(t => getDisplayStatus(t.status) === 'In Progress').length;
    const completed = tasks.filter(t => getDisplayStatus(t.status) === 'Done').length;
    const pending = tasks.filter(t => getDisplayStatus(t.status) === 'To Do').length;
    const overdue = tasks.filter(isTaskOverdue).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, active, completed, pending, overdue, completionRate };
  }, [tasks]);

  // Filter Tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Interactive top card filter
      if (activeCardFilter === 'active' && getDisplayStatus(t.status) !== 'In Progress') return false;
      if (activeCardFilter === 'completed' && getDisplayStatus(t.status) !== 'Done') return false;
      if (activeCardFilter === 'pending' && getDisplayStatus(t.status) !== 'To Do') return false;
      if (activeCardFilter === 'overdue' && !isTaskOverdue(t)) return false;

      // 2. Search Box
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query) || false;
        const matchesAssignee = t.assigneeName.toLowerCase().includes(query);
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesProject = t.project.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesAssignee && !matchesId && !matchesProject) return false;
      }

      // 3. Dropdowns
      if (statusFilter && getDisplayStatus(t.status) !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (deptFilter && t.department !== deptFilter) return false;
      if (projectFilter && t.project !== projectFilter) return false;

      // 4. Date Filter
      if (dateFilter !== 'all') {
        const createdDate = t.createdAt?.split('T')[0];
        if (dateFilter === 'today' && createdDate !== todayStr) return false;
      }

      return true;
    });
  }, [tasks, activeCardFilter, searchTerm, statusFilter, priorityFilter, deptFilter, projectFilter, dateFilter]);

  // Calculate tables data dynamically
  const employeeSummaries = useMemo(() => {
    return employees.map(emp => {
      const stats = getEmployeeTaskSummary(emp.id);
      let rating = 'Average';
      if (stats.productivity >= 90) rating = 'Excellent';
      else if (stats.productivity >= 70) rating = 'Good';
      else if (stats.productivity >= 50) rating = 'Average';
      else rating = 'Poor';

      return {
        ...emp,
        ...stats,
        rating
      };
    });
  }, [employees, tasks, getEmployeeTaskSummary]);

  const teamRankings = useMemo(() => {
    const list = getTeamTaskRanking();
    return list.sort((a, b) => {
      let av = a[teamSortKey];
      let bv = b[teamSortKey];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return teamSortDir === 'asc' ? -1 : 1;
      if (av > bv) return teamSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, teamSortKey, teamSortDir, getTeamTaskRanking]);

  const projectSummaries = useMemo(() => {
    // Project statistics computed dynamically from tasks
    const map = {};
    tasks.forEach(t => {
      const projName = t.project || 'Unassigned';
      if (!map[projName]) {
        map[projName] = {
          name: projName,
          total: 0,
          completed: 0,
          pending: 0,
          delayed: 0
        };
      }
      map[projName].total++;
      if (getDisplayStatus(t.status) === 'Done') {
        map[projName].completed++;
      } else {
        map[projName].pending++;
        if (isTaskOverdue(t)) {
          map[projName].delayed++;
        }
      }
    });
    return Object.values(map).map(p => {
      const progress = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
      return { ...p, progress };
    });
  }, [tasks]);

  const departmentSummaries = useMemo(() => {
    return getDepartmentTaskAnalytics();
  }, [tasks, getDepartmentTaskAnalytics]);

  const workloadDistribution = useMemo(() => {
    return getWorkloadDistribution();
  }, [employees, tasks, getWorkloadDistribution]);

  const overdueTasksList = useMemo(() => {
    return tasks.filter(isTaskOverdue);
  }, [tasks]);

  // Aggregate recent activities timeline from all tasks
  const recentActivities = useMemo(() => {
    const logs = [];
    tasks.forEach(t => {
      if (t.activityLog) {
        t.activityLog.forEach(log => {
          logs.push({
            ...log,
            taskId: t.id,
            taskTitle: t.title
          });
        });
      }
    });
    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [tasks]);

  // Recharts Chart structures
  const pieData = useMemo(() => {
    return [
      { name: 'Completed', value: stats.completed, color: '#10b981' },
      { name: 'Pending', value: stats.pending + stats.active, color: '#3b82f6' },
      { name: 'Overdue', value: stats.overdue, color: '#ef4444' }
    ];
  }, [stats]);

  const barData = useMemo(() => {
    return departmentSummaries.map(d => ({
      name: d.department,
      Completed: d.completed,
      Pending: d.pending,
      total: d.totalTasks
    }));
  }, [departmentSummaries]);

  // Form submits handlers
  const handleCreateTask = () => {
    if (!createForm.projectId || !createForm.title.trim()) return;
    addTask(createForm);
    setIsCreateOpen(false);
    setCreateForm({
      projectId: projectsList[0]?.id || '',
      title: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'Medium'
    });
  };

  const handleExport = () => {
    addToast('success', `${exportOptions.reportType} generated successfully in ${exportOptions.format} format.`);
    setIsExportOpen(false);
  };

  const handleReassignSubmit = () => {
    if (!newAssigneeId) return;
    const assignee = employees.find(e => e.id === newAssigneeId);
    reassignTask(actionTaskId, newAssigneeId, assignee ? assignee.name : 'Unassigned');
    setIsReassignOpen(false);
    setActionTaskId(null);
    setNewAssigneeId('');
    // Sync drawer detail if open
    if (selectedTask && selectedTask.id === actionTaskId) {
      setSelectedTask(prev => ({
        ...prev,
        assigneeId: newAssigneeId,
        assigneeName: assignee ? assignee.name : 'Unassigned'
      }));
    }
  };

  const handleDeadlineSubmit = () => {
    if (!newDueDate) return;
    extendTaskDeadline(actionTaskId, newDueDate);
    setIsDeadlineOpen(false);
    setActionTaskId(null);
    setNewDueDate('');
    if (selectedTask && selectedTask.id === actionTaskId) {
      setSelectedTask(prev => ({ ...prev, dueDate: newDueDate }));
    }
  };

  const handleRemarksSubmit = () => {
    addTaskRemarks(actionTaskId, newTaskRemarks);
    setIsRemarksOpen(false);
    setActionTaskId(null);
    setNewTaskRemarks('');
  };

  const handleAddCommentSubmit = () => {
    if (!newCommentText.trim()) return;
    addTaskComment(selectedTask.id, newCommentText, currentUser?.name || 'Aarav Sharma', currentUser?.role || 'Super Admin');
    setNewCommentText('');
    // refresh details
    const updatedTask = tasks.find(t => t.id === selectedTask.id);
    if (updatedTask) {
      setSelectedTask(updatedTask);
    }
  };

  const handleApproveLevel = (level) => {
    approveTaskLevel(selectedTask.id, level, 'Approved at level ' + level, currentUser?.name);
    const updated = tasks.find(t => t.id === selectedTask.id);
    if (updated) setSelectedTask(updated);
  };

  const handleRejectLevel = (level) => {
    rejectTaskLevel(selectedTask.id, level, 'Rejected at level ' + level, currentUser?.name);
    const updated = tasks.find(t => t.id === selectedTask.id);
    if (updated) setSelectedTask(updated);
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (e, targetCol) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      // Map display columns back to DB status keys
      let statusVal = 'todo';
      if (targetCol === 'In Progress') statusVal = 'in_progress';
      else if (targetCol === 'In Review') statusVal = 'review';
      else if (targetCol === 'Done') statusVal = 'done';
      updateTaskStatus(taskId, statusVal);
    }
  };

  if (isLoading) {
    return (
      <div className="task-monitoring-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="kanban-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card column-card" style={{ height: '400px' }}><Skeleton variant="rect" height="100%" /></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="task-monitoring-page flex-column grid-gap">
      
      {/* ── Page Header ── */}
      <div className="page-header-row">
        <div>
          <h2>Task Monitoring Console</h2>
          <p className="page-desc-text">Centralized tracking, team productivity rankings, and automation status monitoring</p>
        </div>
        <div className="flex-center gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => setIsExportOpen(true)} icon={Download}>Export Report</Button>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)} icon={Plus}>Create Task</Button>
        </div>
      </div>

      {/* ── Section 1: Top Summary Cards ── */}
      <div className="task-summary-grid">
        <div className={`card stat-metric-card border-left-neutral cursor-pointer ${activeCardFilter === 'all' ? 'active-card-filter' : ''}`} onClick={() => setActiveCardFilter('all')}>
          <span className="card-lbl-gray">Total Tasks</span>
          <div className="card-value-display text-white">{stats.total}</div>
          <span className="card-sub-desc">Global catalog</span>
        </div>
        <div className={`card stat-metric-card border-left-primary cursor-pointer ${activeCardFilter === 'active' ? 'active-card-filter' : ''}`} onClick={() => setActiveCardFilter('active')}>
          <span className="card-lbl-gray">Active Tasks</span>
          <div className="card-value-display text-primary">{stats.active}</div>
          <span className="card-sub-desc">In execution</span>
        </div>
        <div className={`card stat-metric-card border-left-success cursor-pointer ${activeCardFilter === 'completed' ? 'active-card-filter' : ''}`} onClick={() => setActiveCardFilter('completed')}>
          <span className="card-lbl-gray">Completed Tasks</span>
          <div className="card-value-display text-success">{stats.completed}</div>
          <span className="card-sub-desc">Delivered successfully</span>
        </div>
        <div className={`card stat-metric-card border-left-warning cursor-pointer ${activeCardFilter === 'pending' ? 'active-card-filter' : ''}`} onClick={() => setActiveCardFilter('pending')}>
          <span className="card-lbl-gray">Pending Tasks</span>
          <div className="card-value-display text-warning">{stats.pending}</div>
          <span className="card-sub-desc">To Do list</span>
        </div>
        <div className={`card stat-metric-card border-left-danger cursor-pointer ${activeCardFilter === 'overdue' ? 'active-card-filter' : ''}`} onClick={() => setActiveCardFilter('overdue')}>
          <span className="card-lbl-gray">Overdue Tasks</span>
          <div className="card-value-display text-danger">{stats.overdue}</div>
          <span className="card-sub-desc">Past deadline</span>
        </div>
        <div className="card stat-metric-card border-left-purple">
          <span className="card-lbl-gray">Completion Rate</span>
          <div className="card-value-display text-purple">{stats.completionRate}%</div>
          <div className="progress-bar-mini" style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px' }}>
            <div style={{ width: `${stats.completionRate}%`, height: '100%', background: 'var(--color-purple)', borderRadius: '2px' }} />
          </div>
        </div>
      </div>

      {/* ── Section 2: Search & Filters Bar ── */}
      <div className="card filters-card">
        <div className="filters-grid">
          <div className="filter-input-wrapper">
            <Search size={16} className="filter-search-icon" />
            <input
              type="text"
              placeholder="Search by ID, name, assignee or project..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="filter-search-field"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Operations">Operations</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Finance">Finance</option>
          </select>
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            {projectSummaries.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="all">All Dates</option>
            <option value="today">Created Today</option>
          </select>
          {(searchTerm || statusFilter || priorityFilter || deptFilter || projectFilter || dateFilter !== 'all' || activeCardFilter !== 'all') && (
            <Button variant="ghost" onClick={() => { setSearchTerm(''); setStatusFilter(''); setPriorityFilter(''); setDeptFilter(''); setProjectFilter(''); setDateFilter('all'); setActiveCardFilter('all'); }}>Clear</Button>
          )}
        </div>
      </div>

      {/* ── Section 4: View Toggle Toolbar ── */}
      <div className="view-toggle-toolbar card glass flex-row justify-between flex-wrap gap-3">
        <div className="tab-buttons-group">
          <button className={`view-tab-btn ${activeView === 'kanban' ? 'active' : ''}`} onClick={() => setActiveView('kanban')}>
            <KanbanSquare size={16} />
            <span>Board</span>
          </button>
          <button className={`view-tab-btn ${activeView === 'list' ? 'active' : ''}`} onClick={() => setActiveView('list')}>
            <SlidersHorizontal size={16} />
            <span>Data Lists View</span>
          </button>
          <button className={`view-tab-btn ${activeView === 'analytics' ? 'active' : ''}`} onClick={() => setActiveView('analytics')}>
            <Clock size={16} />
            <span>Analytics & Feeds</span>
          </button>
        </div>
        <div className="flex-center gap-2">
          {activeView === 'list' && (
            <button className="toggle-cols-btn" onClick={() => setGanttViewEnabled(prev => !prev)}>
              <span>{ganttViewEnabled ? '📊 Show Metrics Table' : '🗓️ Show Timeline (Gantt)'}</span>
            </button>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Filtered: <strong>{filteredTasks.length}</strong> tasks</span>
        </div>
      </div>

      {/* ── Section 5: KANBAN VIEW ── */}
      {activeView === 'kanban' && (
        <div className="kanban-grid">
          {['To Do', 'In Progress', 'In Review', 'Done'].map(col => {
            const colTasks = filteredTasks.filter(t => getDisplayStatus(t.status) === col);
            return (
              <div
                key={col}
                className="kanban-column"
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col)}
              >
                <div className="column-header">
                  <div className="column-title-group">
                    <span className={`column-dot dot-var-${col.replace(/\s+/g, '').toLowerCase()}`} />
                    <h4>{col}</h4>
                  </div>
                  <span className="column-card-count">{colTasks.length}</span>
                </div>
                <div className="column-cards-container">
                  {colTasks.length > 0 ? (
                    colTasks.map(task => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <div
                          key={task.id}
                          className={`kanban-card cursor-grab ${overdue ? 'card-border-overdue' : ''}`}
                          draggable={true}
                          onDragStart={e => handleDragStart(e, task.id)}
                          onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                        >
                          <h5 className="task-card-title">{task.title}</h5>
                          <div className="flex-row justify-between" style={{ marginTop: '2px' }}>
                            <span className="task-card-project">{task.project}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{task.id}</span>
                          </div>
                          <div className="task-card-footer">
                            <div className="task-card-meta">
                              <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                              {overdue && <Badge variant="danger">Overdue</Badge>}
                              <div className={`task-due-date-badge ${overdue ? 'text-danger-bold' : ''}`}>
                                <Calendar size={12} />
                                <span>{task.dueDate}</span>
                              </div>
                            </div>
                            <Avatar name={task.assigneeName} size="sm" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="column-empty-state">No tasks in this list</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section 6-11: LIST VIEW ── */}
      {activeView === 'list' && (
        <div className="flex-column grid-gap">
          
          {/* Employee Task Monitoring Table */}
          <div className="card table-wrapper-card">
            <div className="table-toolbar">
              <span className="table-count-label">Employee Task Performance monitoring</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Overdue</th>
                    <th>Productivity Score</th>
                    <th>Performance Rating</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSummaries.map(emp => (
                    <React.Fragment key={emp.id}>
                      <tr className="cursor-pointer" onClick={() => setExpandedEmployeeId(expandedEmployeeId === emp.id ? null : emp.id)}>
                        <td style={{ minWidth: '240px' }}>
                          <div className="flex-center gap-2 justify-start">
                            <Avatar name={emp.name} size="sm" />
                            <div className="flex-column" style={{ whiteSpace: 'nowrap' }}>
                              <strong>{emp.name}</strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.designation} ({emp.department})</span>
                            </div>
                          </div>
                        </td>
                        <td><Badge variant="neutral">{emp.assigned}</Badge></td>
                        <td><Badge variant="success">{emp.completed}</Badge></td>
                        <td><Badge variant="info">{emp.pending}</Badge></td>
                        <td>
                          <span className={emp.overdue > 0 ? 'text-danger-bold' : ''}>
                            {emp.overdue}
                          </span>
                        </td>
                        <td>
                          <div className="flex-center gap-2 justify-start">
                            <div className="progress-bar-mini" style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                              <div style={{ width: `${emp.productivity}%`, height: '100%', background: 'var(--color-success)', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem' }}>{emp.productivity}%</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={emp.rating === 'Excellent' ? 'success' : emp.rating === 'Good' ? 'primary' : emp.rating === 'Average' ? 'warning' : 'danger'}>
                            {emp.rating}
                          </Badge>
                        </td>
                        <td>
                          <Button variant="ghost" size="sm">
                            {expandedEmployeeId === emp.id ? 'Hide Details' : 'Show Details'}
                          </Button>
                        </td>
                      </tr>
                      {expandedEmployeeId === emp.id && (
                        <tr>
                          <td colSpan="8" style={{ background: 'rgba(255,255,255,0.01)', padding: '12px var(--spacing-5)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Trend (Last 7 days)</span>
                                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Optimal Output</strong>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Avg completion time: 2.4 days per task</span>
                              </div>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weekly compliance</span>
                                <strong style={{ fontSize: '1rem', color: 'var(--color-success)' }}>96% compliance rate</strong>
                              </div>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current shift</span>
                                <span style={{ display: 'block', fontSize: '0.85rem' }}>{emp.shift || 'Flexible Shift'}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team Performance Ranking */}
          <div className="card table-wrapper-card">
            <div className="table-toolbar justify-between">
              <span className="table-count-label">Team Performance Ranking</span>
              <div className="flex-center gap-2">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sort by:</span>
                <select value={teamSortKey} onChange={e => setTeamSortKey(e.target.value)} style={{ padding: '4px', fontSize: '0.75rem' }}>
                  <option value="productivity">Productivity</option>
                  <option value="totalTasks">Total Tasks</option>
                </select>
                <button className="toggle-cols-btn" onClick={() => setTeamSortDir(d => d === 'asc' ? 'desc' : 'asc')} style={{ padding: '4px 8px' }}>
                  {teamSortDir === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team Name</th>
                    <th>Team Leader</th>
                    <th>Total Tasks</th>
                    <th>Completed Tasks</th>
                    <th>Productivity</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRankings.map((team, index) => (
                    <tr key={team.name}>
                      <td>
                        <div className="flex-center gap-2 justify-start">
                          <strong>#{index + 1}</strong>
                          {index === 0 ? '🏆' : index === teamRankings.length - 1 ? '⚠️' : ''}
                        </div>
                      </td>
                      <td><strong>{team.name}</strong></td>
                      <td>{team.leader}</td>
                      <td>{team.totalTasks}</td>
                      <td>{team.completedTasks}</td>
                      <td>
                        <div className="flex-center gap-2 justify-start">
                          <div className="progress-bar-mini" style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                            <div style={{ width: `${team.productivity}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '3px' }} />
                          </div>
                          <span>{team.productivity}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Project Task Monitoring & Gantt Toggle */}
          <div className="card table-wrapper-card">
            <div className="table-toolbar justify-between">
              <span className="table-count-label">Project Milestone & Deliverables tracker</span>
            </div>
            
            {ganttViewEnabled ? (
              <div className="gantt-chart-container" style={{ padding: '20px var(--spacing-5)' }}>
                <h4 style={{ marginBottom: '16px' }}>Project Timelines & Gantt Schedule</h4>
                <div className="gantt-chart-wrapper flex-column gap-3">
                  {projectSummaries.map(p => (
                    <div key={p.name} className="gantt-row flex-column" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <div className="flex-row justify-between">
                        <strong>{p.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progress: {p.progress}% ({p.completed}/{p.total} tasks)</span>
                      </div>
                      <div className="gantt-bar-track" style={{ width: '100%', height: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginTop: '6px', position: 'relative', overflow: 'hidden' }}>
                        <div className="gantt-bar-fill flex-center text-white" style={{ width: `${p.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary-light), var(--color-primary))', borderRadius: '12px', fontSize: '0.7rem' }}>
                          {p.progress > 15 ? p.progress + '%' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Total Tasks</th>
                      <th>Completed</th>
                      <th>Pending</th>
                      <th>Delayed</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectSummaries.map(p => (
                      <tr key={p.name}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.total}</td>
                        <td><Badge variant="success">{p.completed}</Badge></td>
                        <td><Badge variant="info">{p.pending}</Badge></td>
                        <td>
                          <Badge variant={p.delayed > 0 ? 'danger' : 'neutral'}>
                            {p.delayed} Delayed
                          </Badge>
                        </td>
                        <td>
                          <div className="flex-center gap-2 justify-start">
                            <div className="progress-bar-mini" style={{ width: '100px', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                              <div style={{ width: `${p.progress}%`, height: '100%', background: 'var(--color-purple)', borderRadius: '4px' }} />
                            </div>
                            <strong>{p.progress}%</strong>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Workload Distribution */}
          <div className="card table-wrapper-card">
            <div className="table-toolbar">
              <span className="table-count-label">Workload Distribution & Allocation</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Assigned Tasks</th>
                    <th>Pending</th>
                    <th>Overdue</th>
                    <th>Workload Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadDistribution.slice(0, 10).map(w => (
                    <tr key={w.id}>
                      <td>
                        <div className="flex-center gap-2 justify-start">
                          <Avatar name={w.name} size="sm" />
                          <span>{w.name}</span>
                        </div>
                      </td>
                      <td>{w.assignedTasks}</td>
                      <td>{w.pendingTasks}</td>
                      <td>
                        <span className={w.overdueTasks > 0 ? 'text-danger-bold' : ''}>
                          {w.overdueTasks}
                        </span>
                      </td>
                      <td>
                        <Badge variant={w.workloadStatus === 'Normal' ? 'success' : w.workloadStatus === 'Balanced' ? 'primary' : w.workloadStatus === 'High' ? 'warning' : 'danger'}>
                          {w.workloadStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overdue Task Management */}
          <div className="card table-wrapper-card">
            <div className="table-toolbar">
              <span className="table-count-label">Overdue Tasks Action board</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Task Name</th>
                    <th>Employee</th>
                    <th>Due Date</th>
                    <th>Delay</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueTasksList.length > 0 ? (
                    overdueTasksList.map(task => {
                      const delayDays = Math.round((new Date(todayStr) - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={task.id}>
                          <td><strong>{task.id}</strong></td>
                          <td>{task.title}</td>
                          <td>{task.assigneeName}</td>
                          <td className="text-danger-bold">{task.dueDate}</td>
                          <td>
                            <Badge variant="danger">{delayDays} days delay</Badge>
                          </td>
                          <td>
                            <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                          </td>
                          <td>
                            <div className="flex-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setActionTaskId(task.id); setIsReassignOpen(true); }}>Reassign</Button>
                              <Button variant="ghost" size="sm" onClick={() => { setActionTaskId(task.id); setIsDeadlineOpen(true); }}>Extend</Button>
                              <Button variant="ghost" size="sm" onClick={() => escalateTask(task.id)}>Escalate</Button>
                              <Button variant="ghost" size="sm" onClick={() => { setActionTaskId(task.id); setIsRemarksOpen(true); }}>Remarks</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        ✓ All task schedules are current! No overdue tasks flagged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department-wise Analytics */}
          <div className="card table-wrapper-card">
            <div className="table-toolbar">
              <span className="table-count-label">Department-wise Task Allocation & Completion</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="emp-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Total Tasks</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentSummaries.map(d => (
                    <tr key={d.department} className="cursor-pointer" onClick={() => setDeptFilter(d.department)}>
                      <td><strong>{d.department}</strong></td>
                      <td>{d.totalTasks}</td>
                      <td><Badge variant="success">{d.completed}</Badge></td>
                      <td><Badge variant="info">{d.pending}</Badge></td>
                      <td>
                        <div className="flex-center gap-2 justify-start">
                          <div className="progress-bar-mini" style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                            <div style={{ width: `${d.completionRate}%`, height: '100%', background: 'var(--color-purple)', borderRadius: '3px' }} />
                          </div>
                          <span>{d.completionRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ── Section 3 & 12: ANALYTICS VIEW ── */}
      {activeView === 'analytics' && (
        <div className="flex-column grid-gap">
          
          {/* Charts Row */}
          <div className="tasks-analytics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Pie Chart */}
            <div className="card text-center flex-column justify-center" style={{ height: '340px' }}>
              <h4 style={{ marginBottom: '16px' }}>Task status Distribution</h4>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="card text-center flex-column justify-center" style={{ height: '340px' }}>
              <h4 style={{ marginBottom: '16px' }}>Department-wise task metrics</h4>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="Completed" fill="#10b981" stackId="a" />
                    <Bar dataKey="Pending" fill="#3b82f6" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Task Activities Feed */}
          <div className="card table-wrapper-card">
            <div className="table-toolbar">
              <span className="table-count-label">Recent Task activities history</span>
            </div>
            <div className="activities-feed-list" style={{ padding: '16px var(--spacing-5)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentActivities.length > 0 ? (
                recentActivities.map(act => (
                  <div key={act.id} className="activity-feed-item flex-row gap-3 justify-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                    <div className="flex-center gap-2 justify-start">
                      <Avatar name={act.userName} size="sm" />
                      <div className="flex-column">
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          <strong>{act.userName}</strong> {act.details}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Task: {act.taskTitle} ({act.taskId})
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{act.timestamp}</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>No activities logged.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── Task Details Modal Drawer (Slide-Over Simulation) ── */}
      {isDetailOpen && selectedTask && (
        <div className="slide-over-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="slide-over-card" onClick={e => e.stopPropagation()}>
            <div className="slide-over-header flex-row justify-between">
              <div>
                <h3>{selectedTask.title}</h3>
                <span className="slide-over-proj-lbl">{selectedTask.project} ({selectedTask.id})</span>
              </div>
              <button className="topbar-icon-btn" onClick={() => setIsDetailOpen(false)}>
                <PanelRightClose size={20} />
              </button>
            </div>

            <div className="slide-over-body flex-column gap-4">
              
              {/* Task Details Info Grid */}
              <div className="detail-info-grid">
                <div className="info-field">
                  <span className="info-lbl">Assignee</span>
                  <div className="flex-center gap-2 justify-start" style={{ marginTop: '4px' }}>
                    <Avatar name={selectedTask.assigneeName} size="sm" />
                    <strong>{selectedTask.assigneeName}</strong>
                  </div>
                </div>
                <div className="info-field">
                  <span className="info-lbl">Department</span>
                  <span className="info-val">{selectedTask.department}</span>
                </div>
                <div className="info-field">
                  <span className="info-lbl">Priority</span>
                  <div style={{ marginTop: '4px' }}><Badge variant={getPriorityVariant(selectedTask.priority)}>{selectedTask.priority}</Badge></div>
                </div>
                <div className="info-field">
                  <span className="info-lbl">Estimated Hours</span>
                  <span className="info-val">{selectedTask.estimatedHours} hrs</span>
                </div>
                <div className="info-field">
                  <span className="info-lbl">Due Date</span>
                  <span className={`info-val ${isTaskOverdue(selectedTask) ? 'text-danger-bold' : ''}`}>{selectedTask.dueDate}</span>
                </div>
                <div className="info-field">
                  <span className="info-lbl">Status</span>
                  <div style={{ marginTop: '4px' }}><Badge variant={getStatusVariant(selectedTask.status)}>{getDisplayStatus(selectedTask.status)}</Badge></div>
                </div>
              </div>

              {/* Progress Slider Bar */}
              <div className="info-field">
                <span className="info-lbl">Task Progress ({selectedTask.progress}%)</span>
                <div className="progress-bar-mini" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '6px' }}>
                  <div style={{ width: `${selectedTask.progress}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Task Description */}
              <div className="info-field">
                <span className="info-lbl">Task Description</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', lineHeight: 1.4 }}>
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

              {/* Approvals Sequence */}
              <div className="info-field">
                <span className="info-lbl">Approval Flow timeline</span>
                <div className="approval-sequence-list flex-column gap-2" style={{ marginTop: '8px' }}>
                  {(selectedTask.approvals || []).map((app) => (
                    <div key={app.level} className="approval-sequence-item flex-row justify-between" style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      <div className="flex-column">
                        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>L{app.level}: {app.role}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{app.approver} {app.timestamp ? `(${app.timestamp})` : ''}</span>
                      </div>
                      <div className="flex-center gap-2">
                        <Badge variant={app.status === 'Approved' ? 'success' : app.status === 'Rejected' ? 'danger' : 'warning'}>
                          {app.status}
                        </Badge>
                        {app.status === 'Pending' && (currentUserRole === 'super_admin' || (currentUserRole === 'manager' && app.level === 3) || (currentUserRole === 'team_leader' && app.level === 2)) && (
                          <div className="flex-center gap-1">
                            <button className="action-circle-btn approve-btn" onClick={() => handleApproveLevel(app.level)} title="Approve">✓</button>
                            <button className="action-circle-btn reject-btn" onClick={() => handleRejectLevel(app.level)} title="Reject">✗</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="info-field">
                <span className="info-lbl">Attachments ({selectedTask.attachments?.length || 0})</span>
                <div className="attachments-list flex-column gap-2" style={{ marginTop: '6px' }}>
                  {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                    selectedTask.attachments.map(att => (
                      <div key={att.id} className="attachment-file-row flex-row justify-between" style={{ padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.78rem' }}>
                        <span>📎 {att.name} ({att.size})</span>
                        <Button variant="ghost" size="sm">Download</Button>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No attachments uploaded.</span>
                  )}
                </div>
              </div>

              {/* Comment Feed & Discussions Thread */}
              <div className="info-field flex-column gap-2">
                <span className="info-lbl">Discussions Thread</span>
                <div className="comments-chat-wrapper flex-column gap-2" style={{ maxHeight: '200px', overflowY: 'auto', padding: '6px' }}>
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map(c => (
                      <div key={c.id} className="comment-bubble flex-column" style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div className="flex-row justify-between" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                          <span style={{ color: 'var(--color-primary)' }}>{c.sender} ({c.role})</span>
                          <span style={{ color: 'var(--text-muted)' }}>{c.time}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: '12px' }}>No discussions yet. Start the thread below!</span>
                  )}
                </div>
                
                {/* Comment Input */}
                <div className="comment-post-box flex-row gap-2" style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Type a comment or tag members using @..."
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  />
                  <Button variant="primary" size="sm" onClick={handleAddCommentSubmit} icon={Send}>Post</Button>
                </div>
              </div>

            </div>

            <div className="slide-over-footer flex-row justify-between">
              <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>Close</Button>
              <Button variant="danger" onClick={() => {
                showConfirm('Delete Task', `Are you sure you want to delete task "${selectedTask.title}"?`, () => {
                  deleteTask(selectedTask.id);
                  setIsDetailOpen(false);
                }, 'danger');
              }} icon={Trash2}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Task Modal ── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Project Task"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateTask} disabled={!createForm.projectId || !createForm.title.trim()}>Create Task</Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Target Project *</label>
            <select
              value={createForm.projectId}
              onChange={e => setCreateForm(prev => ({ ...prev, projectId: e.target.value }))}
              required
            >
              <option value="">Select a project...</option>
              {(projectsList || []).map(p => (
                <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Task Title *</label>
            <input
              type="text"
              placeholder="e.g. Perform compliance checklist audit"
              value={createForm.title}
              onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label>Task Due Date *</label>
            <input
              type="date"
              value={createForm.dueDate}
              onChange={e => setCreateForm(prev => ({ ...prev, dueDate: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label>Priority</label>
            <select
              value={createForm.priority}
              onChange={e => setCreateForm(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Export Report Modal ── */}
      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Task Analytics Report"
        size="sm"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsExportOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleExport}>Export Report</Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Report Type</label>
            <select value={exportOptions.reportType} onChange={e => setExportOptions(prev => ({ ...prev, reportType: e.target.value }))}>
              <option value="Task Report">Task Completion Report</option>
              <option value="Employee Report">Employee Productivity Audit</option>
              <option value="Team Report">Team Performance Analysis</option>
            </select>
          </div>
          <div className="form-field">
            <label>Date Scope</label>
            <select value={exportOptions.dateRange} onChange={e => setExportOptions(prev => ({ ...prev, dateRange: e.target.value }))}>
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
            </select>
          </div>
          <div className="form-field">
            <label>Download Format</label>
            <select value={exportOptions.format} onChange={e => setExportOptions(prev => ({ ...prev, format: e.target.value }))}>
              <option value="CSV">Comma Separated (CSV)</option>
              <option value="Excel">Microsoft Excel (XLSX)</option>
              <option value="PDF">Document Format (PDF)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Reassign Task Modal ── */}
      <Modal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        title="Reassign Task Allocation"
        size="sm"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsReassignOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleReassignSubmit} disabled={!newAssigneeId}>Reassign</Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Select New Assignee *</label>
            <select value={newAssigneeId} onChange={e => setNewAssigneeId(e.target.value)}>
              <option value="">Choose employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Extend Deadline Modal ── */}
      <Modal
        isOpen={isDeadlineOpen}
        onClose={() => setIsDeadlineOpen(false)}
        title="Extend Task Schedule Deadline"
        size="sm"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsDeadlineOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleDeadlineSubmit} disabled={!newDueDate}>Extend</Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Select New Deadline Date *</label>
            <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} required />
          </div>
        </div>
      </Modal>

      {/* ── Add Remarks Modal ── */}
      <Modal
        isOpen={isRemarksOpen}
        onClose={() => setIsRemarksOpen(false)}
        title="Add Administrative Remarks"
        size="sm"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsRemarksOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRemarksSubmit}>Add Remarks</Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Remarks / Notes</label>
            <textarea
              placeholder="Add audit reasons or scheduling context here..."
              value={newTaskRemarks}
              onChange={e => setNewTaskRemarks(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* ── Footer Sticky Info ── */}
      <footer className="tasks-footer card flex-row justify-between flex-wrap gap-2">
        <div className="flex-center gap-3">
          <span>Catalog Tasks: <strong>{stats.total}</strong></span>
          <span style={{ width: '1px', height: '12px', background: 'var(--border-color)' }} />
          <span>Active In Progress: <strong>{stats.active}</strong></span>
          <span style={{ width: '1px', height: '12px', background: 'var(--border-color)' }} />
          <span>Last Synced: <strong>Just now</strong></span>
        </div>
        <div className="flex-center gap-2">
          <span>System Operation:</span>
          <span className="live-dot pulse-dot" style={{ display: 'inline-block', position: 'static' }} />
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
        </div>
      </footer>

    </div>
  );
};

export default TaskMonitoring;
