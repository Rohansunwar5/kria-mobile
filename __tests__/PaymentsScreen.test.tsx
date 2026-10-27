import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import Payments from '../src/app/profile/invoices';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(undefined) }));
const mockPay = jest.fn();
jest.mock('@/api/payment', () => ({ getMyPayments: (...a: unknown[]) => mockPay(...a) }));

const p = (id: string, o = {}) => ({
  _id: id, amount: 1047.2, status: 'paid', razorpayOrderId: `order_${id}`, razorpayPaymentId: `pay_${id}`,
  createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-14T13:12:00Z', baseAmount: 1000,
  feeBreakdown: { razorpayFee: 20, platformFee: 20, gst: 7.2 },
  tournament: { name: 'Smash Open', sport: 'badminton' }, category: { name: 'Singles' }, ...o,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPay.mockResolvedValue([p('a'), p('b', { amount: 523.6, tournament: { name: 'HSR League' }, updatedAt: '2026-09-02T10:00:00Z' })]);
});

it('shows the total and rows', async () => {
  render(<Payments />);
  expect(await screen.findByText('Smash Open')).toBeTruthy();
  expect(screen.getByText('Total paid')).toBeTruthy();
  expect(screen.getByText('₹1,570.80')).toBeTruthy();
  expect(screen.getByText('2 entry fees')).toBeTruthy();
  expect(screen.getByText('HSR League')).toBeTruthy();
  expect(screen.getByText('₹523.60')).toBeTruthy();
  for (const t of ['Failed', 'Refunds', 'Retry']) expect(screen.queryByText(t)).toBeNull();
});

it('row opens the sheet with ids; Get help mails support', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  render(<Payments />);
  fireEvent.press(await screen.findByLabelText('Smash Open'));
  expect(screen.getByText(/^Paid · /)).toBeTruthy();
  expect(screen.getByText('order_a')).toBeTruthy();
  expect(screen.getByText('pay_a')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Get help'));
  expect(open).toHaveBeenCalledWith('mailto:support@kria.club?subject=Payment%20order_a');
});

it('empty state', async () => {
  mockPay.mockResolvedValue([]);
  render(<Payments />);
  expect(await screen.findByText('No payments yet')).toBeTruthy();
  expect(screen.getByText('Entry fees you pay show up here.')).toBeTruthy();
});
