import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { usePushOpen } from '@/lib/pushOpen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const onResponse = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const last = Notifications.getLastNotificationResponse as jest.Mock;
const clear = Notifications.clearLastNotificationResponse as jest.Mock;
const tap = (data: unknown, id = 'n1') => ({ notification: { request: { identifier: id, content: { data } } } });

beforeEach(() => { jest.clearAllMocks(); last.mockReturnValue(null); });

it('opens the target of a tapped push', async () => {
  renderHook(() => usePushOpen(true));
  act(() => onResponse.mock.calls[0][0](tap({ path: '/quick/[id]', params: { id: 'q1' } })));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/quick/[id]', params: { id: 'q1' } });
});

it('pushes nothing for an unknown path', () => {
  renderHook(() => usePushOpen(true));
  act(() => onResponse.mock.calls[0][0](tap({ path: '/admin', params: {} })));
  expect(mockPush).not.toHaveBeenCalled();
});

it('opens the launch push once, after the gate has routed', async () => {
  last.mockReturnValue(tap({ path: '/live/[matchId]', params: { matchId: 'm1' } }));
  const { rerender } = renderHook(({ routed }: { routed: boolean }) => usePushOpen(routed), { initialProps: { routed: false } });
  await act(async () => {});
  expect(mockPush).not.toHaveBeenCalled();
  rerender({ routed: true });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  rerender({ routed: false });
  rerender({ routed: true });
  await act(async () => {});
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it('does not open the same tap twice', () => {
  renderHook(() => usePushOpen(true));
  const r = tap({ path: '/quick/[id]', params: { id: 'q1' } });
  act(() => { onResponse.mock.calls[0][0](r); onResponse.mock.calls[0][0](r); });
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it('holds a launch push while the flag is false, then opens it once', async () => {
  last.mockReturnValue(tap({ path: '/live/[matchId]', params: { matchId: 'm1' } }));
  const { rerender } = renderHook(({ ok }: { ok: boolean }) => usePushOpen(ok), { initialProps: { ok: false } });
  await act(async () => {});
  expect(mockPush).not.toHaveBeenCalled();
  rerender({ ok: true });
  expect(mockPush).toHaveBeenCalledTimes(1);
  rerender({ ok: false });
  rerender({ ok: true });
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it('opens a live tap delivered while the flag was false', () => {
  const { rerender } = renderHook(({ ok }: { ok: boolean }) => usePushOpen(ok), { initialProps: { ok: false } });
  act(() => onResponse.mock.calls[0][0](tap({ path: '/quick/[id]', params: { id: 'q1' } })));
  expect(mockPush).not.toHaveBeenCalled();
  rerender({ ok: true });
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it('survives a throwing push', () => {
  mockPush.mockImplementationOnce(() => { throw new Error('x'); });
  renderHook(() => usePushOpen(true));
  expect(() => act(() => onResponse.mock.calls[0][0](tap({ path: '/quick/[id]', params: { id: 'q1' } })))).not.toThrow();
});

it('clears the launch response once it has been opened, so a later launch cannot reopen it', () => {
  last.mockReturnValue(tap({ path: '/live/[matchId]', params: { matchId: 'm1' } }));
  renderHook(() => usePushOpen(true));
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(clear).toHaveBeenCalled();
});
