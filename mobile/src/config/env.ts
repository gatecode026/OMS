import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type Environment = 'local' | 'development' | 'qa' | 'uat' | 'staging' | 'production';

export interface Config {
  ENV: Environment;
  API_URL: string;
  TIMEOUT: number;
  APP_NAME: string;
  ENABLE_LOGGER: boolean;
  SECURE_STORE_KEY_PREFIX: string;
}

const currentEnv = (process.env.EXPO_PUBLIC_APP_ENV as Environment) || 'production';

// Safe fallback values for all environments
const fallbacks: Record<Environment, Omit<Config, 'ENV'>> = {
  local: {
    API_URL: 'http://localhost:5000',
    TIMEOUT: 60000,
    APP_NAME: 'OMS (Local)',
    ENABLE_LOGGER: true,
    SECURE_STORE_KEY_PREFIX: 'oms_local_',
  },
  development: {
    API_URL: 'http://192.168.1.16:5000',
    TIMEOUT: 60000,
    APP_NAME: 'OMS (Dev)',
    ENABLE_LOGGER: true,
    SECURE_STORE_KEY_PREFIX: 'oms_dev_',
  },
  qa: {
    API_URL: 'https://qa-api.gatecodeoms.com',
    TIMEOUT: 60000,
    APP_NAME: 'OMS (QA)',
    ENABLE_LOGGER: true,
    SECURE_STORE_KEY_PREFIX: 'oms_qa_',
  },
  uat: {
    API_URL: 'https://uat-api.gatecodeoms.com',
    TIMEOUT: 60000,
    APP_NAME: 'OMS (UAT)',
    ENABLE_LOGGER: true,
    SECURE_STORE_KEY_PREFIX: 'oms_uat_',
  },
  staging: {
    API_URL: 'https://staging-api.gatecodeoms.com',
    TIMEOUT: 60000,
    APP_NAME: 'OMS (Staging)',
    ENABLE_LOGGER: true,
    SECURE_STORE_KEY_PREFIX: 'oms_staging_',
  },
  production: {
    API_URL: 'https://oms-xdcz.onrender.com',
    TIMEOUT: 60000,
    APP_NAME: 'OMS',
    ENABLE_LOGGER: false,
    SECURE_STORE_KEY_PREFIX: 'oms_prod_',
  },
};

/**
 * Resolves the API URL dynamically in development mode.
 * Automatically handles routing to localhost (iOS Simulator), 10.0.2.2 (Android Emulator),
 * and the developer machine's Wi-Fi IP address (physical devices/Expo Go).
 */
const resolveApiUrl = (configuredUrl: string): string => {
  if (!__DEV__) {
    return configuredUrl;
  }

  // If the user has explicitly set an external URL (e.g. staging or ngrok), keep it
  const isLocalHost = configuredUrl.includes('localhost') || 
                      configuredUrl.includes('127.0.0.1') || 
                      configuredUrl.includes('192.168.') ||
                      configuredUrl.includes('10.') ||
                      configuredUrl.includes('172.');

  if (!isLocalHost) {
    return configuredUrl;
  }

  let host = 'localhost';
  if (Platform.OS === 'android') {
    host = '10.0.2.2';
  }

  // Under Expo Go / local development, expoConfig?.hostUri contains the builder host IP
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      host = ip;
    }
  }

  // Extract port from configured URL if present (e.g. http://localhost:5000 -> 5000)
  const portMatch = configuredUrl.match(/:(\d+)/);
  const port = portMatch ? portMatch[1] : '5000';

  return `http://${host}:${port}`;
};

const fallback = fallbacks[currentEnv] || fallbacks.production;

export const ENV: Config = {
  ENV: currentEnv,
  API_URL: resolveApiUrl(process.env.EXPO_PUBLIC_API_URL || fallback.API_URL),
  TIMEOUT: process.env.EXPO_PUBLIC_TIMEOUT ? parseInt(process.env.EXPO_PUBLIC_TIMEOUT, 10) : fallback.TIMEOUT,
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || fallback.APP_NAME,
  ENABLE_LOGGER: process.env.EXPO_PUBLIC_ENABLE_LOGGER !== undefined 
    ? process.env.EXPO_PUBLIC_ENABLE_LOGGER === 'true' 
    : fallback.ENABLE_LOGGER,
  SECURE_STORE_KEY_PREFIX: process.env.EXPO_PUBLIC_SECURE_STORE_KEY_PREFIX || fallback.SECURE_STORE_KEY_PREFIX,
};

export default ENV;
