import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getQuickKnockout, settleKnockoutTie } from '@/api/quickKnockout';
import { TiePick } from '@/components/knockout/TiePick';
import { CricketSetupPanel } from '@/components/quick/CricketSetupPanel';
import { CricketHostTools, CricketScorePanel } from '@/components/quick/CricketScorePanel';
import { QuickCricketLive } from '@/components/quick/QuickCricketLive';
import { Cancelled, RallyDone, RallyLive } from '@/components/room/RallyRoom';
import { Roster } from '@/components/room/Roster';
import { FooterBar, IconButton, TopBar } from '@/components/ui/Bars';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tap } from '@/components/ui/Tap';
import { colors, display, font, radius, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { panelFor } from '@/lib/quickCricketView';
import { isKnockoutHost } from '@/lib/quickKnockoutView';
import { canUndo, isHost } from '@/lib/quickMatchView';
import { roomLine, STATUS } from '@/lib/roomView';
import { useQuickMatch } from '@/lib/useQuickMatch';
import { useQuickScorecard } from '@/lib/useQuickScorecard';
import { useAppSelector } from '@/store/hooks';

/**
 * Match room (mock 1e): waiting → live → completed. Rally sports use the new
 * swipe scoring; a cricket match past its waiting room keeps its existing
 * scoring panels until the cricket designs arrive.
 */
export default function QuickMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppSelector((s) => s.auth);
  const meId = user?._id ?? '';
  const {
    match, loading, error, busy, problem, reload,
    point, undo, start, cancel, removePlayer,
    toss, lineup, ball, undoBall,
  } = useQuickMatch(id);
  const scorecard = useQuickScorecard(match);
  const [locked, setLocked] = useState(false);
  const host = Boolean(match && isHost(match, meId));
  const cricket = match && match.sport === 'cricket' && match.status !== 'waiting' ? match : null;
  const padShown = Boolean(cricket && panelFor(cricket) === 'cricket-score' && cricket.status === 'live' && host);

  // Knockout bar: "<knockout> · <round>". Keyed on the ids so a live score
  // update does not refetch; a failed fetch leaves just "Bracket".
  const knockoutId = match?.knockoutId;
  const fixtureId = match?.fixtureId;
  const [barTitle, setBarTitle] = useState('');
  useEffect(() => {
    if (!knockoutId) return;
    let alive = true;
    getQuickKnockout(String(knockoutId))
      .then((k) => {
        const round = k.fixtures.find((f) => f.fixtureId === fixtureId)?.round;
        const roundName = round ? k.roundNames[round - 1] : undefined;
        if (alive) setBarTitle([k.name, roundName].filter(Boolean).join(' · '));
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [knockoutId, fixtureId]);

  // Awards open themselves only when this host's screen watches the final
  // finish; the ref keeps an already-finished final, opened later, from counting.
  const status = match?.status;
  const prevStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const wasLive = prevStatus.current === 'live';
    prevStatus.current = status;
    if (!wasLive || status !== 'completed' || !knockoutId || !host) return;
    let alive = true;
    getQuickKnockout(String(knockoutId))
      .then((k) => {
        if (alive && isKnockoutHost(k, meId) && k.status === 'completed' && k.awardsEligible && k.awards.length === 0) {
          router.push({ pathname: '/knockout/awards/[id]', params: { id: String(knockoutId) } });
        }
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [status, knockoutId, host, meId]);

  // A tied knockout match waits for the host to say who went through. When
  // that pick decides the final, the awards open here.
  const [tieBusy, setTieBusy] = useState(false);
  const [tieProblem, setTieProblem] = useState('');
  const tieOpen = Boolean(match?.knockoutId && match.status === 'completed' && match.outcome === 'tied' && !match.tieWinnerSideId);
  const pickTie = async (sideId: string) => {
    if (!match?.knockoutId || !match.fixtureId) return;
    setTieBusy(true);
    setTieProblem('');
    try {
      const k = await settleKnockoutTie(String(match.knockoutId), { fixtureId: match.fixtureId, entrantId: sideId });
      reload();
      if (k.status === 'completed' && k.awardsEligible && k.awards.length === 0) {
        router.push({ pathname: '/knockout/awards/[id]', params: { id: String(match.knockoutId) } });
      }
    } catch (err) {
      setTieProblem((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not record that. Please try again.');
    } finally {
      setTieBusy(false);
    }
  };

  const title = match ? `${match.sides[0]?.name} vs ${match.sides[1]?.name}` : '';
  const canShare = Boolean(match?.joinCode && (match.status === 'waiting' || match.status === 'live'));
  const share = () => match?.joinCode && Share.share({ message: `Join "${title}" on Kria with code ${match.joinCode}` }).catch(() => undefined);
  const confirmCancel = () =>
    Alert.alert('Cancel this match?', "Players who claimed a spot see it as cancelled. This can't be undone.", [
      { text: 'Keep match', style: 'cancel' },
      { text: 'Cancel match', style: 'destructive', onPress: () => cancel() },
    ]);
  const rally = match && match.sport !== 'cricket';
  const waitingHost = match?.status === 'waiting' && host;
  const liveHost = rally && match?.status === 'live' && host;

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar
        title="Quick match"
        onBack={() => goBack(router, '/(tabs)/compete')}
        right={canShare ? <IconButton icon="ios_share" label="Share join code" onPress={share} /> : null}
      />
      <ScrollView
        scrollEnabled={!locked}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading && Boolean(match)} onRefresh={reload} tintColor={colors.accent} />}
      >
        {match?.knockoutId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to bracket"
            // Back down to the bracket underneath (or in its place) — never a second bracket on top.
            onPress={() => router.dismissTo({ pathname: '/knockout/[id]', params: { id: String(match.knockoutId) } })}
            style={s.bracket}
          >
            <Icon name="arrow_back" size={16} color={colors.accentInk} />
            <Text style={s.bracketText} numberOfLines={1}>{barTitle ? `${barTitle} · Bracket` : 'Bracket'}</Text>
          </Pressable>
        ) : null}

        {loading && !match ? (
          <View style={{ gap: 12, paddingTop: 18 }}>
            <Skeleton style={{ width: '40%', height: 14 }} />
            <Skeleton style={{ height: 80, borderRadius: 12 }} />
            <Skeleton style={{ height: 300, borderRadius: 24 }} />
          </View>
        ) : null}
        {error && !match ? <InlineError what="Couldn't load this match." onRetry={reload} /> : null}

        {match ? (
          <>
            <View style={s.head}>
              <View style={s.status}>
                <View style={[s.dot, { backgroundColor: STATUS[match.status].color }]} />
                <Text style={[s.statusText, { color: STATUS[match.status].color }]}>{STATUS[match.status].label}</Text>
              </View>
              <Text style={display(40)}>{title}</Text>
              <Text style={s.line}>{roomLine(match, meId)}</Text>
            </View>

            {problem && !padShown ? <Text style={s.problem}>{problem}</Text> : null}

            {match.status === 'waiting' ? <Roster match={match} meId={meId} busy={busy} onRemove={removePlayer} /> : null}
            {rally && match.status === 'live' ? <RallyLive match={match} host={host} busy={busy} onPoint={point} onLock={setLocked} /> : null}
            {rally && match.status === 'completed' ? <RallyDone match={match} /> : null}
            {match.status === 'cancelled' ? <Cancelled /> : null}

            {match.status === 'live' && panelFor(match) === 'cricket-setup' && host ? (
              <View style={{ paddingTop: 24 }}>
                <CricketSetupPanel match={match} playerId={meId} busy={busy} onToss={toss} onLineup={lineup} />
              </View>
            ) : null}
            {cricket && cricket.status !== 'cancelled' ? (
              <View style={{ paddingTop: 24, marginHorizontal: -space.gutter }}>
                <QuickCricketLive match={cricket} scorecard={scorecard} playerId={meId} />
                <CricketHostTools match={cricket} playerId={meId} busy={busy} onCancel={cancel} />
              </View>
            ) : null}

            {tieOpen ? (
              <View style={{ paddingTop: 24, marginHorizontal: -space.gutter }}>
                <TiePick match={match} isHost={host} busy={tieBusy} onPick={pickTie} />
              </View>
            ) : null}
            {tieProblem ? <Text style={s.problem}>{tieProblem}</Text> : null}
          </>
        ) : null}
      </ScrollView>

      {padShown && match ? (
        <CricketScorePanel match={match} playerId={meId} busy={busy} problem={problem} onBall={ball} onUndo={undoBall} />
      ) : null}

      {waitingHost ? (
        <FooterBar>
          {match?.knockoutId ? null : (
            <Tap accessibilityLabel="Cancel match" disabled={busy} onPress={confirmCancel} style={s.cancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </Tap>
          )}
          <Button label="Start match" onPress={() => start()} style={{ flex: 1 }} />
        </FooterBar>
      ) : null}
      {liveHost && match ? (
        <FooterBar>
          <Tap
            accessibilityLabel="Undo last point"
            accessibilityState={{ disabled: !canUndo(match) || busy }}
            disabled={!canUndo(match) || busy}
            onPress={() => undo()}
            style={s.undo}
          >
            <Icon name="undo" size={20} color={canUndo(match) ? colors.text : colors.disabled} />
            <Text style={[s.undoText, { color: canUndo(match) ? colors.text : colors.disabled }]}>Undo last point</Text>
          </Tap>
        </FooterBar>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bracket: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  bracketText: { flexShrink: 1, fontFamily: font.semibold, fontSize: 13, color: colors.accentInk },
  head: { gap: 10, paddingTop: 18 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: font.semibold, fontSize: 12 },
  line: { fontFamily: font.regular, fontSize: 13, color: colors.text3 },
  problem: { paddingTop: 12, fontFamily: font.regular, fontSize: 13, color: colors.error },
  cancel: { height: 56, paddingHorizontal: 18, borderRadius: radius.button, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: font.semibold, fontSize: 15, color: colors.error },
  undo: { flex: 1, height: 56, borderRadius: radius.button, backgroundColor: colors.surface2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  undoText: { fontFamily: font.semibold, fontSize: 15 },
});
