import callingService from './calling.service.js';

export const callingController = {
  /**
   * GET /api/v1/calls/history
   */
  async getHistory(req, res) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
      }

      const history = await callingService.getCallHistory(companyId, userId);
      return res.json({ status: 'success', data: history });
    } catch (error) {
      console.error('[CallingController] getHistory error:', error);
      return res.status(500).json({ status: 'error', message: 'Failed to fetch call history' });
    }
  },

  /**
   * POST /api/v1/calls/end
   */
  async endCall(req, res) {
    try {
      const companyId = req.companyId || req.user?.companyId;
      const { callId, duration } = req.body;

      if (!callId) {
        return res.status(400).json({ status: 'fail', message: 'callId is required' });
      }

      const session = await callingService.updateCallStatus(companyId, callId, 'ended', {
        endedAt: new Date(),
        duration: duration || 0
      });

      return res.json({ status: 'success', data: session });
    } catch (error) {
      console.error('[CallingController] endCall error:', error);
      return res.status(500).json({ status: 'error', message: 'Failed to end call session' });
    }
  }
};

export default callingController;
