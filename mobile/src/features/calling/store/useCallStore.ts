/**
 * @file useCallStore.ts
 * @description Zustand store for managing enterprise calling state, active session,
 *              group call participants, raised hands, layout modes, reactions, and call history.
 */

import { create } from 'zustand';
import {
  ActiveCallSession,
  CallHistoryRecord,
  CallQuality,
  CallState,
  GroupParticipant,
  MeetingLayout,
  ReactionType,
} from '../types/calling.types';

export interface LiveReaction {
  id: string;
  userId: string;
  userName: string;
  emoji: ReactionType;
  timestamp: number;
}

interface CallStoreState {
  activeSession: ActiveCallSession | null;
  callState: CallState;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  isOnHold: boolean;
  isFrontCamera: boolean;
  networkQuality: CallQuality;
  callHistory: CallHistoryRecord[];

  // Group Call & Collaboration extensions
  groupParticipants: GroupParticipant[];
  activeSpeakerId: string | null;
  raisedHands: string[];
  layoutMode: MeetingLayout;
  waitingRoomQueue: GroupParticipant[];
  activeReactions: LiveReaction[];
  isMeetingLocked: boolean;

  // Actions
  setActiveSession: (session: ActiveCallSession | null) => void;
  setCallState: (state: CallState) => void;
  setCallDuration: (duration: number | ((prev: number) => number)) => void;
  setIsMuted: (isMuted: boolean | ((prev: boolean) => boolean)) => void;
  setIsVideoOff: (isVideoOff: boolean | ((prev: boolean) => boolean)) => void;
  setIsSpeakerOn: (isSpeakerOn: boolean | ((prev: boolean) => boolean)) => void;
  setIsOnHold: (isOnHold: boolean | ((prev: boolean) => boolean)) => void;
  setIsFrontCamera: (isFrontCamera: boolean | ((prev: boolean) => boolean)) => void;
  setNetworkQuality: (quality: CallQuality) => void;
  addHistoryRecord: (record: CallHistoryRecord) => void;

  // Group & Collaboration Actions
  setGroupParticipants: (participants: GroupParticipant[]) => void;
  addParticipant: (participant: GroupParticipant) => void;
  removeParticipant: (userId: string) => void;
  setActiveSpeakerId: (userId: string | null) => void;
  toggleRaiseHand: (userId: string) => void;
  setLayoutMode: (mode: MeetingLayout) => void;
  addReaction: (userId: string, userName: string, emoji: ReactionType) => void;
  admitWaitingUser: (userId: string) => void;
  rejectWaitingUser: (userId: string) => void;
  setIsMeetingLocked: (isLocked: boolean) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  activeSession: null,
  callState: 'idle',
  callDuration: 0,
  isMuted: false,
  isVideoOff: false,
  isSpeakerOn: false,
  isOnHold: false,
  isFrontCamera: true,
  networkQuality: 'Excellent',
  callHistory: [],

  // Group extensions initial state
  groupParticipants: [],
  activeSpeakerId: null,
  raisedHands: [],
  layoutMode: 'gallery',
  waitingRoomQueue: [],
  activeReactions: [],
  isMeetingLocked: false,

  setActiveSession: (session) =>
    set({
      activeSession: session,
      callState: session ? session.status : 'idle',
    }),

  setCallState: (state) =>
    set((s) => ({
      callState: state,
      activeSession: s.activeSession ? { ...s.activeSession, status: state } : null,
    })),

  setCallDuration: (duration) =>
    set((s) => ({
      callDuration: typeof duration === 'function' ? duration(s.callDuration) : duration,
    })),

  setIsMuted: (isMuted) =>
    set((s) => ({
      isMuted: typeof isMuted === 'function' ? isMuted(s.isMuted) : isMuted,
    })),

  setIsVideoOff: (isVideoOff) =>
    set((s) => ({
      isVideoOff: typeof isVideoOff === 'function' ? isVideoOff(s.isVideoOff) : isVideoOff,
    })),

  setIsSpeakerOn: (isSpeakerOn) =>
    set((s) => ({
      isSpeakerOn: typeof isSpeakerOn === 'function' ? isSpeakerOn(s.isSpeakerOn) : isSpeakerOn,
    })),

  setIsOnHold: (isOnHold) =>
    set((s) => ({
      isOnHold: typeof isOnHold === 'function' ? isOnHold(s.isOnHold) : isOnHold,
    })),

  setIsFrontCamera: (isFrontCamera) =>
    set((s) => ({
      isFrontCamera: typeof isFrontCamera === 'function' ? isFrontCamera(s.isFrontCamera) : isFrontCamera,
    })),

  setNetworkQuality: (quality) => set({ networkQuality: quality }),

  addHistoryRecord: (record) =>
    set((s) => ({
      callHistory: [record, ...s.callHistory].slice(0, 100),
    })),

  // Group & Collaboration Actions
  setGroupParticipants: (participants) => set({ groupParticipants: participants }),

  addParticipant: (participant) =>
    set((s) => ({
      groupParticipants: [...s.groupParticipants.filter((p) => p.userId !== participant.userId), participant],
    })),

  removeParticipant: (userId) =>
    set((s) => ({
      groupParticipants: s.groupParticipants.filter((p) => p.userId !== userId),
      raisedHands: s.raisedHands.filter((id) => id !== userId),
    })),

  setActiveSpeakerId: (userId) => set({ activeSpeakerId: userId }),

  toggleRaiseHand: (userId) =>
    set((s) => {
      const isRaised = s.raisedHands.includes(userId);
      const nextRaised = isRaised
        ? s.raisedHands.filter((id) => id !== userId)
        : [...s.raisedHands, userId];
      return { raisedHands: nextRaised };
    }),

  setLayoutMode: (mode) => set({ layoutMode: mode }),

  addReaction: (userId, userName, emoji) =>
    set((s) => {
      const newReaction: LiveReaction = {
        id: Math.random().toString(),
        userId,
        userName,
        emoji,
        timestamp: Date.now(),
      };
      return {
        activeReactions: [newReaction, ...s.activeReactions].slice(0, 10),
      };
    }),

  admitWaitingUser: (userId) =>
    set((s) => {
      const target = s.waitingRoomQueue.find((u) => u.userId === userId);
      return {
        waitingRoomQueue: s.waitingRoomQueue.filter((u) => u.userId !== userId),
        groupParticipants: target ? [...s.groupParticipants, target] : s.groupParticipants,
      };
    }),

  rejectWaitingUser: (userId) =>
    set((s) => ({
      waitingRoomQueue: s.waitingRoomQueue.filter((u) => u.userId !== userId),
    })),

  setIsMeetingLocked: (isLocked) => set({ isMeetingLocked: isLocked }),

  resetCall: () =>
    set({
      activeSession: null,
      callState: 'idle',
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isSpeakerOn: false,
      isOnHold: false,
      isFrontCamera: true,
      networkQuality: 'Excellent',
      groupParticipants: [],
      activeSpeakerId: null,
      raisedHands: [],
      layoutMode: 'gallery',
      waitingRoomQueue: [],
      activeReactions: [],
      isMeetingLocked: false,
    }),
}));

export default useCallStore;
