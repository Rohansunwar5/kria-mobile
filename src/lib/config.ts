import Constants from 'expo-constants';

const fromExtra = (Constants.expoConfig?.extra as any)?.apiBaseUrl as
  | string
  | undefined;

// The host Metro/Expo Go is being served from, e.g. "192.168.1.21:8081".
// On a physical device this is the dev machine's LAN IP, so the backend is
// reachable at that same host on the API port (localhost would point at the
// phone itself). Strip the Metro port and use the backend port.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0];

// Order: explicit app.json extra > Expo dev host > __DEV__ localhost > prod.
export const API_BASE_URL =
  fromExtra ||
  (__DEV__ && devHost
    ? `http://${devHost}:4010`
    : __DEV__
      ? 'http://localhost:4010'
      : 'https://api.kria.club');

export const SOCKET_URL = API_BASE_URL;
