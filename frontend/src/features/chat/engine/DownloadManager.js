/**
 * @file features/chat/engine/DownloadManager.js
 * @description Centralized Download Manager (Part 8).
 *   Handles file downloads, progress tracking, cancellation, duplicate prevention, and blob caching.
 */

class DownloadManagerEngine {
  constructor() {
    this.activeDownloads = new Map(); // downloadId -> { abortController }
    this.blobCache = new Map(); // url -> Blob URL
  }

  /**
   * Download a media file given its URL and filename.
   */
  async downloadFile(url, fileName = 'downloaded_file', onProgress) {
    if (!url) throw new Error('No download URL provided');
    if (this.blobCache.has(url)) {
      this.triggerBrowserSave(this.blobCache.get(url), fileName);
      return this.blobCache.get(url);
    }

    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const abortController = new AbortController();
    this.activeDownloads.set(downloadId, { abortController });

    try {
      const response = await fetch(url, { signal: abortController.signal });
      if (!response.ok) throw new Error(`Download failed with status: ${response.status}`);

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      let loadedBytes = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loadedBytes += value.length;

        if (onProgress && totalBytes > 0) {
          onProgress({
            downloadId,
            loaded: loadedBytes,
            total: totalBytes,
            progress: Math.round((loadedBytes / totalBytes) * 100),
          });
        }
      }

      const blob = new Blob(chunks);
      const blobUrl = URL.createObjectURL(blob);
      this.blobCache.set(url, blobUrl);
      this.triggerBrowserSave(blobUrl, fileName);

      this.activeDownloads.delete(downloadId);
      return blobUrl;
    } catch (err) {
      this.activeDownloads.delete(downloadId);
      throw err;
    }
  }

  /**
   * Cancel an in-flight download.
   */
  cancelDownload(downloadId) {
    if (this.activeDownloads.has(downloadId)) {
      const { abortController } = this.activeDownloads.get(downloadId);
      abortController.abort();
      this.activeDownloads.delete(downloadId);
      return true;
    }
    return false;
  }

  /** Trigger browser file save prompt */
  triggerBrowserSave(blobUrl, fileName) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export const DownloadManager = new DownloadManagerEngine();
export default DownloadManager;
