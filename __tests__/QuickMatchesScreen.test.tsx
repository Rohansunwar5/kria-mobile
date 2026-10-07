import { render, screen } from '@testing-library/react-native';
import QuickMatchesScreen from '../src/app/quick/index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useIsFocused: () => true,
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
}));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'h1' } } }),
}));
jest.mock('@/api/quickMatch', () => ({
  listMyQuickMatches: jest.fn(async () => [
    {
      _id: 'm1', hostId: 'h1', sport: 'badminton', joinCode: 'ABC234', status: 'live',
      sides: [
        { sideId: 's1', name: 'Arjun', slots: [{ slotId: 'a', playerId: 'h1', displayName: 'Arjun' }] },
        { sideId: 's2', name: 'Rahul', slots: [{ slotId: 'b', playerId: 'p2', displayName: 'Rahul' }] },
      ],
      gameScores: [], matchConfig: { bestOf: 3, pointsToWin: 21 }, createdAt: '2026-10-07T00:00:00.000Z',
    },
  ]),
}));
jest.mock('@/api/quickKnockout', () => ({
  listMyQuickKnockouts: jest.fn(async () => { throw new Error('boom'); }),
}));

it('still lists matches when the knockouts request fails', async () => {
  render(<QuickMatchesScreen />);
  expect(await screen.findByText('Arjun v Rahul')).toBeTruthy();
  expect(screen.queryByText('Couldn’t reach the server')).toBeNull();
});
