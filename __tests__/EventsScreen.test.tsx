import { fireEvent, render, screen } from '@testing-library/react-native';
import Events from '../src/app/(tabs)/events';
import { latestTournaments } from '@/api/tournaments';

// Characterises the Events list before and after it became a FlatList (M21):
// groups, their order, past rows, and the empty state.
let mockParams: { sport?: string } = {};
jest.mock('expo-router', () => ({
  router: { setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(cb, [cb]);
  },
  useScrollToTop: () => undefined,
}));
jest.mock('@/store/hooks', () => ({ useAppSelector: (pick: (s: unknown) => unknown) => pick({ auth: { user: { _id: 'p1' } } }) }));
jest.mock('@/api/cricketMatch', () => ({ getTeamBrands: jest.fn(async () => ({})) }));
jest.mock('@/api/tournaments', () => ({ latestTournaments: jest.fn(), getEventFacets: jest.fn(async () => null) }));
jest.mock('@/components/EventCard', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return { EventCard: ({ t }: { t: { name: string } }) => <MockText>{`CARD ${t.name}`}</MockText> };
});
jest.mock('@/components/events/EventRows', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    Featured: ({ t }: { t: { name: string } }) => <MockText>{`FEATURED ${t.name}`}</MockText>,
    PastRow: ({ t }: { t: { name: string } }) => <MockText>{`PAST ${t.name}`}</MockText>,
  };
});
jest.mock('@/components/events/Filters', () => ({ Filters: () => null }));

const ev = (name: string, status: string, startDate: string, bannerImage?: string) => ({ _id: name, name, status, startDate, sport: 'badminton', bannerImage });

test('lists featured, happening now, coming up and past, in that order', async () => {
  (latestTournaments as jest.Mock).mockResolvedValue([
    ev('Open', 'registration_open', '2026-12-10', 'b.png'),
    ev('Live Cup', 'ongoing', '2026-11-20'),
    ev('Soon Cup', 'registration_open', '2026-12-20'),
    ev('Old Cup', 'completed', '2026-10-01'),
  ]);
  render(<Events />);
  expect(await screen.findByText('FEATURED Open')).toBeTruthy();
  const order = ['Happening now', 'CARD Live Cup', 'Coming up', 'CARD Soon Cup', 'Past', 'PAST Old Cup'];
  order.forEach((t) => expect(screen.getByText(t)).toBeTruthy());
  const all = screen.getAllByText(/^(Happening now|Coming up|Past|CARD .*|PAST .*)$/).map((n) => n.props.children);
  expect(all).toEqual(order);
});

test('an empty list says so', async () => {
  (latestTournaments as jest.Mock).mockResolvedValue([]);
  render(<Events />);
  expect(await screen.findByText('No events yet')).toBeTruthy();
});

test('search opens a field', async () => {
  (latestTournaments as jest.Mock).mockResolvedValue([]);
  render(<Events />);
  fireEvent.press(screen.getByLabelText('Search events'));
  expect(screen.getAllByLabelText('Search events').length).toBeGreaterThan(0);
});

test('the list is virtualised (M21: up to 100 cards)', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FlatList } = require('react-native');
  (latestTournaments as jest.Mock).mockResolvedValue([ev('Live Cup', 'ongoing', '2026-11-20')]);
  render(<Events />);
  await screen.findByText('CARD Live Cup');
  expect(screen.UNSAFE_getAllByType(FlatList)).toHaveLength(1);
});

test('a ?sport= link filters the list to that sport and clears the URL', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { router } = require('expo-router');
  mockParams = { sport: 'badminton' };
  (latestTournaments as jest.Mock).mockResolvedValue([]);
  render(<Events />);
  await screen.findByText('No events match');
  expect((latestTournaments as jest.Mock).mock.calls.at(-1)[1]).toMatchObject({ sport: 'badminton' });
  expect(router.setParams).toHaveBeenCalledWith({ sport: undefined });
  mockParams = {};
});
