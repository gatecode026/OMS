/**
 * @file src/modules/auth/index.js
 * @description Entry index for exports of Auth module.
 */

import router from './auth.routes.js';
import controller from './auth.controller.js';
import service from './auth.service.js';
import repository from './auth.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
