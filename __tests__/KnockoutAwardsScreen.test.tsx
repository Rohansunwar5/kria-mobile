import { ScrollView } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import AwardsScreen from '../src/app/knockout/awards/[id]';
import type { QuickKnockout } from '@/api/quickKnockout';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 'k1' }),
  useIsFocused: () => true, // Badge reads it
}));
let mockViewer = 'h1';
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: mockViewer } } }),
}));

const k = (over: Partial<QuickKnockout> = {}): QuickKnockout => ({
  _id: 'k1', hostId: 'h1', name: 'Cup', sport: 'badminton', format: 'singles',
  matchConfig: { bestOf: 1, pointsToWin: 21 }, status: 'completed', awardsEligible: true,
  players: [
    { playerKey: 'a', playerId: 'h1', displayName: 'Arjun Mehta' },
    { playerKey: 'b', playerId: 'p2', displayName: 'Rahul Singh' },
    { playerKey: 'c', displayName: 'Sam' },
  ],
  pairs: [], entrants: [{ entrantId: 'e1', playerKeys: ['a'] }], fixtures: [], roundNames: [], awards: [],
  championEntrantId: 'e1', createdAt: '2026-10-07T00:00:00.000Z',
  ...over,
});

let mockKo: QuickKnockout = k();
let mockProblem = '';
const mockAward = jest.fn();
jest.mock('@/lib/useQuickKnockout', () => ({
  useQuickKnockout: () => ({ knockout: mockKo, loading: false, error: false, busy: false, problem: mockProblem, reload: jest.fn(), award: mockAward }),
}));

beforeEach(() => { jest.clearAllMocks(); mockViewer = 'h1'; mockKo = k(); mockProblem = ''; });

const given = (n: number) => Array.from({ length: n }, (_, i) => ({ playerId: 'p2', badge: 'fair-play', title: `Award ${i + 1}` }));
const giveDisabled = () => screen.getByLabelText('Give award').props.accessibilityState.disabled;

it('names the knockout and its champion', () => {
  render(<AwardsScreen />);
  expect(screen.getByText('Arjun Mehta won Cup')).toBeTruthy();
});

it('gives an award: pick a player, pick a badge', () => {
  render(<AwardsScreen />);
  expect(screen.queryByText('Sam')).toBeNull(); // guests have no profile
  const [page] = screen.UNSAFE_getAllByType(ScrollView);
  expect(within(page).queryByText('Give award')).toBeNull(); // pinned outside the scroll
  expect(giveDisabled()).toBe(true);
  fireEvent.press(screen.getByText('Give award'));
  expect(mockAward).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('Rahul Singh'));
  fireEvent.press(screen.getByText('Fair Play'));
  expect(giveDisabled()).toBe(false);
  fireEvent.press(screen.getByText('Give award'));
  expect(mockAward).toHaveBeenCalledWith('p2', 'fair-play');
});

it('Skip goes back to the bracket', () => {
  render(<AwardsScreen />);
  fireEvent.press(screen.getByText('Skip'));
  expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
});

it('reads Done once an award exists, and lists who got it', () => {
  mockKo = k({ awards: given(1) });
  render(<AwardsScreen />);
  expect(screen.getByText('Rahul Singh · Award 1')).toBeTruthy();
  expect(screen.queryByText('Skip')).toBeNull();
  fireEvent.press(screen.getByText('Done'));
  expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/knockout/[id]', params: { id: 'k1' } });
});

it('stops at 3 awards: no picker, only Done', () => {
  mockKo = k({ awards: given(3) });
  render(<AwardsScreen />);
  expect(screen.getByText('Rahul Singh · Award 3')).toBeTruthy();
  expect(screen.queryByText('Give award')).toBeNull();
  expect(screen.getByText('Done')).toBeTruthy();
});

it('explains when awards are not available', () => {
  mockKo = k({ awardsEligible: false });
  render(<AwardsScreen />);
  expect(screen.getByText('Awards need at least 4 Kria players in the knockout.')).toBeTruthy();
  expect(screen.queryByText('Give award')).toBeNull();
  expect(screen.getByText('Done')).toBeTruthy();
});

it('shows why an award was refused', () => {
  mockProblem = 'That player already has this award.';
  render(<AwardsScreen />);
  expect(screen.getByText('That player already has this award.')).toBeTruthy();
});

it('is for the host only', () => {
  mockViewer = 'p2';
  render(<AwardsScreen />);
  expect(screen.getByText('Only the host gives awards')).toBeTruthy();
  expect(screen.queryByText('Give award')).toBeNull();
  expect(screen.getByLabelText('Back')).toBeTruthy();
});
