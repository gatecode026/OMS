/**
 * @file src/hooks/useFileUpload.js
 * @description Custom React hook for managing file upload queue, tracking progress, and cancellation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ImageKitUploadService } from '../services/imagekitUploadService';

export const useFileUpload = () => {
  const { token, addToast } = useApp();
  const [queue, setQueue] = useState([]);
  const queueRef = useRef([]);

  // Keep ref in sync to avoid stale closures in callbacks
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const updateQueueItem = useCallback((id, updates) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const removeQueueItem = useCallback((id) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const uploadProcess = async (item, authToken) => {
    const { id, file } = item;
    const controller = new AbortController();
    
    updateQueueItem(id, { controller, status: 'uploading', error: null, progress: 0 });

    try {
      // 1. Fetch ImageKit upload authentication details from the backend
      const authParams = await ImageKitUploadService.fetchAuthParams(authToken);
      
      // 2. Perform direct upload to ImageKit
      const result = await ImageKitUploadService.upload(
        file,
        authParams,
        (progressData) => {
          updateQueueItem(id, {
            progress: progressData.percentage,
            speed: progressData.speed,
            eta: progressData.eta
          });
        },
        controller.signal
      );

      // 3. Record successful response
      updateQueueItem(id, {
        status: 'success',
        progress: 100,
        result: {
          url: result.url,
          thumbnailUrl: result.thumbnailUrl || result.url,
          fileName: result.name,
          fileSize: result.size,
          mimeType: file.type,
          fileType: file.type,
          imageKitFileId: result.fileId,
          imageKitFilePath: result.filePath
        }
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[useFileUpload] Upload aborted for:', file.name);
        return;
      }
      console.error('[useFileUpload] Upload failed:', err);
      updateQueueItem(id, {
        status: 'failed',
        error: err.message || 'Upload failed'
      });
    }
  };

  const startUpload = useCallback((file) => {
    if (!file) return;

    // Check for duplicate file in the active queue
    const currentQueue = queueRef.current;
    const isDuplicate = currentQueue.some(
      item => item.name === file.name && item.size === file.size && item.status !== 'failed'
    );
    
    if (isDuplicate) {
      addToast?.('warning', `File "${file.name}" is already uploading or uploaded.`);
      return;
    }

    const id = `${file.name}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newItem = {
      id,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'uploading',
      error: null,
      result: null,
      controller: null
    };

    setQueue(prev => [...prev, newItem]);
    
    // Defer processing to prevent blocking the React main render thread
    setTimeout(() => {
      uploadProcess(newItem, token);
    }, 0);
  }, [token, addToast]);

  const cancelUpload = useCallback((id) => {
    const item = queueRef.current.find(i => i.id === id);
    if (item) {
      if (item.controller) {
        item.controller.abort();
      }
      removeQueueItem(id);
    }
  }, [removeQueueItem]);

  const retryUpload = useCallback((id) => {
    const item = queueRef.current.find(i => i.id === id);
    if (item && item.status === 'failed') {
      updateQueueItem(id, {
        status: 'uploading',
        progress: 0,
        speed: 0,
        eta: 0,
        error: null
      });
      uploadProcess(item, token);
    }
  }, [token, updateQueueItem]);

  const clearQueue = useCallback(() => {
    queueRef.current.forEach(item => {
      if (item.controller) {
        item.controller.abort();
      }
    });
    setQueue([]);
  }, []);

  const isUploading = queue.some(item => item.status === 'uploading');
  const allUploadsSuccessful = queue.length > 0 && queue.every(item => item.status === 'success');

  return {
    queue,
    isUploading,
    allUploadsSuccessful,
    startUpload,
    cancelUpload,
    retryUpload,
    clearQueue,
    removeQueueItem
  };
};

export default useFileUpload;
