jest.mock('@/lib/haptics', () => ({
  haptics: { win: jest.fn(), loss: jest.fn(), tick: jest.fn(), mint: jest.fn(), award: jest.fn(), gameEnd: jest.fn(), point: jest.fn() },
}));
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Achievement, CareerProfile, SportSummary } from '@/api/career';
import type { QuickMatch } from '@/api/quickMatch';
import { RallyDone, RallyLive } from '@/components/room/RallyRoom';
import { haptics } from '@/lib/haptics';
import { buildResultMoment } from '@/lib/resultMoment';

const sum = (played: number, decided: number, won: number): SportSummary => ({
  sport: 'badminton', played, decided, won, lost: decided - won, tied: 0, noResult: played - decided, winRate: won / decided,
});
const ach = (id: string, label: string, progress: number, target: number): Achievement => ({ id, label, progress, target, earned: progress >= target });
const prof = (s: SportSummary, a: Achievement[]): CareerProfile => ({ sports: [s], bestSport: null, achievements: a });
const match = {
  _id: 'm1', hostId: 'me', sport: 'badminton', joinCode: 'ABC', status: 'completed', outcome: 'side1', createdAt: '2026-11-27T10:00:00Z',
  sides: [
    { sideId: 's1', name: 'Asha & Ravi', slots: [{ slotId: 'a', playerId: 'me', displayName: 'Asha' }] },
    { sideId: 's2', name: 'Meera & Dev', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Dev' }] },
  ],
  gameScores: [
    { gameNumber: 1, side1Score: 21, side2Score: 17, winnerSideId: 's1' },
    { gameNumber: 2, side1Score: 18, side2Score: 21, winnerSideId: 's2' },
    { gameNumber: 3, side1Score: 21, side2Score: 15, winnerSideId: 's1' },
  ],
} as QuickMatch;
const winMoment = buildResultMoment(
  prof(sum(12, 12, 7), [ach('matches-50', 'Play 50 matches', 49, 50), ach('matches-100', 'Play 100 matches', 49, 100)]),
  prof(sum(13, 13, 8), [ach('matches-50', 'Play 50 matches', 50, 50), ach('matches-100', 'Play 100 matches', 50, 100)]),
  match, 'me',
)!;

beforeEach(() => jest.clearAllMocks());

test('a win shows the chip, tiles, bar and mint, and fires win() once', () => {
  render(<RallyDone match={match} moment={winMoment} play />);
  expect(screen.getByText('W')).toBeTruthy();
  expect(screen.getByText('Asha & Ravi win 2–1')).toBeTruthy();
  expect(screen.getByText('Win rate')).toBeTruthy();
  expect(screen.getByLabelText('61.5%')).toBeTruthy();
  expect(screen.getByText('was 58.3%')).toBeTruthy();
  expect(screen.getByText('Decided')).toBeTruthy();
  expect(screen.getByText('+1 this match')).toBeTruthy();
  expect(screen.getByText('50 more')).toBeTruthy();
  expect(screen.getByText('to 100 matches')).toBeTruthy();
  expect(screen.getByText('Play 50 matches')).toBeTruthy();
  expect(screen.getByText('Milestone · earned in this match')).toBeTruthy();
  expect(screen.getByText('50 matches played')).toBeTruthy();
  expect(screen.getByText('Next: 100.')).toBeTruthy();
  expect(haptics.win).toHaveBeenCalledTimes(1);
  expect(haptics.loss).not.toHaveBeenCalled();
});

test('a loss fires loss() and shows the L chip', () => {
  const lost = { ...match, outcome: 'side2' } as QuickMatch;
  const m = buildResultMoment(prof(sum(12, 12, 7), []), prof(sum(13, 13, 7), []), lost, 'me')!;
  render(<RallyDone match={lost} moment={m} play />);
  expect(screen.getByText('L')).toBeTruthy();
  expect(haptics.loss).toHaveBeenCalledTimes(1);
  expect(haptics.win).not.toHaveBeenCalled();
});

test('the qualify line replaces the bar', () => {
  const m = buildResultMoment(prof(sum(4, 4, 2), []), prof(sum(5, 5, 3), []), match, 'me')!;
  render(<RallyDone match={match} moment={m} play={false} />);
  expect(screen.getByText("You've reached 5 decided matches in badminton. You'll appear in the rankings within a few minutes.")).toBeTruthy();
});

test('no moment renders today\'s result only', () => {
  render(<RallyDone match={match} />);
  expect(screen.getByText('Asha & Ravi win 2–1')).toBeTruthy();
  expect(screen.queryByText('Win rate')).toBeNull();
  expect(haptics.win).not.toHaveBeenCalled();
});

test('a game ending in the live room fires gameEnd once', () => {
  const liveMatch = { ...match, status: 'live', outcome: undefined, gameScores: [match.gameScores![0], { gameNumber: 2, side1Score: 20, side2Score: 20 }] } as QuickMatch;
  const props = { host: true, busy: false, onPoint: () => {}, onLock: () => {} };
  const view = render(<RallyLive match={liveMatch} {...props} />);
  expect(haptics.gameEnd).not.toHaveBeenCalled();
  view.rerender(<RallyLive match={{ ...liveMatch, gameScores: [match.gameScores![0], { gameNumber: 2, side1Score: 22, side2Score: 20, winnerSideId: 's1' }] } as QuickMatch} {...props} />);
  expect(haptics.gameEnd).toHaveBeenCalledTimes(1);
});

describe('the moment arriving after the plain result (review #1)', () => {
  it('keeps the headline and games mounted, and a skip does not remount them either', () => {
    const view = render(<RallyDone match={match} />);
    const headline = screen.getByText('Asha & Ravi win 2–1');
    view.rerender(<RallyDone match={match} moment={winMoment} play />);
    expect(screen.getByText('Asha & Ravi win 2–1')).toBe(headline);
    expect(screen.getByText('W')).toBeTruthy();
    fireEvent.press(screen.getByText('Asha & Ravi win 2–1'));
    expect(screen.getByText('Asha & Ravi win 2–1')).toBe(headline);
  });

  it('a no-result with nothing decided before says so, not "first decided match" (review #10)', () => {
    const nr = { ...match, outcome: 'no_result' } as QuickMatch;
    const m = buildResultMoment(prof(sum(0, 0, 0), []), prof(sum(1, 0, 0), []), nr, 'me')!;
    render(<RallyDone match={nr} moment={m} play={false} />);
    expect(screen.queryByText('first decided match')).toBeNull();
    expect(screen.getByText('no decided matches yet')).toBeTruthy();
  });
});
