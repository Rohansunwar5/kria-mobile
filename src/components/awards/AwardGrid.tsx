import { StyleSheet, Text, View } from 'react-native';
import { AwardBadge } from '@/components/AwardBadge';
import { Tap } from '@/components/ui/Tap';
import { colors, font } from '@/constants/theme';
import type { Award } from '@/lib/awardsView';

/** One award as a badge: titles get the laurel and the CHAMPION ribbon. */
export function AwardBadgeFor({ award, size, shine }: { award: Award; size: number; shine?: boolean }) {
  return (
    <AwardBadge
      shape={award.shape} metal={award.metal} size={size} glyph={award.glyph} icon={award.icon} sub={award.sub}
      count={award.count} progress={award.progress} shine={shine}
      laurel={award.family === 'title'} ribbon={award.family === 'title' ? 'CHAMPION' : undefined}
    />
  );
}

export function AwardGrid({ items, size, columns, onOpen }: { items: Award[]; size: number; columns: number; onOpen: (a: Award) => void }) {
  return (
    <View style={s.grid}>
      {items.map((it) => (
        <Tap key={it.key} scale={0.97} accessibilityLabel={`${it.name}, ${it.context}`} onPress={() => onOpen(it)} style={[s.cell, { width: `${100 / columns}%` }]}>
          <AwardBadgeFor award={it} size={size} />
          <View style={{ gap: 2, alignItems: 'center' }}>
            <Text style={[s.cellName, { fontSize: columns > 3 ? 12 : 13, color: it.earned ? colors.text : colors.text2 }]} numberOfLines={2}>{it.name}</Text>
            <Text style={[s.cellCtx, { color: it.earned || it.progress == null ? colors.text3 : colors.text2 }]} numberOfLines={1}>{it.context}</Text>
          </View>
        </Tap>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 20 },
  cell: { alignItems: 'center', gap: 10, paddingHorizontal: 3 },
  cellName: { fontFamily: font.semibold, lineHeight: 16, textAlign: 'center' },
  cellCtx: { fontFamily: font.regular, fontSize: 11, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
