import { hue } from '@/components/TournamentArt';

describe('tournament art ground', () => {
  it('is deterministic per tournament', () => {
    expect(hue('68b1f0c2a4d3e5f60718293a')).toBe(hue('68b1f0c2a4d3e5f60718293a'));
  });

  it('stays in range and separates neighbouring ids', () => {
    const ids = ['68b1f0c2a4d3e5f60718293a', '68b1f0c2a4d3e5f60718293b', '68b1f0c2a4d3e5f60718293c'];
    const hues = ids.map(hue);
    hues.forEach((h) => {
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    });
    expect(new Set(hues).size).toBe(3);
  });
});
