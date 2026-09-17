import { render, screen, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import API from '@/api/axios';
import { ChampionsBlock } from '@/components/tournament/ChampionsBlock';

const envelope = (payload: unknown) => ({ data: { data: payload } });
const cat = (id: string, name: string) => ({ _id: id, name, status: 'completed' } as never);

const bracket = (over: Record<string, unknown> = {}) =>
  envelope({
    competitorType: 'team',
    rounds: {},
    matches: [
      {
        _id: 'f1', bracketRound: 'Final', roundNumber: 3, positionInRound: 0, matchNumber: 7,
        status: 'completed', winnerId: 't1',
        teams: { team1Id: 't1', team1Name: 'Konkan Titans', team2Id: 't2', team2Name: 'Deccan Dynamos' },
        ...over,
      },
    ],
  });

describe('ChampionsBlock', () => {
  let mock: MockAdapter;
  beforeEach(() => { mock = new MockAdapter(API); });
  afterEach(() => { mock.restore(); });

  it('names the champion alongside the category it was won in', async () => {
    mock.onGet('/matches/categories/c1').reply(200, bracket());

    render(<ChampionsBlock categories={[cat('c1', 'Gold Cup')]} />);

    await waitFor(() => expect(screen.getByText('Konkan Titans')).toBeTruthy());
    expect(screen.getByText(/gold cup/i)).toBeTruthy();
  });

  it('renders nothing at all while no category has been won', async () => {
    // An unfinished tournament must not leave an empty "Champions" heading
    // sitting on the Overview tab.
    mock.onGet('/matches/categories/c1').reply(200, bracket({ status: 'in_progress', winnerId: undefined }));

    const { toJSON } = render(<ChampionsBlock categories={[cat('c1', 'Gold Cup')]} />);
    await waitFor(() => expect(toJSON()).toBeNull());
  });

  it('lists one row per decided category', async () => {
    mock.onGet('/matches/categories/c1').reply(200, bracket());
    mock.onGet('/matches/categories/c2').reply(200, bracket({ winnerId: 't2' }));

    render(<ChampionsBlock categories={[cat('c1', 'Gold Cup'), cat('c2', 'Silver Plate')]} />);

    await waitFor(() => expect(screen.getByText('Konkan Titans')).toBeTruthy());
    expect(screen.getByText('Deccan Dynamos')).toBeTruthy();
  });

  it('stays quiet when a category has no bracket at all', async () => {
    mock.onGet('/matches/categories/c1').reply(404);
    const { toJSON } = render(<ChampionsBlock categories={[cat('c1', 'Gold Cup')]} />);
    await waitFor(() => expect(toJSON()).toBeNull());
  });
});
