import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { RecentMatch, SportSummary } from '@/api/career';
import { getTopPlayers, type RankedPlayer } from '@/api/rankings';
import { AwardBadge } from '@/components/AwardBadge';
import { AwardSheet } from '@/components/awards/AwardSheet';
import { HonoursSheet } from '@/components/profile/HonoursSheet';
import { RecentRow } from '@/components/profile/RecentRow';
import { WinRateRing } from '@/components/profile/WinRateRing';
import { Arc } from '@/components/ui/Arc';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { ResultBadge } from '@/components/ui/Pills';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, space } from '@/constants/theme';
import type { Award, buildAwards } from '@/lib/awardsView';
import { RANK_MIN, resultLetter, sportName } from '@/lib/homeView';
import { initials } from '@/lib/matchCard';
import { ALL, allSports, formFor, rankNote, resultsBar, ringFor, tournamentRow, type RowEntry } from '@/lib/profileView';
import { RANKED_SPORTS } from '@/lib/sports';

// The Profile sections your own Profile tab and another player's profile share (DESIGN §5.8).

/** Top-50 board per sport with enough decided matches to rank; a failed board is null. */
export function useBoards(played: SportSummary[]) {
  const [boards, setBoards] = useState<Record<string, RankedPlayer[] | null>>({});
  const rankable = played.filter((x) => x.decided >= RANK_MIN && RANKED_SPORTS.includes(x.sport)).map((x) => x.sport).join();
  useEffect(() => {
    let live = true;
    for (const sport of rankable ? rankable.split(',') : []) {
      getTopPlayers(sport, 50).then(
        (b) => { if (live) setBoards((x) => ({ ...x, [sport]: b })); },
        () => { if (live) setBoards((x) => ({ ...x, [sport]: null })); },
      );
    }
    return () => { live = false; };
  }, [rankable]);
  return boards;
}

/**
 * Photo, name, best-rank chip and honours. Your own profile passes `photo`,
 * `onEdit` and `onHonours` (the Awards tab); without `onHonours` a badge opens
 * its AwardSheet and "+N more" the HonoursSheet, here.
 */
export function Identity({ firstName, lastName, image, best, awards, photo, onEdit, onHonours }: {
  firstName?: string;
  lastName?: string;
  image?: string;
  best: { rank: number; sport: string } | null;
  /** `buildAwards` output; null while loading. */
  awards: ReturnType<typeof buildAwards> | null;
  photo?: { pick: () => void; busy: boolean };
  onEdit?: () => void;
  onHonours?: () => void;
}) {
  const [open, setOpen] = useState<Award | null>(null);
  const [more, setMore] = useState(false);
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Player';
  const honours: Award[] = awards ? [...[...awards.honours].reverse(), ...awards.knockouts, ...awards.titles] : [];
  const face = image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} /> : <Text style={s.photoIni}>{initials(name)}</Text>;
  return (
    <>
      <View style={s.identity}>
        <View style={s.idRow}>
          {photo ? (
            <Pressable accessibilityRole="button" accessibilityLabel={image ? 'Change profile photo' : 'Add a profile photo'} disabled={photo.busy} onPress={photo.pick} style={s.photo}>
              {face}
              <View style={s.photoBadge}>{photo.busy ? <Arc size={16} color={colors.bg} track={colors.onAccentTrack} /> : <Icon name="photo_camera" size={18} color={colors.bg} />}</View>
            </Pressable>
          ) : (
            <View style={s.photo}>{face}</View>
          )}
          <View style={s.nameCol}>
            <Text style={display(44)} numberOfLines={2}>{[firstName, lastName].filter(Boolean).join('\n') || name}</Text>
            <View style={s.rankChip}>
              {best ? (
                <Text style={s.rankChipText}><Text style={{ color: colors.accent }}>{`#${best.rank}`}</Text>{` ${sportName(best.sport)}`}</Text>
              ) : (
                <Text style={[s.rankChipText, { color: colors.text2 }]}>Unranked</Text>
              )}
            </View>
          </View>
        </View>
        <View style={s.honourRow}>
          {honours.length ? (
            <>
              {honours.slice(0, 3).map((a) => (
                <Tap key={a.key} scale={0.95} accessibilityLabel={a.name} onPress={() => (onHonours ? onHonours() : setOpen(a))}>
                  <AwardBadge shape={a.shape} metal={a.metal} size={36} glyph={a.glyph} icon={a.icon} count={a.count} />
                </Tap>
              ))}
              {honours.length > 3 ? (
                <Pressable accessibilityRole="link" onPress={() => (onHonours ? onHonours() : setMore(true))} hitSlop={10}>
                  <Text style={s.more}>{`+${honours.length - 3} more`}</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <Text style={s.more}>{awards ? 'No awards yet' : ''}</Text>
          )}
          <View style={{ flex: 1 }} />
          {onEdit ? (
            <Tap accessibilityLabel="Edit profile" onPress={onEdit} style={s.edit}>
              <Text style={s.editText}>Edit profile</Text>
            </Tap>
          ) : null}
        </View>
      </View>
      {onHonours ? null : (
        <>
          <AwardSheet award={open} onClose={() => setOpen(null)} />
          <HonoursSheet open={more} onClose={() => setMore(false)} awards={honours} />
        </>
      )}
    </>
  );
}

export function Stat({ value, label, divider, faint }: { value: string; label: string; divider?: boolean; faint?: boolean }) {
  return (
    <View style={[s.stat, divider && s.statDivider]}>
      <Text style={[display(32), faint && { color: colors.text4 }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/** Matches, Wins, Tournaments under the identity; null tournaments shows "—". */
export function StatStrip({ played, won, tournaments }: { played: number; won: number; tournaments: number | null }) {
  return (
    <View style={s.strip}>
      <Stat value={String(played)} label="Matches" />
      <Stat value={String(won)} label="Wins" divider />
      <Stat value={tournaments == null ? '—' : String(tournaments)} label="Tournaments" divider />
    </View>
  );
}

/** The Analytics section: a ring per sport played (plus All sports), and the picked one's detail. */
export function Analytics({ played, bestSport, playerId, who = 'you', boards, recent, onAll }: {
  /** Sports with at least one match, most played first. */
  played: SportSummary[];
  bestSport?: string;
  playerId: string;
  /** "they" on another player's profile, for the ranking card's copy. */
  who?: 'you' | 'they';
  boards: Record<string, RankedPlayer[] | null>;
  recent: RecentMatch[] | null;
  onAll: () => void;
}) {
  const [picked, setPicked] = useState(ALL);
  const totals = allSports(played);
  const current = picked === ALL ? totals : played.find((x) => x.sport === picked) ?? totals;
  return (
    <View style={[s.section, { paddingHorizontal: 0, gap: 18 }]}>
      <View style={{ paddingHorizontal: space.gutter }}>
        <SectionHeader title="Analytics" meta={`${played.length} ${played.length === 1 ? 'sport' : 'sports'} played`} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rings}>
        {[totals, ...played].map((sp) => {
          const ring = ringFor(sp);
          return (
            <WinRateRing
              key={sp.sport}
              fraction={ring.fraction}
              label={ring.label}
              muted={ring.muted}
              name={sp.sport === ALL ? 'All sports' : sportName(sp.sport)}
              best={bestSport === sp.sport}
              selected={current.sport === sp.sport}
              onPress={() => setPicked(sp.sport)}
            />
          );
        })}
      </ScrollView>
      <SportDetail key={current.sport} s={current} playerId={playerId} who={who} board={boards[current.sport]} recent={recent} onAll={onAll} />
    </View>
  );
}

/** Per sport (or all sports): figures, the W/L/T/NR split, last-10 form, the ranking card, recent matches. */
function SportDetail({ s: sp, playerId, who, board, recent, onAll }: {
  s: SportSummary;
  playerId: string;
  who: 'you' | 'they';
  board: RankedPlayer[] | null | undefined;
  recent: RecentMatch[] | null;
  onAll: () => void;
}) {
  const all = sp.sport === ALL;
  const rate = sp.decided ? `${(sp.winRate * 100).toFixed(1)}%` : '—';
  const i = board?.findIndex((p) => p.playerId === playerId) ?? -1;
  const rank = i >= 0 ? `#${i + 1}` : '—';
  const bar = resultsBar(sp);
  const form = formFor(recent ?? [], sp.sport);
  const note = all ? null : rankNote(sp, board, playerId, who);
  const now = new Date();
  const rows = (all ? recent ?? [] : (recent ?? []).filter((r) => r.sport === sp.sport)).slice(0, 3);
  return (
    <View style={{ paddingHorizontal: space.gutter, gap: 36 }}>
      <View style={s.strip0}>
        <Stat value={rate} label="Win rate" faint={!sp.decided} />
        {all ? <Stat value={String(sp.won)} label="Wins" divider /> : <View style={[s.stat, s.statDivider]}><Text style={[display(32), { color: i >= 0 ? colors.accent : colors.text4 }]}>{rank}</Text><Text style={s.statLabel}>Rank</Text></View>}
        <Stat value={String(sp.played)} label="Played" divider />
      </View>

      <View style={{ gap: 10 }}>
        <View style={s.subHead}>
          <Text style={s.subTitle}>Results</Text>
          <Text style={s.subMeta}>{`${sp.decided} decided`}</Text>
        </View>
        <View style={s.bar}>
          {bar.filter((b) => b.value > 0).map((b) => <View key={b.label} style={{ flex: b.share, backgroundColor: b.color }} />)}
          {bar.every((b) => !b.value) ? <View style={{ flex: 1, backgroundColor: colors.lineStrong }} /> : null}
        </View>
        <View style={s.legend}>
          {bar.map((b) => (
            <View key={b.label} style={{ flex: 1, gap: 2 }}>
              <View style={s.legendKey}>
                <View style={[s.swatch, { backgroundColor: b.color }]} />
                <Text style={s.legendLabel}>{b.label}</Text>
              </View>
              <Text style={display(18)}>{b.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {form.rows.length ? (
        <View style={{ gap: 10 }}>
          <View style={s.subHead}>
            <Text style={s.subTitle}>Form</Text>
            <Text style={s.subMeta}>{form.note}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {form.rows.map((r) => <ResultBadge key={r._id} result={resultLetter(r.result)} />)}
          </View>
          <Text style={s.caption}>Newest first · tournament and quick matches</Text>
        </View>
      ) : null}

      {note ? (
        <View style={s.rankCard}>
          <View style={s.rankHead}>
            <Icon name="leaderboard" size={18} color={colors.accent} />
            <Text style={s.subTitle}>{note.title}</Text>
          </View>
          {note.line ? <Text style={s.body}>{note.line}</Text> : null}
          {note.progress != null ? (
            <View style={s.track}><View style={[s.trackFill, { width: `${note.progress * 100}%` }]} /></View>
          ) : null}
        </View>
      ) : null}

      {rows.length ? (
        <View>
          <View style={[s.subHead, { paddingBottom: 6 }]}>
            <Text style={s.subTitle}>{all ? 'Recent' : `Recent in ${sportName(sp.sport).toLowerCase()}`}</Text>
            <Pressable accessibilityRole="link" onPress={onAll} hitSlop={10}><Text style={s.subMeta}>All matches</Text></Pressable>
          </View>
          {rows.map((r) => <RecentRow key={r._id} match={r} now={now} />)}
        </View>
      ) : null}
    </View>
  );
}

/** One row per entry: crest or sport icon, name, category and team, where it stands. A row opens the tournament. */
export function TournamentRows<E extends RowEntry>({ entries, extra }: { entries: E[]; extra?: (entry: E) => string }) {
  return (
    <>
      {entries.map((e) => {
        const r = tournamentRow(e);
        return (
          <Tap key={r.key} scale={0.99} accessibilityLabel={`${r.name}, ${r.sub}, ${r.result.text}`} onPress={() => r.tournamentId && router.push(`/tournament/${r.tournamentId}`)} style={s.tRow}>
            <View style={[s.crest, r.crest ? { backgroundColor: colors.text } : null]}>
              {r.crest ? <Image source={{ uri: r.crest }} resizeMode="contain" style={{ width: 30, height: 30, borderRadius: 15 }} /> : <Icon name={sportIcon(r.sport)} size={20} color={colors.text3} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.tName} numberOfLines={1}>{r.name}</Text>
              <Text style={s.tSub} numberOfLines={1}>{r.sub}</Text>
              {extra ? <Text style={s.tExtra} numberOfLines={1}>{extra(e)}</Text> : null}
            </View>
            <Text style={[s.tResult, { color: r.result.color }]}>{r.result.text}</Text>
          </Tap>
        );
      })}
    </>
  );
}

const s = StyleSheet.create({
  identity: { paddingHorizontal: space.gutter, gap: 16 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  photo: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  photoIni: { fontFamily: font.bold, fontSize: 30, color: colors.text },
  photoBadge: { position: 'absolute', right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.text, borderWidth: 3, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  nameCol: { flex: 1, minWidth: 0, gap: 10, alignItems: 'flex-start' },
  rankChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.surface2 },
  rankChipText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  honourRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  more: { fontFamily: font.regular, fontSize: 13, color: colors.text3, marginLeft: 4 },
  edit: { height: 40, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  editText: { fontFamily: font.semibold, fontSize: 13, color: colors.text },
  section: { paddingTop: space.sectionGap, paddingHorizontal: space.gutter },
  strip: { marginTop: 32, marginHorizontal: space.gutter, flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.surface2 },
  strip0: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.surface2 },
  stat: { flex: 1, paddingVertical: 16, gap: 3 },
  statDivider: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: colors.surface2 },
  statLabel: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  body: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text3 },
  rings: { paddingHorizontal: space.gutter - 6, gap: 4 },
  subHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  subTitle: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  subMeta: { fontFamily: font.regular, fontSize: 12, color: colors.text3, fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', gap: 8 },
  legendKey: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { fontFamily: font.regular, fontSize: 11, color: colors.text3 },
  caption: { fontFamily: font.regular, fontSize: 11, color: colors.text4 },
  rankCard: { gap: 10, padding: 16, borderRadius: 18, backgroundColor: colors.surface1 },
  rankHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: colors.accent },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.line },
  crest: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  tSub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  tExtra: { fontFamily: font.regular, fontSize: 12, color: colors.text4, fontVariant: ['tabular-nums'] },
  tResult: { fontFamily: font.semibold, fontSize: 13 },
});
