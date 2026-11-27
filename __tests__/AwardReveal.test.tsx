jest.mock('@/lib/haptics', () => ({ haptics: { award: jest.fn(), press: jest.fn() } }));
import { Modal } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AwardReveal } from '@/components/rewards/AwardReveal';
import { haptics } from '@/lib/haptics';
import { milestoneAwards } from '@/lib/awardsView';

// Real Reanimated, with the system reduced-motion setting made switchable.
let mockReduced = false;
jest.mock('react-native-reanimated', () => ({ __esModule: true, ...jest.requireActual('react-native-reanimated'), useReducedMotion: () => mockReduced }));

const m50 = milestoneAwards(
  [{ id: 'matches-10', label: 'Play 10 matches', progress: 10, target: 10, earned: true },
   { id: 'matches-50', label: 'Play 50 matches', progress: 50, target: 50, earned: true },
   { id: 'matches-100', label: 'Play 100 matches', progress: 50, target: 100, earned: false }],
  { played: 50, won: 30, sports: 1 },
).find((a) => a.key === 'matches-50')!;
const see = jest.fn();
const done = jest.fn();
const minted = jest.fn();

beforeEach(() => {
  mockReduced = false;
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

test('shows label, title and line; the mint at 820ms fires award() and onMinted once', () => {
  render(<AwardReveal award={m50} onSeeAward={see} onDone={done} onMinted={minted} />);
  expect(screen.getByText('Milestone')).toBeTruthy();
  expect(screen.getByText('50 matches played')).toBeTruthy();
  expect(screen.getByText('Next: 100.')).toBeTruthy();
  act(() => { jest.advanceTimersByTime(819); });
  expect(minted).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(1); });
  expect(minted).toHaveBeenCalledTimes(1);
  expect(haptics.award).toHaveBeenCalledTimes(1);
});

test('Done right after a skip, before 820ms, still marks once, and closes', () => {
  render(<AwardReveal award={m50} onSeeAward={see} onDone={done} onMinted={minted} />);
  fireEvent.press(screen.getByTestId('reveal-skip'));
  fireEvent.press(screen.getByText('Done'));
  expect(minted).toHaveBeenCalledTimes(1);
  expect(done).toHaveBeenCalledTimes(1);
  act(() => { jest.advanceTimersByTime(1000); });
  expect(minted).toHaveBeenCalledTimes(1);
  expect(haptics.award).toHaveBeenCalledTimes(1);
});

test('See award marks and calls back', () => {
  render(<AwardReveal award={m50} onSeeAward={see} onDone={done} onMinted={minted} />);
  act(() => { jest.advanceTimersByTime(1600); });
  fireEvent.press(screen.getByText('See award'));
  expect(minted).toHaveBeenCalledTimes(1);
  expect(see).toHaveBeenCalledTimes(1);
});

test('Android back closes like Done', () => {
  render(<AwardReveal award={m50} onSeeAward={see} onDone={done} onMinted={minted} />);
  act(() => { screen.UNSAFE_getByType(Modal).props.onRequestClose(); });
  expect(done).toHaveBeenCalledTimes(1);
  expect(minted).toHaveBeenCalledTimes(1);
});

test('a line prop overrides the reveal line', () => {
  render(<AwardReveal award={m50} line="3 wins to the title. Your 3rd knockout win." onSeeAward={see} onDone={done} onMinted={minted} />);
  expect(screen.getByText('3 wins to the title. Your 3rd knockout win.')).toBeTruthy();
  expect(screen.queryByText('Next: 100.')).toBeNull();
});

describe('the buttons before they appear (review M6)', () => {
  it('ignore taps until their beat at 1600ms', () => {
    render(<AwardReveal award={m50} onSeeAward={see} onDone={done} onMinted={minted} />);
    fireEvent.press(screen.getByText('Done'));
    fireEvent.press(screen.getByText('See award'));
    expect(done).not.toHaveBeenCalled();
    expect(see).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1599); });
    fireEvent.press(screen.getByText('Done'));
    expect(done).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    fireEvent.press(screen.getByText('Done'));
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('take taps at once under reduced motion, where they show at once', () => {
    mockReduced = true;
    render(<AwardReveal award={m50} onSeeAward={see} onDone={done} onMinted={minted} />);
    fireEvent.press(screen.getByText('Done'));
    expect(done).toHaveBeenCalledTimes(1);
  });
});
