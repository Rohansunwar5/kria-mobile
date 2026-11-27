/** One character of a rolling number; `roll` is its column travel (indexes into 0–9 twice). */
export type RollCell = { char: string; roll?: { start: number; end: number } };

/**
 * How each digit of `from` rolls to `to` (DESIGN v1.2 §9 number roll). An
 * increase rolls every changed digit up, a decrease rolls it down, wrapping
 * through the second 0–9 so 9→0 still moves the right way. Null when the two
 * can't line up (different lengths, or `from` isn't a number such as "—"):
 * the caller shows `to` as plain text.
 */
export function rollPlan(from: string, to: string): RollCell[] | null {
  if (from.length !== to.length || Number.isNaN(parseFloat(from))) return null;
  const up = parseFloat(to) >= parseFloat(from);
  return [...to].map((char, i) => {
    const f = from[i];
    if (char === f || !/\d/.test(char) || !/\d/.test(f)) return { char };
    const a = Number(f);
    const b = Number(char);
    return up
      ? { char, roll: { start: a, end: b > a ? b : b + 10 } }
      : { char, roll: { start: a + 10, end: b < a ? b + 10 : b } };
  });
}
