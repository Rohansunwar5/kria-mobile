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
