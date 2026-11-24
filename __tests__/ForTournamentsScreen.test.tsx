import { fireEvent, render, screen, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import ForTournaments from '../src/app/(onboarding)/for-tournaments';

// LAUNCH-AUDIT H26: the onboarding step that first asks for a date of birth.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn() }) }));
const mockPatch = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/api/axios', () => ({ __esModule: true, default: { patch: (...a: unknown[]) => mockPatch(...a), delete: (...a: unknown[]) => mockDelete(...a), get: jest.fn(), post: jest.fn(async () => ({})) } }));
jest.mock('@/lib/googleSignIn', () => ({ googleSignOut: jest.fn(() => Promise.resolve()) }));

const user = { _id: 'p1', firstName: 'Asha', lastName: 'Rao', email: 'a@kria.club', status: 'active' };
const renderIt = () => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@x' }), user } as never } });
  return render(<Provider store={store}><ForTournaments /></Provider>);
};
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState?.disabled;
const enterBorn = (yearsAgo: number) => {
  fireEvent.changeText(screen.getByLabelText('DD'), '01');
  fireEvent.changeText(screen.getByLabelText('MM'), '01');
  fireEvent.changeText(screen.getByLabelText('YYYY'), String(new Date().getFullYear() - yearsAgo - 1));
  fireEvent.press(screen.getByText('Female'));
};

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it('says Kria is for 13 and over, and cannot save, for a younger player', () => {
  renderIt();
  enterBorn(10);
  expect(screen.getByText('Kria is for players 13 and over.')).toBeTruthy();
  expect(disabled('Save')).toBe(true);
});

// Your call (23 Nov): the date of birth can't be skipped, so an account under 13 can't be finished.
it('has no Skip, and offers an under-13 a way to delete the account', async () => {
  mockDelete.mockResolvedValue({ data: {} });
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((x) => x.style === 'destructive')?.onPress?.());
  renderIt();
  expect(screen.queryByLabelText('Skip')).toBeNull();
  enterBorn(10);
  await act(async () => fireEvent.press(screen.getByLabelText('Delete this account')));
  expect(mockDelete).toHaveBeenCalledWith('/player/auth/account');
});

it('saves a date of birth without a gender, which stays optional', async () => {
  mockPatch.mockResolvedValue({ data: { data: { ...user } } });
  renderIt();
  fireEvent.changeText(screen.getByLabelText('DD'), '01');
  fireEvent.changeText(screen.getByLabelText('MM'), '01');
  fireEvent.changeText(screen.getByLabelText('YYYY'), String(new Date().getFullYear() - 30));
  expect(disabled('Save')).toBe(false);
  await act(async () => fireEvent.press(screen.getByLabelText('Save')));
  expect(mockPatch.mock.calls[0][1]).not.toHaveProperty('gender');
});

it("asks a 13 to 17 year old for a parent or guardian's agreement before saving it", async () => {
  mockPatch.mockResolvedValue({ data: { data: { ...user } } });
  renderIt();
  enterBorn(15);
  expect(disabled('Save')).toBe(true);

  fireEvent.press(screen.getByLabelText('My parent or guardian agrees'));
  expect(disabled('Save')).toBe(false);
  await act(async () => fireEvent.press(screen.getByLabelText('Save')));

  expect(mockPatch).toHaveBeenCalledWith('/player/auth/profile', expect.objectContaining({ gender: 'female', guardianConsent: true }));
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
});

it('asks nothing extra from 18', async () => {
  mockPatch.mockResolvedValue({ data: { data: { ...user } } });
  renderIt();
  enterBorn(20);
  expect(screen.queryByLabelText('My parent or guardian agrees')).toBeNull();
  await act(async () => fireEvent.press(screen.getByLabelText('Save')));
  expect(mockPatch.mock.calls[0][1]).not.toHaveProperty('guardianConsent');
});
