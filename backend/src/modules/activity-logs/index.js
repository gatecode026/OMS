/**
 * @file src/modules/activity-logs/index.js
 * @description Entry index for exports of ActivityLogs module.
 */

import router from './activity-logs.routes.js';
import controller from './activity-logs.controller.js';
import service from './activity-logs.service.js';
import repository from './activity-logs.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
