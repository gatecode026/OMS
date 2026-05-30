/**
 * @file src/modules/roles/index.js
 * @description Entry index for exports of Roles module.
 */

import router from './roles.routes.js';
import controller from './roles.controller.js';
import service from './roles.service.js';
import repository from './roles.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
