import type { CricketMatch, InningsScorecard, LiveState, Scorecard, TeamBrand } from '@/api/cricketMatch';
import type { QuickMatch } from '@/api/quickMatch';
import {
  ballChipKind,
  ballsRemaining,
  currentRunRate,
  dismissalLine,
  manhattanBars,
  requiredRunRate,
  strikeRate,
} from '@/lib/cricketView';
import { cricketOutcomeLabel } from '@/lib/quickCricketView';

export interface BoardSide { id: string; name: string; crest?: string }
export interface BoardInput {
  sides: [BoardSide, BoardSide];
  live: LiveState | null;
  scorecard: Scorecard | null;
  maxOvers: number;
  completed: boolean;
  result: string | null;
  toss: { winnerId?: string; decision?: 'bat' | 'bowl' } | null;
  squads: [string[], string[]];
}

export type ChipKind = 'wicket' | 'boundary' | 'extra' | 'run';
export interface Chip { label: string; kind: ChipKind }

export interface CricketBoardView {
  pill: string;
  pillLive: boolean;
  hero: {
    rows: { side: BoardSide; score: string | null; big: boolean }[];
    overs: (string | null)[];
    line:
      | { kind: 'chase'; need: number; balls: number; req: string; cur: string }
      | { kind: 'text'; text: string }
      | null;
  };
  defaultTab: 'live' | 'card' | 'overs';
  live: {
    batters: { name: string; striker: boolean; r: number; b: number; f: number; s: number; sr: string }[];
    partnership: string | null;
    bowler: { name: string; o: string; m: number; r: number; w: number; e: string } | null;
    thisOver: { chips: Chip[]; empty: number; runs: number } | null;
    lastOver: string | null;
    toss: string | null;
  } | null;
  innings: {
    key: 1 | 2;
    label: string;
    batting: { name: string; how: string; notOut: boolean; r: number; b: number; sr: string }[];
    extras: string;
    total: string;
    bowling: { name: string; o: string; r: number; w: number; e: string }[];
    fow: string;
  }[];
  overs: {
    bars: { n: number; a: number; b: number | null; wicketB: boolean; current: boolean }[];
    max: number;
    list: { innings: 1 | 2; n: number; chips: Chip[]; runs: number }[];
  };
  waiting: { line: string; toss: string | null; squads: [string[], string[]] } | null;
}

// ─── Adapters ─────────────────────────────────────────────────────────────

export function fromTournament(
  m: CricketMatch,
  live: LiveState | null,
  scorecard: Scorecard | null,
  brands: Record<string, TeamBrand>,
  fallbackOvers?: number
): BoardInput {
  const { team1Id, team2Id, team1Name, team2Name } = m.teams;
  const side = (id: string, name: string): BoardSide => {
    const crest = brands[id]?.logo;
    return crest ? { id, name, crest } : { id, name };
  };
  const sides: [BoardSide, BoardSide] = [side(team1Id, team1Name), side(team2Id, team2Name)];
  const completed = m.status === 'completed';
  const margin = m.result?.marginOfVictory;
  const winner = sides.find((s) => m.winnerId != null && s.id === String(m.winnerId));
  const result = !completed ? null : winner ? `${winner.name} won${margin ? ` ${margin}` : ''}` : margin ? 'Match tied' : null;
  const toss = m.cricketSetup?.toss;
  const names = (xi?: { name?: string }[]) => (xi ?? []).map((p) => p.name || 'Unnamed');
  return {
    sides,
    live,
    scorecard,
    maxOvers: m.matchConfig?.maxOvers ?? fallbackOvers ?? 20,
    completed,
    result,
    toss: toss?.recorded ? { winnerId: toss.winnerTeamId, decision: toss.decision } : null,
    squads: [names(m.cricketSetup?.team1Lineup?.startingXI), names(m.cricketSetup?.team2Lineup?.startingXI)],
  };
}

export function fromQuick(m: QuickMatch, scorecard: Scorecard | null): BoardInput {
  const [s1, s2] = m.sides;
  const toss = m.cricketSetup?.toss;
  const completed = m.status === 'completed';
  return {
    sides: [{ id: s1.sideId, name: s1.name }, { id: s2.sideId, name: s2.name }],
    live: m.liveState ?? null,
    scorecard,
    maxOvers: m.matchConfig?.maxOvers ?? 20,
    completed,
    result: completed ? cricketOutcomeLabel(m)?.replace(/^Tied/, 'Match tied') ?? null : null,
    toss: toss?.recorded ? { winnerId: toss.winnerTeamId, decision: toss.decision } : null,
    squads: [s1.slots.map((s) => s.displayName), s2.slots.map((s) => s.displayName)],
  };
}

// ─── View model ───────────────────────────────────────────────────────────

const chipOf = (b: { label: string; isWicket: boolean }): Chip => {
  if (b.label === 'W') return { label: b.label, kind: 'wicket' };
  const k = ballChipKind(b as Parameters<typeof ballChipKind>[0]);
  return { label: b.label, kind: k === 'six' || k === 'four' ? 'boundary' : k === 'dot' ? 'run' : k };
};

const fmtScore = (s: { runs: number; wickets: number }) => `${s.runs}/${s.wickets}`;
const fmtOvers = (s: { completedOvers: number; ballsInCurrentOver: number }) => `${s.completedOvers}.${s.ballsInCurrentOver}`;

const extrasLine = (e: InningsScorecard['totals']['extras']) => {
  const parts = [['wd', e.wides], ['nb', e.noBalls], ['lb', e.legByes], ['b', e.byes]]
    .filter(([, n]) => (n as number) > 0)
    .map(([k, n]) => `${k} ${n}`);
  return `Extras ${e.total}${parts.length ? ` (${parts.join(', ')})` : ''}`;
};

function inningsView(inn: InningsScorecard, i: BoardInput): CricketBoardView['innings'][number] {
  const name = i.sides.find((s) => s.id === inn.battingTeamId)?.name ?? inn.battingTeamName;
  const line = new Map(inn.fallOfWickets.map((f) => [f.batterId, f.dismissalLine]));
  return {
    key: inn.inningsNumber,
    label: `${name} ${fmtScore(inn.totals)}`,
    batting: inn.battingCard.map((b) => {
      const how = !b.dismissal
        ? 'not out'
        : b.dismissal.type === 'retired_hurt'
          ? 'retired hurt'
          : line.get(b.registrationId) ?? dismissalLine(b.dismissal);
      return { name: b.name, how, notOut: !b.dismissal, r: b.runs, b: b.ballsFaced, sr: strikeRate(b.runs, b.ballsFaced).toFixed(1) };
    }),
    extras: extrasLine(inn.totals.extras),
    total: `${fmtScore(inn.totals)} (${inn.totals.overs})`,
    bowling: inn.bowlingCard.map((b) => ({ name: b.name, o: b.overs, r: b.runs, w: b.wickets, e: b.economy.toFixed(2) })),
    fow: inn.fallOfWickets.map((f) => `${f.wicketNumber}-${f.score} ${f.batterName} (${f.overs})`).join(' · '),
  };
}

export function cricketBoard(i: BoardInput): CricketBoardView {
  const { live, scorecard, sides } = i;
  const status = live?.matchStatus;
  const completed = i.completed || status === 'completed';
  const waiting = !completed && (!live || status === 'awaiting_start');
  const brk = !completed && status === 'innings_break';
  const second = live ? live.currentInnings === 2 : !!scorecard?.innings2;
  const tossSide = sides.find((s) => s.id === i.toss?.winnerId);
  const tossText = tossSide && i.toss?.decision ? `${tossSide.name} won the toss and chose to ${i.toss.decision}` : null;

  // Hero
  const found = sides.findIndex((s) => s.id === live?.battingTeamId);
  const bi = found < 0 ? 0 : found;
  const oi = 1 - bi;
  const scores: ({ s: string; o: string } | null)[] = [null, null];
  let big = -1;
  if (!live && !waiting) {
    // No live state (a finished match opened later): read each innings from the scorecard.
    [scorecard?.innings1, scorecard?.innings2].forEach((inn, k) => {
      const idx = inn ? sides.findIndex((s) => s.id === inn.battingTeamId) : -1;
      if (!inn || idx < 0) return;
      scores[idx] = { s: fmtScore(inn.totals), o: `(${inn.totals.overs})` };
      if (k === 1 || big < 0) big = idx;
    });
  } else if (live && !waiting) {
    const first = live.innings1Summary;
    if (brk) {
      if (first) scores[oi] = { s: fmtScore(first), o: `(${fmtOvers(first)})` };
      big = oi;
    } else {
      scores[bi] = { s: fmtScore(live), o: `(${fmtOvers(live)})` };
      if (second && first) scores[oi] = { s: fmtScore(first), o: `(${fmtOvers(first)})` };
      big = bi;
    }
  }

  let line: CricketBoardView['hero']['line'] = null;
  if (completed) line = i.result ? { kind: 'text', text: i.result } : null;
  else if (waiting) line = null;
  else if (brk) line = { kind: 'text', text: `Innings break · Target ${live!.target ?? (live!.innings1Summary?.runs ?? 0) + 1}` };
  else if (!second) line = { kind: 'text', text: `${sides[oi].name} yet to bat` };
  else if (live!.target != null) {
    const need = Math.max(0, live!.target - live!.runs);
    const balls = ballsRemaining(live, i.maxOvers) ?? 0;
    if (need > 0 && balls > 0) {
      line = {
        kind: 'chase',
        need,
        balls,
        req: (requiredRunRate(live, i.maxOvers) ?? 0).toFixed(2),
        cur: currentRunRate(live).toFixed(2),
      };
    }
  }

  const pill = completed ? 'Completed' : waiting ? 'Not started' : brk ? 'Innings break' : second ? '2nd innings' : '1st innings';

  // Live tab
  const cur = waiting ? null : second ? scorecard?.innings2 ?? null : scorecard?.innings1 ?? null;
  const timeline = cur?.oversTimeline ?? [];
  const lastEntry = timeline[timeline.length - 1];
  const prev = timeline[timeline.length - 2];
  const card = cur?.battingCard ?? [];
  const batters = [live?.strikerId, live?.nonStrikerId]
    .map((id, k) => ({ b: card.find((c) => c.registrationId === id), striker: k === 0 }))
    .flatMap(({ b, striker }) =>
      b
        ? [{ name: b.name, striker, r: b.runs, b: b.ballsFaced, f: b.fours, s: b.sixes, sr: strikeRate(b.runs, b.ballsFaced).toFixed(1) }]
        : []
    );
  const bw = cur?.bowlingCard.find((b) => b.registrationId === live?.currentBowlerId);
  const cp = cur?.currentPartnership;

  const liveView: CricketBoardView['live'] = waiting
    ? null
    : {
        batters,
        partnership: cp ? `Partnership ${cp.runs} (${cp.balls})` : null,
        bowler: bw ? { name: bw.name, o: bw.overs, m: bw.maidens, r: bw.runs, w: bw.wickets, e: bw.economy.toFixed(2) } : null,
        thisOver: lastEntry
          ? { chips: lastEntry.balls.map(chipOf), empty: Math.max(0, 6 - lastEntry.balls.length), runs: lastEntry.runs }
          : null,
        lastOver: prev ? `${prev.balls.map((b) => b.label).join(' ')} · ${prev.runs} runs` : null,
        toss: tossText,
      };

  // Overs tab
  const m1 = manhattanBars(scorecard?.innings1 ?? null, i.maxOvers);
  const m2 = manhattanBars(scorecard?.innings2 ?? null, i.maxOvers);
  const bars1 = m1.bars;
  const bars2 = m2.bars;
  const inProgress = !completed && (live?.ballsInCurrentOver ?? 0) > 0 ? lastEntry?.overNumber : undefined;
  const bars = Array.from({ length: i.maxOvers }, (_, k) => {
    const a = bars1[k];
    const b = bars2[k];
    return {
      n: k + 1,
      a: a && !a.empty ? a.runs : 0,
      b: b && !b.empty ? b.runs : null,
      wicketB: !!b && !b.empty && b.wickets > 0,
      current: inProgress === k + 1,
    };
  });
  const listOf = (n: 1 | 2) =>
    [...((n === 1 ? scorecard?.innings1 : scorecard?.innings2)?.oversTimeline ?? [])]
      .reverse()
      .map((o) => ({ innings: n, n: o.overNumber, chips: o.balls.map(chipOf), runs: o.runs }));
  const overList = second ? [...listOf(2), ...listOf(1)] : [...listOf(1), ...listOf(2)];

  return {
    pill,
    pillLive: !completed && !waiting,
    hero: {
      rows: sides.map((side, k) => ({ side, score: scores[k]?.s ?? null, big: big === k })),
      overs: scores.map((s) => s?.o ?? null),
      line,
    },
    defaultTab: completed ? 'card' : 'live',
    live: liveView,
    innings: [scorecard?.innings1, scorecard?.innings2].flatMap((inn) => (inn ? [inningsView(inn, i)] : [])),
    overs: {
      bars,
      max: Math.max(1, m1.peak, m2.peak),
      list: overList,
    },
    waiting: waiting
      ? { line: tossText ? 'Waiting for the first ball' : 'Waiting for the toss', toss: tossText, squads: i.squads }
      : null,
  };
}
