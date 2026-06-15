import { getActiveConnection } from './tenantContext.js';
import mongoose from 'mongoose';

/**
 * Creates a JS Proxy around a Mongoose model to dynamically route calls
 * to the correct connection resolved from request context.
 * @param {string} modelName 
 * @param {mongoose.Schema} schema 
 * @returns {Proxy} Proxy wrapping the model
 */
export const createModelProxy = (modelName, schema) => {
  // 1. Compile the default model on main connection
  const defaultModel = mongoose.models[modelName] || mongoose.model(modelName, schema);

  // 2. Return Proxy wrapper
  return new Proxy(defaultModel, {
    construct(target, args) {
      const activeConn = getActiveConnection();
      const tenantModel = activeConn.models[modelName] || activeConn.model(modelName, schema);
      return Reflect.construct(tenantModel, args);
    },
    
    get(target, prop) {
      const activeConn = getActiveConnection();
      const tenantModel = activeConn.models[modelName] || activeConn.model(modelName, schema);

      if (prop === 'schema') {
        return schema;
      }

      // Check if accessing database connection itself
      if (prop === 'db') {
        return activeConn;
      }

      const value = Reflect.get(tenantModel, prop);
      if (typeof value === 'function') {
        return value.bind(tenantModel);
      }
      return value;
    },

    getPrototypeOf(target) {
      const activeConn = getActiveConnection();
      const tenantModel = activeConn.models[modelName] || activeConn.model(modelName, schema);
      return Reflect.getPrototypeOf(tenantModel);
    }
  });
};

export default createModelProxy;
