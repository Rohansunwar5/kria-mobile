import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import PlayerProfile from '../src/app/player/[playerId]';
import type { Achievement, RecentMatch, SportSummary } from '../src/api/career';
import type { PublicHistoryEntry } from '../src/api/profileApi';

// Same shape as HomeScreen.test.tsx / EventsPortal.test.tsx: there is no
// navigation container around a bare screen render, so params come from a
// stub and every push is a no-op.
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ playerId: 'p1' }),
  useRouter: () => ({ push: jest.fn() }),
}));

// A `mock`-prefixed variable is allowed inside jest.mock's factory (babel-jest-hoist),
// which is what lets each test below override the resolved player/history per call —
// the fixed inline mock this file used to have could never vary `history`.
const mockGetPublicPlayer = jest.fn(async () => ({
  player: { _id: 'p1', firstName: 'Aisha', lastName: 'Rao', titles: ['Grand Slam Champion'], sport: 'badminton' },
  history: [] as PublicHistoryEntry[],
}));
jest.mock('../src/api/profileApi', () => ({
  getPublicPlayer: () => mockGetPublicPlayer(),
}));

// Mirrors HomeScreen.test.tsx's `useCareer` mock, but overridable per test —
// this screen is exactly what decides whether `Achievements` renders at all.
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
  ...over,
});

const bestSport = (over: Partial<SportSummary> = {}): SportSummary => ({
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
  profile: { sports: [], bestSport: over.bestSport ?? null, achievements },
  recent: [recentMatch()],
  loading: false,
  error: false,
  recentError: false,
  reload: jest.fn(),
});

describe('player profile: achievements placement', () => {
  it('renders the achievements block when the server sends some, alongside the rest of the profile', async () => {
    mockUseCareer.mockReturnValue(careerState([achievement()]));
    const { findByText, getByText, getAllByText } = render(<PlayerProfile />);

    await findByText(/aisha rao/i);
    expect(getByText(/^achievements$/i)).toBeTruthy();
    // Once as the badge label, once more in the "Next" progress row.
    expect(getAllByText(/play 50 matches/i).length).toBeGreaterThan(0);

    // The surrounding screen — career card, recent matches, titles — is
    // still there; this block only adds to it.
    expect(getByText(/career by sport/i)).toBeTruthy();
    expect(getByText(/recent matches/i)).toBeTruthy();
    expect(getByText(/grand slam champion/i)).toBeTruthy();
  });

  it('renders nothing for achievements when the list is empty, leaving the rest of the profile unaffected', async () => {
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, queryByText, getByText } = render(<PlayerProfile />);

    await findByText(/aisha rao/i);
    expect(queryByText(/^achievements$/i)).toBeNull();

    // Same invariant as above: career card, recent matches and titles render
    // whether or not Achievements has anything to show.
    expect(getByText(/career by sport/i)).toBeTruthy();
    expect(getByText(/recent matches/i)).toBeTruthy();
    expect(getByText(/grand slam champion/i)).toBeTruthy();
  });
});

// Task 5: the screen assembles the restyled pieces into the artboard's order
// (identity → best-sport hero → career table → achievements → titles →
// played-for) while keeping the recent-matches feed the artboard doesn't
// depict, and keeps rendering at the two edges the artboard doesn't show —
// no bestSport, and no history.
describe('player profile: section assembly', () => {
  afterEach(() => {
    mockGetPublicPlayer.mockClear();
  });

  it('renders every section in the artboard order, with the recent-matches feed kept alongside them', async () => {
    mockUseCareer.mockReturnValue(careerState([achievement()], { bestSport: bestSport() }));
    const result = render(<PlayerProfile />);
    const { findByText, getByText } = result;

    await findByText(/aisha rao/i);

    // `findAllByType` walks the rendered tree in document order, which is
    // exactly render order for a screen with no absolute/z-index reordering.
    const texts = result.UNSAFE_root.findAllByType(Text).map((node) => flattenText(node.props.children));
    // Each marker is a section's own heading/kicker text — distinct enough
    // not to collide with a figure or row inside a different section.
    const order = ['Aisha Rao', 'Best sport', 'Career by sport', 'Achievements', 'Recent matches', 'Titles', 'Played for'].map((marker) =>
      texts.findIndex((t) => t.includes(marker))
    );

    for (const index of order) expect(index).toBeGreaterThan(-1);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);

    // Sanity: the labels above are reachable through the real queries too,
    // not just present somewhere in the serialised tree.
    expect(getByText(/^achievements$/i)).toBeTruthy();
    expect(getByText(/^titles$/i)).toBeTruthy();
    expect(getByText(/^played for$/i)).toBeTruthy();
  });

  it('renders with no best-sport hero when the server has not named a best sport yet, leaving the rest of the profile intact', async () => {
    mockUseCareer.mockReturnValue(careerState([], { bestSport: null }));
    const { findByText, queryByText, getByText } = render(<PlayerProfile />);

    await findByText(/aisha rao/i);
    // The hero's own kicker text; CareerCard's own "Best sport" badge is also
    // absent here since it renders off the same null field.
    expect(queryByText(/best sport/i)).toBeNull();

    expect(getByText(/career by sport/i)).toBeTruthy();
    expect(getByText(/recent matches/i)).toBeTruthy();
    expect(getByText(/^titles$/i)).toBeTruthy();
    expect(getByText(/^played for$/i)).toBeTruthy();
  });

  it('keeps the existing empty state when history is empty, and still renders the recent-matches feed', async () => {
    mockGetPublicPlayer.mockResolvedValueOnce({
      player: { _id: 'p1', firstName: 'Aisha', lastName: 'Rao', titles: [], sport: 'badminton' },
      history: [],
    });
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, getByText, queryByText } = render(<PlayerProfile />);

    await findByText(/aisha rao/i);
    expect(getByText(/no events yet/i)).toBeTruthy();
    expect(getByText(/recent matches/i)).toBeTruthy();
    // No titles on this player, so that section is absent — unaffected by
    // history being empty.
    expect(queryByText(/^titles$/i)).toBeNull();
  });

  it('renders played-for cards from history without a sold-price cell, since the public payload never carries one', async () => {
    mockGetPublicPlayer.mockResolvedValueOnce({
      player: { _id: 'p1', firstName: 'Aisha', lastName: 'Rao', titles: [], sport: 'badminton' },
      history: [historyEntry()],
    });
    mockUseCareer.mockReturnValue(careerState([]));
    const { findByText, getByText, queryByText } = render(<PlayerProfile />);

    await findByText(/aisha rao/i);
    expect(getByText(/koramangala smashers/i)).toBeTruthy();
    expect(queryByText(/sold for/i)).toBeNull();
  });
});
