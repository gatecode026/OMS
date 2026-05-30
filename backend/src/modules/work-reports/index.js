/**
 * @file src/modules/work-reports/index.js
 * @description Entry index for exports of WorkReports module.
 */

import router from './work-reports.routes.js';
import controller from './work-reports.controller.js';
import service from './work-reports.service.js';
import repository from './work-reports.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
