import { fireEvent, render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import LiveNow from '../src/app/live/index';
import type { FeedRow } from '@/lib/liveFeedView';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => undefined,
}));
let mockLive: Record<string, unknown> = {};
jest.mock('@/lib/useLiveNow', () => ({ useLiveNow: () => mockLive }));

const t: FeedRow = { key: 'tournament-m1', kind: 'tournament', matchId: 'm1', sport: 'badminton', meta: 'Arohance · Quarter-final', sides: ['Rohit', 'Karthik'], badminton: { games: [{ a: 18, b: 21 }, { a: 11, b: 7 }] }, sub: 'Game 2' };
const q: FeedRow = { key: 'quick-q1', kind: 'quick', matchId: 'q1', sport: 'cricket', meta: 'Cricket', sides: ['Sunday XI', 'Office'], scoreline: '64/3 (5.2)' };
const INIT = { type: '@@preload' };
const renderIt = (user: unknown) =>
  render(
    <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, INIT), user } as never } })}>
      <LiveNow />
    </Provider>,
  );
const set = (o: object) => { mockLive = { tournament: [], quick: [], count: 0, loading: false, error: false, refresh: jest.fn(), ...o }; };

beforeEach(() => mockPush.mockClear());

it('shows sections, count and routes rows', () => {
  set({ tournament: [t], quick: [q], count: 2 });
  renderIt({ _id: 'p1' });
  expect(screen.getByText('Tournaments')).toBeTruthy();
  expect(screen.getByText('Quick matches')).toBeTruthy();
  expect(screen.getByText('2 matches')).toBeTruthy();
  fireEvent.press(screen.getByText('Rohit'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/live/[matchId]', params: { matchId: 'm1' } });
  fireEvent.press(screen.getByText('Sunday XI vs Office'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/quick/[id]', params: { id: 'q1' } });
});

it('logged-out quick row goes to login', () => {
  set({ quick: [q], count: 1 });
  renderIt(null);
  fireEvent.press(screen.getByText('Sunday XI vs Office'));
  expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
});

it('empty state', () => {
  set({});
  renderIt(null);
  expect(screen.getByText('Nothing live right now')).toBeTruthy();
});

it('error retries', () => {
  const refresh = jest.fn();
  set({ error: true, refresh });
  renderIt(null);
  fireEvent.press(screen.getByText('Retry'));
  expect(refresh).toHaveBeenCalled();
});
