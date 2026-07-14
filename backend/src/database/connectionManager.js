/**
 * @file src/database/connectionManager.js
 * @description Dynamic Tenant Database Connection Manager, Cache, and Provisioner.
 */

import mongoose from 'mongoose';
import Company from '../modules/companies/company.model.js';
import logger from '../config/logger.js';
import env from '../config/env.js';

// Cache database URI for each companyId
export const dbUriCache = {};
// Cache active connection objects { connection, lastUsedAt, isCustom }
export const connectionCache = new Map();

/**
 * Cleanly generates a database name from a company name.
 * Example: "Acme Corp" -> "office_acme_corp"
 */
export const generateDbName = (companyName) => {
  const sanitized = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscores
    .replace(/^_+|_+$/g, '');   // Trim leading/trailing underscores
  return `office_${sanitized}`;
};

/**
 * Injects a database name into a MongoDB URI, replacing the default database name path.
 */
export const injectDbNameIntoUri = (uri, dbName) => {
  const questionMarkIndex = uri.indexOf('?');
  const baseUri = questionMarkIndex !== -1 ? uri.substring(0, questionMarkIndex) : uri;
  const queryParams = questionMarkIndex !== -1 ? uri.substring(questionMarkIndex) : '';

  const protocolEndIndex = baseUri.indexOf('://');
  if (protocolEndIndex === -1) {
    throw new Error('Invalid MongoDB connection string format');
  }
  
  const hostPartIndex = protocolEndIndex + 3;
  const lastSlashIndex = baseUri.lastIndexOf('/');

  let newUri;
  if (lastSlashIndex < hostPartIndex) {
    newUri = `${baseUri}/${dbName}${queryParams}`;
  } else {
    newUri = `${baseUri.substring(0, lastSlashIndex)}/${dbName}${queryParams}`;
  }
  return newUri;
};

/**
 * Dynamically imports all model modules to guarantee they are registered in Mongoose.
 */
export const ensureAllModelsRegistered = async () => {
  const essential = ['Employee', 'Role', 'PermissionModule', 'SystemSettings'];
  const allRegistered = essential.every(m => !!mongoose.models[m]);
  if (allRegistered) return;

  const modelImports = [
    import('../modules/employees/employees.model.js'),
    import('../modules/departments/departments.model.js'),
    import('../modules/branches/branches.model.js'),
    import('../modules/projects/projects.model.js'),
    import('../modules/leaves/leaves.model.js'),
    import('../modules/payroll/payroll.model.js'),
    import('../modules/teams/teams.model.js'),
    import('../modules/tasks/tasks.model.js'),
    import('../modules/notifications/notification.model.js'),
    import('../modules/workflows/workflows.model.js'),
    import('../modules/documents/document.model.js'),
    import('../modules/holidays/holidays.model.js'),
    import('../modules/roles/permission-modules.model.js'),
    import('../modules/roles/roles.model.js'),
    import('../modules/roles/overrides.model.js'),
    import('../modules/settings/settings.model.js'),
    import('../modules/attendance/attendance.model.js'),
    import('../modules/activity-logs/activity-log.model.js'),
    import('../modules/announcements/announcement.model.js'),
    import('../modules/appraisal-reviews/appraisal-reviews.model.js'),
    import('../modules/events/event.model.js'),
    import('../modules/performance/goal.model.js'),
    import('../modules/performance/pip.model.js'),
    import('../modules/security/security.model.js'),
    import('../modules/work-reports/work-reports.model.js'),
    import('../modules/payroll-queries/payroll-query.model.js'),
  ];

  await Promise.all(modelImports.map(p => p.catch(err => logger.error('Error registering model:', err))));
};

/**
 * Validates that a connection string is reachable, authenticates, and possesses write permissions.
 */
export const testConnection = async (uri) => {
  logger.info(`Validating connectivity for URI: ${uri.replace(/:([^:@]+)@/, ':****@')}`);
  const conn = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 5000
  });

  try {
    await conn.asPromise();
    // Test write permission
    const TestModel = conn.model('TenantTest', new mongoose.Schema({ name: String }, { collection: 'tenant_test' }));
    await TestModel.createCollection();
    const doc = await TestModel.create({ name: 'connection_test' });
    await TestModel.deleteOne({ _id: doc._id });
    await conn.db.dropCollection('tenant_test');
    logger.info('Connection validation succeeded.');
  } catch (err) {
    logger.error('Connection validation failed:', err);
    throw new Error(`Database connection validation failed: ${err.message}`);
  } finally {
    await conn.close();
  }
};

/**
 * Dynamically resolves and establishes a pooled connection for a company.
 */
export const getTenantConnection = async (tenantId) => {
  if (!tenantId || tenantId === 'COMP-DEFAULT') {
    return mongoose.connection;
  }

  // 1. Check cache
  if (connectionCache.has(tenantId)) {
    const cached = connectionCache.get(tenantId);
    cached.lastUsedAt = Date.now();
    return cached.connection;
  }

  // 2. Fetch company connection config
  let connectionConfig = dbUriCache[tenantId];
  if (connectionConfig === undefined) {
    try {
      const company = await Company.findOne({ id: tenantId });
      if (company && company.databaseType === 'dedicated' && company.databaseName) {
        connectionConfig = {
          databaseType: 'dedicated',
          databaseClusterKey: company.databaseClusterKey || 'cluster_1',
          databaseName: company.databaseName
        };
      } else if (company && company.settings?.dbUri && (company.settings.dbUri.startsWith('mongodb://') || company.settings.dbUri.startsWith('mongodb+srv://'))) {
        connectionConfig = {
          databaseType: 'dedicated_legacy',
          dbUri: company.settings.dbUri
        };
      } else {
        connectionConfig = { databaseType: 'shared' };
      }
      dbUriCache[tenantId] = connectionConfig;
    } catch (err) {
      logger.error(`Error resolving database configuration for tenant ${tenantId}:`, err);
      connectionConfig = { databaseType: 'shared' };
    }
  }

  // 3. Shared database connection fallback
  if (connectionConfig.databaseType !== 'dedicated' && connectionConfig.databaseType !== 'dedicated_legacy') {
    connectionCache.set(tenantId, {
      connection: mongoose.connection,
      lastUsedAt: Date.now(),
      isCustom: false
    });
    return mongoose.connection;
  }

  // 4. Resolve final URI
  let finalDbUri;
  if (connectionConfig.databaseType === 'dedicated_legacy') {
    finalDbUri = connectionConfig.dbUri;
  } else {
    const clusterKey = connectionConfig.databaseClusterKey.toUpperCase();
    const envUri = process.env[`${clusterKey}_URI`] || process.env.CLUSTER_1_URI;
    if (!envUri) {
      logger.error(`No connection URI defined in environment variables for cluster key ${clusterKey}_URI. Falling back to shared database.`);
      connectionCache.set(tenantId, {
        connection: mongoose.connection,
        lastUsedAt: Date.now(),
        isCustom: false
      });
      return mongoose.connection;
    }
    finalDbUri = injectDbNameIntoUri(envUri, connectionConfig.databaseName);
  }

  // 5. Eviction (LRU cache) if cache limit reached
  let customConnectionCount = 0;
  for (const entry of connectionCache.values()) {
    if (entry.isCustom) customConnectionCount++;
  }

  if (customConnectionCount >= (env.multidbMaxTotalConnections || 10)) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of connectionCache.entries()) {
      if (entry.isCustom && entry.lastUsedAt < oldestTime) {
        oldestTime = entry.lastUsedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const oldestEntry = connectionCache.get(oldestKey);
      logger.info(`Evicting oldest connection in LRU cache for tenant ${oldestKey}`);
      try {
        await oldestEntry.connection.close();
      } catch (err) {
        logger.error(`Error closing connection for tenant ${oldestKey} during LRU eviction:`, err);
      }
      connectionCache.delete(oldestKey);
    }
  }

  // 6. Connect and cache connection pool
  try {
    logger.info(`Establishing dedicated database connection pool for tenant ${tenantId} [${connectionConfig.databaseName}]`);
    const connection = mongoose.createConnection(finalDbUri, {
      autoIndex: true,
      maxPoolSize: env.multidbMaxPoolSize || 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    connection.on('error', (err) => {
      logger.error(`Database connection error for tenant ${tenantId}: ${err}`);
    });

    connection.on('disconnected', () => {
      logger.warn(`Database connection lost for tenant ${tenantId}.`);
    });

    connectionCache.set(tenantId, {
      connection,
      lastUsedAt: Date.now(),
      isCustom: true
    });
    return connection;
  } catch (err) {
    logger.error(`Failed to connect to dedicated database for tenant ${tenantId}:`, err);
    connectionCache.set(tenantId, {
      connection: mongoose.connection,
      lastUsedAt: Date.now(),
      isCustom: false
    });
    return mongoose.connection;
  }
};

/**
 * Returns a cached connection for the tenant synchronously.
 */
export const getCachedConnection = (tenantId) => {
  if (!tenantId || tenantId === 'COMP-DEFAULT') {
    return mongoose.connection;
  }
  const cached = connectionCache.get(tenantId);
  return cached ? cached.connection : mongoose.connection;
};

/**
 * Gracefully closes all custom connections.
 */
export const closeAllConnections = async () => {
  logger.info('Closing all custom tenant database connections...');
  const promises = [];
  for (const [tenantId, entry] of connectionCache.entries()) {
    if (entry.isCustom && entry.connection) {
      promises.push(
        entry.connection.close()
          .then(() => logger.info(`Closed connection for tenant ${tenantId}`))
          .catch((err) => logger.error(`Error closing connection for tenant ${tenantId}:`, err))
      );
    }
  }
  await Promise.all(promises);
  connectionCache.clear();
};

/**
 * Provisions a dedicated tenant database: initializes essential collections/indexes and seeds default roles/permissions.
 */
export const provisionTenantDatabase = async (company, clusterKey, dbName, adminData) => {
  const existing = await Company.findOne({ databaseName: dbName });
  if (existing) {
    const err = new Error(`Database name "${dbName}" is already allocated to another company.`);
    err.statusCode = 400;
    throw err;
  }

  const envUri = process.env[`${clusterKey.toUpperCase()}_URI`] || process.env.CLUSTER_1_URI;
  if (!envUri) {
    throw new Error(`Cluster connection URI not defined in env for cluster: ${clusterKey}_URI`);
  }

  const finalDbUri = injectDbNameIntoUri(envUri, dbName);

  // 1. Verify reachability & write access
  await testConnection(finalDbUri);

  // 2. Open provisioning connection
  const connection = mongoose.createConnection(finalDbUri, {
    autoIndex: true
  });

  try {
    await connection.asPromise();
    logger.info(`Provisioning collections & default records in dedicated DB: ${dbName}`);

    await ensureAllModelsRegistered();

    // Required essential collections to initialize during provisioning
    const essentialModels = [
      'Employee',
      'Role',
      'PermissionModule',
      'SystemSettings'
    ];

    // Compile and register schemas, then build collections and indexes
    for (const modelName of essentialModels) {
      const mainModel = mongoose.model(modelName);
      if (mainModel) {
        const tenantModel = connection.model(modelName, mainModel.schema);
        await tenantModel.createCollection();
        await tenantModel.ensureIndexes();
      }
    }

    // Compile other models on the connection to support automatic collection creation later
    const tenantScopedModelNames = [
      'Branch', 'Department', 'Team', 'Project', 'Attendance', 'Leave', 
      'Holiday', 'PayrollGrade', 'PayrollReimbursement', 'PayrollLoanAdvance', 
      'PayrollBonus', 'PayrollPayment', 'PayrollConfig', 'AppraisalReview', 
      'WorkReport', 'ActivityLog', 'Event', 'Announcement', 'EmergencyAlert', 
      'AnnouncementTrackingLog', 'AnnouncementAuditLog', 'Notification', 
      'Document', 'UserOverride', 'Goal', 'Pip', 'IpWhitelist', 'IpBlocklist', 
      'UserDevice', 'UserSession', 'SecurityAlert', 'Task', 'Workflow', 'PayrollQuery'
    ];

    for (const modelName of tenantScopedModelNames) {
      const mainModel = mongoose.model(modelName);
      if (mainModel) {
        connection.model(modelName, mainModel.schema);
      }
    }

    // 3. Seed Default Permission Modules
    const TenantPermissionModule = connection.model('PermissionModule');
    const modulesToSeed = [
      { key: 'employees', label: 'Employees Management' },
      { key: 'attendance', label: 'Attendance Tracking' },
      { key: 'leaves', label: 'Leaves Management' },
      { key: 'payroll', label: 'Payroll Management' },
      { key: 'departments', label: 'Departments Management' },
      { key: 'branches', label: 'Branches Management' },
      { key: 'projects', label: 'Projects Management' },
      { key: 'tasks', label: 'Tasks Management' },
      { key: 'teams', label: 'Teams Management' },
      { key: 'settings', label: 'System Settings' },
      { key: 'notifications', label: 'Notifications Management' },
      { key: 'documents', label: 'Documents Management' }
    ];

    await TenantPermissionModule.insertMany(
      modulesToSeed.map(m => ({ ...m, companyId: company.id }))
    );

    // 4. Seed Default Roles
    const TenantRole = connection.model('Role');
    
    // Helper to generate full permission object
    const getPerms = (create, read, update, del, approve, exp) => ({
      create, read, update, delete: del, approve, export: exp
    });

    const rolesToSeed = [
      {
        id: 'company_admin',
        name: 'Company Admin',
        description: 'Administrator with full scoped privileges',
        accentColor: '#ef4444',
        companyId: company.id,
        permissions: new Map(modulesToSeed.map(m => [m.key, getPerms(true, true, true, true, true, true)]))
      },
      {
        id: 'hr',
        name: 'HR Manager',
        description: 'Human Resources manager scoped permissions',
        accentColor: '#3b82f6',
        companyId: company.id,
        permissions: new Map(modulesToSeed.map(m => {
          const isHRScoped = ['employees', 'attendance', 'leaves', 'payroll'].includes(m.key);
          return [m.key, getPerms(isHRScoped, true, isHRScoped, isHRScoped, isHRScoped, isHRScoped)];
        }))
      },
      {
        id: 'manager',
        name: 'Team Manager',
        description: 'Team leader and project manager permissions',
        accentColor: '#10b981',
        companyId: company.id,
        permissions: new Map(modulesToSeed.map(m => {
          const isManagerScoped = ['attendance', 'leaves', 'tasks', 'projects', 'teams'].includes(m.key);
          return [m.key, getPerms(isManagerScoped, true, isManagerScoped, false, isManagerScoped, isManagerScoped)];
        }))
      },
      {
        id: 'employee',
        name: 'Employee',
        description: 'Standard employee scoped access',
        accentColor: '#64748b',
        companyId: company.id,
        permissions: new Map(modulesToSeed.map(m => [m.key, getPerms(false, m.key !== 'settings', false, false, false, false)]))
      }
    ];

    await TenantRole.insertMany(rolesToSeed);

    // 5. Create default company admin user in employees
    const TenantEmployee = connection.model('Employee');
    
    // Dynamically retrieve the company's code or resolve subdomain uppercase
    const resolvedCompanyCode = company.companyCode || company.subdomain.toUpperCase();
    const finalEmployeeCode = `${resolvedCompanyCode}-EMP-001`;

    await TenantEmployee.create({
      id: 'EMP-001',
      employeeCode: finalEmployeeCode,
      companyId: company.id,
      name: adminData.adminName || 'Company Admin',
      email: adminData.adminEmail.toLowerCase().trim(),
      phone: adminData.adminPhone || '0000000000',
      role: 'Company Admin',
      roleId: 'company_admin',
      password: adminData.adminPassword || 'password123',
      status: 'Active',
      accountStatus: 'Active'
    });

    // 6. Create default settings
    const TenantSettings = connection.model('SystemSettings');
    await TenantSettings.create({
      key: 'global',
      companyId: company.id,
      companyProfile: {
        companyName: company.name,
        officialEmail: adminData.adminEmail || `admin@${company.subdomain}.com`,
        officialPhone: adminData.adminPhone || '',
        address: adminData.address || '',
        logoUrl: adminData.logoUrl || ''
      },
      generalSettings: {
        companyName: company.name,
        timezone: adminData.timezone || 'Asia/Kolkata',
        language: 'English (IN)',
        dateFormat: 'DD-MM-YYYY',
        currency: 'INR (₹)',
        fiscalYear: 'January'
      }
    });

    logger.info(`Dedicated database provisioning successfully completed for database: ${dbName}`);
    return {
      databaseType: 'dedicated',
      databaseName: dbName,
      databaseClusterKey: clusterKey,
      mongoUri: finalDbUri
    };

  } catch (err) {
    logger.error(`Error during provisioning for dedicated DB ${dbName}:`, err);
    throw err;
  } finally {
    await connection.close();
  }
};

export default {
  getTenantConnection,
  getCachedConnection,
  closeAllConnections,
  provisionTenantDatabase,
  generateDbName,
  injectDbNameIntoUri,
  testConnection,
  ensureAllModelsRegistered,
  dbUriCache,
  connectionCache
};
