/**
 * @file calling.types.ts
 * @description Master type definitions and data models for the OMS Enterprise Calling Platform.
 *              Supports Audio & Video 1-on-1 and Group calling, Meeting management,
 *              host controls, reactions, and signaling schemas.
 */

export type CallState =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'on_hold'
  | 'reconnecting'
  | 'ending'
  | 'ended'
  | 'rejected'
  | 'busy'
  | 'missed'
  | 'cancelled'
  | 'failed';

export type CallType = 'audio' | 'video';

export type CallQuality = 'Excellent' | 'Good' | 'Fair' | 'Weak' | 'Poor' | 'Reconnecting';

export type MeetingRole = 'host' | 'co_host' | 'participant' | 'moderator';

export type MeetingLayout = 'gallery' | 'speaker' | 'presentation' | 'audio_grid';

export type ReactionType = '👍' | '❤️' | '👏' | '🎉' | '😂' | '😮';

export interface CallUser {
  id: string;
  name: string;
  avatar: string | null;
  department?: string;
  role?: string;
  companyId?: string;
}

export interface GroupParticipant {
  userId: string;
  name: string;
  avatar: string | null;
  role: MeetingRole;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isSpeaking: boolean;
  joinedAt: string;
  stream?: any;
}

export interface ActiveCallSession {
  callId: string;
  callType: CallType;
  targetUser: CallUser;
  isIncoming: boolean;
  status: CallState;
  conversationId: string;
  isGroupCall?: boolean;
  meetingTitle?: string;
  startedAt?: number;
  connectedAt?: number;
}

export interface ScheduledMeeting {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  hostId: string;
  hostName: string;
  scheduledTime: string;
  durationMinutes: number;
  meetingCode: string;
  isLocked: boolean;
  waitingRoomEnabled: boolean;
}

export interface CallHistoryRecord {
  id: string;
  callId: string;
  targetUser: CallUser;
  callType: CallType;
  direction: 'incoming' | 'outgoing';
  result: 'completed' | 'missed' | 'rejected' | 'busy' | 'cancelled';
  duration: number; // in seconds
  timestamp: string;
}

export interface CallSignalPayload {
  callId: string;
  callerId?: string;
  callerName?: string;
  callerAvatar?: string | null;
  targetUserId?: string;
  callType?: CallType;
  conversationId?: string;
  reason?: 'busy' | 'declined' | 'timeout' | 'hangup';
  signal?: any;
  candidate?: any;
}
