import * as storage from '@/lib/storage';
import { getItem, setItem } from '@/lib/secureStore';

describe('storage', () => {
  beforeEach(async () => {
    await storage.clearAuth();
  });

  it('returns null for token when nothing stored', async () => {
    expect(await storage.getToken()).toBeNull();
  });

  it('persists and reads back token and role', async () => {
    await storage.setAuth('jwt-abc', 'player');
    expect(await storage.getToken()).toBe('jwt-abc');
    expect(await storage.getRole()).toBe('player');
  });

  it('clears token and role', async () => {
    await storage.setAuth('jwt-abc', 'player');
    await storage.clearAuth();
    expect(await storage.getToken()).toBeNull();
    expect(await storage.getRole()).toBeNull();
  });

  // The next account signed in on the same phone must not see these.
  it('clears recent searches with the session', async () => {
    await setItem(storage.RECENT_SEARCHES_KEY, JSON.stringify(['sunw']));
    await storage.clearAuth();
    expect(await getItem(storage.RECENT_SEARCHES_KEY)).toBeNull();
  });
});
