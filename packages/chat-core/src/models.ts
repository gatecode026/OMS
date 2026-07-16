export interface ChatMedia {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
}

export interface ChatMessageReaction {
  userId: string;
  userName: string;
  reaction: string;
}

export interface ChatMessage {
  id: string;
  tempId?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  senderRole: 'admin' | 'manager' | 'employee';
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'call' | 'system';
  contentType: 'plain' | 'task' | 'attendance' | 'leave' | 'payslip';
  createdAt: string;
  updatedAt?: string;
  isDeleted: boolean;
  isEdited: boolean;
  isPinned?: boolean;
  pinnedBy?: string;
  starredBy?: string[];
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  } | null;
  media?: ChatMedia | null;
  reactions?: ChatMessageReaction[];
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'retrying';
  failureReason?: 'timeout' | 'network' | 'server';
  deliveredTo?: string[];
  readBy?: string[];
}
