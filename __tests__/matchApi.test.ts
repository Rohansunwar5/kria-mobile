import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getCategoryBracket } from '@/api/match';

describe('match api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('getCategoryBracket unwraps nested data', async () => {
    mock.onGet('/matches/categories/c1').reply(200, {
      data: { data: { matches: [{ _id: 'm1' }], rounds: { Final: [{ _id: 'm1' }] }, competitorType: 'team' } },
    });
    const result = await getCategoryBracket('c1');
    expect(result.matches).toHaveLength(1);
    expect(result.competitorType).toBe('team');
  });

  it('getCategoryBracket returns empty shape when payload missing', async () => {
    mock.onGet('/matches/categories/c1').reply(200, {});
    const result = await getCategoryBracket('c1');
    expect(result.matches).toEqual([]);
    expect(result.rounds).toEqual({});
    expect(result.competitorType).toBe('player');
  });
});
