/**
 * @file core/config/featureFlags.js
 * @description Centralized enterprise feature flags (Phase B, Message Engine & Media Pipeline).
 *   Driven by Vite environment variables (`import.meta.env.VITE_*`).
 *   Provides runtime architecture selection without placing flag checks inside UI components.
 */

function envBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

export const featureFlags = Object.freeze({
  /** Conversation layer flags */
  chatReactQueryEnabled: envBool(import.meta.env?.VITE_CHAT_REACT_QUERY_ENABLED, true),

  /** Message engine flags (OPRD-WEB-CHAT-003) */
  chatMessageEngineEnabled: envBool(import.meta.env?.VITE_CHAT_MESSAGE_ENGINE_ENABLED, true),
  chatThreadsEnabled: envBool(import.meta.env?.VITE_CHAT_THREADS_ENABLED, true),
  chatReactionsEnabled: envBool(import.meta.env?.VITE_CHAT_REACTIONS_ENABLED, true),
  chatEditEnabled: envBool(import.meta.env?.VITE_CHAT_EDIT_ENABLED, true),
  chatDeleteEnabled: envBool(import.meta.env?.VITE_CHAT_DELETE_ENABLED, true),
  chatForwardEnabled: envBool(import.meta.env?.VITE_CHAT_FORWARD_ENABLED, true),
  chatOfflineQueueEnabled: envBool(import.meta.env?.VITE_CHAT_OFFLINE_QUEUE_ENABLED, true),
  chatDraftEngineEnabled: envBool(import.meta.env?.VITE_CHAT_DRAFT_ENGINE_ENABLED, true),

  /** Media Pipeline flags (OPRD-WEB-CHAT-004) */
  chatMediaPipelineEnabled: envBool(import.meta.env?.VITE_CHAT_MEDIA_PIPELINE_ENABLED, true),
  chatVideoPreviewEnabled: envBool(import.meta.env?.VITE_CHAT_VIDEO_PREVIEW_ENABLED, true),
  chatDocumentPreviewEnabled: envBool(import.meta.env?.VITE_CHAT_DOCUMENT_PREVIEW_ENABLED, true),
  chatThumbnailEngineEnabled: envBool(import.meta.env?.VITE_CHAT_THUMBNAIL_ENGINE_ENABLED, true),
  chatUploadQueueEnabled: envBool(import.meta.env?.VITE_CHAT_UPLOAD_QUEUE_ENABLED, true),
  chatDownloadManagerEnabled: envBool(import.meta.env?.VITE_CHAT_DOWNLOAD_MANAGER_ENABLED, true),

  /** Engine flags */
  chatSocketEngineEnabled: envBool(import.meta.env?.VITE_CHAT_SOCKET_ENGINE_ENABLED, true),
  chatCallEngineEnabled: envBool(import.meta.env?.VITE_CHAT_CALL_ENGINE_ENABLED, true),
});

/** Runtime architecture selection getters */
export function isHardenedChatEnabled() {
  return featureFlags.chatReactQueryEnabled;
}

export function isMessageEngineEnabled() {
  return featureFlags.chatMessageEngineEnabled;
}

export function isMediaPipelineEnabled() {
  return featureFlags.chatMediaPipelineEnabled;
}

export function isThumbnailEngineEnabled() {
  return featureFlags.chatThumbnailEngineEnabled;
}

export function isUploadQueueEnabled() {
  return featureFlags.chatUploadQueueEnabled;
}

export function isDownloadManagerEnabled() {
  return featureFlags.chatDownloadManagerEnabled;
}

export function isOfflineQueueEnabled() {
  return featureFlags.chatOfflineQueueEnabled;
}

export function isDraftEngineEnabled() {
  return featureFlags.chatDraftEngineEnabled;
}

export function isSocketEngineEnabled() {
  return featureFlags.chatSocketEngineEnabled;
}

export function isCallEngineEnabled() {
  return featureFlags.chatCallEngineEnabled;
}

export default featureFlags;
