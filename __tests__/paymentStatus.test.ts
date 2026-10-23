import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getPaymentStatus } from '@/api/payment';

describe('getPaymentStatus', () => {
  let mock: MockAdapter;
  beforeEach(() => {
    mock = new MockAdapter(API);
  });
  afterEach(() => {
    mock.restore();
  });

  it('unwraps the payment record for an order', async () => {
    mock.onGet('/payments/status/order_1').reply(200, {
      data: { data: { razorpayOrderId: 'order_1', status: 'paid', amount: 61950, baseAmount: 50000 } },
    });
    const p = await getPaymentStatus('order_1');
    expect(p?.status).toBe('paid');
    expect(p?.amount).toBe(61950);
  });

  it('returns null when the order is not found', async () => {
    mock.onGet('/payments/status/nope').reply(404);
    expect(await getPaymentStatus('nope')).toBeNull();
  });
});
