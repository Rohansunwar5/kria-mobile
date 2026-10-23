import API from './axios';
import type { EntryProfile } from './tournaments';

export interface Invoice {
  _id: string;
  amount: number;
  /** created | paid | failed | refunded */
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt?: string;
  tournamentId?: string;
  categoryId?: string;
  baseAmount?: number;
  feeBreakdown?: { razorpayFee: number; platformFee: number; gst: number };
  tournament?: { name: string; sport?: string };
  category?: { name: string };
}

export const getMyPayments = async (): Promise<Invoice[]> => {
  const response = await API.get('/payments/my-payments');
  return response.data?.data?.data || response.data?.data || [];
};

export interface OrderDetails {
  orderId: string;
  amount: number;
  baseAmount: number;
  convenienceFee: number;
  feeBreakdown: { razorpayFee: number; platformFee: number; gst: number };
  currency: string;
  keyId: string;
  paymentId: string;
}

export async function createPaymentOrder(tournamentId: string, categoryId: string): Promise<OrderDetails> {
  const res = await API.post('/payments/create-order', { tournamentId, categoryId });
  return res.data?.data?.data || res.data?.data;
}

export interface VerifyBody {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  profile: EntryProfile;
}

export async function verifyPayment(body: VerifyBody): Promise<void> {
  await API.post('/payments/verify', body);
}

export interface PaymentRecord {
  _id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  tournamentId: string;
  categoryId: string;
  amount: number;
  baseAmount: number;
  feeBreakdown: { razorpayFee: number; platformFee: number; gst: number };
  currency: string;
  status: string;
  createdAt: string;
}

/** Polled by /payment/[orderId]. A missing order is not an exception — the
 *  screen shows its own "order unavailable" state. */
export async function getPaymentStatus(orderId: string): Promise<PaymentRecord | null> {
  try {
    const res = await API.get(`/payments/status/${orderId}`);
    return res.data?.data?.data || res.data?.data || null;
  } catch {
    return null;
  }
}
