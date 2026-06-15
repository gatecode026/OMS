/**
 * @file src/utils/multidbConnection.js
 * @description Backwards compatibility wrapper re-exporting Connection Manager details.
 */

import connectionManager from '../database/connectionManager.js';

export const dbUriCache = connectionManager.dbUriCache;
export const connectionCache = connectionManager.connectionCache;
export const getTenantConnection = connectionManager.getTenantConnection;
export const getCachedConnection = connectionManager.getCachedConnection;
export const closeAllConnections = connectionManager.closeAllConnections;
export const provisionTenantDatabase = connectionManager.provisionTenantDatabase;

export default connectionManager;
