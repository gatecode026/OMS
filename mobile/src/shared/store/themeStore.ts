/**
 * @file themeStore.ts
 * @description Zustand store for managing theme selection and dynamic branding configurations.
 */

import { create } from 'zustand';
import { lightColors, darkColors, ThemeColors } from '../theme/tokens';
import secureStore from '../services/secureStore';

export type ThemeMode = 'light' | 'dark' | 'system';

interface TenantBranding {
  primary?: string;
  secondary?: string;
  companyName?: string;
  logoUrl?: string;
}

interface ThemeState {
  themeMode: ThemeMode;
  tenantBranding: TenantBranding | null;
  setThemeMode: (mode: ThemeMode) => void;
  setTenantBranding: (branding: TenantBranding | null) => void;
  getColors: (isSystemDark: boolean) => ThemeColors;
  loadThemeSettings: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'system',
  tenantBranding: null,

  setThemeMode: async (mode) => {
    set({ themeMode: mode });
    await secureStore.setItem('theme_mode', mode);
  },

  setTenantBranding: async (branding) => {
    set({ tenantBranding: branding });
    if (branding) {
      await secureStore.setJson('tenant_branding', branding);
    } else {
      await secureStore.deleteItem('tenant_branding');
    }
  },

  getColors: (isSystemDark: boolean) => {
    const { themeMode, tenantBranding } = get();
    const isDark = themeMode === 'system' ? isSystemDark : themeMode === 'dark';
    const baseColors = isDark ? { ...darkColors } : { ...lightColors };

    if (tenantBranding?.primary) {
      baseColors.primary = tenantBranding.primary;
    }
    if (tenantBranding?.secondary) {
      baseColors.secondary = tenantBranding.secondary;
    }

    return baseColors;
  },

  loadThemeSettings: async () => {
    const savedMode = (await secureStore.getItem('theme_mode')) as ThemeMode | null;
    const savedBranding = await secureStore.getJson<TenantBranding>('tenant_branding');

    set({
      themeMode: savedMode || 'system',
      tenantBranding: savedBranding || null,
    });
  },
}));
