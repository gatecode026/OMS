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
  MinusCircle
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
    recommendBonus,
    updateBonusStatus,
    processPayrollCalculations,
    bulkUpdatePayrollStatus,
    updateSinglePayrollStatus,
    toggleEmployeeTaxRegime,
    savePayrollSalaryRevision,
    hasPermission
  } = useApp();

  // Selected Month/Year
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');

  // Role Perspective override (defaults to currentUserRole, but can be switched)
  const [perspective, setPerspective] = useState(currentUserRole || 'super_admin');

  // Active navigation tab
  const [activeTab, setActiveTab] = useState(currentUserRole === 'employee' ? 'processing' : 'dashboard');

  React.useEffect(() => {
    setPerspective(currentUserRole || 'super_admin');
    if (currentUserRole === 'employee') {
      setActiveTab('processing');
    }
  }, [currentUserRole]);

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
    leaveDeductionRate: payrollConfigs?.leaveDeductionRate ?? 2000,
    lateArrivalPenalty: payrollConfigs?.lateArrivalPenalty ?? 300,
    overtimeHourlyRate: payrollConfigs?.overtimeHourlyRate ?? 500
  }), [payrollConfigs]);

  const taxProfiles = useMemo(() => payrollConfigs?.taxProfiles || {}, [payrollConfigs]);
  const attendanceDaysMap = useMemo(() => payrollConfigs?.attendanceDaysMap || {}, [payrollConfigs]);
  const salaryStructures = useMemo(() => payrollConfigs?.salaryStructures || {}, [payrollConfigs]);

  const auditLogs = useMemo(() => {
    return (activityLogs || [])
      .filter(log => log.module === 'Payroll')
      .map(log => ({
        id: log.id,
        user: log.employeeName || 'System',
        action: log.action,
        prevVal: log.details || '—',
        newVal: log.target || '—',
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
        const savedPayment = monthlyPayments.find(p => p.employeeId === emp.id);
        if (savedPayment) {
          return savedPayment;
        }

        const empBasicSalary = Number(emp.salaryAmount) || 0;
        const struct = salaryStructures[emp.id] || {
          basic: empBasicSalary,
          hra: Math.round(empBasicSalary * 0.4),
          travel: 3000,
          medical: 2000,
          special: 1000,
          pf: Math.round(empBasicSalary * 0.12),
          esi: 0,
          pt: 200,
          tds: Math.round(empBasicSalary * 0.1)
        };
        const basicSalary = struct.basic || empBasicSalary;
        const totalAllowances = (struct.hra || 0) + (struct.travel || 0) + (struct.medical || 0) + (struct.special || 0);
        const statutoryDeductions = (struct.pf || 0) + (struct.esi || 0) + (struct.pt || 200) + (struct.tds || 0);
        const grossSalary = basicSalary + totalAllowances;
        const netSalary = grossSalary - statutoryDeductions;
        return {
          id: `${emp.id}-${month}-${year}`,
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department || 'Management',
          designation: emp.designation || 'Staff',
          branch: emp.branch || 'Head Office',
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
          statutoryDeductions
        };
      });

    if (!currentUserRole || currentUserRole === 'super_admin' || perspective === 'super_admin') return activeState;
    return activeState.filter(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      if (perspective === 'employee' || currentUserRole === 'employee') {
        return p.employeeId === currentUser?.id;
      }
      if (perspective === 'branch_admin' || currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (perspective === 'manager' || currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        return emp?.department === currentUser?.department;
      }
      if (perspective === 'team_leader' || currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [payrollState, employees, currentUser, currentUserRole, perspective, month, year, salaryStructures]);

  const scopedReimbursements = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin' || perspective === 'super_admin') return reimbursements;
    return reimbursements.filter(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      if (perspective === 'employee' || currentUserRole === 'employee') {
        return r.employeeId === currentUser?.id;
      }
      if (perspective === 'branch_admin' || currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (perspective === 'manager' || currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        return emp?.department === currentUser?.department;
      }
      if (perspective === 'team_leader' || currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [reimbursements, employees, currentUser, currentUserRole, perspective]);

  const scopedLoans = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin' || perspective === 'super_admin') return loans;
    return loans.filter(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      if (perspective === 'employee' || currentUserRole === 'employee') {
        return l.employeeId === currentUser?.id;
      }
      if (perspective === 'branch_admin' || currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (perspective === 'manager' || currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        return emp?.department === currentUser?.department;
      }
      if (perspective === 'team_leader' || currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [loans, employees, currentUser, currentUserRole, perspective]);

  const scopedAdvances = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin' || perspective === 'super_admin') return advances;
    return advances.filter(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      if (perspective === 'employee' || currentUserRole === 'employee') {
        return a.employeeId === currentUser?.id;
      }
      if (perspective === 'branch_admin' || currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (perspective === 'manager' || currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        return emp?.department === currentUser?.department;
      }
      if (perspective === 'team_leader' || currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [advances, employees, currentUser, currentUserRole, perspective]);

  const scopedBonuses = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin' || perspective === 'super_admin') return bonuses;
    return bonuses.filter(b => {
      const emp = employees.find(e => e.id === b.employeeId);
      if (perspective === 'employee' || currentUserRole === 'employee') {
        return b.employeeId === currentUser?.id;
      }
      if (perspective === 'branch_admin' || currentUserRole === 'branch_admin') {
        return emp?.branch === currentUser?.branch;
      }
      if (perspective === 'manager' || currentUserRole === 'manager' || currentUserRole === 'dept_admin') {
        return emp?.department === currentUser?.department;
      }
      if (perspective === 'team_leader' || currentUserRole === 'team_leader') {
        return emp?.department === currentUser?.department || emp?.team === currentUser?.team;
      }
      return true;
    });
  }, [bonuses, employees, currentUser, currentUserRole, perspective]);

  const scopedAuditLogs = useMemo(() => {
    if (!currentUserRole || currentUserRole === 'super_admin' || perspective === 'super_admin') return auditLogs;
    return auditLogs.filter(log => {
      if (perspective === 'employee' || currentUserRole === 'employee') {
        return log.user === currentUser?.name;
      }
      return true;
    });
  }, [auditLogs, currentUser, currentUserRole, perspective]);

  // --- Dynamic Calculator Engine logic ---
  const calculatedPayrollData = useMemo(() => {
    return scopedPayrollState.map(p => {
      const empId = p.employeeId;
      const emp = employees.find(e => e.id === empId);
      const empBasicSalary = Number(emp?.salaryAmount) || 0;
      const struct = salaryStructures[empId] || {
        basic: empBasicSalary,
        hra: Math.round(empBasicSalary * 0.4),
        travel: 3000,
        medical: 2000,
        special: 1000,
        pf: Math.round(empBasicSalary * 0.12),
        esi: 0,
        pt: 200,
        tds: Math.round(empBasicSalary * 0.1)
      };
      const att = attendanceDaysMap[empId] || { present: 22, absent: 0, halfDays: 0, paidLeaves: 2, unpaidLeaves: 0, overtimeHours: 0, lateArrivals: 0 };

      // Allowances Sum
      const totalAllowances = (struct.hra || 0) + (struct.travel || 0) + (struct.medical || 0) + (struct.special || 0);

      // Unpaid Leave Deduction
      const leaveDeduction = att.unpaidLeaves * Math.round((struct.basic || empBasicSalary) / 24);

      // Late penalty
      const lateDeduction = att.lateArrivals * attendanceConfigs.lateArrivalPenalty;

      // Overtime Pay
      const overtimePay = att.overtimeHours * attendanceConfigs.overtimeHourlyRate;

      // Bonuses
      const approvedBonuses = bonuses
        .filter(b => b.employeeId === empId && (b.status === 'Super Admin Approved' || b.status === 'Released'))
        .reduce((sum, curr) => sum + curr.amount, 0);

      // Reimbursements (only Approved/Released)
      const approvedReimbursements = reimbursements
        .filter(r => r.employeeId === empId && (r.status === 'Approved' || r.status === 'Released'))
        .reduce((sum, curr) => sum + curr.amount, 0);

      // Deductions from loans / advances
      const loanEMI = loans
        .filter(l => l.employeeId === empId)
        .reduce((sum, curr) => sum + curr.emi, 0);

      const advanceDeduct = advances
        .filter(a => a.employeeId === empId)
        .reduce((sum, curr) => sum + curr.amount, 0);

      // Total Statutory Deductions
      const statutoryDeductions = (struct.pf || 0) + (struct.esi || 0) + (struct.pt || 200) + (struct.tds || 0);

      // Total Deductions
      const totalDeductions = statutoryDeductions + leaveDeduction + lateDeduction + loanEMI + advanceDeduct;

      // Gross Salary
      const grossSalary = (struct.basic || empBasicSalary) + totalAllowances + overtimePay + approvedBonuses;

      // Net Salary
      const netSalary = grossSalary - totalDeductions;

      return {
        ...p,
        basicSalary: struct.basic || empBasicSalary,
        grossSalary,
        attendanceDays: att.present + att.paidLeaves + (att.halfDays * 0.5),
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
        bankName: struct.bankName || 'HDFC Bank',
        bankAccount: struct.bankAccountNumber || 'XXXX-XXXX-XXXX-9823',
        bankIfsc: struct.bankIfscCode || 'HDFC0000245',
        pan: taxProfiles[empId]?.pan || 'AAAPS1234F',
        regime: taxProfiles[empId]?.regime || 'New'
      };
    });
  }, [payrollState, salaryStructures, attendanceDaysMap, bonuses, reimbursements, loans, advances, attendanceConfigs, taxProfiles, employees]);

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

  // Apply new loan or advance
  const handleCreateLoanAdvance = async (e) => {
    e.preventDefault();
    const empId = perspective === 'employee' ? (currentUser?.id || 'EMP-2026-001') : (applyForm.employeeId || employees[0]?.id);
    const targetEmp = employees.find(emp => emp.id === empId) || { name: 'Employee' };
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
    const targetEmp = employees.find(emp => emp.id === bonusForm.employeeId) || { name: 'Employee' };
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

      // If perspective is Employee, restrict view to current employee only
      const matchesPerspective = perspective === 'employee' ? row.employeeId === (currentUser?.id || 'EMP-2026-001') : true;

      return matchesSearch && matchesDept && matchesBranch && matchesStatus && matchesPerspective;
    });
  }, [calculatedPayrollData, searchQuery, filterDept, filterBranch, filterStatus, perspective, currentUser]);

  // Selected Employee Data for Details Tab
  const selectedEmployeeObj = useMemo(() => {
    const targetId = selectedEmpId || (currentUserRole === 'employee' || perspective === 'employee' ? currentUser?.id : 'EMP-2026-002');
    return calculatedPayrollData.find(e => e.employeeId === targetId) || calculatedPayrollData[0];
  }, [calculatedPayrollData, selectedEmpId, currentUser, currentUserRole, perspective]);

  // Selected Employee Payslip Modal Data
  const payslipEmployeeObj = useMemo(() => {
    const targetId = payslipEmpId || (currentUserRole === 'employee' || perspective === 'employee' ? currentUser?.id : 'EMP-2026-001');
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
  Transaction Status              : ${empObj.status === 'Released' ? 'PROCESSED & DISBURSED' : 'AWAITING DISBURSAL'}
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

          {hasPermission('payroll_management', 'create') && (
            <Button variant="primary" onClick={handleProcessPayroll} icon={Landmark}>
              Process Payroll
            </Button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="card tab-bar-card overflow-x-auto">
        <div className="payroll-tabs-list">
          {perspective !== 'employee' && <button onClick={() => setActiveTab('dashboard')} className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}><TrendingUp size={16} />Dashboard & Analytics</button>}
          <button onClick={() => setActiveTab('processing')} className={`tab-btn ${activeTab === 'processing' ? 'active' : ''}`}><Sliders size={16} />{perspective === 'employee' ? 'My Payslips' : 'Processing Center'}</button>
          {perspective !== 'employee' && <button onClick={() => setActiveTab('structures')} className={`tab-btn ${activeTab === 'structures' ? 'active' : ''}`}><Settings size={16} />Salary Structures</button>}
          <button onClick={() => setActiveTab('bonuses')} className={`tab-btn ${activeTab === 'bonuses' ? 'active' : ''}`}><Award size={16} />{perspective === 'employee' ? 'My Bonuses & Incentives' : 'Bonuses & Incentives'}</button>
          <button onClick={() => setActiveTab('loans')} className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`}><Scale size={16} />{perspective === 'employee' ? 'My Loans & Advances' : 'Loans & Advances'}</button>
          <button onClick={() => setActiveTab('calendar')} className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}><Calendar size={16} />Payroll Calendar</button>
          {perspective !== 'employee' && <button onClick={() => setActiveTab('audit')} className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}><Database size={16} />Audit Trails & Reports</button>}
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
                <span>Prev Month: {formatCurrency(540000)}</span>
                <span>Active Staff: {totalEmployees}</span>
              </div>
            </div>

            <div className="card payroll-stat-card border-bottom-success">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Payroll Disbursed</span>
                <span className="badge-paid flex-center gap-1 font-xsmall"><CheckCircle size={12} /> Live</span>
              </div>
              <h3 className="stat-num text-success">{formatCurrency(calculatedPayrollData.filter(p => p.status === 'Released').reduce((sum, c) => sum + c.netSalary, 0))}</h3>
              <div className="flex-center justify-between font-small text-muted width-full">
                <span>Processed: {processedCount} Staff</span>
                <span>Pending Disbursal: {pendingCount}</span>
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
        perspective === 'employee' ? (
          <div className="personal-payslip-layout animate-fade-in">
            {/* Left Sidebar: Select Month/Year or List of Past Payslips */}
            <div className="payslips-history-sidebar card glass flex-column gap-3">
              <h4 className="payslip-title">My Pay Statements</h4>
              <p className="font-xsmall text-muted" style={{ marginTop: -8 }}>Select a pay period to view and download your statement.</p>
              
              <div className="payslip-periods-list">
                {['June', 'May', 'April', 'March', 'February', 'January'].map(m => {
                  const isCurrent = month === m;
                  // Find the payslip object for this month
                  const periodObj = calculatedPayrollData.find(p => p.month === m && p.year === year);
                  const isPaid = periodObj?.status === 'Released';
                  
                  return (
                    <div
                      key={m}
                      className={`payslip-period-item ${isCurrent ? 'active' : ''}`}
                      onClick={() => setMonth(m)}
                    >
                      <div className="flex-column gap-1">
                        <span className="period-month">{m} {year}</span>
                        <span className="period-net">{periodObj ? formatCurrency(periodObj.netSalary) : '—'}</span>
                      </div>
                      <Badge variant={isPaid ? 'success' : 'warning'}>
                        {isPaid ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                  );
                })}
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
                    <Button
                      variant="primary"
                      icon={Download}
                      onClick={() => handleDownloadPayslip(selectedEmployeeObj)}
                    >
                      Download PDF
                    </Button>
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
                      <div className="flex-center justify-between py-1"><span>Basic Salary:</span> <strong>{formatCurrency(selectedEmployeeObj.basicSalary)}</strong></div>
                      <div className="flex-center justify-between py-1"><span>House Rent Allowance (HRA):</span> <strong>{formatCurrency(Math.round(selectedEmployeeObj.basicSalary * 0.4))}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Conveyance & Medical Allowances:</span> <strong>{formatCurrency(8000)}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Overtime Remunerations:</span> <strong>{formatCurrency(selectedEmployeeObj.overtimeAmount)}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Performance Bonus:</span> <strong>{formatCurrency(selectedEmployeeObj.bonusAmount)}</strong></div>
                      <div className="flex-center justify-between border-top pt-2 font-semibold text-success"><span>Gross Earnings:</span> <strong>{formatCurrency(selectedEmployeeObj.grossSalary)}</strong></div>
                    </div>

                    {/* Deductions */}
                    <div className="flex-column gap-2">
                      <span className="font-bold text-danger border-bottom pb-1 flex-row gap-1 align-center">
                        <MinusCircle size={14} /> Deductions
                      </span>
                      <div className="flex-center justify-between py-1"><span>Provident Fund (PF):</span> <strong>{formatCurrency(Math.round(selectedEmployeeObj.basicSalary * 0.12))}</strong></div>
                      <div className="flex-center justify-between py-1"><span>TDS / Income Tax:</span> <strong>{formatCurrency(Math.round(selectedEmployeeObj.basicSalary * 0.1))}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Professional Tax (PT):</span> <strong>{formatCurrency(200)}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Leave Deductions:</span> <strong>{formatCurrency(selectedEmployeeObj.leaveDeductions)}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Late Punch Deductions:</span> <strong>{formatCurrency(selectedEmployeeObj.lateDeductions)}</strong></div>
                      <div className="flex-center justify-between py-1"><span>Loan EMI Recovery:</span> <strong>{formatCurrency(selectedEmployeeObj.loanEMI + selectedEmployeeObj.advanceDeduct)}</strong></div>
                      <div className="flex-center justify-between border-top pt-2 font-semibold text-danger"><span>Total Deductions:</span> <strong>{formatCurrency(selectedEmployeeObj.totalDeductions)}</strong></div>
                    </div>
                  </div>

                  {/* Summary Net Take-Home */}
                  <div className="payslip-net-summary flex-row justify-between align-center p-4 rounded border">
                    <div className="flex-column">
                      <span className="font-semibold text-primary">Net Take-Home Salary</span>
                      <span className="font-xsmall text-muted">Transferred to your bank account on disbursal</span>
                    </div>
                    <span className="font-bold text-success font-large">{formatCurrency(selectedEmployeeObj.netSalary)}</span>
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

                  <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="table-filter-select">
                    <option value="">All Branches</option>
                    {(branches || []).map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>

                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="table-filter-select">
                    <option value="">All Statuses</option>
                    <option value="Calculated">Calculated</option>
                    <option value="HR Verified">HR Verified</option>
                    <option value="Finance Approved">Finance Approved</option>
                    <option value="Released">Released (Paid)</option>
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
                          Release Salary
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
                          <td><span className="badge badge-secondary">{row.branch}</span></td>
                          <td className="font-semibold">{formatCurrency(row.basicSalary)}</td>
                          <td className="text-center font-semibold">{row.attendanceDays}</td>
                          <td className="text-success font-semibold">+{formatCurrency(row.overtimeAmount)}</td>
                          <td className="text-success font-semibold">+{formatCurrency(row.bonusAmount)}</td>
                          <td className="text-danger font-semibold">-{formatCurrency(row.totalDeductions)}</td>
                          <td className="text-info font-bold">{formatCurrency(row.netSalary)}</td>
                          <td>
                            <Badge variant={
                              row.status === 'Released' ? 'success' :
                              row.status === 'Finance Approved' ? 'info' :
                              row.status === 'HR Verified' ? 'primary' :
                              row.status === 'Hold' ? 'danger' : 'warning'
                            }>
                              {row.status === 'Released' ? 'Disbursed' : row.status}
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
                              
                              {perspective !== 'employee' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={Edit}
                                  onClick={() => {
                                    setSelectedEmpId(row.employeeId);
                                    setActiveTab('attendance');
                                  }}
                                  title="Adjust Adjustments"
                                />
                              )}

                              {perspective === 'super_admin' && row.status !== 'Released' && (
                                <button
                                  className="action-circle-btn success-btn"
                                  onClick={() => handleStatusChange(row.employeeId, 'Released')}
                                  title="Release Salary"
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
      {/* ==================== TAB CONTENT: SALARY STRUCTURES ==================== */}
      {activeTab === 'structures' && perspective !== 'employee' && (
        <div className="flex-column grid-gap animate-fade-in">
          {/* Section Header */}
          <div className="flex-center justify-between">
            <div>
              <h3 className="card-sec-title" style={{ marginBottom: 2 }}>Compensation Structures & Pay Grades</h3>
              <p className="subtitle">Define salary bands, allowances, statutory deductions, and TDS rates per grade tier.</p>
            </div>
            {hasPermission('payroll_management', 'create') && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => {
                setEditingGrade(null);
                setGradeForm({ id: '', grade: '', payBand: '', basic: 50000, hra: 20000, travel: 5000, medical: 3000, special: 2000, pf: 6000, esi: 0, pt: 200, tdsRate: 10, effectiveDate: '2026-06-01' });
                setShowGradeModal(true);
              }}>
                Add Structure Grade
              </Button>
            )}
          </div>

          {/* Grade Cards Grid */}
          <div className="grade-cards-grid">
            {salaryGrades.map((g, idx) => {
              const tierColors = ['#6366f1','#10b981','#f59e0b','#ec4899'];
              const tierNames = ['Executive','Managerial','Senior','Professional'];
              const accentColor = tierColors[idx % tierColors.length];
              const totalEarnings = g.basic + g.hra + g.travel + g.medical + g.special;
              const totalDeductions = g.pf + g.esi + g.pt;
              const netCTC = totalEarnings - totalDeductions;

              return (
                <div key={g.id} className="grade-card-premium card">
                  {/* Colored top bar */}
                  <div className="grade-card-topbar" style={{ background: accentColor }} />

                  {/* Card Header */}
                  <div className="grade-card-header">
                    <div className="grade-card-title-row">
                      <div>
                        <span className="grade-tier-badge" style={{ background: accentColor + '20', color: accentColor, border: `1px solid ${accentColor}40` }}>
                          {tierNames[idx % tierNames.length]}
                        </span>
                        <h4 className="grade-name-txt">{g.grade}</h4>
                        <span className="grade-id-badge">ID: {g.id} • Band: {g.payBand}</span>
                      </div>
                      <div className="grade-ctc-pill" style={{ borderColor: accentColor + '40' }}>
                        <span className="grade-ctc-label">Monthly CTC</span>
                        <span className="grade-ctc-value" style={{ color: accentColor }}>{formatCurrency(netCTC)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="grade-section-label">
                    <TrendingUp size={12} />
                    Earnings Components
                  </div>
                  <div className="grade-components-grid">
                    <div className="grade-comp-item">
                      <span className="grade-comp-label">Basic Salary</span>
                      <span className="grade-comp-value text-primary-c">{formatCurrency(g.basic)}</span>
                    </div>
                    <div className="grade-comp-item">
                      <span className="grade-comp-label">HRA</span>
                      <span className="grade-comp-value">{formatCurrency(g.hra)}</span>
                    </div>
                    <div className="grade-comp-item">
                      <span className="grade-comp-label">Travel</span>
                      <span className="grade-comp-value">{formatCurrency(g.travel)}</span>
                    </div>
                    <div className="grade-comp-item">
                      <span className="grade-comp-label">Medical</span>
                      <span className="grade-comp-value">{formatCurrency(g.medical)}</span>
                    </div>
                    <div className="grade-comp-item">
                      <span className="grade-comp-label">Special</span>
                      <span className="grade-comp-value">{formatCurrency(g.special)}</span>
                    </div>
                    <div className="grade-comp-item grade-comp-total">
                      <span className="grade-comp-label">Gross</span>
                      <span className="grade-comp-value text-success">{formatCurrency(totalEarnings)}</span>
                    </div>
                  </div>

                  {/* Deductions Row */}
                  <div className="grade-section-label" style={{ marginTop: 10 }}>
                    <MinusCircle size={12} />
                    Statutory Deductions
                  </div>
                  <div className="grade-deductions-row">
                    <div className="grade-deduct-chip">
                      <span>PF</span>
                      <span className="text-danger">{formatCurrency(g.pf)}</span>
                    </div>
                    <div className="grade-deduct-chip">
                      <span>ESI</span>
                      <span className="text-danger">{formatCurrency(g.esi)}</span>
                    </div>
                    <div className="grade-deduct-chip">
                      <span>PT</span>
                      <span className="text-danger">{formatCurrency(g.pt)}</span>
                    </div>
                    <div className="grade-deduct-chip">
                      <span>TDS Rate</span>
                      <span className="text-warning">{g.tdsRate}%</span>
                    </div>
                  </div>

                  {/* Footer: date + actions */}
                  <div className="grade-card-footer">
                    <span className="grade-effective-date">
                      <Calendar size={11} /> Effective: {g.effectiveDate || '2026-01-01'}
                    </span>
                    <div className="flex-center gap-2">
                      {hasPermission('payroll_management', 'update') && (
                        <button className="action-circle-btn" onClick={() => handleEditGradeClick(g)} title="Edit">
                          <Edit size={12} />
                        </button>
                      )}
                      {hasPermission('payroll_management', 'delete') && (
                        <button className="action-circle-btn" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteGrade(g.id)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Employee Salary Revision */}
          <div className="card p-5">
            <div className="flex-center justify-between" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="card-sec-title" style={{ marginBottom: 2 }}>Quick Employee Salary Revision</h3>
                <p className="subtitle">Revise base CTC directly. Changes apply to the current month's payroll engine.</p>
              </div>
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                Live Engine
              </span>
            </div>

            <div className="salary-revision-list">
              {calculatedPayrollData.map((emp, i) => (
                <div key={emp.employeeId} className="salary-revision-row">
                  <div className="salary-rev-avatar" style={{ background: ['#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#8b5cf6','#06b6d4'][i % 7] + '20', color: ['#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#8b5cf6','#06b6d4'][i % 7] }}>
                    {emp.employeeName.charAt(0)}
                  </div>
                  <div className="salary-rev-info">
                    <span className="salary-rev-name">{emp.employeeName}</span>
                    <span className="salary-rev-dept">{emp.department} · {emp.designation}</span>
                  </div>
                  <div className="salary-rev-current">
                    <span className="salary-rev-current-label">Current Basic</span>
                    <span className="salary-rev-current-val">{formatCurrency(emp.basicSalary)}</span>
                  </div>
                  <div className="flex-center gap-2">
                    <ChevronRight size={16} className="text-muted" />
                    <input
                      type="number"
                      defaultValue={emp.basicSalary}
                      onBlur={(e) => handleSalaryRevision(emp.employeeId, e.target.value)}
                      className="salary-rev-input"
                      placeholder="New Basic"
                      disabled={!hasPermission('payroll_management', 'update')}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ==================== TAB CONTENT: BONUSES & INCENTIVES ==================== */}
      {activeTab === 'bonuses' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="flex-center justify-between">
            <div>
              <h3 className="card-sec-title" style={{ marginBottom: 2 }}>{perspective === 'employee' ? 'My Bonuses & Incentives' : 'Bonus & Incentives Dashboard'}</h3>
              <p className="subtitle">Recommend performance awards, track verification flow milestones, and monitor disbursements.</p>
            </div>
            {perspective !== 'employee' && hasPermission('payroll_management', 'create') && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => {
                setBonusForm({ employeeId: employees[0]?.id || '', amount: 10000, type: 'Performance Bonus', remarks: 'Q2 Performance target achievement', effectiveDate: '2026-06-12' });
                setShowBonusModal(true);
              }}>
                Recommend Award
              </Button>
            )}
          </div>

          {perspective === 'employee' ? (
            <div className="flex-column grid-gap animate-fade-in">
              {/* Summary Metrics Row */}
              <div className="bonuses-kpi-grid">
                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Total Bonuses Received</span>
                    <h3 className="stat-num text-success">
                      {formatCurrency(scopedBonuses.filter(b => b.status === 'Super Admin Approved').reduce((sum, curr) => sum + curr.amount, 0))}
                    </h3>
                    <span className="font-xsmall text-muted">Disbursed in current cycle</span>
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
                    <span className="font-xsmall text-muted">Disbursed performance awards</span>
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
              <h3 className="card-sec-title" style={{ marginBottom: 2 }}>{perspective === 'employee' ? 'My Loans & Advances' : 'Loans & Salary Advances Ledger'}</h3>
              <p className="subtitle">Track outstanding agreements, check monthly recovery deductions, and apply for financial assistance.</p>
            </div>
            {perspective !== 'employee' && (
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

          {perspective === 'employee' ? (
            <div className="flex-column grid-gap animate-fade-in">
              {/* Employee Personal KPIs */}
              <div className="loans-kpi-grid">
                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Outstanding Loan Balance</span>
                    <h3 className="stat-num text-danger">{formatCurrency(scopedLoans.reduce((sum, curr) => sum + curr.remainingBalance, 0))}</h3>
                    <span className="font-xsmall text-muted">Remaining principal balance</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-danger">
                    <Scale size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Salary Advance Balance</span>
                    <h3 className="stat-num text-warning">{formatCurrency(scopedAdvances.reduce((sum, curr) => sum + curr.remainingBalance, 0))}</h3>
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
                        scopedLoans.reduce((sum, curr) => sum + curr.emi, 0) +
                        scopedAdvances.reduce((sum, curr) => sum + curr.remainingBalance, 0)
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
                              <span>Status: <Badge variant="success">{a.status}</Badge></span>
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
                    <span className="stat-label">Total Disbursed Loans</span>
                    <h3 className="stat-num text-primary">{formatCurrency(loans.reduce((sum, curr) => sum + curr.amount, 0))}</h3>
                    <span className="font-xsmall text-muted">Total corporate loan capital</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-primary">
                    <Scale size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Salary Advances Outstanding</span>
                    <h3 className="stat-num text-warning">{formatCurrency(advances.reduce((sum, curr) => sum + curr.remainingBalance, 0))}</h3>
                    <span className="font-xsmall text-muted">Pending salary settlements</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-warning">
                    <Clock size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Monthly EMI Recovery Pool</span>
                    <h3 className="stat-num text-success">{formatCurrency(loans.reduce((sum, curr) => sum + curr.emi, 0))}</h3>
                    <span className="font-xsmall text-muted">Recoverable next payroll run</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-success">
                    <DollarSign size={20} />
                  </div>
                </div>

                <div className="premium-kpi-card">
                  <div className="premium-kpi-info">
                    <span className="stat-label">Active Debtors Count</span>
                    <h3 className="stat-num text-info">{new Set([...loans, ...advances].map(item => item.employeeId)).size} Staff</h3>
                    <span className="font-xsmall text-muted">Active balances total</span>
                  </div>
                  <div className="premium-kpi-icon-badge badge-glow-info">
                    <Users size={20} />
                  </div>
                </div>
              </div>

              {/* Ledger Cards */}
              <div className="grid-2-col gap-6">
                {/* Active Loans */}
                <div className="card p-5 flex-column gap-3">
                  <h4 className="text-primary font-bold">Active Employee Loans</h4>
                  
                  <div className="flex-column gap-4">
                    {scopedLoans.length > 0 ? (
                      scopedLoans.map(l => (
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
                    {scopedAdvances.length > 0 ? (
                      scopedAdvances.map(a => (
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

      {/* ==================== TAB CONTENT: PAYROLL CALENDAR ==================== */}
      {activeTab === 'calendar' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div>
            <h3 className="card-sec-title" style={{ marginBottom: 2 }}>Payroll Cutoff & Schedules Calendar</h3>
            <p className="subtitle">Track monthly processing deadlines, cutoff milestones, and tax compliance dates for the current quarter.</p>
          </div>

          <div className="calendar-split-layout">
            {/* Left Column: Payroll Processing Timeline */}
            <div className="card p-5 flex-column gap-4">
              <h4 className="font-semibold text-primary flex-center gap-2 justify-start" style={{ margin: 0 }}>
                <Clock size={18} /> Payroll Run Cycle Timeline (June 2026)
              </h4>
              <p className="font-xsmall text-muted" style={{ marginTop: -8 }}>Key stages for monthly attendance auditing, verification, and disbursement.</p>
              
              <div className="calendar-timeline-v">
                {/* Step 1: Completed */}
                <div className="timeline-step-item step-passed">
                  <div className="timeline-step-node"></div>
                  <div className="timeline-step-header">
                    <span className="font-bold font-small">1. Reimbursements Cutoff</span>
                    <Badge variant="success">Passed</Badge>
                  </div>
                  <span className="font-xsmall text-muted font-semibold">Deadline: June 20, 2026</span>
                  <p className="font-xsmall text-muted mt-1">Submit travel, medical, and client expense claims for inclusion in this cycle.</p>
                </div>

                {/* Step 2: Active */}
                <div className="timeline-step-item step-active">
                  <div className="timeline-step-node"></div>
                  <div className="timeline-step-header">
                    <span className="font-bold font-small text-primary">2. Attendance & Log Verification</span>
                    <Badge variant="warning">In Progress</Badge>
                  </div>
                  <span className="font-xsmall text-muted font-semibold">Deadline: June 25, 2026</span>
                  <p className="font-xsmall text-muted mt-1">Verify employee check-ins, half days, overtime, and punch records for payroll sync.</p>
                </div>

                {/* Step 3: Upcoming */}
                <div className="timeline-step-item">
                  <div className="timeline-step-node"></div>
                  <div className="timeline-step-header">
                    <span className="font-bold font-small text-secondary">3. Payroll Run Processing Due</span>
                    <Badge variant="secondary">Scheduled</Badge>
                  </div>
                  <span className="font-xsmall text-muted font-semibold">Deadline: June 28, 2026</span>
                  <p className="font-xsmall text-muted mt-1">Recalculate structures, basic revision edits, TDS deductions, and professional tax.</p>
                </div>

                {/* Step 4: Upcoming */}
                <div className="timeline-step-item">
                  <div className="timeline-step-node"></div>
                  <div className="timeline-step-header">
                    <span className="font-bold font-small text-secondary">4. Salary Disbursement Release</span>
                    <Badge variant="secondary">Disbursement</Badge>
                  </div>
                  <span className="font-xsmall text-muted font-semibold">Deadline: June 30, 2026</span>
                  <p className="font-xsmall text-muted mt-1">Disburse payments to bank accounts and send system notification slips.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Tax Compliance Calendar */}
            <div className="card p-5 flex-column gap-4">
              <h4 className="font-semibold text-success flex-center gap-2 justify-start" style={{ margin: 0 }}>
                <Calendar size={18} /> Statutory Tax Compliance Schedule
              </h4>
              <p className="font-xsmall text-muted" style={{ marginTop: -8 }}>Important quarterly and monthly filing deadlines for government audits.</p>
              
              <div className="compliance-grid-v">
                {/* Due 1 */}
                <div className="compliance-card-premium">
                  <div className="calendar-sheet">
                    <div className="calendar-sheet-header bg-primary">Jul</div>
                    <div className="calendar-sheet-day">07</div>
                  </div>
                  <div className="compliance-card-info">
                    <span className="compliance-card-title">Monthly TDS Deposit Due</span>
                    <span className="compliance-card-due font-xsmall text-muted">Filing period: June 2026 • Challan ITNS 281</span>
                    <span className="badge badge-secondary p-1 font-xsmall" style={{ width: 'fit-content', marginTop: 4 }}>Due in 25 Days</span>
                  </div>
                </div>

                {/* Due 2 */}
                <div className="compliance-card-premium" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <div className="calendar-sheet">
                    <div className="calendar-sheet-header bg-success">Jul</div>
                    <div className="calendar-sheet-day">15</div>
                  </div>
                  <div className="compliance-card-info">
                    <span className="compliance-card-title">PF & ESI Filing Deadline</span>
                    <span className="compliance-card-due font-xsmall text-muted">Filing period: June 2026 • Form 5 & Form 10</span>
                    <span className="badge badge-secondary p-1 font-xsmall" style={{ width: 'fit-content', marginTop: 4 }}>Due in 33 Days</span>
                  </div>
                </div>

                {/* Due 3 */}
                <div className="compliance-card-premium" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                  <div className="calendar-sheet">
                    <div className="calendar-sheet-header">Jul</div>
                    <div className="calendar-sheet-day">31</div>
                  </div>
                  <div className="compliance-card-info">
                    <span className="compliance-card-title">TDS Return Filing (Q1)</span>
                    <span className="compliance-card-due font-xsmall text-muted">Form 24Q Submission • FY 2026-27</span>
                    <span className="badge badge-secondary p-1 font-xsmall" style={{ width: 'fit-content', marginTop: 4 }}>Due in 49 Days</span>
                  </div>
                </div>
              </div>

              {/* Reminders box */}
              <div className="p-4 bg-secondary rounded flex-column gap-2 mt-2">
                <span className="font-semibold text-warning font-small flex-center gap-1"><AlertTriangle size={14} /> Compliance Notices</span>
                <div className="flex-column gap-1 font-xsmall text-muted">
                  <div>🔔 Submission window for Q1 Investment Proofs is currently open.</div>
                  <div>🔔 Penalty for late TDS return filing is ₹200 per day under Section 234E.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: AUDIT TRAILS ==================== */}
      {activeTab === 'audit' && perspective !== 'employee' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="grid-2-col gap-6">
            {/* Audit Logs Table */}
            <div className="card p-5 flex-column gap-3">
              <h3 className="card-sec-title">Compliance & Payroll Audit Trail</h3>
              
              <div className="overflow-x-auto">
                <table className="payroll-data-table font-small">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Action</th>
                      <th>Prev Value</th>
                      <th>New Value</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopedAuditLogs.map(log => (
                      <tr key={log.id}>
                        <td className="font-semibold">{log.user}</td>
                        <td>{log.action}</td>
                        <td className="text-danger">{log.prevVal}</td>
                        <td className="text-success">{log.newVal}</td>
                        <td className="text-muted font-xsmall">{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reports Downloads Center */}
            <div className="card p-5 flex-column gap-4">
              <h3 className="card-sec-title">Statutory Reports & Compliances Center</h3>
              
              <div className="grid-2-col gap-4">
                <div className="p-4 border rounded flex-column gap-2 align-center justify-center text-center hover-card-effect">
                  <FileText className="text-primary" size={32} />
                  <span className="font-semibold font-small">Monthly PF Register</span>
                  <button className="flex-center gap-1 font-xsmall badge badge-primary py-1 cursor-pointer mt-2" onClick={() => addPageToast('success', 'PF Register file compiled.')}><Download size={12} /> Download CSV</button>
                </div>

                <div className="p-4 border rounded flex-column gap-2 align-center justify-center text-center hover-card-effect">
                  <Sliders className="text-success" size={32} />
                  <span className="font-semibold font-small">ESI Return Sheets</span>
                  <button className="flex-center gap-1 font-xsmall badge badge-success py-1 cursor-pointer mt-2" onClick={() => addPageToast('success', 'ESI Return XLS generated.')}><Download size={12} /> Download Excel</button>
                </div>

                <div className="p-4 border rounded flex-column gap-2 align-center justify-center text-center hover-card-effect">
                  <Database className="text-warning" size={32} />
                  <span className="font-semibold font-small">TDS Challan (24Q)</span>
                  <button className="flex-center gap-1 font-xsmall badge badge-warning py-1 cursor-pointer mt-2" onClick={() => addPageToast('success', 'TDS Challan generated.')}><Download size={12} /> Download PDF</button>
                </div>

                <div className="p-4 border rounded flex-column gap-2 align-center justify-center text-center hover-card-effect">
                  <Scale className="text-info" size={32} />
                  <span className="font-semibold font-small">Compensation Benchmark</span>
                  <button className="flex-center gap-1 font-xsmall badge badge-secondary py-1 cursor-pointer mt-2" onClick={() => addPageToast('success', 'Benchmark report generated.')}><Download size={12} /> Download PDF</button>
                </div>
              </div>
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
                  <div className="flex-center justify-between py-1"><span>Basic Salary:</span> <strong>{formatCurrency(payslipEmployeeObj.basicSalary)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>House Rent Allowance (HRA):</span> <strong>{formatCurrency(Math.round(payslipEmployeeObj.basicSalary * 0.4))}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Conveyance & Medical Allowances:</span> <strong>{formatCurrency(8000)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Overtime Remunerations:</span> <strong>{formatCurrency(payslipEmployeeObj.overtimeAmount)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Performance Bonus:</span> <strong>{formatCurrency(payslipEmployeeObj.bonusAmount)}</strong></div>
                  <div className="flex-center justify-between border-top pt-2 font-semibold"><span>Gross Earnings:</span> <strong>{formatCurrency(payslipEmployeeObj.grossSalary)}</strong></div>
                </div>

                {/* Deductions */}
                <div className="flex-column gap-2">
                  <span className="font-bold text-danger border-bottom pb-1">Deductions</span>
                  <div className="flex-center justify-between py-1"><span>Provident Fund (PF):</span> <strong>{formatCurrency(Math.round(payslipEmployeeObj.basicSalary * 0.12))}</strong></div>
                  <div className="flex-center justify-between py-1"><span>TDS / Income Tax:</span> <strong>{formatCurrency(Math.round(payslipEmployeeObj.basicSalary * 0.1))}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Professional Tax (PT):</span> <strong>{formatCurrency(200)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Leave Deductions:</span> <strong>{formatCurrency(payslipEmployeeObj.leaveDeductions)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Late Punch Deductions:</span> <strong>{formatCurrency(payslipEmployeeObj.lateDeductions)}</strong></div>
                  <div className="flex-center justify-between py-1"><span>Loan EMI Recovery:</span> <strong>{formatCurrency(payslipEmployeeObj.loanEMI + payslipEmployeeObj.advanceDeduct)}</strong></div>
                  <div className="flex-center justify-between border-top pt-2 font-semibold"><span>Total Deductions:</span> <strong>{formatCurrency(payslipEmployeeObj.totalDeductions)}</strong></div>
                </div>
              </div>

              {/* Net Take home pay highlight */}
              <div className="flex-center justify-between p-4 bg-secondary-dark rounded border border-primary mt-3">
                <div className="flex-column">
                  <span className="font-semibold text-primary">Net Salary Disbursed</span>
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

    </div>
  );
};

export default Payroll;
