import { fireEvent, render, within } from '@testing-library/react-native';
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

  // Every other test here passes a single tournament, which becomes the
  // FEATURED card — so the `rest` mapping, i.e. the entire list body, was never
  // rendered by any test and could have broken silently. This is the list.
  it('renders every non-featured tournament as a numbered list row', () => {
    const { getByText } = render(
      <EventsPortal
        {...props({
          tournaments: [
            tournament({ _id: 'a', name: 'City League', status: 'ongoing' }),
            tournament({ _id: 'b', name: 'Monsoon Open' }),
            tournament({ _id: 'c', name: 'Harbour Slam' }),
          ],
        })}
      />
    );

    // The ongoing one is the hero, so the other two are rows — and rows carry
    // the ghost index the featured card has no place for.
    expect(getByText(/city league/i)).toBeTruthy();
    expect(getByText(/monsoon open/i)).toBeTruthy();
    expect(getByText(/harbour slam/i)).toBeTruthy();

    // The "Open for entry" header prints its own count, which for two
    // non-featured tournaments is also "02" — so a bare getByText('02')
    // legitimately matches twice and proves nothing about rows. Climb from
    // each row's title up to the nearest ancestor that also contains its
    // badge: that ancestor is the row's own Pressable, never the header,
    // since the header text is never an ancestor of a row's title.
    const rowFor = (title: RegExp, badge: string) => {
      let node = getByText(title);
      for (;;) {
        if (within(node).queryByText(badge)) return node;
        const parent = node.parent;
        if (!parent) return node;
        node = parent;
      }
    };

    expect(within(rowFor(/monsoon open/i, '01')).getByText('01')).toBeTruthy();
    expect(within(rowFor(/harbour slam/i, '02')).getByText('02')).toBeTruthy();
  });

  it('opens the tournament a list row was tapped on, not the featured one', () => {
    const onOpen = jest.fn();
    const { getByText } = render(
      <EventsPortal
        {...props({
          onOpen,
          tournaments: [
            tournament({ _id: 'a', name: 'City League', status: 'ongoing' }),
            tournament({ _id: 'b', name: 'Monsoon Open' }),
          ],
        })}
      />
    );

    fireEvent.press(getByText(/monsoon open/i));
    expect(onOpen).toHaveBeenCalledWith('b');
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

  // The PLAY portal and the nav's Host button are the ways to a quick match
  // now. This CTA was a third route to the same place and the approved design
  // has none on the events side — it must not creep back.
  it('no longer carries the quick-matches CTA', () => {
    const { queryByText } = render(<EventsPortal {...props()} />);
    expect(queryByText(/between tournaments/i)).toBeNull();
    expect(queryByText(/quick matches/i)).toBeNull();
  });

  it('dims rather than blanks while refreshing over cached data', () => {
    const { getByTestId } = render(<EventsPortal {...props({ isLoading: true })} />);
    expect(getByTestId('events-list').props.style.opacity).toBe(0.5);
  });
});
