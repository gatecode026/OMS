import { create } from 'zustand';
import secureStore from '../services/secureStore';

export interface TenantBranding {
  tenantId: string;
  companyName: string;
  logoUrl?: string;
  appLogoUrl?: string;
  loginLogoUrl?: string;
  loginBannerUrl?: string;
  splashLogoUrl?: string;
  splashBackgroundUrl?: string;
  dashboardBannerUrl?: string;
  emptyStateUrl?: string;
  placeholderUrl?: string;
  defaultAvatarUrl?: string;
  watermarkUrl?: string;
  pdfHeaderLogoUrl?: string;
  pdfFooterLogoUrl?: string;
  emailLogoUrl?: string;
  notificationIconUrl?: string;
  attendanceIllustrationUrl?: string;
  leaveIllustrationUrl?: string;
  chatPlaceholderUrl?: string;
  errorIllustrationUrl?: string;
  maintenanceBannerUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface BrandingState {
  branding: TenantBranding | null;
  lastUpdated: number | null;
  setBranding: (branding: TenantBranding | null) => Promise<void>;
  loadBranding: () => Promise<void>;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  branding: null,
  lastUpdated: null,

  setBranding: async (branding) => {
    const timestamp = branding ? Date.now() : null;
    set({ branding, lastUpdated: timestamp });
    if (branding) {
      await secureStore.setJson('tenant_branding_v2', branding);
      await secureStore.setItem('tenant_branding_v2_last_updated', String(timestamp));
    } else {
      await secureStore.deleteItem('tenant_branding_v2');
      await secureStore.deleteItem('tenant_branding_v2_last_updated');
    }
  },

  loadBranding: async () => {
    const savedBranding = await secureStore.getJson<TenantBranding>('tenant_branding_v2');
    const savedTimestamp = await secureStore.getItem('tenant_branding_v2_last_updated');
    set({
      branding: savedBranding || null,
      lastUpdated: savedTimestamp ? parseInt(savedTimestamp, 10) : null,
    });
  },
}));

export default useBrandingStore;
