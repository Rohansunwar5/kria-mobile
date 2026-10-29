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

  // A wrong current or login password is a 400 now (SERVER-GAPS #34/#37), so a
  // 401 means one thing everywhere: the token is no good.
  it('leaves the session alone when a wrong password answers 400', async () => {
    mock.onPost('/player/auth/login').reply(400, { message: 'Invalid email or password.' });
    await expect(API.post('/player/auth/login', {})).rejects.toBeTruthy();
    expect(clearAuth).not.toHaveBeenCalled();
    expect(onUnauth).not.toHaveBeenCalled();
  });

  it('signs out when change-password answers 401, which means the token expired', async () => {
    mock.onPost('/player/auth/change-password').reply(401);
    await expect(API.post('/player/auth/change-password', {})).rejects.toBeTruthy();
    expect(clearAuth).toHaveBeenCalledTimes(1);
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });

  it('signs out on a 401 from any other route', async () => {
    mock.onGet('/player/auth/profile').reply(401);
    await expect(API.get('/player/auth/profile')).rejects.toBeTruthy();
    expect(clearAuth).toHaveBeenCalledTimes(1);
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });
});
