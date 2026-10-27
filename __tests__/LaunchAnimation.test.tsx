import { act, render, screen } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { LaunchAnimation } from '../src/components/LaunchAnimation';

// Real Reanimated: the system reduced-motion setting is made switchable, and the
// animation builders are spied on (calling through) to check their reduceMotion.
let mockReduced = false;
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    useReducedMotion: () => mockReduced,
    withTiming: jest.fn(actual.withTiming),
    withDelay: jest.fn(actual.withDelay),
    withSequence: jest.fn(actual.withSequence),
  };
});

const tick = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

beforeEach(() => { mockReduced = false; jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

it('shows the wordmark and the tagline', () => {
  render(<LaunchAnimation ready={false} onDone={jest.fn()} />);
  expect(screen.getByText('KRIA')).toBeTruthy();
  expect(screen.getByText('Your sporting career, in your pocket.')).toBeTruthy();
});

it('when ready from the start, exits after the 1750ms timeline plus the 320ms fade, once', () => {
  const onDone = jest.fn();
  render(<LaunchAnimation ready onDone={onDone} />);
  tick(1750 + 320 - 1);
  expect(onDone).not.toHaveBeenCalled();
  tick(1);
  expect(onDone).toHaveBeenCalledTimes(1);
  tick(5000);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('holds the final frame while the app is not ready', () => {
  const onDone = jest.fn();
  render(<LaunchAnimation ready={false} onDone={onDone} />);
  tick(10000);
  expect(onDone).not.toHaveBeenCalled();
});

it('exits as soon as a late ready arrives, after the fade', () => {
  const onDone = jest.fn();
  const r = render(<LaunchAnimation ready={false} onDone={onDone} />);
  tick(3000);
  r.rerender(<LaunchAnimation ready onDone={onDone} />);
  tick(319);
  expect(onDone).not.toHaveBeenCalled();
  tick(1);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('once ready, a later not-ready does not cancel the exit', () => {
  const onDone = jest.fn();
  const r = render(<LaunchAnimation ready onDone={onDone} />);
  tick(500);
  r.rerender(<LaunchAnimation ready={false} onDone={onDone} />);
  tick(1750 + 320 - 500);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('under reduced motion (6c), exits after 720ms plus the fade', () => {
  mockReduced = true;
  const onDone = jest.fn();
  render(<LaunchAnimation ready onDone={onDone} />);
  expect(screen.getByText('KRIA')).toBeTruthy();
  tick(720 + 320 - 1);
  expect(onDone).not.toHaveBeenCalled();
  tick(1);
  expect(onDone).toHaveBeenCalledTimes(1);
});

// Reanimated defaults to ReduceMotion.System, which snaps every timing to its end
// when the system setting is on: exactly when 6c runs. Both paths must opt out.
it.each([true, false])('every animation ignores the system reduced-motion setting (reduced: %s)', (reduced) => {
  mockReduced = reduced;
  const { withTiming, withDelay, withSequence, ReduceMotion } = jest.mocked(Reanimated);
  [withTiming, withDelay, withSequence].forEach((f) => f.mockClear());
  render(<LaunchAnimation ready onDone={jest.fn()} />);
  tick(reduced ? 720 : 1750); // the exit's fade too
  expect(withTiming.mock.calls.length).toBe(reduced ? 4 : 12); // 6c: mark, word, tag, exit. 6b: 4 lines, body, 3 ball segments, catch, word, tag, exit
  for (const [, config] of withTiming.mock.calls) expect(config?.reduceMotion).toBe(ReduceMotion.Never);
  for (const [, , rm] of withDelay.mock.calls) expect(rm).toBe(ReduceMotion.Never);
  for (const [rm] of withSequence.mock.calls) expect(rm).toBe(ReduceMotion.Never);
});
