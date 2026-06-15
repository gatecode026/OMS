/**
 * @file src/modules/admin/admin.routes.js
 * @description Route definition for Super Admin platform administration features.
 */

import express from 'express';
import { getCompanies, getCompanyUsage, createTenant, updateTenantStatus, updateTenant, getOverview } from './admin.controller.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Apply authentication and restrict to Super Admin role for all routes in this router
router.use(authenticate, restrictTo('super_admin'));

router.route('/companies')
  .get(getCompanies)
  .post(createTenant);

router.route('/companies/:id')
  .get(getCompanyUsage)
  .patch(updateTenant);

router.route('/companies/:id/status')
  .patch(updateTenantStatus);

router.route('/overview')
  .get(getOverview);

export default router;
