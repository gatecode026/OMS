/**
 * @file authStore.ts
 * @description Zustand store for user session and authentication.
 */

import { create } from 'zustand';
import secureStore from '../services/secureStore';
import { unregisterDeviceFromPushNotifications } from '../services/pushNotification';
import { disconnectSocketOnLogout } from '../services/socketManager';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  companyId: string | null;
  status: string;
  [key: string]: any;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserProfile | null;
  companyId: string | null;
  rememberMe: boolean;
  rememberedEmail: string | null;
  rememberedCompanyCode: string | null;
  loadingSession: boolean;
  login: (token: string, user: UserProfile, rememberMe: boolean, companyCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<UserProfile>) => void;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  user: null,
  companyId: null,
  rememberMe: false,
  rememberedEmail: null,
  rememberedCompanyCode: null,
  loadingSession: true,

  login: async (token, user, rememberMe, companyCode) => {
    set({
      isAuthenticated: true,
      token,
      user,
      companyId: user.companyId || null,
      rememberMe,
    });

    await secureStore.setItem('auth_token', token);
    await secureStore.setJson('user_profile', user);
    await secureStore.setItem('remember_me', rememberMe ? 'true' : 'false');

    if (rememberMe) {
      await secureStore.setItem('remembered_email', user.email);
      if (companyCode) {
        await secureStore.setItem('remembered_company_code', companyCode);
      }
      set({
        rememberedEmail: user.email,
        rememberedCompanyCode: companyCode || null,
      });
    } else {
      await secureStore.deleteItem('remembered_email');
      await secureStore.deleteItem('remembered_company_code');
      set({
        rememberedEmail: null,
        rememberedCompanyCode: null,
      });
    }
  },

  logout: async () => {
    // Disconnect socket immediately on logout — user is no longer authenticated
    disconnectSocketOnLogout();

    try {
      await unregisterDeviceFromPushNotifications();
    } catch (err) {
      console.warn('[authStore] Error during push notification unregistration:', err);
    }

    set({
      isAuthenticated: false,
      token: null,
      user: null,
      companyId: null,
    });

    await secureStore.deleteItem('auth_token');
    await secureStore.deleteItem('user_profile');
    // Keep remembered credentials if rememberMe is true, otherwise clean them up
    const rememberMeVal = await secureStore.getItem('remember_me');
    if (rememberMeVal !== 'true') {
      await secureStore.deleteItem('remember_me');
      await secureStore.deleteItem('remembered_email');
      await secureStore.deleteItem('remembered_company_code');
      set({ rememberMe: false, rememberedEmail: null, rememberedCompanyCode: null });
    }
  },

  updateUser: (updatedFields) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, ...updatedFields };
      secureStore.setJson('user_profile', newUser);
      return { user: newUser };
    });
  },

  loadSession: async () => {
    try {
      const token = await secureStore.getItem('auth_token');
      const user = await secureStore.getJson<UserProfile>('user_profile');
      const rememberMeVal = await secureStore.getItem('remember_me');
      const rememberedEmail = await secureStore.getItem('remembered_email');
      const rememberedCompanyCode = await secureStore.getItem('remembered_company_code');

      const rememberMe = rememberMeVal === 'true';

      if (token && user) {
        set({
          isAuthenticated: true,
          token,
          user,
          companyId: user.companyId || null,
          rememberMe,
          rememberedEmail: rememberMe ? rememberedEmail : null,
          rememberedCompanyCode: rememberMe ? rememberedCompanyCode : null,
          loadingSession: false,
        });
      } else {
        set({
          isAuthenticated: false,
          token: null,
          user: null,
          companyId: null,
          rememberMe,
          rememberedEmail,
          rememberedCompanyCode,
          loadingSession: false,
        });
      }
    } catch (error) {
      console.error('AuthStore: Error loading hydrated session', error);
      set({ loadingSession: false });
    }
  },
}));
export default useAuthStore;
