/**
 * @file features/chat/index.js
 * @description Public barrel for web chat feature layer (Phase B, Message Engine, & Media Pipeline).
 */

// Core infrastructure
export { queryClient } from '../../core/query/queryClient.js';
export { chatKeys } from '../../core/query/queryKeys.js';
export { chatApiFetch, unwrap } from '../../core/network/httpClient.js';
export { SocketProvider, useSocketContext } from '../../core/socket/SocketProvider.jsx';
export { useSocketEvent } from '../../core/socket/useSocketEvent.js';
export { CLIENT_EMIT, SERVER_EVENT } from '../../core/socket/SocketEvents.js';

// Conversation Feature & Cache
export { default as ConversationRepository } from './data/ConversationRepository.js';
export { useConversationsQuery } from './hooks/useConversationsQuery.js';
export { patchConversations, readConversations, normalize, denormalize } from './cache/conversationsCache.js';

// Message Engine Repositories & Cache (OPRD-WEB-CHAT-003)
export { default as MessageRepository } from './data/MessageRepository.js';
export { default as MessageSearchRepository } from './data/MessageSearchRepository.js';
export { messageKeys } from './query/messageKeys.js';
export { useMessagesQuery, useInfiniteMessagesQuery } from './hooks/useMessagesQuery.js';
export {
  denormalizeMessages,
  readConversationMessages,
  upsertMessages,
  appendOptimisticMessage,
  confirmMessageDelivered,
  markMessageFailed,
  patchMessageById,
  removeMessageById,
} from './cache/messagesCache.js';

// Media Pipeline Repositories, Cache & Engines (OPRD-WEB-CHAT-004)
export { default as MediaRepository } from './data/MediaRepository.js';
export { mediaKeys } from './query/mediaKeys.js';
export { useMediaQuery } from './hooks/useMediaQuery.js';
export { UploadManager } from './engine/UploadManager.js';
export { DownloadManager } from './engine/DownloadManager.js';
export { thumbnailPipeline } from './engine/thumbnailPipeline.js';
export { previewEngine } from './engine/previewEngine.js';
export {
  readConversationMedia,
  upsertMedia,
  updateUploadProgress,
  confirmUploadCompleted,
  markUploadFailed,
  cacheThumbnailUrl,
  cachePreviewUrl,
} from './cache/mediaCache.js';

// Engines
export { optimisticEngine } from './engine/optimisticEngine.js';
export { offlineQueue } from './engine/offlineQueue.js';
export { draftEngine } from './engine/draftEngine.js';

// Socket Dispatchers & Handlers
export { setupSocketDispatcher, teardownSocketDispatcher } from './socket/socketDispatcher.js';
export { setupSocketMessageDispatcher, teardownSocketMessageDispatcher } from './socket/socketMessageDispatcher.js';
export { setupSocketMediaDispatcher, teardownSocketMediaDispatcher } from './socket/socketMediaDispatcher.js';
export { conversationEventHandlers } from './socket/conversationEventHandler.js';
export { messageEventHandlers } from './socket/messageEventHandler.js';
export { mediaEventHandlers } from './socket/mediaEventHandler.js';

// Schemas & Validation
export { parseConversations, ConversationSchema } from './schemas/conversation.schema.js';
export { safeValidate } from './schemas/socket.schema.js';
export { parseMessage, parseMessageList, safeValidateMessage } from './schemas/message.schema.js';
export { validateMediaSecurity, sanitizeFilename, safeValidateMedia } from './schemas/media.schema.js';
