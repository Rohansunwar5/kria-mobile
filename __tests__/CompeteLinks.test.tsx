import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import Compete from '../src/app/(tabs)/compete';

let mockParams: { seg?: string; sport?: string } = {};
jest.mock('expo-router', () => ({
  router: { setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => undefined,
  useScrollToTop: () => undefined,
}));
jest.mock('@/store/hooks', () => ({ useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'p1', firstName: 'Asha' } } }) }));
jest.mock('@/lib/useCareer', () => ({ useCareer: () => ({ profile: null, recent: [], reload: jest.fn() }) }));
jest.mock('@/components/compete/Matches', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { Matches: () => <MockText>MATCHES</MockText> };
});
jest.mock('@/components/compete/Rankings', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { Rankings: ({ sport }: { sport: string }) => <MockText>{`RANKINGS ${sport}`}</MockText> };
});

beforeEach(() => {
  mockParams = {};
  jest.clearAllMocks();
});

test('a ?seg=matches link opens Matches, clears the URL, and works again later', () => {
  mockParams = { seg: 'matches' };
  const view = render(<Compete />);
  expect(screen.getByText('MATCHES')).toBeTruthy();
  expect(router.setParams).toHaveBeenCalledWith({ seg: undefined, sport: undefined });

  mockParams = {};
  view.rerender(<Compete />);
  fireEvent.press(screen.getByText('Rankings'));
  expect(screen.getByText(/^RANKINGS/)).toBeTruthy();

  mockParams = { seg: 'matches' };
  view.rerender(<Compete />);
  expect(screen.getByText('MATCHES')).toBeTruthy();
});

test('a ?sport= link opens that sport\'s rankings', () => {
  mockParams = { sport: 'table_tennis' };
  render(<Compete />);
  expect(screen.getByText('RANKINGS table_tennis')).toBeTruthy();
});
