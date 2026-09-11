import { render } from '@testing-library/react-native';
import { PlayPortal } from '../src/components/home/PlayPortal';
import type { CareerProfile, RecentMatch } from '../src/api/career';

const profile: CareerProfile = {
  sports: [
    { sport: 'badminton', played: 31, decided: 31, won: 21, lost: 10, tied: 0, noResult: 0, winRate: 21 / 31 },
  ],
  bestSport: null,
};

const recent: RecentMatch[] = [
  {
    _id: 'r1',
    matchId: 'm1',
    sport: 'badminton',
    context: 'quick',
    result: 'won',
    playedAt: '2026-09-09T10:00:00.000Z',
    title: 'Rohan v Dev',
    scoreline: '21-18, 21-16',
  },
];

const props = (over = {}) => ({
  profile,
  recent,
  matches: [],
  playerId: 'p1',
  loading: false,
  onRetry: jest.fn(),
  ...over,
});

describe('PlayPortal', () => {
  it('always offers Host and Join', () => {
    const { getByLabelText } = render(<PlayPortal {...props()} />);
    expect(getByLabelText('Host a match')).toBeTruthy();
    expect(getByLabelText('Join with a code')).toBeTruthy();
  });

  it('renders the win rate as a percentage, not the 0-1 fraction', () => {
    const { getByText } = render(<PlayPortal {...props()} />);
    expect(getByText('68%')).toBeTruthy();
  });

  it('lists a recent match with its scoreline', () => {
    const { getByText } = render(<PlayPortal {...props()} />);
    expect(getByText(/rohan v dev/i)).toBeTruthy();
    expect(getByText(/21-18, 21-16/)).toBeTruthy();
  });

  // The ledger outlives the matches it describes, so `title` can be absent.
  it('survives a feed row whose match could not be read', () => {
    const bare: RecentMatch[] = [
      { _id: 'r2', matchId: 'm2', sport: 'cricket', context: 'tournament', result: 'lost', playedAt: '2026-09-01T00:00:00.000Z' },
    ];
    const { getByText } = render(<PlayPortal {...props({ recent: bare })} />);
    expect(getByText(/match unavailable/i)).toBeTruthy();
  });

  // DESIGN.md §5: an empty state names what would appear and offers the one
  // action that fills it — which is Host, already at the top. It must not offer
  // a second competing action.
  it('names what is missing when nothing has been played', () => {
    const { getByText, queryByText } = render(
      <PlayPortal {...props({ profile: { sports: [], bestSport: null }, recent: [] })} />
    );
    expect(getByText(/your record/i)).toBeTruthy();
    expect(getByText(/once you have played/i)).toBeTruthy();
    expect(queryByText(/^start playing$/i)).toBeNull();
  });

  it('keeps the chrome while loading rather than blanking', () => {
    const { getByLabelText } = render(
      <PlayPortal {...props({ profile: null, recent: null, loading: true })} />
    );
    expect(getByLabelText('Host a match')).toBeTruthy();
  });
});
