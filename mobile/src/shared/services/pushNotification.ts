/**
 * @file pushNotification.ts
 * @description Centralized Mobile Push Notification registration and channel configurations.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import secureStore from './secureStore';
import apiClient from './apiClient';

/**
 * Configure local notification handler behaviour (e.g. show banners in foreground)
 * Skip in Expo Go — remote notifications are not supported there since SDK 53.
 */
const isExpoGo = Constants.appOwnership === 'expo';
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Helper to generate or retrieve a persistent Device ID
 */
export const getOrGenerateDeviceId = async (): Promise<string> => {
  let deviceId = await secureStore.getItem('device_id');
  if (!deviceId) {
    // Generate a secure random device identifier
    deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await secureStore.setItem('device_id', deviceId);
  }
  return deviceId;
};

/**
 * Register mobile device for remote push notifications on backend
 */
export const registerDeviceForPushNotifications = async () => {
  try {
    if (Platform.OS === 'web') return null;

    // SDK 53+: Remote push notifications are not supported in Expo Go.
    // isExpoGo is defined at module level from Constants.appOwnership.
    if (isExpoGo) {
      if (__DEV__) console.log('[PushNotification] Skipping — running in Expo Go. Use a dev build for full push support.');
      return null;
    }

    // 1. Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotification] Permission not granted for push notifications.');
      return null;
    }

    // 2. Fetch Expo Push Token
    // We dynamically extract projectId from expoConfig or environment variables
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || '3e61dfdd-7a18-4c32-80b5-5585efa7dcb0';
    
    let expoPushToken = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      expoPushToken = tokenData.data;
      console.log('[PushNotification] Retrieved Expo Push Token:', expoPushToken);
    } catch (tokenErr: any) {
      console.warn(
        '[PushNotification] Registration failed: Remote notifications are unsupported in Expo Go (SDK 53+). ' +
        'Use a custom Development Build or a simulator to test push notification delivery. Error:',
        tokenErr.message
      );
      // Setup local channels anyway for local simulation
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      return null;
    }

    // 3. Generate or retrieve Device ID
    const deviceId = await getOrGenerateDeviceId();

    // 4. Configure Android notification channels
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: 'default',
      });
    }

    // 5. Register with backend push subscription endpoint
    const response = await apiClient.post('/api/v1/notifications/push/subscribe', {
      expoPushToken,
      deviceId,
      platform: Platform.OS,
      appVersion: Constants.nativeAppVersion || '1.0.0',
      deviceType: 'mobile',
    });

    console.log('[PushNotification] Registered device with backend successfully:', response.status);
    return expoPushToken;
  } catch (err) {
    console.error('[PushNotification] Registration failed:', err);
    return null;
  }
};

/**
 * Revoke mobile device registration from backend on logout
 */
export const unregisterDeviceFromPushNotifications = async () => {
  try {
    if (Platform.OS === 'web') return;

    // Skip in Expo Go — no push token was registered
    if (Constants.appOwnership === 'expo') return;

    const deviceId = await getOrGenerateDeviceId();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || '3e61dfdd-7a18-4c32-80b5-5585efa7dcb0';
    
    let expoPushToken = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      expoPushToken = tokenData.data;
    } catch (e) {
      // Ignored: might fail if offline/revoked
    }

    await apiClient.post('/api/v1/notifications/push/unsubscribe', {
      deviceId,
      expoPushToken,
    });

    console.log('[PushNotification] Unregistered device from backend successfully.');
  } catch (err) {
    console.error('[PushNotification] Unregistration failed:', err);
  }
};

export default {
  registerDeviceForPushNotifications,
  unregisterDeviceFromPushNotifications,
  getOrGenerateDeviceId,
};
