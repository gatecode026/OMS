/**
 * @file src/modules/chat/chat.validation.js
 * @description Input validation helpers for chat operations.
 */

export const validateSendMessage = (data) => {
  const errors = [];
  if (!data.conversationId) errors.push('conversationId is required');
  if (!data.content && data.type === 'text')
    errors.push('content is required for text messages');
  if (!['text', 'image', 'file', 'audio', 'emoji'].includes(data.type || 'text'))
    errors.push('Invalid message type');
  return errors;
};

export const validateCreateGroup = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length < 2)
    errors.push('Group name must be at least 2 characters');
  if (!data.participantIds || data.participantIds.length < 1)
    errors.push('At least 1 participant required');
  if (data.participantIds?.length > 256)
    errors.push('Maximum 256 participants allowed');
  return errors;
};
