/**
 * @file src/modules/notifications/pushNotificationService.js
 * @description Service to manage push subscriptions and send Web Push notifications.
 */

import webpush from 'web-push';
import env from '../../config/env.js';
import PushSubscription from './pushSubscriptionModel.js';
import Conversation from '../chat/conversation.repository.js';
import logger from '../../config/logger.js';

// Initialize web-push with VAPID details
const publicVapidKey = env.vapidPublicKey;
const privateVapidKey = env.vapidPrivateKey;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:support@gatecode.com',
    publicVapidKey,
    privateVapidKey
  );
  logger.info('[Push Service] web-push VAPID details configured successfully');
} else {
  logger.warn('[Push Service] VAPID keys not configured in environment variables');
}

/**
 * Save or update a user's push subscription
 */
export const subscribe = async (employeeId, companyId, subscription, userAgent = '', deviceType = 'unknown') => {
  try {
    return await PushSubscription.findOneAndUpdate(
      { employeeId, 'subscription.endpoint': subscription.endpoint },
      { employeeId, companyId, subscription, userAgent, deviceType },
      { upsert: true, new: true }
    );
  } catch (err) {
    logger.error(`[Push Service] subscribe error for employee ${employeeId}:`, err);
    throw err;
  }
};

/**
 * Remove a user's push subscription by endpoint
 */
export const unsubscribe = async (employeeId, endpoint) => {
  try {
    return await PushSubscription.deleteOne({
      employeeId,
      'subscription.endpoint': endpoint
    });
  } catch (err) {
    logger.error(`[Push Service] unsubscribe error for employee ${employeeId}:`, err);
    throw err;
  }
};

/**
 * Send Web Push notification to a specific user across all registered devices
 */
export const sendNotificationToUser = async (employeeId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({ employeeId }).lean();
    if (subscriptions.length === 0) {
      logger.info(`[Push Service] No push subscriptions found for employee: ${employeeId}`);
      return;
    }

    logger.info(`[Push Service] Delivering push to ${subscriptions.length} subscription(s) for employee: ${employeeId}`);

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.subscription.endpoint,
            keys: {
              p256dh: sub.subscription.keys.p256dh,
              auth: sub.subscription.keys.auth
            }
          },
          JSON.stringify(payload)
        );
        logger.debug(`[Push Service] Push delivered successfully to endpoint: ${sub.subscription.endpoint.substring(0, 45)}...`);
      } catch (err) {
        logger.error(`[Push Service] Error delivering to subscription of employee ${employeeId}:`, err);
        // Clean up obsolete subscription if response is 404 (Not Found) or 410 (Gone)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
          logger.info(`[Push Service] Removed invalid/expired subscription for employee ${employeeId}`);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    logger.error(`[Push Service] sendNotificationToUser failed for employee ${employeeId}:`, err);
  }
};

/**
 * Send Web Push notification to all active participants in a conversation except the sender
 */
export const sendNotificationToConversation = async (conversationId, excludeEmployeeId, payload) => {
  try {
    const conversation = await Conversation.findOne({ id: conversationId }).lean();
    if (!conversation) {
      logger.warn(`[Push Service] Conversation ${conversationId} not found`);
      return;
    }

    const recipientIds = conversation.participants
      .map(p => p.employeeId)
      .filter(id => id !== excludeEmployeeId);

    logger.debug(`[Push Service] Fan-out push for conversation ${conversationId} to recipients: ${recipientIds.join(', ')}`);

    const promises = recipientIds.map(id => sendNotificationToUser(id, payload));
    await Promise.all(promises);
  } catch (err) {
    logger.error(`[Push Service] sendNotificationToConversation failed for conv ${conversationId}:`, err);
  }
};
