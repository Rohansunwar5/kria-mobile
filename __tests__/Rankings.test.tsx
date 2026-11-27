import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getTopPlayers } from '@/api/rankings';
import { Rankings } from '@/components/compete/Rankings';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/haptics', () => ({ haptics: { select: jest.fn() } }));
jest.mock('@/api/rankings', () => ({ getTopPlayers: jest.fn() }));

const rp = (playerId: string, firstName: string, won: number, decided: number) =>
  ({ playerId, firstName, lastName: 'X', played: decided, decided, won, winRate: won / decided });
const BOARD = ([['kav', 'Kavya', 18, 22], ['arj', 'Arjun', 15, 20], ['neh', 'Neha', 14, 19], ['rav', 'Ravi', 13, 18], ['imr', 'Imran', 12, 17],
  ['pri', 'Priya', 10, 15], ['dev', 'Dev', 9, 14], ['me', 'Asha', 8, 13], ['mee', 'Meera', 7, 12]] as const)
  .map(([id, n, w, d]) => rp(id, n, w, d));
const mine = [{ sport: 'badminton', played: 13, decided: 13, won: 8, lost: 5, tied: 0, noResult: 0, winRate: 8 / 13 }];
const props = { sport: 'badminton', onSport: jest.fn(), meId: 'me', meName: 'Asha Nair', mine, onPlay: jest.fn() };

test('your own row says how many wins pass the player above', async () => {
  (getTopPlayers as jest.Mock).mockResolvedValue(BOARD);
  render(<Rankings {...props} />);
  expect(await screen.findByText('Win your next 2 to pass Dev (#7)')).toBeTruthy();
});

test('an empty board shows three ghost rows with your initials', async () => {
  (getTopPlayers as jest.Mock).mockResolvedValue([]);
  render(<Rankings {...props} mine={[{ ...mine[0], played: 3, decided: 3, won: 2, lost: 1, winRate: 2 / 3 }]} />);
  expect(await screen.findByText("No one's ranked in badminton yet")).toBeTruthy();
  expect(screen.getAllByTestId('ghost-row')).toHaveLength(3);
  expect(screen.getByText('AN')).toBeTruthy();
});

test('after See full rankings, your row reports where it is so the screen can scroll to it', async () => {
  (getTopPlayers as jest.Mock).mockResolvedValue(BOARD);
  const onOwnRowLayout = jest.fn();
  render(<Rankings {...props} onOwnRowLayout={onOwnRowLayout} />);
  const row = await screen.findByLabelText(/^Rank 8, You/);
  fireEvent(row, 'layout', { nativeEvent: { layout: { x: 0, y: 300, width: 360, height: 84 } } });
  expect(onOwnRowLayout).not.toHaveBeenCalled(); // first load: no scroll
  fireEvent.press(screen.getByText('See full rankings'));
  fireEvent(await screen.findByLabelText(/^Rank 8, You/), 'layout', { nativeEvent: { layout: { x: 0, y: 640, width: 360, height: 84 } } });
  expect(onOwnRowLayout).toHaveBeenCalledWith(640, 84);
});

describe('your row pops once per reason (review #2, #8)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { haptics } = require('@/lib/haptics');
  beforeEach(() => { jest.useFakeTimers(); (haptics.select as jest.Mock).mockClear(); });
  afterEach(() => jest.useRealTimers());
  // Twice: a timer can set state whose effect schedules the haptic after the first advance.
  const settle = () => { act(() => { jest.advanceTimersByTime(2000); }); act(() => { jest.advanceTimersByTime(2000); }); };

  it('rank 8: one pop on load, one after See full rankings scrolls to it, not three', async () => {
    (getTopPlayers as jest.Mock).mockResolvedValue(BOARD);
    render(<Rankings {...props} onOwnRowLayout={jest.fn()} />);
    await screen.findByLabelText(/^Rank 8, You/);
    settle();
    expect(haptics.select).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('See full rankings'));
    fireEvent(await screen.findByLabelText(/^Rank 8, You/), 'layout', { nativeEvent: { layout: { x: 0, y: 640, width: 360, height: 84 } } });
    settle();
    expect(haptics.select).toHaveBeenCalledTimes(2);
  });

  it('a top-6 player still gets the pop after See full rankings, without a scroll', async () => {
    const top = BOARD.map((p) => (p.playerId === 'me' ? { ...p, playerId: 'x' } : p.playerId === 'neh' ? { ...p, playerId: 'me' } : p));
    (getTopPlayers as jest.Mock).mockResolvedValue(top);
    const onOwnRowLayout = jest.fn();
    render(<Rankings {...props} onOwnRowLayout={onOwnRowLayout} />);
    await screen.findByLabelText(/^Rank 3, You/);
    settle();
    fireEvent.press(screen.getByText('See full rankings'));
    settle();
    expect(haptics.select).toHaveBeenCalledTimes(2);
    expect(onOwnRowLayout).not.toHaveBeenCalled();
  });

  it('a sport switch while expanded does not scroll to your row later', async () => {
    (getTopPlayers as jest.Mock).mockResolvedValue(BOARD);
    const onOwnRowLayout = jest.fn();
    const view = render(<Rankings {...props} onOwnRowLayout={onOwnRowLayout} />);
    await screen.findByLabelText(/^Rank 8, You/);
    fireEvent.press(screen.getByText('See full rankings'));
    view.rerender(<Rankings {...props} sport="table_tennis" onOwnRowLayout={onOwnRowLayout} />);
    fireEvent(await screen.findByLabelText(/^Rank 8, You/), 'layout', { nativeEvent: { layout: { x: 0, y: 640, width: 360, height: 84 } } });
    expect(onOwnRowLayout).not.toHaveBeenCalled();
  });
});
