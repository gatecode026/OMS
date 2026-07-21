/**
 * @file src/hooks/pushNotificationHook.js
 * @description React hook to manage Web Push notification subscription status.
 */

import { useState, useEffect, useCallback } from 'react';
import notificationService from '../utils/notificationService.js';

export const usePushNotifications = (currentUser) => {
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    try {
      if (!currentUser) {
        setIsSubscribed(false);
        setLoading(false);
        return;
      }
      
      const sub = await notificationService.getSubscription();
      setIsSubscribed(!!sub);
      setPermission('Notification' in window ? Notification.permission : 'unsupported');

      // Auto-heal: if subscription exists in browser, ensure it is synced to backend database
      if (sub) {
        notificationService._sendSubscriptionToBackend(sub).catch(err => {
          console.warn('[Push Hook] Failed to auto-sync existing subscription to backend:', err);
        });
      }
    } catch (err) {
      console.error('[Push Hook] Error checking subscription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Check on mount or when user changes
  useEffect(() => {
    checkSubscription();
  }, [currentUser?.id, checkSubscription]);

  // Auto-prompt permission request on first user click gesture if permission is default
  useEffect(() => {
    if (permission === 'default' && currentUser?.id) {
      const handleUserGesture = async () => {
        window.removeEventListener('click', handleUserGesture);
        try {
          const result = await notificationService.requestPermission();
          setPermission(result);
          if (result === 'granted') {
            const subscription = await notificationService.subscribeUser();
            setIsSubscribed(!!subscription);
          }
        } catch (err) {
          console.warn('[Push Hook] Auto-prompt gesture subscription failed:', err);
        }
      };
      window.addEventListener('click', handleUserGesture);
      return () => {
        window.removeEventListener('click', handleUserGesture);
      };
    }
  }, [permission, currentUser?.id]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await notificationService.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        throw new Error('Browser notification permission was denied.');
      }

      const subscription = await notificationService.subscribeUser();
      setIsSubscribed(!!subscription);
      return subscription;
    } catch (err) {
      console.error('[Push Hook] Subscription failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await notificationService.unsubscribeUser();
      setIsSubscribed(false);
    } catch (err) {
      console.error('[Push Hook] Unsubscription failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    refresh: checkSubscription
  };
};

export default usePushNotifications;
