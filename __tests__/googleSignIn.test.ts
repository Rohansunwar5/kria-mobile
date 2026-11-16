import { Platform } from 'react-native';

// SERVER-GAPS #35. Every other suite mocks this module; these pin it against
// the native library's own response shapes (v17's original Google sign-in).

let mockExpoGo = false;
jest.mock('expo', () => ({ isRunningInExpoGo: () => mockExpoGo }));

const mockConfigure = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn(() => Promise.resolve(null));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (o: unknown) => mockConfigure(o),
    hasPlayServices: () => Promise.resolve(true),
    signIn: () => mockSignIn(),
    signOut: () => mockSignOut(),
  },
  isSuccessResponse: (r: { type: string }) => r.type === 'success',
}));

import { GOOGLE_WEB_CLIENT_ID, googleIdToken, googleSignInAvailable, googleSignOut } from '@/lib/googleSignIn';

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockExpoGo = false;
  mockSignIn.mockReset();
  mockSignOut.mockClear();
});
afterEach(() => jest.restoreAllMocks());

it('is available only in an Android build', () => {
  expect(googleSignInAvailable()).toBe(true);
  mockExpoGo = true;
  expect(googleSignInAvailable()).toBe(false);
  mockExpoGo = false;
  jest.replaceProperty(Platform, 'OS', 'ios');
  expect(googleSignInAvailable()).toBe(false);
});

describe('googleIdToken', () => {
  // First in the file: the module configures the library once, on first use.
  it("returns Google's ID token, configuring the Web client ID once", async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: 'tok' } });
    expect(await googleIdToken()).toBe('tok');
    expect(await googleIdToken()).toBe('tok');
    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(mockConfigure).toHaveBeenCalledWith({ webClientId: GOOGLE_WEB_CLIENT_ID });
  });

  it('is null when the player cancels the picker', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled', data: null });
    expect(await googleIdToken()).toBeNull();
  });

  it('throws when Google returns no ID token', async () => {
    mockSignIn.mockResolvedValue({ type: 'success', data: { idToken: null } });
    await expect(googleIdToken()).rejects.toThrow('Google returned no ID token.');
  });
});

describe('googleSignOut', () => {
  it('signs out of Google, and never throws', async () => {
    await googleSignOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    mockSignOut.mockRejectedValueOnce(new Error('offline'));
    await expect(googleSignOut()).resolves.toBeUndefined();
  });

  it("does nothing where Google sign-in isn't available", async () => {
    mockExpoGo = true;
    await googleSignOut();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
