/**
 * @file src/modules/admin/admin.controller.js
 * @description Controller implementation for Super Admin platform-wide operations.
 */

import mongoose from 'mongoose';
import Company from '../companies/company.model.js';
import Employee from '../employees/employees.model.js';
import Project from '../projects/projects.model.js';
import ActivityLog from '../activity-logs/activity-log.model.js';
import Attendance from '../attendance/attendance.model.js';
import Leave from '../leaves/leaves.model.js';
import companyService from '../companies/company.service.js';
import { getTenantConnection } from '../../utils/multidbConnection.js';
import { successResponse } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

/**
 * Helper to aggregate metrics for a company on a specific database connection.
 * If isCustomDb is true, filters by companyId are bypassed since the database is dedicated.
 * @param {mongoose.Connection} connection - The database connection pool to aggregate on.
 * @param {string} companyId - Tenant company identifier.
 * @param {boolean} isCustomDb - True if using a private database server.
 * @returns {Promise<Object>} The aggregated metrics
 */
const getCompanyStats = async (connection, companyId, isCustomDb) => {
  // Compile models dynamically on the connection using the schema from the default models
  const EmployeeModel = connection.models['Employee'] || connection.model('Employee', Employee.schema);
  const ProjectModel = connection.models['Project'] || connection.model('Project', Project.schema);
  const ActivityLogModel = connection.models['ActivityLog'] || connection.model('ActivityLog', ActivityLog.schema);

  // 1. Employee counts (total & active)
  const empMatch = isCustomDb ? {} : { companyId };
  const employeeStats = await EmployeeModel.aggregate([
    ...(isCustomDb ? [] : [{ $match: empMatch }]),
    {
      $group: {
        _id: isCustomDb ? null : '$companyId',
        totalEmployees: { $sum: 1 },
        activeEmployeesCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
        }
      }
    }
  ]);

  // 2. Task counts (embedded within Projects array)
  const taskStats = await ProjectModel.aggregate([
    ...(isCustomDb ? [] : [{ $match: { companyId } }]),
    { $unwind: { path: '$tasks', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: isCustomDb ? null : '$companyId',
        totalTasks: { $sum: 1 },
        completedTasksCount: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$tasks.completed', true] },
                  { $eq: ['$tasks.status', 'Completed'] }
                ]
              },
              1,
              0
            ]
          }
        },
        pendingTasksCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$tasks.completed', true] },
                  { $ne: ['$tasks.status', 'Completed'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // 3. Unique logins in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const loginStats = await EmployeeModel.aggregate([
    {
      $match: {
        ...(isCustomDb ? {} : { companyId }),
        lastLoginAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: isCustomDb ? null : '$companyId',
        last7DaysLoginCount: { $sum: 1 }
      }
    }
  ]);

  // 4. Last activity timestamp
  const activityStats = await ActivityLogModel.aggregate([
    ...(isCustomDb ? [] : [{ $match: { companyId } }]),
    {
      $group: {
        _id: isCustomDb ? null : '$companyId',
        lastActivityTimestamp: { $max: '$createdAt' }
      }
    }
  ]);

  const emp = employeeStats[0] || { totalEmployees: 0, activeEmployeesCount: 0 };
  const task = taskStats[0] || { totalTasks: 0, completedTasksCount: 0, pendingTasksCount: 0 };
  const login = loginStats[0] || { last7DaysLoginCount: 0 };
  const act = activityStats[0] || { lastActivityTimestamp: null };

  return {
    totalEmployees: emp.totalEmployees,
    activeEmployeesCount: emp.activeEmployeesCount,
    totalTasks: task.totalTasks,
    completedTasksCount: task.completedTasksCount,
    pendingTasksCount: task.pendingTasksCount,
    last7DaysLoginCount: login.last7DaysLoginCount,
    lastActivityTimestamp: act.lastActivityTimestamp,
    storageUsedMB: 12.5 // Mock/Default storage used for SaaS simulation
  };
};

/**
 * GET /api/admin/companies
 * Paginated search of all tenants
 */
export const getCompanies = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const filter = {};
  if (search) {
    filter.name = new RegExp(search.trim(), 'i');
  }

  const parsedPage = Math.max(1, parseInt(page));
  const parsedLimit = Math.max(1, parseInt(limit));
  const skip = (parsedPage - 1) * parsedLimit;

  const total = await Company.countDocuments(filter);
  const companies = await Company.find(filter)
    .skip(skip)
    .limit(parsedLimit)
    .lean();

  return successResponse(res, {
    companies,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(total / parsedLimit)
    }
  }, 'Companies fetched successfully');
});

/**
 * GET /api/admin/companies/:id
 * Single tenant usage details with absolutely no business data.
 */
export const getCompanyUsage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const company = await Company.findOne({ id }).lean();
  if (!company) {
    return res.status(404).json({ status: 'fail', message: 'Company not found' });
  }

  // Resolve connection to query details from tenant's database
  const connection = await getTenantConnection(id);
  const isCustomDb = company.databaseType === 'dedicated' || !!company.settings?.dbUri;

  const EmployeeModel = connection.models['Employee'] || connection.model('Employee', Employee.schema);
  const ProjectModel = connection.models['Project'] || connection.model('Project', Project.schema);
  const AttendanceModel = connection.models['Attendance'] || connection.model('Attendance', Attendance.schema);
  const LeaveModel = connection.models['Leave'] || connection.model('Leave', Leave.schema);

  const empFilter = isCustomDb ? {} : { companyId: id };
  const projectFilter = isCustomDb ? {} : { companyId: id };
  const attFilter = isCustomDb ? {} : { companyId: id };
  const leaveFilter = isCustomDb ? {} : { companyId: id };

  const totalEmployees = await EmployeeModel.countDocuments(empFilter);
  const totalProjects = await ProjectModel.countDocuments(projectFilter);
  
  // Tasks are embedded in projects array
  const taskStats = await ProjectModel.aggregate([
    ...(isCustomDb ? [] : [{ $match: projectFilter }]),
    { $unwind: '$tasks' },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]);
  const totalTasks = taskStats.length > 0 ? taskStats[0].count : 0;

  const totalAttendance = await AttendanceModel.countDocuments(attFilter);
  const totalLeaves = await LeaveModel.countDocuments(leaveFilter);

  return successResponse(res, {
    company: {
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      status: company.status,
      plan: company.plan,
      trialEndsAt: company.trialEndsAt,
      subscriptionExpiresAt: company.subscriptionExpiresAt
    },
    usage: {
      totalEmployees,
      totalProjects,
      totalTasks,
      totalAttendance,
      totalLeaves
    }
  }, 'Company usage details fetched successfully');
});

/**
 * POST /api/admin/companies
 * Creates a new tenant (calls company.service.js)
 */
export const createTenant = asyncHandler(async (req, res) => {
  const data = await companyService.createCompany(req.body);
  return successResponse(res, data, 'Company registered successfully with default admin user', 201);
});

/**
 * PATCH /api/admin/companies/:id/status
 * Suspends or activates a tenant
 */
export const updateTenantStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const data = await companyService.setStatus(req.params.id, status);
  return successResponse(res, data, `Company status updated to ${status} successfully`);
});

/**
 * PATCH /api/admin/companies/:id
 * Updates tenant plan or setting configuration
 */
export const updateTenant = asyncHandler(async (req, res) => {
  const data = await companyService.updateCompany(req.params.id, req.body);
  return successResponse(res, data, 'Company profile updated successfully');
});

/**
 * GET /api/admin/overview
 * Platform-wide cross-tenant overview aggregate statistics computed via Mongo aggregation pipelines
 */
export const getOverview = asyncHandler(async (req, res) => {
  // 1. Fetch all companies from platform database
  const companies = await Company.find({}).lean();

  // 2. Fetch stats in parallel using Promise.all()
  const statsPromises = companies.map(async (company) => {
    const isCustomDb = company.databaseType === 'dedicated' || !!company.settings?.dbUri;
    
    console.log(`\n[DEBUG getOverview] Loop iteration started for Company ID: "${company.id}" | Name: "${company.name}"`);
    console.log(`[DEBUG getOverview] settings.dbUri: "${company.settings?.dbUri || '(empty)'}"`);

    const companyInfo = {
      companyId: company.id,
      name: company.name,
      plan: company.plan,
      status: company.status,
      trialEndsAt: company.trialEndsAt,
      subscriptionExpiresAt: company.subscriptionExpiresAt,
      isCustomDb
    };

    try {
      // Resolve dynamic/shared connection pool
      const connection = await getTenantConnection(company.id);
      const dbName = connection.name || connection.db?.databaseName || 'unknown';
      console.log(`[DEBUG getOverview] Resolved connection database name: "${dbName}"`);

      // Compile model dynamically and log countDocuments call
      const EmployeeModel = connection.models['Employee'] || connection.model('Employee', Employee.schema);
      const empMatch = isCustomDb ? {} : { companyId: company.id };
      
      console.log(`[DEBUG getOverview] Calling Employee.countDocuments() with filter:`, empMatch);
      const empCount = await EmployeeModel.countDocuments(empMatch);
      console.log(`[DEBUG getOverview] Employee.countDocuments() result count: ${empCount}`);

      // Aggregate stats
      const stats = await getCompanyStats(connection, company.id, isCustomDb);
      
      return {
        ...companyInfo,
        ...stats,
        error: null
      };
    } catch (err) {
      console.error(`[DEBUG getOverview] Error processing stats for Company ID "${company.id}":`, err.message);
      console.error(err.stack);
      
      // If connection or aggregation fails, fallback gracefully to unreachable metrics
      return {
        ...companyInfo,
        error: 'unreachable',
        totalEmployees: null,
        activeEmployeesCount: null,
        totalTasks: null,
        completedTasksCount: null,
        pendingTasksCount: null,
        last7DaysLoginCount: null,
        lastActivityTimestamp: null,
        storageUsedMB: null
      };
    }
  });

  const data = await Promise.all(statsPromises);

  return successResponse(res, data, 'Platform-wide tenant overview fetched successfully');
});

export default {
  getCompanies,
  getCompanyUsage,
  createTenant,
  updateTenantStatus,
  updateTenant,
  getOverview
};
