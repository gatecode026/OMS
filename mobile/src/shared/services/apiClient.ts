/**
 * @file apiClient.ts
 * @description Standardized Axios client with JWT injection, token refresh logic, error mapping, and network handling.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import ENV from '../../config/env';
import useAuthStore from '../store/authStore';
import useOfflineStore from '../store/offlineStore';

// Interface for request queue while refreshing token
interface FailedRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  config: InternalAxiosRequestConfig;
}

// Map HTTP status codes to user friendly error messages
export interface AppError {
  status: string;
  message: string;
  statusCode?: number;
  originalError?: AxiosError;
  validationErrors?: Record<string, string>;
}

export const mapAxiosError = (error: AxiosError): AppError => {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        status: 'fail',
        message: 'Request timed out. Please check your network connection and try again.',
        statusCode: 408,
        originalError: error,
      };
    }
    return {
      status: 'fail',
      message: 'Network offline or server unreachable. Please check your connection.',
      originalError: error,
    };
  }

  const statusCode = error.response.status;
  const responseData = error.response.data as any;
  const serverMessage = responseData?.message || responseData?.error;

  let message = 'An unexpected error occurred. Please try again.';

  switch (statusCode) {
    case 400:
      message = serverMessage || 'Invalid request. Please check your input parameters.';
      break;
    case 401:
      message = 'Your session has expired. Please log in again.';
      break;
    case 403:
      message = serverMessage || 'Access denied. You do not have permissions for this action.';
      break;
    case 404:
      message = 'Requested resource could not be found.';
      break;
    case 409:
      message = serverMessage || 'Conflict detected. The resource might already exist or has been modified.';
      break;
    case 422:
      message = serverMessage || 'Validation failed. Please verify your fields.';
      break;
    case 429:
      message = 'Too many requests. Please wait a moment and try again.';
      break;
    case 500:
      message = 'Internal server error. Our engineers have been notified.';
      break;
    case 503:
      message = 'Service temporarily unavailable. Please try again later.';
      break;
  }

  return {
    status: responseData?.status || 'fail',
    message,
    statusCode,
    originalError: error,
    validationErrors: responseData?.errors || null,
  };
};

const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_URL,
  timeout: ENV.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Flag to prevent multiple concurrent token refresh requests
let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      if (prom.config.headers) {
        prom.config.headers.Authorization = `Bearer ${token}`;
      }
      prom.resolve(apiClient(prom.config));
    }
  });
  failedQueue = [];
};

// Request Interceptor: Inject JWT token, tenant company header, device metadata, and handle offline queueing
apiClient.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().token;
    const companyId = useAuthStore.getState().companyId;
    const isConnected = useOfflineStore.getState().isConnected;

    // Inject Auth & Tenant Company headers
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (companyId && config.headers) {
      config.headers['x-tenant-id'] = companyId;
    }

    // Inject Device / App Metadata (disabled on web to prevent CORS preflight header errors)
    if (Platform.OS !== 'web' && config.headers) {
      config.headers['x-device-id'] = Constants.installationId || Constants.sessionId || 'device-id-placeholder';
      config.headers['x-app-version'] = Constants.expoConfig?.version || '1.0.0';
      config.headers['x-timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      config.headers['x-language'] = 'en';
      config.headers['x-platform'] = Platform.OS;
    }

    // Intercept mutating requests when offline and queue them
    const isMutating = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '');
    if (!isConnected && isMutating) {
      const headersObject: Record<string, string> = {};
      if (config.headers) {
        Object.keys(config.headers).forEach((k) => {
          if (typeof config.headers[k] === 'string') {
            headersObject[k] = config.headers[k] as string;
          }
        });
      }

      await useOfflineStore.getState().addToQueue({
        url: config.url || '',
        method: config.method?.toUpperCase() as any || 'POST',
        data: config.data,
        headers: headersObject,
        description: headersObject['x-action-description'] || 'Offline operation',
      });

      return Promise.reject({
        status: 'fail',
        message: 'Offline: Action queued for synchronization.',
        isOfflineQueued: true,
        config: config,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle silent token refresh and error mapping
apiClient.interceptors.response.use(
  (response) => {
    // Structured success log format
    const method = response.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = response.config?.url || 'UNKNOWN';
    const status = response.status || 200;
    const token = useAuthStore.getState().token;
    const isTokenValid = !!token;
    const companyId = useAuthStore.getState().companyId || 'default';

    console.log(`[API]
Base URL: ${ENV.API_URL}
Environment: ${ENV.ENV}
JWT Valid: ${isTokenValid}
Tenant ID: ${companyId}
Response: Success (HTTP ${status} for ${method} ${url})`);

    return response;
  },
  async (error: AxiosError) => {
    // If the request was queued offline in the request interceptor,
    // resolve successfully with a synthetic success envelope instead of throwing an error.
    if ((error as any).isOfflineQueued) {
      return {
        data: {
          status: 'success',
          message: error.message || 'Offline: Action queued for synchronization.',
          data: { queued: true },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: (error as any).config || error.config,
      } as any;
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

    // Retry Logic for network / server errors
    if (originalRequest) {
      const isNetworkError = !error.response;
      const isServerError = error.response?.status === 503 || error.response?.status === 504;
      const retryCount = originalRequest._retryCount || 0;
      const MAX_RETRIES = 2;

      if ((isNetworkError || isServerError) && retryCount < MAX_RETRIES) {
        originalRequest._retryCount = retryCount + 1;
        console.log(`[apiClient] Retrying request (${originalRequest._retryCount}/${MAX_RETRIES}) for URL: ${originalRequest.url}`);
        await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 1500));
        return apiClient(originalRequest);
      }
    }

    // Handle token expiration/401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we are already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent refresh
        const currentToken = useAuthStore.getState().token;
        const refreshResponse = await axios.post(
          `${ENV.API_URL}/api/v1/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        const newToken = refreshResponse.data?.data?.token;

        if (newToken) {
          // Update credentials in AuthStore
          const user = useAuthStore.getState().user;
          const rememberMe = useAuthStore.getState().rememberMe;
          if (user) {
            await useAuthStore.getState().login(newToken, user, rememberMe);
          }

          processQueue(null, newToken);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh token request did not return a valid token');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Silent refresh failed (token is completely dead) -> perform forced logout
        await useAuthStore.getState().logout();
        return Promise.reject(mapAxiosError(error));
      } finally {
        isRefreshing = false;
      }
    }

    const mappedError = mapAxiosError(error);
    
    // Structured error log format
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'UNKNOWN';
    const retryCount = (error.config as any)?._retryCount || 0;
    const status = error.response?.status || mappedError.statusCode || 'UNKNOWN';
    const errorMsg = error.message || mappedError.message || 'UNKNOWN';

    console.error(`[apiClient]
Method: ${method}
URL: ${url}
Environment: ${ENV.ENV}
Retry Count: ${retryCount}
Status: ${status}
Error: ${errorMsg}`);

    // Run diagnostics if the server is unreachable or offline
    if (!error.response) {
      runNetworkDiagnostics(error).catch(() => {});
    }

    return Promise.reject(mappedError);
  }
);

/**
 * Safely performs a fetch request with a timeout fallback, as AbortSignal.timeout
 * is not supported on all React Native platforms/Hermes versions.
 */
async function fetchWithTimeout(url: string, ms: number = 15000): Promise<Response> {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return fetch(url, { signal: AbortSignal.timeout(ms) });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Executes a full network diagnostics sweep and prints a structured warning log.
 */
export async function runNetworkDiagnostics(error?: AxiosError): Promise<void> {
  let netInfoState;
  try {
    netInfoState = await NetInfo.fetch();
  } catch (e) {
    netInfoState = { isConnected: false, isInternetReachable: false };
  }
  
  const isConnected = netInfoState.isConnected !== false;

  let apiReachable = 'No';
  try {
    const response = await fetchWithTimeout(`${ENV.API_URL}/health`, 15000);
    apiReachable = `Yes (HTTP ${response.status})`;
  } catch (e: any) {
    apiReachable = `No (${e.message || e})`;
  }

  let socketReachable = 'No';
  try {
    const response = await fetchWithTimeout(`${ENV.API_URL}/socket.io/?EIO=4&transport=polling`, 15000);
    socketReachable = `Yes (HTTP ${response.status})`;
  } catch (e: any) {
    socketReachable = `No (${e.message || e})`;
  }

  let errorDetail = 'None';
  if (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorDetail = 'Timeout Failure';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('EAI_AGAIN')) {
      errorDetail = 'DNS Resolution Failure';
    } else if (error.message.includes('ECONNREFUSED')) {
      errorDetail = 'Connection Refused';
    } else if (error.message.toLowerCase().includes('ssl') || error.message.toLowerCase().includes('cert')) {
      errorDetail = 'SSL/TLS Error';
    } else if (!error.response) {
      errorDetail = 'Network offline or host unreachable';
    } else {
      errorDetail = `HTTP ${error.response.status} (${error.response.statusText})`;
    }
  }

  console.warn(`
====== NETWORK DIAGNOSTICS ======
Environment: ${ENV.ENV}
Current Base URL: ${ENV.API_URL}
Current Platform: ${Platform.OS} (v${Platform.Version})
Is Connected: ${isConnected ? 'Yes' : 'No'} (Internet Reachable: ${netInfoState.isInternetReachable !== false ? 'Yes' : 'No'})
API Reachable: ${apiReachable}
Socket Reachable: ${socketReachable}
Error Diagnostics: ${errorDetail}
=================================
`);
}

export default apiClient;
