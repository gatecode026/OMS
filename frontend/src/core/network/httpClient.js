/**
 * @file core/network/httpClient.js
 * @description Platform HTTP entry point (Core layer). Base URL + auth-header
 *   logic shared by every feature's repositories / query functions. Extracted
 *   from the chat feature during the OPRD-WEB-CHAT-001A hardening pass so
 *   transport is owned by Core, not by a single feature.
 *
 *   Semantics preserved from the original chat helper:
 *     fetch(`${API_URL}/api/v1${path}`, { Authorization: Bearer <token> })
 *   Returns the parsed JSON envelope (`{ status, data, message }`) and never
 *   throws on non-2xx — callers inspect `res.status`. Repositories wrap this
 *   and throw on error so React Query can drive ret/error state (see `unwrap`).
 */

// window.API_URL is set by main.jsx before render.
const getApiUrl = () => window.API_URL || window.location.origin;

/**
 * @param {string} path  API path beginning with '/', relative to /api/v1
 * @param {object} [options]
 * @param {string|null} [options.token] Bearer token; when absent returns an error envelope
 * @returns {Promise<object>} parsed JSON envelope
 */
export async function chatApiFetch(path, { token, headers, ...options } = {}) {
  if (!token) return { status: 'error', message: 'Not authenticated' };

  const res = await fetch(`${getApiUrl()}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(headers || {}),
    },
  });
  return res.json();
}

/**
 * Unwrap a `{ status, data }` envelope, throwing when the request did not
 * succeed so React Query surfaces `isError` and applies retry policy.
 * @template T
 * @param {{ status?: string, data?: T, message?: string }} envelope
 * @param {(env: any) => T} [select]
 * @returns {T}
 */
export function unwrap(envelope, select = (e) => e.data) {
  if (!envelope || envelope.status !== 'success') {
    throw new Error(envelope?.message || 'Request failed');
  }
  return select(envelope);
}

export { getApiUrl };
