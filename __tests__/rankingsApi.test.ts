import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getTopPlayers } from '@/api/rankings';

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  playerId: 'p1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  played: 15,
  decided: 15,
  won: 10,
  winRate: 0.68,
  ...over,
});

describe('rankings api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('requests /player/rankings with the sport, without a limit param when none is given', async () => {
    mock.onGet('/player/rankings').reply(200, { data: { data: [row()] } });

    await getTopPlayers('badminton');

    expect(mock.history.get[0].url).toBe('/player/rankings');
    expect(mock.history.get[0].params).toEqual({ sport: 'badminton' });
  });

  it('sends limit only when given, so the server owns the default', async () => {
    mock.onGet('/player/rankings').reply(200, { data: { data: [row()] } });

    await getTopPlayers('badminton', 5);

    expect(mock.history.get[0].params).toEqual({ sport: 'badminton', limit: 5 });
  });

  it('normalises a missing body into an empty list instead of crashing', async () => {
    // Mirrors getRecentMatches's own null-payload test: a missing body is the
    // one shape that genuinely round-trips through unwrap as null.
    mock.onGet('/player/rankings').reply(200, {});

    const players = await getTopPlayers('badminton');

    expect(players).toEqual([]);
  });

  it('passes winRate through untouched as a fraction, not a percentage', async () => {
    mock.onGet('/player/rankings').reply(200, { data: { data: [row({ winRate: 0.68 })] } });

    const [player] = await getTopPlayers('badminton');

    expect(player.winRate).toBe(0.68);
  });

  it('returns an empty list rather than throwing when nobody clears the decided-matches floor', async () => {
    mock.onGet('/player/rankings').reply(200, { data: { data: [] } });

    const players = await getTopPlayers('badminton');

    expect(players).toEqual([]);
  });
});
