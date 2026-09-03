// Guards the API base URL. This has silently pointed at production twice:
// once from an app.json `extra` left on the prod URL, once from
// `expo start --no-dev` flipping __DEV__ and taking the production branch.

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

  it('defaults to the local server', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
    expect(load().API_BASE_URL).toBe('http://localhost:4010');
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

  it('never falls back to a hardcoded production host', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: undefined } }));
    const url = load().API_BASE_URL;
    expect(url).toBe('http://localhost:4010');
    expect(url).not.toMatch(/kria\.club/);
  });

  it('points the socket at the same origin as the API', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
    const m = load();
    expect(m.SOCKET_URL).toBe(m.API_BASE_URL);
  });
});
