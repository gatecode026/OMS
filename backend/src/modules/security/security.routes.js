/**
 * @file src/modules/security/security.routes.js
 * @description API Routes for Whitelists, Blocklists, Devices, Sessions, Alerts.
 */

import express from 'express';
import controller from './security.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Authenticate all routes
router.use(authenticate);

// IP Whitelist
router.route('/whitelist')
  .get(controller.getWhitelist)
  .post(controller.postWhitelist);

router.route('/whitelist/:id')
  .put(controller.putWhitelist)
  .delete(controller.deleteWhitelist);

// IP Blocklist
router.route('/blocklist')
  .get(controller.getBlocklist)
  .post(controller.postBlocklist);

router.route('/blocklist/:id')
  .delete(controller.deleteBlocklist);

// Devices
router.route('/devices')
  .get(controller.getDevices)
  .post(controller.postDevice);

router.route('/devices/:id')
  .put(controller.putDevice)
  .delete(controller.deleteDevice);

// Sessions
router.route('/sessions')
  .get(controller.getSessions)
  .post(controller.postSession);

router.route('/sessions/terminate-others')
  .post(controller.deleteSessionsExcept);

router.route('/sessions/:id')
  .delete(controller.deleteSession);

// Alerts
router.route('/alerts')
  .get(controller.getAlerts)
  .delete(controller.deleteAlerts);

router.route('/alerts/:id')
  .put(controller.putAlert);

export default router;
