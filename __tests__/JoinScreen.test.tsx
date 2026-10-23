import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import JoinQuickMatchScreen from '../src/app/quick/join';
import { claimKnockoutGuest, joinQuickKnockout, resolveQuickCode } from '@/api/quickKnockout';
import { claimQuickMatchSlot } from '@/api/quickMatch';

let mockParams: { code?: string } = { code: 'ABC234' };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'p5', firstName: 'Priya', lastName: 'Nair' } } }),
}));
jest.mock('@/api/quickKnockout', () => ({
  resolveQuickCode: jest.fn(),
  joinQuickKnockout: jest.fn(async () => ({ _id: 'k1' })),
  claimKnockoutGuest: jest.fn(async () => ({ _id: 'k1' })),
}));
jest.mock('@/api/quickMatch', () => ({ claimQuickMatchSlot: jest.fn(async () => ({ _id: 'm1' })) }));

const matchData = (slots: { playerId?: string; displayName: string }[]) => ({
  kind: 'match',
  data: {
    _id: 'm1', hostId: 'h1', sport: 'badminton', joinCode: 'ABC234', status: 'waiting', createdAt: '',
    matchConfig: { bestOf: 3, pointsToWin: 21 },
    sides: [
      { sideId: 's1', name: 'Smash', slots: [{ slotId: 'a1', playerId: 'h1', displayName: 'Arjun Rao' }] },
      { sideId: 's2', name: 'Net', slots: slots.map((s, i) => ({ slotId: `b${i}`, ...s })) },
    ],
  },
});

const knockout = {
  _id: 'k1', hostId: 'h1', name: 'Sunday Smash', sport: 'badminton', format: 'doubles', status: 'waiting',
  matchConfig: { bestOf: 3, pointsToWin: 21 },
  players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' }, { playerKey: 'g', displayName: 'Sam' }],
};
const cricket = {
  ...knockout, _id: 'k2', sport: 'cricket', format: 'teams', matchConfig: { maxOvers: 8, playersPerTeam: 2 },
  teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Royals' }],
};

beforeEach(() => { jest.clearAllMocks(); mockParams = { code: 'ABC234' }; });

const open = async (found: unknown) => {
  (resolveQuickCode as jest.Mock).mockResolvedValue(found);
  render(<JoinQuickMatchScreen />);
  await act(async () => {});
};

it('with no code it goes to Compete matches', () => {
  mockParams = {};
  render(<JoinQuickMatchScreen />);
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/compete?seg=matches');
  expect(resolveQuickCode).not.toHaveBeenCalled();
});

it('match: select a spot, then take it once', async () => {
  await open(matchData([{ displayName: 'Player 3' }]));
  expect(screen.getByText('Quick match · Badminton')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Take this spot'));
  expect(claimQuickMatchSlot).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Player 3'));
  const btn = screen.getByLabelText('Take this spot');
  fireEvent.press(btn);
  fireEvent.press(btn);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/quick/[id]', params: { id: 'm1' } }));
  expect(claimQuickMatchSlot).toHaveBeenCalledTimes(1);
  expect(claimQuickMatchSlot).toHaveBeenCalledWith('ABC234', 'b0');
});

it('match: a failed claim re-reads the code, shows the message, clears selection', async () => {
  await open(matchData([{ displayName: 'Player 3' }, { displayName: 'Player 4' }]));
  (claimQuickMatchSlot as jest.Mock).mockRejectedValueOnce({ response: { data: { message: 'That spot was just taken.' } } });
  (resolveQuickCode as jest.Mock).mockResolvedValue(matchData([{ playerId: 'x', displayName: 'Player 3' }, { displayName: 'Player 4' }]));
  fireEvent.press(screen.getByText('Player 3'));
  await act(async () => { fireEvent.press(screen.getByLabelText('Take this spot')); });
  expect(await screen.findByText('That spot was just taken.')).toBeTruthy();
  expect(resolveQuickCode).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText('Taken')).toHaveLength(2);
  expect(screen.getByLabelText('Take this spot').props.accessibilityState.disabled).toBe(true);
});

it('match: every spot taken', async () => {
  await open(matchData([{ playerId: 'x', displayName: 'Player 3' }]));
  expect(screen.getByText('Every spot is taken. Ask the host to add you.')).toBeTruthy();
  expect(screen.queryByLabelText('Take this spot')).toBeNull();
});

it('match: already in', async () => {
  await open(matchData([{ playerId: 'p5', displayName: 'Priya Nair' }, { displayName: 'Open one' }]));
  expect(screen.getByText("You're in this match")).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Open'));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/quick/[id]', params: { id: 'm1' } });
  expect(screen.queryByLabelText('Take this spot')).toBeNull();
});

it('knockout: cricket team pick joins that team', async () => {
  await open({ kind: 'knockout', data: cricket });
  fireEvent.press(screen.getByText('Royals'));
  fireEvent.press(screen.getByLabelText('Join as Priya Nair'));
  await waitFor(() => expect(joinQuickKnockout).toHaveBeenCalledWith('ABC234', 't2'));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
});

it('knockout: any team, one request on a double tap', async () => {
  await open({ kind: 'knockout', data: cricket });
  fireEvent.press(screen.getByLabelText('Join as Priya Nair'));
  fireEvent.press(screen.getByLabelText('Join as Priya Nair'));
  await waitFor(() => expect(joinQuickKnockout).toHaveBeenCalledWith('ABC234'));
  expect(joinQuickKnockout).toHaveBeenCalledTimes(1);
});

it('knockout: a guest chip claims that name', async () => {
  await open({ kind: 'knockout', data: knockout });
  fireEvent.press(screen.getByText('Sam'));
  await waitFor(() => expect(claimKnockoutGuest).toHaveBeenCalledWith('ABC234', 'g'));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
});

it('knockout: closed shows its message and no join', async () => {
  await open({ kind: 'knockout', data: { ...knockout, status: 'live' } });
  expect(screen.getByText('This knockout has already started.')).toBeTruthy();
  expect(screen.queryByLabelText('Join as Priya Nair')).toBeNull();
});

it('knockout: already in opens', async () => {
  await open({ kind: 'knockout', data: { ...knockout, players: [...knockout.players, { playerKey: 'r', playerId: 'p5', displayName: 'Priya Nair' }] } });
  expect(screen.getByText("You're in")).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Open'));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
});

it('a lookup that fails shows the server message', async () => {
  (resolveQuickCode as jest.Mock).mockRejectedValue({ response: { data: { message: 'No match or knockout has that code.' } } });
  render(<JoinQuickMatchScreen />);
  expect(await screen.findByText('No match or knockout has that code.')).toBeTruthy();
});
