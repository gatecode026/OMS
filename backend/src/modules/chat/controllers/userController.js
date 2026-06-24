import UserChatSettings from '../models/UserChatSettings.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { successResponse } from '../../../utils/response.js';
import { getIO } from '../../../config/socket.js';
import { runWithTenant } from '../../../utils/tenantContext.js';

// POST /chat/users/:id/block
export const blockUser = asyncHandler(async (req, res) => {
  const { id: targetUserId } = req.params;
  const { id: userId, companyId } = req.user;

  if (userId === targetUserId) {
    return res.status(400).json({ status: 'fail', message: 'Cannot block yourself' });
  }

  await runWithTenant(companyId, async () => {
    let settings = await UserChatSettings.findOne({ userId });
    if (!settings) {
      settings = await UserChatSettings.create({ userId, companyId, blockedUsers: [] });
    }

    const alreadyBlocked = settings.blockedUsers.some(u => u.userId === targetUserId);
    if (!alreadyBlocked) {
      settings.blockedUsers.push({ userId: targetUserId, blockedAt: new Date() });
      await settings.save();
    }

    // Emit real-time socket events
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('user:blocked', { userId: targetUserId, blockedByMe: true });
      io.to(`user:${targetUserId}`).emit('user:blocked', { userId: userId, blockedByMe: false });
    } catch (err) {
      // socket errors are handled/ignored gracefully
    }
  });

  return successResponse(res, null, 'User blocked successfully');
});

// POST /chat/users/:id/unblock
export const unblockUser = asyncHandler(async (req, res) => {
  const { id: targetUserId } = req.params;
  const { id: userId, companyId } = req.user;

  await runWithTenant(companyId, async () => {
    const settings = await UserChatSettings.findOne({ userId });
    if (settings) {
      settings.blockedUsers = settings.blockedUsers.filter(u => u.userId !== targetUserId);
      await settings.save();
    }

    // Emit real-time socket events
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('user:unblocked', { userId: targetUserId, blockedByMe: true });
      io.to(`user:${targetUserId}`).emit('user:unblocked', { userId: userId, blockedByMe: false });
    } catch (err) {
      // socket errors are handled/ignored gracefully
    }
  });

  return successResponse(res, null, 'User unblocked successfully');
});

// GET /chat/users/blocked
export const getBlockedUsers = asyncHandler(async (req, res) => {
  const { id: userId, companyId } = req.user;

  const data = await runWithTenant(companyId, async () => {
    // 1. Users I blocked
    const mySettings = await UserChatSettings.findOne({ userId });
    const blockedByMe = mySettings ? mySettings.blockedUsers.map(u => u.userId) : [];

    // 2. Users who blocked me
    const blockedByOthersSettings = await UserChatSettings.find({
      'blockedUsers.userId': userId
    });
    const blockedByOthers = blockedByOthersSettings.map(s => s.userId);

    return {
      blockedUsers: blockedByMe,
      blockedByUsers: blockedByOthers
    };
  });

  return successResponse(res, data, 'Blocked users fetched');
});
