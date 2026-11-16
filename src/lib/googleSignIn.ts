import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

/**
 * "Continue with Google" (SERVER-GAPS #35). Firebase project kria-b849d's Web
 * client ID: Google issues the ID token for it, and the server checks it.
 * Public by design; the client secret is never used.
 */
export const GOOGLE_WEB_CLIENT_ID = '538256095759-op8gn7jusv3iqeccherrglr00nngb6u9.apps.googleusercontent.com';

/** Android builds only: Expo Go can't load the native module, and iOS isn't set up yet. */
export function googleSignInAvailable(): boolean {
  return Platform.OS === 'android' && !isRunningInExpoGo();
}

let configured = false;

// Loaded on first use, so Expo Go and jest never import the native module.
function native(): typeof import('@react-native-google-signin/google-signin') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  if (!configured) {
    mod.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    configured = true;
  }
  return mod;
}

/** Shows the account picker. The ID token, or null when the player cancels; throws on any other failure. */
export async function googleIdToken(): Promise<string | null> {
  const { GoogleSignin, isSuccessResponse } = native();
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res)) return null;
  if (!res.data.idToken) throw new Error('Google returned no ID token.');
  return res.data.idToken;
}

/** Forgets the chosen account, so the picker shows again. Never throws. */
export async function googleSignOut(): Promise<void> {
  if (!googleSignInAvailable()) return;
  try {
    await native().GoogleSignin.signOut();
  } catch {
    // Signing out of Kria must not fail on Google's side.
  }
}
