import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import { getNotifications, markNotificationsRead, type AppNotification } from '@/api/notifications';
import { askPushPermission, canAskAgain, pushPermission, registerPushToken } from '@/lib/push';
import NotificationsScreen from '../src/app/notifications';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: jest.requireActual('react').useEffect,
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), back: () => mockBack(), canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock('@/api/notifications', () => ({ getNotifications: jest.fn(), markNotificationsRead: jest.fn() }));
jest.mock('@/lib/push', () => ({ pushPermission: jest.fn(), canAskAgain: jest.fn(), askPushPermission: jest.fn(), registerPushToken: jest.fn() }));

const get = getNotifications as jest.Mock;
const mark = markNotificationsRead as jest.Mock;
const permission = pushPermission as jest.Mock;
const askAgain = canAskAgain as jest.Mock;
const ask = askPushPermission as jest.Mock;
const register = registerPushToken as jest.Mock;

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const row = (id: string, minutesAgo: number, over: Partial<AppNotification> = {}): AppNotification => ({
  _id: id, kind: 'match_starting', title: `Title ${id}`, detail: `Detail ${id}`, context: `Context ${id}`,
  target: { path: '/live/[matchId]', params: { matchId: 'm1' } }, createdAt: ago(minutesAgo), ...over,
});
const USER = { _id: 'u1', firstName: 'Aarav', lastName: 'Menon', email: 'a@kria.club', phone: '9812345412', status: 'active' };
const renderScreen = () =>
  render(
    <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@init' }), user: USER } as never } })}>
      <NotificationsScreen />
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue({ notifications: [], seenAt: null });
  mark.mockResolvedValue(undefined);
  permission.mockResolvedValue('granted');
  askAgain.mockResolvedValue(true);
  ask.mockResolvedValue(true);
  register.mockResolvedValue('tok');
});

describe('notifications screen', () => {
  it('shows New and Earlier, then marks read', async () => {
    get.mockResolvedValue({ notifications: [row('a', 5), row('b', 600)], seenAt: ago(60) });
    renderScreen();
    expect(await screen.findByText('Title a')).toBeTruthy();
    expect(screen.getByText('Detail a')).toBeTruthy();
    expect(screen.getByText(/^Context a · 5 min ago$/)).toBeTruthy();
    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.getByText('Earlier')).toBeTruthy();
    expect(screen.getAllByLabelText(/^Unread\. /)).toHaveLength(1);
    expect(screen.getByLabelText(/^Title b\. Detail b\. Context b/)).toBeTruthy();
    await waitFor(() => expect(mark).toHaveBeenCalledTimes(1));
    expect(mark).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-/));
    expect(get.mock.invocationCallOrder[0]).toBeLessThan(mark.mock.invocationCallOrder[0]);
  });

  it('a row opens its target', async () => {
    get.mockResolvedValue({ notifications: [row('a', 5)], seenAt: null });
    renderScreen();
    fireEvent.press(await screen.findByText('Title a'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/live/[matchId]', params: { matchId: 'm1' } });
  });

  it('Load more pages with before, and a short page hides it', async () => {
    const page = Array.from({ length: 30 }, (_, i) => row(`r${i}`, 10 + i));
    get.mockResolvedValueOnce({ notifications: page, seenAt: null }).mockResolvedValueOnce({ notifications: [row('last', 900)], seenAt: null });
    renderScreen();
    fireEvent.press(await screen.findByLabelText('Load more'));
    await waitFor(() => expect(get).toHaveBeenCalledWith(page[29].createdAt));
    expect(await screen.findByText('Title last')).toBeTruthy();
    expect(screen.queryByLabelText('Load more')).toBeNull();
  });

  it('a failed Load more says so, and Retry loads the page', async () => {
    const page = Array.from({ length: 30 }, (_, i) => row(`r${i}`, 10 + i));
    get.mockResolvedValueOnce({ notifications: page, seenAt: null }).mockRejectedValueOnce(new Error('offline'));
    renderScreen();
    fireEvent.press(await screen.findByLabelText('Load more'));
    expect(await screen.findByText("Couldn't load more notifications.")).toBeTruthy();
    expect(screen.getByText('Title r0')).toBeTruthy(); // what loaded stays

    get.mockResolvedValueOnce({ notifications: [row('last', 900)], seenAt: null });
    fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByText('Title last')).toBeTruthy();
    expect(screen.queryByText("Couldn't load more notifications.")).toBeNull();
    expect(get).toHaveBeenLastCalledWith(page[29].createdAt);
  });

  it('nothing yet', async () => {
    renderScreen();
    expect(await screen.findByText('Nothing yet')).toBeTruthy();
    expect(screen.getByText(/^Enter a tournament and you'll hear/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Find an event'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/events');
  });

  it('pushes off shows the bar, and Turn on asks', async () => {
    permission.mockResolvedValue('undetermined');
    ask.mockImplementation(async () => { permission.mockResolvedValue('granted'); return true; });
    renderScreen();
    expect(await screen.findByText("Notifications are off on this phone. You'll still find them here.")).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Turn on'));
    await waitFor(() => expect(register).toHaveBeenCalledWith('u1'));
    expect(ask).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByLabelText('Turn on')).toBeNull());
  });

  it('a refused ask registers nothing', async () => {
    permission.mockResolvedValue('undetermined');
    ask.mockResolvedValue(false);
    renderScreen();
    fireEvent.press(await screen.findByLabelText('Turn on'));
    await waitFor(() => expect(ask).toHaveBeenCalled());
    expect(register).not.toHaveBeenCalled();
  });

  it('when it cannot ask again, Turn on opens settings', async () => {
    permission.mockResolvedValue('denied');
    askAgain.mockResolvedValue(false);
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    renderScreen();
    fireEvent.press(await screen.findByLabelText('Turn on'));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(ask).not.toHaveBeenCalled();
  });

  it('granted shows no bar', async () => {
    renderScreen();
    await screen.findByText('Nothing yet');
    await act(async () => {});
    expect(screen.queryByText(/Notifications are off/)).toBeNull();
  });

  it('a permission lookup that throws shows the bar instead of breaking', async () => {
    permission.mockRejectedValue(new Error('expo go'));
    renderScreen();
    expect(await screen.findByLabelText('Turn on')).toBeTruthy();
  });

  it('a failed load says so and retries', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    renderScreen();
    expect(await screen.findByText("Couldn't load notifications.")).toBeTruthy();
    expect(mark).not.toHaveBeenCalled();
    get.mockResolvedValue({ notifications: [row('a', 5)], seenAt: null });
    fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByText('Title a')).toBeTruthy();
    expect(screen.queryByText("Couldn't load notifications.")).toBeNull();
  });
});
