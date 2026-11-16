import { AppState } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { getUnreadCount } from '@/api/notifications';
import { useUnreadCount } from '@/lib/unreadBell';

jest.mock('expo-router', () => ({ useFocusEffect: jest.requireActual('react').useEffect }));
jest.mock('@/api/notifications', () => ({ getUnreadCount: jest.fn() }));

const get = getUnreadCount as jest.Mock;
const onReceived = Notifications.addNotificationReceivedListener as jest.Mock;

beforeEach(() => { jest.clearAllMocks(); get.mockResolvedValue(3); });

it('loads on focus, and again when a push arrives', async () => {
  const { result } = renderHook(() => useUnreadCount());
  await waitFor(() => expect(result.current.count).toBe(3));
  get.mockResolvedValue(4);
  await act(async () => { onReceived.mock.calls[0][0](); });
  await waitFor(() => expect(result.current.count).toBe(4));
});

it('unsubscribes on unmount', async () => {
  const remove = jest.fn();
  onReceived.mockReturnValueOnce({ remove });
  const { unmount } = renderHook(() => useUnreadCount());
  await waitFor(() => expect(get).toHaveBeenCalled());
  unmount();
  expect(remove).toHaveBeenCalled();
});

it('keeps the last count when the fetch fails', async () => {
  const { result } = renderHook(() => useUnreadCount());
  await waitFor(() => expect(result.current.count).toBe(3));
  get.mockRejectedValue(new Error('x'));
  await act(async () => { result.current.refresh(); });
  expect(result.current.count).toBe(3);
});

it('refreshes when the app returns to the foreground, and stops on unmount', async () => {
  const remove = jest.fn();
  let cb: (s: string) => void = () => {};
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, f: (s: string) => void) => { cb = f; return { remove }; }) as never);
  const { result, unmount } = renderHook(() => useUnreadCount());
  await waitFor(() => expect(result.current.count).toBe(3));
  get.mockResolvedValue(7);
  await act(async () => { cb('background'); });
  expect(result.current.count).toBe(3);
  await act(async () => { cb('active'); });
  await waitFor(() => expect(result.current.count).toBe(7));
  unmount();
  expect(remove).toHaveBeenCalled();
  spy.mockRestore();
});
