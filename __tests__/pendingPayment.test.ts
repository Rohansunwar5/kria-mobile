const mockStore = new Map<string, string>();
let mockDeleteFails = false;
jest.mock('@/lib/secureStore', () => ({
  getItem: async (k: string) => mockStore.get(k) ?? null,
  setItem: async (k: string, v: string) => { mockStore.set(k, v); },
  deleteItem: async (k: string) => {
    if (mockDeleteFails) throw new Error('keystore unavailable');
    mockStore.delete(k);
  },
}));
jest.mock('@/api/payment', () => ({ verifyPayment: jest.fn() }));

import { verifyPayment } from '@/api/payment';
import { savePending, loadPending, clearPending, confirmPending, type PendingPayment } from '@/lib/pendingPayment';
import type { EntryProfile } from '@/api/tournaments';

const p: PendingPayment = {
  playerId: 'u1', tournamentId: 't1', categoryId: 'c1', orderId: 'o1', paymentId: 'pay1', signature: 's1', amount: 628.32, skillLevel: 'advanced',
};
const profile: EntryProfile = { firstName: 'A', lastName: 'B', age: 27, gender: 'male', phone: '9', skillLevel: 'advanced' };
const verify = verifyPayment as jest.Mock;

beforeEach(() => { mockStore.clear(); mockDeleteFails = false; verify.mockReset(); });

describe('pending payment store', () => {
  it('save then load returns it', async () => {
    await savePending(p);
    expect(await loadPending('u1', 'c1')).toEqual(p);
  });
  it('load for another player is null', async () => {
    await savePending(p);
    expect(await loadPending('u2', 'c1')).toBeNull();
  });
  it('clear removes it', async () => {
    await savePending(p);
    await clearPending('u1', 'c1');
    expect(await loadPending('u1', 'c1')).toBeNull();
  });
  it('load of corrupt JSON is null', async () => {
    mockStore.set('kria.pendingPayment.u1.c1', '{nope');
    expect(await loadPending('u1', 'c1')).toBeNull();
  });
});

describe('confirmPending', () => {
  it('verifies and clears', async () => {
    verify.mockResolvedValue(undefined);
    await savePending(p);
    expect(await confirmPending(p, profile, async () => [])).toBe('entered');
    expect(verify).toHaveBeenCalledWith({ razorpayOrderId: 'o1', razorpayPaymentId: 'pay1', razorpaySignature: 's1', profile });
    expect(mockStore.size).toBe(0);
  });
  it('treats an existing entry as entered when verify is refused', async () => {
    verify.mockRejectedValue(new Error('Payment has already been verified.'));
    await savePending(p);
    expect(await confirmPending(p, profile, async () => [{ categoryId: 'c1' } as never])).toBe('entered');
    expect(mockStore.size).toBe(0);
  });
  // The entry exists once verify succeeds; a stale saved copy is harmless (my entry is checked first).
  it('is entered even when clearing the saved copy fails', async () => {
    verify.mockResolvedValue(undefined);
    await savePending(p);
    mockDeleteFails = true;
    expect(await confirmPending(p, profile, async () => [])).toBe('entered');
  });
  it('keeps the payment when there is no entry', async () => {
    verify.mockRejectedValue(new Error('boom'));
    await savePending(p);
    expect(await confirmPending(p, profile, async () => [])).toBe('failed');
    expect(await loadPending('u1', 'c1')).toEqual(p);
  });
  it('keeps the payment when the refetch also fails', async () => {
    verify.mockRejectedValue(new Error('boom'));
    await savePending(p);
    expect(await confirmPending(p, profile, async () => { throw new Error('offline'); })).toBe('failed');
    expect(await loadPending('u1', 'c1')).toEqual(p);
  });
});
