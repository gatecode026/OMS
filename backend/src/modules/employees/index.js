/**
 * @file src/modules/employees/index.js
 * @description Entry index for exports of Employees module.
 */

import router from './employees.routes.js';
import controller from './employees.controller.js';
import service from './employees.service.js';
import repository from './employees.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
