import * as Notifications from 'expo-notifications';
import { registerPushToken, unregisterPushToken } from '@/lib/push';
import { savePushToken, releasePushToken } from '@/api/notifications';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: '6e2afcc6-b326-4ce8-80e4-b99e314160f7' } } } } }));
jest.mock('@/api/notifications', () => ({
  savePushToken: jest.fn(async () => {}),
  releasePushToken: jest.fn(async () => {}),
}));

const N = Notifications as jest.Mocked<typeof Notifications>;
const perm = (status: string, canAskAgain = true) => ({ status, canAskAgain }) as never;

beforeEach(async () => {
  await unregisterPushToken(); // clear the module's saved token
  jest.clearAllMocks();
  N.getPermissionsAsync.mockResolvedValue(perm('granted'));
  N.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[x]', type: 'expo' } as never);
});

describe('registerPushToken', () => {
  it('saves the Expo token when allowed', async () => {
    expect(await registerPushToken('p1')).toBe('ExponentPushToken[x]');
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({ name: expect.any(String), importance: 6 }));
    expect(N.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: '6e2afcc6-b326-4ce8-80e4-b99e314160f7' });
    expect(savePushToken).toHaveBeenCalledWith('ExponentPushToken[x]');
  });

  it('does not save again once registered', async () => {
    await registerPushToken('p1');
    expect(await registerPushToken('p1')).toBe('ExponentPushToken[x]');
    expect(savePushToken).toHaveBeenCalledTimes(1);
  });

  it('saves again when a different player signs in', async () => {
    await registerPushToken('p1');
    await registerPushToken('p2');
    expect(savePushToken).toHaveBeenCalledTimes(2);
  });

  it("returns null when the token can't be had", async () => {
    N.getExpoPushTokenAsync.mockRejectedValue(new Error('Expo Go'));
    expect(await registerPushToken('p1')).toBeNull();
    expect(savePushToken).not.toHaveBeenCalled();
  });

  it('asks nothing and saves nothing without permission', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm('undetermined'));
    expect(await registerPushToken('p1')).toBeNull();
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(savePushToken).not.toHaveBeenCalled();
  });
});

describe('unregisterPushToken', () => {
  it('removes the saved token, and swallows a failure', async () => {
    await registerPushToken('p1');
    (releasePushToken as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(unregisterPushToken()).resolves.toBeUndefined();
    expect(releasePushToken).toHaveBeenCalledWith('ExponentPushToken[x]');
  });

  it('with no saved token, fetches this device token and removes it', async () => {
    await unregisterPushToken();
    expect(N.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: '6e2afcc6-b326-4ce8-80e4-b99e314160f7' });
    expect(releasePushToken).toHaveBeenCalledWith('ExponentPushToken[x]');
  });

  it('with no saved token and no permission, removes nothing', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm('denied'));
    await unregisterPushToken();
    expect(releasePushToken).not.toHaveBeenCalled();
  });

  it('with no saved token, swallows a token failure', async () => {
    N.getExpoPushTokenAsync.mockRejectedValueOnce(new Error('x'));
    await expect(unregisterPushToken()).resolves.toBeUndefined();
  });
});
