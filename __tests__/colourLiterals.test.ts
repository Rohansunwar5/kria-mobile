import { readFileSync } from 'fs';
import { MIGRATED, findColourLiterals, findLegacyColourUsages } from '../test-utils/colourLiterals';

// A ratchet, not a sweep. A file joins MIGRATED when its literals become
// tokens; from then on this fence stops them coming back. The unmigrated files
// (currently 103) are the remaining backlog and are deliberately unguarded.
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

  // A colour literal is a whole value, never a fragment of prose. Both halves
  // of this rule matter: flagging prose would make the fence cry wolf, and a
  // muted fence is how this project shipped three Anton violations.
  it('does not flag prose that merely mentions rgb', () => {
    expect(findColourLiterals("note: 'the rgb(a) channel'")).toEqual([]);
  });

  it('flags an rgb value, spaces and interpolation included', () => {
    expect(findColourLiterals("color: 'rgb(255, 255, 255)'")).toHaveLength(1);
    expect(findColourLiterals('color: `rgba(255,255,255,${a})`')).toHaveLength(1);
  });

  it('catches every hex spelling, including uppercase and 4-digit', () => {
    for (const src of ["color: '#FFF'", "color: '#fff8'", 'color: `#fff`', 'color: "#fff"']) {
      expect(findColourLiterals(src)).toHaveLength(1);
    }
  });

  it('every migrated file is free of colour literals', () => {
    const offenders = MIGRATED.flatMap((file) =>
      findColourLiterals(readFileSync(file, 'utf8')).map((f) => `${file}:${f.line} ${f.literal}`)
    );
    expect(offenders).toEqual([]);
  });

  it('lists the files migrated so far', () => {
    expect(MIGRATED).toContain('src/app/profile/settings.tsx');
    expect(MIGRATED).toContain('src/components/profile/CareerCard.tsx');
    expect(MIGRATED.length).toBeGreaterThanOrEqual(8);
  });

  // The blind spot: a file can carry zero quoted literals and still be
  // unready for light mode, either because it reads the legacy hardcoded
  // `colors` object (`src/lib/theme.ts`, dark-only) or because it hardcodes
  // colour via a NativeWind classname. Neither is a quoted colour value, so
  // findColourLiterals cannot see either one — this is why it is a sibling
  // function rather than a branch inside that one.
  describe('findLegacyColourUsages', () => {
    it('flags member access on the legacy colors object', () => {
      expect(findLegacyColourUsages('color: colors.white,')).toEqual([{ line: 1, literal: 'colors.white' }]);
      expect(findLegacyColourUsages('backgroundColor: colors.brand,')).toEqual([
        { line: 1, literal: 'colors.brand' },
      ]);
    });

    it('does not confuse colors.panel with colors.panel2, or vice versa', () => {
      expect(findLegacyColourUsages('a: colors.panel,')).toEqual([{ line: 1, literal: 'colors.panel' }]);
      expect(findLegacyColourUsages('a: colors.panel2,')).toEqual([{ line: 1, literal: 'colors.panel2' }]);
    });

    it('flags a colour-bearing NativeWind classname', () => {
      expect(findLegacyColourUsages('<View className="flex-1 bg-ink" />')).toEqual([
        { line: 1, literal: 'bg-ink' },
      ]);
      expect(findLegacyColourUsages('<Text className="flex-1 text-white" />')).toEqual([
        { line: 1, literal: 'text-white' },
      ]);
    });

    it('does not flag a non-colour classname sharing the same prefix', () => {
      expect(findLegacyColourUsages('<View className="flex-1 border-2 text-sm" />')).toEqual([]);
    });

    it('does not flag a theme.<prop> access, only colors.<prop>', () => {
      expect(findLegacyColourUsages('color: theme.brand,')).toEqual([]);
    });

    it('every migrated file is free of legacy colors-object and classname usage', () => {
      const offenders = MIGRATED.flatMap((file) =>
        findLegacyColourUsages(readFileSync(file, 'utf8')).map((f) => `${file}:${f.line} ${f.literal}`)
      );
      expect(offenders).toEqual([]);
    });
  });
});
