/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-gesture-handler', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: ({ children, ...props }: any) =>
      ReactLib.createElement(View, props, children),
  };
});

jest.mock('../src/app/providers/AppInitializer', () => {
  const ReactLib = require('react');
  return {
    AppInitializer: ({ children }: any) =>
      ReactLib.createElement(ReactLib.Fragment, null, children),
  };
});

jest.mock('../src/app/navigation/AppNavigator', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    AppNavigator: () => ReactLib.createElement(View, null),
  };
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
