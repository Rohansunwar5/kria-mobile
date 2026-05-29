import * as storage from '@/lib/storage';

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
});
