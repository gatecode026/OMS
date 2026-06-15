# Multi-Tenant SaaS Platform Overview & Architectural Audit

This document provides a comprehensive overview of the multi-tenant SaaS architecture for the Office Management System. It serves as a guide to understanding the database isolation approaches, security middlewares, routing, and platform configuration.

---

## 📂 1. Backend Structure

The backend follows a modular, layered architecture located inside `backend/src/modules/`. There are **25 modules** in total:

*   **Platform & Core Modules**:
    *   `companies/`: Manages tenant organization registrations, subdomains, plans, and public branding configurations.
        *   `company.model.js`: Mongoose company schema (global main connection).
        *   `company.service.js` & `company.controller.js`: Business operations for tenant signup, configuration, and state updates.
        *   `company.routes.js`: Restricted CRUD routing.
        *   `public.routes.js`: Public branding fetch endpoints.
    *   `admin/`: Manages Super Admin credentials and cross-tenant overview aggregates.
        *   `admin.model.js`: Platform administrator schema.
        *   `admin.controller.js`: Analytics and tenant provisioning hooks.
        *   `admin.routes.js`: REST endpoints restricted strictly to `super_admin`.
        *   `admin.validation.js`: Schema validation rules.
    *   `auth/`: Handles credential checks, active state verification, and JWT issuance.
        *   `auth.controller.js` & `auth.service.js`: Login handlers for Super Admin and tenant Employees.
        *   `auth.repository.js`: Data access layer.
        *   `auth.routes.js` & `auth.validation.js`: Routing configurations.

*   **Business Operations Modules**:
    *   `employees/`, `tasks/`, `attendance/`, `leaves/`, `payroll/`, `branches/`, `departments/`, `teams/`, `projects/`, `events/`, `holidays/`, `appraisal-reviews/`, `work-reports/`, `activity-logs/`, `announcements/`, `notifications/`, `documents/`, `roles/`, `performance/`, `security/`, `settings/`, `workflows/`.
    *   *Structure per Module*: Standardized to contain a `<name>.model.js` schema, `<name>.controller.js` handler, and `<name>.routes.js` endpoints. Select modules also contain `<name>.repository.js` or `<name>.service.js` layers.

---

## 🔌 2. Tenant Infrastructure Status

Tenant propagation, scoping, and connection pooling are handled by dedicated utilities and middlewares:

### Utility Files (`backend/src/utils/`)
*   `tenantContext.js`: Uses Node's `AsyncLocalStorage` to store request-scoped variables (`tenantId` and `connection`). Exposes `getTenantId()`, `getActiveConnection()`, and `runWithTenant()` to execute execution threads inside scoped boundaries.
*   `tenantPlugin.js`: A global Mongoose schema plugin. It dynamically injects `companyId` into schemas, filters queries (`find`, `findOne`, `countDocuments`, `updateOne`, `deleteMany`, etc.) by `companyId`, prepends `$match` stages in aggregations, and strips out `companyId` fields from updates to prevent tenant-spoofing.
    *   **Mongoose Model Proxy**: Directly overrides `mongoose.model`. When a tenant-scoped model is requested, it returns a JS Proxy intercepting model compilation and operations. This proxy transparently builds the model on the request's active connection pool instead of the main connection.
*   `multidbConnection.js`: Implements connection pooling. It resolves company configurations (`settings.dbUri`) and manages a connection cache Map (`{ connection, lastUsedAt, isCustom }`). Enforces LRU eviction if cache size reaches `MULTIDB_MAX_TOTAL_CONNECTIONS`, configures pools using `MULTIDB_MAX_POOL_SIZE`, and implements `closeAllConnections()` for clean socket shutdowns.
*   *Note*: There is no `dbResolver.js` in utility files; its functions are fully consolidated inside the compiler proxy pattern of `tenantPlugin.js` and connection pooling in `multidbConnection.js`.

### Middlewares (`backend/src/middlewares/`)
*   `tenant.middleware.js`: Extracts the active tenant ID from the authenticated user's JWT payload. For Super Admins, it reads query parameter `?companyId` or header `x-tenant-id` to facilitate cross-tenant viewing. Invokes `runWithTenant(tenantId, next)` to wrap the request execution.
*   `roleGuard.middleware.js`: Centralized access validator. It matches incoming request paths against glob patterns defined in the centralized role matrix (`src/config/roleMatrix.js`). Returns `403 Forbidden` if a role accesses unauthorized paths.

---

## 🗄️ 3. Database Isolation Approach

### Company Schema Configuration
Exposed fields in `Company.model.js`:
*   `id` (String, unique, indexed): Primary identifier (e.g. `COMP-DEFAULT`).
*   `name` (String, required).
*   `subdomain` (String, unique, indexed): URL subdomain mapping.
*   `status` (String, enum: `Active`, `Suspended`, `Pending`).
*   `plan` (String, enum: `Basic`, `Premium`, `Enterprise`).
*   `settings`: Object containing `logoUrl`, **`dbUri`** (Private isolated MongoDB connection string), `primaryColor`, `secondaryColor`, `timezone`, `companyEmail`, `companyPhone`, `address`.

### Isolation Model
The platform implements a **Hybrid Isolation Approach**:
1.  **Shared Database (Logical Isolation)**: For companies where `settings.dbUri` is empty, data is hosted in the shared main database, isolated logically by query-level `companyId` filters.
2.  **Dedicated Database-per-Tenant (Physical Isolation)**: For companies with a custom `settings.dbUri`, a connection pool is established dynamically on that server, keeping all records fully isolated from the shared cluster.

### Tenant Scoping Coverage
*   **Scoped Models (tenantPlugin Applied)**: `Employee`, `Branch`, `Department`, `Team`, `Project`, `Attendance`, `Leave`, `Holiday`, `PayrollGrade`, `PayrollReimbursement`, `PayrollLoanAdvance`, `PayrollBonus`, `PayrollPayment`, `PayrollConfig`, `AppraisalReview`, `WorkReport`, `ActivityLog`, `Event`, `Announcement`, `EmergencyAlert`, `AnnouncementTrackingLog`, `AnnouncementAuditLog`, `Notification`, `Document`, `Role`, `PermissionModule`, `UserOverride`, `Goal`, `Pip`, `IpWhitelist`, `IpBlocklist`, `UserDevice`, `UserSession`, `SecurityAlert`, `Task`, `Workflow`, `SystemSettings`.
*   **Excluded Models (Global)**: `Company` (Global company registry) and `Admin` (Super Admin accounts). These are stored only on the main platform connection.

---

## 🔐 4. Authentication & Roles

### Authentication Flow
*   `AuthService.login` validates credentials first in the platform `Admin` collection. If not found, it resolves the company (using the request host subdomain or input `companyCode`) and looks up the credentials in the `Employee` collection under that specific company.
*   Verifies that the company's subscription status is not `Suspended`.
*   Issues a signed JWT containing:
    ```json
    {
      "id": "EMP-XYZ",
      "email": "user@company.com",
      "role": "company_admin",
      "roleId": "company_admin",
      "companyId": "COMP-ACME"
    }
    ```

### Role Management
*   **`super_admin`**: Allowed access to company management `/api/admin/*` and public auth routes. Blocked from accessing all tenant resource endpoints.
*   **`company_admin`**: Allowed access to all standard resource routes `/api/*` and `/api/v1/*`. Blocked from platform admin routes `/api/admin/*`.
*   **`Manager` / `Employee` / Others**: Bypass strict Matrix-Guarding and rely on route controllers.

---

## 🖥️ 5. Super Admin Panel Status

### Controller Endpoints (`admin.controller.js`)
*   `GET /api/admin/companies`: Search and list paginated company profiles.
*   `POST /api/admin/companies`: Provision a new tenant and seed their default Admin account.
*   `GET /api/admin/companies/:id`: View resource counts (Employees, Projects, Tasks, etc.).
*   `PATCH /api/admin/companies/:id`: Edit plans, colors, logos, and custom isolated database URIs.
*   `PATCH /api/admin/companies/:id/status`: Suspend or activate tenant access.
*   `GET /api/admin/overview`: Platform-wide analytics dashboard statistics.
    *   **Multi-Database Aware**: Yes, `getOverview` iterates through all companies, opens dynamic connection pools via `getTenantConnection(id)`, and aggregates metrics directly on their target databases. Connection failures are caught gracefully (returning `unreachable` status).

### Frontend Console Components
Located in `frontend/src/pages/superadmin/`:
*   `SuperAdminLayout.jsx`: Dedicated admin sidebar and topbar containing no references to business routes.
*   `PlatformOverview.jsx`: Neon-styled KPI dashboard cards with Recharts visualization showing employee and activity logs per company.
*   `CompaniesList.jsx`: Table directory supporting search, plan edits, status toggling, and connection configuration.
*   `CompanyCreate.jsx`: Form for organization creation (logo, subdomain prefix, admin credentials).
*   `CompanyDetail.jsx`: usage counts (tasks, leaves, projects) and charts.
*   `SuperAdmin.css`: Styling for the admin panel.

*   **Route Protections (`main.jsx`)**: `/superadmin/*` routes are guarded via `<Route element={<RoleGuard allowedRoles={['super_admin', 'SuperAdmin']} />}>`.

---

## 🎨 6. Frontend Routing & Branding

### Routing Structure (`main.jsx`)
*   `/login`: Entry page.
*   `/`: Default dashboard landing.
*   `/employees`, `/attendance`, `/leaves`, `/projects`, `/tasks`, `/workflows`, `/payroll`, `/security`, `/settings`: Feature components scoped via global user role permissions.
*   `/superadmin/*`: Platform administrative console.

### Branding Integration (`BrandingContext.jsx`)
*   Wraps the React application at the root boundary.
*   Resolves subdomains or developer parameters (`?subdomain=acme`) and requests styling profiles from the public branding API.
*   Injects hex colors directly into CSS custom variables (`--color-primary`, `--color-secondary`), and updates `document.title` and the page favicon dynamically.

### Public Branding Endpoint
*   Exposes `GET /api/public/branding?subdomain=xyz` and `GET /api/public/branding/:companyId`.
*   Mounted in `app.js` prior to global authentication middlewares, permitting public access. Falls back to default values if lookup is unsuccessful.

---

## 💼 7. Business Modules Scoping Status

The following business modules have been updated with `tenantPlugin` and contain `companyId` in their Mongoose schemas:
*   `employees` (Employee profiles & authentication credentials)
*   `tasks` (Operations workflow task tracking)
*   `attendance` (Check-in and check-out logs)
*   `leaves` (Employee leave requests)
*   `payroll` (Grades, Loans, Reimbursements, Bonuses, and Configs)
*   `branches` (Corporate physical branch directories)
*   `departments` (Functional department organization)
*   `teams` (Operational departments and team lead groups)
*   `projects` (Organization project workspaces)

---

## 🗃️ 8. Migration & Seeding

*   **Migration Script**: Located at `backend/src/scripts/migrate_to_multitenant.js`.
*   **Methodology**:
    1.  Seeds and upserts the default tenant `COMP-DEFAULT` ("Default Company").
    2.  Lists all database collections (excluding `companies`, `admins`, `sessions`, etc.).
    3.  Runs a bulk update adding `companyId: "COMP-DEFAULT"` to all pre-existing single-tenant documents.
*   **Main Database Name**: `office-management` on MongoDB Atlas (configured in `.env` under `DB_URI`).

---

## ⚠️ 9. Known Issues / TODOs

*   **Code Quality Check**: There are no remaining developer `// TODO` or `// FIXME` comments in backend or frontend source code files indicating incomplete features.
*   **Validation Verification**: Schema validation hooks, compound keys (e.g. branch `id` + `companyId`), and routes are clean and fully checked via integration tests.

---

## ⚙️ 10. Environment Variables Configuration

The following variables are configured for the SaaS application inside `backend/.env` (and documented in `backend/.env.example`):

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_URI=mongodb+srv://...           # Main platform connection string

# Security & Secrets
JWT_SECRET=super_secret_jwt_sign_key_office_management_2026
JWT_EXPIRES_IN=7d

# Client Connection
CLIENT_URL=http://localhost:5173   # Allowed CORS origin

# Multi-Database Configuration (Resolved in env.js)
MULTIDB_MAX_POOL_SIZE=5            # Max connections per tenant pool (default: 5)
MULTIDB_MAX_TOTAL_CONNECTIONS=50   # Max concurrent custom database connections (default: 50)

# Platform Seed Configs
INITIAL_ADMIN_NAME=Balram Suman
INITIAL_ADMIN_EMAIL=balram@saas.com
INITIAL_ADMIN_PHONE=8949300997

# ImageKit Configuration (Storage CDN)
IMAGEKIT_PUBLIC_KEY=public_...
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/...
IMAGEKIT_PRIVATE_KEY=private_...
```

---
*Created and verified by Antigravity AI.*
