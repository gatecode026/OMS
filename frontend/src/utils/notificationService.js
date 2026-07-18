/**
 * @file src/utils/notificationService.js
 * @description Client-side helper service to manage Service Worker registration,
 *   Push subscriptions, VAPID key conversion, and JWT cache synchronization.
 */

// Helper to convert VAPID public key (base64url) to Uint8Array required by Push API
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class NotificationService {
  constructor() {
    this.swRegistration = null;
    this.backendUrl = window.API_URL || 'http://localhost:5000';
  }

  // Register the service worker
  async register() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Notification Service] Service Workers or Push Notifications are not supported in this browser.');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      console.log('[Notification Service] Service Worker registered with scope:', registration.scope);
      try {
        await registration.update();
        console.log('[Notification Service] Forced service worker update check on load.');
      } catch (updateErr) {
        console.warn('[Notification Service] Failed to check for SW update:', updateErr);
      }
      this.swRegistration = registration;
      
      // Sync active token to cache in case SW was just reloaded
      const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token');
      if (token) {
        await this.syncAuthToken(token);
      }

      return registration;
    } catch (err) {
      console.error('[Notification Service] Service Worker registration failed:', err);
      return null;
    }
  }

  // Request browser permission for notifications
  async requestPermission() {
    if (!('Notification' in window)) return 'unsupported';

    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (err) {
      // Fallback for older browsers
      return new Promise((resolve) => {
        Notification.requestPermission((result) => {
          resolve(result);
        });
      });
    }
  }

  // Sync token and API URL to Cache Storage for access in background service worker threads
  async syncAuthToken(token) {
    try {
      const cache = await caches.open('oms-auth');
      await cache.put('/token', new Response(token));
      await cache.put('/backend-url', new Response(this.backendUrl));
      console.debug('[Notification Service] JWT token synchronized to Cache Storage');

      // Also tell active SW controller if it exists
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_TOKEN',
          token
        });
      }
    } catch (err) {
      console.error('[Notification Service] Failed to sync auth token to Cache Storage:', err);
    }
  }

  // Clear JWT credentials from Cache Storage on logout
  async clearAuthToken() {
    try {
      const cache = await caches.open('oms-auth');
      await cache.delete('/token');
      await cache.delete('/backend-url');
      console.debug('[Notification Service] JWT token cleared from Cache Storage');
    } catch (err) {
      console.error('[Notification Service] Failed to clear auth token from Cache Storage:', err);
    }
  }

  // Get current active push subscription
  async getSubscription() {
    const registration = this.swRegistration || (await navigator.serviceWorker.ready);
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  }

  // Helper to fetch authorization header
  _getAuthHeaders() {
    const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Subscribe user to Push Notifications
  async subscribeUser() {
    try {
      if (!this.swRegistration) {
        await this.register();
      }
      const registration = this.swRegistration || (await navigator.serviceWorker.ready);
      if (!registration) throw new Error('Service Worker registration is not active');

      // 1. Fetch public VAPID key from backend
      const response = await fetch(`${this.backendUrl}/api/v1/notifications/push/key`, {
        headers: this._getAuthHeaders()
      });
      const result = await response.json();
      
      if (result.status !== 'success' || !result.data?.publicKey) {
        throw new Error(result.message || 'Failed to fetch VAPID public key from backend');
      }

      const vapidKey = result.data.publicKey;
      
      // 2. Check if subscription already exists
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // If already subscribed, return it
        await this._sendSubscriptionToBackend(subscription);
        return subscription;
      }

      // 3. Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      console.log('[Notification Service] Browser push subscription created:', subscription);

      // 4. Send subscription info to backend
      await this._sendSubscriptionToBackend(subscription);
      
      // Sync credentials to cache
      const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token');
      if (token) {
        await this.syncAuthToken(token);
      }

      return subscription;
    } catch (err) {
      console.error('[Notification Service] subscribeUser failed:', err);
      throw err;
    }
  }

  // Save subscription to database
  async _sendSubscriptionToBackend(subscription) {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const userAgent = navigator.userAgent;
    let deviceType = 'desktop';
    if (isMobile) {
      deviceType = 'mobile';
    }
    if (/Edge/i.test(userAgent)) {
      deviceType = 'edge';
    } else if (/Chrome/i.test(userAgent)) {
      deviceType = 'chrome';
    } else if (/Firefox/i.test(userAgent)) {
      deviceType = 'firefox';
    }

    const response = await fetch(`${this.backendUrl}/api/v1/notifications/push/subscribe`, {
      method: 'POST',
      headers: this._getAuthHeaders(),
      body: JSON.stringify({
        subscription,
        userAgent,
        deviceType
      })
    });
    
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Failed to save push subscription on backend');
    }
    console.log('[Notification Service] Push subscription saved to MongoDB successfully');
  }

  // Unsubscribe user from Push Notifications
  async unsubscribeUser() {
    try {
      const subscription = await this.getSubscription();
      if (!subscription) return;

      // 1. Unsubscribe from push service
      await subscription.unsubscribe();
      
      // 2. Delete subscription from backend database
      await fetch(`${this.backendUrl}/api/v1/notifications/push/unsubscribe`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      });
      
      await this.clearAuthToken();
      console.log('[Notification Service] Unsubscribed from push notifications successfully');
    } catch (err) {
      console.error('[Notification Service] unsubscribeUser failed:', err);
      throw err;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
