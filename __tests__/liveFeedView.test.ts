import { feedRows } from '@/lib/liveFeedView';
import type { LiveItem } from '@/api/live';

const base = { startedAt: '', tournamentId: 't', categoryId: 'c' };
const bad = (o: object = {}): LiveItem => ({
  ...base, kind: 'tournament', matchId: 'm1', sport: 'badminton',
  title: 'Rohit Kulkarni vs Karthik vs Nair', sides: ['Rohit Kulkarni', 'Karthik vs Nair'],
  scoreline: '18-21, 11-7', tournamentName: 'Arohance', categoryName: '', round: 'Quarter-Final', positionInRound: 3, court: '2', ...o,
}) as LiveItem;
const cri = (o: object = {}): LiveItem => ({
  ...base, kind: 'tournament', matchId: 'm2', sport: 'cricket',
  title: 'Titans SC vs Rawnat United', sides: ['Titans SC', 'Rawnat United'],
  tournamentName: 'T10', categoryName: 'League', round: 'League', positionInRound: 5, ...o,
}) as LiveItem;

describe('feedRows', () => {
  it('badminton row: sides from the feed, numbered round, game and court', () => {
    const r = feedRows([bad()]).tournament[0];
    expect(r.meta).toBe('Arohance · Quarter-final 4');
    expect(r.sides).toEqual(['Rohit Kulkarni', 'Karthik vs Nair']);
    expect(r.badminton!.games).toHaveLength(2);
    expect(r.sub).toBe('Game 2 · Court 2');
  });
  it('no court, no court part', () => {
    expect(feedRows([bad({ court: undefined })]).tournament[0].sub).toBe('Game 2');
  });
  it('team league round', () => {
    expect(feedRows([bad({ round: 'S1-GroupA-T3' })]).tournament[0].meta.endsWith('Team league')).toBe(true);
  });
  it('a final and a league match carry no number', () => {
    expect(feedRows([bad({ round: 'Final', positionInRound: 0 })]).tournament[0].meta).toBe('Arohance · Final');
    expect(feedRows([cri()]).tournament[0].meta).toBe('T10 · League · League');
  });
  it('cricket scores and chase come from the feed', () => {
    const r = feedRows([cri({
      cricket: {
        scores: [{ runs: 118, wickets: 6, overs: 10, balls: 0 }, { runs: 87, wickets: 3, overs: 6, balls: 2 }],
        chase: { side: 1, need: 32, balls: 22 },
      },
    })]).tournament[0];
    expect(r.cricket!.scores).toEqual(['118/6 (10.0)', '87/3 (6.2)']);
    expect(r.cricket!.chase).toBe('Rawnat United need 32 off 22 balls');
  });
  it('the side yet to bat stays blank', () => {
    const r = feedRows([cri({ cricket: { scores: [null, { runs: 40, wickets: 1, overs: 4, balls: 3 }] } })]).tournament[0];
    expect(r.cricket).toEqual({ scores: [null, '40/1 (4.3)'], chase: null });
  });
  it('cricket before a ball is bowled', () => {
    expect(feedRows([cri()]).tournament[0].cricket).toEqual({ scores: [null, null], chase: null });
  });
  it('quick rows', () => {
    const q = { kind: 'quick', matchId: 'q', sport: 'cricket', title: 'A vs B', sides: ['A', 'B'], scoreline: '64/3 (5.2)', startedAt: '', joinCode: 'ABC123' } as unknown as LiveItem;
    const r = feedRows([q]).quick[0];
    expect(r.scoreline).toBe('64/3 (5.2)');
    expect(r.sides).toEqual(['A', 'B']);
    expect(r.meta).toBe('Cricket');
    expect('joinCode' in r).toBe(false);
  });
});
