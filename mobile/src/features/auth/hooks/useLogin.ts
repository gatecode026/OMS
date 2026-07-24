/**
 * @file useLogin.ts
 * @description Enterprise login hook. Orchestrates validation, API call, token storage,
 *              profile loading, branding resolution, and navigation after successful auth.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../../../shared/store/authStore';
import { useThemeStore } from '../../../shared/store/themeStore';
import { validateLoginForm, LoginFormValues, LoginFormErrors } from '../validation/loginSchema';
import { mapAxiosError } from '../../../shared/services/apiClient';
import { ENV } from '../../../config/env';
import { useOfflineStore } from '../../../shared/store/offlineStore';

export type LoginErrorCode =
  | 'WRONG_PASSWORD'
  | 'USER_NOT_FOUND'
  | 'INACTIVE_USER'
  | 'LOCKED_USER'
  | 'EXPIRED_PASSWORD'
  | 'MAINTENANCE'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'SESSION_CONFLICT'
  | 'UNKNOWN';

export interface LoginError {
  code: LoginErrorCode;
  message: string;
}

export interface UseLoginReturn {
  form: LoginFormValues;
  errors: LoginFormErrors;
  loginError: LoginError | null;
  loading: boolean;
  setField: (field: keyof LoginFormValues, value: string | boolean) => void;
  submit: () => Promise<void>;
  clearError: () => void;
}

const INITIAL_FORM: LoginFormValues = {
  companyCode: '',
  identifier: '',
  password: '',
  rememberMe: true,
};

function resolveErrorCode(statusCode?: number, message?: string): LoginErrorCode {
  if (!statusCode) return 'NETWORK_ERROR';
  if (statusCode === 503) return 'MAINTENANCE';
  if (statusCode === 401) {
    if (message?.toLowerCase().includes('lock')) return 'LOCKED_USER';
    if (message?.toLowerCase().includes('inactiv')) return 'INACTIVE_USER';
    if (message?.toLowerCase().includes('expired')) return 'EXPIRED_PASSWORD';
    if (message?.toLowerCase().includes('conflict')) return 'SESSION_CONFLICT';
    return 'WRONG_PASSWORD';
  }
  if (statusCode === 404) return 'USER_NOT_FOUND';
  if (statusCode >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

function userFriendlyMessage(code: LoginErrorCode, raw?: string): string {
  switch (code) {
    case 'WRONG_PASSWORD':
      return raw || 'Incorrect password. Please try again.';
    case 'USER_NOT_FOUND':
      return 'No account found with this Employee ID or email.';
    case 'INACTIVE_USER':
      return 'Your account is inactive. Please contact HR or IT support.';
    case 'LOCKED_USER':
      return 'Your account has been locked. Please contact your administrator.';
    case 'EXPIRED_PASSWORD':
      return 'Your password has expired. Please reset it.';
    case 'MAINTENANCE':
      return 'The system is under maintenance. Please try again later.';
    case 'SERVER_ERROR':
      return 'A server error occurred. Please try again shortly.';
    case 'NETWORK_ERROR':
      return 'No internet connection. Please check your network and retry.';
    case 'SESSION_CONFLICT':
      return 'Another session is active. Please log out from other devices.';
    default:
      return raw || 'Authentication failed. Please check your credentials.';
  }
}

export function useLogin(showCompanyCode: boolean = false): UseLoginReturn {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const setTenantBranding = useThemeStore((s) => s.setTenantBranding);

  const [form, setForm] = useState<LoginFormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);

  const setField = useCallback(
    (field: keyof LoginFormValues, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      setLoginError(null);
    },
    []
  );

  const clearError = useCallback(() => {
    setLoginError(null);
    setErrors({});
  }, []);

  const submit = useCallback(async () => {
    // Client-side validation
    const validationErrors = validateLoginForm(form, showCompanyCode);
    if (Object.keys(validationErrors).length > 0) {
      if (__DEV__) {
        console.log('[useLogin] Validation failed:', validationErrors);
      }
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setLoginError(null);

    if (__DEV__) {
      console.log('[useLogin] Initiating login for:', form.identifier.trim());
    }

    try {
      const payload: Record<string, string> = {
        email: form.identifier.trim(),
        password: form.password.trim(),
      };
      if (showCompanyCode && form.companyCode.trim()) {
        payload.companyCode = form.companyCode.trim().toUpperCase();
      }

      const response = await authApi.login(payload);

      if (!response || !response.token || !response.user) {
        setLoginError({ code: 'UNKNOWN', message: 'Invalid response from server.' });
        return;
      }

      // Store session
      await login(response.token, response.user, form.rememberMe as boolean, payload.companyCode);

      // Optionally update branding from response
      if (response.company) {
        setTenantBranding({
          companyName: response.company.name,
          logoUrl: response.company.settings?.logoUrl,
          primary: response.company.settings?.primaryColor,
          secondary: response.company.settings?.secondaryColor,
        });
      }
    } catch (err: any) {
      const mapped = mapAxiosError(err);
      const statusCode = mapped.statusCode || err.statusCode || err.response?.status;
      const rawMessage = mapped.message || err.message || err.response?.data?.message || err.response?.data?.error;
      const code = resolveErrorCode(statusCode, rawMessage);

      if (__DEV__) {
        console.log('[useLogin] Auth failure resolved:', { statusCode, rawMessage, code });
      }

      setLoginError({ code, message: userFriendlyMessage(code, rawMessage) });
    } finally {
      setLoading(false);
    }
  }, [form, showCompanyCode, login, setTenantBranding]);

  return { form, errors, loginError, loading, setField, submit, clearError };
}

export default useLogin;
