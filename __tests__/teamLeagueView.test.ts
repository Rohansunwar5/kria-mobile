import { aggregateOverall, detectChampion, tieSubScore, subMatchView } from '@/lib/teamLeagueView';

const entry = (teamId: string, teamName: string, o: Partial<any> = {}) => ({
  teamId, teamName,
  played: o.played ?? 0, won: o.won ?? 0, lost: o.lost ?? 0, drawn: o.drawn ?? 0,
  points: o.points ?? 0, subMatchesWon: o.subMatchesWon ?? 0, subMatchesLost: o.subMatchesLost ?? 0,
});

describe('teamLeagueView helpers', () => {
  it('aggregateOverall sums per team across stages and sorts by points then SM diff', () => {
    const stage1 = [{ group: { _id: 'g1', groupName: 'A' }, completedTies: 0, totalTies: 0, standings: [
      entry('t1', 'Smashers', { played: 2, won: 2, points: 4, subMatchesWon: 6, subMatchesLost: 2 }),
      entry('t2', 'Rallyers', { played: 2, won: 1, points: 2, subMatchesWon: 4, subMatchesLost: 4 }),
    ] }];
    const stage2 = [{ group: { _id: 'g2', groupName: 'Final' }, completedTies: 0, totalTies: 0, standings: [
      entry('t1', 'Smashers', { played: 1, won: 0, points: 0, subMatchesWon: 1, subMatchesLost: 3 }),
      entry('t2', 'Rallyers', { played: 1, won: 1, points: 2, subMatchesWon: 3, subMatchesLost: 1 }),
    ] }];
    const out = aggregateOverall([stage1, stage2]);
    expect(out).toHaveLength(2);
    // t1: 4pts, t2: 4pts -> tie on points; SM diff t1=(7-5)=2, t2=(7-5)=2 -> stable; both 4 pts
    expect(out[0].points).toBe(4);
    expect(out.find((e) => e.teamId === 't1')!.subMatchesWon).toBe(7);
    expect(out.find((e) => e.teamId === 't2')!.played).toBe(3);
  });

  it('aggregateOverall orders higher points first', () => {
    const s = [{ group: { _id: 'g', groupName: 'A' }, completedTies: 0, totalTies: 0, standings: [
      entry('low', 'Low', { points: 2 }),
      entry('high', 'High', { points: 6 }),
    ] }];
    const out = aggregateOverall([s]);
    expect(out[0].teamId).toBe('high');
  });

  it('detectChampion returns top of a complete 2-team final group', () => {
    const standings = [{ group: { _id: 'g', groupName: 'Final' }, completedTies: 1, totalTies: 1, standings: [
      entry('w', 'Winner', { points: 2 }), entry('r', 'Runner', { points: 0 }),
    ] }];
    expect(detectChampion(standings)?.teamId).toBe('w');
  });

  it('detectChampion returns null when ties incomplete', () => {
    const standings = [{ group: { _id: 'g', groupName: 'Final' }, completedTies: 0, totalTies: 1, standings: [
      entry('w', 'Winner'), entry('r', 'Runner'),
    ] }];
    expect(detectChampion(standings)).toBeNull();
  });

  it('detectChampion returns null when not a final (multiple groups)', () => {
    const standings = [
      { group: { _id: 'g1', groupName: 'A' }, completedTies: 1, totalTies: 1, standings: [entry('a', 'A1'), entry('b', 'B1')] },
      { group: { _id: 'g2', groupName: 'B' }, completedTies: 1, totalTies: 1, standings: [entry('c', 'C1'), entry('d', 'D1')] },
    ];
    expect(detectChampion(standings)).toBeNull();
  });

  it('detectChampion returns null for empty input', () => {
    expect(detectChampion([])).toBeNull();
  });

  it('tieSubScore counts completed sub-match wins per team', () => {
    const subs: any[] = [
      { status: 'completed', winnerId: 't1' },
      { status: 'completed', winnerId: 't1' },
      { status: 'completed', winnerId: 't2' },
      { status: 'scheduled', winnerId: undefined },
    ];
    expect(tieSubScore(subs, 't1', 't2')).toEqual({ t1: 2, t2: 1, hasScore: true });
    expect(tieSubScore([], 't1', 't2')).toEqual({ t1: 0, t2: 0, hasScore: false });
  });

  it('subMatchView flags winner and formats game scores when done', () => {
    const sm: any = {
      status: 'completed', winnerId: 'teamA',
      player1: { name: 'P1', teamId: 'teamA' }, player2: { name: 'P2', teamId: 'teamB' },
      gameScores: [{ team1Score: 21, team2Score: 15 }, { team1Score: 21, team2Score: 18 }],
    };
    const v = subMatchView(sm);
    expect(v.done).toBe(true);
    expect(v.p1Wins).toBe(true);
    expect(v.p2Wins).toBe(false);
    expect(v.gameScores).toEqual(['21–15', '21–18']);
  });

  it('subMatchView returns empty scores when not done', () => {
    const sm: any = { status: 'scheduled', gameScores: [{ team1Score: 0, team2Score: 0 }] };
    const v = subMatchView(sm);
    expect(v.done).toBe(false);
    expect(v.p1Wins).toBe(false);
    expect(v.gameScores).toEqual([]);
  });
});
