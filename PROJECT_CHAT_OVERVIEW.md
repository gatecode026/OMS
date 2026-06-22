# Project Chat Integration Overview

This document provides a comprehensive overview of the **Office Management System (OMS)** multi-tenant SaaS codebase, prepared specifically for the AI assistant that will design and implement the **Realtime Chat System**.

---

## SECTION 1: Complete Project Directory Structure
Below is the directory tree for `backend/` and `frontend/` (up to 3 levels deep) with a brief description of each folder.

### 📁 backend/
* **[backend/](file:///r:/OMS/backend)** - Backend server root folder
  * **[tests/](file:///r:/OMS/backend/tests)** - Unit and integration tests (e.g., scoping, multi-database isolation, RBAC)
  * **[src/](file:///r:/OMS/backend/src)** - Main backend application source code
    * **[config/](file:///r:/OMS/backend/src/config)** - System configurations (CORS options, database connections, environment checks, logger, RBAC matrices)
    * **[controllers/](file:///r:/OMS/backend/src/controllers)** - Generic/helper Express request handlers
    * **[database/](file:///r:/OMS/backend/src/database)** - Multi-tenant database connection manager and provisioner
    * **[jobs/](file:///r:/OMS/backend/src/jobs)** - Background jobs and scheduler cleaners (e.g., connection cleanup)
    * **[middlewares/](file:///r:/OMS/backend/src/middlewares)** - Express middlewares (authentication, tenant propagation, error interceptors, validation, logging)
    * **[migrations/](file:///r:/OMS/backend/src/migrations)** - Migration script runner and utilities
    * **[models/](file:///r:/OMS/backend/src/models)** - Generic or global Mongoose models (e.g., Event.js)
    * **[modules/](file:///r:/OMS/backend/src/modules)** - Domain modules implementing the modular architecture (controllers, models, services, routes, validations)
    * **[routes/](file:///r:/OMS/backend/src/routes)** - Centralized router index files
    * **[scripts/](file:///r:/OMS/backend/src/scripts)** - Database utilities and admin maintenance scripts
    * **[utils/](file:///r:/OMS/backend/src/utils)** - Shared system helpers (response formatters, tenant contexts, model proxies, ID generators)

### 📁 frontend/
* **[frontend/](file:///r:/OMS/frontend)** - Frontend application root folder
  * **[public/](file:///r:/OMS/frontend/public)** - Static assets served directly by Vite
  * **[src/](file:///r:/OMS/frontend/src)** - Main React application source code
    * **[assets/](file:///r:/OMS/frontend/src/assets)** - App icons, logos, and images
    * **[components/](file:///r:/OMS/frontend/src/components)** - Shared UI layouts, topbar, sidebars, dashboard widgets, and guards
    * **[context/](file:///r:/OMS/frontend/src/context)** - Context Providers managing global state, themes, and API integrations
    * **[data/](file:///r:/OMS/frontend/src/data)** - Local mock data and presets
    * **[hooks/](file:///r:/OMS/frontend/src/hooks)** - Custom React hooks (e.g., useMyAttendance)
    * **[pages/](file:///r:/OMS/frontend/src/pages)** - Page components and view layouts (dashboard, employees, leaves, payroll)
    * **[permissions/](file:///r:/OMS/frontend/src/permissions)** - RBAC frontend routing configurations and helpers
    * **[styles/](file:///r:/OMS/frontend/src/styles)** - Styling rules and variables
    * **[utils/](file:///r:/OMS/frontend/src/utils)** - Common JS utilities (hash IDs, field label mapping)

---

## SECTION 2: Current Tech Stack — Exact Versions
The exact version numbers of all dependencies in the backend and frontend package manifests are detailed below.

### 📄 backend/package.json
```json
{
  "name": "office-management-backend",
  "version": "1.0.0",
  "description": "Enterprise-Grade Node.js Layered Architecture Backend for Office Management System",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "create-admin": "node src/scripts/create-super-admin.js",
    "test": "echo \"Error: no test specified\" && exit 0"
  },
  "keywords": [
    "nodejs",
    "express",
    "mongodb",
    "mongoose",
    "jwt",
    "rbac",
    "enterprise"
  ],
  "author": "Antigravity",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dns": "^0.1.2",
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "express-mongo-sanitize": "^2.2.0",
    "express-rate-limit": "^8.5.2",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.9"
  }
}
```

### 📄 frontend/package.json
```json
{
  "name": "saas",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "html2canvas": "^1.4.1",
    "lucide-react": "^1.17.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-icons": "^5.5.0",
    "react-router-dom": "^7.16.0",
    "recharts": "^3.8.1"
  },

  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "vite": "^8.0.12"
  }
}
```

### ⚙️ Core Technical Platform Confirmation
* **Node.js**: `v22.12.0` (as identified in active execution environment).
* **MongoDB**: `v7.0.x` / Atlas Serverless Cluster.
* **React**: `^19.2.6` (React 19).
* **Socket.io / WebSockets Installed?**: **No**. Neither `socket.io`, `socket.io-client`, nor standard WebSocket libraries (like `ws`) are installed in the dependencies.
* **Redis / Pub-Sub Installed?**: **No**. No Redis clients (e.g., `redis`, `ioredis`) or related pub-sub utilities are installed or configured.

---

## SECTION 3: Backend Server Setup

### 📄 backend/server.js
```javascript
/**
 * @file server.js
 * @description Application server entry point. Connects to database and binds standard listeners.
 * @author Antigravity
 */

import dotenv from 'dotenv';
import app from './src/app.js';
import logger from './src/config/logger.js';
import database from './src/config/database.js';
import { startEventScheduler } from './src/modules/events/event.scheduler.js';
import { startConnectionCleanupJob } from './src/jobs/connectionCleanup.job.js';
import { closeAllConnections } from './src/utils/multidbConnection.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize server database and bootstrap listening interface
 */
const bootstrap = async () => {
  try {
    // Connect to database (simulated/future integration)
    await database.connect();

    // Start background meeting reminder checks
    startEventScheduler();

    // Start background multi-db connection cleanup checks
    startConnectionCleanupJob();

    const server = app.listen(PORT, () => {
      logger.info(`  Server running in [${NODE_ENV}] mode on port ${PORT}`);
      logger.info(`  Client URL allowed: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      logger.warn(`Received ${signal}. Gracefully shutting down server...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await closeAllConnections();
        } catch (err) {
          logger.error('Error closing tenant connections during shutdown:', err);
        }
        database.disconnect().then(() => {
          logger.info('Database connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to bootstrap application server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, consider crashing or restarting the application gracefully
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

bootstrap();
```

### 📄 backend/src/app.js
```javascript
/**
 * @file src/app.js
 * @description Main Express application instance configuration. Sets up middlewares, modular routing, and error handlers.
 * @author Antigravity
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

// Configuration Imports
import corsOptions from './config/cors.js';
import logger from './config/logger.js';

// Middleware Imports
import { errorMiddleware } from './middlewares/error.middleware.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';

// Global Router Import
import globalRouter from './routes/index.js';
import eventRoutes from './routes/eventRoutes.js';
import adminRouter from './modules/admin/admin.routes.js';
import { authenticate } from './middlewares/auth.middleware.js';
import { tenantMiddleware } from './middlewares/tenant.middleware.js';
import { checkRoleAccess } from './middlewares/roleGuard.middleware.js';
import publicRouter from './modules/companies/public.routes.js';

const app = express();


// ─── SECURITY MIDDLEWARES ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));

// Sanitize MongoDB inputs to prevent Query Injection attacks
app.use(mongoSanitize());

// Rate Limiting Config
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Limit each IP to 10000 requests in dev, 100 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 15, // Limit each IP to 1000 attempts in dev, 15 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  }
});

// Apply rate limiting
app.use('/api', generalLimiter);
app.use('/api/v1/auth', authLimiter);

// ─── REQUEST PARSING ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── REQUEST LOGGING ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}
app.use(loggerMiddleware);

// ─── STATIC FILE VAULT ───────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── HEALTH CHECK ROUTE ──────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Gatecode OMS Workforce Backend API is fully operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── PUBLIC BRANDING ROUTES ──────────────────────────────────────────────────
app.use('/api/public', publicRouter);

// ─── GLOBAL MODULAR ROUTING BINDING ─────────────────────────────────────────
app.use('/api/v1', (req, res, next) => {
  if (req.path.startsWith('/auth')) {
    return next();
  }
  return authenticate(req, res, () => {
    checkRoleAccess(req, res, () => {
      tenantMiddleware(req, res, next);
    });
  });
});

app.use('/api/v1', globalRouter);
app.use('/api/admin', authenticate, checkRoleAccess, adminRouter);
app.use('/api/events', authenticate, checkRoleAccess, tenantMiddleware, eventRoutes);

// ─── FALLBACK FOR UNKNOWN ROUTES ─────────────────────────────────────────────
app.all('*', (req, res, next) => {
  const error = new Error(`Resource ${req.originalUrl} not found on this server`);
  error.statusCode = 404;
  error.status = 'fail';
  next(error);
});

// ─── GLOBAL ERROR HANDLER MIDDLEWARE ─────────────────────────────────────────
app.use(errorMiddleware);

export default app;
```

### 🔒 CORS Configuration Details
CORS parameters are declared in `backend/src/config/cors.js`:
* **Allowed Origins**: `process.env.CLIENT_URL` (configured as `http://localhost:5173` in development) as well as `http://localhost:5173` and `http://127.0.0.1:5173`. Furthermore, in development (`process.env.NODE_ENV === 'development'`), any origin is dynamically approved.
* **Allowed Methods**: `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`
* **Allowed Headers**: `['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']`
* **Credentials Support**: Enabled (`credentials: true`).

### 🔌 Server Ports and Clustering
* **API Port**: Binds to `process.env.PORT` falling back to port `5000`.
* **Separate WebSocket Port**: No separate ports are assigned. Socket connections will share the HTTP port `5000` via the Express HTTP server instance.
* **Clustering Mode**: The application is executed in single-process mode (`app.listen`). No multi-core child clustering (`cluster` module) or PM2 instance scaling rules are explicitly configured in the codebase.

---

## SECTION 4: Authentication — JWT Details

### 🔑 Secret & Expiry Configuration
* **JWT Secret Source**: Evaluated from `process.env.JWT_SECRET` (falls back to `'fallback_secret'`).
* **JWT Expiry**: Evaluated from `process.env.JWT_EXPIRES_IN` (falls back to `'7d'`).

### 📄 backend/src/middlewares/auth.middleware.js
```javascript
/**
 * @file src/middlewares/auth.middleware.js
 * @description Authentication & Authorization (RBAC) middleware verifying real JWT tokens.
 */

import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import Admin from '../modules/admin/admin.model.js';
import Employee from '../modules/employees/employees.model.js';
import Company from '../modules/companies/company.model.js';
import logger from '../config/logger.js';
import { isDatabaseConnected } from '../config/database.js';
import { runWithTenant } from '../utils/tenantContext.js';

/**
 * Validates JWT access token stored in Authorization header.
 * Attaches validated database user session context to request payload.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. Missing or invalid Authorization token.',
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Decode token
    const decoded = jwt.verify(token, env.jwtSecret);
    
    // In offline sandbox mode, use the token payload directly
    if (!isDatabaseConnected) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        companyId: decoded.companyId || 'COMP-DEFAULT',
        name: decoded.name || 'Offline User'
      };
      logger.debug(`User authenticated offline successfully: ${req.user.name} (${req.user.role})`);
      return runWithTenant(req.user.companyId, next);
    }

    // Retrieve associated active account from matching collection
    let user;
    if (decoded.role === 'super_admin') {
      user = await Admin.findOne({ id: decoded.id }).select('id name email roleId status companyId').lean();
    } else if (decoded.role === 'company_admin') {
      user = await Company.findOne({ id: decoded.id }).select('id name email status').lean();
      if (user) {
        user.roleId = 'company_admin';
        user.companyId = user.id;
      }
    } else {
      user = await Employee.findOne({ id: decoded.id }).select('id name email roleId status companyId').lean();
    }

    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication failed. The session user was not found.',
      });
    }

    if (user.status !== 'Active' && user.status !== 'On Leave') {
      return res.status(403).json({
        status: 'fail',
        message: 'Authentication failed. This account is inactive.',
      });
    }

    // Attach user profile context
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleId,
      companyId: user.companyId || 'COMP-DEFAULT'
    };

    const isSuperAdmin = user.roleId === 'super_admin';
    logger.debug(`User authenticated successfully: ${req.user.name} (${req.user.role})`);
    runWithTenant(req.user.companyId, next, isSuperAdmin);
  } catch (error) {
    logger.error('Authentication Middleware Error:', error);
    return res.status(401).json({
      status: 'fail',
      message: 'Authentication failed. Expired or malformed session token.',
    });
  }
};

/**
 * Restricts access to specific roles. Simulates UI RoleGuard mapping.
 * @param {Array<string>} allowedRoles - Permitted roles (e.g. ['super_admin', 'branch_admin'])
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      logger.warn(`Access forbidden for user: ${req.user?.name}. Role: ${req.user?.role}. Required: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        status: 'fail',
        message: 'Access forbidden. You do not possess the required system permissions to access this domain.',
      });
    }
    next();
  };
};
```

### 🎫 JWT Payload Structure
The token generated inside `auth.service.js` has the following exact keys:
```javascript
{
  id: string,         // Employee ID (e.g. "GATECO-EMP-003") or Admin/Company ID
  email: string,      // User official/personal email address
  role: string,       // Role code e.g. "employee", "company_admin", "super_admin"
  roleId: string,     // Identical to role field value
  companyId: string   // The tenant company identity code (e.g., "COMP-001" or null for Super Admin)
}
```

### 🔄 Refresh Token & Client Side Storage
* **Refresh Tokens**: Not implemented. Standard JWTs are issued for `7d` and are not backed by database-revocable refresh scopes.
* **Storage on Client Side**: The client app stores the authentication token locally inside `localStorage` (key: `saas_token`) and `sessionStorage` (key: `saas_token`). It is submitted with API requests using the standard HTTP header:
  `Authorization: Bearer <token>`

---

## SECTION 5: Multi-Tenant Context — Chat Ke Liye Relevant Parts

### 📄 backend/src/utils/tenantContext.js
```javascript
import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';
import { getTenantConnection } from './multidbConnection.js';

const tenantStorage = new AsyncLocalStorage();

/**
 * Gets the current request's tenant company ID.
 */
export const getTenantId = () => {
  const store = tenantStorage.getStore();
  return store ? store.tenantId : null;
};

/**
 * Checks if the current request is initiated by a Platform Super Admin.
 */
export const isSuperAdminRequest = () => {
  const store = tenantStorage.getStore();
  return store ? !!store.isSuperAdmin : false;
};

/**
 * Gets the active database connection for the current request context.
 * Falls back to main mongoose.connection if none is scoped.
 */
export const getActiveConnection = () => {
  const store = tenantStorage.getStore();
  return store && store.connection ? store.connection : mongoose.connection;
};

/**
 * Runs a callback inside the resolved tenant context.
 * Resolves the database connection pool asynchronously first.
 */
export const runWithTenant = async (tenantId, callback, isSuperAdmin = false) => {
  const connection = await getTenantConnection(tenantId);
  return tenantStorage.run({ tenantId, connection, isSuperAdmin }, callback);
};

/**
 * Runs a callback synchronously if the connection is already resolved.
 */
export const runWithTenantConnection = (tenantId, connection, callback, isSuperAdmin = false) => {
  return tenantStorage.run({ tenantId, connection, isSuperAdmin }, callback);
};

export default {
  getTenantId,
  isSuperAdminRequest,
  getActiveConnection,
  runWithTenant,
  runWithTenantConnection
};
```

### 📄 backend/src/middlewares/tenant.middleware.js
```javascript
import { runWithTenant } from '../utils/tenantContext.js';

/**
 * Express middleware to propagate the tenant's companyId to AsyncLocalStorage
 */
export const tenantMiddleware = (req, res, next) => {
  // 1. Skip tenant scoping for auth routes
  if (req.path.startsWith('/auth') || req.path.includes('/api/v1/auth') || req.path.includes('/api/auth')) {
    return next();
  }

  // 2. Extract tenant ID from authenticated user JWT payload
  let tenantId = req.user?.companyId;

  // 3. Super Admin privilege: If the actor is a Platform Super Admin, they can view specific tenant data
  // by passing an explicit companyId query parameter or custom header.
  const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.role === 'SuperAdmin';
  if (isSuperAdmin) {
    const explicitCompanyId = req.query.companyId || req.headers['x-tenant-id'];
    if (explicitCompanyId) {
      tenantId = explicitCompanyId;
    }
  }

  // Fallback to default tenant if none is resolved (e.g. for backward compatibility)
  if (!tenantId) {
    tenantId = 'COMP-DEFAULT';
  }

  // 4. Run the rest of request lifecycle inside the resolved tenant context
  runWithTenant(tenantId, next, isSuperAdmin);
};

export default tenantMiddleware;
```

### 📄 backend/src/utils/tenantPlugin.js
```javascript
import mongoose from 'mongoose';
import { getTenantId, getActiveConnection, isSuperAdminRequest } from './tenantContext.js';

// List of tenant-scoped models that require database-level isolation
const tenantScopedModelNames = new Set([
  'Employee', 'Branch', 'Department', 'Team', 'Project', 
  'Attendance', 'Leave', 'Holiday', 'PayrollGrade', 
  'PayrollReimbursement', 'PayrollLoanAdvance', 'PayrollBonus', 
  'PayrollPayment', 'PayrollConfig', 'AppraisalReview', 
  'WorkReport', 'ActivityLog', 'Event', 'Announcement', 
  'EmergencyAlert', 'AnnouncementTrackingLog', 'AnnouncementAuditLog', 
  'Notification', 'Document', 'Role', 'PermissionModule', 
  'UserOverride', 'Goal', 'Pip', 'IpWhitelist', 'IpBlocklist', 
  'UserDevice', 'UserSession', 'SecurityAlert', 'Task', 'Workflow', 
  'SystemSettings'
]);

// Keep original mongoose.model compilation reference
const originalModel = mongoose.model;

// Map to store custom collection names for tenant-scoped models
const modelCollectionMap = new Map();

// Keep original Connection.prototype.model reference
const originalConnectionModel = mongoose.Connection.prototype.model;

mongoose.Connection.prototype.model = function (name, schema, collection) {
  const customCollection = collection || modelCollectionMap.get(name);
  return originalConnectionModel.call(this, name, schema, customCollection);
};

mongoose.model = function (name, schema, collection) {
  const customCollection = collection || schema?.options?.collection;
  if (customCollection) {
    modelCollectionMap.set(name, customCollection);
  }

  // 1. If it's a global platform model (like Company, Admin), compile normally on main connection
  if (!tenantScopedModelNames.has(name)) {
    return originalModel.call(mongoose, name, schema, collection);
  }

  // 2. Compile model on the main mongoose instance first to ensure default registry works
  const defaultModel = originalModel.call(mongoose, name, schema, collection);

  // 3. Return a JS Proxy to dynamically delegate operations to the active connection
  return new Proxy(defaultModel, {
    construct(target, args) {
      const activeConn = getActiveConnection();
      const customCollection = modelCollectionMap.get(name);
      const tenantModel = activeConn.models[name] || activeConn.model(name, target.schema, customCollection);
      return Reflect.construct(tenantModel, args);
    },
    
    get(target, prop) {
      const activeConn = getActiveConnection();
      const customCollection = modelCollectionMap.get(name);
      const tenantModel = activeConn.models[name] || activeConn.model(name, target.schema, customCollection);

      if (prop === 'schema') {
        return target.schema;
      }

      if (prop === 'db') {
        return activeConn;
      }

      const value = Reflect.get(tenantModel, prop);
      if (typeof value === 'function') {
        return value.bind(tenantModel);
      }
      return value;
    },

    getPrototypeOf(target) {
      const activeConn = getActiveConnection();
      const customCollection = modelCollectionMap.get(name);
      const tenantModel = activeConn.models[name] || activeConn.model(name, target.schema, customCollection);
      return Reflect.getPrototypeOf(tenantModel);
    }
  });
};

/**
 * Core Mongoose Plugin to enforce logical tenant scoping on the current database connection.
 * Adds companyId to schema, sets it on validate, and injects filters into queries/aggregations.
 */
export const tenantPlugin = (schema) => {
  // 1. Add companyId field to Schema (required: true, index: true)
  if (!schema.paths.companyId) {
    schema.add({
      companyId: {
        type: String,
        ref: 'Company',
        required: true,
        index: true
      }
    });
  }

  // 2. Pre-validate hook: automatically set companyId if tenant context is available and document is new (before validation runs)
  schema.pre('validate', function (next) {
    const tenantId = getTenantId();
    if (tenantId && this.isNew) {
      if (isSuperAdminRequest() && this.companyId) {
        return next();
      }
      this.companyId = tenantId;
    }
    next();
  });

  // 3. Query hooks: automatically filter by companyId if tenant context is available
  const autoFilter = function (next) {
    const tenantId = getTenantId();
    const options = this.getOptions ? this.getOptions() : {};
    
    if (tenantId && !options.bypassTenantScoping) {
      this.where({ companyId: tenantId });
      
      // Prevent spoofing companyId on updates
      const update = this.getUpdate();
      if (update) {
        if (update.companyId !== undefined) {
          delete update.companyId;
        }
        if (update.$set && update.$set.companyId !== undefined) {
          delete update.$set.companyId;
        }
      }
    }
    next();
  };

  schema.pre('find', autoFilter);
  schema.pre('findOne', autoFilter);
  schema.pre('findOneAndUpdate', autoFilter);
  schema.pre('countDocuments', autoFilter);
  schema.pre('updateOne', autoFilter);
  schema.pre('updateMany', autoFilter);
  schema.pre('deleteOne', autoFilter);
  schema.pre('deleteMany', autoFilter);

  // 4. Aggregation hook: prepend $match stage at the beginning of the pipeline
  schema.pre('aggregate', function (next) {
    const tenantId = getTenantId();
    const options = this.options || {};
    if (tenantId && !options.bypassTenantScoping) {
      this.pipeline().unshift({ $match: { companyId: tenantId } });
    }
    next();
  });
};

export default tenantPlugin;
```

### 🏢 Company Model details (Plans & Database isolation)
The company model schema contains:
* **`plan` field**: Declared as an enum string:
  `plan: { type: String, enum: ['Basic', 'Premium', 'Enterprise'], default: 'Basic' }`
  This field is accessible in backend code to restrict or grant access to features like the Chat System.
* **Mongoose Model Proxy Scoping Summary**: The JS Proxy in `tenantPlugin.js` intercepts all model compilations. If the model name is in the `tenantScopedModelNames` Set, Mongoose routes any operation to `getActiveConnection()`. This connection is dynamically fetched for the request's active company ID, allowing the application to utilize **dedicated database pools** for premium clients or **shared databases** (scoping data with `companyId` filters via the Mongoose plugin) for starter tenants.

---

## SECTION 6: Existing Real-Time / Event System

* **Existing Realtime Engine**: None. The backend currently operates strictly as a stateless REST HTTP API.
* **Calendar/Event Module (`events/`)**: The `/events` module is strictly a **calendar planner and scheduler** module. It stores meetings, appointments, and reviews (using `event.model.js` schema containing title, date, startTime, and attendees). It uses a background checker (`event.scheduler.js` executing checking routines) to dispatch reminders.

### 📄 backend/src/modules/notifications/notification.model.js
```javascript
/**
 * @file src/modules/notifications/notification.model.js
 * @description Mongoose model for system Notifications.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const notificationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    default: 'system'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    default: 'Normal'
  },
  recipientType: {
    type: String,
    default: ''
  },
  recipientRole: {
    type: String,
    default: ''
  },
  recipientId: {
    type: String,
    default: ''
  },
  targetUserId: {
    type: String,
    default: ''
  },
  targetRole: {
    type: String,
    default: ''
  },
  forUserId: {
    type: String,
    default: ''
  },
  sentBy: {
    type: String,
    default: ''
  },
  sentDate: {
    type: String,
    default: ''
  },
  deliveryStatus: {
    type: String,
    default: 'Delivered'
  },
  readStatus: {
    type: String,
    default: 'Unread'
  },
  readTime: {
    type: String,
    default: '—'
  },
  recipients: {
    type: Number,
    default: 0
  },
  delivered: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

notificationSchema.plugin(tenantPlugin);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
```

### 📄 backend/src/modules/notifications/notifications.controller.js
```javascript
/**
 * @file src/modules/notifications/notifications.controller.js
 * @description Controllers for Notifications module.
 */

import service from './notifications.service.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const data = await service.findAll(req.query);
  return successResponse(res, data, 'Records fetched successfully');
});

export const getById = asyncHandler(async (req, res) => {
  const data = await service.findById(req.params.id);
  return successResponse(res, data, 'Record fetched successfully');
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.createRecord(req.body, req.user);
  return successResponse(res, data, 'Record created successfully', 201);
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.updateRecord(req.params.id, req.body, req.user);
  return successResponse(res, data, 'Record updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const data = await service.deleteRecord(req.params.id, req.user);
  return successResponse(res, data, 'Record deleted successfully');
});

export const getPublicData = asyncHandler(async (req, res) => {
  return successResponse(res, { status: 'mock_public_data' }, 'Public record fetched');
});

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getPublicData
};
```

### 🔄 Client Side Polling
* **Is there a notification polling script in the frontend?**: **No**. The notifications page / Topbar widget fetches notifications exactly once when mounted (via `fetchNotifications()` inside `AppContext.jsx` triggered in a mount `useEffect`). There are no active timers (`setInterval` or `setTimeout`) polling notifications from the database.

---

## SECTION 7: Frontend State Management

### 🎨 Global State Architecture
* The application relies on the React Context API (`AppProvider` / `AppContext` declared inside `frontend/src/context/AppContext.jsx`) to expose all states (employees, attendance, payroll, notifications, settings) and operations (login, logout, fetch methods) globally to pages and layout components.
* **WebSocket Connections**: None. The React app does not host any active WebSocket or polling socket instances.

### 📄 frontend/src/context/AppContext.jsx (Structural Excerpt)
> [!NOTE]
> `AppContext.jsx` is a comprehensive 4,468-line file that manages the full layout and mock integrations of the platform. The structural excerpt below details the state initialization, authentication actions, and Mount hooks relevant for starting the Chat System. The full file can be viewed at: [AppContext.jsx](file:///r:/OMS/frontend/src/context/AppContext.jsx).

```javascript
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getRequiredRoleForPath, hasRoleAccess, PATH_TO_MODULE } from '../permissions/permissions';

const AppContext = createContext(undefined);

export const normalizeEmployee = (emp) => {
  if (!emp) return emp;
  const normalized = { ...emp };

  const idVal = normalized.id || normalized.employeeId;
  normalized.id = idVal;
  normalized.employeeId = idVal;

  const nameVal = normalized.name || normalized.fullName;
  normalized.name = nameVal;
  normalized.fullName = nameVal;

  normalized.photoUrl = normalized.photoUrl || normalized.avatar || null;
  normalized.officialEmail = normalized.officialEmail || normalized.email || '';
  normalized.officialMobile = normalized.officialMobile || normalized.phone || '';
  
  return normalized;
};

export const AppProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token') || '');
  const [notifications, setNotifications] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(() => localStorage.getItem('saas_role') || 'super_admin');
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('saas_user_id') || '');
  const [currentUser, setCurrentUser] = useState(null);

  // Authentication Handlers
  const login = async (email, password) => {
    if (!email || !password) throw new Error('Credentials cannot be empty');

    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Authentication failed');

      const { user, token } = result.data;

      localStorage.setItem('saas_token', token);
      sessionStorage.setItem('saas_token', token);
      localStorage.setItem('saas_role', user.roleId);
      localStorage.setItem('saas_user_id', user.id);
      localStorage.setItem('saas_user', JSON.stringify(user));

      setToken(token);
      setCurrentUserRole(user.roleId);
      setCurrentUserId(user.id);
      setCurrentUser(user);

      return user;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_role');
    localStorage.removeItem('saas_user_id');
    localStorage.removeItem('saas_user');
    sessionStorage.removeItem('saas_token');

    setCurrentUserRole(null);
    setCurrentUserId('');
    setCurrentUser(null);
    setToken('');

    window.location.href = '/login';
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setNotifications(result.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Mount/Data-Loading hook
  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  return (
    <AppContext.Provider value={{
      token,
      currentUser,
      currentUserRole,
      currentUserId,
      employees,
      notifications,
      login,
      logout,
      fetchNotifications
    }}>
      {children}
    </AppContext.Provider>
  );
};
```

### 🌐 Axios Instance Config
* **Is Axios configured?**: **No**. The application executes native HTTP calls using `window.fetch()` directly within the services and contexts. The file `frontend/src/utils/api.js` does not exist. Authenticative validation is handled by retrieving the raw bearer token from the provider state and injecting it as `Authorization: Bearer ${token}` on requests.

---

## SECTION 8: Employee/User Model — Chat Ke Liye

### 📄 backend/src/modules/employees/employees.model.js
```javascript
/**
 * @file src/modules/employees/employees.model.js
 * @description Mongoose schema definition for Employees module.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const employeeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dob: String,
  employeeCode: {
    type: String,
    sparse: true,
    trim: true,
    index: true
  },
  gender: String,
  phone: {
    type: String,
    required: true
  },
  alternatePhone: String,
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  personalEmail: String,
  workEmail: String,
  avatar: String,
  bloodGroup: String,
  maritalStatus: String,
  experience: String,
  nationality: String,

  // Address details
  currentAddress: String,
  permanentAddress: String,
  city: String,
  state: String,
  zipCode: String,
  country: {
    type: String,
    default: 'India'
  },

  // Emergency contact details
  emergencyContactName: String,
  emergencyContactPhone: String,
  emergencyContactPhoneAlt: String,
  emergencyContactRelation: String,

  // Login credentials
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    select: false
  },
  lastLoginAt: {
    type: Date,
    default: null
  },

  // Professional details
  role: {
    type: String,
    default: 'Employee'
  },
  roleId: {
    type: String,
    default: 'employee'
  },
  designation: String,
  department: {
    type: String,
    index: true
  },
  branch: {
    type: String,
    index: true
  },
  branchAddress: String,
  team: String,
  teamLeader: String,
  projectManager: String,
  joinDate: String,
  shiftTiming: String,
  shiftType: String,
  workLocation: String,
  workMode: String,

  // Employment status
  employeeType: String,
  employmentStatus: String,
  status: {
    type: String,
    default: 'Active',
    index: true
  },
  accountStatus: {
    type: String,
    default: 'Active'
  },
  probationEndDate: String,
  contractEndDate: String,

  // Bank details
  bankName: String,
  bankAccountNumber: String,
  bankIfscCode: String,
  bankUpiId: String,

  // Salary & Payroll
  salaryType: String,
  monthlySalary: String,
  salaryAmount: String,
  salaryDeductions: String,
  overtimeEligibility: {
    type: Boolean,
    default: false
  },

  // Identity documents
  panNumber: String,
  aadhaarNumber: String,
  documents: [{
    category: String,
    fileName: String,
    uploadDate: String,
    fileType: String,
    downloadUrl: String
  }],

  // Analytics & history fields
  attendanceStatus: {
    type: String,
    default: 'Present'
  },
  workStatus: {
    type: String,
    default: 'Offline'
  },
  todayPunchIn: {
    type: String,
    default: null
  },
  todayPunchOut: {
    type: String,
    default: null
  },
  todayWorkingHours: {
    type: Number,
    default: 0
  },
  todayPunchStatus: {
    type: String,
    default: 'Not Punched'
  },
  lastSeen: {
    type: String,
    default: '—'
  },
  productivityScore: {
    type: Number,
    default: 0
  },
  performanceRating: {
    type: String,
    default: 'Good'
  },
  leaveBalance: {
    type: Number
  },
  clBalance: {
    type: Number
  },
  slBalance: {
    type: Number
  },
  plBalance: {
    type: Number
  },
  maternityBalance: {
    type: Number
  },
  currentProjectsCount: {
    type: Number,
    default: 0
  },
  skills: [{
    name: String,
    level: String
  }],
  certifications: [{
    name: String,
    expiryDate: String
  }],
  attendanceHistory: [mongoose.Schema.Types.Mixed],
  overtimeHistory: [mongoose.Schema.Types.Mixed],
  leaveHistory: [mongoose.Schema.Types.Mixed],
  taskHistory: [mongoose.Schema.Types.Mixed],
  performanceScore: {
    overall: { type: Number, default: 0 },
    attendance: { type: Number, default: 0 },
    taskCompletion: { type: Number, default: 0 },
    reportSubmission: { type: Number, default: 0 },
    leaveDiscipline: { type: Number, default: 0 },
    monthly: { type: [Number], default: [0, 0, 0, 0, 0, 0] }
  },
  activityLog: [mongoose.Schema.Types.Mixed],
  securityInfo: {
    lastLogin: { type: String, default: '—' },
    loginDevice: { type: String, default: '—' },
    loginLocation: { type: String, default: '—' },
    failedAttempts: { type: Number, default: 0 },
    mfaStatus: { type: String, default: 'Disabled' }
  },
  payrollSummary: {
    salaryStatus: { type: String, default: 'Pending' },
    lastSalaryDate: { type: String, default: '—' },
    upcomingPayrollDate: { type: String, default: '—' },
    bonusHistory: [mongoose.Schema.Types.Mixed]
  }
}, {
  timestamps: true,
  collection: 'employees'
});

// Pre-validate: generate company-scoped id and employeeCode BEFORE Mongoose validates required fields
employeeSchema.pre('validate', async function (next) {
  if (!this.isNew) return next();
  try {
    const { getTenantId } = await import('../../utils/tenantContext.js');
    const tenantId = getTenantId();
    if (tenantId && !this.companyId) {
      this.companyId = tenantId;
    }

    const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
    const generatedCode = await generateCompanyUniqueId(this.companyId, 'employees');
    if (!this.id || this.id.trim() === '') {
      this.id = generatedCode;
    }
    if (!this.employeeCode || this.employeeCode.trim() === '') {
      this.employeeCode = generatedCode;
    }
  } catch (err) {
    return next(err);
  }
  next();
});

// Pre-save password hashing
employeeSchema.pre('save', async function (next) {
  if (!this.password) return next();
  if (!this.isModified('password')) return next();
  if (/^\$2[ab]\$/.test(this.password)) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

employeeSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

employeeSchema.plugin(tenantPlugin);
employeeSchema.index({ companyId: 1, id: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true, sparse: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
```

### 👥 Key Chat Attributes
* **ID Format**: `id` is a company-scoped custom string (e.g. `GATECO-EMP-001`, `EMP-2026-003`). Note that it is **not** a Mongoose standard `ObjectId` (though Mongoose will still generate a default `_id` on the database document, the app queries and identifies actors solely by the custom `id` string).
* **Profile Attributes**: Profile photos use the `avatar` field (String, typically relative path/URL). In the frontend normalization helper, this is mapped:
  `photoUrl = normalized.photoUrl || normalized.avatar || null`
* **Role Field**: Exposes `role` (standard string description e.g. "Team Leader", "Company Admin") and `roleId` (code-level RBAC role e.g. "team_leader", "employee").
* **Online/Seen status**: 
  - `workStatus`: Default value is `"Offline"`. Useful for identifying active chat session status.
  - `lastSeen`: Default value is `"—"` (string representing last active time).

---

## SECTION 9: Current Modules List

### 📦 Backend Modules
Under `backend/src/modules/`, there are **26** functional domain packages:
1. **`activity-logs`**: Audit trail tracking user interactions and security logs.
2. **`admin`**: System-level controllers and schemas for Super Admins.
3. **`announcements`**: Company-wide notification feeds with confirmation trackings.
4. **`appraisal-reviews`**: HR performance appraisal evaluation forms and feedback.
5. **`attendance`**: Punch logs, IP-verified whitelists, check-ins, and rules.
6. **`auth`**: Credentials validation, session checks, and JWT generation.
7. **`branches`**: Scopes office locations, addresses, and custom settings.
8. **`companies`**: Tenant accounts creation, plans, and database provision.
9. **`counters`**: Sequences helper database indices for ID generation.
10. **`departments`**: Office hierarchies (Engineering, HR, Marketing).
11. **`documents`**: Scans and saves secure identity documents for employees.
12. **`employees`**: Employee accounts profiles, addresses, and bank configs.
13. **`events`**: Meeting rooms calendar appointments and scheduler checks.
14. **`holidays`**: Scopes company holiday calendar schedules.
15. **`leaves`**: Vacation/sick requests workflows and balance tallies.
16. **`notifications`**: Dispatches system events notifications to profiles.
17. **`payroll`**: Configures pay grades, loans, reimbursements, and payslips.
18. **`performance`**: Goals evaluation checklists and PIP tracking logs.
19. **`projects`**: Project details lists, leaders, deadlines, and groups.
20. **`roles`**: Centralized RBAC definitions, custom permissions, and overrides.
21. **`security`**: IP validation firewalls, whitelist maps, and session locks.
22. **`settings`**: Scopes timezone, currency, and portal naming options.
23. **`tasks`**: Monitors project tasks, task boards, and completion checklists.
24. **`teams`**: Groups employee accounts into development/sales teams.
25. **`work-reports`**: Daily and weekly reports submit log checks.
26. **`workflows`**: Custom visual workflow stages automation scheduler.

> [!IMPORTANT]
> **Does any Chat module already exist?**
> **No**. There are no folders, files, schemas, controllers, or service routines named `chat`, `messages`, or `conversations` in the backend.

### 🖼️ Frontend Page Routes
Routes defined inside `frontend/src/main.jsx`:
* `/login` ➡️ [Login.jsx](file:///r:/OMS/frontend/src/pages/Login.jsx) (Public login page)
* `/` ➡️ [Dashboard.jsx](file:///r:/OMS/frontend/src/pages/Dashboard.jsx) (User entry dashboard)
* `/overview` ➡️ [Overview.jsx](file:///r:/OMS/frontend/src/pages/Overview.jsx) (General system widgets)
* `/employee-dashboard` ➡️ [EmployeeDashboard.jsx](file:///r:/OMS/frontend/src/pages/EmployeeDashboard.jsx) (Employee-focused home view)
* `/employees` ➡️ [Employees.jsx](file:///r:/OMS/frontend/src/pages/Employees.jsx) (Employee list and add view)
* `/employees/:id` ➡️ [EmployeeProfile.jsx](file:///r:/OMS/frontend/src/pages/EmployeeProfile.jsx) (Profile viewer)
* `/employee-profile/:id` ➡️ [EmployeeProfile.jsx](file:///r:/OMS/frontend/src/pages/EmployeeProfile.jsx) (Alias routing for profiles)
* `/attendance` ➡️ [Attendance.jsx](file:///r:/OMS/frontend/src/pages/Attendance.jsx) (Admin attendance tracker)
* `/attendance/webportal` ➡️ [WebPortalAttendance.jsx](file:///r:/OMS/frontend/src/pages/WebPortalAttendance.jsx) (Clocking web portal)
* `/leaves` ➡️ [LeaveManagement.jsx](file:///r:/OMS/frontend/src/pages/LeaveManagement.jsx) (Leave requests, policies)
* `/departments` ➡️ [Departments.jsx](file:///r:/OMS/frontend/src/pages/Departments.jsx) (Departments list and scopes)
* `/branches` ➡️ [Branches.jsx](file:///r:/OMS/frontend/src/pages/Branches.jsx) (Offices location configs)
* `/teams` ➡️ [Teams.jsx](file:///r:/OMS/frontend/src/pages/Teams.jsx) (Teams list boards)
* `/teams/leaders` ➡️ [TeamLeaders.jsx](file:///r:/OMS/frontend/src/pages/TeamLeaders.jsx) (Leaders tracking views)
* `/projects` ➡️ [Projects.jsx](file:///r:/OMS/frontend/src/pages/projects/index.jsx) (Active projects boards)
* `/managers` ➡️ [Managers.jsx](file:///r:/OMS/frontend/src/pages/Managers.jsx) (Managers list views)
* `/tasks` ➡️ [TaskMonitoring.jsx](file:///r:/OMS/frontend/src/pages/TaskMonitoring.jsx) (Project tasks boards)
* `/work-reports` ➡️ [WorkReports.jsx](file:///r:/OMS/frontend/src/pages/WorkReports.jsx) (Daily work sheet logs)
* `/performance` ➡️ [Performance.jsx](file:///r:/OMS/frontend/src/pages/Performance.jsx) (KPI goals and PIPs dashboard)
* `/payroll` ➡️ [Payroll.jsx](file:///r:/OMS/frontend/src/pages/Payroll.jsx) (HR payroll configuration)
* `/calendar` ➡️ [Calendar.jsx](file:///r:/OMS/frontend/src/pages/Calendar.jsx) (Meetings scheduling planner)
* `/announcements` ➡️ [Announcements.jsx](file:///r:/OMS/frontend/src/pages/Announcements.jsx) (Company notice board)
* `/notifications` ➡️ [Notifications.jsx](file:///r:/OMS/frontend/src/pages/Notifications.jsx) (Notifications inbox center)
* `/documents` ➡️ [Documents.jsx](file:///r:/OMS/frontend/src/pages/Documents.jsx) (Document uploads folder)
* `/permissions` ➡️ [RolesPermissions.jsx](file:///r:/OMS/frontend/src/pages/RolesPermissions.jsx) (RBAC matrices editor)
* `/security` ➡️ [SecurityAudit.jsx](file:///r:/OMS/frontend/src/pages/SecurityAudit.jsx) (IP whitelists & audit logs)
* `/audit-logs` ➡️ [SecurityAudit.jsx](file:///r:/OMS/frontend/src/pages/SecurityAudit.jsx) (Alias redirect to Security)
* `/reports` ➡️ [Reports.jsx](file:///r:/OMS/frontend/src/pages/Reports.jsx) (Exportable summary modules)
* `/settings` ➡️ [SystemSettings.jsx](file:///r:/OMS/frontend/src/pages/SystemSettings.jsx) (Admin settings portal)
* `/profile` ➡️ [MyProfile.jsx](file:///r:/OMS/frontend/src/pages/MyProfile.jsx) (Current user own profile)
* `/superadmin/*` ➡️ Scopes layout for [SuperAdminLayout.jsx](file:///r:/OMS/frontend/src/pages/superadmin/SuperAdminLayout.jsx) containing platform level overview and company management pages.

---

## SECTION 10: Infrastructure & Deployment

### 📄 Environment Variables Used in `.env`
* `PORT` - Port where the backend API listens (5000).
* `NODE_ENV` - Runtime mode (development / production).
* `DB_URI` - MongoDB connection URI.
* `JWT_SECRET` - Signed key for JWT access tokens.
* `JWT_EXPIRES_IN` - Lifetime duration of JWT (e.g. `7d`).
* `CLIENT_URL` - Allowed CORS client origins.
* `INITIAL_ADMIN_NAME` - Bootstrap Super Admin name.
* `INITIAL_ADMIN_EMAIL` - Bootstrap Super Admin login email.
* `INITIAL_ADMIN_PHONE` - Bootstrap Super Admin contact phone.
* `IMAGEKIT_PUBLIC_KEY` - Public ID for ImageKit CDN.
* `IMAGEKIT_URL_ENDPOINT` - ImageKit endpoint base URL.
* `IMAGEKIT_PRIVATE_KEY` - Secure key for uploading files.
* `CLUSTER_1_URI` - Base MongoDB connection URI for tenant database provisioning.

### 🌐 Cloud Storage and CDNs
* **ImageKit**: The system uses ImageKit (`IMAGEKIT_PUBLIC_KEY` & `IMAGEKIT_PRIVATE_KEY` configured in `.env`) as its file vault and image CDN for handling document/avatar uploads. No S3 or Cloudinary systems are integrated.

### 📨 Mailing & Caching
* **Email / SMTP Service**: None. There are no configured SMTP host configurations or mailing packages in the codebase.
* **Redis / Memcached**: None. Redis is not configured or deployed.

### 🚀 Deployment Configuration
* **Target Platforms**: The codebase is configured with `vercel.json` in both the root folder and frontend folder, suggesting direct deployment on **Vercel** serverless configurations, with the backend served via serverless functions or an external container.

---

## SECTION 11: Database Collections — Current State

### 📁 Active Databases on Cluster
* **`office-management`**: Core application database.
* **`rhst_db`**: External application database (unrelated to current project).
* **`sample_mflix`**: Default MongoDB Atlas sample dataset.

### 📦 Collections inside `office-management`
1. `companies` - Stores company registration metadata and plan configs (1 document).
2. `admins` - Platform Super Admin profiles (1 document).
3. `employees` - Tenant employee records (8 documents).
4. `rbac_roles` - RBAC access templates for companies (3 documents).
5. `permission_modules` - Modules mapped in permission panels (21 documents).
6. `branches` - Branch location parameters (4 documents).
7. `departments` - Department hierarchy models (2 documents).
8. `tenant_registry` - Global email-to-tenant lookup table (9 documents).
9. `announcements` - Notice boards (2 documents).
10. `announcement_tracking_logs` - Tracks announcement reads (10 documents).
11. `announcement_audit_logs` - Modification logs (3 documents).
12. `activity_logs` - Security action history (438 documents).
13. `emergency_alerts` - System safety alerts (5 documents).
14. `ipblocklists` / `ipwhitelists` - Firewall rules (3 / 4 documents).
15. `securityalerts` - Security triggers (3 documents).
16. `attendance` - Log punches (3 documents).
17. `projects` - Active projects (1 document).
18. `payroll_configs` - Global payment guidelines (5 documents).
19. `system_settings` - Global variables (2 documents).
20. `counters` - Sequencing indexes (4 documents).
21. `usersessions` / `holidays` / `performance_pips` / `work_reports` / `teams` / `appraisal_reviews` / `user_overrides` / `userdevices` / `workflows` / `payrollpayments` / `events` / `payrollloanadvances` / `tasks` / `payrollgrades` / `leaves` / `performance_goals` / `payrollreimbursements` / `documents` / `payrollbonus` / `notifications` - Operational schemas containing 0 documents (empty templates awaiting usage).

### 🏷️ Dedicated Tenant Databases
* **Do tenant databases exist?**
  **No**. Currently, no `tenant_<id>` databases exist on the cluster. The single tenant `COMP-001` (Gatecode Technologies) is housed on the shared `office-management` database.
