import { riseDelay, heroParallax, DUR } from '@/lib/motion';

describe('card stagger', () => {
  it('is 70ms per row, capped at the third row', () => {
    expect([0, 1, 2, 3, 40].map(riseDelay)).toEqual([0, 70, 140, 140, 140]);
  });

  it('treats a negative index as the first row', () => {
    expect(riseDelay(-1)).toBe(0);
  });

  it('finishes the whole reveal inside a second', () => {
    expect(riseDelay(2) + 210 + DUR.rise).toBeLessThan(1000);
  });
});

describe('hero parallax', () => {
  it('is inert at rest', () => {
    const p = heroParallax(0);
    expect(p.artY).toBeCloseTo(0);
    expect(p.artScale).toBe(1);
    expect(p.deepen).toBe(0);
    expect(p.bar).toBe(0);
  });

  it('moves the banner slower than the scroll', () => {
    const { artY } = heroParallax(200);
    expect(artY).toBeCloseTo(-90);
    expect(Math.abs(artY)).toBeLessThan(200);
  });

  it('clamps every curve past its range', () => {
    const far = heroParallax(4000);
    expect(far.artScale).toBeCloseTo(1.06);
    expect(far.deepen).toBeCloseTo(0.55);
    expect(far.bar).toBe(1);
  });

  it('holds the compact bar hidden until the hero title has gone', () => {
    expect(heroParallax(110).bar).toBe(0);
    expect(heroParallax(145).bar).toBeGreaterThan(0);
    expect(heroParallax(180).bar).toBe(1);
  });

  it('never lightens the scrim as you scroll', () => {
    const steps = [0, 45, 90, 135, 180, 260].map((y) => heroParallax(y).deepen);
    steps.forEach((v, i) => i > 0 && expect(v).toBeGreaterThanOrEqual(steps[i - 1]));
  });
});
