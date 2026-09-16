import { render, screen } from '@testing-library/react-native';
import { UpNextList } from '@/components/auction/UpNextList';

const player = (n: number) => ({
  registrationId: `r${n}`,
  playerName: `Player ${n}`,
  playerPhoto: null,
  basePrice: 1000 * n,
  skillLevel: 'advanced',
  queueIndex: n,
});

describe('UpNextList', () => {
  it('lists the queue it was given', () => {
    render(<UpNextList upcoming={[player(1), player(2)]} remaining={2} />);
    expect(screen.getByText('Player 1')).toBeTruthy();
    expect(screen.getByText('Player 2')).toBeTruthy();
  });

  it('says how many it could not fit', () => {
    render(<UpNextList upcoming={[player(1)]} remaining={9} />);
    expect(screen.getByText('+ 8 more in the queue')).toBeTruthy();
  });

  it('calls it the last lot only when nothing is actually left', () => {
    render(<UpNextList upcoming={[]} remaining={0} />);
    expect(screen.getByText('Last player on the block')).toBeTruthy();
  });

  it('does not claim the last lot when the server just did not send the queue', () => {
    // An older server has no `upcoming` field, but currentPlayerIndex/totalPlayers
    // still prove players remain. Saying "last player on the block" there is a lie.
    render(<UpNextList upcoming={[]} remaining={17} />);
    expect(screen.queryByText('Last player on the block')).toBeNull();
    expect(screen.getByText(/17 more players/i)).toBeTruthy();
  });
});
