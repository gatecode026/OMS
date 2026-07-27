/**
 * @file features/chat/cache/mediaCache.js
 * @description Normalized cache for the Media Pipeline (Part 3).
 *   Maintains a single source of truth for media metadata, active uploads, download tasks, thumbnails, and previews.
 */

import { mediaKeys } from '../query/mediaKeys.js';

const EMPTY_MEDIA_CACHE = {
  entities: {},
  mediaById: {},
  conversationMediaIds: {},
  uploadQueue: {},
  downloadQueue: {},
  failedUploads: {},
  temporaryMedia: {},
  previewCache: {},
  thumbnailCache: {},
};

const getKey = (convId) => mediaKeys.conversation(convId);

export function readConversationMedia(queryClient, convId) {
  if (!queryClient || !convId) return [];
  const cache = queryClient.getQueryData(getKey(convId));
  if (!cache) return [];
  const ids = cache.conversationMediaIds?.[convId] || [];
  return ids.map((id) => cache.entities[id]).filter(Boolean);
}

export function upsertMedia(queryClient, convId, mediaItem) {
  if (!queryClient || !convId || !mediaItem) return;
  const id = mediaItem.id || mediaItem.tempId;

  queryClient.setQueryData(getKey(convId), (prev) => {
    const current = prev || EMPTY_MEDIA_CACHE;
    const currentIds = current.conversationMediaIds[convId] ? [...current.conversationMediaIds[convId]] : [];

    if (!currentIds.includes(id)) {
      currentIds.push(id);
    }

    return {
      ...current,
      entities: { ...current.entities, [id]: { ...current.entities[id], ...mediaItem } },
      mediaById: { ...current.mediaById, [id]: { ...current.mediaById[id], ...mediaItem } },
      conversationMediaIds: {
        ...current.conversationMediaIds,
        [convId]: currentIds,
      },
    };
  });
}

export function updateUploadProgress(queryClient, convId, uploadId, progressData) {
  if (!queryClient || !uploadId) return;
  const targetKey = convId ? getKey(convId) : mediaKeys.all;
  queryClient.setQueryData(targetKey, (prev) => {
    const current = prev || EMPTY_MEDIA_CACHE;
    return {
      ...current,
      uploadQueue: {
        ...current.uploadQueue,
        [uploadId]: { ...current.uploadQueue[uploadId], ...progressData },
      },
    };
  });
}

export function confirmUploadCompleted(queryClient, convId, uploadId, resultMedia) {
  if (!queryClient || !uploadId) return;
  const targetKey = convId ? getKey(convId) : mediaKeys.all;
  queryClient.setQueryData(targetKey, (prev) => {
    if (!prev) return EMPTY_MEDIA_CACHE;
    const nextQueue = { ...prev.uploadQueue };
    delete nextQueue[uploadId];

    const nextFailed = { ...prev.failedUploads };
    delete nextFailed[uploadId];

    const id = resultMedia?.id || uploadId;
    return {
      ...prev,
      uploadQueue: nextQueue,
      failedUploads: nextFailed,
      entities: { ...prev.entities, [id]: resultMedia },
      mediaById: { ...prev.mediaById, [id]: resultMedia },
    };
  });
}

export function markUploadFailed(queryClient, convId, uploadId, error) {
  if (!queryClient || !uploadId) return;
  const targetKey = convId ? getKey(convId) : mediaKeys.all;
  queryClient.setQueryData(targetKey, (prev) => {
    if (!prev) return EMPTY_MEDIA_CACHE;
    const nextQueue = { ...prev.uploadQueue };
    delete nextQueue[uploadId];

    return {
      ...prev,
      uploadQueue: nextQueue,
      failedUploads: {
        ...prev.failedUploads,
        [uploadId]: { uploadId, error: error?.message || 'Upload failed', failedAt: new Date().toISOString() },
      },
    };
  });
}

export function cacheThumbnailUrl(queryClient, mediaId, thumbnailUrl) {
  if (!queryClient || !mediaId || !thumbnailUrl) return;
  queryClient.setQueryData(mediaKeys.thumbnails(mediaId), thumbnailUrl);
}

export function cachePreviewUrl(queryClient, mediaId, previewUrl) {
  if (!queryClient || !mediaId || !previewUrl) return;
  queryClient.setQueryData(mediaKeys.preview(mediaId), previewUrl);
}

export default {
  readConversationMedia,
  upsertMedia,
  updateUploadProgress,
  confirmUploadCompleted,
  markUploadFailed,
  cacheThumbnailUrl,
  cachePreviewUrl,
};
