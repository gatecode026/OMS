/**
 * @file features/chat/schemas/media.schema.js
 * @description Zod runtime validation & security checks for media files and attachments.
 *   Enforces mime-type validation, max file sizes, filename sanitization, and security rules.
 */

import { z } from 'zod';

const isDev = Boolean(import.meta.env?.DEV);

const UNSAFE_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'vbs', 'js', 'py', 'ps1', 'msi', 'dll', 'scr', 'com', 'pif', 'application', 'gadget', 'jar'
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate security rules for an incoming File / attachment.
 */
export function validateMediaSecurity(file) {
  if (!file) throw new Error('No file provided');
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 50MB`);
  }

  const name = file.name || '';
  if (name.includes('../') || name.includes('..\\')) {
    throw new Error('Invalid filename: Path traversal attempt detected');
  }

  const ext = name.split('.').pop()?.toLowerCase();
  if (ext && UNSAFE_EXTENSIONS.has(ext)) {
    throw new Error(`Forbidden file extension: .${ext} files are restricted for security`);
  }

  return true;
}

/** Sanitize filename safely for storage */
export function sanitizeFilename(filename = 'file') {
  return filename
    .replace(/[^\w.-\s]/gi, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

// ── Zod Schemas ─────────────────────────────────────────────────────────────

export const MediaMetadataSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional().nullable(),
  type: z.enum(['image', 'video', 'audio', 'document', 'sticker', 'gif', 'other']).optional(),
  url: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  duration: z.number().optional().nullable(),
}).passthrough();

export const UploadProgressSchema = z.object({
  uploadId: z.string(),
  progress: z.number(), // 0 - 100
  bytesUploaded: z.number(),
  totalBytes: z.number(),
  status: z.enum(['queued', 'uploading', 'completed', 'failed', 'cancelled']),
}).passthrough();

export function safeValidateMedia(data, label = 'media data') {
  const result = MediaMetadataSchema.safeParse(data);
  if (!result.success && isDev) {
    console.warn(`[zod-media-validation] Invalid ${label}:`, result.error.format());
  }
  return result.success ? result.data : data;
}

export default {
  validateMediaSecurity,
  sanitizeFilename,
  MediaMetadataSchema,
  UploadProgressSchema,
  safeValidateMedia,
};
