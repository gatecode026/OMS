/**
 * @file src/utils/tenantRegistry.js
 * @description Master database lookup registry mapping user emails to tenant companyIds.
 */

import mongoose from 'mongoose';
import logger from '../config/logger.js';

// Schema for global email lookup
const tenantRegistrySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  companyId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true,
    enum: ['company_admin', 'employee']
  }
}, {
  timestamps: true,
  collection: 'tenant_registry'
});

// Register on default mongoose connection (master database)
export const TenantRegistry = mongoose.models.TenantRegistry || mongoose.model('TenantRegistry', tenantRegistrySchema);

/**
 * Registers an email mapping in the global tenant registry.
 */
export const registerTenantUser = async (email, companyId, role) => {
  if (!email) return;
  const normalizedEmail = email.toLowerCase().trim();
  try {
    logger.info(`[Registry] Registering user ${normalizedEmail} under company ${companyId} with role ${role}`);
    await TenantRegistry.findOneAndUpdate(
      { email: normalizedEmail },
      { companyId, role },
      { upsert: true, new: true }
    );
  } catch (err) {
    logger.error(`[Registry] Error registering user ${normalizedEmail}:`, err);
  }
};

/**
 * Unregisters an email mapping from the global registry.
 */
export const unregisterTenantUser = async (email) => {
  if (!email) return;
  const normalizedEmail = email.toLowerCase().trim();
  try {
    logger.info(`[Registry] Unregistering user ${normalizedEmail}`);
    await TenantRegistry.deleteOne({ email: normalizedEmail });
  } catch (err) {
    logger.error(`[Registry] Error unregistering user ${normalizedEmail}:`, err);
  }
};

/**
 * Updates a registered user's email address.
 */
export const updateTenantUserEmail = async (oldEmail, newEmail) => {
  if (!oldEmail || !newEmail) return;
  const normOld = oldEmail.toLowerCase().trim();
  const normNew = newEmail.toLowerCase().trim();
  try {
    logger.info(`[Registry] Updating user email from ${normOld} to ${normNew}`);
    const entry = await TenantRegistry.findOne({ email: normOld });
    if (entry) {
      await TenantRegistry.create({
        email: normNew,
        companyId: entry.companyId,
        role: entry.role
      });
      await TenantRegistry.deleteOne({ email: normOld });
    }
  } catch (err) {
    logger.error(`[Registry] Error updating email from ${normOld} to ${normNew}:`, err);
  }
};

/**
 * Resolves a companyId for a given email address.
 */
export const getTenantIdByEmail = async (email) => {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const entry = await TenantRegistry.findOne({ email: normalizedEmail });
    return entry ? entry.companyId : null;
  } catch (err) {
    logger.error(`[Registry] Error querying registry for ${normalizedEmail}:`, err);
    return null;
  }
};

export default {
  TenantRegistry,
  registerTenantUser,
  unregisterTenantUser,
  updateTenantUserEmail,
  getTenantIdByEmail
};
