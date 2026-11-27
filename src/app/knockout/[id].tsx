import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { getPublicPlayer } from '@/api/profileApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getQuickMatch } from '@/api/quickMatch';
import { AwardBadge } from '@/components/AwardBadge';
import { MatchCard } from '@/components/MatchCard';
import { SpotSheet } from '@/components/host/SpotSheet';
import { Bracket } from '@/components/Bracket';
import { CricketPeople, RallyPeople, SectionHead } from '@/components/knockout/People';
import { InviteCard } from '@/components/room/InviteCard';
import { CodeCard } from '@/components/room/Roster';
import { AwardReveal } from '@/components/rewards/AwardReveal';
import { FooterBar, IconButton, TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, metals, radius, space } from '@/constants/theme';
import { HONOUR_BADGES, KNOCKOUT_BADGE, knockoutAwards, ordinal, type Award } from '@/lib/awardsView';
import { championPath, championWins, fixtureScores, hostName, isChampion, knockoutColumns, koLine, koRules, koStatus, myPlayableFixture, roundLabel, slotName } from '@/lib/knockoutRoom';
import { whenLaunchDone } from '@/lib/launchGate';
import { initials } from '@/lib/matchCard';
import { goBack } from '@/lib/nav';
import { championName, drawBlocker, isKnockoutHost, myInvite, startBlocker } from '@/lib/quickKnockoutView';
import { loadStates, markOpened } from '@/lib/rewardSeen';
import { useQuickKnockout } from '@/lib/useQuickKnockout';
import { useAppSelector } from '@/store/hooks';

const MAX_AWARDS = 3;

/** A quick knockout, code to champion (preview K1–K9, approved 2026-10-21). */
export default function KnockoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAppSelector((s) => s.auth.user);
  const meId = user?._id ?? '';
  const ko = useQuickKnockout(id);
  const k = ko.knockout;
  const host = k ? isKnockoutHost(k, meId) : false;
  const [adding, setAdding] = useState(false);

  // Finished fixtures' scores come from their matches, read once each: a decided match no longer changes.
  const [scores, setScores] = useState<Record<string, [string, string]>>({});
  const asked = useRef(new Set<string>());
  useEffect(() => {
    for (const f of k?.fixtures ?? []) {
      if (!f.quickMatchId || !f.winnerEntrantId || asked.current.has(f.fixtureId)) continue;
      asked.current.add(f.fixtureId);
      getQuickMatch(f.quickMatchId).then(
        (m) => {
          const sc = fixtureScores(m, f);
          if (sc) setScores((s) => ({ ...s, [f.fixtureId]: sc }));
        },
        () => asked.current.delete(f.fixtureId),
      );
    }
  }, [k?.fixtures]);

  const confirmCancel = () =>
    Alert.alert('Cancel this knockout?', 'Every unfinished match is cancelled too. This can\'t be undone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel knockout', style: 'destructive', onPress: () => ko.cancel() },
    ]);
  const share = () =>
    k?.joinCode && Share.share({ message: `Join my knockout "${k.name}" on Kria with code ${k.joinCode}.` }).catch(() => undefined);
  const openMatch = (matchId: string) => router.push(`/quick/${matchId}`);

  // Reward spec §10: the champion's reveal (once, via the ko_ key), then the path through the bracket.
  const page = useRef<ScrollViewInstance>(null);
  const [bracketY, setBracketY] = useState(0);
  const [reveal, setReveal] = useState<{ award: Award; line: string } | null>(null);
  const [path, setPath] = useState(false);
  const focused = useIsFocused();
  const champ = !!k && k.status === 'completed' && isChampion(k, meId);
  const [wasFocused, setWasFocused] = useState(focused);
  if (focused !== wasFocused) {
    setWasFocused(focused);
    if (!focused && reveal) setReveal(null); // unmarked: it can play again
  }
  useEffect(() => {
    if (!champ || !k || !focused || reveal || path) return;
    let alive = true;
    (async () => {
      await whenLaunchDone();
      const key = `ko_${k._id}`;
      if ((await loadStates(meId, [key])).get(key) !== 'new') return;
      const pub = await getPublicPlayer(meId).catch(() => null);
      // No profile, no count: the line never guesses "1st" (real data only).
      const count = pub ? Math.max(1, (pub.player.honors ?? []).filter((h) => h.badge === KNOCKOUT_BADGE).length) : null;
      const award = { ...knockoutAwards([{ title: k.name, badge: KNOCKOUT_BADGE, ref: k._id, eventName: k.name, sport: k.sport }], [])[0], ...(count ? { count } : {}) };
      const wins = championWins(k);
      const line = `${wins} ${wins === 1 ? 'win' : 'wins'} to the title.` + (count ? ` Your ${ordinal(count)} knockout win.` : '');
      if (alive) setReveal({ award, line });
    })().catch(() => {});
    return () => {
      alive = false;
    };
    // Runs when this becomes a champion's completed knockout in focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champ, focused, k?._id, meId]);
  const drawPath = () => {
    setReveal(null);
    setTimeout(() => {
      page.current?.scrollTo({ y: Math.max(0, bracketY - 24), animated: true });
      setPath(true);
    }, 160);
  };

  const drawn = !!k && k.entrants.length > 0;
  const waitingHost = !!k && k.status === 'waiting' && host;
  const blocker = k ? (drawn ? startBlocker(k) : drawBlocker(k)) : null;
  const canAward = !!k && host && k.status === 'completed' && k.awardsEligible && k.awards.length < MAX_AWARDS;
  const mine = k && k.status === 'live' ? myPlayableFixture(k, meId) : undefined;
  const mePlaying = !!k && k.players.some((p) => p.playerId === meId);
  const status = k ? koStatus(k) : null;
  const invite = k ? myInvite(k, meId) : undefined;
  const decline = async () => {
    if (await ko.declineInvite()) goBack(router, '/(tabs)/compete');
  };

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar
        title="Knockout"
        onBack={() => goBack(router, '/(tabs)/compete')}
        right={k?.joinCode && k.status === 'waiting' ? <IconButton icon="ios_share" label="Share join code" onPress={share} /> : null}
      />
      <ScrollView
        ref={page}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={ko.loading && !!k} onRefresh={ko.reload} tintColor={colors.accent} />}
      >
        {ko.loading && !k ? (
          <View style={{ gap: 12, paddingTop: 18 }}>
            <Skeleton style={{ width: '40%', height: 14 }} />
            <Skeleton style={{ height: 80, borderRadius: 12 }} />
            <Skeleton style={{ height: 160, borderRadius: radius.card }} />
          </View>
        ) : null}
        {ko.error && !k ? <InlineError what="Couldn't load this knockout." onRetry={ko.reload} /> : null}

        {k && status ? (
          <>
            <View style={s.head}>
              <View style={s.status}>
                <View style={[s.dot, { backgroundColor: status.color }]} />
                <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
              <Text style={display(40)}>{k.name}</Text>
              <Text style={s.line}>{koLine(k, meId)}</Text>
            </View>

            {ko.problem && !waitingHost ? <Text style={s.problem}>{ko.problem}</Text> : null}

            {invite ? (
              <InviteCard
                title={`${hostName(k) ?? 'The host'} invited you to ${k.name}`}
                busy={ko.busy}
                finished={k.status !== 'waiting'}
                onAccept={() => ko.acceptInvite()}
                onDecline={decline}
              />
            ) : null}

            {k.status === 'waiting' ? (
              <>
                {host && k.joinCode ? <View style={{ marginTop: 28 }}><CodeCard code={k.joinCode} /></View> : null}
                {!host && !invite ? (
                  <View style={s.wait}>
                    <Text style={display(22)}>{`Waiting for ${hostName(k) ?? 'the host'} to ${drawn ? 'start' : 'draw'}`}</Text>
                    <Text style={s.waitText}>
                      {k.sport === 'cricket' ? 'The host or the draw settles the teams.'
                        : k.format === 'doubles' ? 'Your partner is set by the host or by the draw.'
                          : "The bracket shows here once it's drawn."}
                    </Text>
                  </View>
                ) : null}
                {drawn ? (
                  <View style={s.section}>
                    <SectionHead title="Draw" meta={host ? 'Nothing is played until you start' : 'Not started yet'} />
                    <Bracket columns={knockoutColumns(k, meId, {})} />
                  </View>
                ) : null}
                {k.sport === 'cricket' ? (
                  <CricketPeople
                    k={k} meId={meId} busy={ko.busy} onAdd={host ? () => setAdding(true) : undefined}
                    onRemove={ko.removePlayer} onGuest={ko.playAsGuest} onMove={ko.moveToTeam} onAddTeam={ko.addTeam} onRemoveTeam={ko.removeTeam} onRenameTeam={ko.renameTeam}
                  />
                ) : (
                  <RallyPeople k={k} meId={meId} busy={ko.busy} onAdd={host ? () => setAdding(true) : undefined} onRemove={ko.removePlayer} onGuest={ko.playAsGuest} onPair={ko.pair} onUnpair={ko.unpair} />
                )}
                {host && k.sport !== 'cricket' ? (
                  <View style={s.note}>
                    <Icon name="info" size={16} color={colors.text3} />
                    <Text style={s.noteText}>Guests play under the name you give them and can claim it later with the code. The draw seeds everyone here.</Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {k.status === 'live' && mine ? (
              <View style={{ marginTop: 32, gap: 18 }}>
                <SectionHead title="Your match" />
                <MatchCard
                  v={{
                    id: mine.fixtureId, href: `/quick/${mine.quickMatchId}`, status: 'live', sport: k.sport,
                    format: roundLabel(k.roundNames[mine.round - 1] ?? ''),
                    title: `${slotName(k, mine, 'A').name} vs ${slotName(k, mine, 'B').name}`,
                    line: [koRules(k), host ? "You're hosting" : ''].filter(Boolean).join(' · '),
                    right: { kind: 'live' }, foot: null, footSub: null, avatars: [], extra: 0, result: null, dim: false,
                  }}
                />
              </View>
            ) : null}

            {k.status === 'completed' && k.championEntrantId ? (
              <View style={s.champ}>
                <AwardBadge shape="hex" metal="bronze" size={96} icon={sportIcon(k.sport)} shine />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={[s.champLabel, { color: metals.bronze.base }]}>Knockout winner</Text>
                  <Text style={display(26)}>{championName(k)}</Text>
                  <Text style={s.champLine}>{`Won ${k.name}. The knockout badge is on their awards.`}</Text>
                </View>
              </View>
            ) : null}

            {k.status === 'completed' && host ? (
              <View style={s.section}>
                <SectionHead title="Awards given" meta={k.awardsEligible ? `${k.awards.length} of ${MAX_AWARDS}` : undefined} />
                {!k.awardsEligible ? <Text style={s.noteText}>Awards need at least 4 Kria players in the knockout.</Text> : null}
                {k.awardsEligible && !k.awards.length ? <Text style={s.noteText}>{`Up to ${MAX_AWARDS}, for Kria players in this knockout.`}</Text> : null}
                {k.awards.map((a, i) => {
                  const p = k.players.find((x) => x.playerId === a.playerId);
                  return (
                    <View key={`${a.playerId}-${a.badge}-${i}`} style={s.given}>
                      <AwardBadge shape="rosette" metal="gold" size={40} glyph={HONOUR_BADGES[a.badge]?.glyph ?? 'H'} />
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={s.givenName}>{p?.displayName ?? 'Player'}</Text>
                        <Text style={s.givenSub}>{a.title}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {k.status === 'live' || k.status === 'completed' ? (
              <View style={s.section} onLayout={(e) => setBracketY(e.nativeEvent.layout.y)}>
                <SectionHead title={k.status === 'completed' ? 'Final bracket' : 'Bracket'} meta={k.status === 'live' ? 'Tap a match to open it' : undefined} />
                <Bracket columns={knockoutColumns(k, meId, scores)} onOpen={openMatch} highlight={champ ? { ids: championPath(k), play: path } : undefined} />
              </View>
            ) : null}

            {k.status === 'cancelled' ? (
              <View style={s.cancelled}>
                <Icon name="block" size={36} color={colors.text4} />
                <Text style={display(28)}>Knockout cancelled</Text>
                <Text style={s.cancelledText}>{"Unfinished matches were cancelled with it. Finished ones stay on everyone's record."}</Text>
              </View>
            ) : null}

            {host && (k.status === 'live' || (k.status === 'waiting' && drawn)) ? (
              <Pressable accessibilityRole="button" disabled={ko.busy} onPress={confirmCancel} style={s.cancelLink}>
                <Text style={s.cancelLinkText}>Cancel knockout</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {waitingHost && k ? (
        <FooterBar>
          <View style={{ flex: 1, gap: 10 }}>
            {ko.problem || blocker ? <Text style={[s.hint, ko.problem ? { color: colors.error } : null]}>{ko.problem || blocker}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {drawn ? (
                <>
                  <Button variant="secondary" label="Reshuffle" disabled={ko.busy} onPress={() => ko.draw()} style={{ flex: 1 }} />
                  <Button label="Start knockout" busy={ko.busy} busyLabel="Starting" disabled={!!blocker} onPress={() => ko.start()} style={{ flex: 1.3 }} />
                </>
              ) : (
                <>
                  <Tap accessibilityLabel="Cancel knockout" disabled={ko.busy} onPress={confirmCancel} style={s.cancel}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </Tap>
                  <Button label="Draw" busy={ko.busy} busyLabel="Drawing" disabled={!!blocker} onPress={() => ko.draw()} style={{ flex: 1 }} />
                </>
              )}
            </View>
          </View>
        </FooterBar>
      ) : null}
      {canAward && k ? (
        <FooterBar>
          <Button label="Give awards" onPress={() => router.push({ pathname: '/knockout/awards/[id]', params: { id: k._id } })} style={{ flex: 1 }} />
        </FooterBar>
      ) : null}

      {k && host ? (
        <SpotSheet
          open={adding}
          onClose={() => setAdding(false)}
          title="Add a player"
          subtitle="Find a Kria player to invite, or type a guest's name."
          guestSub="They play under this name and can claim it with the code"
          leaveOpen={false}
          taken={k.players.map((p) => p.playerId ?? p.invitedPlayerId).filter((x): x is string => !!x)}
          // Search never finds yourself, so a host who removed themselves gets this way back.
          first={!mePlaying && meId ? { title: 'Add me', sub: 'Play in your own knockout', initials: initials(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`), onPress: () => { ko.addPlayer(meId); setAdding(false); } } : undefined}
          onPick={(spot) => {
            if (spot.playerId) ko.addPlayer(spot.playerId);
            else if (spot.name.trim()) ko.addGuest(spot.name.trim());
            setAdding(false);
          }}
        />
      ) : null}
      {reveal && k ? (
        <AwardReveal
          award={reveal.award}
          line={reveal.line}
          onMinted={() => { markOpened(meId, [`ko_${k._id}`]).catch(() => {}); }}
          onDone={drawPath}
          onSeeAward={() => {
            setReveal(null);
            router.push('/(tabs)/awards');
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  head: { gap: 10, paddingTop: 18 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: font.semibold, fontSize: 12 },
  line: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  problem: { paddingTop: 12, fontFamily: font.regular, fontSize: 13, color: colors.error },
  wait: { marginTop: 28, padding: 18, borderRadius: 20, backgroundColor: colors.surface1, gap: 6 },
  waitText: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.text3 },
  section: { marginTop: 44 },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 28 },
  noteText: { flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 19, color: colors.text3 },
  champ: { marginTop: 28, padding: 22, borderRadius: radius.cardLg, backgroundColor: colors.surface1, flexDirection: 'row', alignItems: 'center', gap: 20 },
  champLabel: { fontFamily: font.semibold, fontSize: 12 },
  champLine: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.text3 },
  given: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  givenName: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  givenSub: { fontFamily: font.regular, fontSize: 12, color: colors.text3 },
  cancelled: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 20 },
  cancelledText: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.text3, textAlign: 'center' },
  cancelLink: { marginTop: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelLinkText: { fontFamily: font.semibold, fontSize: 14, color: colors.error },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.text3, textAlign: 'center' },
  cancel: { height: 56, paddingHorizontal: 18, borderRadius: radius.button, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: font.semibold, fontSize: 15, color: colors.error },
});
