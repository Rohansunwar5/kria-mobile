import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import reducer, {
  fetchTournamentCategories,
} from '@/store/slices/registrationSlice';
import { configureStore } from '@reduxjs/toolkit';

const makeStore = () => configureStore({ reducer: { registration: reducer } });

describe('registrationSlice', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('fetchTournamentCategories stores categories', async () => {
    mock.onGet('/tournaments/t1/categories').reply(200, { data: [{ _id: 'c1', name: 'Open' }] });
    const store = makeStore();
    await store.dispatch(fetchTournamentCategories('t1') as any);
    expect(store.getState().registration.categories).toHaveLength(1);
  });
});
