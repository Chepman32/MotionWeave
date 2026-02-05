import { create } from 'zustand';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeName } from '../constants/theme';

const THEME_STORAGE_KEY = 'motionweave.theme.v1';

const isThemeName = (value: unknown): value is ThemeName => {
  return (
    value === 'light' ||
    value === 'dark' ||
    value === 'solar' ||
    value === 'mono'
  );
};

const getDefaultTheme = (): ThemeName => {
  const scheme = Appearance.getColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
};

interface ThemeStore {
  theme: ThemeName;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemeName) => Promise<void>;
}

export const useThemeStore = create<ThemeStore>(set => ({
  theme: getDefaultTheme(),
  isHydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored && isThemeName(stored)) {
        set({ theme: stored, isHydrated: true });
        return;
      }
      set({ isHydrated: true });
    } catch (error) {
      console.warn('Failed to hydrate theme:', error);
      set({ isHydrated: true });
    }
  },

  setTheme: async theme => {
    set({ theme });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Failed to persist theme:', error);
    }
  },
}));

