import { runWithTenant } from '../utils/tenantContext.js';

/**
 * Express middleware to propagate the tenant's companyId to AsyncLocalStorage
 */
export const tenantMiddleware = (req, res, next) => {
  // 1. Skip tenant scoping for auth routes
  if (req.path.startsWith('/auth') || req.path.includes('/api/v1/auth') || req.path.includes('/api/auth')) {
    return next();
  }

  // 2. Extract tenant ID from authenticated user JWT payload
  let tenantId = req.user?.companyId;

  // 3. Super Admin privilege: If the actor is a Platform Super Admin, they can view specific tenant data
  // by passing an explicit companyId query parameter or custom header.
  const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.role === 'SuperAdmin';
  if (isSuperAdmin) {
    const explicitCompanyId = req.query.companyId || req.headers['x-tenant-id'];
    if (explicitCompanyId) {
      tenantId = explicitCompanyId;
    }
  }

  // Fallback to default tenant if none is resolved (e.g. for backward compatibility)
  if (!tenantId) {
    tenantId = 'COMP-DEFAULT';
  }

  // 4. Run the rest of request lifecycle inside the resolved tenant context
  runWithTenant(tenantId, next, isSuperAdmin);
};

export default tenantMiddleware;
