import { resolveSecurityContext } from './scopeEngine.js';
import { checkActionPermission, getRestrictedFields } from './permissionMatrix.js';
import { logSecurityEvent } from './auditLogger.js';
import { SecurityEventTypes } from './securityConstants.js';
import logger from '../config/logger.js';

// Configuration for query logging
let ENABLE_QUERY_LOGGING = true;

export const setQueryLogging = (enabled) => {
  ENABLE_QUERY_LOGGING = enabled;
};

export const getQueryLogging = () => {
  return ENABLE_QUERY_LOGGING;
};

/**
 * Reusable Query Sanitizer protecting against unauthorized MongoDB operators.
 * Throws a 400 Bad Request error if dangerous operator matches are detected.
 * @param {Object} query - Client-supplied query filters
 */
export const sanitizeQueryOperators = (query) => {
  if (!query || typeof query !== 'object') return query;

  const forbiddenOperators = ['$where', '$expr', '$function', '$accumulator'];

  for (const key of Object.keys(query)) {
    if (forbiddenOperators.includes(key)) {
      const context = resolveSecurityContext();
      logSecurityEvent(context, 'QuerySanitizer', 'sanitize', SecurityEventTypes.QUERY_SANITIZED, 'BLOCKED', `Forbidden MongoDB operator "${key}" detected`);
      const err = new Error(`Security Exception: Forbidden MongoDB operator "${key}" detected.`);
      err.statusCode = 400;
      throw err;
    }
    if (query[key] && typeof query[key] === 'object') {
      sanitizeQueryOperators(query[key]);
    }
  }
  return query;
};

/**
 * Prevents aggregation pipelines from bypassing scoping rules by prepending/merging match filters.
 * @param {Array} pipeline - MongoDB aggregation pipeline stages
 * @param {Object} context - Security Context
 * @param {Object} queryBuilder - Scoped query builder instance
 */
export const secureAggregationPipeline = async (pipeline, context, queryBuilder) => {
  const scopeFilters = await queryBuilder.buildReadQuery({});
  
  if (!pipeline || !Array.isArray(pipeline)) {
    return [{ $match: scopeFilters }];
  }

  // If the first stage is already a $match stage, merge scope filters.
  // Otherwise, prepend a new $match stage.
  if (pipeline.length > 0 && pipeline[0].$match) {
    pipeline[0].$match = { ...pipeline[0].$match, ...scopeFilters };
  } else {
    pipeline.unshift({ $match: scopeFilters });
  }

  logSecurityEvent(context, 'AggregationEngine', 'aggregate', SecurityEventTypes.AUTHORIZATION_ALLOWED, 'ALLOWED', 'Secured aggregation pipeline successfully applied');

  return pipeline;
};

/**
 * Validates that the resource belongs to the allowed branch boundary.
 */
export const validateBranchScope = (context, resource, branchField = 'branch', moduleName = 'unknown', operation = 'read') => {
  if (context.isSuperAdmin || context.isCompanyAdmin) return true;
  
  const userBranch = context.branch;
  const resourceBranch = resource[branchField];
  
  if (userBranch && resourceBranch && resourceBranch !== userBranch) {
    logSecurityEvent(context, moduleName, operation, SecurityEventTypes.CROSS_BRANCH_ACCESS, 'DENIED', `Access Denied: target branch "${resourceBranch}" matches outside scoped branch "${userBranch}"`, resource.id);
    const err = new Error(`Access denied: Resource is in branch "${resourceBranch}", which is outside your scoped branch "${userBranch}".`);
    err.statusCode = 403;
    throw err;
  }
  return true;
};

/**
 * Validates that the resource belongs to the allowed department boundary.
 */
export const validateDepartmentScope = (context, resource, deptField = 'department', moduleName = 'unknown', operation = 'read') => {
  if (context.isSuperAdmin || context.isCompanyAdmin) return true;
  
  const userDept = context.department;
  const resourceDept = resource[deptField];
  
  if (userDept && resourceDept && resourceDept !== userDept) {
    logSecurityEvent(context, moduleName, operation, SecurityEventTypes.CROSS_DEPARTMENT_ACCESS, 'DENIED', `Access Denied: target department "${resourceDept}" matches outside scoped department "${userDept}"`, resource.id);
    const err = new Error(`Access denied: Resource is in department "${resourceDept}", which is outside your scoped department "${userDept}".`);
    err.statusCode = 403;
    throw err;
  }
  return true;
};

/**
 * Validates ownership of the resource.
 */
export const validateOwnership = (context, resource, ownerIdFields = ['id', 'userId', 'employeeId'], moduleName = 'unknown', operation = 'read') => {
  if (context.isSuperAdmin || context.isCompanyAdmin) return true;
  if (['Chat', 'Conversation', 'Message', 'Call'].includes(moduleName) && operation === 'read') return true;
  if (moduleName === 'Projects') return true;
  if (moduleName === 'Tasks' && resource && (resource.tasks !== undefined || (resource.constructor && resource.constructor.modelName === 'Project'))) return true;

  // Allow Team Leaders to manage tasks assigned to their team members
  if (context.isTeamLeader && moduleName === 'Tasks' && context.teamEmployeeIds && context.teamEmployeeIds.includes(resource.assigneeId)) {
    return true;
  }

  // For employee and team_leader roles, enforce strict ownership matching
  if (context.isEmployee || context.isTeamLeader) {
    let hasMatch = false;
    for (const field of ownerIdFields) {
      if (resource[field] === context.userId) {
        hasMatch = true;
        break;
      }
    }
    if (!hasMatch) {
      logSecurityEvent(context, moduleName, operation, SecurityEventTypes.OWNERSHIP_DENIED, 'DENIED', 'Access Denied: Ownership verification failed', resource.id);
      const err = new Error(`Access denied: You are not authorized to update or delete another employee's record. [Debug: moduleName="${moduleName}", operation="${operation}", resourceId="${resource?.id}", role="${context?.role}"]`);
      err.statusCode = 403;
      throw err;
    }
  }
  return true;
};

/**
 * Reusable repository validation rules orchestrator.
 */
export const validateRepositoryAccess = async (operation, resource, options = {}) => {
  const context = resolveSecurityContext();
  if (!context) {
    const err = new Error('Access denied: Security context is missing.');
    err.statusCode = 401;
    throw err;
  }

  let moduleName = options.moduleName || (resource && resource.constructor && resource.constructor.modelName) || 'unknown';

  const {
    branchField = 'branch',
    deptField = 'department',
    ownerIdFields = ['id', 'userId', 'employeeId'],
    updatePayload = null
  } = options;

  // Delegate project task updates to 'Tasks' module check if appropriate
  // tasksTotal is included because addTask sends { tasks, tasksTotal, progress } when creating a task
  if (moduleName === 'Projects' && operation === 'update' && updatePayload) {
    const isTaskOnlyUpdate = Object.keys(updatePayload).every(key =>
      ['tasks', 'tasksDone', 'tasksTotal', 'progress', 'status'].includes(key)
    );
    if (isTaskOnlyUpdate) {
      // Determine whether this is a task creation or task update:
      // If the payload contains 'tasks' and 'tasksTotal', it's likely a task being added (create)
      const isTaskCreate = updatePayload.tasksTotal !== undefined && updatePayload.tasks !== undefined;
      const taskAction = isTaskCreate ? 'create' : 'update';
      const hasTaskPerm = await checkActionPermission('Tasks', context.role, taskAction);
      if (hasTaskPerm) {
        moduleName = 'Tasks';
      } else {
        // Fallback: check update permission as well
        const hasTaskUpdatePerm = await checkActionPermission('Tasks', context.role, 'update');
        if (hasTaskUpdatePerm) {
          moduleName = 'Tasks';
        }
      }
    }
  }

  // 1. Verify Action Level Permission Matrix
  const isAllowed = await checkActionPermission(moduleName, context.role, operation);
  if (!isAllowed) {
    logSecurityEvent(context, moduleName, operation, SecurityEventTypes.AUTHORIZATION_DENIED, 'DENIED', `Action "${operation}" not allowed for role ${context.role}`, resource.id);
    const err = new Error(`Access denied: Role ${context.role} is not authorized to perform ${operation} on ${moduleName}.`);
    err.statusCode = 403;
    throw err;
  }

  // 2. Validate Field Level Constraints on Updates
  if (operation === 'update' && updatePayload) {
    try {
      const fs = await import('fs');
      const logMsg = `[${new Date().toISOString()}] moduleName: ${moduleName}, role: ${context.role}, updatePayload: ${JSON.stringify(updatePayload)}\n`;
      fs.appendFileSync('security_debug.log', logMsg);
      const restrictedFields = getRestrictedFields(moduleName, context.role);
      fs.appendFileSync('security_debug.log', `[${new Date().toISOString()}] restrictedFields: ${JSON.stringify(restrictedFields)}\n`);
    } catch (e) {
      console.error('Failed to write security debug log:', e);
    }
    const restrictedFields = getRestrictedFields(moduleName, context.role);
    for (const field of restrictedFields) {
      if (updatePayload[field] !== undefined && String(updatePayload[field] ?? '') !== String(resource[field] ?? '')) {
        if (moduleName === 'Attendance' && field === 'status' && updatePayload.punchOut !== undefined) {
          continue;
        }
        if (moduleName === 'Leave' && field === 'status' && updatePayload[field] === 'Cancelled') {
          continue;
        }
        logSecurityEvent(context, moduleName, operation, SecurityEventTypes.FIELD_ACCESS_DENIED, 'DENIED', `Modification of protected field "${field}" blocked`, resource.id);
        const err = new Error(`Access denied: You are not authorized to modify the "${field}" field.`);
        err.statusCode = 403;
        throw err;
      }
    }
  }

  // 3. Ownership validation (only on writes/modifications by default)
  if (operation === 'update' || operation === 'delete') {
    validateOwnership(context, resource, ownerIdFields, moduleName, operation);
  }

  // 4. Branch boundary validation
  validateBranchScope(context, resource, branchField, moduleName, operation);

  // 5. Department boundary validation
  validateDepartmentScope(context, resource, deptField, moduleName, operation);

  // Log successful validation in debug mode
  if (getQueryLogging()) {
    logSecurityEvent(context, moduleName, operation, SecurityEventTypes.AUTHORIZATION_ALLOWED, 'ALLOWED', `Successfully authorized ${operation} access`, resource.id);
  }

  return true;
};

export default {
  resolveSecurityContext,
  validateRepositoryAccess,
  validateBranchScope,
  validateDepartmentScope,
  validateOwnership,
  sanitizeQueryOperators,
  secureAggregationPipeline,
  setQueryLogging,
  getQueryLogging
};
