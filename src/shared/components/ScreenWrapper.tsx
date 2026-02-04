import React from 'react';
import { View, StyleSheet, StatusBarStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedStatusBar } from './ThemedStatusBar';
import { useTheme } from '../hooks/useTheme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  statusBarStyle?: StatusBarStyle;
  statusBarBackgroundColor?: string;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  statusBarStyle,
  statusBarBackgroundColor,
  edges = ['top', 'bottom'],
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const paddingStyles = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar
        style={statusBarStyle}
        backgroundColor={statusBarBackgroundColor}
        translucent={true}
      />
      <View style={[styles.content, paddingStyles]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
