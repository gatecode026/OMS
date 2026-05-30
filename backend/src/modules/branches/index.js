/**
 * @file src/modules/branches/index.js
 * @description Entry index for exports of Branches module.
 */

import router from './branches.routes.js';
import controller from './branches.controller.js';
import service from './branches.service.js';
import repository from './branches.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
