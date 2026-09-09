import {
  isHost,
  canUndo,
  gamesWon,
  currentGame,
  freeSlots,
  statusVariant,
  formatLabel,
  outcomeLabel,
} from '@/lib/quickMatchView';
// Note for the implementer: these are the ONLY exports quickMatchView has.
// Do not add a statusLabel — MatchPanel passes match.status straight to Tag,
// which uppercases it in CSS.
import type { QuickMatch } from '@/api/quickMatch';

const base = (over: Partial<QuickMatch> = {}): QuickMatch => ({
  _id: 'm1',
  hostId: 'h1',
  sport: 'badminton',
  joinCode: 'ABC234',
  status: 'live',
  sides: [
    { sideId: 's1', name: 'Reds', slots: [{ slotId: 'sl1', playerId: 'h1', displayName: 'Host' }] },
    { sideId: 's2', name: 'Blues', slots: [{ slotId: 'sl2', displayName: 'Open' }] },
  ],
  gameScores: [],
  matchConfig: { bestOf: 3, pointsToWin: 21 },
  createdAt: '2026-09-09T00:00:00.000Z',
  ...over,
});

describe('isHost', () => {
  it('identifies the host', () => {
    expect(isHost(base(), 'h1')).toBe(true);
    expect(isHost(base(), 'someone')).toBe(false);
  });

  it('is false with no player id — a signed-out reader hosts nothing', () => {
    expect(isHost(base(), undefined)).toBe(false);
  });
});

describe('canUndo', () => {
  it('is false when the snapshot is absent', () => {
    expect(canUndo(base())).toBe(false);
  });

  it('is TRUE when the snapshot is an empty array', () => {
    // The critical case. [] is a real snapshot — it is exactly what the first
    // point of a match is undone to. A truthiness check would silently disable
    // undo right after the first point.
    expect(canUndo(base({ previousGameScores: [] }))).toBe(true);
  });

  it('is true when the snapshot has games in it', () => {
    expect(canUndo(base({
      previousGameScores: [{ gameNumber: 1, side1Score: 4, side2Score: 3 }],
    }))).toBe(true);
  });
});

describe('gamesWon', () => {
  it('counts decided games per side and ignores the game in progress', () => {
    const m = base({
      gameScores: [
        { gameNumber: 1, side1Score: 21, side2Score: 15, winnerSideId: 's1' },
        { gameNumber: 2, side1Score: 18, side2Score: 21, winnerSideId: 's2' },
        { gameNumber: 3, side1Score: 5, side2Score: 4 },
      ],
    });
    expect(gamesWon(m)).toEqual({ side1: 1, side2: 1 });
  });

  it('is 0-0 for a match with no games yet', () => {
    expect(gamesWon(base())).toEqual({ side1: 0, side2: 0 });
  });
});

describe('currentGame', () => {
  it('returns the game with no winner', () => {
    const m = base({
      gameScores: [
        { gameNumber: 1, side1Score: 21, side2Score: 15, winnerSideId: 's1' },
        { gameNumber: 2, side1Score: 5, side2Score: 4 },
      ],
    });
    expect(currentGame(m)?.gameNumber).toBe(2);
  });

  it('returns null once every game is decided', () => {
    const m = base({
      status: 'completed',
      gameScores: [
        { gameNumber: 1, side1Score: 21, side2Score: 15, winnerSideId: 's1' },
        { gameNumber: 2, side1Score: 21, side2Score: 12, winnerSideId: 's1' },
      ],
    });
    expect(currentGame(m)).toBeNull();
  });

  it('returns null for a match that has not started', () => {
    expect(currentGame(base())).toBeNull();
  });
});

describe('freeSlots', () => {
  it('returns only slots with no playerId', () => {
    const free = freeSlots(base());
    expect(free).toHaveLength(1);
    expect(free[0].slotId).toBe('sl2');
  });

  it('returns nothing when the match is full', () => {
    const m = base({
      sides: [
        { sideId: 's1', name: 'Reds', slots: [{ slotId: 'sl1', playerId: 'h1', displayName: 'Host' }] },
        { sideId: 's2', name: 'Blues', slots: [{ slotId: 'sl2', playerId: 'p2', displayName: 'Joiner' }] },
      ],
    });
    expect(freeSlots(m)).toHaveLength(0);
  });
});

describe('labels', () => {
  it('maps status to a Tag variant', () => {
    expect(statusVariant('live')).toBe('live');
    expect(statusVariant('completed')).toBe('end');
    expect(statusVariant('cancelled')).toBe('fail');
  });

  it('describes the format', () => {
    expect(formatLabel(base())).toBe('Best of 3 · to 21');
    expect(formatLabel(base({ matchConfig: { bestOf: 1, pointsToWin: 11 } }))).toBe('Single game · to 11');
  });

  it('names the winning side from the stored outcome, never from the scores', () => {
    expect(outcomeLabel(base({ status: 'completed', outcome: 'side1' }))).toBe('Reds won');
    expect(outcomeLabel(base({ status: 'completed', outcome: 'side2' }))).toBe('Blues won');
    expect(outcomeLabel(base({ status: 'completed', outcome: 'tied' }))).toBe('Tied');
    expect(outcomeLabel(base())).toBeNull();
  });
});
