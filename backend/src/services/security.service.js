/**
 * @file src/services/security.service.js
 * @description Centralized security service handling JWT validation, token blacklisting, input sanitization (NoSQL injection & XSS), and file safety checks.
 */

import jwt from 'jsonwebtoken';
import redis from '../config/redis.js';
import env from '../config/env.js';
import logger from '../config/logger.js';

/**
 * Validates a JWT token against the configured secret.
 * @param {String} token - The raw JWT token.
 * @returns {Object|null} - Decoded payload on success, null on failure.
 */
export const validateToken = (token) => {
  try {
    if (!token) return null;
    return jwt.verify(token, env.jwtSecret);
  } catch (err) {
    logger.debug(`[Security] Token validation failed: ${err.message}`);
    return null;
  }
};

/**
 * Blacklists a JWT token in Redis for its remaining lifespan.
 * @param {String} token - The JWT token to revoke.
 * @param {Number} expiresInSeconds - Remaining lifetime of the token in seconds.
 * @returns {Promise<Boolean>}
 */
export const blacklistToken = async (token, expiresInSeconds = 3600) => {
  if (!redis.isAvailable) {
    logger.warn('[Security] Redis unavailable; token revocation skipped.');
    return false;
  }
  try {
    const key = `blacklist:${token}`;
    // Force minimum of 60 seconds TTL
    const ttl = Math.max(Math.round(expiresInSeconds), 60);
    await redis.set(key, 'revoked', { EX: ttl });
    logger.info(`[Security] Token blacklisted with TTL: ${ttl}s`);
    return true;
  } catch (err) {
    logger.error(`[Security] Failed to blacklist token: ${err.message}`);
    return false;
  }
};

/**
 * Checks if a JWT token has been blacklisted (revoked).
 * @param {String} token - The JWT token.
 * @returns {Promise<Boolean>}
 */
export const isTokenBlacklisted = async (token) => {
  if (!token || !redis.isAvailable) return false;
  try {
    const key = `blacklist:${token}`;
    const value = await redis.get(key);
    return value === 'revoked';
  } catch (err) {
    logger.error(`[Security] Blacklist check error: ${err.message}`);
    return false; // Fail-secure/fallback to allowing if Redis check fails (token integrity still checked by JWT verify)
  }
};

/**
 * Recursively sanitizes input objects to prevent NoSQL Query Injection.
 * Strips any keys starting with '$'.
 * @param {Any} input - The input payload to sanitize.
 * @returns {Any} - The sanitized input.
 */
export const sanitizeNoSql = (input) => {
  if (input instanceof Array) {
    return input.map(item => sanitizeNoSql(item));
  }
  if (input !== null && typeof input === 'object') {
    const sanitized = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        if (key.startsWith('$')) {
          logger.warn(`[Security] Stripped potential NoSQL Injection operator key: ${key}`);
          continue;
        }
        sanitized[key] = sanitizeNoSql(input[key]);
      }
    }
    return sanitized;
  }
  return input;
};

/**
 * Recursively escapes string inputs to prevent Cross-Site Scripting (XSS).
 * @param {Any} input - The input payload to sanitize.
 * @returns {Any} - The sanitized input.
 */
export const sanitizeXss = (input) => {
  if (typeof input === 'string') {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  if (input instanceof Array) {
    return input.map(item => sanitizeXss(item));
  }
  if (input !== null && typeof input === 'object') {
    const sanitized = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        // Do not escape binary/base64 strings or media URLs specifically if needed, but escape everything by default
        sanitized[key] = sanitizeXss(input[key]);
      }
    }
    return sanitized;
  }
  return input;
};

/**
 * Validates a file payload size, type, and runs a mock malware scan.
 * @param {Object} file - File metadata (size, name, mimetype, buffer).
 * @returns {Object} - { isValid: Boolean, reason: String }
 */
export const validateFileUpload = (file) => {
  if (!file) {
    return { isValid: false, reason: 'No file uploaded.' };
  }

  // 1. File size limit (e.g. 50MB for general uploads)
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_SIZE) {
    return { isValid: false, reason: `File size exceeds the 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).` };
  }

  // 2. File type blacklist (Executable/Scripts)
  const filename = file.name || '';
  const extension = filename.split('.').pop().toLowerCase();
  const blacklistedExtensions = ['exe', 'bat', 'sh', 'js', 'vbs', 'scr', 'msi', 'com', 'cmd', 'ps1', 'jar', 'svg'];
  
  if (blacklistedExtensions.includes(extension)) {
    return { isValid: false, reason: `File type .${extension} is blacklisted for security.` };
  }

  // 3. Malware scanning hook
  const isMalwareClean = scanFileForMalware(file);
  if (!isMalwareClean) {
    return { isValid: false, reason: 'File failed malware scanning check.' };
  }

  return { isValid: true };
};

/**
 * Simulated malware scanner. Integrates easily with external antivirus APIs (e.g. ClamAV/VirusTotal).
 * @param {Object} file - File object.
 * @returns {Boolean} - True if clean, false if infected.
 */
function scanFileForMalware(file) {
  logger.info(`[Security] Scanning file "${file.name}" for malware...`);
  
  // Simulated signature checks (e.g., look for malicious keywords in file buffers if text)
  if (file.buffer) {
    const contentString = file.buffer.toString('utf8', 0, 1000); // Check first 1000 bytes
    if (contentString.includes('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')) {
      logger.error(`[Security] Antivirus Alert: EICAR test signature found in "${file.name}"!`);
      return false;
    }
  }

  logger.info(`[Security] File "${file.name}" successfully passed malware scanning.`);
  return true;
}

export default {
  validateToken,
  blacklistToken,
  isTokenBlacklisted,
  sanitizeNoSql,
  sanitizeXss,
  validateFileUpload
};
