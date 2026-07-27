/**
 * @file index.ts
 * @description Centralized Enterprise Shared Types & Interfaces for the OMS Mobile Application.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  companyId: string | null;
  status: string;
  avatar?: string;
  avatarUrl?: string;
  profilePhoto?: string;
  photoUrl?: string;
  department?: string;
  designation?: string;
  phone?: string;
  [key: string]: any;
}

export interface TenantContext {
  companyId: string;
  companyCode?: string;
  companyName?: string;
}

export interface MediaAttachment {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  type: 'image' | 'video' | 'file' | 'audio';
  thumbnailUrl?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
