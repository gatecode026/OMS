/**
 * @file tokens.ts
 * @description Design tokens for the design system (Colors, Spacing, Radius, Shadows, Typography).
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textLight: string;
  neutral: string;
  neutralLight: string;
  shadow: string;
}

export const lightColors: ThemeColors = {
  primary: '#4F46E5', // Indigo 600 (default)
  secondary: '#0EA5E9', // Sky 500
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  danger: '#EF4444', // Red 500
  info: '#3B82F6', // Blue 500
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E2E8F0', // Slate 200
  text: '#0F172A', // Slate 900
  textMuted: '#64748B', // Slate 500
  textLight: '#94A3B8', // Slate 400
  neutral: '#475569', // Slate 600
  neutralLight: '#F1F5F9', // Slate 100
  shadow: 'rgba(15, 23, 42, 0.08)',
};

export const darkColors: ThemeColors = {
  primary: '#6366F1', // Indigo 500
  secondary: '#38BDF8', // Sky 400
  success: '#34D399', // Emerald 400
  warning: '#FBBF24', // Amber 400
  danger: '#F87171', // Red 400
  info: '#60A5FA', // Blue 400
  background: '#090D16', // Dark background
  surface: '#111827', // Gray 900
  card: '#1F2937', // Gray 800
  border: '#374151', // Gray 700
  text: '#F9FAFB', // Gray 50
  textMuted: '#9CA3AF', // Gray 400
  textLight: '#6B7280', // Gray 500
  neutral: '#9CA3AF',
  neutralLight: '#1E293B',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  circular: 9999,
};

export const shadows = {
  light: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heavy: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  fab: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
};

export const typography = {
  fonts: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  sizes: {
    display: 32,
    h1: 24,
    h2: 20,
    h3: 18,
    title: 16,
    subtitle: 14,
    body: 14,
    caption: 12,
    label: 11,
  },
  lineHeights: {
    display: 40,
    h1: 32,
    h2: 26,
    h3: 24,
    title: 22,
    subtitle: 20,
    body: 20,
    caption: 16,
    label: 14,
  },
};
export type ThemeTokens = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  typography: typeof typography;
};
