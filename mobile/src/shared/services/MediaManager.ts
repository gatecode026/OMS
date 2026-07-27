/**
 * @file MediaManager.ts
 * @description Unified Enterprise Media Manager Facade for images, videos, voice notes, documents,
 *              avatars, upload queue, download manager, and multi-tier cache orchestration.
 */

import AvatarCacheManager from './AvatarCacheManager';
import UserProfileManager from './UserProfileManager';
import { UploadManager } from '../../features/chat/services/UploadManager';
import { DownloadManager } from '../../features/chat/services/DownloadManager';
import { pdfViewerService } from './pdfViewerService';
import ENV from '../../config/env';

export interface MediaProcessingOptions {
  quality?: 'thumbnail' | 'medium' | 'high' | 'original';
  networkQuality?: '2G' | '3G' | '4G' | '5G' | 'wifi';
  width?: number;
  height?: number;
}

export class MediaManagerClass {
  /**
   * Resolve an avatar URI via single-source-of-truth AvatarCacheManager
   */
  resolveAvatar(userId: string, rawFallbackUrl?: string | null): string | undefined {
    return AvatarCacheManager.resolve(userId, rawFallbackUrl);
  }

  /**
   * Resolve attachment media URL with progressive quality adaptation
   */
  resolveMediaUrl(rawUrl: string, options: MediaProcessingOptions = {}): string {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const clean = rawUrl.trim();
    if (!clean) return '';

    if (
      clean.startsWith('http://') ||
      clean.startsWith('https://') ||
      clean.startsWith('data:image/') ||
      clean.startsWith('file://')
    ) {
      return clean;
    }

    const baseUrl = ENV.API_URL.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
    const cleanPath = clean.startsWith('/') ? clean : `/${clean}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Download and open a document/file attachment locally
   */
  async downloadAndSaveFile(url: string, fileName: string): Promise<string | null> {
    const fullUrl = this.resolveMediaUrl(url);
    return DownloadManager.downloadAndSave(fullUrl, fileName);
  }

  /**
   * Open PDF document preview via pdfViewerService
   */
  async openPdfDocument(url: string, title: string): Promise<boolean> {
    const fullUrl = this.resolveMediaUrl(url);
    return pdfViewerService.openPdf(fullUrl, title);
  }

  /**
   * Get metadata and icon mapping for supported file types
   */
  getFileTypeMetadata(fileName: string): { extension: string; category: 'pdf' | 'doc' | 'sheet' | 'slide' | 'archive' | 'audio' | 'video' | 'image' | 'generic'; iconName: string } {
    if (!fileName) return { extension: '', category: 'generic', iconName: 'document-attach' };
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    switch (ext) {
      case 'pdf':
        return { extension: ext, category: 'pdf', iconName: 'document-text' };
      case 'doc':
      case 'docx':
      case 'txt':
        return { extension: ext, category: 'doc', iconName: 'document' };
      case 'xls':
      case 'xlsx':
      case 'csv':
        return { extension: ext, category: 'sheet', iconName: 'stats-chart' };
      case 'ppt':
      case 'pptx':
        return { extension: ext, category: 'slide', iconName: 'easel' };
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return { extension: ext, category: 'archive', iconName: 'archive' };
      case 'mp3':
      case 'm4a':
      case 'wav':
      case 'aac':
        return { extension: ext, category: 'audio', iconName: 'musical-notes' };
      case 'mp4':
      case 'mov':
      case 'mkv':
      case 'avi':
        return { extension: ext, category: 'video', iconName: 'videocam' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
        return { extension: ext, category: 'image', iconName: 'image' };
      default:
        return { extension: ext, category: 'generic', iconName: 'document-attach' };
    }
  }

  /**
   * Validate file before network transfer
   */
  validateFile(localUri: string, fileSize: number, mimeType: string, type: 'image' | 'video' | 'file' | 'audio') {
    return UploadManager.validateFile(localUri, fileSize, mimeType, type);
  }

  /**
   * Queue file for background upload
   */
  async queueUpload(
    tempId: string,
    conversationId: string,
    localUri: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    type: 'image' | 'video' | 'file' | 'audio'
  ) {
    return UploadManager.enqueueUpload(tempId, conversationId, localUri, fileName, mimeType, type, fileSize);
  }

  /**
   * Cancel an active upload task
   */
  cancelUpload(tempId: string) {
    return UploadManager.cancelUpload(tempId);
  }
}

export const MediaManager = new MediaManagerClass();
export default MediaManager;
