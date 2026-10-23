import { fireEvent, render, screen } from '@testing-library/react-native';
import Awards from '../src/app/(tabs)/awards';

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
  useScrollToTop: () => undefined,
  useIsFocused: () => true,
}));
jest.mock('@/api/quickKnockout', () => ({ listMyQuickKnockouts: jest.fn(async () => []) }));
jest.mock('@/api/profileApi', () => ({
  getPublicPlayer: jest.fn(async () => ({
    player: { titles: ["Winner of Men's Doubles at HSR Shuttle Cup"], honors: [{ title: 'Fair Play', badge: 'fair-play' }] },
    history: [],
  })),
}));
jest.mock('@/store/hooks', () => ({ useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'p1' } } }) }));
jest.mock('@/lib/useCareer', () => ({
  useCareer: () => ({
    profile: { sports: [], bestSport: null, achievements: [] }, recent: [], loading: false, error: false, recentError: false, reload: jest.fn(),
  }),
}));

it('features the latest title, and a grid badge opens its sheet', async () => {
  render(<Awards />);
  expect(await screen.findByText('Latest title')).toBeTruthy();
  expect(screen.getAllByText("Champion · Men's Doubles").length).toBeGreaterThan(0);
  fireEvent.press(screen.getByLabelText('Fair Play, Given by an organiser'));
  expect(await screen.findByText('Organiser honour')).toBeTruthy();
});
