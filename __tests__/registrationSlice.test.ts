import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import reducer, {
  fetchTournamentCategories,
  registerForCategory,
  withdrawRegistration,
  fetchMyRegistrations,
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

  it('registerForCategory prepends the new registration', async () => {
    mock.onPost('/registrations/register').reply(200, { data: { _id: 'r1', categoryId: 'c1' } });
    const store = makeStore();
    await store.dispatch(registerForCategory({
      tournamentId: 't1', categoryId: 'c1',
      profile: { firstName: 'A', lastName: 'B', age: 20, gender: 'male', phone: '1' },
    }) as any);
    expect(store.getState().registration.myRegistrations[0]._id).toBe('r1');
  });

  it('withdrawRegistration flips status to withdrawn', async () => {
    mock.onGet('/registrations/my-registrations').reply(200, { data: [{ _id: 'r1', categoryId: 'c1', status: 'pending' }] });
    mock.onPost('/registrations/r1/withdraw').reply(200, {});
    const store = makeStore();
    await store.dispatch(fetchMyRegistrations() as any);
    await store.dispatch(withdrawRegistration('r1') as any);
    const registration = store.getState().registration.myRegistrations.find((r: any) => r._id === 'r1');
    expect(registration?.status).toBe('withdrawn');
  });
});
