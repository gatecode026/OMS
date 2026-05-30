/**
 * @file src/modules/documents/index.js
 * @description Entry index for exports of Documents module.
 */

import router from './documents.routes.js';
import controller from './documents.controller.js';
import service from './documents.service.js';
import repository from './documents.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
