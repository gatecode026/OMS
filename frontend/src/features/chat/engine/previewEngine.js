/**
 * @file features/chat/engine/previewEngine.js
 * @description Preview Engine (Part 9).
 *   Abstracts preview resolution for image, video, audio, PDF, office documents, code files, and unknown fallbacks.
 */

import { getDocumentIconDescriptor } from './thumbnailPipeline.js';

export function resolvePreviewType(mimeType = '', filename = '') {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office';
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'md', 'txt'].includes(ext)) return 'code';

  return 'unknown';
}

export function buildPreviewMetadata(fileOrMedia) {
  if (!fileOrMedia) return null;

  const filename = fileOrMedia.name || fileOrMedia.fileName || 'file';
  const mimeType = fileOrMedia.type || fileOrMedia.mimeType || 'application/octet-stream';
  const previewType = resolvePreviewType(mimeType, filename);
  const docDescriptor = getDocumentIconDescriptor(filename);

  return {
    filename,
    mimeType,
    previewType,
    fileSize: fileOrMedia.size || fileOrMedia.fileSize || 0,
    iconDescriptor: docDescriptor,
    url: fileOrMedia.url || (fileOrMedia instanceof File ? URL.createObjectURL(fileOrMedia) : null),
  };
}

export const previewEngine = {
  resolvePreviewType,
  buildPreviewMetadata,
};

export default previewEngine;
