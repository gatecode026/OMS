/**
 * @file AttachmentPickerManager.ts
 * @description Centralized Source Selection Manager for chat attachments.
 *              Handles Camera, Gallery, Document, PDF, and Audio selection
 *              with native permission guards and file security validation.
 */

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { toast } from '../../../shared/components/Toast';

export interface SelectedAttachment {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  type: 'image' | 'video' | 'file' | 'audio';
  duration?: number;
}

export class AttachmentPickerManagerClass {
  // File size limits in bytes
  readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  readonly MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB
  readonly BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.js', '.vbs', '.msi'];

  /**
   * Validate file extension & size limits
   */
  validateFile(fileName: string, mimeType: string, fileSize: number = 0): void {
    const lowerName = fileName.toLowerCase();
    const isBlocked = this.BLOCKED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (isBlocked) {
      throw new Error(`Security Exception: Files with extension '${fileName.split('.').pop()}' are blocked.`);
    }

    const isImage = mimeType.startsWith('image/');
    const limit = isImage ? this.MAX_IMAGE_SIZE : this.MAX_MEDIA_SIZE;
    if (fileSize > limit) {
      const limitMB = limit / (1024 * 1024);
      throw new Error(`File exceeds maximum allowed size of ${limitMB}MB.`);
    }
  }

  /**
   * Pick Image from Camera
   */
  async pickCameraImage(): Promise<SelectedAttachment | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Camera permission is required to capture photos');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName || `camera_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';
      const size = asset.fileSize || 0;

      this.validateFile(fileName, mimeType, size);

      return {
        uri: asset.uri,
        name: fileName,
        mimeType,
        size,
        type: 'image',
      };
    } catch (err: any) {
      toast.error(err.message || 'Camera capture failed');
      return null;
    }
  }

  /**
   * Pick Media (Images/Videos) from Gallery
   */
  async pickGalleryMedia(allowMultiple: boolean = true): Promise<SelectedAttachment[]> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Gallery permission is required to select photos and videos');
        return [];
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: allowMultiple,
        quality: 0.8,
      });

      if (result.canceled || !result.assets) {
        return [];
      }

      const selected: SelectedAttachment[] = [];
      for (const asset of result.assets) {
        const isVid = asset.type === 'video' || asset.mimeType?.startsWith('video/');
        const fileName = asset.fileName || `${isVid ? 'video' : 'photo'}_${Date.now()}.${isVid ? 'mp4' : 'jpg'}`;
        const mimeType = asset.mimeType || (isVid ? 'video/mp4' : 'image/jpeg');
        const size = asset.fileSize || 0;

        try {
          this.validateFile(fileName, mimeType, size);
          selected.push({
            uri: asset.uri,
            name: fileName,
            mimeType,
            size,
            type: isVid ? 'video' : 'image',
            duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
          });
        } catch (e: any) {
          toast.error(e.message);
        }
      }

      return selected;
    } catch (err: any) {
      toast.error(err.message || 'Gallery selection failed');
      return [];
    }
  }

  /**
   * Pick Document / PDF / File via native Document Picker
   */
  async pickDocument(allowedTypes: string[] = ['*/*']): Promise<SelectedAttachment[]> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets) {
        return [];
      }

      const selected: SelectedAttachment[] = [];
      for (const asset of result.assets) {
        const fileName = asset.name || `file_${Date.now()}`;
        const mimeType = asset.mimeType || 'application/octet-stream';
        const size = asset.size || 0;

        try {
          this.validateFile(fileName, mimeType, size);
          selected.push({
            uri: asset.uri,
            name: fileName,
            mimeType,
            size,
            type: mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : 'file',
          });
        } catch (e: any) {
          toast.error(e.message);
        }
      }

      return selected;
    } catch (err: any) {
      toast.error(err.message || 'Document selection failed');
      return [];
    }
  }
}

export const AttachmentPickerManager = new AttachmentPickerManagerClass();
export default AttachmentPickerManager;
