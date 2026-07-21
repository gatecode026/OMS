/**
 * @file ThemeProvider.tsx
 * @description Hydrates stored theme settings and provides system-wide layout wrapper.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { lightColors } from './tokens';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const loadThemeSettings = useThemeStore((state) => state.loadThemeSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        await loadThemeSettings();
      } catch (error) {
        console.error('Failed to load theme settings', error);
      } finally {
        setLoading(false);
      }
    };
    initializeTheme();
  }, [loadThemeSettings]);

  if (loading) {
    // Return null during theme hydration — SplashScreen in NavigationGate covers this
    return null;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});
export default ThemeProvider;
