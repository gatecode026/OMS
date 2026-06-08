/**
 * @file src/modules/payroll/payroll.routes.js
 * @description Routes for modular Payroll system.
 */

import express from 'express';
import controller from './payroll.controller.js';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Secured routes boundary
router.use(authenticate);

// 1. Fetch master state
router.get('/all', controller.getMasterData);

// 2. Grades endpoints
router.post('/grades', controller.saveSalaryGrade);
router.delete('/grades/:id', controller.deleteSalaryGrade);

// 3. Loans & Advances
router.post('/loans-advances', controller.createLoanAdvance);

// 4. Bonuses & Incentives
router.post('/bonuses', controller.recommendBonus);
router.post('/bonuses/status/:id', controller.updateBonusStatus);

// 5. Reimbursements
router.post('/reimbursements/status/:id', controller.updateReimbursementStatus);

// 6. Monthly processed payments
router.post('/payments', controller.saveMonthlyPayment);
router.post('/payments/bulk-status', controller.bulkUpdatePaymentStatus);
router.put('/payments/:empId', controller.updatePaymentStatus);

// 7. Global penalities and maps
router.post('/configs', controller.saveGlobalConfigs);

export default router;
