import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);
import bcrypt from 'bcryptjs';
import env from './env.js';
import logger from './logger.js';
import Admin from '../modules/admin/admin.model.js';
import Role from '../modules/roles/roles.model.js';

export let isDatabaseConnected = false;

export const database = {
  /**
   * Establishes a connection to MongoDB
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
        if (process.env.INITIAL_ADMIN_EMAIL && process.env.INITIAL_ADMIN_PASSWORD) {
          logger.info('Admins collection is empty. Initializing initial Super Admin from environment variables...');
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD, salt);

          await Admin.create({
            id: 'EMP-2026-001',
            name: process.env.INITIAL_ADMIN_NAME || 'Super Admin',
            email: process.env.INITIAL_ADMIN_EMAIL,
            phone: process.env.INITIAL_ADMIN_PHONE || '+91 98765 43210',
            role: 'Super Admin',
            roleId: 'super_admin',
            status: 'Active',
            password: hashedPassword
          });
          logger.info('Initial Super Admin created successfully from env variables.');
        } else {
          logger.warn('Admins collection is empty. Please create a Super Admin by running: npm run create-admin');
        }
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
            userCount: 1,
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
            userCount: 0,
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
            userCount: 0,
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
            userCount: 0,
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
            userCount: 0,
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
            userCount: 0,
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
