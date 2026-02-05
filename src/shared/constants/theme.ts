export type ThemeName = 'light' | 'dark' | 'solar' | 'mono';

export type ThemeColors = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
};

export type ThemeGradients = {
  primary: string[];
  background: string[];
};

export type ThemeDefinition = {
  name: ThemeName;
  isDark: boolean;
  colors: ThemeColors;
  gradients: ThemeGradients;
};

export const THEMES: Record<ThemeName, ThemeDefinition> = {
  light: {
    name: 'light',
    isDark: false,
    colors: {
      primary: '#7B68EE',
      secondary: '#FF69B4',
      background: '#F8F9FA',
      surface: '#FFFFFF',
      textPrimary: '#1A1A1A',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      error: '#EF4444',
      success: '#10B981',
    },
    gradients: {
      primary: ['#7B68EE', '#FF69B4'],
      background: ['#F8F9FA', '#E5E7EB'],
    },
  },
  dark: {
    name: 'dark',
    isDark: true,
    colors: {
      primary: '#9B8EFF',
      secondary: '#FF85C8',
      background: '#0F0F0F',
      surface: '#1A1A1A',
      textPrimary: '#FFFFFF',
      textSecondary: '#9CA3AF',
      border: '#374151',
      error: '#F87171',
      success: '#34D399',
    },
    gradients: {
      primary: ['#9B8EFF', '#FF85C8'],
      background: ['#0F0F0F', '#1A1A1A'],
    },
  },
  solar: {
    name: 'solar',
    isDark: false,
    colors: {
      primary: '#D97706',
      secondary: '#F59E0B',
      background: '#FFF7E6',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B5B3E',
      border: '#F3E2C8',
      error: '#DC2626',
      success: '#059669',
    },
    gradients: {
      primary: ['#F59E0B', '#D97706'],
      background: ['#FFF7E6', '#FDEFD3'],
    },
  },
  mono: {
    name: 'mono',
    isDark: false,
    colors: {
      primary: '#4B5563',
      secondary: '#9CA3AF',
      background: '#F3F4F6',
      surface: '#FFFFFF',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      border: '#D1D5DB',
      error: '#DC2626',
      success: '#059669',
    },
    gradients: {
      primary: ['#9CA3AF', '#4B5563'],
      background: ['#F3F4F6', '#E5E7EB'],
    },
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '600' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};
