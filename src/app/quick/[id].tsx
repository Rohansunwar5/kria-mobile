import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Skeleton, ErrorBlock } from '@/components/states';
import { MatchPanel } from '@/components/quick/MatchPanel';
import { CricketSetupPanel } from '@/components/quick/CricketSetupPanel';
import { CricketScorePanel } from '@/components/quick/CricketScorePanel';
import { StartBar, WaitingRoom } from '@/components/quick/WaitingRoom';
import { getQuickKnockout, settleKnockoutTie } from '@/api/quickKnockout';
import { TiePick } from '@/components/knockout/TiePick';
import { useQuickMatch } from '@/lib/useQuickMatch';
import { panelFor } from '@/lib/quickCricketView';
import { isKnockoutHost } from '@/lib/quickKnockoutView';
import { isHost } from '@/lib/quickMatchView';
import { useAppSelector } from '@/store/hooks';
import { goBack } from '@/lib/nav';

export default function QuickMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAppSelector((s) => s.auth);
  const {
    match, loading, error, busy, problem, reload,
    point, undo, start, cancel, removePlayer,
    toss, lineup, ball, undoBall,
  } = useQuickMatch(id);

  // Bar title: "<knockout> · <round>". Keyed on the ids so a live score update
  // does not refetch; a failed fetch leaves just "← Bracket".
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
  const hostId = user?._id;
  const viewerIsHost = Boolean(match && isHost(match, hostId));
  const prevStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const wasLive = prevStatus.current === 'live';
    prevStatus.current = status;
    if (!wasLive || status !== 'completed' || !knockoutId || !viewerIsHost) return;
    let alive = true;
    getQuickKnockout(String(knockoutId))
      .then((k) => {
        if (alive && isKnockoutHost(k, hostId) && k.status === 'completed' && k.awardsEligible && k.awards.length === 0) {
          router.push({ pathname: '/knockout/awards/[id]', params: { id: String(knockoutId) } });
        }
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [status, knockoutId, viewerIsHost, hostId]);

  // A tied knockout match waits for the host to say who went through. When
  // that pick decides the final, it is the moment the knockout finishes, so
  // the awards open here — the completion watcher above saw no champion.
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

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 }}>
        <Pressable onPress={() => goBack(router, '/quick')} hitSlop={12}>
          <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.22 * 9, textTransform: 'uppercase', color: '#7d7d7d' }}>
            Back
          </Text>
        </Pressable>
        <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 22, color: '#fff', marginLeft: 14 }}>
          Quick match
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading && Boolean(match)} onRefresh={reload} tintColor="#F97316" />}
      >
        {match?.knockoutId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to bracket"
            // Back down to the bracket underneath (or in its place, if the match
            // was opened directly) — never a second bracket on top.
            onPress={() => router.dismissTo({ pathname: '/knockout/[id]', params: { id: String(match.knockoutId) } })}
            style={{ marginHorizontal: 20, marginBottom: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 0.14 * 10, textTransform: 'uppercase', color: '#F97316' }}>
              {barTitle ? `${barTitle} · ← Bracket` : '← Bracket'}
            </Text>
          </Pressable>
        ) : null}

        {problem ? (
          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#FF4438', marginBottom: 12, paddingHorizontal: 20 }}>
            {problem}
          </Text>
        ) : null}

        {loading && !match ? (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <Skeleton h={28} w="45%" line />
            <Skeleton h={120} />
            <Skeleton h={56} />
          </View>
        ) : null}

        {error && !match ? (
          <View style={{ paddingHorizontal: 20 }}>
            <ErrorBlock label="Quick match" onRetry={reload} />
          </View>
        ) : null}

        {match && panelFor(match) === 'waiting' ? (
          <WaitingRoom
            match={match}
            playerId={user?._id}
            busy={busy}
            onCancel={cancel}
            onRemovePlayer={removePlayer}
          />
        ) : null}

        {match && panelFor(match) === 'badminton' ? (
          <MatchPanel
            match={match}
            playerId={user?._id}
            busy={busy}
            onPoint={point}
            onUndo={undo}
            onCancel={cancel}
            onRemovePlayer={removePlayer}
          />
        ) : null}

        {match && panelFor(match) === 'cricket-setup' ? (
          <CricketSetupPanel
            match={match}
            playerId={user?._id}
            busy={busy}
            onToss={toss}
            onLineup={lineup}
          />
        ) : null}

        {match && panelFor(match) === 'cricket-score' ? (
          <CricketScorePanel
            match={match}
            playerId={user?._id}
            busy={busy}
            onBall={ball}
            onUndo={undoBall}
            onCancel={cancel}
          />
        ) : null}

        {match && tieOpen ? (
          <TiePick match={match} isHost={isHost(match, user?._id)} busy={tieBusy} onPick={pickTie} />
        ) : null}

        {tieProblem ? (
          <Text style={{ fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#FF4438', marginTop: 12, paddingHorizontal: 20 }}>
            {tieProblem}
          </Text>
        ) : null}
      </ScrollView>

      {match && panelFor(match) === 'waiting' && isHost(match, user?._id) ? (
        <StartBar busy={busy} onStart={start} />
      ) : null}
    </Screen>
  );
}
