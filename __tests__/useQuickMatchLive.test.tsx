import { renderHook, act, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { socket } from '@/lib/socket';
import { useQuickMatch } from '@/lib/useQuickMatch';

// Same headless stand-in as useQuickCricket.test.tsx: focus degrades to mount.
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));

// The socket is the network edge — a registry that lets the test play the
// server's part, as in useAuctionSocket.test.tsx.
jest.mock('@/lib/socket', () => {
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  return {
    acquireSocket: jest.fn(), releaseSocket: jest.fn(),
    socket: {
      connected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn((e: string, fn: (...a: unknown[]) => void) => { (handlers[e] ||= []).push(fn); }),
      off: jest.fn((e: string, fn: (...a: unknown[]) => void) => {
        handlers[e] = (handlers[e] || []).filter((h) => h !== fn);
      }),
      __emit: (e: string, payload?: unknown) => (handlers[e] || []).forEach((h) => h(payload)),
    },
  };
});
const server = socket as unknown as { __emit: (e: string, payload?: unknown) => void; emit: jest.Mock };

const mock = new MockAdapter(API);
const envelope = (payload: unknown) => ({ data: { data: payload } });

const match = (over: Record<string, unknown> = {}) => ({
  _id: 'm1', hostId: 'h1', sport: 'badminton', joinCode: 'ABC234', status: 'live',
  sides: [
    { sideId: 's1', name: 'Arjun', slots: [{ slotId: 'a1', playerId: 'h1', displayName: 'Arjun' }] },
    { sideId: 's2', name: 'Rahul', slots: [{ slotId: 'b1', playerId: 'p2', displayName: 'Rahul' }] },
  ],
  gameScores: [{ gameNumber: 1, side1Score: 0, side2Score: 0 }],
  matchConfig: { bestOf: 3, pointsToWin: 21 },
  createdAt: '2026-10-06T00:00:00.000Z',
  ...over,
});

/** What the server pushes: the saved match, join code stripped. */
function pushed(over: Record<string, unknown>) {
  const { joinCode: _stripped, ...rest } = match(over);
  return { match: rest };
}

async function opened() {
  mock.onGet('/quick-match/m1').reply(200, envelope(match()));
  const hook = renderHook(() => useQuickMatch('m1'));
  await waitFor(() => expect(hook.result.current.match).not.toBeNull());
  return hook;
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => mock.reset());

describe('useQuickMatch — live updates', () => {
  it('shows a point scored on the host’s phone without a refresh', async () => {
    const { result } = await opened();

    act(() => server.__emit('quick:update', pushed({ gameScores: [{ gameNumber: 1, side1Score: 1, side2Score: 0 }] })));

    expect(result.current.match?.gameScores?.[0].side1Score).toBe(1);
  });

  it('keeps the host’s join code, which a pushed update never carries', async () => {
    const { result } = await opened();

    act(() => server.__emit('quick:update', pushed({ status: 'cancelled' })));

    expect(result.current.match?.status).toBe('cancelled');
    expect(result.current.match?.joinCode).toBe('ABC234');
  });

  it('ignores an update for a different match', async () => {
    const { result } = await opened();

    act(() => server.__emit('quick:update', pushed({ _id: 'other', status: 'cancelled' })));

    expect(result.current.match?.status).toBe('live');
  });

  it('joins the match room on open and leaves it on close', async () => {
    const { unmount } = await opened();
    expect(server.emit).toHaveBeenCalledWith('join:match', { matchId: 'm1' });

    unmount();
    expect(server.emit).toHaveBeenCalledWith('leave:match', { matchId: 'm1' });
  });

  // Anything pushed while the connection was down is gone for good, so a
  // reconnect must re-join the room and re-read the match.
  it('re-joins and re-reads after a dropped connection', async () => {
    const { result } = await opened();
    server.emit.mockClear();
    mock.onGet('/quick-match/m1').reply(200, envelope(match({ gameScores: [{ gameNumber: 1, side1Score: 7, side2Score: 4 }] })));

    act(() => server.__emit('connect'));

    expect(server.emit).toHaveBeenCalledWith('join:match', { matchId: 'm1' });
    await waitFor(() => expect(result.current.match?.gameScores?.[0].side1Score).toBe(7));
  });
});

describe('useQuickMatch — start', () => {
  it('starts the match and adopts the live match the server returns', async () => {
    mock.onGet('/quick-match/m1').reply(200, envelope(match({ status: 'waiting' })));
    mock.onPost('/quick-match/m1/start').reply(200, envelope(match({ status: 'live' })));
    const { result } = renderHook(() => useQuickMatch('m1'));
    await waitFor(() => expect(result.current.match?.status).toBe('waiting'));

    await act(async () => { await result.current.start(); });

    expect(mock.history.post.map((r) => r.url)).toEqual(['/quick-match/m1/start']);
    expect(result.current.match?.status).toBe('live');
  });
});
