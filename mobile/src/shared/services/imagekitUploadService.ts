/**
 * @file imagekitUploadService.ts
 * @description Service for directly uploading files to ImageKit from the mobile app with progress tracking and cancellation.
 */

import apiClient from './apiClient';

export interface ImageKitAuthParams {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
}

export interface ProgressData {
  percentage: number;
  speed: number; // bytes/sec
  eta: number; // seconds
  loaded: number;
  total: number;
}

export interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  size: number;
  filePath: string;
  url: string;
  fileType: string;
  height?: number;
  width?: number;
  thumbnailUrl?: string;
}

export const ImageKitUploadService = {
  /**
   * Fetch client authentication parameters from the backend
   * Uses the standard apiClient which handles JWT injection and company headers
   */
  async fetchAuthParams(): Promise<ImageKitAuthParams> {
    const response = await apiClient.get('/api/v1/chat/imagekit/auth');
    
    // Support standard success envelope
    const result = response.data;
    if (result.status !== 'success' || !result.data) {
      throw new Error(result.message || 'Failed to fetch ImageKit auth parameters');
    }
    
    return result.data;
  },

  /**
   * Upload a file to ImageKit using XMLHttpRequest to support progress tracking in React Native
   */
  upload(
    localUri: string,
    fileName: string,
    mimeType: string,
    authParams: ImageKitAuthParams,
    onProgress: (data: ProgressData) => void,
    abortSignal?: AbortSignal
  ): Promise<ImageKitUploadResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastTime = startTime;
      let lastLoaded = 0;

      // Handle abort
      if (abortSignal) {
        const handleAbort = () => {
          xhr.abort();
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        };
        abortSignal.addEventListener('abort', handleAbort);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const currentTime = Date.now();
          const loaded = event.loaded;
          const total = event.total;
          const percentage = Math.round((loaded / total) * 100);

          // Calculate speed: bytes per millisecond -> bytes per second
          const timeElapsed = currentTime - lastTime;
          let speed = 0;
          if (timeElapsed > 0) {
            const bytesSent = loaded - lastLoaded;
            speed = (bytesSent / timeElapsed) * 1000;
          }

          // Calculate ETA
          let eta = 0;
          const totalElapsed = currentTime - startTime;
          if (loaded > 0) {
            const overallSpeed = loaded / totalElapsed; // bytes/ms
            const remainingBytes = total - loaded;
            eta = Math.round((remainingBytes / overallSpeed) / 1000); // in seconds
          }

          lastTime = currentTime;
          lastLoaded = loaded;

          onProgress({
            percentage,
            speed,
            eta,
            loaded,
            total,
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid JSON response from ImageKit'));
          }
        } else {
          let errorMsg = `Upload failed (Status ${xhr.status})`;
          try {
            const errObj = JSON.parse(xhr.responseText);
            if (errObj && errObj.message) {
              errorMsg = errObj.message;
            }
          } catch (e) {
            if (xhr.statusText) {
              errorMsg += `: ${xhr.statusText}`;
            }
          }
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during ImageKit upload'));
      };

      xhr.onabort = () => {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      };

      const uploadUrl = 'https://upload.imagekit.io/api/v1/files/upload';

      const formData = new FormData();
      
      // In React Native, FormData file parameter must be appended as an object with uri, name, and type properties
      formData.append('file', {
        uri: localUri,
        name: fileName,
        type: mimeType,
      } as any);
      
      formData.append('fileName', fileName);
      formData.append('publicKey', authParams.publicKey);
      formData.append('signature', authParams.signature);
      formData.append('token', authParams.token);
      formData.append('expire', String(authParams.expire));
      formData.append('folder', '/chat_uploads');
      formData.append('useUniqueFileName', 'true');

      xhr.open('POST', uploadUrl, true);
      xhr.send(formData);
    });
  },
};

export default ImageKitUploadService;
