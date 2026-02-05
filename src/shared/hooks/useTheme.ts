import { THEMES } from '../constants/theme';
import { useThemeStore } from '../stores/themeStore';

export const useTheme = () => {
  const theme = useThemeStore(state => state.theme);
  const definition = THEMES[theme];

  return {
    colors: definition.colors,
    gradients: definition.gradients,
    isDark: definition.isDark,
    theme: definition.name,
  };
};
