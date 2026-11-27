import { bracketLayout, type BracketColumn } from '@/lib/bracket';

// Mock 2e geometry: 200px cards, 36px gutters, 92px cards 16px apart; a later
// round's card sits on the midpoint of the pair feeding it.
const row = { name: 'x', scores: [], won: false, lost: false, open: false };
const card = (id: string) => ({ id, live: false, mine: false, rows: [row, row] as [typeof row, typeof row] });
const cols = (...counts: number[]): BracketColumn[] =>
  counts.map((n, c) => ({ title: `R${c}`, cards: Array.from({ length: n }, (_, i) => card(`${c}-${i}`)) }));

test('first round stacks at a fixed pitch; later rounds centre on their feeders', () => {
  const l = bracketLayout(cols(4, 2, 1), 92);
  expect(l.tops).toEqual([[0, 108, 216, 324], [54, 270], [162]]);
  expect(l.height).toBe(416);
  expect(l.width).toBe(3 * 200 + 2 * 36);
});

test('connectors join each pair and run into the next card at its centre', () => {
  const l = bracketLayout(cols(4, 2, 1), 92);
  expect(l.links).toEqual([
    { x: 200, y1: 46, y2: 154, x2: 236, yMid: 100 },
    { x: 200, y1: 262, y2: 370, x2: 236, yMid: 316 },
    { x: 436, y1: 100, y2: 316, x2: 472, yMid: 208 },
  ]);
  // Every connector lands on the centre of the card it feeds.
  expect(l.tops[1][0] + 46).toBe(100);
  expect(l.tops[2][0] + 46).toBe(208);
});

test('a card with only one feeder lines up with it and gets a straight connector', () => {
  const l = bracketLayout(cols(3, 2), 65);
  expect(l.tops[1]).toEqual([40.5, 162]);
  expect(l.links).toContainEqual({ x: 200, y1: 194.5, y2: 194.5, x2: 236, yMid: 194.5 });
});

test('the last round draws no connectors, and an empty bracket is empty', () => {
  expect(bracketLayout(cols(1), 92).links).toEqual([]);
  expect(bracketLayout([], 92)).toEqual({ tops: [], links: [], width: 0, height: 0 });
});

describe('highlightSegments (reward spec §10: only the champion\'s half of each link)', () => {
  const { highlightSegments } = jest.requireActual('@/lib/bracket') as typeof import('@/lib/bracket');
  it('draws a stub out of the champion\'s card, a run to the midpoint, and the wire on', () => {
    expect(highlightSegments(cols(4, 2, 1), 65, ['0-1', '1-0', '2-0'])).toEqual([
      { round: 0, stub: { left: 200, top: 112.5, width: 18, height: 2 }, run: { left: 217, top: 73, width: 2, height: 40.5 }, wire: { left: 218, top: 72, width: 18, height: 2 } },
      { round: 1, stub: { left: 436, top: 72, width: 18, height: 2 }, run: { left: 453, top: 73, width: 2, height: 81 }, wire: { left: 454, top: 153, width: 18, height: 2 } },
    ]);
  });
  it('a lone feeder gets a zero-length run', () => {
    const [seg] = highlightSegments(cols(3, 2), 65, ['0-2', '1-1']);
    expect(seg.round).toBe(0);
    expect(seg.run.height).toBe(0);
  });
  it('no ids, no segments', () => {
    expect(highlightSegments(cols(4, 2, 1), 65, [])).toEqual([]);
  });
});
