import { StyleSheet, Text, View } from 'react-native';
import type { RecentMatch } from '@/api/career';
import { ResultBadge } from '@/components/ui/Pills';
import { colors, font } from '@/constants/theme';
import { resultLetter, sportName, whenShort } from '@/lib/homeView';

/** A recent-match row: result badge, title, scoreline, context and date. Not tappable. */
export function RecentRow({ match: r, now }: { match: RecentMatch; now: Date }) {
  return (
    <View style={s.recent}>
      <ResultBadge result={resultLetter(r.result)} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.tName} numberOfLines={1}>{r.title ?? `${sportName(r.sport)} match`}</Text>
        {r.scoreline ? <Text style={s.score} numberOfLines={1}>{r.scoreline}</Text> : null}
        <Text style={s.tSub} numberOfLines={1}>
          {[r.knockout ? [r.knockout.name, r.knockout.round].filter(Boolean).join(' · ') : r.context === 'quick' ? 'Quick match' : 'Tournament', whenShort(r.playedAt, now)].join(' · ')}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  recent: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  score: { fontFamily: font.regular, fontSize: 13, color: colors.text2, fontVariant: ['tabular-nums'] },
  tName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  tSub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
});
