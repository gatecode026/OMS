/**
 * @file src/modules/teams/index.js
 * @description Entry index for exports of Teams module.
 */

import router from './teams.routes.js';
import controller from './teams.controller.js';
import service from './teams.service.js';
import repository from './teams.repository.js';

export {
  router,
  controller,
  service,
  repository
};

export default router;
