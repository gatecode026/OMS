/**
 * @file apiClient.ts
 * @description Standardized Axios client with JWT injection, token refresh logic, error mapping, and network handling.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import ENV from '../../config/env';
import useAuthStore from '../store/authStore';

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
      statusCode: 503,
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

// Request Interceptor: Inject JWT token and tenant company header
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    const companyId = useAuthStore.getState().companyId;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (companyId && config.headers) {
      config.headers['x-tenant-id'] = companyId;
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
    // Return standard response data envelope directly for ease of use
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

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
    if (__DEV__) {
      console.error('[apiClient] Request failed:', {
        url: error.config?.url,
        method: error.config?.method,
        statusCode: mappedError.statusCode,
        message: mappedError.message,
        originalError: error.message || error
      });
    }
    return Promise.reject(mappedError);
  }
);

export default apiClient;
