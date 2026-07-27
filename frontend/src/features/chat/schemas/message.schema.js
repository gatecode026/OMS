/**
 * @file features/chat/schemas/message.schema.js
 * @description Zod runtime validation schemas for message entities, payloads, and mutations.
 *   Prevents invalid or corrupted message payloads from entering the React Query cache.
 */

import { z } from 'zod';

const isDev = Boolean(import.meta.env?.DEV);

/** Helper to safely validate and output dev warnings */
export function safeValidateMessage(schema, data, label = 'message payload') {
  const result = schema.safeParse(data);
  if (!result.success && isDev) {
    console.warn(`[zod-message-validation] Invalid ${label}:`, result.error.format());
  }
  return result.success ? result.data : data;
}

// ── Message Entity Schemas ──────────────────────────────────────────────────

export const MessageSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  tempId: z.string().optional().nullable(),
  conversationId: z.string(),
  senderId: z.string().optional(),
  senderName: z.string().optional().nullable(),
  senderAvatar: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  type: z.string().optional(),
  replyTo: z.any().optional().nullable(),
  reactions: z.array(z.any()).optional(),
  media: z.any().optional().nullable(),
  createdAt: z.union([z.string(), z.number(), z.date()]).optional(),
  _deliveryStatus: z.enum(['sending', 'delivered', 'failed', 'seen']).optional(),
}).passthrough();

export const MessageListResponseSchema = z.object({
  messages: z.array(MessageSchema),
  pagination: z.object({
    hasMore: z.boolean().optional(),
    cursor: z.union([z.string(), z.number(), z.null()]).optional(),
  }).optional(),
}).passthrough();

// ── Mutation Input Schemas ──────────────────────────────────────────────────

export const SendMessageMutationSchema = z.object({
  conversationId: z.string(),
  content: z.string().optional().nullable(),
  type: z.string().optional(),
  replyTo: z.any().optional().nullable(),
  media: z.any().optional().nullable(),
  tempId: z.string().optional(),
});

export const EditMessageMutationSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  content: z.string(),
});

export const ReactionMutationSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  emoji: z.string(),
});

export const ForwardMessageMutationSchema = z.object({
  messageId: z.string(),
  targetConversationId: z.string(),
});

export function parseMessage(data) {
  return MessageSchema.parse(data);
}

export function parseMessageList(data) {
  return MessageListResponseSchema.parse(data);
}

export default {
  safeValidateMessage,
  MessageSchema,
  MessageListResponseSchema,
  SendMessageMutationSchema,
  EditMessageMutationSchema,
  ReactionMutationSchema,
  ForwardMessageMutationSchema,
  parseMessage,
  parseMessageList,
};
