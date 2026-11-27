/**
 * Has the cold-start launch animation finished? Reveals wait for it (reward
 * spec C3): the launch overlay sits above every screen for ~1.75s. A module
 * flag, set once by the root layout, not a store.
 */
let done = false;
let release: () => void = () => {};
const gate = new Promise<void>((resolve) => {
  release = resolve;
});

export function markLaunchDone(): void {
  done = true;
  release();
}

export const whenLaunchDone = (): Promise<void> => gate;
export const isLaunchDone = (): boolean => done;
