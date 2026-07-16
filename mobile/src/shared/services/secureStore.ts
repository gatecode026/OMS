/**
 * @file secureStore.ts
 * @description Secure encrypted storage service using expo-secure-store.
 */

import * as SecureStore from 'expo-secure-store';
import ENV from '../../config/env';

/**
 * Prefix a key with the environment-specific prefix to prevent conflicts.
 */
const prefixKey = (key: string): string => {
  return `${ENV.SECURE_STORE_KEY_PREFIX}${key}`;
};

export const secureStore = {
  /**
   * Set a string value in secure storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(prefixKey(key), value);
    } catch (error) {
      console.error(`SecureStore: Error setting item for key: ${key}`, error);
    }
  },

  /**
   * Get a string value from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(prefixKey(key));
    } catch (error) {
      console.error(`SecureStore: Error getting item for key: ${key}`, error);
      return null;
    }
  },

  /**
   * Remove a value from secure storage
   */
  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(prefixKey(key));
    } catch (error) {
      console.error(`SecureStore: Error deleting item for key: ${key}`, error);
    }
  },

  /**
   * Save a JSON object in secure storage
   */
  async setJson<T>(key: string, value: T): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      await this.setItem(key, stringValue);
    } catch (error) {
      console.error(`SecureStore: Error saving JSON for key: ${key}`, error);
    }
  },

  /**
   * Retrieve a JSON object from secure storage
   */
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const stringValue = await this.getItem(key);
      if (!stringValue) return null;
      return JSON.parse(stringValue) as T;
    } catch (error) {
      console.error(`SecureStore: Error parsing JSON for key: ${key}`, error);
      return null;
    }
  },
};
export default secureStore;
