/**
 * @file src/modules/projects/index.js
 * @description Entry index for exports of Projects module.
 */

import router from './projects.routes.js';
import controller from './projects.controller.js';
import service from './projects.service.js';
import repository from './projects.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
