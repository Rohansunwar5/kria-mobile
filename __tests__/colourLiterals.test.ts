import { readFileSync } from 'fs';
import { MIGRATED, findColourLiterals } from '../test-utils/colourLiterals';

// A ratchet, not a sweep. A file joins MIGRATED when its literals become
// tokens; from then on this fence stops them coming back. The ~90 files not
// listed are the remaining backlog and are deliberately unguarded.
describe('colour literal fence', () => {
  it('finds a hex literal', () => {
    expect(findColourLiterals("color: '#fff'")).toEqual([{ line: 1, literal: "'#fff'" }]);
  });

  it('finds an rgba literal', () => {
    expect(findColourLiterals("borderColor: 'rgba(255,255,255,0.14)'")).toHaveLength(1);
  });

  it('does not flag a seeded art colour, which is identity rather than theme', () => {
    expect(findColourLiterals("backgroundColor: `hsl(${hue(seed)}, 44%, 13%)`")).toEqual([]);
  });

  it('does not flag a data: URI', () => {
    expect(findColourLiterals("uri: 'data:image/svg+xml,%3Csvg%3E'")).toEqual([]);
  });

  it('every migrated file is free of colour literals', () => {
    const offenders = MIGRATED.flatMap((file) =>
      findColourLiterals(readFileSync(file, 'utf8')).map((f) => `${file}:${f.line} ${f.literal}`)
    );
    expect(offenders).toEqual([]);
  });

  it('lists the files Task 3 migrated', () => {
    expect(MIGRATED).toContain('src/components/home/FilterSheet.tsx');
    expect(MIGRATED).toContain('src/components/navigation/FloatingTabBar.tsx');
    expect(MIGRATED.length).toBeGreaterThanOrEqual(8);
  });
});
