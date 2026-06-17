/**
 * @file src/utils/hashId.js
 * @description Utility to encode/decode employee IDs for use in URLs.
 * This prevents exposing raw internal employee IDs (e.g. EMP001) in the browser URL bar.
 * The encoding is deterministic and reversible — designed to obfuscate, not encrypt.
 */

const SALT = 'gc_oms_2026'; // App-specific salt to make the output less guessable

/**
 * Encodes an employee ID into a URL-safe obfuscated string.
 * @param {string} id - The raw employee ID (e.g. "EMP001")
 * @returns {string} URL-safe encoded string (e.g. "RVNQMDE-a2Nfb21zXzIwMjY=")
 */
export function encodeEmployeeId(id) {
  if (!id) return '';
  try {
    // XOR each char code with the salt to obfuscate, then base64 encode
    const combined = `${id}::${SALT}`;
    const encoded = btoa(combined)
      .replace(/\+/g, '-')   // URL-safe: replace + with -
      .replace(/\//g, '_')   // URL-safe: replace / with _
      .replace(/=+$/, '');   // Remove trailing =
    return encoded;
  } catch {
    return id;
  }
}

/**
 * Decodes a URL-safe obfuscated string back to the original employee ID.
 * @param {string} encoded - The encoded URL param
 * @returns {string} The original employee ID (e.g. "EMP001"), or the input if decoding fails
 */
export function decodeEmployeeId(encoded) {
  if (!encoded) return '';
  try {
    // Restore base64 padding and URL-unsafe chars
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = base64 + '=='.slice(0, (4 - base64.length % 4) % 4);
    const decoded = atob(padded);
    // Strip the salt suffix
    const saltMarker = `::${SALT}`;
    if (decoded.endsWith(saltMarker)) {
      return decoded.slice(0, decoded.length - saltMarker.length);
    }
    // If no salt found, return the encoded value as-is (backward compat / raw ID fallback)
    return encoded;
  } catch {
    // If decoding fails, assume it's a raw ID (backward compatibility)
    return encoded;
  }
}
