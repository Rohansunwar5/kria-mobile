import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PlayerProfile from '../src/app/player/[playerId]';
import type { RecentMatch, SportSummary } from '@/api/career';
import type { PublicHistoryEntry, PublicPlayer } from '@/api/profileApi';

// Another player's profile: your own Profile's sections without the parts
// that are only yours (spec "Other players' profiles").

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { playerId: 'p1' };
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: (...a: unknown[]) => mockReplace(...a),
    back: () => mockBack(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: unknown) => unknown) => sel({ auth: { user: { _id: 'me' } } }),
}));
let mockPublic: { player: PublicPlayer; history: PublicHistoryEntry[] } | null = null;
jest.mock('@/api/profileApi', () => ({ getPublicPlayer: jest.fn(async () => mockPublic) }));
jest.mock('@/api/quickKnockout', () => ({ listMyQuickKnockouts: jest.fn(async () => []) }));
let mockRecent: RecentMatch[] = [];
jest.mock('@/api/career', () => ({ getRecentMatches: jest.fn(async () => mockRecent) }));
jest.mock('@/api/rankings', () => ({
  getTopPlayers: jest.fn(async () => [{ playerId: 'p1', firstName: 'Aisha', lastName: 'Rao', played: 31, decided: 31, won: 21, winRate: 21 / 31 }]),
}));
const mockUseCareer = jest.fn();
jest.mock('@/lib/useCareer', () => ({ useCareer: () => mockUseCareer() }));

const badminton: SportSummary = { sport: 'badminton', played: 31, decided: 31, won: 21, lost: 10, tied: 0, noResult: 0, winRate: 21 / 31 };
const career = (sports: SportSummary[]) => ({
  profile: { sports, bestSport: null, achievements: [] },
  recent: [], loading: false, error: false, recentError: false, reload: jest.fn(),
});
const entry = (i: number): PublicHistoryEntry => ({
  _id: `h${i}`, status: 'approved', createdAt: '2025-06-01T00:00:00.000Z',
  tournament: { _id: `t${i}`, name: `Cup ${i}`, sport: 'badminton', status: 'completed' },
  category: { _id: 'c', name: "Men's Singles" },
  team: null,
});
const player = (over: Partial<PublicPlayer> = {}): PublicPlayer => ({ _id: 'p1', firstName: 'Aisha', lastName: 'Rao', titles: [], honors: [], ...over });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { playerId: 'p1' };
  mockPublic = { player: player(), history: [1, 2, 3, 4, 5, 6].map(entry) };
  mockRecent = [{ _id: 'r1', matchId: 'm1', sport: 'badminton', context: 'quick', result: 'won', playedAt: '2026-10-19T10:00:00Z', title: 'Aisha vs Dev' }];
  mockUseCareer.mockReturnValue(career([badminton]));
});

it('shows their name, their rank, and Matches, Wins and Tournaments from their history', async () => {
  render(<PlayerProfile />);
  expect(await screen.findByText('Aisha\nRao')).toBeTruthy();
  expect(screen.getByText('Matches')).toBeTruthy();
  expect(screen.getAllByText('Wins').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Tournaments')).toHaveLength(2); // the strip's label and the section
  expect(screen.getByText('6')).toBeTruthy(); // six history entries
  await waitFor(() => expect(screen.getByText('#1')).toBeTruthy());
});

it('has none of your own controls', async () => {
  render(<PlayerProfile />);
  await screen.findByText('Aisha\nRao');
  expect(screen.queryByLabelText('Settings')).toBeNull();
  expect(screen.queryByLabelText('Edit profile')).toBeNull();
  expect(screen.queryByText('Account')).toBeNull();
  expect(screen.queryByText('Complete your profile')).toBeNull();
  expect(screen.queryByLabelText(/profile photo/i)).toBeNull();
});

it('opens every honour in a sheet from "+2 more", and a badge there shows its detail', async () => {
  const h = (badge: string, title: string) => ({ badge, title });
  mockPublic = {
    player: player({ honors: [h('player-of-the-match', 'Player of the Match'), h('season-mvp', 'Season MVP'), h('hat-trick', 'Hat-Trick'), h('fair-play', 'Fair Play'), h('first-cap', 'First Cap')] }),
    history: [],
  };
  render(<PlayerProfile />);
  fireEvent.press(await screen.findByText('+2 more'));
  expect(screen.getByText('Honours and titles')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Season MVP, Given by an organiser'));
  expect(screen.getByText('Organiser honour')).toBeTruthy();
  fireEvent.press(screen.getByText('Done')); // back to the grid
  expect(screen.getByText('Honours and titles')).toBeTruthy();
});

it('a badge under the name opens its detail in place', async () => {
  mockPublic = { player: player({ honors: [{ badge: 'season-mvp', title: 'Season MVP' }] }), history: [] };
  render(<PlayerProfile />);
  fireEvent.press(await screen.findByLabelText('Season MVP'));
  expect(screen.getByText('Organiser honour')).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
});

it('lists every tournament with no All link, and a row opens it', async () => {
  render(<PlayerProfile />);
  expect(await screen.findAllByText(/^Cup \d$/)).toHaveLength(6);
  expect(screen.queryByText('All')).toBeNull();
  fireEvent.press(screen.getByText('Cup 1'));
  expect(mockPush).toHaveBeenCalledWith('/tournament/t1');
});

it('All matches opens their matches with their name', async () => {
  render(<PlayerProfile />);
  fireEvent.press(await screen.findByText('All matches'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/matches/[playerId]', params: { playerId: 'p1', name: 'Aisha Rao' } });
});

it('sends you to your own Profile tab for your own id', async () => {
  mockParams = { playerId: 'me' };
  render(<PlayerProfile />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/profile'));
});

it('says so when the player is missing, with Back', async () => {
  mockPublic = null;
  render(<PlayerProfile />);
  expect(await screen.findByText('Player not found')).toBeTruthy();
  expect(screen.getByText("This profile isn't available.")).toBeTruthy();
  fireEvent.press(screen.getByText('Back'));
  expect(mockBack).toHaveBeenCalled();
});

it('Try again re-fetches after a failed load and shows the profile', async () => {
  const { getPublicPlayer } = jest.requireMock('@/api/profileApi');
  getPublicPlayer.mockResolvedValueOnce(null);
  render(<PlayerProfile />);
  expect(await screen.findByText('Player not found')).toBeTruthy();
  fireEvent.press(screen.getByText('Try again'));
  expect(await screen.findByText('Aisha\nRao')).toBeTruthy();
  expect(getPublicPlayer).toHaveBeenCalledTimes(2);
});

it('their ranking card speaks about them, not you', async () => {
  mockUseCareer.mockReturnValue(career([{ ...badminton, sport: 'cricket', played: 3, decided: 3, won: 1, lost: 2, winRate: 1 / 3 }]));
  render(<PlayerProfile />);
  fireEvent.press(await screen.findByLabelText('Cricket: 3/5'));
  const line = screen.getByText(/more and .* appear on the cricket board/);
  expect(line.props.children).toBe('3 of 5 decided matches. 2 more and they appear on the cricket board.');
  expect(line.props.children).not.toMatch(/\byou/i);
});

it('a player with no matches, honours or history still renders', async () => {
  mockPublic = { player: player(), history: [] };
  mockRecent = [];
  mockUseCareer.mockReturnValue(career([]));
  render(<PlayerProfile />);
  expect(await screen.findByText('No matches on record yet.')).toBeTruthy();
  expect(screen.getByText('Aisha\nRao')).toBeTruthy();
  expect(screen.queryByText(/^Cup \d$/)).toBeNull();
});
