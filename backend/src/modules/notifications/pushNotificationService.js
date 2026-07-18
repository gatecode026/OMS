/**
 * @file src/modules/notifications/pushNotificationService.js
 * @description Service to manage push subscriptions and send Web Push notifications.
 */

import webpush from 'web-push';
import env from '../../config/env.js';
import PushSubscription from './pushSubscriptionModel.js';
import Conversation from '../chat/conversation.repository.js';
import logger from '../../config/logger.js';

import { getTenantConnection } from '../../utils/multidbConnection.js';

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
 * Save or update a user's push subscription (Web or Mobile)
 */
export const subscribe = async (employeeId, companyId, payload, userAgent = '', deviceType = 'unknown') => {
  try {
    if (payload && payload.expoPushToken) {
      // Mobile Device registration
      const { expoPushToken, deviceId, platform, appVersion } = payload;
      return await PushSubscription.findOneAndUpdate(
        { employeeId, deviceId },
        { 
          employeeId, 
          companyId, 
          expoPushToken, 
          deviceId, 
          platform, 
          appVersion, 
          userAgent, 
          deviceType: 'mobile' 
        },
        { upsert: true, new: true }
      );
    } else {
      // Web Browser registration
      return await PushSubscription.findOneAndUpdate(
        { employeeId, 'subscription.endpoint': payload.endpoint },
        { employeeId, companyId, subscription: payload, userAgent, deviceType: 'desktop' },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    logger.error(`[Push Service] subscribe error for employee ${employeeId}:`, err);
    throw err;
  }
};

/**
 * Remove a user's push subscription (Web or Mobile)
 */
export const unsubscribe = async (employeeId, target) => {
  try {
    if (typeof target === 'string') {
      // It can be an endpoint URL or an expoPushToken or deviceId
      if (target.startsWith('ExponentPushToken') || target.startsWith('Exponent')) {
        return await PushSubscription.deleteOne({ employeeId, expoPushToken: target });
      } else if (target.startsWith('http')) {
        return await PushSubscription.deleteOne({ employeeId, 'subscription.endpoint': target });
      } else {
        return await PushSubscription.deleteOne({ employeeId, deviceId: target });
      }
    } else if (target && typeof target === 'object') {
      const { endpoint, expoPushToken, deviceId } = target;
      if (expoPushToken) {
        return await PushSubscription.deleteOne({ employeeId, expoPushToken });
      } else if (deviceId) {
        return await PushSubscription.deleteOne({ employeeId, deviceId });
      } else if (endpoint) {
        return await PushSubscription.deleteOne({ employeeId, 'subscription.endpoint': endpoint });
      }
    }
    throw new Error('Invalid unsubscribe target');
  } catch (err) {
    logger.error(`[Push Service] unsubscribe error for employee ${employeeId}:`, err);
    throw err;
  }
};

/**
 * Sends notification payload to an Expo push token
 */
const sendExpoNotification = async (token, payload) => {
  try {
    const isCall = payload.type === 'incoming_call' || payload.data?.type === 'incoming_call';
    const expoPayload = {
      to: token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      priority: isCall ? 'high' : 'default',
      channelId: isCall ? 'calls' : 'default',
      badge: payload.badge || 0,
      data: payload.data || {},
      categoryIdentifier: isCall ? undefined : 'chatReply',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(expoPayload),
    });

    const result = await response.json();
    logger.debug(`[Push Service] Expo push sent to ${token.substring(0, 30)}... Result:`, result);
    return result;
  } catch (err) {
    logger.error('[Push Service] Expo push delivery failed:', err);
    return null;
  }
};

/**
 * Send Push notification to a specific user across all registered devices (Web + Mobile)
 */
export const sendNotificationToUser = async (employeeId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({ employeeId }).lean();
    if (subscriptions.length === 0) {
      logger.info(`[Push Service] No push subscriptions found for employee: ${employeeId}`);
      return;
    }

    logger.info(`[Push Service] Delivering push to ${subscriptions.length} subscription(s) for employee: ${employeeId}`);

    // Compute current unread count for badge sync
    let currentBadge = 0;
    const companyId = subscriptions[0]?.companyId;
    try {
      const redis = (await import('../../config/redis.js')).default;
      if (redis.isAvailable) {
        const countKey = `notification_count:${employeeId}`;
        const cached = await redis.get(countKey);
        if (cached !== null) {
          currentBadge = parseInt(cached, 10);
        } else if (companyId) {
          const conn = await getTenantConnection(companyId);
          currentBadge = await conn.collection('notifications').countDocuments({
            userId: employeeId,
            $or: [{ isRead: false }, { read: false }]
          });
        }
      }
    } catch (badgeErr) {
      logger.debug('[Push Service] Could not calculate badge count:', badgeErr.message);
    }

    // Deduplicate subscriptions to prevent duplicate push notifications to the same token/endpoint
    const uniqueExpoTokens = new Set();
    const uniqueWebEndpoints = new Set();
    const uniqueSubscriptions = [];

    for (const sub of subscriptions) {
      if (sub.expoPushToken) {
        if (!uniqueExpoTokens.has(sub.expoPushToken)) {
          uniqueExpoTokens.add(sub.expoPushToken);
          uniqueSubscriptions.push(sub);
        }
      } else if (sub.subscription && sub.subscription.endpoint) {
        if (!uniqueWebEndpoints.has(sub.subscription.endpoint)) {
          uniqueWebEndpoints.add(sub.subscription.endpoint);
          uniqueSubscriptions.push(sub);
        }
      }
    }

    const promises = uniqueSubscriptions.map(async (sub) => {
      try {
        if (sub.expoPushToken) {
          // Mobile Push (Expo)
          const result = await sendExpoNotification(sub.expoPushToken, {
            ...payload,
            badge: currentBadge,
          });

          // Handle expired/unregistered tokens automatically
          if (result && result.data) {
            const dataItems = Array.isArray(result.data) ? result.data : [result.data];
            const isUnregistered = dataItems.some(item => 
              item.status === 'error' && 
              (item.details?.error === 'DeviceNotRegistered' || item.message?.includes('not a registered'))
            );
            if (isUnregistered) {
              await PushSubscription.deleteOne({ _id: sub._id });
              logger.info(`[Push Service] Removed invalid/unregistered Expo token for employee ${employeeId}`);
            }
          }
        } else if (sub.subscription && sub.subscription.endpoint) {
          // Web Push (VAPID)
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
          logger.debug(`[Push Service] Web Push delivered successfully to endpoint: ${sub.subscription.endpoint.substring(0, 45)}...`);
        }
      } catch (err) {
        logger.error(`[Push Service] Error delivering to subscription of employee ${employeeId}:`, err);
        // Clean up obsolete Web Push subscription
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
          logger.info(`[Push Service] Removed invalid/expired Web Push subscription for employee ${employeeId}`);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    logger.error(`[Push Service] sendNotificationToUser failed for employee ${employeeId}:`, err);
  }
};

/**
 * Send Push notification to all active participants in a conversation except the sender
 */
export const sendNotificationToConversation = async (conversationId, excludeEmployeeId, payload) => {
  try {
    const conversation = await Conversation.findOne({ id: conversationId }, { lean: true });
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
