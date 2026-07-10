/**
 * @file src/modules/attendance-corrections/index.js
 * @description Entry index for exports of Attendance Corrections module.
 */

import router from './attendance-correction.routes.js';
import controller from './attendance-correction.controller.js';
import service from './attendance-correction.service.js';
import repository from './attendance-correction.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
