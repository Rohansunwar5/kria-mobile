import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Crest } from '@/components/tournament/Crest';
import { colors, display, font } from '@/constants/theme';
import type { TableRow } from '@/lib/standingsView';

/**
 * Mock 2f / DESIGN §5.10 standings: rank, name + team, P W L (D), Pts. My row
 * lifted; with `topN`, an accent "Top N go through" line after row N.
 * `crests` (team id → logo) puts a crest before each name.
 */
export function StandingsTable({ rows, head, topN, crests }: {
  rows: TableRow[];
  head: string;
  topN?: number;
  crests?: Record<string, string | undefined>;
}) {
  const hasD = rows.some((r) => r.d !== undefined);
  const hasPts = rows.some((r) => r.pts !== undefined);
  const cut = topN && topN < rows.length ? topN : 0;
  return (
    <View>
      <View style={[s.row, s.headRow]}>
        <Text style={[s.rank, s.headText]} />
        <Text style={[s.name, s.headText]}>{head}</Text>
        {['P', 'W', 'L', ...(hasD ? ['D'] : [])].map((k) => <Text key={k} style={[s.num, s.headText]}>{k}</Text>)}
        {hasPts ? <Text style={[s.pts, s.headText]}>Pts</Text> : null}
      </View>
      {rows.map((r, i) => (
        <Fragment key={r.key}>
          <View
            accessible
            accessibilityLabel={`${r.rank}. ${r.name}${r.mine ? ' (you)' : ''}, played ${r.p}, won ${r.w}, lost ${r.l}${hasD ? `, drawn ${r.d ?? 0}` : ''}${hasPts ? `, ${r.pts ?? 0} points` : ''}`}
            style={[s.row, s.line, (r.mine || i + 1 === cut) && s.noLine, r.mine && s.mine]}
          >
            <Text style={[display(18), s.rank, { color: cut && i >= cut ? colors.text4 : colors.text }]}>{r.rank}</Text>
            <View style={[s.name, s.who]}>
              {crests ? <Crest uri={crests[r.key]} name={r.name} size={24} /> : null}
              <View style={s.nameText}>
                <Text style={s.title} numberOfLines={1}>{r.name}</Text>
                {r.sub ? <Text style={s.sub} numberOfLines={1}>{r.sub}</Text> : null}
              </View>
            </View>
            {[r.p, r.w, r.l, ...(hasD ? [r.d ?? 0] : [])].map((v, k) => <Text key={k} style={[s.num, s.val]}>{v}</Text>)}
            {hasPts ? <Text style={[display(20), s.pts]}>{r.pts ?? 0}</Text> : null}
          </View>
          {i + 1 === cut ? (
            <View style={s.cut}>
              <View style={s.cutLine} />
              <Text style={s.cutText}>Top {cut} go through</Text>
              <View style={s.cutLine} />
            </View>
          ) : null}
        </Fragment>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface2 },
  headText: { fontFamily: font.semibold, fontSize: 11, color: colors.text4 },
  line: { marginHorizontal: -10, paddingHorizontal: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  noLine: { borderBottomColor: 'transparent' },
  mine: { backgroundColor: colors.surface2, borderRadius: 12 },
  rank: { width: 22 },
  name: { flex: 1, minWidth: 0 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameText: { flex: 1, gap: 1 },
  title: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 11, color: colors.text3 },
  num: { width: 26, textAlign: 'center' },
  val: { fontFamily: font.regular, fontSize: 14, color: colors.text2, fontVariant: ['tabular-nums'] },
  pts: { width: 34, textAlign: 'right' },
  cut: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  cutLine: { flex: 1, height: 1, backgroundColor: colors.accent, opacity: 0.6 },
  cutText: { fontFamily: font.semibold, fontSize: 10.5, color: colors.accent },
});
