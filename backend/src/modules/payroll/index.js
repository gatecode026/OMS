/**
 * @file src/modules/payroll/index.js
 * @description Entry index for exports of Payroll module.
 */

import router from './payroll.routes.js';
import controller from './payroll.controller.js';
import service from './payroll.service.js';
import repository from './payroll.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
