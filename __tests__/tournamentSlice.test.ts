import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import reducer, { fetchPublicTournaments, fetchTournament } from '@/store/slices/tournamentSlice';
import { configureStore } from '@reduxjs/toolkit';

const makeStore = () => configureStore({ reducer: { tournament: reducer } });

describe('tournamentSlice', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('initial state is empty', () => {
    const s = reducer(undefined, { type: '@@INIT' });
    expect(s.publicTournaments).toEqual([]);
    expect(s.currentTournament).toBeNull();
  });

  it('fetchPublicTournaments stores the tournaments array (tournaments key)', async () => {
    mock.onGet(/\/tournament(\?.*)?$/).reply(200, { data: { tournaments: [{ _id: 't1', name: 'Cup' }] } });
    const store = makeStore();
    await store.dispatch(fetchPublicTournaments(undefined) as any);
    expect(store.getState().tournament.publicTournaments).toHaveLength(1);
    expect(store.getState().tournament.publicTournaments[0]._id).toBe('t1');
  });

  it('fetchTournament stores the current tournament', async () => {
    mock.onGet('/tournament/t1').reply(200, { data: { _id: 't1', name: 'Cup' } });
    const store = makeStore();
    await store.dispatch(fetchTournament('t1') as any);
    expect(store.getState().tournament.currentTournament?._id).toBe('t1');
  });
});

describe('fetchPublicTournaments — the result total', () => {
  it('keeps the total the server sent', () => {
    const state = reducer(
      undefined,
      { type: fetchPublicTournaments.fulfilled.type, payload: { tournaments: [{ _id: 't1' }], total: 12 } }
    );
    expect(state.publicTournaments).toHaveLength(1);
    expect(state.publicTotal).toBe(12);
  });

  // The old payload was a bare array. If anything still dispatches that shape,
  // the list must survive rather than the reducer throwing on payload.tournaments.
  it('survives a bare-array payload without losing the list', () => {
    const state = reducer(
      undefined,
      { type: fetchPublicTournaments.fulfilled.type, payload: [{ _id: 't1' }] }
    );
    expect(state.publicTournaments).toHaveLength(1);
    expect(state.publicTotal).toBe(1);
  });

  it('falls back to the page length when the server omits a total', () => {
    const state = reducer(
      undefined,
      { type: fetchPublicTournaments.fulfilled.type, payload: { tournaments: [{ _id: 'a' }, { _id: 'b' }] } }
    );
    expect(state.publicTotal).toBe(2);
  });

  it('resets the total to 0 when a load fails', () => {
    const loaded = reducer(
      undefined,
      { type: fetchPublicTournaments.fulfilled.type, payload: { tournaments: [{ _id: 't1' }], total: 12 } }
    );
    const failed = reducer(loaded, { type: fetchPublicTournaments.rejected.type, payload: 'boom' });
    expect(failed.publicTotal).toBe(0);
  });
});
