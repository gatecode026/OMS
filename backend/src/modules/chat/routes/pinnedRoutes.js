/**
 * @file src/modules/chat/routes/pinnedRoutes.js
 * @description Express router for pinned messages within a conversation.
 */

import express from 'express';
import * as pinnedController from '../controllers/pinnedController.js';

const router = express.Router();

// Route: GET /api/v1/chat/conversations/:conversationId/pinned
router.get('/:conversationId/pinned', pinnedController.getPinnedMessages);

export default router;
