import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRecentMatches, type RecentMatch } from '@/api/career';
import { getPublicPlayer } from '@/api/profileApi';
import { listMyQuickKnockouts, type QuickKnockout } from '@/api/quickKnockout';
import { getTopPlayers, type RankedPlayer } from '@/api/rankings';
import { latestTournaments } from '@/api/tournaments';
import { AwardBadge } from '@/components/AwardBadge';
import { Checklist } from '@/components/home/NewPlayer';
import { TAB_BAR_SPACE } from '@/components/navigation/TabBar';
import { usePhotoUpload } from '@/components/profile/AvatarPicker';
import { WinRateRing } from '@/components/profile/WinRateRing';
import { Arc } from '@/components/ui/Arc';
import { IconButton } from '@/components/ui/Bars';
import { Icon, sportIcon, type IconName } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { ResultBadge } from '@/components/ui/Pills';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, radius, space } from '@/constants/theme';
import { buildAwards, type Award } from '@/lib/awardsView';
import type { Honor } from '@/lib/badges';
import { checklist, RANK_MIN, resultLetter, sportName, whenShort } from '@/lib/homeView';
import { initials } from '@/lib/matchCard';
import { ALL, allSports, bestRank, formFor, rankNote, resultsBar, ringFor, tournamentRow } from '@/lib/profileView';
import { RANKED_SPORTS } from '@/lib/sports';
import { useCareer } from '@/lib/useCareer';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPlayerStats, logout } from '@/store/slices/authSlice';
import { fetchPlayerTournamentHistory } from '@/store/slices/registrationSlice';

/** Profile tab (mocks 1h, 4e; DESIGN §5.8 and §6 Profile). */
export default function Profile() {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user, playerStats } = useAppSelector((s) => s.auth);
  const { tournamentHistory } = useAppSelector((s) => s.registration);
  const meId = user?._id ?? '';
  const career = useCareer(user?._id);
  const photo = usePhotoUpload();
  const [record, setRecord] = useState<{ titles: string[]; honors: Honor[] } | null>(null);
  const [knockouts, setKnockouts] = useState<QuickKnockout[]>([]);
  const [recent, setRecent] = useState<RecentMatch[] | null>(null);
  const [boards, setBoards] = useState<Record<string, RankedPlayer[] | null>>({});
  const [openNearby, setOpenNearby] = useState<number | null>(null);
  const [picked, setPicked] = useState(ALL);
  const scroll = useRef<ScrollView>(null);
  useScrollToTop(scroll);

  const seen = useRef(false);
  const reloadCareer = career.reload;
  useFocusEffect(
    useCallback(() => {
      if (!meId) return;
      dispatch(fetchPlayerStats());
      dispatch(fetchPlayerTournamentHistory());
      getPublicPlayer(meId).then((p) => p && setRecord({ titles: p.player.titles ?? [], honors: p.player.honors ?? [] }));
      listMyQuickKnockouts().then(setKnockouts, () => undefined);
      // The newest 50 (the server's cap), split by sport here: its sport filter takes registry sports only.
      getRecentMatches(meId, 50).then(setRecent, () => setRecent((r) => r ?? []));
      if (seen.current) reloadCareer();
      seen.current = true;
    }, [meId, dispatch, reloadCareer]),
  );

  const played = useMemo(() => [...(career.profile?.sports ?? [])].filter((s) => s.played > 0).sort((a, b) => b.played - a.played), [career.profile]);
  const isNew = !!career.profile && played.length === 0;
  const rankable = played.filter((s) => s.decided >= RANK_MIN && RANKED_SPORTS.includes(s.sport)).map((s) => s.sport).join();
  useEffect(() => {
    for (const sport of rankable ? rankable.split(',') : []) {
      getTopPlayers(sport, 50).then((b) => setBoards((x) => ({ ...x, [sport]: b })), () => setBoards((x) => ({ ...x, [sport]: null })));
    }
  }, [rankable]);

  // A new player sees how many events they could enter right now.
  const city = user?.location?.trim();
  useEffect(() => {
    if (!isNew) return;
    latestTournaments(100, { status: 'registration_open', ...(user?.sport ? { sport: user.sport } : {}), ...(city ? { city } : {}) }).then(
      (l) => setOpenNearby(l.length),
      () => setOpenNearby(null),
    );
  }, [isNew, user?.sport, city]);

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Player';
  const awards = record && career.profile ? buildAwards({ titles: record.titles, honors: record.honors, achievements: career.profile.achievements, knockouts }) : null;
  const honours: Award[] = awards ? [...[...awards.honours].reverse(), ...awards.knockouts, ...awards.titles] : [];
  const best = bestRank(played, boards, meId);
  const list = user ? checklist(user) : null;
  const totals = allSports(played);
  const current = picked === ALL ? totals : played.find((s) => s.sport === picked) ?? totals;
  const titles = record?.titles ?? user?.titles ?? [];

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + 12 }}>
        <View style={s.topRow}>
          <IconButton icon="settings" label="Settings" onPress={() => router.push('/profile/settings')} />
        </View>

        <View style={s.identity}>
          <View style={s.idRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={user?.profileImage ? 'Change profile photo' : 'Add a profile photo'} disabled={photo.busy} onPress={photo.pick} style={s.photo}>
              {user?.profileImage ? <Image source={{ uri: user.profileImage }} style={StyleSheet.absoluteFill} /> : <Text style={s.photoIni}>{initials(name)}</Text>}
              <View style={s.photoBadge}>{photo.busy ? <Arc size={16} color={colors.bg} track={colors.onAccentTrack} /> : <Icon name="photo_camera" size={18} color={colors.bg} />}</View>
            </Pressable>
            <View style={s.nameCol}>
              <Text style={display(44)} numberOfLines={2}>{[user?.firstName, user?.lastName].filter(Boolean).join('\n') || name}</Text>
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
                  <Tap key={a.key} scale={0.95} accessibilityLabel={a.name} onPress={() => router.push('/(tabs)/awards')}>
                    <AwardBadge shape={a.shape} metal={a.metal} size={36} glyph={a.glyph} icon={a.icon} count={a.count} />
                  </Tap>
                ))}
                {honours.length > 3 ? (
                  <Pressable accessibilityRole="link" onPress={() => router.push('/(tabs)/awards')} hitSlop={10}>
                    <Text style={s.more}>{`+${honours.length - 3} more`}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={s.more}>{awards ? 'No awards yet' : ''}</Text>
            )}
            <View style={{ flex: 1 }} />
            <Tap accessibilityLabel="Edit profile" onPress={() => router.push('/profile/edit')} style={s.edit}>
              <Text style={s.editText}>Edit profile</Text>
            </Tap>
          </View>
        </View>

        {career.error && !career.profile ? <InlineError what="Couldn't load your record." onRetry={career.reload} /> : null}

        {list && (isNew || !list.ready) ? (
          <View style={s.section}>
            <Checklist {...list} title="Complete your profile" bar />
          </View>
        ) : null}

        {!isNew && career.profile ? (
          <View style={s.strip}>
            <Stat value={String(totals.played)} label="Matches" />
            <Stat value={String(totals.won)} label="Wins" divider />
            <Stat value={playerStats ? String(playerStats.totalTournaments) : '—'} label="Tournaments" divider />
          </View>
        ) : null}

        {!career.profile && career.loading ? (
          <View style={[s.section, { gap: 14 }]}>
            <Skeleton style={{ width: '35%', height: 18 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} style={{ width: 80, height: 80, borderRadius: 40 }} />)}</View>
          </View>
        ) : null}

        {isNew ? (
          <View style={[s.section, { gap: 18 }]}>
            <SectionHeader title="Analytics" />
            <View style={s.strip0}>
              <Stat value="—" label="Win rate" faint />
              <Stat value="—" label="Rank" divider faint />
              <Stat value="0" label="Played" divider />
            </View>
            <Text style={s.body}>{`Win rate, form and results by sport fill in after your first match. Your rank appears at ${RANK_MIN} decided matches.`}</Text>
          </View>
        ) : played.length ? (
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
                    best={career.profile?.bestSport?.sport === sp.sport}
                    selected={current.sport === sp.sport}
                    onPress={() => setPicked(sp.sport)}
                  />
                );
              })}
            </ScrollView>
            <SportDetail key={current.sport} s={current} meId={meId} board={boards[current.sport]} recent={recent} onAll={() => router.push(`/matches/${meId}`)} />
          </View>
        ) : null}

        <View style={s.section}>
          <SectionHeader title="Tournaments" link={tournamentHistory.length > 5 ? 'All' : undefined} onLink={() => router.push('/profile/history')} />
          <View style={{ marginTop: 6 }}>
            {tournamentHistory.length ? (
              tournamentHistory.slice(0, 5).map((e) => {
                const r = tournamentRow(e, titles);
                return (
                  <Tap key={r.key} scale={0.99} accessibilityLabel={`${r.name}, ${r.sub}, ${r.result.text}`} onPress={() => r.tournamentId && router.push(`/tournament/${r.tournamentId}`)} style={s.tRow}>
                    <View style={[s.crest, r.crest ? { backgroundColor: colors.text } : null]}>
                      {r.crest ? <Image source={{ uri: r.crest }} resizeMode="contain" style={{ width: 30, height: 30, borderRadius: 15 }} /> : <Icon name={sportIcon(r.sport)} size={20} color={colors.text3} />}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={s.tName} numberOfLines={1}>{r.name}</Text>
                      <Text style={s.tSub} numberOfLines={1}>{r.sub}</Text>
                    </View>
                    <Text style={[s.tResult, { color: r.result.color }]}>{r.result.text}</Text>
                  </Tap>
                );
              })
            ) : (
              <Tap scale={0.99} accessibilityLabel="Find a tournament" onPress={() => router.push({ pathname: '/(tabs)/events', params: user?.sport ? { sport: user.sport } : {} })} style={s.tRow}>
                <Icon name="stadium" size={22} color={colors.text3} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.tName}>None yet</Text>
                  <Text style={s.tSub}>
                    {openNearby
                      ? `${openNearby} ${user?.sport ? `${sportName(user.sport).toLowerCase()} ` : ''}${openNearby === 1 ? 'event is' : 'events are'} open for entries${city ? ' near you' : ''}`
                      : 'Find an event to enter'}
                  </Text>
                </View>
                <Icon name="chevron_right" size={20} color={colors.disabled} />
              </Tap>
            )}
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader title="Account" />
          <View style={{ marginTop: 6 }}>
            <AccountRow icon="assignment" label="My entries" onPress={() => router.push('/profile/registrations')} />
            <AccountRow icon="receipt_long" label="Payments" onPress={() => router.push('/profile/invoices')} />
            <AccountRow icon="logout" label="Log out" danger onPress={() => dispatch(logout())} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, divider, faint }: { value: string; label: string; divider?: boolean; faint?: boolean }) {
  return (
    <View style={[s.stat, divider && s.statDivider]}>
      <Text style={[display(32), faint && { color: colors.text4 }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/** Per sport (or all sports): figures, the W/L/T/NR split, last-10 form, the ranking card, recent matches. */
function SportDetail({ s: sp, meId, board, recent, onAll }: {
  s: ReturnType<typeof allSports>;
  meId: string;
  board: RankedPlayer[] | null | undefined;
  recent: RecentMatch[] | null;
  onAll: () => void;
}) {
  const all = sp.sport === ALL;
  const rate = sp.decided ? `${(sp.winRate * 100).toFixed(1)}%` : '—';
  const i = board?.findIndex((p) => p.playerId === meId) ?? -1;
  const rank = i >= 0 ? `#${i + 1}` : '—';
  const bar = resultsBar(sp);
  const form = formFor(recent ?? [], sp.sport);
  const note = all ? null : rankNote(sp, board, meId);
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
          {rows.map((r) => (
            <View key={r._id} style={s.recent}>
              <ResultBadge result={resultLetter(r.result)} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={s.tName} numberOfLines={1}>{r.title ?? `${sportName(r.sport)} match`}</Text>
                {r.scoreline ? <Text style={s.score} numberOfLines={1}>{r.scoreline}</Text> : null}
                <Text style={s.tSub} numberOfLines={1}>
                  {[r.knockout ? [r.knockout.name, r.knockout.round].filter(Boolean).join(' · ') : r.context === 'quick' ? 'Quick match' : 'Tournament', whenShort(r.playedAt, now)].join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function AccountRow({ icon, label, danger, onPress }: { icon: IconName; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Tap scale={0.99} accessibilityLabel={label} onPress={onPress} style={s.tRow}>
      <Icon name={icon} size={22} color={danger ? colors.error : colors.text3} />
      <Text style={[s.tName, { flex: 1 }, danger && { color: colors.error }]}>{label}</Text>
      {danger ? null : <Icon name="chevron_right" size={20} color={colors.disabled} />}
    </Tap>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6, paddingHorizontal: 12 },
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
  recent: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  score: { fontFamily: font.regular, fontSize: 13, color: colors.text2, fontVariant: ['tabular-nums'] },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.line },
  crest: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tName: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  tSub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  tResult: { fontFamily: font.semibold, fontSize: 13 },
});
