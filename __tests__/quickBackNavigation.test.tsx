import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import QuickMatchScreen from '../src/app/quick/[id]';
import JoinQuickMatchScreen from '../src/app/quick/join';

// A quick match reached with no history — a web refresh (the only way a
// joiner on web used to see a new score), a deep link — has nothing behind
// it. A bare router.back() there logs "GO_BACK was not handled" and strands
// the player, so every quick screen goes back through goBack() instead.
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'm1' }),
}));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'p1' } } }),
}));
jest.mock('@/lib/useQuickMatch', () => ({
  useQuickMatch: () => ({ match: null, loading: true, error: false, busy: false, reload: jest.fn() }),
}));

beforeEach(() => jest.clearAllMocks());

it.each([
  ['the match screen', QuickMatchScreen],
  ['the join screen', JoinQuickMatchScreen],
])('%s falls back to the quick match list when there is no history', (_name, Screen) => {
  render(<Screen />);
  fireEvent.press(screen.getByText('Back'));
  expect(router.back).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith('/quick');
});
