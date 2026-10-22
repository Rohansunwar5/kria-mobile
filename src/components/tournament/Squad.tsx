import { StyleSheet, Text, View } from 'react-native';
import { Tap } from '@/components/ui/Tap';
import { colors, font } from '@/constants/theme';
import { rupees } from '@/lib/format';
import type { SquadRow } from '@/lib/squadView';

/** Mock 2d squad list: avatar, name + role badge, categories, sold price. */
export function Squad({ rows, onPress }: { rows: SquadRow[]; onPress: (r: SquadRow) => void }) {
  return (
    <View>
      {rows.map((r) => (
        <Tap key={r.key} disabled={!r.playerId} onPress={() => onPress(r)} style={s.row}>
          <View style={[s.avatar, { borderColor: r.me ? colors.accent : 'transparent' }]}>
            <Text style={s.ini}>{r.initials}</Text>
          </View>
          <View style={s.mid}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>{r.name}{r.me ? ' (you)' : ''}</Text>
              {r.role ? (
                <Text style={[s.badge, { backgroundColor: r.role === 'icon' ? colors.gold : colors.text }]}>
                  {r.role === 'icon' ? 'ICON' : 'C'}
                </Text>
              ) : null}
            </View>
            <Text style={s.cat} numberOfLines={1}>{r.categories}</Text>
          </View>
          <Text style={s.price}>{r.price > 0 ? rupees(r.price) : '—'}</Text>
        </Tap>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  ini: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  mid: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontFamily: font.semibold, fontSize: 15, color: colors.text },
  badge: { fontFamily: font.bold, fontSize: 10, letterSpacing: 0.4, color: colors.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, overflow: 'hidden' },
  cat: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  price: { fontFamily: font.semibold, fontSize: 14, color: colors.text2, fontVariant: ['tabular-nums'] },
});
