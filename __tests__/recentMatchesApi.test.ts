import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getRecentMatches } from '@/api/career';
import type { RecentMatch } from '@/api/career';

const row = (over: Partial<RecentMatch> = {}): RecentMatch => ({
  _id: 'r1',
  matchId: 'm1',
  sport: 'badminton',
  context: 'quick',
  result: 'won',
  playedAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

describe('recent matches api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('unwraps the doubly-nested payload the server sends', async () => {
    mock.onGet(/\/player\/career\/p1\/recent/).reply(200, { data: { data: [row(), row({ _id: 'r2' })] } });

    const matches = await getRecentMatches('p1');

    expect(matches).toHaveLength(2);
    expect(matches[0].sport).toBe('badminton');
    expect(matches[0].result).toBe('won');
  });

  it('hits the unprefixed route — this server mounts no /api/v1', async () => {
    mock.onGet(/recent/).reply(200, { data: { data: [] } });
    await getRecentMatches('p1');
    expect(mock.history.get[0].url).toBe('/player/career/p1/recent');
  });

  it('sends no limit by default, letting the server decide the feed length', async () => {
    mock.onGet(/recent/).reply(200, { data: { data: [] } });
    await getRecentMatches('p1');
    expect(mock.history.get[0].params).toBeUndefined();
  });

  it('passes an explicit limit through as a query param', async () => {
    mock.onGet(/recent/).reply(200, { data: { data: [] } });
    await getRecentMatches('p1', 5);
    expect(mock.history.get[0].params).toEqual({ limit: 5 });
  });

  it('returns an empty list rather than throwing for a player who has never played', async () => {
    mock.onGet(/recent/).reply(200, { data: { data: [] } });
    expect(await getRecentMatches('p1')).toEqual([]);
  });

  it('normalises a missing body into an empty list instead of null', async () => {
    // A null here would crash every caller that maps over the result.
    mock.onGet(/recent/).reply(200, {});
    expect(await getRecentMatches('p1')).toEqual([]);
  });
});
