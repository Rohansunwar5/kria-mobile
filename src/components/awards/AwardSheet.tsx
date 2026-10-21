import { StyleSheet, Text, View } from 'react-native';
import { AwardBadge } from '@/components/AwardBadge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { colors, display, font, metals } from '@/constants/theme';
import type { Award } from '@/lib/awardsView';

/** Mock 1g detail sheet: the badge large, tier, name, what it means, how it's earned, progress. */
export function AwardSheet({ award, onClose }: { award: Award | null; onClose: () => void }) {
  const a = award;
  return (
    <BottomSheet open={!!a} onClose={onClose}>
      {a ? (
        <View style={s.body}>
          <View style={{ marginTop: 12 }}>
            <AwardBadge shape={a.shape} metal={a.metal} size={132} glyph={a.glyph} icon={a.icon} sub={a.sub} count={a.count} progress={a.progress} laurel={a.family === 'title'} ribbon={a.family === 'title' ? 'WINNER' : undefined} />
          </View>
          <Text style={[s.tier, { color: a.earned ? metals[a.metal].base : colors.text3 }]}>{a.tier}</Text>
          <Text style={[display(32), { textAlign: 'center' }]}>{a.name}</Text>
          <Text style={s.desc}>{a.description}</Text>
          <View style={s.rows}>
            <View style={s.row}>
              <Text style={s.key}>How it's earned</Text>
              <Text style={s.value}>{a.criteria}</Text>
            </View>
            {a.status ? (
              <View style={s.row}>
                <Text style={s.key}>{a.status.label}</Text>
                <Text style={s.value}>{a.status.value}</Text>
              </View>
            ) : null}
          </View>
          {a.progress != null ? (
            <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.floor(a.progress * 100) }}>
              <View style={[s.fill, { width: `${Math.floor(a.progress * 100)}%` }]} />
            </View>
          ) : null}
          <Button variant="secondary" label="Done" onPress={onClose} style={{ alignSelf: 'stretch', height: 52, marginTop: 4 }} />
        </View>
      ) : null}
    </BottomSheet>
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
  track: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent },
});
