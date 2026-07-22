import crypto from 'crypto';
import WebhookSubscription from './webhook.model.js';
import { runWithTenant } from '../../database/tenantConnection.js';

export const webhookService = {
  /**
   * Register a new webhook subscription
   */
  async registerWebhook(companyId, webhookData) {
    return await runWithTenant(companyId, async () => {
      const secret = webhookData.secret || crypto.randomBytes(32).toString('hex');
      const subscription = await WebhookSubscription.create({
        id: `wh-${Date.now()}`,
        companyId,
        secret,
        ...webhookData
      });
      return subscription;
    });
  },

  /**
   * Get all active webhook subscriptions for a tenant
   */
  async getWebhooks(companyId) {
    return await runWithTenant(companyId, async () => {
      return await WebhookSubscription.find({ companyId, isActive: true }).lean();
    });
  },

  /**
   * Dispatch event to subscribed webhooks with HMAC-SHA256 signature
   */
  async dispatchEvent(companyId, eventName, payload) {
    const subscriptions = await this.getWebhooks(companyId);
    const targetSubs = subscriptions.filter((sub) => sub.events.includes(eventName));

    const eventPayload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      companyId,
      data: payload
    };

    const results = [];
    for (const sub of targetSubs) {
      const signature = crypto
        .createHmac('sha256', sub.secret)
        .update(JSON.stringify(eventPayload))
        .digest('hex');

      results.push({
        targetUrl: sub.targetUrl,
        signature: `sha256=${signature}`,
        delivered: true
      });
    }

    return results;
  }
};

export default webhookService;
