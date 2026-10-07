import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import JoinQuickMatchScreen from '../src/app/quick/join';
import { claimKnockoutGuest, joinQuickKnockout, resolveQuickCode } from '@/api/quickKnockout';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'p5', firstName: 'Rahul', lastName: 'Singh' } } }),
}));
jest.mock('@/api/quickKnockout', () => ({
  resolveQuickCode: jest.fn(),
  joinQuickKnockout: jest.fn(async () => ({ _id: 'k1' })),
  claimKnockoutGuest: jest.fn(async () => ({ _id: 'k1' })),
}));

const knockout = {
  _id: 'k1', hostId: 'h1', name: 'Sunday Smash', format: 'doubles', status: 'waiting',
  players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' }, { playerKey: 'g', displayName: 'Sam' }],
};

beforeEach(() => jest.clearAllMocks());

async function lookUp(code: string) {
  render(<JoinQuickMatchScreen />);
  fireEvent.changeText(screen.getByPlaceholderText('ABC234'), code);
  await act(async () => { fireEvent.press(screen.getByText('Find')); });
}

it('a knockout code: join as yourself', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: knockout });
  await lookUp('KX4P9M');
  fireEvent.press(await screen.findByText('Join as Rahul Singh'));
  await waitFor(() => expect(joinQuickKnockout).toHaveBeenCalledWith('KX4P9M'));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
});

it('a knockout code: take a name the host typed', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: knockout });
  await lookUp('KX4P9M');
  fireEvent.press(await screen.findByText('Sam'));
  await waitFor(() => expect(claimKnockoutGuest).toHaveBeenCalledWith('KX4P9M', 'g'));
});

it('a knockout you are already in opens, whatever its status', async () => {
  const mine = { ...knockout, status: 'live', players: [...knockout.players, { playerKey: 'r', playerId: 'p5', displayName: 'Rahul Singh' }] };
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: mine });
  await lookUp('KX4P9M');
  fireEvent.press(await screen.findByText('You are in · Open'));
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
  expect(screen.queryByText('This knockout has already started.')).toBeNull();
});

it.each([
  ['live', 'This knockout has already started.'],
  ['completed', 'This knockout has finished.'],
  ['cancelled', 'This knockout was cancelled.'],
])('a %s knockout you are not in says so, with no way to join', async (status, message) => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: { ...knockout, status } });
  await lookUp('KX4P9M');
  expect(await screen.findByText(message)).toBeTruthy();
  expect(screen.queryByText('Join as Rahul Singh')).toBeNull();
  expect(screen.queryByText('Sam')).toBeNull();
});

it('a match code keeps the slot picker', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({
    kind: 'match',
    data: { _id: 'm1', hostId: 'h1', status: 'live', sides: [
      { sideId: 's1', name: 'Arjun', slots: [{ slotId: 'a1', playerId: 'h1', displayName: 'Arjun' }] },
      { sideId: 's2', name: 'Rahul', slots: [{ slotId: 'b1', displayName: 'Rahul' }] },
    ] },
  });
  await lookUp('ABC234');
  expect(await screen.findByText('Pick a slot')).toBeTruthy();
});

it('an unknown code says so', async () => {
  (resolveQuickCode as jest.Mock).mockRejectedValue({ response: { data: { message: 'No match or knockout has that code.' } } });
  await lookUp('ZZZZZZ');
  expect(await screen.findByText('No match or knockout has that code.')).toBeTruthy();
});

const cricket = {
  _id: 'k2', hostId: 'h1', name: 'Sunday Cup', sport: 'cricket', format: 'teams', status: 'waiting',
  matchConfig: { maxOvers: 8, playersPerTeam: 2 },
  teams: [{ teamId: 't1', name: 'Strikers' }, { teamId: 't2', name: 'Royals' }, { teamId: 't3', name: 'Team 3' }],
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta', teamId: 't1' },
    { playerKey: 'g', displayName: 'Sam', teamId: 't1' },
  ],
};

it('a cricket knockout: pick a team, then join it', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: cricket });
  await lookUp('KX4P9M');
  expect(await screen.findByText('Knockout · Cricket · 8 overs')).toBeTruthy();
  fireEvent.press(screen.getByText('Royals'));
  fireEvent.press(screen.getByText('Join as Rahul Singh'));
  await waitFor(() => expect(joinQuickKnockout).toHaveBeenCalledWith('KX4P9M', 't2'));
});

it('a cricket knockout: no pick joins Any team, and a full team cannot be picked', async () => {
  (resolveQuickCode as jest.Mock).mockResolvedValue({ kind: 'knockout', data: cricket });
  await lookUp('KX4P9M');
  expect(await screen.findByText('Full')).toBeTruthy();
  fireEvent.press(screen.getByText('Strikers'));
  fireEvent.press(screen.getByText('Join as Rahul Singh'));
  await waitFor(() => expect(joinQuickKnockout).toHaveBeenCalledWith('KX4P9M'));
});
