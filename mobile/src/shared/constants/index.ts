/**
 * @file index.ts
 * @description Centralized Enterprise Constants for the OMS Mobile Application.
 */

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PROFILE: 'user_profile',
  REMEMBER_ME: 'remember_me',
  REMEMBERED_EMAIL: 'remembered_email',
  REMEMBERED_COMPANY_CODE: 'remembered_company_code',
  OFFLINE_SYNC_QUEUE: 'offline_sync_queue',
  PUSH_TOKEN: 'push_token',
  THEME_MODE: 'theme_mode',
} as const;

export const ROUTE_NAMES = {
  LOGIN: '(auth)/login',
  INBOX: '(tabs)/inbox',
  ATTENDANCE: '(tabs)/attendance',
  WORK: '(tabs)/work',
  PROFILE: '(tabs)/profile',
  CHAT_ROOM: 'chat-room',
  ATTENDANCE_HISTORY: 'attendance-history',
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  SPLASH_MIN_MS: 1000,
} as const;

export const APP_LIMITS = {
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  SEARCH_DEBOUNCE_MS: 300,
  TYPING_DEBOUNCE_MS: 400,
  TYPING_AUTO_STOP_MS: 3000,
  OFFLINE_QUEUE_MAX_ITEMS: 100,
} as const;
