/**
 * @file src/modules/workflows/index.js
 * @description Entry index for exports of Workflows module.
 */

import router from './workflows.routes.js';
import controller from './workflows.controller.js';
import service from './workflows.service.js';
import repository from './workflows.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
