import { render, screen } from '@testing-library/react-native';
import { getTopPlayers } from '@/api/rankings';
import { CompeteCard } from '@/components/signin/IntroCards';

jest.mock('@/api/rankings', () => ({ getTopPlayers: jest.fn() }));
const top = getTopPlayers as jest.Mock;
const player = (firstName: string, winRate: number) => ({ playerId: firstName, firstName, lastName: 'Rao', played: 6, decided: 6, won: 4, winRate });

// SERVER-GAPS #36: 7b shows the real top three once the rankings are public.
it('shows the real top three of the first sport', async () => {
  top.mockResolvedValue([player('Asha', 0.83), player('Bina', 0.67), player('Chet', 0.5)]);
  render(<CompeteCard sports={['badminton', 'cricket']} rankMin={5} />);
  expect(await screen.findByText('Asha Rao')).toBeTruthy();
  expect(screen.getByText('83%')).toBeTruthy();
  expect(screen.getByText('Chet Rao')).toBeTruthy();
  expect(top).toHaveBeenCalledWith('badminton', 3);
  expect(screen.getByText('You · 5 matches to go')).toBeTruthy();
});

it('keeps the illustration when nobody is ranked yet', async () => {
  top.mockResolvedValue([]);
  render(<CompeteCard sports={['badminton']} rankMin={5} />);
  await screen.findByText('You · 5 matches to go');
  expect(screen.queryByText(/Rao/)).toBeNull();
});
