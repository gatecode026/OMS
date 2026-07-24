import { lazy } from 'react';

/**
 * Helper around React.lazy to handle chunk load errors when tabs are left idle
 * or when the backend/dev server restarts with new module hashes.
 *
 * If a dynamic import fails:
 * 1. It attempts a soft page reload (once per session key) to fetch fresh chunks.
 * 2. If it still fails after reload, throws error to be safely caught by ErrorBoundary.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenReloaded = JSON.parse(
      sessionStorage.getItem('chunk_reload_triggered') || 'false'
    );

    try {
      const component = await componentImport();
      sessionStorage.setItem('chunk_reload_triggered', 'false');
      return component;
    } catch (error) {
      console.error('[lazyWithRetry] Failed to dynamically import component:', error);

      if (!pageHasBeenReloaded) {
        sessionStorage.setItem('chunk_reload_triggered', 'true');
        window.location.reload();
        return new Promise(() => {}); // Keep component suspended while page reloads
      }

      throw error;
    }
  });

export default lazyWithRetry;
