/**
 * @file public/service-worker.js
 * @description Background Service Worker for handling Web Push notifications,
 *   incoming call ringtones/interactions, and auto-focusing tabs.
 */

// Helper to retrieve auth token from Cache Storage
async function getAuthToken() {
  try {
    const cache = await caches.open('oms-auth');
    const response = await cache.match('/token');
    if (response) {
      const token = await response.text();
      return token.trim();
    }
  } catch (err) {
    console.error('[Service Worker] Error reading token from cache:', err);
  }
  return '';
}

// Helper to retrieve backend API URL from Cache Storage
async function getBackendUrl() {
  try {
    const cache = await caches.open('oms-auth');
    const response = await cache.match('/backend-url');
    if (response) {
      const url = await response.text();
      return url.trim();
    }
  } catch (err) {
    console.error('[Service Worker] Error reading backend url from cache:', err);
  }
  return 'http://localhost:5000'; // fallback
}

// Listen for Web Push events
self.addEventListener('push', function (event) {
  if (!event.data) {
    console.warn('[Service Worker] Push event received, but contains no payload.');
    return;
  }

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    console.warn('[Service Worker] Payload is not JSON. Text content:', event.data.text());
    payload = {
      title: 'New Notification',
      body: event.data.text()
    };
  }

  const { title, body, type, tag, data = {} } = payload;

  // Handle Call Cancellations (auto-dismiss active ringing notification)
  if (type === 'call_cancelled' || type === 'call_ended') {
    event.waitUntil(
      (async () => {
        const notifications = await self.registration.getNotifications();
        notifications.forEach(notification => {
          if (notification.tag === tag || (notification.data && notification.data.callId === data.callId)) {
            notification.close();
            console.log('[Service Worker] Auto-dismissed cancelled/ended call notification:', tag);
          }
        });

        // Broadcast STOP_SOUND to all open window clients
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach(client => {
          client.postMessage({
            type: 'STOP_SOUND',
            callId: data.callId
          });
        });
      })()
    );
    return;
  }

  // Play sound in open window client if active
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const hasOpenClient = clients.length > 0;
      if (hasOpenClient) {
        // Send a postMessage to notify the foreground tab to play notification/ringing audio
        clients[0].postMessage({
          type: 'PLAY_SOUND',
          notificationType: type || 'message',
          callId: data.callId
        });
      }
    })
  );

  // Setup Notification Options
  const options = {
    body: body || '',
    icon: data.callerAvatar || data.senderAvatar || '/favicon.ico',
    badge: '/favicon.ico',
    tag: tag || 'oms-default-tag',
    renotify: true,
    requireInteraction: type === 'incoming_call',
    data: {
      ...data,
      type
    }
  };

  // Configure Call Actions (Accept / Reject)
  if (type === 'incoming_call') {
    options.actions = [
      { action: 'accept', title: 'Accept' },
      { action: 'reject', title: 'Reject' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
      .catch(err => {
        console.error('[Service Worker] Failed to show notification with actions/interaction:', err);
        const fallbackOptions = { ...options };
        delete fallbackOptions.actions;
        delete fallbackOptions.requireInteraction;
        return self.registration.showNotification(title, fallbackOptions);
      })
  );
});

// Listen for Notification Clicks
self.addEventListener('notificationclick', function (event) {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle Reject action directly from the notification button (Background)
  if (action === 'reject') {
    event.waitUntil(
      (async () => {
        const callId = data.callId;
        if (!callId) return;

        const backendUrl = await getBackendUrl();
        const token = await getAuthToken();

        console.log('[Service Worker] Sending background call rejection for callId:', callId);

        // Broadcast STOP_SOUND to all open window clients immediately
        try {
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          clients.forEach(client => {
            client.postMessage({
              type: 'STOP_SOUND',
              callId: callId
            });
          });
        } catch (err) {
          console.error('[Service Worker] Failed to post STOP_SOUND to clients:', err);
        }

        try {
          const res = await fetch(`${backendUrl}/api/v1/chat/calls/${callId}/reject`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            }
          });
          const result = await res.json();
          console.log('[Service Worker] Rejection response:', result);
        } catch (err) {
          console.error('[Service Worker] Rejection network error:', err);
        }
      })()
    );
    return;
  }

  // Handle Accept or General click (Foreground focus)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      let targetPath = '/chat';

      if (action === 'accept' && data.callId) {
        targetPath = `/chat?callId=${data.callId}&action=accept`;
      } else if (data.conversationId) {
        targetPath = `/chat?conversation=${data.conversationId}`;
      }

      // Check if there is an existing app window open
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        if (client.url.includes('/chat') && 'focus' in client) {
          client.navigate(targetPath);
          return client.focus();
        }
      }

      // If no window is open, open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
    })
  );
});
