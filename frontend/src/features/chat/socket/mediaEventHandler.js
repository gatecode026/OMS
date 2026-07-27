/**
 * @file features/chat/socket/mediaEventHandler.js
 * @description Event Handlers for Socket Media Events (Part 10).
 *   Applies O(1) mutations to the normalized media cache on socket updates.
 */

import {
  updateUploadProgress,
  confirmUploadCompleted,
  markUploadFailed,
  cacheThumbnailUrl,
} from '../cache/mediaCache.js';

export const mediaEventHandlers = {
  media_upload_started: (queryClient, payload) => {
    if (!payload) return;
    const { convId, uploadId } = payload;
    updateUploadProgress(queryClient, convId, uploadId, { progress: 0, status: 'uploading' });
  },

  media_upload_progress: (queryClient, payload) => {
    if (!payload) return;
    const { convId, uploadId, progress } = payload;
    updateUploadProgress(queryClient, convId, uploadId, { progress, status: 'uploading' });
  },

  media_uploaded: (queryClient, payload) => {
    if (!payload) return;
    const { convId, uploadId, media } = payload;
    confirmUploadCompleted(queryClient, convId, uploadId, media);
  },

  media_failed: (queryClient, payload) => {
    if (!payload) return;
    const { convId, uploadId, error } = payload;
    markUploadFailed(queryClient, convId, uploadId, error);
  },

  media_deleted: (queryClient, payload) => {
    if (!payload) return;
    const { convId, mediaId } = payload;
    if (convId && mediaId) {
      queryClient.setQueryData(['chat', 'media', 'conversation', convId], (prev) => {
        if (!prev) return prev;
        const nextEntities = { ...prev.entities };
        delete nextEntities[mediaId];
        return {
          ...prev,
          entities: nextEntities,
          conversationMediaIds: {
            ...prev.conversationMediaIds,
            [convId]: (prev.conversationMediaIds[convId] || []).filter((id) => id !== mediaId),
          },
        };
      });
    }
  },

  thumbnail_generated: (queryClient, payload) => {
    if (!payload) return;
    const { mediaId, thumbnailUrl } = payload;
    cacheThumbnailUrl(queryClient, mediaId, thumbnailUrl);
  },
};

export default mediaEventHandlers;
