/**
 * @file src/routes/index.js
 * @description Master router that mounts all frontend-justified modular domains.
 */
import express from "express";
// Modular Router Imports
import authRouter from "../modules/auth/auth.routes.js";
import employeesRouter from "../modules/employees/employees.routes.js";
import attendanceRouter from "../modules/attendance/attendance.routes.js";
import attendanceCorrectionsRouter from "../modules/attendance-corrections/attendance-correction.routes.js";
import leavesRouter from "../modules/leaves/leaves.routes.js";
import holidaysRouter from "../modules/holidays/holidays.routes.js";
import tasksRouter from "../modules/tasks/tasks.routes.js";
import payrollRouter from "../modules/payroll/payroll.routes.js";
import payrollQueriesRouter from "../modules/payroll-queries/index.js";
import departmentsRouter from "../modules/departments/departments.routes.js";
import branchesRouter from "../modules/branches/branches.routes.js";
import teamsRouter from "../modules/teams/teams.routes.js";
import projectsRouter from "../modules/projects/projects.routes.js";
import workflowsRouter from "../modules/workflows/workflows.routes.js";
import workReportsRouter from "../modules/work-reports/work-reports.routes.js";
import notificationsRouter from "../modules/notifications/notifications.routes.js";
import activityLogsRouter from "../modules/activity-logs/activity-logs.routes.js";
import rolesRouter from "../modules/roles/roles.routes.js";
import documentsRouter from "../modules/documents/documents.routes.js";
import settingsRouter from "../modules/settings/settings.routes.js";
import appraisalReviewsRouter from "../modules/appraisal-reviews/appraisal-reviews.routes.js";
import announcementsRouter from "../modules/announcements/announcements.routes.js";
import performanceRouter from "../modules/performance/performance.routes.js";
import securityRouter from "../modules/security/security.routes.js";
import eventsRouter from "../modules/events/event.routes.js";
import companiesRouter from "../modules/companies/company.routes.js";
import adminRouter from "../modules/admin/admin.routes.js";
import chatRouter from "../modules/chat/chat.routes.js";
import kpiTemplatesRouter from "../modules/kpi-templates/kpi-template.routes.js";
import kpiEvaluationCyclesRouter from "../modules/kpi-evaluation-cycles/kpi-evaluation-cycle.routes.js";
import kpiEmployeeEvaluationsRouter from "../modules/kpi-employee-evaluations/kpi-employee-evaluation.routes.js";

const router = express.Router();

// ─── ROUTE MOUNT POINTS ──────────────────────────────────────────────────────
router.use("/auth", authRouter);
router.use("/employees", employeesRouter);
router.use("/attendance", attendanceRouter);
router.use("/attendance-corrections", attendanceCorrectionsRouter);
router.use("/leaves", leavesRouter);
router.use("/holidays", holidaysRouter);
router.use("/tasks", tasksRouter);
router.use("/payroll", payrollRouter);
router.use("/payroll-queries", payrollQueriesRouter);
router.use("/departments", departmentsRouter);
router.use("/branches", branchesRouter);
router.use("/teams", teamsRouter);
router.use("/projects", projectsRouter);
router.use("/workflows", workflowsRouter);
router.use("/work-reports", workReportsRouter);
router.use("/notifications", notificationsRouter);
router.use("/activity-logs", activityLogsRouter);
router.use("/roles", rolesRouter);
router.use("/documents", documentsRouter);
router.use("/settings", settingsRouter);
router.use("/appraisal-reviews", appraisalReviewsRouter);
router.use("/announcements", announcementsRouter);
router.use("/performance", performanceRouter);
router.use("/security", securityRouter);
router.use("/events", eventsRouter);
router.use("/companies", companiesRouter);
router.use("/admin", adminRouter);
router.use("/chat", chatRouter);
router.use("/kpi-templates", kpiTemplatesRouter);
router.use("/kpi-evaluation-cycles", kpiEvaluationCyclesRouter);
router.use("/kpi-employee-evaluations", kpiEmployeeEvaluationsRouter);

export default router;
