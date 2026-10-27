import { exitAt, LAUNCH_6B, LAUNCH_6C } from '../src/lib/launchTiming';

it('the exit waits for both the timeline and readiness', () => {
  expect(exitAt({ reduced: false, readyAt: 300 })).toBe(1750);
  expect(exitAt({ reduced: false, readyAt: 2400 })).toBe(2400);
  expect(exitAt({ reduced: true, readyAt: 100 })).toBe(720);
  expect(exitAt({ reduced: true, readyAt: 900 })).toBe(900);
});

it('there is no exit while the app is not ready', () => {
  expect(exitAt({ reduced: false, readyAt: null })).toBeNull();
  expect(exitAt({ reduced: true, readyAt: null })).toBeNull();
});

it('6b and 6c timings come from the spec', () => {
  expect(LAUNCH_6B).toEqual({ total: 1750, exit: 320 });
  expect(LAUNCH_6C).toEqual({ total: 720, exit: 320 });
});
