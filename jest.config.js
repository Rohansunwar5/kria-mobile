const expoPreset = require('jest-expo/jest-preset');

// Keep jest-expo's own transformIgnorePatterns (it knows which RN-internal
// modules must be transformed) and widen it to also transform our added deps.
const extraPkgs = [
  'nativewind',
  'react-native-css-interop',
  '@reduxjs/toolkit',
  'immer',
  'react-redux',
  'socket.io-client',
  'axios',
  '@expo-google-fonts/.*',
];
const basePattern = expoPreset.transformIgnorePatterns[0];
const widenedPattern = basePattern.replace(/\)\)$/, `|${extraPkgs.join('|')}))`);

module.exports = {
  ...expoPreset,
  // Reanimated 4.5 / worklets 0.10 resolve NativeWorklets.native.ts under jest and
  // then fail loading the native module. The resolver worklets ships strips the
  // `.native` extension inside its own package so the JS variant is used instead.
  resolver: require.resolve('react-native-worklets/jest/resolver'),
  setupFilesAfterEnv: [
    ...(expoPreset.setupFilesAfterEnv || []),
    '<rootDir>/jest.setup.ts',
  ],
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper || {}),
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [widenedPattern],
};
