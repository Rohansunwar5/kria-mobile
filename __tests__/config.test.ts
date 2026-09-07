// Guards the API base URL. It still must not branch on __DEV__ — `expo start
// --no-dev` once flipped the app to production that way. The last-resort
// fallback is now the production API by choice, so the guarantee that matters
// is the override order: a local server is always one env var away.

const load = () => {
  let mod: typeof import('@/lib/config');
  jest.isolateModules(() => {
    mod = require('@/lib/config');
  });
  return mod!;
};

describe('API_BASE_URL', () => {
  const realEnv = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (realEnv === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = realEnv;
    jest.unmock('expo-constants');
  });

  it('falls back to the production API when nothing else is configured', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
    expect(load().API_BASE_URL).toBe('https://api.kria.club');
  });

  it('reads app.json extra when set', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { extra: { apiBaseUrl: 'http://10.0.0.5:4010' } } },
    }));
    expect(load().API_BASE_URL).toBe('http://10.0.0.5:4010');
  });

  it('lets the env var win over app.json — this is how a release build points at prod', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:4010' } } },
    }));
    expect(load().API_BASE_URL).toBe('https://api.example.test');
  });

  it('still resolves with no expo config at all', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: undefined } }));
    expect(load().API_BASE_URL).toBe('https://api.kria.club');
  });

  it('points the socket at the same origin as the API', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
    const m = load();
    expect(m.SOCKET_URL).toBe(m.API_BASE_URL);
  });
});
