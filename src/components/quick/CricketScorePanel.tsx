import { useState, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BallEntry, QuickMatch, QuickMatchSlot, WicketType } from '@/api/quickMatch';
import { freeSlots } from '@/lib/quickMatchView';
import { battingSideId, bowlingSideId, canUndoBall, isFirstBallOfInnings, whoIsNeeded } from '@/lib/quickCricketView';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';

const label = (t: Palette) => ({ fontFamily: 'SpaceMono_700Bold' as const, fontSize: 9, letterSpacing: 0.18 * 9, textTransform: 'uppercase' as const, color: t.textFaint });
const button = { fontFamily: 'SpaceMono_700Bold' as const, fontSize: 12, letterSpacing: 0.14 * 12, textTransform: 'uppercase' as const };

// Key faces, as literal objects so the font-leading fence can read them.
const RUN_FACE = { fontFamily: 'Anton_400Regular' as const, fontSize: 24, lineHeight: 29, textTransform: 'uppercase' as const };
const WORD_FACE = { fontFamily: 'Anton_400Regular' as const, fontSize: 16, lineHeight: 20, textTransform: 'uppercase' as const };
const NAME_FACE = { fontFamily: 'SpaceGrotesk_700Bold' as const, fontSize: 14 };
const FACES = { run: RUN_FACE, word: WORD_FACE, name: NAME_FACE };

/** One key on the pad. `onPress` is undefined while busy, as every control here has always been. */
function Key({ text, face = 'word', height = 48, brand, onPress }: {
  text: string; face?: keyof typeof FACES; height?: number; brand?: boolean; onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, minHeight: height, paddingHorizontal: 6, borderRadius: 5, borderWidth: 1.5, borderColor: brand ? t.brand : t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ ...FACES[face], color: brand ? t.brandInk : t.text }}>{text}</Text>
    </Pressable>
  );
}

/** Keys in rows of `cols`; a short last row keeps the same key width. */
function Grid({ cols, keys }: { cols: number; keys: ReactNode[] }) {
  const rows: ReactNode[][] = [];
  keys.forEach((key, i) => {
    if (i % cols === 0) rows.push([]);
    rows[rows.length - 1].push(key);
  });
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
          {row}
          {Array.from({ length: cols - row.length }, (_, i) => <View key={`gap-${i}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}

/**
 * The host's match-level controls, in the screen's scroll rather than the pad:
 * the join code while a slot is open, and Cancel. A knockout match has
 * neither — the knockout manages it, as badminton's MatchPanel rules.
 */
export function CricketHostTools({ match, playerId, busy, onCancel }: {
  match: QuickMatch; playerId?: string; busy: boolean; onCancel: () => void;
}) {
  const t = useTheme();
  const isHost = Boolean(playerId) && playerId === match.hostId;
  if (!isHost || match.knockoutId || match.status !== 'live') return null;
  const code = freeSlots(match).length > 0 ? match.joinCode : undefined;
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 14 }}>
      {code ? (
        <View>
          <Text style={label(t)}>Share this code to fill the open slots</Text>
          <Text testID="join-code" selectable style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 24, letterSpacing: 0.2 * 24, color: t.brandInk, marginTop: 4 }}>{code}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={busy ? undefined : onCancel}
        style={{ minHeight: 48, borderRadius: 5, borderWidth: 1.5, borderColor: t.fail, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
      >
        <Text style={{ ...button, color: t.failInk }}>Cancel match</Text>
      </Pressable>
    </View>
  );
}

const EXTRAS: { type: 'wide' | 'no_ball' | 'bye' | 'leg_bye'; label: string }[] = [
  { type: 'wide', label: 'Wide' },
  { type: 'no_ball', label: 'No ball' },
  { type: 'bye', label: 'Bye' },
  { type: 'leg_bye', label: 'Leg bye' },
];

const WICKETS: { type: WicketType; label: string }[] = [
  { type: 'bowled', label: 'Bowled' },
  { type: 'caught', label: 'Caught' },
  { type: 'lbw', label: 'LBW' },
  { type: 'run_out', label: 'Run out' },
  { type: 'stumped', label: 'Stumped' },
  { type: 'hit_wicket', label: 'Hit wicket' },
  { type: 'retired_hurt', label: 'Retired hurt' },
];

const FIELDER_TYPES: WicketType[] = ['caught', 'run_out', 'stumped'];

// Only these two can dismiss EITHER batsman — a run-out or a retired-hurt
// walk-off can happen at either end. The other five always dismiss the
// striker, so they skip this step and keep defaulting as before.
const EITHER_END_TYPES: WicketType[] = ['run_out', 'retired_hurt'];

// No zero. For a wide or no-ball this is the TOTAL extra including the
// penalty run, so it is at least 1; for a bye or leg-bye it is the runs run,
// and a bye of nothing is not a bye.
const EXTRAS_RUNS = [1, 2, 3, 4, 5, 6];

type ExtrasType = 'wide' | 'no_ball' | 'bye' | 'leg_bye';
type Pending = { strikerId?: string; nonStrikerId?: string; bowlerId?: string };
type EntryMode = 'closed' | 'extras' | 'extras-runs' | 'wicket' | 'wicket-who' | 'fielder';
type CreaseEnd = 'striker' | 'non-striker';

/**
 * The host's scoring pad, pinned under the screen's scroll: a name-picking
 * prompt (first ball of an innings, or whenever the engine asks for a new
 * batsman/bowler), the run keys, or one entry step at a time. `recordBall`
 * needs batsmanOnStrikeId/nonStrikerId/bowlerId on every delivery; mid-innings
 * they come from `liveState`, but on the first ball and whenever
 * `nextBatsmanNeeded` / `nextBowlerNeeded` fires there is no id to read yet,
 * so the pad collects them before any run key is reachable. The score itself
 * shows in QuickCricketLive; Cancel and the join code in CricketHostTools.
 */
export function CricketScorePanel({ match, playerId, busy, problem, onBall, onUndo }: {
  match: QuickMatch;
  playerId?: string;
  busy: boolean;
  /** A refused delivery's reason, shown where the host is looking. */
  problem?: string;
  onBall: (entry: BallEntry) => void;
  onUndo: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<Pending>({});
  const [mode, setMode] = useState<EntryMode>('closed');
  const [chosenWicketType, setChosenWicketType] = useState<WicketType | null>(null);
  const [chosenExtrasType, setChosenExtrasType] = useState<ExtrasType | null>(null);
  const [chosenDismissedId, setChosenDismissedId] = useState<string | null>(null);
  // Armed on the extras sheet before the type is picked, so the common
  // extra-only case gains no step. Once set, choosing the runs routes into the
  // wicket flow instead of posting, and `post` merges it into that delivery.
  const [alsoWicket, setAlsoWicket] = useState(false);
  const [pendingExtras, setPendingExtras] = useState<{ extrasType: ExtrasType; extrasRuns: number } | null>(null);

  const isHost = Boolean(playerId) && playerId === match.hostId;
  if (!isHost || match.status !== 'live') return null;

  // Dimmed while a delivery is in flight; every key's onPress is already
  // undefined then.
  const shell = (title: string | null, body: ReactNode, context?: string) => (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 + insets.bottom, gap: 10, borderTopWidth: 1.5, borderTopColor: t.lineSoft, backgroundColor: t.bg, opacity: busy ? 0.5 : 1 }}>
      {problem ? <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: t.failInk }}>{problem}</Text> : null}
      {context ? <Text numberOfLines={1} style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: t.textMeta }}>{context}</Text> : null}
      {title ? <Text style={label(t)}>{title}</Text> : null}
      {body}
    </View>
  );
  const nameKeys = (slots: QuickMatchSlot[], pick: (slotId: string) => void) => (
    <Grid cols={2} keys={slots.map((slot) => (
      <Key key={slot.slotId} text={slot.displayName} face="name" height={52} onPress={busy ? undefined : () => pick(slot.slotId)} />
    ))} />
  );

  const battingSide = battingSideId(match);
  const bowlingSide = bowlingSideId(match);
  const battingLineup = match.sides.find((s) => s.sideId === battingSide)?.slots ?? [];
  const bowlingLineup = match.sides.find((s) => s.sideId === bowlingSide)?.slots ?? [];
  const need = whoIsNeeded(match);
  const firstBall = isFirstBallOfInnings(match);
  const promptOutstanding = firstBall || need !== null;

  if (promptOutstanding) {
    // Mid-innings, a batsman replacement is needed at whichever end the last
    // wicket vacated. The engine now empties that end itself, so the empty slot
    // IS the answer — read it rather than guess.
    //
    // This used to track the end the dismissed batsman was standing at. That is
    // a different end whenever an odd number of runs was completed before a
    // run-out, or the wicket fell on the last ball of an over, because both
    // swap the batsmen after the dismissal. Only the server sees the state
    // after that rotation.
    //
    // Neither end empty means a wicket recorded before the engine cleared ends;
    // fall back to the striker, which is what the old code always did.
    const needsBatsmanReplacement = !firstBall && (need === 'batsman' || need === 'both');
    const strikerVacant = !match.liveState?.strikerId;
    const nonStrikerVacant = !match.liveState?.nonStrikerId;
    const needsStriker = firstBall || (needsBatsmanReplacement && (strikerVacant || !nonStrikerVacant));
    const needsNonStriker = firstBall || (needsBatsmanReplacement && nonStrikerVacant);
    const needsBowler = firstBall || need === 'bowler' || need === 'both';

    // A replacement must not be the player already standing at the other
    // end — that is not a real cricket state, and the server's shape check
    // would accept it without complaint.
    const excludedFromStriker = pending.nonStrikerId ?? match.liveState?.nonStrikerId;
    const excludedFromNonStriker = pending.strikerId ?? match.liveState?.strikerId;
    // Batsmen already out. The server refuses a ball that sends one back in, so
    // offering them here only earns the host a 400 after they have tapped.
    // Absent on a match that predates the field — then nobody is filtered, which
    // is the safe direction: a stale empty picker would be worse than the bug.
    const dismissed = match.liveState?.dismissedIds ?? [];
    const available = (slotId: string, excluded?: string) =>
      slotId !== excluded && !dismissed.includes(slotId);

    if (needsStriker && !pending.strikerId) {
      return shell('Who is on strike?', nameKeys(
        battingLineup.filter((slot) => available(slot.slotId, excludedFromStriker)),
        (slotId) => setPending((p) => ({ ...p, strikerId: slotId })),
      ));
    }

    if (needsNonStriker && !pending.nonStrikerId) {
      return shell('Who is at the non-striker\'s end?', nameKeys(
        battingLineup.filter((slot) => available(slot.slotId, excludedFromNonStriker)),
        (slotId) => setPending((p) => ({ ...p, nonStrikerId: slotId })),
      ));
    }

    if (needsBowler && !pending.bowlerId) {
      return shell('Who is bowling?', nameKeys(bowlingLineup, (slotId) => setPending((p) => ({ ...p, bowlerId: slotId }))));
    }
  }

  const strikerId = pending.strikerId ?? match.liveState?.strikerId;
  const nonStrikerId = pending.nonStrikerId ?? match.liveState?.nonStrikerId;
  const bowlerId = pending.bowlerId ?? match.liveState?.currentBowlerId;

  const closeEntryRows = () => {
    setMode('closed');
    setChosenWicketType(null);
    setChosenExtrasType(null);
    setChosenDismissedId(null);
    setAlsoWicket(false);
    setPendingExtras(null);
  };

  /**
   * One step back, not a full exit. Every entry sheet used to escape only via
   * "Cancel match", which ends the match — so a mis-tap on the extras type had
   * no undo short of abandoning the game.
   *
   * The wicket sheet has two predecessors: reached from the main controls it
   * goes back there, but reached from the extras flow it returns to the run
   * count, keeping the extra the host already chose.
   */
  const back = () => {
    if (mode === 'extras' || mode === 'wicket') {
      if (mode === 'wicket' && pendingExtras) {
        setPendingExtras(null);
        setMode('extras-runs');
        return;
      }
      closeEntryRows();
      return;
    }
    if (mode === 'extras-runs') {
      setChosenExtrasType(null);
      setMode('extras');
      return;
    }
    if (mode === 'wicket-who') {
      setChosenWicketType(null);
      setMode('wicket');
      return;
    }
    if (mode === 'fielder') {
      setMode(chosenWicketType && EITHER_END_TYPES.includes(chosenWicketType) ? 'wicket-who' : 'wicket');
      return;
    }
  };

  const backKey = <Key key="back" text="Back" onPress={busy ? undefined : back} />;

  const post = (extra: Partial<BallEntry>) => {
    if (!strikerId || !nonStrikerId || !bowlerId) return;
    onBall({
      batsmanOnStrikeId: strikerId,
      nonStrikerId,
      bowlerId,
      runs: 0,
      // The armed extra first, so an explicit value in `extra` still wins.
      ...(pendingExtras ?? {}),
      ...extra,
    });
    setPending({});
    closeEntryRows();
  };

  const strikerName = battingLineup.find((s) => s.slotId === strikerId)?.displayName;
  const nonStrikerName = battingLineup.find((s) => s.slotId === nonStrikerId)?.displayName;

  // The two candidates for "who was dismissed" — run_out/retired_hurt only.
  // Filtered so a missing name (should not happen once promptOutstanding has
  // resolved) never reaches a Btn without a label.
  const dismissedChoices: { id: string; label: string; end: CreaseEnd }[] = [
    strikerId && strikerName ? { id: strikerId, label: strikerName, end: 'striker' as const } : null,
    nonStrikerId && nonStrikerName ? { id: nonStrikerId, label: nonStrikerName, end: 'non-striker' as const } : null,
  ].filter((choice): choice is { id: string; label: string; end: CreaseEnd } => choice !== null);

  const bowlerName = bowlingLineup.find((s) => s.slotId === bowlerId)?.displayName;
  const context = [strikerName && `${strikerName} on strike`, bowlerName && `${bowlerName} bowling`].filter(Boolean).join(' · ');

  if (mode === 'extras') {
    return shell('Extra — which kind?', (
      <Grid cols={3} keys={[
        backKey,
        // A run-out off a wide or a bye is routine in casual play, and the
        // server has always accepted both fields on one ball. Armed here rather
        // than asked afterwards so the extra-only case takes the same taps.
        <Key key="also" text={alsoWicket ? '✓ Wicket too' : '+ Wicket too'} onPress={busy ? undefined : () => setAlsoWicket((on) => !on)} />,
        ...EXTRAS.map((e) => (
          <Key key={e.type} text={e.label} onPress={busy ? undefined : () => { setChosenExtrasType(e.type); setMode('extras-runs'); }} />
        )),
      ]} />
    ), context);
  }

  if (mode === 'extras-runs' && chosenExtrasType) {
    const kind = EXTRAS.find((e) => e.type === chosenExtrasType)?.label ?? 'Extra';
    return shell(`${kind} — how many runs?`, (
      <Grid cols={4} keys={[
        backKey,
        ...EXTRAS_RUNS.map((n) => (
          <Key key={n} text={String(n)} face="run" height={56} onPress={busy ? undefined : () => {
            if (!alsoWicket) {
              post({ extrasType: chosenExtrasType, extrasRuns: n });
              return;
            }
            setPendingExtras({ extrasType: chosenExtrasType, extrasRuns: n });
            setMode('wicket');
          }} />
        )),
      ]} />
    ), context);
  }

  if (mode === 'wicket') {
    return shell('How out?', (
      <Grid cols={3} keys={[
        backKey,
        ...WICKETS.map((w) => (
          <Key key={w.type} text={w.label} onPress={busy ? undefined : () => {
            if (EITHER_END_TYPES.includes(w.type)) {
              setChosenWicketType(w.type);
              setMode('wicket-who');
              return;
            }
            if (FIELDER_TYPES.includes(w.type)) {
              setChosenWicketType(w.type);
              setMode('fielder');
              return;
            }
            post({ wicketType: w.type, dismissedPlayerId: strikerId });
          }} />
        )),
      ]} />
    ), context);
  }

  if (mode === 'wicket-who' && chosenWicketType) {
    return shell('Who was dismissed?', (
      <Grid cols={2} keys={[
        backKey,
        ...dismissedChoices.map((choice) => (
          <Key key={choice.id} text={choice.label} face="name" height={52} onPress={busy ? undefined : () => {
            setChosenDismissedId(choice.id);
            // run_out is also a fielding action; retired_hurt is not.
            if (chosenWicketType === 'run_out') {
              setMode('fielder');
              return;
            }
            post({ wicketType: chosenWicketType, dismissedPlayerId: choice.id });
          }} />
        )),
      ]} />
    ), context);
  }

  if (mode === 'fielder' && chosenWicketType) {
    return shell('Who fielded?', (
      <Grid cols={2} keys={[
        backKey,
        ...bowlingLineup.map((slot) => (
          <Key key={slot.slotId} text={slot.displayName} face="name" height={52} onPress={busy ? undefined : () => post({
            wicketType: chosenWicketType,
            dismissedPlayerId: chosenDismissedId ?? strikerId,
            fielderId: slot.slotId,
          })} />
        )),
      ]} />
    ), context);
  }

  return shell(null, (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[0, 1, 2, 3].map((n) => <Key key={n} text={String(n)} face="run" height={56} onPress={busy ? undefined : () => post({ runs: n })} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[4, 6].map((n) => <Key key={n} text={String(n)} face="run" height={56} brand onPress={busy ? undefined : () => post({ runs: n })} />)}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Key text="Extras" onPress={busy ? undefined : () => setMode('extras')} />
        <Key text="Wicket" onPress={busy ? undefined : () => setMode('wicket')} />
        {canUndoBall(match) ? <Key text="Undo" onPress={busy ? undefined : () => onUndo()} /> : null}
      </View>
    </View>
  ), context);
}
