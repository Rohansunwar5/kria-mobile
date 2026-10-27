import { act, fireEvent, render, screen } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import API from '@/api/axios';
import authReducer from '@/store/slices/authSlice';
import YourGame from '../src/app/(onboarding)/your-game';
import ForTournaments from '../src/app/(onboarding)/for-tournaments';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }) }));

let mock: MockAdapter;
const makeStore = () => configureStore({
  reducer: { auth: authReducer },
  preloadedState: { auth: { ...authReducer(undefined, { type: 'x' }), pendingOnboarding: true } },
});
const ui = (el: React.ReactElement, store = makeStore()) => { render(<Provider store={store}>{el}</Provider>); return store; };
const flush = () => act(async () => {});
const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;
const city = (c: string, startDate = '2099-01-01T00:00:00Z') => ({ venue: { city: c }, status: 'registration_open', startDate });

beforeEach(() => { mock = new MockAdapter(API); mockPush.mockClear(); mockReplace.mockClear(); });
afterEach(() => mock.restore());

describe('Your game', () => {
  beforeEach(() => {
    mock.onGet('/tournament').reply(200, { data: { tournaments: [city('Mysuru', '2020-01-01T00:00:00Z'), city('Pune'), city('Pune'), city('Delhi'), city('Goa'), city('Agra'), city('Kochi')] } });
  });

  it('enables Continue only once a sport is picked', async () => {
    ui(<YourGame />);
    await flush();
    expect(disabled('Continue')).toBe(true);
    fireEvent.press(screen.getByLabelText('Cricket'));
    expect(disabled('Continue')).toBe(false);
  });

  it('shows at most 4 distinct upcoming venue cities and a tap fills the field', async () => {
    ui(<YourGame />);
    await flush();
    expect(screen.queryByLabelText('City suggestion Mysuru')).toBeNull();
    expect(screen.getByLabelText('City suggestion Pune')).toBeTruthy();
    expect(screen.getByLabelText('City suggestion Agra')).toBeTruthy();
    expect(screen.queryByLabelText('City suggestion Kochi')).toBeNull();
    fireEvent.press(screen.getByLabelText('City suggestion Pune'));
    expect(screen.getByLabelText('City').props.value).toBe('Pune');
  });

  it('Continue saves sport and location then opens For tournaments', async () => {
    mock.onPatch('/player/auth/profile').reply(200, { data: {} });
    ui(<YourGame />);
    await flush();
    fireEvent.press(screen.getByLabelText('Cricket'));
    fireEvent.changeText(screen.getByLabelText('City'), ' Pune ');
    fireEvent.press(screen.getByLabelText('Continue'));
    await flush();
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ sport: 'cricket', location: 'Pune' });
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/for-tournaments');
  });

  it('Skip opens For tournaments without saving', async () => {
    ui(<YourGame />);
    await flush();
    fireEvent.press(screen.getByLabelText('Skip'));
    expect(mock.history.patch).toHaveLength(0);
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/for-tournaments');
  });

  it('stays with the message when saving fails', async () => {
    mock.onPatch('/player/auth/profile').reply(400, { message: 'Nope' });
    ui(<YourGame />);
    await flush();
    fireEvent.press(screen.getByLabelText('Cricket'));
    fireEvent.press(screen.getByLabelText('Continue'));
    await flush();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Nope')).toBeTruthy();
  });
});

describe('For tournaments', () => {
  const dob = (d: string, m: string, y: string) => {
    fireEvent.changeText(screen.getByLabelText('DD'), d);
    fireEvent.changeText(screen.getByLabelText('MM'), m);
    fireEvent.changeText(screen.getByLabelText('YYYY'), y);
  };

  it('enables Save only with a valid date and a gender', () => {
    ui(<ForTournaments />);
    expect(disabled('Save')).toBe(true);
    dob('15', '03', '2001');
    expect(screen.getByText(/years old/)).toBeTruthy();
    expect(disabled('Save')).toBe(true);
    fireEvent.press(screen.getByText('Female'));
    expect(disabled('Save')).toBe(false);
  });

  it('shows an error for an invalid date', () => {
    ui(<ForTournaments />);
    dob('31', '02', '2001');
    expect(screen.getByText("That date doesn't look right.")).toBeTruthy();
  });

  it('Save sends the ISO date and gender, ends the handoff and goes home', async () => {
    mock.onPatch('/player/auth/profile').reply(200, { data: {} });
    const store = ui(<ForTournaments />);
    dob('15', '03', '2001');
    fireEvent.press(screen.getByText('Female'));
    fireEvent.press(screen.getByLabelText('Save'));
    await flush();
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ dateOfBirth: '2001-03-15', gender: 'female' });
    expect(store.getState().auth.pendingOnboarding).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('stays with the message when Save fails', async () => {
    mock.onPatch('/player/auth/profile').reply(400, { message: 'Nope' });
    const store = ui(<ForTournaments />);
    dob('15', '03', '2001');
    fireEvent.press(screen.getByText('Male'));
    fireEvent.press(screen.getByLabelText('Save'));
    await flush();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(store.getState().auth.pendingOnboarding).toBe(true);
    expect(screen.getByText('Nope')).toBeTruthy();
  });

  it('Skip sends nothing, ends the handoff and goes home', async () => {
    const store = ui(<ForTournaments />);
    fireEvent.press(screen.getByLabelText('Skip'));
    expect(mock.history.patch).toHaveLength(0);
    expect(store.getState().auth.pendingOnboarding).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
  });
});
