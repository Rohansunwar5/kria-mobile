import { comingUp, emptyCopy, playerTable, resultRows, ruleLine, teamLeagueTable, teamTable, tieRow, tieView, tableKind } from '@/lib/standingsView';

const cat = (o: any = {}) => ({ _id: 'c', tournamentId: 't', name: 'n', status: 'ongoing', registrationFee: 0, isPaidRegistration: false, ...o });
const tm = (n: number, a: string, b: string, o: any = {}) => ({
  _id: `m${n}`, matchNumber: n, bracketRound: 'League', status: 'completed', gameScores: [],
  teams: { team1Id: a, team2Id: b, team1Name: a, team2Name: b }, ...o,
});
const reg = (id: string, name: string) => ({ registrationId: id, name, teamId: '', teamName: '' });

test('tableKind', () => {
  expect(tableKind(cat({ bracketType: 'team_league' }))).toBe('teamLeague');
  expect(tableKind(cat({ sport: 'cricket', bracketType: 'knockout' }))).toBe('teams');
  expect(tableKind(cat({ sport: 'badminton', matchType: 'team' }))).toBe('teams');
  expect(tableKind(cat({ sport: 'badminton', matchType: 'singles' }))).toBe('players');
});

test('playerTable', () => {
  const rows = playerTable([{ _id: 'r1', playerName: 'Asha', matchesPlayed: 3, matchesWon: 2, totalPointsScored: 120, rank: 1 }], ['r1']);
  expect(rows[0]).toMatchObject({ rank: 1, p: 3, w: 2, l: 1, pts: 120, mine: true, name: 'Asha' });
});

test('teamTable', () => {
  const rows = teamTable(
    [tm(1, 'A', 'B', { winnerId: 'A' }), tm(2, 'B', 'C', { winnerId: 'B' }), tm(3, 'A', 'C', { winReason: 'draw' }), tm(4, 'A', 'B', { status: 'scheduled' })] as any,
    'B',
  );
  expect(rows.map((r) => [r.name, r.rank, r.p, r.w, r.l, r.d ?? 0, r.mine])).toEqual([
    ['A', 1, 2, 1, 0, 1, false],
    ['B', 2, 2, 1, 1, 0, true],
    ['C', 3, 2, 0, 1, 1, false],
  ]);
});

// Live cricket completes a tie with no winnerId and winReason 'by_score'.
test('teamTable counts a tied cricket match as drawn for both', () => {
  const rows = teamTable([tm(1, 'A', 'B', { winReason: 'by_score', matchConfig: { maxOvers: 20 } }), tm(2, 'A', 'C', { winnerId: 'A', winReason: 'tie' })] as any);
  expect(rows.map((r) => [r.name, r.p, r.w, r.l, r.d])).toEqual([
    ['A', 2, 0, 0, 2],
    ['B', 1, 0, 0, 1],
    ['C', 1, 0, 0, 1],
  ]);
});

test('teamLeagueTable', () => {
  const s: any = { standings: [
    { teamId: 'x', teamName: 'X', played: 2, won: 1, lost: 0, drawn: 1, points: 3 },
    { teamId: 'y', teamName: 'Y', played: 2, won: 0, lost: 1, drawn: 1, points: 1 },
  ] };
  const rows = teamLeagueTable(s, 'y');
  expect(rows[1]).toMatchObject({ rank: 2, name: 'Y', p: 2, w: 0, l: 1, d: 1, pts: 1, mine: true });
  expect(rows[0].mine).toBe(false);
});

test('ruleLine', () => {
  expect(ruleLine(cat(), 'players')).toBe('Ranked by points scored, then point difference');
  expect(ruleLine(cat(), 'teams')).toBe('Ranked by wins');
  expect(ruleLine(cat({ teamLeagueConfig: { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 } }), 'teamLeague')).toBe('Win 3 · Draw 1 · Loss 0 points');
  expect(ruleLine(cat(), 'teamLeague')).toBe('Win 2 · Draw 1 · Loss 0 points');
});

test('resultRows', () => {
  const b: any = { _id: 'b', matchNumber: 1, bracketRound: 'League', status: 'completed', teams: {}, player1: reg('r1', 'P1'), player2: reg('r2', 'P2'),
    winnerId: 'r2', gameScores: [{ team1Score: 14, team2Score: 21 }, { team1Score: 17, team2Score: 21 }], schedule: { court: '2' } };
  expect(resultRows([b])[0]).toEqual({ key: 'b', winner: 'P2', loser: 'P1', score: '21-14, 21-17', meta: 'League · Court 2' });
  const c: any = tm(2, 'A', 'B', { winnerId: 'A', gameScores: undefined, matchConfig: { maxOvers: 20 }, result: { team1Summary: '142/6 (20)', team2Summary: '120/9 (20)' } });
  expect(resultRows([c])[0]).toMatchObject({ winner: 'A', loser: 'B', score: '142/6 (20) v 120/9 (20)', meta: 'League' });
});

test('resultRows newest first', () => {
  const r = resultRows([tm(1, 'A', 'B', { winnerId: 'A', schedule: { date: '2026-10-19T12:00:00' } }), tm(2, 'A', 'B', { winnerId: 'A', schedule: { date: '2026-10-20T12:00:00' } })] as any);
  expect(r.map((x) => x.key)).toEqual(['m2', 'm1']);
});

test('comingUp', () => {
  const r = comingUp([
    tm(2, 'C', 'D', { status: 'scheduled', schedule: { date: '2026-10-21T12:00:00', time: '9:00 AM' } }),
    tm(1, 'A', 'B', { status: 'scheduled', schedule: { date: '2026-10-20T12:00:00', time: '4:30 PM' } }),
    tm(3, 'E', 'F'),
  ] as any);
  expect(r).toEqual([
    { key: 'm1', a: 'A', b: 'B', meta: 'Tue 20 Oct · 4:30 PM' },
    { key: 'm2', a: 'C', b: 'D', meta: 'Wed 21 Oct · 9:00 AM' },
  ]);
});

test('tieRow', () => {
  const t: any = { _id: 't', teams: { team1Name: 'A', team2Name: 'B' }, status: 'completed', team1SubWins: 3, team2SubWins: 2, completedCount: 5, subMatchCount: 5 };
  expect(tieRow(t)).toEqual({ key: 't', a: 'A', b: 'B', score: '3–2', status: 'Final' });
  expect(tieRow({ ...t, status: 'in_progress', completedCount: 2 }).status).toBe('Live');
  expect(tieRow({ ...t, status: 'scheduled', completedCount: 0, team1SubWins: undefined, team2SubWins: undefined })).toMatchObject({ score: '0–0', status: '0 of 5 played' });
});

test('resultRows draw', () => {
  const r = resultRows([tm(1, 'A', 'B', { winReason: 'draw', matchConfig: { maxOvers: 20 }, result: { team1Summary: '100/5 (20)', team2Summary: '100/7 (20)' } })] as any);
  expect(r[0]).toMatchObject({ draw: true, winner: 'A', loser: 'B', score: '100/5 (20) v 100/7 (20)' });
});

test('resultRows: a tied cricket match reads tied, not a win', () => {
  const r = resultRows([tm(1, 'A', 'B', { winReason: 'by_score', matchConfig: { maxOvers: 20 }, result: { team1Summary: '150/8 (20)', team2Summary: '150/6 (20)' } })] as any);
  expect(r[0]).toMatchObject({ draw: true, tie: true, winner: 'A', loser: 'B', score: '150/8 (20) v 150/6 (20)' });
  const badminton = resultRows([tm(2, 'A', 'B', { winReason: 'draw' })] as any)[0];
  expect(badminton.draw).toBe(true);
  expect(badminton.tie).toBeUndefined();
});

test('tieRow is live while a sub-match is', () => {
  const t: any = { _id: 't', teams: { team1Name: 'A', team2Name: 'B' }, status: 'scheduled', completedCount: 1, subMatchCount: 5, subMatches: [{ status: 'completed' }, { status: 'in_progress' }] };
  expect(tieRow(t).status).toBe('Live');
});

test('emptyCopy', () => {
  expect(emptyCopy('registration')[0]).toBe('Draw after entries close');
  expect(emptyCopy('auction')[0]).toBe('Draw after the auction');
  expect(emptyCopy('ongoing')[0]).toBe('No matches yet');
});

test('tieView', () => {
  const v = tieView({
    tie: { _id: 't', teams: { team1Id: 'A', team1Name: 'A', team2Id: 'B', team2Name: 'B' }, status: 'completed' },
    subMatches: [
      { _id: 's2', subMatchSlotNumber: 2, status: 'completed', winnerId: 'A', player1: { name: 'C & D', teamId: 'A' }, gameScores: [{ team1Score: 21, team2Score: 19 }] },
      { _id: 's1', subMatchSlotNumber: 1, slotLabel: 'Singles', status: 'completed', winnerId: 'B' },
    ],
    lineups: [{ _id: 'l', teamId: 'B', assignments: [{ slotNumber: 2, playerNames: ['E', 'F'] }] }],
  } as any);
  expect(v.score).toBe('1–1');
  expect(v.status).toBe('Final · 2 of 2 played');
  expect(v.subs.map((s) => s.slot)).toEqual(['Singles', 'Slot 2']);
  expect(v.subs[1].sides.map((s) => [s.name, s.won, s.lost, s.games.map((g) => `${g.v}${g.strong ? '*' : ''}`).join()])).toEqual([
    ['C & D', true, false, '21*'],
    ['E / F', false, true, '19'],
  ]);
  expect(v.subs[0].sides[0].name).toBe('Not named yet');
});

// The server's tie list counts a sub-win by team id or by the player's registration id.
test('tieView counts a sub-win recorded by registration id', () => {
  const v = tieView({
    tie: { _id: 't', teams: { team1Id: 'A', team1Name: 'A', team2Id: 'B', team2Name: 'B' }, status: 'completed' },
    subMatches: [
      { _id: 's1', subMatchSlotNumber: 1, status: 'completed', winnerId: 'A' },
      { _id: 's2', subMatchSlotNumber: 2, status: 'completed', winnerId: 'r1', player1: { name: 'C', teamId: 'A', registrationId: 'r1' }, player2: { name: 'E', teamId: 'B', registrationId: 'r2' } },
      { _id: 's3', subMatchSlotNumber: 3, status: 'completed', winnerId: 'r4', player1: { name: 'D', teamId: 'A', registrationId: 'r3' }, player2: { name: 'F', teamId: 'B', registrationId: 'r4' } },
    ],
    lineups: [],
  } as any);
  expect(v.score).toBe('2–1');
  expect(v.subs[1].sides.map((s) => [s.won, s.lost])).toEqual([[true, false], [false, true]]);
  expect(v.subs[2].sides.map((s) => [s.won, s.lost])).toEqual([[false, true], [true, false]]);
});
