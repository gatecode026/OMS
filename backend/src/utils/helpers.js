/**
 * @file src/utils/helpers.js
 * @description General utility helper methods.
 */

/**
 * Validates if an input string is a valid email
 * @param {string} email 
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Simulates hashing a password or value.
 * @param {string} text 
 */
export const simpleHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return String(Math.abs(hash));
};

export default {
  isValidEmail,
  simpleHash,
};
