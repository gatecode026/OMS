import React, { useState, useMemo } from 'react';
import styles from '../../styles/projects.module.css';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp, CheckCircle, Clock, AlertTriangle, Calendar,
  Plus, Users, CheckSquare, FileText, Download, BarChart2, Bell, X
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

import ProjectsTable from '../../components/projects/ProjectsTable';
import ProjectDetailPanel from '../../components/projects/ProjectDetailPanel';
import ProjectTimeline from '../../components/projects/ProjectTimeline';
import ProjectFilters from '../../components/projects/ProjectFilters';
import ActivityFeed from '../../components/projects/ActivityFeed';


const Projects = () => {
  const { addToast, employees, departments: rawDepartments, projectsList, addProject, updateProject, deleteProject, currentUserRole, hasPermission } = useApp();
  const departments = useMemo(() => (rawDepartments || []).filter(d => d.status === 'Active'), [rawDepartments]);

  // State Management
  const [projects, setProjects] = useState([]);

  React.useEffect(() => {
    if (projectsList) {
      setProjects(projectsList);
    }
  }, [projectsList]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    priority: 'All',
    department: 'All',
    dateRange: 'All',
    customStart: '',
    customEnd: ''
  });
  
  const [selectedCardFilter, setSelectedCardFilter] = useState(null); // Stat card filtering override
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Modal open states
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'assign' | 'task' | 'document' | 'report'
  
  // Form States for Modals
  const [newProjectForm, setNewProjectForm] = useState({
    name: '', client: '', department: '', manager: '', leader: '', startDate: '', deadline: '', priority: 'Medium', description: ''
  });
  const [assignTeamForm, setAssignTeamForm] = useState({ projectId: '', memberName: '' });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [addTaskForm, setAddTaskForm] = useState({ projectId: '', title: '', dueDate: '', priority: 'Medium' });
  const [uploadDocForm, setUploadDocForm] = useState({ projectId: '', docName: '', docType: 'pdf', docSize: '0.8 MB' });
  const [reportForm, setReportForm] = useState({ projectId: '', reportType: 'progress', format: 'pdf' });

  // Filtering Calculation
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Card click override filters
      if (selectedCardFilter) {
        if (selectedCardFilter === 'Active' && p.status !== 'Active' && p.status !== 'In Progress') return false;
        if (selectedCardFilter === 'Completed' && p.status !== 'Completed') return false;
        if (selectedCardFilter === 'Pending' && p.status !== 'Pending') return false;
        if (selectedCardFilter === 'Delayed' && p.status !== 'Delayed') return false;
        if (selectedCardFilter === 'Upcoming') {
          // Deadline in next 30 days and not completed
          const deadline = new Date(p.deadline);
          const limitDate = new Date('2026-06-30'); // system date simulation (June 2026 + 30 days)
          const today = new Date('2026-06-01');
          if (p.status === 'Completed' || deadline < today || deadline > limitDate) return false;
        }
      }

      // Dropdown and Search Filters
      const matchesSearch =
        p.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.manager.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.leader.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === 'All' || p.status === filters.status;
      const matchesPriority = filters.priority === 'All' || p.priority === filters.priority;
      const matchesDept = filters.department === 'All' || p.department.toLowerCase() === filters.department.toLowerCase();

      // Timeframe Filter
      let matchesTimeframe = true;
      if (filters.dateRange !== 'All') {
        const pDeadline = new Date(p.deadline);
        const sysToday = new Date('2026-06-01');

        if (filters.dateRange === 'Today') {
          const deadlineStr = p.deadline;
          matchesTimeframe = deadlineStr === '2026-06-01';
        } else if (filters.dateRange === 'Weekly') {
          const sysEndOfWeek = new Date('2026-06-07');
          matchesTimeframe = pDeadline >= sysToday && pDeadline <= sysEndOfWeek;
        } else if (filters.dateRange === 'Monthly') {
          const sysEndOfMonth = new Date('2026-06-30');
          matchesTimeframe = pDeadline >= sysToday && pDeadline <= sysEndOfMonth;
        } else if (filters.dateRange === 'Custom' && filters.customStart && filters.customEnd) {
          const start = new Date(filters.customStart);
          const end = new Date(filters.customEnd);
          matchesTimeframe = pDeadline >= start && pDeadline <= end;
        }
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesDept && matchesTimeframe;
    });
  }, [projects, filters, selectedCardFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalActive = projects.filter(p => p.status === 'Active' || p.status === 'In Progress').length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const pending = projects.filter(p => p.status === 'Pending').length;
    const delayed = projects.filter(p => p.status === 'Delayed').length;
    
    // Upcoming: deadlines between 2026-06-01 and 2026-06-30 and not completed
    const sysToday = new Date('2026-06-01');
    const limit = new Date('2026-06-30');
    const upcoming = projects.filter(p => {
      const deadline = new Date(p.deadline);
      return p.status !== 'Completed' && deadline >= sysToday && deadline <= limit;
    }).length;

    return { totalActive, completed, pending, delayed, upcoming };
  }, [projects]);

  // Recharts Chart Data Calculations
  // Chart 1: Project Progress Overview & Department Performance
  const chartProgressOverview = useMemo(() => {
    const counts = { 'In Progress': 0, Completed: 0, Pending: 0, Delayed: 0, 'On Hold': 0 };
    projects.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++;
      else counts[p.status] = 1;
    });

    const pieData = Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));

    // Department average progress
    const depts = Array.from(new Set((departments || []).map(d => d.name)));
    const deptPerformance = depts.map(d => {
      const deptProjs = projects.filter(p => p.department && p.department.toLowerCase() === d.toLowerCase());
      const avg = deptProjs.length > 0
        ? Math.round(deptProjs.reduce((acc, curr) => acc + curr.progress, 0) / deptProjs.length)
        : 0;
      return { department: d, progress: avg };
    });

    return { pieData, deptPerformance };
  }, [projects]);

  // Chart 2: Monthly Projects (Completed, Delayed, Performance Growth)
  const chartMonthlyAnalytics = [
    { name: 'Jan 26', completed: 2, delayed: 0, productivity: 78 },
    { name: 'Feb 26', completed: 3, delayed: 1, productivity: 80 },
    { name: 'Mar 26', completed: 1, delayed: 2, productivity: 82 },
    { name: 'Apr 26', completed: 4, delayed: 1, productivity: 85 },
    { name: 'May 26', completed: 3, delayed: 3, productivity: 87 },
    { name: 'Jun 26', completed: 5, delayed: 2, productivity: 91 }
  ];

  // Actions handler
  const handleView = (proj) => {
    setSelectedProject(proj);
    setIsDetailOpen(true);
  };

  const handleEdit = (proj) => {
    setNewProjectForm({
      name: proj.name,
      client: proj.client || 'Google',
      department: proj.department,
      manager: proj.manager,
      leader: proj.leader,
      startDate: proj.startDate,
      deadline: proj.deadline,
      priority: proj.priority,
      description: proj.description || ''
    });
    setSelectedProject(proj);
    setActiveModal('create'); // reuse create form for edit
  };

  const handleOpenAssignTeam = (proj) => {
    setAssignTeamForm({ projectId: proj.id, memberName: '' });
    setSelectedMembers(proj.members || []);
    setActiveModal('assign');
  };

  // Toggle tasks check
  const handleToggleTask = async (projectId, taskId) => {
    const targetProj = projects.find(p => p.id === projectId);
    if (!targetProj) return;

    const updatedTasks = targetProj.tasks.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          status: nextCompleted ? 'Done' : 'To Do',
          progress: nextCompleted ? 100 : 0
        };
      }
      return t;
    });
    const tasksDone = updatedTasks.filter(t => t.completed).length;
    const progress = targetProj.tasksTotal > 0 ? Math.round((tasksDone / targetProj.tasksTotal) * 100) : 0;
    
    const updatedFields = {
      tasks: updatedTasks,
      tasksDone,
      progress,
      status: progress === 100 ? 'Completed' : (targetProj.status === 'Completed' ? 'In Progress' : targetProj.status)
    };

    const success = await updateProject(projectId, updatedFields);
    if (success) {
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject({ ...targetProj, ...updatedFields });
      }
      addToast('success', 'Task progress updated!');
    }
  };

  // Create Project Form Submit
  const handleCreateProjectSubmit = async (e) => {
    e.preventDefault();
    if (selectedProject) {
      // Edit mode
      const success = await updateProject(selectedProject.id, newProjectForm);
      if (success) {
        setSelectedProject(null);
      }
    } else {
      // Create mode
      const count = projects.length;
      const nextId = `PRJ-${String(count + 1).padStart(3, '0')}`;
      const newProjObj = {
        id: nextId,
        name: newProjectForm.name,
        description: newProjectForm.description,
        department: newProjectForm.department,
        client: newProjectForm.client || 'Internal',
        manager: newProjectForm.manager,
        leader: newProjectForm.leader,
        members: [newProjectForm.manager, newProjectForm.leader].filter(Boolean),
        priority: newProjectForm.priority,
        startDate: newProjectForm.startDate || new Date().toISOString().split('T')[0],
        deadline: newProjectForm.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: 0,
        status: 'Pending',
        tasksTotal: 1,
        tasksDone: 0,
        workflowStage: 'Planning',
        pendingApprovals: 1,
        delayedActivities: 0,
        productivityScore: 80,
        milestonesCompleted: 0,
        milestonesTotal: 5,
        documents: [],
        tasks: [
          { id: `t-${nextId}-1`, title: 'Kickoff meeting and alignment', completed: false, dueDate: newProjectForm.startDate || new Date().toISOString().split('T')[0], priority: 'Medium' }
        ]
      };
      await addProject(newProjObj);
    }
    setActiveModal(null);
    setNewProjectForm({
      name: '', client: '', department: '', manager: '', leader: '', startDate: '', deadline: '', priority: 'Medium', description: ''
    });
  };

  const handleToggleMemberSelection = (memberName) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberName)) {
        return prev.filter(m => m !== memberName);
      } else {
        return [...prev, memberName];
      }
    });
  };

  // Assign Team Member Submit
  const handleAssignTeamSubmit = async (e) => {
    e.preventDefault();
    const { projectId } = assignTeamForm;
    if (!projectId) return;

    const targetProj = projects.find(p => p.id === projectId);
    if (!targetProj) return;

    const success = await updateProject(projectId, { members: selectedMembers });
    if (success) {
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject({ ...selectedProject, members: selectedMembers });
      }
      addToast('success', 'Project team members updated successfully.');
    }
    setActiveModal(null);
  };

  // Add Task Submit
  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();
    const { projectId, title, dueDate, priority } = addTaskForm;
    if (!projectId || !title.trim()) return;

    const targetProj = projects.find(p => p.id === projectId);
    if (!targetProj) return;

    const nextTaskId = `t-${projectId}-${targetProj.tasks.length + 1}`;
    const newTasks = [...targetProj.tasks, { id: nextTaskId, title: title.trim(), completed: false, status: 'To Do', progress: 0, dueDate, priority }];
    const tasksTotal = targetProj.tasksTotal + 1;
    const progress = Math.round((targetProj.tasksDone / tasksTotal) * 100);

    const success = await updateProject(projectId, {
      tasks: newTasks,
      tasksTotal,
      progress
    });
    if (success) {
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject({ ...selectedProject, tasks: newTasks, tasksTotal, progress });
      }
    }
    setActiveModal(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const name = file.name;
    const ext = name.split('.').pop().toLowerCase();
    let docType = 'pdf';
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      docType = 'excel';
    } else if (ext === 'docx' || ext === 'doc') {
      docType = 'word';
    } else if (ext === 'zip' || ext === 'rar' || ext === '7z' || ext === 'tar' || ext === 'gz') {
      docType = 'zip';
    } else if (ext === 'pdf') {
      docType = 'pdf';
    }

    let docSize = '0.1 MB';
    if (file.size > 1024 * 1024) {
      docSize = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
      docSize = (file.size / 1024).toFixed(0) + ' KB';
    }

    setUploadDocForm(prev => ({
      ...prev,
      docName: name,
      docType,
      docSize
    }));
  };

  // Upload Document Submit
  const handleUploadDocSubmit = async (e) => {
    e.preventDefault();
    const { projectId, docName, docType, docSize } = uploadDocForm;
    if (!projectId || !docName.trim()) return;

    const targetProj = projects.find(p => p.id === projectId);
    if (!targetProj) return;

    const newDocs = [...targetProj.documents, { name: docName.trim(), type: docType, size: docSize || '0.8 MB', uploadedBy: 'Super Admin' }];
    const success = await updateProject(projectId, { documents: newDocs });
    if (success) {
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject({ ...selectedProject, documents: newDocs });
      }
      addToast('success', 'Document uploaded and linked to project successfully.');
    }
    setActiveModal(null);
    setUploadDocForm({ projectId: '', docName: '', docType: 'pdf', docSize: '0.8 MB' });
  };

  // Generate Reports Submit
  const handleGenerateReportSubmit = (e) => {
    e.preventDefault();
    const { projectId, reportType, format } = reportForm;
    if (!projectId) return;

    const targetProj = projects.find(p => p.id === projectId);
    if (!targetProj) return;

    addToast('info', `Compiling report for "${targetProj.name}"...`);

    let fileContent = '';
    let mimeType = 'text/plain';
    let fileExtension = 'txt';

    if (format === 'csv' || format === 'excel') {
      mimeType = 'text/csv;charset=utf-8;';
      fileExtension = 'csv';

      // Build detailed CSV
      const rows = [
        ['PROJECT REPORT', targetProj.name],
        ['Report Type', reportType.toUpperCase()],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['PROJECT METRICS', 'VALUE'],
        ['Project ID', targetProj.id],
        ['Project Name', targetProj.name],
        ['Client', targetProj.client || 'Internal'],
        ['Department', targetProj.department],
        ['Project Manager', targetProj.manager],
        ['Team Leader', targetProj.leader],
        ['Priority', targetProj.priority],
        ['Start Date', targetProj.startDate],
        ['Deadline', targetProj.deadline],
        ['Progress', `${targetProj.progress}%`],
        ['Status', targetProj.status],
        ['Workflow Stage', targetProj.workflowStage || 'Planning'],
        ['Tasks Total', targetProj.tasksTotal],
        ['Tasks Done', targetProj.tasksDone],
        ['Working Hours logged', targetProj.workingHours || 0],
        ['Productivity Score', `${targetProj.productivityScore || 80}%`],
        [],
        ['TEAM ASSIGNED'],
        ['Name', 'Role'],
        ...(targetProj.members || []).map(m => [m, m === targetProj.manager ? 'Project Manager' : m === targetProj.leader ? 'Team Leader' : 'Team Member']),
        [],
        ['PROJECT WORK TASKS'],
        ['Task ID', 'Task Title', 'Due Date', 'Priority', 'Completed'],
        ...(targetProj.tasks || []).map(t => [t.id, t.title, t.dueDate, t.priority, t.completed ? 'YES' : 'NO'])
      ];

      fileContent = rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    } else {
      // PDF/Text format: Build a beautiful plain-text ASCII report
      mimeType = 'text/plain;charset=utf-8;';
      fileExtension = 'txt';

      const divider = '='.repeat(60);
      const subDivider = '-'.repeat(60);

      fileContent = [
        divider,
        `               PROJECT PERFORMANCE REPORT`,
        `               Project: ${targetProj.name} (${targetProj.id})`,
        divider,
        `Report Type  : ${reportType.toUpperCase()}`,
        `Generated At : ${new Date().toLocaleString()}`,
        subDivider,
        `Project Name : ${targetProj.name}`,
        `Client       : ${targetProj.client || 'Internal'}`,
        `Department   : ${targetProj.department}`,
        `Manager      : ${targetProj.manager}`,
        `Leader       : ${targetProj.leader}`,
        `Priority     : ${targetProj.priority}`,
        `Start Date   : ${targetProj.startDate}`,
        `Deadline     : ${targetProj.deadline}`,
        `Progress     : ${targetProj.progress}%`,
        `Status       : ${targetProj.status}`,
        `Workflow Stage: ${targetProj.workflowStage || 'Planning'}`,
        `Total Tasks  : ${targetProj.tasksTotal}`,
        `Tasks Done   : ${targetProj.tasksDone}`,
        subDivider,
        `TEAM MEMBERS ASSIGNED:`,
        ...(targetProj.members || []).map(m => ` - ${m} (${m === targetProj.manager ? 'Project Manager' : m === targetProj.leader ? 'Team Leader' : 'Team Member'})`),
        subDivider,
        `PROJECT CHECKLIST TASKS:`,
        ...(targetProj.tasks || []).map(t => ` [${t.completed ? 'X' : ' '}] ${t.id} - ${t.title} (Due: ${t.dueDate}, Priority: ${t.priority})`),
        divider
      ].join('\n');
    }

    // Trigger standard Blob download
    setTimeout(() => {
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Clean target project name for filename
      const cleanProjName = targetProj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.setAttribute('download', `${targetProj.id}_${cleanProjName}_report_${reportType}.${fileExtension}`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', `${format.toUpperCase()} report downloaded successfully!`);
    }, 800);

    setActiveModal(null);
    setReportForm({ projectId: '', reportType: 'progress', format: 'pdf' });
  };

  // CSV Data Exporter
  const handleExportCSV = () => {
    addToast('info', 'Preparing project data CSV...');
    const headers = ['Project ID', 'Project Name', 'Client', 'Department', 'Manager', 'Leader', 'Priority', 'Start Date', 'Deadline', 'Completion %', 'Status'];
    const csvRows = [headers.join(',')];

    filteredProjects.forEach(p => {
      const row = [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.client || 'Google'}"`,
        p.department,
        p.manager,
        p.leader,
        p.priority,
        p.startDate,
        p.deadline,
        `${p.progress}%`,
        p.status
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'active_projects_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'CSV downloaded successfully!');
  };

  // Scroll to analytics section
  const handleViewAnalytics = () => {
    const chartsSec = document.getElementById('analyticsCharts');
    if (chartsSec) {
      chartsSec.scrollIntoView({ behavior: 'smooth' });
      addToast('info', 'Viewing performance analytics charts');
    }
  };

  // Stat card selection toggle
  const toggleCardFilter = (filterType) => {
    if (selectedCardFilter === filterType) {
      setSelectedCardFilter(null);
    } else {
      setSelectedCardFilter(filterType);
    }
  };

  // Color mapping constants for Recharts pie
  const COLORS = ['#10b981', '#3b82f6', '#94a3b8', '#ef4444', '#f59e0b'];

  return (
    <div className={styles.dashboard}>
      {/* Header and Alerts / Notifications */}
      <div className={styles.tableHeaderRow}>
        <div>
          <h1 style={{ margin: 0 }}>Active Projects Dashboard</h1>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Track and manage all company projects, timelines, tasks, and budgets.</p>
        </div>

        {/* Header Alerts Dropdown Button */}
        <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
          <div className={styles.syncStatus} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 'var(--radius-lg)' }}>
            <span className={styles.syncDot} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>SYSTEM ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Top Banner Alert Bar */}
      <div className={styles.alertsBanner}>
        <div className={styles.alertsHeader}>
          <span className={styles.alertsTitle}>
            <Bell size={16} /> Important Dashboard System Alerts
          </span>
        </div>
        <div className={styles.alertList}>
          <div className={styles.alertItem}>
            <span className={styles.alertDot} />
            <span>Upcoming Deadlines: <strong>{stats.upcoming}</strong> projects need delivery this month.</span>
          </div>
          <div className={styles.alertItem}>
            <span className={styles.alertDot} />
            <span>Delayed Projects: <strong>{stats.delayed}</strong> databases and systems core lagging.</span>
          </div>
          <div className={styles.alertItem}>
            <span className={styles.alertDot} />
            <span>Approvals: <strong>8</strong> approvals pending from managers.</span>
          </div>
        </div>
      </div>

      {/* Section G - Quick Action Buttons Bar */}
      <div className={styles.quickActionsRow}>
        {hasPermission('project_management', 'create') && (
          <>
            <button className={`${styles.pageBtn} ${styles.primaryAction}`} onClick={() => { setSelectedProject(null); setActiveModal('create'); }}>
              <Plus size={14} /> Create New Project
            </button>
            <button className={styles.pageBtn} onClick={() => setActiveModal('assign')}>
              <Users size={14} /> Assign Team
            </button>
            <button className={styles.pageBtn} onClick={() => setActiveModal('task')}>
              <CheckSquare size={14} /> Add Tasks
            </button>
            <button className={styles.pageBtn} onClick={() => setActiveModal('document')}>
              <FileText size={14} /> Upload Documents
            </button>
            <button className={styles.pageBtn} onClick={() => setActiveModal('report')}>
              <BarChart2 size={14} /> Generate Reports
            </button>
          </>
        )}
        <button className={styles.pageBtn} onClick={handleExportCSV}>
          <Download size={14} /> Export Data (CSV)
        </button>
        <button className={styles.pageBtn} onClick={handleViewAnalytics}>
          <TrendingUp size={14} /> View Analytics
        </button>
      </div>

      {/* Section A — Top Summary Cards */}
      <div className={styles.summaryGrid}>
        <div
          className={`${styles.summaryCard} ${selectedCardFilter === 'Active' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Active')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel}>Total Active Projects</span>
            <span className={styles.summaryIcon}><Clock size={16} /></span>
          </div>
          <span className={styles.summaryVal}>{stats.totalActive}</span>
        </div>

        <div
          className={`${styles.summaryCard} ${selectedCardFilter === 'Completed' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Completed')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel}>Completed Projects</span>
            <span className={styles.summaryIcon}><CheckCircle size={16} /></span>
          </div>
          <span className={styles.summaryVal}>{stats.completed}</span>
        </div>

        <div
          className={`${styles.summaryCard} ${selectedCardFilter === 'Pending' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Pending')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel}>Pending Projects</span>
            <span className={styles.summaryIcon}><Clock size={16} /></span>
          </div>
          <span className={styles.summaryVal}>{stats.pending}</span>
        </div>

        <div
          className={`${styles.summaryCard} ${styles.delayed} ${selectedCardFilter === 'Delayed' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Delayed')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel} style={{ color: 'var(--color-danger)' }}>Delayed Projects</span>
            <span className={styles.summaryIcon}><AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} /></span>
          </div>
          <span className={styles.summaryVal} style={{ color: 'var(--color-danger)' }}>{stats.delayed}</span>
        </div>

        <div
          className={`${styles.summaryCard} ${selectedCardFilter === 'Upcoming' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Upcoming')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel}>Upcoming Deadlines</span>
            <span className={styles.summaryIcon}><Calendar size={16} /></span>
          </div>
          <span className={styles.summaryVal}>{stats.upcoming}</span>
        </div>
      </div>

      {/* Section B — Project Performance Analytics (Charts panels) */}
      <div id="analyticsCharts" className={styles.analyticsRow}>
        {/* Project Progress Overview */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Project Progress & Dept Performance</h3>
          </div>
          <div className={styles.chartBody}>
            <div className={styles.pieWrapper}>
              <div className={styles.pieContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartProgressOverview.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartProgressOverview.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>
                    {projects.length}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Projects
                  </span>
                </div>
              </div>

              {/* Department Bars */}
              <div className={styles.progressList}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dept Performance</span>
                {chartProgressOverview.deptPerformance.map(dept => (
                  <div key={dept.department} className={styles.progressItem}>
                    <div className={styles.progressLabelRow}>
                      <span>{dept.department}</span>
                      <span>{dept.progress}% avg progress</span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${dept.progress}%`, backgroundColor: 'var(--color-primary)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Project Analytics */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Monthly Deliveries & Productivity Trend</h3>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartMonthlyAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed Proj" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed" name="Delayed Proj" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section F — Search & Filters Bar */}
      <ProjectFilters filters={filters} onFilterChange={setFilters} departments={departments} />

      {/* Active filter chip if card filter is on */}
      {selectedCardFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', width: 'fit-content', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filtering by KPI card: <strong>{selectedCardFilter}</strong></span>
          <button
            onClick={() => setSelectedCardFilter(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', marginLeft: 4 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main layout split (Table + Activities) */}
      <div className={styles.mainLayout}>
        <div className={styles.mainColumn}>
          {/* Section C — Active Projects Table */}
          <ProjectsTable
            projects={filteredProjects}
            onView={handleView}
            onEdit={handleEdit}
            onAssignTeam={handleOpenAssignTeam}
          />
        </div>

        {/* Sidebar panels */}
        <div className={styles.sideColumn}>
          {/* Section H — Recent Project Activities Panel */}
          <ActivityFeed />
        </div>
      </div>

      {/* Section E — Project Timeline / Calendar view */}
      <ProjectTimeline projects={projects} onSelectProject={handleView} />

      {/* Section D — Project Detail Slide-over Panel */}
      <ProjectDetailPanel
        project={selectedProject}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onToggleTask={handleToggleTask}
      />

      {/* Section K — Sticky Footer Status Bar */}
      <div className={styles.stickyFooter}>
        <div className={styles.footerLeft}>
          <span>Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> Projects</span>
          <span>|</span>
          <span>Last Updated: 2 minutes ago</span>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.syncStatus}>
            <span className={styles.syncDot} />
            <span>SYNCED TO CLOUD</span>
          </div>
          <span>|</span>
          <span>Backup Status: <strong>Successful</strong></span>
        </div>
      </div>

      {/* MODAL 1: CREATE & EDIT PROJECT */}
      {activeModal === 'create' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedProject ? 'Edit Project Details' : 'Create New Company Project'}</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateProjectSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Project Name</label>
                  <input
                    type="text"
                    required
                    className={styles.textInput}
                    value={newProjectForm.name}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  />
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Client / Partner</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={newProjectForm.client}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, client: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={newProjectForm.department}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, department: e.target.value })}
                      required
                    >
                      <option value="">Select a department...</option>
                      {(departments || []).map(d => (
                        <option key={d.id || d._id} value={d.name}>
                          {d.name} ({d.departmentCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Project Manager</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={newProjectForm.manager}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, manager: e.target.value })}
                      required
                    >
                      <option value="">Select a manager...</option>
                      {(employees || [])
                        .filter(emp => emp.roleId === 'manager' || emp.role?.toLowerCase() === 'manager' || emp.designation?.toLowerCase().includes('manager'))
                        .map(emp => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name} — {emp.designation || emp.position || 'Staff'} ({emp.id})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Team Leader</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={newProjectForm.leader}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, leader: e.target.value })}
                      required
                    >
                      <option value="">Select a team leader...</option>
                      {(employees || [])
                        .filter(emp => emp.roleId === 'team_leader' || emp.role?.toLowerCase().includes('leader') || emp.designation?.toLowerCase().includes('leader') || emp.designation?.toLowerCase().includes('lead'))
                        .map(emp => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name} — {emp.designation || emp.position || 'Staff'} ({emp.id})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Start Date</label>
                    <input
                      type="date"
                      className={styles.textInput}
                      value={newProjectForm.startDate}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Deadline</label>
                    <input
                      type="date"
                      className={styles.textInput}
                      value={newProjectForm.deadline}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, deadline: e.target.value })}
                    />
                  </div>
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Priority Level</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={newProjectForm.priority}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Project Description</label>
                  <textarea
                    className={styles.textArea}
                    value={newProjectForm.description}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`}>
                  {selectedProject ? 'Save Changes' : 'Initialize Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN TEAM */}
      {activeModal === 'assign' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Assign Team Members</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAssignTeamSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Project</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={assignTeamForm.projectId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setAssignTeamForm({ ...assignTeamForm, projectId: selectedId });
                      const targetProj = projects.find(p => p.id === selectedId);
                      setSelectedMembers(targetProj ? targetProj.members : []);
                    }}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Select Employees</label>
                  {assignTeamForm.projectId ? (
                    <div className={styles.employeeCheckboxList}>
                      {(employees || []).map(emp => {
                        const isChecked = selectedMembers.includes(emp.name);
                        return (
                          <div 
                            key={emp.id} 
                            className={styles.employeeCheckboxItem}
                            onClick={() => handleToggleMemberSelection(emp.name)}
                          >
                            <input
                              type="checkbox"
                              className={styles.employeeCheckbox}
                              checked={isChecked}
                              readOnly
                            />
                            <div className={styles.employeeText}>
                              <span className={styles.employeeName}>{emp.name}</span>
                              <span className={styles.employeeDetails}>
                                {emp.designation || emp.position || 'Staff'} ({emp.id})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      Please select a target project first to see and manage employees.
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`} disabled={!assignTeamForm.projectId}>
                  Save Team Assignments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD TASK */}
      {activeModal === 'task' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Project Work Task</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddTaskSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Project</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={addTaskForm.projectId}
                    onChange={(e) => setAddTaskForm({ ...addTaskForm, projectId: e.target.value })}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Perform compliance checklist audit"
                    className={styles.textInput}
                    value={addTaskForm.title}
                    onChange={(e) => setAddTaskForm({ ...addTaskForm, title: e.target.value })}
                  />
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Task Due Date</label>
                    <input
                      type="date"
                      required
                      className={styles.textInput}
                      value={addTaskForm.dueDate}
                      onChange={(e) => setAddTaskForm({ ...addTaskForm, dueDate: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Priority</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={addTaskForm.priority}
                      onChange={(e) => setAddTaskForm({ ...addTaskForm, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`} disabled={!addTaskForm.projectId}>
                  Create Work Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: UPLOAD DOCUMENT */}
      {activeModal === 'document' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Upload Project Documents</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUploadDocSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Project</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={uploadDocForm.projectId}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, projectId: e.target.value })}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Choose File</label>
                  <input
                    type="file"
                    className={styles.textInput}
                    style={{ padding: '8px' }}
                    onChange={handleFileChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Document File Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Budget_Spreadsheet_Q2.xlsx"
                    className={styles.textInput}
                    value={uploadDocForm.docName}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, docName: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>File Format Type</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={uploadDocForm.docType}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, docType: e.target.value })}
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="excel">Excel Sheet (.xlsx)</option>
                    <option value="word">Word Document (.docx)</option>
                    <option value="zip">ZIP Archive (.zip)</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`} disabled={!uploadDocForm.projectId}>
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: GENERATE REPORTS (Section J) */}
      {activeModal === 'report' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Compile Dashboard Analytics Reports</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerateReportSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Project</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={reportForm.projectId}
                    onChange={(e) => setReportForm({ ...reportForm, projectId: e.target.value })}
                    required
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Select Report Focus Area</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={reportForm.reportType}
                    onChange={(e) => setReportForm({ ...reportForm, reportType: e.target.value })}
                  >
                    <option value="progress">Project Progress Report</option>
                    <option value="productivity">Team Productivity Report</option>
                    <option value="deadlines">Deadline Tracking Report</option>
                    <option value="resources">Resource Allocation Report</option>
                    <option value="performance">Department Project Performance</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Export File Format</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={reportForm.format}
                    onChange={(e) => setReportForm({ ...reportForm, format: e.target.value })}
                  >
                    <option value="pdf">Adobe PDF Document (.pdf)</option>
                    <option value="excel">Microsoft Excel Sheet (.xlsx)</option>
                    <option value="csv">Standard CSV File (.csv)</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`}>
                  Compile & Export
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
