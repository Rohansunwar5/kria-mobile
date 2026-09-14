import { render } from '@testing-library/react-native';
import PlayerProfile from '../src/app/player/[playerId]';
import type { Achievement, RecentMatch } from '../src/api/career';

// Same shape as HomeScreen.test.tsx / EventsPortal.test.tsx: there is no
// navigation container around a bare screen render, so params come from a
// stub and every push is a no-op.
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ playerId: 'p1' }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../src/api/profileApi', () => ({
  getPublicPlayer: jest.fn(async () => ({
    player: { _id: 'p1', firstName: 'Aisha', lastName: 'Rao', titles: ['Grand Slam Champion'], sport: 'badminton' },
    history: [],
  })),
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

const careerState = (achievements: Achievement[]) => ({
  profile: { sports: [], bestSport: null, achievements },
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
