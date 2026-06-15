/**
 * @file src/scripts/cleanup-seeded-roles.js
 * @description Removes all seeded roles and permission modules for ALL shared companies.
 *              Called via HTTP endpoint POST /api/v1/companies/admin/cleanup-seeded-roles
 */

import mongoose from 'mongoose';
import Company from '../modules/companies/company.model.js';
import logger from '../config/logger.js';

export const cleanupSeededRoles = async () => {
  logger.info('[Cleanup] Starting removal of all seeded roles and permission modules...');

  const db = mongoose.connection.db;

  // Find all shared companies
  const companies = await Company.find({
    $or: [{ databaseType: 'shared' }, { databaseType: { $exists: false } }]
  }).lean();

  logger.info(`[Cleanup] Found ${companies.length} shared company/companies.`);

  let totalRolesDeleted = 0;
  let totalModulesDeleted = 0;

  for (const company of companies) {
    // Delete roles for this company
    const rolesResult = await db.collection('rbac_roles').deleteMany({ companyId: company.id });
    totalRolesDeleted += rolesResult.deletedCount;
    logger.info(`[Cleanup] Deleted ${rolesResult.deletedCount} roles for company ${company.id} (${company.name})`);

    // Delete permission modules for this company
    const modulesResult = await db.collection('permission_modules').deleteMany({ companyId: company.id });
    totalModulesDeleted += modulesResult.deletedCount;
    logger.info(`[Cleanup] Deleted ${modulesResult.deletedCount} permission modules for company ${company.id} (${company.name})`);
  }

  logger.info(`[Cleanup] Done. Total roles deleted: ${totalRolesDeleted}, Total modules deleted: ${totalModulesDeleted}`);

  return {
    companies: companies.length,
    totalRolesDeleted,
    totalModulesDeleted
  };
};

export default cleanupSeededRoles;
