import MockAdapter from 'axios-mock-adapter';
import API, { setUnauthorizedHandler } from '@/api/axios';
import * as storage from '@/lib/storage';

describe('axios instance', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('attaches the bearer token from storage', async () => {
    await storage.setAuth('jwt-xyz', 'player');
    let seen: string | undefined;
    mock.onGet('/ping').reply((cfg) => {
      seen = cfg.headers?.Authorization as string;
      return [200, {}];
    });
    await API.get('/ping');
    expect(seen).toBe('Bearer jwt-xyz');
  });

  it('does not attach a header when no token stored', async () => {
    await storage.clearAuth();
    let seen: string | undefined;
    mock.onGet('/ping').reply((cfg) => {
      seen = cfg.headers?.Authorization as string | undefined;
      return [200, {}];
    });
    await API.get('/ping');
    expect(seen).toBeUndefined();
  });

  // LAUNCH-AUDIT H21: a stalled request used to hang forever, leaving cold start on the splash.
  it('gives up on a request after 15 s', async () => {
    let seen: number | undefined;
    mock.onGet('/ping').reply((cfg) => { seen = cfg.timeout; return [200, {}]; });
    await API.get('/ping');
    expect(seen).toBe(15000);
  });

  it('gives an upload 2 minutes, so a photo on a slow connection is not cut off', async () => {
    let seen: number | undefined;
    mock.onPut('/up').reply((cfg) => { seen = cfg.timeout; return [200, {}]; });
    await API.put('/up', new FormData());
    expect(seen).toBe(120000);
  });

  it('says a timeout in words, not "timeout of 15000ms exceeded"', async () => {
    mock.onGet('/slow').timeout();
    await expect(API.get('/slow')).rejects.toMatchObject({ message: "Kria didn't answer in time. Check your connection and try again." });
  });

  it('clears auth and calls the unauthorized handler on 401', async () => {
    await storage.setAuth('jwt-xyz', 'player');
    const onUnauth = jest.fn();
    setUnauthorizedHandler(onUnauth);
    mock.onGet('/secure').reply(401);
    await expect(API.get('/secure')).rejects.toBeTruthy();
    expect(await storage.getToken()).toBeNull();
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });
});
