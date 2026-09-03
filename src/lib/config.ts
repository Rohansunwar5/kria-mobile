import Constants from 'expo-constants';

// Where the API lives. Resolution order, highest first:
//
//   1. EXPO_PUBLIC_API_BASE_URL  — inlined into the bundle at build time.
//      This is how a production build points at the real API.
//   2. app.json  expo.extra.apiBaseUrl
//   3. http://localhost:4010     — the local server.
//
// Deliberately does NOT branch on __DEV__. It used to, and `expo start --no-dev`
// silently flipped the app to production and hit the live API from a local dev
// server. A build mode should never decide which backend you talk to.
//
// ponytail: localhost is the default because that is what local work needs.
// SHIPPING A RELEASE BUILD REQUIRES SETTING EXPO_PUBLIC_API_BASE_URL, or the
// app will point at a server that is not there.

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;

export const API_BASE_URL = fromEnv || fromExtra || 'http://localhost:4010';

export const SOCKET_URL = API_BASE_URL;
