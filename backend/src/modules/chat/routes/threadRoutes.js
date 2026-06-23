/**
 * @file src/modules/chat/routes/threadRoutes.js
 * @description Express router for all Thread-related endpoints.
 */

import express from 'express';
import * as controller from '../controllers/threadController.js';

const router = express.Router();

// 1. Thread Activity Center list (must be before :threadId)
router.get('/activity', controller.getThreadActivityList);

// 2. Thread search (must be before :threadId)
router.get('/search', controller.searchThreads);

// 3. Core CRUD/Operations
router.post('/', controller.createThread);
router.get('/:threadId', controller.getThreadDetails);
router.get('/:threadId/messages', controller.getThreadReplies);
router.post('/:threadId/reply', controller.sendThreadReply);
router.post('/:threadId/follow', controller.followThread);
router.post('/:threadId/unfollow', controller.unfollowThread);
router.post('/:threadId/read', controller.markThreadAsRead);
router.patch('/:threadId/status', controller.updateThreadStatus);

export default router;
