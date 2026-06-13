import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage();

export const getTenantId = () => {
  const store = tenantStorage.getStore();
  return store ? store.tenantId : null;
};

export const runWithTenant = (tenantId, callback) => {
  return tenantStorage.run({ tenantId }, callback);
};
