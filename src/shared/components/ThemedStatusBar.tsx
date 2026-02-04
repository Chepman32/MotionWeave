import React from 'react';
import { StatusBar, StatusBarStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface ThemedStatusBarProps {
  style?: StatusBarStyle;
  translucent?: boolean;
  backgroundColor?: string;
}

export const ThemedStatusBar: React.FC<ThemedStatusBarProps> = ({
  style,
  translucent = true,
  backgroundColor,
}) => {
  const { isDark, colors } = useTheme();

  // Use provided style or default based on theme
  const barStyle = style || (isDark ? 'light-content' : 'dark-content');
  
  // Use provided background color or theme background
  const bgColor = backgroundColor || colors.background;

  return (
    <StatusBar
      barStyle={barStyle}
      backgroundColor={translucent ? 'transparent' : bgColor}
      translucent={translucent}
    />
  );
};
