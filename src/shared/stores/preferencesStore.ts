import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERENCES_STORAGE_KEY = 'motionweave.preferences.v1';

type StoredPreferences = {
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
};

interface PreferencesStore {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
}

const safeParse = (raw: string | null): StoredPreferences | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as StoredPreferences;
  } catch {
    return null;
  }
};

const persist = async (prefs: StoredPreferences) => {
  try {
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn('Failed to persist preferences:', error);
  }
};

export const usePreferencesStore = create<PreferencesStore>((set, get) => ({
  soundEnabled: true,
  hapticsEnabled: true,
  isHydrated: false,

  hydrate: async () => {
    try {
      const stored = safeParse(await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY));
      if (stored) {
        set({
          soundEnabled:
            typeof stored.soundEnabled === 'boolean'
              ? stored.soundEnabled
              : true,
          hapticsEnabled:
            typeof stored.hapticsEnabled === 'boolean'
              ? stored.hapticsEnabled
              : true,
          isHydrated: true,
        });
        return;
      }
      set({ isHydrated: true });
    } catch (error) {
      console.warn('Failed to hydrate preferences:', error);
      set({ isHydrated: true });
    }
  },

  setSoundEnabled: async enabled => {
    set({ soundEnabled: enabled });
    const snapshot = get();
    await persist({
      soundEnabled: enabled,
      hapticsEnabled: snapshot.hapticsEnabled,
    });
  },

  setHapticsEnabled: async enabled => {
    set({ hapticsEnabled: enabled });
    const snapshot = get();
    await persist({
      soundEnabled: snapshot.soundEnabled,
      hapticsEnabled: enabled,
    });
  },
}));

