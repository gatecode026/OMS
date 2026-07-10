import React, { useState, useEffect, useRef, useMemo } from 'react';
import './Employees.css';
import { useApp } from '../context/AppContext';
import { FIELD_LABELS } from '../utils/fieldLabels';
import usePageLoading from '../hooks/usePageLoading';
import { encodeEmployeeId } from '../utils/hashId';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import SlideOver from '../components/common/SlideOver';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, UserPlus, Eye, EyeOff, Edit2, Trash2, ChevronRight, ArrowLeft,
  Phone, Mail, Calendar, CheckCircle, XCircle, UserCheck, Download,
  SlidersHorizontal, RefreshCw, Users, Briefcase, Activity,
  X, ChevronUp, ChevronDown, Trophy, AlertTriangle,
  Shield, Clock, User, Star, CreditCard, Save
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtJoinDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtDob = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const calculateExpiry = (dateStr) => {
  if (!dateStr) return '—';
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

const getBranchAddress = (branchName, branchesList = []) => {
  const name = (branchName || '').toLowerCase().trim();
  const foundBranch = (branchesList || []).find(b => 
    (b.name || '').toLowerCase().trim() === name ||
    (b.id || '').toLowerCase().trim() === name ||
    (b.code || '').toLowerCase().trim() === name ||
    (b.branchCode || '').toLowerCase().trim() === name
  );
  if (foundBranch) {
    const addr = [foundBranch.address, foundBranch.city, foundBranch.state, foundBranch.zipCode].filter(Boolean).join(', ');
    if (addr) return addr;
  }
  return branchName || '—';
};

const fmtHoursTo60 = (decimalHours) => {
  if (!decimalHours || isNaN(decimalHours)) return '0h 00m';
  const hrs = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hrs) * 60);
  let displayHrs = hrs;
  let displayMins = mins;
  if (displayMins === 60) {
    displayHrs += 1;
    displayMins = 0;
  }
  return `${displayHrs}h ${String(displayMins).padStart(2, '0')}m`;
};

const isNewJoiner = (dateStr) => {
  if (!dateStr) return false;
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 30 * 24 * 60 * 60 * 1000;
};

const downloadCSV = (employees) => {
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Department', 'Branch', 'Role', 'Status', 'Account Status'];
  const rows = employees.map(e => [
    e.id, e.name, e.workEmail || e.email, e.phone, e.department, e.branch, e.role, e.status, e.accountStatus || 'Active'
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'employees_export.csv'; a.click();
  URL.revokeObjectURL(url);
};

const isValidEmail = (email) => {
  if (!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
};

const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return /^[789]\d{9}$/.test(cleaned);
};

const isValidAlternatePhone = (phone) => {
  if (!phone) return true;
  return isValidPhone(phone);
};

const isValidPersonalEmail = (email) => {
  if (!email) return true;
  return isValidEmail(email);
};

const isOldEnough = (dobString) => {
  if (!dobString) return true;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
};

const isValidZipCode = (zip) => {
  return /^\d{6}$/.test((zip || '').trim());
};

const isValidAadhaar = (aadhaar) => {
  return /^\d{12}$/.test((aadhaar || '').trim());
};

const isValidPan = (pan) => {
  return /^[A-Z]{5}\d{4}[A-Z]{1}$/.test((pan || '').trim().toUpperCase());
};

const isValidBankAccount = (num) => {
  if (!num) return true;
  return /^\d{9,18}$/.test(num.trim());
};

const isValidIfsc = (ifsc) => {
  if (!ifsc) return true;
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());
};

const isValidUpi = (upi) => {
  if (!upi) return true;
  return /^[a-zA-Z0-9.\-_+]+@[a-zA-Z0-9.\-_]+$/.test(upi.trim());
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const addressToString = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [addr.line1, addr.city, addr.state].filter(Boolean);
    const base = parts.join(', ');
    return addr.pincode ? `${base} - ${addr.pincode}` : base;
  }
  return String(addr);
};


// ─── Attendance Status Badge ─────────────────────────────────────────────────
const AttBadge = ({ status }) => {
  const map = {
    'Present': { cls: 'att-present', label: '✅ Present' },
    'Absent': { cls: 'att-absent', label: '❌ Absent' },
    'On Leave': { cls: 'att-leave', label: '🌴 On Leave' },
    'Leave': { cls: 'att-leave', label: '🌴 On Leave' },
    'Late': { cls: 'att-late', label: '🕐 Late' },
    'Work From Home': { cls: 'att-wfh', label: '🏠 WFH' },
    'WFH': { cls: 'att-wfh', label: '🏠 WFH' },
    'Overtime': { cls: 'att-ot', label: '⏰ Overtime' },
  };
  const cfg = map[status] || { cls: 'att-absent', label: status || '—' };
  return (
    <span className={`att-badge ${cfg.cls}`} title={status}>
      {cfg.label}
    </span>
  );
};

const WorkStatusDot = ({ status }) => {
  const map = {
    'Online': { cls: 'dot-green', label: 'Online', pulse: true },
    'Offline': { cls: 'dot-red', label: 'Offline', pulse: false },
  };
  const cfg = map[status] || { cls: 'dot-red', label: 'Offline', pulse: false };
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
  { label: 'Identity', keys: ['name', 'id'] },
  { label: 'Role', keys: ['designation', 'department', 'branch', 'teamLeader', 'projectManager'] },
  { label: 'Contact', keys: ['phone', 'workEmail'] },
  { label: 'Timeline', keys: ['joinDate'] },
  { label: 'Status', keys: ['attendanceStatus', 'workStatus', 'accountStatus'] },
  { label: 'Punch Info', keys: ['todayPunchIn', 'todayPunchOut', 'todayWorkingHours'] },
  { label: 'Advanced', keys: ['employeeType', 'shift', 'experience', 'lastLogin', 'currentProjects', 'leaveBalance', 'productivityScore', 'performanceRating'] },
];

const COLUMN_LABELS = {
  name: 'Full Name', id: 'Employee ID', designation: 'Designation',
  department: 'Department', branch: 'Branch/Agency', teamLeader: 'Team Leader', projectManager: 'Project Manager',
  phone: 'Contact Number', workEmail: 'Official Company Email', joinDate: 'Joining Date',
  attendanceStatus: 'Attendance Status', workStatus: 'Work Status', accountStatus: 'Employment Status',
  todayPunchIn: "Punch In Time", todayPunchOut: "Punch Out Time", todayWorkingHours: "Working Hours",
  employeeType: 'Employee Type', shift: 'Shift Timing', experience: 'Experience', lastLogin: 'Last Login',
  currentProjects: 'Projects Count', leaveBalance: 'Leave Balance', productivityScore: 'Productivity',
  performanceRating: 'Performance Rating', actions: 'Actions'
};

const DEFAULT_VISIBILITY = {
  name: true, id: true, designation: true, department: true,
  branch: true, teamLeader: false, projectManager: false, phone: false,
  workEmail: true, joinDate: false, attendanceStatus: true, todayPunchIn: true,
  todayPunchOut: true, todayWorkingHours: true, workStatus: true,
  accountStatus: true, employeeType: false, shift: false, experience: false,
  lastLogin: false, currentProjects: false, leaveBalance: false, productivityScore: false,
  performanceRating: false, actions: true
};

const LS_KEY = 'saas_emp_col_visibility';

// ─── Employees Component ─────────────────────────────────────────────────────
const Employees = () => {
  const isLoading = usePageLoading(600);
  const navigate = useNavigate();
  const { employees: rawEmployees, addEmployee, updateEmployee, deactivateEmployee, activateEmployee, showConfirm, roles, addToast, leaveRequests, branches: dbBranches, departments: rawDbDepartments, teams, appraisalReviews, hasPermission, token, attendance, tasks, dailyReports, fetchEmployees, fetchAttendance, fetchLeaves, fetchDepartments, generalSettings, currentUserRole, currentUser } = useApp();
  
  const employees = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin') return rawEmployees;
    if (currentUserRole === 'branch_admin') {
      return rawEmployees.filter(e => e.branch === currentUser?.branch);
    }
    if (currentUserRole === 'dept_admin' || currentUserRole === 'team_leader') {
      return rawEmployees.filter(e => e.department === currentUser?.department);
    }
    if (currentUserRole === 'employee') {
      return rawEmployees.filter(e => e.department === currentUser?.department);
    }
    return rawEmployees;
  }, [rawEmployees, currentUser, currentUserRole]);
  const location = useLocation();

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayAttendance = (empId) => {
    if (!attendance || attendance.length === 0) return null;
    const todayStr = getLocalDateString();
    return attendance.find(a => a.employeeId === empId && a.date === todayStr);
  };

  const isEmployeeOnLeaveToday = (empId) => {
    if (!leaveRequests || leaveRequests.length === 0) return false;
    const todayStr = getLocalDateString();
    return leaveRequests.some(r => 
      r.employeeId === empId && 
      r.status === 'Approved' && 
      todayStr >= r.from && 
      todayStr <= r.to
    );
  };

  const getTodayStatus = (row) => {
    const att = getTodayAttendance(row.id);
    if (att) return att.status;
    if (isEmployeeOnLeaveToday(row.id)) {
      return 'On Leave';
    }
    return 'Absent';
  };


  const handleZipCodeChange = async (zipVal) => {
    const digitsOnly = zipVal.replace(/\D/g, '').slice(0, 6);
    setFormData(p => ({ ...p, zipCode: digitsOnly }));
    if (!digitsOnly || digitsOnly.length !== 6) return;
    const currentCountry = formData.country || 'India';
    if (currentCountry === 'India') {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${digitsOnly}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const office = data[0].PostOffice[0];
          setFormData(p => ({
            ...p,
            city: office.District || office.Division || p.city,
            state: office.State || p.state
          }));
          addToast('success', `Fetched city & state for PIN ${digitsOnly}`);
        }
      } catch (err) {
        console.error('Indian PIN code fetch error:', err);
      }
    }
  };

  const isGlobalAdmin = currentUserRole === 'super_admin' || currentUserRole === 'company_admin';

  // ── Filters ──
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(() => {
    if (currentUserRole && currentUserRole !== 'super_admin' && currentUserRole !== 'company_admin') {
      return currentUser?.branch || '';
    }
    return '';
  });

  useEffect(() => {
    if (currentUser && currentUserRole && currentUserRole !== 'super_admin' && currentUserRole !== 'company_admin') {
      setBranchFilter(currentUser.branch || '');
    }
  }, [currentUser, currentUserRole]);
  const [statusFilter, setStatusFilter] = useState('');
  const [attFilter, setAttFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [punchFilter, setPunchFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ── Column visibility ──
  const [colVis, setColVis] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      return { ...DEFAULT_VISIBILITY, ...saved, department: true };
    }
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
  const [createdEmpInfo, setCreatedEmpInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    reportType: 'All Employees',
    employeeId: '',
    dateRange: 'AllTime',
    format: 'CSV'
  });

  const canNavigateToStep = (targetStep) => {
    if (targetStep <= wizardStep) return true;
    for (let s = wizardStep; s < targetStep; s++) {
      if (!isStepValid(s)) {
        addToast('warning', `Please complete and fix errors in Step ${s} before proceeding.`);
        return false;
      }
    }
    return true;
  };

  const handleStepClick = (step) => {
    if (canNavigateToStep(step)) {
      setWizardStep(step);
      addToast('info', `Step ${step} selected`);
    }
  };

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', dob: '', gender: 'Male',
    personalEmail: '', alternatePhone: '',
    currentAddress: '', permanentAddress: '',
    city: '', state: '', country: 'India', zipCode: '',
    bloodGroup: '', maritalStatus: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactPhoneAlt: '', emergencyContactAddress: '', emergencyContactRelation: '',
    username: '', password: '', confirmPassword: '', officialEmail: '',
    department: '', branch: '', team: '', teamName: '',
    designation: '', role: 'Employee', roleId: 'employee',
    joinDate: new Date().toISOString().split('T')[0],
    id: '', avatar: '',
    shiftTiming: '09:30 AM - 06:00 PM',
    salaryAmount: '', salaryAllowances: '', salaryDeductions: '',
    teamLeader: '', projectManager: '',
    companyName: '',
    branchAddress: '',
    workLocation: '', workMode: 'WFO',
    experience: '',
    permissions: {
      dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      employees: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      attendance: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      leaves: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      projects: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      payroll: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      tasks: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      reports: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      settings: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
      tickets: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
      announcements: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
      documents: { view: true, create: true, edit: true, delete: false, approve: false, export: true }
    },
    shiftType: 'Morning Shift',
    weeklyOffDays: ['Sunday'],
    attendanceRule: 'Standard 9-6',
    punchInTime: '09:00 AM',
    punchOutTime: '06:00 PM',
    overtimeEligibility: false,
    salaryType: 'Monthly Fixed',
    monthlySalary: '',
    panNumber: '',
    aadhaarNumber: '',
    taxDetails: '',
    multiDeviceLogin: false,
    ipRestriction: '',
    twoFactorAuth: false,
    loginActivityTracking: 'Enabled',
    sessionTimeout: '30 minutes',
    employeeType: 'Full Time',
    probationEndDate: '',
    contractEndDate: ''
  });

  const dbDepartments = useMemo(() => {
    return (rawDbDepartments || []).filter(d => d.status === 'Active' || d.name === formData.department);
  }, [rawDbDepartments, formData.department]);

  const [uploadedDocs, setUploadedDocs] = useState({
    aadhaar: null, pan: null, resume: null,
    certificates: null, offerLetter: null, profilePhoto: null,
    experienceLetter: null, addressProof: null, passportPhoto: null, signedAgreements: null
  });

  const [previewEmp, setPreviewEmp] = useState(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const previewRef = useRef(null);
  const [hoveredEmp, setHoveredEmp] = useState(null);
  const [hoverPos, setHoverPos] = useState({ top: 0, left: 0 });
  const [showIdCard, setShowIdCard] = useState(false);
  const [idCardEmployee, setIdCardEmployee] = useState(null);
  const idCardRef = useRef(null);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAssignLeaderModal, setShowAssignLeaderModal] = useState(false);
  const [transferDept, setTransferDept] = useState('');
  const [assignLeader, setAssignLeader] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [bulkRole, setBulkRole] = useState('employee');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('Active');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [bulkShift, setBulkShift] = useState('Morning (09:00 AM - 06:00 PM)');
  const [bulkLeaveDays, setBulkLeaveDays] = useState(5);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [bulkNotifyMsg, setBulkNotifyMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Deactivation wizard states
  const [deactivatingEmployee, setDeactivatingEmployee] = useState(null);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [exitFormData, setExitFormData] = useState({
    lastWorkingDay: '',
    exitDate: '',
    exitReason: 'Resignation',
    exitNotes: ''
  });
  const [checkingOpenWork, setCheckingOpenWork] = useState(false);
  const [openWork, setOpenWork] = useState(null);
  const [reassignTarget, setReassignTarget] = useState('');
  const [reassignSubmit, setReassignSubmit] = useState(false);

  // --- Form Inline Validation Booleans ---
  const dupEmail = formData.email && employees.some(e => (e.email === formData.email || e.workEmail === formData.email) && e.id !== selectedEmployeeId);
  const dupPhone = formData.phone && employees.some(e => e.phone === formData.phone && e.id !== selectedEmployeeId);
  const dupUsername = formData.username && employees.some(e => e.username && e.username.trim().toLowerCase() === formData.username.trim().toLowerCase() && e.id !== selectedEmployeeId);
  const dupEmpId = formMode === 'add' && formData.id && employees.some(e => e.id.trim().toLowerCase() === formData.id.trim().toLowerCase());
  const invalidPass = formData.password && formData.password !== '••••••••' && (formData.password.length < 8 || formData.password.length > 12);

  const invalidEmail = formData.email && !isValidEmail(formData.email);
  const invalidPhone = formData.phone && !isValidPhone(formData.phone);
  const invalidAltPhone = formData.alternatePhone && !isValidPhone(formData.alternatePhone);
  const invalidPersEmail = formData.personalEmail && !isValidEmail(formData.personalEmail);
  const tooYoung = formData.dob && !isOldEnough(formData.dob);
  const invalidZip = formData.zipCode && !isValidZipCode(formData.zipCode);
  const invalidEmergPhone = formData.emergencyContactPhone && !isValidPhone(formData.emergencyContactPhone);
  const invalidEmergPhoneAlt = formData.emergencyContactPhoneAlt && !isValidPhone(formData.emergencyContactPhoneAlt);

  const invalidDesig = formData.roleId !== 'manager' && formData.designation && formData.designation.trim().length < 2;

  const invalidUsername = formData.username && formData.username.trim().length < 3;
  const invalidOfficialEmail = formData.officialEmail && !isValidEmail(formData.officialEmail);

  const invalidShiftTiming = formData.workMode !== 'WFH' && formData.shiftType !== 'Flexible Shift' && formData.shiftTiming && !/^\d{2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{2}:\d{2}\s*(?:AM|PM)$/i.test(formData.shiftTiming.trim());

  const invalidPanVal = formData.panNumber && !isValidPan(formData.panNumber);
  const invalidAadhaarVal = formData.aadhaarNumber && !isValidAadhaar(formData.aadhaarNumber);

  const missingAadhaarDoc = !uploadedDocs.aadhaar && !(formData.documents && formData.documents.some(d => d.category === 'aadhaar' || d.category === 'Aadhaar Card'));
  const missingPanDoc = !uploadedDocs.pan && !(formData.documents && formData.documents.some(d => d.category === 'pan' || d.category === 'PAN Card'));
  const missingResumeDoc = !uploadedDocs.resume && !(formData.documents && formData.documents.some(d => d.category === 'resume' || d.category === 'Resume / CV'));

  const invalidBankName = formData.bankName && !/^[a-zA-Z\s]+$/.test(formData.bankName.trim());
  const invalidBankAccountVal = formData.bankAccountNumber && !isValidBankAccount(formData.bankAccountNumber);
  const invalidIfscVal = formData.bankIfscCode && !isValidIfsc(formData.bankIfscCode);
  const invalidUpiVal = formData.bankUpiId && !isValidUpi(formData.bankUpiId);

  const handleOpenAdd = () => {
    const defaultBranch = '';

    const filteredDepts = dbDepartments && dbDepartments.length > 0
      ? dbDepartments.filter(d => d.branch?.trim().toLowerCase() === defaultBranch.trim().toLowerCase())
      : [];

    const defaultDept = filteredDepts.length > 0 
      ? filteredDepts[0].name 
      : (dbDepartments && dbDepartments.length > 0 ? dbDepartments[0].name : '');

    setFormData({
      name: '', email: '', phone: '', dob: '', gender: 'Male',
      personalEmail: '', alternatePhone: '',
      currentAddress: '', permanentAddress: '',
      city: '', state: '', country: 'India', zipCode: '',
      bloodGroup: '', maritalStatus: '',
      emergencyContactName: '', emergencyContactPhone: '', emergencyContactPhoneAlt: '', emergencyContactAddress: '', emergencyContactRelation: '',
      username: '', password: '', confirmPassword: '', officialEmail: '',
      department: '', branch: '', team: '', teamName: '',
      designation: '', role: 'Employee', roleId: 'employee',
      joinDate: new Date().toISOString().split('T')[0],
      id: '', avatar: '',
      shiftTiming: '09:30 AM - 06:00 PM',
      salaryAmount: '', salaryAllowances: '', salaryDeductions: '',
      teamLeader: '', projectManager: '',
      companyName: '',
      branchAddress: '',
      workLocation: '', workMode: 'WFO',
      experience: '',
      permissions: {
        dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        employees: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        attendance: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        leaves: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        projects: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        payroll: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
        tasks: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        reports: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        settings: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
        tickets: { view: true, create: true, edit: false, delete: false, approve: false, export: false },
        announcements: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
        documents: { view: true, create: true, edit: true, delete: false, approve: false, export: true }
      },
      shiftType: 'Morning Shift',
      weeklyOffDays: ['Sunday'],
      attendanceRule: 'Standard 9-6',
      punchInTime: '09:00 AM',
      punchOutTime: '06:00 PM',
      overtimeEligibility: false,
      salaryType: 'Monthly Fixed',
      monthlySalary: '',
      panNumber: '',
      aadhaarNumber: '',
      taxDetails: '',
      multiDeviceLogin: false,
      ipRestriction: '',
      twoFactorAuth: false,
      loginActivityTracking: 'Enabled',
      sessionTimeout: '30 minutes',
      employeeType: 'Full Time',
      probationEndDate: '',
      contractEndDate: ''
    });
    setUploadedDocs({
      aadhaar: null, pan: null, resume: null,
      certificates: null, offerLetter: null, profilePhoto: null,
      experienceLetter: null, addressProof: null, passportPhoto: null, signedAgreements: null
    });
    setWizardStep(1); setFormMode('add'); setShowFormPanel(true);
  };

  const handleOpenEdit = (emp) => {
    const generatedUsername = emp.username || (emp.name ? `${emp.name.split(' ')[0].toLowerCase()}.${emp.name.split(' ')[1]?.toLowerCase() || 'emp'}` : 'emp');
    const generatedOfficialEmail = emp.officialEmail || emp.workEmail || emp.email || `${emp.name?.split(' ')[0]?.toLowerCase() || 'employee'}@saas.io`;

    // Use actual branch and department for all roles
    const cleanDept = emp.department || '';
    const cleanBranch = emp.branch || emp.branchAgency || emp.workLocation || '';

    setFormData({
      ...emp,
      currentAddress: addressToString(emp.currentAddress),
      permanentAddress: addressToString(emp.permanentAddress),
      username: generatedUsername,
      officialEmail: generatedOfficialEmail,
      password: '••••••••',
      confirmPassword: '••••••••',
      experience: emp.experience || '',
      employeeType: emp.employeeType || 'Full Time',
      probationEndDate: emp.probationEndDate || '',
      contractEndDate: emp.contractEndDate || '',
      department: cleanDept,
      branch: cleanBranch
    });

    const docs = {
      aadhaar: null, pan: null, resume: null,
      certificates: null, offerLetter: null, profilePhoto: null,
      experienceLetter: null, addressProof: null, passportPhoto: null, signedAgreements: null
    };

    if (emp.documents && Array.isArray(emp.documents)) {
      emp.documents.forEach(doc => {
        if (doc.category) {
          const key = doc.category.toLowerCase().replace(' card', '').replace(' / cv', '').replace(' photo', 'Photo').replace(' letter', 'Letter').replace(' proof', 'Proof').replace(' agreements', 'Agreements');
          if (key in docs) {
            const sizeBytes = doc.downloadUrl ? Math.round(doc.downloadUrl.length * 0.75) : 10000;
            docs[key] = {
              name: doc.fileName || `${doc.category}.bin`,
              size: sizeBytes,
              type: doc.fileType || 'application/octet-stream',
              downloadUrl: doc.downloadUrl,
              uploadDate: doc.uploadDate,
              isExisting: true
            };
          }
        }
      });
    }

    if (emp.avatar) {
      const sizeBytes = emp.avatar.startsWith('data:') ? Math.round(emp.avatar.length * 0.75) : 15000;
      docs.profilePhoto = {
        name: emp.avatar.startsWith('data:') ? 'Profile_Photo.jpg' : (emp.avatar.split('/').pop() || 'Profile_Photo.jpg'),
        size: sizeBytes,
        type: 'image/jpeg',
        downloadUrl: emp.avatar,
        isExisting: true
      };
    }

    setUploadedDocs(docs);

    setWizardStep(1); setFormMode('edit'); setSelectedEmployeeId(emp.id); setShowFormPanel(true);
  };

  const handleOpenView = (emp) => {
    const generatedUsername = emp.username || (emp.name ? `${emp.name.split(' ')[0].toLowerCase()}.${emp.name.split(' ')[1]?.toLowerCase() || 'emp'}` : 'emp');
    const generatedOfficialEmail = emp.officialEmail || emp.workEmail || emp.email || `${emp.name?.split(' ')[0]?.toLowerCase() || 'employee'}@saas.io`;

    const cleanDept = emp.department || '';
    const cleanBranch = emp.branch || emp.branchAgency || emp.workLocation || '';

    setFormData({
      ...emp,
      currentAddress: addressToString(emp.currentAddress),
      permanentAddress: addressToString(emp.permanentAddress),
      username: generatedUsername,
      officialEmail: generatedOfficialEmail,
      password: '••••••••',
      confirmPassword: '••••••••',
      experience: emp.experience || '',
      employeeType: emp.employeeType || 'Full Time',
      probationEndDate: emp.probationEndDate || '',
      contractEndDate: emp.contractEndDate || '',
      department: cleanDept,
      branch: cleanBranch
    });

    const docs = {
      aadhaar: null, pan: null, resume: null,
      certificates: null, offerLetter: null, profilePhoto: null,
      experienceLetter: null, addressProof: null, passportPhoto: null, signedAgreements: null
    };

    if (emp.documents && Array.isArray(emp.documents)) {
      emp.documents.forEach(doc => {
        if (doc.category) {
          const key = doc.category.toLowerCase().replace(' card', '').replace(' / cv', '').replace(' photo', 'Photo').replace(' letter', 'Letter').replace(' proof', 'Proof').replace(' agreements', 'Agreements');
          if (key in docs) {
            const sizeBytes = doc.downloadUrl ? Math.round(doc.downloadUrl.length * 0.75) : 10000;
            docs[key] = {
              name: doc.fileName || `${doc.category}.bin`,
              size: sizeBytes,
              type: doc.fileType || 'application/octet-stream',
              downloadUrl: doc.downloadUrl,
              uploadDate: doc.uploadDate,
              isExisting: true
            };
          }
        }
      });
    }

    if (emp.avatar) {
      const sizeBytes = emp.avatar.startsWith('data:') ? Math.round(emp.avatar.length * 0.75) : 15000;
      docs.profilePhoto = {
        name: emp.avatar.startsWith('data:') ? 'Profile_Photo.jpg' : (emp.avatar.split('/').pop() || 'Profile_Photo.jpg'),
        size: sizeBytes,
        type: 'image/jpeg',
        downloadUrl: emp.avatar,
        isExisting: true
      };
    }

    setUploadedDocs(docs);
    setSlideOverOpen(true);
  };

  // Sync department options when branch changes in "add" mode
  useEffect(() => {
    if (showFormPanel && formMode === 'add' && formData.branch) {
      const availableDepts = dbDepartments && dbDepartments.length > 0
        ? dbDepartments.filter(d => d.branch?.trim().toLowerCase() === formData.branch.trim().toLowerCase()).map(d => d.name)
        : [];
      const currentDeptValid = availableDepts.includes(formData.department);
      if (availableDepts.length > 0 && (!formData.department || !currentDeptValid)) {
        setFormData(p => ({
          ...p,
          department: availableDepts[0]
        }));
      }
    }
  }, [showFormPanel, formMode, dbBranches, dbDepartments, formData.branch]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isAdd = location.pathname === '/employees/add' || params.get('action') === 'add';
    const editId = params.get('edit');
    const stepParam = parseInt(params.get('step') || '1', 10);

    if (isAdd) {
      if (!showFormPanel || formMode !== 'add') {
        setTimeout(() => handleOpenAdd(), 0);
      }
    } else if (editId) {
      if (!showFormPanel || formMode !== 'edit' || selectedEmployeeId !== editId) {
        fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${editId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(result => {
            if (result.status === 'success' && result.data) {
              const fullEmp = normalizeEmployee(result.data);
              handleOpenEdit(fullEmp);
              if (stepParam && stepParam >= 1 && stepParam <= 7) {
                setWizardStep(stepParam);
              }
            } else {
              const emp = employees.find(e => e.id === editId);
              if (emp) {
                handleOpenEdit(emp);
                if (stepParam && stepParam >= 1 && stepParam <= 7) {
                  setWizardStep(stepParam);
                }
              }
            }
          })
          .catch(err => {
            console.error('Failed to fetch full employee data for editing:', err);
            const emp = employees.find(e => e.id === editId);
            if (emp) {
              handleOpenEdit(emp);
              if (stepParam && stepParam >= 1 && stepParam <= 7) {
                setWizardStep(stepParam);
              }
            }
          });
      }
    } else {
      if (showFormPanel) {
        setTimeout(() => setShowFormPanel(false), 0);
      }
    }
  }, [location.pathname, location.search, employees, showFormPanel, formMode, selectedEmployeeId, token]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(colVis));
  }, [colVis]);

  useEffect(() => {
    const handler = (e) => {
      if (togglePanelRef.current && !togglePanelRef.current.contains(e.target)) {
        setShowTogglePanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchLeaves();
    if (typeof fetchDepartments === 'function') {
      fetchDepartments();
    }

    const interval = setInterval(() => {
      fetchEmployees();
      fetchAttendance();
      fetchLeaves();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filteredEmployees = employees.filter(e => {
    if (e.accountStatus === 'Inactive' || e.status === 'Inactive') return false;
    const ms = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.toLowerCase().includes(searchTerm.toLowerCase());
    const md = deptFilter ? e.department === deptFilter : true;
    const mb = (() => {
      if (!branchFilter) return true;
      if (!e.branch) return false;
      const normEmpBranch = e.branch.toLowerCase().replace(/branch|office|agency/gi, '').trim();
      const normFilterBranch = branchFilter.toLowerCase().replace(/branch|office|agency/gi, '').trim();
      return normEmpBranch.includes(normFilterBranch) || normFilterBranch.includes(normEmpBranch);
    })();
    const mst = statusFilter ? e.status === statusFilter : true;
    
    const resolvedAttStatus = getTodayStatus(e);
    const ma = attFilter ? (
      attFilter === 'WFH' || attFilter === 'Work From Home' ? (resolvedAttStatus === 'Work From Home' || resolvedAttStatus === 'WFH') :
        attFilter === 'On Leave' || attFilter === 'Leave' ? (resolvedAttStatus === 'On Leave' || resolvedAttStatus === 'Leave') :
          resolvedAttStatus === attFilter
    ) : true;
    
    const msh = shiftFilter ? (e.shift && e.shift.toLowerCase().includes(shiftFilter.toLowerCase())) : true;
    
    const att = getTodayAttendance(e.id);
    const resolvedPunchStatus = att && att.punchIn && att.punchIn !== '--:--' ? 'Punched In' : 'Not Punched';
    const mp = punchFilter ? resolvedPunchStatus === punchFilter : true;
    
    return ms && md && mb && mst && ma && msh && mp;
  }).sort((a, b) => {
    let av = a[sortKey] || '', bv = b[sortKey] || '';
    if (sortKey === 'joinDate') { av = new Date(av); bv = new Date(bv); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const allSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedIds.has(e.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(filteredEmployees.map(e => e.id)));
  };
  const toggleRow = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectedEmployees = employees.filter(e => selectedIds.has(e.id));

  const openPreview = (e, emp) => {
    e.stopPropagation();
    const cardW = 320;
    const cardH = 420;
    const left = Math.max(10, (window.innerWidth - cardW) / 2);
    const top = Math.max(10, (window.innerHeight - cardH) / 2 + window.scrollY);
    setPreviewPos({ top, left });
    setPreviewEmp(emp);
  };

  const handleNameMouseEnter = (e, emp) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({
      top: rect.top + window.scrollY - 150,
      left: rect.left + window.scrollX + 50
    });
    setHoveredEmp(emp);
  };

  const handleNameMouseLeave = () => {
    setHoveredEmp(null);
  };

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
    const finalDept = transferDept || depts[0] || '';
    selectedIds.forEach(id => updateEmployee(id, { department: finalDept }));
    setShowTransferModal(false);
    setSelectedIds(new Set());
    addToast('success', `${selectedIds.size} employee(s) transferred to ${finalDept}.`);
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

  const handleBulkMarkPresent = () => {
    selectedIds.forEach(id => {
      updateEmployee(id, {
        attendanceStatus: 'Present',
        todayPunchIn: '09:02 AM',
        todayPunchOut: '06:15 PM',
        todayWorkingHours: 8.2,
        todayPunchStatus: 'Punched In',
        lastSeen: 'Just now'
      });
    });
    setSelectedIds(new Set());
    addToast('success', `Marked ${selectedIds.size} employee(s) Present.`);
  };

  const handleBulkMarkAbsent = () => {
    selectedIds.forEach(id => {
      updateEmployee(id, {
        attendanceStatus: 'Absent',
        todayPunchIn: null,
        todayPunchOut: null,
        todayWorkingHours: 0,
        todayPunchStatus: 'Not Punched',
        lastSeen: 'Yesterday 06:15 PM'
      });
    });
    setSelectedIds(new Set());
    addToast('warning', `Marked ${selectedIds.size} employee(s) Absent.`);
  };

  const handleBulkAssignShift = () => {
    selectedIds.forEach(id => {
      updateEmployee(id, { shift: bulkShift });
    });
    setShowShiftModal(false);
    setSelectedIds(new Set());
    addToast('success', `Assigned shift "${bulkShift}" to ${selectedIds.size} employee(s).`);
  };

  const handleBulkExportAttendance = () => {
    addToast('info', 'Exporting attendance logs...');
    setTimeout(() => {
      const headers = ['ID', 'Name', 'Today Status', 'Today Punch In', 'Today Punch Out', 'Working Hours', 'Last Seen'];
      const rows = selectedEmployees.map(e => {
        const att = getTodayAttendance(e.id);
        const resolvedStatus = getTodayStatus(e);
        const hasPunchedIn = att && att.punchIn && att.punchIn !== '--:--';
        
        const punchIn = hasPunchedIn ? att.punchIn : '-';
        const punchOut = (hasPunchedIn && att.punchOut && att.punchOut !== '--:--') ? att.punchOut : '-';
        const workingHours = hasPunchedIn ? ((att.totalHours !== undefined && att.totalHours !== null) ? `${att.totalHours} hrs` : '0 hrs') : '-';
        
        return [
          e.id, e.name, resolvedStatus, punchIn, punchOut, workingHours, e.lastSeen || '—'
        ];
      });
      const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'attendance_export.csv'; a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Attendance export download ready!');
    }, 800);
  };

  const isStepValid = (step = wizardStep) => {
    if (step === 1) {
      return !!(
        formData.name && formData.name.trim().length >= 2 &&
        formData.email && isValidEmail(formData.email) &&
        formData.phone && isValidPhone(formData.phone) &&
        isValidAlternatePhone(formData.alternatePhone) &&
        isValidPersonalEmail(formData.personalEmail) &&
        isOldEnough(formData.dob) &&
        isValidZipCode(formData.zipCode) &&
        isValidAlternatePhone(formData.emergencyContactPhone) &&
        isValidAlternatePhone(formData.emergencyContactPhoneAlt)
      );
    }
    if (step === 2) {
      const isIdDuplicate = formMode === 'add' && formData.id && employees.some(e => e.id.trim().toLowerCase() === formData.id.trim().toLowerCase());
      const validBankName = !formData.bankName || /^[a-zA-Z\s]+$/.test(formData.bankName.trim());
      const validBankAccount = !formData.bankAccountNumber || isValidBankAccount(formData.bankAccountNumber);
      const validIfsc = !formData.bankIfscCode || isValidIfsc(formData.bankIfscCode);
      const validUpi = !formData.bankUpiId || isValidUpi(formData.bankUpiId);

      return !!(
        (formData.roleId === 'manager' || (formData.designation && formData.designation.trim().length >= 2)) &&
        (formData.roleId === 'manager' || formData.department) &&
        (formData.roleId === 'manager' || formData.branch) &&
        formData.joinDate &&
        !isIdDuplicate &&
        validBankName &&
        validBankAccount &&
        validIfsc &&
        validUpi
      );
    }
    if (step === 3) {
      const hasUsername = formData.username && formData.username.trim().length >= 3;
      const isUsernameDuplicate = formData.username && employees.some(e => e.username && e.username.trim().toLowerCase() === formData.username.trim().toLowerCase() && e.id !== selectedEmployeeId);
      if (isUsernameDuplicate) return false;
      const validOfficialEmail = isValidPersonalEmail(formData.officialEmail);
      if (!validOfficialEmail) return false;

      if (formMode === 'add') {
        return !!(hasUsername && formData.password && formData.password.length >= 8 && formData.password.length <= 12 && formData.password === formData.confirmPassword);
      }
      const isPasswordChanged = formData.password && formData.password !== '••••••••';
      if (isPasswordChanged) {
        return !!(hasUsername && formData.password.length >= 8 && formData.password.length <= 12 && formData.password === formData.confirmPassword);
      }
      return hasUsername;
    }
    if (step === 4) {
      const isWfh = formData.workMode === 'WFH';
      if (isWfh || formData.shiftType === 'Flexible Shift') return true;
      return !!(formData.shiftTiming && /^\d{2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{2}:\d{2}\s*(?:AM|PM)$/i.test(formData.shiftTiming.trim()));
    }
    if (step === 6) {
      const hasAadhaarDoc = uploadedDocs.aadhaar || (formData.documents && formData.documents.some(d => d.category === 'aadhaar' || d.category === 'Aadhaar Card'));
      const hasPanDoc = uploadedDocs.pan || (formData.documents && formData.documents.some(d => d.category === 'pan' || d.category === 'PAN Card'));
      const hasResumeDoc = uploadedDocs.resume || (formData.documents && formData.documents.some(d => d.category === 'resume' || d.category === 'Resume / CV'));

      return !!(
        isValidPan(formData.panNumber) &&
        isValidAadhaar(formData.aadhaarNumber) &&
        hasAadhaarDoc &&
        hasPanDoc &&
        hasResumeDoc
      );
    }
    return true;
  };

  const handleNextStep = () => {
    if (isStepValid()) {
      if (wizardStep < 7) setWizardStep(p => p + 1);
    } else {
      addToast('warning', `Please complete all required fields in Step ${wizardStep}`);
    }
  };

  const handlePrevStep = () => setWizardStep(p => Math.max(p - 1, 1));

  const handleWorkModeChange = (mode) => {
    setFormData(p => {
      if (mode === 'WFH') {
        return {
          ...p,
          workMode: mode,
          shiftType: 'Flexible Shift',
          shiftTiming: 'Flexible',
          attendanceRule: 'Flexible Hours',
          punchInTime: 'Not Applicable',
          punchOutTime: 'Not Applicable',
          overtimeEligibility: false
        };
      } else {
        return {
          ...p,
          workMode: mode,
          shiftType: p.shiftType === 'Flexible Shift' ? 'Morning Shift' : p.shiftType,
          shiftTiming: p.shiftTiming === 'Flexible' ? '09:30 AM - 06:00 PM' : p.shiftTiming,
          attendanceRule: p.attendanceRule === 'Flexible Hours' ? 'Standard 9-6' : p.attendanceRule,
          punchInTime: p.punchInTime === 'Not Applicable' ? '09:00 AM' : p.punchInTime,
          punchOutTime: p.punchOutTime === 'Not Applicable' ? '06:00 PM' : p.punchOutTime
        };
      }
    });
  };

  const handleTeamChange = (teamName) => {
    const selectedTeam = teams && teams.find(t => t.name === teamName);
    setFormData(p => {
      const updated = {
        ...p,
        teamName: teamName,
        team: teamName
      };
      if (selectedTeam) {
        if (selectedTeam.department) updated.department = selectedTeam.department;
        if (selectedTeam.leader) updated.teamLeader = selectedTeam.leader;
        if (selectedTeam.branch) updated.branch = selectedTeam.branch;
      }
      return updated;
    });
  };

  const handleFormSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const matchingRole = roles.find(r => r.id === formData.roleId) || {
        id: formData.roleId || 'employee',
        name: formData.roleId === 'manager' ? 'Manager' : (formData.roleId === 'team_leader' ? 'Team Leader' : (formData.roleId === 'branch_admin' ? 'Branch Admin' : 'Employee'))
      };
      
      // Convert documents to base64
      const docsToSave = [];
      let avatarBase64 = '';
      const profilePhoto = uploadedDocs.profilePhoto;
      
      if (profilePhoto) {
        if (profilePhoto.isExisting) {
          avatarBase64 = profilePhoto.downloadUrl;
        } else if (profilePhoto instanceof File || profilePhoto instanceof Blob || (profilePhoto && typeof profilePhoto === 'object' && profilePhoto.name)) {
          try {
            avatarBase64 = await fileToBase64(profilePhoto);
          } catch (err) {
            console.error('Error converting profile photo:', err);
          }
        }
      }

      for (const [key, file] of Object.entries(uploadedDocs)) {
        if (!file || key === 'profilePhoto') continue;
        
        if (file.isExisting) {
          docsToSave.push({
            category: key,
            fileName: file.name,
            uploadDate: file.uploadDate || new Date().toISOString().split('T')[0],
            fileType: file.type,
            downloadUrl: file.downloadUrl
          });
        } else if (file instanceof File || file instanceof Blob || (file && typeof file === 'object' && file.name)) {
          try {
            const base64 = await fileToBase64(file);
            docsToSave.push({
              category: key,
              fileName: file.name,
              uploadDate: new Date().toISOString().split('T')[0],
              fileType: file.type,
              downloadUrl: base64
            });
          } catch (err) {
            console.error(`Error converting document ${key}:`, err);
          }
        }
      }

      const isManager = matchingRole.id === 'manager';
      const finalData = {
        ...formData,
        name: formData.name,
        designation: isManager ? 'Manager' : formData.designation,
        roleId: matchingRole.id,
        role: matchingRole.name,
        branch: formData.branch,
        department: formData.department,
        avatar: avatarBase64,
        documents: docsToSave,
        currentAddress: addressToString(formData.currentAddress),
        permanentAddress: addressToString(formData.permanentAddress)
      };

      if (formMode === 'add') {
        const finalEmail = finalData.officialEmail || `${formData.name.toLowerCase().split(' ').join('.')}@saas.io`;
        // id is omitted — backend generates the company-scoped ID
        const submittedData = { ...finalData, workEmail: finalEmail };
        delete submittedData.id; // ensure no stale frontend id is sent

        // Optimistically set placeholder; update with real id after API responds
        setCreatedEmpInfo({
          ...submittedData,
          id: 'Generating...',
          workEmail: finalEmail,
          password: formData.password || 'temp@123'
        });

        // addEmployee returns the savedEmp from the API (with backend-assigned id)
        const savedEmp = await addEmployee(submittedData);
        if (savedEmp) {
          setCreatedEmpInfo(prev => ({ ...prev, id: savedEmp.id }));
        }
      } else {
        const success = await updateEmployee(selectedEmployeeId, finalData);
        if (!success) {
          setIsSubmitting(false);
          return;
        }
        addToast('success', `Employee ${formData.name} updated successfully!`);
      }
      setShowFormPanel(false);
      setSlideOverOpen(false);
      navigate('/employees');
    } catch (err) {
      console.error('Error submitting employee form:', err);
      addToast('error', 'Failed to save employee details.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleResetForm = () => {
    handleOpenAdd();
    addToast('info', 'Form has been reset.');
  };

  const handleGenerateEmployeeId = () => {
    const year = formData.joinDate ? new Date(formData.joinDate).getFullYear() : new Date().getFullYear();
    const integerNum = 100 + employees.length;
    const newId = `EMP-${year}-${integerNum}`;
    setFormData(prev => ({ ...prev, id: newId }));
    addToast('success', `Generated ID: ${newId}`);
  };

  const handleDeactivate = async (id, name) => {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    setDeactivatingEmployee(emp);
    setDeactivateStep(1);
    setExitFormData({
      lastWorkingDay: new Date().toISOString().split('T')[0],
      exitDate: new Date().toISOString().split('T')[0],
      exitReason: 'Resignation',
      exitNotes: ''
    });
    setOpenWork(null);
    setReassignTarget('');
    setCheckingOpenWork(true);
    try {
      const stats = await fetchOpenWork(id);
      setOpenWork(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingOpenWork(false);
    }
  };

  const submitDeactivation = async () => {
    if (!deactivatingEmployee) return;

    setReassignSubmit(true);
    try {
      const payload = {
        lastWorkingDay: exitFormData.lastWorkingDay,
        exitDate: exitFormData.exitDate,
        exitReason: exitFormData.exitReason,
        exitNotes: exitFormData.exitNotes
      };

      const hasWork = (openWork?.pendingTasks?.length > 0) || (openWork?.activeProjects?.length > 0);
      if (hasWork) {
        if (!reassignTarget) {
          addToast('warning', 'Please select an active employee to reassign pending tasks and projects to.');
          setReassignSubmit(false);
          return;
        }
        payload.taskReassignments = { allTo: reassignTarget };
        payload.projectReassignments = { allTo: reassignTarget };
      }

      const success = await deactivateEmployee(deactivatingEmployee.id, payload);
      if (success) {
        setDeactivatingEmployee(null);
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to deactivate employee.');
    } finally {
      setReassignSubmit(false);
    }
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
      console.error(err);
      addToast('error', 'Failed to download ID card.');
    }
  };

  const handleClearFilters = () => { setSearchTerm(''); setDeptFilter(''); setBranchFilter(''); setStatusFilter(''); setAttFilter(''); setShiftFilter(''); setPunchFilter(''); };

  const handleExportSubmit = (e) => {
    e.preventDefault();
    const { reportType, employeeId, dateRange, format } = exportOptions;

    let targets = [];
    if (reportType === 'Specific Employee') {
      targets = employees.filter(emp => emp.id === employeeId);
      if (targets.length === 0) {
        addToast('error', 'Selected employee not found.');
        return;
      }
    } else {
      targets = [...filteredEmployees];
      if (targets.length === 0) {
        addToast('error', 'No active employees to export.');
        return;
      }
    }

    const filename = `Employee_Details_Report_${new Date().toISOString().split('T')[0]}`;

    const isWithinDateScope = (dateStr) => {
      if (dateRange === 'AllTime' || !dateStr) return true;
      const date = new Date(dateStr);
      const now = new Date();
      now.setHours(0,0,0,0);
      const diffTime = now - date;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (dateRange === 'Today') return diffDays <= 1;
      if (dateRange === 'Weekly') return diffDays <= 7;
      if (dateRange === 'Monthly') return diffDays <= 30;
      if (dateRange === 'Yearly') return diffDays <= 365;
      return true;
    };

    if (format === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        addToast('error', 'Popup blocked. Please allow popups to export PDF.');
        return;
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #1e293b;
                margin: 30px;
                background-color: #ffffff;
              }
              h2 {
                color: #0f172a;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 12px;
                margin-bottom: 15px;
                font-size: 1.6rem;
              }
              .meta-info {
                font-size: 0.85rem;
                color: #64748b;
                margin-bottom: 25px;
                line-height: 1.5;
              }
              .emp-card {
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 25px;
                page-break-inside: avoid;
              }
              .emp-card-header {
                font-size: 1.1rem;
                font-weight: bold;
                border-bottom: 1px dashed #e2e8f0;
                padding-bottom: 8px;
                margin-bottom: 12px;
                display: flex;
                justify-content: space-between;
                color: #2563eb;
              }
              .section-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
              }
              .data-sec {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 10px;
              }
              .data-sec-title {
                font-size: 0.8rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #475569;
                font-weight: 700;
                margin-bottom: 8px;
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 4px;
              }
              .grid-fields {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
                font-size: 0.8rem;
              }
              .field-label {
                color: #64748b;
                font-weight: 500;
              }
              .field-val {
                color: #0f172a;
                font-weight: 600;
                text-align: right;
              }
            </style>
          </head>
          <body>
            <h2>OMS Comprehensive Employee Performance & Details Report</h2>
            <div class="meta-info">
              <strong>Generated At:</strong> ${new Date().toLocaleString()}<br/>
              <strong>Date Scope for Logs:</strong> ${dateRange}<br/>
              <strong>Export Count:</strong> ${targets.length} Employee(s)
            </div>

            ${targets.map(emp => {
              const empId = emp.id;
              const name = emp.name;
              const designation = emp.designation || emp.role || '—';
              const department = emp.department || '—';
              const branch = emp.branch || '—';
              const team = emp.team || '—';
              const email = emp.email || emp.workEmail || '—';
              const phone = emp.phone || '—';
              const joinDate = emp.joinDate || '—';
              const status = emp.status || 'Active';
              const salary = emp.monthlySalary || emp.salaryAmount || '—';

              // Attendance
              const empAtt = (attendance || []).filter(a => a.employeeId === empId && isWithinDateScope(a.date));
              const attDays = empAtt.length;
              const attPresent = empAtt.filter(a => ['Present', 'Overtime', 'Half Day', 'Half-Day', 'Work From Home', 'WFH'].includes(a.status)).length;
              const attLate = empAtt.filter(a => a.status === 'Late').length;
              const attAbsent = empAtt.filter(a => a.status === 'Absent' || a.status === 'Not Punched').length;
              const attLeave = empAtt.filter(a => ['On Leave', 'Leave'].includes(a.status)).length;
              const attRate = attDays > 0 ? Math.round(((attPresent + attLate) / attDays) * 100) : 100;

              // Tasks
              const empTasks = (tasks || []).filter(t => t.assignedTo === empId || t.assignedToName === name);
              const tasksTotal = empTasks.length;
              const tasksCompleted = empTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
              const tasksPending = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length;
              const tasksRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

              // Leaves
              const empLeaves = (leaveRequests || []).filter(l => l.employeeId === empId || l.employeeName === name);
              const leaveTotal = empLeaves.length;
              const leaveApproved = empLeaves.filter(l => l.status === 'Approved').length;
              const leaveRejected = empLeaves.filter(l => l.status === 'Rejected').length;
              const leavePending = empLeaves.filter(l => l.status === 'Pending').length;
              const leaveDays = empLeaves.filter(l => l.status === 'Approved').reduce((sum, l) => sum + (l.days || 0), 0);
              const leaveBalance = emp.leaveBalance || 0;

              // Reports
              const empReports = (dailyReports || []).filter(r => r.employeeId === empId || r.employeeName === name);
              const reportsTotal = empReports.length;
              const reportsAvgProd = reportsTotal > 0 ? Math.round(empReports.reduce((s, r) => s + (r.productivityScore || 0), 0) / reportsTotal) : 0;
              const latestReport = empReports.sort((a,b) => new Date(b.date) - new Date(a.date))[0]?.date || '—';

              return `
                <div class="emp-card">
                  <div class="emp-card-header">
                    <span>${name} (${empId})</span>
                    <span style="font-size: 0.85rem; color: #475569;">${designation} • ${department}</span>
                  </div>
                  <div class="section-grid">
                    <div class="data-sec">
                      <div class="data-sec-title">Profile & Employment</div>
                      <div class="grid-fields">
                        <span class="field-label">Branch</span><span class="field-val">${branch}</span>
                        <span class="field-label">Assigned Team</span><span class="field-val">${team}</span>
                        <span class="field-label">Work Email</span><span class="field-val">${email}</span>
                        <span class="field-label">Phone</span><span class="field-val">${phone}</span>
                        <span class="field-label">Join Date</span><span class="field-val">${joinDate}</span>
                        <span class="field-label">Status</span><span class="field-val">${status}</span>
                        <span class="field-label">Salary</span><span class="field-val">₹${salary}/mo</span>
                      </div>
                    </div>
                    <div class="data-sec">
                      <div class="data-sec-title">Attendance Metrics</div>
                      <div class="grid-fields">
                        <span class="field-label">Tracked Days</span><span class="field-val">${attDays}</span>
                        <span class="field-label">Present Days</span><span class="field-val">${attPresent}</span>
                        <span class="field-label">Late Days</span><span class="field-val">${attLate}</span>
                        <span class="field-label">Absent Days</span><span class="field-val">${attAbsent}</span>
                        <span class="field-label">Leave Days</span><span class="field-val">${attLeave}</span>
                        <span class="field-label">Attendance Rate</span><span class="field-val">${attRate}%</span>
                      </div>
                    </div>
                    <div class="data-sec">
                      <div class="data-sec-title">Tasks Management</div>
                      <div class="grid-fields">
                        <span class="field-label">Total Assigned</span><span class="field-val">${tasksTotal}</span>
                        <span class="field-label">Completed</span><span class="field-val">${tasksCompleted}</span>
                        <span class="field-label">Pending</span><span class="field-val">${tasksPending}</span>
                        <span class="field-label">Completion Rate</span><span class="field-val">${tasksRate}%</span>
                      </div>
                    </div>
                    <div class="data-sec">
                      <div class="data-sec-title">Leave & Daily Reports</div>
                      <div class="grid-fields">
                        <span class="field-label">Leave Balance</span><span class="field-val">${leaveBalance}</span>
                        <span class="field-label">Leave Apps</span><span class="field-val">${leaveTotal} (Appr: ${leaveApproved})</span>
                        <span class="field-label">Total Work Reports</span><span class="field-val">${reportsTotal}</span>
                        <span class="field-label">Avg. Productivity</span><span class="field-val">${reportsAvgProd}%</span>
                        <span class="field-label">Latest Report</span><span class="field-val">${latestReport}</span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}

            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      setIsExportOpen(false);
      addToast('success', 'PDF compiled successfully. Opening print dialog...');
      return;
    }

    const headers = [
      ['EMPLOYEE COMPREHENSIVE SECTIONAL DETAILS REPORT'],
      ['Report Type', reportType.toUpperCase()],
      ['Date Scope for Logs', dateRange],
      ['Generated At', new Date().toLocaleString()],
      [],
      [
        'Employee ID', 'Name', 'Designation', 'Department', 'Branch', 'Team', 'Work Email', 'Phone', 'Join Date', 'Gender', 'Status', 'Monthly Salary',
        'Att. Tracked Days', 'Att. Present Days', 'Att. Late Days', 'Att. Absent Days', 'Att. Leave Days', 'Attendance Rate (%)',
        'Total Assigned Tasks', 'Completed Tasks', 'Pending Tasks', 'Task Completion Rate (%)',
        'Leave Balance', 'Total Leave Apps', 'Approved Leaves', 'Rejected Leaves', 'Pending Leaves', 'Approved Leave Days',
        'Total Work Reports', 'Avg Productivity Score (%)', 'Latest Report Date'
      ]
    ];

    targets.forEach(emp => {
      const empId = emp.id;
      const name = emp.name;
      const designation = emp.designation || emp.role || '—';
      const department = emp.department || '—';
      const branch = emp.branch || '—';
      const team = emp.team || '—';
      const email = emp.email || emp.workEmail || '—';
      const phone = emp.phone || '—';
      const joinDate = emp.joinDate || '—';
      const gender = emp.gender || '—';
      const status = emp.status || 'Active';
      const salary = emp.monthlySalary || emp.salaryAmount || '—';

      // Attendance
      const empAtt = (attendance || []).filter(a => a.employeeId === empId && isWithinDateScope(a.date));
      const attDays = empAtt.length;
      const attPresent = empAtt.filter(a => ['Present', 'Overtime', 'Half Day', 'Half-Day', 'Work From Home', 'WFH'].includes(a.status)).length;
      const attLate = empAtt.filter(a => a.status === 'Late').length;
      const attAbsent = empAtt.filter(a => a.status === 'Absent' || a.status === 'Not Punched').length;
      const attLeave = empAtt.filter(a => ['On Leave', 'Leave'].includes(a.status)).length;
      const attRate = attDays > 0 ? Math.round(((attPresent + attLate) / attDays) * 100) : 100;

      // Tasks
      const empTasks = (tasks || []).filter(t => t.assignedTo === empId || t.assignedToName === name);
      const tasksTotal = empTasks.length;
      const tasksCompleted = empTasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
      const tasksPending = empTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done').length;
      const tasksRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

      // Leaves
      const empLeaves = (leaveRequests || []).filter(l => l.employeeId === empId || l.employeeName === name);
      const leaveTotal = empLeaves.length;
      const leaveApproved = empLeaves.filter(l => l.status === 'Approved').length;
      const leaveRejected = empLeaves.filter(l => l.status === 'Rejected').length;
      const leavePending = empLeaves.filter(l => l.status === 'Pending').length;
      const leaveDays = empLeaves.filter(l => l.status === 'Approved').reduce((sum, l) => sum + (l.days || 0), 0);
      const leaveBalance = emp.leaveBalance || 0;

      // Reports
      const empReports = (dailyReports || []).filter(r => r.employeeId === empId || r.employeeName === name);
      const reportsTotal = empReports.length;
      const reportsAvgProd = reportsTotal > 0 ? Math.round(empReports.reduce((s, r) => s + (r.productivityScore || 0), 0) / reportsTotal) : 0;
      const latestReport = empReports.sort((a,b) => new Date(b.date) - new Date(a.date))[0]?.date || '—';

      headers.push([
        empId, name, designation, department, branch, team, email, phone, joinDate, gender, status, salary,
        attDays, attPresent, attLate, attAbsent, attLeave, attRate,
        tasksTotal, tasksCompleted, tasksPending, tasksRate,
        leaveBalance, leaveTotal, leaveApproved, leaveRejected, leavePending, leaveDays,
        reportsTotal, reportsAvgProd, latestReport
      ]);
    });

    const fileContent = "\ufeff" + headers.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const mimeType = format === 'Excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
    const fileExtension = format === 'Excel' ? 'xls' : 'csv';

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.${fileExtension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('success', `${format} report exported successfully!`);
    setIsExportOpen(false);
  };

  const totalEmp = filteredEmployees.length;
  const presentCount = filteredEmployees.filter(e => {
    const status = getTodayStatus(e);
    return ['Present', 'Overtime', 'Half Day', 'Half-Day', 'Work From Home', 'WFH'].includes(status);
  }).length;
  const absentCount = filteredEmployees.filter(e => {
    const status = getTodayStatus(e);
    return status === 'Absent' || status === 'Not Punched';
  }).length;
  const lateCount = filteredEmployees.filter(e => getTodayStatus(e) === 'Late').length;
  const leaveCount = filteredEmployees.filter(e => {
    const status = getTodayStatus(e);
    return ['On Leave', 'Leave'].includes(status);
  }).length;
  const topPerformers = filteredEmployees.filter(e => (e.productivityScore || e.performanceScore?.overall || 0) >= 85).length;
  const needsAttention = filteredEmployees.filter(e => {
    const score = e.productivityScore || e.performanceScore?.overall || 0;
    return score > 0 && score < 60;
  }).length;
  const avgTaskCompletion = (() => {
    const withData = filteredEmployees.filter(e => (e.performanceScore?.taskCompletion || 0) > 0 || (e.productivityScore || 0) > 0);
    if (withData.length === 0) return 0;
    return Math.round(withData.reduce((s, e) => s + (e.performanceScore?.taskCompletion || e.productivityScore || 0), 0) / withData.length);
  })();
  const avgRating = (() => {
    const withData = filteredEmployees.filter(e => (e.productivityScore || e.performanceScore?.overall || 0) > 0);
    if (withData.length === 0) return 0;
    return Math.round(withData.reduce((s, e) => s + (e.productivityScore || e.performanceScore?.overall || 0), 0) / withData.length);
  })();

  const ratingToScore = (rating) => {
    switch(rating?.toLowerCase()) {
      case 'outstanding': return 95;
      case 'excellent': return 85;
      case 'good': return 75;
      case 'average': return 65;
      case 'satisfactory': return 70;
      case 'needs improvement': return 55;
      default: return 75;
    }
  };

  const isDummyText = (text) => {
    if (!text) return true;
    const cleaned = text.trim();
    if (cleaned === '—' || cleaned === '') return true;
    if (cleaned.length < 15 && !cleaned.includes(' ') && (/^[a-z]+$/i.test(cleaned) || !/[aeiouy]/i.test(cleaned))) {
      return true;
    }
    return false;
  };

  const filteredEmpIds = useMemo(() => new Set(filteredEmployees.map(e => e.id)), [filteredEmployees]);
  const filteredAppraisals = useMemo(() => (appraisalReviews || []).filter(r => filteredEmpIds.has(r.employeeId)), [appraisalReviews, filteredEmpIds]);

  const monthlyReviews = useMemo(() => (filteredAppraisals || []).filter(r => r.type?.toLowerCase() === 'monthly'), [filteredAppraisals]);
  const quarterlyReviews = useMemo(() => (filteredAppraisals || []).filter(r => r.type?.toLowerCase() === 'quarterly'), [filteredAppraisals]);
  const annualReviews = useMemo(() => (filteredAppraisals || []).filter(r => r.type?.toLowerCase() === 'annual'), [filteredAppraisals]);

  const avgMonthlyScore = useMemo(() => monthlyReviews.length > 0
    ? Math.round(monthlyReviews.reduce((sum, r) => sum + ratingToScore(r.rating), 0) / monthlyReviews.length)
    : 0, [monthlyReviews]);

  const avgQuarterlyScore = useMemo(() => quarterlyReviews.length > 0
    ? Math.round(quarterlyReviews.reduce((sum, r) => sum + ratingToScore(r.rating), 0) / quarterlyReviews.length)
    : 0, [quarterlyReviews]);

  const avgAnnualScore = useMemo(() => annualReviews.length > 0
    ? Math.round(annualReviews.reduce((sum, r) => sum + ratingToScore(r.rating), 0) / annualReviews.length)
    : 0, [annualReviews]);

  const globalRatingLabel = useMemo(() => {
    const allReviews = filteredAppraisals || [];
    if (allReviews.length === 0) return '—';
    const avgOverallScore = Math.round(allReviews.reduce((sum, r) => sum + ratingToScore(r.rating), 0) / allReviews.length);
    if (avgOverallScore >= 90) return 'Outstanding';
    if (avgOverallScore >= 80) return 'Excellent';
    if (avgOverallScore >= 70) return 'Good';
    if (avgOverallScore >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  }, [filteredAppraisals]);

  const latestReview = useMemo(() => (filteredAppraisals && filteredAppraisals.length > 0) ? filteredAppraisals[0] : null, [filteredAppraisals]);

  const managerFeedback = useMemo(() => {
    const val = latestReview ? latestReview.notes : null;
    return isDummyText(val) ? "Excellent leadership & commitment." : val;
  }, [latestReview]);

  const peerFeedback = useMemo(() => {
    const val = latestReview ? latestReview.feedback : null;
    return isDummyText(val) ? "Great collaborator & team player." : val;
  }, [latestReview]);

  const selfFeedback = useMemo(() => {
    const val = latestReview ? latestReview.recommendations : null;
    return isDummyText(val) ? "Highly proactive and self-motivated." : val;
  }, [latestReview]);

  // Leave Management Summary Calculations
  const pendingApprovalsCount = (leaveRequests || []).filter(r => r.status === 'Pending').length;

  let approvedCount = (leaveRequests || []).filter(r => r.status === 'Approved').length;
  let rejectedCount = (leaveRequests || []).filter(r => r.status === 'Rejected').length;

  let casualUsed = 0, casualTotal = employees.length * 12;
  let sickUsed = 0, sickTotal = employees.length * 10;
  let earnedUsed = 0, earnedTotal = employees.length * 20;
  let maternityUsed = 0, maternityTotal = employees.filter(e => e.gender === 'Female').length * 180;
  let unpaidUsed = 0, unpaidTotal = employees.length * 30;

  (leaveRequests || []).forEach(l => {
    if (l.status === 'Approved') {
      const days = l.days || 0;
      const typeLower = (l.type || '').toLowerCase().trim();
      if (typeLower === 'cl' || typeLower === 'casual' || typeLower === 'casual leave') {
        casualUsed += days;
      } else if (typeLower === 'sl' || typeLower === 'sick' || typeLower === 'sick leave') {
        sickUsed += days;
      } else if (typeLower === 'pl' || typeLower === 'earned' || typeLower === 'earned leave' || typeLower === 'paid leave' || typeLower === 'annual leave') {
        earnedUsed += days;
      } else if (typeLower === 'ml' || typeLower === 'maternity' || typeLower === 'maternity leave') {
        maternityUsed += days;
      } else if (typeLower === 'ul' || typeLower === 'unpaid' || typeLower === 'unpaid leave' || typeLower === 'emergency leave') {
        unpaidUsed += days;
      }
    }
  });

  const totalBalanceDays = employees.reduce((sum, e) => sum + (e.leaveBalance || 0), 0);

  const renderTH = (col, label, sortable = false, style = undefined) => (
    <th style={style} onClick={sortable ? () => handleSort(col) : undefined}
      className={sortable ? 'sortable-th' : ''} key={col}>
      <span className="th-inner">
        {label}
        {sortable && (
          sortKey !== col ? <span className="sort-neutral">⇅</span> :
            sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        )}
      </span>
    </th>
  );

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginated = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  const [prevFilters, setPrevFilters] = useState({
    searchTerm: '', deptFilter: '', branchFilter: '', statusFilter: '',
    attFilter: '', shiftFilter: '', punchFilter: ''
  });

  if (
    searchTerm !== prevFilters.searchTerm ||
    deptFilter !== prevFilters.deptFilter ||
    branchFilter !== prevFilters.branchFilter ||
    statusFilter !== prevFilters.statusFilter ||
    attFilter !== prevFilters.attFilter ||
    shiftFilter !== prevFilters.shiftFilter ||
    punchFilter !== prevFilters.punchFilter
  ) {
    setPrevFilters({ searchTerm, deptFilter, branchFilter, statusFilter, attFilter, shiftFilter, punchFilter });
    setPage(1);
  }

  const depts = useMemo(() => {
    console.log('--- depts calculation debug ---', {
      rawDbDepartmentsLength: rawDbDepartments?.length,
      rawDbDepartments,
      employeesLength: employees?.length,
      branchFilter
    });
    const branchDepts = (rawDbDepartments || []).filter(d => {
      if (!branchFilter || branchFilter === 'All') return true;
      if (!d.branch) return false;
      const normDeptBranch = d.branch.toLowerCase().replace(/branch|office|agency/gi, '').trim();
      const normFilterBranch = branchFilter.toLowerCase().replace(/branch|office|agency/gi, '').trim();
      return normDeptBranch.includes(normFilterBranch) || normFilterBranch.includes(normDeptBranch);
    }).map(d => d.name);

    const empDepts = employees.map(e => e.department).filter(Boolean);
    const result = [...new Set([...branchDepts, ...empDepts])].sort();
    console.log('--- depts result ---', result);
    return result;
  }, [rawDbDepartments, employees, branchFilter]);
  const branches = [...new Set(employees.map(e => e.branch))].sort();
  const leaders = employees.filter(e => e.roleId === 'team_leader' || e.roleId === 'manager' || e.roleId === 'branch_admin' || e.roleId === 'super_admin');
  const managers = employees.filter(e => e.roleId === 'manager');

  const handleRemoveDocument = (key, label) => {
    setUploadedDocs(prev => ({ ...prev, [key]: null }));
    setFormData(prev => {
      const updated = { ...prev };
      if (key === 'profilePhoto') {
        updated.avatar = '';
        updated.photoUrl = '';
      }
      if (updated.documents) {
        updated.documents = updated.documents.filter(d => {
          const mappedKey = d.category.toLowerCase().replace(' card', '').replace(' / cv', '').replace(' photo', 'Photo').replace(' letter', 'Letter').replace(' proof', 'Proof').replace(' agreements', 'Agreements');
          return mappedKey !== key;
        });
      }
      return updated;
    });
    addToast('info', `${label} removed`);
  };

  const handleClearAllDocuments = () => {
    const hasFiles = Object.values(uploadedDocs).some(f => f !== null);
    if (hasFiles && window.confirm('Remove all uploaded documents?')) {
      setUploadedDocs({
        aadhaar: null, pan: null, resume: null,
        certificates: null, offerLetter: null, profilePhoto: null,
        experienceLetter: null, addressProof: null, passportPhoto: null, signedAgreements: null
      });
      setFormData(prev => ({
        ...prev,
        avatar: '',
        photoUrl: '',
        documents: []
      }));
      addToast('info', 'All documents cleared');
    }
  };
  // ── Recognition Spotlight: 100% real-data rankings ─────────────────────────

  // 1. Employee of Month: highest performanceScore.overall, tiebreak by productivityScore
  const sortedByOverallPerf = [...filteredEmployees]
    .filter(e => e.status !== 'Inactive')
    .sort((a, b) => {
      const scoreA = a.performanceScore?.overall || a.productivityScore || 0;
      const scoreB = b.performanceScore?.overall || b.productivityScore || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Tiebreak: higher productivityScore wins
      return (b.productivityScore || 0) - (a.productivityScore || 0);
    });

  // 2. Best Performer: highest performanceScore.taskCompletion, tiebreak by overall
  const sortedByTaskPerf = [...filteredEmployees]
    .filter(e => e.status !== 'Inactive')
    .sort((a, b) => {
      const tA = a.performanceScore?.taskCompletion || 0;
      const tB = b.performanceScore?.taskCompletion || 0;
      if (tB !== tA) return tB - tA;
      const oA = a.performanceScore?.overall || a.productivityScore || 0;
      const oB = b.performanceScore?.overall || b.productivityScore || 0;
      return oB - oA;
    });

  // 3. Attendance Champ: most Present/Late/WFH records THIS calendar month in the attendance log
  const nowForAtt = new Date();
  const thisYYYY = nowForAtt.getFullYear();
  const thisMM = String(nowForAtt.getMonth() + 1).padStart(2, '0');
  const thisMonthPrefix = `${thisYYYY}-${thisMM}`; // e.g. "2026-06"

  const attendanceCountMap = {};
  (attendance || []).forEach(rec => {
    if (rec.date && rec.date.startsWith(thisMonthPrefix)) {
      const s = rec.status || '';
      if (s === 'Present' || s === 'Late' || s === 'Work From Home' || s === 'WFH' || s === 'Overtime') {
        attendanceCountMap[rec.employeeId] = (attendanceCountMap[rec.employeeId] || 0) + 1;
      }
    }
  });
  const sortedByAttendance = [...filteredEmployees]
    .filter(e => e.status !== 'Inactive')
    .sort((a, b) => {
      const cntA = attendanceCountMap[a.id] || 0;
      const cntB = attendanceCountMap[b.id] || 0;
      if (cntB !== cntA) return cntB - cntA;
      // Tiebreak: attendance score from performanceScore
      return (b.performanceScore?.attendance || 0) - (a.performanceScore?.attendance || 0);
    });

  // 4. Most Productive: highest productivityScore, tiebreak by performanceScore.overall
  const sortedByProductivity = [...filteredEmployees]
    .filter(e => e.status !== 'Inactive')
    .sort((a, b) => {
      const pA = a.productivityScore || 0;
      const pB = b.productivityScore || 0;
      if (pB !== pA) return pB - pA;
      const oA = a.performanceScore?.overall || 0;
      const oB = b.performanceScore?.overall || 0;
      return oB - oA;
    });

  // Pick 4 unique winners — each must be a different person
  const empOfMonth = sortedByOverallPerf[0] || { name: '—' };
  const usedIds = new Set([empOfMonth.id].filter(Boolean));

  const bestPerformer = sortedByTaskPerf.find(e => !usedIds.has(e.id))
    || sortedByOverallPerf.find(e => !usedIds.has(e.id))
    || sortedByOverallPerf[0]
    || { name: '—' };
  if (bestPerformer.id) usedIds.add(bestPerformer.id);

  const attendanceChamp = sortedByAttendance.find(e => !usedIds.has(e.id))
    || sortedByAttendance[0]
    || { name: '—' };
  if (attendanceChamp.id) usedIds.add(attendanceChamp.id);

  const mostProductive = sortedByProductivity.find(e => !usedIds.has(e.id))
    || sortedByProductivity[0]
    || { name: '—' };

  return (
    <div className="employees-page flex-column grid-gap">

      {/* ── Page Header ── */}
      <div className="page-header-row">
        <div>
          <h2>Employee Directory</h2>
          <p className="page-desc-text">Manage employee access, profiles, branches, and roles</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={() => setIsExportOpen(true)} icon={Download}>Export Details</Button>
          {hasPermission('employee_management', 'create') && (
            <Button variant="primary" onClick={() => navigate('/employees/add')} icon={UserPlus}>Add Employee</Button>
          )}
        </div>
      </div>

      {!showFormPanel && (<>
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
                  <div className="mini-bar-track"><div className="mini-bar-fill green-fill" style={{ width: `${Math.round(presentCount / Math.max(totalEmp, 1) * 100)}%` }}></div></div>
                </div>
              </div>
              <div className="att-metric-row att-absent-row">
                <span className="att-metric-label">Absent</span>
                <div className="att-metric-right">
                  <span className="att-metric-count absent-count">{absentCount}</span>
                  <div className="mini-bar-track"><div className="mini-bar-fill red-fill" style={{ width: `${Math.round(absentCount / Math.max(totalEmp, 1) * 100)}%` }}></div></div>
                </div>
              </div>
              <div className="att-metric-row att-late-row">
                <span className="att-metric-label">Late</span>
                <div className="att-metric-right">
                  <span className="att-metric-count late-count">{lateCount}</span>
                  <div className="mini-bar-track"><div className="mini-bar-fill orange-fill" style={{ width: `${Math.round(lateCount / Math.max(totalEmp, 1) * 100)}%` }}></div></div>
                </div>
              </div>
              <div className="att-metric-row att-leave-row">
                <span className="att-metric-label">On Leave</span>
                <div className="att-metric-right">
                  <span className="att-metric-count leave-count">{leaveCount}</span>
                  <div className="mini-bar-track"><div className="mini-bar-fill purple-fill" style={{ width: `${Math.round(leaveCount / Math.max(totalEmp, 1) * 100)}%` }}></div></div>
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
              {(() => {
                const allTasks = tasks || [];
                const openTasks = allTasks.filter(t => t.status !== 'Done' && t.status !== 'Completed');
                const doneTasks = allTasks.filter(t => t.status === 'Done' || t.status === 'Completed');
                const workloadPct = allTasks.length > 0 ? Math.round((openTasks.length / allTasks.length) * 100) : 0;
                const workloadLabel = workloadPct <= 40 ? 'Optimal' : workloadPct <= 70 ? 'Moderate' : 'Heavy';
                const workloadColor = workloadPct <= 40 ? 'var(--color-success)' : workloadPct <= 70 ? 'var(--color-warning)' : 'var(--color-danger)';

                const now = new Date();
                const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const doneThisMonth = doneTasks.filter(t => t.completedAt && new Date(t.completedAt) >= thisMonthStart).length;
                const doneLastMonth = doneTasks.filter(t => t.completedAt && new Date(t.completedAt) >= lastMonthStart && new Date(t.completedAt) < thisMonthStart).length;
                const trendDelta = doneThisMonth - doneLastMonth;
                const trendLabel = trendDelta >= 0 ? `+${trendDelta}` : `${trendDelta}`;
                const trendColor = trendDelta >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

                const overdueTasks = openTasks.filter(t => t.dueDate && new Date(t.dueDate) < now).length;
                const highPriorityTasks = openTasks.filter(t => t.priority === 'High' || t.priority === 'Critical' || t.priority === 'Urgent').length;

                const avgEfficiency = employees.length > 0
                  ? Math.round(employees.reduce((s, e) => s + (e.productivityScore || e.performanceScore?.overall || 0), 0) / employees.length)
                  : 0;

                // Top department by avg productivity
                const deptGroups = {};
                employees.forEach(e => {
                  const dept = e.department;
                  if (!dept) return;
                  if (!deptGroups[dept]) deptGroups[dept] = { total: 0, count: 0 };
                  deptGroups[dept].total += e.productivityScore || e.performanceScore?.overall || 0;
                  deptGroups[dept].count += 1;
                });
                let topDeptName = '—';
                let topDeptScore = 0;
                Object.entries(deptGroups).forEach(([name, { total, count }]) => {
                  const avg = count > 0 ? Math.round(total / count) : 0;
                  if (avg > topDeptScore) { topDeptScore = avg; topDeptName = name; }
                });

                return (
                  <div style={{ marginTop: 'var(--spacing-4)', paddingTop: 'var(--spacing-3)', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div>Workload: <strong style={{ color: workloadColor }}>{workloadLabel} ({workloadPct}%)</strong></div>
                    <div>Completion Trend: <strong style={{ color: trendColor }}>{trendLabel} this month</strong></div>
                    <div>Overdue Tasks: <strong style={{ color: 'var(--color-danger)' }}>{overdueTasks} {overdueTasks === 1 ? 'Task' : 'Tasks'}</strong></div>
                    <div>High Priority: <strong style={{ color: 'var(--color-warning)' }}>{highPriorityTasks} {highPriorityTasks === 1 ? 'Task' : 'Tasks'}</strong></div>
                    <div>Efficiency: <strong style={{ color: 'var(--text-primary)' }}>{avgEfficiency}% Avg</strong></div>
                    <div>Top Dept: <strong style={{ color: 'var(--color-primary)' }}>{topDeptName}{topDeptScore > 0 ? ` (${topDeptScore}%)` : ''}</strong></div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        <div className="emp-widgets-row" style={{ marginTop: 'var(--spacing-4)' }}>
          <div className="card emp-widget-card">
            <div className="widget-header">
              <span className="widget-title">Performance Review Module</span>
              <Badge variant="primary">Q2 Period</Badge>
            </div>
            <div className="att-metric-list">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Monthly</span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{avgMonthlyScore}/100</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Quarterly</span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{avgQuarterlyScore}/100</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Annual</span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{avgAnnualScore}/100</strong>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Global Rating</span>
                  <Badge variant={globalRatingLabel === 'Outstanding' || globalRatingLabel === 'Excellent' ? 'success' : 'warning'}>{globalRatingLabel}</Badge>
                </div>
                <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>Feedback Summary</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '0.6875rem' }}>
                    <div style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={managerFeedback}><strong>Manager:</strong> "{managerFeedback}"</div>
                    <div style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={peerFeedback}><strong>Peer:</strong> "{peerFeedback}"</div>
                    <div style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={selfFeedback}><strong>Self:</strong> "{selfFeedback}"</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card emp-widget-card">
            <div className="widget-header">
              <span className="widget-title">Recognition Spotlight</span>
              <Trophy size={16} className="text-warning" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <Avatar name={empOfMonth.name} size="sm" src={empOfMonth.avatar || empOfMonth.photoUrl} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee of Month</span>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{empOfMonth.name}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <Avatar name={bestPerformer.name} size="sm" src={bestPerformer.avatar || bestPerformer.photoUrl} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Best Performer</span>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{bestPerformer.name}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <Avatar name={attendanceChamp.name} size="sm" src={attendanceChamp.avatar || attendanceChamp.photoUrl} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance Champ</span>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{attendanceChamp.name}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(168, 85, 247, 0.04)', border: '1px solid rgba(168, 85, 247, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <Avatar name={mostProductive.name} size="sm" src={mostProductive.avatar || mostProductive.photoUrl} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Most Productive</span>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{mostProductive.name}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className="card filters-card" style={{ marginBottom: 'var(--spacing-4)' }}>
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
            {isGlobalAdmin && (
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            <select value={attFilter} onChange={e => setAttFilter(e.target.value)}>
              <option value="">Attendance</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="On Leave">On Leave</option>
              <option value="Work From Home">Work From Home</option>
              <option value="Half Day">Half Day</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
            <select value={shiftFilter} onChange={e => setShiftFilter(e.target.value)}>
              <option value="">All Shifts</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
              <option value="Flexible">Flexible</option>
            </select>
            <select value={punchFilter} onChange={e => setPunchFilter(e.target.value)}>
              <option value="">Punch Status</option>
              <option value="Punched In">Punched In</option>
              <option value="Not Punched">Not Punched</option>
              <option value="Missing Punch Out">Missing Punch Out</option>
            </select>
            <Button variant="ghost" onClick={handleClearFilters}>Clear</Button>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="card table-wrapper-card">
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

          <div className="emp-table-scroll">
            <table className="emp-table">
              <thead>
                <tr>
                  {colVis.name && renderTH("name", FIELD_LABELS.name, true)}
                  {colVis.id && renderTH("id", FIELD_LABELS.id, true)}
                  {colVis.designation && renderTH("designation", FIELD_LABELS.designation, true)}
                  {colVis.department && renderTH("department", FIELD_LABELS.department, true)}
                  {colVis.branch && renderTH("branch", FIELD_LABELS.branch, true)}
                  {colVis.teamLeader && renderTH("teamLeader", FIELD_LABELS.teamLeader, true)}
                  {colVis.projectManager && renderTH("projectManager", FIELD_LABELS.projectManager, true)}
                  {colVis.phone && renderTH("phone", FIELD_LABELS.phone, true)}
                  {colVis.workEmail && renderTH("workEmail", FIELD_LABELS.officialEmail, true)}
                  {colVis.joinDate && renderTH("joinDate", FIELD_LABELS.joinDate, true, { minWidth: 140 })}
                  {colVis.employeeType && renderTH("employeeType", FIELD_LABELS.employeeType, true)}
                  {colVis.shift && renderTH("shift", FIELD_LABELS.shiftTiming, true)}
                  {colVis.experience && renderTH("experience", FIELD_LABELS.experience, true)}
                  {colVis.lastLogin && <th>Last Login</th>}
                  {colVis.currentProjects && renderTH("currentProjects", "Projects", true)}
                  {colVis.leaveBalance && renderTH("leaveBalance", "Leave Bal", true)}
                  {colVis.productivityScore && renderTH("productivityScore", "Productivity", true)}
                  {colVis.performanceRating && renderTH("performanceRating", "Rating", true)}
                  {colVis.todayPunchIn && renderTH("todayPunchIn", FIELD_LABELS.punchInTime, true)}
                  {colVis.todayPunchOut && renderTH("todayPunchOut", FIELD_LABELS.punchOutTime, true)}
                  {colVis.todayWorkingHours && renderTH("todayWorkingHours", FIELD_LABELS.workingHours, true)}
                  {colVis.attendanceStatus && renderTH("attendanceStatus", FIELD_LABELS.attendanceStatus, true)}
                  {colVis.workStatus && renderTH("workStatus", "Work Status", true)}
                  {colVis.accountStatus && renderTH("accountStatus", FIELD_LABELS.employmentStatus, true)}
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 14 }).map((_, j) => (
                        <td key={j}><Skeleton width="80%" height="14px" /></td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={26} className="empty-table-cell">
                      <div className="empty-table-msg">
                        <Users size={36} className="empty-icon" />
                        <p>No employees found</p>
                        <span>Try clearing filters or search for another term.</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map(row => (
                  <tr key={row.id}
                    className={`emp-row${row.accountStatus === 'Suspended' ? ' row-suspended' : ''}`}>
                    {colVis.name && (
                      <td>
                        <div className="emp-name-cell">
                          <span className="emp-avatar-trigger" onClick={e => openPreview(e, row)}>
                            <Avatar name={row.name} size="sm" src={row.avatar || row.photoUrl} />
                          </span>
                          <div className="employee-info-cell">
                            <span
                              className="emp-name-bold emp-name-clickable"
                              onClick={e => openPreview(e, row)}
                              onMouseEnter={e => handleNameMouseEnter(e, row)}
                              onMouseLeave={handleNameMouseLeave}
                            >
                              {row.name}
                            </span>
                            <span className="emp-email-sub">{row.workEmail || row.email}</span>
                          </div>
                        </div>
                      </td>
                    )}
                    {colVis.id && <td><span className="emp-id-mono emp-id-link" onClick={(e) => { e.stopPropagation(); navigate(`/employee-profile/${encodeEmployeeId(row.id)}`); }} title="Open Profile">{row.id}</span></td>}
                    {colVis.designation && <td><span className="text-secondary-sm">{row.designation || row.role}</span></td>}
                    {colVis.department && <td><span className="dept-text">{row.department || '-'}</span></td>}
                    {colVis.branch && <td><span className="text-secondary-sm">{row.branch || '-'}</span></td>}
                    {colVis.teamLeader && <td><span className="text-secondary-sm">{row.teamLeader || '-'}</span></td>}
                    {colVis.projectManager && <td><span className="text-secondary-sm">{row.projectManager || '-'}</span></td>}
                    {colVis.phone && <td><CopyCell value={row.phone} icon={Phone} /></td>}
                    {colVis.workEmail && <td><CopyCell value={row.workEmail || row.email} icon={Mail} truncate={22} underline /></td>}
                    {colVis.joinDate && (
                      <td>
                        <div className="join-date-cell">
                          <Calendar size={12} className="copy-cell-icon" />
                          <span className="text-secondary-sm">{fmtJoinDate(row.joinDate)}</span>
                          {isNewJoiner(row.joinDate) && <span className="new-joiner-badge">New</span>}
                        </div>
                      </td>
                    )}
                    {colVis.employeeType && <td><span className="text-secondary-sm">{row.employeeType || '-'}</span></td>}
                    {colVis.shift && <td><span className="text-secondary-sm">{row.shift || '-'}</span></td>}
                    {colVis.experience && <td><span className="text-secondary-sm">{row.experience || '-'}</span></td>}
                    {colVis.lastLogin && <td><span className="text-secondary-sm" style={{ fontSize: '0.75rem' }}>{row.securityInfo?.lastLogin || '-'}</span></td>}
                    {colVis.currentProjects && <td><span className="bold-text font-mono text-primary" style={{ paddingLeft: '8px' }}>{row.currentProjectsCount !== undefined && row.currentProjectsCount !== null ? row.currentProjectsCount : '-'}</span></td>}
                    {colVis.leaveBalance && <td><span className="bold-text font-mono text-warning">{row.leaveBalance !== undefined && row.leaveBalance !== null ? `${row.leaveBalance} days` : '-'}</span></td>}
                    {colVis.productivityScore && <td><span className="bold-text font-mono text-success" style={{ fontWeight: 600 }}>{row.productivityScore ? `${row.productivityScore}%` : '-'}</span></td>}
                    {colVis.performanceRating && <td>{row.performanceRating ? <Badge variant={row.performanceRating >= 90 ? 'success' : row.performanceRating >= 75 ? 'primary' : 'warning'}>{row.performanceRating}</Badge> : '-'}</td>}
                    {colVis.todayPunchIn && (
                      <td>
                        <span className="punch-time-mono">
                          {(() => {
                            const att = getTodayAttendance(row.id);
                            const time = (att && att.punchIn && att.punchIn !== '--:--') ? att.punchIn : null;
                            return time || '-';
                          })()}
                        </span>
                      </td>
                    )}
                    {colVis.todayPunchOut && (
                      <td>
                        <span className="punch-time-mono">
                          {(() => {
                            const att = getTodayAttendance(row.id);
                            const time = (att && att.punchOut && att.punchOut !== '--:--') ? att.punchOut : null;
                            return time || '-';
                          })()}
                        </span>
                      </td>
                    )}
                    {colVis.todayWorkingHours && (
                      <td>
                        <span className="bold-text font-mono text-secondary">
                          {(() => {
                            const att = getTodayAttendance(row.id);
                            const hours = (att && att.totalHours !== undefined && att.totalHours !== null) ? att.totalHours : null;
                            const hasPunchedIn = att && att.punchIn && att.punchIn !== '--:--';
                            if (!hasPunchedIn) return '-';
                            return hours ? fmtHoursTo60(hours) : '-';
                          })()}
                        </span>
                      </td>
                    )}
                    {colVis.attendanceStatus && (
                      <td>
                        <AttBadge status={getTodayStatus(row)} />
                      </td>
                    )}
                    {colVis.workStatus && (
                      <td>
                        <WorkStatusDot
                          status={(() => {
                            const att = getTodayAttendance(row.id);
                            const hasPunchedIn = att && att.punchIn && att.punchIn !== '--:--';
                            const hasPunchedOut = att && att.punchOut && att.punchOut !== '--:--';
                            return (hasPunchedIn && !hasPunchedOut) ? 'Online' : 'Offline';
                          })()}
                        />
                      </td>
                    )}
                    {colVis.accountStatus && <td><AccBadge status={row.accountStatus} /></td>}
                    <td className="col-actions">
                      <div className="table-actions-cell">
                        <button className="table-action-icon-btn" onClick={(e) => { e.stopPropagation(); handleOpenView(row); }} title="View Profile Detail">
                          <Eye size={16} />
                        </button>
                        {hasPermission('employee_management', 'update') && (
                          <button className="table-action-icon-btn" onClick={(e) => { e.stopPropagation(); navigate(`?edit=${row.id}`); }} title="Edit">
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button className="table-action-icon-btn action-idcard-btn" onClick={(e) => { e.stopPropagation(); setIdCardEmployee(row); setShowIdCard(true); }} title="ID Card">
                          <CreditCard size={16} />
                        </button>
                        {hasPermission('employee_management', 'delete') && (
                          row.status === 'Inactive' ? (
                            <button className="table-action-icon-btn action-activate-btn" onClick={(e) => { e.stopPropagation(); handleActivate(row.id, row.name); }} title="Activate">
                              <CheckCircle size={16} />
                            </button>
                          ) : (
                            <button className="table-action-icon-btn action-deactivate-btn" onClick={(e) => { e.stopPropagation(); handleDeactivate(row.id, row.name); }} title="Deactivate">
                              <Trash2 size={16} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredEmployees.length > pageSize && (
            <div className="emp-pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
            </div>
          )}
        </div>

        {/* ── Page Footer Stats ── */}
        <div className="emp-page-footer-stats">
          <div className="footer-stat-item">
            <span className="footer-stat-label">Last Added</span>
            <span className="footer-stat-value">{employees.length > 0 ? employees[employees.length - 1].name : '—'}</span>
          </div>
          <div className="footer-stat-divider" />
          <div className="footer-stat-item">
            <span className="footer-stat-label">Added Today</span>
            <span className="footer-stat-value">{employees.filter(e => e.joinDate === new Date().toISOString().split('T')[0]).length}</span>
          </div>
          <div className="footer-stat-divider" />
          <div className="footer-stat-item">
            <span className="footer-stat-label">System Sync</span>
            <span className="footer-stat-value footer-stat-ok">● Synced</span>
          </div>
          <div className="footer-stat-divider" />
          <div className="footer-stat-item">
            <span className="footer-stat-label">Auto Backup</span>
            <span className="footer-stat-value footer-stat-ok">● Active</span>
          </div>
          <div className="footer-stat-divider" />
          <div className="footer-stat-item">
            <span className="footer-stat-label">Total Records</span>
            <span className="footer-stat-value">{employees.length} employees</span>
          </div>
        </div>
      </>)}

      {/* ── Employee Hover Quick View Card ── */}
      {hoveredEmp && (
        <div className="emp-hover-quick-card glass animate-fade-in" style={{ position: 'absolute', top: hoverPos.top, left: hoverPos.left, zIndex: 1100 }}>
          <div className="hover-card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Avatar name={hoveredEmp.name} size="sm" src={hoveredEmp.avatar || hoveredEmp.photoUrl} />
            <div className="hover-card-meta" style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <h5 className="hover-card-name" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{hoveredEmp.name}</h5>
              <span className="hover-card-dept" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hoveredEmp.department}</span>
            </div>
          </div>
          <div className="hover-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
            <div className="hover-card-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span className="hover-card-label" style={{ color: 'var(--text-muted)' }}>Today:</span>
              <span className="hover-card-value" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {(() => {
                  const att = getTodayAttendance(hoveredEmp.id);
                  return (att && att.punchIn && att.punchIn !== '--:--') ? `Punched In ✅ at ${att.punchIn}` : 'Not Punched ⚠️';
                })()}
              </span>
            </div>
            <div className="hover-card-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span className="hover-card-label" style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span className="hover-card-value" style={{ 
                color: (() => {
                  const status = getTodayStatus(hoveredEmp);
                  return status === 'Present' || status === 'Overtime' ? 'var(--color-success)' : status === 'Late' ? 'var(--color-warning)' : 'var(--color-danger)';
                })(),
                fontWeight: 600 
              }}>
                {getTodayStatus(hoveredEmp)}
              </span>
            </div>
            <div className="hover-card-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span className="hover-card-label" style={{ color: 'var(--text-muted)' }}>Working Hours:</span>
              <span className="hover-card-value font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {(() => {
                  const att = getTodayAttendance(hoveredEmp.id);
                  const hours = (att && att.totalHours !== undefined && att.totalHours !== null) ? att.totalHours : hoveredEmp.todayWorkingHours;
                  const hasPunchedIn = (att && att.punchIn && att.punchIn !== '--:--') || hoveredEmp.todayPunchIn;
                  if (!hasPunchedIn) return '-';
                  return hours ? `${fmtHoursTo60(hours)} so far` : '0h 00m';
                })()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Preview Card ── */}
      {previewEmp && (
        <div className="emp-preview-card animate-preview" ref={previewRef} style={{ top: previewPos.top, left: previewPos.left }}>
          <button className="preview-close-btn" onClick={() => setPreviewEmp(null)}><X size={14} /></button>
          <div className="preview-top">
            <Avatar name={previewEmp.name} size="lg" src={previewEmp.avatar || previewEmp.photoUrl || ''} />
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
            <div className="preview-detail-row"><User size={13} className="preview-detail-icon" /><span className="preview-detail-label">ID</span><span className="preview-detail-value">{previewEmp.id}</span></div>
            <div className="preview-detail-row"><Users size={13} className="preview-detail-icon" /><span className="preview-detail-label">Manager</span><span className="preview-detail-value">{previewEmp.teamLeader || '—'}</span></div>
            <div className="preview-detail-row"><Phone size={13} className="preview-detail-icon" /><span className="preview-detail-label">Phone</span><CopyCell value={previewEmp.phone} /></div>
            <div className="preview-detail-row"><Mail size={13} className="preview-detail-icon" /><span className="preview-detail-label">Email</span><CopyCell value={previewEmp.workEmail || previewEmp.email} truncate={20} underline /></div>
          </div>
          <div className="preview-divider" />
          <div className="preview-actions-grid">
            <button className="preview-btn preview-btn-primary" onClick={() => { handleOpenView(previewEmp); setPreviewEmp(null); }}>View Profile Detail</button>
            <button className="preview-btn preview-btn-secondary" onClick={() => { navigate(`?edit=${previewEmp.id}`); setPreviewEmp(null); }}>Edit Profile</button>
            <button className="preview-btn preview-btn-secondary" onClick={() => { navigate('/my-profile'); setPreviewEmp(null); }}>Profile Settings</button>
            <button className="preview-btn preview-btn-secondary" onClick={() => { navigate('/tasks'); setPreviewEmp(null); }}>Assign Task</button>
            <button className="preview-btn preview-btn-ghost" onClick={() => { navigate('/work-reports'); setPreviewEmp(null); }}>View Reports</button>
          </div>
          <div className="preview-danger-zone">
            {previewEmp.status === 'Inactive' ? (
              <button className="preview-activate-link" onClick={() => { handleActivate(previewEmp.id, previewEmp.name); setPreviewEmp(null); }}><CheckCircle size={12} /> Activate Account</button>
            ) : (
              <button className="preview-delete-link" onClick={() => { handleDeactivate(previewEmp.id, previewEmp.name); setPreviewEmp(null); }}><Trash2 size={12} /> Delete Account</button>
            )}
          </div>
        </div>
      )}

      {/* ── Transfer Dept Modal ── */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Transfer {selectedIds.size} employee(s) to department</h3>
            <select value={transferDept || depts[0] || ''} onChange={e => setTransferDept(e.target.value)} style={{ marginTop: 16, marginBottom: 16 }}>{depts.map(d => <option key={d} value={d}>{d}</option>)}</select>
            <div className="modal-footer"><Button variant="secondary" onClick={() => setShowTransferModal(false)}>Cancel</Button><Button variant="primary" onClick={handleTransferDept}>Confirm Transfer</Button></div>
          </div>
        </div>
      )}

      {/* ── Assign Leader Modal ── */}
      {showAssignLeaderModal && (
        <div className="modal-overlay" onClick={() => setShowAssignLeaderModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Assign Team Leader to {selectedIds.size} employee(s)</h3>
            <select value={assignLeader} onChange={e => setAssignLeader(e.target.value)} style={{ marginTop: 16, marginBottom: 16 }}><option value="">Select a leader...</option>{leaders.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select>
            <div className="modal-footer"><Button variant="secondary" onClick={() => setShowAssignLeaderModal(false)}>Cancel</Button><Button variant="primary" onClick={handleAssignLeader} disabled={!assignLeader}>Assign</Button></div>
          </div>
        </div>
      )}

      {/* ── Bulk Assign Role Modal ── */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Assign Role to {selectedIds.size} employee(s)</h3>
            <select value={bulkRole} onChange={e => setBulkRole(e.target.value)} style={{ marginTop: 16, marginBottom: 16 }}>
              <option value="">Select Role</option>
              {(roles || []).map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <div className="modal-footer"><Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button><Button variant="primary" onClick={handleBulkRoleAssign}>Assign Role</Button></div>
          </div>
        </div>
      )}

      {/* ── Bulk Status Update Modal ── */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Update Status for {selectedIds.size} employee(s)</h3>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ marginTop: 16, marginBottom: 16 }}>
              <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="On Leave">On Leave</option>
            </select>
            <div className="modal-footer"><Button variant="secondary" onClick={() => setShowStatusModal(false)}>Cancel</Button><Button variant="primary" onClick={handleBulkStatusUpdate}>Update Status</Button></div>
          </div>
        </div>
      )}

      {/* ── Bulk Leave Allocation Modal ── */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Allocate Leave Days to {selectedIds.size} employee(s)</h3>
            <input type="number" value={bulkLeaveDays} onChange={e => setBulkLeaveDays(e.target.value)} style={{ marginTop: 16, marginBottom: 16, width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }} min="1" />
            <div className="modal-footer"><Button variant="secondary" onClick={() => setShowLeaveModal(false)}>Cancel</Button><Button variant="primary" onClick={handleBulkLeaveAllocation}>Allocate Days</Button></div>
          </div>
        </div>
      )}

      {/* ── Bulk Send Alert/Notification Modal ── */}
      {showNotifyModal && (
        <div className="modal-overlay" onClick={() => setShowNotifyModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Send Alert to {selectedIds.size} employee(s)</h3>
            <textarea rows="3" placeholder="Type announcement message..." value={bulkNotifyMsg} onChange={e => setBulkNotifyMsg(e.target.value)} style={{ marginTop: 16, marginBottom: 16, width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', resize: 'none' }} />
            <div className="modal-footer"><Button variant="secondary" onClick={() => setShowNotifyModal(false)}>Cancel</Button><Button variant="primary" onClick={handleBulkNotification}>Send Alert</Button></div>
          </div>
        </div>
      )}

      {/* ── Bulk Assign Shift Modal ── */}
      {showShiftModal && (
        <div className="modal-overlay" onClick={() => setShowShiftModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Assign Shift to {selectedIds.size} employee(s)</h3>
            <select value={bulkShift} onChange={e => setBulkShift(e.target.value)} style={{ marginTop: 16, marginBottom: 16, width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}>
              <option value="Morning (09:00 AM - 06:00 PM)">Morning (09:00 AM - 06:00 PM)</option>
              <option value="Evening (02:00 PM - 11:00 PM)">Evening (02:00 PM - 11:00 PM)</option>
              <option value="Night (10:00 PM - 07:00 AM)">Night (10:00 PM - 07:00 AM)</option>
              <option value="Flexible (09:00 AM - 06:00 PM)">Flexible (09:00 AM - 06:00 PM)</option>
            </select>
            <div className="modal-footer"><Button variant="secondary" onClick={() => setShowShiftModal(false)}>Cancel</Button><Button variant="primary" onClick={handleBulkAssignShift}>Assign Shift</Button></div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Panel ── */}
      {showFormPanel && (
        <div className="card form-panel-card animate-fade-in">
          <div className="form-panel-header">
            <div>
              <h3>{formMode === 'add' ? 'Add New Employee' : 'Edit Employee'}</h3>
              <span className="form-step-sub">Step {wizardStep} of 7 — {['Personal Details', 'Professional Details', 'Login & Role', 'Shift', 'Salary & Payroll', 'Documents', 'Security'][wizardStep - 1]}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {formMode === 'edit' && (
                <Button variant="primary" size="sm" icon={Save} loading={isSubmitting} onClick={handleFormSubmit}>
                  Save
                </Button>
              )}
              <button className="slide-over-close-btn" onClick={() => { setShowFormPanel(false); navigate('/employees'); }} aria-label="Close"><X size={18} /></button>
            </div>
          </div>

          {/* Inplace field errors are rendered directly under each input element */}

          {/* ── Clickable Wizard Indicators ── */}
          <div className="wizard-indicators-bar">
            {[
              { n: 1, l: 'Personal' },
              { n: 2, l: 'Professional' },
              { n: 3, l: 'Login' },
              { n: 4, l: 'Shift' },
              { n: 5, l: 'Salary' },
              { n: 6, l: 'Documents' },
              { n: 7, l: 'Security' }
            ].map(({ n, l }, i, arr) => {
              const isCompleted = wizardStep > n;
              const isActive = wizardStep === n;

              return (
                <React.Fragment key={n}>
                  <div
                    className={`indicator-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} clickable`}
                    onClick={() => handleStepClick(n)}
                    title={`Click to go to Step ${n}: ${l}`}
                  >
                    <span className="step-num">{isCompleted ? '✓' : n}</span>
                    <span className="step-name">{l}</span>
                  </div>
                  {i < arr.length - 1 && <ChevronRight size={12} className="indicator-sep" />}
                </React.Fragment>
              );
            })}
          </div>

          <form className="wizard-form-body" onSubmit={e => e.preventDefault()}>
            {/* Step 1: Personal Details */}
            {wizardStep === 1 && (
              <div className="wizard-step-form">
                <h4 className="form-subsection-title">Personal Details</h4>
                <div className="form-section-grid">
                  <div className="form-field form-field-full">
                    <label>{FIELD_LABELS.name} *</label>
                    <input type="text" placeholder="e.g. Vikram Singh" value={formData.name} onChange={e => { const val = e.target.value.replace(/[^\p{L}\s]/gu, ''); setFormData(p => ({ ...p, name: val })); }} required />
                    {formData.name && formData.name.trim().length < 2 && (
                      <span className="field-error-msg">⚠️ Name must be at least 2 characters.</span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.dob}</label>
                    <input type="date" value={formData.dob} onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))} />
                    {formData.dob && !isOldEnough(formData.dob) && (
                      <span className="field-error-msg">⚠️ Employee must be at least 18 years old.</span>
                    )}
                  </div>
                  <div className="form-field"><label>{FIELD_LABELS.gender}</label><select value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.phone} *</label>
                    <input type="text" placeholder="e.g. 9876543210" value={formData.phone} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setFormData(p => ({ ...p, phone: val })); }} required />
                    {formData.phone && !isValidPhone(formData.phone) && (
                      <span className="field-error-msg">⚠️ Number must start with 7, 8, or 9 and contain exactly 10 digits.</span>
                    )}
                    {dupPhone && (
                      <span className="field-error-msg">⚠️ Duplicate Mobile: Phone number already in use.</span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.alternatePhone}</label>
                    <input type="text" placeholder="e.g. 9876543211" value={formData.alternatePhone || ''} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setFormData(p => ({ ...p, alternatePhone: val })); }} />
                    {formData.alternatePhone && !isValidPhone(formData.alternatePhone) && (
                      <span className="field-error-msg">⚠️ Number must start with 7, 8, or 9 and contain exactly 10 digits.</span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.email} *</label>
                    <input type="email" placeholder="vikram@company.com" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required />
                    {formData.email && !isValidEmail(formData.email) && (
                      <span className="field-error-msg">⚠️ Please enter a valid email format.</span>
                    )}
                    {dupEmail && (
                      <span className="field-error-msg">⚠️ Duplicate Email: Already registered to another employee.</span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.personalEmail}</label>
                    <input type="email" placeholder="vikram@gmail.com" value={formData.personalEmail || ''} onChange={e => setFormData(p => ({ ...p, personalEmail: e.target.value }))} />
                    {formData.personalEmail && !isValidEmail(formData.personalEmail) && (
                      <span className="field-error-msg">⚠️ Please enter a valid email format.</span>
                    )}
                  </div>
                  <div className="form-field"><label>{FIELD_LABELS.bloodGroup}</label><select value={formData.bloodGroup || ''} onChange={e => setFormData(p => ({ ...p, bloodGroup: e.target.value }))}><option value="">Select</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div>
                  <div className="form-field"><label>{FIELD_LABELS.maritalStatus}</label><select value={formData.maritalStatus || ''} onChange={e => setFormData(p => ({ ...p, maritalStatus: e.target.value }))}><option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select></div>
                  <div className="form-field"><label>{FIELD_LABELS.experience}</label><input type="text" placeholder="e.g. 5 years" value={formData.experience} onChange={e => setFormData(p => ({ ...p, experience: e.target.value }))} /></div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.roleId} *</label>
                    <select
                      value={formData.roleId || ''}
                      onChange={e => {
                        const nextRole = e.target.value;
                        setFormData(p => {
                          const updated = {
                            ...p,
                            roleId: nextRole
                          };
                          if (nextRole === 'manager') {
                            updated.designation = 'Manager';
                          }
                          return updated;
                        });
                      }}
                    >
                      <option value="">Select Role</option>
                      {(roles || []).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-5)' }}>Address Details</h4>
                <div className="form-section-grid">
                  <div className="form-field form-field-full"><label>{FIELD_LABELS.currentAddress}</label><textarea rows="2" placeholder="Current residential address" value={formData.currentAddress || ''} onChange={e => setFormData(p => ({ ...p, currentAddress: e.target.value }))} /></div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.zipCode}</label>
                    <input type="text" placeholder="e.g. 302017" value={formData.zipCode || ''} onChange={e => handleZipCodeChange(e.target.value)} />
                    {formData.zipCode && !isValidZipCode(formData.zipCode) && (
                      <span className="field-error-msg">⚠️ Must contain exactly 6 digits.</span>
                    )}
                  </div>
                  <div className="form-field"><label>{FIELD_LABELS.city}</label><input type="text" placeholder="e.g. Jaipur" value={formData.city || ''} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} /></div>
                  <div className="form-field"><label>{FIELD_LABELS.state}</label><input type="text" placeholder="e.g. Rajasthan" value={formData.state || ''} onChange={e => setFormData(p => ({ ...p, state: e.target.value }))} /></div>
                  <div className="form-field form-field-full"><label>{FIELD_LABELS.permanentAddress}</label><textarea rows="2" placeholder="Permanent address (if different)" value={formData.permanentAddress || ''} onChange={e => setFormData(p => ({ ...p, permanentAddress: e.target.value }))} /></div>
                </div>
                <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-5)' }}>Emergency Contact</h4>
                <div className="form-section-grid">
                  <div className="form-field"><label>{FIELD_LABELS.emergencyContactName}</label><input type="text" placeholder="e.g. Priya Sharma" value={formData.emergencyContactName || ''} onChange={e => { const val = e.target.value.replace(/[^\p{L}\s]/gu, ''); setFormData(p => ({ ...p, emergencyContactName: val })); }} /></div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.emergencyContactPhone}</label>
                    <input type="text" placeholder="e.g. 9876543211" value={formData.emergencyContactPhone || ''} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setFormData(p => ({ ...p, emergencyContactPhone: val })); }} />
                    {formData.emergencyContactPhone && !isValidPhone(formData.emergencyContactPhone) && (
                      <span className="field-error-msg">⚠️ Number must start with 7, 8, or 9 and contain exactly 10 digits.</span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.emergencyContactPhoneAlt}</label>
                    <input type="text" placeholder="e.g. 9876543212" value={formData.emergencyContactPhoneAlt || ''} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setFormData(p => ({ ...p, emergencyContactPhoneAlt: val })); }} />
                    {formData.emergencyContactPhoneAlt && !isValidPhone(formData.emergencyContactPhoneAlt) && (
                      <span className="field-error-msg">⚠️ Number must start with 7, 8, or 9 and contain exactly 10 digits.</span>
                    )}
                  </div>
                  <div className="form-field"><label>{FIELD_LABELS.emergencyContactRelation}</label><select value={formData.emergencyContactRelation || ''} onChange={e => setFormData(p => ({ ...p, emergencyContactRelation: e.target.value }))}><option value="">Select</option><option>Spouse</option><option>Parent</option><option>Sibling</option><option>Friend</option><option>Relative</option><option>Other</option></select></div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (() => {
              const isWfh = formData.workMode === 'WFH';
              const isFullTime = formData.employeeType === 'Full Time';
              return (
                <div className="wizard-step-form">
                  <div className="form-section-grid">
                    <div className="form-field">
                      <label>{FIELD_LABELS.id}</label>
                      {formMode === 'add' ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          background: 'var(--bg-secondary, #1e293b)',
                          border: '1px dashed var(--border-color, #334155)',
                          borderRadius: '8px', padding: '10px 14px',
                          color: 'var(--text-muted, #94a3b8)', fontSize: '13px'
                        }}>
                          <span style={{ fontSize: '16px' }}>🔒</span>
                          <span>Auto-assigned by system after save</span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={formData.id}
                          disabled
                          style={{ opacity: 0.6, cursor: 'not-allowed' }}
                        />
                      )}
                    </div>
                    {formData.roleId !== 'manager' && (
                      <div className="form-field">
                        <label>{FIELD_LABELS.designation} *</label>
                        <input type="text" placeholder="e.g. Senior Software Engineer" value={formData.designation} onChange={e => setFormData(p => ({ ...p, designation: e.target.value }))} required />
                        {formData.designation && formData.designation.trim().length < 2 && (
                          <span className="field-error-msg">⚠️ Designation must be at least 2 characters.</span>
                        )}
                      </div>
                    )}
                    <div className="form-field">
                      <label>{FIELD_LABELS.branch} *</label>
                      <select
                        value={formData.branch}
                        onChange={e => {
                          const selectedBranch = e.target.value;
                          const filtered = (dbDepartments || []).filter(
                            d => d.branch?.trim().toLowerCase() === selectedBranch.trim().toLowerCase()
                          );
                          const firstDept = filtered.length > 0 ? filtered[0].name : '';
                          setFormData(p => ({
                            ...p,
                            branch: selectedBranch,
                            department: firstDept
                          }));
                        }}
                        required
                      >
                        {(() => {
                          const hasDbBranches = dbBranches && dbBranches.length > 0;
                          if (!hasDbBranches) {
                            return <option value="">Select Branch/Agency</option>;
                          }
                          return [
                            <option key="__empty" value="">Select Branch/Agency</option>,
                            ...dbBranches.map(b => (
                              <option key={b.id || b._id} value={b.name}>
                                {b.name}
                              </option>
                            ))
                          ];
                        })()}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>{FIELD_LABELS.department}</label>
                      <select
                        value={formData.department}
                        onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                      >
                        {(() => {
                          const filteredDbDepts = dbDepartments && dbDepartments.length > 0
                            ? (formData.branch
                                ? dbDepartments.filter(d => d.branch?.trim().toLowerCase() === formData.branch?.trim().toLowerCase())
                                : dbDepartments)
                            : [];
                          const hasDbDepts = filteredDbDepts.length > 0;
                            if (!hasDbDepts) {
                              return <option value="">Select Department</option>;
                            }
                            return [
                              <option key="__empty_dept" value="">Select Department</option>,
                              ...filteredDbDepts.map(d => (
                                <option key={d.id || d._id} value={d.name}>
                                  {d.name}
                                </option>
                              ))
                            ];
                          })()}
                        </select>
                      </div>
                    {formData.roleId !== 'manager' && formData.roleId !== 'team_leader' && (
                      <div className="form-field"><label>{FIELD_LABELS.teamLeader}</label><select value={formData.teamLeader} onChange={e => setFormData(p => ({ ...p, teamLeader: e.target.value }))}><option value="">Select Team Leader</option>{leaders.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
                    )}
                    <div className="form-field"><label>{FIELD_LABELS.joinDate} *</label><input type="date" value={formData.joinDate} onChange={e => setFormData(p => ({ ...p, joinDate: e.target.value }))} required /></div>
                    <div className="form-field"><label>{FIELD_LABELS.workLocation}</label><input type="text" placeholder="e.g. Tower B, 3rd Floor" value={formData.workLocation || ''} onChange={e => setFormData(p => ({ ...p, workLocation: e.target.value }))} /></div>
                  </div>
                  {formData.roleId !== 'manager' && (
                    <>
                      {formData.roleId !== 'team_leader' && (
                        <>
                          <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-4)' }}>Work Mode</h4>
                          <div className="work-mode-selector">
                            {['WFO', 'WFH', 'Hybrid'].map(mode => (
                              <label key={mode} className={`work-mode-option ${formData.workMode === mode ? 'selected' : ''}`}>
                                <input type="radio" name="workMode" value={mode} checked={formData.workMode === mode} onChange={() => handleWorkModeChange(mode)} hidden />
                                <span className="work-mode-icon">{mode === 'WFO' ? '🏢' : mode === 'WFH' ? '🏠' : '🔄'}</span><span>{mode}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}

                      <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-4)' }}>Quick Assign</h4>
                      <div className="form-quick-assign-card">
                        <p className="quick-assign-desc">Auto-fill related fields by selecting a team preset.</p>
                        <div className="form-section-grid">
                          <div className="form-field"><label>Team Assignment</label><select value={formData.teamName || ''} onChange={e => handleTeamChange(e.target.value)}><option value="">Select Team</option>{teams && teams.length > 0 && teams.map(t => <option key={t.id || t._id || t.name} value={t.name}>{t.name}</option>)}</select></div>
                        </div>
                      </div>

                      <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-4)' }}>Employment Information</h4>
                      <div className="form-section-grid">
                        <div className="form-field"><label>{FIELD_LABELS.employeeType}</label>
                          <select value={formData.employeeType || 'Full Time'} onChange={e => {
                            const newType = e.target.value;
                            setFormData(p => ({
                              ...p,
                              employeeType: newType,
                              probationEndDate: newType === 'Full Time' ? '' : p.probationEndDate,
                              contractEndDate: newType === 'Contract' ? p.contractEndDate : ''
                            }));
                          }}>
                            <option value="Full Time">Full Time</option>
                            <option value="Part Time">Part Time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                          </select>
                        </div>
                        <div className="form-field"><label>{FIELD_LABELS.employmentStatus}</label><select value={formData.employmentStatus || 'Active'} onChange={e => setFormData(p => ({ ...p, employmentStatus: e.target.value }))}><option value="Active">Active</option><option value="Probation">Probation</option><option value="Suspended">Suspended</option><option value="Terminated">Terminated</option></select></div>
                        <div className="form-field">
                          <label>{FIELD_LABELS.probationEndDate}</label>
                          <input type="date" value={formData.probationEndDate || ''} onChange={e => setFormData(p => ({ ...p, probationEndDate: e.target.value }))} disabled={isFullTime} style={{ opacity: isFullTime ? 0.5 : 1, cursor: isFullTime ? 'not-allowed' : 'pointer' }} />
                          {isFullTime && <small style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Disabled for Full Time employees</small>}
                        </div>
                        {formData.employeeType === 'Contract' && (
                          <div className="form-field"><label>{FIELD_LABELS.contractEndDate}</label><input type="date" value={formData.contractEndDate || ''} onChange={e => setFormData(p => ({ ...p, contractEndDate: e.target.value }))} /></div>
                        )}
                      </div>
                    </>
                  )}
                  <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-4)' }}>Bank Details</h4>
                  <div className="form-section-grid">
                    <div className="form-field">
                      <label>{FIELD_LABELS.bankName}</label>
                      <input type="text" placeholder="e.g. HDFC Bank" value={formData.bankName || ''} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z\s]/g, ''); setFormData(p => ({ ...p, bankName: val })); }} />
                      {invalidBankName && (
                        <span className="field-error-msg">⚠️ Must contain only letters and spaces.</span>
                      )}
                    </div>
                    <div className="form-field">
                      <label>{FIELD_LABELS.bankAccountNumber}</label>
                      <input type="text" placeholder="e.g. 501002348271" value={formData.bankAccountNumber || ''} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 18); setFormData(p => ({ ...p, bankAccountNumber: val })); }} />
                      {invalidBankAccountVal && (
                        <span className="field-error-msg">⚠️ Must be digits only and between 9 and 18 characters.</span>
                      )}
                    </div>
                    <div className="form-field">
                      <label>{FIELD_LABELS.bankIfscCode}</label>
                      <input type="text" placeholder="e.g. HDFC0000123" value={formData.bankIfscCode || ''} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 11); setFormData(p => ({ ...p, bankIfscCode: val })); }} />
                      {invalidIfscVal && (
                        <span className="field-error-msg">⚠️ Must be 11 characters in format: ABCD0123456.</span>
                      )}
                    </div>
                    <div className="form-field">
                      <label>{FIELD_LABELS.bankUpiId}</label>
                      <input type="text" placeholder="e.g. employee@okhdfc" value={formData.bankUpiId || ''} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z0-9.\-_@]/g, ''); setFormData(p => ({ ...p, bankUpiId: val })); }} />
                      {invalidUpiVal && (
                        <span className="field-error-msg">⚠️ Must be in a valid format (e.g. name@upi).</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Step 3: Login & Role Access */}
            {wizardStep === 3 && (
              <div className="wizard-step-form">
                <h4 className="form-subsection-title">Login Credentials</h4>
                <div className="form-section-grid">
                  <div className="form-field">
                    <label>{FIELD_LABELS.username}</label>
                    <input type="text" placeholder="e.g. vikram.singh" value={formData.username || ''} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} />
                    {formData.username && formData.username.trim().length < 3 && (
                      <span className="field-error-msg">⚠️ Must be at least 3 characters.</span>
                    )}
                    {dupUsername && (
                      <span className="field-error-msg">⚠️ Duplicate Username: Already registered to another employee.</span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.officialEmail}</label>
                    <input type="email" placeholder="vikram@company.io" value={formData.officialEmail || ''} onChange={e => setFormData(p => ({ ...p, officialEmail: e.target.value }))} />
                    {formData.officialEmail && !isValidEmail(formData.officialEmail) && (
                      <span className="field-error-msg">⚠️ Please enter a valid email format.</span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.password} *</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder={formMode === 'edit' ? 'Leave blank to keep current' : 'Set login password'}
                        value={formData.password || ''}
                        onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                        maxLength={12}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(p => !p)}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {invalidPass && (
                      <span className="field-error-msg">⚠️ Must be between 8 and 12 characters.</span>
                    )}
                    {formData.password && formData.password !== '••••••••' && (
                      <div className="password-strength-bar">
                        <div className={`pw-bar-fill pw-${formData.password.length < 6 ? 'weak' : formData.password.length < 10 ? 'medium' : 'strong'}`} style={{ width: `${Math.min(100, formData.password.length * 10)}%` }} />
                        <span className={`pw-label pw-label-${formData.password.length < 6 ? 'weak' : formData.password.length < 10 ? 'medium' : 'strong'}`}>{formData.password.length < 6 ? '🔴 Weak' : formData.password.length < 10 ? '🟡 Medium' : '🟢 Strong'}</span>
                      </div>
                    )}
                  </div>
                  <div className="form-field">
                    <label>{FIELD_LABELS.confirmPassword} *</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={formData.confirmPassword || ''}
                        onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                        maxLength={12}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword(p => !p)}
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.confirmPassword !== formData.password && <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '4px', display: 'block' }}>⚠ Passwords do not match</span>}
                    {formData.confirmPassword && formData.confirmPassword === formData.password && formData.confirmPassword.length > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '4px', display: 'block' }}>✓ Passwords match</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Shift Setup */}
            {wizardStep === 4 && (() => {
              const isWfh = formData.workMode === 'WFH';
              return (
                <div className="wizard-step-form">
                  {isWfh && (
                    <div className="form-alert form-alert-info" style={{ marginBottom: 'var(--spacing-4)' }}>
                      ℹ️ <strong>Work From Home Active:</strong> Shift timings are managed automatically under the remote work policy.
                    </div>
                  )}
                  <h4 className="form-subsection-title">Shift Configuration</h4>
                  <div className="form-section-grid">
                    <div className={`form-field ${isWfh ? 'disabled-field' : ''}`}>
                      <label>{FIELD_LABELS.shiftType}</label>
                      <select
                        value={formData.shiftType || 'Morning Shift'}
                        onChange={e => {
                          const val = e.target.value;
                          let timing = '';
                          if (val === 'Morning Shift') {
                            timing = '09:30 AM - 06:00 PM';
                          } else if (val === 'Evening Shift') {
                            timing = '06:00 PM - 11:00 PM';
                          } else if (val === 'Night Shift') {
                            timing = '11:00 PM - 05:00 AM';
                          } else if (val === 'Flexible Shift') {
                            timing = 'Flexible';
                          }
                          setFormData(p => ({
                            ...p,
                            shiftType: val,
                            shiftTiming: timing
                          }));
                        }}
                        disabled={isWfh}
                      >
                        <option value="Morning Shift">🌅 Morning Shift</option>
                        <option value="Evening Shift">🌆 Evening Shift</option>
                        <option value="Night Shift">🌙 Night Shift</option>
                        <option value="Flexible Shift">🔄 Flexible Shift</option>
                      </select>
                    </div>
                    {!isWfh && formData.shiftType !== 'Flexible Shift' && (
                      <div className="form-field">
                        <label>{FIELD_LABELS.shiftTiming}</label>
                        <input
                          type="text"
                          placeholder="e.g. 09:30 AM - 06:00 PM"
                          value={formData.shiftTiming || ''}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9:\s\-aApPmM]/g, '');
                            setFormData(p => ({ ...p, shiftTiming: val }));
                          }}
                        />
                        {invalidShiftTiming && (
                          <span className="field-error-msg">⚠️ Must match format: HH:MM AM - HH:MM PM (e.g., 09:30 AM - 06:00 PM).</span>
                        )}
                      </div>
                    )}
                  </div>

                  <h4 className="form-subsection-title" style={{ marginTop: 'var(--spacing-4)' }}>Overtime</h4>
                  <div className={`toggle-field-row ${isWfh ? 'disabled-row' : ''}`}>
                    <div>
                      <span className="toggle-field-label">Overtime Eligibility</span>
                      <span className="toggle-field-desc">Allow this employee to log overtime hours</span>
                    </div>
                    <button
                      type="button"
                      className={`toggle-switch ${formData.overtimeEligibility ? 'on' : 'off'} ${isWfh ? 'disabled-switch' : ''}`}
                      onClick={() => {
                        if (isWfh) return;
                        setFormData(p => ({ ...p, overtimeEligibility: !p.overtimeEligibility }));
                      }}
                      disabled={isWfh}
                    >
                      <span className="toggle-knob" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Step 5: Salary Details */}
            {wizardStep === 5 && (
              <div className="wizard-step-form">
                <h4 className="form-subsection-title">Salary Details</h4>
                <div className="form-section-grid">
                  <div className="form-field"><label>Salary Type</label><select value={formData.salaryType || 'Monthly Fixed'} onChange={e => setFormData(p => ({ ...p, salaryType: e.target.value }))}><option value="Monthly Fixed">Monthly Fixed</option><option value="CTC Based">CTC Based</option><option value="Hourly Rate">Hourly Rate</option><option value="Daily Wage">Daily Wage</option></select></div>
                  <div className="form-field"><label>Monthly Salary (₹)</label><input type="text" placeholder="55000" value={formData.monthlySalary || ''} onChange={e => { const val = e.target.value.replace(/\D/g, ''); const capped = Number(val) > 500000 ? '500000' : val; setFormData(p => ({ ...p, monthlySalary: capped })); }} /></div>
                  <div className="form-field"><label>Basic Salary (₹)</label><input type="text" placeholder="35000" value={formData.salaryAmount || ''} onChange={e => { const val = e.target.value.replace(/\D/g, ''); const capped = Number(val) > 500000 ? '500000' : val; setFormData(p => ({ ...p, salaryAmount: capped })); }} /></div>
                  <div className="form-field"><label>Deductions (₹)</label><input type="text" placeholder="5000" value={formData.salaryDeductions || ''} onChange={e => { const val = e.target.value.replace(/\D/g, ''); setFormData(p => ({ ...p, salaryDeductions: val })); }} /></div>
                </div>
              </div>
            )}

            {/* Step 6: Document Upload */}
            {wizardStep === 6 && (
              <div className="wizard-step-form">
                <h4 className="form-subsection-title">Identity Verification</h4>
                <div className="form-section-grid" style={{ marginBottom: 'var(--spacing-5)' }}>
                  <div className="form-field">
                    <label>PAN Number</label>
                    <input type="text" placeholder="ABCDE1234F" value={formData.panNumber || ''} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10); setFormData(p => ({ ...p, panNumber: val })); }} maxLength={10} />
                    {invalidPanVal && (
                      <span className="field-error-msg">⚠️ Must match standard 10 alphanumeric format (e.g., ABCDE1234F).</span>
                    )}
                  </div>
                  <div className="form-field">
                    <label>Aadhaar Number</label>
                    <input type="text" placeholder="e.g. 123456789012" value={formData.aadhaarNumber || ''} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 12); setFormData(p => ({ ...p, aadhaarNumber: val })); }} maxLength={12} />
                    {invalidAadhaarVal && (
                      <span className="field-error-msg">⚠️ Must contain exactly 12 digits.</span>
                    )}
                  </div>
                </div>

                <h4 className="form-subsection-title">Employee Documents</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-4)' }}>
                  Accepted: <strong>.pdf .jpg .jpeg .png .docx</strong> (Max 5MB each)
                </p>
                <div className="form-section-grid-docs">
                  {[
                    { key: 'aadhaar', label: 'Aadhaar Card', required: true },
                    { key: 'pan', label: 'PAN Card', required: true },
                    { key: 'resume', label: 'Resume / CV', required: true },
                    { key: 'certificates', label: 'Certificates', required: false },
                    { key: 'offerLetter', label: 'Offer Letter', required: false },
                    { key: 'experienceLetter', label: 'Experience Letter', required: false },
                    { key: 'addressProof', label: 'Address Proof', required: false },
                    { key: 'passportPhoto', label: 'Passport Photo', required: false },
                    { key: 'signedAgreements', label: 'Signed Agreements', required: false },
                    { key: 'profilePhoto', label: 'Profile Photo', required: false }
                  ].map(({ key, label, required }) => {
                    const imgOnly = ['profilePhoto', 'passportPhoto'];
                    const validTypes = imgOnly.includes(key) ? ['image/jpeg', 'image/png', 'image/jpg'] : ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                    const file = uploadedDocs[key];
                    const isInvalid = file && !file.isExisting && !validTypes.includes(file.type);
                    const isImage = file && (file.type ? file.type.startsWith('image/') : (file.downloadUrl && file.downloadUrl.startsWith('data:image')));
                    const filePreview = isImage && file ? (file.downloadUrl || (file instanceof Blob ? URL.createObjectURL(file) : null)) : null;

                    return (
                      <div key={key} className={`form-doc-upload ${file ? 'has-file' : ''} ${isInvalid ? 'doc-invalid' : ''}`}>
                        <label className="doc-label">{label} {required && <span className="doc-required">*</span>}</label>
                        <div className="doc-upload-container">
                          {!file ? (
                            <label className="doc-upload-box">
                              <input type="file" accept={imgOnly.includes(key) ? 'image/*' : '.pdf,.jpg,.jpeg,.png,.docx'} onChange={e => { const f = e.target.files[0]; if (f && f.size > 5 * 1024 * 1024) { addToast('error', `${label} exceeds 5MB limit`); return; } if (f && !validTypes.includes(f.type)) { addToast('error', `Invalid type for ${label}`); return; } setUploadedDocs(prev => ({ ...prev, [key]: f || null })); }} hidden />
                              <div className="doc-upload-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg><span>Upload</span></div>
                            </label>
                          ) : (
                            <div className="doc-file-preview">
                              {isImage && filePreview ? (
                                <div style={{ position: 'relative' }}>
                                  <div className="doc-image-preview">
                                    <a href={filePreview} download={file.name} target="_blank" rel="noopener noreferrer">
                                      <img src={filePreview} alt={label} className="doc-preview-img" />
                                    </a>
                                  </div>
                                  <button type="button" className="doc-remove-btn" onClick={() => handleRemoveDocument(key, label)} title="Remove file"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                                </div>
                              ) : (
                                <div className="doc-file-info">
                                  <div className="doc-file-icon">{file.type.includes('pdf') ? (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>)}</div>
                                  <div className="doc-file-details">
                                    <a href={file.downloadUrl || '#'} download={file.name} target="_blank" rel="noopener noreferrer" className="doc-file-download-link" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                                      <span className="doc-file-name" title={file.name}>{file.name.length > 20 ? file.name.slice(0, 18) + '…' : file.name}</span>
                                    </a>
                                    <span className="doc-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                                  </div>
                                  <button type="button" className="doc-remove-btn doc-remove-file-btn" onClick={() => handleRemoveDocument(key, label)} title="Remove file"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                                </div>
                              )}
                              <label className="doc-replace-link"><input type="file" accept={imgOnly.includes(key) ? 'image/*' : '.pdf,.jpg,.jpeg,.png,.docx'} onChange={e => { const f = e.target.files[0]; if (f && f.size > 5 * 1024 * 1024) { addToast('error', `${label} exceeds 5MB limit`); return; } if (f && !validTypes.includes(f.type)) { addToast('error', `Invalid type for ${label}`); return; } setUploadedDocs(prev => ({ ...prev, [key]: f || null })); addToast('success', `${label} updated`); }} hidden /><span>Replace</span></label>
                            </div>
                          )}
                        </div>
                        {isInvalid && <span className="doc-error-msg">❌ Invalid format. Use {imgOnly.includes(key) ? 'JPG, PNG' : 'PDF, JPG, PNG, DOCX'}</span>}
                        {required && (key === 'aadhaar' ? missingAadhaarDoc : key === 'pan' ? missingPanDoc : key === 'resume' ? missingResumeDoc : false) && (
                          <span className="doc-error-msg" style={{ color: 'var(--color-warning)' }}>⚠️ Upload required to proceed.</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="doc-clear-all-container">
                  <button type="button" className="doc-clear-all-btn" onClick={handleClearAllDocuments}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>Clear All Documents</button>
                </div>
              </div>
            )}

            {/* Step 7: System Access & Security */}
            {wizardStep === 7 && (
              <div className="wizard-step-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)', alignItems: 'start' }}>
                  <div>
                    <h4 className="form-subsection-title" style={{ marginTop: 0 }}>System Access & Security</h4>
                    <div className="toggle-field-row"><div><span className="toggle-field-label">Two-Factor Authentication</span><span className="toggle-field-desc">Require 2FA on every login</span></div><button type="button" className={`toggle-switch ${formData.twoFactorAuth ? 'on' : 'off'}`} onClick={() => setFormData(p => ({ ...p, twoFactorAuth: !p.twoFactorAuth }))}><span className="toggle-knob" /></button></div>
                    <div className="toggle-field-row"><div><span className="toggle-field-label">Multi-Device Login</span><span className="toggle-field-desc">Allow simultaneous logins</span></div><button type="button" className={`toggle-switch ${formData.multiDeviceLogin ? 'on' : 'off'}`} onClick={() => setFormData(p => ({ ...p, multiDeviceLogin: !p.multiDeviceLogin }))}><span className="toggle-knob" /></button></div>
                  </div>
                  <div>
                    <h4 className="form-subsection-title" style={{ marginTop: 0 }}>Employee Preview</h4>
                    <div className="pre-save-preview-card">
                      <div className="pre-save-avatar-row"><Avatar name={formData.name || 'New Employee'} size="lg" src={uploadedDocs.profilePhoto ? (uploadedDocs.profilePhoto.downloadUrl || (uploadedDocs.profilePhoto instanceof Blob ? URL.createObjectURL(uploadedDocs.profilePhoto) : '')) : (formData.avatar || formData.photoUrl || '')} /><div className="pre-save-name-block"><h4>{formData.name || 'New Employee'}</h4><span>{formData.designation || 'Designation not set'}</span></div></div>
                      <div className="pre-save-id-badge">{formData.id || 'ID not generated'}</div>
                      <div className="pre-save-detail-list">
                        <div className="pre-save-detail-row"><span>Department</span><strong>{formData.department || '—'}</strong></div>
                        <div className="pre-save-detail-row"><span>Branch</span><strong>{formData.branch || '—'}</strong></div>
                        <div className="pre-save-detail-row"><span>Role</span><strong>{roles.find(r => r.id === formData.roleId)?.name || '—'}</strong></div>
                        <div className="pre-save-detail-row"><span>Work Mode</span><strong>{formData.workMode || '—'}</strong></div>
                        <div className="pre-save-detail-row"><span>Shift</span><strong>{formData.shiftType || '—'}</strong></div>
                        <div className="pre-save-detail-row"><span>Leader</span><strong>{formData.teamLeader || '—'}</strong></div>
                        <div className="pre-save-detail-row"><span>Joining</span><strong>{formData.joinDate ? fmtJoinDate(formData.joinDate) : '—'}</strong></div>
                        <div className="pre-save-detail-row"><span>Experience</span><strong>{formData.experience || '—'}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          <div className="form-panel-footer">
            <div className="wizard-footer-left">
              <button type="button" className="form-footer-ghost-btn" onClick={handleResetForm}>↺ Reset</button>
            </div>
            <div className="wizard-footer-buttons">
              {wizardStep > 1 && <Button variant="secondary" icon={ArrowLeft} onClick={handlePrevStep}>Back</Button>}
              {formMode === 'edit' && wizardStep < 7 && (
                <Button variant="secondary" icon={Save} loading={isSubmitting} onClick={handleFormSubmit}>Save Changes</Button>
              )}
              {wizardStep < 7 ? <Button variant="primary" onClick={handleNextStep} disabled={!isStepValid()}>Next Step</Button> : <Button variant="primary" loading={isSubmitting} onClick={handleFormSubmit}>{formMode === 'add' ? 'Create Employee' : 'Save Changes'}</Button>}
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Creation Success Modal ── */}
      {createdEmpInfo && (
        <div className="modal-overlay" onClick={() => setCreatedEmpInfo(null)}>
          <div className="emp-success-modal" onClick={e => e.stopPropagation()}>
            <div className="success-modal-header"><div className="success-checkmark-circle">✅</div><h3>Employee Added Successfully!</h3><p>Share credentials securely with the new employee.</p></div>
            <div className="success-credentials-card">
              <div className="cred-row"><span>Employee ID</span><strong className="cred-mono">{createdEmpInfo.id}</strong></div>
              <div className="cred-row"><span>Full Name</span><strong>{createdEmpInfo.name}</strong></div>
              <div className="cred-row"><span>Username</span><strong className="cred-mono">{createdEmpInfo.username || createdEmpInfo.id}</strong></div>
              <div className="cred-row"><span>Work Email</span><strong className="cred-mono">{createdEmpInfo.workEmail}</strong></div>
              <div className="cred-row"><span>Password</span><strong className="cred-password cred-mono">{createdEmpInfo.password}</strong></div>
              <div className="cred-row"><span>Department</span><strong>{createdEmpInfo.department}</strong></div>
              <div className="cred-row"><span>Role</span><strong>{createdEmpInfo.role}</strong></div>
            </div>
            <div className="success-modal-actions">
              <button className="success-btn success-btn-primary" onClick={() => { addToast('success', `Welcome email queued for ${createdEmpInfo.workEmail}`); setCreatedEmpInfo(null); }}>📧 Send Welcome Email</button>
              <button className="success-btn" onClick={() => { setIdCardEmployee(createdEmpInfo); setShowIdCard(true); setCreatedEmpInfo(null); }}>🪪 Download ID Card</button>
              <button className="success-btn success-btn-ghost" onClick={() => setCreatedEmpInfo(null)}>✕ Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Export Details Modal Form ── */}
      {isExportOpen && (
        <Modal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Comprehensive Employee Report"
        >
          <form onSubmit={handleExportSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Report Type</label>
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  value={exportOptions.reportType}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    reportType: e.target.value,
                    employeeId: e.target.value === 'All Employees' ? '' : exportOptions.employeeId || (employees[0]?.id || '')
                  })}
                >
                  <option value="All Employees">All Active Employees</option>
                  <option value="Specific Employee">Specific Employee</option>
                </select>
              </div>

              {exportOptions.reportType === 'Specific Employee' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select Employee</label>
                  <select
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    value={exportOptions.employeeId}
                    onChange={(e) => setExportOptions({ ...exportOptions, employeeId: e.target.value })}
                    required
                  >
                    <option value="">— Select Employee —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department} • {emp.designation || emp.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Date Scope (for Attendance & Logs)</label>
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  value={exportOptions.dateRange}
                  onChange={(e) => setExportOptions({ ...exportOptions, dateRange: e.target.value })}
                >
                  <option value="AllTime">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Weekly">Weekly (Last 7 Days)</option>
                  <option value="Monthly">Monthly (Last 30 Days)</option>
                  <option value="Yearly">Yearly (Last 365 Days)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Export Format</label>
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value })}
                >
                  <option value="CSV">Standard CSV File (.csv)</option>
                  <option value="Excel">Microsoft Excel Sheet (.xls)</option>
                  <option value="PDF">Adobe PDF Document (.pdf)</option>
                </select>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>📋 Report Includes:</strong>
                <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                  <span>✓ Profile & Employment Info</span>
                  <span>✓ Attendance Metrics</span>
                  <span>✓ Task Management Stats</span>
                  <span>✓ Leave Applications</span>
                  <span>✓ Daily Work Reports</span>
                  <span>✓ Productivity Scores</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <Button type="button" variant="ghost" onClick={() => setIsExportOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Compile & Export
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View SlideOver ── */}
      <SlideOver isOpen={slideOverOpen} onClose={() => setSlideOverOpen(false)} title="Employee Profile Detail">
        <div className="employee-detail-view animate-fade-in">
          <div className="detail-header-card"><Avatar name={formData.name} size="lg" src={uploadedDocs.profilePhoto ? (uploadedDocs.profilePhoto.downloadUrl || (uploadedDocs.profilePhoto instanceof Blob ? URL.createObjectURL(uploadedDocs.profilePhoto) : '')) : (formData.avatar || formData.photoUrl)} /><h3 className="detail-name">{formData.name}</h3><Badge variant={formData.status === 'Active' ? 'success' : formData.status === 'On Leave' ? 'warning' : 'danger'}>{formData.status}</Badge></div>
          <div className="detail-section-group"><h4 className="detail-group-title">Personal Information</h4><div className="detail-grid"><div className="detail-item"><label>Email Address</label><span>{formData.email}</span></div><div className="detail-item"><label>Phone Number</label><span>{formData.phone}</span></div><div className="detail-item"><label>Date of Birth</label><span>{formData.dob || 'Not set'}</span></div><div className="detail-item"><label>Gender</label><span>{formData.gender}</span></div></div></div>
          <div className="detail-section-group"><h4 className="detail-group-title">Work Information</h4><div className="detail-grid"><div className="detail-item"><label>Employee ID</label><span>{formData.id}</span></div><div className="detail-item"><label>Department</label><span>{formData.department}</span></div><div className="detail-item"><label>Branch Location</label><span>{formData.branch}</span></div><div className="detail-item"><label>Assigned Team</label><span>{formData.team || 'None'}</span></div><div className="detail-item"><label>Designation / Role</label><span>{formData.role}</span></div><div className="detail-item"><label>Joining Date</label><span>{fmtJoinDate(formData.joinDate)}</span></div></div></div>
        </div>
      </SlideOver>

      {/* ── ID Card Modal ── */}
      {showIdCard && idCardEmployee && (
        <div className="id-card-overlay" onClick={() => { setShowIdCard(false); setIdCardEmployee(null); }}>
          <div className="id-card-modal" onClick={e => e.stopPropagation()}>
            <button className="id-card-close" onClick={() => { setShowIdCard(false); setIdCardEmployee(null); }}>✕</button>
            <div className="id-card-render-wrapper" ref={idCardRef}>
              <div className="id-card-front">
                <div className="id-card-logo-area"><svg viewBox="0 0 100 100" width="22" height="22" className="id-card-logo-svg"><polygon points="50,15 85,50 50,85 15,50" fill="none" stroke="var(--color-primary)" strokeWidth="8" /><polygon points="50,28 72,50 50,72 28,50" fill="var(--color-primary)" /></svg><div className="id-card-company-title">{idCardEmployee.companyName || generalSettings?.companyName || 'OMS Enterprise'}</div><div className="id-card-company-subtitle">{idCardEmployee.branch ? (idCardEmployee.branch.toLowerCase().includes('branch') ? idCardEmployee.branch : `${idCardEmployee.branch} Branch`) : 'Gatecode OMS'}</div></div>
                <div className="id-card-photo-wrap"><Avatar name={idCardEmployee.name} size="xl" className="id-card-photo-img" src={idCardEmployee.avatar || idCardEmployee.photoUrl} /></div>
                <div className="id-card-name-area"><h2 className="id-card-emp-name">{renderName(idCardEmployee.name)}</h2><p className="id-card-emp-role">{idCardEmployee.designation || idCardEmployee.role}</p></div>
                <div className="id-card-details-grid"><div className="id-detail-label">ID NO</div><div className="id-detail-colon">:</div><div className="id-detail-value">{idCardEmployee.id}</div>{idCardEmployee.roleId !== 'manager' && (<><div className="id-detail-label">Dept.</div><div className="id-detail-colon">:</div><div className="id-detail-value">{idCardEmployee.department}</div></>)}<div className="id-detail-label">Deg.</div><div className="id-detail-colon">:</div><div className="id-detail-value">{idCardEmployee.designation || idCardEmployee.role}</div></div>
              </div>
              <div className="id-card-back">
                <div className="id-card-back-bullets"><div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p>This card is the official property of {idCardEmployee.companyName || generalSettings?.companyName || 'OMS Enterprise'} and must be returned on demand.</p></div><div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p>If found, please return to the HR Department or dynamic branch address below immediately.</p></div><div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p style={{ fontWeight: 600 }}>Branch Address: {idCardEmployee.branchAddress || getBranchAddress(idCardEmployee.branch, dbBranches)}</p></div></div>
                <div className="id-card-back-middle"><div className="id-card-back-dates"><div className="id-date-row"><span className="id-date-label">Join Date:</span><span className="id-date-val">{fmtJoinDate(idCardEmployee.joinDate)}</span></div><div className="id-date-row"><span className="id-date-label">Expire Date:</span><span className="id-date-val">{idCardEmployee.contractEndDate ? fmtJoinDate(idCardEmployee.contractEndDate) : calculateExpiry(idCardEmployee.joinDate)}</span></div><div className="id-card-barcode-area"><svg viewBox="0 0 100 20" className="id-card-barcode-svg"><rect x="0" y="0" width="3" height="20" fill="#0f172a" /><rect x="5" y="0" width="1" height="20" fill="#0f172a" /><rect x="8" y="0" width="2" height="20" fill="#0f172a" /><rect x="12" y="0" width="4" height="20" fill="#0f172a" /><rect x="18" y="0" width="1" height="20" fill="#0f172a" /><rect x="21" y="0" width="2" height="20" fill="#0f172a" /><rect x="25" y="0" width="3" height="20" fill="#0f172a" /><rect x="30" y="0" width="1" height="20" fill="#0f172a" /><rect x="33" y="0" width="2" height="20" fill="#0f172a" /><rect x="37" y="0" width="5" height="20" fill="#0f172a" /><rect x="44" y="0" width="1" height="20" fill="#0f172a" /><rect x="47" y="0" width="3" height="20" fill="#0f172a" /><rect x="52" y="0" width="2" height="20" fill="#0f172a" /><rect x="56" y="0" width="4" height="20" fill="#0f172a" /><rect x="62" y="0" width="1" height="20" fill="#0f172a" /><rect x="65" y="0" width="2" height="20" fill="#0f172a" /><rect x="69" y="0" width="3" height="20" fill="#0f172a" /><rect x="74" y="0" width="1" height="20" fill="#0f172a" /><rect x="77" y="0" width="2" height="20" fill="#0f172a" /><rect x="81" y="0" width="5" height="20" fill="#0f172a" /><rect x="88" y="0" width="1" height="20" fill="#0f172a" /><rect x="91" y="0" width="3" height="20" fill="#0f172a" /><rect x="96" y="0" width="2" height="20" fill="#0f172a" /></svg><div className="id-card-barcode-text">*{idCardEmployee.id}*</div></div></div><div className="id-card-back-qr"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({ employeeId: idCardEmployee.id, companyId: idCardEmployee.companyId || 'COMP-A' }))}`} alt="QR Code" width="95" height="95" className="id-card-qr-img" style={{ display: 'block', borderRadius: '4px' }} /><span className="id-qr-label">SCAN ME</span></div></div>
                <div className="id-card-back-signature-area"><div className="id-signature-font">{idCardEmployee.teamLeader || idCardEmployee.reportingManager || 'Authorized Signatory'}</div><div className="id-signature-line"></div><div className="id-signature-label">Authorized Signatory</div></div>
              </div>
            </div>
            <button className="id-card-download-btn" onClick={downloadIdCard}><Download size={16} /> Download ID Cards</button>
          </div>
        </div>
      )}
      {/* ── Deactivation Wizard Modal ── */}
      {deactivatingEmployee && (
        <div className="id-card-overlay" style={{ zIndex: 1100 }}>
          <div className="id-card-modal" style={{ width: '480px', maxWidth: '90%', padding: '24px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <div className="flex-row justify-between align-center mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Deactivate Employee Wizard</h3>
              <button onClick={() => setDeactivatingEmployee(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid var(--color-danger, #ef4444)' }}>
              Deactivating <strong>{deactivatingEmployee.name} ({deactivatingEmployee.id})</strong>. This will block their system access and disconnect all active socket sessions immediately.
            </div>

            {deactivateStep === 1 && (
              <div className="flex-column" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Exit Date</label>
                  <input
                    type="date"
                    value={exitFormData.exitDate}
                    onChange={e => setExitFormData(prev => ({ ...prev, exitDate: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Last Working Day</label>
                  <input
                    type="date"
                    value={exitFormData.lastWorkingDay}
                    onChange={e => setExitFormData(prev => ({ ...prev, lastWorkingDay: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Exit Reason</label>
                  <select
                    value={exitFormData.exitReason}
                    onChange={e => setExitFormData(prev => ({ ...prev, exitReason: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                  >
                    <option value="Resignation">Resignation</option>
                    <option value="Termination">Termination</option>
                    <option value="Contract End">Contract End</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Abandonment">Abandonment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Exit Notes (Optional)</label>
                  <textarea
                    placeholder="Enter additional exit remarks..."
                    value={exitFormData.exitNotes}
                    onChange={e => setExitFormData(prev => ({ ...prev, exitNotes: e.target.value }))}
                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', width: '100%', minHeight: '80px', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setDeactivatingEmployee(null)} className="success-btn" style={{ padding: '8px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => setDeactivateStep(2)} className="success-btn success-btn-primary" style={{ padding: '8px 16px', background: 'var(--color-primary-dark)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Work Check</button>
                </div>
              </div>
            )}

            {deactivateStep === 2 && (
              <div className="flex-column" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {checkingOpenWork ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div className="loading-spinner"></div>
                    <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Checking pending tasks & projects...</p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <strong>Pending Work Summary:</strong>
                      <ul style={{ margin: '8px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                        <li>Pending Tasks: {openWork?.pendingTasks?.length || 0}</li>
                        <li>Active Projects: {openWork?.activeProjects?.length || 0}</li>
                        <li>Future Meetings: {openWork?.futureEvents?.length || 0}</li>
                      </ul>
                    </div>

                    {((openWork?.pendingTasks?.length > 0) || (openWork?.activeProjects?.length > 0)) ? (
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', background: 'var(--bg-elevated)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--color-warning, #f59e0b)', fontSize: '0.8rem', fontWeight: 700 }}>
                          <AlertTriangle size={16} /> Reassignment Required
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                          This employee is currently associated with active tasks or projects. You must select an active employee to inherit their workload before completing deactivation.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assign All Work To</label>
                          <select
                            value={reassignTarget}
                            onChange={e => setReassignTarget(e.target.value)}
                            style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-primary)', width: '100%', outline: 'none' }}
                          >
                            <option value="">-- Select Active Employee --</option>
                            {employees.filter(e => e.id !== deactivatingEmployee.id && e.accountStatus === 'Active').map(e => (
                              <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success, #10b981)', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.05)', padding: '10px 12px', borderRadius: '6px' }}>
                        <CheckCircle size={16} /> No active tasks or projects. Ready to deactivate.
                      </div>
                    )}

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => setDeactivateStep(1)} className="success-btn" style={{ padding: '8px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
                      <button
                        onClick={submitDeactivation}
                        disabled={reassignSubmit || (((openWork?.pendingTasks?.length > 0) || (openWork?.activeProjects?.length > 0)) && !reassignTarget)}
                        className="success-btn success-btn-danger"
                        style={{ padding: '8px 16px', background: 'var(--color-danger, #ef4444)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (reassignSubmit || (((openWork?.pendingTasks?.length > 0) || (openWork?.activeProjects?.length > 0)) && !reassignTarget)) ? 0.6 : 1 }}
                      >
                        {reassignSubmit ? 'Deactivating...' : 'Complete Deactivation'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;