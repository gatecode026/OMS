/**
 * @file src/jobs/pollExpiry.job.js
 * @description Background cron job to auto-close expired polls.
 */

import { connectionCache } from '../utils/multidbConnection.js';
import logger from '../config/logger.js';
import { getIO } from '../config/socket.js';
import mongoose from 'mongoose';

/**
 * Check and close expired polls across all active connection databases in cache
 */
export const checkExpiredPolls = async () => {
  const now = new Date();
  let closedCount = 0;

  for (const [tenantId, entry] of connectionCache.entries()) {
    if (entry.connection) {
      try {
        const PollModel = entry.connection.models['Poll'] || entry.connection.model('Poll', mongoose.model('Poll').schema);
        
        // Find polls that should be closed
        const expiredPolls = await PollModel.find({
          isClosed: false,
          expiresAt: { $ne: null, $lte: now }
        }).lean();

        if (expiredPolls.length > 0) {
          const expiredIds = expiredPolls.map(p => p._id);
          
          // Close them in DB
          await PollModel.updateMany(
            { _id: { $in: expiredIds } },
            { $set: { isClosed: true } }
          );

          closedCount += expiredIds.length;
          logger.info(`[PollExpiryJob] Closed ${expiredIds.length} expired polls for tenant ${tenantId}`);

          // Broadcast real-time update to each closed poll's conversation room
          const io = getIO();
          expiredPolls.forEach(poll => {
            const updatedPoll = { ...poll, isClosed: true };
            io.to(`conv:${poll.conversationId}`).emit('poll:closed', updatedPoll);
            io.to(`conv:${poll.conversationId}`).emit('poll:updated', updatedPoll);
          });
        }
      } catch (err) {
        logger.error(`[PollExpiryJob] Error processing expired polls for tenant ${tenantId}:`, err);
      }
    }
  }
};

/**
 * Starts the poll expiration background checker
 */
export const startPollExpiryJob = () => {
  logger.info('Initializing 1-minute Poll Expiry background job...');

  // Check every 1 minute (60000 ms)
  setInterval(async () => {
    try {
      await checkExpiredPolls();
    } catch (err) {
      logger.error('[PollExpiryJob] Error running checkExpiredPolls cycle:', err);
    }
  }, 60000);
};

export default {
  checkExpiredPolls,
  startPollExpiryJob
};
