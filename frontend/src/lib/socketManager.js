import { io } from 'socket.io-client';

const getSocketUrl = () => window.SOCKET_URL || window.location.origin;

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: false
    });
  }
  return socket;
};

export const connectSocket = (token, tenantId) => {
  const currentSocket = getSocket();
  
  if (currentSocket.connected || currentSocket.active) {
    console.log('[SocketManager] Socket already connected/connecting, reusing instance.');
    return currentSocket;
  }

  // Update auth credentials dynamically on every connect attempt or handshake reconnect
  currentSocket.auth = (cb) => {
    let currentUserId = '';
    try {
      const savedUser = localStorage.getItem('saas_user');
      if (savedUser) {
        currentUserId = JSON.parse(savedUser).id;
      }
    } catch (e) {
      console.error('[SocketManager] Error parsing saas_user:', e);
    }

    const activeToken = token || localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token');

    cb({
      token: activeToken,
      tenantId: tenantId || localStorage.getItem('saas_tenant_id') || localStorage.getItem('saas_company_id'),
      lastSyncTime: localStorage.getItem('chat_last_sync_' + currentUserId) || new Date().toISOString()
    });
  };

  console.log('[SocketManager] Connecting socket...');
  currentSocket.connect();
  return currentSocket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('[SocketManager] Disconnecting socket cleanly...');
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
};

