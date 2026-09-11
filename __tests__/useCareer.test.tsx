import { renderHook, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { useCareer } from '@/lib/useCareer';

const envelope = (payload: unknown) => ({ data: { data: payload } });

const profile = { sports: [{ sport: 'badminton', played: 3, decided: 3, won: 2, lost: 1, tied: 0, noResult: 0, winRate: 2 / 3 }], bestSport: null };
const feed = [{ _id: 'r1', matchId: 'm1', sport: 'badminton', context: 'quick', result: 'won', playedAt: '2026-09-01T12:00:00.000Z' }];

describe('useCareer', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('loads the profile and the recent-matches feed together', async () => {
    mock.onGet('/player/career/p1').reply(200, envelope(profile));
    mock.onGet(/\/recent/).reply(200, envelope(feed));

    const { result } = renderHook(() => useCareer('p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile?.sports).toHaveLength(1);
    expect(result.current.recent).toHaveLength(1);
  });

  it('keeps the career card alive when only the feed fails', async () => {
    // The two are separate requests on one screen. One failing must not blank
    // the other — that is the whole reason they carry separate error flags.
    mock.onGet('/player/career/p1').reply(200, envelope(profile));
    mock.onGet(/\/recent/).reply(500);

    const { result } = renderHook(() => useCareer('p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.profile?.sports).toHaveLength(1);
    expect(result.current.recentError).toBe(true);
  });

  it('keeps the feed alive when only the profile fails', async () => {
    mock.onGet('/player/career/p1').reply(500);
    mock.onGet(/\/recent/).reply(200, envelope(feed));

    const { result } = renderHook(() => useCareer('p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.recentError).toBe(false);
    expect(result.current.recent).toHaveLength(1);
  });

  it('fetches nothing without a playerId', async () => {
    renderHook(() => useCareer(undefined));
    expect(mock.history.get).toHaveLength(0);
  });
});
