/**
 * @file src/modules/notifications/index.js
 * @description Entry index for exports of Notifications module.
 */

import router from './notifications.routes.js';
import controller from './notifications.controller.js';
import service from './notifications.service.js';
import repository from './notifications.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
