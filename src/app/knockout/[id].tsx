import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getQuickMatch } from '@/api/quickMatch';
import { AwardBadge } from '@/components/AwardBadge';
import { MatchCard } from '@/components/MatchCard';
import { SpotSheet } from '@/components/host/SpotSheet';
import { Bracket } from '@/components/knockout/Bracket';
import { CricketPeople, RallyPeople, SectionHead } from '@/components/knockout/People';
import { CodeCard } from '@/components/room/Roster';
import { FooterBar, IconButton, TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Icon, sportIcon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, metals, radius, space } from '@/constants/theme';
import { HONOUR_BADGES } from '@/lib/awardsView';
import { fixtureScores, hostName, koLine, koRules, koStatus, myPlayableFixture, roundLabel, slotName } from '@/lib/knockoutRoom';
import { initials } from '@/lib/matchCard';
import { goBack } from '@/lib/nav';
import { championName, drawBlocker, isKnockoutHost, startBlocker } from '@/lib/quickKnockoutView';
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

  const drawn = !!k && k.entrants.length > 0;
  const waitingHost = !!k && k.status === 'waiting' && host;
  const blocker = k ? (drawn ? startBlocker(k) : drawBlocker(k)) : null;
  const canAward = !!k && host && k.status === 'completed' && k.awardsEligible && k.awards.length < MAX_AWARDS;
  const mine = k && k.status === 'live' ? myPlayableFixture(k, meId) : undefined;
  const mePlaying = !!k && k.players.some((p) => p.playerId === meId);
  const status = k ? koStatus(k) : null;

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar
        title="Knockout"
        onBack={() => goBack(router, '/(tabs)/compete')}
        right={k?.joinCode && k.status === 'waiting' ? <IconButton icon="ios_share" label="Share join code" onPress={share} /> : null}
      />
      <ScrollView
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

            {k.status === 'waiting' ? (
              <>
                {host && k.joinCode ? <View style={{ marginTop: 28 }}><CodeCard code={k.joinCode} /></View> : null}
                {!host ? (
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
                    <Bracket k={k} meId={meId} scores={{}} />
                  </View>
                ) : null}
                {k.sport === 'cricket' ? (
                  <CricketPeople
                    k={k} meId={meId} busy={ko.busy} onAdd={host ? () => setAdding(true) : undefined}
                    onRemove={ko.removePlayer} onMove={ko.moveToTeam} onAddTeam={ko.addTeam} onRemoveTeam={ko.removeTeam} onRenameTeam={ko.renameTeam}
                  />
                ) : (
                  <RallyPeople k={k} meId={meId} busy={ko.busy} onAdd={host ? () => setAdding(true) : undefined} onRemove={ko.removePlayer} onPair={ko.pair} onUnpair={ko.unpair} />
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
              <View style={s.section}>
                <SectionHead title={k.status === 'completed' ? 'Final bracket' : 'Bracket'} meta={k.status === 'live' ? 'Tap a match to open it' : undefined} />
                <Bracket k={k} meId={meId} scores={scores} onOpen={openMatch} />
              </View>
            ) : null}

            {k.status === 'cancelled' ? (
              <View style={s.cancelled}>
                <Icon name="block" size={36} color={colors.text4} />
                <Text style={display(28)}>Knockout cancelled</Text>
                <Text style={s.cancelledText}>Unfinished matches were cancelled with it. Finished ones stay on everyone's record.</Text>
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
          subtitle="Find a Kria player, or type a guest's name."
          guestSub="They play under this name and can claim it with the code"
          leaveOpen={false}
          taken={k.players.map((p) => p.playerId).filter((x): x is string => !!x)}
          // Search never finds yourself, so a host who removed themselves gets this way back.
          first={!mePlaying && meId ? { title: 'Add me', sub: 'Play in your own knockout', initials: initials(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`), onPress: () => { ko.addPlayer(meId); setAdding(false); } } : undefined}
          onPick={(spot) => {
            if (spot.playerId) ko.addPlayer(spot.playerId);
            else if (spot.name.trim()) ko.addGuest(spot.name.trim());
            setAdding(false);
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
