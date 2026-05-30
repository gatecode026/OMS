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
  BarChart2, TrendingUp, Shield, Clock, MapPin, User, Star, CreditCard
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtJoinDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtDob = (dateStr) => {
  if (!dateStr) return '15/08/1996';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const calculateExpiry = (dateStr) => {
  if (!dateStr) return '31 Dec 2031';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 5);
  return fmtJoinDate(d.toISOString());
};

const renderName = (fullname) => {
  if (!fullname) return '';
  const parts = fullname.trim().split(' ');
  if (parts.length === 1) return <span className="id-name-dark">{parts[0]}</span>;
  return (
    <>
      <span className="id-name-dark">{parts[0]} </span>
      <span className="id-name-accent">{parts.slice(1).join(' ')}</span>
    </>
  );
};

const getBranchAddress = (branchName) => {
  const name = (branchName || '').toLowerCase().trim();
  if (name.includes('delhi')) return 'Connaught Place, New Delhi - 110001';
  if (name.includes('mumbai')) return 'Bandra Kurla Complex, Mumbai - 400051';
  if (name.includes('bangalore') || name.includes('bengaluru')) return 'MG Road, Bangalore - 560001';
  return 'Malviya Nagar, Jaipur, Rajasthan 302017';
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
  { label: 'Advanced', keys: ['employeeType', 'shift', 'experience', 'lastLogin', 'currentProjects', 'leaveBalance', 'productivityScore', 'performanceRating'] },
];

const COLUMN_LABELS = {
  checkbox: 'Select', name: 'Full Name', id: 'Employee ID', designation: 'Designation',
  department: 'Department', branch: 'Branch', teamLeader: 'Team Leader', projectManager: 'Project Manager',
  phone: 'Contact Number', workEmail: 'Email Address', joinDate: 'Joining Date',
  attendanceStatus: 'Attendance Status', workStatus: 'Work Status', accountStatus: 'Account Status',
  employeeType: 'Employee Type', shift: 'Shift Time', experience: 'Experience', lastLogin: 'Last Login',
  currentProjects: 'Projects Count', leaveBalance: 'Leave Balance', productivityScore: 'Productivity',
  performanceRating: 'Performance Rating', actions: 'Actions'
};

const DEFAULT_VISIBILITY = {
  checkbox: true, name: true, id: true, designation: true, department: true,
  branch: true, teamLeader: true, projectManager: true, phone: true,
  workEmail: true, joinDate: true, attendanceStatus: true, workStatus: true,
  accountStatus: true, employeeType: false, shift: false, experience: false,
  lastLogin: false, currentProjects: false, leaveBalance: false, productivityScore: false,
  performanceRating: false, actions: true
};

const LS_KEY = 'saas_emp_col_visibility';

// ─── Employees Component ─────────────────────────────────────────────────────
const Employees = () => {
  const isLoading = usePageLoading(600);
  const navigate = useNavigate();
  const { employees, addEmployee, updateEmployee, deactivateEmployee, activateEmployee, showConfirm, roles, addToast } = useApp();
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

  // ── SlideOver (View) & Form Panel ──
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [showFormPanel, setShowFormPanel] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', dob: '', gender: 'Male',
    currentAddress: '', permanentAddress: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactAddress: '', emergencyContactRelation: '',
    username: '', password: '',
    department: 'Engineering', branch: 'Jaipur', team: '',
    designation: '', role: 'Employee', roleId: 'employee',
    joinDate: new Date().toISOString().split('T')[0],
    id: '', avatar: '',
    shiftTiming: '09:00 AM - 06:00 PM',
    salaryAmount: '', salaryAllowances: '', salaryDeductions: '',
    teamLeader: '', projectManager: '',
    companyName: '',
    branchAddress: ''
  });
  const [uploadedDocs, setUploadedDocs] = useState({
    aadhaar: null, pan: null, resume: null,
    certificates: null, offerLetter: null, profilePhoto: null
  });

  // ── Profile Preview Card ──
  const [previewEmp, setPreviewEmp] = useState(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const previewRef = useRef(null);

  // ── ID Card ──
  const [showIdCard, setShowIdCard] = useState(false);
  const [idCardEmployee, setIdCardEmployee] = useState(null);
  const idCardRef = useRef(null);

  // ── Bulk modals ──
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [transferDept, setTransferDept] = useState('Engineering');
  const [assignLeader, setAssignLeader] = useState('');
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [bulkRole, setBulkRole] = useState('employee');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('Active');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [bulkLeaveDays, setBulkLeaveDays] = useState(5);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [bulkNotifyMsg, setBulkNotifyMsg] = useState('');

  // ── Effects ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname === '/employees/add' || params.get('action') === 'add') {
      handleOpenAdd();
    } else {
      const editId = params.get('edit');
      if (editId) {
        const emp = employees.find(e => e.id === editId);
        if (emp) {
          handleOpenEdit(emp);
        } else {
          setShowFormPanel(false);
        }
      } else {
        setShowFormPanel(false);
      }
    }
  }, [location, employees]);

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
    const cardW = 320;
    const cardH = 420;
    const left = Math.max(10, (window.innerWidth - cardW) / 2);
    const top = Math.max(10, (window.innerHeight - cardH) / 2 + window.scrollY);
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

  const handleBulkRoleAssign = () => {
    const matchingRole = roles.find(r => r.id === bulkRole) || roles[3];
    selectedIds.forEach(id => updateEmployee(id, { roleId: matchingRole.id, role: matchingRole.name }));
    setShowRoleModal(false);
    setSelectedIds(new Set());
    addToast('success', `Assigned ${matchingRole.name} role to ${selectedIds.size} employee(s).`);
  };

  const handleBulkStatusUpdate = () => {
    selectedIds.forEach(id => updateEmployee(id, { status: bulkStatus }));
    setShowStatusModal(false);
    setSelectedIds(new Set());
    addToast('success', `Updated status to ${bulkStatus} for ${selectedIds.size} employee(s).`);
  };

  const handleBulkLeaveAllocation = () => {
    selectedIds.forEach(id => {
      const emp = employees.find(e => e.id === id);
      const currentBal = emp?.leaveBalance || 18;
      updateEmployee(id, { leaveBalance: Number(currentBal) + Number(bulkLeaveDays) });
    });
    setShowLeaveModal(false);
    setSelectedIds(new Set());
    addToast('success', `Allocated ${bulkLeaveDays} leave days to ${selectedIds.size} employee(s).`);
  };

  const handleBulkNotification = () => {
    if (!bulkNotifyMsg.trim()) {
      addToast('warning', 'Please enter a notification message.');
      return;
    }
    addToast('success', `Dispatched alert: "${bulkNotifyMsg}" to ${selectedIds.size} employees.`);
    setShowNotifyModal(false);
    setBulkNotifyMsg('');
    setSelectedIds(new Set());
  };

  // ── Form Handlers ──
  const handleOpenAdd = () => {
    setFormData({
      name: '', email: '', phone: '', dob: '', gender: 'Male',
      currentAddress: '', permanentAddress: '',
      emergencyContactName: '', emergencyContactPhone: '', emergencyContactAddress: '', emergencyContactRelation: '',
      username: '', password: '',
      department: 'Engineering', branch: 'Jaipur', team: '',
      designation: '', role: 'Employee', roleId: 'employee',
      joinDate: new Date().toISOString().split('T')[0],
      id: '', avatar: '',
      shiftTiming: '09:00 AM - 06:00 PM',
      salaryAmount: '', salaryAllowances: '', salaryDeductions: '',
      teamLeader: '', projectManager: '',
      companyName: '',
      branchAddress: ''
    });
    setUploadedDocs({
      aadhaar: null, pan: null, resume: null,
      certificates: null, offerLetter: null, profilePhoto: null
    });
    setWizardStep(1); setFormMode('add'); setShowFormPanel(true);
  };
  const handleOpenEdit = (emp) => {
    setFormData({ ...emp, password: '••••••••' });
    setWizardStep(1); setFormMode('edit'); setSelectedEmployeeId(emp.id); setShowFormPanel(true);
  };
  const handleOpenView = (emp) => {
    setFormData(emp); setSlideOverOpen(true);
  };
  const isStepValid = () => {
    if (wizardStep === 1) return formData.name && formData.email && formData.phone;
    if (wizardStep === 2) return formData.designation && formData.department && formData.branch;
    if (wizardStep === 3) return formData.roleId;
    if (wizardStep === 4) return true;
    if (wizardStep === 5) return true;
    return true;
  };
  const handleNextStep = () => { if (isStepValid()) setWizardStep(p => p + 1); };
  const handlePrevStep = () => setWizardStep(p => Math.max(p - 1, 1));
  const handleFormSubmit = () => {
    const matchingRole = roles.find(r => r.id === formData.roleId) || roles[3];
    const finalData = { ...formData, roleId: matchingRole.id, role: matchingRole.name, avatar: uploadedDocs.profilePhoto ? URL.createObjectURL(uploadedDocs.profilePhoto) : formData.avatar };
    if (formMode === 'add') addEmployee(finalData);
    else updateEmployee(selectedEmployeeId, finalData);
    setShowFormPanel(false);
    setSlideOverOpen(false);
    if (location.pathname === '/employees/add') navigate('/employees');
  };
  const handleDeactivate = (id, name) => {
    showConfirm('Deactivate Employee', `Are you sure you want to deactivate ${name}?`, () => deactivateEmployee(id), 'danger');
  };
  const handleActivate = (id, name) => {
    showConfirm('Activate Employee', `Are you sure you want to activate ${name}?`, () => activateEmployee(id), 'primary');
  };
  const downloadIdCard = async () => {
    if (!idCardRef.current || !idCardEmployee) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(idCardRef.current, {
        scale: 3, backgroundColor: null, allowTaint: false, useCORS: true
      });
      const link = document.createElement('a');
      link.download = `${idCardEmployee.id}_ID_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      addToast('error', 'Failed to download ID card.');
    }
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
        <Button variant="primary" onClick={() => navigate('/employees/add')} icon={UserPlus}>Add Employee</Button>
      </div>

      {!showFormPanel && (<>
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

        {/* ── Attendance, Leave, & Productivity Widgets ── */}
      <div className="emp-widgets-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
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

        {/* Leave Management Card */}
        <div className="card emp-widget-card">
          <div className="widget-header">
            <span className="widget-title">Leave Management Summary</span>
            <span className="live-dot-badge">Active balances</span>
          </div>
          <div className="att-metric-list">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Balance</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>124 days</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pending Requests</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--color-warning)' }}>5 approvals</strong>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Casual Leave</span><strong>42d / 60d</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Sick Leave</span><strong>28d / 40d</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Earned Leave</span><strong>54d / 80d</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Maternity/Paternity</span><strong>12d / 30d</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Emergency Leave</span><strong>4d / 10d</strong>
              </div>
            </div>
          </div>
          <div className="widget-total" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Approved: <strong>32</strong></span>
            <span>Rejected: <strong>8</strong></span>
          </div>
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
            {/* Extended Productivity Metrics */}
            <div style={{ marginTop: 'var(--spacing-4)', paddingTop: 'var(--spacing-3)', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div>Workload: <strong style={{ color: 'var(--color-success)' }}>Optimal (85%)</strong></div>
              <div>Completion Trend: <strong style={{ color: 'var(--color-success)' }}>+3%</strong></div>
              <div>Overdue Tasks: <strong style={{ color: 'var(--color-danger)' }}>3 Tasks</strong></div>
              <div>High Priority: <strong style={{ color: 'var(--color-warning)' }}>7 Tasks</strong></div>
              <div>Efficiency: <strong style={{ color: 'var(--text-primary)' }}>91.4% Avg</strong></div>
              <div>Top Dept: <strong style={{ color: 'var(--color-primary)' }}>IT (92%)</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Performance Review & Recognition Spotlight Widgets ── */}
      <div className="emp-widgets-row" style={{ marginTop: 'var(--spacing-4)' }}>
        {/* Performance Review Module Card */}
        <div className="card emp-widget-card">
          <div className="widget-header">
            <span className="widget-title">Performance Review Module</span>
            <Badge variant="primary">Q2 Period</Badge>
          </div>
          <div className="att-metric-list">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Monthly</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>88/100</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Quarterly</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>92/100</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Annual</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>90/100</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Global Rating</span>
                <Badge variant="success">Outstanding</Badge>
              </div>
              <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Feedback Summary</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.6875rem' }}>
                  <div style={{ color: 'var(--text-secondary)' }}><strong>Manager:</strong> "Exceptional execution"</div>
                  <div style={{ color: 'var(--text-secondary)' }}><strong>Peer:</strong> "Great collaborator"</div>
                  <div style={{ color: 'var(--text-secondary)' }}><strong>Self:</strong> "Aiming to scale infra"</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recognition spotlight card */}
        <div className="card emp-widget-card">
          <div className="widget-header">
            <span className="widget-title">Recognition Spotlight</span>
            <Trophy size={16} className="text-warning" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <Avatar name="Ananya Gupta" size="sm" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee of Month</span>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Ananya Gupta</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <Avatar name="Aarav Sharma" size="sm" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Best Performer</span>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Aarav Sharma</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <Avatar name="Suresh Kumar" size="sm" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance Champ</span>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Suresh Kumar</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(168, 85, 247, 0.04)', border: '1px solid rgba(168, 85, 247, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <Avatar name="Kavita Singh" size="sm" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Most Productive</span>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Kavita Singh</strong>
              </div>
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
        <div className="bulk-bar-right" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <button className="bulk-btn bulk-btn-danger" onClick={handleBulkDelete} title="Delete Selected">
            <Trash2 size={14} /> Delete
          </button>
          <button className="bulk-btn bulk-btn-secondary" onClick={() => setShowTransferModal(true)} title="Transfer Department">
            <Briefcase size={14} /> Transfer Dept
          </button>
          <button className="bulk-btn bulk-btn-secondary" onClick={() => setShowAssignLeaderModal(true)} title="Assign Team Leader">
            <UserCheck size={14} /> Assign Leader
          </button>
          <button className="bulk-btn bulk-btn-secondary" onClick={() => setShowRoleModal(true)} title="Assign Role">
            <Shield size={14} /> Assign Role
          </button>
          <button className="bulk-btn bulk-btn-secondary" onClick={() => setShowStatusModal(true)} title="Update Status">
            <Activity size={14} /> Status
          </button>
          <button className="bulk-btn bulk-btn-secondary" onClick={() => setShowLeaveModal(true)} title="Allocate Leave">
            <Calendar size={14} /> Allocate Leave
          </button>
          <button className="bulk-btn bulk-btn-secondary" onClick={() => setShowNotifyModal(true)} title="Send Alert">
            <Mail size={14} /> Send Alert
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
                
                {colVis.employeeType && <TH col="employeeType" label="Emp Type" sortable />}
                {colVis.shift && <TH col="shift" label="Shift" sortable />}
                {colVis.experience && <TH col="experience" label="Experience" sortable />}
                {colVis.lastLogin && <th>Last Login</th>}
                {colVis.currentProjects && <TH col="currentProjects" label="Projects" sortable />}
                {colVis.leaveBalance && <TH col="leaveBalance" label="Leave Bal" sortable />}
                {colVis.productivityScore && <TH col="productivityScore" label="Productivity" sortable />}
                {colVis.performanceRating && <TH col="performanceRating" label="Rating" sortable />}

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
                  {colVis.employeeType && <td><span className="text-secondary-sm">{row.employeeType || 'Full Time'}</span></td>}
                  {colVis.shift && <td><span className="text-secondary-sm">{row.shift || '09:00 AM - 06:00 PM'}</span></td>}
                  {colVis.experience && <td><span className="text-secondary-sm">{row.experience || '2.4 Yrs'}</span></td>}
                  {colVis.lastLogin && <td><span className="text-secondary-sm" style={{ fontSize: '0.75rem' }}>{row.securityInfo?.lastLogin || '—'}</span></td>}
                  {colVis.currentProjects && <td><span className="bold-text font-mono text-primary" style={{ paddingLeft: '8px' }}>{row.currentProjectsCount || 0}</span></td>}
                  {colVis.leaveBalance && <td><span className="bold-text font-mono text-warning">{row.leaveBalance || 18} days</span></td>}
                  {colVis.productivityScore && (
                    <td>
                      <span className="bold-text font-mono text-success" style={{ fontWeight: 600 }}>{row.productivityScore || 85}%</span>
                    </td>
                  )}
                  {colVis.performanceRating && (
                    <td>
                      <Badge variant={
                        (row.performanceRating || 90) >= 90 ? 'success' :
                        (row.performanceRating || 90) >= 75 ? 'primary' : 'warning'
                      }>
                        {row.performanceRating || 90}
                      </Badge>
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
                      <button className="table-action-icon-btn" onClick={(e) => { e.stopPropagation(); navigate(`/employees/${row.id}`); }} title="View Full Profile">
                        <Eye size={16} />
                      </button>
                      <button className="table-action-icon-btn" onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button className="table-action-icon-btn action-idcard-btn"
                        onClick={(e) => { e.stopPropagation(); setIdCardEmployee(row); setShowIdCard(true); }}
                        title="ID Card">
                        <CreditCard size={16} />
                      </button>
                      {row.status === 'Inactive' ? (
                        <button className="table-action-icon-btn action-activate-btn"
                          onClick={(e) => { e.stopPropagation(); handleActivate(row.id, row.name); }} title="Activate">
                          <CheckCircle size={16} />
                        </button>
                      ) : (
                        <button className="table-action-icon-btn action-deactivate-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeactivate(row.id, row.name); }} title="Deactivate">
                          <Trash2 size={16} />
                        </button>
                      )}
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

      </>)}
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
            {previewEmp.status === 'Inactive' ? (
              <button className="preview-activate-link" onClick={() => { handleActivate(previewEmp.id, previewEmp.name); setPreviewEmp(null); }}>
                <CheckCircle size={12} /> Activate Account
              </button>
            ) : (
              <button className="preview-delete-link" onClick={() => { handleDeactivate(previewEmp.id, previewEmp.name); setPreviewEmp(null); }}>
                <Trash2 size={12} /> Delete Account
              </button>
            )}
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

      {/* ── Bulk Assign Role Modal ── */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Assign Role to {selectedIds.size} employee(s)</h3>
            <select value={bulkRole} onChange={e => setBulkRole(e.target.value)} style={{ marginTop: 16, marginBottom: 16 }}>
              <option value="super_admin">Super Admin</option>
              <option value="project_manager">Project Manager</option>
              <option value="team_leader">Team Leader</option>
              <option value="employee">Employee</option>
            </select>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleBulkRoleAssign}>Assign Role</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Status Update Modal ── */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Update Status for {selectedIds.size} employee(s)</h3>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ marginTop: 16, marginBottom: 16 }}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleBulkStatusUpdate}>Update Status</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Leave Allocation Modal ── */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Allocate Leave Days to {selectedIds.size} employee(s)</h3>
            <input 
              type="number" 
              value={bulkLeaveDays} 
              onChange={e => setBulkLeaveDays(e.target.value)} 
              style={{ marginTop: 16, marginBottom: 16, width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
              min="1"
            />
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleBulkLeaveAllocation}>Allocate Days</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Send Alert/Notification Modal ── */}
      {showNotifyModal && (
        <div className="modal-overlay" onClick={() => setShowNotifyModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Send Alert to {selectedIds.size} employee(s)</h3>
            <textarea 
              rows="3" 
              placeholder="Type announcement message..."
              value={bulkNotifyMsg} 
              onChange={e => setBulkNotifyMsg(e.target.value)} 
              style={{ marginTop: 16, marginBottom: 16, width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', resize: 'none' }}
            />
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowNotifyModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleBulkNotification}>Send Alert</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Panel ── */}
      {showFormPanel && (
        <div className="card form-panel-card animate-fade-in">
          <div className="form-panel-header">
            <h3>{formMode === 'add' ? 'Add New Employee' : 'Edit Employee Details'}</h3>
            <button className="slide-over-close-btn" onClick={() => { setShowFormPanel(false); if (location.pathname === '/employees/add') navigate('/employees'); }} aria-label="Close"><X size={18} /></button>
          </div>

          <div className="wizard-indicators-bar">
            <div className={`indicator-step ${wizardStep >= 1 ? 'active' : ''}`}><span className="step-num">1</span><span className="step-name">Personal</span></div>
            <ChevronRight size={14} className="indicator-sep" />
            <div className={`indicator-step ${wizardStep >= 2 ? 'active' : ''}`}><span className="step-num">2</span><span className="step-name">Professional</span></div>
            <ChevronRight size={14} className="indicator-sep" />
            <div className={`indicator-step ${wizardStep >= 3 ? 'active' : ''}`}><span className="step-num">3</span><span className="step-name">Login</span></div>
            <ChevronRight size={14} className="indicator-sep" />
            <div className={`indicator-step ${wizardStep >= 4 ? 'active' : ''}`}><span className="step-num">4</span><span className="step-name">Documents</span></div>
            <ChevronRight size={14} className="indicator-sep" />
            <div className={`indicator-step ${wizardStep >= 5 ? 'active' : ''}`}><span className="step-num">5</span><span className="step-name">Skills & Certs</span></div>
          </div>

          <form className="wizard-form-body" onSubmit={e => e.preventDefault()}>
            {wizardStep === 1 && (
              <div className="wizard-step-form">
                <div className="form-section-grid">
                  <div className="form-field"><label>Full Name *</label><input type="text" placeholder="e.g. Vikram Singh" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required /></div>
                  <div className="form-field"><label>Date of Birth</label><input type="date" value={formData.dob} onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))} /></div>
                  <div className="form-field"><label>Gender</label><select value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                  <div className="form-field"><label>Contact Number *</label><input type="text" placeholder="e.g. +91 98765 43210" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} required /></div>
                  <div className="form-field"><label>Email Address *</label><input type="email" placeholder="e.g. vikram@company.com" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required /></div>
                  <div className="form-field form-field-full"><label>Current Address</label><textarea rows="2" placeholder="Current residential address" value={formData.currentAddress} onChange={e => setFormData(p => ({ ...p, currentAddress: e.target.value }))} /></div>
                  <div className="form-field form-field-full"><label>Permanent Address</label><textarea rows="2" placeholder="Permanent address" value={formData.permanentAddress} onChange={e => setFormData(p => ({ ...p, permanentAddress: e.target.value }))} /></div>
                </div>
                <h4 className="form-subsection-title">Emergency Contact</h4>
                <div className="form-section-grid">
                  <div className="form-field"><label>Contact Name</label><input type="text" placeholder="e.g. Priya Sharma" value={formData.emergencyContactName} onChange={e => setFormData(p => ({ ...p, emergencyContactName: e.target.value }))} /></div>
                  <div className="form-field"><label>Phone Number</label><input type="text" placeholder="e.g. +91 98765 43211" value={formData.emergencyContactPhone} onChange={e => setFormData(p => ({ ...p, emergencyContactPhone: e.target.value }))} /></div>
                  <div className="form-field"><label>Alt Phone Number</label><input type="text" placeholder="e.g. +91 98765 43212" value={formData.emergencyContactPhoneAlt || ''} onChange={e => setFormData(p => ({ ...p, emergencyContactPhoneAlt: e.target.value }))} /></div>
                  <div className="form-field"><label>Address</label><input type="text" placeholder="Emergency contact address" value={formData.emergencyContactAddress} onChange={e => setFormData(p => ({ ...p, emergencyContactAddress: e.target.value }))} /></div>
                  <div className="form-field"><label>Relation</label><select value={formData.emergencyContactRelation} onChange={e => setFormData(p => ({ ...p, emergencyContactRelation: e.target.value }))}>
                    <option value="">Select Relation</option><option>Spouse</option><option>Parent</option><option>Sibling</option><option>Friend</option><option>Relative</option><option>Other</option>
                  </select></div>
                </div>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="wizard-step-form">
                <div className="form-section-grid">
                  <div className="form-field"><label>Employee ID</label><input type="text" placeholder="e.g. EMP-2026-100" value={formData.id} onChange={e => setFormData(p => ({ ...p, id: e.target.value }))} disabled={formMode === 'edit'} /></div>
                  <div className="form-field"><label>Company Name</label><input type="text" placeholder="e.g. OM Enterprise" value={formData.companyName || ''} onChange={e => setFormData(p => ({ ...p, companyName: e.target.value }))} /></div>
                  <div className="form-field"><label>Designation *</label><input type="text" placeholder="e.g. Senior Software Engineer" value={formData.designation} onChange={e => setFormData(p => ({ ...p, designation: e.target.value }))} required /></div>
                  <div className="form-field"><label>Department *</label><select value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}>{depts.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div className="form-field">
                    <label>Branch/Agency *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Jaipur" 
                      value={formData.branch} 
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(p => {
                          const updated = { ...p, branch: val };
                          const cleanBranch = val.toLowerCase().trim();
                          const defaults = {
                            delhi: 'Connaught Place, New Delhi - 110001',
                            mumbai: 'Bandra Kurla Complex, Mumbai - 400051',
                            bangalore: 'MG Road, Bangalore - 560001',
                            bengaluru: 'MG Road, Bangalore - 560001',
                            jaipur: 'Malviya Nagar, Jaipur, Rajasthan 302017'
                          };
                          if (!p.branchAddress || Object.values(defaults).includes(p.branchAddress)) {
                            if (cleanBranch.includes('delhi')) updated.branchAddress = defaults.delhi;
                            else if (cleanBranch.includes('mumbai')) updated.branchAddress = defaults.mumbai;
                            else if (cleanBranch.includes('bangalore') || cleanBranch.includes('bengaluru')) updated.branchAddress = defaults.bangalore;
                            else if (cleanBranch.includes('jaipur')) updated.branchAddress = defaults.jaipur;
                          }
                          return updated;
                        });
                      }} 
                      list="branch-list"
                      required 
                    />
                    <datalist id="branch-list">
                      {branches.map(b => <option key={b} value={b} />)}
                    </datalist>
                  </div>
                  <div className="form-field"><label>Branch Address</label><input type="text" placeholder="e.g. Malviya Nagar, Jaipur, Rajasthan 302017" value={formData.branchAddress || ''} onChange={e => setFormData(p => ({ ...p, branchAddress: e.target.value }))} /></div>
                  <div className="form-field"><label>Team Leader</label><select value={formData.teamLeader} onChange={e => setFormData(p => ({ ...p, teamLeader: e.target.value }))}><option value="">Select Team Leader</option>{leaders.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
                  <div className="form-field"><label>Project Manager</label><select value={formData.projectManager} onChange={e => setFormData(p => ({ ...p, projectManager: e.target.value }))}><option value="">Select Project Manager</option>{leaders.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
                  <div className="form-field"><label>Joining Date *</label><input type="date" value={formData.joinDate} onChange={e => setFormData(p => ({ ...p, joinDate: e.target.value }))} required /></div>
                  <div className="form-field"><label>Shift Timing</label><input type="text" placeholder="e.g. 09:00 AM - 06:00 PM" value={formData.shiftTiming} onChange={e => setFormData(p => ({ ...p, shiftTiming: e.target.value }))} /></div>
                  <div className="form-field"><label>Salary Amount (Basic)</label><input type="number" placeholder="e.g. 35000" value={formData.salaryAmount} onChange={e => setFormData(p => ({ ...p, salaryAmount: e.target.value }))} /></div>
                  <div className="form-field"><label>Allowances</label><input type="number" placeholder="e.g. 12000" value={formData.salaryAllowances} onChange={e => setFormData(p => ({ ...p, salaryAllowances: e.target.value }))} /></div>
                  <div className="form-field"><label>Deductions</label><input type="number" placeholder="e.g. 5000" value={formData.salaryDeductions} onChange={e => setFormData(p => ({ ...p, salaryDeductions: e.target.value }))} /></div>
                </div>

                <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-4)' }}>Employment Information</h4>
                <div className="form-section-grid">
                  <div className="form-field">
                    <label>Employee Type</label>
                    <select value={formData.employeeType || 'Full Time'} onChange={e => setFormData(p => ({ ...p, employeeType: e.target.value }))}>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Employment Status</label>
                    <select value={formData.employmentStatus || 'Active'} onChange={e => setFormData(p => ({ ...p, employmentStatus: e.target.value }))}>
                      <option value="Active">Active</option>
                      <option value="Probation">Probation</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                  <div className="form-field"><label>Probation End Date</label><input type="date" value={formData.probationEndDate || ''} onChange={e => setFormData(p => ({ ...p, probationEndDate: e.target.value }))} /></div>
                  <div className="form-field"><label>Contract End Date</label><input type="date" value={formData.contractEndDate || ''} onChange={e => setFormData(p => ({ ...p, contractEndDate: e.target.value }))} /></div>
                </div>

                <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-4)' }}>Bank Details</h4>
                <div className="form-section-grid">
                  <div className="form-field"><label>Bank Name</label><input type="text" placeholder="e.g. HDFC Bank" value={formData.bankName || ''} onChange={e => setFormData(p => ({ ...p, bankName: e.target.value }))} /></div>
                  <div className="form-field"><label>Account Number</label><input type="text" placeholder="e.g. 501002348271" value={formData.bankAccountNumber || ''} onChange={e => setFormData(p => ({ ...p, bankAccountNumber: e.target.value }))} /></div>
                  <div className="form-field"><label>IFSC Code</label><input type="text" placeholder="e.g. HDFC0000123" value={formData.bankIfscCode || ''} onChange={e => setFormData(p => ({ ...p, bankIfscCode: e.target.value }))} /></div>
                  <div className="form-field"><label>UPI ID</label><input type="text" placeholder="e.g. employee@okhdfc" value={formData.bankUpiId || ''} onChange={e => setFormData(p => ({ ...p, bankUpiId: e.target.value }))} /></div>
                </div>
              </div>
            )}
            {wizardStep === 3 && (
              <div className="wizard-step-form">
                <div className="form-section-grid">
                  <div className="form-field"><label>Username</label><input type="text" placeholder="e.g. vikram.singh" value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} /></div>
                  <div className="form-field"><label>Password *</label><input type="password" placeholder={formMode === 'edit' ? 'Leave blank to keep current' : 'Set login password'} value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} required={formMode !== 'edit'} /></div>
                  <div className="form-field"><label>Role Assignment *</label>
                    <select value={formData.roleId} onChange={e => setFormData(p => ({ ...p, roleId: e.target.value }))}>
                      <option value="super_admin">Super Admin</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="team_leader">Team Leader</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            {wizardStep === 4 && (
              <div className="wizard-step-form">
                <div className="form-section-grid-docs">
                  {['aadhaar', 'pan', 'resume', 'certificates', 'offerLetter', 'profilePhoto'].map(docKey => (
                    <div key={docKey} className="form-doc-upload">
                      <label className="doc-label">{docKey === 'offerLetter' ? 'Offer Letter' : docKey.charAt(0).toUpperCase() + docKey.slice(1).replace(/([A-Z])/g, ' $1')}</label>
                      <label className="doc-upload-box">
                        <input type="file" accept={docKey === 'profilePhoto' ? 'image/*' : '.pdf,.jpg,.png,.jpeg'} onChange={e => setUploadedDocs(p => ({ ...p, [docKey]: e.target.files[0] }))} hidden />
                        {uploadedDocs[docKey] ? <span className="doc-file-name">{uploadedDocs[docKey].name}</span> : <span className="doc-placeholder">+ Upload</span>}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {wizardStep === 5 && (
              <div className="wizard-step-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)' }}>
                  
                  {/* Skills Section */}
                  <div>
                    <h4 className="form-subsection-title" style={{ marginTop: 0 }}>Skills</h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input 
                        type="text" 
                        id="new-skill-name"
                        placeholder="Skill e.g. React" 
                        style={{ flex: 1, padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                      />
                      <select 
                        id="new-skill-level"
                        style={{ padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                      >
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Expert</option>
                      </select>
                      <Button size="sm" onClick={() => {
                        const nameEl = document.getElementById('new-skill-name');
                        const levelEl = document.getElementById('new-skill-level');
                        if (nameEl && nameEl.value.trim()) {
                          const newSkill = { name: nameEl.value.trim(), level: levelEl.value };
                          setFormData(prev => ({
                            ...prev,
                            skills: [...(prev.skills || []), newSkill]
                          }));
                          nameEl.value = '';
                        }
                      }}>Add</Button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                      {(formData.skills || []).map((skill, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '4px 8px', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{skill.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({skill.level})</span>
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              skills: prev.skills.filter((_, i) => i !== idx)
                            }))}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Certifications Section */}
                  <div>
                    <h4 className="form-subsection-title" style={{ marginTop: 0 }}>Certifications</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      <input 
                        type="text" 
                        id="new-cert-name"
                        placeholder="Cert name e.g. AWS" 
                        style={{ padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="date" 
                          id="new-cert-expiry"
                          style={{ flex: 1, padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                        />
                        <Button size="sm" onClick={() => {
                          const nameEl = document.getElementById('new-cert-name');
                          const expiryEl = document.getElementById('new-cert-expiry');
                          if (nameEl && nameEl.value.trim()) {
                            const newCert = { name: nameEl.value.trim(), expiryDate: expiryEl.value || null };
                            setFormData(prev => ({
                              ...prev,
                              certifications: [...(prev.certifications || []), newCert]
                            }));
                            nameEl.value = '';
                            expiryEl.value = '';
                          }
                        }}>Add</Button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                      {(formData.certifications || []).map((cert, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '4px 8px', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{cert.name}</span>
                          {cert.expiryDate && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Exp: {cert.expiryDate}</span>
                          )}
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              certifications: prev.certifications.filter((_, i) => i !== idx)
                            }))}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </form>

          <div className="form-panel-footer">
            <div className="wizard-footer-buttons">
              {wizardStep > 1 && <Button variant="secondary" icon={ArrowLeft} onClick={handlePrevStep}>Back</Button>}
              {wizardStep < 5
                ? <Button variant="primary" onClick={handleNextStep} disabled={!isStepValid()}>Next Step</Button>
                : <Button variant="primary" onClick={handleFormSubmit}>{formMode === 'add' ? 'Create Employee' : 'Save Changes'}</Button>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── View SlideOver ── */}
      <SlideOver
        isOpen={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        title="Employee Profile Detail"
      >
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
      </SlideOver>

      {/* ── ID Card Modal ── */}
      {showIdCard && idCardEmployee && (
        <div className="id-card-overlay" onClick={() => { setShowIdCard(false); setIdCardEmployee(null); }}>
          <div className="id-card-modal" onClick={e => e.stopPropagation()}>
            <button className="id-card-close" onClick={() => { setShowIdCard(false); setIdCardEmployee(null); }}>✕</button>
            
            {/* The wrapper that will be captured for download */}
            <div className="id-card-render-wrapper" ref={idCardRef}>
              
              {/* FRONT SIDE */}
              <div className="id-card-front">
                <div className="id-card-front-header-bg">
                  <div className="id-card-watermark"></div>
                </div>
                <div className="id-card-front-pink-bg"></div>
                
                <div className="id-card-logo-area">
                  <svg viewBox="0 0 100 100" width="22" height="22" className="id-card-logo-svg">
                    <polygon points="50,15 85,50 50,85 15,50" fill="none" stroke="#ffffff" strokeWidth="8" />
                    <polygon points="50,28 72,50 50,72 28,50" fill="var(--color-primary)" />
                  </svg>
                  <div className="id-card-company-title">{idCardEmployee.companyName || 'OM ENTERPRISE'}</div>
                  <div className="id-card-company-subtitle">{idCardEmployee.branch ? (idCardEmployee.branch.toLowerCase().includes('branch') ? idCardEmployee.branch : `${idCardEmployee.branch} Branch`) : 'Office Management'}</div>
                </div>

                <div className="id-card-photo-wrap">
                  <Avatar name={idCardEmployee.name} size="xl" className="id-card-photo-img" />
                </div>

                <div className="id-card-name-area">
                  <h2 className="id-card-emp-name">
                    {renderName(idCardEmployee.name)}
                  </h2>
                  <p className="id-card-emp-role">{idCardEmployee.designation || idCardEmployee.role}</p>
                </div>

                <div className="id-card-details-grid">
                  <div className="id-detail-label">ID NO</div>
                  <div className="id-detail-colon">:</div>
                  <div className="id-detail-value">{idCardEmployee.id}</div>

                  <div className="id-detail-label">Dept.</div>
                  <div className="id-detail-colon">:</div>
                  <div className="id-detail-value">{idCardEmployee.department}</div>

                  <div className="id-detail-label">Deg.</div>
                  <div className="id-detail-colon">:</div>
                  <div className="id-detail-value">{idCardEmployee.designation || idCardEmployee.role}</div>

                  <div className="id-detail-label">DOB</div>
                  <div className="id-detail-colon">:</div>
                  <div className="id-detail-value">{fmtDob(idCardEmployee.dob)}</div>

                  <div className="id-detail-label">Email</div>
                  <div className="id-detail-colon">:</div>
                  <div className="id-detail-value" title={idCardEmployee.workEmail || idCardEmployee.email}>
                    {idCardEmployee.workEmail || idCardEmployee.email}
                  </div>
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="id-card-back">
                <div className="id-card-back-bullets">
                  <div className="id-card-bullet-row">
                    <span className="id-bullet-dot"></span>
                    <p>This card is the official property of {idCardEmployee.companyName || 'OM Enterprise'} and must be returned on demand.</p>
                  </div>
                  <div className="id-card-bullet-row">
                    <span className="id-bullet-dot"></span>
                    <p>If found, please return to the HR Department or dynamic branch address below immediately.</p>
                  </div>
                  <div className="id-card-bullet-row">
                    <span className="id-bullet-dot"></span>
                    <p style={{ fontWeight: 600 }}>Branch Address: {idCardEmployee.branchAddress || getBranchAddress(idCardEmployee.branch)}</p>
                  </div>
                </div>

                <div className="id-card-back-middle">
                  <div className="id-card-back-dates">
                    <div className="id-date-row">
                      <span className="id-date-label">Join Date:</span>
                      <span className="id-date-val">{fmtJoinDate(idCardEmployee.joinDate)}</span>
                    </div>
                    <div className="id-date-row">
                      <span className="id-date-label">Expire Date:</span>
                      <span className="id-date-val">{idCardEmployee.contractEndDate ? fmtJoinDate(idCardEmployee.contractEndDate) : calculateExpiry(idCardEmployee.joinDate)}</span>
                    </div>
                    <div className="id-card-barcode-area">
                      <svg viewBox="0 0 100 20" className="id-card-barcode-svg">
                        <rect x="0" y="0" width="3" height="20" fill="#0f172a" />
                        <rect x="5" y="0" width="1" height="20" fill="#0f172a" />
                        <rect x="8" y="0" width="2" height="20" fill="#0f172a" />
                        <rect x="12" y="0" width="4" height="20" fill="#0f172a" />
                        <rect x="18" y="0" width="1" height="20" fill="#0f172a" />
                        <rect x="21" y="0" width="2" height="20" fill="#0f172a" />
                        <rect x="25" y="0" width="3" height="20" fill="#0f172a" />
                        <rect x="30" y="0" width="1" height="20" fill="#0f172a" />
                        <rect x="33" y="0" width="2" height="20" fill="#0f172a" />
                        <rect x="37" y="0" width="5" height="20" fill="#0f172a" />
                        <rect x="44" y="0" width="1" height="20" fill="#0f172a" />
                        <rect x="47" y="0" width="3" height="20" fill="#0f172a" />
                        <rect x="52" y="0" width="2" height="20" fill="#0f172a" />
                        <rect x="56" y="0" width="4" height="20" fill="#0f172a" />
                        <rect x="62" y="0" width="1" height="20" fill="#0f172a" />
                        <rect x="65" y="0" width="2" height="20" fill="#0f172a" />
                        <rect x="69" y="0" width="3" height="20" fill="#0f172a" />
                        <rect x="74" y="0" width="1" height="20" fill="#0f172a" />
                        <rect x="77" y="0" width="2" height="20" fill="#0f172a" />
                        <rect x="81" y="0" width="5" height="20" fill="#0f172a" />
                        <rect x="88" y="0" width="1" height="20" fill="#0f172a" />
                        <rect x="91" y="0" width="3" height="20" fill="#0f172a" />
                        <rect x="96" y="0" width="2" height="20" fill="#0f172a" />
                      </svg>
                      <div className="id-card-barcode-text">*{idCardEmployee.id}*</div>
                    </div>
                  </div>

                  <div className="id-card-back-qr">
                    <svg viewBox="0 0 100 100" width="40" height="40" className="id-card-qr-svg">
                      <rect x="0" y="0" width="28" height="28" fill="#0f172a" />
                      <rect x="4" y="4" width="20" height="20" fill="#ffffff" />
                      <rect x="8" y="8" width="12" height="12" fill="var(--color-primary)" />

                      <rect x="72" y="0" width="28" height="28" fill="#0f172a" />
                      <rect x="76" y="4" width="20" height="20" fill="#ffffff" />
                      <rect x="80" y="8" width="12" height="12" fill="var(--color-primary)" />

                      <rect x="0" y="72" width="28" height="28" fill="#0f172a" />
                      <rect x="4" y="76" width="20" height="20" fill="#ffffff" />
                      <rect x="8" y="80" width="12" height="12" fill="var(--color-primary)" />

                      <rect x="36" y="4" width="8" height="8" fill="#0f172a" />
                      <rect x="52" y="4" width="8" height="8" fill="#0f172a" />
                      <rect x="44" y="12" width="16" height="8" fill="#0f172a" />
                      <rect x="36" y="24" width="8" height="8" fill="#0f172a" />
                      
                      <rect x="4" y="36" width="8" height="8" fill="#0f172a" />
                      <rect x="16" y="44" width="8" height="8" fill="#0f172a" />
                      <rect x="24" y="36" width="8" height="8" fill="#0f172a" />
                      
                      <rect x="36" y="36" width="16" height="16" fill="var(--color-primary)" />
                      <rect x="40" y="40" width="8" height="8" fill="#ffffff" />
                      
                      <rect x="60" y="36" width="8" height="8" fill="#0f172a" />
                      <rect x="56" y="48" width="8" height="8" fill="#0f172a" />
                      
                      <rect x="36" y="56" width="8" height="8" fill="#0f172a" />
                      <rect x="48" y="60" width="8" height="8" fill="#0f172a" />
                      
                      <rect x="76" y="36" width="8" height="8" fill="#0f172a" />
                      <rect x="84" y="44" width="12" height="8" fill="#0f172a" />
                      <rect x="72" y="56" width="8" height="16" fill="#0f172a" />
                      <rect x="88" y="60" width="8" height="8" fill="var(--color-primary)" />
                      
                      <rect x="36" y="76" width="12" height="8" fill="#0f172a" />
                      <rect x="52" y="72" width="8" height="16" fill="#0f172a" />
                      <rect x="64" y="80" width="8" height="8" fill="var(--color-primary)" />
                      
                      <rect x="76" y="76" width="12" height="8" fill="#0f172a" />
                      <rect x="84" y="84" width="12" height="8" fill="#0f172a" />
                    </svg>
                    <span className="id-qr-label">SCAN ME</span>
                  </div>
                </div>

                <div className="id-card-back-signature-area">
                  <div className="id-signature-font">{idCardEmployee.teamLeader || 'Vikram Singh'}</div>
                  <div className="id-signature-line"></div>
                  <div className="id-signature-label">Authorized Signatory</div>
                </div>

                <div className="id-card-back-bottom-bg">
                  <div className="id-card-watermark"></div>
                </div>
                <div className="id-card-back-pink-bg"></div>
              </div>

            </div>

            <button className="id-card-download-btn" onClick={downloadIdCard}>
              <Download size={16} /> Download ID Cards
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
