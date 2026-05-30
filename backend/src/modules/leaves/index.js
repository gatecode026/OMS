/**
 * @file src/modules/leaves/index.js
 * @description Entry index for exports of Leaves module.
 */

import router from './leaves.routes.js';
import controller from './leaves.controller.js';
import service from './leaves.service.js';
import repository from './leaves.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
