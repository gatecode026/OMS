/**
 * @file collaboration.types.ts
 * @description Master type definitions for real-time collaboration, interactive whiteboard,
 *              laser pointer, live annotations, and PDF/image presentation mode.
 */

export type CollaborationMode = 'none' | 'screen' | 'whiteboard' | 'presentation';

export type DrawingTool = 'pen' | 'highlighter' | 'eraser' | 'laser' | 'select';

export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardPath {
  id: string;
  userId: string;
  points: Point[];
  color: string;
  width: number;
  tool: DrawingTool;
}

export interface LaserPointerState {
  x: number;
  y: number;
  userId: string;
  userName: string;
  isActive: boolean;
}

export interface PresentationState {
  fileUrl: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'presentation';
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
}

export interface CollaborationSignalPayload {
  meetingId: string;
  senderId: string;
  senderName: string;
  mode: CollaborationMode;
  path?: WhiteboardPath;
  pointer?: LaserPointerState;
  presentation?: PresentationState;
}
