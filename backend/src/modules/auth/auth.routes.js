import express from 'express';
import controller from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public authentication endpoint
router.post('/login', controller.login);

// Silent refresh endpoint
router.post('/refresh', authenticate, controller.refreshToken);

export default router;
