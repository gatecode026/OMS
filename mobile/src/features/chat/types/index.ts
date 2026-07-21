/**
 * @file index.ts
 * @description Type definitions for the Enterprise Chat feature module.
 */

export interface ChatParticipant {
  employeeId: string;
  name: string;
  avatar: string | null;
  role: string;
  joinedAt: string;
  isAdmin: boolean;
  lastReadAt?: string | null;
  lastReadMessageId?: string | null;
}

export interface LastMessagePreview {
  messageId: string | null;
  content: string | null;
  type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'system' | 'emoji' | 'call' | 'poll' | 'task' | 'leave' | 'attendance' | 'payslip' | 'project' | 'meeting' | 'contact' | 'location';
  senderId: string | null;
  senderName: string | null;
  sentAt: string | null;
  isDeleted: boolean;
}

export interface ChatConversation {
  id: string;
  companyId: string;
  type: 'direct' | 'group';
  name: string | null;
  description: string | null;
  avatar: string | null;
  createdBy: string | null;
  branch: string | null;
  participants: ChatParticipant[];
  lastMessage: LastMessagePreview;
  lastActivityAt: string;
  isActive: boolean;
  unreadCount?: number;
  pinned?: boolean;
  muted?: boolean;
  isArchived?: boolean;
  isHidden?: boolean;
  pinnedBy?: { employeeId: string; pinnedAt: string }[];
  mutedBy?: { employeeId: string; mutedUntil?: string }[];
  archivedBy?: { userId: string; archivedAt: string }[];
  hiddenBy?: { userId: string; hiddenAt: string }[];
}

export interface ChatMessageReaction {
  reaction: string;
  employeeId: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  tempId?: string | null;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  senderRole: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'system' | 'emoji' | 'call' | 'poll' | 'task' | 'leave' | 'attendance' | 'payslip' | 'project' | 'meeting' | 'contact' | 'location';
  contentType: 'plain' | 'markdown';
  createdAt: string;
  isDeleted: boolean;
  isEdited: boolean;
  replyTo?: {
    messageId: string | null;
    content: string | null;
    senderId: string | null;
    senderName: string | null;
    type: string;
  } | null;
  media?: {
    url: string | null;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    duration?: number | null;
    imageKitFileId?: string | null;
    imageKitFilePath?: string | null;
  } | null;
  readBy?: {
    employeeId: string;
    name: string;
    readAt: string;
  }[];
  deliveredTo?: {
    employeeId: string;
    deliveredAt: string;
  }[];
  status?: 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'retrying';
  failureReason?: 'network_error' | 'upload_failed' | 'timeout' | 'unauthorized' | 'disconnected';
  reactions?: ChatMessageReaction[];
  isPinned?: boolean;
  starredBy?: string[];
  threadId?: string | null;
  threadReplyCount?: number;
  isThreadReply?: boolean;
}

export interface CallLog {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  callType: 'voice' | 'video';
  status: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'ended';
  startedAt: string;
  endedAt?: string;
  duration?: number;
}

export interface ThreadItem {
  threadId: string;
  rootMessageId: string;
  conversationId: string;
  replyCount: number;
  lastReplyAt: string;
  status: 'active' | 'archived' | 'closed';
  createdBy: string;
  createdByDetails: { id: string; name: string; avatar: string | null };
  participantsDetails: { id: string; name: string; avatar: string | null }[];
  unreadCount: number;
  rootMessagePreview: string;
  rootMsgSenderName: string;
  lastReplyPreview: string | null;
  lastReplySenderName: string | null;
}

export interface ThreadDetails {
  _id: string;
  rootMessageId: string;
  conversationId: string;
  participants: string[];
  followers: string[];
  createdBy: string;
  replyCount: number;
  lastReplyAt: string;
  status: 'active' | 'archived' | 'closed';
  rootMessage: ChatMessage;
  createdByDetails: { id: string; name: string; avatar: string | null };
  participantsDetails: { id: string; name: string; avatar: string | null }[];
  followersDetails: { id: string; name: string; avatar: string | null }[];
}

export interface PinnedMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'system' | 'emoji' | 'call' | 'poll';
  text: string;
  attachment: any;
  originalTimestamp: string;
  pinnedTimestamp: string;
  isPinned: boolean;
}

export interface WallpaperConfig {
  type: 'default' | 'solid' | 'gradient' | 'image';
  value: string; // Color code, gradient details, or image source
}

export interface BlockedUser {
  id: string;
  name: string;
  avatar?: string;
  blockedAt?: string;
  reason?: string;
}
