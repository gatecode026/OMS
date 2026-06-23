/**
 * @file src/hooks/useFileUpload.js
 * @description Hook that delegates file upload tracking to the global ChatContext.
 */

import { useChat } from '../context/ChatContext';

export const useFileUpload = () => {
  const {
    uploadQueue,
    startFileUpload,
    cancelFileUpload,
    retryFileUpload,
    removeUploadItem,
    clearFileUploads
  } = useChat();

  const isUploading = uploadQueue.some(item => item.status === 'uploading');
  const allUploadsSuccessful = uploadQueue.length > 0 && uploadQueue.every(item => item.status === 'success');

  return {
    queue: uploadQueue,
    isUploading,
    allUploadsSuccessful,
    startUpload: startFileUpload,
    cancelUpload: cancelFileUpload,
    retryUpload: retryFileUpload,
    clearQueue: clearFileUploads,
    removeQueueItem: removeUploadItem
  };
};

export default useFileUpload;
