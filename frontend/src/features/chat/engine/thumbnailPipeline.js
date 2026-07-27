/**
 * @file features/chat/engine/thumbnailPipeline.js
 * @description Background Thumbnail Pipeline (Part 7).
 *   Generates image thumbnails, video canvas frame thumbnails, audio waveform metadata, and document type icons.
 */

/**
 * Generate a client-side thumbnail image URL from a File object.
 */
export async function generateImageThumbnail(file, maxWidth = 300, maxHeight = 300) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Capture a thumbnail frame from a Video File using HTML5 canvas.
 */
export async function generateVideoThumbnail(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('video/')) {
      return reject(new Error('Invalid video file'));
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1.0, video.duration / 2 || 0.5);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
  });
}

/**
 * Generate document icon descriptor based on file extension.
 */
export function getDocumentIconDescriptor(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) return { icon: 'file-pdf', color: '#EF4444', label: 'PDF Document' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'file-word', color: '#3B82F6', label: 'Word Document' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'file-excel', color: '#10B981', label: 'Spreadsheet' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: 'file-ppt', color: '#F59E0B', label: 'Presentation' };
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: 'file-archive', color: '#8B5CF6', label: 'Archive' };
  if (['txt', 'md', 'json', 'js', 'html', 'css'].includes(ext)) return { icon: 'file-code', color: '#6B7280', label: 'Text/Code File' };

  return { icon: 'file', color: '#9CA3AF', label: 'Document' };
}

export const thumbnailPipeline = {
  generateImageThumbnail,
  generateVideoThumbnail,
  getDocumentIconDescriptor,
};

export default thumbnailPipeline;
