import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getGroups, getGroupStandings, getTiesByGroup, getTieDetails } from '@/api/teamLeague';

describe('teamLeague api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('getGroups unwraps and falls back to []', async () => {
    mock.onGet('/sports/badminton/team-league/c1/groups').reply(200, { data: { data: [{ _id: 'g1', groupName: 'A', teamIds: ['t1'] }] } });
    expect(await getGroups('c1')).toHaveLength(1);
    mock.onGet('/sports/badminton/team-league/c2/groups').reply(200, {});
    expect(await getGroups('c2')).toEqual([]);
  });

  it('getGroupStandings unwraps and falls back to []', async () => {
    mock.onGet('/sports/badminton/team-league/c1/standings').reply(200, {
      data: { data: [{ group: { _id: 'g1', groupName: 'A' }, completedTies: 1, totalTies: 3, standings: [] }] },
    });
    expect(await getGroupStandings('c1', 1)).toHaveLength(1);
    mock.onGet('/sports/badminton/team-league/c3/standings').reply(200, {});
    expect(await getGroupStandings('c3')).toEqual([]);
  });

  it('getTiesByGroup unwraps and falls back to []', async () => {
    mock.onGet('/sports/badminton/team-league/groups/g1/ties').reply(200, { data: { data: [{ _id: 'tie1' }] } });
    expect(await getTiesByGroup('g1')).toHaveLength(1);
    mock.onGet('/sports/badminton/team-league/groups/g2/ties').reply(200, {});
    expect(await getTiesByGroup('g2')).toEqual([]);
  });

  it('getTieDetails unwraps tie/subMatches/lineups with safe fallbacks', async () => {
    mock.onGet('/sports/badminton/team-league/ties/tie1').reply(200, {
      data: { data: { tie: { _id: 'tie1' }, subMatches: [{ _id: 'sm1' }], lineups: [{ _id: 'lu1' }] } },
    });
    const d = await getTieDetails('tie1');
    expect(d.tie?._id).toBe('tie1');
    expect(d.subMatches).toHaveLength(1);
    expect(d.lineups).toHaveLength(1);

    mock.onGet('/sports/badminton/team-league/ties/tie2').reply(200, {});
    const d2 = await getTieDetails('tie2');
    expect(d2.tie).toBeNull();
    expect(d2.subMatches).toEqual([]);
    expect(d2.lineups).toEqual([]);
  });
});
