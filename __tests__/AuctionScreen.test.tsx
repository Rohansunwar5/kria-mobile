import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { colors } from '@/constants/theme';
import Auction from '../src/app/auction/[tournamentId]/[categoryId]';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ tournamentId: 't1', categoryId: 'c1' }),
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children, useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

let mockSock: Record<string, unknown> = {};
jest.mock('@/lib/useAuctionSocket', () => ({ useAuctionSocket: () => mockSock }));
let mockMine: unknown[] = [];
jest.mock('@/lib/useTournament', () => ({
  useTournament: () => ({ data: { tournament: { _id: 't1', name: 'Arohance Open' }, categories: [], mine: mockMine }, loading: false, error: false }),
}));
jest.mock('@/api/tournaments', () => ({ getTournamentTeams: () => Promise.resolve([{ _id: 'tm1', name: 'Sunrise' }]) }));

const team = (id: string, name: string, budget: number) => ({ _id: id, name, budget, initialBudget: 100000, playersCount: 3, totalSpent: 100000 - budget });
const auction = (over: Record<string, unknown> = {}, liveBid: Record<string, unknown> = {}) => ({
  _id: 'a1', status: 'in_progress', currentPlayerIndex: 17, totalPlayers: 32, logsCount: 0, unsoldCount: 3, rotationCount: 0,
  settings: { minBidIncrement: 500, bidDurationSeconds: 30, hardLimit: 0 },
  liveBid: {
    currentPrice: 13000, highestBidderId: 'tm1', highestBidderName: 'Sunrise',
    bidHistory: [{ teamId: 'tm1', teamName: 'Sunrise', amount: 13000, timestamp: '2026-10-20T06:00:00Z' }],
    tiedTeams: [], tieBreakerActive: false, spinWinnerId: null, spinStartedAt: null, ...liveBid,
  },
  ...over,
});
const status = (a = auction()) => ({
  auction: a,
  currentPlayer: { _id: 'r9', profile: { firstName: 'Rohit', lastName: 'Kulkarni', age: 29, gender: 'male', skillLevel: 'advanced' }, auctionData: { basePrice: 2000 } },
  teams: [team('tm1', 'Sunrise', 18500), team('tm2', 'Titans', 9000)],
  category: { _id: 'c1', name: "Men's Singles" },
});
const sock = (over: Record<string, unknown> = {}) => ({ data: status(), soldLog: [], preAssigned: [], totalRevenue: 0, loading: false, error: null, connected: true, lastUpdate: 0, reload: jest.fn(), ...over });

beforeEach(() => { mockPush.mockClear(); mockMine = []; mockSock = sock(); });

describe('2c Auction', () => {
  it('not started shows the empty state', () => {
    mockSock = sock({ data: null, error: 'Auction unavailable' });
    render(<Auction />);
    expect(screen.getByText("The auction hasn't started")).toBeTruthy();
  });

  it('loading shows skeletons, not the empty state', () => {
    mockSock = sock({ data: null, loading: true });
    render(<Auction />);
    expect(screen.queryByText("The auction hasn't started")).toBeNull();
  });

  it('live shows sub-line, pill, block, bid, bids, purses', () => {
    render(<Auction />);
    expect(screen.getByText('Player 18 of 32 · 3 unsold')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Rohit Kulkarni')).toBeTruthy();
    expect(screen.getAllByText('₹13,000').length).toBe(2); // card + newest bid row
    expect(screen.getByText('Bids · min raise ₹500')).toBeTruthy();
    expect(screen.getByText('₹18,500')).toBeTruthy();
  });

  it('no bids yet shows the base', () => {
    mockSock = sock({ data: status(auction({}, { currentPrice: 0, highestBidderId: '', bidHistory: [] })) });
    render(<Auction />);
    expect(screen.getByText('No bids yet · base ₹2,000')).toBeTruthy();
  });

  it('tie-breaker shows the pill and the line', () => {
    mockSock = sock({ data: status(auction({}, { tieBreakerActive: true, tiedTeams: ['tm1', 'tm2'] })) });
    render(<Auction />);
    expect(screen.getByText('Tie-breaker')).toBeTruthy();
    expect(screen.getByText('Tied between Sunrise and Titans. The organiser breaks the tie.')).toBeTruthy();
  });

  it('your result is pinned when you were sold', async () => {
    mockMine = [{ _id: 'e1', categoryId: 'c1', tournamentId: 't1', status: 'auctioned', teamId: 'tm1', auctionData: { soldPrice: 16500 } }];
    render(<Auction />);
    fireEvent.press(await screen.findByText('You went to Sunrise'));
    expect(screen.getByText('Sold for ₹16,500')).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/tournament/[id]/teams', params: { id: 't1', team: 'tm1' } });
  });

  it('a dropped connection says so', () => {
    mockSock = sock({ connected: false });
    render(<Auction />);
    expect(screen.getByText('Reconnecting. Showing the last update.')).toBeTruthy();
  });

  it('finished shows the summary (after preview)', () => {
    mockSock = sock({
      data: status(auction({ status: 'completed' })),
      soldLog: [
        { _id: 's1', registrationId: 'r1', playerName: 'Player D', teamId: 'tm1', teamName: 'Sunrise', finalPrice: 13000, timestamp: '2026-10-20T06:00:00Z' },
        { _id: 's2', registrationId: 'r2', playerName: 'Player E', teamId: 'tm2', teamName: 'Titans', finalPrice: 14000, timestamp: '2026-10-20T06:05:00Z' },
      ],
      preAssigned: [{ registrationId: 'r3', playerName: 'Player F', teamId: 'tm1', teamName: 'Sunrise', role: 'captain' }],
      totalRevenue: 27000,
    });
    render(<Auction />);
    expect(screen.getByText('Auction finished')).toBeTruthy();
    expect(screen.getByText('Finished')).toBeTruthy();
    expect(screen.getByText('2 sold · ₹27,000 across 2 teams')).toBeTruthy();
    expect(screen.getByText('Captain')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('→ Titans')).toBeTruthy();
  });

  // An absolute pill ignores the SafeAreaView's top padding and lands on the status bar.
  it('the pill sits in the header row, not absolutely', () => {
    render(<Auction />);
    expect(StyleSheet.flatten(screen.getByTestId('auction-pill').props.style).position).not.toBe('absolute');
  });

  it('the pill dot is accent only while live', () => {
    const dot = () => StyleSheet.flatten((screen.getByTestId('auction-pill').children[0] as ReactTestInstance).props.style).backgroundColor;
    const cases: [Record<string, unknown>, Record<string, unknown>, string][] = [
      [{}, {}, colors.accent],
      [{ status: 'sold' }, {}, colors.accent],
      [{ status: 'paused' }, {}, colors.text2],
      [{}, { tieBreakerActive: true, tiedTeams: ['tm1', 'tm2'] }, colors.text2],
      [{ status: 'completed' }, {}, colors.text3],
    ];
    for (const [a, bid, colour] of cases) {
      mockSock = sock({ data: status(auction(a, bid)) });
      const r = render(<Auction />);
      expect(dot()).toBe(colour);
      r.unmount();
    }
  });

  it('has no spin wheel', () => {
    render(<Auction />);
    expect(screen.queryByTestId('spin-wheel')).toBeNull();
  });
});
