import { verifyPayment } from '@/api/payment';
import type { EntryProfile, MyEntry, SkillLevel } from '@/api/tournaments';
import { getItem, setItem, deleteItem } from '@/lib/secureStore';

/**
 * A paid Razorpay result that the server hasn't confirmed as an entry yet.
 * Kept on the device so a failed verify never leads to a second charge.
 */
export interface PendingPayment {
  playerId: string; tournamentId: string; categoryId: string;
  orderId: string; paymentId: string; signature: string;
  amount: number; skillLevel: SkillLevel;
}

const key = (playerId: string, categoryId: string) => `kria.pendingPayment.${playerId}.${categoryId}`;

export const savePending = (p: PendingPayment) => setItem(key(p.playerId, p.categoryId), JSON.stringify(p));

export async function loadPending(playerId: string, categoryId: string): Promise<PendingPayment | null> {
  const raw = await getItem(key(playerId, categoryId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingPayment;
  } catch {
    return null;
  }
}

export const clearPending = (playerId: string, categoryId: string) => deleteItem(key(playerId, categoryId));

/**
 * Re-sends the saved payment. Verify returns the entry even when the server's
 * payment webhook made it first, but any error still might not mean "no entry":
 * check my entries before deciding it failed. If that check also fails, the
 * saved payment stays.
 */
export async function confirmPending(
  p: PendingPayment,
  profile: EntryProfile,
  refetchMine: () => Promise<MyEntry[]>,
): Promise<'entered' | 'failed'> {
  try {
    await verifyPayment({ razorpayOrderId: p.orderId, razorpayPaymentId: p.paymentId, razorpaySignature: p.signature, profile });
  } catch {
    try {
      const mine = await refetchMine();
      if (!mine.some((e) => e.categoryId === p.categoryId)) return 'failed';
    } catch {
      return 'failed';
    }
  }
  // The entry exists now: a stale saved copy is harmless (2b checks my entry first).
  await clearPending(p.playerId, p.categoryId).catch(() => {});
  return 'entered';
}
