import React, { useState, useMemo } from 'react';
import './Payroll.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  DollarSign,
  Landmark,
  CheckCircle,
  Receipt,
  FileText,
  Clock,
  Briefcase,
  Users,
  TrendingUp,
  Percent,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  Award,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Settings,
  HelpCircle,
  Download,
  Mail,
  Eye,
  Check,
  X,
  FileDown,
  MinusCircle,
  MessageSquare,
  Send,
  Paperclip,
  Shield,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Payroll = () => {
  const isLoading = usePageLoading(600);
  const {
    employees,
    departments,
    branches,
    runPayroll,
    showConfirm,
    currentUserRole,
    currentUser,
    payrollGrades,
    payrollReimbursements,
    payrollLoans,
    payrollAdvances,
    payrollBonuses,
    payrollPayments,
    payrollConfigs,
    activityLogs,
    addOrUpdateSalaryGrade,
    deleteSalaryGrade,
    createLoanOrAdvance,
    updateLoanAdvanceStatus,
    recommendBonus,
    updateBonusStatus,
    processPayrollCalculations,
    bulkUpdatePayrollStatus,
    updateSinglePayrollStatus,
    toggleEmployeeTaxRegime,
    savePayrollSalaryRevision,
    hasPermission,
    attendance,
    fetchAttendance,
    monthlyPayrollSummary,
    fetchMonthlyPayrollSummary,
    payrollQueries,
    fetchPayrollQueries,
    createPayrollQuery,
    addQueryReply,
    updateQueryStatus,
    addQueryInternalNote,
    fetchPayrollData,
    token
  } = useApp();

  const resolveEmployee = React.useCallback((empId, empName) => {
    if (!employees || employees.length === 0) return null;
    return employees.find(e => 
      (empId && (e.id === empId || e.employeeId === empId || e.employeeCode === empId)) ||
      (empName && e.name && e.name.toLowerCase().replace(/\s+/g, ' ') === empName.toLowerCase().replace(/\s+/g, ' '))
    );
  }, [employees]);

  // Selected Month/Year
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');

  const [perspective, setPerspective] = useState(() => {
    if (currentUserRole === 'employee') return 'self';
    const hasCompanyRead = hasPermission('payroll_management', 'read', 'company');
    const hasSelfRead = hasPermission('payroll_management', 'read', 'self');

    const saved = localStorage.getItem('perspective_payroll');
    if (saved === 'self' && hasSelfRead) return 'self';
    if (saved === 'company' && hasCompanyRead) return 'company';

    return hasCompanyRead ? 'company' : 'self';
  });

  const showPerspectiveDropdown = useMemo(() => {
    if (currentUserRole === 'employee') return false;
    const hasCompanyRead = hasPermission('payroll_management', 'read', 'company');
    const hasSelfRead = hasPermission('payroll_management', 'read', 'self');
    return hasCompanyRead && hasSelfRead;
  }, [currentUserRole, hasPermission]);

  React.useEffect(() => {
    if (currentUserRole !== 'employee') {
      localStorage.setItem('perspective_payroll', perspective);
    }
  }, [perspective, currentUserRole]);

  React.useEffect(() => {
    if (currentUserRole === 'employee') {
      setPerspective('self');
    } else {
      const hasCompanyRead = hasPermission('payroll_management', 'read', 'company');
      const hasSelfRead = hasPermission('payroll_management', 'read', 'self');
      const saved = localStorage.getItem('perspective_payroll');
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

  const [activeTab, setActiveTab] = useState('processing');
  const [recalcPreviewData, setRecalcPreviewData] = useState(null);
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [isSubmittingRecalc, setIsSubmittingRecalc] = useState(false);
  const [selectedAdjustmentType, setSelectedAdjustmentType] = useState('apply_current');

  React.useEffect(() => {
    fetchAttendance();
    fetchPayrollQueries();
    fetchPayrollData();
  }, []);

  React.useEffect(() => {
    const monthStr = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    }[month] || '06';
    fetchMonthlyPayrollSummary(`${year}-${monthStr}`);
  }, [month, year]);

  React.useEffect(() => {
    if (perspective === 'self') {
      setActiveTab('processing');
    } else {
      setActiveTab('dashboard');
    }
  }, [perspective]);

  React.useEffect(() => {
    if (currentUser?.branch && currentUserRole !== 'super_admin' && perspective !== 'super_admin') {
      setFilterBranch(currentUser.branch);
    } else {
      setFilterBranch('');
    }
  }, [currentUser, currentUserRole, perspective]);

  // --- Search & Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Selected Employee for Detail drawer/view
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  // Payslip Preview Modal State
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [payslipEmpId, setPayslipEmpId] = useState(null);

  // Toast notification state inside page
  const [pageToasts, setPageToasts] = useState([]);
  const addPageToast = (type, message) => {
    const id = Date.now();
    setPageToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setPageToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- Database values destructured with local fallbacks ---
  const salaryGrades = payrollGrades || [];
  const reimbursements = payrollReimbursements || [];
  const loans = payrollLoans || [];
  const advances = payrollAdvances || [];
  const bonuses = payrollBonuses || [];
  const payrollState = payrollPayments || [];

  // Payroll Queries states
  const [activeQueryTicket, setActiveQueryTicket] = useState(null);
  const [showRaiseQueryForm, setShowRaiseQueryForm] = useState(false);
  const [queryFormState, setQueryFormState] = useState({
    category: 'Incorrect Salary Amount',
    subject: '',
    description: '',
    priority: 'Medium',
    attachments: []
  });
  const [newCommentText, setNewCommentText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [queryStatusFilter, setQueryStatusFilter] = useState('All');
  const [querySearchTerm, setQuerySearchTerm] = useState('');

  // Form states for creating/editing salary grade
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    id: '', grade: '', payBand: '', basic: 0, hra: 0, travel: 0, medical: 0, special: 0, pf: 0, esi: 0, pt: 200, tdsRate: 10, effectiveDate: ''
  });

  // Form states for Loan/Advance
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyType, setApplyType] = useState('Loan'); // Loan or Advance
  const [applyForm, setApplyForm] = useState({
    employeeId: '', type: 'Personal Loan', amount: 10000, emi: 1000, recoverySchedule: '10 Months'
  });

  // Salary Revision Modal States
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionEmpId, setRevisionEmpId] = useState('');
  const [revisionBasic, setRevisionBasic] = useState('');

  // Form states for Bonus Recommendation
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusForm, setBonusForm] = useState({
    employeeId: '', type: 'Performance Bonus', amount: 10000
  });

  // Automatically initialize first employeeId on load
  React.useEffect(() => {
    if (employees && employees.length > 0) {
      if (!applyForm.employeeId) {
        setApplyForm(prev => ({ ...prev, employeeId: employees[0].id }));
      }
      if (!bonusForm.employeeId) {
        setBonusForm(prev => ({ ...prev, employeeId: employees[0].id }));
      }
    }
  }, [employees]);

  // Derived Configurations
  const attendanceConfigs = useMemo(() => ({
    leaveDeductionRate: payrollConfigs?.leaveDeductionRate ?? 0,
    lateArrivalPenalty: payrollConfigs?.lateArrivalPenalty ?? 0,
    overtimeHourlyRate: payrollConfigs?.overtimeHourlyRate ?? 0
  }), [payrollConfigs]);

  const taxProfiles = useMemo(() => payrollConfigs?.taxProfiles || {}, [payrollConfigs]);
  const attendanceDaysMap = useMemo(() => payrollConfigs?.attendanceDaysMap || {}, [payrollConfigs]);
  const salaryStructures = useMemo(() => payrollConfigs?.salaryStructures || {}, [payrollConfigs]);

  const timelineDeadlines = useMemo(() => {
    return payrollConfigs?.timelineDeadlines || {
      reimbursementCutoff: 20,
      attendanceVerification: 25,
      payrollProcessing: 28,
      salaryDisbursement: 30
    };
  }, [payrollConfigs]);

  const complianceSchedules = useMemo(() => {
    return payrollConfigs?.complianceSchedules || [
      { id: 'tds_deposit', title: 'Monthly TDS Deposit Due', day: 7, monthOffset: 1, info: 'Challan ITNS 281' },
      { id: 'pf_esi_filing', title: 'PF & ESI Filing Deadline', day: 15, monthOffset: 1, info: 'Form 5 & Form 10' },
      { id: 'tds_return_q1', title: 'TDS Return Filing (Q1)', day: 31, monthOffset: 1, info: 'Form 24Q Submission • FY 2026-27' }
    ];
  }, [payrollConfigs]);

  const complianceNotices = useMemo(() => {
    return payrollConfigs?.complianceNotices || [
      'Submission window for Q1 Investment Proofs is currently open.',
      'Penalty for late TDS return filing is ₹200 per day under Section 234E.'
    ];
  }, [payrollConfigs]);

  const auditLogs = useMemo(() => {
    return (activityLogs || [])
      .filter(log => log.module === 'Payroll')
      .map(log => ({
        id: log.id,
        user: log.employeeName || 'System',
        action: log.action,
        prevVal: log.details || '-',
        newVal: log.target || '-',
        timestamp: log.timestamp
      }));
  }, [activityLogs]);

  const scopedPayrollState = useMemo(() => {
    // 1. Filter database payments by the selected month and year
    const monthlyPayments = payrollState.filter(p => p.month === month && p.year === year);
    
    // 2. Map over all active employees: use the saved payment record if it exists, otherwise generate a draft record
    if (!employees || employees.length === 0) return [];
    
    const activeState = employees
      .filter(emp => emp.status !== 'Inactive')
      .map(emp => {
        const savedPayment = monthlyPayments.find(p => 
          p.employeeId === emp.id || 
          p.employeeId === emp.employeeId || 
          p.employeeId === emp.employeeCode || 
          (p.employeeName && emp.name && p.employeeName.toLowerCase().replace(/\s+/g, ' ') === emp.name.toLowerCase().replace(/\s+/g, ' '))
        );
        if (savedPayment && savedPayment.netSalary > 0) {
          return savedPayment;
        }

        const empBasicSalary = Number(emp.salaryAmount) || 0;
        const struct = salaryStructures[emp.id] || {
          basic: empBasicSalary,
          hra: 0,
          travel: 0,
          medical: 0,
          special: 0,
          pf: 0,
          esi: 0,
          pt: 0,
          tds: 0
        };
        const basicSalary = struct.basic || empBasicSalary;
        const totalAllowances = (struct.hra || 0) + (struct.travel || 0) + (struct.medical || 0) + (struct.special || 0);
        const statutoryDeductions = (struct.pf || 0) + (struct.esi || 0) + (struct.pt || 0) + (struct.tds || 0);
        const grossSalary = basicSalary + totalAllowances;
        const netSalary = Math.max(0, grossSalary - statutoryDeductions);
        return {
          id: `${emp.id}-${month}-${year}`,
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department || '-',
          designation: emp.designation || '-',
          branch: emp.branch || '-',
          month,
          year,
          status: 'Hold',
          basicSalary,
          grossSalary,
          totalDeductions: statutoryDeductions,
          netSalary,
          overtimeAmount: 0,
          bonusAmount: 0,
          reimbursementAmount: 0,
          loanEMI: 0,
          advanceDeduct: 0,
          leaveDeductions: 0,
          lateDeductions: 0,
          statutoryDeductions,
          hra: struct.hra || 0,
          travel: struct.travel || 0,
          medical: struct.medical || 0,
          special: struct.special || 0,
          pf: struct.pf || 0,
          esi: struct.esi || 0,
          pt: struct.pt || 0,
          tds: struct.tds || 0
        };
      });

    if (perspective === 'self') {
      return activeState.filter(p => p.employeeId === currentUser?.id);
    }
    if (!currentUserRole || currentUserRole === 'super_admin' || currentUserRole === 'company_admin') return activeState;
    return activeState.filter(p => {
      const emp = resolveEmployee(p.employeeId, p.employeeName);
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        if (currentUser?.branch) {
          return emp?.branch === currentUser?.branch;
        }
        return emp?.department === currentUser?.department;
      }
      if (currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [payrollState, employees, currentUser, currentUserRole, perspective, month, year, salaryStructures, resolveEmployee]);

  const scopedReimbursements = useMemo(() => {
    if (perspective === 'self') {
      return reimbursements.filter(r => r.employeeId === currentUser?.id);
    }
    if (!currentUserRole || currentUserRole === 'super_admin' || currentUserRole === 'company_admin') return reimbursements;
    return reimbursements.filter(r => {
      const emp = resolveEmployee(r.employeeId, r.employeeName);
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        if (currentUser?.branch) {
          return emp?.branch === currentUser?.branch;
        }
        return emp?.department === currentUser?.department;
      }
      if (currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [reimbursements, employees, currentUser, currentUserRole, perspective, resolveEmployee]);
 
  const scopedLoans = useMemo(() => {
    if (perspective === 'self') {
      return loans.filter(l => l.employeeId === currentUser?.id);
    }
    if (!currentUserRole || currentUserRole === 'super_admin' || currentUserRole === 'company_admin') return loans;
    return loans.filter(l => {
      const emp = resolveEmployee(l.employeeId, l.employeeName);
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        if (currentUser?.branch) {
          return emp?.branch === currentUser?.branch;
        }
        return emp?.department === currentUser?.department;
      }
      if (currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [loans, employees, currentUser, currentUserRole, perspective, resolveEmployee]);
 
  const scopedAdvances = useMemo(() => {
    if (perspective === 'self') {
      return advances.filter(a => a.employeeId === currentUser?.id);
    }
    if (!currentUserRole || currentUserRole === 'super_admin' || currentUserRole === 'company_admin') return advances;
    return advances.filter(a => {
      const emp = resolveEmployee(a.employeeId, a.employeeName);
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        if (currentUser?.branch) {
          return emp?.branch === currentUser?.branch;
        }
        return emp?.department === currentUser?.department;
      }
      if (currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [advances, employees, currentUser, currentUserRole, perspective, resolveEmployee]);
 
  const scopedBonuses = useMemo(() => {
    if (perspective === 'self') {
      return bonuses.filter(b => b.employeeId === currentUser?.id);
    }
    if (!currentUserRole || currentUserRole === 'super_admin' || currentUserRole === 'company_admin') return bonuses;
    return bonuses.filter(b => {
      const emp = resolveEmployee(b.employeeId, b.employeeName);
      if (currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        if (currentUser?.branch) {
          return emp?.branch === currentUser?.branch;
        }
        return emp?.department === currentUser?.department;
      }
      if (currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [bonuses, employees, currentUser, currentUserRole, perspective, resolveEmployee]);

  const scopedAuditLogs = useMemo(() => {
    if (perspective === 'self') {
      return auditLogs.filter(log => log.user === currentUser?.name);
    }
    if (!currentUserRole || currentUserRole === 'super_admin' || currentUserRole === 'company_admin') return auditLogs;
    return auditLogs;
  }, [auditLogs, currentUser, currentUserRole, perspective]);

  const monthMap = useMemo(() => ({
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12'
  }), []);

  // --- Dynamic Calendar & Timeline Helpers ---
  const getTimelineDate = (day) => {
    const monthNum = parseInt(monthMap[month] || '06') - 1;
    const yrNum = parseInt(year || '2026');
    const maxDays = new Date(yrNum, monthNum + 1, 0).getDate();
    const actualDay = Math.min(day, maxDays);
    return new Date(yrNum, monthNum, actualDay);
  };

  const formatTimelineDate = (day) => {
    const d = getTimelineDate(day);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getStageStatus = (stageIndex, deadlines) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stages = [
      { key: 'reimbursementCutoff', day: deadlines.reimbursementCutoff ?? 20 },
      { key: 'attendanceVerification', day: deadlines.attendanceVerification ?? 25 },
      { key: 'payrollProcessing', day: deadlines.payrollProcessing ?? 28 },
      { key: 'salaryDisbursement', day: deadlines.salaryDisbursement ?? 30 }
    ];

    const currentStageDate = getTimelineDate(stages[stageIndex].day);
    currentStageDate.setHours(0, 0, 0, 0);

    if (today.getTime() > currentStageDate.getTime()) {
      return { text: 'Passed', variant: 'success', className: 'step-passed' };
    }

    let isActive = false;
    if (stageIndex === 0) {
      isActive = today.getTime() <= currentStageDate.getTime();
    } else {
      const prevStageDate = getTimelineDate(stages[stageIndex - 1].day);
      prevStageDate.setHours(0, 0, 0, 0);
      isActive = today.getTime() > prevStageDate.getTime() && today.getTime() <= currentStageDate.getTime();
    }

    if (isActive) {
      return { text: 'In Progress', variant: 'warning', className: 'step-active' };
    }

    const labels = ['Scheduled', 'Scheduled', 'Scheduled', 'Disbursement'];
    return { text: labels[stageIndex], variant: 'secondary', className: '' };
  };

  const getComplianceDate = (item) => {
    const monthNum = parseInt(monthMap[month] || '06') - 1;
    const yrNum = parseInt(year || '2026');
    const targetMonth = monthNum + (item.monthOffset || 0);
    return new Date(yrNum, targetMonth, item.day);
  };

  const formatComplianceMonth = (item) => {
    const d = getComplianceDate(item);
    return d.toLocaleDateString('en-US', { month: 'short' });
  };

  const formatComplianceDay = (item) => {
    const d = getComplianceDate(item);
    return String(d.getDate()).padStart(2, '0');
  };

  const getDaysRemaining = (item) => {
    const targetDate = getComplianceDate(item);
    const today = new Date();
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDaysRemaining = (item) => {
    const days = getDaysRemaining(item);
    if (days > 0) {
      return `Due in ${days} Days`;
    } else if (days === 0) {
      return `Due Today`;
    } else {
      return `Overdue by ${Math.abs(days)} Days`;
    }
  };

  // --- Dynamic Calculator Engine logic ---
  const calculatedPayrollData = useMemo(() => {
    return scopedPayrollState.map(p => {
      // If this is a saved, processed database record, do not recalculate/overwrite it!
      if (p._id || p.createdAt) {
        const basic = p.basicSalary || 0;
        
        // If these exist on the database document (saved real-time values), use them!
        // Otherwise, fall back to standard calculations for backward compatibility.
        const hra = p.hra !== undefined && p.hra !== null ? p.hra : Math.round(basic * 0.4);
        const travel = p.travel !== undefined && p.travel !== null ? p.travel : 0;
        const medical = p.medical !== undefined && p.medical !== null ? p.medical : 0;
        const pf = p.pf !== undefined && p.pf !== null ? p.pf : Math.round(basic * 0.12);
        const tds = p.tds !== undefined && p.tds !== null ? p.tds : Math.round(basic * 0.1);
        const pt = p.pt !== undefined && p.pt !== null ? p.pt : 200;
        const esi = p.esi !== undefined && p.esi !== null ? p.esi : 0;
        
        const special = p.special !== undefined && p.special !== null ? p.special : Math.max(0, (p.grossSalary || 0) - basic - hra - (p.overtimeAmount || 0) - (p.bonusAmount || 0));

        return {
          ...p,
          branch: p.branch || '-',
          department: p.department || '-',
          designation: p.designation || '-',
          basicSalary: basic,
          grossSalary: p.grossSalary,
          totalDeductions: p.totalDeductions,
          netSalary: p.netSalary,
          hra,
          special,
          travel,
          medical,
          pf,
          esi,
          pt,
          tds,
          pan: p.pan || '-',
          regime: p.regime || 'New',
          bankName: p.bankName || '-',
          bankAccount: p.bankAccount || '-',
          bankIfsc: p.bankIfsc || '-',
          paidLeaveDays: p.paidLeaveDays || 0,
          unpaidLeaveDays: p.unpaidLeaveDays || 0
        };
      }

      const empId = p.employeeId;
      const emp = resolveEmployee(p.employeeId, p.employeeName);

      const empBasicSalary = Number(emp?.salaryAmount) || 0;
      const struct = salaryStructures[empId] || {
        basic: empBasicSalary,
        hra: Number(emp?.hra) || 0,
        travel: Number(emp?.travel) || 0,
        medical: Number(emp?.medical) || 0,
        special: Number(emp?.special) || 0,
        pf: Math.round(empBasicSalary * 0.12),
        esi: 0,
        pt: 200,
        tds: Math.round(empBasicSalary * 0.1)
      };

      const monthStr = monthMap[month] || '06';
      const prefix = `${year}-${monthStr}`;
      const empRecords = (attendance || []).filter(
        a => a.employeeId === empId && a.date && a.date.startsWith(prefix)
      );

      // Expose attendance aggregates
      const summary = (monthlyPayrollSummary && monthlyPayrollSummary[empId]) || {
        presentDays: 0, halfDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, holidays: 0, weekends: 0
      };

      // Resolve payroll rules configuration
      const configWorkingDays = Number(payrollConfigs?.payrollWorkingDays) || 30;
      const configMethod = payrollConfigs?.salaryCalculationMethod || 'Fixed 30 Days';
      const configHalfDayPolicy = payrollConfigs?.halfDayPolicy || 'Deduct Half Day';
      const configGraceRules = payrollConfigs?.graceRules || 'Late Penalty Flat';

      // 1. Calculate Payroll Working Days
      let workingDays = configWorkingDays;
      const monthNum = parseInt(monthStr);
      const yrNum = parseInt(year || '2026');
      const calendarDays = new Date(yrNum, monthNum, 0).getDate();

      if (configMethod === 'Calendar Days') {
        workingDays = calendarDays;
      } else if (configMethod === 'Actual Working Days') {
        workingDays = calendarDays - (summary.weekends || 0) - (summary.holidays || 0);
      }

      // 2. Daily Salary Rate
      const dailySalary = Math.round(empBasicSalary / Math.max(1, workingDays));

      // 3. Unpaid/excess leave days (including half-day deduction if applicable)
      let unpaidDays = summary.unpaidLeaveDays || 0;
      if (configHalfDayPolicy === 'Deduct Half Day') {
        unpaidDays += (summary.halfDays || 0) * 0.5;
      }

      // 4. LOP Leave Deduction
      const leaveDeduction = Math.round(dailySalary * unpaidDays);

      // 5. Late Arrival penalty
      const lateArrivalsCount = empRecords.filter(a => a.status === 'Late').length;
      const lateDeduction = configGraceRules === 'Late Penalty Flat' ? lateArrivalsCount * (payrollConfigs.lateArrivalPenalty || 300) : 0;

      // 6. Overtime pay
      const overtimeHoursCount = empRecords.reduce((sum, a) => sum + (parseFloat(a.overtime) || 0), 0);
      const overtimePay = overtimeHoursCount * (payrollConfigs.overtimeHourlyRate || 500);

      // 7. Allowances Sum
      const totalAllowances = (struct.hra || 0) + (struct.travel || 0) + (struct.medical || 0) + (struct.special || 0);

      // Bonuses
      const approvedBonuses = bonuses
        .filter(b => b.employeeId === empId && (b.status === 'Super Admin Approved' || b.status === 'Released'))
        .reduce((sum, curr) => sum + curr.amount, 0);

      // Reimbursements
      const approvedReimbursements = reimbursements
        .filter(r => r.employeeId === empId && (r.status === 'Approved' || r.status === 'Released'))
        .reduce((sum, curr) => sum + curr.amount, 0);

      // Deductions (loans / advances)
      const loanEMI = loans
        .filter(l => l.employeeId === empId && l.status === 'Approved')
        .reduce((sum, curr) => sum + curr.emi, 0);

      const advanceDeduct = advances
        .filter(a => a.employeeId === empId && a.status === 'Approved')
        .reduce((sum, curr) => sum + curr.amount, 0);

      // Statutory Deductions
      const pfDeduction = emp?.pfContribution !== false ? (struct.pf || 0) : 0;
      const statutoryDeductions = pfDeduction + (struct.esi || 0) + (struct.pt || 0) + (struct.tds || 0);

      // Total Deductions
      const totalDeductions = statutoryDeductions + leaveDeduction + lateDeduction + loanEMI + advanceDeduct;

      // Gross Salary
      const grossSalary = (struct.basic || empBasicSalary) + totalAllowances + overtimePay + approvedBonuses;

      // Net Salary
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      return {
        ...p,
        branch: (emp?.branch || p.branch || '-').trim(),
        department: (emp?.department || p.department || '-').trim(),
        designation: (emp?.designation || p.designation || '-').trim(),
        basicSalary: struct.basic || empBasicSalary,
        grossSalary,
        attendanceDays: summary.presentDays + summary.paidLeaveDays + (summary.halfDays * (configHalfDayPolicy === 'Deduct Half Day' ? 0.5 : 1)),
        paidLeaveDays: summary.paidLeaveDays,
        unpaidLeaveDays: unpaidDays,
        leaveDeductions: leaveDeduction,
        lateDeductions: lateDeduction,
        statutoryDeductions,
        loanEMI,
        advanceDeduct,
        overtimeAmount: overtimePay,
        bonusAmount: approvedBonuses,
        reimbursementAmount: approvedReimbursements,
        totalDeductions,
        netSalary,
        bankName: emp?.bank?.bankName || struct.bankName || '-',
        bankAccount: emp?.bank?.accountNumber || struct.bankAccountNumber || '-',
        bankIfsc: emp?.bank?.ifsc || struct.bankIfscCode || '-',
        pan: emp?.panNumber || taxProfiles[empId]?.pan || '-',
        regime: taxProfiles[empId]?.regime || '-',
        hra: struct.hra || 0,
        travel: struct.travel || 0,
        medical: struct.medical || 0,
        special: struct.special || 0,
        pf: pfDeduction,
        esi: struct.esi || 0,
        pt: struct.pt || 0,
        tds: struct.tds || 0
      };
    });
  }, [payrollState, salaryStructures, attendance, month, year, monthMap, bonuses, reimbursements, loans, advances, attendanceConfigs, taxProfiles, employees, resolveEmployee, monthlyPayrollSummary, payrollConfigs]);

  const employeeMonthlyPayslips = useMemo(() => {
    if (!currentUser?.id) return {};

    const months = ['June', 'May', 'April', 'March', 'February', 'January'];
    const result = {};

    months.forEach(m => {
      // 1. Find if there is a saved/released payment for this month in payrollState
      const saved = payrollState.find(p => p.month === m && p.year === year && (
        p.employeeId === currentUser.id ||
        (p.employeeName && currentUser.name && p.employeeName.toLowerCase() === currentUser.name.toLowerCase())
      ));

      if (saved && saved.netSalary > 0) {
        result[m] = {
          netSalary: saved.netSalary,
          status: saved.status,
          exists: true
        };
        return;
      }

      // 2. Otherwise calculate on the fly for this month
      // Resolve employee
      const emp = employees?.find(e => e.id === currentUser.id) || currentUser;
      const empBasicSalary = Number(emp?.salaryAmount) || 0;
      const struct = salaryStructures[emp.id || currentUser.id] || {
        basic: empBasicSalary, hra: 0, travel: 0, medical: 0, special: 0, pf: 0, esi: 0, pt: 0, tds: 0
      };

      const monthStr = monthMap[m] || '06';
      const prefix = `${year}-${monthStr}`;
      const empRecords = (attendance || []).filter(
        a => a.employeeId === (emp.id || currentUser.id) && a.date && a.date.startsWith(prefix)
      );

      let absentCount = 0;
      let lateArrivalsCount = 0;
      let overtimeHoursCount = 0;

      if (empRecords.length > 0) {
        absentCount = empRecords.filter(a => a.status === 'Absent').length;
        lateArrivalsCount = empRecords.filter(a => a.status === 'Late').length;
        overtimeHoursCount = empRecords.reduce((sum, a) => sum + (parseFloat(a.overtime) || 0), 0);
      }

      const totalAllowances = (struct.hra || 0) + (struct.travel || 0) + (struct.medical || 0) + (struct.special || 0);
      const leaveDeduction = absentCount * Math.round((struct.basic || empBasicSalary) / 24);
      const lateDeduction = lateArrivalsCount * attendanceConfigs.lateArrivalPenalty;
      const overtimePay = overtimeHoursCount * attendanceConfigs.overtimeHourlyRate;

      const approvedBonuses = bonuses
        .filter(b => b.employeeId === (emp.id || currentUser.id) && (b.status === 'Super Admin Approved' || b.status === 'Released'))
        .reduce((sum, curr) => sum + curr.amount, 0);

      const approvedReimbursements = reimbursements
        .filter(r => r.employeeId === (emp.id || currentUser.id) && (r.status === 'Approved' || r.status === 'Released'))
        .reduce((sum, curr) => sum + curr.amount, 0);

      const loanEMI = loans
        .filter(l => l.employeeId === (emp.id || currentUser.id) && l.status === 'Approved')
        .reduce((sum, curr) => sum + curr.emi, 0);

      const advanceDeduct = advances
        .filter(a => a.employeeId === (emp.id || currentUser.id) && a.status === 'Approved')
        .reduce((sum, curr) => sum + curr.amount, 0);

      const statutoryDeductions = (struct.pf || 0) + (struct.esi || 0) + (struct.pt || 0) + (struct.tds || 0);
      const totalDeductions = statutoryDeductions + leaveDeduction + lateDeduction + loanEMI + advanceDeduct;
      const grossSalary = (struct.basic || empBasicSalary) + totalAllowances + overtimePay + approvedBonuses;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      result[m] = {
        netSalary,
        status: 'Pending',
        exists: false
      };
    });

    return result;
  }, [payrollState, employees, currentUser, salaryStructures, attendance, year, monthMap, attendanceConfigs, bonuses, reimbursements, loans, advances]);

  // --- Executive Dashboard KPI aggregations ---
  const totalEmployees = calculatedPayrollData.length;
  const currentMonthCost = calculatedPayrollData.reduce((sum, curr) => sum + curr.netSalary, 0);
  const totalIncentives = calculatedPayrollData.reduce((sum, curr) => sum + curr.bonusAmount, 0);
  const totalDeductionsSum = calculatedPayrollData.reduce((sum, curr) => sum + curr.totalDeductions, 0);
  
  const totalReimbursementsPending = scopedReimbursements.filter(r => r.status === 'Pending').length;
  const pendingReimbursementAmount = scopedReimbursements.filter(r => r.status === 'Pending').reduce((sum, curr) => sum + curr.amount, 0);
  const outstandingAdvances = scopedAdvances.reduce((sum, curr) => sum + curr.remainingBalance, 0);

  const processedCount = calculatedPayrollData.filter(p => p.status === 'Released').length;
  const pendingCount = calculatedPayrollData.filter(p => p.status !== 'Released').length;

  // Formatting Currency Helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // --- Actions ---
  // Apply Salary Revision
  const handleSalaryRevision = async (empId, newBasic) => {
    if (!newBasic || isNaN(newBasic)) return;
    const success = await savePayrollSalaryRevision(empId, newBasic);
    if (success) {
      addPageToast('success', `Revised salary for ${empId} to ${formatCurrency(newBasic)} successfully.`);
      const monthStr = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      }[month] || '06';
      await fetchMonthlyPayrollSummary(`${year}-${monthStr}`);
    }
  };

  // Run Payroll Action for selected Month/Year
  const handleProcessPayroll = () => {
    showConfirm(
      'Process Payroll Calculations',
      `Calculate and verify attendance metrics for ${month} ${year}? This will recalculate HRA, Overtime, Leaves, and Deductions.`,
      async () => {
        const success = await processPayrollCalculations(month, year, calculatedPayrollData);
        if (success) {
          addPageToast('success', `Recalculated salary figures and verified attendance links for ${month} ${year}.`);
        }
      }
    );
  };

  // Bulk Actions
  const handleBulkAction = (actionType) => {
    showConfirm(
      `Bulk ${actionType.toUpperCase()} Payroll`,
      `Are you sure you want to execute [${actionType}] action on all matching employee records?`,
      async () => {
        const success = await bulkUpdatePayrollStatus(month, year, actionType, calculatedPayrollData);
        if (success) {
          addPageToast('success', `Successfully processed bulk action: ${actionType.toUpperCase()}`);
        }
      }
    );
  };

  // Handle single status change
  const handleStatusChange = async (empId, nextStatus) => {
    const paymentObj = calculatedPayrollData.find(p => p.employeeId === empId);
    const success = await updateSinglePayrollStatus(paymentObj, nextStatus);
    if (success) {
      addPageToast('info', `Status of employee ${empId} set to: ${nextStatus}`);
    }
  };

  // Approve Reimbursement (obsolete but kept for API shape compatibility)
  const handleReimbursementStatus = async (id, newStatus) => {
    addPageToast('info', `Reimbursement status update requested.`);
  };

  // Approve Bonus Request
  const handleBonusStatus = async (id, newStatus) => {
    const success = await updateBonusStatus(id, newStatus);
    if (success) {
      addPageToast('success', `Bonus ${id} status updated: ${newStatus}`);
    }
  };

  // Approve or Reject Loan/Advance Request
  const handleUpdateLoanStatus = async (id, newStatus) => {
    showConfirm(
      `${newStatus === 'Approved' ? 'Approve' : 'Reject'} Request`,
      `Are you sure you want to ${newStatus.toLowerCase()} request ${id}?`,
      async () => {
        const success = await updateLoanAdvanceStatus(id, newStatus);
        if (success) {
          addPageToast('success', `Request ${id} has been ${newStatus.toLowerCase()} successfully.`);
        }
      }
    );
  };

  // Apply new loan or advance
  const handleCreateLoanAdvance = async (e) => {
    e.preventDefault();
    const empId = perspective === 'employee' ? (currentUser?.id || 'EMP-2026-001') : (applyForm.employeeId || employees[0]?.id);
    const targetEmp = resolveEmployee(empId) || { name: 'Employee' };
    const payload = {
      employeeId: empId,
      amount: parseInt(applyForm.amount),
      recoverySchedule: applyForm.recoverySchedule || (applyType === 'Loan' ? '10 Months' : 'Next Month'),
    };
    if (applyType === 'Loan') {
      payload.type = 'Loan';
      payload.loanType = applyForm.type || 'Personal Loan';
      payload.emi = parseInt(applyForm.emi) || 0;
    } else {
      payload.type = 'Advance';
      payload.loanType = 'Advance Salary';
      payload.emi = 0;
    }
    const success = await createLoanOrAdvance(payload);
    if (success) {
      addPageToast('success', `${applyType === 'Loan' ? 'Loan application submitted' : 'Salary Advance requested'} for ${targetEmp.name} successfully.`);
      setShowApplyModal(false);
    }
  };

  // Submit Bonus Request
  const handleCreateBonus = async (e) => {
    e.preventDefault();
    const targetEmp = resolveEmployee(bonusForm.employeeId) || { name: 'Employee' };
    const payload = {
      employeeId: bonusForm.employeeId,
      type: bonusForm.type,
      amount: parseInt(bonusForm.amount)
    };
    const success = await recommendBonus(payload);
    if (success) {
      addPageToast('success', `Bonus recommended for ${targetEmp.name}`);
      setShowBonusModal(false);
    }
  };

  // Create/Edit Salary Grade
  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    const payload = editingGrade ? { ...gradeForm, id: editingGrade.id } : gradeForm;
    const success = await addOrUpdateSalaryGrade(payload);
    if (success) {
      addPageToast('success', `${editingGrade ? 'Updated' : 'Added new'} salary grade: ${gradeForm.grade}`);
      setShowGradeModal(false);
      setEditingGrade(null);
    }
  };

  // Delete Grade
  const handleDeleteGrade = async (id) => {
    const success = await deleteSalaryGrade(id);
    if (success) {
      addPageToast('warning', `Deleted Salary Grade structure.`);
    }
  };

  // Open Edit Grade Form
  const handleEditGradeClick = (grade) => {
    setEditingGrade(grade);
    setGradeForm(grade);
    setShowGradeModal(true);
  };

  // Regime Toggle
  const handleToggleRegime = async (empId) => {
    const success = await toggleEmployeeTaxRegime(empId);
    if (success) {
      addPageToast('info', `Tax regime toggled for ${empId}.`);
    }
  };

  // Filtered Payroll Data for search query and select drops
  const filteredData = useMemo(() => {
    return calculatedPayrollData.filter(row => {
      const matchesSearch = row.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            row.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            row.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = filterDept ? row.department === filterDept : true;
      const matchesBranch = filterBranch ? row.branch === filterBranch : true;
      
      let matchesStatus = true;
      if (filterStatus) {
        if (filterStatus === 'Paid') {
          matchesStatus = row.status === 'Released';
        } else if (filterStatus === 'Pending') {
          matchesStatus = row.status !== 'Released';
        } else {
          matchesStatus = row.status === filterStatus;
        }
      }

      // If perspective is Self, restrict view to current employee only
      const matchesPerspective = perspective === 'self' ? row.employeeId === (currentUser?.id || 'EMP-2026-001') : true;

      return matchesSearch && matchesDept && matchesBranch && matchesStatus && matchesPerspective;
    });
  }, [calculatedPayrollData, searchQuery, filterDept, filterBranch, filterStatus, perspective, currentUser]);

  const filteredPayrollQueries = useMemo(() => {
    let list = payrollQueries || [];
    if (perspective === 'self') {
      list = list.filter(q => q.employeeId === currentUser?.id);
    }
    if (queryStatusFilter !== 'All') {
      list = list.filter(q => q.status === queryStatusFilter);
    }
    if (querySearchTerm.trim()) {
      const term = querySearchTerm.toLowerCase();
      list = list.filter(q => 
        (q.subject && q.subject.toLowerCase().includes(term)) ||
        (q.employeeName && q.employeeName.toLowerCase().includes(term)) ||
        (q.id && q.id.toLowerCase().includes(term)) ||
        (q.category && q.category.toLowerCase().includes(term))
      );
    }
    return list;
  }, [payrollQueries, perspective, currentUser, queryStatusFilter, querySearchTerm]);

  // Selected Employee Data for Details Tab
  const selectedEmployeeObj = useMemo(() => {
    const targetId = selectedEmpId || (currentUserRole === 'employee' || perspective === 'self' ? currentUser?.id : 'EMP-2026-002');
    return calculatedPayrollData.find(e => e.employeeId === targetId) || calculatedPayrollData[0];
  }, [calculatedPayrollData, selectedEmpId, currentUser, currentUserRole, perspective]);

  // Selected Employee Payslip Modal Data
  const payslipEmployeeObj = useMemo(() => {
    const targetId = payslipEmpId || (currentUserRole === 'employee' || perspective === 'self' ? currentUser?.id : 'EMP-2026-001');
    return calculatedPayrollData.find(e => e.employeeId === targetId) || calculatedPayrollData[0];
  }, [calculatedPayrollData, payslipEmpId, currentUser, currentUserRole, perspective]);

  // Download PDF Action handler
  const handleDownloadPayslip = (empObj) => {
    const docText = `
========================================================================
                  ENTERPRISE PAYROLL - COMPENSATION RECEIPT             
========================================================================
Employee ID   : ${empObj.employeeId}
Employee Name : ${empObj.employeeName}
Department    : ${empObj.department}
Designation   : ${empObj.designation}
Branch Office : ${empObj.branch}
Pay Period    : ${month} ${year}
========================================================================
EARNINGS BREAKDOWN:
  Basic Salary                    : ${formatCurrency(empObj.basicSalary)}
  HRA & Allowances                : ${formatCurrency(empObj.grossSalary - empObj.basicSalary - empObj.overtimeAmount)}
  Overtime Pay                    : ${formatCurrency(empObj.overtimeAmount)}
  Bonuses & Incentives            : ${formatCurrency(empObj.bonusAmount)}
------------------------------------------------------------------------
GROSS PAY                         : ${formatCurrency(empObj.grossSalary)}
========================================================================
DEDUCTIONS BREAKDOWN:
  PF & Statutory Taxes            : ${formatCurrency(empObj.statutoryDeductions)}
  Attendance / Unpaid Leave Deduct: ${formatCurrency(empObj.leaveDeductions)}
  Late Arrival Penalties          : ${formatCurrency(empObj.lateDeductions)}
  Loan EMI Recovery               : ${formatCurrency(empObj.loanEMI)}
  Advance Recovery Deductions     : ${formatCurrency(empObj.advanceDeduct)}
------------------------------------------------------------------------
TOTAL DEDUCTIONS                  : ${formatCurrency(empObj.totalDeductions)}
========================================================================
NET TAKE-HOME SALARY              : ${formatCurrency(empObj.netSalary)}
========================================================================
BANK PAYMENT & COMPLIANCE DETAIL:
  PAN Number                      : ${empObj.pan}
  Tax Regime                      : ${empObj.regime} Regime
  Credit Bank                     : ${empObj.bankName}
  Account Number                  : ${empObj.bankAccount}
  Transaction Status              : ${empObj.status === 'Released' ? 'PROCESSED & DISTRIBUTED' : 'AWAITING DISTRIBUTION'}
========================================================================
  Auto-generated on behalf of SaaS Corporate Finance Division.
========================================================================
    `;

    // Download text block as simulated PDF
    const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payslip_${empObj.employeeName.replace(/\s+/g, '_')}_${month}_${year}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addPageToast('success', `Downloaded PDF payslip for ${empObj.employeeName}.`);
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    const matchedPayment = payrollState.find(p => p.month === month && p.year === year && (perspective === 'self' ? p.employeeId === currentUser?.id : true));
    if (!matchedPayment) {
      addPageToast('warning', `No calculated payroll record found for period ${month} ${year}.`);
      return;
    }
    const newQuery = await createPayrollQuery({
      ...queryFormState,
      payrollId: matchedPayment.id
    });
    if (newQuery) {
      addPageToast('success', 'Payroll query ticket submitted successfully.');
      setShowRaiseQueryForm(false);
      setActiveQueryTicket(newQuery);
      fetchPayrollQueries();
    } else {
      addPageToast('danger', 'Failed to submit payroll query.');
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const updated = await addQueryReply(activeQueryTicket.id, newCommentText);
    if (updated) {
      addPageToast('success', 'Comment sent successfully.');
      setActiveQueryTicket(updated);
      setNewCommentText('');
      fetchPayrollQueries();
    } else {
      addPageToast('danger', 'Failed to send comment.');
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;
    const updated = await addQueryInternalNote(activeQueryTicket.id, internalNoteText);
    if (updated) {
      addPageToast('success', 'Internal note logged.');
      setActiveQueryTicket(updated);
      setInternalNoteText('');
      fetchPayrollQueries();
    } else {
      addPageToast('danger', 'Failed to save internal note.');
    }
  };

  const handleQueryStatusAction = async (status, comments) => {
    const updated = await updateQueryStatus(activeQueryTicket.id, status, comments);
    if (updated) {
      addPageToast('success', `Ticket status updated to: ${status}`);
      setActiveQueryTicket(updated);
      fetchPayrollQueries();
    } else {
      addPageToast('danger', 'Failed to update ticket status.');
    }
  };

  const handleManualRecalculateQuery = async (payrollId) => {
    try {
      setIsSubmittingRecalc(true);
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/payroll-queries/recalculate/${payrollId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'preview' })
      });
      const result = await response.json();
      if (result.status === 'success' && result.data.preview) {
        setRecalcPreviewData({
          payrollId,
          ...result.data
        });
        setSelectedAdjustmentType('apply_current');
        setShowRecalcModal(true);
      } else {
        addPageToast('danger', result.message || 'Failed to fetch recalculation preview.');
      }
    } catch (err) {
      console.error(err);
      addPageToast('danger', 'Error fetching recalculation preview.');
    } finally {
      setIsSubmittingRecalc(false);
    }
  };

  const handleConfirmRecalcAdjustment = async () => {
    if (!recalcPreviewData) return;
    try {
      setIsSubmittingRecalc(true);
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/payroll-queries/recalculate/${recalcPreviewData.payrollId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: selectedAdjustmentType })
      });
      const result = await response.json();
      if (result.status === 'success') {
        addPageToast('success', selectedAdjustmentType === 'apply_current' 
          ? 'Payroll updated and ticket resolved successfully.' 
          : 'Adjustment carry-forward registered and ticket resolved successfully.');
        setShowRecalcModal(false);
        setRecalcPreviewData(null);
        fetchPayrollQueries();
        fetchPayrollData();
      } else {
        addPageToast('danger', result.message || 'Adjustment failed.');
      }
    } catch (err) {
      console.error(err);
      addPageToast('danger', 'Error completing recalculation adjustment.');
    } finally {
      setIsSubmittingRecalc(false);
    }
  };

  // Recharts Chart Series derived from DB
  const monthlyCostSeries = useMemo(() => {
    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const shortMonths = {
      'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'Apr', 'May': 'May', 'June': 'Jun',
      'July': 'Jul', 'August': 'Aug', 'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
    };
    const map = {};
    payrollState.forEach(p => {
      const mShort = shortMonths[p.month] || p.month?.slice(0, 3) || 'Other';
      map[mShort] = (map[mShort] || 0) + (p.netSalary || 0);
    });

    const series = monthsOrder
      .filter(m => map[m] !== undefined || m === month.slice(0, 3))
      .map(m => ({
        name: m,
        expense: map[m] || (m === month.slice(0, 3) ? currentMonthCost : 0)
      }));

    return series.length > 0 ? series : [{ name: month.slice(0, 3), expense: currentMonthCost }];
  }, [payrollState, month, currentMonthCost]);

  const deptDistributionData = useMemo(() => {
    const map = {};
    calculatedPayrollData.forEach(p => {
      const dept = p.department || 'Other';
      map[dept] = (map[dept] || 0) + p.netSalary;
    });
    return Object.keys(map).length > 0
      ? Object.keys(map).map(name => ({ name, value: map[name] }))
      : [{ name: 'No Data', value: 0 }];
  }, [calculatedPayrollData]);

  const branchRankingsData = useMemo(() => {
    const map = {};
    calculatedPayrollData.forEach(p => {
      const branch = p.branch || 'Other';
      map[branch] = (map[branch] || 0) + p.netSalary;
    });
    return Object.keys(map).length > 0
      ? Object.keys(map).map(name => ({ name, amount: map[name] }))
      : [{ name: 'No Data', amount: 0 }];
  }, [calculatedPayrollData]);

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className="payroll-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="stats-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton-card" style={{ height: '100px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: '340px' }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="payroll-page flex-column grid-gap">
      
      {/* Toast Alert Feed */}
      <div className="page-toast-container">
        {pageToasts.map(t => (
          <div key={t.id} className={`page-toast border-left-${t.type === 'success' ? 'success' : t.type === 'warning' ? 'warning' : 'info'}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="page-header-row payroll-page-header">
        <div>
          <h2>Enterprise Payroll Management</h2>
          <p className="page-desc-text font-small">Manage structures, process compliance, verify attendance links, track advances, and disburse compensation</p>
        </div>

        <div className="flex-center gap-3 wrap-content">
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

          <select value={month} onChange={(e) => setMonth(e.target.value)} className="payroll-selector">
            <option value="January">January</option>
            <option value="February">February</option>
            <option value="March">March</option>
            <option value="April">April</option>
            <option value="May">May</option>
            <option value="June">June</option>
          </select>
          
          <select value={year} onChange={(e) => setYear(e.target.value)} className="payroll-selector">
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>

          {isCompanyView && hasPermission('payroll_management', 'create') && (
            <Button variant="primary" onClick={handleProcessPayroll} icon={Landmark}>
              Process Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="card tab-bar-card overflow-x-auto">
        <div className="payroll-tabs-list">
          {perspective !== 'self' && <button onClick={() => setActiveTab('dashboard')} className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}><TrendingUp size={16} />Dashboard & Analytics</button>}
          <button onClick={() => setActiveTab('processing')} className={`tab-btn ${activeTab === 'processing' ? 'active' : ''}`}><Sliders size={16} />{perspective === 'self' ? 'My Payslips' : 'Processing Center'}</button>
          <button onClick={() => setActiveTab('bonuses')} className={`tab-btn ${activeTab === 'bonuses' ? 'active' : ''}`}><Award size={16} />{perspective === 'self' ? 'My Bonuses & Incentives' : 'Bonuses & Incentives'}</button>
          <button onClick={() => setActiveTab('loans')} className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`}><Scale size={16} />{perspective === 'self' ? 'My Loans & Advances' : 'Loans & Advances'}</button>
          <button onClick={() => setActiveTab('queries')} className={`tab-btn ${activeTab === 'queries' ? 'active' : ''}`}><MessageSquare size={16} />{perspective === 'self' ? 'My Payroll Queries' : 'Payroll Dispute Tickets'}</button>
        </div>
      </div>

      {/* ==================== TAB CONTENT: DASHBOARD ==================== */}
      {activeTab === 'dashboard' && (
        <div className="flex-column grid-gap animate-fade-in">
          {/* Stat Cards Grid */}
          <div className="stats-row payroll-stats-row">
            <div className="card payroll-stat-card border-bottom-primary">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Total Payroll Cost</span>
                <span className="stat-trend trend-green"><ArrowUpRight size={14} /> +4.2%</span>
              </div>
              <h3 className="stat-num">{formatCurrency(currentMonthCost)}</h3>
              <div className="flex-center justify-between font-small text-muted width-full">
                <span>Active Staff: {totalEmployees}</span>
              </div>
            </div>

            <div className="card payroll-stat-card border-bottom-success">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Payroll Distributed</span>
                <span className="badge-paid flex-center gap-1 font-xsmall"><CheckCircle size={12} /> Live</span>
              </div>
              <h3 className="stat-num text-success">{formatCurrency(calculatedPayrollData.filter(p => p.status === 'Released').reduce((sum, c) => sum + c.netSalary, 0))}</h3>
              <div className="flex-center justify-between font-small text-muted width-full">
                <span>Processed: {processedCount} Staff</span>
                <span>Pending Distribution: {pendingCount}</span>
              </div>
            </div>

            <div className="card payroll-stat-card border-bottom-warning">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Total Bonuses & Overtime</span>
                <span className="stat-trend trend-green"><ArrowUpRight size={14} /> +12.4%</span>
              </div>
              <h3 className="stat-num text-warning">{formatCurrency(totalIncentives)}</h3>
              <div className="flex-center justify-between font-small text-muted width-full">
                <span>Ref/Bonus Approvals: {bonuses.length}</span>
                <span>Includes OT Payments</span>
              </div>
            </div>

            <div className="card payroll-stat-card border-bottom-info">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Pending Reimbursements</span>
                <span className="badge-hold flex-center font-xsmall">{totalReimbursementsPending} Claims</span>
              </div>
              <h3 className="stat-num text-info">{formatCurrency(pendingReimbursementAmount)}</h3>
              <div className="flex-center justify-between font-small text-muted width-full">
                <span>Outstanding Advances: {formatCurrency(outstandingAdvances)}</span>
                <span>Needs Finance Verification</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid-2-col gap-6">
            <div className="card chart-container-card">
              <h4 className="chart-title">Monthly Payroll Cost Growth</h4>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <AreaChart data={monthlyCostSeries}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    <Area type="monotone" dataKey="expense" stroke="#3b82f6" fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid-2-row gap-6">
              <div className="card flex-row gap-4 p-4 align-center justify-between">
                <div style={{ width: '50%', height: 120 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={deptDistributionData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                        {deptDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-column gap-2" style={{ width: '50%' }}>
                  <h4 className="chart-title" style={{ margin: 0 }}>Cost by Department</h4>
                  <div className="flex-column gap-1">
                    {deptDistributionData.slice(0, 3).map((item, idx) => (
                      <div key={item.name} className="flex-center justify-between font-xsmall">
                        <span className="flex-center gap-1"><span className="color-dot" style={{ backgroundColor: CHART_COLORS[idx] }}></span> {item.name}</span>
                        <span className="font-semibold">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <h4 className="chart-title">Branch Cost Comparison</h4>
                <div style={{ width: '100%', height: 110 }}>
                  <ResponsiveContainer>
                    <BarChart data={branchRankingsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `₹${v/1000}k`} />
                      <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {branchRankingsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: PROCESSING CENTER ==================== */}
      {activeTab === 'processing' && (
        (perspective === 'self' || perspective === 'employee') ? (
          <div className="personal-payslip-layout animate-fade-in">
            {/* Left Sidebar: Select Month/Year or List of Past Payslips */}
            <div className="payslips-history-sidebar card glass flex-column gap-3" style={{ minWidth: '280px' }}>
              <h4 className="payslip-title">My Pay Statements</h4>
              <p className="font-xsmall text-muted" style={{ marginTop: -8 }}>Select a pay period to view and download your statement.</p>
              
              <div className="flex-column gap-1" style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
                  Select Pay Period
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="payroll-selector"
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  {['June', 'May', 'April', 'March', 'February', 'January'].map(m => {
                    const periodObj = employeeMonthlyPayslips[m];
                    const isPaid = periodObj?.status === 'Released';
                    const netSalary = periodObj ? formatCurrency(periodObj.netSalary) : '-';
                    const statusText = isPaid ? 'Paid' : 'Pending';
                    return (
                      <option key={m} value={m}>
                        {m} {year} — {netSalary} ({statusText})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Right Pane: Payslip Detailed View */}
            <div className="payslip-detailed-view card glass">
              {selectedEmployeeObj ? (
                <>
                  {/* Watermark paid/pending stamp */}
                  <div className="payslip-watermark-inline">
                    {selectedEmployeeObj.status === 'Released' ? 'PAID' : 'PENDING'}
                  </div>

                  <div className="payslip-header-row flex-row justify-between align-center border-bottom pb-3">
                    <div className="flex-center gap-2">
                      <Receipt className="text-primary" size={24} />
                      <h3 className="payslip-title">Salary Statement for {month} {year}</h3>
                    </div>
                    <div className="flex-center gap-2 wrap-content">
                      <Button
                        variant="primary"
                        icon={Download}
                        onClick={() => handleDownloadPayslip(selectedEmployeeObj)}
                      >
                        Download PDF
                      </Button>
                      {perspective === 'self' && (
                        <>
                          <Button
                            variant="danger"
                            icon={AlertTriangle}
                            onClick={() => {
                              setQueryFormState({
                                category: 'Incorrect Salary Amount',
                                subject: `Dispute regarding ${month} ${year} salary slip`,
                                description: `I am writing to raise a query regarding my salary slip of ${month} ${year}. `,
                                priority: 'Medium',
                                attachments: []
                              });
                              setShowRaiseQueryForm(true);
                              setActiveQueryTicket(null);
                              setActiveTab('queries');
                            }}
                          >
                            Raise Query
                          </Button>
                          <Button
                            variant="secondary"
                            icon={MessageSquare}
                            onClick={() => {
                              setActiveTab('queries');
                              setActiveQueryTicket(null);
                              setShowRaiseQueryForm(false);
                            }}
                          >
                            View Queries
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="payslip-info-grid bg-secondary rounded">
                    <div>
                      <div><span className="text-muted">Employee ID:</span> <strong>{selectedEmployeeObj.employeeId}</strong></div>
                      <div><span className="text-muted">Employee Name:</span> <strong>{selectedEmployeeObj.employeeName}</strong></div>
                      <div><span className="text-muted">Bank Name:</span> <strong>{selectedEmployeeObj.bankName}</strong></div>
                      <div><span className="text-muted">Bank Account:</span> <strong>{selectedEmployeeObj.bankAccount}</strong></div>
                    </div>
                    <div>
                      <div><span className="text-muted">Department:</span> <strong>{selectedEmployeeObj.department}</strong></div>
                      <div><span className="text-muted">Designation:</span> <strong>{selectedEmployeeObj.designation}</strong></div>
                      <div><span className="text-muted">PAN Card:</span> <strong>{selectedEmployeeObj.pan}</strong></div>
                      <div><span className="text-muted">Tax Regime:</span> <strong>{selectedEmployeeObj.regime} Regime</strong></div>
                    </div>
                  </div>

                  {/* Earnings vs Deductions */}
                  <div className="payslip-details-grid">
                    {/* Earnings */}
                    <div className="flex-column gap-2 border-right pr-4">
                      <span className="font-bold text-success border-bottom pb-1 flex-row gap-1 align-center">
                        <TrendingUp size={14} /> Earnings
                      </span>
                      <div className="flex-center justify-between py-1"><span>Basic Salary:</span> <strong>{selectedEmployeeObj.basicSalary > 0 ? formatCurrency(selectedEmployeeObj.basicSalary) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>House Rent Allowance (HRA):</span> <strong>{selectedEmployeeObj.hra > 0 ? formatCurrency(selectedEmployeeObj.hra) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Conveyance Allowance:</span> <strong>{selectedEmployeeObj.travel > 0 ? formatCurrency(selectedEmployeeObj.travel) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Medical Allowance:</span> <strong>{selectedEmployeeObj.medical > 0 ? formatCurrency(selectedEmployeeObj.medical) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Special Allowance:</span> <strong>{selectedEmployeeObj.special > 0 ? formatCurrency(selectedEmployeeObj.special) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Overtime Remunerations:</span> <strong>{selectedEmployeeObj.overtimeAmount > 0 ? formatCurrency(selectedEmployeeObj.overtimeAmount) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Performance Bonus:</span> <strong>{selectedEmployeeObj.bonusAmount > 0 ? formatCurrency(selectedEmployeeObj.bonusAmount) : '₹0'}</strong></div>
                      <div className="flex-center justify-between border-top pt-2 font-semibold text-success"><span>Gross Earnings:</span> <strong>{selectedEmployeeObj.grossSalary > 0 ? formatCurrency(selectedEmployeeObj.grossSalary) : '₹0'}</strong></div>
                    </div>
 
                    {/* Deductions */}
                    <div className="flex-column gap-2">
                      <span className="font-bold text-danger border-bottom pb-1 flex-row gap-1 align-center">
                        <MinusCircle size={14} /> Deductions
                      </span>
                      <div className="flex-center justify-between py-1"><span>Provident Fund (PF):</span> <strong>{selectedEmployeeObj.pf > 0 ? formatCurrency(selectedEmployeeObj.pf) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>TDS / Income Tax:</span> <strong>{selectedEmployeeObj.tds > 0 ? formatCurrency(selectedEmployeeObj.tds) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Professional Tax (PT):</span> <strong>{selectedEmployeeObj.pt > 0 ? formatCurrency(selectedEmployeeObj.pt) : '₹0'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Leave Deductions:</span> <strong>{selectedEmployeeObj.leaveDeductions > 0 ? formatCurrency(selectedEmployeeObj.leaveDeductions) : '-'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Late Punch Deductions:</span> <strong>{selectedEmployeeObj.lateDeductions > 0 ? formatCurrency(selectedEmployeeObj.lateDeductions) : '-'}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Loan EMI Recovery:</span> <strong>{selectedEmployeeObj.loanEMI + selectedEmployeeObj.advanceDeduct > 0 ? formatCurrency(selectedEmployeeObj.loanEMI + selectedEmployeeObj.advanceDeduct) : '-'}</strong></div>
                      <div className="flex-center justify-between border-top pt-2 font-semibold text-danger"><span>Total Deductions:</span> <strong>{selectedEmployeeObj.totalDeductions > 0 ? formatCurrency(selectedEmployeeObj.totalDeductions) : '-'}</strong></div>
                    </div>
                  </div>
 
                  {/* Summary Net Take-Home */}
                  <div className="payslip-net-summary flex-row justify-between align-center p-4 rounded border">
                    <div className="flex-column">
                      <span className="font-semibold text-primary">Net Take-Home Salary</span>
                      <span className="font-xsmall text-muted">Transferred to your bank account on disbursal</span>
                    </div>
                    <span className="font-bold text-success font-large">{selectedEmployeeObj.netSalary > 0 ? formatCurrency(selectedEmployeeObj.netSalary) : '-'}</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 text-muted animate-fade-in">
                  No statement record calculated for {month} {year}. Please contact your HR department.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-column grid-gap animate-fade-in">
            {/* Filter Bar */}
            <div className="card filter-wrapper-card flex-column gap-3">
              <div className="flex-center justify-between wrap-content gap-3">
                <div className="flex-center gap-3 wrap-content flex-grow-1">
                  <input
                    type="text"
                    placeholder="Search Employee name, ID, department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="table-search-input"
                    style={{ minWidth: '120px', flex: '1 1 180px', maxWidth: '240px' }}
                  />

                  <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="table-filter-select" style={{ minWidth: '120px' }}>
                    <option value="">All Departments</option>
                    {(departments || []).map(d => (
                      <option key={d.id || d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>

                  {(!currentUser?.branch || currentUserRole === 'super_admin' || perspective === 'super_admin') && (
                    <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="table-filter-select">
                      <option value="">All Branches</option>
                      {(branches || []).map(b => (
                        <option key={b.id || b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  )}

                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="table-filter-select">
                    <option value="">All Statuses</option>
                    <option value="Calculated">Calculated</option>
                    <option value="HR Verified">HR Verified</option>
                    <option value="Finance Approved">Finance Approved</option>
                    <option value="Released">Distributed</option>
                    <option value="Hold">On Hold</option>
                  </select>
                </div>

                {/* Bulk Actions Panel */}
                {perspective !== 'employee' && (
                  <div className="flex-center gap-2 wrap-content">
                    {perspective === 'branch_admin' && (
                      <Button variant="secondary" onClick={() => handleBulkAction('verify')} icon={CheckCircle}>
                        Bulk Verify (HR)
                      </Button>
                    )}
                    {perspective === 'manager' && (
                      <Button variant="secondary" onClick={() => handleBulkAction('approve')} icon={CheckCircle}>
                        Bulk Approve (Finance)
                      </Button>
                    )}
                    {perspective === 'super_admin' && (
                      <div className="flex-center gap-2">
                        <Button variant="secondary" onClick={() => handleBulkAction('approve')} icon={CheckCircle}>
                          Approve (Fin)
                        </Button>
                        <Button variant="primary" onClick={() => handleBulkAction('release')} icon={Landmark}>
                          Distribute Salary
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Main Processing Table */}
            <div className="card table-wrapper-card">
              <div className="overflow-x-auto">
                <table className="payroll-data-table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Dept & Designation</th>
                      <th>Branch</th>
                      <th>Basic Salary</th>
                      <th>Present Days</th>
                      <th>OT Pay</th>
                      <th>Bonus</th>
                      <th>Deductions</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map(row => (
                        <tr key={row.employeeId} className={selectedEmpId === row.employeeId ? 'selected-row-highlight' : ''}>
                          <td className="font-semibold">{row.employeeId}</td>
                          <td>
                            <div className="flex-center gap-2 justify-start">
                              <Avatar name={row.employeeName} size="sm" />
                              <span className="emp-name-bold">{row.employeeName}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex-column font-xsmall text-muted">
                              <span className="font-semibold text-primary">{row.department}</span>
                              <span>{row.designation}</span>
                            </div>
                          </td>
                          <td><span className="badge badge-secondary">{row.branch === '—' ? '-' : row.branch}</span></td>
                          <td className="font-semibold">{row.basicSalary > 0 ? formatCurrency(row.basicSalary) : '₹0'}</td>
                          <td className="text-center">
                            <div className="flex-column" style={{ gap: '2px', alignItems: 'center' }}>
                              <span className="font-semibold">{row.attendanceDays >= 0 ? row.attendanceDays : 0} Days</span>
                              <span className="font-xsmall text-muted" style={{ fontSize: '0.75rem' }}>
                                {row.paidLeaveDays || 0}P / {row.unpaidLeaveDays || 0}U Leaves
                              </span>
                            </div>
                          </td>
                          <td className="text-success font-semibold">{row.overtimeAmount > 0 ? `+${formatCurrency(row.overtimeAmount)}` : '₹0'}</td>
                          <td className="text-success font-semibold">{row.bonusAmount > 0 ? `+${formatCurrency(row.bonusAmount)}` : '₹0'}</td>
                          <td className="text-danger font-semibold">{row.totalDeductions > 0 ? `-${formatCurrency(row.totalDeductions)}` : '₹0'}</td>
                          <td className="text-info font-bold">{row.netSalary > 0 ? formatCurrency(row.netSalary) : '₹0'}</td>
                          <td>
                            <Badge variant={
                              row.status === 'Released' ? 'success' :
                              row.status === 'Finance Approved' ? 'info' :
                              row.status === 'HR Verified' ? 'primary' :
                              row.status === 'Hold' ? 'danger' : 'warning'
                            }>
                              {row.status === 'Released' ? 'Distributed' : row.status}
                            </Badge>
                          </td>
                          <td>
                            <div className="flex-center gap-2 justify-start">
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={Receipt}
                                onClick={() => {
                                  setPayslipEmpId(row.employeeId);
                                  setPayslipModalOpen(true);
                                }}
                                title="Generate Payslip"
                              >
                                Payslip
                              </Button>
                              
                              {perspective !== 'self' && perspective !== 'employee' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={Edit}
                                  onClick={() => {
                                    setSelectedEmpId(row.employeeId);
                                    setRevisionEmpId(row.employeeId);
                                    setRevisionBasic(row.basicSalary);
                                    setShowRevisionModal(true);
                                  }}
                                  title="Adjust Salary / Revision"
                                />
                              )}

                              {perspective !== 'self' && perspective !== 'employee' && row.status !== 'Released' && (
                                <button
                                  className="action-circle-btn success-btn"
                                  onClick={() => handleStatusChange(row.employeeId, 'Released')}
                                  title="Distribute Salary"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="12" className="text-center p-8 text-muted">
                          No employee records found matching selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* ==================== TAB CONTENT: BONUSES & INCENTIVES ==================== */}
      {activeTab === 'bonuses' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="flex-center justify-between">
            <div>
              <h3 className="card-sec-title" style={{ marginBottom: 2 }}>{(perspective === 'self' || perspective === 'employee') ? 'My Bonuses & Incentives' : 'Bonus & Incentives Dashboard'}</h3>
              <p className="subtitle">Recommend performance awards, track verification flow milestones, and monitor disbursements.</p>
            </div>
            {perspective !== 'self' && perspective !== 'employee' && hasPermission('payroll_management', 'create') && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => {
                setBonusForm({ employeeId: employees[0]?.id || '', amount: 10000, type: 'Performance Bonus', remarks: 'Q2 Performance target achievement', effectiveDate: '2026-06-12' });
                setShowBonusModal(true);
              }}>
                Recommend Award
              </Button>
            )}
          </div>

          {(perspective === 'self' || perspective === 'employee') ? (
            <div className="flex-column grid-gap animate-fade-in">
              {/* Summary Metrics Row */}
              <div className="bonuses-kpi-grid">
                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Total Bonuses Received</span>
                    <h3 className="stat-num text-success">
                      {formatCurrency(scopedBonuses.filter(b => b.status === 'Super Admin Approved').reduce((sum, curr) => sum + curr.amount, 0))}
                    </h3>
                    <span className="font-xsmall text-muted">Distributed in current cycle</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-success">
                    <Award size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Pending Recommendation</span>
                    <h3 className="stat-num text-warning">
                      {formatCurrency(scopedBonuses.filter(b => b.status !== 'Super Admin Approved').reduce((sum, curr) => sum + curr.amount, 0))}
                    </h3>
                    <span className="font-xsmall text-muted">Awaiting admin verification</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-warning">
                    <Clock size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Active Claims Count</span>
                    <h3 className="stat-num text-primary">
                      {scopedBonuses.length} Request(s)
                    </h3>
                    <span className="font-xsmall text-muted">Total submitted claims</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-primary">
                    <TrendingUp size={20} />
                  </div>
                </div>
              </div>

              {/* Card List of Bonuses */}
              <div className="flex-column gap-3">
                {scopedBonuses.length > 0 ? (
                  scopedBonuses.map(b => (
                    <div key={b.id} className="card p-4 flex-row justify-between align-center flex-wrap gap-4 border-left-primary">
                      <div className="flex-column gap-1">
                        <div className="flex-center gap-2 justify-start">
                          <span className="badge badge-primary font-xsmall">{b.id}</span>
                          <span className="font-semibold text-primary">{b.type}</span>
                        </div>
                        <span className="font-xsmall text-muted">Requested on: {b.requestDate}</span>
                      </div>
                      
                      <div className="flex-column align-end">
                        <span className="font-bold text-success font-medium">+{formatCurrency(b.amount)}</span>
                        <Badge variant={
                          b.status === 'Super Admin Approved' ? 'success' :
                          b.status === 'Finance Approved' ? 'info' :
                          b.status === 'HR Verified' ? 'primary' : 'warning'
                        }>
                          {b.status}
                        </Badge>
                      </div>

                      {/* Approval Flow Timeline */}
                      <div className="flex-column gap-1" style={{ minWidth: 200 }}>
                        <span className="font-xsmall text-muted font-semibold">Verification Milestones</span>
                        <div className="flex-center gap-1 font-xsmall wrap-content justify-start">
                          {b.approvalFlow.map((flow, index) => (
                            <span key={index} className="badge badge-secondary p-1 flex-center gap-1">
                              <Check size={10} className="text-success" /> {flow}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bonuses-empty-state">
                    <div className="bonuses-empty-icon">
                      <Award size={32} />
                    </div>
                    <h4 className="font-semibold text-primary">No active bonuses on record</h4>
                    <p className="font-small text-muted mt-1">When your team lead recommends a performance award, it will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-column grid-gap">
              {/* Stats cards for Admin/Manager */}
              <div className="bonuses-kpi-grid">
                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Total Approved Bonuses</span>
                    <h3 className="stat-num text-success">
                      {formatCurrency(scopedBonuses.filter(b => b.status === 'Super Admin Approved').reduce((sum, curr) => sum + curr.amount, 0))}
                    </h3>
                    <span className="font-xsmall text-muted">Distributed performance awards</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-success">
                    <Award size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Pending Approvals Budget</span>
                    <h3 className="stat-num text-warning">
                      {formatCurrency(scopedBonuses.filter(b => b.status !== 'Super Admin Approved').reduce((sum, curr) => sum + curr.amount, 0))}
                    </h3>
                    <span className="font-xsmall text-muted">Awaiting manager checks</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-warning">
                    <Clock size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Total Recommendations</span>
                    <h3 className="stat-num text-primary">
                      {scopedBonuses.length} Records
                    </h3>
                    <span className="font-xsmall text-muted">Cycle submissions total</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-primary">
                    <TrendingUp size={20} />
                  </div>
                </div>
              </div>

              {scopedBonuses.length > 0 ? (
                <div className="card table-wrapper-card">
                  <div className="overflow-x-auto">
                    <table className="payroll-data-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Employee Name</th>
                          <th>Bonus Type</th>
                          <th>Amount</th>
                          <th>Request Date</th>
                          <th>Approval Status</th>
                          <th>Verification Path</th>
                          {perspective !== 'employee' && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {scopedBonuses.map(b => (
                          <tr key={b.id}>
                            <td className="font-semibold">{b.id}</td>
                            <td>
                              <span className="emp-name-bold">{b.employeeName}</span>
                            </td>
                            <td><span className="text-primary font-semibold">{b.type}</span></td>
                            <td className="font-bold text-success">+{formatCurrency(b.amount)}</td>
                            <td>{b.requestDate}</td>
                            <td>
                              <Badge variant={
                                b.status === 'Super Admin Approved' ? 'success' :
                                b.status === 'Finance Approved' ? 'info' :
                                b.status === 'HR Verified' ? 'primary' : 'warning'
                              }>
                                {b.status}
                              </Badge>
                            </td>
                            <td>
                              <div className="flex-center gap-1 font-xsmall wrap-content justify-start">
                                {b.approvalFlow.map((flow, index) => (
                                  <span key={index} className="badge badge-secondary p-1 flex-center gap-1">
                                    <Check size={10} className="text-success" /> {flow}
                                  </span>
                                ))}
                              </div>
                            </td>
                            {perspective !== 'employee' && (
                              <td>
                                <div className="flex-center gap-2 justify-start">
                                  {perspective === 'branch_admin' && b.status === 'Pending' && (
                                    <Button variant="secondary" size="sm" onClick={() => handleBonusStatus(b.id, 'HR Verified')}>Verify</Button>
                                  )}
                                  {perspective === 'manager' && b.status === 'HR Verified' && (
                                    <Button variant="secondary" size="sm" onClick={() => handleBonusStatus(b.id, 'Finance Approved')}>Approve</Button>
                                  )}
                                  {perspective === 'super_admin' && b.status !== 'Super Admin Approved' && (
                                    <Button variant="primary" size="sm" onClick={() => handleBonusStatus(b.id, 'Super Admin Approved')}>Verify & Approve</Button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bonuses-empty-state">
                  <div className="bonuses-empty-icon">
                    <Award size={32} />
                  </div>
                  <h4 className="font-semibold text-primary">No Performance Bonus Recommendations</h4>
                  <p className="font-small text-muted mt-1">There are no bonus recommendations submitted for this period.</p>
                  <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowBonusModal(true)} style={{ marginTop: 8 }}>
                    Recommend Bonus Now
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB CONTENT: LOANS & ADVANCES ==================== */}
      {activeTab === 'loans' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="flex-center justify-between">
            <div>
              <h3 className="card-sec-title" style={{ marginBottom: 2 }}>{(perspective === 'self' || perspective === 'employee') ? 'My Loans & Advances' : 'Loans & Salary Advances Ledger'}</h3>
              <p className="subtitle">Track outstanding agreements, check monthly recovery deductions, and apply for financial assistance.</p>
            </div>
            {perspective !== 'self' && perspective !== 'employee' && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setApplyForm({
                    employeeId: employees[0]?.id || '',
                    type: 'Personal Loan',
                    amount: 50000,
                    emi: 5000,
                    recoverySchedule: '10 Months'
                  });
                  setShowApplyModal(true);
                }}
              >
                Apply / Disburse Loan
              </Button>
            )}
          </div>

          {(perspective === 'self' || perspective === 'employee') ? (
            <div className="flex-column grid-gap animate-fade-in">
              {/* Employee Personal KPIs */}
              <div className="loans-kpi-grid">
                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Outstanding Loan Balance</span>
                    <h3 className="stat-num text-danger">{formatCurrency(scopedLoans.filter(l => l.status === 'Approved').reduce((sum, curr) => sum + curr.remainingBalance, 0))}</h3>
                    <span className="font-xsmall text-muted">Remaining principal balance</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-danger">
                    <Scale size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Salary Advance Balance</span>
                    <h3 className="stat-num text-warning">{formatCurrency(scopedAdvances.filter(a => a.status === 'Approved').reduce((sum, curr) => sum + curr.remainingBalance, 0))}</h3>
                    <span className="font-xsmall text-muted">Awaiting payroll settlement</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-warning">
                    <Clock size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Next Month's Recovery EMI</span>
                    <h3 className="stat-num text-success">
                      {formatCurrency(
                        scopedLoans.filter(l => l.status === 'Approved').reduce((sum, curr) => sum + curr.emi, 0) +
                        scopedAdvances.filter(a => a.status === 'Approved').reduce((sum, curr) => sum + curr.remainingBalance, 0)
                      )}
                    </h3>
                    <span className="font-xsmall text-muted">Estimated paycheck deduction</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-success">
                    <DollarSign size={20} />
                  </div>
                </div>
              </div>

              {/* Split layout: agreements vs apply inline widget */}
              <div className="grid-2-col gap-6" style={{ alignItems: 'start' }}>
                {/* Active Agreements */}
                <div className="card p-5 flex-column gap-3">
                  <h4 className="text-primary font-bold">My Active Agreements</h4>
                  
                  <div className="flex-column gap-4">
                    {scopedLoans.length === 0 && scopedAdvances.length === 0 ? (
                      <div className="loan-empty-state">
                        <div className="loan-empty-icon">
                          <CheckCircle size={32} className="text-success" />
                        </div>
                        <h4 className="font-semibold text-success">Debt-Free Profile</h4>
                        <p className="font-small text-muted mt-1">You have no outstanding loans or active salary advance accounts.</p>
                      </div>
                    ) : (
                      <>
                        {scopedLoans.map(l => (
                          <div key={l.id} className="loan-card-item flex-column gap-2">
                            <div className="loan-card-header-row">
                              <div className="flex-column">
                                <span className="font-semibold text-primary">{l.loanType}</span>
                                <span className="font-xsmall text-muted">Agreement: {l.id}</span>
                              </div>
                              <span className="text-danger font-semibold">{formatCurrency(l.remainingBalance)} / {formatCurrency(l.amount)}</span>
                            </div>
                            <div className="flex-center justify-between font-xsmall text-muted">
                              <span>EMI Recovery: {formatCurrency(l.emi)}/mo</span>
                              <span>Terms: {l.recoverySchedule}</span>
                              <span>Status: <Badge variant={l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'}>{l.status || 'Approved'}</Badge></span>
                            </div>
                            <div className="loan-progress-track">
                              <div className="loan-progress-text">
                                <span>Recovery Progress</span>
                                <span>{Math.round(l.progress)}% Paid</span>
                              </div>
                              <div className="loan-progress-bar-bg">
                                <div className="loan-progress-bar-fill bg-primary" style={{ width: `${l.progress}%` }}></div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {scopedAdvances.map(a => (
                          <div key={a.id} className="loan-card-item flex-column gap-2" style={{ borderColor: 'var(--color-success-light)' }}>
                            <div className="loan-card-header-row">
                              <div className="flex-column">
                                <span className="font-semibold text-success">Salary Advance</span>
                                <span className="font-xsmall text-muted">Reference ID: {a.id}</span>
                              </div>
                              <span className="text-warning font-semibold">{formatCurrency(a.remainingBalance)} / {formatCurrency(a.amount)}</span>
                            </div>
                            <div className="flex-center justify-between font-xsmall text-muted">
                              <span>Terms: {a.recoverySchedule}</span>
                              <span>Status: <Badge variant={a.status === 'Approved' ? 'success' : a.status === 'Rejected' ? 'danger' : 'warning'}>{a.status || 'Approved'}</Badge></span>
                            </div>
                            <div className="loan-progress-track">
                              <div className="loan-progress-text">
                                <span>Settlement Progress</span>
                                <span>{Math.round(a.progress)}% Deducted</span>
                              </div>
                              <div className="loan-progress-bar-bg">
                                <div className="loan-progress-bar-fill bg-success" style={{ width: `${a.progress}%` }}></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Inline Request Form Widget */}
                <div className="loan-request-widget">
                  <h4 className="font-semibold text-primary" style={{ margin: 0 }}>Request Financial Advance</h4>
                  <p className="font-xsmall text-muted" style={{ marginTop: -8 }}>Submit requests for corporate salary loans or immediate advances. Admin approval is required.</p>
                  
                  <div className="flex-center gap-4 bg-secondary p-2 rounded justify-center">
                    <label className="flex-center gap-1 cursor-pointer font-small font-semibold">
                      <input type="radio" checked={applyType === 'Loan'} onChange={() => { setApplyType('Loan'); setApplyForm(prev => ({ ...prev, amount: 50000, emi: 5000, type: 'Personal Loan', recoverySchedule: '10 Months' })) }} /> Loan Structure
                    </label>
                    <label className="flex-center gap-1 cursor-pointer font-small font-semibold">
                      <input type="radio" checked={applyType === 'Advance'} onChange={() => { setApplyType('Advance'); setApplyForm(prev => ({ ...prev, amount: 10000, recoverySchedule: 'Single Deduct (Next Month)' })) }} /> Salary Advance
                    </label>
                  </div>

                  <form className="flex-column gap-3" onSubmit={handleCreateLoanAdvance}>
                    {applyType === 'Loan' && (
                      <div>
                        <label className="input-label">Loan Purpose Category</label>
                        <select
                          value={applyForm.type}
                          onChange={(e) => setApplyForm(prev => ({ ...prev, type: e.target.value }))}
                          className="table-filter-select width-full p-2"
                        >
                          <option value="Personal Loan">Personal Loan</option>
                          <option value="Emergency Loan">Emergency Loan</option>
                          <option value="Company Loan">Company Loan</option>
                        </select>
                      </div>
                    )}

                    <div className="grid-2-col">
                      <div>
                        <label className="input-label">{applyType === 'Loan' ? 'Total Loan Principal (₹)' : 'Advance Principal (₹)'}</label>
                        <input
                          type="number"
                          value={applyForm.amount}
                          onChange={(e) => setApplyForm(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                          className="table-search-input width-full"
                          placeholder="e.g. 50000"
                        />
                      </div>
                      {applyType === 'Loan' ? (
                        <div>
                          <label className="input-label">Monthly EMI (₹)</label>
                          <input
                            type="number"
                            value={applyForm.emi}
                            onChange={(e) => setApplyForm(prev => ({ ...prev, emi: parseInt(e.target.value) || 0 }))}
                            className="table-search-input width-full"
                            placeholder="e.g. 5000"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="input-label">Recovery Term</label>
                          <input
                            type="text"
                            value={applyForm.recoverySchedule}
                            onChange={(e) => setApplyForm(prev => ({ ...prev, recoverySchedule: e.target.value }))}
                            className="table-search-input width-full"
                          />
                        </div>
                      )}
                    </div>

                    {applyType === 'Loan' && (
                      <div className="p-2 bg-secondary rounded flex-center justify-between font-xsmall text-muted">
                        <span>Calculated Tenure:</span>
                        <strong className="text-primary">{applyForm.emi > 0 ? Math.ceil(applyForm.amount / applyForm.emi) : '0'} Months</strong>
                      </div>
                    )}

                    <Button variant="primary" type="submit" style={{ width: '100%', marginTop: 8 }}>
                      Submit Request
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-column grid-gap animate-fade-in">
              {/* Admin KPIs */}
              <div className="loans-kpi-grid">
                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Total Distributed Loans</span>
                    <h3 className="stat-num text-primary">{formatCurrency(loans.filter(l => l.status === 'Approved').reduce((sum, curr) => sum + curr.amount, 0))}</h3>
                    <span className="font-xsmall text-muted">Total corporate loan capital</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-primary">
                    <Scale size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Salary Advances Outstanding</span>
                    <h3 className="stat-num text-warning">{formatCurrency(advances.filter(a => a.status === 'Approved').reduce((sum, curr) => sum + curr.remainingBalance, 0))}</h3>
                    <span className="font-xsmall text-muted">Pending salary settlements</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-warning">
                    <Clock size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Monthly EMI Recovery Pool</span>
                    <h3 className="stat-num text-success">{formatCurrency(loans.filter(l => l.status === 'Approved').reduce((sum, curr) => sum + curr.emi, 0))}</h3>
                    <span className="font-xsmall text-muted">Recoverable next payroll run</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-success">
                    <DollarSign size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Active Debtors Count</span>
                    <h3 className="stat-num text-info">{new Set([...loans, ...advances].filter(item => item.status === 'Approved').map(item => item.employeeId)).size} Staff</h3>
                    <span className="font-xsmall text-muted">Active balances total</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-info">
                    <Users size={20} />
                  </div>
                </div>
              </div>

              {/* Pending Requests */}
              {(() => {
                const pendingLoans = scopedLoans.filter(l => l.status === 'Pending');
                const pendingAdvances = scopedAdvances.filter(a => a.status === 'Pending');
                const hasPending = pendingLoans.length > 0 || pendingAdvances.length > 0;
                
                if (!hasPending) return null;

                return (
                  <div className="card p-5 flex-column gap-3 mb-6" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                    <h4 className="text-warning font-bold flex-center gap-2 justify-start" style={{ margin: 0 }}>
                      <Clock size={18} /> Pending Loan & Salary Advance Requests
                    </h4>
                    <p className="font-xsmall text-muted" style={{ marginTop: -8 }}>
                      The following employee applications are awaiting administrative review. Approved requests will be disbursed and enrolled in the next active payroll cycle.
                    </p>
                    <div className="overflow-x-auto mt-2">
                      <table className="payroll-data-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Employee Name</th>
                            <th>Category / Term</th>
                            <th>Request ID</th>
                            <th>Principal Amount</th>
                            <th>Recovery EMI</th>
                            {hasPermission('payroll_management', 'update') && <th>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {[...pendingLoans, ...pendingAdvances].map(req => (
                            <tr key={req.id}>
                              <td>
                                <Badge variant={req.type === 'Loan' ? 'primary' : 'success'}>
                                  {req.type}
                                </Badge>
                              </td>
                              <td>
                                <div className="flex-center gap-2 justify-start">
                                  <Avatar name={req.employeeName} size="xs" />
                                  <span className="emp-name-bold">{req.employeeName}</span>
                                </div>
                              </td>
                              <td>{req.loanType || (req.type === 'Loan' ? 'Personal Loan' : 'Advance Salary')}</td>
                              <td className="font-xsmall text-muted">{req.id}</td>
                              <td className="font-bold text-primary">{formatCurrency(req.amount)}</td>
                              <td>
                                {req.type === 'Loan' ? (
                                  <span>{formatCurrency(req.emi)}/mo ({req.recoverySchedule})</span>
                                ) : (
                                  <span>{req.recoverySchedule}</span>
                                )}
                              </td>
                              {hasPermission('payroll_management', 'update') && (
                                <td>
                                  <div className="flex-center gap-2 justify-start">
                                    <Button
                                      variant="success"
                                      size="sm"
                                      icon={Check}
                                      onClick={() => handleUpdateLoanStatus(req.id, 'Approved')}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      icon={X}
                                      onClick={() => handleUpdateLoanStatus(req.id, 'Rejected')}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Ledger Cards */}
              <div className="grid-2-col gap-6">
                {/* Active Loans */}
                <div className="card p-5 flex-column gap-3">
                  <h4 className="text-primary font-bold">Active Employee Loans</h4>
                  
                  <div className="flex-column gap-4">
                    {scopedLoans.filter(l => l.status === 'Approved').length > 0 ? (
                      scopedLoans.filter(l => l.status === 'Approved').map(l => (
                        <div key={l.id} className="loan-card-item flex-column gap-2">
                          <div className="loan-card-header-row">
                            <div className="loan-avatar-info">
                              <Avatar name={l.employeeName} size="sm" />
                              <div className="flex-column">
                                <span className="font-semibold text-primary">{l.employeeName} ({l.loanType})</span>
                                <span className="font-xsmall text-muted">ID: {l.id} • Emp ID: {l.employeeId}</span>
                              </div>
                            </div>
                            <span className="text-danger font-semibold">{formatCurrency(l.remainingBalance)} / {formatCurrency(l.amount)}</span>
                          </div>
                          <div className="flex-center justify-between font-xsmall text-muted">
                            <span>EMI: {formatCurrency(l.emi)}/mo</span>
                            <span>Tenure: {l.recoverySchedule}</span>
                          </div>
                          <div className="loan-progress-track">
                            <div className="loan-progress-text">
                              <span>Recovery Progress</span>
                              <span>{Math.round(l.progress)}%</span>
                            </div>
                            <div className="loan-progress-bar-bg">
                              <div className="loan-progress-bar-fill bg-primary" style={{ width: `${l.progress}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="loan-empty-state">
                        <div className="loan-empty-icon">
                          <Scale size={32} />
                        </div>
                        <h4 className="font-semibold text-muted">No Active Loans</h4>
                        <p className="font-small text-muted">There are no outstanding employee loans on record.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Salary Advances */}
                <div className="card p-5 flex-column gap-3">
                  <h4 className="text-success font-bold">Salary Advances Outstanding</h4>
                  
                  <div className="flex-column gap-4">
                    {scopedAdvances.filter(a => a.status === 'Approved').length > 0 ? (
                      scopedAdvances.filter(a => a.status === 'Approved').map(a => (
                        <div key={a.id} className="loan-card-item flex-column gap-2" style={{ borderColor: 'var(--color-success-light)' }}>
                          <div className="loan-card-header-row">
                            <div className="loan-avatar-info">
                              <Avatar name={a.employeeName} size="sm" />
                              <div className="flex-column">
                                <span className="font-semibold text-success">{a.employeeName}</span>
                                <span className="font-xsmall text-muted">ID: {a.id} • Emp ID: {a.employeeId}</span>
                              </div>
                            </div>
                            <span className="text-warning font-semibold">{formatCurrency(a.remainingBalance)} / {formatCurrency(a.amount)}</span>
                          </div>
                          <div className="flex-center justify-between font-xsmall text-muted">
                            <span>Terms: {a.recoverySchedule}</span>
                            <span>Status: <Badge variant="success">{a.status}</Badge></span>
                          </div>
                          <div className="loan-progress-track">
                            <div className="loan-progress-text">
                              <span>Settlement Progress</span>
                              <span>{Math.round(a.progress)}%</span>
                            </div>
                            <div className="loan-progress-bar-bg">
                              <div className="loan-progress-bar-fill bg-success" style={{ width: `${a.progress}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="loan-empty-state">
                        <div className="loan-empty-icon">
                          <Clock size={32} />
                        </div>
                        <h4 className="font-semibold text-muted">No Advances Outstanding</h4>
                        <p className="font-small text-muted">All salary advances have been recovered or fully settled.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB CONTENT: PAYROLL QUERIES & DISPUTES ==================== */}
      {activeTab === 'queries' && (
        <div className="flex-column grid-gap animate-fade-in queries-tab-container">
          
          {/* Header Row */}
          <div className="flex-row justify-between align-center border-bottom pb-3 mb-2">
            <div>
              <h3 className="card-sec-title" style={{ margin: 0 }}>Payroll Query & Salary Dispute Desk</h3>
              <p className="subtitle text-muted font-xsmall">Track, investigate, and resolve compensation calculation issues</p>
            </div>
            {!showRaiseQueryForm && !activeQueryTicket && perspective === 'self' && (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setQueryFormState({
                    category: 'Incorrect Salary Amount',
                    subject: `Dispute regarding ${month} ${year} salary slip`,
                    description: `I am writing to raise a query regarding my salary slip of ${month} ${year}. `,
                    priority: 'Medium',
                    attachments: []
                  });
                  setShowRaiseQueryForm(true);
                }}
              >
                Raise Dispute Ticket
              </Button>
            )}
            {(showRaiseQueryForm || activeQueryTicket) && (
              <Button
                variant="secondary"
                icon={Sliders}
                onClick={() => {
                  setShowRaiseQueryForm(false);
                  setActiveQueryTicket(null);
                }}
              >
                Back to Ticket List
              </Button>
            )}
          </div>

          {/* MODE 1: Raise Query Form */}
          {showRaiseQueryForm && (
            <div className="card p-5 animate-slide-up">
              <form onSubmit={handleQuerySubmit} className="flex-column gap-4">
                <h4 className="font-bold border-bottom pb-2 text-primary">New Dispute Ticket Registration</h4>
                
                <div className="grid-2-col gap-4">
                  <div>
                    <label className="input-label">Dispute Category</label>
                    <select
                      value={queryFormState.category}
                      onChange={(e) => setQueryFormState(prev => ({ ...prev, category: e.target.value }))}
                      className="table-filter-select width-full p-2"
                      required
                    >
                      <option value="Incorrect Salary Amount">Incorrect Salary Amount</option>
                      <option value="Missing Salary Credit">Missing Salary Credit</option>
                      <option value="Incorrect Leave Deduction">Incorrect Leave Deduction</option>
                      <option value="Wrong LOP Calculation">Wrong LOP Calculation</option>
                      <option value="Overtime Missing">Overtime Missing</option>
                      <option value="Bonus Missing">Bonus Missing</option>
                      <option value="Incentive Missing">Incentive Missing</option>
                      <option value="Incorrect Tax Deduction">Incorrect Tax Deduction</option>
                      <option value="Incorrect PF/ESI">Incorrect PF/ESI</option>
                      <option value="Wrong Attendance Calculation">Wrong Attendance Calculation</option>
                      <option value="Salary Paid Late">Salary Paid Late</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Priority</label>
                    <select
                      value={queryFormState.priority}
                      onChange={(e) => setQueryFormState(prev => ({ ...prev, priority: e.target.value }))}
                      className="table-filter-select width-full p-2"
                      required
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="input-label">Subject</label>
                  <input
                    type="text"
                    value={queryFormState.subject}
                    onChange={(e) => setQueryFormState(prev => ({ ...prev, subject: e.target.value }))}
                    className="table-search-input width-full p-2"
                    placeholder="Brief summary of the issue"
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Description & Evidence</label>
                  <textarea
                    value={queryFormState.description}
                    onChange={(e) => setQueryFormState(prev => ({ ...prev, description: e.target.value }))}
                    className="table-search-input width-full p-2"
                    rows="6"
                    placeholder="Provide full details of the calculation discrepancy. Mention the dates of leaves/overtime disputed."
                    required
                  />
                </div>

                <div className="bg-secondary p-3 rounded flex-column gap-2 font-xsmall text-muted border-left-info">
                  <div className="font-semibold text-primary">Linked Pay Slip Snapshot:</div>
                  <div className="grid-3-col gap-2">
                    <div>Pay Period: <strong>{month} {year}</strong></div>
                    <div>Employee: <strong>{currentUser?.name} ({currentUser?.id})</strong></div>
                    <div>Department: <strong>{currentUser?.department || 'Staff'}</strong></div>
                  </div>
                  <div className="font-xsmall text-danger">⚠️ Submitting this ticket will freeze the payroll recalculation lock until HR investigates and resolves the dispute.</div>
                </div>

                <div className="flex-end gap-3 border-top pt-4">
                  <Button variant="secondary" type="button" onClick={() => setShowRaiseQueryForm(false)}>Cancel</Button>
                  <Button variant="danger" type="submit">Submit Dispute to HR</Button>
                </div>
              </form>
            </div>
          )}

          {/* MODE 2: Ticket Conversation detail view */}
          {activeQueryTicket && (
            <div className="grid-3-col gap-6 align-start animate-slide-up queries-detail-layout">
              
              {/* Left Pane: Ticket Details & Snapshot */}
              <div className="card p-4 flex-column gap-3 queries-detail-meta-pane">
                <h4 className="font-bold border-bottom pb-2">Ticket Info</h4>
                <div className="flex-column gap-2 font-xsmall text-muted">
                  <div className="flex-center justify-between"><span>Ticket ID:</span> <strong className="font-mono text-primary">{activeQueryTicket.id}</strong></div>
                  <div className="flex-center justify-between"><span>Status:</span> <Badge variant={activeQueryTicket.status === 'Pending' ? 'warning' : activeQueryTicket.status === 'Approved' || activeQueryTicket.status === 'Resolved' ? 'success' : activeQueryTicket.status === 'Rejected' ? 'danger' : 'primary'}>{activeQueryTicket.status}</Badge></div>
                  <div className="flex-center justify-between"><span>Priority:</span> <Badge variant={activeQueryTicket.priority === 'High' ? 'danger' : activeQueryTicket.priority === 'Medium' ? 'warning' : 'secondary'}>{activeQueryTicket.priority}</Badge></div>
                  <div className="flex-center justify-between"><span>Category:</span> <strong>{activeQueryTicket.category}</strong></div>
                  <div className="flex-center justify-between"><span>Raised On:</span> <strong>{new Date(activeQueryTicket.submittedDate).toLocaleDateString()}</strong></div>
                </div>

                <h4 className="font-bold border-bottom pb-2 mt-2">Payroll Snapshot</h4>
                <div className="flex-column gap-2 font-xsmall text-muted bg-secondary p-2 rounded">
                  <div className="flex-center justify-between"><span>Gross Salary:</span> <strong>{formatCurrency(activeQueryTicket.grossSalary)}</strong></div>
                  <div className="flex-center justify-between"><span>Net Salary:</span> <strong className="text-success">{formatCurrency(activeQueryTicket.netSalary)}</strong></div>
                  <div className="flex-center justify-between"><span>Deductions:</span> <strong className="text-danger">{formatCurrency(activeQueryTicket.deductions)}</strong></div>
                  <div className="flex-center justify-between"><span>Allowances:</span> <strong>{formatCurrency(activeQueryTicket.allowances)}</strong></div>
                  <div className="flex-center justify-between"><span>LOP Deductions:</span> <strong className="text-danger">{formatCurrency(activeQueryTicket.lop)}</strong></div>
                  <div className="flex-center justify-between"><span>Unpaid Leaves:</span> <strong>{activeQueryTicket.unpaidLeave} Days</strong></div>
                </div>
              </div>

              {/* Middle Pane: Conversation Thread */}
              <div className="card p-4 flex-column gap-4 queries-detail-chat-pane" style={{ gridColumn: 'span 2' }}>


                {/* Messages Timeline */}
                <div className="queries-chat-messages-container flex-column gap-3 overflow-y-auto" style={{ maxHeight: '400px', paddingRight: '8px' }}>
                  {activeQueryTicket.messages && activeQueryTicket.messages.map((msg, index) => {
                    const isSelf = msg.senderId === currentUser?.id;
                    return (
                      <div key={index} className={`queries-message-bubble flex-column p-3 rounded ${isSelf ? 'msg-self' : 'msg-other'}`}>
                        <div className="flex-center justify-between font-xsmall border-bottom pb-1 mb-1">
                          <span className="font-semibold text-primary">{msg.senderName} ({msg.senderRole.replace('_', ' ').toUpperCase()})</span>
                          <span>{new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="font-small" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                      </div>
                    );
                  })}
                </div>

                {/* HR Investigation & Internal Notes Desk (HR View only) */}
                {perspective !== 'self' && (
                  <div className="flex-column gap-4 border-top pt-4 mt-2">
                    <h4 className="font-bold text-danger border-bottom pb-2 flex-row gap-2 align-center justify-start">
                      <Shield size={16} /> HR Investigation & Audit Control Board
                    </h4>

                    {/* Recalculation Checklists */}
                    {activeQueryTicket.status === 'Approved' || activeQueryTicket.status === 'Resolved' || activeQueryTicket.status === 'Rejected' ? (
                      <div 
                        className="card p-3 rounded flex-row justify-between align-center font-xsmall"
                        style={{ 
                          borderLeft: activeQueryTicket.status === 'Rejected' ? '4px solid var(--danger-color)' : '4px solid var(--success-color)',
                          backgroundColor: activeQueryTicket.status === 'Rejected' ? 'var(--danger-light)' : 'var(--success-light)'
                        }}
                      >
                        <div className="flex-column gap-1 align-start text-left">
                          <strong className={activeQueryTicket.status === 'Rejected' ? 'text-danger font-medium' : 'text-success font-medium'} style={{ fontSize: '1.1em' }}>Dispute Query Resolution Card</strong>
                          <p className="text-muted mt-1 font-xsmall" style={{ margin: 0 }}>
                            {activeQueryTicket.status === 'Rejected' 
                              ? 'This dispute query has been reviewed and formally rejected.' 
                              : 'This dispute checklist audit has been closed, and final calculations have been registered.'}
                          </p>
                        </div>
                        <div className="bg-secondary py-2 px-3 rounded flex-column align-center justify-center font-xsmall">
                          <span className="text-muted font-xsmall">Audit Status</span>
                          <strong 
                            className={activeQueryTicket.status === 'Rejected' ? 'text-danger font-semibold mt-1 text-uppercase' : 'text-success font-semibold mt-1 text-uppercase'} 
                            style={{ letterSpacing: '0.05em' }}
                          >
                            {activeQueryTicket.status}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div className="grid-2-col gap-4">
                        {/* Left: Quick checklist */}
                        <div className="bg-secondary p-3 rounded flex-column gap-2 font-xsmall">
                          <span className="font-semibold text-primary">Audit Investigation Checklist:</span>
                          <label className="flex-row gap-2 justify-start align-center cursor-pointer" style={{ display: 'flex', textTransform: 'none', fontWeight: 'normal', color: 'var(--text-secondary)', marginBottom: 0 }}>
                            <input type="checkbox" defaultChecked style={{ width: 'auto', margin: 0 }} />
                            <span>Verify attendance logs for missing punches</span>
                          </label>
                          <label className="flex-row gap-2 justify-start align-center cursor-pointer" style={{ display: 'flex', textTransform: 'none', fontWeight: 'normal', color: 'var(--text-secondary)', marginBottom: 0 }}>
                            <input type="checkbox" defaultChecked style={{ width: 'auto', margin: 0 }} />
                            <span>Check approved leave applications count</span>
                          </label>
                          <label className="flex-row gap-2 justify-start align-center cursor-pointer" style={{ display: 'flex', textTransform: 'none', fontWeight: 'normal', color: 'var(--text-secondary)', marginBottom: 0 }}>
                            <input type="checkbox" style={{ width: 'auto', margin: 0 }} />
                            <span>Confirm dynamic Loss-of-Pay calculations</span>
                          </label>
                          <label className="flex-row gap-2 justify-start align-center cursor-pointer" style={{ display: 'flex', textTransform: 'none', fontWeight: 'normal', color: 'var(--text-secondary)', marginBottom: 0 }}>
                            <input type="checkbox" style={{ width: 'auto', margin: 0 }} />
                            <span>Match bank account credit details</span>
                          </label>
                        </div>
                        
                        {/* Right: Recalculate Trigger Panel */}
                        <div className="bg-secondary p-3 rounded flex-column justify-between font-xsmall">
                          <div>
                            <span className="font-semibold text-primary">Calculation Override Control:</span>
                            <p className="text-muted font-xsmall mt-1">Recalculate will pull active attendance logs, update unpaid leave balances, and rebuild this employee's payroll statement row for the month.</p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={RefreshCw}
                            onClick={() => handleManualRecalculateQuery(activeQueryTicket.payrollId)}
                          >
                            Trigger Recalculate Now
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Internal Notes Timeline */}
                    <div className="flex-column gap-2">
                      <span className="font-semibold text-primary font-xsmall">Internal HR Notes (Only visible to managers):</span>
                      <div className="bg-secondary p-3 rounded flex-column gap-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {activeQueryTicket.internalNotes && activeQueryTicket.internalNotes.length > 0 ? (
                          activeQueryTicket.internalNotes.map((note, index) => (
                            <div key={index} className="border-bottom pb-2 mb-2 font-xsmall flex-column">
                              <div className="flex-center justify-between text-muted font-bold">
                                <span>{note.authorName}</span>
                                <span>{new Date(note.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="mt-1" style={{ margin: 0 }}>{note.note}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted font-xsmall">No internal notes logged on this ticket yet.</div>
                        )}
                      </div>
                      <form onSubmit={handleAddInternalNote} className="flex-row gap-2 mt-1">
                        <input
                          type="text"
                          value={internalNoteText}
                          onChange={(e) => setInternalNoteText(e.target.value)}
                          className="table-search-input flex-1 p-2"
                          placeholder="Log an internal review note..."
                        />
                        <Button variant="secondary" type="submit">Log Note</Button>
                      </form>
                    </div>

                    {/* Decision Actions */}
                    {activeQueryTicket.status !== 'Approved' && activeQueryTicket.status !== 'Resolved' && activeQueryTicket.status !== 'Rejected' && (
                      <div className="flex-row gap-3 justify-end border-top pt-3">
                        <Button
                          variant="danger"
                          onClick={() => handleQueryStatusAction('Rejected', 'Dispute ticket rejected after review of logs')}
                        >
                          Reject Dispute
                        </Button>
                        <Button
                          variant="success"
                          onClick={() => handleQueryStatusAction('Approved', 'Approved correction and recalculated payment')}
                        >
                          Approve & Recalculate
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 3: Ticket List view */}
          {!showRaiseQueryForm && !activeQueryTicket && (
            <div className="flex-column grid-gap animate-slide-up">
              
              {/* Filter controls row */}
              <div className="card p-3 flex-row justify-between align-center wrap-content gap-3 table-filters-card">
                
                {/* Search */}
                <div className="flex-row gap-2 table-search-container" style={{ flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    value={querySearchTerm}
                    onChange={(e) => setQuerySearchTerm(e.target.value)}
                    className="table-search-input width-full"
                    placeholder="Search by Employee, Subject, Ticket ID..."
                  />
                </div>

                {/* Status Tabs */}
                <div className="flex-row gap-1 queries-filter-tabs overflow-x-auto">
                  {['All', 'Pending', 'Under Review', 'Waiting for Employee', 'Approved', 'Rejected'].map(statusTab => (
                    <button
                      key={statusTab}
                      onClick={() => setQueryStatusFilter(statusTab)}
                      className={`filter-tab-btn font-xsmall py-1 px-3 rounded ${queryStatusFilter === statusTab ? 'active bg-primary text-white font-semibold' : 'bg-secondary text-muted'}`}
                    >
                      {statusTab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="card table-wrapper-card">
                {filteredPayrollQueries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="payroll-data-table">
                      <thead>
                        <tr>
                          <th>Ticket ID</th>
                          {perspective !== 'self' && <th>Employee</th>}
                          <th>Category</th>
                          <th>Subject</th>
                          <th>Pay Period</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Last Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayrollQueries.map(ticket => (
                          <tr key={ticket.id} className="cursor-pointer hover-bg" onClick={() => setActiveQueryTicket(ticket)}>
                            <td className="font-semibold font-mono text-primary">{ticket.id}</td>
                            {perspective !== 'self' && (
                              <td>
                                <div className="flex-center gap-2 justify-start">
                                  <Avatar name={ticket.employeeName} size="xs" />
                                  <span className="emp-name-bold">{ticket.employeeName}</span>
                                </div>
                              </td>
                            )}
                            <td className="font-xsmall">{ticket.category}</td>
                            <td>
                              <div className="flex-column max-w-xs overflow-hidden">
                                <span className="font-semibold text-truncate">{ticket.subject}</span>
                                <span className="font-xsmall text-muted text-truncate">{ticket.description}</span>
                              </div>
                            </td>
                            <td>{ticket.payrollPeriod}</td>
                            <td>
                              <Badge variant={ticket.priority === 'High' ? 'danger' : ticket.priority === 'Medium' ? 'warning' : 'secondary'}>
                                {ticket.priority}
                              </Badge>
                            </td>
                            <td>
                              <Badge variant={ticket.status === 'Pending' ? 'warning' : ticket.status === 'Approved' || ticket.status === 'Resolved' ? 'success' : ticket.status === 'Rejected' ? 'danger' : 'primary'}>
                                {ticket.status}
                              </Badge>
                            </td>
                            <td className="font-xsmall text-muted">{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                            <td>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveQueryTicket(ticket);
                                }}
                              >
                                View Ticket
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted flex-column align-center gap-3">
                    <div className="loan-empty-icon badge-glow-primary">
                      <MessageSquare size={32} />
                    </div>
                    <h4 className="font-semibold">No Dispute Tickets Found</h4>
                    <p className="font-small max-w-sm">No payroll queries matching this filter have been raised on your account.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB CONTENT: TAX VAULT ==================== */}
      {activeTab === 'taxes' && (
        <div className="flex-column grid-gap animate-fade-in">
          <h3 className="card-sec-title">Tax Compliance & TDS Dashboard</h3>
          
          <div className="card table-wrapper-card">
            <div className="overflow-x-auto">
              <table className="payroll-data-table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Name</th>
                    <th>PAN Number</th>
                    <th>Active Regime</th>
                    <th>Estimated CTC</th>
                    <th>Taxable Income</th>
                    <th>TDS Deducted</th>
                    <th>Form 16</th>
                    <th>Investment proof status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedPayrollData.map(emp => {
                    const profile = taxProfiles[emp.employeeId] || { pan: 'AAAPS1234F', regime: 'New', taxableIncome: 900000 };
                    return (
                      <tr key={emp.employeeId}>
                        <td className="font-semibold">{emp.employeeId}</td>
                        <td>{emp.employeeName}</td>
                        <td className="font-mono">{profile.pan}</td>
                        <td>
                          <Badge variant={profile.regime === 'New' ? 'success' : 'primary'}>
                            {profile.regime} Regime
                          </Badge>
                        </td>
                        <td className="font-semibold">{formatCurrency(emp.basicSalary * 12 * 2.2)}</td>
                        <td className="font-semibold text-info">{formatCurrency(profile.taxableIncome)}</td>
                        <td className="text-danger font-semibold">{formatCurrency(emp.statutoryDeductions - 10000)}</td>
                        <td>
                          <button
                            className="flex-center gap-1 font-xsmall badge badge-secondary py-1 cursor-pointer"
                            onClick={() => addPageToast('info', `Form 16 PDF generated for ${emp.employeeName}.`)}
                          >
                            <FileDown size={12} /> Form 16
                          </button>
                        </td>
                        <td><span className="badge badge-success flex-center gap-1 font-xsmall"><CheckCircle size={10} /> Verified</span></td>
                        <td>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleRegime(emp.employeeId)}
                          >
                            Switch Regime
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* ==================== PAYSLIP PREVIEW MODAL ==================== */}
      {payslipModalOpen && (
        <div className="payroll-modal-overlay">
          <div className="payroll-modal-container payslip-card-wrapper animate-slide-up">
            
            {/* Modal Header */}
            <div className="modal-header-section flex-center justify-between pb-3 border-bottom mb-4">
              <div className="flex-center gap-2">
                <Receipt className="text-primary" size={24} />
                <h3 className="modal-title-bold">SaaS Corporate Payslip Receipt</h3>
              </div>
              <button className="action-circle-btn text-muted" onClick={() => setPayslipModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-section flex-column gap-4 font-small text-primary-dark">
              
              {/* Stamp watermark */}
              <div className="payslip-watermark">
                {payslipEmployeeObj.status === 'Released' ? 'PAID' : 'PENDING'}
              </div>

              {/* Employee Info Header block */}
              <div className="grid-2-col gap-4 bg-secondary p-3 rounded">
                <div>
                  <div><span className="text-muted">Employee ID:</span> <strong>{payslipEmployeeObj.employeeId}</strong></div>
                  <div><span className="text-muted">Employee Name:</span> <strong>{payslipEmployeeObj.employeeName}</strong></div>
                  <div><span className="text-muted">Bank Name:</span> <strong>{payslipEmployeeObj.bankName}</strong></div>
                </div>
                <div>
                  <div><span className="text-muted">Department:</span> <strong>{payslipEmployeeObj.department}</strong></div>
                  <div><span className="text-muted">Designation:</span> <strong>{payslipEmployeeObj.designation}</strong></div>
                  <div><span className="text-muted">Bank Account:</span> <strong>{payslipEmployeeObj.bankAccount}</strong></div>
                </div>
              </div>

              {/* Earnings vs Deductions detailed Table */}
              <div className="grid-2-col gap-6">
                {/* Earnings */}
                <div className="flex-column gap-2 border-right pr-4">
                  <span className="font-bold text-success border-bottom pb-1">Earnings</span>
                  <div className="flex-center justify-between py-1"><span>Basic Salary:</span> <strong>{formatCurrency(payslipEmployeeObj.basicSalary || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>House Rent Allowance (HRA):</span> <strong>{formatCurrency(payslipEmployeeObj.hra || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Conveyance Allowance:</span> <strong>{formatCurrency(payslipEmployeeObj.travel || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Medical Allowance:</span> <strong>{formatCurrency(payslipEmployeeObj.medical || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Special Allowance:</span> <strong>{formatCurrency(payslipEmployeeObj.special || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Overtime Remunerations:</span> <strong>{formatCurrency(payslipEmployeeObj.overtimeAmount || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Performance Bonus:</span> <strong>{formatCurrency(payslipEmployeeObj.bonusAmount || 0)}</strong></div>
                  <div className="flex-center justify-between border-top pt-2 font-semibold"><span>Gross Earnings:</span> <strong>{formatCurrency(payslipEmployeeObj.grossSalary || 0)}</strong></div>
                </div>

                {/* Deductions */}
                <div className="flex-column gap-2">
                  <span className="font-bold text-danger border-bottom pb-1">Deductions</span>
                  <div className="flex-center justify-between py-1"><span>Provident Fund (PF):</span> <strong>{formatCurrency(payslipEmployeeObj.pf || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>TDS / Income Tax:</span> <strong>{formatCurrency(payslipEmployeeObj.tds || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Professional Tax (PT):</span> <strong>{formatCurrency(payslipEmployeeObj.pt || 0)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Leave Deductions:</span> <strong>{formatCurrency(payslipEmployeeObj.leaveDeductions)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Late Punch Deductions:</span> <strong>{formatCurrency(payslipEmployeeObj.lateDeductions)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Loan EMI Recovery:</span> <strong>{formatCurrency(payslipEmployeeObj.loanEMI + payslipEmployeeObj.advanceDeduct)}</strong></div>
                  <div className="flex-center justify-between border-top pt-2 font-semibold"><span>Total Deductions:</span> <strong>{formatCurrency(payslipEmployeeObj.totalDeductions)}</strong></div>
                </div>
              </div>

              {/* Leave Summary section */}
              <div className="flex-column gap-2 border-top pt-3">
                <span className="font-bold text-primary border-bottom pb-1">Leave & LOP Summary</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
                  <div className="flex-column gap-1">
                    <div className="flex-center justify-between">
                      <span className="text-muted">Paid Leave Used:</span>
                      <strong>{payslipEmployeeObj.paidLeaveDays || 0} Days</strong>
                    </div>
                    <div className="flex-center justify-between">
                      <span className="text-muted">Remaining Paid Leave:</span>
                      <strong>{(() => {
                        const emp = resolveEmployee(payslipEmployeeObj.employeeId);
                        if (!emp) return '0 Days';
                        const cl = typeof emp.clBalance === 'number' ? emp.clBalance : 0;
                        const sl = typeof emp.slBalance === 'number' ? emp.slBalance : 0;
                        const pl = typeof emp.plBalance === 'number' ? emp.plBalance : 0;
                        return `${cl + sl + pl} Days`;
                      })()}</strong>
                    </div>
                  </div>
                  <div className="flex-column gap-1">
                    <div className="flex-center justify-between">
                      <span className="text-muted">Unpaid / LOP Leave:</span>
                      <strong>{payslipEmployeeObj.unpaidLeaveDays || 0} Days</strong>
                    </div>
                    <div className="flex-center justify-between">
                      <span className="text-muted">Daily Salary Rate:</span>
                      <strong>₹{(() => {
                        const basic = payslipEmployeeObj.basicSalary || 0;
                        const workingDays = Number(payrollConfigs?.payrollWorkingDays) || 30;
                        return Math.round(basic / Math.max(1, workingDays));
                      })()}</strong>
                    </div>
                    {payslipEmployeeObj.leaveDeductions > 0 && (
                      <div className="flex-center justify-between" style={{ color: 'var(--color-danger)' }}>
                        <span>Loss Of Pay (LOP):</span>
                        <strong>- ₹{payslipEmployeeObj.leaveDeductions?.toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Net Take home pay highlight */}
              <div className="flex-center justify-between p-4 bg-secondary-dark rounded border border-primary mt-3">
                <div className="flex-column">
                  <span className="font-semibold text-primary">Net Salary Distributed</span>
                  <span className="font-xsmall text-muted">For period: {month} {year}</span>
                </div>
                <span className="font-bold text-success font-large">{formatCurrency(payslipEmployeeObj.netSalary)}</span>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="modal-footer-section flex-center gap-3 justify-end border-top pt-4 mt-4">
              <Button variant="secondary" onClick={() => setPayslipModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={Download}
                onClick={() => handleDownloadPayslip(payslipEmployeeObj)}
              >
                Download Payslip
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ==================== CREATE/EDIT GRADE MODAL ==================== */}
      {showGradeModal && (
        <div className="payroll-modal-overlay">
          <form className="payroll-modal-container animate-slide-up" onSubmit={handleGradeSubmit} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-center justify-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 14, marginBottom: 20 }}>
              <div>
                <h3 className="modal-title-bold" style={{ margin: 0 }}>{editingGrade ? 'Edit Salary Grade Structure' : 'Add New Salary Grade'}</h3>
                <p className="subtitle" style={{ marginTop: 2 }}>Define compensation components, deductions & compliance settings</p>
              </div>
              <button className="action-circle-btn" type="button" onClick={() => setShowGradeModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-4 font-small">

              {/* ── Identity ── */}
              <div>
                <div className="grade-modal-section-label">Grade Identity</div>
                <div className="flex-column gap-2">
                  <div>
                    <label className="input-label">Grade Name</label>
                    <input
                      type="text"
                      required
                      value={gradeForm.grade}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, grade: e.target.value }))}
                      className="table-search-input width-full"
                      placeholder="e.g. Grade A - Executive"
                    />
                  </div>
                  <div className="grid-2-col gap-3">
                    <div>
                      <label className="input-label">Pay Range Band</label>
                      <input
                        type="text"
                        required
                        value={gradeForm.payBand}
                        onChange={(e) => setGradeForm(prev => ({ ...prev, payBand: e.target.value }))}
                        className="table-search-input width-full"
                        placeholder="e.g. ₹1,20,000 - ₹2,00,000"
                      />
                    </div>
                    <div>
                      <label className="input-label">Effective Date</label>
                      <input
                        type="date"
                        value={gradeForm.effectiveDate || ''}
                        onChange={(e) => setGradeForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                        className="table-search-input width-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Earnings ── */}
              <div>
                <div className="grade-modal-section-label" style={{ color: 'var(--color-success)' }}>
                  <TrendingUp size={12} /> Earnings Components
                </div>
                <div className="grade-modal-fields-grid">
                  <div>
                    <label className="input-label">Basic Salary (₹)</label>
                    <input
                      type="number"
                      required
                      value={gradeForm.basic}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, basic: parseInt(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                    />
                  </div>
                  <div>
                    <label className="input-label">HRA Allowance (₹)</label>
                    <input
                      type="number"
                      value={gradeForm.hra}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, hra: parseInt(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                    />
                  </div>
                  <div>
                    <label className="input-label">Travel Allowance (₹)</label>
                    <input
                      type="number"
                      value={gradeForm.travel}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, travel: parseInt(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                    />
                  </div>
                  <div>
                    <label className="input-label">Medical Allowance (₹)</label>
                    <input
                      type="number"
                      value={gradeForm.medical}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, medical: parseInt(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                    />
                  </div>
                  <div>
                    <label className="input-label">Special Allowance (₹)</label>
                    <input
                      type="number"
                      value={gradeForm.special}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, special: parseInt(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                    />
                  </div>
                  <div className="grade-modal-gross-preview">
                    <span className="input-label">Gross Earnings</span>
                    <span className="grade-modal-gross-val text-success">
                      {formatCurrency((gradeForm.basic || 0) + (gradeForm.hra || 0) + (gradeForm.travel || 0) + (gradeForm.medical || 0) + (gradeForm.special || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Statutory Deductions ── */}
              <div>
                <div className="grade-modal-section-label" style={{ color: 'var(--color-danger)' }}>
                  <MinusCircle size={12} /> Statutory Deductions
                </div>
                <div className="grade-modal-fields-grid">
                  <div>
                    <label className="input-label">PF Contribution (₹)</label>
                    <input
                      type="number"
                      value={gradeForm.pf}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, pf: parseInt(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="input-label">ESI Contribution (₹)</label>
                    <input
                      type="number"
                      value={gradeForm.esi}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, esi: parseInt(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="input-label">Professional Tax / PT (₹)</label>
                    <input
                      type="number"
                      value={gradeForm.pt}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, pt: parseInt(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                      placeholder="200"
                    />
                  </div>
                  <div>
                    <label className="input-label">TDS Rate (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="40"
                      value={gradeForm.tdsRate}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, tdsRate: parseFloat(e.target.value) || 0 }))}
                      className="table-search-input width-full"
                      placeholder="10"
                    />
                  </div>
                  <div className="grade-modal-gross-preview" style={{ borderColor: 'var(--color-danger)' }}>
                    <span className="input-label">Total Deductions</span>
                    <span className="grade-modal-gross-val text-danger">
                      {formatCurrency((gradeForm.pf || 0) + (gradeForm.esi || 0) + (gradeForm.pt || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Net CTC Summary ── */}
              <div className="grade-modal-ctc-summary">
                <div className="grade-modal-ctc-row">
                  <span className="text-muted">Gross Earnings</span>
                  <span className="text-success">{formatCurrency((gradeForm.basic || 0) + (gradeForm.hra || 0) + (gradeForm.travel || 0) + (gradeForm.medical || 0) + (gradeForm.special || 0))}</span>
                </div>
                <div className="grade-modal-ctc-row">
                  <span className="text-muted">Total Deductions</span>
                  <span className="text-danger">− {formatCurrency((gradeForm.pf || 0) + (gradeForm.esi || 0) + (gradeForm.pt || 0))}</span>
                </div>
                <div className="grade-modal-ctc-row grade-modal-ctc-net">
                  <span style={{ fontWeight: 700 }}>Net Monthly CTC</span>
                  <span style={{ fontWeight: 800 }}>
                    {formatCurrency(
                      ((gradeForm.basic || 0) + (gradeForm.hra || 0) + (gradeForm.travel || 0) + (gradeForm.medical || 0) + (gradeForm.special || 0)) -
                      ((gradeForm.pf || 0) + (gradeForm.esi || 0) + (gradeForm.pt || 0))
                    )}
                  </span>
                </div>
              </div>

            </div>

            <div className="flex-center justify-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 20 }}>
              <Button variant="secondary" type="button" onClick={() => setShowGradeModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" icon={editingGrade ? Edit : Plus}>
                {editingGrade ? 'Update Grade' : 'Create Grade'}
              </Button>
            </div>
          </form>
        </div>
      )}


      {/* ==================== CREATE BONUS MODAL ==================== */}
      {showBonusModal && (
        <div className="payroll-modal-overlay">
          <form className="payroll-modal-container animate-slide-up" onSubmit={handleCreateBonus} style={{ maxWidth: '420px' }}>
            <div className="flex-center justify-between border-bottom pb-3 mb-4">
              <h3 className="modal-title-bold">Recommend Performance Bonus</h3>
              <button className="action-circle-btn" type="button" onClick={() => setShowBonusModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-3 font-small">
              <div>
                <label className="input-label">Target Employee</label>
                <select
                  value={bonusForm.employeeId}
                  onChange={(e) => setBonusForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="table-filter-select width-full p-2"
                >
                  {employees
                    .filter(emp => {
                      if (currentUserRole === 'manager' || perspective === 'manager') {
                        return emp.department === currentUser?.department;
                      }
                      if (currentUserRole === 'team_leader' || perspective === 'team_leader') {
                        return emp.department === currentUser?.department || emp.team === currentUser?.team;
                      }
                      if (currentUserRole === 'branch_admin' || perspective === 'branch_admin') {
                        return emp.branch === currentUser?.branch;
                      }
                      return true;
                    })
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="input-label">Bonus Category</label>
                <select
                  value={bonusForm.type}
                  onChange={(e) => setBonusForm(prev => ({ ...prev, type: e.target.value }))}
                  className="table-filter-select width-full p-2"
                >
                  <option value="Performance Bonus">Performance Bonus</option>
                  <option value="Project Completion Bonus">Project Completion Bonus</option>
                  <option value="Sales Incentive">Sales Incentive</option>
                  <option value="Referral Bonus">Referral Bonus</option>
                  <option value="Festival Bonus">Festival Bonus</option>
                  <option value="Retention Bonus">Retention Bonus</option>
                </select>
              </div>

              <div>
                <label className="input-label">Amount (INR)</label>
                <input
                  type="number"
                  required
                  value={bonusForm.amount}
                  onChange={(e) => setBonusForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="table-search-input width-full p-2"
                  placeholder="e.g. 15000"
                />
              </div>
            </div>

            <div className="flex-end gap-3 border-top pt-4 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowBonusModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Submit Recommendation</Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== CREATE LOAN MODAL ==================== */}
      {showApplyModal && (
        <div className="payroll-modal-overlay">
          <form className="payroll-modal-container animate-slide-up" onSubmit={handleCreateLoanAdvance} style={{ maxWidth: '420px' }}>
            <div className="flex-center justify-between border-bottom pb-3 mb-4">
              <h3 className="modal-title-bold">New Loan / Advance Issue</h3>
              <button className="action-circle-btn" type="button" onClick={() => setShowApplyModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-3 font-small">
              <div className="flex-center gap-4 bg-secondary p-2 rounded justify-center mb-2">
                <label className="flex-center gap-1 cursor-pointer">
                  <input type="radio" checked={applyType === 'Loan'} onChange={() => setApplyType('Loan')} /> Loan Structure
                </label>
                <label className="flex-center gap-1 cursor-pointer">
                  <input type="radio" checked={applyType === 'Advance'} onChange={() => setApplyType('Advance')} /> Salary Advance
                </label>
              </div>

              <div>
                <label className="input-label">Borrower Employee</label>
                <select
                  value={applyForm.employeeId}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="table-filter-select width-full p-2"
                >
                  {employees
                    .filter(emp => (currentUserRole === 'employee' || perspective === 'employee' ? emp.id === currentUser?.id : true))
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                    ))}
                </select>
              </div>

              {applyType === 'Loan' ? (
                <>
                  <div>
                    <label className="input-label">Loan Type</label>
                    <select
                      value={applyForm.type}
                      onChange={(e) => setApplyForm(prev => ({ ...prev, type: e.target.value }))}
                      className="table-filter-select width-full p-2"
                    >
                      <option value="Personal Loan">Personal Loan</option>
                      <option value="Emergency Loan">Emergency Loan</option>
                      <option value="Company Loan">Company Loan</option>
                    </select>
                  </div>
                  <div className="grid-2-col gap-3">
                    <div>
                      <label className="input-label">Total Amount</label>
                      <input
                        type="number"
                        required
                        value={applyForm.amount}
                        onChange={(e) => setApplyForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="table-search-input width-full p-2"
                      />
                    </div>
                    <div>
                      <label className="input-label">Monthly EMI</label>
                      <input
                        type="number"
                        required
                        value={applyForm.emi}
                        onChange={(e) => setApplyForm(prev => ({ ...prev, emi: e.target.value }))}
                        className="table-search-input width-full p-2"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="input-label">Advance Amount</label>
                    <input
                      type="number"
                      required
                      value={applyForm.amount}
                      onChange={(e) => setApplyForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="table-search-input width-full p-2"
                    />
                  </div>
                  <div>
                    <label className="input-label">Recovery Terms</label>
                    <input
                      type="text"
                      value={applyForm.recoverySchedule}
                      onChange={(e) => setApplyForm(prev => ({ ...prev, recoverySchedule: e.target.value }))}
                      className="table-search-input width-full p-2"
                      placeholder="e.g. Single Deduct (June)"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex-end gap-3 border-top pt-4 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowApplyModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Confirm & Disburse</Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== SALARY REVISION / ADJUST BASIC MODAL ==================== */}
      {showRevisionModal && (
        <div className="payroll-modal-overlay">
          <form 
            className="payroll-modal-container animate-slide-up" 
            onSubmit={async (e) => {
              e.preventDefault();
              await handleSalaryRevision(revisionEmpId, Number(revisionBasic));
              setShowRevisionModal(false);
            }} 
            style={{ maxWidth: '400px', width: '90%' }}
          >
            <div className="flex-center justify-between border-bottom pb-3 mb-4">
              <h3 className="modal-title-bold flex-center gap-2">
                <Edit className="text-primary" size={20} />
                Adjust Basic Salary (Revision)
              </h3>
              <button className="action-circle-btn" type="button" onClick={() => setShowRevisionModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-column gap-3 font-small" style={{ color: 'var(--text-primary)' }}>
              <div>
                <span className="text-muted block">Employee ID:</span>
                <strong className="text-primary mt-1 block">{revisionEmpId}</strong>
              </div>

              <div>
                <label className="input-label">New Basic Salary Rate (Monthly)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={revisionBasic}
                  onChange={(e) => setRevisionBasic(e.target.value)}
                  className="table-search-input width-full p-2"
                  placeholder="e.g. 35000"
                  style={{ width: '100%' }}
                />
                <span className="text-muted font-xsmall block mt-1">This will automatically recalculate allowances, PF, and TDS for future periods and recalculate this month's payroll.</span>
              </div>
            </div>

            <div className="flex-end gap-3 border-top pt-4 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowRevisionModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Apply Revision
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== RECALCULATION PREVIEW MODAL ==================== */}
      {showRecalcModal && recalcPreviewData && (
        <div className="payroll-modal-overlay">
          <div className="payroll-modal-container animate-slide-up" style={{ maxWidth: '580px', width: '90%' }}>
            <div className="flex-center justify-between border-bottom pb-3 mb-4">
              <h3 className="modal-title-bold flex-center gap-2">
                <RefreshCw className="text-primary animate-spin-slow" size={20} />
                Salary Recalculation Preview
              </h3>
              <button className="action-circle-btn" type="button" onClick={() => setShowRecalcModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-column gap-3 font-small" style={{ color: 'var(--text-primary)' }}>
              {/* Highlight summary cards */}
              <div className="grid-3-col gap-3 text-center">
                <div className="bg-secondary p-3 rounded flex-column justify-center align-center">
                  <span className="text-muted font-xsmall block">Original Net Salary</span>
                  <strong className="font-semibold block mt-1 text-primary">{formatCurrency(recalcPreviewData.oldNetSalary)}</strong>
                </div>
                <div className="bg-secondary p-3 rounded flex-column justify-center align-center">
                  <span className="text-muted font-xsmall block">Recalculated Net</span>
                  <strong className="font-semibold block mt-1 text-primary">{formatCurrency(recalcPreviewData.newNetSalary)}</strong>
                </div>
                <div className={`p-3 rounded flex-column justify-center align-center ${recalcPreviewData.difference >= 0 ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                  <span className="font-xsmall block">Difference Amount</span>
                  <strong className="font-bold block mt-1">
                    {recalcPreviewData.difference >= 0 ? '+' : ''}{formatCurrency(recalcPreviewData.difference)}
                  </strong>
                </div>
              </div>

              {/* Detailed Breakdown Comparison */}
              <div className="bg-secondary p-3 rounded flex-column gap-2" style={{ border: '1px solid var(--border-color)' }}>
                <span className="font-bold text-primary block border-bottom pb-1 font-xsmall text-uppercase tracking-wider">Recalculated Components Breakdown</span>
                <div className="overflow-y-auto pr-1 flex-column gap-1" style={{ maxHeight: '180px' }}>
                  <div className="flex-center justify-between border-bottom py-1 text-muted">
                    <span>Basic Salary Rate</span>
                    <span className="font-semibold text-primary">{formatCurrency(recalcPreviewData.breakdown.basicSalary)}</span>
                  </div>
                  <div className="flex-center justify-between border-bottom py-1 text-muted">
                    <span>Allowances</span>
                    <span className="font-semibold text-primary">{formatCurrency(recalcPreviewData.breakdown.allowances)}</span>
                  </div>
                  <div className="flex-center justify-between border-bottom py-1 text-muted">
                    <span>Overtime & Incentives</span>
                    <span className="font-semibold text-success">{formatCurrency(recalcPreviewData.breakdown.overtimePay + recalcPreviewData.breakdown.bonus)}</span>
                  </div>
                  <div className="flex-center justify-between border-bottom py-1 text-muted">
                    <span>Loss of Pay (LOP) Deductions</span>
                    <span className="font-semibold text-danger">{formatCurrency(recalcPreviewData.breakdown.leaveDeductions)}</span>
                  </div>
                  <div className="flex-center justify-between border-bottom py-1 text-muted">
                    <span>Statutory Tax & Loan EMI</span>
                    <span className="font-semibold text-danger">
                      {formatCurrency(recalcPreviewData.breakdown.statutoryDeductions + recalcPreviewData.breakdown.loanEMI + recalcPreviewData.breakdown.advanceDeduct + recalcPreviewData.breakdown.lateDeductions)}
                    </span>
                  </div>
                  <div className="flex-center justify-between py-1 font-semibold border-top mt-1" style={{ fontSize: '1.1em' }}>
                    <span className="text-primary">Recalculated Net take-home</span>
                    <span className="text-success">{formatCurrency(recalcPreviewData.breakdown.netSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Adjustment Mode Selection */}
              <div className="flex-column gap-2 border-top pt-3 mt-1">
                <span className="font-bold text-primary font-xsmall text-uppercase tracking-wider">Adjustment & Disbursement Options:</span>
                <div className="flex-column gap-2 mt-2">
                  <label 
                    className={`flex-center gap-3 p-3 rounded border cursor-pointer justify-start transition-all ${
                      selectedAdjustmentType === 'apply_current' 
                        ? 'border-primary bg-primary-light font-semibold' 
                        : 'border-secondary bg-secondary'
                    }`}
                    style={{ border: selectedAdjustmentType === 'apply_current' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)' }}
                  >
                    <input 
                      type="radio" 
                      name="adjustment_type" 
                      checked={selectedAdjustmentType === 'apply_current'} 
                      onChange={() => setSelectedAdjustmentType('apply_current')} 
                    />
                    <div className="flex-column align-start text-left gap-1">
                      <span className="font-medium text-primary">Disburse with this month's payroll</span>
                      <span className="text-muted font-xsmall" style={{ fontWeight: 'normal' }}>Immediately update this month's payslip and payout net salary.</span>
                    </div>
                  </label>

                  <label 
                    className={`flex-center gap-3 p-3 rounded border cursor-pointer justify-start transition-all ${
                      selectedAdjustmentType === 'adjust_next' 
                        ? 'border-primary bg-primary-light font-semibold' 
                        : 'border-secondary bg-secondary'
                    }`}
                    style={{ border: selectedAdjustmentType === 'adjust_next' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)' }}
                  >
                    <input 
                      type="radio" 
                      name="adjustment_type" 
                      checked={selectedAdjustmentType === 'adjust_next'} 
                      onChange={() => setSelectedAdjustmentType('adjust_next')} 
                    />
                    <div className="flex-column align-start text-left gap-1">
                      <span className="font-medium text-primary">Adjust in next month's payroll</span>
                      <span className="text-muted font-xsmall" style={{ fontWeight: 'normal' }}>Keep current month payslip unchanged. Carry forward difference to next month's payroll adjustment.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex-end gap-3 border-top pt-4 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowRecalcModal(false)} disabled={isSubmittingRecalc}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleConfirmRecalcAdjustment} disabled={isSubmittingRecalc}>
                {isSubmittingRecalc ? 'Processing...' : 'Confirm Adjustment'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Payroll;
