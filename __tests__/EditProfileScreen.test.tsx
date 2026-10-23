import { fireEvent, render, screen, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import EditProfile from '../src/app/profile/edit';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: () => mockBack(), canGoBack: () => true, replace: jest.fn() }),
}));
jest.mock('@/components/profile/usePhotoUpload', () => ({ usePhotoUpload: () => ({ pick: jest.fn(), busy: false }) }));
jest.mock('@react-native-community/datetimepicker', () => () => null);
const mockPatch = jest.fn();
jest.mock('@/api/axios', () => ({ __esModule: true, default: { patch: (...a: unknown[]) => mockPatch(...a), get: jest.fn(), post: jest.fn() } }));

const user = { _id: 'p1', firstName: 'Priya', lastName: 'Nair', email: 'priya@kria.club', phone: '9845012345', status: 'active', dateOfBirth: '2000-01-01', gender: 'female', sport: 'badminton', location: 'Bengaluru' };
const renderIt = () => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@x' }), user } as never } });
  return render(<Provider store={store}><EditProfile /></Provider>);
};
beforeEach(() => jest.clearAllMocks());

it('prefills from the signed-in player and keeps email read-only', () => {
  renderIt();
  expect(screen.getByLabelText('First name').props.value).toBe('Priya');
  expect(screen.getByLabelText('Last name').props.value).toBe('Nair');
  expect(screen.getByLabelText('Phone').props.value).toBe('9845012345');
  expect(screen.getByLabelText('City').props.value).toBe('Bengaluru');
  expect(screen.getByText('priya@kria.club')).toBeTruthy();
  expect(screen.queryByLabelText('Email')).toBeNull();
  expect(screen.getByText('Your profile is ready for tournaments.')).toBeTruthy();
});

it('saves once on a double tap and goes back', async () => {
  let resolve!: (v: unknown) => void;
  mockPatch.mockReturnValue(new Promise((r) => (resolve = r)));
  renderIt();
  fireEvent.changeText(screen.getByLabelText('City'), '');
  fireEvent.press(screen.getByLabelText('Badminton'));
  fireEvent.press(screen.getByLabelText('Save'));
  fireEvent.press(screen.getByLabelText('Saving'));
  expect(mockPatch).toHaveBeenCalledTimes(1);
  expect(mockPatch).toHaveBeenCalledWith('/player/auth/profile', {
    firstName: 'Priya', lastName: 'Nair', phone: '9845012345', gender: 'female', dateOfBirth: '2000-01-01', sport: '', location: '',
  });
  await act(async () => resolve({ data: { data: { ...user, sport: '' } } }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it('blocks a blank first name', async () => {
  renderIt();
  fireEvent.changeText(screen.getByLabelText('First name'), '  ');
  await act(async () => fireEvent.press(screen.getByLabelText('Save')));
  expect(screen.getByText('First name, last name and phone are required.')).toBeTruthy();
  expect(mockPatch).not.toHaveBeenCalled();
});
