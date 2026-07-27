/**
 * @file _layout.tsx
 * @description Expo Router main entry root layout.
 *              Shows the enterprise SplashScreen during boot (fonts + session restore).
 *              Guarantees a minimum splash duration of 2.5 seconds for a premium startup feel.
 *              SplashScreen is always rendered inside RootProvider so theme/branding work correctly.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import RootProvider from '../src/shared/providers/RootProvider';
import useAuthStore from '../src/shared/store/authStore';
import useGlobalSockets from '../src/shared/hooks/useGlobalSockets';
import { SplashScreen, ToastView, ToastRef, setToastRef, toast } from '../src/shared/components';
import { usePresenceStore } from '../src/shared/store/presenceStore';
import { connectSocket } from '../src/shared/services/socketManager';
import secureStore from '../src/shared/services/secureStore';
import * as KeepAwake from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { registerDeviceForPushNotifications } from '../src/shared/services/pushNotification';

import AppBootManager from '../src/shared/services/AppBootManager';

// Safely monkey-patch expo-keep-awake to prevent uncaught promise rejections on platforms where it's not supported
if (KeepAwake) {
  try {
    const originalActivate = KeepAwake.activateKeepAwakeAsync;
    if (typeof originalActivate === 'function') {
      // @ts-ignore
      KeepAwake.activateKeepAwakeAsync = async function (tag?: string) {
        try {
          return await originalActivate(tag);
        } catch (err) {
          // Log as info/debug instead of a warning popup on screen
          console.log('Unable to activate keep awake (safely caught):', err);
        }
      };
    }
  } catch (e) {
    console.warn('Failed to patch expo-keep-awake:', e);
  }
}

// Keep the native splash visible while JS bundle loads
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  /* safe in Expo Go — no native splash */
});

if (Platform.OS !== 'web') {
  // Configure global notification handler
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const { data } = notification.request.content;
      const conversationId = data?.conversationId;
      const activeConversationId = usePresenceStore.getState().activeConversationId;

      // Suppress notifications entirely if already looking at the conversation
      if (activeConversationId === conversationId) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }

      // Suppress native system banner in foreground to avoid duplicates, but play a soft sound
      return {
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    },
  });
}

// ─── Navigation Gate (runs inside RootProvider — has full theme/branding context) ──

function NavigationGate({ fontsReady }: { fontsReady: boolean }) {
  const { isAuthenticated, loadingSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize global socket listeners for real-time syncing
  useGlobalSockets();

  // Configure notification permissions and response listener (tap to deep link)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const requestPermissions = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
      } catch (err) {
        console.error('[Notifications] Failed to request permissions:', err);
      }
    };

    requestPermissions();

    // Register Chat Reply notification category
    Notifications.setNotificationCategoryAsync('chatReply', [
      {
        identifier: 'reply',
        buttonTitle: 'Reply',
        options: {
          opensAppToForeground: false,
        },
        textInput: {
          submitButtonTitle: 'Send',
          placeholder: 'Type your reply...',
        },
      },
    ]);

    // Handle incoming notifications while in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      try {
        const { data } = notification.request.content;
        const conversationId = data?.conversationId;
        const activeConversationId = usePresenceStore.getState().activeConversationId;

        // Skip banner if user is actively looking at this conversation
        if (activeConversationId === conversationId) return;

        const title = notification.request.content.title || 'New Message';
        const body = notification.request.content.body || '';
        
        // Show premium in-app Toast banner instead of native system banner
        toast.show(`${title}: ${body}`, 'info');
      } catch (err) {
        console.error('[Notifications] Error handling received notification:', err);
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const conversationId = response.notification.request.content.data?.conversationId;
        console.log('[Notifications] Notification response received, conversationId:', conversationId);

        // Handle Quick Reply Action
        if (response.actionIdentifier === 'reply') {
          const userText = (response as any).userText;
          if (userText && conversationId) {
            console.log('[Notifications] Quick reply typed:', userText);
            
            // Read credentials asynchronously from secure storage to support cold start
            secureStore.getItem('auth_token').then((token) => {
              secureStore.getJson<any>('user_profile').then((user) => {
                if (token) {
                  // Connect socket with loaded credentials
                  const socket = connectSocket(token, user?.companyId);
                  
                  const tempId = `temp_reply_${Date.now()}`;
                  const payload = {
                    conversationId,
                    content: userText.trim(),
                    type: 'text',
                    tempId,
                    replyTo: null,
                  };
                  
                  // Emit the send_message event to the backend
                  socket.emit('send_message', payload, (ack: any) => {
                    console.log('[Notifications] Quick reply acknowledgment:', ack);
                  });
                  
                  // Dismiss the notification to close the native quick reply UI and stop the spinner
                  Notifications.dismissNotificationAsync(response.notification.request.identifier);
                  toast.success('Reply sent!');
                } else {
                  console.warn('[Notifications] No auth token found for quick reply.');
                }
              });
            });
          }
          return;
        }

        // ── PROD-BUG-002 FIX: Route incoming call push notification to /incoming-call ──
        // When the app is backgrounded or locked, the push notification wakes the device.
        // Tapping it must navigate to the incoming-call screen so the user can accept/decline.
        const notificationType = response.notification.request.content.data?.type;
        if (notificationType === 'incoming_call') {
          setTimeout(() => {
            router.push('/(app)/incoming-call' as any);
          }, 200);
          return;
        }

        // ── Route cancelled call notification — dismiss any pending incoming call UI ──
        if (notificationType === 'call_cancelled') {
          // The socket event call:missed will handle cleanup
          // but if app was backgrounded, navigate back to inbox
          setTimeout(() => {
            router.replace('/(tabs)/inbox' as any);
          }, 150);
          return;
        }

        if (conversationId) {
          setTimeout(() => {
            router.push(`/chat/${conversationId}` as any);
          }, 150);
        }
      } catch (err) {
        console.error('[Notifications] Error handling response:', err);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);

  // Restore session from secure storage (critical stage 1 boot)
  useEffect(() => {
    AppBootManager.runCriticalBoot();
  }, []);

  // All must be true before we navigate away from the splash
  const splashDone = fontsReady && !loadingSession;

  // Trigger UI Paint ready stage in AppBootManager
  useEffect(() => {
    if (splashDone) {
      AppBootManager.onUiReady();
    }
  }, [splashDone]);

  // Dev logging for session state
  if (__DEV__ && !loadingSession) {
    console.log('[RootLayout] Session loaded:', { isAuthenticated, splashDone, fontsReady });
  }

  // Hide the native Expo splash once fonts are ready
  useEffect(() => {
    if (fontsReady) {
      ExpoSplashScreen.hideAsync().catch(() => {/* safe */});
    }
  }, [fontsReady]);

  // Routing guard — only runs after splash is fully complete
  useEffect(() => {
    if (!splashDone) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)/(tabs)');
    }
  }, [isAuthenticated, splashDone, segments, router]);

  // Register push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && Platform.OS !== 'web') {
      registerDeviceForPushNotifications().catch((err) => {
        console.error('[RootLayout] Error registering push notifications:', err);
      });
    }
  }, [isAuthenticated]);

  // Show enterprise SplashScreen until everything is ready
  if (!splashDone) {
    return <SplashScreen key="splash-init" />;
  }

  const inAuthGroup = segments[0] === '(auth)';

  // Prevent flashing of dashboard/auth screens before redirect completes
  if (!isAuthenticated && !inAuthGroup) {
    return <SplashScreen key="splash-redirect-auth" />;
  }
  if (isAuthenticated && inAuthGroup) {
    return <SplashScreen key="splash-redirect-app" />;
  }

  return <Slot key="app-slot" />;
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  // Always render inside RootProvider so SplashScreen has theme + branding context
  const toastRef = useRef<ToastRef>(null);

  return (
    <RootProvider>
      <NavigationGate fontsReady={fontsReady} />
      <ToastView ref={(r) => { toastRef.current = r; setToastRef(r); }} />
    </RootProvider>
  );
}
