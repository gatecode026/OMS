/**
 * @file imagekitUploadService.ts
 * @description Service for directly uploading files to ImageKit from the mobile app with progress tracking and cancellation.
 */

import apiClient from './apiClient';

import * as FileSystem from 'expo-file-system/legacy';

export interface ImageKitAuthParams {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  fallback?: boolean;
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
    try {
      const response = await apiClient.get('/api/v1/chat/imagekit/auth');
      const result = response.data;
      if (result.status === 'success' && result.data) {
        return result.data;
      }
      return { token: '', expire: 0, signature: '', publicKey: '', fallback: true };
    } catch {
      return { token: '', expire: 0, signature: '', publicKey: '', fallback: true };
    }
  },

  /**
   * Upload via backend server fallback endpoint when direct ImageKit upload is unavailable
   */
  async uploadViaBackendServer(
    localUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (data: ProgressData) => void
  ): Promise<ImageKitUploadResponse> {
    if (onProgress) {
      onProgress({ percentage: 20, speed: 0, eta: 0, loaded: 20, total: 100 });
    }

    let fileData = localUri;
    if (!localUri.startsWith('data:')) {
      try {
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileData = `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
      } catch {
        try {
          const response = await fetch(localUri);
          const blob = await response.blob();
          const reader = new FileReader();
          fileData = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e2) {
          console.warn('[ImageKitUploadService] Base64 conversion fallback failed:', e2);
        }
      }
    }

    if (onProgress) {
      onProgress({ percentage: 60, speed: 0, eta: 0, loaded: 60, total: 100 });
    }

    const res = await apiClient.post('/api/v1/chat/imagekit/upload', {
      fileData,
      fileName,
      mimeType,
    });

    if (onProgress) {
      onProgress({ percentage: 100, speed: 0, eta: 0, loaded: 100, total: 100 });
    }

    const data = res.data?.data || res.data;
    return {
      fileId: data.fileId || `local_${Date.now()}`,
      name: data.name || fileName,
      size: data.size || 0,
      filePath: data.filePath || data.url,
      url: data.url,
      fileType: mimeType,
    };
  },

  /**
   * Upload a file to ImageKit using XMLHttpRequest to support progress tracking in React Native
   */
  async upload(
    localUri: string,
    fileName: string,
    mimeType: string,
    authParams: ImageKitAuthParams,
    onProgress: (data: ProgressData) => void,
    abortSignal?: AbortSignal
  ): Promise<ImageKitUploadResponse> {
    if (authParams?.fallback || !authParams?.publicKey || !authParams?.signature) {
      console.log('[ImageKitUploadService] ImageKit unconfigured — using backend server upload fallback.');
      return this.uploadViaBackendServer(localUri, fileName, mimeType, onProgress);
    }

    try {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const startTime = Date.now();
        let lastTime = startTime;
        let lastLoaded = 0;

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

            const timeElapsed = currentTime - lastTime;
            let speed = 0;
            if (timeElapsed > 0) {
              const bytesSent = loaded - lastLoaded;
              speed = (bytesSent / timeElapsed) * 1000;
            }

            let eta = 0;
            const totalElapsed = currentTime - startTime;
            if (loaded > 0) {
              const overallSpeed = loaded / totalElapsed;
              const remainingBytes = total - loaded;
              eta = Math.round((remainingBytes / overallSpeed) / 1000);
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
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message === 'Aborted') {
        throw err;
      }
      console.warn('[ImageKitUploadService] Direct ImageKit upload failed, falling back to backend server:', err.message);
      return this.uploadViaBackendServer(localUri, fileName, mimeType, onProgress);
    }
  },
};

export default ImageKitUploadService;
