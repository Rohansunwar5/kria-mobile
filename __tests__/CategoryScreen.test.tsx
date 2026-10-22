import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking, Modal } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import { createPaymentOrder, verifyPayment } from '@/api/payment';
import { getMyEntries, registerEntry } from '@/api/tournaments';
import CategoryScreen from '../src/app/category/[categoryId]';

// 2b Category and entry: the form, the paid and free flows, and the saved
// payment that must never be lost or paid twice.

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    push: (...a: unknown[]) => mockPush(...a), back: () => mockBack(), canGoBack: () => true, replace: jest.fn(),
    dismissTo: (...a: unknown[]) => mockDismissTo(...a),
  }),
}));

let mockBase: Record<string, unknown> = {};
jest.mock('@/lib/useTournament', () => ({ useTournament: () => mockBase }));

jest.mock('@/api/payment', () => ({ createPaymentOrder: jest.fn(), verifyPayment: jest.fn() }));
jest.mock('@/api/tournaments', () => ({ registerEntry: jest.fn(), getMyEntries: jest.fn(), getTournamentTeams: jest.fn(async () => []) }));

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

jest.mock('@/components/tournament/RazorpayWebView', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text, View } = require('react-native');
  return {
    RazorpayWebView: ({ onSuccess, onDismiss }: { onSuccess: (p: string, s: string) => void; onDismiss: () => void }) => (
      <View>
        <Pressable onPress={() => onSuccess('pay_1', 'sig_1')}><Text>rzp success</Text></Pressable>
        <Pressable onPress={onDismiss}><Text>rzp dismiss</Text></Pressable>
      </View>
    ),
  };
});

const order = createPaymentOrder as jest.Mock;
const verify = verifyPayment as jest.Mock;
const mine = getMyEntries as jest.Mock;
const register = registerEntry as jest.Mock;

const tournament = (over: Record<string, unknown> = {}) => ({
  _id: 't1', name: 'Arohance Open', sport: 'badminton', status: 'registration_open', teamsCount: 4,
  startDate: '2026-10-20T06:00:00.000Z', endDate: '2026-10-20T08:00:00.000Z', registrationDeadline: '2099-10-17T06:00:00.000Z',
  venue: { name: 'Tiger Stadium', city: 'Bengaluru' }, ...over,
});
const category = (over: Record<string, unknown> = {}) => ({
  _id: 'c1', tournamentId: 't1', name: "Men's Singles", status: 'registration', gender: 'male', matchType: 'singles', bracketType: 'knockout',
  matchFormat: { bestOf: 3, pointsPerGame: 21 }, maxRegistrations: 64, registrationFee: 600, isPaidRegistration: true, ...over,
});
const entry = (over: Record<string, unknown> = {}) => ({ _id: 'r1', tournamentId: 't1', categoryId: 'c1', status: 'pending', createdAt: '2026-10-22T04:00:00.000Z', ...over });
const base = (t = tournament(), c = category(), entries: unknown[] = []) => ({
  data: { tournament: t, categories: [c], mine: entries }, loading: false, error: false, reload: jest.fn(),
});
const ORDER = {
  orderId: 'ord_1', amount: 628.32, baseAmount: 600, convenienceFee: 28.32,
  feeBreakdown: { razorpayFee: 12, platformFee: 12, gst: 4.32 }, currency: 'INR', keyId: 'rzp_test', paymentId: 'p1',
};
// Jan 1 of the year 27 years ago, local time: 27 on every day of this year.
const DOB = new Date(new Date().getFullYear() - 27, 0, 1).toISOString();
const USER = { _id: 'u1', firstName: 'Aarav', lastName: 'Menon', email: 'aarav@kria.club', phone: '9812345412', status: 'active', gender: 'male', dateOfBirth: DOB };
const PROFILE = { firstName: 'Aarav', lastName: 'Menon', age: 27, gender: 'male', phone: '9812345412', skillLevel: 'advanced' };
const PAY = 'Pay ₹628.32 and register';
const SAVED = { playerId: 'u1', tournamentId: 't1', categoryId: 'c1', orderId: 'ord_1', paymentId: 'pay_1', signature: 'sig_1', amount: 628.32, skillLevel: 'advanced' };

const renderScreen = (user: Record<string, unknown> | null = USER) =>
  render(
    <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@init' }), user } as never } })}>
      <CategoryScreen />
    </Provider>,
  );
// Lets the saved-payment lookup on open finish inside act.
const settle = () => act(async () => {});
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  mockDeleteFails = false;
  mockParams = { categoryId: 'c1', tournamentId: 't1' };
  mockBase = base();
  order.mockResolvedValue(ORDER);
  mine.mockResolvedValue([]);
});

describe('2b form', () => {
  it('shows facts, how it works, your entry and the fee maths', async () => {
    renderScreen();
    expect(screen.getByText("Men's Singles")).toBeTruthy();
    expect(screen.getByText('Arohance Open')).toBeTruthy();
    expect(screen.getByText('Limited to 64')).toBeTruthy();
    expect(screen.getByText('Register and pay')).toBeTruthy();
    expect(screen.getByText('Aarav Menon')).toBeTruthy();
    expect(screen.getByText('Male · 27 · 98••• ••412')).toBeTruthy();
    expect(screen.getByText('₹600')).toBeTruthy();
    expect(screen.getAllByText('₹12')).toHaveLength(2);
    expect(screen.getByText('₹4.32')).toBeTruthy();
    expect(screen.getByText('₹628.32')).toBeTruthy();
    expect(screen.getByText('Paid via Razorpay · UPI, cards, netbanking')).toBeTruthy();
    expect(await screen.findByLabelText(PAY)).toBeTruthy();
  });

  it('Pay is disabled until a skill level is picked', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByLabelText(PAY)).toBeTruthy());
    expect(disabled(PAY)).toBe(true);
    fireEvent.press(screen.getByLabelText(PAY));
    expect(order).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Intermediate'));
    await waitFor(() => expect(disabled(PAY)).toBe(false));
  });

  it('missing DOB blocks entry and links to Edit profile', async () => {
    renderScreen({ ...USER, dateOfBirth: undefined });
    expect(screen.getByText('Add your date of birth and gender to enter')).toBeTruthy();
    fireEvent.press(screen.getByText('Advanced'));
    await waitFor(() => expect(disabled(PAY)).toBe(true));
    fireEvent.press(screen.getByText('Edit profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
  });

  it('closed entries show why, with no Pay', async () => {
    mockBase = base(tournament(), category({ status: 'auction' }));
    renderScreen();
    await settle();
    expect(screen.getByText('Entries are closed')).toBeTruthy();
    expect(screen.queryByText(/Pay ₹/)).toBeNull();
  });

  it('logged out offers log in instead of Pay', () => {
    renderScreen(null);
    fireEvent.press(screen.getByLabelText('Log in to register'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(screen.queryByText(/Pay ₹/)).toBeNull();
  });

  it('a missing tournament id says so, with back', () => {
    mockParams = { categoryId: 'c1' };
    renderScreen();
    expect(screen.getByText("Couldn't open this category")).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('2b paid flow', () => {
  const payWith = async (skill = 'Advanced') => {
    renderScreen();
    fireEvent.press(screen.getByText(skill));
    await waitFor(() => expect(disabled(PAY)).toBe(false));
    fireEvent.press(screen.getByLabelText(PAY));
    fireEvent.press(await screen.findByText('rzp success'));
  };

  it('paid flow verifies with the profile and shows the queue', async () => {
    verify.mockResolvedValue(undefined);
    mine.mockResolvedValue([entry()]);
    await payWith();
    expect(await screen.findByText("You're in the queue for approval")).toBeTruthy();
    expect(order).toHaveBeenCalledWith('t1', 'c1');
    expect(verify).toHaveBeenCalledWith({ razorpayOrderId: 'ord_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig_1', profile: PROFILE });
    expect(screen.getByText('₹628.32 paid. The organiser reviews entries before the auction.')).toBeTruthy();
    expect(mockStore.size).toBe(0);
    // Opened from Profile, going back would land on Profile: go to the tournament instead.
    fireEvent.press(screen.getByLabelText('Back to tournament'));
    expect(mockDismissTo).toHaveBeenCalledWith({ pathname: '/tournament/[id]', params: { id: 't1' } });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('a failed verify keeps the payment and offers Confirm my entry, not Pay', async () => {
    verify.mockRejectedValue(new Error('boom'));
    await payWith();
    expect(await screen.findByText(/ord_1/)).toBeTruthy();
    expect(screen.getByText(/payment went through/)).toBeTruthy();
    expect(screen.getByLabelText('Confirm my entry')).toBeTruthy();
    expect(screen.queryByText(PAY)).toBeNull();
    expect(JSON.parse(mockStore.get('kria.pendingPayment.u1.c1')!)).toMatchObject({ orderId: 'ord_1', paymentId: 'pay_1' });
    // No mail app must not throw unhandled, and the address is readable without one.
    const caught = jest.fn();
    const open = jest.spyOn(Linking, 'openURL').mockReturnValue({ catch: caught } as never);
    fireEvent.press(screen.getByText('Contact support'));
    expect(open.mock.calls[0][0]).toMatch(/^mailto:support@kria\.club/);
    expect(caught).toHaveBeenCalled();
    expect(screen.getByText(/support@kria\.club/).props.selectable).toBe(true);
  });

  it('a store failure after a good verify still shows the entry', async () => {
    verify.mockResolvedValue(undefined);
    mine.mockResolvedValue([entry()]);
    mockDeleteFails = true;
    await payWith();
    expect(await screen.findByText("You're in the queue for approval")).toBeTruthy();
    expect(screen.queryByLabelText('Confirm my entry')).toBeNull();
    expect(screen.queryByText(/payment went through/)).toBeNull();
  });

  it('Android back on the payment asks before cancelling it', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen();
    fireEvent.press(screen.getByText('Advanced'));
    await waitFor(() => expect(disabled(PAY)).toBe(false));
    fireEvent.press(screen.getByLabelText(PAY));
    await screen.findByText('rzp success');
    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');
    expect(screen.getByText('rzp success')).toBeTruthy();
    expect(alert.mock.calls[0][0]).toBe('Cancel this payment?');
    const buttons = alert.mock.calls[0][2]!;
    expect(buttons.map((b) => b.text)).toEqual(['Keep paying', 'Cancel payment']);
    act(() => buttons[1].onPress!());
    expect(screen.queryByText('rzp success')).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it('dismissing Razorpay returns to the form with nothing saved', async () => {
    renderScreen();
    fireEvent.press(screen.getByText('Beginner'));
    await waitFor(() => expect(disabled(PAY)).toBe(false));
    fireEvent.press(screen.getByLabelText(PAY));
    fireEvent.press(await screen.findByText('rzp dismiss'));
    expect(screen.queryByText('rzp success')).toBeNull();
    expect(screen.getByLabelText(PAY)).toBeTruthy();
    expect(mockStore.size).toBe(0);
    expect(verify).not.toHaveBeenCalled();
  });
});

describe('2b saved payment', () => {
  beforeEach(() => { mockStore.set('kria.pendingPayment.u1.c1', JSON.stringify(SAVED)); });

  it('a saved result shows Confirm my entry on open and retries once', async () => {
    verify.mockRejectedValue(new Error('boom'));
    renderScreen();
    expect(await screen.findByText(/ord_1/)).toBeTruthy();
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith({ razorpayOrderId: 'ord_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig_1', profile: PROFILE });
    expect(screen.getByLabelText('Confirm my entry')).toBeTruthy();
    expect(screen.queryByText(PAY)).toBeNull();
  });

  it('a Confirm my entry tap never overlaps the automatic retry', async () => {
    const d = deferred();
    verify.mockReturnValue(d.promise);
    mine.mockResolvedValue([entry()]);
    renderScreen();
    await waitFor(() => expect(verify).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(PAY)).toBeNull();
    fireEvent.press(screen.getByText('Confirming'));
    expect(verify).toHaveBeenCalledTimes(1);
    d.resolve();
    expect(await screen.findByText("You're in the queue for approval")).toBeTruthy();
    // Not paid in this session: no amount, no check.
    expect(screen.getByText('The organiser reviews entries before the auction.')).toBeTruthy();
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('Confirm my entry retries after a failure', async () => {
    verify.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    mine.mockResolvedValueOnce([]).mockResolvedValue([entry()]);
    renderScreen();
    await screen.findByText(/ord_1/);
    fireEvent.press(screen.getByLabelText('Confirm my entry'));
    expect(await screen.findByText("You're in the queue for approval")).toBeTruthy();
    expect(verify).toHaveBeenCalledTimes(2);
    expect(mockStore.size).toBe(0);
  });
});

describe('2b free flow and entered view', () => {
  it('free category registers without payment', async () => {
    mockBase = base(tournament(), category({ isPaidRegistration: false, registrationFee: 0 }));
    register.mockResolvedValue(undefined);
    mine.mockResolvedValue([entry()]);
    renderScreen();
    expect(screen.getByText('Free entry')).toBeTruthy();
    fireEvent.press(screen.getByText('Beginner'));
    await waitFor(() => expect(disabled('Register')).toBe(false));
    fireEvent.press(screen.getByLabelText('Register'));
    expect(await screen.findByText("You're in the queue for approval")).toBeTruthy();
    expect(register).toHaveBeenCalledWith({ tournamentId: 't1', categoryId: 'c1', profile: { ...PROFILE, skillLevel: 'beginner' } });
    expect(order).not.toHaveBeenCalled();
  });

  it('a free registration refusal shows the server message', async () => {
    mockBase = base(tournament(), category({ isPaidRegistration: false, registrationFee: 0 }));
    register.mockRejectedValue({ response: { data: { message: 'This category is full.' } } });
    renderScreen();
    fireEvent.press(screen.getByText('Beginner'));
    await waitFor(() => expect(disabled('Register')).toBe(false));
    fireEvent.press(screen.getByLabelText('Register'));
    expect(await screen.findByText('This category is full.')).toBeTruthy();
  });

  it('an entered category opens on the status timeline', async () => {
    mockBase = base(tournament(), category(), [entry({ status: 'approved' })]);
    renderScreen();
    await settle();
    expect(screen.getByText("You're approved")).toBeTruthy();
    for (const t of ['Payment received', 'Pending approval', 'Approved', 'In the auction pool', 'Assigned to a team']) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(screen.queryByText(/Pay ₹/)).toBeNull();
  });

  // The server keeps a withdrawn registration, so entering again is always refused.
  it('a withdrawn entry opens on the entered view, with no Pay or Register', async () => {
    mockBase = base(tournament(), category(), [entry({ status: 'withdrawn' })]);
    renderScreen();
    await settle();
    expect(screen.getByText('You withdrew this entry')).toBeTruthy();
    expect(screen.getByText('Withdrawn')).toBeTruthy();
    expect(screen.queryByText(/Pay ₹/)).toBeNull();
    expect(screen.queryByLabelText('Register')).toBeNull();
    expect(screen.getByLabelText('Back to tournament')).toBeTruthy();
  });

  it('a withdrawn free entry offers no Register either', async () => {
    mockBase = base(tournament(), category({ isPaidRegistration: false, registrationFee: 0 }), [entry({ status: 'withdrawn' })]);
    renderScreen();
    await settle();
    expect(screen.getByText('You withdrew this entry')).toBeTruthy();
    expect(screen.queryByLabelText('Register')).toBeNull();
  });
});
