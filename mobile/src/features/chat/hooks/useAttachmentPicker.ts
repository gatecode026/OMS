/**
 * @file useAttachmentPicker.ts
 * @description Centralized attachment picker hook routing camera, gallery,
 *              and document selection through AttachmentPickerManager.
 */

import AttachmentPickerManager from '../services/AttachmentPickerManager';
import { PreviewItem } from '../components/AttachmentPreviewModal';

interface AttachmentPickerOptions {
  conversationId: string;
  onPickedFiles: (items: PreviewItem[]) => void;
  onSendMock: (label: string, text: string) => void;
}

export const useAttachmentPicker = ({
  onPickedFiles,
  onSendMock,
}: AttachmentPickerOptions) => {
  // Gallery — multi-select images and videos
  const handleAttachImage = async () => {
    const assets = await AttachmentPickerManager.pickGalleryMedia(true);
    if (assets.length > 0) {
      const items: PreviewItem[] = assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType,
        type: a.type === 'video' ? 'video' : 'image',
        size: a.size,
        duration: a.duration,
      }));
      onPickedFiles(items);
    }
  };

  // Camera capture
  const handleCameraCapture = async () => {
    const asset = await AttachmentPickerManager.pickCameraImage();
    if (asset) {
      onPickedFiles([
        {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          type: 'image',
          size: asset.size,
        },
      ]);
    }
  };

  // Document picker
  const handleDocumentPicker = async (allowedTypes: string[] = ['*/*']) => {
    const assets = await AttachmentPickerManager.pickDocument(allowedTypes);
    if (assets.length > 0) {
      const items: PreviewItem[] = assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType,
        type: a.type === 'video' ? 'video' : a.type === 'image' ? 'image' : 'file',
        size: a.size,
      }));
      onPickedFiles(items);
    }
  };

  const handleMockAttachment = (label: string, text: string) => {
    onSendMock(label, text);
  };

  return {
    handleAttachImage,
    handleCameraCapture,
    handleDocumentPicker,
    handleMockAttachment,
  };
};

export default useAttachmentPicker;
