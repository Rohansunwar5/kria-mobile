import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { resolveMatchSport } from '@/api/cricketMatch';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorBlock, Skeleton } from '@/components/states';
import { BadmintonLive } from '@/components/live/BadmintonLive';
import { CricketLive } from '@/components/live/CricketLive';
import { TopBar } from '@/components/ui/Bars';
import { goBack } from '@/lib/nav';

const Header = ({ title }: { title: string }) => <TopBar title={title} onBack={() => goBack(router)} />;

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

  if (!matchId) return <Screen><Header title="Live" /></Screen>;

  if (resolving) {
    return (
      <Screen>
        <Header title="Live" />
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton h={150} />
          <Skeleton h={90} />
        </View>
      </Screen>
    );
  }

  if (resolveErr) {
    return (
      <Screen>
        <Header title="Live" />
        <View style={{ padding: 16 }}>
          <ErrorBlock label="Match unavailable" message="We could not work out which match this is." onRetry={resolve} />
        </View>
      </Screen>
    );
  }

  if (sport === 'badminton') return <BadmintonLive matchId={matchId} />;
  if (sport === 'cricket') return <CricketLive matchId={matchId} />;

  return (
    <Screen>
      <Header title="Live" />
      <EmptyState
        icon="alert"
        title="No live scoring"
        message={`Live scoring is not available for ${sport || 'this sport'} yet. Check the draw for results once the match is done.`}
      />
    </Screen>
  );
}
