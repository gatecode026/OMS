/**
 * @file src/modules/chat/controllers/pollController.js
 * @description Controller actions for poll API endpoints.
 */

import * as pollService from '../services/pollService.js';
import Poll from '../models/Poll.js';
import Conversation from '../conversation.model.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { successResponse } from '../../../utils/response.js';

/**
 * Helper to assert conversation membership
 */
const assertMember = async (conversationId, employeeId) => {
  const conv = await Conversation.findOne({
    id: conversationId,
    'participants.employeeId': employeeId
  });
  if (!conv) {
    throw new Error('Access denied: You are not a member of this conversation');
  }
};

// POST /api/v1/chat/polls
export const createPoll = asyncHandler(async (req, res) => {
  const { question, options, allowMultipleVotes, isAnonymous, expiresAt, conversationId, threadId } = req.body;
  const { id: creatorId, name: creatorName, avatar: creatorAvatar, role: creatorRole, companyId } = req.user;

  if (!question || !options || !conversationId) {
    return res.status(400).json({
      status: 'fail',
      message: 'question, options, and conversationId are required'
    });
  }

  // Enforce Authorization: Only Group Admin or Management (Manager/Admin) can create polls
  const conv = await Conversation.findOne({ id: conversationId });
  if (!conv) {
    return res.status(404).json({
      status: 'fail',
      message: 'Conversation not found'
    });
  }

  if (conv.type !== 'group') {
    return res.status(400).json({
      status: 'fail',
      message: 'Access denied: Polls can only be created in group conversations'
    });
  }

  const participant = conv.participants?.find(p => p.employeeId === creatorId);
  if (!participant) {
    return res.status(403).json({
      status: 'fail',
      message: 'Access denied: You are not a member of this conversation'
    });
  }

  const isManagerOrAdmin = ['super_admin', 'dept_admin', 'branch_admin', 'manager'].includes((creatorRole || '').toLowerCase());
  const isGroupAdmin = participant.isAdmin === true;

  if (!isManagerOrAdmin && !isGroupAdmin) {
    // Check designation field in the DB as fallback
    const { getTenantConnection } = await import('../../../utils/multidbConnection.js');
    const conn = await getTenantConnection(companyId);
    const employee = await conn.collection('employees').findOne({ id: creatorId });
    const designation = employee?.designation || '';
    const isManagerDesignation = designation.toLowerCase().includes('manager');

    if (!isManagerDesignation) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Only group admins or managers can create polls'
      });
    }
  }

  const result = await pollService.createPoll({
    question,
    options,
    allowMultipleVotes,
    isAnonymous,
    expiresAt,
    conversationId,
    threadId
  }, {
    id: creatorId,
    name: creatorName,
    avatar: creatorAvatar,
    role: creatorRole
  }, companyId);

  return successResponse(res, result.poll, 'Poll created successfully', 201);
});

// GET /api/v1/chat/polls/:pollId
export const getPoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { id: employeeId, companyId } = req.user;

  const poll = await Poll.findById(pollId).lean();
  if (!poll) {
    return res.status(404).json({
      status: 'fail',
      message: 'Poll not found'
    });
  }

  // Validate conversation membership
  await assertMember(poll.conversationId, employeeId);

  // If poll is anonymous, strip votes details from options (only keep counts)
  if (poll.isAnonymous) {
    poll.options = poll.options.map(opt => ({
      optionId: opt.optionId,
      text: opt.text,
      votesCount: opt.votes.length,
      votes: [] // Empty voter list to respect anonymity!
    }));
  }

  return successResponse(res, poll, 'Poll details fetched successfully');
});

// POST /api/v1/chat/polls/:pollId/vote
export const vote = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { optionId } = req.body;
  const { id: voterId, name: voterName, companyId } = req.user;

  if (!optionId) {
    return res.status(400).json({
      status: 'fail',
      message: 'optionId is required'
    });
  }

  const poll = await pollService.castVote(pollId, optionId, voterId, voterName, companyId);
  return successResponse(res, poll, 'Vote recorded successfully');
});

// POST /api/v1/chat/polls/:pollId/close
export const closePoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { id: userId, name: userName, role: userRole, companyId } = req.user;

  const poll = await pollService.closePoll(pollId, userId, userName, companyId, userRole);
  return successResponse(res, poll, 'Poll closed successfully');
});

// POST /api/v1/chat/polls/:pollId/reopen
export const reopenPoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { id: userId, name: userName, role: userRole, companyId } = req.user;

  const poll = await pollService.reopenPoll(pollId, userId, userName, companyId, userRole);
  return successResponse(res, poll, 'Poll reopened successfully');
});

// DELETE /api/v1/chat/polls/:pollId
export const deletePoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { id: userId, name: userName, role: userRole, companyId } = req.user;

  await pollService.deletePoll(pollId, userId, userName, companyId, userRole);
  return successResponse(res, null, 'Poll deleted successfully');
});
