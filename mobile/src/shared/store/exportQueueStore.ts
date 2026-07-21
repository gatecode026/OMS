/**
 * @file exportQueueStore.ts
 * @description Zustand store for tracking chat data export statuses and history records.
 */

import { create } from 'zustand';

export interface ExportJob {
  conversationId: string;
  format: 'TXT' | 'PDF';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileUrl?: string;
  error?: string;
}

interface ExportQueueState {
  jobs: Record<string, ExportJob>; // key: `${conversationId}_${format}`
  history: ExportJob[];
  addJob: (conversationId: string, format: 'TXT' | 'PDF') => void;
  updateJob: (conversationId: string, format: 'TXT' | 'PDF', updates: Partial<Omit<ExportJob, 'conversationId' | 'format'>>) => void;
  removeJob: (conversationId: string, format: 'TXT' | 'PDF') => void;
  clearHistory: () => void;
}

export const useExportQueueStore = create<ExportQueueState>((set, get) => ({
  jobs: {},
  history: [],

  addJob: (conversationId, format) => set((state) => {
    const key = `${conversationId}_${format}`;
    const newJob: ExportJob = {
      conversationId,
      format,
      status: 'pending',
      progress: 0,
    };
    return {
      jobs: {
        ...state.jobs,
        [key]: newJob,
      },
    };
  }),

  updateJob: (conversationId, format, updates) => set((state) => {
    const key = `${conversationId}_${format}`;
    const job = state.jobs[key];
    if (!job) return state;

    const updatedJob = { ...job, ...updates };

    let nextHistory = state.history;
    if (updates.status === 'completed' || updates.status === 'failed') {
      nextHistory = [updatedJob, ...state.history].slice(0, 50); // limit history count
    }

    return {
      jobs: {
        ...state.jobs,
        [key]: updatedJob,
      },
      history: nextHistory,
    };
  }),

  removeJob: (conversationId, format) => set((state) => {
    const key = `${conversationId}_${format}`;
    const updated = { ...state.jobs };
    delete updated[key];
    return { jobs: updated };
  }),

  clearHistory: () => set({ history: [] }),
}));

export default useExportQueueStore;
