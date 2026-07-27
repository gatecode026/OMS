/**
 * @file core/devtools/mediaPerf.js
 * @description Development-only performance telemetry for the Media Pipeline.
 *   Tree-shakes to no-ops in production mode.
 */

const isDev = Boolean(import.meta.env?.DEV);

export function trackUploadLatency(uploadId, durationMs, fileSize = 0) {
  if (isDev) {
    const speed = fileSize > 0 ? ((fileSize / 1024) / (durationMs / 1000)).toFixed(1) : 0;
    console.debug(`[perf:media-upload] Upload ${uploadId} completed in ${durationMs}ms (${speed} KB/s)`);
  }
}

export function trackDownloadLatency(downloadId, durationMs, fileSize = 0) {
  if (isDev) {
    const sizeKb = fileSize > 0 ? (fileSize / 1024).toFixed(1) : 0;
    console.debug(`[perf:media-download] Download ${downloadId} completed in ${durationMs}ms (${sizeKb} KB)`);
  }
}

export function trackThumbnailGenTiming(mediaId, durationMs) {
  if (isDev) {
    console.debug(`[perf:thumbnail-gen] Thumbnail for ${mediaId} generated in ${durationMs}ms`);
  }
}

export function trackApiLatency(endpoint, durationMs) {
  if (isDev) {
    console.debug(`[perf:media-api] ${endpoint} executed in ${durationMs}ms`);
  }
}

export const mediaPerf = {
  trackUploadLatency,
  trackDownloadLatency,
  trackThumbnailGenTiming,
  trackApiLatency,
};

export default mediaPerf;
