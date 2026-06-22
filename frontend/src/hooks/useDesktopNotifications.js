/**
 * @file src/hooks/useDesktopNotifications.js
 * @description Hook to manage browser Notification API permissions, sound effects, 
 *   settings, and triggering native OS push alerts in tab background/inactive states.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export const useDesktopNotifications = (activeConversationId, userChatStatus) => {
  const [permission, setPermission] = useState(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const notificationsMapRef = useRef(new Map());

  // Expose requestPermission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (e) {
      // Fallback for older browsers
      return new Promise((resolve) => {
        Notification.requestPermission((result) => {
          setPermission(result);
          resolve(result);
        });
      });
    }
  }, []);

  // Soft notification sound — generated via Web Audio API (no MP3 dependency)
  const playNotificationSound = useCallback(() => {
    try {
      const settingsStr = localStorage.getItem('oms_notification_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : { desktop: true, sound: true, preview: true };

      if (settings.sound === false) return;

      // Generate a two-tone pleasant chime using Web Audio API
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, startTime, duration, vol = 0.18) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(880, ctx.currentTime, 0.15);        // A5
      playTone(1108.73, ctx.currentTime + 0.12, 0.2); // C#6
    } catch (e) {
      console.warn('[Notification Sound] Web Audio playback failed:', e);
    }
  }, []);

  // Expose sendNotification
  const sendNotification = useCallback((title, options = {}) => {
    if (!('Notification' in window)) return;

    // Skip native notifications on mobile browsers (handled by FCM/native integration)
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) return;

    if (Notification.permission !== 'granted') return;

    // Skip if user is actively focused on the app
    const isFocused = document.hasFocus() && document.visibilityState === 'visible';
    if (isFocused) return;

    // Skip if DND status is active
    if (userChatStatus === 'dnd') return;

    // Load user settings
    const settingsStr = localStorage.getItem('oms_notification_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : { desktop: true, sound: true, preview: true };

    if (settings.desktop === false) return;

    // Play sound notification
    playNotificationSound();

    // Respect preview settings
    const bodyText = settings.preview !== false ? options.body : 'New message';

    // TODO: When Service Worker is added to the OMS application, migrate 
    // this foreground Notification constructor to: registration.showNotification(title, options)
    const notification = new Notification(title, {
      body: bodyText,
      icon: options.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag,    // collapses duplicates from same conversation
      renotify: true,      // re-show & re-sound when same tag gets a new message
      silent: false,
      data: {
        conversationId: options.conversationId,
        url: options.url || `/chat?conversation=${options.conversationId}`
      }
    });

    notificationsMapRef.current.set(options.conversationId, notification);

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();

      if (options.onClickCallback) {
        options.onClickCallback(options.conversationId);
      } else {
        // Redirection fallback for non-React router bounds
        window.location.href = options.url || `/chat?conversation=${options.conversationId}`;
      }
    };

    notification.onclose = () => {
      notificationsMapRef.current.delete(options.conversationId);
    };
  }, [userChatStatus, playNotificationSound]);

  // Dismiss notification of the active conversation when the user switches focus back to the window
  useEffect(() => {
    const handleFocus = () => {
      if (document.hasFocus() && activeConversationId) {
        const activeNotif = notificationsMapRef.current.get(activeConversationId);
        if (activeNotif) {
          activeNotif.close();
          notificationsMapRef.current.delete(activeConversationId);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    if (document.hasFocus()) {
      handleFocus();
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeConversationId]);

  return { permission, requestPermission, sendNotification };
};
