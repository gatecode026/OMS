/**
 * @file src/modules/auth/auth.routes.js
 * @description Routes for Auth module.
 */

import express from 'express';
import controller from './auth.controller.js';

const router = express.Router();

// Public authentication endpoint
router.post('/login', controller.login);

export default router;
