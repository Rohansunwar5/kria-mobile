import { Alert, ScrollView, type AlertButton } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import KnockoutScreen from '../src/app/knockout/[id]';
import type { KnockoutPlayer } from '../src/api/quickKnockout';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'k1' }),
  useIsFocused: () => true, // Badge (champion banner) reads it
}));
let mockViewer = 'h1';
let mockStatus = 'waiting';
const mockBasePlayers: KnockoutPlayer[] = [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun' }, { playerKey: 'b', playerId: 'p2', displayName: 'Rahul' }, { playerKey: 'c', displayName: 'Sam' }];
let mockPlayers: KnockoutPlayer[] = mockBasePlayers;
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: mockViewer } } }),
}));
const mockActions = {
  draw: jest.fn(), start: jest.fn(), cancel: jest.fn(), award: jest.fn(), addGuest: jest.fn(), addPlayer: jest.fn(), removePlayer: jest.fn(), pair: jest.fn(), unpair: jest.fn(),
  acceptInvite: jest.fn(() => Promise.resolve(true)), declineInvite: jest.fn(() => Promise.resolve(true)), playAsGuest: jest.fn(),
};
jest.mock('@/lib/useQuickKnockout', () => ({
  useQuickKnockout: () => ({
    knockout: {
      _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Cup', sport: 'badminton', format: 'singles',
      matchConfig: { bestOf: 1, pointsToWin: 21 }, status: mockStatus, awardsEligible: true,
      players: mockPlayers,
      pairs: [],
      entrants: [{ entrantId: 'e1', playerKeys: ['a'] }, { entrantId: 'e2', playerKeys: ['b'] }, { entrantId: 'e3', playerKeys: ['c'] }],
      fixtures: [
        { fixtureId: 'f1', round: 1, position: 0, entrantA: 'e1', bye: true, winnerEntrantId: 'e1' },
        { fixtureId: 'f2', round: 1, position: 1, entrantA: 'e2', entrantB: 'e3', bye: false, quickMatchId: 'm2' },
        { fixtureId: 'f3', round: 2, position: 0, entrantA: 'e1', bye: false },
      ],
      roundNames: ['Semi-Final', 'Final'], awards: [], createdAt: '2026-10-07T00:00:00.000Z',
      championEntrantId: mockStatus === 'completed' ? 'e1' : undefined,
    },
    loading: false, error: false, busy: false, problem: '', reload: jest.fn(), ...mockActions,
  }),
}));

const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
beforeEach(() => { jest.clearAllMocks(); mockPlayers = mockBasePlayers; });

/** Presses Cancel knockout and returns the confirmation's buttons. */
function askToCancel() {
  fireEvent.press(screen.getByText('Cancel knockout'));
  expect(alert).toHaveBeenCalledTimes(1);
  return (alert.mock.calls[0][2] ?? []) as AlertButton[];
}

it('waiting: the host gets the draw bar pinned outside the scroll', () => {
  mockViewer = 'h1'; mockStatus = 'waiting';
  render(<KnockoutScreen />);
  // The first ScrollView in the tree is the page; the draw preview adds a second, horizontal one.
  const [page] = screen.UNSAFE_getAllByType(ScrollView);
  expect(within(page).queryByText('Start knockout')).toBeNull();
  fireEvent.press(screen.getByText('Start knockout'));
  expect(mockActions.start).toHaveBeenCalled();
});

it('waiting: a joined player gets no draw bar', () => {
  mockViewer = 'p2'; mockStatus = 'waiting';
  render(<KnockoutScreen />);
  expect(screen.queryByText('Start knockout')).toBeNull();
  expect(screen.queryByText('Cancel knockout')).toBeNull();
});

it('waiting: the host can cancel, once they confirm', () => {
  mockViewer = 'h1'; mockStatus = 'waiting';
  render(<KnockoutScreen />);
  const buttons = askToCancel();
  expect(mockActions.cancel).not.toHaveBeenCalled();
  buttons.find((b) => b.text === 'Cancel knockout' && b.style === 'destructive')!.onPress!();
  expect(mockActions.cancel).toHaveBeenCalledTimes(1);
});

it('live: dismissing the confirmation keeps the knockout going', () => {
  mockViewer = 'h1'; mockStatus = 'live';
  render(<KnockoutScreen />);
  askToCancel().find((b) => b.style === 'cancel')!.onPress?.();
  expect(mockActions.cancel).not.toHaveBeenCalled();
});

it('live: the tree opens a match', () => {
  mockViewer = 'h1'; mockStatus = 'live';
  render(<KnockoutScreen />);
  fireEvent.press(screen.getByLabelText('Rahul vs Sam, live. Open'));
  expect(router.push).toHaveBeenCalledWith('/quick/m2');
});

it('completed: champion banner, and the host gets a Give awards button, not inline chips', () => {
  mockViewer = 'h1'; mockStatus = 'completed';
  render(<KnockoutScreen />);
  expect(screen.getByText('Knockout winner')).toBeTruthy();
  expect(screen.getByText('Won Cup. The knockout badge is on their awards.')).toBeTruthy();
  expect(screen.queryByText('Fair Play')).toBeNull();
  fireEvent.press(screen.getByText('Give awards'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/knockout/awards/[id]', params: { id: 'k1' } });
});

it('completed: a joined player gets no Give awards button', () => {
  mockViewer = 'p2'; mockStatus = 'completed';
  render(<KnockoutScreen />);
  expect(screen.queryByText('Give awards')).toBeNull();
});

const invitedAsha = { playerKey: 'd', invitedPlayerId: 'p9', displayName: 'Asha Rao' };

it('waiting: the host sees an invite as waiting, and can play them as a guest', () => {
  mockViewer = 'h1'; mockStatus = 'waiting'; mockPlayers = [...mockBasePlayers, invitedAsha];
  render(<KnockoutScreen />);
  expect(screen.getByText('Invited · waiting')).toBeTruthy();
  expect(screen.getByText('Waiting for Asha Rao to accept. Remove them or play them as guests to start.')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Play Asha Rao as a guest'));
  expect(mockActions.playAsGuest).toHaveBeenCalledWith('d');
});

it('waiting: the search sheet says players are invited', () => {
  mockViewer = 'h1'; mockStatus = 'waiting';
  render(<KnockoutScreen />);
  fireEvent.press(screen.getByLabelText('Add a player'));
  expect(screen.getByText("Find a Kria player to invite, or type a guest's name.")).toBeTruthy();
});

it('waiting: the invitee sees the invite, and can accept', () => {
  mockViewer = 'p9'; mockStatus = 'waiting'; mockPlayers = [...mockBasePlayers, invitedAsha];
  render(<KnockoutScreen />);
  expect(screen.getByText('Arjun invited you to Cup')).toBeTruthy();
  fireEvent.press(screen.getByText('Accept'));
  expect(mockActions.acceptInvite).toHaveBeenCalled();
});

it('waiting: declining the invite goes back', async () => {
  mockViewer = 'p9'; mockStatus = 'waiting'; mockPlayers = [...mockBasePlayers, invitedAsha];
  render(<KnockoutScreen />);
  await act(async () => { fireEvent.press(screen.getByText('Decline')); });
  expect(mockActions.declineInvite).toHaveBeenCalled();
  expect(router.back).toHaveBeenCalled();
});

it('cancelled: the invitee can only remove their name', async () => {
  mockViewer = 'p9'; mockStatus = 'cancelled'; mockPlayers = [...mockBasePlayers, invitedAsha];
  render(<KnockoutScreen />);
  expect(screen.getByText('This finished before you accepted')).toBeTruthy();
  expect(screen.queryByText('Accept')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByText('Remove my name')); });
  expect(mockActions.declineInvite).toHaveBeenCalled();
});
