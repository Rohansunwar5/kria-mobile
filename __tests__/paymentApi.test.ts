import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { createPaymentOrder, verifyPayment } from '@/api/payment';

describe('payment api (checkout)', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('createPaymentOrder unwraps OrderDetails from nested response', async () => {
    const order = {
      orderId: 'ord_1', amount: 11872, baseAmount: 10000,
      convenienceFee: 1872,
      feeBreakdown: { razorpayFee: 200, platformFee: 200, gst: 72 },
      currency: 'INR', keyId: 'rzp_test_key', paymentId: 'pay_db_1',
    };
    mock.onPost('/payments/create-order').reply(200, { data: { data: order } });
    const result = await createPaymentOrder('t1', 'c1');
    expect(result.orderId).toBe('ord_1');
    expect(result.keyId).toBe('rzp_test_key');
    expect(result.feeBreakdown.gst).toBe(72);
  });

  it('createPaymentOrder sends tournamentId and categoryId in request body', async () => {
    const order = { orderId: 'ord_2', amount: 5000, baseAmount: 4000, convenienceFee: 1000, feeBreakdown: { razorpayFee: 80, platformFee: 80, gst: 29 }, currency: 'INR', keyId: 'k', paymentId: 'p' };
    mock.onPost('/payments/create-order', { tournamentId: 'tA', categoryId: 'cB' }).reply(200, { data: { data: order } });
    const result = await createPaymentOrder('tA', 'cB');
    expect(result.orderId).toBe('ord_2');
  });

  it('verifyPayment resolves (void) on 200', async () => {
    mock.onPost('/payments/verify').reply(200, {});
    await expect(verifyPayment('ord_1', 'pay_1', 'sig_1')).resolves.toBeUndefined();
  });

  it('verifyPayment throws on error status', async () => {
    mock.onPost('/payments/verify').reply(400, { message: 'Invalid signature' });
    await expect(verifyPayment('ord_1', 'pay_1', 'bad_sig')).rejects.toBeDefined();
  });
});
