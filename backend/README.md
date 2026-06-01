# Enterprise-Grade Office Workforce Management Backend

An enterprise-grade, clean, and highly scalable Node.js backend architecture built using **Express.js (ES Modules)**, designed specifically to match the structural domains and role-based access control requirements of the **Saas Enterprise frontend workforce administration application**.

This codebase represents a pure professional layered architecture, ready for MongoDB, Mongoose, and JWT authentication integration.

---

## 🚀 Key Architectural highlights

1. **Modular-Layered Domain Design**: Every business context (e.g., `employees`, `attendance`, `leaves`) is grouped into self-contained vertical domains inside `src/modules/`. Each domain contains its own router, controller, service, repository, and validation rules.
2. **Robust Security & Standard Compliance**: Leverages `helmet` for secured HTTP headers, CORS configurations to prevent unauthorized client domain request leaks, and a central custom logging standard.
3. **Role-Based Access Control (RBAC)**: Integrated mock tokens and permission checks corresponding directly to the `<AuthGuard>` and `<RoleGuard>` constraints used in the frontend's routing structure.
4. **Performance & Reliability Ready**: Pre-configured global asynchronous route wrapping (`asyncHandler`), central validation middleware hooks, unified JSON responses schema, and a centralized express error management layer.

---

## 📁 Repository Directory Structure

```text
backend/
│
├── src/
│   ├── config/               # Environment & Third-Party Library Configs
│   │   ├── env.js            # Dotenv Schema & Loading Controls
│   │   ├── server.js         # HTTP Server Parameters
│   │   ├── database.js       # Future Mongoose MongoDB Bootstrapping
│   │   ├── cors.js           # Cross-Origin Policies & Allowed Origins
│   │   └── logger.js         # Standard Console & Stream Log Wrapper
│   │
│   ├── modules/              # Frontend-Justified Modular Domains
│   │   ├── auth/             # Login, Session Tokens, MFA Security Keys
│   │   ├── employees/        # Employee Profile CRUD, Details, Custom Skills
│   │   ├── attendance/       # Punches, Monthly Record Auditing
│   │   ├── leaves/           # Employee Leave Request Workflows
│   │   ├── tasks/            # Kanban Board Tasks, Project Targets
│   │   ├── payroll/          # Monthly Salary Run Processors, Payslips
│   │   ├── departments/      # Dept Configurations, Employee Transfers
│   │   ├── branches/         # Branch Locations Directory
│   │   ├── teams/            # Core Team Formations & Team Leaders
│   │   ├── projects/         # Project Milestone Tracking
│   │   ├── workflows/        # Automated Automation Pipelines
│   │   ├── work-reports/     # Work Status Log Submissions
│   │   ├── notifications/    # Alert/Notice Read/Unread Markings
│   │   ├── activity-logs/    # Central Admin System Audit Logs
│   │   ├── roles/            # Permissions Matrix for RBAC (super_admin etc)
│   │   ├── documents/        # File Upload Vault Directories
│   │   └── settings/         # System Settings & Metadata Configurations
│   │
│   ├── routes/               # Global Aggregator Endpoint Bindings
│   ├── middlewares/          # Standard Request Pipeline Filters
│   │   ├── auth.middleware.js       # Session Token Validation & Permission Checks
│   │   ├── error.middleware.js      # Express Central Error Handler
│   │   ├── validation.middleware.js # Schema Validation Executor
│   │   └── logger.middleware.js     # Duration Performance Metrics Tracker
│   │
│   ├── utils/                # System Helpers
│   │   ├── asyncHandler.js   # Express Promise Wrapper
│   │   ├── response.js       # Standardized API response formatters
│   │   ├── pagination.js     # High-volume cursor/limit trackers
│   │   └── helpers.js        # Generic utility methods
│   │
│   └── app.js                # Core Express App Middleware Mount Point
│
├── tests/                    # Unit & Integration Tests Suite (Future)
├── docs/                     # OpenAPI/Swagger Specification Files (Future)
├── uploads/                  # Secure Static Files Upload Vault (e.g. PDFs, IDs)
├── logs/                     # System Log Stream Dumps
│
├── .env                      # Local Environment Secrets (Ignored)
├── .env.example              # Public Environment Blueprint
├── package.json              # Architectural Core Dependencies
├── server.js                 # HTTP Bootstrap Server Entry Point
└── README.md                 # Project Onboarding Manual
```

---

## 🛠️ Getting Started & Installation Steps

### 1. Prerequisites
- **Node.js**: `v18.x.x` or higher installed locally.
- **npm** or **yarn** package manager.

### 2. Setting Up Environment Configuration
Clone the repository and copy the example environment blueprint:
```bash
cp .env.example .env
```

### 3. Install Dependencies
Run the command below inside the `backend/` directory to download standard enterprise package dependencies:
```bash
npm install
```

### 4. Running the Server Locally
#### Active Development Mode (With Auto-Reloading via `nodemon`):
```bash
npm run dev
```

#### Production Bootstrapping:
```bash
npm start
```

---

## 🛡️ Modular Coding Standards (For Future Developers)

Whenever building a new feature or extending a modular block under `src/modules/`:

1. **Follow the Route Lifecycle**:
   `Request` ➡️ `validation.middleware` ➡️ `auth.middleware` ➡️ `controller` ➡️ `service` ➡️ `repository` ➡️ `Database`
2. **Never Write Business Logic in Controllers**: The controller's only responsibility is to parse inputs, invoke the correct service handler, and format the response payload. All computations belong to the service layer.
3. **No Direct Model Queries outside Repositories**: Keep the database schema and drivers encapsulated. Only the `repository.js` file should reference Mongoose methods or direct model operations.
4. **Use Standard Response formatters**: Always invoke the `successResponse` and `failResponse` helpers from `src/utils/response.js` to ensure the frontend experiences a uniform payload contract:
   ```json
   {
     "status": "success",
     "message": "Action completed successfully",
     "data": { ... }
   }
   ```
