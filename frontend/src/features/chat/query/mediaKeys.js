/**
 * @file features/chat/query/mediaKeys.js
 * @description Centralized query keys for the Media Pipeline.
 */

export const mediaKeys = {
  all: ['chat', 'media'],
  conversations: () => [...mediaKeys.all, 'conversations'],
  conversation: (convId) => [...mediaKeys.all, 'conversation', convId],
  metadata: (mediaId) => [...mediaKeys.all, 'metadata', mediaId],
  uploadStatus: (uploadId) => [...mediaKeys.all, 'upload', uploadId],
  downloadStatus: (downloadId) => [...mediaKeys.all, 'download', downloadId],
  preview: (mediaId) => [...mediaKeys.all, 'preview', mediaId],
  thumbnails: (mediaId) => [...mediaKeys.all, 'thumbnail', mediaId],
};

export default mediaKeys;
