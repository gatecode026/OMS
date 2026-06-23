/**
 * @file src/modules/chat/chat.routes.js
 * @description Express router for all Chat REST API endpoints.
 *   All routes require authentication via the authenticate middleware.
 */

import express from 'express';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';
import * as controller from './chat.controller.js';
import searchRouter from './routes/searchRoutes.js';
import pinnedRouter from './routes/pinnedRoutes.js';
import threadRouter from './routes/threadRoutes.js';
import pollRouter from './routes/pollRoutes.js';

const router = express.Router();

// All chat routes require a valid JWT
router.use(authenticate);

// Threading routes
router.use('/threads', threadRouter);

// Polling routes
router.use('/polls', pollRouter);

// Global Search
router.use('/search', searchRouter);

// Pinned Messages routes
router.use('/conversations', pinnedRouter);

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────
router.get('/conversations',                  controller.getConversations);
router.post('/conversations/direct',          controller.startDirectChat);
router.post('/conversations/group',           controller.createGroup);
router.get('/conversations/:id/messages',     controller.getMessages);
router.patch('/conversations/:id/read',       controller.markRead);
router.post('/conversations/:id/clear',       controller.clearChat);
router.delete('/conversations/:id',          controller.deleteConversationPermanent);
router.patch('/conversations/:id',            controller.updateGroupDetails);
router.get('/conversations/:id/search',       controller.searchInConversation);
router.post('/conversations/:id/members',     controller.addMembers);
router.delete('/conversations/:id/members/:memberId', controller.removeMember);

// ─── MESSAGES ────────────────────────────────────────────────────────────────
router.post('/messages/bulk-delete',         controller.deleteMessagesBulk);
router.get('/messages/:id',                  controller.getMessageDetail);
router.delete('/messages/:id',               controller.deleteMsg);
router.delete('/messages/:id/permanent',     controller.deleteMsgPermanent);
router.patch('/messages/:id/edit',           controller.editMsg);
router.post('/messages/:id/react',           controller.reactToMessage);
router.post('/messages/:messageId/forward',   controller.forwardMessage);

// ─── EMPLOYEE SEARCH (new chat start karne ke liye) ───────────────────────────
router.get('/employees',                     controller.searchEmployees);

// ─── CALLS HISTORY ───────────────────────────────────────────────────────────
router.get('/calls/history',                 controller.getCallHistory);
router.post('/calls/:callId/reject',          controller.rejectCall);

// ─── IMAGEKIT CLIENT AUTH ────────────────────────────────────────────────────
router.get('/imagekit/auth',                 controller.getImageKitAuth);

// ─── ADMIN CLEANUP ENDPOINTS ─────────────────────────────────────────────────
router.get('/admin/cleanup/stats',           restrictTo('admin', 'super_admin'), controller.getCleanupStats);
router.post('/admin/cleanup/trigger',         restrictTo('admin', 'super_admin'), controller.triggerCleanupManual);

export default router;
