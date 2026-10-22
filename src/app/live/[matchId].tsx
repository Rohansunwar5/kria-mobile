import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resolveMatchSport } from '@/api/cricketMatch';
import { BadmintonLive } from '@/components/live/BadmintonLive';
import { CricketLive } from '@/components/live/CricketLive';
import { TopBar } from '@/components/ui/Bars';
import { Icon } from '@/components/ui/Icon';
import { InlineError } from '@/components/ui/InlineError';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, font, space } from '@/constants/theme';
import { goBack } from '@/lib/nav';

/** Router: badminton gets the new board; cricket gets the cricket board. */
export default function LiveScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [sport, setSport] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [resolveErr, setResolveErr] = useState(false);
  const reqId = useRef(0);

  const resolve = useCallback(async () => {
    if (!matchId) return;
    const myReq = ++reqId.current;
    setResolving(true);
    setResolveErr(false);
    try {
      const s = await resolveMatchSport(matchId);
      if (reqId.current === myReq) setSport(s);
    } catch {
      if (reqId.current === myReq) setResolveErr(true);
    } finally {
      if (reqId.current === myReq) setResolving(false);
    }
  }, [matchId]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  if (matchId && !resolving && !resolveErr) {
    if (sport === 'badminton') return <BadmintonLive matchId={matchId} />;
    if (sport === 'cricket') return <CricketLive matchId={matchId} />;
  }

  return (
    <SafeAreaView edges={['top']} style={s.screen}>
      <TopBar title="Live" onBack={() => goBack(router)} />
      {!matchId ? null : resolving ? (
        <Skeleton style={s.skeleton} />
      ) : resolveErr ? (
        <InlineError what="Couldn't load this match." onRetry={resolve} />
      ) : (
        <View style={s.empty}>
          <Icon name="sensors" size={40} color={colors.text4} />
          <Text style={s.emptyTitle}>No live scoring</Text>
          <Text style={s.emptySub}>
            {`Live scoring is not available for ${sport || 'this sport'} yet. Check the draw for results once the match is done.`}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  skeleton: { height: 220, marginHorizontal: space.gutter, marginTop: 8, borderRadius: 26 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 64, paddingHorizontal: space.gutter },
  emptyTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.text },
  emptySub: { fontFamily: font.regular, fontSize: 14, color: colors.text3, textAlign: 'center' },
});
