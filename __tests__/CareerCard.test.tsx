import { render } from '@testing-library/react-native';
import { CareerCard } from '../src/components/profile/CareerCard';
import type { SportSummary } from '../src/api/career';

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

describe('CareerCard', () => {
  it('renders a row per sport', () => {
    const { getByText } = render(
      <CareerCard profile={{ sports: [sport(), sport({ sport: 'cricket' })], bestSport: null }} />
    );
    expect(getByText(/^badminton$/i)).toBeTruthy();
    expect(getByText(/^cricket$/i)).toBeTruthy();
  });

  it('formats the win rate as a percentage — the server sends a 0-1 fraction', () => {
    // 8/12 = 0.6666… If this ever renders "0.67" or "67" without a %, the card
    // is treating the fraction as something it is not.
    const { getByText } = render(<CareerCard profile={{ sports: [sport()], bestSport: null }} />);
    expect(getByText('67%')).toBeTruthy();
  });

  it('renders 0% rather than NaN for a sport with nothing decided', () => {
    const { getByText } = render(
      <CareerCard
        profile={{ sports: [sport({ played: 2, decided: 0, won: 0, lost: 0, tied: 0, noResult: 2, winRate: 0 })], bestSport: null }}
      />
    );
    expect(getByText('0%')).toBeTruthy();
  });

  it('shows the best-sport badge when the server named one', () => {
    const { getByText } = render(
      <CareerCard profile={{ sports: [sport()], bestSport: sport() }} />
    );
    expect(getByText(/best sport/i)).toBeTruthy();
  });

  it('shows no badge at all when the server named none', () => {
    // The >=10-decided rule lives ONLY on the server (careerStats _pickBestSport).
    // The card must not re-implement it — it renders a badge iff bestSport is
    // present. No greyed badge, no "keep playing to unlock".
    const { queryByText } = render(
      <CareerCard profile={{ sports: [sport({ decided: 9, played: 9 })], bestSport: null }} />
    );
    expect(queryByText(/best sport/i)).toBeNull();
  });

  it('distinguishes played from decided when a no-result match exists', () => {
    // no_result matches are stored and counted as played, but excluded from
    // win rate. Showing only one number would misrepresent both.
    const { getByText } = render(
      <CareerCard
        profile={{ sports: [sport({ played: 13, decided: 12, noResult: 1 })], bestSport: null }}
      />
    );
    expect(getByText('13')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
  });

  it('shows an empty state for a player who has never played', () => {
    const { getByText, queryByText } = render(
      <CareerCard profile={{ sports: [], bestSport: null }} />
    );
    expect(getByText(/no matches yet/i)).toBeTruthy();
    expect(queryByText(/best sport/i)).toBeNull();
  });

  it('shows a skeleton while loading and no empty state', () => {
    const { queryByText } = render(<CareerCard profile={null} loading />);
    expect(queryByText(/no matches yet/i)).toBeNull();
  });

  it('shows an error state when the fetch failed', () => {
    const { getByText } = render(<CareerCard profile={null} error />);
    expect(getByText(/couldn.t load/i)).toBeTruthy();
  });
});
