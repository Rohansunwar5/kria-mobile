import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { SportSummary } from '@/api/career';
import { getTopPlayers, type RankedPlayer } from '@/api/rankings';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, space } from '@/constants/theme';
import { rankingRows, VISIBLE, type RankRow } from '@/lib/competeView';
import { RANK_MIN, sportName } from '@/lib/homeView';
import { EVENT_SPORTS } from '@/lib/eventsList';
import { RANKED_SPORTS } from '@/lib/sports';

/**
 * Compete › Rankings (mock 1b/4b, DESIGN §5.7). Win rate among players with
 * 10+ decided matches, the server's top 50 per sport, cached there for 5 min.
 * `mine`: your career summaries, null until loaded.
 */
export function Rankings({ sport, onSport, meId, meName, mine, onPlay }: {
  sport: string;
  onSport: (sport: string) => void;
  meId: string;
  meName: string;
  mine: SportSummary[] | null;
  onPlay: () => void;
}) {
  const [boards, setBoards] = useState<Record<string, RankedPlayer[] | null>>({});
  const [expanded, setExpanded] = useState(false);
  const board = boards[sport];

  const load = useCallback((sp: string) => {
    setBoards((b) => {
      const { [sp]: _, ...rest } = b;
      return rest;
    });
    getTopPlayers(sp, 50).then(
      (list) => setBoards((b) => ({ ...b, [sp]: list })),
      () => setBoards((b) => ({ ...b, [sp]: null })),
    );
  }, []);
  useEffect(() => {
    if (!(sport in boards)) load(sport);
    setExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  const me = mine?.find((s) => s.sport === sport);
  const name = sportName(sport).toLowerCase();

  return (
    <View>
      <View style={s.tabs}>
        {RANKED_SPORTS.map((sp) => {
          const on = sp === sport;
          return (
            <Pressable key={sp} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onSport(sp)} style={s.tab}>
              <Text style={[s.tabText, { color: on ? colors.text : colors.navIdle }]}>{sportName(sp)}</Text>
              <View style={[s.underline, on && { backgroundColor: colors.accent }]} />
            </Pressable>
          );
        })}
      </View>
      <Text style={s.metric}>{`Win rate · min ${RANK_MIN} decided matches`}</Text>

      {board === undefined ? (
        <View style={s.list}>
          {Array.from({ length: VISIBLE }, (_, i) => (
            <View key={i} style={[s.row, s.divider]}>
              <Skeleton style={{ width: 24, height: 18, marginHorizontal: 5 }} />
              <Skeleton style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton style={{ width: '70%', height: 12 }} />
                <Skeleton style={{ width: '45%', height: 10 }} />
              </View>
              <Skeleton style={{ width: 52, height: 20 }} />
            </View>
          ))}
        </View>
      ) : board === null ? (
        <InlineError what="Couldn't load the rankings." onRetry={() => load(sport)} />
      ) : board.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}><Icon name="leaderboard" size={30} color={colors.text4} /></View>
          <Text style={[display(26), { textAlign: 'center' }]}>{`No one's ranked in ${name} yet`}</Text>
          <Text style={s.emptyLine}>
            {me && me.decided >= RANK_MIN
              ? "You've qualified. Rankings refresh every few minutes."
              : `The first player to ${RANK_MIN} decided matches opens this board. You're ${RANK_MIN - (me?.decided ?? 0)} away.`}
          </Text>
          {/* Table tennis has no tournaments, only quick matches. */}
          {EVENT_SPORTS.includes(sport)
            ? <Button variant="secondary" label={`Find a ${name} event`} onPress={() => router.push({ pathname: '/(tabs)/events', params: { sport } })} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />
            : <Button variant="secondary" label={`Play a ${name} match`} onPress={onPlay} style={{ marginTop: 8, height: 48, paddingHorizontal: 20 }} />}
        </View>
      ) : (
        <Board board={board} meId={meId} meName={meName} me={mine ? me : null} expanded={expanded} onExpand={() => setExpanded((e) => !e)} onPlay={onPlay} />
      )}
    </View>
  );
}

function Board({ board, meId, meName, me, expanded, onExpand, onPlay }: {
  board: RankedPlayer[];
  meId: string;
  meName: string;
  /** null while your career is still loading: no own row yet. */
  me: SportSummary | undefined | null;
  expanded: boolean;
  onExpand: () => void;
  onPlay: () => void;
}) {
  const { rows, own } = rankingRows(board, meId, meName, me ?? undefined, expanded);
  return (
    <View style={s.list}>
      {rows.map((r) => <Row key={r.key} r={r} onPlay={onPlay} />)}
      {own && me !== null ? (
        <>
          <Text style={s.gap} accessibilityElementsHidden>···</Text>
          <Row r={own} onPlay={onPlay} />
        </>
      ) : null}
      {board.length > VISIBLE ? (
        <Pressable accessibilityRole="button" onPress={onExpand} style={s.more}>
          <Text style={s.moreText}>{expanded ? `Show top ${VISIBLE}` : 'See full rankings'}</Text>
        </Pressable>
      ) : null}
      <Text style={s.note}>{`Top ${expanded ? board.length : Math.min(VISIBLE, board.length)} of ${board.length} · refreshed every few minutes`}</Text>
    </View>
  );
}

function Row({ r, onPlay }: { r: RankRow; onPlay: () => void }) {
  const ink = r.mine ? colors.accentInk : colors.text;
  const open = () => {
    if (r.play) onPlay();
    else if (r.mine) router.push('/(tabs)/profile');
    else if (r.playerId) router.push(`/player/${r.playerId}`);
  };
  return (
    <Tap
      scale={0.99}
      accessibilityLabel={`${r.rank === '—' ? 'Unranked' : `Rank ${r.rank}`}, ${r.name}, ${r.sub}${r.rate ? `, ${r.rate}` : ''}`}
      onPress={open}
      style={[s.row, r.mine ? s.mine : s.divider]}
    >
      <Text style={[r.medal ? display(26) : display(20), s.rank, { color: r.mine ? colors.accentInk : r.medal ? colors[r.medal] : colors.text3 }]}>{r.rank}</Text>
      <View style={[s.avatar, r.medal && { borderWidth: 1.5, borderColor: colors[r.medal] }]}>
        {r.photo ? <Image source={{ uri: r.photo }} style={StyleSheet.absoluteFill} /> : <Text style={s.initials}>{r.initials}</Text>}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[s.name, { color: ink }]} numberOfLines={1}>{r.name}</Text>
        <Text style={s.sub}>{r.sub}</Text>
      </View>
      {r.play ? <Text style={s.play}>Play</Text> : <Text style={[display(24), { color: ink }]}>{r.rate}</Text>}
    </Tap>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 22, paddingTop: 22, paddingHorizontal: space.gutter, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { paddingBottom: 0 },
  tabText: { fontFamily: font.semibold, fontSize: 15, paddingBottom: 12 },
  underline: { height: 2, marginBottom: -1, borderRadius: 1 },
  metric: { fontFamily: font.regular, fontSize: 12, color: colors.text3, paddingTop: 16, paddingHorizontal: space.gutter },
  list: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 24, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20, paddingHorizontal: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  mine: { backgroundColor: colors.accentTint, borderRadius: 14 },
  rank: { width: 34, textAlign: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  name: { fontFamily: font.semibold, fontSize: 15 },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
  play: { fontFamily: font.bold, fontSize: 14, color: colors.accentInk },
  gap: { paddingVertical: 10, textAlign: 'center', fontSize: 16, letterSpacing: 4.8, color: colors.ring },
  more: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 16, minHeight: 44 },
  moreText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  note: { paddingTop: 4, textAlign: 'center', fontFamily: font.regular, fontSize: 12, color: colors.text4 },
  empty: { paddingTop: 64, paddingHorizontal: 32, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  emptyLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
});
