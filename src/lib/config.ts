import Constants from 'expo-constants';

// Where the API lives. Resolution order, highest first:
//
//   1. EXPO_PUBLIC_API_BASE_URL  — inlined into the bundle at build time.
//      This is how a production build points at the real API.
//   2. app.json  expo.extra.apiBaseUrl
//   3. https://api.kria.club     — the production API.
//
// Deliberately does NOT branch on __DEV__. It used to, and `expo start --no-dev`
// silently flipped the app to production and hit the live API from a local dev
// server. A build mode should never decide which backend you talk to.
//
// app.json `extra.apiBaseUrl` points at production (https://api.kria.club) so
// device testing works out of the box. To work against a local server, set
// EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:4010 — it wins over app.json.

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;

export const API_BASE_URL = fromEnv || fromExtra || 'https://api.kria.club';

export const SOCKET_URL = API_BASE_URL;
