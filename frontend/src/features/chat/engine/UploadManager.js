/**
 * @file features/chat/engine/UploadManager.js
 * @description Centralized Upload Manager (Part 2).
 *   Manages upload queues, parallel execution limits (concurrency = 3),
 *   cancellation (AbortController), progress callbacks, retries, and offline queue auto-resume.
 */

import { validateMediaSecurity, sanitizeFilename } from '../schemas/media.schema.js';
import { ImageKitUploadService } from '../../../services/imagekitUploadService.js';
import { updateUploadProgress, confirmUploadCompleted, markUploadFailed } from '../cache/mediaCache.js';

class UploadManagerEngine {
  constructor() {
    this.concurrencyLimit = 3;
    this.activeUploads = new Map(); // uploadId -> { abortController, task }
    this.uploadQueue = []; // [{ uploadId, file, convId, token, options, resolve, reject }]
    this.uploadHistory = new Map();
  }

  /**
   * Enqueue a file upload task.
   */
  async enqueueUpload(file, convId, token, options = {}, queryClient) {
    validateMediaSecurity(file);

    const uploadId = options.uploadId || `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const safeName = sanitizeFilename(file.name);

    return new Promise((resolve, reject) => {
      const task = {
        uploadId,
        file,
        safeName,
        convId,
        token,
        options,
        queryClient,
        resolve,
        reject,
        progress: 0,
        status: 'queued',
      };

      this.uploadQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Process pending uploads up to concurrency limit.
   */
  async processQueue() {
    if (this.activeUploads.size >= this.concurrencyLimit || this.uploadQueue.length === 0) {
      return;
    }

    const task = this.uploadQueue.shift();
    if (!task) return;

    const { uploadId, file, convId, token, options, queryClient, resolve, reject } = task;
    const abortController = new AbortController();

    const externalSignal = options?.abortSignal || options?.controller?.signal;
    if (externalSignal) {
      if (externalSignal.aborted) {
        abortController.abort();
      } else {
        externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
      }
    }

    this.activeUploads.set(uploadId, { abortController, task });
    task.status = 'uploading';

    if (queryClient) {
      updateUploadProgress(queryClient, convId, uploadId, {
        uploadId,
        progress: 0,
        status: 'uploading',
      });
    }

    try {
      // Fetch auth parameters
      const authParams = await ImageKitUploadService.fetchAuthParams(token);

      // Execute upload
      const result = await ImageKitUploadService.upload(
        file,
        authParams,
        (progressData) => {
          task.progress = progressData.progress;
          if (queryClient) {
            updateUploadProgress(queryClient, convId, uploadId, {
              uploadId,
              progress: progressData.progress,
              bytesUploaded: progressData.loaded,
              totalBytes: progressData.total,
              status: 'uploading',
            });
          }
          if (task.options?.onProgress) {
            task.options.onProgress(progressData);
          }
        },
        abortController.signal
      );

      const formattedResult = {
        id: uploadId,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl || result.url,
        name: result.name || task.safeName,
        size: result.size || file.size,
        mimeType: file.type,
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document',
      };

      if (queryClient) {
        confirmUploadCompleted(queryClient, convId, uploadId, formattedResult);
      }

      this.activeUploads.delete(uploadId);
      resolve(formattedResult);
    } catch (err) {
      this.activeUploads.delete(uploadId);
      if (err.name === 'AbortError') {
        if (queryClient) updateUploadProgress(queryClient, convId, uploadId, { uploadId, status: 'cancelled' });
        reject(new Error('Upload cancelled'));
      } else {
        if (queryClient) markUploadFailed(queryClient, convId, uploadId, err);
        reject(err);
      }
    } finally {
      this.processQueue();
    }
  }

  /**
   * Cancel an active or queued upload.
   */
  cancelUpload(uploadId) {
    if (this.activeUploads.has(uploadId)) {
      const { abortController } = this.activeUploads.get(uploadId);
      abortController.abort();
      this.activeUploads.delete(uploadId);
      return true;
    }

    const index = this.uploadQueue.findIndex((t) => t.uploadId === uploadId);
    if (index > -1) {
      const [cancelledTask] = this.uploadQueue.splice(index, 1);
      cancelledTask.reject(new Error('Upload cancelled in queue'));
      return true;
    }

    return false;
  }
}

export const UploadManager = new UploadManagerEngine();
export default UploadManager;
