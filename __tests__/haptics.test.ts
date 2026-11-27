jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success' },
}));
import * as Haptics from 'expo-haptics';
import { haptics } from '@/lib/haptics';

test.each([
  ['point', 'impactAsync', 'light'],
  ['gameEnd', 'impactAsync', 'medium'],
  ['press', 'impactAsync', 'light'],
  ['loss', 'impactAsync', 'soft'],
  ['mint', 'impactAsync', 'medium'],
  ['tick', 'impactAsync', 'light'],
  ['win', 'notificationAsync', 'success'],
  ['award', 'notificationAsync', 'success'],
] as const)('%s calls %s(%s)', (fn, api, arg) => {
  haptics[fn]();
  const calls = { impactAsync: Haptics.impactAsync, notificationAsync: Haptics.notificationAsync };
  expect(calls[api]).toHaveBeenLastCalledWith(arg);
});

test('select calls selectionAsync', () => {
  haptics.select();
  expect(Haptics.selectionAsync).toHaveBeenCalled();
});

test('a failing haptic is swallowed', async () => {
  (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('no motor'));
  expect(() => haptics.point()).not.toThrow();
  await Promise.resolve();
});
