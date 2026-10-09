import { fireEvent, render } from '@testing-library/react-native';
import { EventsPortal } from '../src/components/home/EventsPortal';
import type { Tournament } from '../src/store/slices/tournamentSlice';
import { EMPTY_FILTERS } from '../src/lib/tournamentFilters';

// The featured card's art strip calls expo-router's `useIsFocused`, which needs
// a real NavigationContainer — absent when rendering a bare component.
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useRouter: () => ({ push: jest.fn() }),
  router: { push: jest.fn(), navigate: jest.fn() },
}));

// Dates relative to today, so the date strip (which starts today) holds them.
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
};

const tournament = (over: Partial<Tournament> = {}): Tournament => ({
  _id: 't1',
  name: 'Kria Smash Cup',
  sport: 'badminton',
  status: 'registration_open',
  startDate: inDays(2).toISOString(),
  endDate: inDays(3).toISOString(),
  registrationDeadline: inDays(1).toISOString(),
  ...over,
}) as Tournament;

const props = (over = {}) => ({
  tournaments: [tournament()],
  isLoading: false,
  error: null,
  filters: EMPTY_FILTERS,
  elsewhere: [],
  onFilters: jest.fn(),
  onOpenFilters: jest.fn(),
  onOpen: jest.fn(),
  onRetry: jest.fn(),
  ...over,
});

// Headings and row names in the order they render, so a test can check which
// heading each tournament sits under.
type Node = string | { children?: Node[] | null } | Node[] | null;
const textsOf = (node: Node): string[] =>
  !node ? [] : typeof node === 'string' ? [node] : Array.isArray(node) ? node.flatMap(textsOf) : textsOf(node.children ?? null);
const renderOrder = (tree: unknown, ...texts: string[]) => {
  const flat = textsOf(tree as Node);
  return texts.map((t) => flat.indexOf(t));
};
const ascending = (xs: number[]) => xs.every((x, i) => x >= 0 && (i === 0 || x > xs[i - 1]));

describe('EventsPortal', () => {
  it('features the open event closing soonest, with entry as its action', () => {
    const { getByText } = render(<EventsPortal {...props()} />);
    expect(getByText(/kria smash cup/i)).toBeTruthy();
    expect(getByText(/enter now/i)).toBeTruthy();
  });

  // The old list sat under one "Open for entry" heading whatever each
  // tournament's status — finished ones included. Each section must hold
  // only the statuses its title describes.
  it('sections the rest by real status, never a finished event under open for entry', () => {
    const { toJSON, queryByText } = render(
      <EventsPortal
        {...props({
          tournaments: [
            tournament({ _id: 'soon', name: 'Soon Open', registrationDeadline: inDays(1).toISOString() }),
            tournament({ _id: 'late', name: 'Late Open', registrationDeadline: inDays(5).toISOString() }),
            tournament({ _id: 'live', name: 'Live Cup', status: 'ongoing' }),
            tournament({ _id: 'done', name: 'Done Cup', status: 'completed' }),
          ],
        })}
      />,
    );

    expect(ascending(renderOrder(toJSON(), 'Soon Open', 'Live now', 'Live Cup', 'Open for entry', 'Late Open', 'Finished', 'Done Cup'))).toBe(true);
    expect(queryByText('Coming up')).toBeNull();
  });

  it('promotes nothing when no event is open for entry, listing every one as a row', () => {
    const { queryByText, toJSON } = render(
      <EventsPortal
        {...props({
          tournaments: [
            tournament({ _id: 'a', name: 'Harbour Slam', status: 'completed' }),
            tournament({ _id: 'b', name: 'Monsoon Open', status: 'auction_in_progress' }),
          ],
        })}
      />,
    );

    expect(queryByText(/enter now/i)).toBeNull();
    expect(ascending(renderOrder(toJSON(), 'Coming up', 'Monsoon Open', 'Finished', 'Harbour Slam'))).toBe(true);
  });

  it('opens the tournament a list row was tapped on, not the featured one', () => {
    const onOpen = jest.fn();
    const { getByLabelText } = render(
      <EventsPortal {...props({ onOpen, tournaments: [tournament({ _id: 'a' }), tournament({ _id: 'b', name: 'Monsoon Open', status: 'ongoing' })] })} />,
    );

    fireEvent.press(getByLabelText('Monsoon Open'));
    expect(onOpen).toHaveBeenCalledWith('b');
  });

  it('switches sport from the segment', () => {
    const onFilters = jest.fn();
    const { getByLabelText } = render(<EventsPortal {...props({ onFilters })} />);

    fireEvent.press(getByLabelText('Show cricket'));
    expect(onFilters).toHaveBeenCalledWith({ ...EMPTY_FILTERS, sport: 'cricket' });
  });

  it('narrows the list to a day picked on the strip', () => {
    const later = inDays(10);
    const { getByLabelText, queryByLabelText } = render(
      <EventsPortal
        {...props({
          tournaments: [
            tournament({ _id: 'a', name: 'Early Open' }),
            tournament({ _id: 'b', name: 'Later Open', startDate: later.toISOString(), endDate: later.toISOString() }),
          ],
        })}
      />,
    );
    const dayName = later.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    fireEvent.press(getByLabelText(`${dayName}, has events`));
    expect(queryByLabelText(/^Early Open/)).toBeNull();
    expect(getByLabelText(/^Later Open/)).toBeTruthy();
  });

  // DESIGN.md §5: an error scopes to the section that failed.
  it('scopes a failed load to itself when nothing is cached', () => {
    const { getByText } = render(<EventsPortal {...props({ tournaments: [], error: 'boom' })} />);
    expect(getByText(/events unavailable/i)).toBeTruthy();
  });

  it('keeps the filter sheet one tap away', () => {
    const { getByLabelText } = render(<EventsPortal {...props()} />);
    expect(getByLabelText('Filter tournaments')).toBeTruthy();
  });

  it('offers to widen only the filters that are applied', () => {
    const { queryByText } = render(<EventsPortal {...props({ tournaments: [] })} />);
    expect(queryByText(/no events yet/i)).toBeTruthy();
    expect(queryByText(/all sports|all cities|any stage/i)).toBeNull();

    const onFilters = jest.fn();
    const { getByText } = render(
      <EventsPortal {...props({ tournaments: [], onFilters, filters: { sport: 'cricket', city: 'Pune', status: 'All' } })} />,
    );
    expect(getByText('No cricket in Pune')).toBeTruthy();
    fireEvent.press(getByText('All cities'));
    expect(onFilters).toHaveBeenCalledWith({ sport: 'cricket', city: 'All', status: 'All' });
  });

  // A stage filter alone must not blame a sport or city the user never touched.
  it('names only the filters actually set in the empty state', () => {
    const { getByText, queryByText } = render(
      <EventsPortal {...props({ tournaments: [], filters: { sport: 'All', city: 'All', status: 'ongoing' } })} />,
    );
    expect(getByText('No live events')).toBeTruthy();
    expect(getByText('Any stage')).toBeTruthy();
    expect(queryByText(/all cities|all sports/i)).toBeNull();
  });

  it('shows the same search elsewhere when a city emptied the list', () => {
    const { getByText } = render(
      <EventsPortal
        {...props({
          tournaments: [],
          filters: { sport: 'cricket', city: 'Pune', status: 'All' },
          elsewhere: [tournament({ _id: 'x', name: 'JBN Cricket Cup', sport: 'cricket' })],
        })}
      />,
    );
    expect(getByText(/cricket elsewhere/i)).toBeTruthy();
    expect(getByText('JBN Cricket Cup')).toBeTruthy();
  });

  // The PLAY portal and the nav's Host button are the ways to a quick match.
  it('does not carry the quick-matches CTA', () => {
    const { queryByText } = render(<EventsPortal {...props()} />);
    expect(queryByText(/between tournaments/i)).toBeNull();
    expect(queryByText(/quick matches/i)).toBeNull();
  });

  it('dims rather than blanks while refreshing over cached data', () => {
    const { getByTestId } = render(<EventsPortal {...props({ isLoading: true })} />);
    expect(getByTestId('events-list').props.style.opacity).toBe(0.5);
  });
});
