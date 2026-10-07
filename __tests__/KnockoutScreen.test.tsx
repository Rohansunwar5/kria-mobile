import { ScrollView } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import KnockoutScreen from '../src/app/knockout/[id]';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'k1' }),
  useIsFocused: () => true, // Badge (champion banner) reads it
}));
let mockViewer = 'h1';
let mockStatus = 'waiting';
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: mockViewer } } }),
}));
const mockActions = { draw: jest.fn(), start: jest.fn(), cancel: jest.fn(), award: jest.fn(), addGuest: jest.fn(), addPlayer: jest.fn(), removePlayer: jest.fn(), pair: jest.fn(), unpair: jest.fn() };
jest.mock('@/lib/useQuickKnockout', () => ({
  useQuickKnockout: () => ({
    knockout: {
      _id: 'k1', hostId: 'h1', joinCode: 'KX4P9M', name: 'Cup', sport: 'badminton', format: 'singles',
      matchConfig: { bestOf: 1, pointsToWin: 21 }, status: mockStatus, awardsEligible: true,
      players: [{ playerKey: 'a', playerId: 'h1', displayName: 'Arjun' }, { playerKey: 'b', playerId: 'p2', displayName: 'Rahul' }, { playerKey: 'c', displayName: 'Sam' }],
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

beforeEach(() => jest.clearAllMocks());

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
});

it('live: the tree opens a match', () => {
  mockViewer = 'h1'; mockStatus = 'live';
  render(<KnockoutScreen />);
  fireEvent.press(screen.getByLabelText('Open Rahul v Sam'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/quick/[id]', params: { id: 'm2' } });
});

it('completed: champion banner and the host’s awards', () => {
  mockViewer = 'h1'; mockStatus = 'completed';
  render(<KnockoutScreen />);
  expect(screen.getByText('Arjun won Cup')).toBeTruthy();
  expect(screen.getByText('Give award')).toBeTruthy();
});
