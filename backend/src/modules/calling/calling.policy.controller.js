import CallingPolicy from './calling.policy.model.js';
import { runWithTenant } from '../../database/tenantConnection.js';

export const callingPolicyController = {
  /**
   * GET /api/v1/calls/admin/policies
   */
  async getPolicies(req, res) {
    try {
      const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';

      const policy = await runWithTenant(companyId, async () => {
        let existing = await CallingPolicy.findOne({ companyId }).lean();
        if (!existing) {
          existing = await CallingPolicy.create({
            id: `pol-${Date.now()}`,
            companyId
          });
        }
        return existing;
      });

      return res.json({ status: 'success', data: policy });
    } catch (error) {
      console.error('[CallingPolicyController] getPolicies error:', error);
      return res.status(500).json({ status: 'error', message: 'Failed to fetch calling policies' });
    }
  },

  /**
   * POST /api/v1/calls/admin/policies
   */
  async updatePolicies(req, res) {
    try {
      const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
      const { featureFlags, limits, security, licenseTier } = req.body;

      const updated = await runWithTenant(companyId, async () => {
        const policy = await CallingPolicy.findOneAndUpdate(
          { companyId },
          {
            $set: {
              ...(featureFlags && { featureFlags }),
              ...(limits && { limits }),
              ...(security && { security }),
              ...(licenseTier && { licenseTier })
            }
          },
          { new: true, upsert: true }
        );
        return policy;
      });

      return res.json({ status: 'success', data: updated });
    } catch (error) {
      console.error('[CallingPolicyController] updatePolicies error:', error);
      return res.status(500).json({ status: 'error', message: 'Failed to update calling policies' });
    }
  },

  /**
   * PATCH /api/v1/calls/admin/feature-flags
   */
  async toggleFeatureFlag(req, res) {
    try {
      const companyId = req.companyId || req.user?.companyId || 'COMP-DEFAULT';
      const { flagName, enabled } = req.body;

      if (!flagName) {
        return res.status(400).json({ status: 'fail', message: 'flagName is required' });
      }

      const updated = await runWithTenant(companyId, async () => {
        const policy = await CallingPolicy.findOneAndUpdate(
          { companyId },
          { $set: { [`featureFlags.${flagName}`]: Boolean(enabled) } },
          { new: true, upsert: true }
        );
        return policy;
      });

      return res.json({ status: 'success', data: updated });
    } catch (error) {
      console.error('[CallingPolicyController] toggleFeatureFlag error:', error);
      return res.status(500).json({ status: 'error', message: 'Failed to toggle feature flag' });
    }
  }
};

export default callingPolicyController;
