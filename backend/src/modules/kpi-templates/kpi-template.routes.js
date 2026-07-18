/**
 * @file src/modules/kpi-templates/kpi-template.routes.js
 * @description API Routes for KPI Templates.
 */

import express from 'express';
import controller from './kpi-template.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(controller.getTemplates)
  .post(controller.postTemplate);

router.route('/:id')
  .get(controller.getTemplateById)
  .put(controller.putTemplate)
  .delete(controller.deleteTemplate);

router.route('/:id/publish')
  .post(controller.postPublish);

router.route('/:id/new-version')
  .post(controller.postNewVersion);

router.route('/:id/archive')
  .post(controller.postArchive);

export default router;
