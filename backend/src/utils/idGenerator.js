/**
 * @file src/utils/idGenerator.js
 * @description Reusable company-wise unique sequential ID generator.
 */

import Counter from '../modules/counters/counter.model.js';
import Company from '../modules/companies/company.model.js';
import logger from '../config/logger.js';

/**
 * Generates a company-wise unique code (e.g. ABC-EMP-001) for a given module.
 * @param {string} companyId - Tenant company identifier.
 * @param {string} module - Target module name (e.g., 'employees', 'departments').
 * @returns {Promise<string>} The generated unique code.
 */
export const generateCompanyUniqueId = async (companyId, module) => {
  const resolvedCompanyId = companyId || 'COMP-DEFAULT';
  
  // Resolve company code, falling back to subdomain uppercase
  const company = await Company.findOne({ id: resolvedCompanyId });
  const code = company?.companyCode || company?.subdomain?.toUpperCase() || resolvedCompanyId.replace('COMP-', '');

  // Define module prefixes
  const prefixes = {
    employees: 'EMP',
    departments: 'DEPT',
    branches: 'BR',
    projects: 'PRJ',
    leaves: 'LV',
    payroll: 'PAY',
    teams: 'TM',
    tasks: 'TSK'
  };
  
  const prefix = prefixes[module.toLowerCase()] || module.toUpperCase();

  // Atomically find and increment the sequence counter
  const counter = await Counter.findOneAndUpdate(
    { companyId: resolvedCompanyId, module: module.toLowerCase() },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  const uniqueCode = `${code}-${prefix}-${String(counter.sequence).padStart(3, '0')}`;
  logger.info(`idGenerator::generateCompanyUniqueId generated unique code: ${uniqueCode} for company: ${resolvedCompanyId}`);
  return uniqueCode;
};

export default generateCompanyUniqueId;
