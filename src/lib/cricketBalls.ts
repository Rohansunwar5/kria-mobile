import type { Ball } from '@/api/cricketStats';

export type BallKind = 'wicket' | 'four' | 'six' | 'dot' | 'extra' | 'runs';

export interface BallLabel {
  text: string;
  kind: BallKind;
}

export interface DisplayBall extends Ball {
  /** Running innings score after this delivery. */
  score: { runs: number; wickets: number };
  label: BallLabel;
}

export interface OverGroup {
  overNumber: number;
  runs: number;
  wickets: number;
  bowlerName?: string;
  /** Newest delivery first. */
  balls: DisplayBall[];
}

const EXTRA_TEXT: Record<string, string> = {
  wide: 'WD',
  no_ball: 'NB',
  bye: 'B',
  leg_bye: 'LB',
};

/**
 * What goes in the square next to a delivery.
 *
 * A wicket outranks everything — run-outs happen on no-balls, and the
 * dismissal is the story, not the extra.
 */
export function ballLabel(ball: Ball): BallLabel {
  if (ball.wicketType) return { text: 'W', kind: 'wicket' };
  if (ball.extrasType && EXTRA_TEXT[ball.extrasType]) {
    return { text: EXTRA_TEXT[ball.extrasType], kind: 'extra' };
  }
  if (ball.runs === 4) return { text: '4', kind: 'four' };
  if (ball.runs === 6) return { text: '6', kind: 'six' };
  if (ball.totalRuns === 0) return { text: '·', kind: 'dot' };
  return { text: String(ball.runs), kind: 'runs' };
}

/**
 * Balls grouped into overs for display: newest over first, newest delivery
 * first within each over. The running score is accumulated in *innings* order
 * first, so reversing for display never corrupts it.
 */
export function groupIntoOvers(balls: Ball[], nameById: Record<string, string> = {}): OverGroup[] {
  if (balls.length === 0) return [];

  const chronological = [...balls].sort(
    (a, b) => a.overNumber - b.overNumber || a.deliveryNumber - b.deliveryNumber
  );

  let runs = 0;
  let wickets = 0;
  const withScore: DisplayBall[] = chronological.map((b) => {
    runs += b.totalRuns;
    if (b.wicketType) wickets += 1;
    return { ...b, score: { runs, wickets }, label: ballLabel(b) };
  });

  const byOver = new Map<number, DisplayBall[]>();
  for (const b of withScore) {
    const list = byOver.get(b.overNumber);
    if (list) list.push(b);
    else byOver.set(b.overNumber, [b]);
  }

  return [...byOver.entries()]
    .sort(([a], [b]) => b - a)
    .map(([overNumber, overBalls]) => ({
      overNumber,
      runs: overBalls.reduce((s, b) => s + b.totalRuns, 0),
      wickets: overBalls.filter((b) => b.wicketType).length,
      bowlerName: nameById[overBalls[0].bowlerId],
      balls: [...overBalls].reverse(),
    }));
}
