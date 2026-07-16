/**
 * @file _layout.tsx
 * @description Expo Router main entry root layout.
 *              Shows the enterprise SplashScreen during boot (fonts + session restore).
 *              Guarantees a minimum splash duration of 2.5 seconds for a premium startup feel.
 *              SplashScreen is always rendered inside RootProvider so theme/branding work correctly.
 */

import React, { useEffect, useState, useRef } from 'react';
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
import { SplashScreen, ToastView, ToastRef, setToastRef } from '../src/shared/components';
import * as KeepAwake from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { registerDeviceForPushNotifications } from '../src/shared/services/pushNotification';

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

// Minimum ms the splash screen must be visible (gives the full animation time to play)
const SPLASH_MIN_MS = 2500;

// Keep the native splash visible while JS bundle loads
ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  /* safe in Expo Go — no native splash */
});

// Configure global notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Navigation Gate (runs inside RootProvider — has full theme/branding context) ──

function NavigationGate({ fontsReady }: { fontsReady: boolean }) {
  const { isAuthenticated, loadingSession, loadSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  const [minTimePassed, setMinTimePassed] = useState(false);

  // Configure notification permissions and response listener (tap to deep link)
  useEffect(() => {
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

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const conversationId = response.notification.request.content.data?.conversationId;
        console.log('[Notifications] Notification tap received, conversationId:', conversationId);
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
      responseSubscription.remove();
    };
  }, [router]);

  // Start the guaranteed minimum splash timer on mount
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // Restore session from secure storage
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // All three must be true before we navigate away from the splash
  const splashDone = fontsReady && !loadingSession && minTimePassed;

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
    if (isAuthenticated) {
      registerDeviceForPushNotifications().catch((err) => {
        console.error('[RootLayout] Error registering push notifications:', err);
      });
    }
  }, [isAuthenticated]);

  // Show enterprise SplashScreen until everything is ready
  if (!splashDone) {
    return <SplashScreen />;
  }

  const inAuthGroup = segments[0] === '(auth)';

  // Prevent flashing of dashboard/auth screens before redirect completes
  if (!isAuthenticated && !inAuthGroup) {
    return <SplashScreen />;
  }
  if (isAuthenticated && inAuthGroup) {
    return <SplashScreen />;
  }

  return <Slot />;
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
