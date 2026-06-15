/**
 * @file src/migrations/migrationRunner.js
 * @description Tenant database migration runner supporting version tracking, execution logging, and rollbacks.
 */

import mongoose from 'mongoose';
import Company from '../modules/companies/company.model.js';
import connectionManager from '../database/connectionManager.js';
import logger from '../config/logger.js';

// Schema for tracking migrations in each tenant database
const tenantMigrationSchema = new mongoose.Schema({
  version: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  executedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['success', 'failed'], required: true },
  error: { type: String, default: null }
}, {
  timestamps: true,
  collection: 'migrations'
});

/**
 * Registry of system migrations. Each migration contains a version, name, up(), and down() functions.
 */
export const migrationsRegistry = [
  {
    version: 1,
    name: 'initialize_indexes',
    up: async (dbConnection) => {
      logger.info('[Migration 1] Ensuring indexes on all essential collections');
      const models = ['Employee', 'Role', 'PermissionModule', 'SystemSettings'];
      for (const modelName of models) {
        const model = dbConnection.models[modelName] || dbConnection.model(modelName);
        if (model) {
          await model.ensureIndexes();
        }
      }
    },
    down: async (dbConnection) => {
      logger.info('[Migration 1 Rollback] Dropping indexes (no-op for safety)');
    }
  }
];

/**
 * Runs pending migrations for a single tenant database connection.
 */
export const runMigrationsForTenant = async (tenantId) => {
  logger.info(`[Migrations] Starting migrations check for tenant: ${tenantId}`);
  const connection = await connectionManager.getTenantConnection(tenantId);
  
  if (connection === mongoose.connection) {
    logger.info(`[Migrations] Tenant ${tenantId} is on shared database, skipping dedicated migrations.`);
    return;
  }

  const MigrationModel = connection.models.Migration || connection.model('Migration', tenantMigrationSchema);
  
  // Fetch already executed migrations
  const executed = await MigrationModel.find({ status: 'success' }).sort({ version: 1 }).lean();
  const executedVersions = new Set(executed.map(m => m.version));

  for (const migration of migrationsRegistry) {
    if (executedVersions.has(migration.version)) {
      continue;
    }

    logger.info(`[Migrations] Running migration v${migration.version}: ${migration.name} for tenant ${tenantId}`);
    try {
      await migration.up(connection);
      await MigrationModel.create({
        version: migration.version,
        name: migration.name,
        status: 'success'
      });
      logger.info(`[Migrations] Successfully executed migration v${migration.version} for tenant ${tenantId}`);
    } catch (err) {
      logger.error(`[Migrations] Failed migration v${migration.version} for tenant ${tenantId}:`, err);
      await MigrationModel.create({
        version: migration.version,
        name: migration.name,
        status: 'failed',
        error: err.message
      });
      throw err; // Stop executing further migrations on failure
    }
  }
};

/**
 * Rolls back the latest executed migration for a tenant.
 */
export const rollbackLatestMigrationForTenant = async (tenantId) => {
  logger.info(`[Migrations] Starting rollback check for tenant: ${tenantId}`);
  const connection = await connectionManager.getTenantConnection(tenantId);
  
  if (connection === mongoose.connection) {
    return;
  }

  const MigrationModel = connection.models.Migration || connection.model('Migration', tenantMigrationSchema);
  const latest = await MigrationModel.findOne({ status: 'success' }).sort({ version: -1 });

  if (!latest) {
    logger.info(`[Migrations] No migrations found to rollback for tenant ${tenantId}`);
    return;
  }

  const migration = migrationsRegistry.find(m => m.version === latest.version);
  if (!migration) {
    throw new Error(`[Migrations] Registry does not contain migration code for version ${latest.version}`);
  }

  logger.info(`[Migrations] Rolling back migration v${migration.version}: ${migration.name} for tenant ${tenantId}`);
  try {
    await migration.down(connection);
    await MigrationModel.deleteOne({ _id: latest._id });
    logger.info(`[Migrations] Successfully rolled back migration v${migration.version} for tenant ${tenantId}`);
  } catch (err) {
    logger.error(`[Migrations] Failed to rollback migration v${migration.version} for tenant ${tenantId}:`, err);
    throw err;
  }
};

/**
 * Runs migrations across all active dedicated tenant databases in the registry.
 */
export const runAllTenantMigrations = async () => {
  logger.info('[Migrations] Commencing global tenant migrations run...');
  const dedicatedCompanies = await Company.find({ databaseType: 'dedicated', tenantStatus: 'active' });
  logger.info(`[Migrations] Found ${dedicatedCompanies.length} dedicated database tenants.`);

  for (const company of dedicatedCompanies) {
    try {
      await runMigrationsForTenant(company.id);
    } catch (err) {
      logger.error(`[Migrations] Global migration run halted at company ${company.name} due to error:`, err);
    }
  }
  logger.info('[Migrations] Global migrations run completed.');
};

export default {
  runMigrationsForTenant,
  rollbackLatestMigrationForTenant,
  runAllTenantMigrations,
  migrationsRegistry
};
