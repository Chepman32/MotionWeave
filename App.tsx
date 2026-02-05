import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { AppInitializer } from './src/app/providers/AppInitializer';
import { useTheme } from './src/shared/hooks/useTheme';

function App() {
  const { isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Global StatusBar - will be overridden by screen-specific StatusBars */}
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <AppInitializer>
          <AppNavigator />
        </AppInitializer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
