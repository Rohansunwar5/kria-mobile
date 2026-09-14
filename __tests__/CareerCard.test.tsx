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
      <CareerCard profile={{ sports: [sport(), sport({ sport: 'cricket' })], bestSport: null, achievements: [] }} />
    );
    expect(getByText(/^badminton$/i)).toBeTruthy();
    expect(getByText(/^cricket$/i)).toBeTruthy();
  });

  it('formats the win rate as a percentage — the server sends a 0-1 fraction', () => {
    // 8/12 = 0.6666… If this ever renders "0.67" or "67" without a %, the card
    // is treating the fraction as something it is not.
    const { getByText } = render(<CareerCard profile={{ sports: [sport()], bestSport: null, achievements: [] }} />);
    expect(getByText('67%')).toBeTruthy();
  });

  it('renders 0% rather than NaN for a sport with nothing decided', () => {
    const { getByText } = render(
      <CareerCard
        profile={{ sports: [sport({ played: 2, decided: 0, won: 0, lost: 0, tied: 0, noResult: 2, winRate: 0 })], bestSport: null, achievements: [] }}
      />
    );
    expect(getByText('0%')).toBeTruthy();
  });

  it('shows the best-sport badge when the server named one', () => {
    const { getByText } = render(
      <CareerCard profile={{ sports: [sport()], bestSport: sport(), achievements: [] }} />
    );
    expect(getByText(/best sport/i)).toBeTruthy();
  });

  it('shows no badge at all when the server named none', () => {
    // The >=10-decided rule lives ONLY on the server (careerStats _pickBestSport).
    // The card must not re-implement it — it renders a badge iff bestSport is
    // present. No greyed badge, no "keep playing to unlock".
    const { queryByText } = render(
      <CareerCard profile={{ sports: [sport({ decided: 9, played: 9 })], bestSport: null, achievements: [] }} />
    );
    expect(queryByText(/best sport/i)).toBeNull();
  });

  it('distinguishes played from decided when a no-result match exists', () => {
    // The restyled table's columns are SPORT / PL / W / L / WIN% — "decided"
    // is no longer its own figure, so the played-vs-decided distinction now
    // has to show up as (a) PL still counting the no-result and (b) the
    // footnote naming it, rather than as two side-by-side numbers.
    const { getByText } = render(
      <CareerCard
        profile={{ sports: [sport({ played: 13, decided: 12, noResult: 1 })], bestSport: null, achievements: [] }}
      />
    );
    expect(getByText('13')).toBeTruthy();
    expect(getByText(/1 no-result excluded from win rate/i)).toBeTruthy();
  });

  it('renders a header row of SPORT / PL / W / L / WIN%', () => {
    const { getByText } = render(<CareerCard profile={{ sports: [sport()], bestSport: null, achievements: [] }} />);
    expect(getByText(/^sport$/i)).toBeTruthy();
    expect(getByText(/^pl$/i)).toBeTruthy();
    expect(getByText(/^w$/i)).toBeTruthy();
    expect(getByText(/^l$/i)).toBeTruthy();
    expect(getByText(/^win%$/i)).toBeTruthy();
  });

  it('renders a Total row summing played/won/lost, with a win rate from SUMMED won over SUMMED decided — not an average of per-sport rates', () => {
    // Two sports of deliberately unequal volume: badminton 90 decided (81W/9L,
    // 90%) and cricket 10 decided (1W/9L, 10%). Averaging the two per-sport
    // rates gives (90+10)/2 = 50%. Summing first gives 82/100 = 82%. The two
    // methods disagree specifically because the volumes differ — this is the
    // numeric evidence that the total is computed the right way.
    const badminton = sport({ sport: 'badminton', played: 90, decided: 90, won: 81, lost: 9, tied: 0, noResult: 0, winRate: 81 / 90 });
    const cricket = sport({ sport: 'cricket', played: 10, decided: 10, won: 1, lost: 9, tied: 0, noResult: 0, winRate: 1 / 10 });
    const { getByText, queryByText } = render(
      <CareerCard profile={{ sports: [badminton, cricket], bestSport: null, achievements: [] }} />
    );

    expect(getByText(/^total$/i)).toBeTruthy();
    expect(getByText('100')).toBeTruthy(); // total played: 90 + 10
    expect(getByText('82')).toBeTruthy(); // total won: 81 + 1
    expect(getByText('18')).toBeTruthy(); // total lost: 9 + 9
    expect(getByText('82%')).toBeTruthy(); // 82 summed-won / 100 summed-decided
    expect(queryByText('50%')).toBeNull(); // the wrong, averaged answer must never appear
  });

  it('renders 0%, never NaN%, on the Total row when every sport has nothing decided', () => {
    const badminton = sport({ sport: 'badminton', played: 2, decided: 0, won: 0, lost: 0, tied: 0, noResult: 2, winRate: 0 });
    const cricket = sport({ sport: 'cricket', played: 3, decided: 0, won: 0, lost: 0, tied: 0, noResult: 3, winRate: 0 });
    const { getAllByText, queryByText } = render(
      <CareerCard profile={{ sports: [badminton, cricket], bestSport: null, achievements: [] }} />
    );

    expect(queryByText(/nan/i)).toBeNull();
    // Both per-sport rows and the Total row render 0% — three in total.
    expect(getAllByText('0%')).toHaveLength(3);
  });

  it('shows the no-results footnote only when at least one no-result exists', () => {
    const { queryByText } = render(
      <CareerCard profile={{ sports: [sport({ noResult: 0 }), sport({ sport: 'cricket', noResult: 0 })], bestSport: null, achievements: [] }} />
    );
    expect(queryByText(/no-result/i)).toBeNull();
  });

  it('shows an empty state for a player who has never played', () => {
    const { getByText, queryByText } = render(
      <CareerCard profile={{ sports: [], bestSport: null, achievements: [] }} />
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
