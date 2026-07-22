/**
 * @file useAiStore.ts
 * @description Zustand store for managing real-time speech-to-text transcripts,
 *              live subtitle overlay toggles, AI executive summaries, and AI chat assistant.
 */

import { create } from 'zustand';
import {
  ActionItem,
  AiChatMessage,
  MeetingSummary,
  TranscriptSegment,
} from '../types/ai.types';

interface AiStoreState {
  transcripts: TranscriptSegment[];
  isSubtitlesEnabled: boolean;
  targetLanguage: string;
  currentSummary: MeetingSummary | null;
  aiChatHistory: AiChatMessage[];
  isGeneratingSummary: boolean;

  // Actions
  addTranscriptSegment: (segment: TranscriptSegment) => void;
  clearTranscripts: () => void;
  setIsSubtitlesEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setTargetLanguage: (language: string) => void;
  setCurrentSummary: (summary: MeetingSummary | null) => void;
  setIsGeneratingSummary: (isGenerating: boolean) => void;
  addAiChatMessage: (message: AiChatMessage) => void;
  markActionItemCreated: (actionItemId: string) => void;
  resetAiStore: () => void;
}

export const useAiStore = create<AiStoreState>((set) => ({
  transcripts: [],
  isSubtitlesEnabled: true,
  targetLanguage: 'en',
  currentSummary: null,
  aiChatHistory: [
    {
      id: 'welcome-1',
      sender: 'assistant',
      content: 'Hello! I am your OMS AI Assistant. Ask me anything about your active meeting, decisions, or action items.',
      timestamp: Date.now(),
    },
  ],
  isGeneratingSummary: false,

  addTranscriptSegment: (segment) =>
    set((s) => ({
      transcripts: [...s.transcripts, segment],
    })),

  clearTranscripts: () => set({ transcripts: [] }),

  setIsSubtitlesEnabled: (enabled) =>
    set((s) => ({
      isSubtitlesEnabled: typeof enabled === 'function' ? enabled(s.isSubtitlesEnabled) : enabled,
    })),

  setTargetLanguage: (language) => set({ targetLanguage: language }),

  setCurrentSummary: (summary) => set({ currentSummary: summary }),

  setIsGeneratingSummary: (isGenerating) => set({ isGeneratingSummary: isGenerating }),

  addAiChatMessage: (message) =>
    set((s) => ({
      aiChatHistory: [...s.aiChatHistory, message],
    })),

  markActionItemCreated: (actionItemId) =>
    set((s) => {
      if (!s.currentSummary) return s;
      const updatedItems: ActionItem[] = s.currentSummary.actionItems.map((item) =>
        item.id === actionItemId ? { ...item, status: 'created_in_tasks' as const } : item
      );
      return {
        currentSummary: { ...s.currentSummary, actionItems: updatedItems },
      };
    }),

  resetAiStore: () =>
    set({
      transcripts: [],
      isSubtitlesEnabled: true,
      targetLanguage: 'en',
      currentSummary: null,
      aiChatHistory: [],
      isGeneratingSummary: false,
    }),
}));

export default useAiStore;
