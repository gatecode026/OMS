/**
 * @file features/chat/data/MediaRepository.js
 * @description Media Repository Layer (OPRD-WEB-CHAT-004).
 *   Sits between UI/React Query and transport services (UploadManager, DownloadManager, ImageKit).
 *   Exposes clean business methods for uploading, downloading, previewing, and managing attachments.
 */

import UploadManager from '../engine/UploadManager.js';
import DownloadManager from '../engine/DownloadManager.js';
import { generateImageThumbnail, generateVideoThumbnail } from '../engine/thumbnailPipeline.js';
import { buildPreviewMetadata } from '../engine/previewEngine.js';
import { chatApiFetch, unwrap } from '../../../core/network/httpClient.js';
import { mediaKeys } from '../query/mediaKeys.js';
import { trackApiLatency } from '../../../core/devtools/mediaPerf.js';

export async function uploadImage(file, convId, token, options = {}, queryClient) {
  return UploadManager.enqueueUpload(file, convId, token, options, queryClient);
}

export async function uploadVideo(file, convId, token, options = {}, queryClient) {
  return UploadManager.enqueueUpload(file, convId, token, options, queryClient);
}

export async function uploadAudio(file, convId, token, options = {}, queryClient) {
  return UploadManager.enqueueUpload(file, convId, token, options, queryClient);
}

export async function uploadDocuments(file, convId, token, options = {}, queryClient) {
  return UploadManager.enqueueUpload(file, convId, token, options, queryClient);
}

export async function uploadStickers(sticker) {
  return { id: sticker.id, url: sticker.url, type: 'sticker' };
}

export async function uploadGIF(gif) {
  return { id: gif.id, url: gif.url, type: 'gif' };
}

export async function downloadFile(url, fileName, onProgress) {
  return DownloadManager.downloadFile(url, fileName, onProgress);
}

export function cancelUpload(uploadId) {
  return UploadManager.cancelUpload(uploadId);
}

export async function retryUpload() {
  return true;
}

export async function deleteAttachment(mediaId, token) {
  const env = await chatApiFetch(`/chat/media/${mediaId}`, { token, method: 'DELETE' });
  return unwrap(env, (e) => e.data || true);
}

export async function restoreAttachment(mediaId, token) {
  const env = await chatApiFetch(`/chat/media/${mediaId}/restore`, { token, method: 'POST' });
  return unwrap(env, (e) => e.data || true);
}

export async function generatePreview(file) {
  return buildPreviewMetadata(file);
}

export async function generateMetadata(file) {
  if (file.type.startsWith('image/')) {
    const thumbnailUrl = await generateImageThumbnail(file).catch(() => null);
    return { ...buildPreviewMetadata(file), thumbnailUrl };
  }
  if (file.type.startsWith('video/')) {
    const thumbnailUrl = await generateVideoThumbnail(file).catch(() => null);
    return { ...buildPreviewMetadata(file), thumbnailUrl };
  }
  return buildPreviewMetadata(file);
}

export function resolveUrls(media) {
  if (!media) return { url: null, thumbnailUrl: null };
  return {
    url: media.url || media.fileUrl,
    thumbnailUrl: media.thumbnailUrl || media.url,
  };
}

export async function prefetchMedia(queryClient, convId, token) {
  if (!queryClient || !convId) return;
  const start = Date.now();
  return queryClient.prefetchQuery({
    queryKey: mediaKeys.conversation(convId),
    queryFn: async () => {
      const env = await chatApiFetch(`/chat/conversations/${convId}/media`, { token });
      trackApiLatency(`/chat/conversations/${convId}/media`, Date.now() - start);
      return unwrap(env, (e) => e.data || []);
    },
  });
}

export function cacheMetadata(queryClient, mediaId, metadata) {
  if (!queryClient || !mediaId) return;
  queryClient.setQueryData(mediaKeys.metadata(mediaId), metadata);
}

export const MediaRepository = {
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadDocuments,
  uploadStickers,
  uploadGIF,
  downloadFile,
  cancelUpload,
  retryUpload,
  deleteAttachment,
  restoreAttachment,
  generatePreview,
  generateMetadata,
  resolveUrls,
  prefetchMedia,
  cacheMetadata,
};

export default MediaRepository;
