import { StyleSheet, Text, View } from 'react-native';
import { AwardBadge } from '@/components/AwardBadge';
import { Tap } from '@/components/ui/Tap';
import { colors, font } from '@/constants/theme';
import type { Award } from '@/lib/awardsView';

/** One award as a badge: titles get the laurel and a ribbon — CHAMPION on gold, RUNNER-UP on silver. */
export function AwardBadgeFor({ award, size, shine }: { award: Award; size: number; shine?: boolean | number }) {
  return (
    <AwardBadge
      shape={award.shape} metal={award.metal} size={size} glyph={award.glyph} icon={award.icon} sub={award.sub}
      count={award.count} progress={award.progress} shine={shine}
      laurel={award.family === 'title'} ribbon={award.family !== 'title' ? undefined : award.metal === 'silver' ? 'RUNNER-UP' : 'CHAMPION'}
    />
  );
}

/** An award's badge, with the "New" dot (earned, not yet opened; reward spec C3) over its corner, out of the layout. */
export function BadgeWithDot({ award, size, dotted }: { award: Award; size: number; dotted: boolean }) {
  return (
    <View>
      <AwardBadgeFor award={award} size={size} />
      {dotted ? <View style={s.dotAt}><View testID={`new-dot-${award.key}`} style={s.dot} /></View> : null}
    </View>
  );
}

/** The tap's label; the dot sits inside the tap, so "new" is said here. */
export const awardLabel = (a: Award, dotted: boolean) => `${a.name}, ${a.context}${dotted ? ', new' : ''}`;

export function AwardGrid({ items, size, columns, onOpen, dot }: { items: Award[]; size: number; columns: number; onOpen: (a: Award) => void; dot?: (a: Award) => boolean }) {
  return (
    <View style={s.grid}>
      {items.map((it) => (
        <Tap key={it.key} scale={0.97} accessibilityLabel={awardLabel(it, !!dot?.(it))} onPress={() => onOpen(it)} style={[s.cell, { width: `${100 / columns}%` }]}>
          <BadgeWithDot award={it} size={size} dotted={!!dot?.(it)} />
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
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  dotAt: { position: 'absolute', top: 2, right: 2 },
});
