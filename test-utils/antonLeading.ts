/**
 * The analyser behind `__tests__/antonLeading.test.ts`.
 *
 * Anton_400Regular.ttf metrics (unitsPerEm 2048): capHeight 1760 = 0.859em,
 * hhea descent 674 = 0.329em. iOS compresses the line box to `lineHeight` and
 * CLIPS whatever sticks out, so capitals survive only while
 *   lineHeight >= capHeight + descent = 1.188em.
 * Android's layout overlaps instead of clipping, which is why the design's
 * ~0.9em leading looked fine in review and shaved the caps on an iPhone.
 *
 * This lives outside `__tests__/` on purpose: jest's default testMatch treats
 * every `.ts` under that directory as a suite, so a helper there fails the run
 * with "must contain at least one test".
 */

export const ANTON_MIN_LEADING = 1.188;

/** The marker that opts a style the analyser cannot measure out of the fence. */
export const EXEMPT_MARKER = 'anton-leading-exempt';

export type Finding =
  | {
      kind: 'violation';
      file: string;
      line: number;
      size: number;
      lineHeight: number;
      ratio: number;
    }
  | {
      kind: 'unverifiable';
      file: string;
      line: number;
      /** The style's own properties, for the failure message. */
      detail: string;
    };

/**
 * The innermost brace-delimited object literal enclosing `index`.
 *
 * The fence used to read one line at a time, so it could only pair a fontSize
 * with a lineHeight when both were typed on the same line — every multi-line
 * `style={{ ... }}` was invisible to it. Walking out to the braces closes that.
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
 * The object's own properties, with every nested object blanked to spaces.
 *
 * This is what keeps the fence honest: a fontSize must only ever be paired with
 * the lineHeight of the SAME style. Reading through a nested object would pair
 * figures across two different styles and report a violation that is not there —
 * and a fence that cries wolf gets muted by the next person who trips it.
 *
 * Blanking preserves length, so offsets still map back to the original text.
 */
function ownProperties(object: string): string {
  let depth = 0;
  let out = '';
  for (const c of object) {
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

/** The text of one property's value, up to the next property or the brace. */
function valueOf(own: string, prop: string): string | null {
  const at = own.indexOf(`${prop}:`);
  if (at === -1) return null;
  const from = at + prop.length + 1;
  let end = own.length;
  for (let i = from; i < own.length; i++) {
    const c = own[i];
    if (c === ',' || c === '}' || c === '\n') {
      end = i;
      break;
    }
  }
  return own.slice(from, end);
}

/**
 * Every integer the expression commits to.
 *
 * The lookarounds matter: without them `size * 0.78` yields 0 and 78, and the
 * analyser would "measure" a lineHeight the code never sets. A decimal is not
 * an integer this fence can reason about, so its digits are not candidates.
 */
function integersIn(expression: string): number[] {
  return (expression.match(/(?<![\d.])\d+(?![\d.])/g) ?? []).map(Number);
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length;
}

/** Findings for one file's source. Empty means every Anton style is accounted for. */
export function analyseSource(file: string, src: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<number>();

  for (let at = src.indexOf('Anton_400Regular'); at !== -1; at = src.indexOf('Anton_400Regular', at + 1)) {
    const object = enclosingObject(src, at);
    if (!object || seen.has(object.start)) continue;
    seen.add(object.start);

    const own = ownProperties(object.text);
    const lineHeightExpr = valueOf(own, 'lineHeight');
    // No lineHeight at all leaves the font's natural 1.505em, which is safe.
    if (lineHeightExpr === null) continue;

    const sizes = integersIn(valueOf(own, 'fontSize') ?? '');
    const leadings = integersIn(lineHeightExpr);
    const line = lineOf(src, at);

    if (sizes.length === 0 || leadings.length === 0) {
      // Unverifiable, NOT safe. Skipping here in silence is the original hole.
      // An exemption is allowed only for this case — a style the analyser
      // genuinely cannot measure — never for one it can.
      const before = src.slice(Math.max(0, object.start - 240), object.start);
      if (before.includes(EXEMPT_MARKER) || object.text.includes(EXEMPT_MARKER)) continue;
      findings.push({ kind: 'unverifiable', file, line, detail: own.replace(/\s+/g, ' ').trim() });
      continue;
    }

    // Worst case across every branch: the tightest leading over the largest
    // size. A ternary must be safe on all of its branches, not on average.
    const size = Math.max(...sizes);
    const lineHeight = Math.min(...leadings);
    const ratio = lineHeight / size;
    if (ratio < ANTON_MIN_LEADING) {
      findings.push({ kind: 'violation', file, line, size, lineHeight, ratio });
    }
  }

  return findings;
}

/** One line per finding, for a failure message that says what to do. */
export function describeFinding(f: Finding): string {
  return f.kind === 'violation'
    ? `${f.file}:${f.line} ${f.size}/${f.lineHeight} = ${f.ratio.toFixed(3)}em (needs >= ${ANTON_MIN_LEADING})`
    : `${f.file}:${f.line} cannot be measured — make the sizes integer literals, or mark it "${EXEMPT_MARKER}: <reason>" — { ${f.detail} }`;
}
