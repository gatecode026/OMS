/**
 * @file src/modules/tasks/index.js
 * @description Entry index for exports of Tasks module.
 */

import router from './tasks.routes.js';
import controller from './tasks.controller.js';
import service from './tasks.service.js';
import repository from './tasks.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
