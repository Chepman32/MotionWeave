import { usePreferencesStore } from '../stores/preferencesStore';

type HapticTrigger = 'selection' | 'impactLight' | 'impactMedium' | 'impactHeavy';

let cached: any | null = null;

const getHapticsModule = async () => {
  if (cached) return cached;
  const mod: any = await import('react-native-haptic-feedback');
  cached = mod?.default ?? mod;
  return cached;
};

export const triggerHaptic = async (type: HapticTrigger = 'selection') => {
  const { hapticsEnabled } = usePreferencesStore.getState();
  if (!hapticsEnabled) return;

  try {
    const HapticFeedback = await getHapticsModule();
    if (!HapticFeedback?.trigger) return;
    HapticFeedback.trigger(type, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } catch {
    // Haptics are optional; ignore failures (e.g. in tests/simulator)
  }
};

