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
  // Reanimated ships a jest resolver that swaps its native-only internals for the
  // web variants, so no native module load is attempted under jest.
  resolver: require.resolve('react-native-reanimated/jest/resolver'),
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
