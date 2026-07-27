/**
 * @file EncryptionManager.ts
 * @description Local Data Encryption Engine utilizing expo-secure-store
 *              for encrypting drafts, offline queues, user session tokens,
 *              and media metadata to prevent plaintext local storage leaks.
 */

import { secureStore } from '../../../shared/services/secureStore';

export class EncryptionManagerClass {
  /**
   * Encrypt and store data in secure storage
   */
  async encryptAndStore<T>(key: string, value: T): Promise<void> {
    try {
      await secureStore.setJson(`enc_${key}`, value);
    } catch (err) {
      console.error(`[EncryptionManager] Error encrypting key '${key}':`, err);
    }
  }

  /**
   * Retrieve and decrypt data from secure storage
   */
  async getAndDecrypt<T>(key: string): Promise<T | null> {
    try {
      return await secureStore.getJson<T>(`enc_${key}`);
    } catch (err) {
      console.error(`[EncryptionManager] Error decrypting key '${key}':`, err);
      return null;
    }
  }

  /**
   * Delete encrypted item from secure storage
   */
  async removeEncryptedItem(key: string): Promise<void> {
    try {
      await secureStore.deleteItem(`enc_${key}`);
    } catch (err) {
      console.error(`[EncryptionManager] Error deleting key '${key}':`, err);
    }
  }
}

export const EncryptionManager = new EncryptionManagerClass();
export default EncryptionManager;
