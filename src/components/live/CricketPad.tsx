import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Scorecard } from '@/api/cricketMatch';
import type { BallEntry, QuickMatch } from '@/api/quickMatch';
import { Chips } from '@/components/live/CricketBoard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { Tap } from '@/components/ui/Tap';
import { Toggle } from '@/components/ui/Toggle';
import { colors, display, font, radius } from '@/constants/theme';
import { chipOf } from '@/lib/cricketBoard';
import {
  advance, crease, EXTRAS, EXTRAS_RUNS, initialPad, nextPick, pickOptions, pickTitle, whoOptions, WICKETS,
  type ExtrasType, type PadAction, type PickRole,
} from '@/lib/cricketPad';
import { initials } from '@/lib/matchCard';
import { battingSideId, canUndoBall, isFirstBallOfInnings } from '@/lib/quickCricketView';

const pickLabel = (role: PickRole) =>
  role === 'batter' ? 'Pick the next batter' : role === 'bowler' ? 'Pick the bowler' : 'Pick the opening batters';

/** `xs` in rows of `n`. */
const rowsOf = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** The pick sheet's rows: initials, name, and figures or the crease end on the right. */
function People({ people, busy, onPick }: {
  people: { id: string; name: string; right?: string }[];
  busy: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <ScrollView style={s.list} bounces={false}>
      {people.map((p) => (
        <Tap key={p.id} disabled={busy} scale={0.98} onPress={() => onPick(p.id)} style={s.row}>
          <View style={s.avatar}><Text style={s.ini}>{initials(p.name)}</Text></View>
          <Text style={s.name} numberOfLines={1}>{p.name}</Text>
          {p.right ? <Text style={s.right}>{p.right}</Text> : null}
        </Tap>
      ))}
    </ScrollView>
  );
}

/**
 * The quick-cricket host pad (pad preview "Main" and its sheets): pinned under
 * the room's scroll, with Extras, Wicket, Who's out, Fielder and Pick as one
 * stepped BottomSheet. The steps are `lib/cricketPad`; this renders them.
 */
export function CricketPad({ match, scorecard, busy, problem, onBall, onUndo }: {
  match: QuickMatch;
  /** The room's scorecard: this over's balls and the bowlers' figures. */
  scorecard: Scorecard | null;
  busy: boolean;
  /** A refused ball's reason, shown where the host is looking. */
  problem?: string;
  onBall: (entry: BallEntry) => void;
  onUndo: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [pad, setPad] = useState(initialPad);
  const [kind, setKind] = useState<ExtrasType>('wide');
  // The host closed the pick sheet: one "Pick the…" button stands in for the keys until they choose.
  const [shut, setShut] = useState(false);
  // A tap posts before `busy` arrives, so this holds off a second fast tap.
  // Freed once the request starts or ends, or the server's answer lands.
  const sent = useRef(false);
  useEffect(() => {
    sent.current = false;
  }, [busy, match]);

  const need = nextPick(match, pad);
  // Not while a ball is in flight: recording clears the picks before the server answers.
  const asking = need !== null && !busy;
  const step = pad.step !== 'keys' ? pad.step : asking && !shut ? 'pick' : null;

  const tap = (a: PadAction) => {
    if (busy || sent.current) return;
    const r = advance(match, pad, a);
    setPad(r.pad);
    if (r.ball) {
      sent.current = true;
      setShut(false);
      onBall(r.ball);
    }
  };
  const move = (a: PadAction) => setPad(advance(match, pad, a).pad);
  const close = () => {
    setShut(need !== null);
    move({ type: 'close' });
  };
  // Stale picks would win over the liveState the undo brings back.
  const undo = () => {
    if (busy || sent.current) return;
    sent.current = true;
    setPad(initialPad);
    setShut(false);
    onUndo();
  };

  const ls = match.liveState;
  const c = crease(match, pad);
  const slots = match.sides.flatMap((side) => side.slots);
  const nameOf = (id?: string) => slots.find((slot) => slot.slotId === id)?.displayName;
  const striker = nameOf(c.striker);
  const bowler = nameOf(c.bowler);
  const innings = ls?.currentInnings === 2 ? scorecard?.innings2 : scorecard?.innings1;
  const chips = (innings?.oversTimeline.find((o) => o.overNumber === (ls?.completedOvers ?? 0) + 1)?.balls ?? []).map(chipOf);

  const started = Boolean(ls) && !isFirstBallOfInnings(match);
  const score = started ? `${match.sides.find((side) => side.sideId === battingSideId(match))?.name ?? ''} ${ls?.runs ?? 0}/${ls?.wickets ?? 0}`.trim() : '';
  const lastBowler = started ? nameOf(ls?.currentBowlerId) : undefined;
  const pickSub = (role: PickRole) => {
    if (role === 'striker') return 'On strike';
    if (role === 'nonStriker') return 'Non-striker';
    if (role === 'bowler') return [score, lastBowler && `${lastBowler} bowled the last over`].filter(Boolean).join(' · ');
    return score;
  };

  const undoKey = (beside = false) =>
    canUndoBall(match) ? (
      <Tap accessibilityLabel="Undo" disabled={busy} onPress={undo} style={[s.tool, beside && s.undoBeside]}>
        <Icon name="undo" size={18} color={colors.text2} />
        <Text style={[s.toolText, { color: colors.text2 }]}>Undo</Text>
      </Tap>
    ) : null;

  const head = (title: string, sub?: string, back = true) => (
    <View style={s.head}>
      {back ? (
        <Tap accessibilityLabel="Back" onPress={() => move({ type: 'back' })} style={s.back}>
          <Icon name="arrow_back" size={22} />
        </Tap>
      ) : null}
      <View style={s.headText}>
        <Text style={s.title}>{title}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
    </View>
  );

  let sheet: ReactNode = null;
  if (step === 'extras') {
    sheet = (
      <View style={s.sheet}>
        {head('Extras', 'Pick the kind, then tap the runs to record the ball.')}
        <Segmented light options={EXTRAS.map((e) => ({ key: e.type, label: e.label }))} value={kind} onChange={setKind} />
        <View style={s.gap10}>
          <Text style={s.label}>{`${EXTRAS.find((e) => e.type === kind)?.label} · runs`}</Text>
          {rowsOf(EXTRAS_RUNS, 3).map((row, i) => (
            <View key={i} style={s.keyRow}>
              {row.map((n) => (
                <Tap key={n} disabled={busy} onPress={() => tap({ type: 'extras', extras: kind, runs: n })} style={[s.extraKey, busy && s.dim]}>
                  <Text style={display(26)}>{n}</Text>
                </Tap>
              ))}
            </View>
          ))}
        </View>
        <View style={s.toggle}>
          <Toggle
            label="Wicket on this ball too"
            hint="A stumping off a wide, a run out going for a bye"
            value={pad.alsoWicket}
            onChange={() => move({ type: 'alsoWicket' })}
          />
        </View>
      </View>
    );
  } else if (step === 'wicket') {
    sheet = (
      <View style={s.sheet}>
        {head('How was it out?', striker && bowler ? `${striker} is on strike · ${bowler} bowling` : undefined)}
        <View style={s.gap8}>
          {rowsOf(WICKETS, 2).map((row, i) => (
            <View key={i} style={s.keyRow}>
              {row.map((w) => (
                <Tap key={w.type} disabled={busy} onPress={() => tap({ type: 'wicket', wicket: w.type })} style={[s.wicket, busy && s.dim]}>
                  <Text style={s.wicketText}>{w.label}</Text>
                  {w.hint ? <Text style={s.hint}>{w.hint}</Text> : null}
                </Tap>
              ))}
              {row.length < 2 ? <View style={s.flex} /> : null}
            </View>
          ))}
        </View>
      </View>
    );
  } else if (step === 'who') {
    sheet = (
      <View style={s.sheet}>
        {head("Who's out?", WICKETS.find((w) => w.type === pad.wicketType)?.label)}
        <People
          people={whoOptions(match, pad).map((p) => ({ ...p, right: p.id === c.striker ? 'On strike' : 'Non-striker' }))}
          busy={busy}
          onPick={(id) => tap({ type: 'who', id })}
        />
      </View>
    );
  } else if (step === 'fielder') {
    const out = nameOf(pad.dismissed ?? c.striker);
    sheet = (
      <View style={s.sheet}>
        {head(pickTitle(match, 'fielder', pad.wicketType), out ? `${out} is out` : undefined)}
        <People people={pickOptions(match, pad, 'fielder')} busy={busy} onPick={(id) => tap({ type: 'pick', role: 'fielder', id })} />
      </View>
    );
  } else if (step === 'pick' && need) {
    sheet = (
      <View style={s.pick}>
        {head(pickTitle(match, need), pickSub(need) || undefined, false)}
        {/* A refused ball that needed a pick reopens this sheet over the pad's own line. */}
        {problem ? <Text style={s.sheetProblem}>{problem}</Text> : null}
        <People
          people={pickOptions(match, pad, need, scorecard).map((p) => ({ id: p.id, name: p.name, right: p.figures }))}
          busy={busy}
          onPick={(id) => tap({ type: 'pick', role: need, id })}
        />
      </View>
    );
  }

  return (
    <View style={[s.pad, { paddingBottom: Math.max(30, insets.bottom + 16) }]}>
      {problem ? <Text style={s.problem}>{problem}</Text> : null}
      {!asking && striker && bowler ? (
        <View style={s.context}>
          <Text style={s.contextText} numberOfLines={1}>
            <Text style={s.strong}>{bowler}</Text> to <Text style={s.strong}>{striker}</Text>
          </Text>
          <Chips chips={chips} size={24} empty={Math.max(0, 6 - chips.length)} />
        </View>
      ) : null}

      {asking ? (
        // No ball can be recorded without this player; Undo stays, so a mistaken wicket needs no pick first.
        <View style={s.keyRow}>
          <Button label={pickLabel(need)} onPress={() => setShut(false)} style={s.flex} />
          {undoKey(true)}
        </View>
      ) : (
        <View style={[s.gap8, busy && s.dim]}>
          <View style={s.keyRow}>
            {[0, 1, 2, 3].map((n) => (
              <Tap key={n} accessibilityLabel={`${n} run${n === 1 ? '' : 's'}`} disabled={busy} onPress={() => tap({ type: 'runs', runs: n })} style={s.run}>
                <Text style={display(30)}>{n}</Text>
              </Tap>
            ))}
          </View>
          <View style={s.keyRow}>
            {([[4, 'Four'], [6, 'Six']] as const).map(([n, word]) => (
              <Tap key={n} accessibilityLabel={word} disabled={busy} onPress={() => tap({ type: 'runs', runs: n })} style={s.boundary}>
                <Text style={[display(30), { color: colors.bg }]}>{n}</Text>
                <Text style={s.word}>{word}</Text>
              </Tap>
            ))}
          </View>
          <View style={s.keyRow}>
            <Tap
              accessibilityLabel="Extras"
              disabled={busy}
              onPress={() => {
                setKind('wide');
                tap({ type: 'open', step: 'extras' });
              }}
              style={s.tool}
            >
              <Text style={s.toolText}>Extras</Text>
            </Tap>
            <Tap accessibilityLabel="Wicket" disabled={busy} onPress={() => tap({ type: 'open', step: 'wicket' })} style={s.tool}>
              <Text style={[s.toolText, s.wicketKey]}>Wicket</Text>
            </Tap>
            {undoKey()}
          </View>
        </View>
      )}

      <BottomSheet open={sheet !== null} onClose={close}>{sheet}</BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gap8: { gap: 8 },
  gap10: { gap: 10 },
  dim: { opacity: 0.5 },
  pad: { paddingTop: 16, paddingHorizontal: 16, gap: 12, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, backgroundColor: colors.surface1 },
  problem: { paddingHorizontal: 4, fontFamily: font.regular, fontSize: 13, color: colors.error },
  context: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 4 },
  contextText: { flexShrink: 1, fontFamily: font.regular, fontSize: 13, color: colors.text2 },
  strong: { fontFamily: font.semibold, color: colors.text },
  keyRow: { flexDirection: 'row', gap: 8 },
  run: { flex: 1, height: 60, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  boundary: { flex: 1, height: 60, borderRadius: 16, backgroundColor: colors.text, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  word: { fontFamily: font.semibold, fontSize: 12, color: colors.bg },
  tool: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.surface3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  toolText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  wicketKey: { fontFamily: font.bold, color: colors.accentInk },
  // Beside the 56-tall "Pick the…" button: its own width, the button's height.
  undoBeside: { flex: 0, height: 56, paddingHorizontal: 18 },

  sheet: { gap: 18 },
  pick: { gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 2 },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  sheetProblem: { fontFamily: font.regular, fontSize: 13, color: colors.error },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  extraKey: { flex: 1, height: 56, borderRadius: 16, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  toggle: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.bg },
  wicket: { flex: 1, height: 52, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wicketText: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  hint: { fontFamily: font.medium, fontSize: 11, color: colors.text3 },
  list: { maxHeight: 420 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: 1, borderTopColor: colors.surface2 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  ini: { fontFamily: font.semibold, fontSize: 12, color: colors.text },
  name: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.text },
  right: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
});
