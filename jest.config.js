const expoPreset = require('jest-expo/jest-preset');

// Keep jest-expo's own transformIgnorePatterns (it knows which RN-internal
// modules must be transformed) and widen it to also transform our added deps.
const extraPkgs = [
  'nativewind',
  'react-native-css-interop',
  '@reduxjs/toolkit',
  'react-redux',
  'socket.io-client',
  'axios',
  '@expo-google-fonts/.*',
];
const basePattern = expoPreset.transformIgnorePatterns[0];
const widenedPattern = basePattern.replace(/\)\)$/, `|${extraPkgs.join('|')}))`);

module.exports = {
  ...expoPreset,
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
