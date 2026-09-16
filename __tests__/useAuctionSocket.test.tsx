import { renderHook, waitFor, act } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { useAuctionSocket } from '@/lib/useAuctionSocket';
import { socket } from '@/lib/socket';

jest.mock('@/lib/socket', () => {
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  return {
    socket: {
      connected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn((e: string, fn: (...a: unknown[]) => void) => { (handlers[e] ||= []).push(fn); }),
      off: jest.fn((e: string, fn: (...a: unknown[]) => void) => {
        handlers[e] = (handlers[e] || []).filter((h) => h !== fn);
      }),
      __emit: (e: string, payload: unknown) => (handlers[e] || []).forEach((h) => h(payload)),
    },
  };
});

const envelope = (payload: unknown) => ({ data: { data: payload } });

const statusWith = (logsCount: number) => ({
  auction: {
    _id: 'a1', status: 'in_progress', currentPlayerIndex: 0, totalPlayers: 4,
    logsCount, remainingCount: 3,
    liveBid: { currentPrice: 0, highestBidderId: '', highestBidderName: '', bidHistory: [], tiedTeams: [], tieBreakerActive: false, spinWinnerId: null, spinStartedAt: null },
    settings: { minBidIncrement: 100, bidDurationSeconds: 30, hardLimit: 0 },
    unsoldCount: 0, rotationCount: 0,
  },
  currentPlayer: null, teams: [], upcoming: [],
});

describe('useAuctionSocket', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); jest.clearAllMocks(); });
  afterEach(() => { mock.restore(); });

  it('pulls a fresh sold log when the socket says another player went under the hammer', async () => {
    // The socket payload carries logsCount but not the log itself. Without a
    // refetch the "sold so far" list silently freezes at whatever it held when
    // the screen opened — the bug this test exists to prevent.
    mock.onGet('/auction/t1/c1/status').reply(200, envelope(statusWith(0)));
    mock.onGet('/auction/t1/c1/sold-log').replyOnce(200, envelope({ logs: [], totalSold: 0, totalRevenue: 0, preAssigned: [] }));

    const { result } = renderHook(() => useAuctionSocket('t1', 'c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.soldLog).toHaveLength(0);

    mock.onGet('/auction/t1/c1/sold-log').reply(200, envelope({
      logs: [{ _id: 'l1', registrationId: 'r1', playerName: 'Sold Player', teamId: 'tm1', teamName: 'Titans', finalPrice: 4200, auctionType: 'manual', recordedBy: 'o1', timestamp: '2026-09-16T10:00:00.000Z' }],
      totalSold: 1, totalRevenue: 4200, preAssigned: [],
    }));

    act(() => {
      (socket as unknown as { __emit: (e: string, p: unknown) => void }).__emit('auction:update', statusWith(1));
    });

    await waitFor(() => expect(result.current.soldLog).toHaveLength(1));
    expect(result.current.soldLog[0].playerName).toBe('Sold Player');
  });

  it('exposes the pre-assigned captains and icons the sold-log endpoint returns', async () => {
    mock.onGet('/auction/t1/c1/status').reply(200, envelope(statusWith(0)));
    mock.onGet('/auction/t1/c1/sold-log').reply(200, envelope({
      logs: [], totalSold: 0, totalRevenue: 0,
      preAssigned: [{ registrationId: 'r9', playerName: 'Cap One', playerPhoto: null, teamId: 'tm1', teamName: 'Titans', role: 'captain' }],
    }));

    const { result } = renderHook(() => useAuctionSocket('t1', 'c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.preAssigned).toHaveLength(1));
    expect(result.current.preAssigned[0].role).toBe('captain');
  });

  it('does not refetch the sold log when only the bid price moved', async () => {
    mock.onGet('/auction/t1/c1/status').reply(200, envelope(statusWith(2)));
    mock.onGet('/auction/t1/c1/sold-log').reply(200, envelope({ logs: [], totalSold: 0, totalRevenue: 0, preAssigned: [] }));

    const { result } = renderHook(() => useAuctionSocket('t1', 'c1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = mock.history.get.filter((r) => r.url?.includes('sold-log')).length;

    const bumped = statusWith(2);
    bumped.auction.liveBid.currentPrice = 5000;
    act(() => {
      (socket as unknown as { __emit: (e: string, p: unknown) => void }).__emit('auction:update', bumped);
    });

    await waitFor(() => expect(result.current.data?.auction.liveBid.currentPrice).toBe(5000));
    expect(mock.history.get.filter((r) => r.url?.includes('sold-log')).length).toBe(before);
  });
});
