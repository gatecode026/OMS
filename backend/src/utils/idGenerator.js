/**
 * @file src/utils/idGenerator.js
 * @description Reusable company-wise unique sequential ID generator.
 *              Generates IDs scoped per company to prevent conflicts across tenants.
 */

import Counter from '../modules/counters/counter.model.js';
import Company from '../modules/companies/company.model.js';
import logger from '../config/logger.js';

const companyPrefixCache = new Map();

/**
 * Generates a company-wise unique code (e.g. ABC-EMP-001) for a given module.
 * @param {string} companyId - Tenant company identifier.
 * @param {string} module - Target module name (e.g., 'employees', 'departments').
 * @returns {Promise<string>} The generated unique code.
 */
export const generateCompanyUniqueId = async (companyId, module) => {
  const resolvedCompanyId = companyId || 'COMP-DEFAULT';
  
  // Resolve company code/prefix from cache or DB
  let code = companyPrefixCache.get(resolvedCompanyId);
  if (!code) {
    const company = await Company.findOne({ id: resolvedCompanyId });
    code = (
      company?.companyCode ||
      company?.subdomain?.toUpperCase() ||
      resolvedCompanyId.replace('COMP-', '').replace('-', '')
    ).slice(0, 6).toUpperCase(); // cap at 6 chars for clean IDs
    companyPrefixCache.set(resolvedCompanyId, code);
  }

  // Module → short prefix mapping
  const prefixes = {
    employees:    'EMP',
    departments:  'DEPT',
    branches:     'BR',
    projects:     'PRJ',
    leaves:       'LV',
    payroll:      'PAY',
    teams:        'TM',
    tasks:        'TSK',
    attendance:   'ATT',
    documents:    'DOC',
    notifications:'NTFY',
    workflows:    'WF',
    events:       'EVT',
    announcements:'ANN',
    holidays:     'HOL',
    goals:        'GOAL',
    reviews:      'REV'
  };
  
  const prefix = prefixes[module.toLowerCase()] || module.toUpperCase().slice(0, 4);

  // Atomically find and increment the sequence counter (per company + per module)
  const counter = await Counter.findOneAndUpdate(
    { companyId: resolvedCompanyId, module: module.toLowerCase() },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  // Format: CODE-PREFIX-001  (e.g., TWOO-EMP-001, DEFAULT-EMP-002)
  const uniqueCode = `${code}-${prefix}-${String(counter.sequence).padStart(3, '0')}`;
  logger.info(`idGenerator::generateCompanyUniqueId => ${uniqueCode} [company: ${resolvedCompanyId}]`);
  return uniqueCode;
};

export default generateCompanyUniqueId;
