import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AwardBadgeFor } from '@/components/awards/AwardGrid';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { colors, display, font, metals } from '@/constants/theme';
import type { Award } from '@/lib/awardsView';

/** Mock 1g detail sheet: the badge large, tier, name, what it means, how it's earned, progress. */
export function AwardSheet({ award, onClose }: { award: Award | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!award} onClose={onClose}>
      {award ? <AwardDetail award={award} onDone={onClose} /> : null}
    </BottomSheet>
  );
}

/** The detail sheet's body, for a sheet that shows it in place (HonoursSheet). */
export function AwardDetail({ award: a, onDone }: { award: Award; onDone: () => void }) {
  return (
    <View style={s.body}>
      <View style={{ marginTop: 12 }}>
        <AwardBadgeFor award={a} size={176} shine />
      </View>
      <Text style={[s.tier, { color: a.earned ? metals[a.metal].base : colors.text3 }]}>{a.tier}</Text>
      <Text style={[display(32), { textAlign: 'center' }]}>{a.name}</Text>
      <Text style={s.desc}>{a.description}</Text>
      <View style={s.rows}>
        <View style={s.row}>
          <Text style={s.key}>{"How it's earned"}</Text>
          <Text style={s.value}>{a.criteria}</Text>
        </View>
        {a.status ? (
          <View style={s.row}>
            <Text style={s.key}>{a.status.label}</Text>
            <Text style={s.value}>{a.status.value}</Text>
          </View>
        ) : null}
      </View>
      {a.tournamentId ? (
        <Button
          label="View tournament"
          onPress={() => { onDone(); router.push(`/tournament/${a.tournamentId}`); }}
          style={{ alignSelf: 'stretch', height: 52, marginTop: 4 }}
        />
      ) : null}
      <Button variant="secondary" label="Done" onPress={onDone} style={{ alignSelf: 'stretch', height: 52, marginTop: a.tournamentId ? 0 : 4 }} />
    </View>
  );
}

const s = StyleSheet.create({
  body: { alignItems: 'center', gap: 16, paddingHorizontal: 4 },
  tier: { fontFamily: font.semibold, fontSize: 12 },
  desc: { maxWidth: 300, textAlign: 'center', fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text2 },
  rows: { alignSelf: 'stretch', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.cardLine },
  key: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  value: { flexShrink: 1, maxWidth: 200, textAlign: 'right', fontFamily: font.semibold, fontSize: 13, color: colors.text, fontVariant: ['tabular-nums'] },
});
