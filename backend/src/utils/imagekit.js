/**
 * @file src/utils/imagekit.js
 * @description Utility functions for ImageKit integration.
 */

import logger from '../config/logger.js';

// Helper to check if a string is base64 file data
const isBase64 = (str) => {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:') && str.includes(';base64,');
};

/**
 * Uploads a base64 encoded file string directly to ImageKit.
 * @param {String} base64Str - The raw base64 string (including data URI prefix)
 * @param {String} fileName - The desired name of the file
 * @returns {Promise<String>} - CDN URL if successful, otherwise original base64Str
 */
export const uploadToImageKit = async (base64Str, fileName) => {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || 'public_CpBAKCTW3cCxoXfv';
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/zjd5xircoy';

  if (!privateKey || privateKey.includes('***')) {
    logger.warn('[ImageKit] IMAGEKIT_PRIVATE_KEY is not defined or contains asterisks in environment variables. Skipping upload to ImageKit.');
    return base64Str;
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
    const name = fileName || `file_${Date.now()}`;

    logger.info(`[ImageKit] Uploading file "${name}" to folder "Office_managements"...`);

    const formData = new FormData();
    formData.append('file', base64Str);
    formData.append('fileName', name);
    formData.append('folder', 'Office_managements');
    formData.append('useUniqueFileName', 'true');

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': authHeader
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ImageKit API Error (Status ${response.status}): ${errorText}`);
    }

    const result = await response.json();
    logger.info(`[ImageKit] Successfully uploaded file. URL: ${result.url}`);
    return result.url;
  } catch (err) {
    logger.error('[ImageKit] Failed to upload file to ImageKit:', err);
    // Fallback gracefully so the database still works with local storage
    return base64Str;
  }
};

/**
 * Recursive processor to check and upload any base64 files within employee records.
 * @param {Object} data - Employee input object
 * @returns {Promise<Object>} - Processed object with base64 data replaced by CDN URLs
 */
export const processEmployeeAssets = async (data) => {
  if (!data) return data;
  const processed = { ...data };

  // 1. Process avatar
  if (isBase64(processed.avatar)) {
    const fileName = `avatar_${processed.id || Date.now()}.jpg`;
    processed.avatar = await uploadToImageKit(processed.avatar, fileName);
    processed.photoUrl = processed.avatar; // Maintain sync
  }

  // 2. Process photoUrl (in case it is uploaded instead of avatar)
  if (isBase64(processed.photoUrl)) {
    const fileName = `avatar_${processed.id || Date.now()}.jpg`;
    processed.photoUrl = await uploadToImageKit(processed.photoUrl, fileName);
    processed.avatar = processed.photoUrl; // Maintain sync
  }

  // 3. Process documents array
  if (processed.documents && Array.isArray(processed.documents)) {
    const updatedDocs = [];
    for (const doc of processed.documents) {
      // Normalize document representation
      const docObj = doc.toObject ? doc.toObject() : { ...doc };
      if (isBase64(docObj.downloadUrl)) {
        const fileExt = docObj.fileType ? docObj.fileType.split('/').pop() : 'bin';
        const docFileName = docObj.fileName || `${docObj.category || 'doc'}_${Date.now()}.${fileExt}`;
        docObj.downloadUrl = await uploadToImageKit(docObj.downloadUrl, docFileName);
      }
      updatedDocs.push(docObj);
    }
    processed.documents = updatedDocs;
  }

  return processed;
};

export default {
  uploadToImageKit,
  processEmployeeAssets
};
