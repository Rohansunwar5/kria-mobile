import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SportCards, recordLine } from '../src/components/profile/SportCards';
import { careerTotals } from '../src/components/profile/PlayerCard';
import type { CareerProfile, SportSummary } from '../src/api/career';

const sport = (over: Partial<SportSummary> = {}): SportSummary => ({
  sport: 'badminton',
  played: 4,
  decided: 4,
  won: 1,
  lost: 3,
  tied: 0,
  noResult: 0,
  winRate: 1 / 4,
  ...over,
});

const cricket = sport({ sport: 'cricket', played: 3, decided: 3, won: 2, lost: 1, winRate: 2 / 3 });

const profile = (over: Partial<CareerProfile> = {}): CareerProfile => ({ sports: [sport(), cricket], bestSport: null, achievements: [], ...over });

const cards = (over: Partial<Parameters<typeof SportCards>[0]> = {}) =>
  render(<SportCards profile={profile()} loading={false} error={false} onRetry={jest.fn()} {...over} />);

describe('SportCards', () => {
  it('renders a card per sport', () => {
    const { getByLabelText } = cards();
    expect(getByLabelText(/^badminton\./i)).toBeTruthy();
    expect(getByLabelText(/^cricket\./i)).toBeTruthy();
  });

  it('formats the win rate as a percentage — the server sends a 0-1 fraction', () => {
    const { getByText } = cards();
    expect(getByText('25%')).toBeTruthy();
    expect(getByText('67%')).toBeTruthy();
  });

  it('renders 0% rather than NaN for a sport with nothing decided', () => {
    const { getByText, queryByText } = cards({ profile: profile({ sports: [sport({ decided: 0, won: 0, lost: 0, winRate: NaN })] }) });
    expect(getByText('0%')).toBeTruthy();
    expect(queryByText(/nan/i)).toBeNull();
  });

  // The 10-decided rule lives on the server alone; the card only reads it.
  it('marks only the sport the server named as best', () => {
    const { getByLabelText, getAllByText } = cards({ profile: profile({ bestSport: cricket }) });
    expect(getByLabelText(/^cricket, best sport\./i)).toBeTruthy();
    expect(getByLabelText(/^badminton\. 25%/i)).toBeTruthy();
    expect(getAllByText('Best')).toHaveLength(1);
  });

  it('marks nothing, and says when a sport earns it, while the server names no best sport', () => {
    const { queryByText, getByText } = cards();
    expect(queryByText('Best')).toBeNull();
    expect(getByText(/marked best once it has 10 decided matches/i)).toBeTruthy();
  });

  // A no-result is played but left out of the win rate; hiding it would let
  // the played count and the rate disagree.
  it('names a no-result in the record, with a footnote only when one exists', () => {
    const nr = cards({ profile: profile({ sports: [sport({ played: 5, noResult: 1 })] }) });
    expect(nr.getByText('1W · 3L · 1NR · 5 played')).toBeTruthy();
    expect(nr.getByText(/no-result: counted as played/i)).toBeTruthy();
    nr.unmount();

    const none = cards();
    expect(none.queryByText(/no-result: counted as played/i)).toBeNull();
  });

  it('shows an empty state with its one action for a player who has never played', () => {
    const { getByText } = cards({ profile: profile({ sports: [] }), emptyAction: <Text>Host a match</Text> });
    expect(getByText(/the record starts with the first match/i)).toBeTruthy();
    expect(getByText('Host a match')).toBeTruthy();
  });

  it('shows a skeleton while loading, not the empty state', () => {
    const { queryByText } = cards({ profile: null, loading: true });
    expect(queryByText(/the record starts with the first match/i)).toBeNull();
  });

  it('shows an error state when the fetch failed', () => {
    const { getByText } = cards({ profile: null, error: true });
    expect(getByText(/couldn’t load the record/i)).toBeTruthy();
  });
});

describe('recordLine', () => {
  it('names ties and no-results beside wins and losses', () => {
    expect(recordLine(sport({ played: 7, won: 3, lost: 2, tied: 1, noResult: 1 }))).toBe('3W · 2L · 1T · 1NR · 7 played');
  });
});

describe('careerTotals', () => {
  // 1/4 and 2/3 average to 46%; summed they are 3/7 = 43%. A sport played twice
  // must not weigh as much as one played forty times.
  it('takes the win rate from summed wins over summed decided, never an average of rates', () => {
    expect(careerTotals(profile())).toEqual({ played: 7, winRate: '43%' });
  });

  it('is 0% rather than NaN when nothing is decided, and empty for no profile', () => {
    expect(careerTotals(profile({ sports: [sport({ decided: 0, won: 0, lost: 0, winRate: 0 })] })).winRate).toBe('0%');
    expect(careerTotals(null)).toEqual({ played: 0, winRate: '0%' });
  });
});
