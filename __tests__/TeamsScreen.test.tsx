import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import Teams from '../src/app/tournament/[id]/teams';

const mockPush = jest.fn();
let mockParams: Record<string, string> = { id: 'T1' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/useTournament', () => ({ useTournament: () => mockHook() }));
jest.mock('@/api/tournaments', () => ({ getTournamentTeams: jest.fn() }));
jest.mock('@/api/profileApi', () => ({ getTeamRoster: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getTournamentTeams } = require('@/api/tournaments');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getTeamRoster } = require('@/api/profileApi');
const mockHook = jest.fn();

const teams = [
  { _id: 't1', name: 'Sunrise', owner: { name: 'Priya' }, budget: 9000, initialBudget: 100000, whatsappGroupLink: 'https://chat.whatsapp.com/abc' },
  { _id: 't2', name: 'Tigers', owner: { name: 'Ravi' }, budget: 5000, initialBudget: 50000, whatsappGroupLink: 'https://chat.whatsapp.com/xyz' },
];
const cats = [{ _id: 'c1', name: "Men's Singles" }, { _id: 'c2', name: 'Mixed Doubles' }];
const row = (id: string, playerId: string, first: string, categoryId: string, price: number, role = 'normal') => ({
  _id: id, playerId, profile: { firstName: first, lastName: 'K' }, categoryId, role, status: 'auctioned', auctionData: { soldPrice: price },
});

function setup(mine: unknown[] = [{ _id: 'e1', teamId: 't1' }]) {
  mockHook.mockReturnValue({ data: { tournament: { name: 'Arohance Open' }, categories: cats, mine }, loading: false, error: false, reload: jest.fn() });
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { ...authReducer(undefined, { type: '@@preload' }), user: { _id: 'me' } as never } } });
  return render(<Provider store={store}><Teams /></Provider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'T1' };
  getTournamentTeams.mockResolvedValue(teams);
  getTeamRoster.mockResolvedValue([
    row('r1', 'p1', 'Asha', 'c1', 60000, 'captain'),
    row('r2', 'p2', 'Bina', 'c1', 20000, 'icon'),
    row('r3', 'p2', 'Bina', 'c2', 11000),
  ]);
});

describe('Teams screen', () => {
  it('selects the team from the param, else mine', async () => {
    mockParams = { id: 'T1', team: 't2' };
    const a = setup();
    expect(await screen.findByText('Owner Ravi')).toBeTruthy();
    expect(screen.queryByText('Your team')).toBeNull();
    a.unmount();
    mockParams = { id: 'T1' };
    setup();
    expect(await screen.findByText('Your team')).toBeTruthy();
    expect(screen.getByText('Owner Priya')).toBeTruthy();
  });

  it('stats and squad', async () => {
    setup();
    expect(await screen.findByText('Owner Priya')).toBeTruthy();
    expect(await screen.findByText('2')).toBeTruthy();
    expect(screen.getByText('Spent')).toBeTruthy();
    expect(screen.getByText('₹91,000')).toBeTruthy();
    expect(screen.getByText('Purse left')).toBeTruthy();
    expect(screen.getByText('₹9,000')).toBeTruthy();
    expect(screen.getByText("Men's Singles · Mixed Doubles")).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('ICON')).toBeTruthy();
    fireEvent.press(screen.getByText('Asha K'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/player/[playerId]', params: { playerId: 'p1' } });
  });

  it('WhatsApp only on my own team', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const a = setup();
    fireEvent.press(await screen.findByText('Join'));
    expect(spy).toHaveBeenCalledWith('https://chat.whatsapp.com/abc');
    expect(screen.getByText('Only visible to Sunrise players')).toBeTruthy();
    a.unmount();
    mockParams = { id: 'T1', team: 't2' };
    setup();
    await screen.findByText('Owner Ravi');
    expect(screen.queryByText('Team WhatsApp group')).toBeNull();
  });

  // DESIGN §8: a failure is an inline error with Retry, never an empty state.
  it('a roster failure says so with Retry, not No players yet', async () => {
    getTeamRoster.mockRejectedValueOnce(new Error('net'));
    setup();
    expect(await screen.findByText("Couldn't load the squad.")).toBeTruthy();
    expect(screen.queryByText('No players yet')).toBeNull();
    fireEvent.press(screen.getByText('Retry'));
    expect(await screen.findByText('Asha K')).toBeTruthy();
    expect(screen.queryByText("Couldn't load the squad.")).toBeNull();
    expect(getTeamRoster).toHaveBeenCalledTimes(2);
  });

  it('a teams failure says so', async () => {
    getTournamentTeams.mockRejectedValueOnce(new Error('net'));
    setup();
    expect(await screen.findByText("Couldn't load the teams.")).toBeTruthy();
  });

  it('empty roster', async () => {
    getTeamRoster.mockResolvedValue([]);
    setup();
    expect(await screen.findByText('No players yet')).toBeTruthy();
    expect(screen.getByText('Players join teams at the auction.')).toBeTruthy();
    await waitFor(() => expect(getTeamRoster).toHaveBeenCalledWith('t1'));
  });
});
