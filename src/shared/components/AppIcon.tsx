import type React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';

export type AppIconName = React.ComponentProps<typeof Ionicons>['name'];

export const AppIcon = Ionicons;

export const loadAppIconFont = async (): Promise<void> => {
  try {
    const maybeLoadFont = (Ionicons as unknown as { loadFont?: () => Promise<void> })
      .loadFont;
    if (typeof maybeLoadFont === 'function') {
      await maybeLoadFont();
    }
  } catch {
    // Best-effort: some setups register fonts via native config already.
  }
};
