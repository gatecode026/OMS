/**
 * @file DownloadManager.ts
 * @description Centralized Download Singleton Engine for downloading media & document
 *              attachments to local storage and sharing via native OS sheets.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { toast } from '../../../shared/components/Toast';

export interface ActiveDownloadTask {
  fileUrl: string;
  fileName: string;
  progress: number;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
}

export class DownloadManagerClass {
  private activeDownloads: Map<string, ActiveDownloadTask> = new Map();

  /**
   * Download remote URL to local cache and trigger Native Share / Save Sheet
   */
  async downloadAndSave(url: string, fileName: string): Promise<string | null> {
    try {
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const localPath = `${FileSystem.documentDirectory}${sanitizedName}`;

      // Check if file already exists locally and is non-zero
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists) {
        if ('size' in info && info.size > 0) {
          toast.info(`Opening ${fileName}`);
          await this.shareFile(localPath);
          return localPath;
        } else {
          // Delete broken zero-byte file
          await FileSystem.deleteAsync(localPath, { idempotent: true });
        }
      }

      toast.info(`Downloading ${fileName}...`);
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesExpectedToWrite > 0
              ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
              : 0;
          this.activeDownloads.set(url, {
            fileUrl: url,
            fileName,
            progress,
            status: 'downloading',
          });
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result && result.uri) {
        toast.success(`Downloaded ${fileName}`);
        await this.shareFile(result.uri);
        return result.uri;
      }

      return null;
    } catch (err: any) {
      toast.error(`Download failed: ${err.message || 'Error'}`);
      return null;
    }
  }

  /**
   * Invoke native OS share & save sheet
   */
  async shareFile(localUri: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        toast.info('Sharing is not available on this device');
        return;
      }
      await Sharing.shareAsync(localUri);
    } catch (err: any) {
      toast.error(`Sharing failed: ${err.message || 'Error'}`);
    }
  }
}

export const DownloadManager = new DownloadManagerClass();
export default DownloadManager;
