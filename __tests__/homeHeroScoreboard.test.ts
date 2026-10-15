import { gameCellWidth } from '@/components/home/HomeHero';

// Inside a 360 dp phone the hero scoreboard is 294 dp wide; a side name needs
// about 70 dp of it to stay readable.
it('keeps room for side names through game 7 of a best of 7', () => {
  expect(7 * gameCellWidth(7)).toBeLessThanOrEqual(294 - 70);
});

it('leaves up to five games at the width they always had', () => {
  expect(gameCellWidth(1)).toBe(40);
  expect(gameCellWidth(5)).toBe(40);
});
