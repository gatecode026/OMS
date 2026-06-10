import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);
import bcrypt from 'bcryptjs';
import env from './env.js';
import logger from './logger.js';
import Admin from '../modules/admin/admin.model.js';
import Holiday from '../modules/holidays/holidays.model.js';
import Project from '../modules/projects/projects.model.js';
import Employee from '../modules/employees/employees.model.js';
import Team from '../modules/teams/teams.model.js';
import WorkReport from '../modules/work-reports/work-reports.model.js';
import AppraisalReview from '../modules/appraisal-reviews/appraisal-reviews.model.js';
import { PayrollGrade, PayrollReimbursement, PayrollLoanAdvance, PayrollBonus, PayrollPayment, PayrollConfig } from '../modules/payroll/payroll.model.js';
import { Announcement, EmergencyAlert, AnnouncementTrackingLog, AnnouncementAuditLog } from '../modules/announcements/announcement.model.js';
import Role from '../modules/roles/roles.model.js';
import UserOverride from '../modules/roles/overrides.model.js';
import Goal from '../modules/performance/goal.model.js';
import Pip from '../modules/performance/pip.model.js';
import { IpWhitelist, IpBlocklist, UserDevice, UserSession, SecurityAlert } from '../modules/security/security.model.js';
import ActivityLog from '../modules/activity-logs/activity-log.model.js';
import Notification from '../modules/notifications/notification.model.js';
import Document from '../modules/documents/document.model.js';

export let isDatabaseConnected = false;

export const database = {
  /**
   * Establishes a connection to MongoDB (mocked placeholder for future integration)
   */
  connect: async () => {
    if (env.nodeEnv === 'test') {
      logger.info('Database connection skipped in test environment.');
      return;
    }

    try {
      logger.info(`Attempting database connection to: ${env.dbUri.replace(/:([^:@]+)@/, ':****@')}`);

      const mongooseOpts = {
        autoIndex: true,
        serverSelectionTimeoutMS: 15000 // Allow enough time for Atlas DNS resolution on local network
      };

      await mongoose.connect(env.dbUri, mongooseOpts);
      logger.info('Successfully established database connection.');
      isDatabaseConnected = true;

      // Ensure at least one primary Super Admin account exists in the admins collection
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        logger.info('Admins collection is empty. Initializing primary Super Admin account...');
        
        // Manually generate secure bcrypt hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt);

        await Admin.create({
          id: 'EMP-2026-001',
          name: 'Balram Suman',
          email: 'superadmin@saas.com',
          phone: '+91 98765 43210',
          role: 'Super Admin',
          roleId: 'super_admin',
          status: 'Active',
          password: hashedPassword
        });
        logger.info('Primary Super Admin created successfully.');
      }

      // Ensure initial Employees exist in the employees collection
      const employeeCount = await Employee.countDocuments();
      if (employeeCount === 0) {
        logger.info('Employees collection is empty. Seeding initial workforce...');
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt);
        
        const seedEmployees = [];
        await Employee.create(seedEmployees);
        logger.info('Employees seeded successfully.');
      }

      // Ensure initial Projects exist in the projects collection
      const projectCount = await Project.countDocuments();
      if (projectCount === 0) {
        logger.info('Projects collection is empty. Seeding initial projects...');
        const seedProjects = [];
        await Project.create(seedProjects);
        logger.info('Projects seeded successfully.');
      }

      // Ensure initial Teams exist in the teams collection
      const teamCount = await Team.countDocuments();
      if (teamCount === 0) {
        logger.info('Teams collection is empty. Seeding initial teams...');
        const seedTeams = [];
        await Team.create(seedTeams);
        logger.info('Teams seeded successfully.');
      }

      // Ensure initial Daily Work Reports exist in the work_reports collection
      const workReportCount = await WorkReport.countDocuments();
      if (workReportCount === 0) {
        logger.info('Work_reports collection is empty. Seeding initial records...');
        const seedReports = [];
        await WorkReport.create(seedReports);
        logger.info('Daily Work Reports seeded successfully.');
      }

      // Ensure initial Appraisal Reviews exist in the appraisal_reviews collection
      const appraisalReviewCount = await AppraisalReview.countDocuments();
      if (appraisalReviewCount === 0) {
        logger.info('Appraisal_reviews collection is empty. Seeding initial records...');
        const seedReviews = [];
        await AppraisalReview.create(seedReviews);
        logger.info('Appraisal Reviews seeded successfully.');
      }

      // Ensure initial announcements exist in the announcements collection
      const announcementCount = await Announcement.countDocuments();
      if (announcementCount === 0) {
        logger.info('Announcements collection is empty. Seeding initial records...');
        const seedAnnouncements = [];
        await Announcement.create(seedAnnouncements);
        logger.info('Announcements seeded successfully.');
      }

      // Ensure emergency alerts exist
      const emergencyAlertCount = await EmergencyAlert.countDocuments();
      if (emergencyAlertCount === 0) {
        await EmergencyAlert.create({
          id: 'EMERGENCY_ALERT',
          isActive: true,
          title: 'URGENT: Bangalore Branch Closure Due to Heavy Rainfall',
          description: 'Due to severe weather warnings in Bangalore, our physical office is closed today, June 4th. All employees are advised to work from home. Stay safe!',
          date: 'June 04, 2026'
        });
        logger.info('Emergency alerts seeded successfully.');
      }

      // Ensure initial notifications exist
      const notificationCount = await Notification.countDocuments();
      if (notificationCount === 0) {
        logger.info('Notifications collection is empty. Seeding initial notifications...');
        const seedNotifications = [];
        await Notification.create(seedNotifications);
        logger.info('Notifications seeded successfully.');
      }

      // Ensure initial documents exist
      const documentCount = await Document.countDocuments();
      if (documentCount === 0) {
        logger.info('Documents collection is empty. Seeding initial documents...');
        const seedDocuments = [];
        await Document.create(seedDocuments);
        logger.info('Documents seeded successfully.');
      }

      // Ensure tracking logs exist
      const trackingLogCount = await AnnouncementTrackingLog.countDocuments();
      if (trackingLogCount === 0) {
        const seedTrackingLogs = [];
        await AnnouncementTrackingLog.create(seedTrackingLogs);
        logger.info('Announcement tracking logs seeded successfully.');
      }

      // Ensure audit logs exist
      const auditLogCount = await AnnouncementAuditLog.countDocuments();
      if (auditLogCount === 0) {
        const seedAuditLogs = [];
        await AnnouncementAuditLog.create(seedAuditLogs);
        logger.info('Announcement audit logs seeded successfully.');
      }

      // Clear all dummy payroll collections to show only real data (commented out to persist data across restarts)
      // await PayrollGrade.deleteMany({});
      // await PayrollReimbursement.deleteMany({});
      // await PayrollLoanAdvance.deleteMany({});
      // await PayrollBonus.deleteMany({});
      // await PayrollPayment.deleteMany({});
      // await PayrollConfig.deleteMany({});

      // Initialize clean empty GLOBAL_CONFIG if it doesn't exist
      const existingConfig = await PayrollConfig.findOne({ id: 'GLOBAL_CONFIG' });
      if (!existingConfig) {
        await PayrollConfig.create({
          id: 'GLOBAL_CONFIG',
          leaveDeductionRate: 2000,
          lateArrivalPenalty: 300,
          overtimeHourlyRate: 500,
          taxProfiles: {},
          salaryStructures: {},
          attendanceDaysMap: {}
        });
        logger.info('Clean Payroll configuration initialized.');
      }

      // Ensure initial roles exist
      // Ensure initial User Overrides exist
      const overrideCount = await UserOverride.countDocuments();
      if (overrideCount === 0) {
        logger.info('user_overrides collection is empty. Seeding initial user overrides...');
        const seedOverrides = [];
        await UserOverride.create(seedOverrides);
        logger.info('User overrides seeded successfully.');
      }

      // Ensure initial roles exist
      const roleCount = await Role.countDocuments();
      if (roleCount === 0) {
        logger.info('rbac_roles collection is empty. Seeding initial records...');
        const seedRoles = [
          {
            id: 'super_admin',
            name: 'Super Admin',
            description: 'Full system access to all branches, departments, billing, and settings.',
            userCount: 2,
            accentColor: '#2563eb',
            permissions: {
              dashboard: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              employees: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              attendance: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              leaves: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              tasks: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              payroll: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              permissions: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              settings: { create: true, read: true, update: true, delete: true, approve: true, export: true }
            }
          },
          {
            id: 'dept_admin',
            name: 'Department Admin',
            description: 'Access to employees, attendance, and tasks within the assigned department.',
            userCount: 5,
            accentColor: '#8b5cf6',
            permissions: {
              dashboard: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              employees: { create: true, read: true, update: true, delete: false, approve: false, export: false },
              attendance: { create: true, read: true, update: true, delete: false, approve: false, export: false },
              leaves: { create: true, read: true, update: true, delete: true, approve: true, export: false },
              tasks: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              payroll: { create: false, read: false, update: false, delete: false, approve: false, export: false },
              permissions: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              settings: { create: false, read: true, update: false, delete: false, approve: false, export: false }
            }
          },
          {
            id: 'branch_admin',
            name: 'Branch Admin',
            description: 'Access to employees, attendance, payroll, and tasks within the assigned branch.',
            userCount: 4,
            accentColor: '#7c3aed',
            permissions: {
              dashboard: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              employees: { create: true, read: true, update: true, delete: false, approve: false, export: false },
              attendance: { create: true, read: true, update: true, delete: false, approve: false, export: false },
              leaves: { create: true, read: true, update: true, delete: true, approve: true, export: false },
              tasks: { create: true, read: true, update: true, delete: true, approve: true, export: false },
              payroll: { create: true, read: true, update: true, delete: false, approve: false, export: true },
              permissions: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              settings: { create: false, read: true, update: true, delete: false, approve: false, export: false }
            }
          },
          {
            id: 'manager',
            name: 'Manager',
            description: 'Monitor and manage projects, tasks, workflows, and team leader performance.',
            userCount: 3,
            accentColor: '#ec4899',
            permissions: {
              dashboard: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              employees: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              attendance: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              leaves: { create: true, read: true, update: true, delete: false, approve: true, export: false },
              tasks: { create: true, read: true, update: true, delete: true, approve: true, export: true },
              payroll: { create: false, read: false, update: false, delete: false, approve: false, export: false },
              permissions: { create: false, read: false, update: false, delete: false, approve: false, export: false },
              settings: { create: false, read: true, update: false, delete: false, approve: false, export: false }
            }
          },
          {
            id: 'team_leader',
            name: 'Team Leader',
            description: 'Manage tasks, reviews, and attendance for assigned team members.',
            userCount: 8,
            accentColor: '#16a34a',
            permissions: {
              dashboard: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              employees: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              attendance: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              leaves: { create: false, read: true, update: true, delete: false, approve: true, export: false },
              tasks: { create: true, read: true, update: true, delete: true, approve: true, export: false },
              payroll: { create: false, read: false, update: false, delete: false, approve: false, export: false },
              permissions: { create: false, read: false, update: false, delete: false, approve: false, export: false },
              settings: { create: false, read: true, update: false, delete: false, approve: false, export: false }
            }
          },
          {
            id: 'employee',
            name: 'Employee',
            description: 'Standard employee access to check own tasks, leave requests, attendance, and profile.',
            userCount: 48,
            accentColor: '#64748b',
            permissions: {
              dashboard: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              employees: { create: false, read: false, update: false, delete: false, approve: false, export: false },
              attendance: { create: true, read: true, update: false, delete: false, approve: false, export: false },
              leaves: { create: true, read: true, update: false, delete: false, approve: false, export: false },
              tasks: { create: false, read: true, update: true, delete: false, approve: false, export: false },
              payroll: { create: false, read: true, update: false, delete: false, approve: false, export: false },
              permissions: { create: false, read: false, update: false, delete: false, approve: false, export: false },
              settings: { create: false, read: true, update: false, delete: false, approve: false, export: false }
            }
          }
        ];
        await Role.create(seedRoles);
        logger.info('rbac_roles seeded successfully.');
      }

      // Ensure initial goals exist
      const goalCount = await Goal.countDocuments();
      if (goalCount === 0) {
        logger.info('performance_goals collection is empty. Seeding initial records...');
        const seedGoals = [];
        await Goal.create(seedGoals);
        logger.info('performance_goals seeded successfully.');
      }

      // Ensure initial PIPs exist
      const pipCount = await Pip.countDocuments();
      if (pipCount === 0) {
        logger.info('performance_pips collection is empty. Seeding initial records...');
        const seedPips = [];
        await Pip.create(seedPips);
        logger.info('performance_pips seeded successfully.');
      }

      // Ensure initial IP Whitelist entries
      const whitelistCount = await IpWhitelist.countDocuments();
      if (whitelistCount === 0) {
        logger.info('IpWhitelist collection is empty. Seeding initial records...');
        const seedIpWhitelist = [
          { id: 'IP-101', ip: '192.168.1.50', startRange: '192.168.1.1', endRange: '192.168.1.254', location: 'Jaipur HQ', purpose: 'Office Network', status: 'Active' },
          { id: 'IP-102', ip: '10.8.0.45', startRange: '10.8.0.1', endRange: '10.8.0.100', location: 'Mumbai DC', purpose: 'VPN Network', status: 'Active' },
          { id: 'IP-103', ip: '172.16.2.10', startRange: '172.16.2.1', endRange: '172.16.2.50', location: 'Delhi Branch', purpose: 'Branch Network', status: 'Active' },
          { id: 'IP-104', ip: '192.168.12.8', startRange: '192.168.12.1', endRange: '192.168.12.30', location: 'Remote Employees', purpose: 'Remote Access', status: 'Inactive' }
        ];
        await IpWhitelist.create(seedIpWhitelist);
        logger.info('IpWhitelist seeded successfully.');
      }

      // Ensure initial Blocked IPs exist
      const blocklistCount = await IpBlocklist.countDocuments();
      if (blocklistCount === 0) {
        logger.info('IpBlocklist collection is empty. Seeding initial records...');
        const seedIpBlocklist = [];
        await IpBlocklist.create(seedIpBlocklist);
        logger.info('IpBlocklist seeded successfully.');
      }

      // Ensure user devices exist
      const deviceCount = await UserDevice.countDocuments();
      if (deviceCount === 0) {
        logger.info('UserDevice collection is empty. Seeding initial records...');
        const seedUserDevices = [];
        await UserDevice.create(seedUserDevices);
        logger.info('UserDevice seeded successfully.');
      }

      // Ensure active sessions exist
      const sessionCount = await UserSession.countDocuments();
      if (sessionCount === 0) {
        logger.info('UserSession collection is empty. Seeding initial records...');
        const seedUserSessions = [];
        await UserSession.create(seedUserSessions);
        logger.info('UserSession seeded successfully.');
      }

      // Ensure security alerts exist
      const alertCount = await SecurityAlert.countDocuments();
      if (alertCount === 0) {
        logger.info('SecurityAlert collection is empty. Seeding initial records...');
        const seedSecurityAlerts = [];
        await SecurityAlert.create(seedSecurityAlerts);
        logger.info('SecurityAlert seeded successfully.');
      }

      // Ensure activity logs exist
      const activityLogCount = await ActivityLog.countDocuments();
      if (activityLogCount === 0) {
        logger.info('ActivityLog collection is empty. Seeding initial records...');
        const seedActivityLogs = [];
        await ActivityLog.create(seedActivityLogs);
        logger.info('ActivityLog seeded successfully.');
      }

      mongoose.connection.on('error', (err) => {
        logger.error(`Database runtime connection error: ${err}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('Database connection lost.');
        isDatabaseConnected = false;
      });

    } catch (error) {
      isDatabaseConnected = false;
      logger.warn(`[Offline Mode] MongoDB is offline or blocked (Error: ${error.message}). Gracefully falling back to secure in-memory execution...`);
    }
  },

  /**
   * Closes active database connection
   */
  disconnect: async () => {
    if (!isDatabaseConnected) return;
    try {
      await mongoose.disconnect();
      logger.info('Successfully terminated database connection.');
      isDatabaseConnected = false;
    } catch (error) {
      logger.error('Database disconnect error:', error);
    }
  }
};

export default database;
