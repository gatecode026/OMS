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

/**
 * Deletes a file from ImageKit by parsing its URL path and requesting deletion.
 * @param {String} url - CDN URL of the file in ImageKit
 */
export const deleteFromImageKit = async (url) => {
  if (!url || typeof url !== 'string' || !url.includes('imagekit.io')) return;

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey || privateKey.includes('***')) {
    logger.warn('[ImageKit] IMAGEKIT_PRIVATE_KEY is not defined. Skipping deletion from ImageKit.');
    return;
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
    
    // Parse the path from the URL
    // e.g. "https://ik.imagekit.io/zjd5xircoy/Office_managements/avatar_123.jpg" -> "Office_managements/avatar_123.jpg"
    const urlParts = url.split('imagekit.io/')[1]?.split('/');
    if (!urlParts || urlParts.length < 2) return;
    urlParts.shift(); // remove the endpoint ID part
    const filePath = urlParts.join('/');

    logger.info(`[ImageKit] Searching for file to delete: ${filePath}`);

    // 1. Search for the file to get its fileId
    const listResponse = await fetch(`https://api.imagekit.io/v1/files?path=${encodeURIComponent(filePath)}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!listResponse.ok) {
      logger.warn(`[ImageKit] Failed to search file for deletion: status ${listResponse.status}`);
      return;
    }

    const files = await listResponse.json();
    if (!Array.isArray(files) || files.length === 0) {
      logger.warn(`[ImageKit] No file found matching path ${filePath} for deletion`);
      return;
    }

    const fileId = files[0].fileId;
    logger.info(`[ImageKit] Found fileId: ${fileId}. Requesting deletion...`);

    // 2. Delete the file by fileId
    const deleteResponse = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    if (deleteResponse.ok) {
      logger.info(`[ImageKit] Successfully deleted file: ${filePath}`);
    } else {
      const errText = await deleteResponse.text();
      logger.error(`[ImageKit] Failed to delete file: ${errText}`);
    }
  } catch (err) {
    logger.error('[ImageKit] Error in deleteFromImageKit:', err);
  }
};

/**
 * Uploads a base64 encoded file string directly to ImageKit, returning detailed metadata.
 * @param {String} base64Str - The raw base64 string
 * @param {String} fileName - The desired name of the file
 * @returns {Promise<Object>} - `{ url, fileId, filePath }` if successful, otherwise `{ url: base64Str, fileId: null, filePath: null }`
 */
export const uploadToImageKitDetailed = async (base64Str, fileName) => {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || 'public_CpBAKCTW3cCxoXfv';
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  
  if (!privateKey || privateKey.includes('***')) {
    logger.warn('[ImageKit] IMAGEKIT_PRIVATE_KEY is not defined. Skipping detailed upload.');
    return { url: base64Str, fileId: null, filePath: null };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
    const name = fileName || `file_${Date.now()}`;
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
    return {
      url: result.url,
      fileId: result.fileId,
      filePath: result.filePath
    };
  } catch (err) {
    logger.error('[ImageKit] Failed to upload detailed file to ImageKit:', err);
    return { url: base64Str, fileId: null, filePath: null };
  }
};

/**
 * Deletes a file directly from ImageKit by its unique file ID.
 * @param {String} fileId - The ImageKit fileId
 * @returns {Promise<Boolean>} - Success status
 */
export const deleteFileFromImageKitById = async (fileId) => {
  if (!fileId || typeof fileId !== 'string') return false;

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey || privateKey.includes('***')) {
    logger.warn('[ImageKit] IMAGEKIT_PRIVATE_KEY is not defined. Skipping deletion by ID.');
    return false;
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');
    logger.info(`[ImageKit] Requesting deletion for fileId: ${fileId}`);

    const deleteResponse = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    // Note: ImageKit returns 204 No Content on successful deletion
    if (deleteResponse.ok || deleteResponse.status === 204) {
      logger.info(`[ImageKit] Successfully deleted file by ID: ${fileId}`);
      return true;
    } else {
      const errText = await deleteResponse.text();
      logger.error(`[ImageKit] Failed to delete file by ID ${fileId}: ${errText}`);
      return false;
    }
  } catch (err) {
    logger.error('[ImageKit] Error in deleteFileFromImageKitById:', err);
    return false;
  }
};

export default {
  uploadToImageKit,
  uploadToImageKitDetailed,
  deleteFromImageKit,
  deleteFileFromImageKitById,
  processEmployeeAssets
};
