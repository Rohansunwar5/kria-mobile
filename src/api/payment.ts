import API from './axios';
import type { EntryProfile } from './tournaments';

export interface Invoice {
  _id: string;
  amount: number;
  /** created | paid | failed | refund_due | refunded */
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

/** What an entry costs (SERVER-GAPS #16), from the same formula create-order charges by. */
export interface PaymentQuote {
  baseAmount: number;
  feeBreakdown: { razorpayFee: number; platformFee: number; gst: number };
  convenienceFee: number;
  amount: number;
  currency: string;
}

export async function getPaymentQuote(categoryId: string): Promise<PaymentQuote> {
  const res = await API.get('/payments/quote', { params: { categoryId } });
  return res.data?.data?.data || res.data?.data;
}

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

/** The profile is saved on the order, so the entry is made even if the app never verifies. */
export async function createPaymentOrder(tournamentId: string, categoryId: string, profile: EntryProfile): Promise<OrderDetails> {
  const res = await API.post('/payments/create-order', { tournamentId, categoryId, profile });
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
