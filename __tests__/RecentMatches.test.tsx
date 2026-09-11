import { render } from '@testing-library/react-native';
import { RecentMatches } from '../src/components/profile/RecentMatches';
import type { RecentMatch } from '../src/api/career';

const row = (over: Partial<RecentMatch> = {}): RecentMatch => ({
  _id: 'r1',
  matchId: 'm1',
  sport: 'badminton',
  context: 'quick',
  result: 'won',
  // Noon UTC, so the rendered local date is 1 Sep in every real timezone.
  playedAt: '2026-09-01T12:00:00.000Z',
  ...over,
});

describe('RecentMatches', () => {
  it('renders a row per match', () => {
    const { getByText } = render(
      <RecentMatches matches={[row(), row({ _id: 'r2', sport: 'cricket' })]} />
    );
    expect(getByText(/^badminton$/i)).toBeTruthy();
    expect(getByText(/^cricket$/i)).toBeTruthy();
  });

  it('abbreviates each result to a single readable token', () => {
    const { getByText } = render(
      <RecentMatches
        matches={[
          row({ _id: 'a', result: 'won' }),
          row({ _id: 'b', result: 'lost' }),
          row({ _id: 'c', result: 'tied' }),
          row({ _id: 'd', result: 'no_result' }),
        ]}
      />
    );
    expect(getByText('W')).toBeTruthy();
    expect(getByText('L')).toBeTruthy();
    expect(getByText('T')).toBeTruthy();
    // A no_result must not render as a loss — it is excluded from the win rate
    // on the server, and showing an L here would contradict the card above.
    expect(getByText('NR')).toBeTruthy();
  });

  it('names the context, because a quick match and a tournament match are not the same claim', () => {
    const { getByText } = render(
      <RecentMatches matches={[row({ context: 'quick' }), row({ _id: 'r2', context: 'tournament' })]} />
    );
    expect(getByText(/^quick$/i)).toBeTruthy();
    expect(getByText(/^tournament$/i)).toBeTruthy();
  });

  it('formats the date without a year for a match played this year', () => {
    const thisYear = new Date().getFullYear();
    const { getByText } = render(
      <RecentMatches matches={[row({ playedAt: `${thisYear}-09-01T12:00:00.000Z` })]} />
    );
    expect(getByText('1 Sep')).toBeTruthy();
  });

  it('adds the year once a match is from a different one', () => {
    // Without this, a feed spanning a new year shows two "1 Sep" rows that are
    // twelve months apart.
    const lastYear = new Date().getFullYear() - 1;
    const { getByText } = render(
      <RecentMatches matches={[row({ playedAt: `${lastYear}-09-01T12:00:00.000Z` })]} />
    );
    expect(getByText(`1 Sep ${lastYear}`)).toBeTruthy();
  });

  it('renders nothing at all when there are no matches', () => {
    // CareerCard sits directly above and is empty whenever this is — a player
    // with no participation rows has neither. A second "no matches yet" would
    // just be the same sentence twice.
    const { queryByText } = render(<RecentMatches matches={[]} />);
    expect(queryByText(/recent/i)).toBeNull();
  });

  it('shows a heading and a skeleton while loading, not the empty case', () => {
    const { getByText } = render(<RecentMatches matches={null} loading />);
    expect(getByText(/recent matches/i)).toBeTruthy();
  });

  it('shows an error block when the fetch failed, never silence', () => {
    // A failed fetch rendered as nothing tells the player they have no history
    // when in fact the request broke — the one confusion worth a test.
    const { getByText } = render(<RecentMatches matches={null} error />);
    expect(getByText(/couldn’t load recent matches/i)).toBeTruthy();
  });
});
