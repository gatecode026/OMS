import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';
import { getTenantConnection } from './multidbConnection.js';

const tenantStorage = new AsyncLocalStorage();

/**
 * Gets the current request's tenant company ID.
 */
export const getTenantId = () => {
  const store = tenantStorage.getStore();
  return store ? store.tenantId : null;
};

/**
 * Checks if the current request is initiated by a Platform Super Admin.
 */
export const isSuperAdminRequest = () => {
  const store = tenantStorage.getStore();
  return store ? !!store.isSuperAdmin : false;
};

/**
 * Gets the active database connection for the current request context.
 * Falls back to main mongoose.connection if none is scoped.
 */
export const getActiveConnection = () => {
  const store = tenantStorage.getStore();
  return store && store.connection ? store.connection : mongoose.connection;
};

/**
 * Runs a callback inside the resolved tenant context.
 * Resolves the database connection pool asynchronously first.
 */
export const runWithTenant = async (tenantId, callback, isSuperAdmin = false, user = null) => {
  const connection = await getTenantConnection(tenantId);
  const store = tenantStorage.getStore();
  const finalUser = user || store?.user || null;
  const finalSuperAdmin = isSuperAdmin || store?.isSuperAdmin || false;
  return tenantStorage.run({ tenantId, connection, isSuperAdmin: finalSuperAdmin, user: finalUser }, callback);
};

/**
 * Runs a callback synchronously if the connection is already resolved.
 */
export const runWithTenantConnection = (tenantId, connection, callback, isSuperAdmin = false, user = null) => {
  const store = tenantStorage.getStore();
  const finalUser = user || store?.user || null;
  const finalSuperAdmin = isSuperAdmin || store?.isSuperAdmin || false;
  return tenantStorage.run({ tenantId, connection, isSuperAdmin: finalSuperAdmin, user: finalUser }, callback);
};

/**
 * Gets the current request's authenticated user context.
 */
export const getCurrentUser = () => {
  const store = tenantStorage.getStore();
  return store ? store.user : null;
};

/**
 * Gets the raw AsyncLocalStorage store object.
 */
export const getStore = () => {
  return tenantStorage.getStore();
};

export default {
  getTenantId,
  isSuperAdminRequest,
  getActiveConnection,
  runWithTenant,
  runWithTenantConnection,
  getCurrentUser,
  getStore
};
