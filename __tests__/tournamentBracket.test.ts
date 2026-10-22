import type { Match } from '@/api/match';
import { bracketColumns, champion, isMine, liveRound, myNextMatch, nextMatchLabel, nextMatchView, sideName } from '@/lib/tournamentBracket';

const P = (id: string, name: string) => ({ registrationId: id, name, teamId: '', teamName: '' });
const TBD = P('TBD', 'TBD');
const mk = (o: Partial<Match>): Match => ({ _id: 'x', tournamentId: 't', categoryId: 'c', sportType: 'badminton', bracketRound: 'Semi-Final', matchNumber: 1, roundNumber: 1, positionInRound: 0, teams: { team1Id: '', team2Id: '', team1Name: '', team2Name: '' }, status: 'scheduled', gameScores: [], ...o }) as Match;
const g = (a: number, b: number, n = 1) => ({ gameNumber: n, team1Score: a, team2Score: b });
const cfg = { bestOf: 3, pointsToWin: 21 };
const me = { registrationIds: ['r1'] };

const sf1 = mk({ _id: 'sf1', player1: P('r1', 'Asha'), player2: P('r2', 'Bina'), status: 'completed', winnerId: 'r1', gameScores: [g(21, 15), g(21, 18, 2)], nextMatchId: 'f', nextMatchSlot: 'player1', matchConfig: cfg });
const sf2 = mk({ _id: 'sf2', positionInRound: 1, matchNumber: 2, player1: P('r3', 'Cara'), player2: P('r4', 'Dev'), status: 'scheduled', schedule: { date: '2026-10-20T12:00:00', time: '4:30 PM', court: '1' }, nextMatchId: 'f', nextMatchSlot: 'player2', matchConfig: cfg });
const fin = mk({ _id: 'f', bracketRound: 'Final', roundNumber: 2, positionInRound: 0, matchNumber: 3, player1: TBD, player2: TBD, matchConfig: cfg });
const all = [fin, sf2, sf1];
const card = (ms: Match[], round: number, pos = 0) => bracketColumns(ms, me)[round].cards[pos];

test('columns are rounds in order with lower-case titles', () => {
  expect(bracketColumns(all, me).map((c) => c.title)).toEqual(['Semi-final', 'Final']);
});
test('a finished semi shows its games, winner strong', () => {
  const c = card(all, 0);
  expect(c.header).toBe('SF 1 · Final score');
  expect(c.rows[0].scores.map((s) => s.v)).toEqual(['21', '21']);
  expect(c.rows[0].scores.every((s) => s.strong)).toBe(true);
  expect(c.rows[1].scores.some((s) => s.strong)).toBe(false);
  expect(c.rows[0].won).toBe(true);
  expect(c.rows[1].lost).toBe(true);
  expect(c.openId).toBe('sf1');
});
test('an unfilled final names its feeders', () => {
  const c = card(all, 1);
  expect(c.rows.map((r) => r.name)).toEqual(['Winner of SF 1', 'Winner of SF 2']);
  expect(c.rows.every((r) => r.open)).toBe(true);
  expect(c.header).toMatch(/^Final/);
});
test('a live match says Live and its court', () => {
  const live = { ...sf2, status: 'in_progress' as const, schedule: { court: '2' } };
  const c = card([fin, live, sf1], 0, 1);
  expect(c.header).toBe('SF 2 · Live · Court 2');
  expect(c.live).toBe(true);
  expect(c.openId).toBe('sf2');
});
test('a scheduled match shows time and court', () => {
  const c = card(all, 0, 1);
  expect(c.header).toBe('SF 2 · 4:30 PM · Court 1');
  expect(c.openId).toBeUndefined();
});
test('a bye reads Bye', () => {
  const bye = mk({ _id: 'b', bracketRound: 'Round of 8', player1: P('r1', 'Asha'), player2: TBD, status: 'walkover', winReason: 'bye', winnerId: 'r1' });
  const c = card([bye], 0);
  expect(c.header).toMatch(/· Bye$/);
  expect(c.rows[1].name).toBe('Bye');
});
// The server's team generator names the empty side 'BYE' (knockoutTeam.ts).
test('a team bye reads Bye, open, not a lost row', () => {
  const bye = mk({ _id: 'tb', bracketRound: 'Round of 8', competitorType: 'team', teams: { team1Id: 'T1', team2Id: 'TBD', team1Name: 'Lions', team2Name: 'BYE' }, status: 'walkover', winReason: 'bye', winnerId: 'T1' });
  const c = card([bye], 0);
  expect(c.rows[0]).toMatchObject({ name: 'Lions', won: true });
  expect(c.rows[1]).toMatchObject({ name: 'Bye', open: true, lost: false });
});
test('my matches are marked by registration or team', () => {
  expect(card(all, 0).mine).toBe(true);
  expect(card(all, 0, 1).mine).toBe(false);
  const tm = mk({ competitorType: 'team', teams: { team1Id: 'T1', team2Id: 'T2', team1Name: 'Lions', team2Name: 'Tigers' } });
  expect(isMine(tm, { registrationIds: [], teamId: 'T2' })).toBe(true);
  expect(isMine(tm, { registrationIds: [], teamId: 'T9' })).toBe(false);
});
test('cricket shows innings summaries', () => {
  const cm = mk({ competitorType: 'team', sportType: 'cricket', teams: { team1Id: 'T1', team2Id: 'T2', team1Name: 'Lions', team2Name: 'Tigers' }, matchConfig: { maxOvers: 20 }, status: 'completed', winnerId: 'T1', result: { team1Summary: '142/6 (20)', team2Summary: '120/9 (20)' } });
  const c = card([cm], 0);
  expect(c.rows[0].scores).toEqual([{ v: '142/6 (20)', strong: true }]);
  expect(c.rows[1].scores).toEqual([{ v: '120/9 (20)', strong: false }]);
  expect(c.rows.map((r) => r.name)).toEqual(['Lions', 'Tigers']);
  expect(sideName(cm, 2)).toBe('Tigers');
});
test('myNextMatch prefers live, then earliest scheduled', () => {
  const mineSf2 = { ...sf2, player1: P('r1', 'Asha') };
  const mineFin = { ...fin, player1: P('r1', 'Asha') };
  expect(myNextMatch([mineFin, mineSf2], me)?._id).toBe('sf2');
  expect(myNextMatch([mineFin, { ...mineSf2, status: 'in_progress' }], me)?._id).toBe('sf2');
  expect(myNextMatch([mineFin, { ...mineSf2, status: 'scheduled' }, mk({ _id: 'lv', roundNumber: 3, player1: P('r1', 'Asha'), status: 'in_progress' })], me)?._id).toBe('lv');
  expect(myNextMatch([sf1], me)).toBeUndefined();
});
test('nextMatchLabel', () => {
  expect(nextMatchLabel(sf2)).toBe('Your semi-final · 4:30 PM');
  expect(nextMatchLabel(fin)).toBe('Your final');
});
test('nextMatchView', () => {
  const m = { ...sf1, status: 'scheduled' as const, schedule: { date: '2026-10-20T12:00:00', time: '4:30 PM', court: '1' } };
  expect(nextMatchView(m, me)).toEqual({ header: 'Your next match · Semi-final 1', court: 'Court 1', sides: [{ name: 'Asha' }, { name: 'Bina' }], when: 'Tue 20 Oct · 4:30 PM · Best of 3 to 21' });
  expect(nextMatchView(fin, me).header).toBe('Your next match · Final');
  const mineFin = { ...fin, player1: P('r1', 'Asha') };
  expect(nextMatchView(mineFin, me, [mineFin, sf2]).sides.map((s) => s.name)).toEqual(['Asha', 'Winner of SF 2']);
});
test('a match without gameScores still maps', () => {
  const bare = { ...sf1, gameScores: undefined } as unknown as Match;
  expect(card([bare], 0).rows[0].scores).toEqual([]);
});
test('liveRound', () => {
  expect(liveRound([sf1, { ...sf2, status: 'in_progress' }])).toBe('Semi-Final');
  expect(liveRound(all)).toBeUndefined();
});
test('champion', () => {
  expect(champion(all)).toBeUndefined();
  expect(champion([sf1, { ...fin, player1: P('r1', 'Asha'), player2: P('r3', 'Cara'), status: 'completed', winnerId: 'r1' }])).toBe('Asha');
  const tf = mk({ bracketRound: 'Final', competitorType: 'team', teams: { team1Id: 'T1', team2Id: 'T2', team1Name: 'Lions', team2Name: 'Tigers' }, status: 'completed', winnerId: 'T2' });
  expect(champion([tf])).toBe('Tigers');
});
