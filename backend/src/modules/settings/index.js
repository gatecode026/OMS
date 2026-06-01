/**
 * @file src/modules/settings/index.js
 * @description Entry index for exports of Settings module.
 */

import router from './settings.routes.js';
import controller from './settings.controller.js';
import service from './settings.service.js';
import repository from './settings.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
