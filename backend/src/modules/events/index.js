/**
 * @file src/modules/events/index.js
 * @description Entry index for exports of Events / Meetings module.
 */

import router from './event.routes.js';
import controller from './event.controller.js';
import model from './event.model.js';

export {
  router,
  controller,
  model
};

export default router;
