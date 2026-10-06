import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NewQuickMatchScreen from '../src/app/quick/new';
import { createQuickMatch } from '@/api/quickMatch';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn() } }));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) =>
    pick({ auth: { user: { _id: 'h1', firstName: 'Arjun', lastName: 'Mehta' } } }),
}));
jest.mock('@/api/quickMatch', () => ({ createQuickMatch: jest.fn(async () => ({ _id: 'm9' })) }));
jest.mock('@/api/playerSearch', () => ({ searchPlayers: jest.fn(async () => []) }));

beforeEach(() => jest.clearAllMocks());

/** Sport → role → format, the three steps every host passes the same way. */
function toPlayersStep() {
  render(<NewQuickMatchScreen />);
  fireEvent.press(screen.getByText('Badminton'));
  fireEvent.press(screen.getByText("I'm playing"));
  fireEvent.press(screen.getByText('Continue'));
}

describe('New quick match wizard', () => {
  it('asks one question at a time, with progress', () => {
    render(<NewQuickMatchScreen />);
    expect(screen.getByText('What are we playing?')).toBeTruthy();
    expect(screen.getByText('01 / 05')).toBeTruthy();
    expect(screen.queryByText('Are you in the match?')).toBeNull();

    fireEvent.press(screen.getByText('Cricket'));
    expect(screen.getByText('Are you in the match?')).toBeTruthy();
    expect(screen.getByText('02 / 05')).toBeTruthy();
  });

  it('goes back a step instead of leaving, until the first step', () => {
    render(<NewQuickMatchScreen />);
    fireEvent.press(screen.getByText('Badminton'));
    fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.getByText('What are we playing?')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('holds the players step until everyone is named, then starts the match with names built from players', async () => {
    toPlayersStep();
    expect(screen.getByText('Your team')).toBeTruthy();
    expect(screen.getByText('Opponents')).toBeTruthy();

    fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('Name every player to continue.')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("Opponent's name"), 'Rahul Singh');
    fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Ready to go?')).toBeTruthy();
    fireEvent.press(screen.getByText('Start match'));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(createQuickMatch).toHaveBeenCalledWith({
      sport: 'badminton',
      sides: [
        { name: 'Arjun Mehta', slots: [{ playerId: 'h1', displayName: 'Arjun Mehta' }] },
        { name: 'Rahul Singh', slots: [{ playerId: undefined, displayName: 'Rahul Singh' }] },
      ],
      matchConfig: { bestOf: 3, pointsToWin: 21 },
    });
  });

  it('lets the host name a team instead', async () => {
    toPlayersStep();
    fireEvent.changeText(screen.getByPlaceholderText("Opponent's name"), 'Rahul Singh');
    fireEvent.press(screen.getByLabelText('Name Opponents'));
    fireEvent.changeText(screen.getByPlaceholderText('Rahul Singh'), 'Smashers');
    fireEvent.press(screen.getByText('Continue'));
    fireEvent.press(screen.getByText('Start match'));

    await waitFor(() => expect(createQuickMatch).toHaveBeenCalled());
    const body = (createQuickMatch as jest.Mock).mock.calls[0][0];
    expect(body.sides.map((s: { name: string }) => s.name)).toEqual(['Arjun Mehta', 'Smashers']);
  });
});
