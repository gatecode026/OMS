import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Employees.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import SlideOver from '../components/common/SlideOver';
import Skeleton from '../components/common/Skeleton';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, UserPlus, Eye, Edit2, Trash2, ChevronRight, ArrowLeft,
  Phone, Mail, Calendar, CheckCircle, XCircle, UserCheck, Download,
  SlidersHorizontal, RefreshCw, Users, Briefcase, Activity,
  MoreVertical, Copy, X, ChevronUp, ChevronDown, Trophy, AlertTriangle,
  BarChart2, TrendingUp, Shield, Clock, MapPin, User, Star
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtJoinDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

const isNewJoiner = (dateStr) => {
  if (!dateStr) return false;
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 30 * 24 * 60 * 60 * 1000;
};

const downloadCSV = (employees) => {
  const headers = ['ID','Name','Email','Phone','Department','Branch','Role','Status','Account Status'];
  const rows = employees.map(e => [
    e.id, e.name, e.workEmail || e.email, e.phone, e.department, e.branch, e.role, e.status, e.accountStatus || 'Active'
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'employees_export.csv'; a.click();
  URL.revokeObjectURL(url);
};

// ─── Attendance Status Badge ─────────────────────────────────────────────────
const AttBadge = ({ status }) => {
  const map = {
    'Present': { cls: 'att-present', label: 'Present' },
    'Absent': { cls: 'att-absent', label: 'Absent' },
    'On Leave': { cls: 'att-leave', label: 'On Leave' },
    'Late': { cls: 'att-late', label: 'Late' },
    'Work From Home': { cls: 'att-wfh', label: 'WFH' },
  };
  const cfg = map[status] || { cls: 'att-absent', label: status || '—' };
  return (
    <span className={`att-badge ${cfg.cls}`} title={status}>
      {cfg.label}
    </span>
  );
};

// ─── Work Status Dot ─────────────────────────────────────────────────────────
const WorkStatusDot = ({ status }) => {
  const map = {
    'Active': { cls: 'dot-green', label: 'Active', pulse: false },
    'Idle': { cls: 'dot-grey', label: 'Idle', pulse: false },
    'In Meeting': { cls: 'dot-blue', label: 'In Meeting', pulse: false },
    'Offline': { cls: 'dot-red', label: 'Offline', pulse: false },
    'Working': { cls: 'dot-green', label: 'Working', pulse: true },
  };
  const cfg = map[status] || { cls: 'dot-grey', label: status || '—', pulse: false };
  return (
    <span className={`work-status-cell ${cfg.cls}`}>
      <span className={`work-dot${cfg.pulse ? ' pulse-dot' : ''}`}></span>
      {cfg.label}
    </span>
  );
};

// ─── Account Status Badge ────────────────────────────────────────────────────
const AccBadge = ({ status }) => {
  const map = {
    'Active': 'acc-active',
    'Disabled': 'acc-disabled',
    'Suspended': 'acc-suspended',
  };
  return <span className={`acc-badge ${map[status] || 'acc-disabled'}`}>{status || 'Active'}</span>;
};

// ─── Copy Tooltip Cell ───────────────────────────────────────────────────────
const CopyCell = ({ value, icon: Icon, truncate, underline }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const display = truncate && value && value.length > truncate ? value.slice(0, truncate) + '…' : value;
  return (
    <div className={`copy-cell${underline ? ' copy-underline' : ''}`} onClick={handleCopy} title={value}>
      {Icon && <Icon size={13} className="copy-cell-icon" />}
      <span className="copy-cell-text">{display || '—'}</span>
      {copied && <span className="copy-tooltip">Copied!</span>}
    </div>
  );
};

// ─── Column Groups for Toggle Panel ─────────────────────────────────────────
const COLUMN_GROUPS = [
  { label: 'Identity', keys: ['checkbox', 'name', 'id'] },
  { label: 'Role', keys: ['designation', 'department', 'branch', 'teamLeader', 'projectManager'] },
  { label: 'Contact', keys: ['phone', 'workEmail'] },
  { label: 'Timeline', keys: ['joinDate'] },
  { label: 'Status', keys: ['attendanceStatus', 'workStatus', 'accountStatus'] },
];

const COLUMN_LABELS = {
  checkbox: 'Select', name: 'Full Name', id: 'Employee ID', designation: 'Designation',
  department: 'Department', branch: 'Branch', teamLeader: 'Team Leader', projectManager: 'Project Manager',
  phone: 'Contact Number', workEmail: 'Email Address', joinDate: 'Joining Date',
  attendanceStatus: 'Attendance Status', workStatus: 'Work Status', accountStatus: 'Account Status',
  actions: 'Actions'
};

const DEFAULT_VISIBILITY = {
  checkbox: true, name: true, id: true, designation: true, department: true,
  branch: true, teamLeader: true, projectManager: true, phone: true,
  workEmail: true, joinDate: true, attendanceStatus: true, workStatus: true,
  accountStatus: true, actions: true
};

const LS_KEY = 'saas_emp_col_visibility';

// ─── Employees Component ─────────────────────────────────────────────────────
const Employees = () => {
  const isLoading = usePageLoading(600);
  const navigate = useNavigate();
  const { employees, addEmployee, updateEmployee, deactivateEmployee, showConfirm, roles, addToast } = useApp();
  const location = useLocation();

  // ── Filters ──
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [attFilter, setAttFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ── Column visibility ──
  const [colVis, setColVis] = useState(() => {
    try { return { ...DEFAULT_VISIBILITY, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }; }
    catch { return DEFAULT_VISIBILITY; }
  });
  const [showTogglePanel, setShowTogglePanel] = useState(false);
  const togglePanelRef = useRef(null);

  // ── SlideOver ──
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [slideOverMode, setSlideOverMode] = useState('add');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', dob: '', gender: 'Male',
    department: 'Engineering', branch: 'New York', team: '', role: 'Employee', roleId: 'employee',
    joinDate: new Date().toISOString().split('T')[0], id: '', password: '', avatar: ''
  });

  // ── Profile Preview Card ──
  const [previewEmp, setPreviewEmp] = useState(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const previewRef = useRef(null);

  // ── Bulk modals ──
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [transferDept, setTransferDept] = useState('Engineering');
  const [assignLeader, setAssignLeader] = useState('');

  // ── Effects ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') handleOpenAdd();
  }, [location]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(colVis));
  }, [colVis]);

  // Close toggle panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (togglePanelRef.current && !togglePanelRef.current.contains(e.target)) {
        setShowTogglePanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close preview card on outside click / Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setPreviewEmp(null); };
    const handleClick = (e) => {
      if (previewRef.current && !previewRef.current.contains(e.target)) {
        setPreviewEmp(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('mousedown', handleClick); };
  }, []);

  // ── Sorting ──
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Filter + Sort ──
  const filteredEmployees = employees.filter(e => {
    const ms = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.toLowerCase().includes(searchTerm.toLowerCase());
    const md = deptFilter ? e.department === deptFilter : true;
    const mb = branchFilter ? e.branch === branchFilter : true;
    const mst = statusFilter ? e.status === statusFilter : true;
    const ma = attFilter ? e.attendanceStatus === attFilter : true;
    return ms && md && mb && mst && ma;
  }).sort((a, b) => {
    let av = a[sortKey] || '', bv = b[sortKey] || '';
    if (sortKey === 'joinDate') { av = new Date(av); bv = new Date(bv); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // ── Selection helpers ──
  const allSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedIds.has(e.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(filteredEmployees.map(e => e.id)));
  };
  const toggleRow = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectedEmployees = employees.filter(e => selectedIds.has(e.id));

  // ── Preview Card ──
  const openPreview = (e, emp) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const cardW = 320;
    let left = rect.right + 12;
    if (left + cardW > window.innerWidth - 20) left = rect.left - cardW - 12;
    let top = rect.top + window.scrollY;
    setPreviewPos({ top, left });
    setPreviewEmp(emp);
  };

  // ── Bulk Actions ──
  const handleBulkDelete = () => {
    showConfirm(
      'Delete Selected Employees',
      `You are about to permanently delete ${selectedIds.size} employee${selectedIds.size > 1 ? 's' : ''}. This cannot be undone.`,
      () => {
        selectedIds.forEach(id => deactivateEmployee(id));
        setSelectedIds(new Set());
        addToast('success', `${selectedIds.size} employee(s) deactivated.`);
      },
      'danger'
    );
  };

  const handleBulkActivate = () => {
    showConfirm('Activate Accounts', `Activate accounts for ${selectedIds.size} employee(s)?`, () => {
      selectedIds.forEach(id => updateEmployee(id, { accountStatus: 'Active' }));
      setSelectedIds(new Set());
      addToast('success', 'Accounts activated successfully.');
    }, 'primary');
  };

  const handleBulkDisable = () => {
    showConfirm('Disable Accounts', `Disable accounts for ${selectedIds.size} employee(s)?`, () => {
      selectedIds.forEach(id => updateEmployee(id, { accountStatus: 'Disabled' }));
      setSelectedIds(new Set());
      addToast('warning', 'Accounts disabled.');
    }, 'danger');
  };

  const handleBulkExport = () => {
    addToast('info', 'Exporting...');
    setTimeout(() => {
      downloadCSV(selectedEmployees);
      addToast('success', 'Download ready!');
    }, 800);
  };

  const handleTransferDept = () => {
    selectedIds.forEach(id => updateEmployee(id, { department: transferDept }));
    setShowTransferModal(false);
    setSelectedIds(new Set());
    addToast('success', `${selectedIds.size} employee(s) transferred to ${transferDept}.`);
  };

  const handleAssignLeader = () => {
    selectedIds.forEach(id => updateEmployee(id, { teamLeader: assignLeader }));
    setShowAssignLeaderModal(false);
    setSelectedIds(new Set());
    addToast('success', `Team leader assigned to ${selectedIds.size} employee(s).`);
  };

  // ── Form Handlers ──
  const handleOpenAdd = () => {
    setFormData({ name: '', email: '', phone: '', dob: '', gender: 'Male', department: 'Engineering', branch: 'New York', team: '', role: 'Employee', roleId: 'employee', joinDate: new Date().toISOString().split('T')[0], id: '', password: '', avatar: '' });
    setWizardStep(1); setSlideOverMode('add'); setSlideOverOpen(true);
  };
  const handleOpenEdit = (emp) => {
    setFormData({ ...emp, password: '••••••••' });
    setWizardStep(1); setSlideOverMode('edit'); setSelectedEmployeeId(emp.id); setSlideOverOpen(true);
  };
  const handleOpenView = (emp) => {
    setFormData(emp); setSlideOverMode('view'); setSelectedEmployeeId(emp.id); setSlideOverOpen(true);
  };
  const isStepValid = () => {
    if (wizardStep === 1) return formData.name && formData.email && formData.phone;
    if (wizardStep === 2) return formData.department && formData.branch && formData.role && formData.id;
    if (wizardStep === 3) return formData.roleId && formData.password;
    return true;
  };
  const handleNextStep = () => { if (isStepValid()) setWizardStep(p => p + 1); };
  const handlePrevStep = () => setWizardStep(p => Math.max(p - 1, 1));
  const handleFormSubmit = () => {
    const matchingRole = roles.find(r => r.name === formData.role) || roles[3];
    const finalData = { ...formData, roleId: matchingRole.id };
    if (slideOverMode === 'add') addEmployee(finalData);
    else updateEmployee(selectedEmployeeId, finalData);
    setSlideOverOpen(false);
  };
  const handleDeactivate = (id, name) => {
    showConfirm('Deactivate Employee', `Are you sure you want to deactivate ${name}?`, () => deactivateEmployee(id), 'danger');
  };
  const handleClearFilters = () => { setSearchTerm(''); setDeptFilter(''); setBranchFilter(''); setStatusFilter(''); setAttFilter(''); };

  // ── Widgets Data ──
  const totalEmp = employees.length;
  const presentCount = employees.filter(e => e.attendanceStatus === 'Present').length;
  const absentCount = employees.filter(e => e.attendanceStatus === 'Absent').length;
  const lateCount = employees.filter(e => e.attendanceStatus === 'Late').length;
  const leaveCount = employees.filter(e => e.attendanceStatus === 'On Leave').length;
  const topPerformers = employees.filter(e => (e.performanceScore?.overall || 0) >= 85).length;
  const needsAttention = employees.filter(e => (e.performanceScore?.overall || 0) < 60).length;
  const avgTaskCompletion = Math.round(employees.reduce((s, e) => s + (e.performanceScore?.taskCompletion || 70), 0) / Math.max(employees.length, 1));
  const avgRating = Math.round(employees.reduce((s, e) => s + (e.performanceScore?.overall || 70), 0) / Math.max(employees.length, 1));

  // ── Sort indicator ──
  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="sort-neutral">⇅</span>;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // ── Table Header Cell ──
  const TH = ({ col, label, sortable, style }) => (
    <th style={style} onClick={sortable ? () => handleSort(col) : undefined}
      className={sortable ? 'sortable-th' : ''}>
      <span className="th-inner">
        {label}
        {sortable && <SortIcon col={col} />}
      </span>
    </th>
  );

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginated = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [searchTerm, deptFilter, branchFilter, statusFilter, attFilter]);

  const depts = [...new Set(employees.map(e => e.department))].sort();
  const branches = [...new Set(employees.map(e => e.branch))].sort();
  const leaders = employees.filter(e => e.roleId === 'team_leader' || e.roleId === 'super_admin');

  return (
    <div className="employees-page flex-column grid-gap">

      {/* ── Page Header ── */}
      <div className="page-header-row">
        <div>
          <h2>Employee Directory</h2>
          <p className="page-desc-text">Manage employee access, profiles, branches, and roles</p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} icon={UserPlus}>Add Employee</Button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="card filters-card">
        <div className="filters-grid">
          <div className="filter-input-wrapper">
            <Search size={16} className="filter-search-icon" />
            <input type="text" placeholder="Search by name or ID..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} className="filter-search-field" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={attFilter} onChange={e => setAttFilter(e.target.value)}>
            <option value="">Attendance</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
            <option value="On Leave">On Leave</option>
            <option value="Work From Home">Work From Home</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
          </select>
          <Button variant="ghost" onClick={handleClearFilters}>Clear</Button>
        </div>
      </div>

      {/* ── Attendance & Productivity Widgets ── */}
      <div className="emp-widgets-row">
        {/* Attendance Overview */}
        <div className="card emp-widget-card">
          <div className="widget-header">
            <span className="widget-title">Attendance Overview</span>
            <span className="live-dot-badge"><span className="live-dot pulse-dot"></span>Live</span>
          </div>
          <div className="att-metric-list">
            <div className="att-metric-row att-present-row">
              <span className="att-metric-label">Present</span>
              <div className="att-metric-right">
                <span className="att-metric-count present-count">{presentCount}</span>
                <div className="mini-bar-track"><div className="mini-bar-fill green-fill" style={{ width: `${Math.round(presentCount / Math.max(totalEmp,1) * 100)}%` }}></div></div>
              </div>
            </div>
            <div className="att-metric-row att-absent-row">
              <span className="att-metric-label">Absent</span>
              <div className="att-metric-right">
                <span className="att-metric-count absent-count">{absentCount}</span>
              </div>
            </div>
            <div className="att-metric-row att-late-row">
              <span className="att-metric-label">Late</span>
              <div className="att-metric-right">
                <span className="att-metric-count late-count">{lateCount}</span>
              </div>
            </div>
            <div className="att-metric-row att-leave-row">
              <span className="att-metric-label">On Leave</span>
              <div className="att-metric-right">
                <span className="att-metric-count leave-count">{leaveCount}</span>
              </div>
            </div>
          </div>
          <div className="widget-total">Total: <strong>{totalEmp}</strong> employees</div>
        </div>

        {/* Productivity Overview */}
        <div className="card emp-widget-card">
          <div className="widget-header">
            <span className="widget-title">Productivity Overview</span>
          </div>
          <div className="prod-metric-list">
            <div className="prod-metric-row">
              <span className="prod-icon trophy-icon"><Trophy size={15} /></span>
              <span className="prod-label">Top Performers</span>
              <span className="prod-value white-val">{topPerformers}</span>
            </div>
            <div className="prod-metric-row">
              <span className="prod-icon danger-icon"><AlertTriangle size={15} /></span>
              <span className="prod-label">Needs Attention</span>
              <span className="prod-value danger-val">{needsAttention}</span>
            </div>
            <div className="prod-metric-row">
              <span className="prod-icon blue-icon"><CheckCircle size={15} /></span>
              <span className="prod-label">Task Completion</span>
              <span className="prod-value blue-val">{avgTaskCompletion}%</span>
              <div className="prod-mini-bar"><div className="prod-bar-fill" style={{ width: `${avgTaskCompletion}%` }}></div></div>
            </div>
            <div className="prod-metric-row">
              <span className="prod-icon gold-icon"><Star size={15} /></span>
              <span className="prod-label">Avg Performance</span>
              <span className="prod-value gold-val">{avgRating}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bulk Actions Bar ── */}
      <div className={`bulk-actions-bar${selectedIds.size > 0 ? ' bulk-bar-visible' : ''}`}>
        <div className="bulk-bar-left">
          <span className="bulk-count-badge">{selectedIds.size}</span>
          <span className="bulk-bar-label">employee{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <button className="bulk-deselect-link" onClick={() => setSelectedIds(new Set())}>Deselect All</button>
        </div>
        <div className="bulk-bar-right">
          <button className="bulk-btn bulk-btn-danger" onClick={handleBulkDelete} title="Delete Selected">
            <Trash2 size={14} /> Delete
          </button>
          <button className="bulk-btn bulk-btn-secondary" onClick={() => setShowTransferModal(true)} title="Transfer Department">
            <Briefcase size={14} /> Transfer Dept
          </button>
          <button className="bulk-btn bulk-btn-secondary" onClick={() => setShowAssignLeaderModal(true)} title="Assign Team Leader">
            <UserCheck size={14} /> Assign Leader
          </button>
          <button className="bulk-btn bulk-btn-success" onClick={handleBulkActivate} title="Activate Accounts">
            <CheckCircle size={14} /> Activate
          </button>
          <button className="bulk-btn bulk-btn-warning" onClick={handleBulkDisable} title="Disable Accounts">
            <XCircle size={14} /> Disable
          </button>
          <button className="bulk-btn bulk-btn-ghost" onClick={handleBulkExport} title="Export CSV">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="card table-wrapper-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <span className="table-count-label">
            {isLoading ? '—' : `${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''}`}
          </span>
          <div className="table-toolbar-right" ref={togglePanelRef}>
            <button className="toggle-cols-btn" onClick={() => setShowTogglePanel(p => !p)}>
              <SlidersHorizontal size={14} /> Toggle Columns
            </button>
            {showTogglePanel && (
              <div className="toggle-cols-panel">
                <div className="toggle-panel-header">Visible Columns</div>
                {COLUMN_GROUPS.map(group => (
                  <div key={group.label} className="toggle-group">
                    <div className="toggle-group-label">{group.label}</div>
                    {group.keys.filter(k => k !== 'checkbox').map(k => (
                      <label key={k} className="toggle-row">
                        <span>{COLUMN_LABELS[k]}</span>
                        <div className={`toggle-switch${colVis[k] ? ' ts-on' : ''}`}
                          onClick={() => setColVis(p => ({ ...p, [k]: !p[k] }))}>
                          <div className="ts-thumb"></div>
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
                <button className="toggle-reset-btn" onClick={() => { setColVis(DEFAULT_VISIBILITY); localStorage.removeItem(LS_KEY); }}>
                  <RefreshCw size={12} /> Reset to Default
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="emp-table-scroll">
          <table className="emp-table">
            <thead>
              <tr>
                <th className="col-checkbox">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                {colVis.name && <TH col="name" label="Full Name" sortable />}
                {colVis.id && <TH col="id" label="ID" sortable />}
                {colVis.designation && <TH col="designation" label="Designation" sortable />}
                {colVis.department && <TH col="department" label="Department" sortable />}
                {colVis.branch && <TH col="branch" label="Branch" sortable />}
                {colVis.teamLeader && <th>Team Leader</th>}
                {colVis.projectManager && <th>Project Manager</th>}
                {colVis.phone && <th>Contact</th>}
                {colVis.workEmail && <th>Email</th>}
                {colVis.joinDate && <TH col="joinDate" label="Joining Date" sortable style={{ minWidth: 140 }} />}
                {colVis.attendanceStatus && <th>Attendance</th>}
                {colVis.workStatus && <th>Work Status</th>}
                {colVis.accountStatus && <th>Account</th>}
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 15 }).map((_, j) => (
                      <td key={j}><Skeleton width="80%" height="14px" /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={16} className="empty-table-cell">
                    <div className="empty-table-msg">
                      <Users size={36} className="empty-icon" />
                      <p>No employees found</p>
                      <span>Try clearing filters or search for another term.</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.map(row => (
                <tr key={row.id}
                  className={`emp-row${selectedIds.has(row.id) ? ' row-selected' : ''}${row.accountStatus === 'Suspended' ? ' row-suspended' : ''}`}>
                  <td className="col-checkbox">
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} />
                  </td>
                  {colVis.name && (
                    <td>
                      <div className="emp-name-cell">
                        <span className="emp-avatar-trigger" onClick={e => openPreview(e, row)}>
                          <Avatar name={row.name} size="sm" />
                        </span>
                        <div className="employee-info-cell">
                          <span className="emp-name-bold emp-name-clickable" onClick={e => openPreview(e, row)}>{row.name}</span>
                          <span className="emp-email-sub">{row.workEmail || row.email}</span>
                        </div>
                      </div>
                    </td>
                  )}
                  {colVis.id && <td><span className="emp-id-mono">{row.id}</span></td>}
                  {colVis.designation && <td><span className="text-secondary-sm">{row.designation || row.role}</span></td>}
                  {colVis.department && <td><span className="dept-text">{row.department}</span></td>}
                  {colVis.branch && <td><span className="text-secondary-sm">{row.branch}</span></td>}
                  {colVis.teamLeader && <td><span className="text-secondary-sm">{row.teamLeader || '—'}</span></td>}
                  {colVis.projectManager && <td><span className="text-secondary-sm">{row.projectManager || '—'}</span></td>}
                  {colVis.phone && (
                    <td><CopyCell value={row.phone} icon={Phone} /></td>
                  )}
                  {colVis.workEmail && (
                    <td><CopyCell value={row.workEmail || row.email} icon={Mail} truncate={22} underline /></td>
                  )}
                  {colVis.joinDate && (
                    <td>
                      <div className="join-date-cell">
                        <Calendar size={12} className="copy-cell-icon" />
                        <span className="text-secondary-sm">{fmtJoinDate(row.joinDate)}</span>
                        {isNewJoiner(row.joinDate) && <span className="new-joiner-badge">New</span>}
                      </div>
                    </td>
                  )}
                  {colVis.attendanceStatus && (
                    <td><AttBadge status={row.attendanceStatus} /></td>
                  )}
                  {colVis.workStatus && (
                    <td><WorkStatusDot status={row.workStatus} /></td>
                  )}
                  {colVis.accountStatus && (
                    <td><AccBadge status={row.accountStatus} /></td>
                  )}
                  <td className="col-actions">
                    <div className="table-actions-cell">
                      <button className="table-action-icon-btn" onClick={() => navigate(`/employees/${row.id}`)} title="View Full Profile">
                        <Eye size={16} />
                      </button>
                      <button className="table-action-icon-btn" onClick={() => handleOpenEdit(row)} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button className="table-action-icon-btn action-deactivate-btn"
                        onClick={() => handleDeactivate(row.id, row.name)} title="Deactivate"
                        disabled={row.status === 'Inactive'}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filteredEmployees.length > pageSize && (
          <div className="emp-pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
          </div>
        )}
      </div>

      {/* ── Profile Preview Card ── */}
      {previewEmp && (
        <div className="emp-preview-card animate-preview" ref={previewRef}
          style={{ top: previewPos.top, left: previewPos.left }}>
          <button className="preview-close-btn" onClick={() => setPreviewEmp(null)}><X size={14} /></button>

          <div className="preview-top">
            <Avatar name={previewEmp.name} size="lg" />
            <div className="preview-name-block">
              <h4 className="preview-name">{previewEmp.name}</h4>
              <p className="preview-designation">{previewEmp.designation || previewEmp.role}</p>
            </div>
            <div className="preview-badges">
              <span className="preview-dept-badge">{previewEmp.department}</span>
              <span className="preview-branch-badge">{previewEmp.branch}</span>
            </div>
          </div>

          <div className="preview-divider" />

          <div className="preview-stats-row">
            <div className="preview-stat">
              <div className="preview-stat-ring" style={{ '--pct': `${previewEmp.performanceScore?.attendance || 78}` }}>
                <span className="preview-stat-ring-val">{previewEmp.performanceScore?.attendance || 78}%</span>
              </div>
              <span className="preview-stat-label">Attendance</span>
            </div>
            <div className="preview-stat">
              <span className="preview-stat-big">{previewEmp.performanceScore?.taskCompletion || 82}%</span>
              <span className="preview-stat-label">Tasks Done</span>
            </div>
            <div className="preview-stat">
              <span className="preview-stat-big">{fmtJoinDate(previewEmp.joinDate).split(' ').slice(1).join(' ')}</span>
              <span className="preview-stat-label">Joined</span>
            </div>
          </div>

          <div className="preview-divider" />

          <div className="preview-detail-list">
            <div className="preview-detail-row">
              <User size={13} className="preview-detail-icon" />
              <span className="preview-detail-label">ID</span>
              <span className="preview-detail-value">{previewEmp.id}</span>
            </div>
            <div className="preview-detail-row">
              <Users size={13} className="preview-detail-icon" />
              <span className="preview-detail-label">Manager</span>
              <span className="preview-detail-value">{previewEmp.teamLeader || '—'}</span>
            </div>
            <div className="preview-detail-row">
              <Phone size={13} className="preview-detail-icon" />
              <span className="preview-detail-label">Phone</span>
              <CopyCell value={previewEmp.phone} />
            </div>
            <div className="preview-detail-row">
              <Mail size={13} className="preview-detail-icon" />
              <span className="preview-detail-label">Email</span>
              <CopyCell value={previewEmp.workEmail || previewEmp.email} truncate={20} underline />
            </div>
          </div>

          <div className="preview-divider" />

          <div className="preview-actions-grid">
            <button className="preview-btn preview-btn-primary" onClick={() => { navigate(`/employees/${previewEmp.id}`); setPreviewEmp(null); }}>
              View Full Profile
            </button>
            <button className="preview-btn preview-btn-secondary" onClick={() => { handleOpenEdit(previewEmp); setPreviewEmp(null); }}>
              Edit Profile
            </button>
            <button className="preview-btn preview-btn-secondary" onClick={() => { navigate('/tasks'); setPreviewEmp(null); }}>
              Assign Task
            </button>
            <button className="preview-btn preview-btn-ghost" onClick={() => { navigate('/work-reports'); setPreviewEmp(null); }}>
              View Reports
            </button>
          </div>

          <div className="preview-danger-zone">
            <button className="preview-delete-link" onClick={() => { handleDeactivate(previewEmp.id, previewEmp.name); setPreviewEmp(null); }}>
              <Trash2 size={12} /> Delete Account
            </button>
          </div>
        </div>
      )}

      {/* ── Transfer Dept Modal ── */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Transfer {selectedIds.size} employee(s) to department</h3>
            <select value={transferDept} onChange={e => setTransferDept(e.target.value)} style={{ marginTop: 16, marginBottom: 16 }}>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleTransferDept}>Confirm Transfer</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Leader Modal ── */}
      {showAssignLeaderModal && (
        <div className="modal-overlay" onClick={() => setShowAssignLeaderModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Assign Team Leader to {selectedIds.size} employee(s)</h3>
            <select value={assignLeader} onChange={e => setAssignLeader(e.target.value)} style={{ marginTop: 16, marginBottom: 16 }}>
              <option value="">Select a leader...</option>
              {leaders.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowAssignLeaderModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAssignLeader} disabled={!assignLeader}>Assign</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit / View SlideOver ── */}
      <SlideOver
        isOpen={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        title={slideOverMode === 'add' ? 'Add New Employee' : slideOverMode === 'edit' ? 'Edit Employee Details' : 'Employee Profile Detail'}
        footer={slideOverMode === 'view' ? null : (
          <div className="wizard-footer-buttons">
            {wizardStep > 1 && <Button variant="secondary" onClick={handlePrevStep} icon={ArrowLeft}>Back</Button>}
            {wizardStep < 3
              ? <Button variant="primary" onClick={handleNextStep} disabled={!isStepValid()}>Next Step</Button>
              : <Button variant="primary" onClick={handleFormSubmit} disabled={!isStepValid()}>{slideOverMode === 'add' ? 'Confirm & Create' : 'Save Changes'}</Button>
            }
          </div>
        )}
      >
        {slideOverMode === 'view' ? (
          <div className="employee-detail-view animate-fade-in">
            <div className="detail-header-card">
              <Avatar name={formData.name} size="lg" />
              <h3 className="detail-name">{formData.name}</h3>
              <Badge variant={formData.status === 'Active' ? 'success' : formData.status === 'On Leave' ? 'warning' : 'danger'}>{formData.status}</Badge>
            </div>
            <div className="detail-section-group">
              <h4 className="detail-group-title">Personal Information</h4>
              <div className="detail-grid">
                <div className="detail-item"><label>Email Address</label><span>{formData.email}</span></div>
                <div className="detail-item"><label>Phone Number</label><span>{formData.phone}</span></div>
                <div className="detail-item"><label>Date of Birth</label><span>{formData.dob || 'Not set'}</span></div>
                <div className="detail-item"><label>Gender</label><span>{formData.gender}</span></div>
              </div>
            </div>
            <div className="detail-section-group">
              <h4 className="detail-group-title">Work Information</h4>
              <div className="detail-grid">
                <div className="detail-item"><label>Employee ID</label><span>{formData.id}</span></div>
                <div className="detail-item"><label>Department</label><span>{formData.department}</span></div>
                <div className="detail-item"><label>Branch Location</label><span>{formData.branch}</span></div>
                <div className="detail-item"><label>Assigned Team</label><span>{formData.team || 'None'}</span></div>
                <div className="detail-item"><label>Designation / Role</label><span>{formData.role}</span></div>
                <div className="detail-item"><label>Joining Date</label><span>{fmtJoinDate(formData.joinDate)}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="form-wizard-container">
            <div className="wizard-indicators-bar">
              <div className={`indicator-step ${wizardStep >= 1 ? 'active' : ''}`}><span className="step-num">1</span><span className="step-name">Personal</span></div>
              <ChevronRight size={14} className="indicator-sep" />
              <div className={`indicator-step ${wizardStep >= 2 ? 'active' : ''}`}><span className="step-num">2</span><span className="step-name">Work</span></div>
              <ChevronRight size={14} className="indicator-sep" />
              <div className={`indicator-step ${wizardStep >= 3 ? 'active' : ''}`}><span className="step-num">3</span><span className="step-name">Access</span></div>
            </div>
            <form className="wizard-form-body animate-fade-in" onSubmit={e => e.preventDefault()}>
              {wizardStep === 1 && (
                <div className="wizard-step-form">
                  <div className="form-field"><label>Full Name *</label><input type="text" placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required /></div>
                  <div className="form-field"><label>Email Address *</label><input type="email" placeholder="e.g. john@enterprise.com" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required /></div>
                  <div className="form-field"><label>Phone Number *</label><input type="text" placeholder="e.g. +91 98765 43210" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} required /></div>
                  <div className="form-field"><label>Date of Birth</label><input type="date" value={formData.dob} onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))} /></div>
                  <div className="form-field"><label>Gender</label><select value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                </div>
              )}
              {wizardStep === 2 && (
                <div className="wizard-step-form">
                  <div className="form-field"><label>Employee ID *</label><input type="text" placeholder="e.g. EMP-2026-100" value={formData.id} onChange={e => setFormData(p => ({ ...p, id: e.target.value }))} disabled={slideOverMode === 'edit'} required /></div>
                  <div className="form-field"><label>Department *</label><select value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}>{depts.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div className="form-field"><label>Branch *</label><select value={formData.branch} onChange={e => setFormData(p => ({ ...p, branch: e.target.value }))}>{branches.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                  <div className="form-field"><label>Team Name</label><input type="text" placeholder="e.g. Frontend Core" value={formData.team} onChange={e => setFormData(p => ({ ...p, team: e.target.value }))} /></div>
                  <div className="form-field"><label>Role Designation *</label><select value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}><option>Super Admin</option><option>Branch Admin</option><option>Team Leader</option><option>Employee</option></select></div>
                  <div className="form-field"><label>Join Date *</label><input type="date" value={formData.joinDate} onChange={e => setFormData(p => ({ ...p, joinDate: e.target.value }))} required /></div>
                </div>
              )}
              {wizardStep === 3 && (
                <div className="wizard-step-form">
                  <div className="form-field"><label>System Access Permission Role *</label>
                    <select value={formData.roleId} onChange={e => setFormData(p => ({ ...p, roleId: e.target.value }))}>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name} - {r.description.slice(0, 40)}...</option>)}
                    </select>
                  </div>
                  <div className="form-field"><label>Initial Login Password *</label><input type="password" placeholder="Enter safe password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} required /></div>
                  <div className="wizard-summary-card">
                    <h5>Summary of Employee Registration</h5>
                    <div className="summary-fields-grid">
                      <div><strong>Name:</strong> {formData.name}</div>
                      <div><strong>ID:</strong> {formData.id}</div>
                      <div><strong>Dept/Branch:</strong> {formData.department} ({formData.branch})</div>
                      <div><strong>Designation:</strong> {formData.role}</div>
                      <div><strong>Email:</strong> {formData.email}</div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </SlideOver>
    </div>
  );
};

export default Employees;
