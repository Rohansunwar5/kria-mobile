import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import YourGame from '@/app/(onboarding)/your-game';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/api/tournaments', () => ({ latestTournaments: jest.fn(async () => []) }));
const mockPatch = jest.fn(async () => ({ data: { data: { _id: 'p1', sport: 'football' } } }));
jest.mock('@/api/axios', () => ({ __esModule: true, default: { patch: (...a: unknown[]) => (mockPatch as any)(...a), get: jest.fn(), post: jest.fn() } }));

const renderIt = () => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@x' }), user: { _id: 'p1', firstName: 'A', lastName: 'B', email: 'a@b.c', status: 'active' } } as never } });
  return render(<Provider store={store}><YourGame /></Provider>);
};
beforeEach(() => jest.clearAllMocks());

it('offers eight sports and marks the five that are not live', () => {
  renderIt();
  for (const name of ['Badminton', 'Cricket', 'Table Tennis', 'Football', 'Tennis', 'Kabaddi', 'Volleyball', 'Basketball']) {
    expect(screen.getByLabelText(name)).toBeTruthy();
  }
  expect(screen.getAllByText('Not on Kria yet')).toHaveLength(5);
});

it('explains a sport that is not live yet, and says nothing for a live one', () => {
  renderIt();
  fireEvent.press(screen.getByLabelText('Football'));
  expect(screen.getByText("Football isn't on Kria yet. You'll get a ranking once it's live.")).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Table Tennis'));
  expect(screen.queryByText(/isn't on Kria yet/)).toBeNull();
});

it('saves a not-live sport as the main sport', async () => {
  renderIt();
  fireEvent.press(screen.getByLabelText('Football'));
  fireEvent.press(screen.getByText('Continue'));
  await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/player/auth/profile', { sport: 'football' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(onboarding)/for-tournaments'));
});

it('tells screen readers which sports are not live', () => {
  renderIt();
  expect(screen.getByLabelText('Football').props.accessibilityHint).toBe('Not on Kria yet');
  expect(screen.getByLabelText('Cricket').props.accessibilityHint).toBeUndefined();
});
