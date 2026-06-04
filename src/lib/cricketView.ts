import { LiveState, BallSummary, InningsScorecard, Dismissal } from '@/api/cricketMatch';

const ballsBowled = (live: Partial<LiveState> | null): number =>
  (live?.completedOvers ?? 0) * 6 + (live?.ballsInCurrentOver ?? 0);

export function oversDisplay(live: Partial<LiveState> | null): string {
  return `${live?.completedOvers ?? 0}.${live?.ballsInCurrentOver ?? 0}`;
}

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

export function chaseLine(live: Partial<LiveState> | null, maxOvers?: number): string | null {
  if (live?.target == null) return null;
  const runsToWin = Math.max(0, live.target - (live.runs ?? 0));
  if (runsToWin === 0) return 'Target achieved';
  if (!maxOvers) return `Need ${runsToWin}`;
  const remaining = maxOvers * 6 - ballsBowled(live);
  if (remaining <= 0) return `Need ${runsToWin}`;
  return `Need ${runsToWin} in ${remaining} balls`;
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

export function recentBalls(innings: InningsScorecard | null, overCount = 2): { label: string; kind: BallKind }[] {
  const timeline = innings?.oversTimeline ?? [];
  if (timeline.length === 0) return [];
  return timeline
    .slice(-overCount)
    .flatMap((o) => o.balls)
    .map((b) => ({ label: b.label, kind: ballChipKind(b) }));
}

export function tallyKey(live: Partial<LiveState> | null): string {
  return `${live?.runs ?? 0}|${live?.wickets ?? 0}|${live?.completedOvers ?? 0}|${live?.ballsInCurrentOver ?? 0}|${live?.matchStatus ?? ''}`;
}
