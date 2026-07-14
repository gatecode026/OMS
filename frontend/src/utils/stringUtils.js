/**
 * Utility functions for string manipulations.
 */

/**
 * Decodes HTML entities (e.g., &quot;, &lt;, &gt;, &amp;) to plain characters.
 * @param {string} text - The encoded string.
 * @returns {string} - The decoded string.
 */
export const decodeHTMLEntities = (text) => {
  if (!text) return '';
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
};
