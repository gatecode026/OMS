import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ImageKitUploadService from '../../../shared/services/imagekitUploadService';
import { getSocket } from '../../../shared/services/socketManager';
import { toast } from '../../../shared/components/Toast';
import { ChatMessage } from '../types';
import { useOfflineStore } from '../../../shared/store/offlineStore';

export type UploadState =
  | 'preparing'
  | 'compressing'
  | 'uploading'
  | 'uploaded'
  | 'sending'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'cancelled'
  | 'retrying';

interface UploadQueueOptions {
  conversationId: string;
  authUser: any;
  setLocalMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const useUploadQueue = ({ conversationId, authUser, setLocalMessages }: UploadQueueOptions) => {
  const queryClient = useQueryClient();
  const isConnected = useOfflineStore((s) => s.isConnected);

  const [uploadsProgress, setUploadsProgress] = useState<Record<string, number>>({});
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  const sendingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingRetryQueueRef = useRef<Array<{
    localUri: string;
    fileName: string;
    mimeType: string;
    tempId: string;
    type: 'image' | 'file' | 'audio';
  }>>([]);

  // Auto-resume queue when network reconnects
  useEffect(() => {
    if (isConnected && pendingRetryQueueRef.current.length > 0) {
      console.log('[UploadQueue] Reconnected! Auto-resuming pending uploads...');
      const queue = [...pendingRetryQueueRef.current];
      pendingRetryQueueRef.current = [];
      queue.forEach((item) => {
        uploadFileDirect(item.localUri, item.fileName, item.mimeType, item.tempId, item.type);
      });
    }
  }, [isConnected]);

  // Validation function
  const validateFile = (fileName: string, mimeType: string, fileSize: number) => {
    // 10MB limit for images, 50MB for video/documents
    const isImage = mimeType?.startsWith('image/');
    const limit = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    
    if (fileSize > limit) {
      throw new Error(`File exceeds size limit of ${isImage ? '10MB' : '50MB'}`);
    }

    const blockedExtensions = ['.exe', '.bat', '.sh', '.js', '.vbs'];
    const hasBlockedExt = blockedExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    if (hasBlockedExt) {
      throw new Error('File extension is blocked due to security policies');
    }
  };

  const uploadFileDirect = async (
    localUri: string,
    fileName: string,
    mimeType: string,
    tempId: string,
    type: 'image' | 'file' | 'audio',
    fileSize: number = 0
  ) => {
    try {
      setUploadStates((prev) => ({ ...prev, [tempId]: 'preparing' }));

      // Step 1: File Validation
      if (fileSize > 0) {
        validateFile(fileName, mimeType, fileSize);
      }

      // Step 2: Compression State
      setUploadStates((prev) => ({ ...prev, [tempId]: 'compressing' }));
      
      // Simulate stripping metadata & quality check
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Create Abort Controller & Upload
      const controller = new AbortController();
      abortControllersRef.current[tempId] = controller;

      setUploadStates((prev) => ({ ...prev, [tempId]: 'uploading' }));
      setUploadsProgress((prev) => ({ ...prev, [tempId]: 1 }));

      const authParams = await ImageKitUploadService.fetchAuthParams();

      const uploadRes = await ImageKitUploadService.upload(
        localUri,
        fileName,
        mimeType,
        authParams,
        (progress) => {
          setUploadsProgress((prev) => ({ ...prev, [tempId]: progress.percentage }));
        },
        controller.signal
      );

      // Step 4: Uploaded successfully
      setUploadStates((prev) => ({ ...prev, [tempId]: 'uploaded' }));
      setUploadsProgress((prev) => {
        const copy = { ...prev };
        delete copy[tempId];
        return copy;
      });

      // Step 5: Socket Sending State
      setUploadStates((prev) => ({ ...prev, [tempId]: 'sending' }));
      const socket = getSocket();
      
      // 10-second failure timer
      const timer = setTimeout(() => {
        const markFailed = (prev: ChatMessage[]) => {
          if (!prev) return [];
          return prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, status: 'failed' as const, failureReason: 'timeout' as const } : m);
        };
        setLocalMessages(markFailed);
        queryClient.setQueryData(['chat', 'messages', conversationId], markFailed);
        setUploadStates((prev) => ({ ...prev, [tempId]: 'failed' }));
        delete sendingTimeoutsRef.current[tempId];
      }, 10000);
      sendingTimeoutsRef.current[tempId] = timer;

      socket.emit('send_message', {
        conversationId,
        type,
        tempId,
        media: {
          url: uploadRes.url,
          fileName: uploadRes.name,
          fileSize: uploadRes.size,
          fileType: mimeType,
          imageKitFileId: uploadRes.fileId,
          imageKitFilePath: uploadRes.filePath,
        },
      }, (ack: any) => {
        if (ack && ack.success) {
          if (sendingTimeoutsRef.current[tempId]) {
            clearTimeout(sendingTimeoutsRef.current[tempId]);
            delete sendingTimeoutsRef.current[tempId];
          }
          const markSent = (prev: ChatMessage[]) => {
            if (!prev) return [];
            return prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, id: ack.messageId, status: 'sent' as const } : m);
          };
          setLocalMessages(markSent);
          queryClient.setQueryData(['chat', 'messages', conversationId], markSent);
          setUploadStates((prev) => ({ ...prev, [tempId]: 'delivered' }));
        } else {
          if (sendingTimeoutsRef.current[tempId]) {
            clearTimeout(sendingTimeoutsRef.current[tempId]);
            delete sendingTimeoutsRef.current[tempId];
          }
          const markFailed = (prev: ChatMessage[]) => {
            if (!prev) return [];
            return prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, status: 'failed' as const, failureReason: 'timeout' as const } : m);
          };
          setLocalMessages(markFailed);
          queryClient.setQueryData(['chat', 'messages', conversationId], markFailed);
          setUploadStates((prev) => ({ ...prev, [tempId]: 'failed' }));
        }
      });

    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.message === 'Aborted') {
        console.log('[UploadQueue] Aborted upload for tempId:', tempId);
        setUploadStates((prev) => ({ ...prev, [tempId]: 'cancelled' }));
        return;
      }
      
      console.log('[UploadQueue] Error uploading attachment:', err);
      setUploadsProgress((prev) => {
        const copy = { ...prev };
        delete copy[tempId];
        return copy;
      });

      // If network disconnected, add to retry queue for automatic resumption on reconnect
      if (!isConnected) {
        setUploadStates((prev) => ({ ...prev, [tempId]: 'failed' }));
        pendingRetryQueueRef.current.push({ localUri, fileName, mimeType, tempId, type });
        toast.info('Connection lost. Upload will resume on network reconnect.');
      } else {
        setUploadStates((prev) => ({ ...prev, [tempId]: 'failed' }));
        toast.error(err.message || 'Upload failed. Tap to retry.');
      }
    }
  };

  const cancelUpload = (tempId: string) => {
    const controller = abortControllersRef.current[tempId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[tempId];
    }
    
    // Clear progress and status details
    setUploadsProgress((prev) => {
      const copy = { ...prev };
      delete copy[tempId];
      return copy;
    });
    setUploadStates((prev) => ({ ...prev, [tempId]: 'cancelled' }));

    setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
    queryClient.setQueryData(['chat', 'messages', conversationId], (oldData: any) => {
      const list = Array.isArray(oldData) ? oldData : [];
      return list.filter((m: any) => m.id !== tempId);
    });
    toast.info('Upload cancelled');
  };

  useEffect(() => {
    return () => {
      // Cleanup all abort controllers and timers on unmount
      Object.values(abortControllersRef.current).forEach((ctrl) => ctrl.abort());
      Object.values(sendingTimeoutsRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
    uploadsProgress,
    uploadStates,
    uploadFileDirect,
    cancelUpload,
    sendingTimeoutsRef,
  };
};

export default useUploadQueue;
