import { StyleSheet, Text, View } from 'react-native';
import type { TournamentAward, TournamentCategory } from '@/api/tournaments';
import type { Match } from '@/api/match';
import { Icon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, metals, space } from '@/constants/theme';
import { resultRows } from '@/lib/standingsView';
import { champion } from '@/lib/tournamentBracket';
import { awardRow } from '@/lib/tournamentView';

const isFinal = (m: Match) => m.bracketRound === 'Final' && !m.nextMatchId && m.status === 'completed' && !!m.winnerId;

function championRow(c: TournamentCategory, matches: Match[] = []) {
  const who = champion(matches);
  const final = matches.find(isFinal);
  if (!who || !final) return null;
  const winner = [final.player1, final.player2].find((p) => p?.registrationId === final.winnerId);
  const score = resultRows([final])[0]?.score;
  const won = score ? `won the final ${score}` : 'won the final';
  const sub = winner?.teamName ? `${winner.teamName} · ${won}` : won.charAt(0).toUpperCase() + won.slice(1);
  return { key: c._id, cat: c.name, who, sub };
}

/** Completed tournament (previewed): knockout champions, league "Final table" rows, awards. */
export function Results({ categories, matches, awards, onTable }: {
  categories: TournamentCategory[];
  matches: Record<string, Match[]>;
  awards: TournamentAward[];
  onTable: (c: TournamentCategory) => void;
}) {
  const isKnockout = (c: TournamentCategory) => (c.bracketType ?? 'knockout') === 'knockout';
  const champs = categories.filter(isKnockout).map((c) => championRow(c, matches[c._id])).filter((r) => r !== null);
  const leagues = categories.filter((c) => !isKnockout(c));
  return (
    <>
      {champs.length || leagues.length ? (
        <View style={s.section}>
          <View style={s.head}><SectionHeader title="Champions" meta="Knockout winners" /></View>
          {champs.map((r) => (
            <View key={r.key} style={s.row}>
              <View style={s.text}>
                <Text style={s.cat}>{r.cat}</Text>
                <Text style={[display(20), { lineHeight: 21 }]}>{r.who}</Text>
                <Text style={s.sub}>{r.sub}</Text>
              </View>
              <Icon name="emoji_events" size={24} color={colors.gold} variant="f" />
            </View>
          ))}
          {leagues.map((c) => (
            <Tap key={c._id} onPress={() => onTable(c)} scale={0.99} accessibilityLabel={`${c.name} final table`} style={s.row}>
              <View style={s.text}>
                <Text style={s.cat}>{c.name}</Text>
                <Text style={s.table}>Final table</Text>
              </View>
              <Icon name="chevron_right" size={20} color={colors.disabled} />
            </Tap>
          ))}
        </View>
      ) : null}
      {awards.length ? (
        <View style={s.section}>
          <View style={s.head}><SectionHeader title="Awards" /></View>
          {awards.map((a, i) => {
            const r = awardRow(a);
            return (
              <View key={`${r.title}-${i}`} style={[s.row, { justifyContent: 'flex-start', gap: 14 }]}>
                <View style={s.coin}>
                  <Icon name="workspace_premium" size={20} color={metals.gold.light} />
                </View>
                <View style={s.text}>
                  <Text style={s.table}>{r.title}</Text>
                  <Text style={s.cat}>{r.who}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  section: { paddingTop: space.sectionGap - 6, paddingHorizontal: space.gutter },
  head: { paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  text: { flex: 1, gap: 3 },
  cat: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  table: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text4 },
  coin: { width: 40, height: 40, borderRadius: 20, backgroundColor: metals.gold.enamel[0], borderWidth: 1.5, borderColor: metals.gold.base, alignItems: 'center', justifyContent: 'center' },
});
