import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { getPaymentStatus } from '@/api/payment';
import { paymentVerdict } from '@/lib/paymentVerdict';

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

describe('paymentVerdict', () => {
  it('treats paid as settled and stops polling', () => {
    const v = paymentVerdict('paid');
    expect(v.kind).toBe('success');
    expect(v.settled).toBe(true);
  });

  it('treats failed as settled so the screen stops polling a dead order', () => {
    const v = paymentVerdict('failed');
    expect(v.kind).toBe('failure');
    expect(v.settled).toBe(true);
  });

  it('keeps polling while the gateway still says created', () => {
    const v = paymentVerdict('created');
    expect(v.kind).toBe('pending');
    expect(v.settled).toBe(false);
  });

  it('reports a refund distinctly from a failure', () => {
    expect(paymentVerdict('refunded').kind).toBe('refunded');
  });

  it('treats an unknown status as pending rather than claiming failure', () => {
    const v = paymentVerdict('something_new');
    expect(v.kind).toBe('pending');
    expect(v.settled).toBe(false);
  });
});
