import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './EmployeeDashboard.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Skeleton from '../components/common/Skeleton';

// Subwidgets
import DashboardHeader from '../components/employeeDashboard/DashboardHeader';
import TopSummaryCards from '../components/employeeDashboard/TopSummaryCards';
import MyAttendanceWidget from '../components/employeeDashboard/MyAttendanceWidget';
import TodayTasksWidget from '../components/employeeDashboard/TodayTasksWidget';
import ActiveProjectsWidget from '../components/employeeDashboard/ActiveProjectsWidget';
import DailyWorkReportWidget from '../components/employeeDashboard/DailyWorkReportWidget';
import LeaveBalanceWidget from '../components/employeeDashboard/LeaveBalanceWidget';
import PerformanceSummaryWidget from '../components/employeeDashboard/PerformanceSummaryWidget';
import NotificationsCenter from '../components/employeeDashboard/NotificationsCenter';
import RecentActivities from '../components/employeeDashboard/RecentActivities';
import ProductivityAnalytics from '../components/employeeDashboard/ProductivityAnalytics';
import UpcomingSchedule from '../components/employeeDashboard/UpcomingSchedule';
import CompanyUpdates from '../components/employeeDashboard/CompanyUpdates';
import QuickAccessPanel from '../components/employeeDashboard/QuickAccessPanel';
import DashboardFooter from '../components/employeeDashboard/DashboardFooter';
import GlobalSearch from '../components/employeeDashboard/GlobalSearch';

// Modals
import MarkAttendanceModal from '../components/employeeDashboard/modals/MarkAttendanceModal';
import ApplyLeaveModal from '../components/employeeDashboard/modals/ApplyLeaveModal';
import UpdateTaskStatusModal from '../components/employeeDashboard/modals/UpdateTaskStatusModal';
import UploadFileModal from '../components/employeeDashboard/modals/UploadFileModal';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const isLoading = usePageLoading(600);
  const {
    currentUser,
    currentUserRole,
    attendance,
    tasks,
    leaveRequests,
    dailyReports,
    notifications,
    activityLogs,
    updateTaskStatus,
    updateTaskProgress,
    projectsList,
    documentsList,
    addToast,
    leavePolicyConfigs = [],
    hasPermission,
    payroll,
    payrollLoans,
    payrollAdvances,
    monthlyPayrollSummary,
    fetchMonthlyPayrollSummary,
    fetchPayrollData
  } = useApp();

  useEffect(() => {
    fetchPayrollData();
    const monthStr = String(new Date().getMonth() + 1).padStart(2, '0');
    const yearStr = String(new Date().getFullYear());
    fetchMonthlyPayrollSummary(`${yearStr}-${monthStr}`);
  }, []);

  useEffect(() => {
    const hasSelf = hasPermission('dashboard', 'read', 'self');
    if (currentUserRole && currentUserRole !== 'employee' && !hasSelf) {
      navigate('/', { replace: true });
    }
  }, [currentUserRole, navigate, hasPermission]);

  // Filters State
  const [timePeriod, setTimePeriodState] = useState('today'); // today, week, month
  const [projectFilter, setProjectFilterState] = useState('all'); // all, active, completed

  const setTimePeriod = (val) => {
    setTimePeriodState(val);
  };

  const setProjectFilter = (val) => {
    setProjectFilterState(val);
  };

  // Modals Open State
  const [punchOpen, setPunchOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [updateTaskOpen, setUpdateTaskOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);

  // Selected item for modal
  const [selectedTask, setSelectedTask] = useState(null);

  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentUser) {
    return (
      <div className="flex-center w-full h-full text-text-muted" style={{ height: '100vh' }}>
        <span>Initializing your personalized workspace...</span>
      </div>
    );
  }

  // ─── Personal Data Isolation (Filtered strictly by currentUser) ───
  const myAttendance = attendance.filter(a => a.employeeId === currentUser.id);
  const myTasks = tasks.filter(t => t.assigneeId === currentUser.id);

  // Projects: Dynamically map projects where user is manager, leader, member, or has tasks
  const myProjects = (projectsList || []).filter(p => {
    const isManager = p.manager?.toLowerCase() === currentUser.name?.toLowerCase();
    const isLeader = p.leader?.toLowerCase() === currentUser.name?.toLowerCase();
    const isMember = p.members?.some(m => m?.toLowerCase() === currentUser.name?.toLowerCase());
    const hasTask = p.tasks?.some(t => 
      (t.assigneeId && t.assigneeId === currentUser.id) || 
      (t.assigneeName && t.assigneeName.toLowerCase() === currentUser.name?.toLowerCase())
    );
    return isManager || isLeader || isMember || hasTask;
  });

  const filteredProjects = myProjects.filter(p => {
    if (projectFilter === 'all') return true;
    const isCompleted = p.status === 'Completed' || p.status === 'completed';
    if (projectFilter === 'completed') return isCompleted;
    if (projectFilter === 'active') return !isCompleted;
    return true;
  });

  const myActiveProjects = myProjects.filter(p => p.status === 'In Progress' || p.status === 'in_progress' || p.status === 'Active' || p.status === 'active');
  const activeProjectsCount = myActiveProjects.length;

  const myReports = dailyReports.filter(r => r.employeeId === currentUser.id);
  const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser.id);
  const myActivities = activityLogs.filter(a => a.employeeName === currentUser.name);

  // Today's attendance record
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getLocalDateString();
  const todayAttendance = myAttendance.find(a => a.date === todayStr) || {};

  // Today's report status
  const todayReport = myReports.find(r => r.date === todayStr) || {};

  // Dynamic leave balance sum calculated dynamically from database fields and approved requests
  const activePolicies = useMemo(() => {
    return (leavePolicyConfigs || []).filter(policy => {
      if (!policy.isActive) return false;
      if (policy.genderRestriction && policy.genderRestriction !== 'All') {
        const userGender = currentUser.gender || 'Male';
        if (policy.genderRestriction.toLowerCase() !== userGender.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [leavePolicyConfigs, currentUser]);

  const leaveBalance = useMemo(() => {
    return activePolicies.reduce((sum, policy) => {
      const code = policy.leaveCode;
      // Use the employee-specific override if defined, otherwise fall back to the policy's configured defaultDays
      const fieldName = code === 'ML' ? 'maternityBalance' : `${code.toLowerCase()}Balance`;
      let available = typeof currentUser?.[fieldName] === 'number' ? currentUser[fieldName] : (policy.defaultDays || 0);

      const used = myLeaves
        .filter(l => 
          l.status === 'Approved' && 
          (l.type === policy.leaveName || l.type === code || (code === 'PL' && l.type === 'Earned Leave'))
        )
        .reduce((s, l) => s + (Number(l.days) || 0), 0);

      return sum + Math.max(0, available - used);
    }, 0);
  }, [activePolicies, currentUser, myLeaves]);

  // Today's tasks (due today or overdue)
  const todayTasks = myTasks.filter(t => t.dueDate === todayStr || (t.dueDate < todayStr && t.status !== 'Done'));

  // Filter tasks dynamically based on timePeriod
  const getFilteredTasks = () => {
    if (timePeriod === 'today') {
      return todayTasks;
    }
    
    const getWeekRange = () => {
      const today = new Date();
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(today);
      monday.setDate(today.getDate() + distanceToMonday);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
      };
    };
    
    if (timePeriod === 'week') {
      const range = getWeekRange();
      return myTasks.filter(t => t.dueDate >= range.start && t.dueDate <= range.end);
    }
    
    if (timePeriod === 'month') {
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const prefix = `${currentYear}-${currentMonth}`;
      return myTasks.filter(t => (t.dueDate || '').startsWith(prefix));
    }
    
    return myTasks;
  };
  
  const displayTasks = getFilteredTasks();

  // Handler to open task status update modal
  const handleOpenTaskUpdate = (task) => {
    setSelectedTask(task);
    setUpdateTaskOpen(true);
  };

  const myPayrollCalculated = useMemo(() => {
    const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });
    const currentYearStr = String(new Date().getFullYear());

    // 1. Get processed payment if it exists
    const processed = (payroll || []).find(
      p => p.employeeId === currentUser.id && p.month === currentMonthName && p.year === currentYearStr
    );
    if (processed) return { ...processed, basicSalary: processed.basicSalary || Number(currentUser.salaryAmount) || 0 };

    // 2. Otherwise compute on-the-fly
    const empId = currentUser.id;
    const empBasicSalary = Number(currentUser.salaryAmount) || 0;
    
    const struct = {
      basic: empBasicSalary, hra: Math.round(empBasicSalary * 0.4), travel: 0, medical: 0, special: 0, pf: Math.round(empBasicSalary * 0.12), esi: 0, pt: 200, tds: Math.round(empBasicSalary * 0.1)
    };

    const monthStr = String(new Date().getMonth() + 1).padStart(2, '0');
    const summary = (monthlyPayrollSummary && monthlyPayrollSummary[empId]) || {
      presentDays: 0, halfDays: 0, paidLeaveDays: 0, unpaidLeaveDays: 0, holidays: 0, weekends: 0
    };

    const workingDays = 30; // standard fallback
    const dailySalary = Math.round(empBasicSalary / Math.max(1, workingDays));

    let unpaidDays = summary.unpaidLeaveDays || 0;
    unpaidDays += (summary.halfDays || 0) * 0.5;

    const leaveDeduction = Math.round(dailySalary * unpaidDays);

    const totalAllowances = (struct.hra || 0) + (struct.travel || 0) + (struct.medical || 0) + (struct.special || 0);
    const statutoryDeductions = (struct.pf || 0) + (struct.esi || 0) + (struct.pt || 0) + (struct.tds || 0);

    const loanEMI = (payrollLoans || [])
      .filter(l => l.employeeId === empId && l.status === 'Approved')
      .reduce((sum, curr) => sum + curr.emi, 0);

    const advanceDeduct = (payrollAdvances || [])
      .filter(a => a.employeeId === empId && a.status === 'Approved')
      .reduce((sum, curr) => sum + curr.amount, 0);

    const totalDeductions = statutoryDeductions + leaveDeduction + loanEMI + advanceDeduct;
    const grossSalary = struct.basic + totalAllowances;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
      basicSalary: struct.basic,
      hra: struct.hra,
      travel: struct.travel,
      medical: struct.medical,
      special: struct.special,
      pf: struct.pf,
      esi: struct.esi,
      pt: struct.pt,
      tds: struct.tds,
      paidLeaveDays: summary.paidLeaveDays,
      unpaidLeaveDays: unpaidDays,
      leaveDeductions: leaveDeduction,
      loanEMI,
      advanceDeduct,
      totalDeductions,
      grossSalary,
      netSalary,
      status: 'Draft (Pending Processing)'
    };
  }, [payroll, currentUser, monthlyPayrollSummary, payrollLoans, payrollAdvances]);

  // Loading skeleton layout
  if (isLoading) {
    return (
      <div className="emp-dashboard-container padding-4">
        <div style={{ height: '70px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <Skeleton variant="rect" height="100%" />
        </div>
        <div className="summary-cards-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="summary-card" style={{ height: 110 }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="columns-grid">
          <div className="left-column" style={{ minHeight: '300px' }}>
            <Skeleton variant="rect" height="100%" />
          </div>
          <div className="right-column" style={{ minHeight: '300px' }}>
            <Skeleton variant="rect" height="100%" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="emp-dashboard-container padding-4 animate-fade-in">
      {/* SECTION: Page Header */}
      <DashboardHeader currentUser={currentUser} />



      {/* SECTION 1: Top Summary Cards (6 personal stats cards) */}
      <TopSummaryCards
        currentUser={currentUser}
        attendanceData={todayAttendance}
        todayTasks={todayTasks}
        activeProjectsCount={activeProjectsCount}
        dwrStatus={todayReport.status}
        leaveBalance={leaveBalance}
        performance={currentUser.performanceScore}
      />

      {/* SECTION 2 & 3: Two-Column Widget Layout (Left 60% / Right 40%) */}
      <div className="columns-grid mt-2">
        {/* Left Column (60% width on Desktop) */}
        <div className="left-column">
          {/* My Attendance Widget */}
          <MyAttendanceWidget
            currentUser={currentUser}
            attendanceRecord={todayAttendance}
            attendanceHistory={myAttendance}
            onOpenPunchModal={() => setPunchOpen(true)}
          />

          {/* Today's Tasks Widget */}
          <TodayTasksWidget
            tasks={displayTasks}
            onUpdateStatus={updateTaskProgress}
            onOpenUpdateModal={handleOpenTaskUpdate}
            timePeriod={timePeriod}
            addToast={addToast}
          />

          {/* Active Projects Widget */}
          <ActiveProjectsWidget
            projects={filteredProjects}
            allTasks={tasks}
            myTasks={myTasks}
            onOpenUploadModal={() => setUploadFileOpen(true)}
          />

          {/* Work Report Status Widget */}
          <DailyWorkReportWidget
            myReports={myReports}
          />

          {/* My Payroll Summary Widget */}
          <div className="dashboard-widget animate-fade-in" style={{ marginTop: '1.25rem', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div className="flex-row justify-between align-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="widget-title" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>My Payroll & Salary Details</h3>
              <span style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: '20px', background: 'var(--bg-tag)', color: 'var(--text-muted)' }}>
                {myPayrollCalculated.status}
              </span>
            </div>
            
            <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Monthly Basic Salary</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>₹{myPayrollCalculated.basicSalary?.toLocaleString()}</div>
                
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Allowances (HRA, Travel, Medical)</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 550, color: 'var(--color-success)' }}>
                    + ₹{((myPayrollCalculated.hra || 0) + (myPayrollCalculated.travel || 0) + (myPayrollCalculated.medical || 0) + (myPayrollCalculated.special || 0)).toLocaleString()}
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Paid Leaves Used</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 550, color: 'var(--text-main)' }}>{myPayrollCalculated.paidLeaveDays || 0} Days</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Deductions (LOP, Loans, PF, Tax)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                  - ₹{(myPayrollCalculated.totalDeductions || 0).toLocaleString()}
                </div>

                {myPayrollCalculated.leaveDeductions > 0 && (
                  <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(239, 68, 68, 0.08)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid var(--color-danger)' }}>
                    <strong>LOP Deduction:</strong> ₹{myPayrollCalculated.leaveDeductions?.toLocaleString()} ({myPayrollCalculated.unpaidLeaveDays || 0} LOP days)
                  </div>
                )}

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Unpaid / LOP Leaves</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 550, color: 'var(--color-danger)' }}>{myPayrollCalculated.unpaidLeaveDays || 0} Days</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Net Take-Home Salary</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>₹{myPayrollCalculated.netSalary?.toLocaleString()}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '220px', textAlign: 'right' }}>
                * Leaves exceeding the paid leave quota are automatically classified as LOP and deducted.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (40% width on Desktop) */}
        <div className="right-column">
          {/* Leave Balance Widget */}
          <LeaveBalanceWidget
            myLeaves={myLeaves}
            currentUser={currentUser}
            onOpenLeaveModal={() => setLeaveOpen(true)}
          />

          {/* Performance Summary Widget */}
          <PerformanceSummaryWidget
            currentUser={currentUser}
            myTasks={myTasks}
            myAttendance={myAttendance}
          />

          {/* Notifications Center */}
          <NotificationsCenter
            notifications={notifications}
          />

          {/* Recent Activities Widget */}
          <RecentActivities
            myActivities={myActivities}
          />
        </div>
      </div>

      {/* SECTION 4: Full Width Analytics & Schedule Row */}
      <div className="flex-column gap-5 mt-2">
        {/* Productivity Trends Charts */}
        <ProductivityAnalytics
          myTasks={myTasks}
          myAttendance={myAttendance}
          currentUser={currentUser}
        />

        <div className="columns-grid">
          {/* Today's Schedule List */}
          <UpcomingSchedule myTasks={myTasks} />

          {/* Company Announcements bulletin */}
          <CompanyUpdates />
        </div>
      </div>

      {/* SECTION 5: Quick Access Floating Panel */}
      <QuickAccessPanel
        onPunchClick={() => setPunchOpen(true)}
        onLeaveClick={() => setLeaveOpen(true)}
      />

      {/* SECTION: Page Footer Summary */}
      <DashboardFooter
        myTasks={myTasks}
        myAttendance={myAttendance}
        currentUser={currentUser}
        activeProjectsCount={activeProjectsCount}
        leaveBalance={leaveBalance}
      />

      {/* ─── MODALS ─── */}
      {punchOpen && (
        <MarkAttendanceModal
          isOpen={punchOpen}
          onClose={() => setPunchOpen(false)}
          todayRecord={todayAttendance}
          currentUser={currentUser}
        />
      )}



      {leaveOpen && (
        <ApplyLeaveModal
          isOpen={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          currentUser={currentUser}
        />
      )}

      {updateTaskOpen && selectedTask && (
        <UpdateTaskStatusModal
          isOpen={updateTaskOpen}
          onClose={() => {
            setUpdateTaskOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
        />
      )}

      {uploadFileOpen && (
        <UploadFileModal
          isOpen={uploadFileOpen}
          onClose={() => setUploadFileOpen(false)}
          project={filteredProjects[0] || myProjects[0]}
        />
      )}

      {/* Global search overlay (Ctrl+K) */}
      {searchOpen && (
        <GlobalSearch
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          tasks={myTasks}
          projects={myProjects}
          reports={myReports}
          notifications={notifications}
          documents={documentsList}
          currentUser={currentUser}
        />
      )}

    </div>
  );
};

export default EmployeeDashboard;
