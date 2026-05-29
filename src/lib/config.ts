import Constants from 'expo-constants';

const fromExtra = (Constants.expoConfig?.extra as any)?.apiBaseUrl as
  | string
  | undefined;

// Order: explicit app.json extra > __DEV__ localhost > prod.
export const API_BASE_URL =
  fromExtra || (__DEV__ ? 'http://localhost:4010' : 'https://api.kria.club');

export const SOCKET_URL = API_BASE_URL;
