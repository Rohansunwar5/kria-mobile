import { renderHook, act, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { useQuickMatch } from '@/lib/useQuickMatch';

// `useQuickMatch` calls expo-router's `useFocusEffect`, which requires a real
// NavigationContainer — absent when rendering a bare hook with `renderHook`.
// No screen under test ever mounts `useQuickMatch` outside of one, so this
// mock exists only to let the hook run headless in this suite; it runs the
// same callback on mount instead, which is what "focus" degrades to here.
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

const mock = new MockAdapter(API);
const envelope = (payload: unknown) => ({ data: { data: payload } });

const match = (over: Record<string, unknown> = {}) => ({
  _id: 'm1', hostId: 'h1', sport: 'cricket', joinCode: 'ABC123', status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'a1', displayName: 'A1' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'b1', displayName: 'B1' }] },
  ],
  createdAt: '2026-09-10T00:00:00.000Z',
  cricketSetup: { toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] },
  ...over,
});

afterEach(() => mock.reset());

describe('useQuickMatch — cricket actions', () => {
  it('adopts the toss response without refetching', async () => {
    mock.onGet('/quick-match/m1').reply(200, envelope(match()));
    mock.onPost('/quick-match/m1/cricket/toss').reply(200, envelope(match({
      cricketSetup: { toss: { winnerTeamId: 's1', decision: 'bat', recorded: true }, lineupsSet: false, side1Lineup: [], side2Lineup: [] },
    })));

    const { result } = renderHook(() => useQuickMatch('m1'));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    const getsBefore = mock.history.get.length;

    await act(async () => { await result.current.toss({ winnerSideId: 's1', decision: 'bat' }); });

    expect(result.current.match?.cricketSetup?.toss.recorded).toBe(true);
    // Adopting its own response is the point — a refetch would show a stale
    // score for one render.
    expect(mock.history.get.length).toBe(getsBefore);
  });

  it('adopts the ball response', async () => {
    mock.onGet('/quick-match/m1').reply(200, envelope(match()));
    mock.onPost('/quick-match/m1/cricket/ball').reply(200, envelope(match({
      liveState: { runs: 4, wickets: 0, completedOvers: 0, ballsInCurrentOver: 1, currentInnings: 1, matchStatus: 'innings1' },
    })));

    const { result } = renderHook(() => useQuickMatch('m1'));
    await waitFor(() => expect(result.current.match).not.toBeNull());

    await act(async () => {
      await result.current.ball({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 4 });
    });

    expect(result.current.match?.liveState?.runs).toBe(4);
  });

  it('refetches when a cricket mutation is refused', async () => {
    mock.onGet('/quick-match/m1').reply(200, envelope(match()));
    mock.onPost('/quick-match/m1/cricket/ball').reply(400, { message: 'Record the toss before scoring.' });

    const { result } = renderHook(() => useQuickMatch('m1'));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    const getsBefore = mock.history.get.length;

    await act(async () => {
      await result.current.ball({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 1 });
    });

    // The screen must not keep showing state the server rejected.
    expect(mock.history.get.length).toBe(getsBefore + 1);
  });

  it('posts a lineup and an undo to their own routes', async () => {
    mock.onGet('/quick-match/m1').reply(200, envelope(match()));
    mock.onPost('/quick-match/m1/cricket/lineup').reply(200, envelope(match()));
    mock.onPost('/quick-match/m1/cricket/undo').reply(200, envelope(match()));

    const { result } = renderHook(() => useQuickMatch('m1'));
    await waitFor(() => expect(result.current.match).not.toBeNull());

    await act(async () => {
      await result.current.lineup({ sideId: 's1', players: [{ slotId: 'a1', name: 'A1' }] });
    });
    await act(async () => { await result.current.undoBall(); });

    expect(mock.history.post.map((p) => p.url)).toEqual([
      '/quick-match/m1/cricket/lineup',
      '/quick-match/m1/cricket/undo',
    ]);
  });
});
