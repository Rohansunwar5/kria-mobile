import { render } from '@testing-library/react-native';
import { Achievements } from '../src/components/profile/Achievements';
import type { Achievement } from '../src/api/career';

const achievement = (over: Partial<Achievement> = {}): Achievement => ({
  id: 'matches-50',
  label: 'Play 50 matches',
  earned: false,
  progress: 0,
  target: 50,
  ...over,
});

describe('Achievements', () => {
  it('announces earned vs locked beyond colour alone', () => {
    // DESIGN.md §7: colour is never the only signal. Both states must be
    // readable from the accessibility tree, not only from a dimmed tile.
    const { getByLabelText } = render(
      <Achievements
        achievements={[
          achievement({ id: 'wins-25', label: 'Win 25 matches', earned: true, progress: 25, target: 25 }),
          achievement({ id: 'matches-100', label: 'Play 100 matches', earned: false, progress: 57, target: 100 }),
        ]}
      />
    );
    expect(getByLabelText(/win 25 matches.*earned/i)).toBeTruthy();
    expect(getByLabelText(/play 100 matches.*locked/i)).toBeTruthy();
  });

  it('shows the nearest unearned achievement as the next milestone', () => {
    // wins-25 sits at 5/25 (20%); matches-100 sits at 57/100 (57%) — closer to
    // unlocking even though it comes later in the array and has a bigger
    // target. "Nearest" means closest to completion, not first in the list.
    const { getByText } = render(
      <Achievements
        achievements={[
          achievement({ id: 'wins-25', label: 'Win 25 matches', earned: false, progress: 5, target: 25 }),
          achievement({ id: 'matches-100', label: 'Play 100 matches', earned: false, progress: 57, target: 100 }),
        ]}
      />
    );
    expect(getByText(/next.*play 100 matches/i)).toBeTruthy();
    expect(getByText('57/100')).toBeTruthy();
  });

  it('shows no next-milestone row once everything is earned, but still renders the badges', () => {
    const { queryByText, getByLabelText } = render(
      <Achievements
        achievements={[achievement({ id: 'wins-25', label: 'Win 25 matches', earned: true, progress: 25, target: 25 })]}
      />
    );
    expect(queryByText(/next/i)).toBeNull();
    expect(getByLabelText(/win 25 matches.*earned/i)).toBeTruthy();
  });

  it('renders nothing at all for an empty list', () => {
    // CareerCard sits directly above and is already empty in that case — a
    // second empty state here would say the same thing twice.
    const { toJSON } = render(<Achievements achievements={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('shows a skeleton while loading, not the empty case', () => {
    const { getByText, queryByText } = render(<Achievements achievements={[]} loading />);
    expect(getByText(/achievements/i)).toBeTruthy();
    expect(queryByText(/next/i)).toBeNull();
  });

  it('shows an error block when the fetch failed, never silence', () => {
    const { getByText } = render(<Achievements achievements={[]} error />);
    expect(getByText(/couldn.t load achievements/i)).toBeTruthy();
  });
});
