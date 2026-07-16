/**
 * @file useAttachmentPicker.ts
 * @description Attachment picker hook.
 * Supports multi-image selection (up to 10), camera capture, and document picking.
 * Returns arrays of picked items for the AttachmentPreviewModal.
 */

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { toast } from '../../../shared/components/Toast';
import { PreviewItem } from '../components/AttachmentPreviewModal';

interface AttachmentPickerOptions {
  conversationId: string;
  onPickedFiles: (items: PreviewItem[]) => void;
  onSendMock: (label: string, text: string) => void;
}

export const useAttachmentPicker = ({
  conversationId,
  onPickedFiles,
  onSendMock,
}: AttachmentPickerOptions) => {

  // Gallery — multi-select images (and single videos)
  const handleAttachImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Gallery access is required. Please allow it in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
      // Note: allowsEditing is incompatible with allowsMultipleSelection on iOS
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const items: PreviewItem[] = result.assets.map((asset) => {
        const isVideo = asset.type === 'video' || asset.mimeType?.startsWith('video/');
        return {
          uri: asset.uri,
          name: asset.fileName || (isVideo ? `video_${Date.now()}.mp4` : `photo_${Date.now()}.jpg`),
          mimeType: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
          type: isVideo ? 'video' : 'image',
          size: asset.fileSize ?? undefined,
          duration: asset.duration ?? undefined,
        };
      });
      onPickedFiles(items);
    }
  };

  // Camera capture — single photo
  const handleCameraCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      toast.error('Camera access is required. Please allow it in Settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      onPickedFiles([
        {
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          type: 'image',
          size: asset.fileSize ?? undefined,
        },
      ]);
    }
  };

  // Document picker — any supported type
  const handleDocumentPicker = async (mimeTypes?: string[]) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes ?? ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        onPickedFiles([
          {
            uri: asset.uri,
            name: asset.name || 'document',
            mimeType: asset.mimeType || 'application/octet-stream',
            type: 'file',
            size: asset.size ?? undefined,
          },
        ]);
      }
    } catch (e) {
      console.warn('[useAttachmentPicker] Document picking error:', e);
      toast.error('Could not open document picker.');
    }
  };

  const handleMockAttachment = (label: string, desc?: string) => {
    const finalDesc = desc || `${label} Reference Attachment`;
    onSendMock(label, finalDesc);
  };

  return {
    handleAttachImage,
    handleCameraCapture,
    handleDocumentPicker,
    handleMockAttachment,
  };
};

export default useAttachmentPicker;
