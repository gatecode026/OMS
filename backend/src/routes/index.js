/**
 * @file src/routes/index.js
 * @description Master router that mounts all frontend-justified modular domains.
 */

import express from 'express';

// Modular Router Imports
import authRouter from '../modules/auth/auth.routes.js';
import employeesRouter from '../modules/employees/employees.routes.js';
import attendanceRouter from '../modules/attendance/attendance.routes.js';
import leavesRouter from '../modules/leaves/leaves.routes.js';
import holidaysRouter from '../modules/holidays/holidays.routes.js';
import tasksRouter from '../modules/tasks/tasks.routes.js';
import payrollRouter from '../modules/payroll/payroll.routes.js';
import departmentsRouter from '../modules/departments/departments.routes.js';
import branchesRouter from '../modules/branches/branches.routes.js';
import teamsRouter from '../modules/teams/teams.routes.js';
import projectsRouter from '../modules/projects/projects.routes.js';
import workflowsRouter from '../modules/workflows/workflows.routes.js';
import workReportsRouter from '../modules/work-reports/work-reports.routes.js';
import notificationsRouter from '../modules/notifications/notifications.routes.js';
import activityLogsRouter from '../modules/activity-logs/activity-logs.routes.js';
import rolesRouter from '../modules/roles/roles.routes.js';
import documentsRouter from '../modules/documents/documents.routes.js';
import settingsRouter from '../modules/settings/settings.routes.js';

const router = express.Router();

// ─── ROUTE MOUNT POINTS ──────────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/employees', employeesRouter);
router.use('/attendance', attendanceRouter);
router.use('/leaves', leavesRouter);
router.use('/holidays', holidaysRouter);
router.use('/tasks', tasksRouter);
router.use('/payroll', payrollRouter);
router.use('/departments', departmentsRouter);
router.use('/branches', branchesRouter);
router.use('/teams', teamsRouter);
router.use('/projects', projectsRouter);
router.use('/workflows', workflowsRouter);
router.use('/work-reports', workReportsRouter);
router.use('/notifications', notificationsRouter);
router.use('/activity-logs', activityLogsRouter);
router.use('/roles', rolesRouter);
router.use('/documents', documentsRouter);
router.use('/settings', settingsRouter);

export default router;
