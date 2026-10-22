import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getTournament, getTournamentCategories, getTournamentTeams, getMyEntries, registerEntry, type EntryProfile } from '@/api/tournaments';

describe('tournament api (details screen)', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('getTournament unwraps /tournament/t1', async () => {
    mock.onGet('/tournament/t1').reply(200, { data: { data: { _id: 't1', name: 'Open' } } });
    expect((await getTournament('t1')).name).toBe('Open');
  });

  it('getTournamentCategories returns [] for a non-array payload', async () => {
    mock.onGet('/tournaments/t1/categories').reply(200, { data: { data: { oops: true } } });
    expect(await getTournamentCategories('t1')).toEqual([]);
  });

  it('getTournamentTeams reads /tournaments/t1/teams', async () => {
    mock.onGet('/tournaments/t1/teams').reply(200, { data: { data: [{ _id: 'tm1', name: 'Lions' }] } });
    expect((await getTournamentTeams('t1'))[0].name).toBe('Lions');
  });

  it('getMyEntries reads /registrations/my-registrations', async () => {
    mock.onGet('/registrations/my-registrations').reply(200, { data: { data: [{ _id: 'r1' }] } });
    expect((await getMyEntries())[0]._id).toBe('r1');
  });

  it('registerEntry posts the profile and never a basePrice', async () => {
    mock.onPost('/registrations/register').reply(200, {});
    const profile: EntryProfile = { firstName: 'A', lastName: 'B', age: 20, gender: 'male', phone: '1', skillLevel: 'beginner' };
    await registerEntry({ tournamentId: 't1', categoryId: 'c1', profile });
    const body = JSON.parse(mock.history.post[0].data);
    expect(body).toEqual({ tournamentId: 't1', categoryId: 'c1', profile });
    expect(body).not.toHaveProperty('basePrice');
  });
});
