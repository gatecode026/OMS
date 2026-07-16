/**
 * @file useBranding.ts
 * @description Hook providing dynamically resolved brand settings (colors, name, logo) with defaults.
 */

import useTheme from './useTheme';
import { useThemeStore } from '../store/themeStore';

export const useBranding = () => {
  const { colors } = useTheme();
  const tenantBranding = useThemeStore((state) => state.tenantBranding);

  const companyName = tenantBranding?.companyName || 'Gatecode Technologies';
  const logoUrl = tenantBranding?.logoUrl || null;
  const isBranded = !!tenantBranding;

  // Resolve custom branding colors, falling back to theme tokens
  const primaryColor = tenantBranding?.primary || colors.primary;
  const secondaryColor = tenantBranding?.secondary || colors.secondary;

  return {
    companyName,
    logoUrl,
    isBranded,
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

export default useBranding;
