import { render } from '@testing-library/react-native';
import { EventsPortal } from '../src/components/home/EventsPortal';
import type { Tournament } from '../src/store/slices/tournamentSlice';

// The featured card's art strip calls expo-router's `useIsFocused`, which needs
// a real NavigationContainer — absent when rendering a bare component. Same
// shape as the mock in useQuickCricket.test.tsx: focus degrades to true, and
// the quick-matches push is a no-op here.
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useRouter: () => ({ push: jest.fn() }),
}));

const tournament = (over: Partial<Tournament> = {}): Tournament => ({
  _id: 't1',
  name: 'Kria Smash Cup',
  sport: 'badminton',
  status: 'registration_open',
  startDate: '2026-09-02T00:00:00.000Z',
  endDate: '2026-09-07T00:00:00.000Z',
  ...over,
}) as Tournament;

const props = (over = {}) => ({
  tournaments: [tournament()],
  isLoading: false,
  error: null,
  sport: 'All',
  city: 'All',
  cityOpen: false,
  onSport: jest.fn(),
  onCity: jest.fn(),
  onToggleCity: jest.fn(),
  onOpen: jest.fn(),
  onRetry: jest.fn(),
  ...over,
});

describe('EventsPortal', () => {
  it('shows the tournament list', () => {
    const { getByText } = render(<EventsPortal {...props()} />);
    expect(getByText(/kria smash cup/i)).toBeTruthy();
  });

  // DESIGN.md §5: an error scopes to the section that failed. The rest of home
  // — masthead, portal switch — is the home screen's, not this component's, and
  // must survive.
  it('scopes a failed load to itself when nothing is cached', () => {
    const { getByText } = render(<EventsPortal {...props({ tournaments: [], error: 'boom' })} />);
    expect(getByText(/events unavailable/i)).toBeTruthy();
  });

  it('offers a filter reset only when a filter is actually applied', () => {
    const { queryByText } = render(<EventsPortal {...props({ tournaments: [] })} />);
    expect(queryByText(/clear filters/i)).toBeNull();

    const { getByText } = render(
      <EventsPortal {...props({ tournaments: [], sport: 'badminton' })} />
    );
    expect(getByText(/clear filters/i)).toBeTruthy();
  });

  it('dims rather than blanks while refreshing over cached data', () => {
    const { getByTestId } = render(<EventsPortal {...props({ isLoading: true })} />);
    expect(getByTestId('events-list').props.style.opacity).toBe(0.5);
  });
});
