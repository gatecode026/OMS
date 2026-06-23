/**
 * @file src/modules/chat/routes/searchRoutes.js
 * @description Express router for global chat search.
 */

import express from 'express';
import * as searchController from '../controllers/searchController.js';

const router = express.Router();

// Base GET route for /api/v1/chat/search
router.get('/', searchController.globalSearch);

export default router;
