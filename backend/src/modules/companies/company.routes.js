import express from 'express';
import controller from './company.controller.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { runSharedMigration } from '../../scripts/run-migration-http.js';
import { cleanupSeededRoles } from '../../scripts/cleanup-seeded-roles.js';
import { successResponse } from '../../utils/response.js';

const router = express.Router();

router.route('/')
  .post(authenticate, restrictTo('super_admin'), controller.create)
  .get(authenticate, restrictTo('super_admin'), controller.getAll);

router.route('/:id')
  .get(authenticate, restrictTo('super_admin', 'company_admin'), controller.getById)
  .put(authenticate, restrictTo('super_admin', 'company_admin'), controller.update);

router.patch('/:id/status', authenticate, restrictTo('super_admin'), controller.setStatus);

/**
 * POST /api/v1/companies/admin/run-migration
 * Backfills default roles & permission modules for ALL shared-database companies.
 * Super Admin only. Safe to call multiple times (idempotent).
 */
router.post(
  '/admin/run-migration',
  authenticate,
  restrictTo('super_admin'),
  asyncHandler(async (req, res) => {
    const result = await runSharedMigration();
    return successResponse(
      res,
      result,
      `Migration completed. Seeded: ${result.seeded}, Skipped: ${result.skipped}`
    );
  })
);

/**
 * POST /api/v1/companies/admin/cleanup-seeded-roles
 * Removes all seeded roles and permission modules for all shared companies.
 * Super Admin only.
 */
router.post(
  '/admin/cleanup-seeded-roles',
  authenticate,
  restrictTo('super_admin'),
  asyncHandler(async (req, res) => {
    const result = await cleanupSeededRoles();
    return successResponse(
      res,
      result,
      `Cleanup done. Roles deleted: ${result.totalRolesDeleted}, Modules deleted: ${result.totalModulesDeleted}`
    );
  })
);

export default router;
