/**
 * @file src/modules/attendance/index.js
 * @description Entry index for exports of Attendance module.
 */

import router from './attendance.routes.js';
import controller from './attendance.controller.js';
import service from './attendance.service.js';
import repository from './attendance.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
