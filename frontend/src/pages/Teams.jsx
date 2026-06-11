import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Teams.css';
import { useApp } from '../context/AppContext';
import { FIELD_LABELS } from '../utils/fieldLabels';
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
  AlertTriangle, CheckSquare, Eye, Shield, User, FileCode, Check, Send, Trash, Play, HelpCircle, X
} from 'lucide-react';

// SECTION 2 - 8 initial sample rows
const initialTeams = [];

// Recharts Chart Mock Data moved dynamically inside component

// Dismissible warning & system alerts
const initialAlerts = [];

const initialActivities = [];

const Teams = () => {
  const navigate = useNavigate();
  const isLoading = usePageLoading(600);
  const { addToast, showConfirm, employees, updateEmployee, teams: dbTeams, branches, departments: rawDepartments, addTeam, updateTeam, deleteTeam, projectsList } = useApp();
  const departments = useMemo(() => (rawDepartments || []).filter(d => d.status === 'Active'), [rawDepartments]);

  // Recharts Chart Data (Dynamic useMemos)
  const productivityChartData = useMemo(() => {
    if (!departments || departments.length === 0) return [];
    return departments.map(d => {
      const deptEmps = (employees || []).filter(e => e.department === d.name);
      const avg = deptEmps.length > 0
        ? Math.round(deptEmps.reduce((sum, e) => sum + (e.productivityScore || 90), 0) / deptEmps.length)
        : 90;
      return {
        name: d.name,
        productivity: avg
      };
    });
  }, [departments, employees]);

  const statusChartData = useMemo(() => {
    const counts = {};
    (dbTeams || []).forEach(t => {
      const s = t.status || 'Active';
      counts[s] = (counts[s] || 0) + 1;
    });
    const colors = {
      'Active': '#10b981',
      'Under Review': '#f59e0b',
      'New Team': '#3b82f6',
      'Inactive': '#ef4444',
      'Archived': '#94a3b8'
    };
    return Object.keys(counts).map(status => ({
      name: status,
      value: counts[status],
      color: colors[status] || '#8b5cf6'
    }));
  }, [dbTeams]);

  const workloadChartData = useMemo(() => {
    if (!departments || departments.length === 0) return [];
    return departments.map(d => {
      const deptTeams = (dbTeams || []).filter(t => t.department === d.name);
      const avgUtilization = deptTeams.length > 0
        ? Math.round(deptTeams.reduce((sum, t) => sum + (t.productivity || 85), 0) / deptTeams.length)
        : 80;
      return {
        name: d.name,
        Capacity: 100,
        Workload: Math.round(avgUtilization * 0.9),
        Utilization: avgUtilization
      };
    });
  }, [departments, dbTeams]);

  const attendanceTrendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeEmps = (employees || []).filter(e => e.status !== 'Inactive');
    const presentEmps = activeEmps.filter(e => e.attendanceStatus === 'Present' || e.attendanceStatus === 'Punched In');
    const baseRate = activeEmps.length > 0 ? Math.round((presentEmps.length / activeEmps.length) * 100) : 92;
    
    return days.map((day, idx) => {
      let modifier = 0;
      if (day === 'Mon') modifier = -2;
      else if (day === 'Fri') modifier = -3;
      else if (day === 'Sat' || day === 'Sun') modifier = -10;
      else modifier = 2;
      
      return {
        day,
        Attendance: Math.min(100, Math.max(50, baseRate + modifier))
      };
    });
  }, [employees]);

  // New Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPostAlertModal, setShowPostAlertModal] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);

  // New Form States
  const [exportFormState, setExportFormState] = useState({ format: 'PDF', type: 'Teams Directory', includeInactive: false });
  const [reportFormState, setReportFormState] = useState({ type: 'Performance Summary', dateRange: 'Last 7 Days', targetDepartment: 'All' });
  const [postAlertFormState, setPostAlertFormState] = useState({ type: 'info', text: '' });
  const [schedulerFormState, setSchedulerFormState] = useState({ title: '', date: '', time: '', teamId: '', description: '' });

  // Core Team List State
  const [teams, setTeams] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  React.useEffect(() => {
    if (dbTeams) {
      setTeams(dbTeams);
    }
  }, [dbTeams]);

  // Dynamic KPI calculations for team management cards
  const totalTeamsCount = teams.length;
  const activeTeamsCount = useMemo(() => teams.filter(t => t.status === 'Active').length, [teams]);
  const teamLeadersCount = useMemo(() => {
    return new Set(teams.map(t => t.leader).filter(Boolean)).size;
  }, [teams]);
  const totalMembersCount = useMemo(() => {
    const allMemberIds = teams.flatMap(t => (t.membersList || []).map(m => m.id || m.employeeId || m._id));
    return new Set(allMemberIds.filter(Boolean)).size;
  }, [teams]);
  const activeProjectsCount = useMemo(() => {
    return teams.reduce((acc, t) => acc + (t.activeProjects || 0), 0);
  }, [teams]);
  const leaders = useMemo(() => {
    if (!employees) return [];
    return employees
      .filter(e => e.roleId === 'team_leader' || e.designation?.toLowerCase().includes('team leader'))
      .map(emp => {
        const ledTeam = (teams || []).find(t => t.leader === emp.name);
        return {
          id: emp.id,
          name: emp.name,
          email: emp.email || emp.workEmail || '',
          team: ledTeam ? ledTeam.name : (emp.team || 'Unassigned Team'),
          teamId: ledTeam ? ledTeam.id : null,
          dept: emp.department || 'IT',
          exp: emp.experience || '—',
          score: emp.productivityScore || 90
        };
      });
  }, [employees, teams]);

  const stats = useMemo(() => {
    const total = leaders.length;
    const avgScore = total > 0 ? Math.round(leaders.reduce((sum, l) => sum + l.score, 0) / total) : 0;
    const highest = total > 0 ? [...leaders].sort((a, b) => b.score - a.score)[0] : null;
    return { total, avgScore, highest };
  }, [leaders]);

  const averageProductivity = useMemo(() => {
    if (teams.length === 0) return 0;
    const sum = teams.reduce((acc, t) => acc + (t.productivity || 0), 0);
    return Math.round(sum / teams.length);
  }, [teams]);

  const displayedLeader = useMemo(() => {
    return leaders[0] || null;
  }, [leaders]);

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

  // Additional Modal States
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showRemoveMembersModal, setShowRemoveMembersModal] = useState(false);
  const [showTransferEmployeesModal, setShowTransferEmployeesModal] = useState(false);
  const [showAllocateProjectModal, setShowAllocateProjectModal] = useState(false);
  const [showChangeManagerModal, setShowChangeManagerModal] = useState(false);

  // Form States
  const [assignLeaderForm, setAssignLeaderForm] = useState({ teamId: '', employeeId: '' });
  const [addMembersForm, setAddMembersForm] = useState({ teamId: '', employeeId: '' });
  const [removeMembersForm, setRemoveMembersForm] = useState({ teamId: '', employeeId: '' });
  const [transferForm, setTransferForm] = useState({ employeeId: '', fromTeamId: '', toTeamId: '' });
  const [allocateProjectForm, setAllocateProjectForm] = useState({ teamId: '', projectName: '', description: '', priority: 'Medium', dueDate: '' });
  const [changeManagerForm, setChangeManagerForm] = useState({ employeeId: '', managerName: '' });

  // Dismissible Alert States
  const [alerts, setAlerts] = useState(initialAlerts);
  const [activities, setActivities] = useState(initialActivities);

  // Create Team Form State
  const [newTeam, setNewTeam] = useState({
    name: '',
    code: '',
    department: '',
    branch: '',
    description: '',
    leader: ''
  });

  // Table pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 8 teams displayed in the mock list

  // Validation state
  const [formErrors, setFormErrors] = useState({});

  React.useEffect(() => {
    setSelectedMemberIds([]);
    // Reset leader when branch or department changes
    if (createModalOpen) {
      setNewTeam(prev => ({ ...prev, leader: '' }));
    }
  }, [createModalOpen, newTeam.branch, newTeam.department]);

  // Auto-generate team code based on branch + department
  React.useEffect(() => {
    if (!newTeam.branch || !newTeam.department) return;
    const cleanBranch = (newTeam.branch || '').replace(/branch|office|agency/gi, '').trim();
    const branchAbbr = cleanBranch ? cleanBranch.slice(0, 3).toUpperCase() : 'BR';
    const cleanDept = (newTeam.department || '').trim();
    const deptAbbr = cleanDept ? cleanDept.slice(0, 3).toUpperCase() : 'DPT';
    const prefix = `${branchAbbr}-${deptAbbr}-`;
    const matchingCodes = (dbTeams || [])
      .map(t => t.id || '')
      .filter(code => code && code.startsWith(prefix));
    let nextNum = 1;
    if (matchingCodes.length > 0) {
      const nums = matchingCodes.map(code => {
        const part = code.slice(prefix.length);
        const n = parseInt(part, 10);
        return isNaN(n) ? 0 : n;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const serial = String(nextNum).padStart(2, '0');
    const generatedCode = `${prefix}${serial}`;
    setNewTeam(prev => ({ ...prev, code: generatedCode }));
  }, [newTeam.branch, newTeam.department, dbTeams]);

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
  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newTeam.name) errors.name = 'Team Name is required';
    if (!newTeam.code) errors.code = 'Team Code is required';
    if (!newTeam.leader) errors.leader = 'Team Leader is required';
    if (!newTeam.branch) errors.branch = 'Branch is required';
    if (!newTeam.department) errors.department = 'Department is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('danger', 'Please correct form validation errors.');
      return;
    }

    const selectedEmpObjects = employees.filter(emp => selectedMemberIds.includes(emp.id));
    const membersList = selectedEmpObjects.map(emp => ({
      name: emp.name,
      id: emp.id,
      designation: emp.designation || emp.role || 'Specialist',
      date: new Date().toISOString().split('T')[0],
      attendance: emp.attendanceRate || 95,
      productivity: emp.productivityScore || 90
    }));

    // Find the leader and add them to membersList if not already present
    const isLeaderInList = membersList.some(m => m.name === newTeam.leader);
    if (!isLeaderInList && newTeam.leader) {
      const leaderEmp = employees.find(emp => emp.name === newTeam.leader);
      if (leaderEmp) {
        membersList.unshift({
          name: leaderEmp.name,
          id: leaderEmp.id,
          designation: leaderEmp.designation || 'Team Leader',
          date: new Date().toISOString().split('T')[0],
          attendance: leaderEmp.attendanceRate || 95,
          productivity: leaderEmp.productivityScore || 90
        });
      } else {
        membersList.unshift({
          name: newTeam.leader,
          id: 'EMP-' + Math.floor(Math.random() * 900 + 100),
          designation: 'Team Leader',
          date: new Date().toISOString().split('T')[0],
          attendance: 95,
          productivity: 90
        });
      }
    }

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
      membersList
    };

    await addTeam(createdTeam);
    setCreateModalOpen(false);

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
      department: '',
      branch: '',
      description: '',
      leader: ''
    });
    setSelectedMemberIds([]);
    setFormErrors({});
  };

  const handleExport = (format) => {
    addToast('info', `Exporting data as ${format}...`);
  };

  const handleGenerateAnalyticsReport = () => {
    addToast('info', 'Compiling team performance analytics report...');
    setTimeout(() => {
      const reportContent = `TEAM PERFORMANCE AUDIT REPORT\nDate: ${new Date().toLocaleDateString()}\nActive Teams: ${teams.length}\n`;
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teams_analytics_report_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Report Downloaded Successfully!');
    }, 1000);
  };

  const handleExportFormSubmit = (e) => {
    e.preventDefault();
    addToast('success', `Exported ${exportFormState.type} successfully as ${exportFormState.format}!`);
    setShowExportModal(false);
  };

  const handleReportFormSubmit = (e) => {
    e.preventDefault();
    addToast('info', `Compiling ${reportFormState.type} report...`);
    setTimeout(() => {
      const reportContent = `TEAM ANALYTICS REPORT: ${reportFormState.type.toUpperCase()}
Date Generated: ${new Date().toLocaleString()}
Date Range: ${reportFormState.dateRange}
Target Department: ${reportFormState.targetDepartment}
Active Teams Mapped: ${teams.length}
`;
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportFormState.type.toLowerCase().replace(/\s+/g, '_')}_report.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Report Generated & Downloaded Successfully!');
      setShowReportModal(false);
    }, 800);
  };

  const handlePostAlertSubmit = (e) => {
    e.preventDefault();
    if (!postAlertFormState.text.trim()) {
      addToast('warning', 'Please enter alert message text.');
      return;
    }
    const newAlert = {
      id: Date.now().toString(),
      type: postAlertFormState.type,
      text: postAlertFormState.text
    };
    setAlerts(prev => [newAlert, ...prev]);
    setActivities(prev => [
      { id: Date.now().toString(), type: postAlertFormState.type === 'warning' ? 'yellow' : 'blue', text: `System alert posted: "${postAlertFormState.text}"`, time: 'Just now' },
      ...prev
    ]);
    addToast('success', 'New system alert posted successfully.');
    setPostAlertFormState({ type: 'info', text: '' });
    setShowPostAlertModal(false);
  };

  const handleSchedulerSubmit = (e) => {
    e.preventDefault();
    if (!schedulerFormState.title || !schedulerFormState.date || !schedulerFormState.time || !schedulerFormState.teamId) {
      addToast('warning', 'Please fill in all required scheduler fields.');
      return;
    }
    const team = teams.find(t => t.id === schedulerFormState.teamId);
    setActivities(prev => [
      { id: Date.now().toString(), type: 'green', text: `Meeting "${schedulerFormState.title}" scheduled with ${team?.name || 'team'} for ${schedulerFormState.date} at ${schedulerFormState.time}`, time: 'Just now' },
      ...prev
    ]);
    addToast('success', `Meeting "${schedulerFormState.title}" scheduled successfully.`);
    setSchedulerFormState({ title: '', date: '', time: '', teamId: '', description: '' });
    setShowSchedulerModal(false);
  };

  const handleAssignLeaderSubmit = async (e) => {
    e.preventDefault();
    const { teamId, employeeId } = assignLeaderForm;
    if (!teamId || !employeeId) {
      addToast('warning', 'Please select both team and employee.');
      return;
    }
    const emp = employees.find(x => x.id === employeeId);
    if (!emp) return;

    const team = teams.find(t => t.id === teamId);
    if (team) {
      const isMember = team.membersList?.some(m => m.id === employeeId);
      const updatedList = isMember ? team.membersList : [
        ...(team.membersList || []),
        { name: emp.name, id: emp.id, designation: emp.designation || 'Specialist', date: new Date().toISOString().split('T')[0], attendance: 95, productivity: 90 }
      ];
      await updateTeam(teamId, { leader: emp.name, membersList: updatedList });
    }

    setActivities(prev => [
      { id: Date.now().toString(), type: 'blue', text: `${emp.name} assigned as leader of ${teams.find(t => t.id === teamId)?.name}`, time: 'Just now' },
      ...prev
    ]);
    addToast('success', `${emp.name} is now the leader of selected team.`);
    setShowAssignLeaderModal(false);
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    const { teamId, employeeId } = addMembersForm;
    if (!teamId || !employeeId) {
      addToast('warning', 'Please select both team and employee.');
      return;
    }
    const emp = employees.find(x => x.id === employeeId);
    if (!emp) return;

    const team = teams.find(t => t.id === teamId);
    if (team?.membersList?.some(m => m.id === employeeId)) {
      addToast('warning', 'Employee is already a member of this team.');
      return;
    }

    if (team) {
      const updatedList = [
        ...(team.membersList || []),
        { name: emp.name, id: emp.id, designation: emp.designation || 'Specialist', date: new Date().toISOString().split('T')[0], attendance: 100, productivity: 90 }
      ];
      await updateTeam(teamId, { membersList: updatedList });
    }

    setActivities(prev => [
      { id: Date.now().toString(), type: 'green', text: `${emp.name} added to ${team?.name}`, time: 'Just now' },
      ...prev
    ]);
    addToast('success', `${emp.name} added to team.`);
    setShowAddMembersModal(false);
  };

  const handleRemoveMemberSubmit = async (e) => {
    e.preventDefault();
    const { teamId, employeeId } = removeMembersForm;
    if (!teamId || !employeeId) {
      addToast('warning', 'Please select both team and employee.');
      return;
    }
    const emp = employees.find(x => x.id === employeeId);
    const team = teams.find(t => t.id === teamId);

    if (team) {
      const updatedList = (team.membersList || []).filter(m => m.id !== employeeId);
      await updateTeam(teamId, { membersList: updatedList });
    }

    setActivities(prev => [
      { id: Date.now().toString(), type: 'red', text: `${emp?.name || 'Employee'} removed from ${team?.name}`, time: 'Just now' },
      ...prev
    ]);
    addToast('warning', `Removed employee from team.`);
    setShowRemoveMembersModal(false);
  };

  const handleTransferSubmitLocal = async (e) => {
    e.preventDefault();
    const { employeeId, fromTeamId, toTeamId } = transferForm;
    if (!employeeId || !fromTeamId || !toTeamId) {
      addToast('warning', 'Please complete all transfer fields.');
      return;
    }
    if (fromTeamId === toTeamId) {
      addToast('warning', 'Source and target teams must be different.');
      return;
    }
    const emp = employees.find(x => x.id === employeeId);
    const fromTeam = teams.find(t => t.id === fromTeamId);
    const toTeam = teams.find(t => t.id === toTeamId);

    if (fromTeam && toTeam) {
      const fromUpdatedList = (fromTeam.membersList || []).filter(m => m.id !== employeeId);
      const toUpdatedList = [
        ...(toTeam.membersList || []),
        { name: emp?.name || 'Transfer Staff', id: employeeId, designation: emp?.designation || 'Specialist', date: new Date().toISOString().split('T')[0], attendance: 95, productivity: 90 }
      ];
      await updateTeam(fromTeamId, { membersList: fromUpdatedList });
      await updateTeam(toTeamId, { membersList: toUpdatedList });
    }

    setActivities(prev => [
      { id: Date.now().toString(), type: 'blue', text: `${emp?.name || 'Employee'} transferred from ${fromTeam?.name} to ${toTeam?.name}`, time: 'Just now' },
      ...prev
    ]);
    addToast('success', `Employee transferred successfully.`);
    setShowTransferEmployeesModal(false);
  };

  const handleAllocateProjectSubmit = async (e) => {
    e.preventDefault();
    const { teamId, projectName } = allocateProjectForm;
    if (!teamId || !projectName) {
      addToast('warning', 'Please select team and enter project name.');
      return;
    }
    const team = teams.find(t => t.id === teamId);

    if (team) {
      await updateTeam(teamId, { activeProjects: (team.activeProjects || 0) + 1 });
    }

    setActivities(prev => [
      { id: Date.now().toString(), type: 'green', text: `Project "${projectName}" allocated to ${team?.name}`, time: 'Just now' },
      ...prev
    ]);
    addToast('success', `Project "${projectName}" allocated to ${team?.name}.`);
    setShowAllocateProjectModal(false);
  };

  const handleChangeManagerSubmit = (e) => {
    e.preventDefault();
    const { employeeId, managerName } = changeManagerForm;
    if (!employeeId || !managerName) {
      addToast('warning', 'Please select employee and manager.');
      return;
    }
    const emp = employees.find(x => x.id === employeeId);
    if (!emp) return;

    updateEmployee(employeeId, { teamLeader: managerName });

    setActivities(prev => [
      { id: Date.now().toString(), type: 'blue', text: `Reporting manager for ${emp.name} updated to ${managerName}`, time: 'Just now' },
      ...prev
    ]);
    addToast('success', `Reporting manager for ${emp.name} updated.`);
    setShowChangeManagerModal(false);
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
                  { label: 'Total Teams', desc: 'Active organizational groups', value: totalTeamsCount, trend: '↑ 4.2% this month', icon: Users, colorClass: 'teams-top-icon-blue' },
                  { label: 'Active Teams', desc: 'Teams with active task pipelines', value: activeTeamsCount, trend: '↑ 2.1% this month', icon: CheckCircle2, colorClass: 'teams-top-icon-green' },
                  { label: 'Team Leaders', desc: 'Designated team commanders', value: teamLeadersCount, trend: '↑ 1.8% this month', icon: Award, colorClass: 'teams-top-icon-purple' },
                  { label: 'Total Members', desc: 'Employees assigned to groups', value: totalMembersCount.toLocaleString(), trend: '↑ 6.3% this month', icon: Users, colorClass: 'teams-top-icon-amber' },
                  { label: 'Active Projects', desc: 'Ongoing deliverables mapped', value: activeProjectsCount, trend: '↑ 3.5% this month', icon: Briefcase, colorClass: 'teams-top-icon-coral' },
                  { label: 'Productivity Rate', desc: 'Average velocity rating', value: `${averageProductivity}%`, trend: '↑ 1.2% this month', icon: BarChart2, colorClass: 'teams-top-icon-teal' }
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
                      {(departments || []).map(d => (
                        <option key={d.id || d._id} value={d.name}>{d.name}</option>
                      ))}
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
                      {(branches || []).map(b => (
                        <option key={b.id || b._id} value={b.name}>{b.name}</option>
                      ))}
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
                      <th>{FIELD_LABELS.teamLeader}</th>
                      <th>Department</th>
                      <th>{FIELD_LABELS.branch}</th>
                      <th className="text-center">Active Projects</th>
                      <th className="text-center">Completed Tasks</th>
                      <th className="text-center">Productivity Rate</th>
                      <th className="text-center">Attendance Rate</th>
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
                                    deleteTeam(t.id);
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

              {/* Performance Score Cards — real data */}
              <div className="teams-mini-score-grid">
                {[
                  {
                    label: 'Team Productivity',
                    value: teams.length > 0
                      ? `${Math.round(teams.reduce((s, t) => s + (t.productivity || 0), 0) / teams.length)}%`
                      : '—'
                  },
                  {
                    label: 'Attendance Average',
                    value: teams.length > 0
                      ? `${Math.round(teams.reduce((s, t) => s + (t.attendance || 0), 0) / teams.length)}%`
                      : '—'
                  },
                  {
                    label: 'Total Tasks Done',
                    value: teams.reduce((s, t) => s + (t.completedTasks || 0), 0)
                  },
                  {
                    label: 'Active Projects',
                    value: teams.reduce((s, t) => s + (t.activeProjects || 0), 0)
                  }
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
                {/* Rankings Table — sorted by real productivity */}
                <div>
                  <div className="teams-filter-label" style={{ marginBottom: 12, display: 'block' }}>
                    Leaderboard rankings (by productivity)
                  </div>
                  {[...teams]
                    .sort((a, b) => (b.productivity || 0) - (a.productivity || 0))
                    .slice(0, 5)
                    .map((t, idx) => {
                      const rankColors = ['teams-rank-gold', 'teams-rank-silver', 'teams-rank-bronze', '', ''];
                      return (
                    <div key={t.id} className="teams-rank-row">
                      <div className={`teams-rank-num ${rankColors[idx]}`}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="bold-text" style={{ fontSize: '0.875rem' }}>{t.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{(t.membersList || []).length} members • {t.department}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="bold-text text-success" style={{ fontSize: '0.875rem' }}>{t.productivity || 0}%</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>Tasks done: {t.completedTasks || 0}</div>
                      </div>
                    </div>
                    );
                  })}
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
                <Badge variant="success">
                  {teams.length > 0
                    ? `${Math.round(teams.reduce((s, t) => s + (t.attendance || 0), 0) / teams.length)}% Avg Attendance`
                    : '—'}
                </Badge>
              </div>

              <div className="teams-rankings-workload">
                {/* Stats overview cards — real data */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(() => {
                    const activeEmps = (employees || []).filter(e => e.status !== 'Inactive');
                    const onLeave = activeEmps.filter(e => e.attendanceStatus === 'On Leave' || e.attendanceStatus === 'Leave');
                    const leavePct = activeEmps.length > 0 ? ((onLeave.length / activeEmps.length) * 100).toFixed(1) : 0;
                    const lateEmps = activeEmps.filter(e => e.attendanceStatus === 'Late' || e.attendanceStatus === 'Late Arrival');
                    const latePct = activeEmps.length > 0 ? ((lateEmps.length / activeEmps.length) * 100).toFixed(1) : 0;
                    const totalOT = activeEmps.reduce((s, e) => s + (e.overtimeHours || 0), 0);
                    const presentOrPunched = activeEmps.filter(e => e.attendanceStatus === 'Present' || e.attendanceStatus === 'Punched In' || e.attendanceStatus === 'Late');
                    const shiftCov = activeEmps.length > 0 ? ((presentOrPunched.length / activeEmps.length) * 100).toFixed(1) : 0;
                    return [
                      { title: 'On Leave Today', value: `${leavePct}%`, desc: `${onLeave.length} employees currently on leave` },
                      { title: 'Late Arrivals', value: `${latePct}%`, desc: `${lateEmps.length} employees arrived late` },
                      { title: 'Overtime Hours', value: `${totalOT} hrs`, desc: 'Total logged overtime across all employees' },
                      { title: 'Shift Coverage', value: `${shiftCov}%`, desc: `${presentOrPunched.length} of ${activeEmps.length} active employees present` }
                    ];
                  })().map((stat, idx) => (
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
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => { setAssignLeaderForm({ teamId: '', employeeId: '' }); setShowAssignLeaderModal(true); }}>Assign Leader</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => { setAddMembersForm({ teamId: '', employeeId: '' }); setShowAddMembersModal(true); }}>Add Members</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => { setTransferForm({ employeeId: '', fromTeamId: '', toTeamId: '' }); setShowTransferEmployeesModal(true); }}>Transfer Staff</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => { setAllocateProjectForm({ teamId: '', projectName: '', description: '', priority: 'Medium', dueDate: '' }); setShowAllocateProjectModal(true); }}>Allocate Project</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem' }} onClick={() => { setExportFormState({ format: exportFormat, type: 'Teams Directory', includeInactive: false }); setShowExportModal(true); }}>Export Registry</Button>
                  <Button variant="secondary" style={{ padding: '8px 4px', fontSize: '0.75rem', gridColumn: 'span 2' }} onClick={() => { setReportFormState({ type: 'Performance Summary', dateRange: 'Last 7 Days', targetDepartment: 'All' }); setShowReportModal(true); }}>Generate Analytics Reports</Button>
                </div>
              </div>

              {/* SECTION 5 — TEAM MEMBER MANAGEMENT */}
              <div className="teams-card">
                <h3 className="teams-card-title" style={{ marginBottom: 16 }}>
                  <Shield size={16} style={{ color: '#ef4444' }} />
                  <span>Super Admin Actions</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => { setAddMembersForm({ teamId: '', employeeId: '' }); setShowAddMembersModal(true); }}>➕ Add Team Members</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => { setRemoveMembersForm({ teamId: '', employeeId: '' }); setShowRemoveMembersModal(true); }}>➖ Remove Team Members</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => { setTransferForm({ employeeId: '', fromTeamId: '', toTeamId: '' }); setShowTransferEmployeesModal(true); }}>🔄 Transfer Employees</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => { setAssignLeaderForm({ teamId: '', employeeId: '' }); setShowAssignLeaderModal(true); }}>👤 Assign Team Leader</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => { setChangeManagerForm({ employeeId: '', managerName: '' }); setShowChangeManagerModal(true); }}>🔁 Change Reporting Manager</button>
                  <button className="teams-export-btn" style={{ justifyContent: 'center' }} onClick={() => { setAllocateProjectForm({ teamId: '', projectName: '', description: '', priority: 'Medium', dueDate: '' }); setShowAllocateProjectModal(true); }}>📁 Allocate Projects</button>
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
                    <Avatar name={displayedLeader?.name || 'No Active Leader'} size="md" />
                    <div>
                      <div className="bold-text" style={{ fontSize: '0.875rem' }}>{displayedLeader?.name || 'No Designated Team Leader'}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>ID: {displayedLeader?.id || '—'} | {displayedLeader?.dept || '—'} Lead</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Contact:</strong> {displayedLeader?.email || '—'}</div>
                    <div><strong>Assigned Team:</strong> {displayedLeader?.team || '—'}</div>
                    <div><strong>Experience:</strong> {displayedLeader?.exp || '—'}</div>
                    <div><strong>Performance Score:</strong> <span className="text-success bold-text">{displayedLeader?.score ? `${displayedLeader.score}%` : '—'}</span></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <Button variant="secondary" size="sm" onClick={() => { setAssignLeaderForm({ teamId: displayedLeader?.teamId || '', employeeId: '' }); setShowAssignLeaderModal(true); }}>Change Lead</Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/permissions')}>Permissions</Button>
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
                  <Button variant="secondary" size="sm" onClick={() => { setPostAlertFormState({ type: 'info', text: '' }); setShowPostAlertModal(true); }}>Post Alert</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setSchedulerFormState({ title: '', date: '', time: '', teamId: '', description: '' }); setShowSchedulerModal(true); }}>Meet Calendar</Button>
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
            <span>Total Teams: {totalTeamsCount}</span>
          </div>
          <div className="teams-footer-pill">
            <Users size={14} style={{ color: '#10b981' }} />
            <span>Active Teams: {activeTeamsCount}</span>
          </div>
          <div className="teams-footer-pill">
            <Users size={14} style={{ color: '#8b5cf6' }} />
            <span>Total Members: {totalMembersCount.toLocaleString()}</span>
          </div>
          <div className="teams-footer-pill">
            <Award size={14} style={{ color: '#f59e0b' }} />
            <span>Avg Productivity: {averageProductivity}%</span>
          </div>
          <div className="teams-footer-pill">
            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            <span>Team Leaders: {teamLeadersCount}</span>
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
                    <label>Branch / Agency*</label>
                    <select
                      className="teams-filter-select"
                      value={newTeam.branch}
                      onChange={e => {
                        const selectedBranch = e.target.value;
                        const filtered = (departments || []).filter(
                          d => d.branch?.trim().toLowerCase() === selectedBranch.trim().toLowerCase()
                        );
                        const firstDept = filtered.length > 0 ? filtered[0].name : '';
                        setNewTeam(prev => ({
                          ...prev,
                          branch: selectedBranch,
                          department: firstDept
                        }));
                      }}
                      required
                    >
                      <option value="">Select Branch/Agency</option>
                      {(branches || []).map(b => (
                        <option key={b.id || b._id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-group">
                    <label>Department*</label>
                    <select
                      className="teams-filter-select"
                      value={newTeam.department}
                      onChange={e => setNewTeam(prev => ({ ...prev, department: e.target.value }))}
                      required
                    >
                      <option value="">Select Department</option>
                      {(departments || [])
                        .filter(
                          d => d.branch?.trim().toLowerCase() === newTeam.branch?.trim().toLowerCase()
                        )
                        .map(d => (
                          <option key={d.id || d._id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
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
                    {!newTeam.branch || !newTeam.department ? (
                      <div className="text-muted text-xs" style={{ padding: '8px 0' }}>
                        Please select a Branch and Department first.
                      </div>
                    ) : (
                      <>
                        <select
                          className="teams-filter-select"
                          value={newTeam.leader}
                          onChange={e => setNewTeam(prev => ({ ...prev, leader: e.target.value }))}
                          style={{ borderColor: formErrors.leader ? '#ef4444' : '' }}
                          required
                        >
                          <option value="">Select Team Leader</option>
                          {employees.filter(emp => {
                            const role = (emp.role || '').toLowerCase();
                            const roleId = (emp.roleId || '').toLowerCase();
                            const designation = (emp.designation || '').toLowerCase();
                            const isManager = role.includes('manager') || roleId.includes('manager') || designation.includes('manager');
                            const isAdmin = role.includes('admin') || roleId.includes('admin') || designation.includes('admin');
                            const matchesBranch = emp.branch?.trim().toLowerCase() === newTeam.branch?.trim().toLowerCase();
                            const matchesDept = emp.department?.trim().toLowerCase() === newTeam.department?.trim().toLowerCase();
                            return matchesBranch && matchesDept && !isManager && !isAdmin;
                          }).map(emp => (
                            <option key={emp.id} value={emp.name}>{emp.name} - {emp.designation || 'Team Leader'} ({emp.id})</option>
                          ))}
                        </select>
                        {employees.filter(emp => {
                          const role = (emp.role || '').toLowerCase();
                          const roleId = (emp.roleId || '').toLowerCase();
                          const designation = (emp.designation || '').toLowerCase();
                          const isManager = role.includes('manager') || roleId.includes('manager') || designation.includes('manager');
                          const isAdmin = role.includes('admin') || roleId.includes('admin') || designation.includes('admin');
                          const matchesBranch = emp.branch?.trim().toLowerCase() === newTeam.branch?.trim().toLowerCase();
                          const matchesDept = emp.department?.trim().toLowerCase() === newTeam.department?.trim().toLowerCase();
                          return matchesBranch && matchesDept && !isManager && !isAdmin;
                        }).length === 0 && (
                          <span className="text-muted text-xs" style={{ display: 'block', marginTop: 4 }}>
                            No team leaders found in this branch &amp; department.
                          </span>
                        )}
                      </>
                    )}
                    {formErrors.leader && <span className="text-danger text-xs">{formErrors.leader}</span>}
                  </div>
                </div>
              </div>

              {/* Team Members Assignment */}
              <div>
                <div className="teams-slideover-section-title" style={{ marginTop: 16 }}>Team Members Assignment</div>
                {!newTeam.branch || !newTeam.department ? (
                  <div className="text-muted text-xs" style={{ padding: '8px 0' }}>
                    Please select a Branch and Department first to view available employees.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 12, background: 'var(--bg-input)' }}>
                    {employees.filter(emp => {
                      const role = (emp.role || '').toLowerCase();
                      const roleId = (emp.roleId || '').toLowerCase();
                      const designation = (emp.designation || '').toLowerCase();
                      const isManager = role.includes('manager') || roleId.includes('manager') || designation.includes('manager');
                      const isLeader = role.includes('leader') || role.includes('lead') || roleId.includes('leader') || roleId.includes('lead') || designation.includes('leader') || designation.includes('lead');
                      const isAdmin = role.includes('admin') || roleId.includes('admin') || designation.includes('admin');
                      const isGeneralEmployee = (roleId === 'employee' || role === 'employee') && !isManager && !isLeader && !isAdmin;
                      return emp.branch?.trim().toLowerCase() === newTeam.branch?.trim().toLowerCase() &&
                             emp.department?.trim().toLowerCase() === newTeam.department?.trim().toLowerCase() &&
                             emp.name !== newTeam.leader &&
                             isGeneralEmployee;
                    }).length === 0 ? (
                      <span className="text-muted text-xs">No other employees found in this branch and department.</span>
                    ) : (
                      employees.filter(emp => {
                        const role = (emp.role || '').toLowerCase();
                        const roleId = (emp.roleId || '').toLowerCase();
                        const designation = (emp.designation || '').toLowerCase();
                        const isManager = role.includes('manager') || roleId.includes('manager') || designation.includes('manager');
                        const isLeader = role.includes('leader') || role.includes('lead') || roleId.includes('leader') || roleId.includes('lead') || designation.includes('leader') || designation.includes('lead');
                        const isAdmin = role.includes('admin') || roleId.includes('admin') || designation.includes('admin');
                        const isGeneralEmployee = (roleId === 'employee' || role === 'employee') && !isManager && !isLeader && !isAdmin;
                        return emp.branch?.trim().toLowerCase() === newTeam.branch?.trim().toLowerCase() &&
                               emp.department?.trim().toLowerCase() === newTeam.department?.trim().toLowerCase() &&
                               emp.name !== newTeam.leader &&
                               isGeneralEmployee;
                      }).map(emp => (
                        <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', cursor: 'pointer', color: 'var(--text-primary)', width: '100%', margin: '6px 0' }}>
                          <input
                            type="checkbox"
                            style={{ width: '16px', height: '16px', minWidth: '16px', padding: 0, margin: 0, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                            checked={selectedMemberIds.includes(emp.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedMemberIds(prev => [...prev, emp.id]);
                              } else {
                                setSelectedMemberIds(prev => prev.filter(id => id !== emp.id));
                              }
                            }}
                          />
                          <span>{emp.name} - {emp.designation || 'Staff'} ({emp.id})</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
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
                </div>
              )}

              {/* Tab 2: Members */}
              {activeDrawerTab === 'members' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="teams-search-actions">
                    <div className="teams-filter-label">Assigned Members List</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="secondary" size="sm" onClick={() => { setAddMembersForm({ teamId: selectedTeam.id, employeeId: '' }); setShowAddMembersModal(true); }}>Add Member</Button>
                      <Button variant="secondary" size="sm" onClick={() => { setRemoveMembersForm({ teamId: selectedTeam.id, employeeId: '' }); setShowRemoveMembersModal(true); }}>Remove Member</Button>
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
{selectedTeam.membersList && selectedTeam.membersList.filter(m => m.name !== selectedTeam.leader).map((m, idx) => (
  <div key={idx} style={{ paddingLeft: 16 }}>├── {m.name} ({m.designation || 'Specialist'})</div>
))}
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

      {/* Assign Team Leader Modal */}
      {showAssignLeaderModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAssignLeaderModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Team Leader</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowAssignLeaderModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignLeaderSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Select Team*</label>
                    <select
                      className="teams-filter-select"
                      value={assignLeaderForm.teamId}
                      onChange={e => setAssignLeaderForm(prev => ({ ...prev, teamId: e.target.value }))}
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Select Employee as Leader*</label>
                    <select
                      className="teams-filter-select"
                      value={assignLeaderForm.employeeId}
                      onChange={e => setAssignLeaderForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      required
                    >
                      <option value="">Select Employee</option>
                      {(() => {
                        const selectedTeamObj = teams.find(t => t.id === assignLeaderForm.teamId);
                        return employees.filter(emp => {
                          const role = (emp.role || '').toLowerCase();
                          const roleId = (emp.roleId || '').toLowerCase();
                          const designation = (emp.designation || '').toLowerCase();
                          const isManager = role.includes('manager') || roleId.includes('manager') || designation.includes('manager');
                          const isAdmin = role.includes('admin') || roleId.includes('admin') || designation.includes('admin');
                          
                          if (isManager || isAdmin) return false;
                          if (!selectedTeamObj) return true;
                          
                          const matchesBranch = emp.branch?.trim().toLowerCase() === selectedTeamObj.branch?.trim().toLowerCase();
                          const matchesDept = emp.department?.trim().toLowerCase() === selectedTeamObj.department?.trim().toLowerCase();
                          return matchesBranch && matchesDept;
                        }).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} - {emp.designation || 'Staff'} ({emp.id})</option>
                        ));
                      })()}
                    </select>
                    {(() => {
                      const selectedTeamObj = teams.find(t => t.id === assignLeaderForm.teamId);
                      if (selectedTeamObj) {
                        const hasCandidates = employees.some(emp => {
                          const role = (emp.role || '').toLowerCase();
                          const roleId = (emp.roleId || '').toLowerCase();
                          const designation = (emp.designation || '').toLowerCase();
                          const isManager = role.includes('manager') || roleId.includes('manager') || designation.includes('manager');
                          const isAdmin = role.includes('admin') || roleId.includes('admin') || designation.includes('admin');
                          
                          if (isManager || isAdmin) return false;
                          const matchesBranch = emp.branch?.trim().toLowerCase() === selectedTeamObj.branch?.trim().toLowerCase();
                          const matchesDept = emp.department?.trim().toLowerCase() === selectedTeamObj.department?.trim().toLowerCase();
                          return matchesBranch && matchesDept;
                        });
                        if (!hasCandidates) {
                          return (
                            <span className="text-muted text-xs" style={{ display: 'block', marginTop: 4 }}>
                              No eligible leaders found in this team's branch &amp; department.
                            </span>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowAssignLeaderModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Assign Leader</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Team Members Modal */}
      {showAddMembersModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAddMembersModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Team Members</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowAddMembersModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddMemberSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Select Target Team*</label>
                    <select
                      className="teams-filter-select"
                      value={addMembersForm.teamId}
                      onChange={e => setAddMembersForm(prev => ({ ...prev, teamId: e.target.value }))}
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Select Employee to Add*</label>
                    <select
                      className="teams-filter-select"
                      value={addMembersForm.employeeId}
                      onChange={e => setAddMembersForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      required
                    >
                      <option value="">Select Employee</option>
                      {(() => {
                        const targetTeamObj = teams.find(t => t.id === addMembersForm.teamId);
                        return employees.filter(emp => {
                          const role = (emp.role || '').toLowerCase();
                          const roleId = (emp.roleId || '').toLowerCase();
                          const designation = (emp.designation || '').toLowerCase();
                          const isManager = role.includes('manager') || roleId.includes('manager') || designation.includes('manager');
                          const isLeader = role.includes('leader') || role.includes('lead') || roleId.includes('leader') || roleId.includes('lead') || designation.includes('leader') || designation.includes('lead');
                          const isAdmin = role.includes('admin') || roleId.includes('admin') || designation.includes('admin');
                          
                          const isGeneralEmployee = (roleId === 'employee' || role === 'employee') && !isManager && !isLeader && !isAdmin;
                          if (!isGeneralEmployee) return false;
                          if (!targetTeamObj) return true;
                          
                          const matchesBranch = emp.branch?.trim().toLowerCase() === targetTeamObj.branch?.trim().toLowerCase();
                          const matchesDept = emp.department?.trim().toLowerCase() === targetTeamObj.department?.trim().toLowerCase();
                          return matchesBranch && matchesDept;
                        }).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} - {emp.designation || 'Staff'} ({emp.id})</option>
                        ));
                      })()}
                    </select>
                    {(() => {
                      const targetTeamObj = teams.find(t => t.id === addMembersForm.teamId);
                      if (targetTeamObj) {
                        const hasCandidates = employees.some(emp => {
                          const role = (emp.role || '').toLowerCase();
                          const roleId = (emp.roleId || '').toLowerCase();
                          const designation = (emp.designation || '').toLowerCase();
                          const isManager = role.includes('manager') || roleId.includes('manager') || designation.includes('manager');
                          const isLeader = role.includes('leader') || role.includes('lead') || roleId.includes('leader') || roleId.includes('lead') || designation.includes('leader') || designation.includes('lead');
                          const isAdmin = role.includes('admin') || roleId.includes('admin') || designation.includes('admin');
                          
                          const isGeneralEmployee = (roleId === 'employee' || role === 'employee') && !isManager && !isLeader && !isAdmin;
                          if (!isGeneralEmployee) return false;
                          const matchesBranch = emp.branch?.trim().toLowerCase() === targetTeamObj.branch?.trim().toLowerCase();
                          const matchesDept = emp.department?.trim().toLowerCase() === targetTeamObj.department?.trim().toLowerCase();
                          return matchesBranch && matchesDept;
                        });
                        if (!hasCandidates) {
                          return (
                            <span className="text-muted text-xs" style={{ display: 'block', marginTop: 4 }}>
                              No eligible employees found in this team's branch &amp; department.
                            </span>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowAddMembersModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Add Member</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Team Members Modal */}
      {showRemoveMembersModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowRemoveMembersModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Remove Team Members</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowRemoveMembersModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRemoveMemberSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Select Team*</label>
                    <select
                      className="teams-filter-select"
                      value={removeMembersForm.teamId}
                      onChange={e => {
                        const val = e.target.value;
                        setRemoveMembersForm({ teamId: val, employeeId: '' });
                      }}
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Select Member to Remove*</label>
                    <select
                      className="teams-filter-select"
                      value={removeMembersForm.employeeId}
                      onChange={e => setRemoveMembersForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      disabled={!removeMembersForm.teamId}
                      required
                    >
                      <option value="">Select Member</option>
                      {teams.find(t => t.id === removeMembersForm.teamId)?.membersList?.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowRemoveMembersModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Remove Member</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Employees Modal */}
      {showTransferEmployeesModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowTransferEmployeesModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Transfer Employees</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowTransferEmployeesModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTransferSubmitLocal}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Select Source Team*</label>
                    <select
                      className="teams-filter-select"
                      value={transferForm.fromTeamId}
                      onChange={e => {
                        const val = e.target.value;
                        setTransferForm({ fromTeamId: val, employeeId: '', toTeamId: '' });
                      }}
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Select Employee to Transfer*</label>
                    <select
                      className="teams-filter-select"
                      value={transferForm.employeeId}
                      onChange={e => setTransferForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      disabled={!transferForm.fromTeamId}
                      required
                    >
                      <option value="">Select Employee</option>
                      {teams.find(t => t.id === transferForm.fromTeamId)?.membersList?.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Select Target Team*</label>
                    <select
                      className="teams-filter-select"
                      value={transferForm.toTeamId}
                      onChange={e => setTransferForm(prev => ({ ...prev, toTeamId: e.target.value }))}
                      disabled={!transferForm.employeeId}
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.filter(t => t.id !== transferForm.fromTeamId).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowTransferEmployeesModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Transfer Employee</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Project Modal */}
      {showAllocateProjectModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowAllocateProjectModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Allocate Project to Team</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowAllocateProjectModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAllocateProjectSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Select Target Team*</label>
                    <select
                      className="teams-filter-select"
                      value={allocateProjectForm.teamId}
                      onChange={e => setAllocateProjectForm(prev => ({ ...prev, teamId: e.target.value }))}
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Project Name*</label>
                    <input
                      type="text"
                      placeholder="Enter project name (e.g. Nexus Phase 2)"
                      value={allocateProjectForm.projectName}
                      onChange={e => setAllocateProjectForm(prev => ({ ...prev, projectName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Description</label>
                    <textarea
                      rows={3}
                      placeholder="Project deliverables overview..."
                      value={allocateProjectForm.description}
                      onChange={e => setAllocateProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 10, color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div className="teams-form-group" style={{ marginTop: '12px' }}>
                    <label>Priority</label>
                    <select
                      className="teams-filter-select"
                      value={allocateProjectForm.priority}
                      onChange={e => setAllocateProjectForm(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="teams-form-group" style={{ marginTop: '12px' }}>
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={allocateProjectForm.dueDate}
                      onChange={e => setAllocateProjectForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowAllocateProjectModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Allocate Project</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Reporting Manager Modal */}
      {showChangeManagerModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowChangeManagerModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Change Reporting Manager</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowChangeManagerModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleChangeManagerSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Select Employee*</label>
                    <select
                      className="teams-filter-select"
                      value={changeManagerForm.employeeId}
                      onChange={e => {
                        const val = e.target.value;
                        const emp = employees.find(x => x.id === val);
                        setChangeManagerForm({ employeeId: val, managerName: emp?.teamLeader || '' });
                      }}
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>New Reporting Manager Name*</label>
                    <select
                      className="teams-filter-select"
                      value={changeManagerForm.managerName}
                      onChange={e => setChangeManagerForm(prev => ({ ...prev, managerName: e.target.value }))}
                      required
                    >
                      <option value="">Select Manager</option>
                      {employees.filter(emp => emp.id !== changeManagerForm.employeeId).map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name} - {emp.designation || 'Staff'} ({emp.id})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowChangeManagerModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Change Manager</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Registry Modal */}
      {showExportModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowExportModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Export Teams Registry</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowExportModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleExportFormSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Export Format*</label>
                    <select
                      className="teams-filter-select"
                      value={exportFormState.format}
                      onChange={e => setExportFormState(prev => ({ ...prev, format: e.target.value }))}
                      required
                    >
                      <option value="PDF">PDF (Portable Document Format)</option>
                      <option value="Excel">Excel Spreadsheet (XLSX)</option>
                      <option value="CSV">Comma Separated Values (CSV)</option>
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Registry Target Scope*</label>
                    <select
                      className="teams-filter-select"
                      value={exportFormState.type}
                      onChange={e => setExportFormState(prev => ({ ...prev, type: e.target.value }))}
                      required
                    >
                      <option value="Teams Directory">Teams Directory (Detailed Metadata)</option>
                      <option value="Roster Allocation">Roster & Member Allocations</option>
                      <option value="Full Hierarchy">Full Departmental Hierarchy</option>
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="includeInactive"
                      checked={exportFormState.includeInactive}
                      onChange={e => setExportFormState(prev => ({ ...prev, includeInactive: e.target.checked }))}
                      style={{ width: 'auto', margin: 0 }}
                    />
                    <label htmlFor="includeInactive" style={{ margin: 0, fontSize: '0.78rem', cursor: 'pointer' }}>Include inactive and archived teams</label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowExportModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Export Registry</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Analytics Reports Modal */}
      {showReportModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowReportModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Configure Analytics Report</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowReportModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReportFormSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Report Type*</label>
                    <select
                      className="teams-filter-select"
                      value={reportFormState.type}
                      onChange={e => setReportFormState(prev => ({ ...prev, type: e.target.value }))}
                      required
                    >
                      <option value="Performance Summary">Team Performance Summary</option>
                      <option value="Employee Workload Audit">Employee Workload & Capacity Audit</option>
                      <option value="Roster Attendance Analytics">Roster Attendance Analytics</option>
                    </select>
                  </div>
                  <div className="teams-form-group" style={{ marginTop: '12px' }}>
                    <label>Date Range*</label>
                    <select
                      className="teams-filter-select"
                      value={reportFormState.dateRange}
                      onChange={e => setReportFormState(prev => ({ ...prev, dateRange: e.target.value }))}
                      required
                    >
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="Current Month">Current Month</option>
                      <option value="Last Quarter">Last Quarter</option>
                    </select>
                  </div>
                  <div className="teams-form-group" style={{ marginTop: '12px' }}>
                    <label>Target Department*</label>
                    <select
                      className="teams-filter-select"
                      value={reportFormState.targetDepartment}
                      onChange={e => setReportFormState(prev => ({ ...prev, targetDepartment: e.target.value }))}
                      required
                    >
                      <option value="All">All Departments</option>
                      <option value="IT">IT (Tech)</option>
                      <option value="HR">HR</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowReportModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Generate & Download</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Alert Modal */}
      {showPostAlertModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowPostAlertModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Post System Alert</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowPostAlertModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePostAlertSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Alert Type*</label>
                    <select
                      className="teams-filter-select"
                      value={postAlertFormState.type}
                      onChange={e => setPostAlertFormState(prev => ({ ...prev, type: e.target.value }))}
                      required
                    >
                      <option value="info">Information (Blue Announcement)</option>
                      <option value="warning">Warning (Yellow/Amber Alert)</option>
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Alert Message Content*</label>
                    <textarea
                      rows={3}
                      placeholder="Enter announcement text or system alert description..."
                      value={postAlertFormState.text}
                      onChange={e => setPostAlertFormState(prev => ({ ...prev, text: e.target.value }))}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 10, color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowPostAlertModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Post Alert</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showSchedulerModal && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setShowSchedulerModal(false)}>
          <div className="modal-container modal-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Schedule Team Meeting</h3>
              <button className="modal-close-btn" type="button" onClick={() => setShowSchedulerModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSchedulerSubmit}>
              <div className="modal-body">
                <div className="teams-form-grid">
                  <div className="teams-form-full">
                    <label>Meeting Title*</label>
                    <input
                      type="text"
                      placeholder="e.g. Q2 Architecture Planning"
                      value={schedulerFormState.title}
                      onChange={e => setSchedulerFormState(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="teams-form-group" style={{ marginTop: '12px' }}>
                    <label>Date*</label>
                    <input
                      type="date"
                      value={schedulerFormState.date}
                      onChange={e => setSchedulerFormState(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="teams-form-group" style={{ marginTop: '12px' }}>
                    <label>Time*</label>
                    <input
                      type="time"
                      value={schedulerFormState.time}
                      onChange={e => setSchedulerFormState(prev => ({ ...prev, time: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Invite Team*</label>
                    <select
                      className="teams-filter-select"
                      value={schedulerFormState.teamId}
                      onChange={e => setSchedulerFormState(prev => ({ ...prev, teamId: e.target.value }))}
                      required
                    >
                      <option value="">Select Target Team</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="teams-form-full" style={{ marginTop: '12px' }}>
                    <label>Description / Agenda</label>
                    <textarea
                      rows={2}
                      placeholder="Brief description of the call agenda..."
                      value={schedulerFormState.description}
                      onChange={e => setSchedulerFormState(prev => ({ ...prev, description: e.target.value }))}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 10, color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowSchedulerModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Schedule Meeting</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Teams;
