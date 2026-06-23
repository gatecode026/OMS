/**
 * @file src/modules/chat/routes/pollRoutes.js
 * @description Express routing definition for all chat poll endpoints.
 */

import express from 'express';
import * as controller from '../controllers/pollController.js';

const router = express.Router();

// Base is /api/v1/chat/polls (authenticate middleware is already applied in chat.routes.js)

router.route('/')
  .post(controller.createPoll);

router.route('/:pollId')
  .get(controller.getPoll)
  .delete(controller.deletePoll);

router.post('/:pollId/vote', controller.vote);
router.post('/:pollId/close', controller.closePoll);
router.post('/:pollId/reopen', controller.reopenPoll);

export default router;
