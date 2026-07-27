# 5. Module Deep-Dive Documentation (All 20 Modules)

This section provides exhaustive architectural, business logic, permission, and workflow breakdowns for all 20 modules constituting the Office Management System (OMS).

---

## 5.1 Authentication Module
- **Purpose**: Provides secure user identity verification, multi-factor authentication, and JWT lifecycle management.
- **Features**: Dual-token auth (AccessToken + RefreshToken), MFA TOTP setup, Account Lockout policies, Password hashing (Bcrypt salt 12), Password Reset flow via secure email tokens.
- **User Roles**: All Roles.
- **Permissions Required**: `auth:login`, `auth:reset_password`, `auth:mfa_verify`.
- **Validation Rules**: Email must match RFC 5322 regex; passwords require minimum 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.
- **Error Handling**: `401 Unauthorized` for bad credentials; `429 Too Many Requests` when account lockout triggers.

---

## 5.2 Employee Management Module
- **Purpose**: Centralized employee directory handling recruitment, profile lifecycle, departmental placement, and document management.
- **Features**: Auto-increment Employee ID generator (`EMP-XXXX`), Document vault (S3 integration for resume, identity proofs), Emergency contacts, Department/Branch binding.
- **User Roles**: HR Admin, SuperAdmin, Department Manager.
- **Permissions Required**: `employees:create`, `employees:read`, `employees:update`, `employees:delete`.
- **Validation Rules**: Employee ID must be unique; joining date cannot be in the future; national tax/ID numbers must pass format validation.

---

## 5.3 Dashboard Module
- **Purpose**: Dynamic metric aggregator rendering real-time business performance analytics tailored to user role.
- **Features**: Executive view (Revenue vs Payroll expenses, total headcount), HR view (Today's attendance stats, active leaves, pending approvals), Employee view (Assigned tasks, hours logged, leave balance).
- **User Roles**: All Roles (Role-adapted widget rendering).
- **Permissions Required**: `dashboard:view_executive`, `dashboard:view_hr`, `dashboard:view_personal`.

---

## 5.4 Attendance Module
- **Purpose**: Automated time-tracking system supporting geo-fencing, IP restriction, shift management, and punch corrections.
- **Features**: Browser Web Punch with HTML5 Geo-location validation, IP Range whitelisting check, Automatic `Present`/`Late`/`Half Day` status trigger based on shift policy, Attendance Correction workflow.
- **User Roles**: All Employees, Managers, HR Admins.
- **Permissions Required**: `attendance:punch`, `attendance:read_self`, `attendance:read_team`, `attendance:approve_correction`.

---

## 5.5 Leave Management Module
- **Purpose**: Manages leave requests, annual entitlements, approval hierarchies, and carry-forward balances.
- **Features**: Real-time balance deduction sandbox, Weekend/Holiday exclusion engine, Multi-level manager approval hierarchy, Annual leave reset job.
- **User Roles**: All Employees, Department Managers, HR Admins.
- **Permissions Required**: `leaves:apply`, `leaves:approve_manager`, `leaves:approve_hr`, `leaves:manage_quotas`.

---

## 5.6 Payroll Module
- **Purpose**: Automated monthly compensation calculations, tax withholdings, and payslip generation.
- **Features**: Attendance-driven unpaid leave deductions, PF/ESI statutory calculation, Tax slab engine, Automated downloadable PDF payslips with digital signatures.
- **User Roles**: Payroll Admin, HR Admin, Finance Manager, Employee (View own payslips).
- **Permissions Required**: `payroll:process`, `payroll:read_all`, `payroll:read_self`, `payroll:export`.

---

## 5.7 Salary Management Module
- **Purpose**: Manages salary structures, increment history, bonus distributions, and grade bands.
- **Features**: Multi-component salary structure builder (Basic, HRA, Allowance, Special Allowance), Compensation history tracking, Annual appraisal increment application.
- **User Roles**: HR Admin, C-Level Executive.
- **Permissions Required**: `salary:view_structure`, `salary:update_structure`, `salary:manage_increments`.

---

## 5.8 Project Management Module
- **Purpose**: Enables end-to-end planning, resource allocation, and milestone tracking for client and internal projects.
- **Features**: Project health score, Budget tracking, Milestone progression, Client access view, Dedicated team allocation.
- **User Roles**: Project Manager, Team Lead, Executive, Client.
- **Permissions Required**: `projects:create`, `projects:read`, `projects:update`, `projects:assign_team`.

---

## 5.9 Task Management Module
- **Purpose**: Operational task tracking featuring interactive Kanban boards, sub-task breakdowns, and time logging.
- **Features**: Drag-and-drop Kanban interface (`Backlog`, `To Do`, `In Progress`, `Review`, `Done`), Task dependencies, Sub-tasks, Time logs with automated timer.
- **User Roles**: Project Manager, Team Lead, Employee.
- **Permissions Required**: `tasks:create`, `tasks:assign`, `tasks:update_status`, `tasks:log_time`.

---

## 5.10 Daily Work Report (DWR) Module
- **Purpose**: Standardized daily end-of-day work submissions ensuring employee accountability and team visibility.
- **Features**: Structured task linking, Daily hours breakdown, Blockers description, Manager review & feedback interface.
- **User Roles**: All Employees, Team Managers.
- **Permissions Required**: `work_report:submit`, `work_report:read_team`, `work_report:review`.

---

## 5.11 KPI & Performance Management Module
- **Purpose**: Framework for quarterly and annual employee performance evaluation and objective setting.
- **Features**: Custom template builder (Weighted evaluation criteria), Self-appraisal form submission, Manager scoring, Automated final rating generation (e.g. 4.5/5.0).
- **User Roles**: HR Admin, Manager, Employee.
- **Permissions Required**: `kpi:create_template`, `kpi:submit_self`, `kpi:rate_employee`, `kpi:view_summary`.

---

## 5.12 Notification System Module
- **Purpose**: Unified real-time communication engine delivering event alerts via WebSockets and Web Push API.
- **Features**: Socket.io event emitter, In-app notification center, VAPID Web Push for offline background alerts, Read/Unread status management.
- **User Roles**: All Roles.
- **Permissions Required**: `notifications:read_self`, `notifications:clear`.

---

## 5.13 Announcement System Module
- **Purpose**: Broadcasts critical organizational updates, policy changes, and news across company branches.
- **Features**: Rich HTML text announcements, Target filter by department/branch, Mandatory read acknowledgment popup.
- **User Roles**: HR Admin, System Admin, C-Level Executive.
- **Permissions Required**: `announcements:publish`, `announcements:read`.

---

## 5.14 Meetings Module
- **Purpose**: Schedules and manages internal/external meetings with room allocation and WebRTC video integration.
- **Features**: Calendar view integration, Room availability checker, Auto-generated video link, Meeting minutes (MoM) record attachment.
- **User Roles**: All Employees.
- **Permissions Required**: `meetings:schedule`, `meetings:join`, `meetings:manage_rooms`.

---

## 5.15 Permission Matrix Module
- **Purpose**: Fine-grained access control engine managing permissions across system resources and actions.
- **Features**: Resource-Action matrix mapping (`resource:action` format, e.g. `payroll:process`), Live permission cache invalidation via Redis.
- **User Roles**: SuperAdmin.
- **Permissions Required**: `permissions:manage`, `permissions:read`.

---

## 5.16 Roles & Access Control Module
- **Purpose**: Allows creation of custom security roles and binding permission sets to roles.
- **Features**: Pre-configured system roles (`SuperAdmin`, `HRManager`, `DeptManager`, `Employee`), Custom role creator, User role mapping interface.
- **User Roles**: SuperAdmin, System Admin.
- **Permissions Required**: `roles:create`, `roles:assign`, `roles:update`.

---

## 5.17 Reports & Analytics Module
- **Purpose**: Business intelligence center producing exportable financial, attendance, and productivity reports.
- **Features**: Export to PDF, CSV, Excel; Custom date range filter; Graph rendering (Chart.js / Recharts); Payroll variance analysis.
- **User Roles**: Executive, HR Admin, Finance Manager.
- **Permissions Required**: `reports:generate_attendance`, `reports:generate_payroll`, `reports:generate_kpi`.

---

## 5.18 Company Settings Module
- **Purpose**: Central configuration vault for organization profile, working hours, fiscal calendar, and branding.
- **Features**: Company logo upload, Geo-location office radius configuration, Shift definitions, Public holidays calendar.
- **User Roles**: SuperAdmin, System Admin.
- **Permissions Required**: `settings:read`, `settings:update`.

---

## 5.19 User Profile Module
- **Purpose**: Individual self-service hub for personal detail updates, security preferences, and credential changes.
- **Features**: Avatar crop & upload, Password change, MFA enable/disable, Personal notification preferences.
- **User Roles**: All Users.
- **Permissions Required**: `profile:read_self`, `profile:update_self`.

---

## 5.20 Audit Logs Module
- **Purpose**: Enterprise security compliance trail recording every critical mutation, auth event, and policy change.
- **Features**: Immutable log storage, Event type tags (`AUTH`, `DATA_MUTATION`, `PERMISSION_CHANGE`), IP address & User-Agent capture, Request payload diff tracking.
- **User Roles**: SuperAdmin, Security Auditor.
- **Permissions Required**: `audit_logs:read`, `audit_logs:export`.
