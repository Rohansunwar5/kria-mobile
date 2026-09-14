import { render } from '@testing-library/react-native';
import { PlayPortal } from '../src/components/home/PlayPortal';
import type { CareerProfile, RecentMatch } from '../src/api/career';
import type { QuickMatch } from '../src/api/quickMatch';

const profile: CareerProfile = {
  sports: [
    { sport: 'badminton', played: 31, decided: 31, won: 21, lost: 10, tied: 0, noResult: 0, winRate: 21 / 31 },
  ],
  bestSport: null,
  achievements: [],
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

const quickMatch = (over: Partial<QuickMatch> = {}): QuickMatch => ({
  _id: 'q1',
  hostId: 'p1',
  sport: 'badminton',
  joinCode: 'AB12CD',
  status: 'live',
  createdAt: '2026-09-11T09:00:00.000Z',
  sides: [
    { sideId: 's1', name: 'Rohan', slots: [{ slotId: 'a', playerId: 'p1', displayName: 'Rohan' }] },
    { sideId: 's2', name: 'Dev', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Dev' }] },
  ],
  ...over,
});

const props = (over = {}) => ({
  profile,
  recent,
  matches: [] as QuickMatch[],
  playerId: 'p1',
  loading: false,
  error: false,
  recentError: false,
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

  // The flagship cross-portal affordance: a quick match still in progress
  // surfaces at the top of the recent-matches feed. Side names distinct from
  // the `recent` fixture's "Rohan v Dev" so the two rows can't be confused.
  it('shows a live quick match as a live row with both sides named and a live tag', () => {
    const live = quickMatch({
      sides: [
        { sideId: 's1', name: 'Falcons', slots: [{ slotId: 'a', playerId: 'p1', displayName: 'Rohan' }] },
        { sideId: 's2', name: 'Titans', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Dev' }] },
      ],
    });
    const { getByText } = render(<PlayPortal {...props({ matches: [live] })} />);
    expect(getByText(/falcons v titans/i)).toBeTruthy();
    expect(getByText('live')).toBeTruthy();
  });

  // A quick match that has finished is already represented by a ledger row —
  // it must not also produce a live row, or the same result would appear twice.
  it('renders no live row for a completed or cancelled quick match, while ledger rows still show', () => {
    const done = quickMatch({
      status: 'completed',
      outcome: 'side1',
      sides: [
        { sideId: 's1', name: 'Falcons', slots: [{ slotId: 'a', playerId: 'p1', displayName: 'Rohan' }] },
        { sideId: 's2', name: 'Titans', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Dev' }] },
      ],
    });
    const cancelled = quickMatch({
      _id: 'q2',
      status: 'cancelled',
      sides: [
        { sideId: 's1', name: 'Eagles', slots: [{ slotId: 'a', playerId: 'p1', displayName: 'Rohan' }] },
        { sideId: 's2', name: 'Hawks', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Dev' }] },
      ],
    });
    const { queryByText, getByText } = render(<PlayPortal {...props({ matches: [done, cancelled] })} />);
    expect(queryByText(/falcons v titans/i)).toBeNull();
    expect(queryByText(/eagles v hawks/i)).toBeNull();
    expect(getByText(/rohan v dev/i)).toBeTruthy();
  });

  // `isHost` distinguishes the host's own live match from one they are merely
  // playing in — both read from the same `hostId` the fixture already sets.
  it('labels a live row Hosting for the host and Playing for a participant who is not', () => {
    const live = quickMatch();

    const asHost = render(<PlayPortal {...props({ matches: [live], playerId: 'p1', recent: [] })} />);
    expect(asHost.getByText('Hosting')).toBeTruthy();
    expect(asHost.queryByText('Playing')).toBeNull();
    asHost.unmount();

    const asParticipant = render(<PlayPortal {...props({ matches: [live], playerId: 'p2', recent: [] })} />);
    expect(asParticipant.getByText('Playing')).toBeTruthy();
    expect(asParticipant.queryByText('Hosting')).toBeNull();
  });
});
