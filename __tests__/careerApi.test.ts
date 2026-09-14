import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getCareerProfile } from '@/api/career';

const summary = (over: Partial<Record<string, unknown>> = {}) => ({
  sport: 'badminton',
  played: 12,
  decided: 12,
  won: 8,
  lost: 3,
  tied: 1,
  noResult: 0,
  winRate: 8 / 12,
  ...over,
});

describe('career api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('unwraps the doubly-nested payload the server sends', async () => {
    // next(response) passes the whole SuccessResponse as `data`, and it carries
    // its own `.data` — so the payload really does sit two levels down.
    mock.onGet('/player/career/p1').reply(200, {
      data: { data: { sports: [summary()], bestSport: summary() } },
    });

    const profile = await getCareerProfile('p1');

    expect(profile.sports).toHaveLength(1);
    expect(profile.sports[0].sport).toBe('badminton');
    expect(profile.bestSport?.sport).toBe('badminton');
  });

  it('hits the unprefixed route — this server mounts no /api/v1', async () => {
    mock.onGet('/player/career/p1').reply(200, { data: { data: { sports: [], bestSport: null } } });
    await getCareerProfile('p1');
    expect(mock.history.get[0].url).toBe('/player/career/p1');
  });

  it('returns an empty profile rather than throwing when a player has never played', async () => {
    mock.onGet('/player/career/p1').reply(200, { data: { data: { sports: [], bestSport: null } } });

    const profile = await getCareerProfile('p1');

    expect(profile.sports).toEqual([]);
    expect(profile.bestSport).toBeNull();
  });

  it('normalises a missing body into an empty profile instead of undefined', async () => {
    mock.onGet('/player/career/p1').reply(200, {});

    const profile = await getCareerProfile('p1');

    expect(profile.sports).toEqual([]);
    expect(profile.bestSport).toBeNull();
    expect(profile.achievements).toEqual([]);
  });

  it('passes achievements through when the server sends them', async () => {
    const achievements = [
      { id: 'first-win', label: 'First Win', earned: true, progress: 1, target: 1 },
      { id: 'century-club', label: 'Century Club', earned: false, progress: 40, target: 100 },
    ];
    mock.onGet('/player/career/p1').reply(200, {
      data: { data: { sports: [], bestSport: null, achievements } },
    });

    const profile = await getCareerProfile('p1');

    expect(profile.achievements).toEqual(achievements);
  });

  it('defaults achievements to [] when an older server omits the field entirely', async () => {
    // The server derives achievements outside its cache — an older server
    // simply never sends the key, and the app must render rather than crash.
    mock.onGet('/player/career/p1').reply(200, {
      data: { data: { sports: [summary()], bestSport: null } },
    });

    const profile = await getCareerProfile('p1');

    expect(profile.achievements).toEqual([]);
  });
});
