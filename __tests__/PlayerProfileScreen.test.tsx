import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import PlayerProfile from '../src/app/player/[playerId]';
import type { Achievement, RecentMatch, SportSummary } from '../src/api/career';
import type { PublicHistoryEntry } from '../src/api/profileApi';

// Another player's profile, redesigned with your own (docs/profile-redesign.html):
// the same player card, sports, trophy cabinet and history, without account
// rows or knockouts.

// No navigation container around a bare screen render, so params come from a
// stub and every push is a no-op.
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ playerId: 'p1' }),
  useRouter: () => ({ push: jest.fn() }),
  // A title renders a Badge, which pauses its halo off-screen.
  useIsFocused: () => true,
}));

// A `mock`-prefixed variable is allowed inside jest.mock's factory, which is
// what lets each test override the resolved player and history.
const mockGetPublicPlayer = jest.fn(async () => ({
  player: { _id: 'p1', firstName: 'Aisha', lastName: 'Rao', titles: ['Grand Slam Champion'], sport: 'badminton', location: 'Bangalore' },
  history: [] as PublicHistoryEntry[],
}));
jest.mock('../src/api/profileApi', () => ({
  getPublicPlayer: () => mockGetPublicPlayer(),
}));

const mockUseCareer = jest.fn();
jest.mock('../src/lib/useCareer', () => ({ useCareer: () => mockUseCareer() }));

const achievement = (over: Partial<Achievement> = {}): Achievement => ({
  id: 'matches-50',
  label: 'Play 50 matches',
  earned: false,
  progress: 0,
  target: 50,
  ...over,
});

const recentMatch = (over: Partial<RecentMatch> = {}): RecentMatch => ({
  _id: 'm1',
  matchId: 'x1',
  sport: 'badminton',
  context: 'quick',
  result: 'won',
  playedAt: '2026-01-01T00:00:00.000Z',
  title: 'Aisha vs Dev',
  ...over,
});

const badminton = (over: Partial<SportSummary> = {}): SportSummary => ({
  sport: 'badminton',
  played: 31,
  decided: 31,
  won: 21,
  lost: 10,
  tied: 0,
  noResult: 0,
  winRate: 21 / 31,
  ...over,
});

const historyEntry = (over: Partial<PublicHistoryEntry> = {}): PublicHistoryEntry => ({
  _id: 'h1',
  status: 'active',
  stats: { matchesPlayed: 9, matchesWon: 7 },
  createdAt: '2025-06-01T00:00:00.000Z',
  tournament: { _id: 't1', name: 'Kria Smash Cup', sport: 'badminton' },
  team: { _id: 'tm1', name: 'Koramangala Smashers', primaryColor: '#8B3FD1' },
  ...over,
});

/** Every string a Text node's `children` prop resolves to, concatenated. */
function flattenText(children: unknown): string {
  if (children == null) return '';
  if (Array.isArray(children)) return children.map(flattenText).join('');
  return String(children);
}

const careerState = (achievements: Achievement[], over: { bestSport?: SportSummary | null } = {}) => ({
  profile: { sports: [badminton()], bestSport: over.bestSport ?? null, achievements },
  recent: [recentMatch()],
  loading: false,
  error: false,
  recentError: false,
  reload: jest.fn(),
});

describe('player profile', () => {
  afterEach(() => {
    mockGetPublicPlayer.mockClear();
  });

  it('renders every section in order: player card, sports, trophy cabinet, history', async () => {
    mockUseCareer.mockReturnValue(careerState([achievement()]));
    const result = render(<PlayerProfile />);
    await result.findByText(/aisha rao/i);

    // `findAllByType` walks the rendered tree in document order, which is
    // render order for a screen with no absolute/z-index reordering.
    const texts = result.UNSAFE_root.findAllByType(Text).map((node) => flattenText(node.props.children));
    const order = ['Aisha Rao', 'By sport', 'Trophy cabinet', 'History'].map((marker) => texts.findIndex((t) => t === marker));
    for (const index of order) expect(index).toBeGreaterThan(-1);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
  });

  it('shows where they play and their numbers on the player card', async () => {
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, getByText, getByLabelText } = render(<PlayerProfile />);
    await findByText(/aisha rao/i);
    expect(getByText('Bangalore')).toBeTruthy();
    expect(getByLabelText('Played 31')).toBeTruthy();
    expect(getByLabelText('Win rate 68%')).toBeTruthy();
    // One title, and no tournaments in the history.
    expect(getByLabelText('Honours 1')).toBeTruthy();
    expect(getByLabelText('Events 0')).toBeTruthy();
  });

  it('puts their titles and milestones in the trophy cabinet', async () => {
    mockUseCareer.mockReturnValue(careerState([achievement()]));
    const { findByText, getByText, getByLabelText } = render(<PlayerProfile />);
    await findByText(/aisha rao/i);
    expect(getByText('Grand Slam Champion')).toBeTruthy();
    expect(getByLabelText(/play 50 matches, 0 of 50 — locked/i)).toBeTruthy();
  });

  it('leaves the trophy cabinet out when there is nothing to show, and keeps the rest', async () => {
    mockGetPublicPlayer.mockResolvedValueOnce({
      player: { _id: 'p1', firstName: 'Aisha', lastName: 'Rao', titles: [], sport: 'badminton', location: 'Bangalore' },
      history: [],
    });
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, queryByText, getByText } = render(<PlayerProfile />);
    await findByText(/aisha rao/i);
    expect(queryByText(/^trophy cabinet$/i)).toBeNull();
    expect(getByText(/^by sport$/i)).toBeTruthy();
    expect(getByText(/^history$/i)).toBeTruthy();
  });

  it('marks a best sport only when the server names one', async () => {
    mockUseCareer.mockReturnValue(careerState([], { bestSport: badminton() }));
    const named = render(<PlayerProfile />);
    await named.findByText(/aisha rao/i);
    expect(named.getByText('Best')).toBeTruthy();
    named.unmount();

    mockUseCareer.mockReturnValue(careerState([], { bestSport: null }));
    const unnamed = render(<PlayerProfile />);
    await unnamed.findByText(/aisha rao/i);
    expect(unnamed.queryByText('Best')).toBeNull();
  });

  it('opens the history on their latest results', async () => {
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, getByText } = render(<PlayerProfile />);
    await findByText(/aisha rao/i);
    expect(getByText('Aisha vs Dev')).toBeTruthy();
  });

  it('says so when they have no teams yet', async () => {
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, getByLabelText, getByText } = render(<PlayerProfile />);
    await findByText(/aisha rao/i);
    fireEvent.press(getByLabelText('Teams'));
    expect(getByText(/no events yet/i)).toBeTruthy();
  });

  // The public payload never carries the auction price.
  it('shows their teams without a sold price', async () => {
    mockGetPublicPlayer.mockResolvedValueOnce({
      player: { _id: 'p1', firstName: 'Aisha', lastName: 'Rao', titles: [], sport: 'badminton', location: 'Bangalore' },
      history: [historyEntry()],
    });
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, getByLabelText, getByText, queryByText } = render(<PlayerProfile />);
    await findByText(/aisha rao/i);
    fireEvent.press(getByLabelText('Teams'));
    expect(getByText(/koramangala smashers/i)).toBeTruthy();
    expect(queryByText(/sold for/i)).toBeNull();
  });

  it('has no account rows, no settings and no knockouts on another player’s profile', async () => {
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, queryByLabelText } = render(<PlayerProfile />);
    await findByText(/aisha rao/i);
    expect(queryByLabelText('Log out')).toBeNull();
    expect(queryByLabelText('Open settings')).toBeNull();
    expect(queryByLabelText('Knockouts')).toBeNull();
  });
});
