import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Toggle } from '@/components/ui/Toggle';
import { colors, display, font, radius } from '@/constants/theme';
import { HOST_SPORTS, pickKind, pickSport, RALLY_FORMATS, reviewRows, slotsFor, type HostForm, type HostKind, type HostSport } from '@/lib/hostMatch';
import { initials } from '@/lib/matchCard';
import { SPORT_LABELS } from '@/lib/sports';

type Props = { f: HostForm; set: (f: HostForm) => void };
type Host = { playerId?: string; name: string };

export function SportStep({ f, set }: Props) {
  return (
    <View style={s.step}>
      <Text style={display(36)}>What are you playing?</Text>
      <View style={{ gap: 10 }}>
        {HOST_SPORTS.map((sport: HostSport) => {
          const on = f.sport === sport;
          return (
            <Tap key={sport} scale={0.98} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => set(pickSport(f, sport))} style={[s.sport, { borderColor: on ? colors.accent : 'transparent' }]}>
              <View style={s.sportIcon}><Icon name={sportIcon(sport)} size={26} /></View>
              <Text style={s.sportName}>{SPORT_LABELS[sport] ?? sport}</Text>
              <View style={[s.radio, on ? { borderWidth: 7, borderColor: colors.accent } : { borderWidth: 1.5, borderColor: colors.ring }]} />
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

function Choice<T extends string | number>({ label, options, value, onPick, text = String }: {
  label: string;
  options: T[];
  value: T;
  onPick: (v: T) => void;
  text?: (v: T) => string;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((o) => {
          const on = o === value;
          return (
            <Pressable key={String(o)} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(o)} style={[s.choice, { backgroundColor: on ? colors.accent : colors.surface2 }]}>
              <Text style={[s.choiceText, { color: on ? colors.onAccent : colors.text }]}>{text(o)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Stepper({ label, range, value, min, max, onChange }: { label: string; range: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = (icon: 'remove' | 'add', next: number, a11y: string) => {
    const off = next < min || next > max;
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={a11y} disabled={off} onPress={() => onChange(next)} style={s.stepBtn}>
        <Icon name={icon} size={20} color={off ? colors.disabled : colors.text} />
      </Pressable>
    );
  };
  return (
    <View style={s.stepper} accessible={false}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.stepLabel}>{label}</Text>
        <Text style={s.meta}>{range}</Text>
      </View>
      <View style={s.stepControls}>
        {btn('remove', value - 1, `Fewer ${label.toLowerCase()}`)}
        <Text style={[display(28), { width: 34, textAlign: 'center' }]} accessibilityLabel={`${label}: ${value}`}>{value}</Text>
        {btn('add', value + 1, `More ${label.toLowerCase()}`)}
      </View>
    </View>
  );
}

/** One match, or a knockout every match of which uses the format below. */
function KindChoice({ f, set }: Props) {
  return (
    <Choice<HostKind>
      label="Type"
      options={['match', 'knockout']}
      value={f.kind}
      text={(v) => (v === 'knockout' ? 'Knockout' : 'One match')}
      onPick={(kind) => set(pickKind(f, kind))}
    />
  );
}

export function FormatStep({ f, set }: Props) {
  if (f.sport === 'cricket') {
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const knockout = f.kind === 'knockout';
    return (
      <View style={[s.step, { gap: 28 }]}>
        <Text style={display(36)}>Set the format</Text>
        <KindChoice f={f} set={set} />
        <View>
          <Stepper label={knockout ? 'Players per team' : 'Players per side'} range="2 to 11" value={f.players} min={2} max={11} onChange={(players) => set({ ...f, players })} />
          <Stepper label="Overs per innings" range="1 to 50" value={f.overs} min={1} max={50} onChange={(overs) => set({ ...f, overs, perBowler: clamp(f.perBowler, 1, overs) })} />
          {knockout ? (
            <Stepper label="Teams" range="3 to 8 · players pick one when they join" value={f.teams} min={3} max={8} onChange={(teams) => set({ ...f, teams })} />
          ) : (
            <Stepper label="Max overs per bowler" range={`1 to ${f.overs}`} value={f.perBowler} min={1} max={f.overs} onChange={(perBowler) => set({ ...f, perBowler })} />
          )}
        </View>
      </View>
    );
  }
  const formats = RALLY_FORMATS[f.sport];
  return (
    <View style={[s.step, { gap: 28 }]}>
      <Text style={display(36)}>Set the format</Text>
      <KindChoice f={f} set={set} />
      <Choice label="Players" options={['singles', 'doubles']} value={f.doubles ? 'doubles' : 'singles'} text={(v) => (v === 'doubles' ? 'Doubles' : 'Singles')} onPick={(v) => set({ ...f, doubles: v === 'doubles' })} />
      <Choice label={f.kind === 'knockout' ? 'Each match is best of' : 'Best of'} options={formats.bestOf} value={f.bestOf} onPick={(bestOf) => set({ ...f, bestOf })} />
      <Choice label="Points to win a game" options={formats.points} value={f.pointsToWin} onPick={(pointsToWin) => set({ ...f, pointsToWin })} />
    </View>
  );
}

/** Knockout step 3. The winner's honour reads "Won <name>" (server championTitle). */
export function KnockoutNameStep({ f, set, defaultName }: Props & { defaultName: string }) {
  return (
    <View style={s.step}>
      <Text style={display(36)}>Name the knockout</Text>
      <View style={{ gap: 10 }}>
        <TextInput
          value={f.name}
          onChangeText={(name) => set({ ...f, name })}
          placeholder={defaultName}
          placeholderTextColor={colors.text4}
          maxLength={40}
          accessibilityLabel="Knockout name"
          style={s.input}
        />
        <Text style={s.meta}>{`Optional. The winner gets "Won ${f.name.trim() || defaultName}" on their awards.`}</Text>
      </View>
    </View>
  );
}

/** Spot rows past this many collapse into one "+N more open spots" row (cricket squads). */
const SHOWN = 3;

export function SidesStep({ f, set, host, onSpot }: Props & { host: Host; onSpot: (side: 0 | 1, index: number) => void }) {
  const [touched, setTouched] = useState<[boolean, boolean]>([false, false]);
  const [expanded, setExpanded] = useState(false);
  const side = (n: 0 | 1) => {
    const value = n === 0 ? f.sideA : f.sideB;
    const error = touched[n] && !value.trim();
    const slots = slotsFor(f, n, host);
    const visible = expanded ? slots : slots.slice(0, SHOWN);
    const hidden = slots.length - visible.length;
    return (
      <View key={n} style={{ gap: 10 }}>
        <TextInput
          value={value}
          onChangeText={(t) => set(n === 0 ? { ...f, sideA: t } : { ...f, sideB: t })}
          onBlur={() => setTouched((t) => (n === 0 ? [true, t[1]] : [t[0], true]))}
          placeholder="Side name"
          placeholderTextColor={colors.text4}
          maxLength={40}
          accessibilityLabel={n === 0 ? 'Your side name' : 'Other side name'}
          style={[s.input, error && { borderColor: colors.error }]}
        />
        {error ? (
          <View style={s.error}>
            <Icon name="error" size={15} color={colors.error} />
            <Text style={s.errorText}>Each side needs a name.</Text>
          </View>
        ) : null}
        <View style={{ paddingLeft: 4 }}>
          {visible.map(({ index, host: isHost, spot }) => {
            const filled = isHost || !!spot.name;
            const row = (
              <>
                <View style={[s.avatar, filled ? { backgroundColor: colors.surface3 } : s.openRing]}>
                  {filled ? <Text style={s.ini}>{initials(spot.name)}</Text> : null}
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={s.slotName}>{isHost ? spot.name : spot.name || 'Open spot'}</Text>
                  <Text style={s.meta}>
                    {isHost ? 'You · host' : spot.playerId ? 'Kria player' : spot.name ? 'Guest name · claims with the code' : 'Name it now or let a player claim it'}
                  </Text>
                </View>
              </>
            );
            return isHost ? (
              <View key={index} style={s.slot}>{row}</View>
            ) : (
              <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Spot ${index + 1}: ${spot.name || 'open'}. Change`} onPress={() => onSpot(n, index)} style={s.slot}>
                {row}
                <Icon name="edit" size={16} color={colors.disabled} />
              </Pressable>
            );
          })}
          {hidden > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setExpanded(true)} style={s.slot}>
              <View style={[s.avatar, { backgroundColor: colors.surface2 }]}><Text style={s.ini}>{`+${hidden}`}</Text></View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={s.slotName}>{`${hidden} more ${hidden === 1 ? 'spot' : 'spots'}`}</Text>
                <Text style={s.meta}>{`Unnamed spots show as Player ${SHOWN + 1}, Player ${SHOWN + 2}…`}</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };
  return (
    <View style={[s.step, { gap: 24 }]}>
      <Text style={display(36)}>Name the sides</Text>
      {side(0)}
      {side(1)}
    </View>
  );
}

export function ReviewStep({ f, set, host, defaultName, onEdit }: Props & { host: Host; defaultName: string; onEdit: (step: number) => void }) {
  const rows = reviewRows(f, host, defaultName);
  return (
    <View style={s.step}>
      <Text style={display(36)}>Ready to go?</Text>
      <View style={s.review}>
        {rows.map((r, i) => (
          <Pressable key={r.key} accessibilityRole="button" accessibilityLabel={`${r.key}: ${r.value}. Edit`} onPress={() => onEdit(r.step)} style={[s.reviewRow, i < rows.length - 1 && s.reviewLine]}>
            <Text style={s.reviewKey}>{r.key}</Text>
            <View style={s.reviewValue}>
              <Text style={s.reviewText}>{r.value}</Text>
              <Icon name="edit" size={16} color={colors.disabled} />
            </View>
          </Pressable>
        ))}
      </View>
      {f.kind === 'knockout' ? (
        // A knockout always opens waiting: it can't be drawn until players have joined.
        <Text style={s.meta}>Players join with your code. You draw the bracket and start it once everyone is in.</Text>
      ) : (
        <Toggle
          label="Open a waiting room first"
          hint="Players claim their spot with your code. Nothing is scored until you tap Start."
          value={f.wait}
          onChange={(wait) => set({ ...f, wait })}
        />
      )}
    </View>
  );
}

export function Done({ code, note, knockout }: { code: string; note: 'wait' | 'live'; knockout: boolean }) {
  return (
    <View style={s.done}>
      <View style={s.check}><Icon name="check" size={30} color={colors.onAccent} variant="b" /></View>
      <Text style={s.doneTitle}>{knockout ? 'Knockout created. Share the code.' : 'Match created. Share the code.'}</Text>
      <Text style={[display(84), { letterSpacing: 5 }]} selectable accessibilityLabel={`Join code ${code.split('').join(' ')}`}>{code}</Text>
      <Text style={s.doneNote}>
        {knockout
          ? 'Players join with this code. Draw the bracket once everyone is in.'
          : note === 'wait'
            ? 'Players claim their spot in the waiting room. Tap Start in the match room when everyone is in.'
            : 'The match is live now. Players can still claim their spot with this code.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  step: { gap: 22, paddingTop: 20 },
  sport: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 22, backgroundColor: colors.surface1, borderWidth: 1.5 },
  sportIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  sportName: { flex: 1, fontFamily: font.semibold, fontSize: 17, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.text2 },
  choice: { flex: 1, height: 52, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontFamily: font.semibold, fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  stepLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  stepControls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  input: { height: 52, paddingHorizontal: 16, borderRadius: radius.input, backgroundColor: colors.surface1, borderWidth: 1.5, borderColor: 'transparent', fontFamily: font.semibold, fontSize: 18, color: colors.text },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { fontFamily: font.regular, fontSize: 12, color: colors.error },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 54 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  openRing: { borderWidth: 1.5, borderColor: colors.ring },
  ini: { fontFamily: font.semibold, fontSize: 11, color: colors.text },
  slotName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  review: { borderRadius: 22, backgroundColor: colors.surface1, paddingVertical: 4, paddingHorizontal: 18 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 15, minHeight: 48 },
  reviewLine: { borderBottomWidth: 1, borderBottomColor: colors.surface2 },
  reviewKey: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  reviewValue: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 14, color: colors.text, textAlign: 'right' },
  done: { alignItems: 'center', gap: 18, paddingTop: 56 },
  check: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.text2 },
  doneNote: { maxWidth: 280, textAlign: 'center', fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3 },
});
