import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AppProvider } from './context/AppContext';
import AppShell from './components/AppShell';
import { AuthGuard, RoleGuard } from './components/common/Guards';

// ─── Eagerly Loaded Public Pages ──────────────────────────────────────────────
import Login from './pages/Login';

// ─── Lazy Loaded Admin & Feature Pages ─────────────────────────────────────────
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const Overview        = lazy(() => import('./pages/Overview'));
const Employees       = lazy(() => import('./pages/Employees'));
const EmployeeDetail  = lazy(() => import('./pages/EmployeeDetail'));
const Attendance      = lazy(() => import('./pages/Attendance'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const TaskMonitoring  = lazy(() => import('./pages/TaskMonitoring'));
const Payroll         = lazy(() => import('./pages/Payroll'));
const RolesPermissions = lazy(() => import('./pages/RolesPermissions'));
const Departments     = lazy(() => import('./pages/Departments'));
const Branches        = lazy(() => import('./pages/Branches'));
const Teams           = lazy(() => import('./pages/Teams'));
const Projects        = lazy(() => import('./pages/Projects'));
const Performance     = lazy(() => import('./pages/Performance'));
const Notifications   = lazy(() => import('./pages/Notifications'));
const ActivityLogs    = lazy(() => import('./pages/ActivityLogs'));
const Announcements   = lazy(() => import('./pages/Announcements'));
const Documents       = lazy(() => import('./pages/Documents'));
const SystemSettings  = lazy(() => import('./pages/SystemSettings'));
const Profile         = lazy(() => import('./pages/Profile'));
const Reports         = lazy(() => import('./pages/Reports'));
const Placeholder     = lazy(() => import('./pages/Placeholder'));

// New completed modules
const Workflows       = lazy(() => import('./pages/Workflows'));
const WorkReports     = lazy(() => import('./pages/WorkReports'));
const Security        = lazy(() => import('./pages/Security'));
const AuditLogs       = lazy(() => import('./pages/AuditLogs'));
const Unauthorized    = lazy(() => import('./pages/Unauthorized'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route - rendered outside AppShell */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated Route Boundary */}
          <Route element={<AuthGuard />}>
            <Route element={<AppShell />}>
              
              {/* ── Core ── */}
              <Route path="/"         element={<Dashboard />} />
              <Route path="/overview" element={<Overview />} />

              {/* ── People ── */}
              <Route path="/employees"  element={<Employees />} />
              <Route path="/employees/:id" element={<EmployeeDetail />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/leaves"     element={<LeaveManagement />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/branches"   element={<Branches />} />
              <Route path="/teams"      element={<Teams />} />

              {/* ── Operations ── */}
              <Route path="/projects"     element={<Projects />} />
              <Route path="/workflows"    element={<Workflows />} />
              <Route path="/tasks"        element={<TaskMonitoring />} />
              <Route path="/work-reports" element={<WorkReports />} />
              <Route path="/performance"  element={<Performance />} />
              <Route path="/payroll"      element={<Payroll />} />

              {/* ── Communication ── */}
              <Route path="/announcements"  element={<Announcements />} />
              <Route path="/notifications"  element={<Notifications />} />
              <Route path="/documents"      element={<Documents />} />

              {/* ── Administration & Security (Role Restricted) ── */}
              <Route element={<RoleGuard allowedRoles={['super_admin']} />}>
                <Route path="/permissions"   element={<RolesPermissions />} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
                <Route path="/security"      element={<Security />} />
                <Route path="/audit-logs"    element={<AuditLogs />} />
                <Route path="/reports"       element={<Reports />} />
                <Route path="/settings"      element={<SystemSettings />} />
              </Route>

              {/* ── Account ── */}
              <Route path="/profile" element={<Profile />} />

              {/* Error & Access Pages */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>
);
