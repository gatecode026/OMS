/**
 * @file fileUtils.ts
 * @description Shared utilities for chat attachment rendering — file icons, byte formatting,
 *              extension extraction, and MIME type guards. Used by FileMessage, AttachmentPreviewModal,
 *              and the attachment bottom sheet.
 */

// ─── MIME TYPE GUARDS ────────────────────────────────────────────────────────

export const isImageMime = (mimeType?: string | null): boolean =>
  !!mimeType && mimeType.startsWith('image/');

export const isVideoMime = (mimeType?: string | null): boolean =>
  !!mimeType && mimeType.startsWith('video/');

export const isAudioMime = (mimeType?: string | null): boolean =>
  !!mimeType && mimeType.startsWith('audio/');

export const isPdfMime = (mimeType?: string | null): boolean =>
  mimeType === 'application/pdf';

export const isWordMime = (mimeType?: string | null): boolean =>
  mimeType === 'application/msword' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const isExcelMime = (mimeType?: string | null): boolean =>
  mimeType === 'application/vnd.ms-excel' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const isPptMime = (mimeType?: string | null): boolean =>
  mimeType === 'application/vnd.ms-powerpoint' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const isZipMime = (mimeType?: string | null): boolean =>
  mimeType === 'application/zip' ||
  mimeType === 'application/x-zip-compressed' ||
  mimeType === 'application/x-rar-compressed' ||
  mimeType === 'application/x-tar';

export const isCsvMime = (mimeType?: string | null): boolean =>
  mimeType === 'text/csv' || mimeType === 'application/csv';

export const isTxtMime = (mimeType?: string | null): boolean =>
  mimeType === 'text/plain';

// ─── FILE EXTENSION ───────────────────────────────────────────────────────────

export const getFileExtension = (fileName?: string | null): string => {
  if (!fileName) return '';
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toUpperCase();
};

// ─── FILE ICON ────────────────────────────────────────────────────────────────

export interface FileIconInfo {
  /** Ionicons icon name */
  icon: string;
  /** Accent color for the icon */
  color: string;
  /** Soft background tint */
  bgColor: string;
  /** Human-readable type label */
  label: string;
}

export const getFileIcon = (mimeType?: string | null, fileName?: string | null): FileIconInfo => {
  if (isPdfMime(mimeType)) {
    return { icon: 'document-text', color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)', label: 'PDF' };
  }
  if (isWordMime(mimeType)) {
    return { icon: 'document', color: '#2563EB', bgColor: 'rgba(37,99,235,0.12)', label: 'Word' };
  }
  if (isExcelMime(mimeType) || isCsvMime(mimeType)) {
    return { icon: 'grid', color: '#16A34A', bgColor: 'rgba(22,163,74,0.12)', label: 'Excel' };
  }
  if (isPptMime(mimeType)) {
    return { icon: 'easel', color: '#EA580C', bgColor: 'rgba(234,88,12,0.12)', label: 'PPT' };
  }
  if (isZipMime(mimeType)) {
    return { icon: 'archive', color: '#7C3AED', bgColor: 'rgba(124,58,237,0.12)', label: 'Archive' };
  }
  if (isTxtMime(mimeType)) {
    return { icon: 'reader', color: '#475569', bgColor: 'rgba(71,85,105,0.12)', label: 'Text' };
  }
  if (isAudioMime(mimeType)) {
    return { icon: 'musical-notes', color: '#DB2777', bgColor: 'rgba(219,39,119,0.12)', label: 'Audio' };
  }
  if (isVideoMime(mimeType)) {
    return { icon: 'videocam', color: '#0EA5E9', bgColor: 'rgba(14,165,233,0.12)', label: 'Video' };
  }
  if (isImageMime(mimeType)) {
    return { icon: 'image', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)', label: 'Image' };
  }
  // Fallback check by file extension
  const ext = getFileExtension(fileName).toLowerCase();
  if (ext === 'apk') {
    return { icon: 'logo-android', color: '#3DDC84', bgColor: 'rgba(61,220,132,0.12)', label: 'APK' };
  }
  return { icon: 'document-attach', color: '#64748B', bgColor: 'rgba(100,116,139,0.12)', label: 'File' };
};

// ─── BYTE FORMATTER ───────────────────────────────────────────────────────────

export const formatBytes = (bytes?: number | null): string => {
  if (!bytes || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${value} ${sizes[i]}`;
};

// ─── DURATION FORMATTER ───────────────────────────────────────────────────────

export const formatDuration = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};
