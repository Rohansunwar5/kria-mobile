import { render, screen } from '@testing-library/react-native';
import { ChampionsBlock, type Champion } from '@/components/tournament/ChampionsBlock';
import type { Competitor } from '@/lib/bracketView';

const side = (id: string, name: string, isWinner: boolean): Competitor =>
  ({ id, name, teamName: '', isTBD: false, isBye: false, isWinner });

const champion = (over: Partial<Champion['result']> = {}, categoryName = 'Gold Cup'): Champion => ({
  categoryId: categoryName,
  categoryName,
  result: {
    competitorType: 'team',
    winner: side('t2', 'Deccan Dynamos', true),
    loser: side('t1', 'Coastal Chargers', false),
    score: '142/6 – 138/9',
    ...over,
  },
});

describe('ChampionsBlock', () => {
  it('names the champion, the category, who they beat and the score', () => {
    render(<ChampionsBlock champions={[champion()]} />);
    expect(screen.getByText('Deccan Dynamos')).toBeTruthy();
    expect(screen.getByText('Gold Cup champions')).toBeTruthy();
    expect(screen.getByText('Coastal Chargers')).toBeTruthy();
    expect(screen.getByText('142/6 – 138/9')).toBeTruthy();
  });

  it('falls back to the margin when the final has no score line', () => {
    render(<ChampionsBlock champions={[champion({ score: null, margin: 'Walkover' })]} />);
    expect(screen.getByText('Walkover')).toBeTruthy();
  });

  it('renders nothing at all while no category has been won', () => {
    const { toJSON } = render(<ChampionsBlock champions={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('lists one card per decided category', () => {
    render(<ChampionsBlock champions={[champion({}, 'Gold Cup'), champion({}, 'Silver Cup')]} />);
    expect(screen.getByText('Gold Cup champions')).toBeTruthy();
    expect(screen.getByText('Silver Cup champions')).toBeTruthy();
  });
});
