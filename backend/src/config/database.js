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
          name: 'Aarav Sharma',
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
        
        const seedEmployees = [
          {
            id: 'EMP-2026-001',
            name: 'Aarav Sharma',
            email: 'aarav.sharma@saas.com',
            phone: '+91 98765 43210',
            role: 'Super Admin',
            roleId: 'super_admin',
            status: 'Active',
            designation: 'Chief Operations Officer',
            department: 'Operations',
            branch: 'Jaipur',
            team: 'Operations Core',
            password: hashedPassword,
            joinDate: '2025-01-01'
          },
          {
            id: 'EMP-2026-002',
            name: 'Vikram Singh',
            email: 'vikram.singh@saas.com',
            phone: '+91 98765 43211',
            role: 'Branch Admin',
            roleId: 'branch_admin',
            status: 'Active',
            designation: 'Engineering Manager',
            department: 'Engineering',
            branch: 'Delhi',
            team: 'Dev Team Alpha',
            password: hashedPassword,
            joinDate: '2025-02-01',
            experience: '8 years Senior Track',
            productivityScore: 92
          },
          {
            id: 'EMP-2026-003',
            name: 'Ananya Gupta',
            email: 'ananya.gupta@saas.com',
            phone: '+91 98765 43212',
            role: 'Team Leader',
            roleId: 'team_leader',
            status: 'Active',
            designation: 'Senior Frontend Engineer',
            department: 'Engineering',
            branch: 'Delhi',
            team: 'Dev Team Alpha',
            password: hashedPassword,
            joinDate: '2025-03-01',
            experience: '6 years Lead Track',
            productivityScore: 94
          },
          {
            id: 'EMP-2026-004',
            name: 'Rohit Sharma',
            email: 'rohit.sharma@saas.com',
            phone: '+91 98765 43213',
            role: 'Team Leader',
            roleId: 'team_leader',
            status: 'Active',
            designation: 'Regional Sales Manager',
            department: 'Sales',
            branch: 'Delhi',
            team: 'Domestic Sales',
            password: hashedPassword,
            joinDate: '2025-03-15',
            experience: '5 years Execution Track',
            productivityScore: 92
          },
          {
            id: 'EMP-2026-005',
            name: 'Priya Patel',
            email: 'priya.patel@saas.com',
            phone: '+91 98765 43214',
            role: 'Branch Admin',
            roleId: 'branch_admin',
            status: 'Active',
            designation: 'Marketing Director APAC',
            department: 'Marketing',
            branch: 'Mumbai',
            team: 'Digital Marketing',
            password: hashedPassword,
            joinDate: '2025-04-01',
            experience: '7 years Management Track',
            productivityScore: 91
          },
          {
            id: 'EMP-2026-006',
            name: 'Arjun Mehta',
            email: 'arjun.mehta@saas.com',
            phone: '+91 98765 43215',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'Data Engineer',
            department: 'Engineering',
            branch: 'Bangalore',
            team: 'Data Services',
            password: hashedPassword,
            joinDate: '2025-05-01',
            experience: '3 years Data Track',
            productivityScore: 89
          },
          {
            id: 'EMP-2026-007',
            name: 'Neha Verma',
            email: 'neha.verma@saas.com',
            phone: '+91 98765 43216',
            role: 'Employee',
            roleId: 'employee',
            status: 'On Leave',
            designation: 'HR Business Partner',
            department: 'Human Resources',
            branch: 'Delhi',
            team: 'HR Operations',
            password: hashedPassword,
            joinDate: '2025-05-15',
            experience: '4 years HR Track',
            productivityScore: 88
          },
          {
            id: 'EMP-2026-008',
            name: 'Deepak Joshi',
            email: 'deepak.joshi@saas.com',
            phone: '+91 98765 43217',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'Account Executive',
            department: 'Sales',
            branch: 'Delhi',
            team: 'Domestic Sales',
            password: hashedPassword,
            joinDate: '2025-06-01',
            experience: '2 years Sales Track',
            productivityScore: 87
          },
          {
            id: 'EMP-2026-009',
            name: 'Suresh Kumar',
            email: 'suresh.kumar@saas.com',
            phone: '+91 98765 43218',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'Frontend Developer',
            department: 'Engineering',
            branch: 'Delhi',
            team: 'Dev Team Alpha',
            password: hashedPassword,
            joinDate: '2025-06-10',
            experience: '2 years Dev Track',
            productivityScore: 90
          },
          {
            id: 'EMP-2026-010',
            name: 'Priya Sharma',
            email: 'priya.sharma@enterprise.com',
            phone: '+91 98765 43219',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'Campaign Analyst',
            department: 'Marketing',
            branch: 'Delhi',
            team: 'Digital Marketing',
            password: hashedPassword,
            joinDate: '2025-06-15',
            experience: '1 year Marketing Track',
            productivityScore: 92
          },
          {
            id: 'EMP-2026-011',
            name: 'Kabir Mehta',
            email: 'kabir.mehta@saas.com',
            phone: '+91 98765 43220',
            role: 'Manager',
            roleId: 'manager',
            status: 'Active',
            designation: 'Senior Project Manager',
            department: 'Engineering',
            branch: 'Delhi',
            team: 'Backend Core',
            password: hashedPassword,
            joinDate: '2024-01-10',
            experience: '10 years management track',
            productivityScore: 96
          },
          {
            id: 'EMP-102',
            name: 'Divya Singh',
            email: 'divya.singh@saas.com',
            phone: '+91 98765 43302',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'Backend Developer',
            department: 'IT',
            team: 'Dev Team Alpha',
            password: hashedPassword,
            joinDate: '2025-01-15',
            experience: '3 years backend track',
            productivityScore: 94
          },
          {
            id: 'EMP-108',
            name: 'Rajesh Kumar',
            email: 'rajesh.kumar@saas.com',
            phone: '+91 98765 43308',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'Brand Designer',
            department: 'Marketing',
            team: 'Brand Design',
            password: hashedPassword,
            joinDate: '2025-02-10',
            experience: '4 years design track',
            productivityScore: 98
          },
          {
            id: 'EMP-115',
            name: 'Meena Sharma',
            email: 'meena.sharma@saas.com',
            phone: '+91 98765 43315',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'Sales Coordinator',
            department: 'Sales',
            team: 'Corporate Outreach',
            password: hashedPassword,
            joinDate: '2025-03-01',
            experience: '3 years coordinator track',
            productivityScore: 90
          },
          {
            id: 'EMP-121',
            name: 'Prakash Patel',
            email: 'prakash.patel@saas.com',
            phone: '+91 98765 43321',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'Systems Administrator',
            department: 'Operations',
            team: 'Systems Integration',
            password: hashedPassword,
            joinDate: '2025-03-20',
            experience: '5 years sysops track',
            productivityScore: 88
          },
          {
            id: 'EMP-130',
            name: 'Sunita Rao',
            email: 'sunita.rao@saas.com',
            phone: '+91 98765 43330',
            role: 'Employee',
            roleId: 'employee',
            status: 'Active',
            designation: 'HR Coordinator',
            department: 'HR',
            team: 'Talent Acquisition',
            password: hashedPassword,
            joinDate: '2025-04-10',
            experience: '2 years recruiter track',
            productivityScore: 89
          }
        ];
        await Employee.create(seedEmployees);
        logger.info('Employees seeded successfully.');
      }

      // Ensure initial Projects exist in the projects collection
      const projectCount = await Project.countDocuments();
      if (projectCount === 0) {
        logger.info('Projects collection is empty. Seeding initial projects...');
        const seedProjects = [
          {
            id: 'PRJ-001',
            name: 'SaaS Platform v3.0',
            description: 'Refactoring and upgrading central core services.',
            department: 'IT',
            client: 'Global Tech Corp',
            manager: 'Kabir Mehta',
            leader: 'Ananya Gupta',
            members: ['EMP-102', 'EMP-2026-009'],
            priority: 'High',
            startDate: '2026-01-10',
            deadline: '2026-07-30',
            progress: 72,
            status: 'In Progress',
            budget: 28,
            tasksTotal: 12,
            tasksDone: 8
          },
          {
            id: 'PRJ-002',
            name: 'Mobile App Redesign',
            description: 'Stunning user interface updates.',
            department: 'IT',
            client: 'FitLife Inc',
            manager: 'Kabir Mehta',
            leader: 'Ananya Gupta',
            members: ['EMP-2026-009'],
            priority: 'Medium',
            startDate: '2026-02-01',
            deadline: '2026-06-30',
            progress: 55,
            status: 'In Progress',
            budget: 18,
            tasksTotal: 10,
            tasksDone: 5
          },
          {
            id: 'PRJ-003',
            name: 'Q3 Marketing Campaign',
            description: 'Broad outreach updates.',
            department: 'Marketing',
            client: 'Red Bull India',
            manager: 'Priya Patel',
            leader: 'Ananya Gupta',
            members: ['EMP-108', 'EMP-2026-010'],
            priority: 'Medium',
            startDate: '2026-03-01',
            deadline: '2026-09-30',
            progress: 38,
            status: 'In Progress',
            budget: 15,
            tasksTotal: 8,
            tasksDone: 3
          }
        ];
        await Project.create(seedProjects);
        logger.info('Projects seeded successfully.');
      }

      // Ensure initial Teams exist in the teams collection
      const teamCount = await Team.countDocuments();
      if (teamCount === 0) {
        logger.info('Teams collection is empty. Seeding initial teams...');
        const seedTeams = [
          {
            id: 'T-001',
            name: 'Dev Team Alpha',
            leader: 'Ananya Gupta',
            department: 'Engineering',
            branch: 'Delhi',
            description: 'Core backend and software developers.',
            status: 'Active',
            activeProjects: 2,
            completedTasks: 14,
            productivity: 94,
            attendance: 98,
            membersList: [
              { name: 'Ananya Gupta', id: 'EMP-2026-003', designation: 'Team Leader', attendance: 98, productivity: 94 },
              { name: 'Divya Singh', id: 'EMP-102', designation: 'Backend Developer', attendance: 95, productivity: 94 },
              { name: 'Suresh Kumar', id: 'EMP-2026-009', designation: 'Frontend Developer', attendance: 97, productivity: 90 }
            ]
          },
          {
            id: 'T-002',
            name: 'Domestic Sales',
            leader: 'Rohit Sharma',
            department: 'Sales',
            branch: 'Delhi',
            description: 'Sales and client managers.',
            status: 'Active',
            activeProjects: 1,
            completedTasks: 8,
            productivity: 91,
            attendance: 96,
            membersList: [
              { name: 'Rohit Sharma', id: 'EMP-2026-004', designation: 'Team Leader', attendance: 96, productivity: 92 },
              { name: 'Deepak Joshi', id: 'EMP-2026-008', designation: 'Account Executive', attendance: 95, productivity: 87 }
            ]
          },
          {
            id: 'T-003',
            name: 'Digital Marketing',
            leader: 'Ananya Gupta',
            department: 'Marketing',
            branch: 'Mumbai',
            description: 'APAC branding.',
            status: 'Active',
            activeProjects: 1,
            completedTasks: 10,
            productivity: 89,
            attendance: 95,
            membersList: [
              { name: 'Priya Sharma', id: 'EMP-2026-010', designation: 'Campaign Analyst', attendance: 95, productivity: 92 }
            ]
          }
        ];
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
        const seedReviews = [
          {
            id: 'REV-001',
            employeeId: 'EMP-2026-102',
            employeeName: 'Divya Singh',
            reviewer: 'Aarav Sharma',
            type: 'Quarterly',
            period: 'Q1 2026',
            rating: 'Outstanding',
            notes: 'Exceeded all performance targets. Maintained near-perfect attendance and delivered robust RBAC authentication modules on-time.',
            feedback: 'Keep up the exemplary focus on software security schemas.',
            recommendations: 'Recommended for promotion to Technical Director.',
            date: '2026-04-15'
          },
          {
            id: 'REV-002',
            employeeId: 'EMP-2026-108',
            employeeName: 'Rajesh Kumar',
            reviewer: 'Aarav Sharma',
            type: 'Monthly',
            period: 'May 2026',
            rating: 'Excellent',
            notes: 'Designed brand guideline packs, showing high efficiency and quality. Sourcing deliverables was seamless.',
            feedback: 'Improve coordination timelines with development teams.',
            recommendations: 'Encourage leading cross-functional design sprints.',
            date: '2026-05-28'
          },
          {
            id: 'REV-003',
            employeeId: 'EMP-2026-002',
            employeeName: 'Vikram Singh',
            reviewer: 'Aarav Sharma',
            type: 'Quarterly',
            period: 'Q1 2026',
            rating: 'Good',
            notes: 'Solid project management and team alignment. Minor scope shifts on Recharts optimization goals.',
            feedback: 'Focus on stabilizing project sprint estimates.',
            recommendations: 'Provide standard scrum master certifications support.',
            date: '2026-04-12'
          }
        ];
        await AppraisalReview.create(seedReviews);
        logger.info('Appraisal Reviews seeded successfully.');
      }

      // Ensure initial announcements exist in the announcements collection
      const announcementCount = await Announcement.countDocuments();
      if (announcementCount === 0) {
        logger.info('Announcements collection is empty. Seeding initial records...');
        const seedAnnouncements = [
          {
            id: 'ANN-001',
            title: 'Q2 CEO Virtual Townhall Meeting',
            description: 'Join us for our Q2 Townhall where Sarah Connor will share H1 financial performance, strategic milestones, and H2 organizational expansion roadmap. Live Q&A session will take place during the last 20 minutes. Please submit questions beforehand.',
            category: 'Company',
            priority: 'High',
            publishedBy: 'Sarah Connor',
            publishedByRole: 'Super Admin',
            publishDate: '2026-05-28',
            expiryDate: '2026-06-10',
            audienceType: 'All',
            targetAudience: 'All Employees',
            views: 312,
            acknowledgements: 245,
            status: 'Published',
            pinned: true,
            deliveryChannels: ['Dashboard', 'Email'],
            attachments: ['Townhall_Q2_Agenda.pdf', 'Q2_SlideDeck_Preview.pptx'],
            acknowledgedUsers: ['EMP-2026-001', 'EMP-2026-002', 'EMP-2026-003'],
            comments: [
              { id: '1', user: 'Vikram Singh', role: 'Engineering Manager', avatar: '', text: 'Looking forward to the H2 expansion details! Will the product roadmap be discussed?', timestamp: '2 days ago' },
              { id: '2', user: 'Neha Verma', role: 'HR Manager', avatar: '', text: 'Please ensure questions are posted in Slido by June 4th evening.', timestamp: '1 day ago' }
            ],
            likes: 34,
            likedBy: ['EMP-2026-001']
          },
          {
            id: 'ANN-002',
            title: 'New Remote Work Guidelines & Office Core Days',
            description: 'HR is publishing the revised hybrid work guidelines effective June 15th, 2026. Employees are required to spend 2 core days in their respective branches (Tuesdays & Thursdays). Detailed exceptions policies are uploaded here.',
            category: 'HR',
            priority: 'Critical',
            publishedBy: 'Sophia Laurent',
            publishedByRole: 'HR Manager',
            publishDate: '2026-05-30',
            expiryDate: '2026-12-31',
            audienceType: 'All',
            targetAudience: 'All Employees',
            views: 450,
            acknowledgements: 395,
            status: 'Published',
            pinned: true,
            deliveryChannels: ['Dashboard', 'Email', 'Push'],
            attachments: ['Hybrid_Guidelines_2026.pdf'],
            acknowledgedUsers: ['EMP-2026-002', 'EMP-2026-003'],
            comments: [
              { id: '1', user: 'Arjun Mehta', role: 'Developer', avatar: '', text: 'Are the core days mandatory for regional teams as well?', timestamp: '3 days ago' }
            ],
            likes: 56,
            likedBy: []
          },
          {
            id: 'ANN-003',
            title: 'Upcoming System Maintenance & Downtime Window',
            description: 'The core production databases and internal HR system will undergo maintenance on Saturday, June 6th, between 12:00 AM and 04:00 AM IST. All modules will be offline. Please save your sprint commits beforehand.',
            category: 'Emergency',
            priority: 'Critical',
            publishedBy: 'Aarav Sharma',
            publishedByRole: 'Admin',
            publishDate: '2026-06-02',
            expiryDate: '2026-06-07',
            audienceType: 'Department',
            targetAudience: 'Engineering',
            views: 180,
            acknowledgements: 165,
            status: 'Published',
            pinned: false,
            deliveryChannels: ['Dashboard', 'Push'],
            attachments: [],
            acknowledgedUsers: ['EMP-2026-001'],
            comments: [],
            likes: 12,
            likedBy: []
          },
          {
            id: 'ANN-004',
            title: 'Q2 Performance Bonus Distribution Schedule',
            description: 'Schedules for bonus dispersals have been confirmed. Financial payouts will be processed with the June 2026 monthly payroll cycle. Please review the criteria targets linked in the performance tracker portal.',
            category: 'HR',
            priority: 'High',
            publishedBy: 'Sophia Laurent',
            publishedByRole: 'HR Manager',
            publishDate: '2026-06-03',
            expiryDate: '2026-06-30',
            audienceType: 'All',
            targetAudience: 'All Employees',
            views: 289,
            acknowledgements: 210,
            status: 'Published',
            pinned: false,
            deliveryChannels: ['Dashboard', 'Email'],
            attachments: ['Bonus_Distribution_Criteria.xlsx'],
            acknowledgedUsers: [],
            comments: [],
            likes: 45,
            likedBy: []
          },
          {
            id: 'ANN-005',
            title: 'Launch of Q3 Sales Kickoff Campaign',
            description: 'Next quarter sales roadmap and objectives kickoff scheduled for July 1st. Event details and guest speakers agenda details are attached.',
            category: 'Project',
            priority: 'Medium',
            publishedBy: 'Elena Rostova',
            publishedByRole: 'Department Manager',
            publishDate: '2026-06-15',
            expiryDate: '2026-07-02',
            audienceType: 'Department',
            targetAudience: 'Sales',
            views: 0,
            acknowledgements: 0,
            status: 'Scheduled',
            pinned: false,
            deliveryChannels: ['Dashboard'],
            attachments: ['Q3_Kickoff_Details.pdf'],
            acknowledgedUsers: [],
            comments: [],
            likes: 0,
            likedBy: []
          }
        ];
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
        const seedNotifications = [
          {
            id: 'NTF-001',
            type: 'payroll',
            title: 'Q2 Performance Appraisals Initiated',
            message: 'Annual performance evaluations for the second quarter are officially open. All managers must finalize feedback submissions.',
            time: '2 hours ago',
            read: true,
            category: 'HR',
            priority: 'High',
            recipientType: 'All Managers',
            sentBy: 'HR Manager',
            sentDate: '2026-06-02',
            deliveryStatus: 'Delivered',
            readStatus: 'Read',
            readTime: '2 hours ago',
            recipients: 45,
            delivered: 45,
            read: 42,
            failed: 0
          },
          {
            id: 'NTF-002',
            type: 'system',
            title: 'Production DB Offline Maintenance Warning',
            message: 'The primary PostgreSQL cluster will go offline for version upgrades on June 6th at 12:00 AM IST.',
            time: '1 hour ago',
            read: false,
            category: 'Emergency',
            priority: 'Critical',
            recipientType: 'Engineering Dept',
            sentBy: 'DevOps Lead',
            sentDate: '2026-06-03',
            deliveryStatus: 'Scheduled',
            readStatus: 'Unread',
            readTime: '—',
            recipients: 120,
            delivered: 0,
            read: 0,
            failed: 0
          },
          {
            id: 'NTF-003',
            type: 'task',
            title: 'SaaS Platform v3.0 Scope Finalization',
            message: 'The product specifications for the v3.0 releases have been approved. All stakeholders must sign off by end of day.',
            time: '1 day ago',
            read: true,
            category: 'Project',
            priority: 'Medium',
            recipientType: 'Product Team',
            sentBy: 'Product Director',
            sentDate: '2026-06-01',
            deliveryStatus: 'Delivered',
            readStatus: 'Read',
            readTime: '1 day ago',
            recipients: 18,
            delivered: 18,
            read: 18,
            failed: 0
          },
          {
            id: 'NTF-004',
            type: 'system',
            title: 'Jaipur Office Reopening & Hybrid Schedule',
            message: 'The physical workspace renovation is complete. Jaipur workspace report core days are Tuesdays and Thursdays.',
            time: '3 days ago',
            read: true,
            category: 'Company',
            priority: 'Normal',
            recipientType: 'Jaipur Branch',
            sentBy: 'Ops Manager',
            sentDate: '2026-05-28',
            deliveryStatus: 'Delivered',
            readStatus: 'Read',
            readTime: '3 days ago',
            recipients: 88,
            delivered: 86,
            read: 75,
            failed: 2
          },
          {
            id: 'NTF-005',
            type: 'payroll',
            title: 'Annual Healthcare Policy Renewal Update',
            message: 'Insurance cards have been updated for all enrolled employees. Please download the new health cards from your profile.',
            time: '5 days ago',
            read: true,
            category: 'HR',
            priority: 'Normal',
            recipientType: 'All Employees',
            sentBy: 'Benefits Specialist',
            sentDate: '2026-05-25',
            deliveryStatus: 'Delivered',
            readStatus: 'Read',
            readTime: '5 days ago',
            recipients: 320,
            delivered: 318,
            read: 290,
            failed: 2
          },
          {
            id: 'NTF-006',
            type: 'security',
            title: 'Critical Bug Alert in Client Payment Gateway',
            message: 'Stripe webhook exceptions detected in production. Payouts for June 3rd are temporarily suspended.',
            time: '3 hours ago',
            read: false,
            category: 'Emergency',
            priority: 'Critical',
            recipientType: 'Billing & QA',
            sentBy: 'CTO Office',
            sentDate: '2026-06-04',
            deliveryStatus: 'Delivered',
            readStatus: 'Unread',
            readTime: '—',
            recipients: 12,
            delivered: 10,
            read: 8,
            failed: 2
          },
          {
            id: 'NTF-007',
            type: 'other',
            title: 'Summer Hackathon 2026 Registrations Open',
            message: 'Form your teams and submit pitches for the annual summer hackathon. Grand prize includes ₹5,00,000 cash rewards.',
            time: '2 days ago',
            read: true,
            category: 'Event',
            priority: 'Normal',
            recipientType: 'All Employees',
            sentBy: 'Culture Committee',
            sentDate: '2026-06-01',
            deliveryStatus: 'Delivered',
            readStatus: 'Read',
            readTime: '2 days ago',
            recipients: 320,
            delivered: 320,
            read: 145,
            failed: 0
          },
          {
            id: 'NTF-008',
            type: 'security',
            title: 'Mandatory ISO Security Compliance Audit',
            message: 'All employees must finish the cybersecurity awareness test. Access credentials will be restricted after June 15th.',
            time: '12 hours ago',
            read: false,
            category: 'Emergency',
            priority: 'Critical',
            recipientType: 'All Employees',
            sentBy: 'IT Compliance',
            sentDate: '2026-06-03',
            deliveryStatus: 'Delivered',
            readStatus: 'Unread',
            readTime: '—',
            recipients: 320,
            delivered: 319,
            read: 205,
            failed: 1
          },
          {
            id: 'NTF-009',
            type: 'task',
            title: 'Client Meeting: AWS Cloud Strategy Review',
            message: 'AWS representatives will present cloud optimization options tomorrow at 3:00 PM in Conference Room A.',
            time: '5 hours ago',
            read: true,
            category: 'Project',
            priority: 'Medium',
            recipientType: 'Infrastructure Lead',
            sentBy: 'Rahul Sharma',
            sentDate: '2026-06-03',
            deliveryStatus: 'Delivered',
            readStatus: 'Read',
            readTime: '5 hours ago',
            recipients: 5,
            delivered: 5,
            read: 5,
            failed: 0
          },
          {
            id: 'NTF-010',
            type: 'payroll',
            title: 'Bonus Distribution Schedule Confirmation',
            message: 'Q2 Performance Incentives have been disbursed to accounts. Summary slips are available in the Payroll section.',
            time: '4 days ago',
            read: true,
            category: 'HR',
            priority: 'High',
            recipientType: 'All Employees',
            sentBy: 'Finance Ops',
            sentDate: '2026-05-30',
            deliveryStatus: 'Delivered',
            readStatus: 'Read',
            readTime: '4 days ago',
            recipients: 320,
            delivered: 317,
            read: 310,
            failed: 3
          }
        ];
        await Notification.create(seedNotifications);
        logger.info('Notifications seeded successfully.');
      }

      // Ensure initial documents exist
      const documentCount = await Document.countDocuments();
      if (documentCount === 0) {
        logger.info('Documents collection is empty. Seeding initial documents...');
        const seedDocuments = [
          {
            id: 'DOC-001',
            name: 'Employee Handbook 2026.pdf',
            type: 'PDF',
            size: '2.4 MB',
            category: 'HR Policies',
            uploadedBy: 'Sophia Laurent',
            uploadDate: '2026-05-01',
            downloads: 23,
            fileUrl: ''
          },
          {
            id: 'DOC-002',
            name: 'Remote Work Policy v2.pdf',
            type: 'PDF',
            size: '890 KB',
            category: 'HR Policies',
            uploadedBy: 'Sophia Laurent',
            uploadDate: '2026-05-26',
            downloads: 38,
            fileUrl: ''
          },
          {
            id: 'DOC-003',
            name: 'Q2 Payroll Summary.xlsx',
            type: 'XLSX',
            size: '1.1 MB',
            category: 'Payroll',
            uploadedBy: 'Sarah Connor',
            uploadDate: '2026-05-29',
            downloads: 5,
            fileUrl: ''
          },
          {
            id: 'DOC-004',
            name: 'Brand Logo Pack.zip',
            type: 'ZIP',
            size: '14.2 MB',
            category: 'Marketing',
            uploadedBy: 'Aiko Tanaka',
            uploadDate: '2026-05-20',
            downloads: 12,
            fileUrl: ''
          },
          {
            id: 'DOC-005',
            name: 'System Architecture Diagram.png',
            type: 'PNG',
            size: '3.8 MB',
            category: 'Engineering',
            uploadedBy: 'Elena Rostova',
            uploadDate: '2026-05-15',
            downloads: 9,
            fileUrl: ''
          },
          {
            id: 'DOC-006',
            name: 'Q2 Sales Performance Report.pdf',
            type: 'PDF',
            size: '1.6 MB',
            category: 'Reports',
            uploadedBy: 'Marcus Vance',
            uploadDate: '2026-05-28',
            downloads: 7,
            fileUrl: ''
          },
          {
            id: 'DOC-007',
            name: 'GDPR Compliance Audit 2026.docx',
            type: 'DOCX',
            size: '540 KB',
            category: 'Compliance',
            uploadedBy: 'Sarah Connor',
            uploadDate: '2026-04-30',
            downloads: 4,
            fileUrl: ''
          },
          {
            id: 'DOC-008',
            name: 'Sprint Review Presentation.pptx',
            type: 'PPTX',
            size: '5.2 MB',
            category: 'Engineering',
            uploadedBy: 'Elena Rostova',
            uploadDate: '2026-05-22',
            downloads: 11,
            fileUrl: ''
          }
        ];
        await Document.create(seedDocuments);
        logger.info('Documents seeded successfully.');
      }

      // Ensure tracking logs exist
      const trackingLogCount = await AnnouncementTrackingLog.countDocuments();
      if (trackingLogCount === 0) {
        const seedTrackingLogs = [
          { id: 'TRK-1', announcementId: 'ANN-001', employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', department: 'Operations', viewTime: '2026-06-04 10:15', readStatus: 'Viewed', ackStatus: 'Acknowledged', device: 'Chrome / Windows 11' },
          { id: 'TRK-2', announcementId: 'ANN-001', employeeId: 'EMP-2026-002', employeeName: 'Vikram Singh', department: 'Engineering', viewTime: '2026-06-04 09:30', readStatus: 'Viewed', ackStatus: 'Acknowledged', device: 'Safari / macOS' },
          { id: 'TRK-3', announcementId: 'ANN-001', employeeId: 'EMP-2026-003', employeeName: 'Ananya Gupta', department: 'Engineering', viewTime: '2026-06-04 11:05', readStatus: 'Viewed', ackStatus: 'Acknowledged', device: 'Chrome / Linux' },
          { id: 'TRK-4', announcementId: 'ANN-001', employeeId: 'EMP-2026-004', employeeName: 'Rohit Sharma', department: 'Sales', viewTime: '—', readStatus: 'Not Viewed', ackStatus: 'Pending', device: '—' },
          { id: 'TRK-5', announcementId: 'ANN-001', employeeId: 'EMP-2026-005', employeeName: 'Priya Patel', department: 'Marketing', viewTime: '2026-06-03 16:45', readStatus: 'Viewed', ackStatus: 'Pending', device: 'iOS App' },
          { id: 'TRK-6', announcementId: 'ANN-001', employeeId: 'EMP-2026-006', employeeName: 'Arjun Mehta', department: 'Engineering', viewTime: '—', readStatus: 'Not Viewed', ackStatus: 'Pending', device: '—' }
        ];
        await AnnouncementTrackingLog.create(seedTrackingLogs);
        logger.info('Announcement tracking logs seeded successfully.');
      }

      // Ensure audit logs exist
      const auditLogCount = await AnnouncementAuditLog.countDocuments();
      if (auditLogCount === 0) {
        const seedAuditLogs = [
          { id: 'COMM-001', user: 'Sarah Connor', action: 'Created Announcement - Townhall Meeting', timestamp: '2026-05-28 14:30', prevVal: 'None', newVal: 'ANN-001' },
          { id: 'COMM-002', user: 'Sophia Laurent', action: 'Published Policy - Remote Work Guidelines', timestamp: '2026-05-30 10:00', prevVal: 'Draft', newVal: 'ANN-002 (Critical)' },
          { id: 'COMM-003', user: 'Aarav Sharma', action: 'Scheduled Announcement - Q3 Kickoff', timestamp: '2026-06-01 11:15', prevVal: 'Draft', newVal: 'ANN-005 Scheduled' },
          { id: 'COMM-004', user: 'Sophia Laurent', action: 'Triggered Emergency Banner - Bangalore Rain', timestamp: '2026-06-04 07:15', prevVal: 'None', newVal: 'Active Banner' }
        ];
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
        const seedOverrides = [
          { id: 'OVR-001', userId: 'EMP-2026-003', userName: 'Ananya Gupta', module: 'Payroll Management', scope: 'Read & Write', type: 'Temporary Grant', expiry: '2026-06-30' },
          { id: 'OVR-002', userId: 'EMP-2026-004', userName: 'Rohit Sharma', module: 'Role & Permission', scope: 'None (Restricted)', type: 'Explicit Denial', expiry: 'Permanent' },
          { id: 'OVR-003', userId: 'EMP-2026-006', userName: 'Arjun Mehta', module: 'Security Control', scope: 'Read Only', type: 'Special Waiver', expiry: '2026-07-15' },
          { id: 'OVR-004', userId: 'EMP-2026-007', userName: 'Neha Verma', module: 'System Configuration', scope: 'Full Access', type: 'Temporary Grant', expiry: '2026-06-15' }
        ];
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
        const seedGoals = [
          {
            id: 'GOAL-001',
            title: 'Optimize Core Recharts Gradients',
            description: 'Improve chart rendering performance and refactor linear-gradient layouts.',
            type: 'Project',
            startDate: '2026-05-20',
            dueDate: '2026-06-15',
            targetValue: 100,
            currentProgress: 85,
            status: 'In Progress',
            assignee: 'Vikram Singh',
            department: 'Engineering'
          },
          {
            id: 'GOAL-002',
            title: 'Reduce Server Latency by 20%',
            description: 'Optimize indexing schemes and configure query caching profiles.',
            type: 'Department',
            startDate: '2026-05-01',
            dueDate: '2026-06-30',
            targetValue: 100,
            currentProgress: 60,
            status: 'In Progress',
            assignee: 'Divya Singh',
            department: 'IT'
          },
          {
            id: 'GOAL-003',
            title: 'Publish Brand Guidelines v2',
            description: 'Export structured CSS variables, font families and high quality dark mode icons.',
            type: 'Team',
            startDate: '2026-04-10',
            dueDate: '2026-05-31',
            targetValue: 100,
            currentProgress: 100,
            status: 'Completed',
            assignee: 'Rajesh Kumar',
            department: 'Marketing'
          }
        ];
        await Goal.create(seedGoals);
        logger.info('performance_goals seeded successfully.');
      }

      // Ensure initial PIPs exist
      const pipCount = await Pip.countDocuments();
      if (pipCount === 0) {
        logger.info('performance_pips collection is empty. Seeding initial records...');
        const seedPips = [
          {
            id: 'PIP-001',
            employeeName: 'Amit Bose',
            issuesIdentified: 'Low productivity score (53%), high task backlog, and delayed milestones on outreach plans.',
            improvementTargets: 'Close at least 25 client tickets weekly and maintain a productivity score above 75%.',
            reviewPeriod: '30 Days (Jun 1 - Jun 30)',
            actionPlan: 'Daily standup check-ins with sales leader and weekly review syncs with department head.',
            status: 'Active',
            reviewer: 'Aarav Sharma',
            dateCreated: '2026-06-01'
          }
        ];
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
        const seedIpBlocklist = [
          { id: 'BLK-001', ipAddress: '198.51.100.72', reason: 'Failed Login Limit Exceeded', blockDate: '2026-06-05 09:14', attempts: 12, blockedBy: 'Auth Gate' },
          { id: 'BLK-002', ipAddress: '203.0.113.88', reason: 'Suspicious Bot Behavior Detected', blockDate: '2026-06-04 18:22', attempts: 45, blockedBy: 'WAF Console' },
          { id: 'BLK-003', ipAddress: '45.227.254.12', reason: 'Brute Force Attempt on Admin Route', blockDate: '2026-06-03 23:40', attempts: 98, blockedBy: 'Super Admin' }
        ];
        await IpBlocklist.create(seedIpBlocklist);
        logger.info('IpBlocklist seeded successfully.');
      }

      // Ensure user devices exist
      const deviceCount = await UserDevice.countDocuments();
      if (deviceCount === 0) {
        logger.info('UserDevice collection is empty. Seeding initial records...');
        const seedUserDevices = [
          { id: 'DEV-001', name: 'Aarav Macbook Pro', type: 'Laptop', browser: 'Chrome', os: 'macOS', registeredBy: 'Aarav Sharma', regDate: '2026-04-12', lastLogin: '2026-06-05 11:20', status: 'Active' },
          { id: 'DEV-002', name: 'Divya HP EliteBook', type: 'Laptop', browser: 'Edge', os: 'Windows', registeredBy: 'Divya Singh', regDate: '2026-04-15', lastLogin: '2026-06-05 10:45', status: 'Active' },
          { id: 'DEV-003', name: 'Sanjay iPhone 15', type: 'Mobile', browser: 'Safari', os: 'iOS', registeredBy: 'Sanjay Gupta', regDate: '2026-05-02', lastLogin: '2026-06-05 09:10', status: 'Active' },
          { id: 'DEV-004', name: 'Meena Tablet Pro', type: 'Tablet', browser: 'Chrome', os: 'Android', registeredBy: 'Meena Sharma', regDate: '2026-05-20', lastLogin: '2026-06-04 15:30', status: 'Blocked' },
          { id: 'DEV-005', name: 'Unknown Windows Client', type: 'Desktop', browser: 'Firefox', os: 'Windows', registeredBy: 'Ravi Yadav', regDate: '2026-06-01', lastLogin: '2026-06-05 08:00', status: 'Pending' }
        ];
        await UserDevice.create(seedUserDevices);
        logger.info('UserDevice seeded successfully.');
      }

      // Ensure active sessions exist
      const sessionCount = await UserSession.countDocuments();
      if (sessionCount === 0) {
        logger.info('UserSession collection is empty. Seeding initial records...');
        const seedUserSessions = [
          { id: 'SES-001', employeeName: 'Aarav Sharma', employeeId: 'EMP-2026-001', role: 'Super Admin', loginTime: '2026-06-05 08:30', lastActivity: '2026-06-05 11:58', duration: '3h 28m', deviceType: 'Laptop', browser: 'Chrome', os: 'macOS', ipAddress: '192.168.1.50', location: 'Jaipur, India', status: 'Active' },
          { id: 'SES-002', employeeName: 'Divya Singh', employeeId: 'EMP-2026-002', role: 'Super Admin', loginTime: '2026-06-05 09:15', lastActivity: '2026-06-05 11:55', duration: '2h 40m', deviceType: 'Laptop', browser: 'Edge', os: 'Windows', ipAddress: '192.168.1.120', location: 'Jaipur, India', status: 'Active' },
          { id: 'SES-003', employeeName: 'Sanjay Gupta', employeeId: 'EMP-2026-003', role: 'Branch Admin', loginTime: '2026-06-05 09:00', lastActivity: '2026-06-05 11:30', duration: '2h 55m', deviceType: 'Mobile', browser: 'Safari', os: 'iOS', ipAddress: '10.8.0.45', location: 'Mumbai, India', status: 'Idle' },
          { id: 'SES-004', employeeName: 'Ananya Gupta', employeeId: 'EMP-2026-004', role: 'Team Leader', loginTime: '2026-06-05 10:00', lastActivity: '2026-06-05 11:50', duration: '1h 50m', deviceType: 'Laptop', browser: 'Chrome', os: 'Linux', ipAddress: '172.16.2.10', location: 'Delhi, India', status: 'Active' },
          { id: 'SES-005', employeeName: 'Ravi Yadav', employeeId: 'EMP-2026-005', role: 'Employee', loginTime: '2026-06-05 10:15', lastActivity: '2026-06-05 10:45', duration: '30m', deviceType: 'Desktop', browser: 'Firefox', os: 'Windows', ipAddress: '192.168.12.8', location: 'Delhi, India', status: 'Idle' }
        ];
        await UserSession.create(seedUserSessions);
        logger.info('UserSession seeded successfully.');
      }

      // Ensure security alerts exist
      const alertCount = await SecurityAlert.countDocuments();
      if (alertCount === 0) {
        logger.info('SecurityAlert collection is empty. Seeding initial records...');
        const seedSecurityAlerts = [
          { id: 'ALT-101', timestamp: '2026-06-05 11:42', severity: 'Critical', alertType: 'Multiple Failed Logins', description: 'User Sanjay Gupta attempted login 8 times with incorrect credentials', user: 'Sanjay Gupta', ipAddress: '198.51.100.72', location: 'Beijing, China', status: 'New' },
          { id: 'ALT-102', timestamp: '2026-06-05 11:15', severity: 'High', alertType: 'Suspicious Location Login', description: 'Access granted to Aarav Sharma from an unrecognized IP range', user: 'Aarav Sharma', ipAddress: '203.0.113.88', location: 'London, UK', status: 'Investigating' },
          { id: 'ALT-103', timestamp: '2026-06-05 10:05', severity: 'Medium', alertType: 'Data Export Attempt', description: 'Employee Meena Sharma attempted to export salary records of 45+ users', user: 'Meena Sharma', ipAddress: '192.168.1.135', location: 'Jaipur, India', status: 'New' },
          { id: 'ALT-104', timestamp: '2026-06-04 17:30', severity: 'Low', alertType: 'New Device Login', description: 'Ravi Yadav logged in from new device: Unknown Windows Client', user: 'Ravi Yadav', ipAddress: '192.168.12.8', location: 'Delhi, India', status: 'Resolved' },
          { id: 'ALT-105', timestamp: '2026-06-04 14:20', severity: 'High', alertType: 'Permission Changed', description: 'Super Admin changed permissions for Branch Admin role', user: 'Divya Singh', ipAddress: '192.168.1.120', location: 'Jaipur, India', status: 'Resolved' }
        ];
        await SecurityAlert.create(seedSecurityAlerts);
        logger.info('SecurityAlert seeded successfully.');
      }

      // Ensure activity logs exist
      const activityLogCount = await ActivityLog.countDocuments();
      if (activityLogCount === 0) {
        logger.info('ActivityLog collection is empty. Seeding initial records...');
        const seedActivityLogs = [
          { id: 'ACT-001', timestamp: '2026-06-05 11:55', actor: 'Divya Singh', actionType: 'Permission Change', fieldChanged: 'Security', oldValue: 'Optional', newValue: 'Required', ip: '192.168.1.120' },
          { id: 'ACT-002', timestamp: '2026-06-05 11:42', actor: 'Sanjay Gupta', actionType: 'Failed Login', fieldChanged: 'Authentication', oldValue: '—', newValue: '—', ip: '198.51.100.72' },
          { id: 'ACT-003', timestamp: '2026-06-05 11:20', actor: 'Aarav Sharma', actionType: 'Login', fieldChanged: 'Authentication', oldValue: '—', newValue: '—', ip: '203.0.113.88' },
          { id: 'ACT-004', timestamp: '2026-06-05 10:15', actor: 'Ananya Gupta', actionType: 'Update', fieldChanged: 'Task', oldValue: 'In Progress', newValue: 'Completed', ip: '172.16.2.10' }
        ];
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
