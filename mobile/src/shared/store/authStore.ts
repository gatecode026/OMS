/**
 * @file authStore.ts
 * @description Zustand store for user session and authentication.
 */

import { create } from 'zustand';
import secureStore from '../services/secureStore';
import AvatarCacheManager from '../services/AvatarCacheManager';
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
      AvatarCacheManager.clear();
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
      if (state.user.id) {
        AvatarCacheManager.invalidate(state.user.id);
      }
      return { user: newUser };
    });
  },

  loadSession: async () => {
    try {
      const [token, user, rememberMeVal, rememberedEmail, rememberedCompanyCode] = await Promise.all([
        secureStore.getItem('auth_token'),
        secureStore.getJson<UserProfile>('user_profile'),
        secureStore.getItem('remember_me'),
        secureStore.getItem('remembered_email'),
        secureStore.getItem('remembered_company_code'),
      ]);

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
