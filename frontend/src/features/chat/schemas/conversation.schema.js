/**
 * @file features/chat/schemas/conversation.schema.js
 * @description Runtime validation (Zod) for conversation API payloads. Used by
 *   ConversationRepository to reject malformed server responses before they
 *   reach the React Query cache — preventing cache corruption (addendum §8).
 *
 *   Kept intentionally permissive (`.passthrough()`, optional fields) because
 *   the backend conversation shape is broad (see
 *   backend/src/modules/chat/conversation.model.js) and we must not drop fields
 *   the UI relies on. The goal is to catch *structurally* broken payloads
 *   (missing id, wrong types), not to enforce an exhaustive schema.
 */

import { z } from 'zod';

const ParticipantSchema = z
  .object({
    employeeId: z.string(),
    name: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
  })
  .passthrough();

export const ConversationSchema = z
  .object({
    id: z.string(),
    type: z.enum(['direct', 'group']).optional(),
    name: z.string().optional().nullable(),
    participants: z.array(ParticipantSchema).optional(),
    lastMessage: z.object({}).passthrough().optional().nullable(),
    unreadCount: z.number().optional(),
    lastActivityAt: z.union([z.string(), z.number(), z.date()]).optional().nullable(),
  })
  .passthrough();

export const ConversationsResponseSchema = z.array(ConversationSchema);

/**
 * Validate + return a conversation list, throwing on structural corruption.
 * @param {unknown} data
 * @returns {Array}
 */
export function parseConversations(data) {
  return ConversationsResponseSchema.parse(data);
}
