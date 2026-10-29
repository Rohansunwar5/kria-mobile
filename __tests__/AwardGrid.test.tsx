import { render } from '@testing-library/react-native';
import { Results } from '../src/components/tournament/Results';
import { AwardBadgeFor } from '../src/components/awards/AwardGrid';
import { titleAward } from '../src/lib/awardsView';

const mockBadge = jest.fn((_props: unknown) => null);
jest.mock('@/components/AwardBadge', () => ({ AwardBadge: (p: unknown) => mockBadge(p) }));

describe('title ribbons (final review C3)', () => {
  it('labels a runner-up shield RUNNER-UP and a winner shield CHAMPION', () => {
    render(<AwardBadgeFor award={titleAward({ place: 'runner_up', categoryName: 'MS' }, 0)} size={176} />);
    expect(mockBadge).toHaveBeenLastCalledWith(expect.objectContaining({ metal: 'silver', ribbon: 'RUNNER-UP' }));

    render(<AwardBadgeFor award={titleAward({ place: 'winner', categoryName: 'MS' }, 0)} size={176} />);
    expect(mockBadge).toHaveBeenLastCalledWith(expect.objectContaining({ metal: 'gold', ribbon: 'CHAMPION' }));
  });
});

describe('league result rows (final review M5)', () => {
  it('no longer says leagues name no champion, now that they award one', () => {
    const league = { _id: 'c1', name: 'Open League', bracketType: 'league' } as never;
    const screen = render(<Results categories={[league]} matches={{}} awards={[]} onTable={() => {}} />);
    expect(screen.getByText('Final table')).toBeTruthy();
    expect(screen.queryByText(/name no champion/)).toBeNull();
  });
});
