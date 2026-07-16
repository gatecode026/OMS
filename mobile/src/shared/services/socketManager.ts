/**
 * @file socketManager.ts
 * @description Client-side WebSocket manager for real-time chat in the mobile app.
 *              Interfaces with backend's Socket.io Chat Module.
 *
 * WhatsApp-style behaviour:
 *  - Socket stays connected as long as the user is logged in.
 *  - App backgrounding does NOT disconnect the socket.
 *  - Socket is only torn down on explicit logout via disconnectSocketOnLogout().
 *  - If the OS kills the connection while backgrounded, Socket.IO's built-in
 *    reconnection (reconnectionAttempts: Infinity) brings it back automatically
 *    when the app returns to the foreground.
 */

import { io, Socket } from 'socket.io-client';
import ENV from '../../config/env';
import useAuthStore from '../store/authStore';
import secureStore from './secureStore';

let socket: Socket | null = null;
let cachedToken: string | null = null;
let cachedCompanyId: string | null = null;
let cachedLastSyncTime: string | null = null;

export const setSocketAuthCredentials = (
  token: string | null,
  companyId: string | null,
  lastSyncTime: string | null,
) => {
  cachedToken = token;
  cachedCompanyId = companyId;
  cachedLastSyncTime = lastSyncTime;
};

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(ENV.API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,  // Always retry — like WhatsApp
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = (token: string | null = null, tenantId: string | null = null): Socket => {
  const currentSocket = getSocket();

  if (currentSocket.connected || currentSocket.active) {
    // Already live — just return the existing instance
    return currentSocket;
  }

  // Socket.IO calls auth synchronously when connect() is called.
  currentSocket.auth = (cb: any) => {
    const authStore = useAuthStore.getState();
    const activeToken = cachedToken || token || authStore.token;
    const activeUser = authStore.user;
    const activeTenantId =
      cachedCompanyId || tenantId || authStore.companyId || activeUser?.companyId || 'default';
    const activeLastSyncTime = cachedLastSyncTime || new Date().toISOString();

    cb({
      token: activeToken,
      tenantId: activeTenantId,
      lastSyncTime: activeLastSyncTime,
    });
  };

  const loadAndConnect = async () => {
    try {
      const authStore = useAuthStore.getState();
      const activeToken = token || authStore.token;
      const activeUser = authStore.user;
      const activeTenantId =
        tenantId || authStore.companyId || activeUser?.companyId || 'default';

      let lastSyncTime = new Date().toISOString();
      if (activeUser?.id) {
        const stored = await secureStore.getItem('chat_last_sync_' + activeUser.id);
        if (stored) lastSyncTime = stored;
      } else {
        const stored = await secureStore.getItem('last_sync_time');
        if (stored) lastSyncTime = stored;
      }

      cachedToken = activeToken;
      cachedCompanyId = activeTenantId;
      cachedLastSyncTime = lastSyncTime;

      if (!currentSocket.connected && !currentSocket.active) {
        console.log('[SocketManager] Connecting socket to: ' + ENV.API_URL);
        currentSocket.connect();
      }
    } catch (err) {
      console.log('[SocketManager] Error loading credentials before connect:', err);
      if (!currentSocket.connected && !currentSocket.active) {
        currentSocket.connect();
      }
    }
  };

  loadAndConnect();
  return currentSocket;
};

/**
 * Called ONLY on explicit user logout.
 * Tears down the socket completely and clears all credentials.
 * Do NOT call this on app background / component unmount.
 */
export const disconnectSocketOnLogout = () => {
  if (socket) {
    console.log('[SocketManager] Logout — disconnecting socket and clearing credentials.');
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    cachedToken = null;
    cachedCompanyId = null;
    cachedLastSyncTime = null;
  }
};

/**
 * @deprecated Use disconnectSocketOnLogout() for explicit logout.
 * Kept for compatibility — internally calls disconnectSocketOnLogout.
 */
export const disconnectSocket = disconnectSocketOnLogout;

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
  disconnectSocketOnLogout,
  setSocketAuthCredentials,
};
