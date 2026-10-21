import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font } from '@/constants/theme';
import { RANK_MIN, sportName, type ChecklistItem } from '@/lib/homeView';

/** Mock 4a: the "#7" becomes a promise, set just as large. */
export function StartHeadline() {
  return (
    <View style={s.headline}>
      <Text style={display(58)}>Your record starts with one match.</Text>
      <Text style={s.body}>Quick games with friends and official tournaments both count toward your rank, record and awards.</Text>
    </View>
  );
}

/** Where the rank will be: a 0/10 track of decided matches. */
export function RankTrack({ sport, decided }: { sport?: string; decided: number }) {
  return (
    <Tap scale={0.98} accessibilityLabel={`${decided} of ${RANK_MIN} decided matches to get ranked`} onPress={() => router.push('/(tabs)/compete')} style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardSport}>
          {sport ? <Icon name={sportIcon(sport)} size={16} color={colors.text3} /> : null}
          <Text style={s.meta}>{sport ? `${sportName(sport)} ranking` : 'Ranking'}</Text>
        </View>
        <Text style={s.meta}>Unranked</Text>
      </View>
      <View style={s.track}>
        <Text style={display(48)}>{`${decided}/${RANK_MIN}`}</Text>
        <Text style={s.trackLabel}>decided matches</Text>
      </View>
      <View style={s.ticks}>
        {Array.from({ length: RANK_MIN }, (_, i) => (
          <View key={i} style={[s.tick, i < decided && { backgroundColor: colors.accent }]} />
        ))}
      </View>
    </Tap>
  );
}

/** Same checklist as Profile. DOB and gender gate tournament entry. */
export function Checklist({ items, done, ready, title = 'Ready for tournaments', bar }: {
  items: ChecklistItem[];
  done: number;
  ready: boolean;
  title?: string;
  /** Profile (4e) shows the progress bar instead of the hint line. */
  bar?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={s.listHead}>
        <SectionHeader title={title} />
        <Text style={[s.count, { color: ready ? colors.text : colors.accent }]}>{`${done} of ${items.length}`}</Text>
      </View>
      {bar ? (
        <View style={s.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: items.length, now: done }}>
          <View style={[s.barFill, { width: `${(done / items.length) * 100}%` }]} />
        </View>
      ) : (
        <Text style={[s.meta, { paddingBottom: 12 }]}>
          {ready ? "You're set to register for any category." : 'Add date of birth and gender to enter tournaments.'}
        </Text>
      )}
      {items.map((item) => (
        <Tap
          key={item.key}
          scale={0.99}
          disabled={item.done}
          accessibilityLabel={`${item.label}. ${item.done ? 'Done' : item.why}`}
          onPress={() => router.push('/profile/edit')}
          style={s.item}
        >
          <View style={[s.dot, item.done ? { backgroundColor: colors.text } : { borderWidth: 1.5, borderColor: colors.ring }]}>
            {item.done ? <Icon name="check" size={16} color={colors.onAccent} variant="b" /> : null}
          </View>
          <View style={s.itemText}>
            <Text style={[s.itemLabel, { color: item.done ? colors.text3 : colors.text }]}>{item.label}</Text>
            <Text style={s.why}>{item.why}</Text>
          </View>
          {item.done ? null : <Icon name="chevron_right" size={20} color={colors.disabled} />}
        </Tap>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  headline: { paddingTop: 28, paddingHorizontal: 20, gap: 12 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, maxWidth: 320 },
  card: { padding: 18, borderRadius: 22, backgroundColor: colors.surface1, gap: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSport: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  track: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  trackLabel: { fontFamily: font.regular, fontSize: 14, color: colors.text2 },
  ticks: { flexDirection: 'row', gap: 3 },
  tick: { flex: 1, height: 6, borderRadius: 2, backgroundColor: colors.lineStrong },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.surface2, overflow: 'hidden', marginTop: 12, marginBottom: 6 },
  barFill: { height: '100%', backgroundColor: colors.accent },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  count: { fontFamily: font.regular, fontSize: 13, fontVariant: ['tabular-nums'] },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.line },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, gap: 1, paddingVertical: 8 },
  itemLabel: { fontFamily: font.semibold, fontSize: 14 },
  why: { fontFamily: font.regular, fontSize: 12, color: colors.text4 },
});
