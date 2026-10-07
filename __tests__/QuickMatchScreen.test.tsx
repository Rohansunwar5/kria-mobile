import { ScrollView } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import QuickMatchScreen from '../src/app/quick/[id]';
import { getQuickKnockout } from '@/api/quickKnockout';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'm1' }),
}));

let mockViewer = 'h1';
let mockKnockoutId: string | undefined;
let mockProblem = '';
let mockStatus = 'waiting';
let mockFetched: Record<string, unknown> = {};
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: mockViewer } } }),
}));

jest.mock('@/api/quickKnockout', () => ({
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
    },
    loading: false, error: false, busy: false, problem: mockProblem, reload: jest.fn(),
    point: jest.fn(), undo: jest.fn(), start: mockStart, cancel: jest.fn(), removePlayer: jest.fn(),
    toss: jest.fn(), lineup: jest.fn(), ball: jest.fn(), undoBall: jest.fn(),
  }),
}));

beforeEach(() => { jest.clearAllMocks(); mockKnockoutId = undefined; mockProblem = ''; mockStatus = 'waiting'; mockFetched = {}; });

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

    expect(screen.getByText('Waiting for Arjun Mehta to start')).toBeTruthy();
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
    expect(await screen.findByText('Cup · Final · ← Bracket')).toBeTruthy();
  });

  describe('awards auto-open', () => {
    /** Renders live, then flips the match to completed in place. */
    async function finish(viewer: string, fetched: Record<string, unknown> = { status: 'completed' }) {
      mockViewer = viewer; mockKnockoutId = 'k1'; mockStatus = 'live'; mockFetched = fetched;
      const view = render(<QuickMatchScreen />);
      await screen.findByText('Cup · Final · ← Bracket');
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
      await screen.findByText('Cup · Final · ← Bracket');
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
      await screen.findByText('Cup · Final · ← Bracket');
      expect(getQuickKnockout).toHaveBeenCalledTimes(1); // the bar title only
      expect(router.push).not.toHaveBeenCalled();
    });
  });
});
