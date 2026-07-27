/**
 * @file useCallStore.ts
 * @description Centralized Zustand store for managing active call session state:
 *              Active call metadata, call status machine, call duration timer,
 *              media track states (mute, video, camera flip, speaker), and network quality.
 */

import { create } from 'zustand';

export type UnifiedCallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'reconnecting'
  | 'ended'
  | 'failed';

export interface CallTargetUser {
  id: string;
  name: string;
  avatar: string | null;
  department?: string;
  role?: string;
}

export interface ActiveCallData {
  callId: string;
  callType: 'audio' | 'video';
  targetUser: CallTargetUser;
  isIncoming: boolean;
  conversationId: string;
  status: UnifiedCallStatus;
}

interface CallStoreState {
  activeCall: ActiveCallData | null;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isFrontCamera: boolean;
  isSpeakerOn: boolean;
  isOnHold: boolean;
  networkQuality: 'excellent' | 'good' | 'poor';

  // Actions
  setActiveCall: (call: ActiveCallData | null) => void;
  setCallStatus: (status: UnifiedCallStatus) => void;
  setCallDuration: (duration: number | ((prev: number) => number)) => void;
  setIsMuted: (muted: boolean) => void;
  setIsVideoOff: (videoOff: boolean) => void;
  setIsFrontCamera: (front: boolean) => void;
  setIsSpeakerOn: (speakerOn: boolean) => void;
  setIsOnHold: (onHold: boolean) => void;
  setNetworkQuality: (quality: 'excellent' | 'good' | 'poor') => void;
  resetCallStore: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  activeCall: null,
  callDuration: 0,
  isMuted: false,
  isVideoOff: false,
  isFrontCamera: true,
  isSpeakerOn: false,
  isOnHold: false,
  networkQuality: 'excellent',

  setActiveCall: (call) => set({ activeCall: call }),
  setCallStatus: (status) =>
    set((state) => ({
      callStatus: status,
      activeCall: state.activeCall ? { ...state.activeCall, status } : null,
    })),
  setCallDuration: (duration) =>
    set((state) => ({
      callDuration: typeof duration === 'function' ? duration(state.callDuration) : duration,
    })),
  setIsMuted: (isMuted) => set({ isMuted }),
  setIsVideoOff: (isVideoOff) => set({ isVideoOff }),
  setIsFrontCamera: (isFrontCamera) => set({ isFrontCamera }),
  setIsSpeakerOn: (isSpeakerOn) => set({ isSpeakerOn }),
  setIsOnHold: (isOnHold) => set({ isOnHold }),
  setNetworkQuality: (networkQuality) => set({ networkQuality }),
  resetCallStore: () =>
    set({
      activeCall: null,
      callDuration: 0,
      isMuted: false,
      isVideoOff: false,
      isFrontCamera: true,
      isSpeakerOn: false,
      isOnHold: false,
      networkQuality: 'excellent',
    }),
}));

export default useCallStore;
