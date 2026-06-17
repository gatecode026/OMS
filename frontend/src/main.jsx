import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';

window.API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AppProvider } from './context/AppContext';
import { BrandingProvider } from './context/BrandingContext';
import AppShell from './components/AppShell';
import { AuthGuard, RoleGuard } from './components/common/Guards';
import { ToastContainer } from './components/Toast';

// ─── Eagerly Loaded Public Pages ──────────────────────────────────────────────
import Login from './pages/Login';

// ─── Lazy Loaded Admin & Feature Pages ─────────────────────────────────────────
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'));
const Attendance = lazy(() => import('./pages/Attendance'));
const WebPortalAttendance = lazy(() => import('./pages/WebPortalAttendance'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const TaskMonitoring = lazy(() => import('./pages/TaskMonitoring'));
const Payroll = lazy(() => import('./pages/Payroll'));
const RolesPermissions = lazy(() => import('./pages/RolesPermissions'));
const Departments = lazy(() => import('./pages/Departments'));
const Branches = lazy(() => import('./pages/Branches'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamLeaders = lazy(() => import('./pages/TeamLeaders'));
const Projects = lazy(() => import('./pages/projects/index'));
const Performance = lazy(() => import('./pages/Performance'));
const Notifications = lazy(() => import('./pages/Notifications'));
// const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Documents = lazy(() => import('./pages/Documents'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const Reports = lazy(() => import('./pages/Reports'));
const Placeholder = lazy(() => import('./pages/Placeholder'));
const Calendar = lazy(() => import('./pages/Calendar'));

// New completed modules
const WorkReports = lazy(() => import('./pages/WorkReports'));
const SecurityAudit = lazy(() => import('./pages/SecurityAudit'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const Managers = lazy(() => import('./pages/Managers'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const Overview = lazy(() => import('./pages/Overview'));

// ─── Super Admin Console Pages ───────────────────────────────────────────────
const SuperAdminLayout = lazy(() => import('./pages/superadmin/SuperAdminLayout'));
const PlatformOverview = lazy(() => import('./pages/superadmin/PlatformOverview'));
const CompaniesList = lazy(() => import('./pages/superadmin/CompaniesList'));
const CompanyCreate = lazy(() => import('./pages/superadmin/CompanyCreate'));
const CompanyDetail = lazy(() => import('./pages/superadmin/CompanyDetail'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrandingProvider>
      <AppProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Login Route - rendered outside AppShell */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated Route Boundary */}
          <Route element={<AuthGuard />}>
            <Route element={<AppShell />}>
              <Route element={<RoleGuard />}>

                {/* ── Core ── */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/employee-dashboard" element={<EmployeeDashboard />} />

                {/* ── People ── */}
                <Route path="/employees" element={<Employees />} />
                <Route path="/employees/add" element={<Employees />} />
                <Route path="/employees/:id" element={<EmployeeProfile />} />
                <Route path="/employee-profile/:id" element={<EmployeeProfile />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/attendance/webportal" element={<WebPortalAttendance />} />
                <Route path="/leaves" element={<LeaveManagement />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/branches" element={<Branches />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/teams/leaders" element={<TeamLeaders />} />
                {/* ── Operations ── */}
                <Route path="/projects" element={<Projects />} />
                <Route path="/managers" element={<Managers />} />
                <Route path="/tasks" element={<TaskMonitoring />} />
                <Route path="/work-reports" element={<WorkReports />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/calendar" element={<Calendar />} />

                {/* ── Communication ── */}
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/documents" element={<Documents />} />

                {/* ── Administration & Security (Centralized Role Restricted) ── */}
                <Route path="/permissions" element={<RolesPermissions />} />
                <Route path="/activity-logs" element={<Navigate to="/security" replace />} />
                <Route path="/security" element={<SecurityAudit />} />
                <Route path="/audit-logs" element={<SecurityAudit />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<SystemSettings />} />

                {/* ── Account ── */}
                <Route path="/profile" element={<MyProfile />} />
                <Route path="/my-profile" element={<MyProfile />} />

              </Route>

              {/* Error & Access Pages */}
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Route>
          </Route>

          {/* ─── Super Admin Dedicated Routes ─────────────────────────────────── */}
          <Route element={<AuthGuard />}>
            <Route element={<RoleGuard allowedRoles={['super_admin', 'SuperAdmin']} />}>
              <Route element={<SuperAdminLayout />}>
                <Route path="/superadmin" element={<Navigate to="/superadmin/overview" replace />} />
                <Route path="/superadmin/overview" element={<PlatformOverview />} />
                <Route path="/superadmin/companies" element={<CompaniesList />} />
                <Route path="/superadmin/companies/create" element={<CompanyCreate />} />
                <Route path="/superadmin/companies/:id" element={<CompanyDetail />} />
              </Route>
            </Route>
          </Route>
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
    </BrandingProvider>
  </React.StrictMode>
);
