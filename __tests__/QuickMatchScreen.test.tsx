import { Alert, ScrollView } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import QuickMatchScreen from '../src/app/quick/[id]';
import { getQuickKnockout, settleKnockoutTie } from '@/api/quickKnockout';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'm1' }),
  useRouter: () => ({ push: jest.fn() }),
}));

let mockViewer = 'h1';
let mockKnockoutId: string | undefined;
let mockProblem = '';
let mockStatus = 'waiting';
let mockFetched: Record<string, unknown> = {}; let mockMatchOver: Record<string, unknown> = {};
let mockBusy = false;
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: mockViewer } } }),
}));

jest.mock('@/api/quickKnockout', () => ({
  settleKnockoutTie: jest.fn(),
  getQuickKnockout: jest.fn(async () => ({
    name: 'Cup',
    hostId: 'h1',
    status: 'live',
    awardsEligible: true,
    awards: [],
    roundNames: ['Semi-Final', 'Final'],
    fixtures: [{ fixtureId: 'f1', round: 2, position: 0, bye: false }],
    ...mockFetched,
  })),
}));

const mockStart = jest.fn();
const mockCancel = jest.fn();
const mockToss = jest.fn();
const mockBall = jest.fn();
jest.mock('@/lib/useQuickMatch', () => ({
  useQuickMatch: () => ({
    match: {
      _id: 'm1', hostId: 'h1', sport: 'badminton', joinCode: 'ABC234', status: mockStatus,
      sides: [
        { sideId: 's1', name: 'Arjun', slots: [{ slotId: 'a1', playerId: 'h1', displayName: 'Arjun Mehta' }] },
        { sideId: 's2', name: 'Rahul', slots: [{ slotId: 'b1', playerId: 'p2', displayName: 'Rahul Singh' }] },
      ],
      gameScores: [],
      matchConfig: { bestOf: 3, pointsToWin: 21 },
      createdAt: '2026-10-06T00:00:00.000Z',
      knockoutId: mockKnockoutId,
      fixtureId: mockKnockoutId ? 'f1' : undefined,
      ...mockMatchOver,
    },
    loading: false, error: false, busy: mockBusy, problem: mockProblem, reload: jest.fn(),
    point: jest.fn(), undo: jest.fn(), start: mockStart, cancel: mockCancel, removePlayer: jest.fn(),
    toss: mockToss, lineup: jest.fn(), ball: mockBall, undoBall: jest.fn(),
  }),
}));
jest.mock('@/lib/useQuickScorecard', () => ({ useQuickScorecard: () => null }));

beforeEach(() => { jest.clearAllMocks(); mockKnockoutId = undefined; mockProblem = ''; mockStatus = 'waiting'; mockFetched = {}; mockMatchOver = {}; mockBusy = false; });

describe('a waiting match', () => {
  it('opens in the waiting room, not on the scoreboard, and the host starts it', () => {
    mockViewer = 'h1';
    render(<QuickMatchScreen />);

    expect(screen.queryByTestId('point-side-1')).toBeNull();
    fireEvent.press(screen.getByText('Start match'));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  // A cricket roster runs to 22 rows; a Start button inside the scroll would
  // be pushed off-screen. It sits outside it, always in reach.
  it('keeps Start out of the scrolling roster, pinned in reach', () => {
    mockViewer = 'h1';
    render(<QuickMatchScreen />);

    const scroll = screen.UNSAFE_getByType(ScrollView);
    expect(within(scroll).queryByText('Start match')).toBeNull();
    expect(screen.getByText('Start match')).toBeTruthy();
  });

  it('gives a joined player no start button', () => {
    mockViewer = 'p2';
    render(<QuickMatchScreen />);

    expect(screen.getByText('Waiting for Arjun Mehta to start the match.')).toBeTruthy();
    expect(screen.queryByText('Start match')).toBeNull();
  });
});

describe('a knockout match', () => {
  // The bracket is usually right underneath: go back down to it rather than
  // stacking a second copy on top.
  it('links back to its bracket', () => {
    mockViewer = 'h1';
    mockKnockoutId = 'k1';
    render(<QuickMatchScreen />);
    fireEvent.press(screen.getByLabelText('Back to bracket'));
    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('says why an undo was refused', () => {
    mockViewer = 'h1';
    mockKnockoutId = 'k1';
    mockProblem = 'The next match has already started.';
    render(<QuickMatchScreen />);
    expect(screen.getByText('The next match has already started.')).toBeTruthy();
  });

  it('names the knockout and round in the bar', async () => {
    mockViewer = 'h1';
    mockKnockoutId = 'k1';
    render(<QuickMatchScreen />);
    expect(await screen.findByText('Cup · Final · Bracket')).toBeTruthy();
  });

  describe('awards auto-open', () => {
    /** Renders live, then flips the match to completed in place. */
    async function finish(viewer: string, fetched: Record<string, unknown> = { status: 'completed' }) {
      mockViewer = viewer; mockKnockoutId = 'k1'; mockStatus = 'live'; mockFetched = fetched;
      const view = render(<QuickMatchScreen />);
      await screen.findByText('Cup · Final · Bracket');
      mockStatus = 'completed';
      view.rerender(<QuickMatchScreen />);
      return view;
    }

    it('opens the awards screen when the host sees the final finish', async () => {
      await finish('h1');
      await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/knockout/awards/[id]', params: { id: 'k1' } }));
      expect(router.push).toHaveBeenCalledTimes(1);
    });

    it('does not open, or even fetch, for a player who is not the host', async () => {
      await finish('p2');
      expect(getQuickKnockout).toHaveBeenCalledTimes(1); // the bar title only
      expect(router.push).not.toHaveBeenCalled();
    });

    it('does not open if the host left before the answer came', async () => {
      mockViewer = 'h1'; mockKnockoutId = 'k1'; mockStatus = 'live'; mockFetched = {};
      const view = render(<QuickMatchScreen />);
      await screen.findByText('Cup · Final · Bracket');
      let answer: (k: unknown) => void = () => undefined;
      (getQuickKnockout as jest.Mock).mockImplementationOnce(() => new Promise((r) => { answer = r; }));
      mockStatus = 'completed';
      view.rerender(<QuickMatchScreen />);
      expect(getQuickKnockout).toHaveBeenCalledTimes(2);
      view.unmount();
      await act(async () => { answer({ hostId: 'h1', status: 'completed', awardsEligible: true, awards: [] }); });
      expect(router.push).not.toHaveBeenCalled();
    });

    it('does not open when the knockout is not finished, not eligible, or already has awards', async () => {
      const cases = [
        { status: 'live' },
        { status: 'completed', awardsEligible: false },
        { status: 'completed', awards: [{ playerId: 'p2', badge: 'fair-play', title: 'x' }] },
      ];
      for (const fetched of cases) {
        jest.clearAllMocks();
        const view = await finish('h1', fetched);
        await waitFor(() => expect(getQuickKnockout).toHaveBeenCalledTimes(2));
        expect(router.push).not.toHaveBeenCalled();
        view.unmount();
      }
    });

    it('does not open when an already-finished final is opened later', async () => {
      mockViewer = 'h1'; mockKnockoutId = 'k1'; mockStatus = 'completed'; mockFetched = { status: 'completed' };
      render(<QuickMatchScreen />);
      await screen.findByText('Cup · Final · Bracket');
      expect(getQuickKnockout).toHaveBeenCalledTimes(1); // the bar title only
      expect(router.push).not.toHaveBeenCalled();
    });
  });
});

describe('a tied knockout match', () => {
  const tied = {
    sport: 'cricket', outcome: 'tied',
    cricketSetup: { toss: { recorded: true, winnerTeamId: 's1', decision: 'bat' }, lineupsSet: true, side1Lineup: [], side2Lineup: [] },
    liveState: { matchStatus: 'completed', currentInnings: 2, runs: 0, wickets: 0, completedOvers: 1, ballsInCurrentOver: 0 },
  };
  beforeEach(() => { mockKnockoutId = 'k1'; mockStatus = 'completed'; mockMatchOver = tied; });
  const confirmEveryAlert = () => jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });

  it('asks the host who goes through, and records the pick after confirming', async () => {
    mockViewer = 'h1';
    confirmEveryAlert();
    (settleKnockoutTie as jest.Mock).mockResolvedValue({ _id: 'k1', status: 'live', awardsEligible: true, awards: [] });
    render(<QuickMatchScreen />);
    expect(screen.getByText('Tied — who goes through?')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Rahul goes through'));
    await waitFor(() => expect(settleKnockoutTie).toHaveBeenCalledWith('k1', { fixtureId: 'f1', entrantId: 's2' }));
    expect(router.push).not.toHaveBeenCalledWith(expect.objectContaining({ pathname: '/knockout/awards/[id]' }));
  });

  it('opens the awards when the pick decides the final', async () => {
    mockViewer = 'h1';
    confirmEveryAlert();
    (settleKnockoutTie as jest.Mock).mockResolvedValue({ _id: 'k1', status: 'completed', awardsEligible: true, awards: [] });
    render(<QuickMatchScreen />);
    fireEvent.press(screen.getByLabelText('Arjun goes through'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/knockout/awards/[id]', params: { id: 'k1' } }));
  });

  it('tells a player who is not the host to wait', () => {
    mockViewer = 'p2';
    render(<QuickMatchScreen />);
    expect(screen.getByText('Tied — waiting for the host to pick who goes through')).toBeTruthy();
    expect(screen.queryByLabelText('Rahul goes through')).toBeNull();
  });

  it('shows who went through once picked', () => {
    mockViewer = 'h1';
    mockMatchOver = { ...tied, tieWinnerSideId: 's2' };
    render(<QuickMatchScreen />);
    // The board's result line ("Match tied", spec 3c).
    expect(screen.getByText('Match tied · Rahul went through')).toBeTruthy();
    expect(screen.queryByText('Tied — who goes through?')).toBeNull();
  });
});

// Ported from QuickCricketLive, CricketHostTools and the room cases of
// CricketScorePanel / CricketSetupPanel: the board for everyone, the toss and
// the pad for the host only.
describe('a quick cricket match', () => {
  const setup = { toss: { recorded: true, winnerTeamId: 's1', decision: 'bat' }, lineupsSet: true, side1Lineup: [], side2Lineup: [] };
  const noToss = { toss: { recorded: false }, lineupsSet: false, side1Lineup: [], side2Lineup: [] };
  const cricket = {
    sport: 'cricket', matchConfig: { maxOvers: 5 },
    sides: [
      { sideId: 's1', name: 'Arjun', slots: [{ slotId: 'a1', playerId: 'h1', displayName: 'Arjun Mehta' }, { slotId: 'a2', displayName: 'Open seat' }] },
      { sideId: 's2', name: 'Rahul', slots: [{ slotId: 'b1', playerId: 'p2', displayName: 'Rahul Singh' }] },
    ],
    cricketSetup: setup,
    liveState: {
      matchStatus: 'innings1', currentInnings: 1, runs: 12, wickets: 1, completedOvers: 2, ballsInCurrentOver: 3,
      battingTeamId: 's1', bowlingTeamId: 's2', strikerId: 'a1', nonStrikerId: 'a2', currentBowlerId: 'b1',
    },
  };
  beforeEach(() => { mockStatus = 'live'; mockMatchOver = cricket; });
  const scroll = () => screen.UNSAFE_getAllByType(ScrollView)[0];

  it('shows the scoreboard under the room header', () => {
    mockViewer = 'h1';
    render(<QuickMatchScreen />);
    expect(screen.getByText('Arjun vs Rahul')).toBeTruthy();
    expect(screen.getByText('Cricket · 2 a side · 5 overs · Hosted by you')).toBeTruthy();
    expect(within(scroll()).getByText('12/1')).toBeTruthy();
    expect(within(scroll()).getByText('(2.3)')).toBeTruthy();
    expect(within(scroll()).getByText('Rahul yet to bat')).toBeTruthy();
    // Crests are for tournaments only.
    expect(screen.queryByTestId('hero-crest')).toBeNull();
  });

  it('says "1 over" for a one-over match', () => {
    mockViewer = 'h1';
    mockMatchOver = { ...cricket, matchConfig: { maxOvers: 1 } };
    render(<QuickMatchScreen />);
    expect(screen.getByText('Cricket · 2 a side · 1 over · Hosted by you')).toBeTruthy();
  });

  it('pins the pad outside the scroll for the host', () => {
    mockViewer = 'h1';
    render(<QuickMatchScreen />);
    expect(screen.getByLabelText('1 run')).toBeTruthy();
    expect(screen.getByText('Extras')).toBeTruthy();
    expect(within(scroll()).queryByLabelText('1 run')).toBeNull();
    expect(within(scroll()).queryByText('Extras')).toBeNull();
  });

  // Review Focus 3.
  it('records one ball for two fast taps', () => {
    mockViewer = 'h1';
    render(<QuickMatchScreen />);
    fireEvent.press(screen.getByLabelText('1 run'));
    fireEvent.press(screen.getByLabelText('1 run'));
    expect(mockBall).toHaveBeenCalledTimes(1);
    expect(mockBall).toHaveBeenCalledWith({ batsmanOnStrikeId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1', runs: 1 });
  });

  // Review Focus 4: a claimed player and an outsider alike.
  it.each(['p2', 'x9'])('gives a spectator (%s) the board, but no pad, no host tools and no join code', (viewer) => {
    mockViewer = viewer;
    render(<QuickMatchScreen />);
    expect(screen.getByText('12/1')).toBeTruthy();
    expect(screen.getByText('Arjun won the toss and chose to bat')).toBeTruthy();
    expect(screen.queryByLabelText('1 run')).toBeNull();
    expect(screen.queryByText('Extras')).toBeNull();
    expect(screen.queryByText('Cancel match')).toBeNull();
    expect(screen.queryByText('ABC234')).toBeNull();
    expect(screen.queryByText('Join code')).toBeNull();
    expect(screen.queryByLabelText('Share join code')).toBeNull();
  });

  it.each(['p2', 'x9'])('before the toss, gives a spectator (%s) the squads and no toss controls', (viewer) => {
    mockViewer = viewer;
    mockMatchOver = { ...cricket, cricketSetup: noToss, liveState: undefined };
    render(<QuickMatchScreen />);
    expect(screen.getByText('Waiting for the toss')).toBeTruthy();
    expect(screen.getByText('Arjun Mehta · Open seat')).toBeTruthy();
    expect(screen.queryByText('Who won the toss?')).toBeNull();
    expect(screen.queryByText('ABC234')).toBeNull();
  });

  it('has the host record the toss before the first ball, with no pad yet', () => {
    mockViewer = 'h1';
    mockMatchOver = { ...cricket, cricketSetup: noToss, liveState: undefined };
    render(<QuickMatchScreen />);
    expect(screen.getByText('Who won the toss?')).toBeTruthy();
    expect(screen.queryByLabelText('1 run')).toBeNull();
    fireEvent.press(screen.getByText('Arjun'));
    fireEvent.press(screen.getByText('Bat'));
    expect(mockToss).toHaveBeenCalledWith({ winnerSideId: 's1', decision: 'bat' });
  });

  it('shows a refused delivery once, in the pad', () => {
    mockViewer = 'h1';
    mockProblem = 'That bowler has no overs left.';
    render(<QuickMatchScreen />);
    expect(screen.getAllByText('That bowler has no overs left.')).toHaveLength(1);
    expect(within(scroll()).queryByText('That bowler has no overs left.')).toBeNull();
  });

  it('keeps Cancel and the join code in the scroll while a slot is open', () => {
    mockViewer = 'h1';
    const view = render(<QuickMatchScreen />);
    expect(within(scroll()).getByText('Cancel match')).toBeTruthy();
    expect(within(scroll()).getByText('ABC234')).toBeTruthy();
    view.unmount();

    const full = cricket.sides.map((side) => ({
      ...side, slots: side.slots.map((slot, i) => ({ ...slot, playerId: `${side.sideId}-${i}` })),
    }));
    mockMatchOver = { ...cricket, sides: full };
    render(<QuickMatchScreen />);
    expect(screen.queryByText('ABC234')).toBeNull();
    expect(within(scroll()).getByText('Cancel match')).toBeTruthy();
  });

  it('asks before cancelling, and not mid-request', () => {
    mockViewer = 'h1';
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const view = render(<QuickMatchScreen />);
    fireEvent.press(screen.getByText('Cancel match'));
    expect(alert).toHaveBeenCalledWith('Cancel this match?', expect.any(String), expect.any(Array));
    expect(mockCancel).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2]!;
    buttons.find((b) => b.style === 'destructive')!.onPress!();
    expect(mockCancel).toHaveBeenCalledTimes(1);
    view.unmount();

    alert.mockClear();
    mockBusy = true;
    render(<QuickMatchScreen />);
    fireEvent.press(screen.getByText('Cancel match'));
    expect(alert).not.toHaveBeenCalled();
  });

  it('a knockout match has neither', async () => {
    mockViewer = 'h1';
    mockKnockoutId = 'k1';
    render(<QuickMatchScreen />);
    await screen.findByText(/Cup/);
    expect(screen.queryByText('Cancel match')).toBeNull();
    expect(screen.queryByText('ABC234')).toBeNull();
  });

  it('a finished match shows its result, and the host no pad', () => {
    mockViewer = 'h1';
    mockStatus = 'completed';
    mockMatchOver = { ...cricket, outcome: 'side1' };
    render(<QuickMatchScreen />);
    expect(screen.getByText('Arjun won')).toBeTruthy();
    expect(screen.queryByLabelText('1 run')).toBeNull();
    expect(screen.queryByText('Cancel match')).toBeNull();
  });

  it('a match cancelled before the toss says so, not that it awaits the toss', () => {
    mockViewer = 'h1';
    mockStatus = 'cancelled';
    mockMatchOver = { ...cricket, cricketSetup: noToss, liveState: undefined };
    render(<QuickMatchScreen />);
    expect(screen.getByText('Match cancelled')).toBeTruthy();
    expect(screen.queryByText('Waiting for the toss')).toBeNull();
    expect(screen.queryByText('Who won the toss?')).toBeNull();
  });
});
