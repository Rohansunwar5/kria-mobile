import { useEffect, useState } from 'react';
import { View, ScrollView, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { getTournamentMatches } from '@/api/cricketMatch';
import { getBadmintonMatchesByTournament } from '@/api/badmintonMatch';
import { LiveMatchCard } from '@/components/cricket/LiveMatchCard';
import { MatchCard } from '@/components/bracket/MatchCard';
import { Lbl } from '@/components/canvas';
import { isLiveMatch } from '@/lib/sports';

// ponytail: two sports have a live scoreboard, so two fetches. A third sport
// gets a third entry here, not an abstraction.
const SOURCES: Record<string, (id: string) => Promise<any[]>> = {
  cricket: getTournamentMatches,
  badminton: getBadmintonMatchesByTournament,
};

const GUTTER = 16;
const GAP = 10;

/** A multisport tournament runs cricket and badminton at once, so every sport it
 *  hosts is queried and the results shown together. Two or more live matches page
 *  sideways rather than stacking — a stack pushes the tabs off the first screen. */
export function LiveNowBanner({ tournamentId, sports }: { tournamentId: string; sports: string[] }) {
  const [matches, setMatches] = useState<{ sport: string; match: any }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(0);
  const { width } = useWindowDimensions();
  // Cards are inset from both edges, so a page is narrower than the scroller.
  // `pagingEnabled` would snap to the scroller's own width and drift.
  const pageWidth = width - GUTTER * 2;
  const stride = pageWidth + GAP;
  const wanted = sports.filter((s) => s in SOURCES);
  const key = wanted.join(',');

  useEffect(() => {
    if (wanted.length === 0) { setLoaded(true); return; }
    let active = true;
    const load = async () => {
      // One slow or failing sport must not hide the other's live matches.
      const results = await Promise.all(
        wanted.map((sport) =>
          SOURCES[sport](tournamentId)
            .then((list) => list.filter(isLiveMatch).map((match) => ({ sport, match })))
            .catch(() => [])
        )
      );
      if (!active) return;
      setMatches(results.flat());
      setLoaded(true);
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => { active = false; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, key]);

  if (!loaded || matches.length === 0) return null;

  // A match ending mid-session must not strand the dots past the last page.
  const current = Math.min(page, matches.length - 1);

  const card = ({ sport, match }: { sport: string; match: any }) =>
    sport === 'cricket' ? (
      <LiveMatchCard match={match} />
    ) : (
      <MatchCard match={match} competitorType={match.competitorType || 'player'} sport={sport} />
    );

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / stride));

  return (
    <View style={{ gap: 10, paddingTop: 10, paddingBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: GUTTER }}>
        <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#F97316' }} />
        <Lbl style={{ color: '#F97316', letterSpacing: 0.22 * 9 }}>Live now</Lbl>
      </View>

      {matches.length === 1 ? (
        <View style={{ paddingHorizontal: GUTTER }}>{card(matches[0])}</View>
      ) : (
        <>
          <ScrollView
            horizontal
            snapToInterval={stride}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GAP }}
          >
            {matches.map((m) => (
              <View key={m.match._id} style={{ width: pageWidth }}>
                {card(m)}
              </View>
            ))}
          </ScrollView>

          <View
            accessible
            accessibilityLabel={`Match ${current + 1} of ${matches.length}`}
            style={{ flexDirection: 'row', gap: 5, justifyContent: 'center' }}
          >
            {matches.map((m, i) => (
              <View
                key={m.match._id}
                style={{
                  width: i === current ? 14 : 5,
                  height: 5,
                  borderRadius: 999,
                  backgroundColor: i === current ? '#F97316' : 'rgba(255,255,255,0.22)',
                }}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
