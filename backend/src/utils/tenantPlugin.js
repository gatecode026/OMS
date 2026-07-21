import mongoose from 'mongoose';
import { getTenantId, getActiveConnection, isSuperAdminRequest } from './tenantContext.js';

// List of tenant-scoped models that require database-level isolation
const tenantScopedModelNames = new Set([
  'Employee', 'Branch', 'Department', 'Team', 'Project', 
  'Attendance', 'AttendanceCorrection', 'Leave', 'Holiday', 'PayrollGrade', 
  'PayrollReimbursement', 'PayrollLoanAdvance', 'PayrollBonus', 
  'PayrollPayment', 'PayrollConfig', 'AppraisalReview', 
  'WorkReport', 'ActivityLog', 'Event', 'Announcement', 
  'EmergencyAlert', 'AnnouncementTrackingLog', 'AnnouncementAuditLog', 
  'Notification', 'Document', 'Role', 'PermissionModule', 
  'UserOverride', 'Goal', 'Pip', 'IpWhitelist', 'IpBlocklist', 
  'UserDevice', 'UserSession', 'SecurityAlert', 'Task', 'Workflow', 
  'SystemSettings', 'PayrollQuery',
  'KpiTemplate', 'KpiEvaluationCycle', 'KpiEmployeeEvaluation',
  // Chat module — tenant-scoped per company database
  'Conversation', 'Message', 'Call', 'PushSubscription', 'Thread', 'Poll'
]);

// Keep original mongoose.model compilation reference
const originalModel = mongoose.model;

/**
 * Global interceptor for mongoose.model to wrap all tenant-scoped models in JS Proxies.
 * This transparently routes all database operations (e.g. Employee.find, new Employee)
 * to the Mongoose Connection Pool corresponding to the active tenant's context.
 */
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
