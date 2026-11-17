// react-native-safe-area-context ships its own jest mock; without it,
// useSafeAreaInsets() throws "No safe area value available" for any test that
// renders a component outside a <SafeAreaProvider> (e.g. FloatingTabBar).
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      delete store[k];
    }),
  };
});

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied', canAskAgain: true })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]', type: 'expo' })),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  AndroidImportance: { DEFAULT: 5, HIGH: 6 },
}));

// Gesture handler's own mocks for its native module and host detector (crop screen).
require('react-native-gesture-handler/jestSetup');
// Its Reanimated bridge asks worklets for a UI-runtime handle, which jest's
// worklets build doesn't have; there is no UI thread to bind to here anyway.
jest.mock('./node_modules/react-native-gesture-handler/src/handlers/gestures/installUIRuntimeBindings', () => ({
  installUIRuntimeBindings: () => undefined,
}));
jest.mock('./node_modules/react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings', () => ({
  installUIRuntimeBindings: () => undefined,
}));
