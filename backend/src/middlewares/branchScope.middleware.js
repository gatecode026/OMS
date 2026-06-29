import mongoose from 'mongoose';
import logger from '../config/logger.js';

export const branchScopeMiddleware = async (req, res, next) => {
  // If not authenticated, or no user context, pass through
  if (!req.user) {
    return next();
  }

  const role = (req.user.role || '').toLowerCase();
  
  // Super admins and company admins have full system access
  const isExcluded = ['super_admin', 'company_admin', 'superadmin', 'companyadmin'].includes(role);
  if (isExcluded) {
    return next();
  }

  try {
    // 1. Resolve if this user is a Branch Manager
    const Branch = mongoose.model('Branch');
    const managedBranch = await Branch.findOne({ managerId: req.user.id }).lean();
    
    let userBranch = null;
    if (managedBranch) {
      userBranch = managedBranch.name;
    } else if (role === 'branch_admin' || role === 'branchadmin') {
      userBranch = req.user.branch;
    }

    // If they are not a branch manager, let standard roles fall through (handled by standard guards)
    if (!userBranch) {
      return next();
    }

    logger.info(`Enforcing branch scoping for manager ${req.user.name} on branch: "${userBranch}"`);

    // 2. Fetch all employees in this branch (needed for filtering leaves, tasks, payroll, etc.)
    const Employee = mongoose.model('Employee');
    const branchEmployees = await Employee.find({ branch: userBranch }).select('id name').lean();
    const branchEmployeeIds = branchEmployees.map(e => e.id);
    const branchEmployeeNames = branchEmployees.map(e => e.name);

    const path = req.path;
    const method = req.method;

    // Apply strict filtering and write boundaries per module
    if (path.startsWith('/employees')) {
      // List employees
      if (method === 'GET' && !path.includes('/', 11)) {
        req.query.branch = userBranch;
      }
      // Get single employee, update, or delete
      const targetId = path.split('/')[2];
      if (targetId && targetId !== 'public' && targetId !== 'overrides') {
        const targetEmp = await Employee.findOne({ id: targetId }).lean();
        if (targetEmp && targetEmp.branch !== userBranch) {
          return res.status(403).json({
            status: 'fail',
            message: `Access denied: Employee ${targetId} belongs to branch "${targetEmp.branch}", not "${userBranch}".`
          });
        }
      }
      // Create or update employee
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        req.body.branch = userBranch;
      }
    } 
    
    else if (path.startsWith('/attendance')) {
      // List attendance
      if (method === 'GET' && !path.includes('/', 12)) {
        req.query.branch = userBranch;
      }
      // Single attendance detail or action
      const targetId = path.split('/')[2];
      if (targetId) {
        const Attendance = mongoose.model('Attendance');
        const targetAtt = await Attendance.findOne({ id: targetId }).lean();
        if (targetAtt && targetAtt.branch !== userBranch) {
          return res.status(403).json({
            status: 'fail',
            message: `Access denied: Attendance record ${targetId} is for branch "${targetAtt.branch}", not "${userBranch}".`
          });
        }
      }
      // Force branch on writes
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        req.body.branch = userBranch;
      }
    } 
    
    else if (path.startsWith('/leaves')) {
      // List leaves
      if (method === 'GET' && !path.includes('/', 8)) {
        if (req.query.employeeId) {
          if (!branchEmployeeIds.includes(req.query.employeeId)) {
            req.query.employeeId = 'none';
          }
        } else {
          req.query.employeeId = { $in: branchEmployeeIds };
        }
      }
      // Single leave detail or action (approval, rejection, etc.)
      const targetId = path.split('/')[2] || path.split('/').pop();
      if (targetId && targetId !== 'policies' && targetId !== 'reset-policies') {
        const Leave = mongoose.model('Leave');
        const targetLeave = await Leave.findOne({ id: targetId }).lean();
        if (targetLeave && targetLeave.employeeId && !branchEmployeeIds.includes(targetLeave.employeeId)) {
          return res.status(403).json({
            status: 'fail',
            message: 'Access denied: This leave request belongs to an employee outside your branch.'
          });
        }
      }
    }
    
    else if (path.startsWith('/work-reports')) {
      // List work reports
      if (method === 'GET' && !path.includes('/', 14)) {
        if (req.query.employeeId) {
          if (!branchEmployeeIds.includes(req.query.employeeId)) {
            req.query.employeeId = 'none';
          }
        } else {
          req.query.employeeId = { $in: branchEmployeeIds };
        }
      }
      // Single work report detail
      const targetId = path.split('/')[2];
      if (targetId) {
        const WorkReport = mongoose.model('WorkReport');
        const targetReport = await WorkReport.findOne({ id: targetId }).lean();
        if (targetReport && targetReport.employeeId && !branchEmployeeIds.includes(targetReport.employeeId)) {
          return res.status(403).json({
            status: 'fail',
            message: 'Access denied: This work report belongs to an employee outside your branch.'
          });
        }
      }
    }
    
    else if (path.startsWith('/activity-logs')) {
      // List activity logs
      if (method === 'GET') {
        req.query.newValue = { $in: branchEmployeeNames };
      }
    }
    
    else if (path.startsWith('/teams')) {
      // List teams
      if (method === 'GET' && !path.includes('/', 7)) {
        req.query.branch = userBranch;
      }
      // Single team detail
      const targetId = path.split('/')[2];
      if (targetId) {
        const Team = mongoose.model('Team');
        const targetTeam = await Team.findOne({ id: targetId }).lean();
        if (targetTeam && targetTeam.branch !== userBranch) {
          return res.status(403).json({
            status: 'fail',
            message: `Access denied: Team ${targetId} belongs to branch "${targetTeam.branch}", not "${userBranch}".`
          });
        }
      }
      // Force branch on writes
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        req.body.branch = userBranch;
      }
    }
    
    else if (path.startsWith('/departments')) {
      // List departments
      if (method === 'GET' && !path.includes('/', 13)) {
        req.query.branch = userBranch;
      }
      // Single department detail
      const targetId = path.split('/')[2];
      if (targetId) {
        const Department = mongoose.model('Department');
        const targetDept = await Department.findOne({ id: targetId }).lean();
        if (targetDept && targetDept.branch !== userBranch) {
          return res.status(403).json({
            status: 'fail',
            message: `Access denied: Department ${targetId} belongs to branch "${targetDept.branch}", not "${userBranch}".`
          });
        }
      }
      // Force branch on writes
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        req.body.branch = userBranch;
      }
    }
    
    else if (path.startsWith('/branches')) {
      // List branches: only return their own branch
      if (method === 'GET' && !path.includes('/', 10)) {
        req.query.name = userBranch;
      }
      // Single branch detail or action
      const targetId = path.split('/')[2];
      if (targetId) {
        const targetBranch = await Branch.findOne({ id: targetId }).lean();
        if (targetBranch && targetBranch.name !== userBranch) {
          return res.status(403).json({
            status: 'fail',
            message: `Access denied: You can only access details for your own branch "${userBranch}".`
          });
        }
      }
    }
    
    else if (path.startsWith('/tasks')) {
      // List tasks
      if (method === 'GET' && !path.includes('/', 7)) {
        if (req.query.assigneeId) {
          if (!branchEmployeeIds.includes(req.query.assigneeId)) {
            req.query.assigneeId = 'none';
          }
        } else {
          req.query.assigneeId = { $in: branchEmployeeIds };
        }
      }
      // Single task detail or action
      const targetId = path.split('/')[2] || path.split('/').pop();
      if (targetId && targetId !== 'bulk-status') {
        const Task = mongoose.model('Task');
        const targetTask = await Task.findOne({ id: targetId }).lean();
        if (targetTask && targetTask.assigneeId && !branchEmployeeIds.includes(targetTask.assigneeId)) {
          return res.status(403).json({
            status: 'fail',
            message: 'Access denied: This task belongs to an employee outside your branch.'
          });
        }
      }
    }

    next();
  } catch (err) {
    logger.error('Error in branchScopeMiddleware:', err);
    next(err);
  }
};

export default branchScopeMiddleware;
