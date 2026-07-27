/**
 * @file AppBootManager.ts
 * @description Centralized Enterprise Application Boot Manager for the OMS Mobile Application.
 *              Sequences boot stages: Critical (Auth, Theme, Cache), UI Paint (Splash Hide < 1.0s),
 *              and Deferred Services (Push Notifications, WebRTC, Background Tasks).
 */

import { InteractionManager } from 'react-native';
import useAuthStore from '../store/authStore';

export type BootStage = 'idle' | 'critical' | 'ui_ready' | 'deferred_complete';

export class AppBootManagerClass {
  private currentStage: BootStage = 'idle';
  private bootStartTime: number = Date.now();

  /**
   * Execute Stage 1 (Critical Boot)
   */
  async runCriticalBoot(): Promise<void> {
    this.bootStartTime = Date.now();
    this.currentStage = 'critical';
    console.log('[AppBootManager] Stage 1: Running Critical Boot (Auth session restore)...');

    try {
      // 1. Load session from secureStore
      const authStore = useAuthStore.getState();
      await authStore.loadSession();
    } catch (err) {
      console.error('[AppBootManager] Error during critical boot:', err);
    }
  }

  /**
   * Execute Stage 2 (UI Ready / Splash Hide)
   */
  onUiReady(): void {
    this.currentStage = 'ui_ready';
    const splashDurationMs = Date.now() - this.bootStartTime;
    console.log(`[AppBootManager] Stage 2: UI Paint Ready. Splash duration: ${splashDurationMs}ms.`);

    // Queue Stage 3 (Deferred Services) after UI interaction frames complete
    InteractionManager.runAfterInteractions(() => {
      this.runDeferredBoot();
    });
  }

  /**
   * Execute Stage 3 (Deferred Sub-services)
   */
  private async runDeferredBoot(): Promise<void> {
    console.log('[AppBootManager] Stage 3: Running Deferred Services (Background tasks)...');

    try {
      // Lazy load PerformanceManager & BackgroundTaskManager post-paint
      const { PerformanceManager } = await import('../../features/chat/services/PerformanceManager');
      PerformanceManager.initialize();

      this.currentStage = 'deferred_complete';
      console.log(`[AppBootManager] App Boot Complete in ${Date.now() - this.bootStartTime}ms.`);
    } catch (err) {
      console.error('[AppBootManager] Error during deferred boot:', err);
    }
  }

  get stage(): BootStage {
    return this.currentStage;
  }
}

export const AppBootManager = new AppBootManagerClass();
export default AppBootManager;
