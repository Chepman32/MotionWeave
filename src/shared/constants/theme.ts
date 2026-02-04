export const COLORS = {
  light: {
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
  dark: {
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
};

export const GRADIENTS = {
  primary: ['#7B68EE', '#FF69B4'],
  backgroundLight: ['#F8F9FA', '#E5E7EB'],
  backgroundDark: ['#0F0F0F', '#1A1A1A'],
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
