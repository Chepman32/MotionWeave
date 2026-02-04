import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { AppInitializer } from './src/app/providers/AppInitializer';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Global StatusBar - will be overridden by screen-specific StatusBars */}
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
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
