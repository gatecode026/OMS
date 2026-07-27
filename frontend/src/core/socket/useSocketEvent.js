/**
 * @file core/socket/useSocketEvent.js
 * @description Declarative socket subscription hook (Core layer). Registers a
 *   listener for a single event and cleans it up on unmount / handler change,
 *   so consumers never manage `socket.on`/`socket.off` by hand (the source of
 *   the duplicate-listener and stale-closure bugs the refactor targets).
 *
 *   Usage: useSocketEvent(SERVER_EVENT.NEW_MESSAGE, (payload) => { ... });
 */

import { useEffect, useRef } from 'react';
import { useSocketContext } from './SocketProvider.jsx';

/**
 * @param {string} event   event name (use constants from ./SocketEvents.js)
 * @param {(payload: any) => void} handler
 * @param {boolean} [enabled=true] skip registration when false
 */
export function useSocketEvent(event, handler, enabled = true) {
  const { getSocket } = useSocketContext();
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; }, [handler]);

  useEffect(() => {
    if (!enabled || !event) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const listener = (payload) => handlerRef.current?.(payload);
    socket.on(event, listener);
    return () => { socket.off(event, listener); };
  }, [event, enabled, getSocket]);
}

export default useSocketEvent;
