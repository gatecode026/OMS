/**
 * @file src/modules/chat/routes/pinnedRoutes.js
 * @description Express router for pinned messages within a conversation.
 */

import express from 'express';
import * as pinnedController from '../controllers/pinnedController.js';

const router = express.Router();

// Route: GET /api/v1/chat/conversations/:conversationId/pinned
router.get('/:conversationId/pinned', pinnedController.getPinnedMessages);
router.post('/:conversationId/messages/:messageId/pin', pinnedController.pinMessage);
router.delete('/:conversationId/messages/:messageId/pin', pinnedController.unpinMessage);

// Route: POST /api/v1/chat/conversations/:conversationId/messages/:messageId/pin
router.post('/:conversationId/messages/:messageId/pin', pinnedController.pinMessage);

// Route: DELETE /api/v1/chat/conversations/:conversationId/messages/:messageId/pin
router.delete('/:conversationId/messages/:messageId/pin', pinnedController.unpinMessage);

export default router;
