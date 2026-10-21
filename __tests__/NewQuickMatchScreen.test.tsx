import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NewQuickMatchScreen from '../src/app/quick/new';
import { createQuickMatch } from '@/api/quickMatch';
import { createQuickKnockout } from '@/api/quickKnockout';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useFocusEffect: () => undefined,
}));
jest.mock('@/store/hooks', () => ({
  useAppSelector: (pick: (s: unknown) => unknown) =>
    pick({ auth: { user: { _id: 'h1', firstName: 'Arjun', lastName: 'Mehta', sport: 'badminton' } } }),
}));
jest.mock('@/api/quickMatch', () => ({
  createQuickMatch: jest.fn(async () => ({ _id: 'm9', joinCode: 'K7QX2M', status: 'waiting' })),
}));
jest.mock('@/api/quickKnockout', () => ({
  createQuickKnockout: jest.fn(async () => ({ _id: 'k5', joinCode: 'KN4CK2', status: 'waiting' })),
}));
jest.mock('@/api/playerSearch', () => ({ searchPlayers: jest.fn(async () => []) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

beforeEach(() => jest.clearAllMocks());

const toSides = () => {
  render(<NewQuickMatchScreen />);
  fireEvent.press(screen.getByText('Continue'));
  fireEvent.press(screen.getByText('Continue'));
};

describe('Host a match', () => {
  it('walks sport → format → sides → review, and Back steps back before it leaves', () => {
    render(<NewQuickMatchScreen />);
    expect(screen.getByText('What are you playing?')).toBeTruthy();
    expect(screen.getByText('1 of 4')).toBeTruthy();

    fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('Set the format')).toBeTruthy();
    expect(screen.getByText('2 of 4')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.getByText('What are you playing?')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Close'));
    expect(router.back).toHaveBeenCalled();
  });

  it('holds the sides step until both sides are named, with the validator message', () => {
    toSides();
    expect(screen.getByText('Name the sides')).toBeTruthy();
    fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('Name the sides')).toBeTruthy();

    const [a] = screen.getAllByPlaceholderText('Side name');
    fireEvent(a, 'blur');
    expect(screen.getByText('Each side needs a name.')).toBeTruthy();
  });

  it('creates exactly what the API takes, then shows the real code', async () => {
    toSides();
    const [a, b] = screen.getAllByPlaceholderText('Side name');
    fireEvent.changeText(a, 'Smash Bros');
    fireEvent.changeText(b, 'Net Gains');
    fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText('Ready to go?')).toBeTruthy();
    expect(screen.getByText('Singles · Best of 3 to 21')).toBeTruthy();
    expect(screen.getByText('1 to be claimed')).toBeTruthy();

    fireEvent.press(screen.getByText('Create match'));
    await waitFor(() => expect(screen.getByText('K7QX2M')).toBeTruthy());
    expect(createQuickMatch).toHaveBeenCalledWith({
      sport: 'badminton',
      sides: [
        { name: 'Smash Bros', slots: [{ playerId: 'h1', displayName: 'Arjun Mehta' }] },
        { name: 'Net Gains', slots: [{ displayName: 'Player 1' }] },
      ],
      matchConfig: { bestOf: 3, pointsToWin: 21 },
      waitForPlayers: true,
    });

    fireEvent.press(screen.getByText('Open match room'));
    expect(router.replace).toHaveBeenCalledWith('/quick/m9');
  });

  it('hosts a knockout from the same flow: no sides, an optional name, then the knockout', async () => {
    render(<NewQuickMatchScreen />);
    fireEvent.press(screen.getByText('Continue'));
    fireEvent.press(screen.getByText('Knockout'));
    expect(screen.getByText('Host a knockout')).toBeTruthy();
    fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Name the knockout')).toBeTruthy();
    expect(screen.getByPlaceholderText("Arjun's Knockout")).toBeTruthy();
    fireEvent.press(screen.getByText('Continue'));
    expect(screen.getByText("Arjun's Knockout")).toBeTruthy();

    fireEvent.press(screen.getByText('Create knockout'));
    await waitFor(() => expect(screen.getByText('Knockout created. Share the code.')).toBeTruthy());
    expect(createQuickKnockout).toHaveBeenCalledWith({ sport: 'badminton', format: 'singles', matchConfig: { bestOf: 1, pointsToWin: 21 } });
    expect(createQuickMatch).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Open knockout'));
    expect(router.replace).toHaveBeenCalledWith('/knockout/k5');
  });
});
