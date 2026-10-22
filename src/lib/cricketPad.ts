import type { Scorecard } from '@/api/cricketMatch';
import type { BallEntry, QuickMatch, QuickMatchSlot, WicketType } from '@/api/quickMatch';
import { battingSideId, bowlingSideId, isFirstBallOfInnings, whoIsNeeded } from '@/lib/quickCricketView';

/**
 * The quick-cricket host pad's logic, moved out of `CricketScorePanel` so it
 * is tested without rendering. `recordBall` needs striker, non-striker and
 * bowler ids on every delivery: mid-innings they come from `liveState`, but on
 * the first ball of an innings and whenever the engine asks for a new batter or
 * bowler there is no id to read yet, so the pad collects them before any run
 * key is reachable.
 */

export type ExtrasType = 'wide' | 'no_ball' | 'bye' | 'leg_bye';
export type PadStep = 'keys' | 'extras' | 'wicket' | 'who' | 'fielder' | 'pick';
export type PickRole = 'striker' | 'nonStriker' | 'bowler' | 'batter' | 'fielder';
export interface PadState {
  step: PadStep;
  picks: { striker?: string; nonStriker?: string; bowler?: string; batter?: string };
  /** An extra armed with "wicket too", waiting to ride on the wicket entry. */
  extras?: { type: ExtrasType; runs: number };
  alsoWicket: boolean;
  wicketType?: WicketType;
  /** The batter chosen on the "who" step (run out, retired hurt). */
  dismissed?: string;
}

export const initialPad: PadState = { step: 'keys', picks: {}, alsoWicket: false };

export const EXTRAS: { type: ExtrasType; label: string }[] = [
  { type: 'wide', label: 'Wide' },
  { type: 'no_ball', label: 'No ball' },
  { type: 'bye', label: 'Bye' },
  { type: 'leg_bye', label: 'Leg bye' },
];

// No zero. For a wide or no-ball this is the TOTAL extra including the
// penalty run, so it is at least 1; for a bye or leg-bye it is the runs run,
// and a bye of nothing is not a bye.
export const EXTRAS_RUNS = [1, 2, 3, 4, 5, 6];

export const WICKETS: { type: WicketType; label: string; hint: string }[] = [
  { type: 'bowled', label: 'Bowled', hint: '' },
  { type: 'caught', label: 'Caught', hint: 'then fielder' },
  { type: 'lbw', label: 'LBW', hint: '' },
  { type: 'run_out', label: 'Run out', hint: 'then batter' },
  { type: 'stumped', label: 'Stumped', hint: 'then keeper' },
  { type: 'hit_wicket', label: 'Hit wicket', hint: '' },
  { type: 'retired_hurt', label: 'Retired hurt', hint: 'then batter' },
];

export const FIELDER_TYPES: WicketType[] = ['caught', 'run_out', 'stumped'];

// Only these two can dismiss EITHER batter: a run out or a retired-hurt
// walk-off can happen at either end. The other five always dismiss the
// striker, so they skip the "who" step.
export const EITHER_END_TYPES: WicketType[] = ['run_out', 'retired_hurt'];

const slotsOf = (m: QuickMatch, sideId: string | null): QuickMatchSlot[] =>
  m.sides.find((side) => side.sideId === sideId)?.slots ?? [];

/**
 * The end a new batter fills. The engine empties the end the last wicket
 * vacated, so the empty end IS the answer. It differs from where the dismissed
 * batter started whenever runs were completed before a run out, or the wicket
 * fell on the last ball of an over; only the server sees that rotation.
 * Neither end empty is a wicket recorded before the engine cleared ends: the
 * striker, as the pad always did.
 */
function batterEnd(m: QuickMatch): 'striker' | 'nonStriker' {
  return m.liveState?.strikerId && !m.liveState.nonStrikerId ? 'nonStriker' : 'striker';
}

/**
 * The ids the next ball goes out with: a pick wins over `liveState`. The first
 * ball of an innings reads picks only, since it seeds the innings state.
 */
export function crease(m: QuickMatch, s: PadState): { striker?: string; nonStriker?: string; bowler?: string } {
  const ls = isFirstBallOfInnings(m) ? undefined : m.liveState;
  const { striker, nonStriker, bowler, batter } = s.picks;
  const end = batterEnd(m);
  return {
    striker: striker ?? (end === 'striker' ? batter : undefined) ?? ls?.strikerId,
    nonStriker: nonStriker ?? (end === 'nonStriker' ? batter : undefined) ?? ls?.nonStrikerId,
    bowler: bowler ?? ls?.currentBowlerId,
  };
}

/** Which player the engine still needs before a ball, or null when the run keys can show. */
export function nextPick(m: QuickMatch, s: PadState): PickRole | null {
  const need = isFirstBallOfInnings(m) ? null : whoIsNeeded(m);
  // Batter before bowler: both at once is an over that ended on a wicket.
  if ((need === 'batsman' || need === 'both') && !s.picks.batter) return 'batter';
  if ((need === 'bowler' || need === 'both') && !s.picks.bowler) return 'bowler';
  // The first ball (striker, non-striker, bowler in that order), and any end
  // still empty: both ends after one wicket is not a state the engine makes,
  // but the old pad asked for both rather than post a blank id.
  const c = crease(m, s);
  if (!c.striker) return 'striker';
  if (!c.nonStriker) return 'nonStriker';
  return c.bowler ? null : 'bowler';
}

export function pickOptions(
  m: QuickMatch, s: PadState, role: PickRole, scorecard?: Scorecard | null,
): { id: string; name: string; figures?: string }[] {
  if (role === 'bowler' || role === 'fielder') {
    const innings = m.liveState?.currentInnings === 2 ? scorecard?.innings2 : scorecard?.innings1;
    const card = role === 'bowler' && scorecard ? innings?.bowlingCard ?? [] : null;
    return slotsOf(m, bowlingSideId(m)).map(({ slotId: id, displayName: name }) => {
      if (!card) return { id, name };
      const b = card.find((entry) => entry.registrationId === id);
      return { id, name, figures: b ? `${b.overs}-${b.maidens}-${b.runs}-${b.wickets}` : 'yet to bowl' };
    });
  }
  // Not the batter already at the other end, and not one already out: the
  // server refuses a ball that sends one back in. A match that predates
  // `dismissedIds` filters nobody, the safe direction.
  const c = crease(m, s);
  const strikerEnd = role === 'striker' || (role === 'batter' && batterEnd(m) === 'striker');
  const otherEnd = strikerEnd ? c.nonStriker : c.striker;
  const out = m.liveState?.dismissedIds ?? [];
  return slotsOf(m, battingSideId(m))
    .filter((slot) => slot.slotId !== otherEnd && !out.includes(slot.slotId))
    .map((slot) => ({ id: slot.slotId, name: slot.displayName }));
}

export function pickTitle(m: QuickMatch, role: PickRole, wicket?: WicketType): string {
  if (role === 'striker' || role === 'nonStriker') return 'Opening batters';
  if (role === 'batter') return 'Next batter';
  // The engine zeroes completedOvers at the innings break, so this is 1 there too.
  if (role === 'bowler') return `Over ${(m.liveState?.completedOvers ?? 0) + 1} · who's bowling?`;
  return wicket === 'run_out' ? 'Run out by' : wicket === 'stumped' ? 'Stumped by' : 'Caught by';
}

/** The two batters at the crease, striker first, for the "who" step. */
export function whoOptions(m: QuickMatch, s: PadState): { id: string; name: string }[] {
  const c = crease(m, s);
  const batting = slotsOf(m, battingSideId(m));
  return [c.striker, c.nonStriker].flatMap((id) => {
    const slot = batting.find((x) => x.slotId === id);
    return slot ? [{ id: slot.slotId, name: slot.displayName }] : [];
  });
}

/** Only call once `nextPick` is null: that is what guarantees all three ids. */
export function ballFor(m: QuickMatch, s: PadState, extra: Partial<BallEntry>): BallEntry {
  const c = crease(m, s);
  return {
    batsmanOnStrikeId: c.striker!,
    nonStrikerId: c.nonStriker!,
    bowlerId: c.bowler!,
    runs: 0,
    // The armed extra first, so an explicit value in `extra` still wins.
    ...(s.extras ? { extrasType: s.extras.type, extrasRuns: s.extras.runs } : {}),
    ...extra,
  };
}

export type PadAction =
  | { type: 'open'; step: 'extras' | 'wicket' | 'pick' }
  | { type: 'close' }
  | { type: 'back' }
  | { type: 'alsoWicket' }
  | { type: 'runs'; runs: number }
  | { type: 'extras'; extras: ExtrasType; runs: number }
  | { type: 'wicket'; wicket: WicketType }
  | { type: 'who'; id: string }
  | { type: 'pick'; role: PickRole; id: string };

/** One tap on the pad: the next pad state, and the ball to post if the tap recorded one. */
export function advance(m: QuickMatch, s: PadState, a: PadAction): { pad: PadState; ball?: BallEntry } {
  // A recorded ball starts the next one afresh: picks too, since liveState
  // carries the ids from here, and an armed extra must not ride on the next wicket.
  // Never a ball with a missing id (the old pad refused to post one): ask for the
  // player, dropping the half-built entry so no stale extra or dismissal rides on a later ball.
  const record = (extra: Partial<BallEntry>): { pad: PadState; ball?: BallEntry } =>
    nextPick(m, s) ? { pad: { ...initialPad, picks: s.picks, step: 'pick' } } : { pad: initialPad, ball: ballFor(m, s, extra) };
  const to = (patch: Partial<PadState>) => ({ pad: { ...s, ...patch } });
  const close = { pad: { ...initialPad, picks: s.picks } };
  const striker = crease(m, s).striker;

  switch (a.type) {
    case 'open': return to({ step: a.step });
    case 'close': return close;
    case 'alsoWicket': return to({ alsoWicket: !s.alsoWicket });
    case 'runs': return record({ runs: a.runs });
    case 'extras':
      return s.alsoWicket
        ? to({ step: 'wicket', extras: { type: a.extras, runs: a.runs } })
        : record({ extrasType: a.extras, extrasRuns: a.runs });
    case 'wicket':
      if (EITHER_END_TYPES.includes(a.wicket)) return to({ step: 'who', wicketType: a.wicket });
      if (FIELDER_TYPES.includes(a.wicket)) return to({ step: 'fielder', wicketType: a.wicket });
      return record({ wicketType: a.wicket, dismissedPlayerId: striker });
    case 'who':
      // run_out is also a fielding action; retired_hurt is not.
      return s.wicketType === 'run_out'
        ? to({ step: 'fielder', dismissed: a.id })
        : record({ wicketType: s.wicketType, dismissedPlayerId: a.id });
    case 'pick': {
      if (a.role === 'fielder') {
        return record({ wicketType: s.wicketType, dismissedPlayerId: s.dismissed ?? striker, fielderId: a.id });
      }
      const next = { ...s, picks: { ...s.picks, [a.role]: a.id } };
      return { pad: { ...next, step: nextPick(m, next) ? 'pick' : 'keys' } };
    }
    case 'back':
      // Reached from the extras flow, the wicket sheet goes back to extras with
      // the extra still chosen; the fielder goes back to "who" when it came from there.
      if (s.step === 'wicket' && s.extras) return to({ step: 'extras' });
      if (s.step === 'who') return to({ step: 'wicket', wicketType: undefined });
      if (s.step === 'fielder') {
        return s.dismissed ? to({ step: 'who', dismissed: undefined }) : to({ step: 'wicket', wicketType: undefined });
      }
      return close;
  }
}
