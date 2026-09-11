import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Anton_400Regular.ttf metrics (unitsPerEm 2048): capHeight 1760 = 0.859em,
// hhea descent 674 = 0.329em. iOS compresses the line box to `lineHeight` and
// clips whatever sticks out, so caps survive only while
//   lineHeight >= capHeight + descent = 1.188em.
// Android's layout overlaps instead of clipping, which is why the design's
// ~0.9em leading looked fine there and shaved the caps on iPhone.
const ANTON_MIN_LEADING = 1.188;

/**
 * The innermost brace-delimited object literal enclosing `index`, as text.
 *
 * The fence used to read one line at a time, so it could only pair a fontSize
 * with a lineHeight when both were typed on the same line — every multi-line
 * `style={{ ... }}` was invisible to it, and real violations shipped straight
 * through the hole. Walking out to the enclosing braces closes it.
 */
function enclosingObject(src: string, index: number): { start: number; text: string } | null {
  let depth = 0;
  let start = -1;
  for (let i = index; i >= 0; i--) {
    const c = src[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return null;

  depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { start, text: src.slice(start, i + 1) };
    }
  }
  return null;
}

/**
 * The object's own properties, with every nested object blanked out.
 *
 * This is what keeps the widened fence honest: a fontSize must only ever be
 * paired with the lineHeight of the SAME style. Reading through a nested object
 * would pair figures across two different styles and report a violation that is
 * not there — and a fence that cries wolf gets muted by the next person, which
 * is worse than the hole it was widened to close.
 */
function ownProperties(object: string): string {
  let depth = 0;
  let out = '';
  for (let i = 0; i < object.length; i++) {
    const c = object[i];
    if (c === '{') {
      depth++;
      out += c;
    } else if (c === '}') {
      depth--;
      out += c;
    } else {
      out += depth === 1 ? c : ' ';
    }
  }
  return out;
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length;
}

test('every Anton lineHeight clears the iOS clipping floor', () => {
  const files: string[] = execSync('git ls-files "src/**/*.tsx"', { encoding: 'utf8' }).trim().split('\n');
  const bad: string[] = [];

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const seen = new Set<number>();

    for (let at = src.indexOf('Anton_400Regular'); at !== -1; at = src.indexOf('Anton_400Regular', at + 1)) {
      const object = enclosingObject(src, at);
      if (!object || seen.has(object.start)) continue;
      seen.add(object.start);

      const own = ownProperties(object.text);
      const size = /\bfontSize:\s*(\d+)\b/.exec(own);
      const lh = /\blineHeight:\s*(\d+)\b/.exec(own);
      if (!size || !lh) continue; // no lineHeight -> font's natural 1.505em, safe

      const ratio = Number(lh[1]) / Number(size[1]);
      if (ratio < ANTON_MIN_LEADING) {
        bad.push(`${file}:${lineOf(src, at)} ${size[1]}/${lh[1]} = ${ratio.toFixed(3)}em`);
      }
    }
  }

  expect(bad).toEqual([]);
});
