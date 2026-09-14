import { act, renderHook, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { useTopPlayers } from '@/lib/useTopPlayers';
import type { RankedPlayer } from '@/api/rankings';

const envelope = (payload: unknown) => ({ data: { data: payload } });

const player = (id: string): RankedPlayer => ({
  playerId: id,
  firstName: 'A',
  lastName: 'B',
  played: 12,
  decided: 12,
  won: 8,
  winRate: 8 / 12,
});

describe('useTopPlayers', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('loads the leaderboard for a sport', async () => {
    mock.onGet('/player/rankings', { params: { sport: 'badminton' } }).reply(200, envelope([player('p1')]));

    const { result } = renderHook(() => useTopPlayers('badminton'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toHaveLength(1);
    expect(result.current.players[0]?.playerId).toBe('p1');
  });

  // A sport change used to leave the previous sport's rows on screen until
  // the new list arrived — the new sport's chip, the old sport's rows.
  it('clears the previous sport\'s rows the instant sport changes, not once the new list arrives', async () => {
    mock.onGet('/player/rankings', { params: { sport: 'badminton' } }).reply(200, envelope([player('p1')]));
    mock.onGet('/player/rankings', { params: { sport: 'cricket' } }).reply(200, envelope([player('p2')]));

    const { result, rerender } = renderHook(({ sport }: { sport: string }) => useTopPlayers(sport), {
      initialProps: { sport: 'badminton' },
    });
    await waitFor(() => expect(result.current.players).toHaveLength(1));
    expect(result.current.players[0]?.playerId).toBe('p1');

    rerender({ sport: 'cricket' });
    // Cleared synchronously on the sport change, before the cricket request
    // has had any chance to resolve.
    expect(result.current.players).toHaveLength(0);

    await waitFor(() => expect(result.current.players).toHaveLength(1));
    expect(result.current.players[0]?.playerId).toBe('p2');
  });

  // A manual reload of the SAME sport (pull-to-refresh) must not flash the
  // list empty — only an actual sport change clears it.
  it('does not clear players on a manual reload of the same sport', async () => {
    mock.onGet('/player/rankings', { params: { sport: 'badminton' } }).reply(200, envelope([player('p1')]));

    const { result } = renderHook(() => useTopPlayers('badminton'));
    await waitFor(() => expect(result.current.players).toHaveLength(1));

    mock.onGet('/player/rankings', { params: { sport: 'badminton' } }).reply(200, envelope([player('p1')]));
    await act(async () => { await result.current.reload(); });

    // Never observed empty in between — the list still has its one row.
    expect(result.current.players).toHaveLength(1);
  });
});
