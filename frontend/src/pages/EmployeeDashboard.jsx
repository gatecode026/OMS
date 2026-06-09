import React, { useState, useEffect } from 'react';
import './EmployeeDashboard.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Skeleton from '../components/common/Skeleton';

// Subwidgets
import DashboardHeader from '../components/employeeDashboard/DashboardHeader';
import DashboardFilters from '../components/employeeDashboard/DashboardFilters';
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
  const isLoading = usePageLoading(600);
  const {
    currentUser,
    attendance,
    tasks,
    leaveRequests,
    dailyReports,
    notifications,
    activityLogs,
    updateTaskStatus,
    projectsList,
    addToast
  } = useApp();

  // Filters State
  const [timePeriod, setTimePeriodState] = useState('today'); // today, week, month
  const [projectFilter, setProjectFilterState] = useState('all'); // all, active, completed

  const setTimePeriod = (val) => {
    setTimePeriodState(val);
    const label = val === 'today' ? 'Today' : val === 'week' ? 'This Week' : 'This Month';
    addToast('info', `Filtered activities by: ${label}`);
  };

  const setProjectFilter = (val) => {
    setProjectFilterState(val);
    const label = val === 'all' ? 'All Projects' : val === 'active' ? 'Active Projects' : 'Completed Projects';
    addToast('info', `Filtered projects by: ${label}`);
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

  // Projects: Dynamically map projects containing user's tasks or matches user's department
  const myProjects = (projectsList || []).filter(p =>
    p.department === currentUser.department ||
    myTasks.some(t => t.project === p.name || t.projectName === p.name)
  );

  const myReports = dailyReports.filter(r => r.employeeId === currentUser.id);
  const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser.id);
  const myActivities = activityLogs.filter(a => a.employeeName === currentUser.name);

  // Today's attendance record
  const todayStr = '2026-06-03'; // Sync with seed dates
  const todayAttendance = myAttendance.find(a => a.date === todayStr) || {};

  // Today's report status
  const todayReport = myReports.find(r => r.date === todayStr) || {};

  // Available leave balance sum
  const leaveBalance = 25; // Default overall leave balance sum (Casual 8 + Sick 5 + Earned 12)

  // Today's tasks (due today or overdue)
  const todayTasks = myTasks.filter(t => t.dueDate === todayStr || (t.dueDate < todayStr && t.status !== 'Done'));

  // Handler to open task status update modal
  const handleOpenTaskUpdate = (task) => {
    setSelectedTask(task);
    setUpdateTaskOpen(true);
  };

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

      {/* SECTION: Sticky Filters Bar */}
      <DashboardFilters
        timePeriod={timePeriod}
        setTimePeriod={setTimePeriod}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
      />

      {/* SECTION 1: Top Summary Cards (6 personal stats cards) */}
      <TopSummaryCards
        attendanceData={todayAttendance}
        todayTasks={todayTasks}
        activeProjectsCount={myProjects.length}
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
            attendanceRecord={todayAttendance}
            attendanceHistory={myAttendance}
            onOpenPunchModal={() => setPunchOpen(true)}
          />

          {/* Today's Tasks Widget */}
          <TodayTasksWidget
            tasks={todayTasks}
            onUpdateStatus={updateTaskStatus}
            onOpenUpdateModal={handleOpenTaskUpdate}
          />

          {/* Active Projects Widget */}
          <ActiveProjectsWidget
            projects={myProjects}
            allTasks={tasks}
            myTasks={myTasks}
            onOpenUploadModal={() => setUploadFileOpen(true)}
          />

          {/* Work Report Status Widget */}
          <DailyWorkReportWidget
            myReports={myReports}
          />
        </div>

        {/* Right Column (40% width on Desktop) */}
        <div className="right-column">
          {/* Leave Balance Widget */}
          <LeaveBalanceWidget
            myLeaves={myLeaves}
            onOpenLeaveModal={() => setLeaveOpen(true)}
          />

          {/* Performance Summary Widget */}
          <PerformanceSummaryWidget
            currentUser={currentUser}
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
        myLeaves={myLeaves}
        currentUser={currentUser}
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
          projectName={myProjects[0]?.name || 'SaaS Platform v2.0'}
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
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
