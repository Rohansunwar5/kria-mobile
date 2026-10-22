/** Data-neutral bracket shapes: each caller (knockout room, tournament) maps its own data into these. */
export interface BracketScore { v: string; strong: boolean }
export interface BracketRow { name: string; sub?: string; scores: BracketScore[]; won: boolean; lost: boolean; open: boolean }
export interface BracketCard { id: string; header?: string; live: boolean; mine: boolean; openId?: string; rows: [BracketRow, BracketRow] }
export interface BracketColumn { title: string; cards: BracketCard[] }

// DESIGN §5.10 / mock 2e geometry.
export const CARD_W = 200;
export const GUTTER = 36;
const ROW_GAP = 16;

/** One connector: from x, the pair's centres y1..y2 join, then run on to x2 at yMid. */
export interface BracketLink { x: number; y1: number; y2: number; x2: number; yMid: number }

/**
 * Where every card and connector goes. Cards have one fixed height, so a card
 * never drifts with its content. The first round stacks at a fixed pitch; a
 * later card centres on the pair feeding it (round r, position p is fed by
 * r−1 positions 2p and 2p+1, the servers' rule), or lines up with a lone feeder.
 */
export function bracketLayout(columns: BracketColumn[], cardH: number) {
  const pitch = cardH + ROW_GAP;
  const tops: number[][] = [];
  columns.forEach((col, c) => {
    const prev = tops[c - 1];
    tops.push(col.cards.map((_, j) => {
      if (!prev) return j * pitch;
      const a = prev[2 * j];
      const b = prev[2 * j + 1];
      return a === undefined ? j * pitch : b === undefined ? a : (a + b) / 2;
    }));
  });
  const links: BracketLink[] = [];
  tops.slice(0, -1).forEach((col, c) => {
    const x = c * (CARD_W + GUTTER) + CARD_W;
    for (let j = 0; j < col.length; j += 2) {
      const y1 = col[j] + cardH / 2;
      const y2 = (col[j + 1] ?? col[j]) + cardH / 2;
      links.push({ x, y1, y2, x2: x + GUTTER, yMid: (y1 + y2) / 2 });
    }
  });
  const height = Math.max(0, ...tops.flatMap((col) => col.map((t) => t + cardH)));
  const width = columns.length ? columns.length * CARD_W + (columns.length - 1) * GUTTER : 0;
  return { tops, links, width, height };
}
