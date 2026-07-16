/**
 * @file env.ts
 * @description Environment configuration for development, staging, and production.
 */

import { Platform } from 'react-native';

export type Environment = 'development' | 'staging' | 'production';

export interface Config {
  ENV: Environment;
  API_URL: string;
  TIMEOUT: number;
  APP_NAME: string;
  ENABLE_LOGGER: boolean;
  SECURE_STORE_KEY_PREFIX: string;
}

// Connect to host machine IP on local Wi-Fi to support physical devices
const DEV_API_URL = 'http://192.168.1.23:5000';
const environments: Record<Environment, Config> = {
  development: {
    ENV: 'development',
    API_URL: DEV_API_URL,
    TIMEOUT: 15000,
    APP_NAME: 'OMS (Dev)',
    ENABLE_LOGGER: true,
    SECURE_STORE_KEY_PREFIX: 'oms_dev_',
  },
  staging: {
    ENV: 'staging',
    API_URL: 'https://staging-api.gatecodeoms.com',
    TIMEOUT: 20000,
    APP_NAME: 'OMS (Staging)',
    ENABLE_LOGGER: true,
    SECURE_STORE_KEY_PREFIX: 'oms_staging_',
  },
  production: {
    ENV: 'production',
    API_URL: 'https://api.gatecodeoms.com',
    TIMEOUT: 30000,
    APP_NAME: 'OMS',
    ENABLE_LOGGER: false,
    SECURE_STORE_KEY_PREFIX: 'oms_prod_',
  },
};

// Select current environment. Change this to switch environments.
const CURRENT_ENV: Environment = (process.env.EXPO_PUBLIC_APP_ENV as Environment) || 'development';

export const ENV = environments[CURRENT_ENV];
export default ENV;
