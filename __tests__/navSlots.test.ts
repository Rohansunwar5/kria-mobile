import { readFileSync } from 'fs';
import { NAV_SLOTS } from '../src/components/navigation/FloatingTabBar';

// FloatingTabBar resolves a route slot through `state.routes`, and a screen
// absent from the Tabs layout is absent from `state.routes` — so its press
// handler hits `if (!route) return` and does nothing at all. The tab looks
// enabled and is dead, and no screen-level test can see it, because those
// render the screen directly rather than through the navigator.
it('declares every routed nav slot in the tabs layout', () => {
  const layout = readFileSync('src/app/(tabs)/_layout.tsx', 'utf8');
  const routed = NAV_SLOTS.filter((slot) => slot.kind === 'route').map((slot) => slot.route);

  expect(routed.length).toBeGreaterThan(0);
  for (const route of routed) {
    expect({ route, declared: layout.includes(`name="${route}"`) }).toEqual({ route, declared: true });
  }
});
