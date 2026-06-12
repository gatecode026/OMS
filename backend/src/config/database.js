import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);
import bcrypt from 'bcryptjs';
import env from './env.js';
import logger from './logger.js';
import Admin from '../modules/admin/admin.model.js';
import { PayrollConfig } from '../modules/payroll/payroll.model.js';
import SystemSettings from '../modules/settings/settings.model.js';

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

      // Initialize clean SystemSettings if not present
      const systemSettingsCount = await SystemSettings.countDocuments();
      if (systemSettingsCount === 0) {
        logger.info('system_settings collection is empty. Seeding default global settings...');
        await SystemSettings.create({ key: 'global' });
        logger.info('Global system settings seeded successfully.');
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
