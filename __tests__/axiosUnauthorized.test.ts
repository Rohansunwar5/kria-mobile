import MockAdapter from 'axios-mock-adapter';
import API, { setUnauthorizedHandler } from '@/api/axios';
import { clearAuth } from '@/lib/storage';

jest.mock('@/lib/storage', () => ({
  getToken: jest.fn().mockResolvedValue(null),
  clearAuth: jest.fn().mockResolvedValue(undefined),
}));

describe('401 handling', () => {
  let mock: MockAdapter;
  const onUnauth = jest.fn();
  beforeEach(() => {
    mock = new MockAdapter(API);
    setUnauthorizedHandler(onUnauth);
    jest.clearAllMocks();
  });
  afterEach(() => mock.restore());

  it('leaves the session alone when change-password answers 401', async () => {
    mock.onPost('/player/auth/change-password').reply(401);
    await expect(API.post('/player/auth/change-password', {})).rejects.toBeTruthy();
    expect(clearAuth).not.toHaveBeenCalled();
    expect(onUnauth).not.toHaveBeenCalled();
  });

  it('leaves the session alone when login answers 401', async () => {
    mock.onPost('/player/auth/login').reply(401);
    await expect(API.post('/player/auth/login', {})).rejects.toBeTruthy();
    expect(clearAuth).not.toHaveBeenCalled();
    expect(onUnauth).not.toHaveBeenCalled();
  });

  it('signs out on a 401 from any other route', async () => {
    mock.onGet('/player/auth/profile').reply(401);
    await expect(API.get('/player/auth/profile')).rejects.toBeTruthy();
    expect(clearAuth).toHaveBeenCalledTimes(1);
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });
});
