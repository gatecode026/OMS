# 4. Folder Structure, Database & API Specifications

## 4.1 Folder Structure Breakdown

### 4.1.1 Root Repository Architecture
```
OMS/
├── backend/                  # Express.js REST API & Socket.io server
├── frontend/                 # React.js Single Page Application (Vite)
├── mobile/                   # Mobile application configuration / codebase
├── packages/                 # Shared packages / utility libraries
├── docs/                     # Comprehensive enterprise technical documentation
├── .env.example              # Environment variables template
├── docker-compose.yml        # Docker service orchestration (API, Mongo, Redis, Coturn)
└── package.json              # Monorepo / root npm workspace definition
```

### 4.1.2 Backend Directory Structure (`/backend`)
```
backend/
├── src/
│   ├── config/               # Database, Redis, WebPush, Socket & JWT configurations
│   ├── database/             # MongoDB connection setup & seed scripts
│   ├── jobs/                 # Cron jobs (Payroll auto-run, Leave accruals, Cleanup)
│   ├── middlewares/          # Auth, RBAC, Validation, Error Handling, Rate Limiting
│   ├── migrations/           # Database migration scripts
│   ├── models/               # Global database models / schemas
│   ├── modules/              # Domain-driven feature modules
│   │   ├── auth/             # Authentication, JWT, Reset Password
│   │   ├── employees/        # Employee profiles, documents, directory
│   │   ├── attendance/       # Clock-in/out, Geofence, Corrections
│   │   ├── leaves/           # Leave requests, Balances, Approvals
│   │   ├── payroll/          # Structure, Payslips, Processing
│   │   ├── projects/         # Projects, Milestones, Boards
│   │   ├── tasks/            # Tasks, Subtasks, Time logs
│   │   ├── kpi-evaluations/  # KPIs, Cycles, Ratings
│   │   ├── notifications/    # Push notifications, Web Push, In-app inbox
│   │   └── security/         # Security audits, IP whitelist, Dynamic roles
│   ├── security/             # Encryption utilities & sanitizers
│   ├── services/             # Core business services (Email, S3, PDF generator)
│   └── utils/                # Helper functions, formatters, response helpers
├── server.js                 # HTTP server bootstrap & Socket.io initialization
└── package.json              # Backend dependencies
```

---

## 4.2 Database Schema Specifications

The system utilizes MongoDB with Mongoose ODM. Below are key database collections, field types, relationships, indexes, and validation rules.

### 4.2.1 `users` Collection
| Field Name | Type | Index / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique user identifier |
| `email` | String | Unique, Indexed, Lowercase | User email address |
| `password` | String | Encrypted (Bcrypt) | Password hash |
| `roleId` | ObjectId | Ref `roles`, Indexed | Assigned system role |
| `status` | String | Enum (`ACTIVE`, `INACTIVE`, `SUSPENDED`) | User account status |
| `mfaEnabled` | Boolean | Default `false` | Multi-factor authentication flag |
| `createdAt` | Date | Timestamp | Document creation timestamp |

### 4.2.2 `employees` Collection
| Field Name | Type | Index / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique employee identifier |
| `userId` | ObjectId | Ref `users`, Unique, Indexed | Linked system user account |
| `employeeId` | String | Unique, Indexed | Organizational ID (e.g. `EMP-0104`) |
| `firstName` | String | Required, Trimmed | First name |
| `lastName` | String | Required, Trimmed | Last name |
| `departmentId` | ObjectId | Ref `departments`, Indexed | Assigned department |
| `designation` | String | Required | Official job title |
| `joiningDate` | Date | Required | Date of joining |
| `salaryStructure` | Object | Nested Document | Base salary, allowances, deductions |

### 4.2.3 `attendances` Collection
| Field Name | Type | Index / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Primary Key | Unique record ID |
| `employeeId` | ObjectId | Ref `employees`, Compound Index | Linked employee |
| `date` | Date | Compound Index (`employeeId`, `date`) | Date of attendance |
| `checkIn` | Date | Timestamp | Clock-in time |
| `checkOut` | Date | Timestamp | Clock-out time |
| `status` | String | Enum (`PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`) | Calculated status |
| `location` | Object | GeoJSON Point `{ type, coordinates }` | Geofence coordinates |

---

## 4.3 RESTful API Endpoints Matrix

### 4.3.1 Authentication Endpoint Matrix
| Method | Endpoint | Auth | Description | Payload Sample | Response Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | None | Authenticate user credentials | `{ "email": "...", "password": "..." }` | `200 OK` / `401 Unauthorized` |
| `POST` | `/api/v1/auth/refresh-token` | Refresh Cookie | Rotate JWT access token | None | `200 OK` / `403 Forbidden` |
| `POST` | `/api/v1/auth/logout` | Bearer JWT | Revoke session tokens | None | `200 OK` |

### 4.3.2 Employee Management Endpoints
| Method | Endpoint | Auth | Required Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/employees` | Bearer | `employees:read` | List employees with pagination and filters |
| `POST` | `/api/v1/employees` | Bearer | `employees:create` | Onboard a new employee |
| `GET` | `/api/v1/employees/:id` | Bearer | `employees:read` | Fetch detailed profile of an employee |
| `PUT` | `/api/v1/employees/:id` | Bearer | `employees:update` | Update employee information |
| `DELETE` | `/api/v1/employees/:id` | Bearer | `employees:delete` | Soft delete employee record |

### 4.3.3 Attendance Endpoints
| Method | Endpoint | Auth | Required Permission | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/attendance/check-in` | Bearer | `attendance:punch` | Clock-in with geo-location coordinates |
| `POST` | `/api/v1/attendance/check-out` | Bearer | `attendance:punch` | Clock-out and compute total working hours |
| `GET` | `/api/v1/attendance/my-summary` | Bearer | `attendance:read_self` | Fetch current user monthly attendance summary |
