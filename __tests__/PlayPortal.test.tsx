import { fireEvent, render } from '@testing-library/react-native';
import { PlayPortal } from '../src/components/home/PlayPortal';
import type { CareerProfile, RecentMatch } from '../src/api/career';
import type { QuickKnockout } from '../src/api/quickKnockout';
import type { QuickMatch } from '../src/api/quickMatch';
import type { RankedPlayer } from '../src/api/rankings';

// TopPlayers owns its own fetch via useTopPlayers — stub it here the same
// way HomeScreen.test.tsx stubs useCareer, so this file stays about the
// portal's layout rather than exercising a real network call.
const mockUseTopPlayers = jest.fn();
jest.mock('../src/lib/useTopPlayers', () => ({
  useTopPlayers: (sport: string) => mockUseTopPlayers(sport),
}));

const rankedPlayer: RankedPlayer = {
  playerId: 'p1',
  firstName: 'Rohan',
  lastName: 'Sunwar',
  played: 24,
  decided: 24,
  won: 22,
  winRate: 0.92,
};

const profile: CareerProfile = {
  sports: [
    { sport: 'badminton', played: 31, decided: 31, won: 21, lost: 10, tied: 0, noResult: 0, winRate: 21 / 31 },
  ],
  bestSport: null,
  achievements: [],
};

const cricket = { sport: 'cricket', played: 13, decided: 13, won: 7, lost: 6, tied: 0, noResult: 0, winRate: 7 / 13 };

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

// Side names distinct from the `recent` fixture's "Rohan v Dev", so a match at
// the top can never be confused with a result below.
const falconsVTitans = (over: Partial<QuickMatch> = {}) =>
  quickMatch({
    sides: [
      { sideId: 's1', name: 'Falcons', slots: [{ slotId: 'a', playerId: 'p1', displayName: 'Rohan' }] },
      { sideId: 's2', name: 'Titans', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Dev' }] },
    ],
    ...over,
  });

const knockout = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'p1', name: 'Sunday Smash', sport: 'badminton', format: 'singles', status: 'live',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, players: [], pairs: [], entrants: [], fixtures: [], roundNames: [], awards: [],
  createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});

const props = (over = {}) => ({
  playerName: 'Rohan',
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
  beforeEach(() => {
    mockUseTopPlayers.mockReturnValue({ players: [rankedPlayer], loading: false, error: false, reload: jest.fn() });
  });

  it('renders the top players board, with the viewer marked', () => {
    const { getByText } = render(<PlayPortal {...props({ playerId: 'p1' })} />);
    expect(getByText('Top players')).toBeTruthy();
    expect(getByText(/rohan sunwar/i)).toBeTruthy();
    expect(getByText('You')).toBeTruthy();
  });

  describe('player card', () => {
    // Host is the nav's lifted button; between matches the card does not repeat it.
    it('leads with your win rate, record and the join, but not Host', () => {
      const { getByText, getByLabelText, queryByLabelText } = render(<PlayPortal {...props()} />);
      expect(getByText('Rohan')).toBeTruthy();
      expect(getByText('68%')).toBeTruthy();
      expect(getByText('21–10')).toBeTruthy();
      expect(getByLabelText('Join with a code')).toBeTruthy();
      expect(queryByLabelText('Host a match')).toBeNull();
    });

    it('switches between your sports', () => {
      const { getByText, getByLabelText } = render(
        <PlayPortal {...props({ profile: { ...profile, sports: [...profile.sports, cricket] } })} />,
      );
      expect(getByText('68%')).toBeTruthy();
      fireEvent.press(getByLabelText(/^Cricket, 54% win rate/));
      expect(getByText('54%')).toBeTruthy();
    });

    it('opens on your best sport when the server names one', () => {
      const { getByText } = render(
        <PlayPortal {...props({ profile: { ...profile, sports: [...profile.sports, cricket], bestSport: cricket } })} />,
      );
      expect(getByText('54%')).toBeTruthy();
    });

    // `played` counts a no-result and `decided` does not, so it is named
    // beside won–lost rather than leaving the figures to disagree.
    it('names a no-result beside won–lost', () => {
      const nr = { ...profile.sports[0], played: 32, noResult: 1 };
      const { getByText } = render(<PlayPortal {...props({ profile: { ...profile, sports: [nr] } })} />);
      expect(getByText('Won–lost · 1 NR')).toBeTruthy();
    });

    // DESIGN.md §5: keep the chrome while loading, never blank it.
    it('keeps your name and the join while the record loads', () => {
      const { getByText, getByLabelText, queryByText } = render(
        <PlayPortal {...props({ profile: null, recent: null, loading: true })} />,
      );
      expect(getByText('Rohan')).toBeTruthy();
      expect(getByLabelText('Join with a code')).toBeTruthy();
      expect(queryByText(/your first match/i)).toBeNull();
    });

    it('scopes a failed record to the card and keeps the join', () => {
      const { getByText, getByLabelText } = render(<PlayPortal {...props({ profile: null, error: true })} />);
      expect(getByText('Couldn’t load your record')).toBeTruthy();
      expect(getByLabelText('Join with a code')).toBeTruthy();
    });
  });

  // A new account: the guide already says nothing has been played, so there is
  // no results section repeating it, and this is the one state that offers Host.
  it('shows the first-match guide, with Host and Join, when nothing has been played', () => {
    const { getByText, getByLabelText, queryByText } = render(
      <PlayPortal {...props({ profile: { sports: [], bestSport: null, achievements: [] }, recent: [] })} />,
    );
    expect(getByText(/your first match starts here/i)).toBeTruthy();
    expect(getByLabelText('Host a match')).toBeTruthy();
    expect(getByLabelText('Join with a code')).toBeTruthy();
    expect(queryByText('Your results')).toBeNull();
  });

  describe('results', () => {
    it('lists a result with its scoreline', () => {
      const { getByText } = render(<PlayPortal {...props()} />);
      expect(getByText(/rohan v dev/i)).toBeTruthy();
      expect(getByText(/21-18, 21-16/)).toBeTruthy();
    });

    // The ledger outlives the matches it describes, so `title` can be absent;
    // the row is then called by its sport, the same as on both profiles.
    it('survives a feed row whose match could not be read', () => {
      const bare: RecentMatch[] = [
        { _id: 'r2', matchId: 'm2', sport: 'cricket', context: 'tournament', result: 'lost', playedAt: '2026-09-01T00:00:00.000Z' },
      ];
      const { getByText } = render(<PlayPortal {...props({ recent: bare })} />);
      expect(getByText(/^cricket$/i)).toBeTruthy();
      expect(getByText(/^tournament · cricket$/i)).toBeTruthy();
    });

    it('tags a knockout match as knockout rather than quick', () => {
      const ko: RecentMatch[] = [
        { _id: 'r3', matchId: 'm3', sport: 'badminton', context: 'quick', result: 'won', playedAt: '2026-09-01T00:00:00.000Z', title: 'A v B', knockout: { name: 'Sunday Cup', round: 'Final' } },
      ];
      const { getByText, queryByText } = render(<PlayPortal {...props({ recent: ko })} />);
      expect(getByText(/^knockout · /i)).toBeTruthy();
      expect(queryByText(/^quick · /i)).toBeNull();
    });

    it('shows four results and links the rest to your full history', () => {
      const many: RecentMatch[] = Array.from({ length: 6 }, (_, i) => ({ ...recent[0], _id: `r${i}`, title: `Match ${i}` }));
      const { getByText, queryByText, getByLabelText } = render(<PlayPortal {...props({ recent: many })} />);
      expect(getByText('Match 3')).toBeTruthy();
      expect(queryByText('Match 4')).toBeNull();
      expect(getByLabelText('All matches')).toBeTruthy();
    });
  });

  describe('in progress', () => {
    it('puts a live badminton match at the top as a scoreboard', () => {
      const live = falconsVTitans({
        gameScores: [
          { gameNumber: 1, side1Score: 21, side2Score: 19, winnerSideId: 's1' },
          { gameNumber: 2, side1Score: 9, side2Score: 7 },
        ],
      });
      const { getByText, getByLabelText, queryByLabelText } = render(<PlayPortal {...props({ matches: [live] })} />);
      expect(getByText('Live')).toBeTruthy();
      expect(getByLabelText('Score: Falcons 21, 9. Titans 19, 7.')).toBeTruthy();
      // The match takes the top; the player card waits until it ends.
      expect(queryByLabelText('Join with a code')).toBeNull();
    });

    // `isHost` separates the host's own match from one they are only playing in.
    it('offers Resume scoring to the host and Open match to a player', () => {
      const asHost = render(<PlayPortal {...props({ matches: [falconsVTitans()], playerId: 'p1' })} />);
      expect(asHost.getByText('Resume scoring')).toBeTruthy();
      expect(asHost.getByText('Hosting')).toBeTruthy();
      asHost.unmount();

      const asPlayer = render(<PlayPortal {...props({ matches: [falconsVTitans()], playerId: 'p2' })} />);
      expect(asPlayer.getByText('Open match')).toBeTruthy();
      expect(asPlayer.getByText('Playing')).toBeTruthy();
    });

    it('shows a live cricket match by its score line', () => {
      const live = falconsVTitans({
        sport: 'cricket',
        liveState: { runs: 42, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2, currentInnings: 1 },
      });
      const { getByText } = render(<PlayPortal {...props({ matches: [live] })} />);
      expect(getByText(/falcons v titans/i)).toBeTruthy();
      expect(getByText('42/3 (6.2)')).toBeTruthy();
    });

    // A player who backs out of the waiting room must find their way back, and
    // the host needs the code to share.
    it('shows a waiting room with its code and how many have joined', () => {
      const waiting = falconsVTitans({
        status: 'waiting',
        sides: [
          { sideId: 's1', name: 'Falcons', slots: [{ slotId: 'a', playerId: 'p1', displayName: 'Rohan' }] },
          { sideId: 's2', name: 'Titans', slots: [{ slotId: 'b', displayName: 'Dev' }] },
        ],
      });
      const { getByText } = render(<PlayPortal {...props({ matches: [waiting] })} />);
      expect(getByText('Waiting')).toBeTruthy();
      expect(getByText('AB12CD')).toBeTruthy();
      expect(getByText('1/2 joined')).toBeTruthy();
      expect(getByText('Open waiting room')).toBeTruthy();
    });

    // A finished quick match is already a result below; it must not also take
    // the top, or the same match would appear twice.
    it('never puts a finished or cancelled quick match at the top', () => {
      const done = falconsVTitans({ status: 'completed', outcome: 'side1' });
      const cancelled = falconsVTitans({ _id: 'q2', status: 'cancelled' });
      const { queryByText, getByText, getByLabelText } = render(<PlayPortal {...props({ matches: [done, cancelled] })} />);
      expect(queryByText('Falcons')).toBeNull();
      expect(getByLabelText('Join with a code')).toBeTruthy();
      expect(getByText(/rohan v dev/i)).toBeTruthy();
    });

    // What the host and players of a knockout see once its match is underway:
    // the score and Resume, not the knockout card.
    it('puts a begun knockout match at the top, named by its knockout and round', () => {
      const ko = knockout({ name: 'Re testing', roundNames: ['Final'], fixtures: [{ fixtureId: 'f1', round: 1, position: 0, bye: false }] });
      const match = falconsVTitans({
        sport: 'cricket',
        knockoutId: 'k1',
        fixtureId: 'f1',
        matchConfig: { maxOvers: 5 },
        cricketSetup: { toss: { recorded: true, winnerTeamId: 's2', decision: 'bat' }, lineupsSet: true, side1Lineup: [], side2Lineup: [] },
        liveState: { runs: 20, wickets: 0, completedOvers: 1, ballsInCurrentOver: 0, currentInnings: 1 },
      });
      const { getByText, queryByText } = render(<PlayPortal {...props({ matches: [match], knockouts: [ko] })} />);
      expect(getByText('Knockout')).toBeTruthy();
      expect(getByText('Re testing · Final · Cricket · 5 overs')).toBeTruthy();
      expect(getByText('20/0 (1.0)')).toBeTruthy();
      expect(getByText('Resume scoring')).toBeTruthy();
      expect(queryByText('Open knockout')).toBeNull();
    });

    it('puts an unfinished knockout at the top when no match is running', () => {
      const { getByText } = render(<PlayPortal {...props({ knockouts: [knockout()] })} />);
      expect(getByText('Sunday Smash')).toBeTruthy();
      expect(getByText('Knockout')).toBeTruthy();
      expect(getByText('Open knockout')).toBeTruthy();
    });

    it('lists anything else in progress under the top card', () => {
      const { getByText, getByLabelText } = render(
        <PlayPortal {...props({ matches: [falconsVTitans()], knockouts: [knockout({ status: 'waiting' })] })} />,
      );
      expect(getByLabelText(/^Score: Falcons/)).toBeTruthy();
      expect(getByText('Sunday Smash')).toBeTruthy();
    });
  });
});
