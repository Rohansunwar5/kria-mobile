import {
  LiveState,
  BallSummary,
  InningsScorecard,
  Dismissal,
  CricketMatch,
  BatterEntry,
  BowlerEntry,
  PartnershipRecord,
  Scorecard,
} from '@/api/cricketMatch';

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

// ─── Derived figures the web client shows and mobile did not ──────────────

export function ballsRemaining(live: Partial<LiveState> | null, maxOvers?: number): number | null {
  if (!maxOvers) return null;
  return Math.max(0, maxOvers * 6 - ballsBowled(live));
}

/** Where this innings lands if the current rate holds. Null once the overs
 *  are gone, or before a ball is bowled. */
export function projectedScore(live: Partial<LiveState> | null, maxOvers?: number): number | null {
  const remaining = ballsRemaining(live, maxOvers);
  if (remaining == null || remaining === 0) return null;
  const crr = currentRunRate(live);
  if (crr <= 0) return null;
  return Math.round((live?.runs ?? 0) + (crr * remaining) / 6);
}

export function strikeRate(runs: number, balls: number): number {
  if (balls <= 0) return 0;
  return Math.round((runs / balls) * 1000) / 10;
}

/** "Titans chose to bat first". Null until the toss is recorded. */
export function tossLine(match: Pick<CricketMatch, 'cricketSetup' | 'teams'> | null): string | null {
  const toss = match?.cricketSetup?.toss;
  if (!toss?.recorded || !toss.decision) return null;
  const winner =
    String(toss.winnerTeamId) === String(match?.teams?.team1Id)
      ? match?.teams?.team1Name
      : String(toss.winnerTeamId) === String(match?.teams?.team2Id)
        ? match?.teams?.team2Name
        : null;
  return `${winner || 'Toss winner'} chose to ${toss.decision} first`;
}

/** What the scoreboard is waiting for. Rendered instead of a score that has
 *  silently stopped moving. */
export function matchStateNote(live: Partial<LiveState> | null): { title: string; message: string } | null {
  if (!live) return null;
  if (live.matchStatus === 'innings_break') {
    return {
      title: 'Innings break',
      message: 'First innings is done. The chase starts when the umpire restarts scoring.',
    };
  }
  if (live.matchStatus === 'awaiting_start') {
    return { title: 'Not started', message: 'The scoreboard goes live once the first ball is bowled.' };
  }
  if (live.nextBatsmanNeeded) {
    return { title: 'New batter coming in', message: 'Scoring resumes once the next batter is at the crease.' };
  }
  if (live.nextBowlerNeeded) {
    return { title: 'End of over', message: 'Scoring resumes once the next bowler is named.' };
  }
  return null;
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

export interface WormSeries {
  label: string;
  teamName: string;
  color: string;
  /** `{ x: over, y: cumulative runs }`, starting at 0/0. */
  points: { x: number; y: number }[];
  finalRuns: number;
}

/** Cumulative runs by over end, one series per innings. */
export function wormSeries(
  innings1: InningsScorecard | null,
  innings2: InningsScorecard | null,
  maxOvers?: number
): { series: WormSeries[]; maxX: number; maxY: number } {
  const raw: { inn: InningsScorecard; color: string; label: string }[] = [];
  if (innings1) raw.push({ inn: innings1, color: '#F97316', label: 'Innings 1' });
  if (innings2) raw.push({ inn: innings2, color: '#FA4C93', label: 'Innings 2' });
  if (raw.length === 0) return { series: [], maxX: 0, maxY: 0 };

  const series = raw.map((s) => {
    let cum = 0;
    const points = [{ x: 0, y: 0 }];
    s.inn.oversTimeline.forEach((o) => {
      cum += o.runs;
      points.push({ x: o.overNumber, y: cum });
    });
    return { label: s.label, color: s.color, teamName: s.inn.battingTeamName, points, finalRuns: cum };
  });

  const lastOver = Math.max(0, ...raw.flatMap((s) => s.inn.oversTimeline.map((o) => o.overNumber)));
  return {
    series,
    maxX: Math.max(1, maxOvers ?? lastOver),
    maxY: Math.max(1, ...series.map((s) => s.finalRuns)),
  };
}

export interface DistributionRow { label: string; count: number; share: number; tone: string }

/** Ball-outcome mix for an innings, ordered dots to extras. */
export function runDistribution(innings: InningsScorecard | null): { rows: DistributionRow[]; totalBalls: number } {
  const c = { dots: 0, ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0, wickets: 0, extras: 0 };
  let totalBalls = 0;
  (innings?.oversTimeline ?? []).forEach((over) =>
    over.balls.forEach((b) => {
      totalBalls++;
      if (b.isWicket) c.wickets++;
      else if (b.label === '0') c.dots++;
      else if (b.label === '1') c.ones++;
      else if (b.label === '2') c.twos++;
      else if (b.label === '3') c.threes++;
      else if (b.label === '4') c.fours++;
      else if (b.label === '6') c.sixes++;
      else c.extras++;
    })
  );
  if (totalBalls === 0) return { rows: [], totalBalls: 0 };

  const defs: [string, number, string][] = [
    ['Dots', c.dots, '#7d7d7d'],
    ['Singles', c.ones, '#a3a3a3'],
    ['Twos', c.twos, '#d4d4d4'],
    ['Threes', c.threes, '#d4d4d4'],
    ['Fours', c.fours, '#16C46A'],
    ['Sixes', c.sixes, '#FA4C93'],
    ['Wickets', c.wickets, '#FF4438'],
    ['Extras', c.extras, '#F97316'],
  ];
  return {
    totalBalls,
    rows: defs.map(([label, count, tone]) => ({ label, count, tone, share: count / totalBalls })),
  };
}

export interface MatchSummary {
  innings: InningsScorecard[];
  topBat: (BatterEntry & { teamName: string }) | null;
  topBowl: (BowlerEntry & { teamName: string }) | null;
  bestPartnership: (PartnershipRecord & { teamName: string }) | null;
}

/** Standout figures across both innings. Ties break on fewer balls faced
 *  (batting) and fewer runs conceded (bowling). */
export function matchSummary(scorecard: Scorecard | null): MatchSummary | null {
  const innings = [scorecard?.innings1, scorecard?.innings2].filter(Boolean) as InningsScorecard[];
  if (innings.length === 0) return null;

  let topBat: MatchSummary['topBat'] = null;
  let topBowl: MatchSummary['topBowl'] = null;
  let bestPartnership: MatchSummary['bestPartnership'] = null;

  innings.forEach((inn) => {
    inn.battingCard.forEach((b) => {
      if (!topBat || b.runs > topBat.runs || (b.runs === topBat.runs && b.ballsFaced < topBat.ballsFaced)) {
        topBat = { ...b, teamName: inn.battingTeamName };
      }
    });
    inn.bowlingCard.forEach((bw) => {
      if (!topBowl || bw.wickets > topBowl.wickets || (bw.wickets === topBowl.wickets && bw.runs < topBowl.runs)) {
        topBowl = { ...bw, teamName: inn.bowlingTeamName };
      }
    });
    (inn.partnerships ?? []).forEach((p) => {
      if (!bestPartnership || p.runs > bestPartnership.runs) {
        bestPartnership = { ...p, teamName: inn.battingTeamName };
      }
    });
  });

  return { innings, topBat, topBowl, bestPartnership };
}

/** Batters in the XI who have not come in yet. `startingXI` is only set once
 *  the organizer records a lineup, so this is empty until then. */
export function yetToBat(
  lineup: { startingXI?: { registrationId: string; name?: string }[]; lineupSet?: boolean } | undefined,
  innings: InningsScorecard | null
): string[] {
  if (!lineup?.lineupSet || !innings) return [];
  const seen = new Set(innings.battingCard.map((b) => b.registrationId));
  return (lineup.startingXI ?? [])
    .filter((p) => !seen.has(p.registrationId))
    .map((p) => p.name || 'Unnamed');
}
