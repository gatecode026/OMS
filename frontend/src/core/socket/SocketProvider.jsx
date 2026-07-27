/**
 * @file core/socket/SocketProvider.jsx
 * @description Thin React context around the socket singleton
 *   (src/lib/socketManager.js). Gives every feature one place to read the live
 *   socket so consumers subscribe through `useSocketEvent` instead of importing
 *   `getSocket` ad hoc.
 *
 *   It does NOT open/close the connection or register domain listeners —
 *   ChatContext still owns connection lifecycle and handlers during the
 *   strangler-fig migration (moving those here would create duplicate
 *   listeners). The Phase B SocketDispatcher will build on this provider.
 */

import { createContext, useContext, useMemo } from 'react';
import { getSocket } from '../../lib/socketManager.js';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const value = useMemo(() => ({ getSocket }), []);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/** Access the shared socket accessor. Returns `{ getSocket }`. */
// eslint-disable-next-line react-refresh/only-export-components -- provider + its hook co-located by convention (see ChatContext)
export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within a SocketProvider');
  return ctx;
}

export default SocketProvider;
