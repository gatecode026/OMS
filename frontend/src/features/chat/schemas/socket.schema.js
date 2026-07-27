/**
 * @file features/chat/schemas/socket.schema.js
 * @description Zod runtime validation schemas for socket event payloads and mutation inputs.
 *   Prevents invalid or corrupt payloads from entering the React Query cache.
 *   Validation failures are logged only in development mode.
 */

import { z } from 'zod';

const isDev = Boolean(import.meta.env?.DEV);

/** Helper to safely parse and log dev warnings on schema mismatch */
export function safeValidate(schema, data, label = 'payload') {
  const result = schema.safeParse(data);
  if (!result.success && isDev) {
    console.warn(`[zod-validation] Invalid ${label}:`, result.error.format());
  }
  return result.success ? result.data : data;
}

// ── Mutation Input Schemas ──────────────────────────────────────────────────

export const ArchiveInputSchema = z.object({
  conversationId: z.string(),
});

export const UpdateMetadataSchema = z.object({
  conversationId: z.string(),
  name: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
}).passthrough();

export const RenameGroupSchema = z.object({
  conversationId: z.string(),
  name: z.string().min(1),
});

// ── Socket Payload Schemas ──────────────────────────────────────────────────

export const NewMessageSocketSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string().optional().nullable(),
  type: z.string().optional(),
  createdAt: z.union([z.string(), z.number(), z.date()]).optional(),
}).passthrough();

export const ConversationUpdatedSocketSchema = z.object({
  id: z.string().optional(),
  conversationId: z.string().optional(),
  name: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
}).passthrough();

export const TypingSocketSchema = z.object({
  conversationId: z.string(),
  userId: z.string().optional(),
  employeeId: z.string().optional(),
  name: z.string().optional(),
}).passthrough();

export const PresenceSocketSchema = z.object({
  userId: z.string().optional(),
  employeeId: z.string().optional(),
  status: z.string().optional(),
  chatStatus: z.string().optional(),
  onlineAt: z.union([z.string(), z.number(), z.date()]).optional(),
}).passthrough();

export default {
  safeValidate,
  ArchiveInputSchema,
  UpdateMetadataSchema,
  RenameGroupSchema,
  NewMessageSocketSchema,
  ConversationUpdatedSocketSchema,
  TypingSocketSchema,
  PresenceSocketSchema,
};
