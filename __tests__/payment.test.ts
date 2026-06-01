import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getMyPayments } from '@/api/payment';

describe('payment api', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('getMyPayments unwraps nested data', async () => {
    mock.onGet('/payments/my-payments').reply(200, { data: { data: [{ _id: 'p1', amount: 500 }] } });
    const result = await getMyPayments();
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('p1');
  });

  it('getMyPayments falls back to single-level data', async () => {
    mock.onGet('/payments/my-payments').reply(200, { data: [{ _id: 'p2', amount: 100 }] });
    const result = await getMyPayments();
    expect(result[0]._id).toBe('p2');
  });
});
