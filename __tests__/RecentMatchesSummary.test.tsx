import { render } from '@testing-library/react-native';
import { RecentMatches } from '../src/components/profile/RecentMatches';
import type { RecentMatch } from '../src/api/career';

const row = (over: Partial<RecentMatch> = {}): RecentMatch => ({
  _id: 'r1',
  matchId: 'm1',
  sport: 'badminton',
  context: 'quick',
  result: 'won',
  playedAt: '2026-09-01T12:00:00.000Z',
  ...over,
});

describe('RecentMatches shows who played and the score', () => {
  it('renders the title when the server sent one', () => {
    const { getByText } = render(
      <RecentMatches matches={[row({ title: 'Alpha vs Bravo' })]} />
    );
    expect(getByText('Alpha vs Bravo')).toBeTruthy();
  });

  it('renders the scoreline when the server sent one', () => {
    const { getByText } = render(
      <RecentMatches matches={[row({ title: 'Alpha vs Bravo', scoreline: '21-15, 21-18' })]} />
    );
    expect(getByText('21-15, 21-18')).toBeTruthy();
  });

  it('falls back to the sport name when there is no title', () => {
    // Historic rows and any sport without a summariser arrive thin. The row
    // must still read as a match, not as a blank line.
    const { getByText } = render(<RecentMatches matches={[row()]} />);
    expect(getByText(/^badminton$/i)).toBeTruthy();
  });

  it('renders a titled row without a scoreline', () => {
    // A walkover has sides but no score.
    const { getByText, queryByText } = render(
      <RecentMatches matches={[row({ title: 'Solo vs Duo' })]} />
    );
    expect(getByText('Solo vs Duo')).toBeTruthy();
    expect(queryByText(/\d+-\d+/)).toBeNull();
  });

  it('still shows the result and the context alongside the summary', () => {
    // The ledger half must not be crowded out by the new half.
    const { getByText } = render(
      <RecentMatches matches={[row({ title: 'Alpha vs Bravo', scoreline: '21-9', result: 'lost', context: 'tournament' })]} />
    );
    expect(getByText('L')).toBeTruthy();
    expect(getByText(/^tournament$/i)).toBeTruthy();
    expect(getByText('Alpha vs Bravo')).toBeTruthy();
  });
});
