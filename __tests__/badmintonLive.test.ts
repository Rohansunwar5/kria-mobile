import { currentGame, gamesWon, rallyFrom, matchLine } from '../src/lib/badmintonLive';
import type { BadmintonMatch } from '../src/api/badmintonMatch';

const match = (over: Partial<BadmintonMatch> = {}): BadmintonMatch =>
  ({
    _id: 'm1',
    status: 'in_progress',
    bracketRound: 'Semi-final 1',
    competitorType: 'player',
    player1: { registrationId: 'p1', name: 'D. Aggarwal' },
    player2: { registrationId: 'p2', name: 'M. Nair' },
    gameScores: [],
    matchConfig: { bestOf: 3, pointsToWin: 21 },
    ...over,
  }) as BadmintonMatch;

describe('currentGame', () => {
  it('is the last game on the sheet', () => {
    const m = match({
      gameScores: [
        { gameNumber: 1, team1Score: 21, team2Score: 18, winnerId: 'p1' },
        { gameNumber: 2, team1Score: 14, team2Score: 21, winnerId: 'p2' },
        { gameNumber: 3, team1Score: 18, team2Score: 16 },
      ],
    });
    expect(currentGame(m)?.gameNumber).toBe(3);
  });

  it('is null before the first point', () => {
    expect(currentGame(match())).toBeNull();
  });
});

describe('gamesWon', () => {
  it('counts decided games per side', () => {
    const m = match({
      gameScores: [
        { gameNumber: 1, team1Score: 21, team2Score: 18, winnerId: 'p1' },
        { gameNumber: 2, team1Score: 14, team2Score: 21, winnerId: 'p2' },
        { gameNumber: 3, team1Score: 18, team2Score: 16 },
      ],
    });
    expect(gamesWon(m)).toEqual({ one: 1, two: 1 });
  });

  it('ignores the game in progress', () => {
    const m = match({ gameScores: [{ gameNumber: 1, team1Score: 18, team2Score: 16 }] });
    expect(gamesWon(m)).toEqual({ one: 0, two: 0 });
  });
});

describe('rallyFrom', () => {
  const prev = [{ gameNumber: 3, team1Score: 17, team2Score: 16 }];

  it('attributes the point to whichever side went up', () => {
    const r = rallyFrom(prev, [{ gameNumber: 3, team1Score: 18, team2Score: 16 }]);
    expect(r).toEqual({ side: 1, gameNumber: 3, team1Score: 18, team2Score: 16 });
  });

  it('attributes a point to side two', () => {
    const r = rallyFrom(prev, [{ gameNumber: 3, team1Score: 17, team2Score: 17 }]);
    expect(r?.side).toBe(2);
  });

  it('reports nothing when the score is unchanged', () => {
    expect(rallyFrom(prev, prev)).toBeNull();
  });

  it('reports nothing on a correction that takes a point away', () => {
    // The organiser can undo; that is not a rally won.
    expect(rallyFrom(prev, [{ gameNumber: 3, team1Score: 16, team2Score: 16 }])).toBeNull();
  });

  it('attributes the first point of a new game', () => {
    const r = rallyFrom(
      [{ gameNumber: 1, team1Score: 21, team2Score: 18, winnerId: 'p1' }],
      [
        { gameNumber: 1, team1Score: 21, team2Score: 18, winnerId: 'p1' },
        { gameNumber: 2, team1Score: 0, team2Score: 1 },
      ]
    );
    expect(r).toEqual({ side: 2, gameNumber: 2, team1Score: 0, team2Score: 1 });
  });

  it('reports nothing when there is no previous state to compare', () => {
    expect(rallyFrom([], [{ gameNumber: 1, team1Score: 1, team2Score: 0 }])).toBeNull();
  });
});

describe('matchLine', () => {
  it('names the decider when the games are level', () => {
    const m = match({
      gameScores: [
        { gameNumber: 1, team1Score: 21, team2Score: 18, winnerId: 'p1' },
        { gameNumber: 2, team1Score: 14, team2Score: 21, winnerId: 'p2' },
        { gameNumber: 3, team1Score: 18, team2Score: 16 },
      ],
    });
    expect(matchLine(m)).toBe('Game 3 · decider');
  });

  it('names the game plainly when it is not a decider', () => {
    const m = match({ gameScores: [{ gameNumber: 1, team1Score: 5, team2Score: 3 }] });
    expect(matchLine(m)).toBe('Game 1');
  });

  it('says the match is over once it is completed', () => {
    const m = match({ status: 'completed', gameScores: [{ gameNumber: 1, team1Score: 21, team2Score: 18, winnerId: 'p1' }] });
    expect(matchLine(m)).toBe('Match complete');
  });

  it('says play has not started before the first game', () => {
    expect(matchLine(match({ status: 'scheduled' }))).toBe('Not started');
  });
});
