import apiClient from './apiClient';
import { useBrandingStore, TenantBranding } from '../store/brandingStore';
import { useThemeStore } from '../store/themeStore';

export const assetService = {
  /**
   * Fetch branding configuration from the backend API.
   */
  async getBranding(): Promise<TenantBranding> {
    const response = await apiClient.get('/api/v1/branding');
    return response.data?.data || response.data;
  },

  /**
   * Refresh and cache the latest branding details in the stores.
   */
  async refreshBranding(): Promise<TenantBranding> {
    const branding = await this.getBranding();
    
    // Update Zustand Branding Store
    await useBrandingStore.getState().setBranding(branding);

    // Synchronize with the Theme Store for colors and name
    useThemeStore.getState().setTenantBranding({
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      companyName: branding.companyName,
      logoUrl: branding.logoUrl
    });

    return branding;
  },

  /**
   * Clear all cached branding assets.
   */
  async clearBrandingCache(): Promise<void> {
    await useBrandingStore.getState().setBranding(null);
    useThemeStore.getState().setTenantBranding(null);
  }
};

export default assetService;
