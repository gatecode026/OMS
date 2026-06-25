/**
 * @file src/utils/correlationContext.js
 * @description AsyncLocalStorage tracking utility for request correlation IDs to support end-to-end tracing.
 */

import { AsyncLocalStorage } from 'async_hooks';

const correlationStorage = new AsyncLocalStorage();

/**
 * Retrieves the current request correlation ID.
 * @returns {String|null}
 */
export const getCorrelationId = () => {
  const store = correlationStorage.getStore();
  return store ? store.correlationId : null;
};

/**
 * Runs a function within the correlation context.
 * @param {String} correlationId - Unique request ID.
 * @param {Function} callback - Function to run.
 * @returns {Any}
 */
export const runWithCorrelation = (correlationId, callback) => {
  return correlationStorage.run({ correlationId }, callback);
};

export default {
  getCorrelationId,
  runWithCorrelation
};
