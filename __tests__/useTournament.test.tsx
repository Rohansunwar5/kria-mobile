import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import { useTournament } from '@/lib/useTournament';
import { getTournament, getTournamentCategories, getMyEntries } from '@/api/tournaments';

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
}));
jest.mock('@/api/tournaments', () => ({
  getTournament: jest.fn(), getTournamentCategories: jest.fn(), getMyEntries: jest.fn(),
  getTournamentTeams: jest.fn(),
}));
jest.mock('@/api/profileApi', () => ({ listAnnouncements: jest.fn() }));
jest.mock('@/api/auction', () => ({ getAuctionStatus: jest.fn() }));
jest.mock('@/api/match', () => ({ getCategoryBracket: jest.fn() }));

const INIT = { type: '@@preload' };
const wrap = (user: unknown) => ({ children }: { children: React.ReactNode }) => (
  <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, INIT), user } as never } })}>
    {children}
  </Provider>
);
const t = { _id: 't1', name: 'Cup' };

beforeEach(() => {
  jest.clearAllMocks();
  (getTournament as jest.Mock).mockResolvedValue(t);
  (getTournamentCategories as jest.Mock).mockResolvedValue([]);
  (getMyEntries as jest.Mock).mockResolvedValue([{ _id: 'e1', tournamentId: 't1' }, { _id: 'e2', tournamentId: 't2' }]);
});

it('logged out it never asks for my entries', async () => {
  const { result } = renderHook(() => useTournament('t1'), { wrapper: wrap(null) });
  await waitFor(() => expect(result.current.data).not.toBeNull());
  expect(getMyEntries).not.toHaveBeenCalled();
  expect(result.current.data?.mine).toEqual([]);
});

it("logged in it keeps only this tournament's entries", async () => {
  const { result } = renderHook(() => useTournament('t1'), { wrapper: wrap({ _id: 'p1' }) });
  await waitFor(() => expect(result.current.data).not.toBeNull());
  expect(result.current.data?.mine.map((e) => e._id)).toEqual(['e1']);
});

it('a failed reload keeps the last data and flags the error', async () => {
  const { result } = renderHook(() => useTournament('t1'), { wrapper: wrap(null) });
  await waitFor(() => expect(result.current.data).not.toBeNull());
  (getTournament as jest.Mock).mockRejectedValue(new Error('down'));
  await act(async () => { result.current.reload(); });
  await waitFor(() => expect(result.current.error).toBe(true));
  expect(result.current.data?.tournament).toEqual(t);
  expect(result.current.loading).toBe(false);
});
