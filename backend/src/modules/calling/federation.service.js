import { FederationInvitation, FederationTrust } from './federation.model.js';
import { runWithTenant } from '../../database/tenantConnection.js';

export const federationService = {
  /**
   * Create an inter-organization federation trust request
   */
  async createTrustRequest(companyId, requestData) {
    return await runWithTenant(companyId, async () => {
      const trust = await FederationTrust.create({
        id: `trust-${Date.now()}`,
        requesterCompanyId: companyId,
        status: 'pending',
        ...requestData
      });
      return trust;
    });
  },

  /**
   * Approve federation trust request
   */
  async approveTrustRequest(companyId, trustId) {
    return await runWithTenant(companyId, async () => {
      const trust = await FederationTrust.findOneAndUpdate(
        { id: trustId },
        { status: 'active' },
        { new: true }
      );
      return trust;
    });
  },

  /**
   * Get all active trusts for tenant
   */
  async getActiveTrusts(companyId) {
    return await runWithTenant(companyId, async () => {
      return await FederationTrust.find({
        $or: [{ requesterCompanyId: companyId }, { targetCompanyId: companyId }],
        status: 'active'
      }).lean();
    });
  },

  /**
   * Create cross-tenant meeting invitation
   */
  async createInvitation(companyId, inviteData) {
    return await runWithTenant(companyId, async () => {
      const domain = inviteData.invitedEmail.split('@')[1] || 'external.com';
      const invite = await FederationInvitation.create({
        id: `inv-${Date.now()}`,
        inviterCompanyId: companyId,
        invitedDomain: domain,
        ...inviteData
      });
      return invite;
    });
  }
};

export default federationService;
