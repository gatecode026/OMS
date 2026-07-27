import CallSession from './calling.model.js';
import { runWithTenant } from '../../utils/tenantContext.js';

export const callingService = {
  /**
   * Create a new calling session
   */
  async createCallSession(companyId, callData) {
    return await runWithTenant(companyId, async () => {
      const session = await CallSession.create({
        companyId,
        ...callData
      });
      return session;
    });
  },

  /**
   * Update calling session status
   */
  async updateCallStatus(companyId, callId, status, extraFields = {}) {
    return await runWithTenant(companyId, async () => {
      const session = await CallSession.findOneAndUpdate(
        { id: callId, companyId },
        { status, ...extraFields },
        { new: true }
      );
      return session;
    });
  },

  /**
   * Get call history for a specific user
   */
  async getCallHistory(companyId, userId, limit = 50) {
    return await runWithTenant(companyId, async () => {
      const history = await CallSession.find({
        companyId,
        $or: [{ callerId: userId }, { calleeId: userId }]
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return history;
    });
  }
};

export default callingService;
