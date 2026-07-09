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
  AlertTriangle, Play, HelpCircle, ThumbsUp, RotateCcw, Hourglass, ClipboardCheck,
  CheckCircle2, XCircle, ArrowRight, Activity, Zap, Star
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
    updateTaskProgress,
    addTask,
    deleteTask,
    reassignTask,
    extendTaskDeadline,
    escalateTask,
    addTaskRemarks,
    addTaskComment,
    approveTaskLevel,
    rejectTaskLevel,
    // New lifecycle functions
    acceptTask,
    rejectTask,
    startWork,
    sendToReview,
    approveTask,
    reassignToInProgress,
    getTaskStats,
    getEmployeeTaskSummary,
    getTeamTaskRanking,
    getDepartmentTaskAnalytics,
    getWorkloadDistribution,
    showConfirm,
    addToast,
    projectsList,
    hasPermission
  } = useApp();

  const [perspective, setPerspective] = useState(() => {
    if (currentUserRole === 'employee') return 'self';
    const hasCompanyRead = hasPermission('task_monitoring', 'read', 'company');
    const hasSelfRead = hasPermission('task_monitoring', 'read', 'self');

    const saved = localStorage.getItem('perspective_tasks');
    if (saved === 'self' && hasSelfRead) return 'self';
    if (saved === 'company' && hasCompanyRead) return 'company';

    return hasCompanyRead ? 'company' : 'self';
  });

  const showPerspectiveDropdown = useMemo(() => {
    if (currentUserRole === 'employee') return false;
    const hasCompanyRead = hasPermission('task_monitoring', 'read', 'company');
    const hasSelfRead = hasPermission('task_monitoring', 'read', 'self');
    return hasCompanyRead && hasSelfRead;
  }, [currentUserRole, hasPermission]);

  useEffect(() => {
    if (currentUserRole !== 'employee') {
      localStorage.setItem('perspective_tasks', perspective);
    }
  }, [perspective, currentUserRole]);

  useEffect(() => {
    if (currentUserRole === 'employee') {
      setPerspective('self');
    } else {
      const hasCompanyRead = hasPermission('task_monitoring', 'read', 'company');
      const hasSelfRead = hasPermission('task_monitoring', 'read', 'self');
      const saved = localStorage.getItem('perspective_tasks');
      if (saved === 'self' && hasSelfRead) {
        setPerspective('self');
      } else if (saved === 'company' && hasCompanyRead) {
        setPerspective('company');
      } else {
        setPerspective(hasCompanyRead ? 'company' : 'self');
      }
    }
  }, [currentUserRole, hasPermission]);

  const isEmployeeView = perspective === 'self';
  const isCompanyView = perspective === 'company';

  const scopedEmployees = useMemo(() => {
    if (isEmployeeView && currentUser) {
      return employees.filter(e => e.id === currentUser?.id);
    }
    if (!currentUserRole || currentUserRole === 'super_admin') return employees;
    if (currentUserRole === 'branch_admin') {
      return employees.filter(e => e.branch === currentUser?.branch);
    }
    if (currentUserRole === 'dept_admin' || currentUserRole === 'team_leader') {
      return employees.filter(e => e.department === currentUser?.department);
    }
    return employees;
  }, [employees, currentUser, currentUserRole, isEmployeeView]);

  const scopedTasksList = useMemo(() => {
    if (isEmployeeView && currentUser) {
      return tasks.filter(t => t.assigneeId === currentUser?.id || t.assigneeName === currentUser?.name);
    }
    if (!currentUserRole || currentUserRole === 'super_admin') return tasks;
    return tasks.filter(t => {
      const assignee = employees.find(e => e.id === t.assigneeId || e.name === t.assigneeName);
      if (currentUserRole === 'branch_admin') {
        return t.branch === currentUser?.branch || assignee?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'dept_admin' || currentUserRole === 'team_leader') {
        return t.department === currentUser?.department || assignee?.department === currentUser?.department;
      }
      return true;
    });
  }, [tasks, employees, currentUser, currentUserRole, isEmployeeView]);

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

  // Sync selectedTask with latest projectsList data in real-time
  useEffect(() => {
    if (!selectedTask?.id) return;
    const project = (projectsList || []).find(p => p && Array.isArray(p.tasks) && p.tasks.some(t => t && t.id === selectedTask.id));
    if (project) {
      const task = project.tasks.find(t => t && t.id === selectedTask.id);
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [projectsList, selectedTask?.id]);

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

  // Loading state when creating a task to prevent double submissions
  const [isCreating, setIsCreating] = useState(false);

  // Create Task Form State
  const [createForm, setCreateForm] = useState({
    projectId: '',
    title: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'Medium',
    assigneeId: ''
  });

  // Filter assignees to only show members of the selected project
  const filteredAssignees = useMemo(() => {
    if (!createForm.projectId) return [];
    const selectedProj = (projectsList || []).find(p => p.id === createForm.projectId);
    if (!selectedProj) return [];
    const projectMembers = selectedProj.members || [];
    const projectLeader = selectedProj.leader;
    const projectManager = selectedProj.manager;
    
    return scopedEmployees.filter(emp => {
      const empNameLower = (emp.name || '').trim().toLowerCase();
      const isMember = projectMembers.some(m => (m || '').trim().toLowerCase() === empNameLower);
      const isLeader = projectLeader && (projectLeader || '').trim().toLowerCase() === empNameLower;
      const isManager = projectManager && (projectManager || '').trim().toLowerCase() === empNameLower;
      return isMember || isLeader || isManager;
    });
  }, [createForm.projectId, projectsList, scopedEmployees]);

  // Lifecycle Modal States
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTaskId, setRejectTaskId] = useState(null);
  const [isReviewReassignOpen, setIsReviewReassignOpen] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewReassignTaskId, setReviewReassignTaskId] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null); // taskId of task being actioned

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
    if (!statusVal) return 'Pending Acceptance';
    switch (statusVal.toLowerCase().trim()) {
      case 'pending acceptance':
      case 'pending_acceptance':
        return 'Pending Acceptance';
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
        return 'Completed';
      case 'pending_approval':
      case 'pending approval':
        return 'Pending Acceptance';
      case 'overdue':
        return 'Overdue';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending Acceptance';
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
      case 'Completed': return 'success';
      case 'In Progress': return 'warning';
      case 'In Review': return 'info';
      case 'To Do': return 'primary';
      case 'Pending Acceptance': return 'neutral';
      case 'Overdue': return 'danger';
      case 'Cancelled': return 'neutral';
      default: return 'neutral';
    }
  };

  // Helper: is the current user the task's original assigner?
  const isTaskReviewer = (task) => {
    if (task?.assignedById) return task.assignedById === currentUser?.id;
    // Fallback for existing tasks: check the first entry in activityLog
    const assignerLog = task?.activityLog?.find(log => log.action === 'assigned');
    return assignerLog ? assignerLog.userName === currentUser?.name : false;
  };

  // Helper: is the current user the task's assignee?
  const isTaskAssignee = (task) => task?.assigneeId && task.assigneeId === currentUser?.id;

  const isTaskOverdue = (task) => {
    const status = getDisplayStatus(task.status);
    if (status === 'Completed') return false;
    return task.dueDate < todayStr;
  };

  // Compute live calculations
  const stats = useMemo(() => {
    const total = scopedTasksList.length;
    const active = scopedTasksList.filter(t => getDisplayStatus(t.status) === 'In Progress').length;
    const completed = scopedTasksList.filter(t => getDisplayStatus(t.status) === 'Completed').length;
    const pending = scopedTasksList.filter(t => getDisplayStatus(t.status) === 'To Do' || getDisplayStatus(t.status) === 'Pending Acceptance').length;
    const overdue = scopedTasksList.filter(isTaskOverdue).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, active, completed, pending, overdue, completionRate };
  }, [scopedTasksList]);

  // Filter Tasks list
  const filteredTasks = useMemo(() => {
    return scopedTasksList.filter(t => {
      // 1. Interactive top card filter
      if (activeCardFilter === 'active' && getDisplayStatus(t.status) !== 'In Progress') return false;
      if (activeCardFilter === 'completed' && getDisplayStatus(t.status) !== 'Completed') return false;
      if (activeCardFilter === 'pending' && !['To Do', 'Pending Acceptance'].includes(getDisplayStatus(t.status))) return false;
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
  }, [scopedTasksList, activeCardFilter, searchTerm, statusFilter, priorityFilter, deptFilter, projectFilter, dateFilter]);

  // Calculate tables data dynamically
  const employeeSummaries = useMemo(() => {
    return scopedEmployees.map(emp => {
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
  }, [scopedEmployees, scopedTasksList, getEmployeeTaskSummary]);

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
  }, [scopedTasksList, teamSortKey, teamSortDir, getTeamTaskRanking]);

  const projectSummaries = useMemo(() => {
    // Project statistics computed dynamically from tasks
    const map = {};
    scopedTasksList.forEach(t => {
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
  }, [scopedTasksList]);

  const departmentSummaries = useMemo(() => {
    const list = getDepartmentTaskAnalytics();
    if (currentUserRole === 'employee') {
      return list.filter(d => d.department === currentUser?.department);
    }
    return list;
  }, [scopedTasksList, getDepartmentTaskAnalytics, currentUser, currentUserRole]);

  const workloadDistribution = useMemo(() => {
    const list = getWorkloadDistribution();
    if (currentUserRole === 'employee') {
      return list.filter(w => w.id === currentUser?.id);
    }
    return list;
  }, [scopedEmployees, scopedTasksList, getWorkloadDistribution, currentUser, currentUserRole]);

  const overdueTasksList = useMemo(() => {
    return scopedTasksList.filter(isTaskOverdue);
  }, [scopedTasksList]);

  // Aggregate recent activities timeline from all tasks
  const recentActivities = useMemo(() => {
    const logs = [];
    scopedTasksList.forEach(t => {
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
  }, [scopedTasksList]);

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
  const handleCreateTask = async () => {
    if (!createForm.projectId || !createForm.title.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await addTask(createForm);
      setIsCreateOpen(false);
      setCreateForm({
        projectId: projectsList[0]?.id || '',
        title: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'Medium',
        assigneeId: ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleExport = () => {
    const reportType = exportOptions.reportType;
    const format = exportOptions.format;
    
    let headers = [];
    let rows = [];
    let filename = `tasks_${reportType.toLowerCase().replace(/\s+/g, '_')}`;

    if (reportType === 'Task Report') {
      headers = ['Task ID', 'Title', 'Project', 'Assignee Name', 'Department', 'Due Date', 'Priority', 'Progress (%)', 'Status', 'Overdue'];
      rows = filteredTasks.map(t => [
        t.id || '',
        t.title || '',
        t.project || '',
        t.assigneeName || '',
        t.department || '',
        t.dueDate || '',
        t.priority || '',
        t.progress || 0,
        getDisplayStatus(t.status),
        isTaskOverdue(t) ? 'Yes' : 'No'
      ]);
    } else if (reportType === 'Employee Report') {
      headers = ['Employee ID', 'Employee Name', 'Department', 'Branch', 'Total Tasks', 'Completed', 'Pending', 'Overdue', 'Productivity Score (%)', 'Performance Rating'];
      rows = employeeSummaries.map(emp => [
        emp.id || '',
        emp.name || '',
        emp.department || '',
        emp.branch || '',
        emp.total || 0,
        emp.completed || 0,
        emp.pending || 0,
        emp.overdue || 0,
        emp.productivity || 0,
        emp.rating || ''
      ]);
    } else {
      // Team Report
      headers = ['Team Name', 'Team Leader', 'Department', 'Member Count', 'Active Projects', 'Productivity Score (%)', 'Attendance Score (%)'];
      rows = teamRankings.map(t => [
        t.name || '',
        t.leader || '',
        t.department || '',
        t.memberCount || 0,
        t.activeProjects || 0,
        t.productivity || 0,
        t.attendance || 0
      ]);
    }

    if (format === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const tableHeadersHTML = headers.map(h => `<th>${h}</th>`).join('');
        const tableRowsHTML = rows.map(r => `<tr>${r.map(val => `<td>${val}</td>`).join('')}</tr>`).join('');
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${reportType} Report</title>
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
              <h1>${reportType} Report</h1>
              <p>Generated on: ${new Date().toLocaleString()} | Scope: ${exportOptions.dateRange}</p>
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
        addToast('success', 'PDF Print window opened.');
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
      a.download = `${filename}_${Date.now()}.${format === 'Excel' ? 'xls' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', `${reportType} downloaded successfully as ${format}.`);
    }

    setIsExportOpen(false);
  };

  const handleReassignSubmit = async () => {
    if (!newAssigneeId) return;
    const assignee = employees.find(e => e.id === newAssigneeId);
    const updatedTask = await reassignTask(actionTaskId, newAssigneeId, assignee ? assignee.name : 'Unassigned');
    setIsReassignOpen(false);
    setActionTaskId(null);
    setNewAssigneeId('');
    // Sync drawer detail if open
    if (updatedTask && selectedTask && selectedTask.id === actionTaskId) {
      setSelectedTask(updatedTask);
    }
  };

  const handleDeadlineSubmit = async () => {
    if (!newDueDate) return;
    const updatedTask = await extendTaskDeadline(actionTaskId, newDueDate);
    setIsDeadlineOpen(false);
    setActionTaskId(null);
    setNewDueDate('');
    if (updatedTask && selectedTask && selectedTask.id === actionTaskId) {
      setSelectedTask(updatedTask);
    }
  };

  const handleRemarksSubmit = async () => {
    const updatedTask = await addTaskRemarks(actionTaskId, newTaskRemarks);
    setIsRemarksOpen(false);
    setActionTaskId(null);
    setNewTaskRemarks('');
    if (updatedTask && selectedTask && selectedTask.id === actionTaskId) {
      setSelectedTask(updatedTask);
    }
  };

  const handleAddCommentSubmit = async () => {
    if (!newCommentText.trim()) return;
    const updatedTask = await addTaskComment(selectedTask.id, newCommentText, currentUser?.name || 'Unknown', currentUser?.role || 'Super Admin');
    setNewCommentText('');
    if (updatedTask) {
      setSelectedTask(updatedTask);
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newAttachment = {
      id: `att-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      url: '#'
    };

    const project = projectsList.find(p => p.tasks.some(t => t.id === selectedTask.id));
    if (!project) return;

    const updatedTasks = project.tasks.map(t => {
      if (t.id === selectedTask.id) {
        return {
          ...t,
          attachments: [...(t.attachments || []), newAttachment],
          activityLog: [
            ...(t.activityLog || []),
            {
              id: `act-${Math.random().toString(36).substring(2, 9)}`,
              action: 'attachment_uploaded',
              details: `Uploaded attachment: ${file.name}`,
              timestamp: new Date().toISOString(),
              userName: currentUser?.name || 'System'
            }
          ]
        };
      }
      return t;
    });

    const success = await updateProject(project.id, { tasks: updatedTasks });
    if (success) {
      addToast('success', 'Attachment uploaded successfully.');
      const updatedT = updatedTasks.find(t => t.id === selectedTask.id);
      setSelectedTask(updatedT);
    }
  };

  const handleApproveLevel = async (level) => {
    const updatedTask = await approveTaskLevel(selectedTask.id, level, 'Approved at level ' + level, currentUser?.name);
    if (updatedTask) setSelectedTask(updatedTask);
  };

  const handleRejectLevel = async (level) => {
    const updatedTask = await rejectTaskLevel(selectedTask.id, level, 'Rejected at level ' + level, currentUser?.name);
    if (updatedTask) setSelectedTask(updatedTask);
  };

  // ── Lifecycle Action Handlers ──────────────────────────────────────────────

  const handleAcceptTask = async (taskId) => {
    setLoadingAction(taskId);
    const updatedTask = await acceptTask(taskId);
    setLoadingAction(null);
    if (updatedTask && selectedTask?.id === taskId) setSelectedTask(updatedTask);
  };

  const handleRejectTaskOpen = (taskId) => {
    setRejectTaskId(taskId);
    setRejectReason('');
    setIsRejectOpen(true);
  };

  const handleRejectTaskSubmit = async () => {
    if (!rejectReason.trim()) { addToast('error', 'Please provide a rejection reason.'); return; }
    setLoadingAction(rejectTaskId);
    const updatedTask = await rejectTask(rejectTaskId, rejectReason);
    setLoadingAction(null);
    setIsRejectOpen(false);
    setRejectReason('');
    if (updatedTask && selectedTask?.id === rejectTaskId) setSelectedTask(updatedTask);
    setRejectTaskId(null);
  };

  const handleStartWork = async (taskId) => {
    setLoadingAction(taskId);
    const updatedTask = await startWork(taskId);
    setLoadingAction(null);
    if (updatedTask && selectedTask?.id === taskId) setSelectedTask(updatedTask);
  };

  const handleSendToReview = async (taskId) => {
    setLoadingAction(taskId);
    const updatedTask = await sendToReview(taskId);
    setLoadingAction(null);
    if (updatedTask && selectedTask?.id === taskId) setSelectedTask(updatedTask);
  };

  const handleApproveTask = async (taskId) => {
    showConfirm('Approve Task', 'Are you sure you want to approve this task and mark it as Completed?', async () => {
      setLoadingAction(taskId);
      const updatedTask = await approveTask(taskId);
      setLoadingAction(null);
      if (updatedTask && selectedTask?.id === taskId) setSelectedTask(updatedTask);
    }, 'primary');
  };

  const handleReviewReassignOpen = (taskId) => {
    setReviewReassignTaskId(taskId);
    setReviewComment('');
    setIsReviewReassignOpen(true);
  };

  const handleReviewReassignSubmit = async () => {
    if (!reviewComment.trim()) { addToast('error', 'A review comment is required.'); return; }
    setLoadingAction(reviewReassignTaskId);
    const updatedTask = await reassignToInProgress(reviewReassignTaskId, reviewComment);
    setLoadingAction(null);
    setIsReviewReassignOpen(false);
    setReviewComment('');
    if (updatedTask && selectedTask?.id === reviewReassignTaskId) setSelectedTask(updatedTask);
    setReviewReassignTaskId(null);
  };

  // Helper: render role-based action buttons for a task (used in card + drawer)
  const renderLifecycleActions = (task, size = 'sm', variant = 'button') => {
    const status = getDisplayStatus(task.status);
    const isAssignee = isTaskAssignee(task);
    const isReviewer = isTaskReviewer(task);
    const isLoading = loadingAction === task.id;

    const btnProps = { size, disabled: isLoading };

    // ASSIGNEE ACTIONS
    if (isAssignee) {
      if (status === 'Pending Acceptance') return (
        <div className="lifecycle-actions-row">
          <Button {...btnProps} variant="primary" onClick={() => handleAcceptTask(task.id)} icon={CheckCircle2}>
            {isLoading ? 'Processing...' : 'Accept Task'}
          </Button>
          <Button {...btnProps} variant="danger" onClick={() => handleRejectTaskOpen(task.id)} icon={XCircle}>
            Reject Task
          </Button>
        </div>
      );
      if (status === 'To Do') return (
        <div className="lifecycle-actions-row">
          <Button {...btnProps} variant="primary" onClick={() => handleStartWork(task.id)} icon={Play}>
            {isLoading ? 'Starting...' : 'Start Work'}
          </Button>
        </div>
      );
      if (status === 'In Progress') return (
        <div className="lifecycle-actions-row">
          <Button {...btnProps} variant="info" onClick={() => handleSendToReview(task.id)} icon={Send}>
            {isLoading ? 'Submitting...' : 'Send to Review'}
          </Button>
        </div>
      );
      if (status === 'In Review') return (
        <div className="lifecycle-waiting-msg">
          <Hourglass size={14} className="pulse-icon" />
          <span>Waiting for review by {task.assignedByName || 'the assigner'}...</span>
        </div>
      );
      if (status === 'Completed') return (
        <div className="lifecycle-completed-msg">
          <CheckCircle2 size={14} />
          <span>Task Completed</span>
        </div>
      );
    }

    // REVIEWER ACTIONS (original assigner only)
    if (isReviewer) {
      if (status === 'In Review') return (
        <div className="lifecycle-actions-row">
          <Button {...btnProps} variant="success" onClick={() => handleApproveTask(task.id)} icon={ThumbsUp}>
            {isLoading ? 'Approving...' : 'Approve'}
          </Button>
          <Button {...btnProps} variant="warning" onClick={() => handleReviewReassignOpen(task.id)} icon={RotateCcw}>
            Reassign
          </Button>
        </div>
      );
    }

    // No actions available (viewer)
    return null;
  };

  if (isLoading) {
    return (
      <div className="task-monitoring-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="kanban-grid-5col">
          {Array.from({ length: 5 }).map((_, i) => (
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
          {showPerspectiveDropdown && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>View Mode:</span>
              <select
                value={perspective}
                onChange={(e) => setPerspective(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              >
                <option value="self">Self Info</option>
                <option value="company">Company Info</option>
              </select>
            </div>
          )}
          <Button variant="ghost" onClick={() => setIsExportOpen(true)} icon={Download}>Export Report</Button>
          {isCompanyView && hasPermission('task_monitoring', 'create') && (
            <Button variant="primary" onClick={() => setIsCreateOpen(true)} icon={Plus}>Create Task</Button>
          )}
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
            <option value="Pending Acceptance">Pending Acceptance</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Completed">Completed</option>
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
      {isCompanyView && (
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
      )}

      {/* ── Section 5: KANBAN VIEW ── */}
      {activeView === 'kanban' && (
        <div className="kanban-grid-5col">
          {[
            { label: 'Pending Acceptance', dotClass: 'dot-var-pendingacceptance' },
            { label: 'To Do', dotClass: 'dot-var-todo' },
            { label: 'In Progress', dotClass: 'dot-var-inprogress' },
            { label: 'In Review', dotClass: 'dot-var-inreview' },
            { label: 'Completed', dotClass: 'dot-var-completed' }
          ].map(({ label, dotClass }) => {
            const colTasks = filteredTasks.filter(t => getDisplayStatus(t.status) === label);
            return (
              <div key={label} className="kanban-column">
                <div className="column-header">
                  <div className="column-title-group">
                    <span className={`column-dot ${dotClass}`} />
                    <h4>{label}</h4>
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
                          className={`kanban-card ${overdue ? 'card-border-overdue' : ''}`}
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
        isEmployeeView ? (
          <div className="personal-tasks-container flex-column gap-4">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => {
                const overdue = isTaskOverdue(task);
                return (
                  <div key={task.id} className={`personal-task-card card glass ${overdue ? 'overdue' : ''}`}>
                    <div className="task-card-main-row flex-row justify-between flex-wrap gap-4">
                      {/* Left Column: ID, Project, Title */}
                      <div className="task-info-col flex-column gap-1">
                        <div className="flex-center gap-2 justify-start">
                          <span className="task-id-badge">#{task.id}</span>
                          <span className="task-project-tag">{task.project}</span>
                        </div>
                        <h3 className="task-title-text">{task.title}</h3>
                        {task.description && (
                          <p className="task-desc-preview">{task.description}</p>
                        )}
                      </div>

                      {/* Middle Column: Status, Priority, Due Date */}
                      <div className="task-meta-col flex-row gap-4 flex-wrap" style={{ alignItems: 'center' }}>
                        <div className="flex-column gap-1">
                          <span className="meta-label">Status</span>
                          <Badge variant={getStatusVariant(task.status)}>{getDisplayStatus(task.status)}</Badge>
                        </div>
                        <div className="flex-column gap-1">
                          <span className="meta-label">Priority</span>
                          <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
                        </div>
                        <div className="flex-column gap-1">
                          <span className="meta-label">Due Date</span>
                          <div className={`task-date-info ${overdue ? 'text-danger-bold' : ''}`}>
                            <Calendar size={14} />
                            <span>{task.dueDate}</span>
                          </div>
                        </div>
                        <div className="flex-column gap-1">
                          <span className="meta-label">Est. Hours</span>
                          <span className="hours-text">{task.estimatedHours || 0} hrs</span>
                        </div>
                      </div>

                      {/* Right Column: Progress & Interactive Slider */}
                      <div className="task-progress-col flex-column gap-2">
                        <div className="flex-row justify-between">
                          <span className="meta-label">Progress</span>
                          <span className="progress-percent-text">{task.progress || 0}%</span>
                        </div>
                        <div className="progress-slider-wrapper">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={task.progress || 0}
                            disabled={getDisplayStatus(task.status) !== 'In Progress'}
                            onChange={async (e) => {
                              const val = parseInt(e.target.value);
                              await updateTaskProgress(task.id, task.status, val, task.remarks || '');
                            }}
                            className="task-progress-slider"
                          />
                        </div>
                        <div className="progress-bar-mini" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                          <div style={{ width: `${task.progress || 0}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '3px' }} />
                        </div>
                      </div>

                      {/* Far Right Column: Quick Action buttons */}
                      <div className="task-actions-col flex-center gap-2 flex-wrap">
                        {renderLifecycleActions(task, 'sm')}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                          icon={Eye}
                        >
                          Details
                        </Button>
                      </div>
                    </div>

                    {/* Remarks panel if present */}
                    {task.remarks && (
                      <div className="task-card-remarks">
                        <strong>Manager Remarks:</strong> {task.remarks}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="personal-tasks-empty card flex-column flex-center text-center">
                <CheckSquare size={48} className="text-muted" style={{ opacity: 0.5 }} />
                <h3>No tasks assigned</h3>
                <p>You have no active tasks matching your filter selections.</p>
              </div>
            )}
          </div>
        ) : (
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
                              {currentUserRole !== 'employee' ? (
                                <div className="flex-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => { setActionTaskId(task.id); setIsReassignOpen(true); }}>Reassign</Button>
                                  <Button variant="ghost" size="sm" onClick={() => { setActionTaskId(task.id); setIsDeadlineOpen(true); }}>Extend</Button>
                                  <Button variant="ghost" size="sm" onClick={async () => await escalateTask(task.id)}>Escalate</Button>
                                  <Button variant="ghost" size="sm" onClick={() => { setActionTaskId(task.id); setIsRemarksOpen(true); }}>Remarks</Button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No actions allowed</span>
                              )}
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
        )
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
      {isDetailOpen && selectedTask && (() => {
        const isReassignedStatus = getDisplayStatus(selectedTask.status) === 'In Progress' && selectedTask.reviewComment;
        const statusLabel = isReassignedStatus ? 'Reassigned' : getDisplayStatus(selectedTask.status);
        const statusVariant = isReassignedStatus ? 'danger' : getStatusVariant(selectedTask.status);

        return (
          <div className="slide-over-overlay" onClick={() => setIsDetailOpen(false)}>
            <div className="slide-over-card" onClick={e => e.stopPropagation()}>
              <div className="slide-over-header flex-column gap-2">
                <div className="flex-row justify-between align-center" style={{ width: '100%' }}>
                  <div>
                    <span className="slide-over-proj-lbl" style={{ marginBottom: '4px' }}>{selectedTask.project} &bull; #{selectedTask.id}</span>
                    <h3 className="task-detail-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTask.title}</h3>
                  </div>
                  <button className="topbar-icon-btn" onClick={() => setIsDetailOpen(false)}>
                    <PanelRightClose size={20} />
                  </button>
                </div>
                <div className="flex-row gap-2 mt-2">
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                  <Badge variant={getPriorityVariant(selectedTask.priority)}>{selectedTask.priority}</Badge>
                </div>
              </div>

              <div className="slide-over-body flex-column gap-5">
                
                {/* ── Lifecycle Action Panel ── */}
                <div className="lifecycle-action-panel card glass flex-column gap-2" style={{ padding: '16px' }}>
                  <span className="info-lbl">Lifecycle Actions</span>
                  <div style={{ marginTop: '4px' }}>
                    {renderLifecycleActions(selectedTask, 'md')}
                  </div>
                  
                  {selectedTask.rejectionReason && (
                    <div className="rejection-reason-panel" style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', marginTop: '6px' }}>
                      <strong style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>Rejection Reason:</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{selectedTask.rejectionReason}</p>
                    </div>
                  )}

                  {selectedTask.reviewComment && (
                    <div className="review-comment-panel" style={{ padding: '10px 12px', background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.15)', borderRadius: '6px', marginTop: '6px' }}>
                      <strong style={{ color: 'var(--color-warning)', fontSize: '0.78rem' }}>Rework Review Comments:</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{selectedTask.reviewComment}</p>
                    </div>
                  )}
                </div>

                {/* ── Assignee Information & Meta Grid ── */}
                <div className="detail-info-grid">
                  <div className="info-field">
                    <span className="info-lbl">Assignee</span>
                    <div className="flex-center gap-2 justify-start" style={{ marginTop: '4px' }}>
                      <Avatar name={selectedTask.assigneeName} size="sm" />
                      <div>
                        <strong style={{ fontSize: '0.875rem' }}>{selectedTask.assigneeName}</strong>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedTask.department}</span>
                      </div>
                    </div>
                  </div>
                  <div className="info-field">
                    <span className="info-lbl">Created By</span>
                    <span className="info-val" style={{ marginTop: '4px', display: 'block', fontSize: '0.875rem' }}>
                      {selectedTask.assignedByName && selectedTask.assignedByName !== 'System'
                        ? selectedTask.assignedByName
                        : (selectedTask.activityLog?.find(log => log.action === 'assigned')?.userName || 'System')}
                    </span>
                  </div>
                  <div className="info-field">
                    <span className="info-lbl">Estimated Hours</span>
                    <span className="info-val" style={{ marginTop: '4px', display: 'block' }}>{selectedTask.estimatedHours || 20} hrs</span>
                  </div>
                  <div className="info-field">
                    <span className="info-lbl">Due Date</span>
                    <span className={`info-val ${isTaskOverdue(selectedTask) ? 'text-danger-bold' : ''}`} style={{ marginTop: '4px', display: 'block' }}>
                      {selectedTask.dueDate}
                    </span>
                  </div>
                </div>

                {/* ── Progress Section ── */}
                <div className="info-field">
                  <div className="flex-row justify-between align-center">
                    <span className="info-lbl">Task Progress</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>{selectedTask.progress || 0}%</span>
                  </div>
                  <div className="progress-bar-mini" style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: '8px' }}>
                    <div style={{ width: `${selectedTask.progress}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }} />
                  </div>
                  <div className="flex-row justify-between" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* ── Task Description ── */}
                <div className="info-field">
                  <span className="info-lbl">Task Description</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', background: 'rgba(255,255,255,0.015)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {selectedTask.description || 'No description provided.'}
                  </p>
                </div>

                {/* ── Attachments Section ── */}
                <div className="info-field">
                  <div className="flex-row justify-between align-center">
                    <span className="info-lbl">Attachments ({selectedTask.attachments?.length || 0})</span>
                    {getDisplayStatus(selectedTask.status) === 'In Progress' && isTaskAssignee(selectedTask) && (
                      <label className="attachment-upload-trigger" style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={14} /> Add File
                        <input type="file" onChange={handleUploadAttachment} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                  <div className="attachments-list flex-column gap-2" style={{ marginTop: '8px' }}>
                    {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                      selectedTask.attachments.map(att => (
                        <div key={att.id} className="attachment-file-row flex-row justify-between align-center" style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>📎 {att.name} <small style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({att.size})</small></span>
                          <a href={att.url} download className="toggle-cols-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>Download</a>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No attachments uploaded.</span>
                    )}
                  </div>
                </div>

                {/* ── Activity Timeline (Chronological History) ── */}
                <div className="info-field">
                  <span className="info-lbl">Activity Timeline</span>
                  <div className="timeline-wrapper flex-column gap-4" style={{ marginTop: '14px', borderLeft: '2px solid var(--border-color)', paddingLeft: '20px', marginLeft: '8px' }}>
                    {(selectedTask.activityLog || []).map((log, idx) => {
                      let iconColor = 'var(--text-muted)';
                      let timelineIcon = <Activity size={12} />;
                      
                      if (log.action === 'assigned') {
                        timelineIcon = <Flag size={12} />;
                        iconColor = 'var(--color-neutral)';
                      } else if (log.action === 'accepted') {
                        timelineIcon = <Check size={12} />;
                        iconColor = 'var(--color-primary)';
                      } else if (log.action === 'rejected') {
                        timelineIcon = <X size={12} />;
                        iconColor = 'var(--color-danger)';
                      } else if (log.action === 'started') {
                        timelineIcon = <Play size={12} />;
                        iconColor = 'var(--color-warning)';
                      } else if (log.action === 'sent_to_review') {
                        timelineIcon = <Send size={12} />;
                        iconColor = 'var(--color-purple)';
                      } else if (log.action === 'approved') {
                        timelineIcon = <ThumbsUp size={12} />;
                        iconColor = 'var(--color-success)';
                      } else if (log.action === 'reassigned_for_rework') {
                        timelineIcon = <RotateCcw size={12} />;
                        iconColor = 'var(--color-danger)';
                      }

                      return (
                        <div key={log.id || idx} className="timeline-item flex-column" style={{ position: 'relative' }}>
                          <span className="timeline-dot-icon flex-center" style={{ position: 'absolute', left: '-30px', top: '2px', background: 'var(--bg-card)', border: `2px solid ${iconColor}`, borderRadius: '50%', width: '20px', height: '20px', color: iconColor }}>
                            {timelineIcon}
                          </span>
                          <div className="flex-row justify-between" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            <span style={{ color: 'var(--text-primary)' }}>{log.details}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            By: <strong>{log.userName}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Discussions Thread & Comments ── */}
                <div className="info-field flex-column gap-2">
                  <span className="info-lbl">Discussions Thread</span>
                  <div className="comments-chat-wrapper flex-column gap-2" style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px' }}>
                    {selectedTask.comments && selectedTask.comments.length > 0 ? (
                      selectedTask.comments.map(c => (
                        <div key={c.id} className="comment-bubble flex-column" style={{ background: 'rgba(255,255,255,0.015)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div className="flex-row justify-between align-center" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            <span style={{ color: 'var(--color-primary)' }}>{c.sender} <small style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({c.role})</small></span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{c.time}</span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px', margin: '4px 0 0 0', lineHeight: 1.4 }}>{c.text}</p>
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
                      placeholder="Type a comment or request feedback..."
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
                {hasPermission('task_monitoring', 'delete') && (
                  <Button variant="danger" onClick={() => {
                    showConfirm('Delete Task', `Are you sure you want to delete task "${selectedTask.title}"?`, async () => {
                      await deleteTask(selectedTask.id);
                      setIsDetailOpen(false);
                    }, 'danger');
                  }} icon={Trash2}>Delete</Button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Create Task Modal ── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Project Task"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateTask} disabled={!createForm.projectId || !createForm.title.trim() || isCreating}>
               {isCreating ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Target Project *</label>
            <select
              value={createForm.projectId}
              onChange={e => setCreateForm(prev => ({ ...prev, projectId: e.target.value, assigneeId: '' }))}
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
          <div className="form-field">
            <label>Assign To</label>
            <select
              value={createForm.assigneeId}
              onChange={e => setCreateForm(prev => ({ ...prev, assigneeId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {(filteredAssignees || []).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
              ))}
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

      {/* ── Reject Task Modal ── */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Task Assignment"
        size="sm"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleRejectTaskSubmit} disabled={!rejectReason.trim()}>Confirm Rejection</Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Reason for Rejection *</label>
            <textarea
              placeholder="Provide a clear reason why you cannot accept this task..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              required
            />
          </div>
        </div>
      </Modal>

      {/* ── Reviewer Reassign Modal ── */}
      <Modal
        isOpen={isReviewReassignOpen}
        onClose={() => setIsReviewReassignOpen(false)}
        title="Send Task Back for Rework"
        size="sm"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsReviewReassignOpen(false)}>Cancel</Button>
            <Button variant="warning" onClick={handleReviewReassignSubmit} disabled={!reviewComment.trim()}>Send back for rework</Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Rework Instructions / Feedback *</label>
            <textarea
              placeholder="Explain what changes are needed before approval..."
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              rows={4}
              required
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
