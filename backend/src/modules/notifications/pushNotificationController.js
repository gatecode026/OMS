/**
 * @file src/modules/notifications/pushNotificationController.js
 * @description Express controller handlers for Web Push subscriptions.
 */

import * as pushNotificationService from './pushNotificationService.js';
import env from '../../config/env.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { successResponse } from '../../utils/response.js';
import logger from '../../config/logger.js';

/**
 * GET /api/v1/notifications/push/key
 * Returns the VAPID Public Key to the client for subscription configuration
 */
export const getPublicKey = asyncHandler(async (req, res) => {
  const publicKey = env.vapidPublicKey;
  if (!publicKey) {
    logger.error('[Push Controller] VAPID public key not found in env configuration');
    return res.status(500).json({
      status: 'error',
      message: 'VAPID public key is not configured on the server'
    });
  }
  return successResponse(res, { publicKey }, 'VAPID public key retrieved successfully');
});

/**
 * POST /api/v1/notifications/push/subscribe
 * Subscribes user devices by saving subscriptions to MongoDB
 */
export const subscribe = asyncHandler(async (req, res) => {
  const { subscription, userAgent, deviceType } = req.body;
  const employeeId = req.user.id;
  const companyId = req.user.companyId;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid subscription object. Must contain endpoint and keys.'
    });
  }

  const sub = await pushNotificationService.subscribe(
    employeeId,
    companyId,
    subscription,
    userAgent || req.headers['user-agent'] || '',
    deviceType || 'unknown'
  );

  return successResponse(res, sub, 'Subscribed to push notifications successfully', 201);
});

/**
 * POST /api/v1/notifications/push/unsubscribe
 * Unsubscribes a device by deleting its subscription from MongoDB
 */
export const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  const employeeId = req.user.id;

  if (!endpoint) {
    return res.status(400).json({
      status: 'fail',
      message: 'Endpoint parameter is required to unsubscribe'
    });
  }

  await pushNotificationService.unsubscribe(employeeId, endpoint);

  return successResponse(res, null, 'Unsubscribed from push notifications successfully');
});
