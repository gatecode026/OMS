/**
 * @file src/modules/payroll-queries/index.js
 * @description Entry index for exports of Payroll Queries module.
 */

import router from './payroll-query.routes.js';
import * as controller from './payroll-query.controller.js';
import * as service from './payroll-query.service.js';
import * as repository from './payroll-query.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
