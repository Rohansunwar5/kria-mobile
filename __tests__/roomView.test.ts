import type { QuickMatch } from '../src/api/quickMatch';
import { buildBody, buildKnockoutBody, initialForm, namesReady, pickKind, pickSport, reviewRows, setSpot } from '../src/lib/hostMatch';
import { resultSummary, roster, swipeDelta, waitingNote } from '../src/lib/roomView';

const host = { playerId: 'h', name: 'Aarav Menon' };

it('scores only a swipe past 28px; a tap does nothing', () => {
  expect([swipeDelta(-29), swipeDelta(-28), swipeDelta(0), swipeDelta(28), swipeDelta(29)]).toEqual([1, 0, 0, 0, -1]);
});

describe('hostMatch', () => {
  it('builds doubles with the host first, named spots, players and Player N placeholders', () => {
    let f = { ...initialForm('badminton'), doubles: true, sideA: ' Smash Bros ', sideB: 'Net Gains' };
    f = setSpot(f, 1, 0, { playerId: 'n', name: 'Nikhil Shetty' });
    f = setSpot(f, 1, 1, { name: 'Sameer' });
    expect(buildBody(f, host)).toEqual({
      sport: 'badminton',
      sides: [
        { name: 'Smash Bros', slots: [{ playerId: 'h', displayName: 'Aarav Menon' }, { displayName: 'Player 2' }] },
        { name: 'Net Gains', slots: [{ playerId: 'n', displayName: 'Nikhil Shetty' }, { displayName: 'Sameer' }] },
      ],
      matchConfig: { bestOf: 3, pointsToWin: 21 },
      waitForPlayers: true,
    });
    // Sameer is a guest name, still claimable: only Kria players are "taken".
    expect(reviewRows(f, host, "Aarav's Knockout").find((r) => r.key === 'Open spots')?.value).toBe('2 to be claimed');
  });

  it('sends cricket as squads with the bowler cap never above the overs', () => {
    const f = { ...initialForm('cricket'), players: 3, overs: 2, perBowler: 4, sideA: 'A', sideB: 'B' };
    const body = buildBody(f, host);
    expect(body.matchConfig).toEqual({ maxOvers: 2, maxOversPerBowler: 2, playersPerTeam: 3 });
    expect(body.sides[1].slots.map((s) => s.displayName)).toEqual(['Player 1', 'Player 2', 'Player 3']);
  });

  it('builds a knockout the way its validator takes it, one game a match by default', () => {
    const rally = pickKind({ ...initialForm('badminton'), doubles: true }, 'knockout');
    expect(rally.bestOf).toBe(1);
    expect(buildKnockoutBody(rally)).toEqual({ sport: 'badminton', format: 'doubles', matchConfig: { bestOf: 1, pointsToWin: 21 } });
    expect(buildKnockoutBody({ ...rally, name: ' Sunday Smash ' })).toMatchObject({ name: 'Sunday Smash' });

    const cricket = { ...pickKind(initialForm('cricket'), 'knockout'), players: 7, overs: 6, teams: 6 };
    expect(buildKnockoutBody(cricket)).toEqual({ sport: 'cricket', matchConfig: { maxOvers: 6, playersPerTeam: 7 }, teamCount: 6 });
    // No side names to give, and the review falls back to the server's default name.
    expect(namesReady(cricket)).toBe(true);
    expect(reviewRows(cricket, host, "Aarav's Knockout").map((r) => r.value)).toEqual(['Cricket', 'Knockout', '7 a side · 6 overs · 6 teams', "Aarav's Knockout"]);
  });

  it("resets to the new rally sport's own format", () => {
    expect(pickSport({ ...initialForm('badminton'), pointsToWin: 15 }, 'table_tennis')).toMatchObject({ sport: 'table_tennis', pointsToWin: 11 });
  });
});

describe('roomView', () => {
  const m = (over: Partial<QuickMatch> = {}): QuickMatch => ({
    _id: 'm', hostId: 'h', sport: 'badminton', joinCode: 'K7QX2M', status: 'waiting', createdAt: '',
    sides: [
      { sideId: 'a', name: 'Smash Bros', slots: [{ slotId: '1', playerId: 'h', displayName: 'Aarav Menon' }, { slotId: '2', playerId: 'k', displayName: 'Kabir Rao' }] },
      { sideId: 'b', name: 'Net Gains', slots: [{ slotId: '3', playerId: 'n', displayName: 'Nikhil Shetty' }, { slotId: '4', displayName: 'Sameer' }] },
    ],
    ...over,
  });

  it('lets only the host remove, never the host themself, never in a knockout', () => {
    const removable = (match: QuickMatch, viewer: string) => roster(match, viewer).flatMap((s) => s.slots).filter((s) => s.removable).map((s) => s.name);
    expect(removable(m(), 'h')).toEqual(['Kabir Rao', 'Nikhil Shetty']);
    expect(removable(m(), 'k')).toEqual([]);
    expect(removable(m({ knockoutId: 'x' }), 'h')).toEqual([]);
    expect(roster(m(), 'h')[1]).toMatchObject({ count: '1 of 2 claimed' });
  });

  it('tells a joined player who they are waiting for', () => {
    expect(waitingNote(m(), 'k')).toBe('Waiting for Aarav Menon to start the match.');
    expect(waitingNote(m(), 'h')).toMatch(/Unclaimed spots play as guests/);
  });

  it('credits only claimed players and names the guest spot', () => {
    const games = [{ gameNumber: 1, side1Score: 21, side2Score: 17, winnerSideId: 'a' }, { gameNumber: 2, side1Score: 21, side2Score: 9, winnerSideId: 'a' }];
    expect(resultSummary(m({ status: 'completed', outcome: 'side1', gameScores: games }))).toEqual({
      headline: 'Smash Bros win 2–0',
      note: "Result added to the careers of the 3 claimed players. Sameer's guest spot earns nothing.",
    });
  });
});
