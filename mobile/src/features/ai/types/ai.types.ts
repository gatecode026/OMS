/**
 * @file ai.types.ts
 * @description Master type definitions for the OMS Enterprise AI Intelligence Platform,
 *              including real-time speech-to-text transcripts, executive summaries,
 *              action items, decisions, and AI chat assistant queries.
 */

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  speakerAvatar?: string | null;
  text: string;
  timestamp: string; // ISO or formatted time
  confidence: number;
  language: string;
}

export interface ActionItem {
  id: string;
  title: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'created_in_tasks';
}

export interface MeetingSummary {
  id: string;
  meetingId: string;
  meetingTitle: string;
  date: string;
  executiveSummary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  risks: string[];
  topics: string[];
  totalDurationMinutes: number;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AiSettings {
  transcriptionEnabled: boolean;
  autoSummaryEnabled: boolean;
  targetLanguage: string;
  autoTaskCreation: boolean;
}
