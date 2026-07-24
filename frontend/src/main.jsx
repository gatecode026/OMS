import './polyfill';
import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';

window.API_URL = import.meta.env.VITE_API_URL || window.location.origin;
window.SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
import { notificationService } from './utils/notificationService';
notificationService.register();
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AppProvider } from './context/AppContext';
import { BrandingProvider } from './context/BrandingContext';
import { ChatProvider } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import CallScreen from './pages/chat/CallScreen';
import AppShell from './components/AppShell';
import { AuthGuard, RoleGuard } from './components/common/Guards';
import { ToastContainer } from './components/Toast';

import ErrorBoundary from './components/common/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';

// ─── Eagerly Loaded Public Pages ──────────────────────────────────────────────
import Login from './pages/Login';

// ─── Lazy Loaded Admin & Feature Pages ─────────────────────────────────────────
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Employees = lazyWithRetry(() => import('./pages/Employees'));
const InactiveEmployees = lazyWithRetry(() => import('./pages/InactiveEmployees'));
const EmployeeDetail = lazyWithRetry(() => import('./pages/EmployeeDetail'));
const Attendance = lazyWithRetry(() => import('./pages/Attendance'));
const WebPortalAttendance = lazyWithRetry(() => import('./pages/WebPortalAttendance'));
const LeaveManagement = lazyWithRetry(() => import('./pages/LeaveManagement'));
const TaskMonitoring = lazyWithRetry(() => import('./pages/TaskMonitoring'));
const Payroll = lazyWithRetry(() => import('./pages/Payroll'));
const RolesPermissions = lazyWithRetry(() => import('./pages/RolesPermissions'));
const Departments = lazyWithRetry(() => import('./pages/Departments'));
const Branches = lazyWithRetry(() => import('./pages/Branches'));
const Teams = lazyWithRetry(() => import('./pages/Teams'));
const TeamLeaders = lazyWithRetry(() => import('./pages/TeamLeaders'));
const Projects = lazyWithRetry(() => import('./pages/projects/index'));
const Performance = lazyWithRetry(() => import('./pages/Performance'));
const KPI = lazyWithRetry(() => import('./pages/KPI'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
// const ActivityLogs = lazyWithRetry(() => import('./pages/ActivityLogs'));
const Announcements = lazyWithRetry(() => import('./pages/Announcements'));
const Documents = lazyWithRetry(() => import('./pages/Documents'));
const ChatPage = lazyWithRetry(() => import('./pages/chat/ChatPage'));
const ChatPrivacySettings = lazyWithRetry(() => import('./pages/chat/ChatPrivacySettings'));
const SystemSettings = lazyWithRetry(() => import('./pages/SystemSettings'));
const MyProfile = lazyWithRetry(() => import('./pages/MyProfile'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const Placeholder = lazyWithRetry(() => import('./pages/Placeholder'));
const Calendar = lazyWithRetry(() => import('./pages/Calendar'));

// New completed modules
const WorkReports = lazyWithRetry(() => import('./pages/WorkReports'));
const SecurityAudit = lazyWithRetry(() => import('./pages/SecurityAudit'));
const Unauthorized = lazyWithRetry(() => import('./pages/Unauthorized'));
const Managers = lazyWithRetry(() => import('./pages/Managers'));
const EmployeeDashboard = lazyWithRetry(() => import('./pages/EmployeeDashboard'));
const EmployeeProfile = lazyWithRetry(() => import('./pages/EmployeeProfile'));
const Overview = lazyWithRetry(() => import('./pages/Overview'));

// ─── Super Admin Console Pages ───────────────────────────────────────────────
const SuperAdminLayout = lazyWithRetry(() => import('./pages/superadmin/SuperAdminLayout'));
const PlatformOverview = lazyWithRetry(() => import('./pages/superadmin/PlatformOverview'));
const CompaniesList = lazyWithRetry(() => import('./pages/superadmin/CompaniesList'));
const CompanyCreate = lazyWithRetry(() => import('./pages/superadmin/CompanyCreate'));
const CompanyDetail = lazyWithRetry(() => import('./pages/superadmin/CompanyDetail'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrandingProvider>
        <AppProvider>
          <ChatProvider>
            <CallProvider>
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
                  <Route path="/employee-dashboard" element={<Dashboard />} />

                  {/* ── People ── */}
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/employees/inactive" element={<InactiveEmployees />} />
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
                  <Route path="/performance" element={<KPI />} />
                  <Route path="/kpi" element={<KPI />} />
                  <Route path="/kpi/:tab" element={<KPI />} />
                  <Route path="/kpi/:tab/:id" element={<KPI />} />
                  <Route path="/payroll" element={<Payroll />} />
                  <Route path="/calendar" element={<Calendar />} />

                  {/* ── Communication ── */}
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/chat/privacy" element={<ChatPrivacySettings />} />

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
              <CallScreen />
            </CallProvider>
          </ChatProvider>
        </AppProvider>
      </BrandingProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
