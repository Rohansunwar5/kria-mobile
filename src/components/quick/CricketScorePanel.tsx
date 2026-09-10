import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { BallEntry, QuickMatch, WicketType } from '@/api/quickMatch';
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

type Pending = { strikerId?: string; nonStrikerId?: string; bowlerId?: string };
type EntryMode = 'closed' | 'extras' | 'wicket' | 'fielder';

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

  const isHost = Boolean(playerId) && playerId === match.hostId;

  const score = scoreLine(match);
  const chase = chaseLine(match);

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
    const needsStriker = firstBall || need === 'batsman' || need === 'both';
    const needsNonStriker = firstBall;
    const needsBowler = firstBall || need === 'bowler' || need === 'both';

    // A mid-innings replacement batsman must not be the player already
    // standing at the other end — that is not a real cricket state, and the
    // server's shape check would accept it without complaint.
    const excludedFromBatsman = pending.nonStrikerId ?? match.liveState?.nonStrikerId;

    if (needsStriker && !pending.strikerId) {
      return (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
          {header}
          <Text style={LBL}>Who is on strike?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {battingLineup
              .filter((slot) => slot.slotId !== excludedFromBatsman)
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
              .filter((slot) => slot.slotId !== pending.strikerId)
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
  };

  const post = (extra: Partial<BallEntry>) => {
    if (!strikerId || !nonStrikerId || !bowlerId) return;
    onBall({
      batsmanOnStrikeId: strikerId,
      nonStrikerId,
      bowlerId,
      runs: 0,
      ...extra,
    });
    setPending({});
    closeEntryRows();
  };

  const strikerName = battingLineup.find((s) => s.slotId === strikerId)?.displayName;

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
      {header}
      {strikerName ? (
        <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#7d7d7d' }}>
          {`${strikerName} on strike`}
        </Text>
      ) : null}

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
          {EXTRAS.map((e) => (
            <Btn
              key={e.type}
              label={e.label}
              disabled={busy}
              onPress={busy ? undefined : () => post({ extrasType: e.type, extrasRuns: 1 })}
            />
          ))}
        </View>
      ) : null}

      {mode === 'wicket' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 12 }}>
          {WICKETS.map((w) => (
            <Btn
              key={w.type}
              label={w.label}
              disabled={busy}
              onPress={busy ? undefined : () => {
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

      {mode === 'fielder' && chosenWicketType ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: HAIRLINE, paddingTop: 12 }}>
          {bowlingLineup.map((slot) => (
            <Btn
              key={slot.slotId}
              label={slot.displayName}
              disabled={busy}
              onPress={busy ? undefined : () => post({
                wicketType: chosenWicketType,
                dismissedPlayerId: strikerId,
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
