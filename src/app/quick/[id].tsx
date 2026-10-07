import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Skeleton, ErrorBlock } from '@/components/states';
import { MatchPanel } from '@/components/quick/MatchPanel';
import { CricketSetupPanel } from '@/components/quick/CricketSetupPanel';
import { CricketScorePanel } from '@/components/quick/CricketScorePanel';
import { StartBar, WaitingRoom } from '@/components/quick/WaitingRoom';
import { getQuickKnockout } from '@/api/quickKnockout';
import { useQuickMatch } from '@/lib/useQuickMatch';
import { panelFor } from '@/lib/quickCricketView';
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
      </ScrollView>

      {match && panelFor(match) === 'waiting' && isHost(match, user?._id) ? (
        <StartBar busy={busy} onStart={start} />
      ) : null}
    </Screen>
  );
}
