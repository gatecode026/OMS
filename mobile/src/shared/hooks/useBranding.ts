/**
 * @file useBranding.ts
 * @description Hooks providing dynamically resolved branding configurations, assets, and React Query syncing.
 */

import { useQuery } from '@tanstack/react-query';
import useTheme from './useTheme';
import { useThemeStore } from '../store/themeStore';
import { useBrandingStore, TenantBranding } from '../store/brandingStore';
import assetService from '../services/assetService';
import { optimizeImageKitUrl } from '../utils/image';

/**
 * Core query hook that fetches branding and updates the local stores.
 */
export const useBrandingQuery = (enabled: boolean = true) => {
  const setBranding = useBrandingStore((s) => s.setBranding);
  const setTenantBranding = useThemeStore((s) => s.setTenantBranding);

  return useQuery<TenantBranding>({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await assetService.getBranding();
      // Update local Zustand stores immediately upon successful fetch
      await setBranding(data);
      setTenantBranding({
        primary: data.primaryColor,
        secondary: data.secondaryColor,
        companyName: data.companyName,
        logoUrl: data.logoUrl,
      });
      return data;
    },
    enabled,
    retry: 2,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

/**
 * Hook to retrieve resolved branding values, falling back to local defaults.
 */
export const useBranding = () => {
  const { colors } = useTheme();
  const branding = useBrandingStore((s) => s.branding);

  const companyName = branding?.companyName || 'Gatecode Technologies';
  const logoUrl = branding?.logoUrl ? optimizeImageKitUrl(branding.logoUrl) : null;
  const isBranded = !!branding;

  // Resolve custom branding colors, falling back to theme tokens
  const primaryColor = branding?.primaryColor || colors.primary;
  const secondaryColor = branding?.secondaryColor || colors.secondary;

  return {
    companyName,
    logoUrl,
    isBranded,
    branding,
    colors: {
      ...colors,
      primary: primaryColor,
      secondary: secondaryColor,
    },
    appTitle: 'Gatecode OMS',
    appSubtitle: 'Enterprise Operations Management',
    brandOverride: null,
    themeOverride: null,
  };
};

/**
 * Hook to resolve company logo assets.
 */
export const useCompanyLogo = (width?: number, height?: number) => {
  const branding = useBrandingStore((s) => s.branding);
  
  const logoUrl = branding?.logoUrl 
    ? optimizeImageKitUrl(branding.logoUrl, width, height) 
    : null;
    
  const appLogoUrl = branding?.appLogoUrl 
    ? optimizeImageKitUrl(branding.appLogoUrl, width, height) 
    : logoUrl;

  return {
    logoUrl,
    appLogoUrl,
  };
};

/**
 * Hook to resolve splash screen loading branding.
 */
export const useSplashAssets = () => {
  const branding = useBrandingStore((s) => s.branding);
  return {
    splashLogo: branding?.splashLogoUrl ? optimizeImageKitUrl(branding.splashLogoUrl) : null,
    splashBackground: branding?.splashBackgroundUrl ? optimizeImageKitUrl(branding.splashBackgroundUrl) : null,
  };
};

/**
 * Hook to resolve login banner and logo illustrations.
 */
export const useLoginAssets = () => {
  const branding = useBrandingStore((s) => s.branding);
  return {
    loginLogo: branding?.loginLogoUrl ? optimizeImageKitUrl(branding.loginLogoUrl) : null,
    loginBanner: branding?.loginBannerUrl ? optimizeImageKitUrl(branding.loginBannerUrl) : null,
  };
};

export default useBranding;
