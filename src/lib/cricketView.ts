import { LiveState, BallSummary, InningsScorecard, Dismissal } from '@/api/cricketMatch';

const ballsBowled = (live: Partial<LiveState> | null): number =>
  (live?.completedOvers ?? 0) * 6 + (live?.ballsInCurrentOver ?? 0);

export function currentRunRate(live: Partial<LiveState> | null): number {
  const balls = ballsBowled(live);
  if (balls <= 0) return 0;
  return Math.round(((live?.runs ?? 0) * 6 / balls) * 100) / 100;
}

export function requiredRunRate(live: Partial<LiveState> | null, maxOvers?: number): number | null {
  if (live?.target == null || !maxOvers) return null;
  const remaining = maxOvers * 6 - ballsBowled(live);
  if (remaining <= 0) return null;
  const rrr = (live.target - (live.runs ?? 0)) * 6 / remaining;
  return Math.max(0, Math.round(rrr * 100) / 100);
}

export function dismissalLine(d?: Dismissal): string {
  if (!d) return 'not out';
  switch (d.type) {
    case 'bowled': return `b ${d.bowlerName ?? '—'}`;
    case 'lbw': return `lbw b ${d.bowlerName ?? '—'}`;
    case 'caught': return `c ${d.fielderName ?? '—'} b ${d.bowlerName ?? '—'}`;
    case 'stumped': return `st ${d.fielderName ?? '—'} b ${d.bowlerName ?? '—'}`;
    case 'run_out': return `run out${d.fielderName ? ' (' + d.fielderName + ')' : ''}`;
    case 'hit_wicket': return `hit wicket b ${d.bowlerName ?? '—'}`;
    case 'retired_hurt': return 'retired hurt';
    default: return d.type;
  }
}

export type BallKind = 'six' | 'four' | 'wicket' | 'extra' | 'dot' | 'run';

export function ballChipKind(b: BallSummary): BallKind {
  if (b.isWicket) return 'wicket';
  if (b.label.startsWith('wd') || b.label.startsWith('nb')) return 'extra';
  if (b.label.startsWith('b') || b.label.startsWith('lb')) return 'extra';
  if (b.label === '6') return 'six';
  if (b.label === '4') return 'four';
  if (b.label === '0') return 'dot';
  return 'run';
}

export function tallyKey(live: Partial<LiveState> | null): string {
  return `${live?.runs ?? 0}|${live?.wickets ?? 0}|${live?.completedOvers ?? 0}|${live?.ballsInCurrentOver ?? 0}|${live?.matchStatus ?? ''}`;
}

// ─── Derived figures the web client shows and mobile did not ──────────────

export function ballsRemaining(live: Partial<LiveState> | null, maxOvers?: number): number | null {
  if (!maxOvers) return null;
  return Math.max(0, maxOvers * 6 - ballsBowled(live));
}

export function strikeRate(runs: number, balls: number): number {
  if (balls <= 0) return 0;
  return Math.round((runs / balls) * 1000) / 10;
}

export interface ManhattanBar {
  overNumber: number;
  runs: number;
  wickets: number;
  /** Not bowled yet — drawn as an empty slot so the axis keeps its full width. */
  empty: boolean;
  /** 0-1 of the tallest bar. A bowled over never renders at zero height. */
  ratio: number;
}

/** One bar per over, padded out to `maxOvers`. */
export function manhattanBars(
  innings: InningsScorecard | null,
  maxOvers?: number
): { bars: ManhattanBar[]; peak: number } {
  const overs = innings?.oversTimeline ?? [];
  if (overs.length === 0) return { bars: [], peak: 0 };
  const peak = Math.max(1, ...overs.map((o) => o.runs));
  const total = maxOvers ?? overs[overs.length - 1].overNumber;
  const bars = Array.from({ length: total }, (_, i) => {
    const o = overs.find((x) => x.overNumber === i + 1);
    if (!o) return { overNumber: i + 1, runs: 0, wickets: 0, empty: true, ratio: 0 };
    return {
      overNumber: o.overNumber,
      runs: o.runs,
      wickets: o.wickets,
      empty: false,
      ratio: Math.max(0.06, o.runs / peak),
    };
  });
  return { bars, peak };
}
