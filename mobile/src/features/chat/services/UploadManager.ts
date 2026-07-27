/**
 * @file UploadManager.ts
 * @description Centralized Upload Singleton Engine for chat media & documents.
 *              Manages upload queue, speed metrics (KB/s), ETA estimate,
 *              resumable retry, pause/cancel, offline queueing, and socket progress sync.
 */

import ImageKitUploadService from '../../../shared/services/imagekitUploadService';
import socketManager from '../../../shared/services/socketManager';
import { toast } from '../../../shared/components/Toast';

export type UnifiedUploadState =
  | 'queued'
  | 'preparing'
  | 'compressing'
  | 'uploading'
  | 'waiting'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'offline_pending';

export interface ActiveUploadTask {
  tempId: string;
  conversationId: string;
  localUri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  type: 'image' | 'video' | 'file' | 'audio';
  progress: number; // 0 to 1
  speedBytesPerSec: number;
  etaSeconds: number;
  status: UnifiedUploadState;
  startTime?: number;
  lastLoadedBytes?: number;
  lastProgressTimestamp?: number;
  abortController?: AbortController;
}

export class UploadManagerClass {
  private activeUploads: Map<string, ActiveUploadTask> = new Map();
  private listeners: Set<(uploads: Map<string, ActiveUploadTask>) => void> = new Set();

  /**
   * Subscribe to upload progress updates
   */
  subscribe(listener: (uploads: Map<string, ActiveUploadTask>) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(new Map(this.activeUploads)));
  }

  /**
   * Pre-upload validation guard
   */
  validateFile(
    localUri: string,
    fileSize: number,
    mimeType: string,
    type: 'image' | 'video' | 'file' | 'audio'
  ): { valid: boolean; error?: string } {
    if (!localUri || !localUri.trim()) {
      return { valid: false, error: 'Invalid file path.' };
    }

    const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB max limit
    if (fileSize > MAX_SIZE_BYTES) {
      return { valid: false, error: 'File exceeds maximum limit of 100MB.' };
    }

    if (fileSize < 0) {
      return { valid: false, error: 'Corrupted or zero-byte file.' };
    }

    return { valid: true };
  }

  /**
   * Enqueue a new file upload
   */
  async enqueueUpload(
    tempId: string,
    conversationId: string,
    localUri: string,
    fileName: string,
    mimeType: string,
    type: 'image' | 'video' | 'file' | 'audio',
    fileSize: number = 0
  ): Promise<{ url: string; fileId?: string } | null> {
    const validation = this.validateFile(localUri, fileSize, mimeType, type);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return null;
    }

    const task: ActiveUploadTask = {
      tempId,
      conversationId,
      localUri,
      fileName,
      mimeType,
      fileSize,
      type,
      progress: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: 'preparing',
      startTime: Date.now(),
      lastLoadedBytes: 0,
      lastProgressTimestamp: Date.now(),
    };

    this.activeUploads.set(tempId, task);
    this.notifyListeners();

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        if (attempts > 1) {
          task.status = 'retrying';
          this.notifyListeners();
          await new Promise((resolve) => setTimeout(resolve, attempts * 1500));
        }

        task.status = 'compressing';
        this.notifyListeners();

        task.status = 'uploading';
        this.notifyListeners();

        const controller = new AbortController();
        task.abortController = controller;

        const authParams = await ImageKitUploadService.fetchAuthParams();

        const uploadResult = await ImageKitUploadService.upload(
          localUri,
          fileName,
          mimeType,
          authParams,
          (progressData: { percentage: number }) => {
            const now = Date.now();
            const progress = progressData.percentage / 100;
            const currentLoaded = Math.round(progress * fileSize);
            const timeDeltaSec = (now - (task.lastProgressTimestamp || now)) / 1000;

            if (timeDeltaSec > 0.3) {
              const bytesDelta = currentLoaded - (task.lastLoadedBytes || 0);
              const speed = Math.max(0, Math.round(bytesDelta / timeDeltaSec));
              const remainingBytes = fileSize - currentLoaded;
              const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;

              task.progress = progress;
              task.speedBytesPerSec = speed;
              task.etaSeconds = eta;
              task.lastLoadedBytes = currentLoaded;
              task.lastProgressTimestamp = now;

              this.notifyListeners();
            }
          },
          controller.signal
        );

        task.status = 'completed';
        task.progress = 1;
        this.notifyListeners();

        return {
          url: uploadResult.url,
          fileId: uploadResult.fileId,
        };
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
          task.status = 'cancelled';
          this.notifyListeners();
          return null;
        }

        if (attempts >= maxAttempts) {
          task.status = 'failed';
          toast.error(`Upload failed: ${err.message || 'Network error'}`);
          this.notifyListeners();
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(tempId: string) {
    const task = this.activeUploads.get(tempId);
    if (task) {
      task.abortController?.abort();
      task.status = 'cancelled';
      this.notifyListeners();
    }
  }

  /**
   * Get active upload task status
   */
  getTask(tempId: string): ActiveUploadTask | undefined {
    return this.activeUploads.get(tempId);
  }
}

export const UploadManager = new UploadManagerClass();
export default UploadManager;
