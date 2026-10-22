import { StyleSheet, Text, View } from 'react-native';
import type { MyEntry } from '@/api/tournaments';
import { Icon } from '@/components/ui/Icon';
import { colors, display, font } from '@/constants/theme';
import { enteredHeading, timeline, type StepState } from '@/lib/entryView';

const DOT: Record<StepState, string> = { done: colors.text, now: colors.accent, next: 'transparent' };

/** Mock 2b entered view. `paidAmount` is only known right after paying here; it also brings the check. */
export function EntryStatus({ entry, hasTeams, paid, teamName, paidAmount }: {
  entry: MyEntry;
  hasTeams: boolean;
  /** The category takes a fee: the first step reads "Payment received". */
  paid: boolean;
  teamName?: string;
  paidAmount?: number;
}) {
  const head = enteredHeading(entry, hasTeams, teamName, paidAmount);
  const steps = timeline(entry, hasTeams, paid);
  return (
    <View style={s.root}>
      {paidAmount ? (
        <View style={s.check}><Icon name="check" size={30} color={colors.onAccent} variant="b" /></View>
      ) : null}
      <View style={s.head}>
        <Text style={display(40)}>{head.title}</Text>
        {head.line ? <Text style={s.line}>{head.line}</Text> : null}
      </View>
      <View>
        {steps.map((st, i) => (
          <View key={st.title} style={s.step}>
            <View style={s.rail}>
              <View style={[s.dot, { backgroundColor: DOT[st.state] }, st.state === 'next' && s.ring]} />
              {i < steps.length - 1 ? <View style={[s.bar, { backgroundColor: st.state === 'done' ? colors.text : colors.lineStrong }]} /> : null}
            </View>
            <View style={s.stepText}>
              <Text style={[s.title, st.state === 'next' && { color: colors.text3 }]}>{st.title}</Text>
              {st.sub ? <Text style={s.sub}>{st.sub}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 32, paddingTop: 44 },
  check: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  head: { gap: 8 },
  line: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text2 },
  step: { flexDirection: 'row', gap: 14 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  ring: { borderWidth: 1.5, borderColor: colors.ring },
  bar: { flex: 1, width: 1.5, minHeight: 28 },
  stepText: { flex: 1, gap: 2, paddingBottom: 18 },
  title: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
