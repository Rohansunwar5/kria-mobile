type Gate = typeof import('@/lib/launchGate');
const fresh = (): Gate => {
  let gate!: Gate;
  jest.isolateModules(() => {
    gate = require('@/lib/launchGate');
  });
  return gate;
};

test('whenLaunchDone resolves after markLaunchDone, and not before', async () => {
  const gate = fresh();
  let done = false;
  gate.whenLaunchDone().then(() => {
    done = true;
  });
  await Promise.resolve();
  expect(done).toBe(false);
  expect(gate.isLaunchDone()).toBe(false);
  gate.markLaunchDone();
  await gate.whenLaunchDone();
  expect(done).toBe(true);
  expect(gate.isLaunchDone()).toBe(true);
});

test('marking twice is harmless', async () => {
  const gate = fresh();
  gate.markLaunchDone();
  gate.markLaunchDone();
  await expect(gate.whenLaunchDone()).resolves.toBeUndefined();
});
