/**
 * @file useCollaborationStore.ts
 * @description Zustand store managing interactive whiteboard paths, undo/redo stack,
 *              active drawing tools, laser pointer coordinates, and presentation state.
 */

import { create } from 'zustand';
import {
  CollaborationMode,
  DrawingTool,
  LaserPointerState,
  PresentationState,
  WhiteboardPath,
} from '../types/collaboration.types';

interface CollaborationStoreState {
  collaborationMode: CollaborationMode;
  isSharing: boolean;
  presenterId: string | null;
  presenterName: string | null;

  // Drawing Tools State
  activeTool: DrawingTool;
  strokeColor: string;
  strokeWidth: number;
  paths: WhiteboardPath[];
  undoStack: WhiteboardPath[][];
  redoStack: WhiteboardPath[][];

  // Laser Pointer State
  laserPointer: LaserPointerState | null;

  // Presentation State
  presentation: PresentationState | null;

  // Actions
  setCollaborationMode: (mode: CollaborationMode, presenterId?: string, presenterName?: string) => void;
  setActiveTool: (tool: DrawingTool) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  addPath: (path: WhiteboardPath) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  setLaserPointer: (pointer: LaserPointerState | null) => void;
  setPresentation: (presentation: PresentationState | null) => void;
  setPresentationPage: (page: number) => void;
  setPresentationZoom: (zoom: number) => void;
  resetCollaboration: () => void;
}

export const useCollaborationStore = create<CollaborationStoreState>((set) => ({
  collaborationMode: 'none',
  isSharing: false,
  presenterId: null,
  presenterName: null,

  activeTool: 'pen',
  strokeColor: '#38BDF8',
  strokeWidth: 3,
  paths: [],
  undoStack: [],
  redoStack: [],

  laserPointer: null,
  presentation: null,

  setCollaborationMode: (mode, presenterId, presenterName) =>
    set({
      collaborationMode: mode,
      isSharing: mode !== 'none',
      presenterId: presenterId || null,
      presenterName: presenterName || null,
    }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),

  addPath: (newPath) =>
    set((s) => ({
      undoStack: [...s.undoStack, s.paths],
      redoStack: [],
      paths: [...s.paths, newPath],
    })),

  clearCanvas: () =>
    set((s) => ({
      undoStack: [...s.undoStack, s.paths],
      redoStack: [],
      paths: [],
    })),

  undo: () =>
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const previousPaths = s.undoStack[s.undoStack.length - 1];
      const newUndoStack = s.undoStack.slice(0, -1);
      return {
        paths: previousPaths,
        undoStack: newUndoStack,
        redoStack: [...s.redoStack, s.paths],
      };
    }),

  redo: () =>
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const nextPaths = s.redoStack[s.redoStack.length - 1];
      const newRedoStack = s.redoStack.slice(0, -1);
      return {
        paths: nextPaths,
        redoStack: newRedoStack,
        undoStack: [...s.undoStack, s.paths],
      };
    }),

  setLaserPointer: (pointer) => set({ laserPointer: pointer }),

  setPresentation: (presentation) => set({ presentation }),

  setPresentationPage: (page) =>
    set((s) => ({
      presentation: s.presentation
        ? {
            ...s.presentation,
            currentPage: Math.max(1, Math.min(page, s.presentation.totalPages)),
          }
        : null,
    })),

  setPresentationZoom: (zoom) =>
    set((s) => ({
      presentation: s.presentation
        ? {
            ...s.presentation,
            zoomLevel: Math.max(0.5, Math.min(zoom, 3.0)),
          }
        : null,
    })),

  resetCollaboration: () =>
    set({
      collaborationMode: 'none',
      isSharing: false,
      presenterId: null,
      presenterName: null,
      activeTool: 'pen',
      strokeColor: '#38BDF8',
      strokeWidth: 3,
      paths: [],
      undoStack: [],
      redoStack: [],
      laserPointer: null,
      presentation: null,
    }),
}));

export default useCollaborationStore;
