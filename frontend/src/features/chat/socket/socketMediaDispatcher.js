/**
 * @file features/chat/socket/socketMediaDispatcher.js
 * @description Centralized Socket Media Dispatcher (Part 10).
 *   Subscribes one handler per media socket event with zero duplicate listeners and Zod validation.
 */

import { mediaEventHandlers } from './mediaEventHandler.js';
import { safeValidateMedia } from '../schemas/media.schema.js';

let activeSubscriptions = [];

export function setupSocketMediaDispatcher(socket, queryClient) {
  if (!socket || !queryClient) return () => {};

  teardownSocketMediaDispatcher(socket);

  const eventMap = [
    { event: 'media_upload_started', handlerKey: 'media_upload_started' },
    { event: 'media_upload_progress', handlerKey: 'media_upload_progress' },
    { event: 'media_uploaded', handlerKey: 'media_uploaded' },
    { event: 'media_failed', handlerKey: 'media_failed' },
    { event: 'media_deleted', handlerKey: 'media_deleted' },
    { event: 'thumbnail_generated', handlerKey: 'thumbnail_generated' },
  ];

  eventMap.forEach(({ event, handlerKey }) => {
    const handlerFn = mediaEventHandlers[handlerKey];
    if (!handlerFn) return;

    const listener = (payload) => {
      const validated = safeValidateMedia(payload, event);
      handlerFn(queryClient, validated);
    };

    socket.on(event, listener);
    activeSubscriptions.push({ event, listener });
  });

  return () => {
    teardownSocketMediaDispatcher(socket);
  };
}

export function teardownSocketMediaDispatcher(socket) {
  if (!socket) return;
  activeSubscriptions.forEach(({ event, listener }) => {
    socket.off(event, listener);
  });
  activeSubscriptions = [];
}

export default setupSocketMediaDispatcher;
