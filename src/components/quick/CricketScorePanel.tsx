import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { BallEntry, QuickMatch, WicketType } from '@/api/quickMatch';
import { freeSlots } from '@/lib/quickMatchView';
import {
  battingSideId,
  bowlingSideId,
  canUndoBall,
  chaseLine,
  cricketOutcomeLabel,
  isFirstBallOfInnings,
  scoreLine,
  whoIsNeeded,
} from '@/lib/quickCricketView';

const LBL = {
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.1 * 9,
  textTransform: 'uppercase' as const,
  color: '#7d7d7d',
};

const HAIRLINE = 'rgba(255,255,255,0.12)';

function Btn({ label, onPress, disabled, accent, danger }: {
  label: string; onPress?: () => void; disabled?: boolean; accent?: boolean; danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: danger ? '#FF4438' : accent ? '#F97316' : HAIRLINE,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 14, color: danger ? '#FF4438' : '#fff' }}>
        {label}
      </Text>
    </Pressable>
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
 * The score panel: header, then either a name-picking prompt (first ball of
 * an innings, or whenever the engine asks for a new batsman/bowler) or the
 * run-entry controls. `recordBall` needs batsmanOnStrikeId/nonStrikerId/
 * bowlerId on every delivery, and mid-innings they come from `liveState` —
 * but on the very first ball, and again whenever `nextBatsmanNeeded` /
 * `nextBowlerNeeded` fires, there is no id to read yet, so this panel
 * collects them locally before any run button is reachable.
 */
export function CricketScorePanel({ match, playerId, busy, onBall, onUndo, onCancel }: {
  match: QuickMatch;
  playerId?: string;
  busy: boolean;
  onBall: (entry: BallEntry) => void;
  onUndo: () => void;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState<Pending>({});
  const [mode, setMode] = useState<EntryMode>('closed');
  const [chosenWicketType, setChosenWicketType] = useState<WicketType | null>(null);
  const [chosenExtrasType, setChosenExtrasType] = useState<ExtrasType | null>(null);
  const [chosenDismissedId, setChosenDismissedId] = useState<string | null>(null);
  // Which end the LAST wicket vacated. The engine's nextBatsmanNeeded flag
  // says a replacement is needed but never which end — this is the only
  // record of that, so the follow-up prompt below reads it rather than
  // always assuming the striker (see Finding 2: a departed non-striker's id
  // would otherwise stay wired into every remaining delivery).
  const [vacatedEnd, setVacatedEnd] = useState<CreaseEnd>('striker');
  // Armed on the extras sheet before the type is picked, so the common
  // extra-only case gains no step. Once set, choosing the runs routes into the
  // wicket flow instead of posting, and `post` merges it into that delivery.
  const [alsoWicket, setAlsoWicket] = useState(false);
  const [pendingExtras, setPendingExtras] = useState<{ extrasType: ExtrasType; extrasRuns: number } | null>(null);

  const isHost = Boolean(playerId) && playerId === match.hostId;

  const score = scoreLine(match);
  const chase = chaseLine(match);

  // Same gate as badminton's MatchPanel: the host, a live match, and a slot
  // still to fill. Without it a cricket host had to leave the match to find
  // the code — the panel showed everything except the one thing needed to
  // invite anyone.
  const openSlots = freeSlots(match);
  const joinCodeRow = isHost && match.status === 'live' && openSlots.length > 0 && match.joinCode ? (
    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
      <Text style={LBL}>Share this code to fill the open slots</Text>
      <Text
        testID="join-code"
        style={{
          fontFamily: 'SpaceMono_700Bold',
          fontSize: 24,
          letterSpacing: 0.2 * 24,
          color: '#F97316',
          marginTop: 4,
        }}
      >
        {match.joinCode}
      </Text>
    </View>
  ) : null;

  const header = (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 4 }}>
      <Text style={LBL}>Score</Text>
      {score ? (
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 28, color: '#fff' }}>
          {score}
        </Text>
      ) : null}
      {chase ? (
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 13, color: '#F97316' }}>
          {chase}
        </Text>
      ) : null}
      {joinCodeRow}
    </View>
  );

  const outcome = cricketOutcomeLabel(match);
  if (outcome) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        {header}
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 18, color: '#fff' }}>
          {outcome}
        </Text>
      </View>
    );
  }

  if (!isHost) {
    return <View>{header}</View>;
  }

  const battingSide = battingSideId(match);
  const bowlingSide = bowlingSideId(match);
  const battingLineup = match.sides.find((s) => s.sideId === battingSide)?.slots ?? [];
  const bowlingLineup = match.sides.find((s) => s.sideId === bowlingSide)?.slots ?? [];

  // Reachable only once `isHost` and `match.status === 'live'` are both known
  // true (the non-host and completed/cancelled branches above already
  // returned), so it needs no visibility guard of its own — only the busy one
  // every control here takes at its call site.
  const cancelRow = (
    <View style={{ marginTop: 4 }}>
      <Btn label="Cancel match" danger disabled={busy} onPress={busy ? undefined : () => onCancel()} />
    </View>
  );

  const need = whoIsNeeded(match);
  const firstBall = isFirstBallOfInnings(match);
  const promptOutstanding = firstBall || need !== null;

  if (promptOutstanding) {
    // Mid-innings, a batsman replacement is needed at whichever end the last
    // wicket vacated — `need` only says a replacement is needed, never which
    // end, so `vacatedEnd` (set when the dismissed player was chosen) decides.
    const needsBatsmanReplacement = !firstBall && (need === 'batsman' || need === 'both');
    const needsStriker = firstBall || (needsBatsmanReplacement && vacatedEnd === 'striker');
    const needsNonStriker = firstBall || (needsBatsmanReplacement && vacatedEnd === 'non-striker');
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
      return (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
          {header}
          <Text style={LBL}>Who is on strike?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {battingLineup
              .filter((slot) => available(slot.slotId, excludedFromStriker))
              .map((slot) => (
                <Btn
                  key={slot.slotId}
                  label={slot.displayName}
                  disabled={busy}
                  onPress={busy ? undefined : () => setPending((p) => ({ ...p, strikerId: slot.slotId }))}
                />
              ))}
          </View>
          {cancelRow}
        </View>
      );
    }

    if (needsNonStriker && !pending.nonStrikerId) {
      return (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
          {header}
          <Text style={LBL}>Who is at the non-striker&apos;s end?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {battingLineup
              .filter((slot) => available(slot.slotId, excludedFromNonStriker))
              .map((slot) => (
                <Btn
                  key={slot.slotId}
                  label={slot.displayName}
                  disabled={busy}
                  onPress={busy ? undefined : () => setPending((p) => ({ ...p, nonStrikerId: slot.slotId }))}
                />
              ))}
          </View>
          {cancelRow}
        </View>
      );
    }

    if (needsBowler && !pending.bowlerId) {
      return (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
          {header}
          <Text style={LBL}>Who is bowling?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {bowlingLineup.map((slot) => (
              <Btn
                key={slot.slotId}
                label={slot.displayName}
                disabled={busy}
                onPress={busy ? undefined : () => setPending((p) => ({ ...p, bowlerId: slot.slotId }))}
              />
            ))}
          </View>
          {cancelRow}
        </View>
      );
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

  const backBtn = <Btn label="Back" disabled={busy} onPress={busy ? undefined : back} />;

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

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
      {header}
      {strikerName ? (
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#7d7d7d' }}>
          {`${strikerName} on strike`}
        </Text>
      ) : null}

      {mode !== 'extras-runs' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[0, 1, 2, 3, 4, 6].map((n) => (
            <Btn
              key={n}
              label={String(n)}
              accent={n === 4 || n === 6}
              disabled={busy}
              onPress={busy ? undefined : () => post({ runs: n })}
            />
          ))}
        </View>
      ) : null}

      {mode === 'closed' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Btn label="Extras" disabled={busy} onPress={busy ? undefined : () => setMode('extras')} />
          <Btn label="Wicket" disabled={busy} onPress={busy ? undefined : () => setMode('wicket')} />
          {canUndoBall(match) ? (
            <Btn label="Undo" disabled={busy} onPress={busy ? undefined : () => onUndo()} />
          ) : null}
        </View>
      ) : null}

      {mode === 'extras' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 12 }}>
          {/* A run-out off a wide or a bye is routine in casual play, and the
              server has always accepted both fields on one ball — only this
              panel forced a choice, so the host recorded the wicket and lost
              the extra. Armed here rather than asked afterwards so the
              extra-only case still takes the same number of taps. */}
          <Btn
            label={alsoWicket ? '✓ Wicket too' : '+ Wicket too'}
            disabled={busy}
            onPress={busy ? undefined : () => setAlsoWicket((on) => !on)}
          />
          {backBtn}
          {EXTRAS.map((e) => (
            <Btn
              key={e.type}
              label={e.label}
              disabled={busy}
              onPress={busy ? undefined : () => {
                setChosenExtrasType(e.type);
                setMode('extras-runs');
              }}
            />
          ))}
        </View>
      ) : null}

      {mode === 'extras-runs' && chosenExtrasType ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 12 }}>
          {backBtn}
          {EXTRAS_RUNS.map((n) => (
            <Btn
              key={n}
              label={String(n)}
              disabled={busy}
              onPress={busy ? undefined : () => {
                if (!alsoWicket) {
                  post({ extrasType: chosenExtrasType, extrasRuns: n });
                  return;
                }
                setPendingExtras({ extrasType: chosenExtrasType, extrasRuns: n });
                setMode('wicket');
              }}
            />
          ))}
        </View>
      ) : null}

      {mode === 'wicket' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 12 }}>
          {backBtn}
          {WICKETS.map((w) => (
            <Btn
              key={w.type}
              label={w.label}
              disabled={busy}
              onPress={busy ? undefined : () => {
                if (EITHER_END_TYPES.includes(w.type)) {
                  setChosenWicketType(w.type);
                  setMode('wicket-who');
                  return;
                }
                // Every other type always dismisses the striker — reset here
                // in case an earlier run-out/retired-hurt left this pointed
                // at the non-striker's end.
                setVacatedEnd('striker');
                if (FIELDER_TYPES.includes(w.type)) {
                  setChosenWicketType(w.type);
                  setMode('fielder');
                  return;
                }
                post({ wicketType: w.type, dismissedPlayerId: strikerId });
              }}
            />
          ))}
        </View>
      ) : null}

      {mode === 'wicket-who' && chosenWicketType ? (
        <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 12 }}>
          <Text style={LBL}>Who was dismissed?</Text>
          {backBtn}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {dismissedChoices.map((choice) => (
              <Btn
                key={choice.id}
                label={choice.label}
                disabled={busy}
                onPress={busy ? undefined : () => {
                  setVacatedEnd(choice.end);
                  setChosenDismissedId(choice.id);
                  // run_out is also a fielding action; retired_hurt is not.
                  if (chosenWicketType === 'run_out') {
                    setMode('fielder');
                    return;
                  }
                  post({ wicketType: chosenWicketType, dismissedPlayerId: choice.id });
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {mode === 'fielder' && chosenWicketType ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 12 }}>
          {backBtn}
          {bowlingLineup.map((slot) => (
            <Btn
              key={slot.slotId}
              label={slot.displayName}
              disabled={busy}
              onPress={busy ? undefined : () => post({
                wicketType: chosenWicketType,
                dismissedPlayerId: chosenDismissedId ?? strikerId,
                fielderId: slot.slotId,
              })}
            />
          ))}
        </View>
      ) : null}

      {cancelRow}
    </View>
  );
}
