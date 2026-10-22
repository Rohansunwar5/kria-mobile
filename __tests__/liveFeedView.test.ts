import { feedRows } from '@/lib/liveFeedView';
import type { LiveItem } from '@/api/live';
import type { CricketMatch, LiveState } from '@/api/cricketMatch';

const base = { startedAt: '', tournamentId: 't', categoryId: 'c' };
const bad = (o: object = {}): LiveItem => ({ ...base, kind: 'tournament', matchId: 'm1', sport: 'badminton', title: 'Rohit Kulkarni vs Karthik Nair', scoreline: '18-21, 11-7', tournamentName: 'Arohance', categoryName: '', round: 'Quarter-Final', ...o }) as LiveItem;
const cri: LiveItem = { ...base, kind: 'tournament', matchId: 'm2', sport: 'cricket', title: 'Titans SC vs Rawnat United', tournamentName: 'T10', categoryName: 'League', round: 'League' };
const match = { teams: { team1Id: 'a', team2Id: 'b', team1Name: 'Titans SC', team2Name: 'Rawnat United' }, matchConfig: { maxOvers: 10 } } as CricketMatch;
const live = { runs: 87, wickets: 3, completedOvers: 6, ballsInCurrentOver: 2, currentInnings: 2, target: 119, battingTeamId: 'b', innings1Summary: { runs: 118, wickets: 6, completedOvers: 10, ballsInCurrentOver: 0 } } as LiveState;

describe('feedRows', () => {
  it('badminton row', () => {
    const r = feedRows([bad()], {}).tournament[0];
    expect(r.meta).toBe('Arohance · Quarter-final');
    expect(r.sides).toEqual(['Rohit Kulkarni', 'Karthik Nair']);
    expect(r.badminton!.games).toHaveLength(2);
    expect(r.sub).toBe('Game 2');
  });
  it('team league round', () => {
    expect(feedRows([bad({ round: 'S1-GroupA-T3' })], {}).tournament[0].meta.endsWith('Team league')).toBe(true);
  });
  it('cricket with enrichment', () => {
    const r = feedRows([cri], { m2: { live, match } }).tournament[0];
    expect(r.cricket!.scores).toEqual(['118/6 (10.0)', '87/3 (6.2)']);
    expect(r.cricket!.chase).toBe('Rawnat United need 32 off 22 balls');
  });
  it('cricket without enrichment', () => {
    const r = feedRows([cri], {}).tournament[0];
    expect(r.cricket).toEqual({ scores: [null, null], chase: null });
  });
  it('quick rows', () => {
    const q = { kind: 'quick', matchId: 'q', sport: 'cricket', title: 'A vs B', scoreline: '64/3 (5.2)', startedAt: '', joinCode: 'ABC123' } as unknown as LiveItem;
    const r = feedRows([q], {}).quick[0];
    expect(r.scoreline).toBe('64/3 (5.2)');
    expect(r.meta).toBe('Cricket');
    expect('joinCode' in r).toBe(false);
  });
});
