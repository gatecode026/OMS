/**
 * @file src/modules/chat/chat.routes.js
 * @description Express router for all Chat REST API endpoints.
 *   All routes require authentication via the authenticate middleware.
 */

import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as controller from './chat.controller.js';

const router = express.Router();

// All chat routes require a valid JWT
router.use(authenticate);

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────
router.get('/conversations',                  controller.getConversations);
router.post('/conversations/direct',          controller.startDirectChat);
router.post('/conversations/group',           controller.createGroup);
router.get('/conversations/:id/messages',     controller.getMessages);
router.patch('/conversations/:id/read',       controller.markRead);
router.patch('/conversations/:id',            controller.updateGroupDetails);
router.get('/conversations/:id/search',       controller.searchInConversation);
router.post('/conversations/:id/members',     controller.addMembers);
router.delete('/conversations/:id/members/:memberId', controller.removeMember);

// ─── MESSAGES ────────────────────────────────────────────────────────────────
router.get('/messages/:id',                  controller.getMessageDetail);
router.delete('/messages/:id',               controller.deleteMsg);
router.patch('/messages/:id/edit',           controller.editMsg);
router.post('/messages/:id/react',           controller.reactToMessage);

// ─── EMPLOYEE SEARCH (new chat start karne ke liye) ───────────────────────────
router.get('/employees',                     controller.searchEmployees);

export default router;
