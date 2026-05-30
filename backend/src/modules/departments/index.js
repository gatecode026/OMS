/**
 * @file src/modules/departments/index.js
 * @description Entry index for exports of Departments module.
 */

import router from './departments.routes.js';
import controller from './departments.controller.js';
import service from './departments.service.js';
import repository from './departments.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
