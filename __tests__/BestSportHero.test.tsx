import { render } from '@testing-library/react-native';
import { BestSportHero } from '../src/components/profile/BestSportHero';
import { ICON_PATHS } from '../src/components/icons';
import type { SportSummary, RecentMatch } from '../src/api/career';

const sport = (over: Partial<SportSummary> = {}): SportSummary => ({
  sport: 'badminton',
  played: 12,
  decided: 12,
  won: 8,
  lost: 3,
  tied: 1,
  noResult: 0,
  winRate: 8 / 12,
  ...over,
});

const match = (over: Partial<RecentMatch> = {}): RecentMatch => ({
  _id: 'r1',
  matchId: 'm1',
  sport: 'badminton',
  context: 'quick',
  result: 'won',
  playedAt: '2026-09-09T10:00:00.000Z',
  ...over,
});

describe('BestSportHero', () => {
  // The server withholds bestSport below 10 decided matches. An empty hero
  // would tell the player they have no best sport, when the truth is there
  // is not yet enough evidence — so this must render literally nothing,
  // matching the reasoning behind CareerCard's BestSportBadge.
  it('renders nothing at all when bestSport is null', () => {
    const { toJSON } = render(<BestSportHero bestSport={null} recent={[match()]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the big figure from winRate, never recomputed from won/decided', () => {
    // 5W/5L over 10 decided would recompute to 50% — winRate says 90%, and
    // the figure must follow the server's number, not the arithmetic.
    const best = sport({ won: 5, lost: 5, decided: 10, winRate: 0.9 });
    const { getByText, queryByText } = render(<BestSportHero bestSport={best} recent={[]} />);
    expect(getByText('90%')).toBeTruthy();
    expect(queryByText('50%')).toBeNull();
  });

  it('renders 0%, never NaN%, when nothing is decided', () => {
    const best = sport({ played: 2, decided: 0, won: 0, lost: 0, winRate: 0 });
    const { getByText, queryByText } = render(<BestSportHero bestSport={best} recent={[]} />);
    expect(getByText('0%')).toBeTruthy();
    expect(queryByText(/nan/i)).toBeNull();
  });

  it('shows won, lost and decided on the record line — not played', () => {
    const best = sport({ played: 13, decided: 12, won: 8, lost: 4, noResult: 1 });
    const { getByText, queryByText } = render(<BestSportHero bestSport={best} recent={[]} />);
    expect(getByText(/8w/i)).toBeTruthy();
    expect(getByText(/4l/i)).toBeTruthy();
    expect(getByText(/12 decided/i)).toBeTruthy();
    expect(queryByText(/13/)).toBeNull();
  });

  it('names the sport and shows the shared SPORT_ICON glyph for cricket, not a local cricket-bat', () => {
    // BestSportHero used to keep its own sport->icon map with cricket ->
    // 'cricket-bat', disagreeing with the shared `@/lib/sports` map (used by
    // PlayPortal and HistoryCard) which maps cricket -> 'ball'. Same player,
    // two different glyphs. This asserts the hero now renders the SAME glyph
    // the rest of the app uses for cricket.
    const best = sport({ sport: 'cricket' });
    const { getByText, UNSAFE_root } = render(<BestSportHero bestSport={best} recent={[]} />);
    expect(getByText(/cricket/i)).toBeTruthy();
    expect(UNSAFE_root.findByProps({ d: ICON_PATHS.ball[0] })).toBeTruthy();
  });

  it('shows the shuttlecock glyph for badminton', () => {
    const best = sport({ sport: 'badminton' });
    const { UNSAFE_root } = render(<BestSportHero bestSport={best} recent={[]} />);
    expect(UNSAFE_root.findByProps({ d: ICON_PATHS.shuttlecock[0] })).toBeTruthy();
  });

  it('falls back to the trophy glyph for a sport the shared SPORT_ICON map has no entry for', () => {
    // Football has no glyph in `@/lib/sports`' SPORT_ICON (it only covers
    // badminton/cricket/table_tennis/tennis), so the fallback this component
    // still needs is for sports the shared map itself doesn't handle yet —
    // not a second, disagreeing map for the sports it already does.
    const best = sport({ sport: 'football' });
    const { UNSAFE_root } = render(<BestSportHero bestSport={best} recent={[]} />);
    expect(UNSAFE_root.findByProps({ d: ICON_PATHS.trophy[0] })).toBeTruthy();
  });

  it('renders the shared FormStrip inside the hero', () => {
    const best = sport();
    const recent = [match({ _id: 'r1', result: 'won' }), match({ _id: 'r2', result: 'lost' })];
    const { getAllByText } = render(<BestSportHero bestSport={best} recent={recent} />);
    const tokens = getAllByText(/^(W|L|T|NR)$/).map((el) => el.props.children);
    expect(tokens).toEqual(['L', 'W']);
  });
});
