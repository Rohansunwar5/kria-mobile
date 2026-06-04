import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getMatch, getLiveState, getScorecard, getTournamentMatches, resolveMatchSport } from '@/api/cricketMatch';

describe('cricketMatch api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('getMatch unwraps nested data', async () => {
    mock.onGet('/sports/cricket/match/m1').reply(200, { data: { data: { _id: 'm1', tournamentId: 't1' } } });
    const m = await getMatch('m1');
    expect(m._id).toBe('m1');
    expect(m.tournamentId).toBe('t1');
  });

  it('getLiveState returns the inner liveState', async () => {
    mock.onGet('/sports/cricket/match/m1/live').reply(200, {
      data: { data: { liveState: { runs: 42, wickets: 1 }, recentBalls: [], match: {} } },
    });
    const live = await getLiveState('m1');
    expect(live?.runs).toBe(42);
  });

  it('getLiveState returns null before the match starts', async () => {
    mock.onGet('/sports/cricket/match/m1/live').reply(200, { data: { data: { liveState: null } } });
    const live = await getLiveState('m1');
    expect(live).toBeNull();
  });

  it('getScorecard returns innings shape', async () => {
    mock.onGet('/sports/cricket/match/m1/scorecard').reply(200, {
      data: { data: { innings1: { inningsNumber: 1 }, innings2: null } },
    });
    const sc = await getScorecard('m1');
    expect(sc.innings1?.inningsNumber).toBe(1);
    expect(sc.innings2).toBeNull();
  });

  it('getTournamentMatches returns a list (empty fallback)', async () => {
    mock.onGet('/sports/cricket/match/by-tournament/t1').reply(200, {});
    const list = await getTournamentMatches('t1');
    expect(list).toEqual([]);
  });

  it('resolveMatchSport reads sport via generic match then tournament', async () => {
    mock.onGet('/matches/m1').reply(200, { data: { data: { _id: 'm1', tournamentId: 't1' } } });
    mock.onGet('/tournament/t1').reply(200, { data: { data: { sport: 'cricket' } } });
    const sport = await resolveMatchSport('m1');
    expect(sport).toBe('cricket');
  });

  it('resolveMatchSport returns null when tournament missing', async () => {
    mock.onGet('/matches/m1').reply(200, { data: { data: { _id: 'm1' } } });
    const sport = await resolveMatchSport('m1');
    expect(sport).toBeNull();
  });
});
