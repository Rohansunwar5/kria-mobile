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
