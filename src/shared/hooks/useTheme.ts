import { useColorScheme } from 'react-native';
import { COLORS, GRADIENTS } from '../constants/theme';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    colors: isDark ? COLORS.dark : COLORS.light,
    gradients: GRADIENTS,
    isDark,
  };
};
