/**
 * @file src/modules/chat/chat.routes.js
 * @description Express router for all Chat REST API endpoints.
 *   All routes require authentication via the authenticate middleware.
 */

import express from 'express';
import { authenticate, restrictTo } from '../../middlewares/auth.middleware.js';
import * as controller from './chat.controller.js';
import * as userController from './controllers/userController.js';
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
router.get('/conversations/archived',         controller.getArchivedConversations);
router.get('/conversations/hidden',           controller.getHiddenConversations);
router.post('/conversations/direct',          controller.startDirectChat);
router.post('/conversations/group',           controller.createGroup);
router.get('/conversations/:id/messages',     controller.getMessages);
router.patch('/conversations/:id/read',       controller.markRead);
router.patch('/conversations/:id/unread',     controller.markUnread);

// Hide / Unhide
router.post('/conversations/:id/hide',         controller.hideConversation);
router.post('/conversations/:id/unhide',       controller.unhideConversation);

// Archive / Unarchive
router.post('/conversations/:id/archive',      controller.archiveConversation);
router.post('/conversations/:id/unarchive',    controller.unarchiveConversation);

// Delete / Clear
router.delete('/conversations/:id/me',         controller.deleteConversationForMe);
router.post('/conversations/:id/clear',        controller.clearChatHistory);
router.post('/conversations/:id/export',       controller.exportChat);

router.delete('/conversations/:id',            controller.deleteGroup);
router.patch('/conversations/:id',             controller.updateGroupDetails);
router.get('/conversations/:id/search',        controller.searchInConversation);
router.post('/conversations/:id/members',      controller.addMembers);
router.delete('/conversations/:id/members/:memberId', controller.removeMember);
router.get('/conversations/:id/shared-content', controller.getSharedContentSummary);

// Block / Unblock Users
router.post('/users/:id/block',                userController.blockUser);
router.post('/users/:id/unblock',              userController.unblockUser);
router.post('/users/:id/report',               userController.reportUser);
router.get('/users/blocked',                  userController.getBlockedUsers);
router.get('/users/:id/last-seen',           controller.getLastSeen);

// ─── MESSAGES ────────────────────────────────────────────────────────────────
router.get('/messages/starred',              controller.getStarredMessages);
router.post('/messages/:id/star',            controller.starMessage);
router.delete('/messages/:id/star',          controller.unstarMessage);
router.post('/messages/bulk-delete',         controller.deleteMessagesBulk);
router.get('/messages/:id',                  controller.getMessageDetail);
router.delete('/messages/:id',               controller.deleteMsg);
router.delete('/messages/:id/permanent',     controller.deleteMsgPermanent);
router.patch('/messages/:id/edit',           controller.editMsg);
router.post('/messages/:id/react',           controller.reactToMessage);
router.post('/messages/:messageId/forward',   controller.forwardMessage);

// ─── STATUS & PRESENCE ───────────────────────────────────────────────────────
router.patch('/status',                       controller.updateChatStatus);
router.get('/presence/:userId',              controller.getPresence);
router.get('/ping',                          controller.ping);

// ─── EMPLOYEE SEARCH (new chat start karne ke liye) ───────────────────────────
router.get('/employees',                     controller.searchEmployees);

// ─── CALLS HISTORY ───────────────────────────────────────────────────────────
router.get('/calls/history',                 controller.getCallHistory);
router.post('/calls/:callId/reject',          controller.rejectCall);

// ─── ATTACHMENT & MEDIA UPLOADS ──────────────────────────────────────────────
router.get('/imagekit/auth',                 controller.getImageKitAuth);
router.post('/imagekit/upload',               controller.uploadToImageKitRoute);
router.post('/upload',                        controller.uploadAttachmentRoute);
router.post('/attachments',                   controller.uploadAttachmentRoute);
router.post('/media',                         controller.uploadAttachmentRoute);
router.post('/files',                         controller.uploadAttachmentRoute);

// ─── ADMIN CLEANUP ENDPOINTS ─────────────────────────────────────────────────
router.get('/admin/cleanup/stats',           restrictTo('admin', 'super_admin'), controller.getCleanupStats);
router.post('/admin/cleanup/trigger',         restrictTo('admin', 'super_admin'), controller.triggerCleanupManual);

export default router;
