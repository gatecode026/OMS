import { runWithTenant } from '../utils/tenantContext.js';

/**
 * Express middleware to propagate the tenant's companyId to AsyncLocalStorage
 */
export const tenantMiddleware = (req, res, next) => {
  // Extract tenant ID from authenticated user, header, or default
  const tenantId = req.user?.companyId || req.headers['x-tenant-id'] || 'COMP-DEFAULT';
  
  runWithTenant(tenantId, next);
};
