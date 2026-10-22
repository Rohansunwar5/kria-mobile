import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBadmintonMatch, type BadmintonMatch } from '@/api/badmintonMatch';
import { getTeamBrands, type TeamBrand } from '@/api/cricketMatch';
import { getTournament, getTournamentCategories } from '@/api/tournaments';
import { FlipScore } from '@/components/FlipScore';
import { Crest } from '@/components/tournament/Crest';
import { TopBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, font, radius, space } from '@/constants/theme';
import { badmintonBoard, roundTitle, sides } from '@/lib/badmintonBoard';
import { roundLabel } from '@/lib/knockoutRoom';
import { goBack } from '@/lib/nav';
import { useBadmintonLive } from '@/lib/useBadmintonLive';

const court = (m: BadmintonMatch) => (m.schedule?.court ? `Court ${m.schedule.court}` : '');
const join = (...p: (string | undefined)[]) => p.filter(Boolean).join(' · ');

const PILL = {
  in_progress: { text: 'Live', color: colors.accent },
  completed: { text: 'Completed', color: colors.text3 },
  walkover: { text: 'Completed', color: colors.text3 },
  cancelled: { text: 'Cancelled', color: colors.text3 },
  scheduled: { text: 'Scheduled', color: colors.text2 },
} as const;

/** The other side of the next match, or null while it is still to be decided. */
function otherSide(cur: BadmintonMatch, next: BadmintonMatch): string | null {
  const own = /2$/.test(cur.nextMatchSlot ?? '') ? 1 : 0;
  const name = sides(next)[1 - own].name.trim();
  return name && !/^tbd$/i.test(name) ? name : null;
}

/** Mock 3b. Tournament badminton scoreboard, live over the socket. */
export function BadmintonLive({ matchId }: { matchId: string }) {
  const { match, connected, loading, error, reload } = useBadmintonLive(matchId);
  const [sub, setSub] = useState('');
  const [brands, setBrands] = useState<Record<string, TeamBrand>>({});
  const [next, setNext] = useState<BadmintonMatch | null>(null);

  const tournamentId = match?.tournamentId ? String(match.tournamentId) : '';
  const categoryId = match?.categoryId ? String(match.categoryId) : '';
  useEffect(() => {
    if (!tournamentId) return;
    let on = true;
    Promise.all([
      getTournament(tournamentId).then((t) => t.name, () => ''),
      getTournamentCategories(tournamentId).then((c) => c.find((x) => x._id === categoryId)?.name ?? '', () => ''),
    ]).then(([t, c]) => on && setSub(join(t, c)));
    getTeamBrands(tournamentId).then((b) => on && setBrands(b));
    return () => { on = false; };
  }, [tournamentId, categoryId]);

  const nextId = match && !match.tieId ? match.nextMatchId : undefined;
  useEffect(() => {
    setNext(null);
    if (!nextId) return;
    let on = true;
    getBadmintonMatch(nextId).then((m) => on && setNext(m), () => undefined);
    return () => { on = false; };
  }, [nextId]);

  const back = () => goBack(router);
  if (!match) {
    return (
      <SafeAreaView edges={['top']} style={s.screen}>
        <TopBar title="Live" onBack={back} />
        {error ? <InlineError what="Couldn't load this match." onRetry={reload} /> : null}
        {loading && !error ? <Skeleton style={s.skeleton} /> : null}
      </SafeAreaView>
    );
  }

  const v = badmintonBoard(match);
  const pill = PILL[match.status] ?? PILL.scheduled;
  const ids = [match.teams?.team1Id, match.teams?.team2Id];
  const starts = match.status === 'scheduled' && match.schedule?.time ? join(`Starts ${match.schedule.time}`, court(match)) : '';
  const nextOther = next ? otherSide(match, next) : null;
  // Sub-line parts that arrive late; court is known straight away.
  const subLine = join(sub, court(match));

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar
        title={roundTitle(match)}
        sub={subLine || undefined}
        onBack={back}
        right={
          <View style={s.pill}>
            <View style={[s.pillDot, { backgroundColor: pill.color }]} />
            <Text style={[s.pillText, { color: pill.color }]}>{pill.text}</Text>
          </View>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
        {error ? <InlineError what="Couldn't refresh this match." onRetry={reload} /> : null}
        <View style={s.card}>
          <View style={s.top}>
            <Text style={s.small}>{v.top}</Text>
            <Text style={s.small}>{v.format}</Text>
          </View>
          {v.rows.map((r, i) => {
            const brandId = r.teamId ?? ids[i];
            return (
              <View key={i} style={s.row}>
                <Crest uri={brandId ? brands[brandId]?.logo : undefined} name={r.name} size={40} />
                <View style={s.who}>
                  <Text style={[s.name, r.lost ? { color: colors.text3 } : null]} numberOfLines={1}>{r.name}</Text>
                  {r.team ? <Text style={s.small} numberOfLines={1}>{r.team}</Text> : null}
                </View>
                <View style={s.done}>
                  {r.done.map((g, k) => (
                    <Text key={k} style={[s.doneNum, g.won ? s.doneWon : null]}>{g.v}</Text>
                  ))}
                </View>
                <View style={s.pts}>
                  {r.points != null ? (
                    // Dimmed only while behind: level points (deuce included) are both at full strength.
                    <FlipScore plain bg={colors.surface1} size={68} value={r.points} color={v.rows[1 - i].leading ? colors.text4 : colors.text} />
                  ) : null}
                </View>
              </View>
            );
          })}
          {v.chip ? (
            <View style={s.chip}>
              <Text style={s.chipText}>{v.chip}</Text>
            </View>
          ) : null}
        </View>
        {starts ? <Text style={s.starts}>{starts}</Text> : null}
        {!connected ? <Text style={s.reconnect}>Reconnecting. Showing the last update.</Text> : null}

        {v.games.length ? (
          <View style={s.games}>
            <Text style={s.h}>Games</Text>
            {v.games.map((g) => (
              <View key={g.n} style={s.gameRow}>
                <Text style={s.gameN}>{`Game ${g.n}`}</Text>
                <Text style={s.gameScore}>{g.score}</Text>
                <Text style={[s.gameWin, g.live ? { color: colors.accent } : null]}>{g.winner}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {next && nextId ? (
          <View style={s.next}>
            <Icon name="account_tree" size={22} color={colors.text3} />
            <View style={s.nextText}>
              <Text style={s.nextTitle}>
                {nextOther ? `Winner plays ${nextOther}` : `Winner goes to ${roundLabel(next.bracketRound)}`}
              </Text>
              <Text style={s.small}>{join(roundTitle(next), next.schedule?.time, court(next))}</Text>
            </View>
            <Tap
              accessibilityLabel="Bracket"
              onPress={() => router.push({ pathname: '/tournament/[id]/matches', params: { id: tournamentId, category: categoryId } })}
              style={s.bracketTap}
            >
              <Text style={s.bracket}>Bracket</Text>
            </Tap>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  skeleton: { height: 220, marginHorizontal: space.gutter, marginTop: 8, borderRadius: 26 },
  body: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, borderRadius: radius.pill, backgroundColor: colors.surface1 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: font.bold, fontSize: 12 },
  card: { marginTop: 8, borderRadius: 26, backgroundColor: colors.surface1, paddingVertical: 22, paddingHorizontal: 20, gap: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  who: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  done: { flexDirection: 'row', gap: 8 },
  doneNum: { width: 20, textAlign: 'right', fontFamily: font.regular, fontSize: 15, color: colors.text3, fontVariant: ['tabular-nums'] },
  doneWon: { fontFamily: font.bold, color: colors.text },
  pts: { width: 76, alignItems: 'flex-end', justifyContent: 'center', minHeight: 75 },
  chip: { alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bg },
  chipText: { fontFamily: font.bold, fontSize: 12, color: colors.accent },
  starts: { marginTop: 12, fontFamily: font.regular, fontSize: 13, color: colors.text2 },
  reconnect: { marginTop: 12, fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  games: { paddingTop: space.sectionGap },
  h: { fontFamily: font.semibold, fontSize: 17, color: colors.text, paddingBottom: 12 },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  gameN: { width: 70, fontFamily: font.regular, fontSize: 14, color: colors.text3 },
  gameScore: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  gameWin: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  next: { marginTop: space.sectionGap, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.cardLine },
  nextText: { flex: 1, gap: 2 },
  nextTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  bracketTap: { minHeight: 44, justifyContent: 'center' },
  bracket: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
});
