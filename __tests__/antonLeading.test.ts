import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Anton_400Regular.ttf metrics (unitsPerEm 2048): capHeight 1760 = 0.859em,
// hhea descent 674 = 0.329em. iOS compresses the line box to `lineHeight` and
// clips whatever sticks out, so caps survive only while
//   lineHeight >= capHeight + descent = 1.188em.
// Android's layout overlaps instead of clipping, which is why the design's
// ~0.9em leading looked fine there and shaved the caps on iPhone.
const ANTON_MIN_LEADING = 1.188;

test('every Anton lineHeight clears the iOS clipping floor', () => {
  const files = execSync('git ls-files "src/**/*.tsx"', { encoding: 'utf8' }).trim().split('\n');
  const bad: string[] = [];

  for (const file of files) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (!line.includes('Anton_400Regular')) return;
        const size = line.match(/fontSize: (\d+)/);
        const lh = line.match(/lineHeight: (\d+)/);
        if (!size || !lh) return; // no lineHeight -> font's natural 1.505em, safe
        const ratio = Number(lh[1]) / Number(size[1]);
        if (ratio < ANTON_MIN_LEADING) {
          bad.push(`${file}:${i + 1} ${size[1]}/${lh[1]} = ${ratio.toFixed(3)}em`);
        }
      });
  }

  expect(bad).toEqual([]);
});
