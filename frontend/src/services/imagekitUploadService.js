/**
 * @file src/services/imagekitUploadService.js
 * @description Service for directly uploading files to ImageKit from the browser with progress tracking and abort support.
 */

const getApiUrl = () => window.API_URL || window.location.origin;

export const ImageKitUploadService = {
  /**
   * Fetch client authentication parameters from the backend
   * @param {String} authToken - JWT token for backend authentication
   * @returns {Promise<Object>} ImageKit auth parameters { token, expire, signature, publicKey }
   */
  async fetchAuthParams(authToken) {
    const response = await fetch(`${getApiUrl()}/api/v1/chat/imagekit/auth?t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ImageKit auth parameters: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.status !== 'success' || !result.data) {
      throw new Error(result.message || 'Failed to fetch ImageKit auth parameters');
    }

    return result.data;
  },

  /**
   * Upload a file to ImageKit using XMLHttpRequest to support progress tracking and cancellation
   * @param {File} file - The file to upload
   * @param {Object} authParams - Auth params from fetchAuthParams
   * @param {Function} onProgress - Callback for progress: (progressData)
   * @param {AbortSignal} abortSignal - Signal to abort the upload
   * @returns {Promise<Object>} Upload response containing url, name, size, etc.
   */
  upload(file, authParams, onProgress, abortSignal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastTime = startTime;
      let lastLoaded = 0;

      // Handle abort
      if (abortSignal) {
        const handleAbort = () => {
          xhr.abort();
          reject(new DOMException('Upload aborted by the user', 'AbortError'));
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

          // Calculate ETA (Estimated Time of Arrival)
          let eta = 0;
          const totalElapsed = currentTime - startTime;
          if (loaded > 0) {
            const overallSpeed = loaded / totalElapsed; // bytes/ms
            const remainingBytes = total - loaded;
            eta = Math.round((remainingBytes / overallSpeed) / 1000); // in seconds
          }

          // Update variables for next progress event
          lastTime = currentTime;
          lastLoaded = loaded;

          onProgress({
            percentage,
            speed, // bytes/sec
            eta, // seconds
            loaded,
            total
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
        reject(new DOMException('Upload aborted by the user', 'AbortError'));
      };

      const uploadUrl = 'https://upload.imagekit.io/api/v1/files/upload';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('publicKey', authParams.publicKey);
      formData.append('signature', authParams.signature);
      formData.append('token', authParams.token);
      formData.append('expire', authParams.expire);
      formData.append('folder', '/chat_uploads');
      formData.append('useUniqueFileName', 'true');

      xhr.open('POST', uploadUrl, true);
      xhr.send(formData);
    });
  }
};

export default ImageKitUploadService;
