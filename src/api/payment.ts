import API from './axios';

export interface Invoice {
  _id: string;
  amount: number;
  status: string;
  razorpayOrderId?: string;
  createdAt: string;
  tournament?: { name: string };
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

export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<void> {
  await API.post('/payments/verify', { razorpayOrderId, razorpayPaymentId, razorpaySignature });
}
