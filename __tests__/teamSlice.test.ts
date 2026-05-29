import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import reducer, { fetchTournamentTeams } from '@/store/slices/teamSlice';
import { configureStore } from '@reduxjs/toolkit';

describe('teamSlice', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('fetchTournamentTeams stores teams', async () => {
    mock.onGet('/tournaments/t1/teams').reply(200, { data: [{ _id: 'team1', name: 'Strikers' }] });
    const store = configureStore({ reducer: { team: reducer } });
    await store.dispatch(fetchTournamentTeams('t1') as any);
    expect(store.getState().team.teams[0]._id).toBe('team1');
  });
});
