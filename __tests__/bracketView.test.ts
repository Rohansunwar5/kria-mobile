import { getCompetitors, visibleRounds, sortedRoundNames, leagueStandings } from '@/lib/bracketView';
import { Match } from '@/api/match';

const baseMatch = (over: Partial<Match>): Match => ({
  _id: 'm', tournamentId: 't', categoryId: 'c', sportType: 'badminton',
  bracketRound: 'R1', matchNumber: 1,
  teams: { team1Id: '', team2Id: '', team1Name: '', team2Name: '' },
  status: 'scheduled', gameScores: [], ...over,
} as Match);

describe('getCompetitors', () => {
  it('extracts player competitors with team name, score and winner', () => {
    const m = baseMatch({
      status: 'completed', winnerId: 'p1',
      player1: { registrationId: 'p1', name: 'Alice', teamId: 't1', teamName: 'Red' },
      player2: { registrationId: 'p2', name: 'Bob', teamId: 't2', teamName: 'Blue' },
      result: { team1Total: 2, team2Total: 1 },
    });
    const { c1, c2 } = getCompetitors(m, 'player');
    expect(c1.name).toBe('Alice');
    expect(c1.teamName).toBe('Red');
    expect(c1.score).toBe(2);
    expect(c1.isWinner).toBe(true);
    expect(c2.isWinner).toBe(false);
  });

  it('extracts team competitors from the teams field', () => {
    const m = baseMatch({ teams: { team1Id: 'A', team2Id: 'B', team1Name: 'Alpha', team2Name: 'Beta' } });
    const { c1, c2 } = getCompetitors(m, 'team');
    expect(c1.name).toBe('Alpha');
    expect(c2.name).toBe('Beta');
    expect(c1.teamName).toBe('');
  });

  it('flags TBD and BYE', () => {
    const m = baseMatch({ teams: { team1Id: '', team2Id: '', team1Name: 'TBD', team2Name: 'BYE' } });
    const { c1, c2 } = getCompetitors(m, 'team');
    expect(c1.isTBD).toBe(true);
    expect(c2.isBye).toBe(true);
  });

  it('does not mark a winner while the match is not done', () => {
    const m = baseMatch({
      status: 'in_progress', winnerId: 'p1',
      player1: { registrationId: 'p1', name: 'A', teamId: '', teamName: '' },
    });
    expect(getCompetitors(m, 'player').c1.isWinner).toBe(false);
  });
});

describe('visibleRounds / sortedRoundNames', () => {
  it('orders rounds by roundNumber and matches by positionInRound', () => {
    const rounds = {
      Final: [baseMatch({ _id: 'f', roundNumber: 2, positionInRound: 0 })],
      Semi: [
        baseMatch({ _id: 's2', roundNumber: 1, positionInRound: 1 }),
        baseMatch({ _id: 's1', roundNumber: 1, positionInRound: 0 }),
      ],
    };
    const vis = visibleRounds(rounds);
    expect(vis.map((r) => r.name)).toEqual(['Semi', 'Final']);
    expect(vis[0].matches.map((m) => m._id)).toEqual(['s1', 's2']);
    expect(sortedRoundNames(rounds)).toEqual(['Semi', 'Final']);
  });

  it('drops rounds that are entirely bye walkovers', () => {
    const rounds = {
      R1: [baseMatch({ _id: 'b', roundNumber: 1, status: 'walkover', winReason: 'bye' })],
      R2: [baseMatch({ _id: 'r', roundNumber: 2 })],
    };
    expect(visibleRounds(rounds).map((r) => r.name)).toEqual(['R2']);
  });
});

describe('leagueStandings', () => {
  it('tallies points (2 per win) and orders by points then wins', () => {
    const matches = [
      baseMatch({ _id: 'm1', status: 'completed', winnerId: 'A', teams: { team1Id: 'A', team2Id: 'B', team1Name: 'A', team2Name: 'B' } }),
      baseMatch({ _id: 'm2', status: 'completed', winnerId: 'A', teams: { team1Id: 'A', team2Id: 'C', team1Name: 'A', team2Name: 'C' } }),
      baseMatch({ _id: 'm3', status: 'completed', winnerId: 'B', teams: { team1Id: 'B', team2Id: 'C', team1Name: 'B', team2Name: 'C' } }),
    ];
    const s = leagueStandings(matches, 'team');
    expect(s[0].id).toBe('A');
    expect(s[0].points).toBe(4);
    expect(s[0].won).toBe(2);
    expect(s[1].id).toBe('B');
    expect(s[1].points).toBe(2);
  });

  it('ignores non-completed matches in the tally', () => {
    const matches = [
      baseMatch({ _id: 'm1', status: 'scheduled', teams: { team1Id: 'A', team2Id: 'B', team1Name: 'A', team2Name: 'B' } }),
    ];
    expect(leagueStandings(matches, 'team').every((row) => row.played === 0)).toBe(true);
  });
});
