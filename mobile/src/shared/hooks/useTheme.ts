/**
 * @file useTheme.ts
 * @description Hook to access current theme colors, spacing, radius, shadows, typography, and controls.
 */

import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { spacing, radius, shadows, typography, ThemeTokens } from '../theme/tokens';

export interface UseThemeResult extends ThemeTokens {
  themeMode: 'light' | 'dark' | 'system';
  isDark: boolean;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

export const useTheme = (): UseThemeResult => {
  const systemColorScheme = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const getColors = useThemeStore((state) => state.getColors);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);

  const isSystemDark = systemColorScheme === 'dark';
  const isDark = themeMode === 'system' ? isSystemDark : themeMode === 'dark';
  const colors = getColors(isSystemDark);

  return {
    colors,
    spacing,
    radius,
    shadows,
    typography,
    themeMode,
    isDark,
    setThemeMode,
  };
};
export default useTheme;
