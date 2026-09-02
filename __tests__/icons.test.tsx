import { render } from '@testing-library/react-native';
import {
  Icon,
  ICON_NAMES,
  ICON_PATHS,
  SOLID_CAPABLE,
  type IconName,
} from '@/components/icons';

// The 40-odd `d` strings are hand-drawn: a typo renders as nothing, or as
// garbage, with no error thrown. These assertions are the thing that catches it.

function countPaths(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  const n = node as { type?: string; children?: unknown[] };
  const self = n.type === 'RNSVGPath' ? 1 : 0;
  return self + (n.children ?? []).reduce<number>((sum, c) => sum + countPaths(c), 0);
}

describe('icon geometry', () => {
  it('covers the app surface', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(30);
  });

  it.each(ICON_NAMES)('%s starts with an absolute moveto', (name) => {
    for (const d of ICON_PATHS[name]) expect(d).toMatch(/^M/);
  });

  it.each(ICON_NAMES)('%s contains only valid path syntax', (name) => {
    for (const d of ICON_PATHS[name]) {
      expect(d).toMatch(/^[MLHVCSQTAZmlhvcsqtaz0-9.,\-\s]+$/);
    }
  });

  it.each(ICON_NAMES)('%s stays on the 24-unit grid', (name) => {
    for (const d of ICON_PATHS[name]) {
      for (const num of d.match(/-?\d+(\.\d+)?/g) ?? []) {
        const v = Number(num);
        expect(v).toBeGreaterThanOrEqual(-2);
        expect(v).toBeLessThanOrEqual(26);
      }
    }
  });

  it('declares solid support only for closed shapes', () => {
    expect(SOLID_CAPABLE).toContain('trophy');
    expect(SOLID_CAPABLE).toContain('person');
    // Open-stroke glyphs would look broken filled.
    expect(SOLID_CAPABLE).not.toContain('chevron-right');
    expect(SOLID_CAPABLE).not.toContain('stumps');
    expect(SOLID_CAPABLE).not.toContain('court');
    // Skirt and cork merge into one funnel when filled.
    expect(SOLID_CAPABLE).not.toContain('shuttlecock');
  });

  it('ships the sport glyphs that carry the brand', () => {
    for (const n of ['shuttlecock', 'cricket-bat', 'stumps', 'court', 'gavel', 'bracket', 'ball']) {
      expect(ICON_NAMES).toContain(n);
    }
  });
});

describe('Icon component', () => {
  it.each(ICON_NAMES)('%s renders every one of its paths', (name) => {
    const { toJSON } = render(<Icon name={name} size={24} color="#F97316" />);
    expect(countPaths(toJSON())).toBe(ICON_PATHS[name].length);
  });

  it('renders filled variants', () => {
    const { toJSON } = render(<Icon name="trophy" color="#F97316" filled />);
    expect(countPaths(toJSON())).toBe(ICON_PATHS.trophy.length);
  });

  it('returns null for an unknown name rather than throwing', () => {
    const { toJSON } = render(<Icon name={'not-a-real-icon' as IconName} />);
    expect(toJSON()).toBeNull();
  });
});
